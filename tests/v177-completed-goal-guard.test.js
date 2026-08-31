const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "completed-goal-guard-v177.js"), "utf8");

function makeContext() {
  const listeners = new Map();
  const state = {
    syllabusItems: [
      { id: "done", discipline: "Direito Penal", subject: "Crimes contra a pessoa", status: "Concluído" },
      { id: "new", discipline: "Direito Penal", subject: "Crimes patrimoniais", status: "Não iniciado" },
      { id: "questions", discipline: "Processo Penal", subject: "Inquérito", status: "Não iniciado", tipo_agendamento: "Questões apenas" }
    ],
    dailyGoals: [
      { id: "duplicate-completed", syllabusItemId: "done", discipline: "Direito Penal", subject: "Crimes contra a pessoa", status: "Pendente", type: "Reforço", origin: "planejamento" },
      { id: "automatic-reinforcement", syllabusItemId: "new", discipline: "Direito Penal", subject: "Crimes patrimoniais", status: "Pendente", type: "Reforço", origin: "planejamento" },
      { id: "manual-reinforcement", syllabusItemId: "new", discipline: "Direito Penal", subject: "Crimes patrimoniais", status: "Pendente", type: "Reforço", origin: "manual" },
      { id: "executed-reinforcement", syllabusItemId: "new", discipline: "Direito Penal", subject: "Crimes patrimoniais", status: "Pendente", type: "Reforço", origin: "planejamento", actualMinutes: 10 },
      { id: "historical-reinforcement", syllabusItemId: "new", discipline: "Direito Penal", subject: "Crimes patrimoniais", status: "Pendente", type: "Reforço", origin: "planejamento", history: ["editada"] },
      { id: "completed-goal", syllabusItemId: "done", discipline: "Direito Penal", subject: "Crimes contra a pessoa", status: "Concluída", type: "Estudo novo", origin: "planejamento" }
    ],
    materials: [{ id: "material-1", syllabusItemId: "done" }],
    studies: [{ id: "study-1", syllabusItemId: "done" }],
    questionLogs: [{ id: "question-1", syllabusItemId: "done" }],
    migrations: {}
  };
  let saveCalls = 0;
  let renderCalls = 0;
  let syncCalls = 0;
  const context = {
    console, Date, Map, Object, String, Number, Array, Boolean,
    state,
    __aldusBootstrapReady: false,
    isManualDailyGoal(goal) { return goal.origin === "manual"; },
    isGoalDone(goal) { return goal.status === "Concluída"; },
    goalTotalActualMinutes(goal) { return Number(goal.actualMinutes || 0); },
    normalGoalTypeForItemV157(item) { return item.tipo_agendamento === "Questões apenas" ? "Questões" : "Estudo novo"; },
    completedPlanningSubjectRecords(targetState) {
      return [...targetState.syllabusItems.filter((item) => item.status === "Concluído"), ...targetState.dailyGoals.filter((goal) => goal.status === "Concluída")];
    },
    planningRecordMatchesCompletedSubject(record, completed) {
      const recordId = record.syllabusItemId || record.id;
      return completed.some((item) => (item.syllabusItemId || item.id) === recordId);
    },
    planningGoalTypeForItemV157() { return "Reforço"; },
    buildPlanningScoreContext() { return { candidates: state.syllabusItems.slice(), diagnosticMetrics: new Map() }; },
    saveData() { saveCalls += 1; },
    render() { renderCalls += 1; },
    autoSyncAfterSave() { syncCalls += 1; }
  };
  context.window = context;
  context.globalThis = context;
  context.addEventListener = (type, listener) => {
    const items = listeners.get(type) || [];
    items.push(listener);
    listeners.set(type, items);
  };
  context.dispatchEvent = (event) => {
    for (const listener of listeners.get(event.type) || []) listener(event);
  };
  context.getCounters = () => ({ saveCalls, renderCalls, syncCalls });
  context.getListeners = () => listeners;
  vm.createContext(context);
  return context;
}

test("V419 bootstrap, pós-bootstrap, pageshow e storage não alteram metas concluídas automaticamente", () => {
  const context = makeContext();
  const before = JSON.stringify(context.state);
  vm.runInContext(source, context, { filename: "completed-goal-guard-v177.js" });
  for (const type of ["aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete", "pageshow", "storage"]) {
    context.dispatchEvent({ type, persisted: true });
  }
  assert.equal(JSON.stringify(context.state), before);
  assert.deepEqual(context.getCounters(), { saveCalls: 0, renderCalls: 0, syncCalls: 0 });
  assert.equal(context.__aldusCompletedGoalGuardV177.automaticMutationDisabled, true);
  assert.equal(context.getListeners().size, 0);
});

test("V419 impede assuntos concluídos e reforço automático nas gerações futuras", () => {
  const context = makeContext();
  vm.runInContext(source, context);
  assert.equal(context.planningGoalTypeForItemV157(context.state.syllabusItems[1]), "Estudo novo");
  assert.deepEqual(context.buildPlanningScoreContext().candidates.map((item) => item.id), ["new", "questions"]);
});

test("V419 reparo V177 exige autorização explícita, preserva protegidas e é idempotente", () => {
  const context = makeContext();
  vm.runInContext(source, context);
  const before = JSON.stringify(context.state.dailyGoals);
  const blocked = context.__aldusCompletedGoalGuardV177.runAudit("bootstrap-ready");
  assert.equal(blocked.skipped, "explicit-authorization-required");
  assert.equal(JSON.stringify(context.state.dailyGoals), before);
  assert.deepEqual(context.getCounters(), { saveCalls: 0, renderCalls: 0, syncCalls: 0 });

  const report = context.__aldusCompletedGoalGuardV177.runAudit("manual-repair", { explicit: true, allowMutations: true });
  assert.equal(report.changed, true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "duplicate-completed"), false);
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "automatic-reinforcement").type, "Estudo novo");
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "manual-reinforcement").type, "Reforço");
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "executed-reinforcement").type, "Reforço");
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "historical-reinforcement").type, "Reforço");
  assert.equal(context.state.dailyGoals.find((goal) => goal.id === "completed-goal").status, "Concluída");
  assert.deepEqual(context.state.materials, [{ id: "material-1", syllabusItemId: "done" }]);
  assert.deepEqual(context.state.studies, [{ id: "study-1", syllabusItemId: "done" }]);
  assert.deepEqual(context.state.questionLogs, [{ id: "question-1", syllabusItemId: "done" }]);
  assert.deepEqual(context.getCounters(), { saveCalls: 1, renderCalls: 1, syncCalls: 1 });

  const second = context.__aldusCompletedGoalGuardV177.runAudit("manual-repair", { explicit: true, allowMutations: true });
  assert.equal(second.changed, false);
  assert.deepEqual(context.getCounters(), { saveCalls: 1, renderCalls: 1, syncCalls: 1 });
  assert.equal(source.includes("MutationObserver"), false);
  assert.equal(source.includes("serviceWorker"), false);
  assert.equal(source.includes("RUNTIME_PATCH_ASSET"), false);
});
