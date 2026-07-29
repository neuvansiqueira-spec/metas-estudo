const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");

function alignmentRuntime(topics = 5) {
  const start = source.indexOf('const DAILY_PLAN_ALIGNMENT_VERSION_V174 = "v174";');
  const end = source.indexOf("function generateGoalsForDate", start);
  assert.ok(start >= 0 && end > start, "rotinas de alinhamento V174 devem existir");
  const alignmentSource = source.slice(start, end);
  let reconcileCalls = 0;
  const context = {
    state: {},
    todayISO: () => "2026-07-29",
    planningTargetsForDate: (_date, targetState) => ({
      topics,
      disciplines: topics,
      dayContent: { mode: targetState.planning?.config?.mode || "goals_only" },
      unavailable: topics <= 0
    }),
    goalDateValue: (goal) => goal.date || goal.data || "",
    isPlanningStudyGoal: () => true,
    isManualDailyGoal: (goal) => goal.origin === "manual",
    planningItemKey: (goal) => `${goal.discipline}|${goal.subject}`,
    goalTotalActualMinutes: (goal) => Number(goal.actualMinutes) || 0,
    normalizePlanningState: (planning) => ({ config: {}, availability: {}, ...planning }),
    reconcileDailyGoalsWithPlanning(targetState, date, opts) {
      reconcileCalls += 1;
      assert.equal(opts.rebuildAutomatic, true);
      const preserved = targetState.dailyGoals.filter((goal) =>
        goal.date !== date
        || goal.origin === "manual"
        || goal.status === "Concluída"
        || Number(goal.actualMinutes) > 0
      );
      const protectedToday = preserved.filter((goal) => goal.date === date);
      const additions = Array.from({ length: Math.max(0, topics - protectedToday.length) }, (_, index) => ({
        id: `planejada-${reconcileCalls}-${index + 1}`,
        date,
        discipline: `Disciplina ${index + 1}`,
        subject: `Assunto ${index + 1}`,
        syllabusItemId: `edital-${index + 1}`,
        origin: "planejamento",
        status: "Pendente"
      }));
      const removed = targetState.dailyGoals
        .filter((goal) => goal.date === date && !preserved.includes(goal))
        .map((goal) => goal.id);
      targetState.dailyGoals = [...preserved, ...additions];
      return {
        date,
        added: additions.map((goal) => goal.id),
        removed,
        preserved: protectedToday.map((goal) => goal.id),
        warnings: [],
        found: topics,
        foundTopics: topics
      };
    },
    Date,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array
  };
  vm.runInNewContext(`${alignmentSource}; result = {
    dailyPlanAlignmentStatusV174,
    ensureDailyPlanAlignedWithPlanningV174
  };`, context);
  return { ...context.result, reconcileCalls: () => reconcileCalls };
}

test("abrir o Plano do Dia substitui somente a projeção automática divergente", () => {
  const runtime = alignmentRuntime(5);
  const targetState = {
    planning: { config: { disciplinesPerDay: 5 }, availability: {} },
    syllabusItems: Array.from({ length: 5 }, (_, index) => ({
      id: `edital-${index + 1}`,
      discipline: `Disciplina ${index + 1}`,
      subject: `Assunto ${index + 1}`,
      status: "Não iniciado"
    })),
    schedulableSettings: {},
    disciplineWeights: {},
    dailyGoals: [
      { id: "automatica-antiga", date: "2026-07-29", discipline: "Antiga", subject: "Meta antiga", origin: "planejamento", status: "Pendente" },
      { id: "concluida", date: "2026-07-29", discipline: "Preservada", subject: "Meta concluída", origin: "planejamento", status: "Concluída", actualMinutes: 40 }
    ]
  };

  const first = runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-07-29");
  assert.equal(first.changed, true);
  assert.deepEqual([...first.report.removed], ["automatica-antiga"]);
  assert.ok(targetState.dailyGoals.some((goal) => goal.id === "concluida"));
  assert.equal(targetState.dailyGoals.length, 5);
  assert.equal(runtime.reconcileCalls(), 1);

  const second = runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-07-29");
  assert.equal(second.changed, false);
  assert.equal(second.skipped, "already-aligned");
  assert.equal(runtime.reconcileCalls(), 1, "não deve recalcular novamente quando nada mudou");
});

test("alteração real no planejamento invalida o alinhamento salvo", () => {
  const runtime = alignmentRuntime(5);
  const targetState = {
    planning: { config: { disciplinesPerDay: 5, mode: "goals_only" }, availability: {} },
    syllabusItems: [{ id: "edital-1", discipline: "A", subject: "B", status: "Não iniciado" }],
    schedulableSettings: {},
    disciplineWeights: {},
    dailyGoals: []
  };

  runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-07-29");
  assert.equal(runtime.reconcileCalls(), 1);
  targetState.planning.config.mode = "questions_and_goals";
  assert.equal(runtime.dailyPlanAlignmentStatusV174(targetState, "2026-07-29").aligned, false);
  runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-07-29");
  assert.equal(runtime.reconcileCalls(), 2);
});

test("dia sem metas planejadas não autoriza exclusão automática", () => {
  const runtime = alignmentRuntime(0);
  const targetState = {
    planning: { config: {}, availability: {} },
    syllabusItems: [],
    schedulableSettings: {},
    disciplineWeights: {},
    dailyGoals: [{ id: "existente", date: "2026-07-29", origin: "planejamento", status: "Pendente" }]
  };

  const result = runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-07-29");
  assert.equal(result.changed, false);
  assert.equal(result.skipped, "zero-target-safety");
  assert.equal(runtime.reconcileCalls(), 0);
  assert.equal(targetState.dailyGoals.length, 1);
});

test("a tela alinha antes de calcular o resumo e evita reutilizar HTML obsoleto", () => {
  const renderStart = source.indexOf("function renderDailyGoals()");
  const renderEnd = source.indexOf("function renderNextDailyGoal", renderStart);
  const renderBlock = source.slice(renderStart, renderEnd);
  assert.ok(renderBlock.indexOf("ensureDailyPlanAlignedWithPlanningV174(state, date)") < renderBlock.indexOf("const dayGoals ="));
  assert.match(renderBlock, /saveData\(\{ markLocalChange: true \}\)/);

  const viewStart = source.indexOf("function showView(");
  const viewBlock = source.slice(viewStart, source.indexOf('document.addEventListener("click"', viewStart));
  assert.match(viewBlock, /dailyPlanAlignmentStatusV174/);
  assert.match(viewBlock, /viewRenderCacheV172\.delete\(target\)/);
  assert.match(viewBlock, /Alinhando as metas ao planejamento vigente/);
});

test("ações explícitas e manutenção registram o mesmo alinhamento", () => {
  const refreshStart = source.indexOf("function refreshDailyGoalsFromPlanning()");
  const refreshBlock = source.slice(refreshStart, source.indexOf("function appendGoalHistory", refreshStart));
  assert.match(refreshBlock, /markDailyPlanAlignmentV174\(state, date\)/);

  const maintenanceStart = source.indexOf("async function runPostInteractiveBootstrapMaintenanceV169");
  const maintenanceBlock = source.slice(maintenanceStart, source.indexOf("async function bootstrapApplication", maintenanceStart));
  assert.match(maintenanceBlock, /ensureDailyPlanAlignedWithPlanningV174\(state, todayISO\(\)\)/);
  assert.match(maintenanceBlock, /viewRenderCacheV172\.delete\("metas-do-dia"\)/);
});
