const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseState(item = {}) {
  const syllabusItem = {
    id: "item-a",
    discipline: "Direito Constitucional",
    subject: "Poder Constituinte",
    status: "Não iniciado",
    domain: "Não avaliado",
    priority: "Alta",
    ...item
  };
  return {
    syllabusItems: [syllabusItem],
    schedulableSettings: { [syllabusItem.id]: { mode: "Estudo teórico" } },
    dailyGoals: [],
    studies: [],
    questionLogs: [],
    questionBankSessions: [],
    smartReviews: [],
    materials: [],
    diagnosticByItem: {}
  };
}

function v157Runtime(targetState) {
  const start = script.indexOf("const REINFORCEMENT_CLASSIFICATION_VERSION_V157");
  const end = script.indexOf("const DISCIPLINE_WEIGHT_OPTIONS", start);
  assert.ok(start >= 0 && end > start);
  const diagnosticMap = (state) => new Map(
    (state.syllabusItems || []).map((item) => [item.id, state.diagnosticByItem?.[item.id] || { boost: 0 }])
  );
  const context = {
    state: targetState,
    todayISO: () => "2026-07-27",
    goalDateValue: (goal = {}) => goal.date || goal.data || "",
    canonical: (value) => String(value || "").trim().toLowerCase(),
    isManualDailyGoal: (goal = {}) => Boolean(goal.manual || goal.origin === "manual" || goal.origem === "manual"),
    buildPlanningScoreContext: (state) => ({
      itemMetrics: new Map(
        (state.syllabusItems || []).map((item) => [
          item.id,
          { diagnostic: state.diagnosticByItem?.[item.id] || { boost: 0 } }
        ])
      )
    }),
    planningPriorityMetricsV155: diagnosticMap,
    console,
    Map,
    Set,
    Math,
    Number,
    String,
    Object,
    Array,
    JSON
  };
  vm.createContext(context);
  vm.runInContext(`${script.slice(start, end)}
    result = {
      normalGoalTypeForItemV157,
      hasValidPriorStudyForReinforcementV157,
      hasValidReinforcementTriggerV157,
      planningGoalTypeForItemV157,
      repairInvalidReinforcementGoalsV157
    };`, context);
  return context.result;
}

function goal(overrides = {}) {
  return {
    id: "goal-current",
    syllabusItemId: "item-a",
    date: "2026-07-27",
    data: "2026-07-27",
    discipline: "Direito Constitucional",
    subject: "Poder Constituinte",
    type: "Reforço",
    tipo: "reforço",
    priority: "Alta",
    status: "Pendente",
    ...overrides
  };
}

test("assunto nunca estudado permanece normal mesmo com diagnostic.boost", () => {
  const state = baseState();
  state.diagnosticByItem["item-a"] = { boost: 144, wrong: 2, correct: 0 };
  const runtime = v157Runtime(state);
  assert.equal(
    runtime.planningGoalTypeForItemV157(
      state.syllabusItems[0],
      "2026-07-27",
      { diagnostic: state.diagnosticByItem["item-a"] },
      state,
      goal()
    ),
    "Estudo novo"
  );
});

test("reagendamento sem estudo anterior e material pronto não transformam a meta em reforço", () => {
  const state = baseState();
  state.materials.push({ id: "material-a", syllabusItemId: "item-a", available: true });
  state.diagnosticByItem["item-a"] = { boost: 72, wrong: 1, correct: 0 };
  const runtime = v157Runtime(state);
  assert.equal(
    runtime.planningGoalTypeForItemV157(
      state.syllabusItems[0],
      "2026-07-30",
      { diagnostic: state.diagnosticByItem["item-a"] },
      state,
      goal({ date: "2026-07-30", data: "2026-07-30", rescheduledFrom: "2026-07-27" })
    ),
    "Estudo novo"
  );
});

test("estudo anterior sem gatilho válido gera o tipo normal oficial", () => {
  const state = baseState({ status: "Em andamento" });
  state.studies.push({ id: "study-a", syllabusItemId: "item-a", date: "2026-07-26", minutes: 30 });
  const runtime = v157Runtime(state);
  assert.equal(
    runtime.planningGoalTypeForItemV157(state.syllabusItems[0], "2026-07-27", null, state, goal()),
    "Questões"
  );
});

test("estudo anterior do mesmo UUID com baixo desempenho gera reforço", () => {
  const state = baseState({ status: "Em andamento" });
  state.studies.push({ id: "study-a", syllabusItemId: "item-a", date: "2026-07-25", minutes: 45 });
  state.questionLogs.push({
    id: "questions-a",
    syllabusItemId: "item-a",
    date: "2026-07-26",
    total: 5,
    correct: 1,
    wrong: 4,
    blank: 0
  });
  const runtime = v157Runtime(state);
  assert.equal(
    runtime.planningGoalTypeForItemV157(state.syllabusItems[0], "2026-07-27", null, state, goal()),
    "Reforço"
  );
});

test("meta de revisão prevalece sobre a classificação de reforço", () => {
  const state = baseState({ status: "Revisar", manualWeak: true, domain: "Fraco" });
  state.studies.push({ id: "study-a", syllabusItemId: "item-a", date: "2026-07-25", minutes: 45 });
  state.dailyGoals.push(goal());
  const runtime = v157Runtime(state);
  assert.equal(
    runtime.planningGoalTypeForItemV157(state.syllabusItems[0], "2026-07-27", null, state, goal()),
    "Revisão"
  );
  const report = clone(runtime.repairInvalidReinforcementGoalsV157(state));
  assert.equal(report.corrected.length, 1);
  assert.equal(state.dailyGoals[0].type, "Revisão");
  assert.equal(state.dailyGoals[0].tipo, "revisão");
});

test("execução da própria meta e assunto apenas parecido não contam como estudo anterior", () => {
  const state = baseState();
  state.syllabusItems.push({
    id: "item-b",
    discipline: "Direito Constitucional",
    subject: "Poder Constituinte — limites",
    status: "Estudado",
    domain: "Fraco"
  });
  state.studies.push(
    { id: "study-current", goalId: "goal-current", syllabusItemId: "item-a", date: "2026-07-26", minutes: 20 },
    { id: "study-similar", syllabusItemId: "item-b", date: "2026-07-25", minutes: 60 }
  );
  state.diagnosticByItem["item-a"] = { boost: 144, wrong: 2, correct: 0 };
  state.dailyGoals.push(goal({ actualMinutes: 20, studyActualMinutes: 20 }));
  const runtime = v157Runtime(state);
  assert.equal(
    runtime.hasValidPriorStudyForReinforcementV157(state.syllabusItems[0], state.dailyGoals[0], state),
    false
  );
  assert.equal(
    runtime.planningGoalTypeForItemV157(
      state.syllabusItems[0],
      "2026-07-27",
      { diagnostic: state.diagnosticByItem["item-a"] },
      state,
      state.dailyGoals[0]
    ),
    "Estudo novo"
  );
});

test("reparo altera somente type e tipo, preserva prioridade e é idempotente", () => {
  const state = baseState();
  state.diagnosticByItem["item-a"] = { boost: 72, wrong: 1, correct: 0 };
  state.dailyGoals.push(goal({ actualMinutes: 20, studyActualMinutes: 20 }));
  const before = clone(state);
  const runtime = v157Runtime(state);
  const first = clone(runtime.repairInvalidReinforcementGoalsV157(state));
  const afterFirst = clone(state);
  const second = clone(runtime.repairInvalidReinforcementGoalsV157(state));

  assert.equal(first.changed, true);
  assert.equal(first.corrected.length, 1);
  assert.equal(afterFirst.dailyGoals[0].type, "Estudo novo");
  assert.equal(afterFirst.dailyGoals[0].tipo, "estudo novo");
  assert.equal(afterFirst.dailyGoals[0].priority, before.dailyGoals[0].priority);
  assert.equal(second.changed, false);
  assert.equal(second.corrected.length, 0);

  delete before.dailyGoals[0].type;
  delete before.dailyGoals[0].tipo;
  delete afterFirst.dailyGoals[0].type;
  delete afterFirst.dailyGoals[0].tipo;
  assert.deepEqual(afterFirst, before);
});

test("metas concluídas, manuais e históricas não são modificadas", () => {
  const state = baseState();
  state.dailyGoals.push(
    goal({ id: "completed", status: "Concluída" }),
    goal({ id: "manual", manual: true }),
    goal({ id: "past", date: "2026-07-20", data: "2026-07-20", status: "Concluída" })
  );
  const before = clone(state);
  const runtime = v157Runtime(state);
  const report = clone(runtime.repairInvalidReinforcementGoalsV157(state));
  assert.equal(report.changed, false);
  assert.deepEqual(clone(state), before);
});

test("V157 protege carregamento, salvamento e payload sincronizado antigo", () => {
  const replaceSource = script.slice(script.indexOf("function replaceState"), script.indexOf("function mergeArrays"));
  const saveSource = script.slice(script.indexOf("function saveData"), script.indexOf("async function initializeIndexedDBBackup"));
  const cloud = read("sync-integral-cloud.js");
  assert.match(replaceSource, /repairInvalidReinforcementGoalsV157\(state\)/);
  assert.match(saveSource, /repairInvalidReinforcementGoalsV157\(state\)/);
  assert.match(cloud, /repairInvalidReinforcementGoalsV157\(prepared\.state\)/);

  const staleState = baseState();
  staleState.diagnosticByItem["item-a"] = { boost: 72, wrong: 1, correct: 0 };
  staleState.dailyGoals.push(goal());
  const runtime = v157Runtime(staleState);
  const cloudContext = {
    state: staleState,
    cloneData: clone,
    repairInvalidReinforcementGoalsV157: runtime.repairInvalidReinforcementGoalsV157,
    syncStateFingerprint: (value) => JSON.stringify(value)
  };
  vm.createContext(cloudContext);
  vm.runInContext(
    `${cloud.slice(cloud.indexOf("function syncPreparePayload"), cloud.indexOf("async function uploadSyncPayloadIntegral"))}; prepared = syncPreparePayload({ state });`,
    cloudContext
  );
  assert.equal(staleState.dailyGoals[0].type, "Reforço");
  assert.equal(cloudContext.prepared.state.dailyGoals[0].type, "Estudo novo");
  assert.equal(cloudContext.prepared.state.dailyGoals[0].tipo, "estudo novo");
  assert.equal(
    cloudContext.prepared.stateFingerprint,
    JSON.stringify(cloudContext.prepared.state)
  );
});

test("diagnostic.boost continua participando da antecipação, sem definir sozinho o tipo", () => {
  const scoring = script.slice(script.indexOf("function buildPlanningScoreContext"), script.indexOf("function disciplineQuestionWeakness"));
  const eligibility = script.slice(script.indexOf("function eligiblePlanningGoalsForDate"), script.indexOf("function selectDistinctPlanningItems"));
  assert.match(scoring, /\+ diagnostic\.boost/);
  assert.match(eligibility, /diagnosticBoost <= 0/);
  assert.doesNotMatch(eligibility, /diagnosticBoost > 0 \\? "Reforço"/);
  assert.match(eligibility, /planningGoalTypeForItemV157/);
});
