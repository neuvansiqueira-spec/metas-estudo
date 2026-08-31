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
    todayISO: () => "2026-08-31",
    planningTargetsForDate: () => ({ topics, disciplines: topics, dayContent: { mode: "goals_only" }, unavailable: topics <= 0 }),
    goalDateValue: (goal) => goal.date || goal.data || "",
    isPlanningStudyGoal: () => true,
    isManualDailyGoal: (goal) => goal.origin === "manual",
    planningItemKey: (goal) => `${goal.discipline}|${goal.subject}`,
    goalTotalActualMinutes: (goal) => Number(goal.actualMinutes) || 0,
    normalizePlanningState: (planning) => ({ config: {}, availability: {}, ...planning }),
    reconcileDailyGoalsWithPlanning(targetState, date, opts) {
      reconcileCalls += 1;
      assert.equal(opts.rebuildAutomatic, true);
      assert.equal(opts.explicit === true || opts.allowRebuild === true, true);
      const protectedGoals = targetState.dailyGoals.filter((goal) => goal.date !== date || goal.origin === "manual" || goal.status !== "Pendente" || Number(goal.actualMinutes) > 0 || goal.userEdited === true);
      const removed = targetState.dailyGoals.filter((goal) => goal.date === date && !protectedGoals.includes(goal)).map((goal) => goal.id);
      const protectedToday = protectedGoals.filter((goal) => goal.date === date);
      const additions = Array.from({ length: Math.max(0, topics - protectedToday.length) }, (_, index) => ({
        id: `planejada-${index + 1}`,
        date,
        discipline: `Disciplina ${index + 1}`,
        subject: `Assunto ${index + 1}`,
        syllabusItemId: `edital-${index + 1}`,
        origin: "planejamento",
        status: "Pendente"
      }));
      targetState.dailyGoals = [...protectedGoals, ...additions];
      return { added: additions.map((goal) => goal.id), removed, preserved: protectedToday.map((goal) => goal.id), warnings: [], found: topics, foundTopics: topics };
    },
    Date, JSON, Math, Number, String, Object, Array
  };
  vm.runInNewContext(`${alignmentSource}; result = { dailyPlanAlignmentStatusV174, ensureDailyPlanAlignedWithPlanningV174 };`, context);
  return { ...context.result, reconcileCalls: () => reconcileCalls };
}

function stateWithGoals(count = 5) {
  return {
    planning: { config: { disciplinesPerDay: count, topicsPerDay: count }, availability: {} },
    syllabusItems: Array.from({ length: count }, (_, index) => ({ id: `edital-${index + 1}`, discipline: `D${index + 1}`, subject: `S${index + 1}`, status: "Não iniciado" })),
    schedulableSettings: {}, disciplineWeights: {},
    dailyGoals: Array.from({ length: count }, (_, index) => ({ id: `meta-${index + 1}`, date: "2026-08-31", discipline: `D${index + 1}`, subject: `S${index + 1}`, origin: "planejamento", status: "Pendente" }))
  };
}

test("abrir o Plano do Dia não autoriza reconstrução nem altera dailyGoals", () => {
  const runtime = alignmentRuntime(5);
  const targetState = stateWithGoals(5);
  const before = JSON.stringify(targetState.dailyGoals);
  const result = runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-08-31");
  assert.equal(result.changed, false);
  assert.equal(result.skipped, "explicit-authorization-required");
  assert.equal(runtime.reconcileCalls(), 0);
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
});

test("somente ação explícita pode reconstruir e preserva metas protegidas", () => {
  const runtime = alignmentRuntime(5);
  const targetState = stateWithGoals(5);
  targetState.dailyGoals[0] = { ...targetState.dailyGoals[0], id: "manual", origin: "manual" };
  targetState.dailyGoals[1] = { ...targetState.dailyGoals[1], id: "editada", userEdited: true };
  const result = runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-08-31", { explicit: true, allowRebuild: true, force: true });
  assert.equal(result.changed, true);
  assert.equal(runtime.reconcileCalls(), 1);
  assert.ok(targetState.dailyGoals.some((goal) => goal.id === "manual"));
  assert.ok(targetState.dailyGoals.some((goal) => goal.id === "editada"));
});

test("dia com alvo zero não autoriza exclusão nem mesmo em atualização explícita", () => {
  const runtime = alignmentRuntime(0);
  const targetState = stateWithGoals(1);
  const before = JSON.stringify(targetState.dailyGoals);
  const result = runtime.ensureDailyPlanAlignedWithPlanningV174(targetState, "2026-08-31", { explicit: true, allowRebuild: true });
  assert.equal(result.changed, false);
  assert.equal(result.skipped, "zero-target-safety");
  assert.equal(runtime.reconcileCalls(), 0);
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
});

test("renderDailyGoals é somente leitura sobre o estado das metas", () => {
  const start = source.indexOf("function renderDailyGoals()");
  const block = source.slice(start, source.indexOf("function renderNextDailyGoal", start));
  assert.match(block, /dailyPlanAlignmentStatusV174\(state, date\)/);
  assert.match(block, /map\(\(goal\) => cloneData\(goal\)\)/);
  assert.doesNotMatch(block, /ensureDailyPlanAlignedWithPlanningV174|reconcileDailyGoalsWithPlanning|saveData\(/);
  assert.match(block, /stateMutatedDuringRender: false/);
});

test("bootstrap e manutenção pós-bootstrap mantêm dailyGoals somente para diagnóstico", () => {
  const maintenanceStart = source.indexOf("async function runPostInteractiveBootstrapMaintenanceV169");
  const maintenance = source.slice(maintenanceStart, source.indexOf("async function bootstrapApplication", maintenanceStart));
  for (const forbidden of ["repairAutomaticGoalDuplicatesV75(state)", "repairCompletedPlanningGoalsV76(state)", "rebalanceFuturePlanningGoalsV77(state)", "rebalanceCurrentWeekV78(state)", "rebalanceCurrentMonthV79(state)", "ensureDailyPlanAlignedWithPlanningV174(state"]) {
    assert.equal(maintenance.includes(forbidden), false, `${forbidden} não pode executar no startup`);
  }
  const bootstrapStart = source.indexOf("async function bootstrapApplication");
  const bootstrap = source.slice(bootstrapStart);
  assert.match(bootstrap, /diagnostico-plano-dia-deterministico-v417/);
  assert.doesNotMatch(bootstrap, /replenishMissingDailyPlanningGoalsV116\(state, todayISO\(\)\)/);
});
