const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("manual-goal-additive-v379.js", "utf8");

function runtime() {
  const context = {
    module: { exports: {} }, exports: {}, console,
    Map, Set, String, Object, Array, Number, Date,
    queueMicrotask, setTimeout, clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.module.exports, context };
}

test("V401 vincula o cronômetro à execução do dia atual sem mover a meta histórica", () => {
  const { api, context } = runtime();
  const oldGoal = {
    id: "meta-25",
    date: "2026-08-25",
    data: "2026-08-25",
    syllabusItemId: "item-penal",
    discipline: "Direito Penal",
    subject: "Crimes contra a dignidade sexual",
    origin: "planejamento",
    status: "Em andamento",
    minutes: 60,
    actualMinutes: 20,
    studyActualMinutes: 20
  };
  const state = { dailyGoals: [oldGoal] };
  context.state = state;
  let startedGoal = null;
  context.startFloatingTimer = (goal) => { startedGoal = goal; };
  api.installResumeActions();

  // A função pura fixa a data de teste; o wrapper usa a mesma rotina em produção.
  const report = api.ensureTodayExecutionGoal(oldGoal, state, "2026-08-26");
  context.startFloatingTimer(report.goal, "study");

  assert.equal(report.created, true);
  assert.equal(startedGoal.id, report.goal.id);
  assert.equal(startedGoal.date, "2026-08-26");
  assert.equal(startedGoal.minutes, 40);
  assert.equal(startedGoal.resumedFromGoalId, "meta-25");
  assert.equal(oldGoal.date, "2026-08-25");
  assert.equal(oldGoal.actualMinutes, 20);
});

test("V401 mantém a retomada fora da cota automática do Plano do Dia", () => {
  const { api } = runtime();
  const oldGoal = {
    id: "meta-24",
    date: "2026-08-24",
    syllabusItemId: "item-adm",
    discipline: "Direito Administrativo",
    subject: "Atos administrativos",
    origin: "planejamento",
    status: "Pendente",
    minutes: 50
  };
  const state = { dailyGoals: [oldGoal] };
  const report = api.ensureTodayExecutionGoal(oldGoal, state, "2026-08-26");

  assert.equal(report.goal.manual, true);
  assert.equal(api.isManualGoal(report.goal), true);
  assert.match(report.goal.origin, /retomada de meta anterior/);
});

test("V401 não cria duas execuções do mesmo vínculo no mesmo dia", () => {
  const { api } = runtime();
  const oldGoal = {
    id: "meta-repetida",
    date: "2026-08-25",
    syllabusItemId: "item-proc",
    discipline: "Processo Penal",
    subject: "Citações e intimações",
    status: "Pendente",
    minutes: 50
  };
  const state = { dailyGoals: [oldGoal] };
  const first = api.ensureTodayExecutionGoal(oldGoal, state, "2026-08-26");
  const second = api.ensureTodayExecutionGoal(oldGoal, state, "2026-08-26");

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.goal.id, first.goal.id);
  assert.equal(state.dailyGoals.length, 2);
});
