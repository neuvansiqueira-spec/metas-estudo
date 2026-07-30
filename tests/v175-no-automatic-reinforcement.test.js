const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "reinforcement-goal-presentation-v156.js"),
  "utf8"
);

function makeContext() {
  const goals = [
    { id: "auto-pending", syllabusItemId: "a", type: "Reforço", tipo: "reforco", status: "Pendente", origin: "planejamento", marker: "preserve" },
    { id: "manual-pending", syllabusItemId: "a", type: "Reforço", tipo: "reforco", status: "Pendente", origin: "manual" },
    { id: "executed", syllabusItemId: "a", type: "Reforço", tipo: "reforco", status: "Pendente", origin: "planejamento", actualMinutes: 10 },
    { id: "historical", syllabusItemId: "a", type: "Reforço", tipo: "reforco", status: "Pendente", origin: "planejamento", history: ["já alterada"] },
    { id: "completed", syllabusItemId: "a", type: "Reforço", tipo: "reforco", status: "Concluída", origin: "planejamento", completedAt: "2026-07-20T10:00:00Z" }
  ];
  const state = {
    dailyGoals: goals,
    syllabusItems: [{ id: "a", status: "Não iniciado", importMeta: { tipo_agendamento: "Estudo teórico" } }],
    schedulableSettings: {},
    migrations: {},
    materials: [{ id: "material-1", syllabusItemId: "a" }],
    studies: [{ id: "study-1", syllabusItemId: "a" }],
    questionLogs: [{ id: "question-1", syllabusItemId: "a" }]
  };
  let saveCalls = 0;
  let renderCalls = 0;
  let syncCalls = 0;
  const document = {
    hidden: false,
    head: { appendChild() {} },
    createElement() {
      return {
        dataset: {},
        classList: { toggle() {} },
        append() {},
        prepend() {},
        querySelector() { return null; },
        querySelectorAll() { return []; }
      };
    },
    getElementById() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const context = {
    console,
    Date,
    Map,
    Object,
    String,
    Number,
    Array,
    Boolean,
    setTimeout,
    clearTimeout,
    document,
    MutationObserver: function MutationObserver() { this.observe = () => {}; },
    state,
    normalGoalTypeForItemV157(item) {
      return item.status === "Revisar" ? "Revisão" : "Estudo novo";
    },
    planningGoalTypeForItemV157() { return "Reforço"; },
    isManualDailyGoal(goal) { return goal.origin === "manual"; },
    saveData() { saveCalls += 1; },
    render() { renderCalls += 1; },
    autoSyncAfterSave() { syncCalls += 1; }
  };
  context.window = context;
  context.window.requestAnimationFrame = (callback) => callback();
  context.window.addEventListener = () => {};
  context.window.setTimeout = setTimeout;
  context.getCounters = () => ({ saveCalls, renderCalls, syncCalls });
  return context;
}

test("desativa Reforço automático e preserva metas protegidas", () => {
  const context = makeContext();
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "reinforcement-goal-presentation-v156.js" });

  assert.equal(context.planningGoalTypeForItemV157({ id: "a", status: "Não iniciado" }, "2026-07-29", null, context.state), "Estudo novo");

  const byId = Object.fromEntries(context.state.dailyGoals.map((goal) => [goal.id, goal]));
  assert.equal(byId["auto-pending"].type, "Estudo novo");
  assert.equal(byId["auto-pending"].tipo, "estudo novo");
  assert.equal(byId["auto-pending"].id, "auto-pending");
  assert.equal(byId["auto-pending"].marker, "preserve");

  assert.equal(byId["manual-pending"].type, "Reforço");
  assert.equal(byId.executed.type, "Reforço");
  assert.equal(byId.historical.type, "Reforço");
  assert.equal(byId.completed.type, "Reforço");

  assert.deepEqual(context.state.materials, [{ id: "material-1", syllabusItemId: "a" }]);
  assert.deepEqual(context.state.studies, [{ id: "study-1", syllabusItemId: "a" }]);
  assert.deepEqual(context.state.questionLogs, [{ id: "question-1", syllabusItemId: "a" }]);
  assert.equal(context.state.migrations.noAutomaticReinforcementV175.corrected, 1);
  assert.deepEqual(context.getCounters(), { saveCalls: 1, renderCalls: 1, syncCalls: 1 });
});

test("migração é idempotente", () => {
  const context = makeContext();
  vm.createContext(context);
  vm.runInContext(source, context);
  const firstSnapshot = JSON.stringify(context.state.dailyGoals);
  vm.runInContext(source, context);
  assert.equal(JSON.stringify(context.state.dailyGoals), firstSnapshot);
});
