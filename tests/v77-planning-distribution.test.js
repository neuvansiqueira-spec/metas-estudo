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

function canonical(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function addDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

test("a rotação evita repetir no dia seguinte uma disciplina quando existe alternativa", () => {
  const context = {
    state: {}, canonical, addDays,
    todayISO: () => "2026-07-20",
    goalDateValue: (goal) => goal.date || "",
    isPlanningStudyGoal: () => true,
    disciplineWeightValue: () => 3,
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function planningDistributionProfileV77", "function planningTargetsForDate"), context);
  const targetState = { dailyGoals: [{ date: "2026-07-19", discipline: "Disciplina A", type: "Estudo novo", status: "Pendente" }] };
  const ordered = context.planningDistributionOrderV77([
    { id: "a", discipline: "Disciplina A", subject: "A1" },
    { id: "b", discipline: "Disciplina B", subject: "B1" },
  ], targetState, "2026-07-20", { scores: new Map([["a", 100], ["b", 10]]) });
  assert.equal(ordered[0].discipline, "Disciplina B");
});

test("conclusão remove somente a meta automática futura e solicita sua reposição", () => {
  const context = {
    state: {},
    todayISO: () => "2026-07-20",
    goalDateValue: (goal) => goal.date || "",
    isManualDailyGoal: (goal) => goal.origin === "manual",
    shouldRecalculateDailyGoal: (goal) => goal.status === "Pendente" && !goal.actualMinutes,
    planningRecordMatchesCompletedSubject: (goal, completed) => goal.discipline === completed[0].discipline && goal.subject === completed[0].subject,
    buildPlanningScoreContext: () => ({}),
    reconcilePlanningDates: (_state, dates) => ({ added: dates.map((date) => `nova-${date}`), warnings: [] }),
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function replanFutureGoalsAfterCompletionV77", "function rebalanceFuturePlanningGoalsV77"), context);
  const completed = { id: "done", date: "2026-07-20", discipline: "A", subject: "Assunto 1", status: "Concluída" };
  const stale = { id: "stale", date: "2026-07-21", discipline: "A", subject: "Assunto 1", status: "Pendente", origin: "planejamento" };
  const manual = { id: "manual", date: "2026-07-22", discipline: "A", subject: "Assunto 1", status: "Pendente", origin: "manual" };
  const targetState = { dailyGoals: [completed, stale, manual] };
  const report = context.replanFutureGoalsAfterCompletionV77(completed, targetState);
  assert.deepEqual([...report.removed], ["stale"]);
  assert.deepEqual([...report.added], ["nova-2026-07-21"]);
  assert.equal(targetState.dailyGoals.includes(stale), false);
  assert.equal(targetState.dailyGoals.includes(manual), true);
});

test("conclusões no plano e no edital acionam a atualização do calendário", () => {
  assert.match(script, /replanFutureGoalsAfterCompletionV77\(goal, state\)/);
  assert.match(script, /if \(!wasCompleted && completedStatus\(item\)\) replanFutureGoalsAfterCompletionV77\(item, state\)/);
  assert.match(script, /function updateItemProgress[\s\S]*replanFutureGoalsAfterCompletionV77\(item, state\)/);
});

test("a primeira abertura redistribui apenas metas automáticas futuras intactas", () => {
  assert.match(script, /function rebalanceFuturePlanningGoalsV77/);
  assert.match(script, /reconcilePlanningDates\(targetState, dates, \{ rebuildAutomatic: true \}\)/);
  assert.match(script, /rebalanceFuturePlanningGoalsV77\(state\)/);
  assert.match(script, /!isManualDailyGoal\(goal\) && isAutomaticIntactDailyGoal\(goal\)/);
});

test("V77 mantém versão, cache e publicação em paridade", () => {
  const version = "20260720-distribuicao-reposicao-v77";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-concluidas-visibilidade-v76"/);
  for (const file of ["script.js", "index.html", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
