const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

test("seis assuntos semanais ocupam seis dias antes de repetir um dia", () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(sourceBetween("function balancedWeeklyDateSlotsV78", "function buildBalancedWeekGenerationV78"), context);
  const dates = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25"];
  const capacity = new Map(dates.map((date) => [date, 3]));
  const six = context.balancedWeeklyDateSlotsV78(dates, capacity, new Map(), 6);
  assert.deepEqual([...six], dates);
  const eight = context.balancedWeeklyDateSlotsV78(dates, capacity, new Map(), 8);
  assert.deepEqual([...eight], [...dates, dates[0], dates[1]]);
});

test("uma semana concentrada em dois dias é reconstruída do dia atual em diante", () => {
  let candidateIndex = 0;
  const candidates = Array.from({ length: 8 }, (_, index) => ({ id: `new-${index}`, syllabusItemId: `s-${index}`, discipline: `D${index}`, subject: `A${index}`, date: "", status: "Pendente" }));
  const context = {
    state: {},
    todayISO: () => "2026-07-20",
    weekStart: () => "2026-07-19",
    addDays: (date, days) => {
      const value = new Date(`${date}T12:00:00Z`);
      value.setUTCDate(value.getUTCDate() + days);
      return value.toISOString().slice(0, 10);
    },
    daysBetween: (start, count) => Array.from({ length: count }, (_, index) => context.addDays(start, index)),
    goalDateValue: (goal) => goal.date,
    isPlanningStudyGoal: () => true,
    isManualDailyGoal: () => false,
    isAutomaticIntactDailyGoal: () => true,
    planningConfig: () => ({ topicsPerWeek: 6, weeklyTopics: 6, disciplinesPerWeek: 6 }),
    planningTargetsForDate: () => ({ topics: 3, disciplines: 2 }),
    buildPlanningScoreContext: () => ({ scores: new Map() }),
    reserveGeneratedSyllabus: (set, goals) => goals.forEach((goal) => set.add(goal.syllabusItemId || goal.id)),
    eligiblePlanningGoalsForDate: (date) => [{ ...candidates[candidateIndex++], date }],
    selectPlanningGoalsForTargets: ({ eligibleGoals }) => ({ selected: eligibleGoals.slice(0, 1) }),
    canonical: (value) => String(value || "").toLowerCase(),
    goalSyllabusReservationKey: (goal) => goal.syllabusItemId || goal.id,
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function balancedWeeklyDateSlotsV78", "function applyBalancedWeekGenerationV78"), context);
  const oldGoals = Array.from({ length: 6 }, (_, index) => ({ id: `old-${index}`, date: index < 3 ? "2026-07-19" : "2026-07-20", discipline: "Antiga", subject: `Assunto ${index}`, status: "Pendente" }));
  const plan = context.buildBalancedWeekGenerationV78({ dailyGoals: oldGoals }, "2026-07-20");
  assert.equal(plan.complete, true);
  assert.equal(plan.replaceableGoals.length, 6);
  assert.deepEqual([...new Set(plan.made.map((goal) => goal.date))], ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25"]);
});

test("aplicação semanal preserva registros protegidos e troca somente automáticos intactos", () => {
  const context = {
    state: {},
    goalDateValue: (goal) => goal.date,
    planningItemKey: (goal) => `${goal.discipline}|${goal.subject}`,
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function applyBalancedWeekGenerationV78", "function rebalanceCurrentWeekV78"), context);
  const protectedGoal = { id: "manual", date: "2026-07-20", discipline: "A", subject: "Manual", origin: "manual" };
  const replaceableGoal = { id: "old", date: "2026-07-20", discipline: "B", subject: "Antigo", origin: "planejamento" };
  const newGoal = { id: "new", date: "2026-07-21", discipline: "C", subject: "Novo" };
  const targetState = { dailyGoals: [protectedGoal, replaceableGoal] };
  const report = context.applyBalancedWeekGenerationV78(targetState, { complete: true, replaceableGoals: [replaceableGoal], made: [newGoal] });
  assert.equal(report.changed, true);
  assert.deepEqual([...report.removed], ["old"]);
  assert.deepEqual([...report.added], ["new"]);
  assert.equal(targetState.dailyGoals.includes(protectedGoal), true);
  assert.equal(targetState.dailyGoals.includes(replaceableGoal), false);
  assert.equal(targetState.dailyGoals.includes(newGoal), true);
});

test("geração semanal usa plano equilibrado e não empilha metas nos primeiros dias", () => {
  const block = sourceBetween("function generateWeekGoals", "function generateMonthGoals");
  assert.match(block, /buildBalancedWeekGenerationV78\(state, reference\)/);
  assert.match(block, /saveGeneratedGoals\("Pré-visualização semanal equilibrada", plan\.made, \{ balancedPlan: plan \}\)/);
  assert.doesNotMatch(block, /daysBetween\(start, 7\)\.forEach/);
  assert.match(script, /if \(balancedPlan && !balancedPlan\.complete\)[\s\S]*Nenhuma meta existente foi removida/);
});

test("a primeira abertura da V78 corrige a semana atual automaticamente", () => {
  assert.match(script, /function rebalanceCurrentWeekV78/);
  assert.match(script, /rebalanceCurrentWeekV78\(state\)/);
  assert.match(script, /balancedWeeklyCalendarV78/);
  assert.match(script, /!isManualDailyGoal\(goal\) && isAutomaticIntactDailyGoal\(goal\)/);
});

test("V83 mantém a distribuição semanal da V78 e os arquivos publicados em paridade", () => {
  const version = "20260720-navegacao-recolhida-nova-marca-v93";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-calendario-semanal-v78"/);
  for (const file of ["script.js", "index.html", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
