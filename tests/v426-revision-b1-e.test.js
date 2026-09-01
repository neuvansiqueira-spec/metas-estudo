const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("discipline-unification-v426-revision.js", "utf8");

function baseApply(state, { backupConfirmation } = {}) {
  if (!backupConfirmation?.confirmed) return { changed: false, blocked: true, reason: "backup-required" };
  state.planning ||= {};
  state.planning.config ||= {};
  state.planning.config.topicsPerDay = 8;
  if (Number(state.planning.config.disciplinesPerDay) < 8) state.planning.config.disciplinesPerDay = 8;
  state.contestPlanningProfiles ||= { joint: { categories: { C: 10 }, postSwitchCategories: { C: 20 } } };
  state.contestPlanningProfiles.joint.categories.C = 0;
  state.migrations ||= {};
  state.migrations.disciplineUnificationV426 = {
    version: "old",
    executedAt: "2026-09-01T19:00:00Z",
    completed: true,
    backup: backupConfirmation,
    report: {
      collectionRewriteCounts: {}, stageAReassignments: [], stageAUnmatched: [], weightMerges: [],
      excludedDisciplines: [], notEmptyDisciplines: [],
      configChanges: [{ path: "planning.config.topicsPerDay", before: 5, after: 8 }]
    }
  };
  return { changed: true, blocked: false, report: state.migrations.disciplineUnificationV426.report };
}

function runtime(extra = {}) {
  const calls = [];
  const baseApi = {
    version: "old",
    apply: baseApply,
    enforcePostMigrationPlanningProfile(state) {
      if (state?.contestPlanningProfiles?.joint?.categories) state.contestPlanningProfiles.joint.categories.C = 0;
      return true;
    }
  };
  const context = {
    console, Blob, setTimeout, clearTimeout,
    __ALDUS_DISCIPLINE_UNIFICATION_V426__: baseApi,
    nextReplacementDateV158(state, goal, startDate) {
      calls.push({ goalId: goal.id, startDate });
      for (const date of ["2026-10-12", "2026-10-13", "2026-10-14"]) {
        if (!(state.dailyGoals || []).some((candidate) => candidate !== goal && (candidate.date || candidate.data) === date)) return date;
      }
      return "";
    },
    isManualDailyGoal(goal) {
      return !["edital verticalizado", "planejamento", "plano do dia"].includes(String(goal.origin || goal.origem || "manual").toLowerCase());
    },
    isGoalDone: (goal) => goal.status === "Concluída",
    isGoalInProgress: (goal) => goal.status === "Em andamento",
    goalTotalActualMinutes: (goal) => Number(goal.actualMinutes || 0),
    ...extra
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, calls };
}

function backup(fileName = "backup-v426-revisada.json") {
  return { confirmed: true, fileName, savedAt: "2026-09-01T20:00:00Z", bytes: 123 };
}

function sampleState() {
  return {
    planning: { config: { topicsPerDay: 5, disciplinesPerDay: 5 }, topicPrioritySignalsV155: {} },
    syllabusItems: [
      { id: "a", discipline: "DIREITO CIVIL", subject: "Pessoa natural" },
      { id: "b", discipline: "DIREITO CIVIL", subject: "Pessoa Natural" },
      { id: "m1", discipline: "DIREITO CIVIL", subject: "Pessoa jurídica" },
      { id: "m2", discipline: "DIREITO CIVIL", subject: "Pessoa Jurídica" },
      { id: "pcma", discipline: "DIREITO PROCESSUAL CIVIL", subject: "Competência" },
      { id: "common", discipline: "DIREITO PENAL", subject: "Teoria do crime" },
      { id: "piece", discipline: "PEÇA", subject: "Peça" }
    ],
    dailyGoals: [], studies: [], materials: [], questionLogs: [], questionBank: [], questionBankSessions: [],
    questionErrorNotebook: [], smartReviews: [], simulados: [], factoryItems: [], subjects: [],
    contestSyllabusMap: [
      { syllabusItemId: "a", contestId: "pcpr-2026-delegado", classification: "A" },
      { syllabusItemId: "m1", contestId: "pcpr-2026-delegado", classification: "A" },
      { syllabusItemId: "pcma", contestId: "pcma-2026-delegado", classification: "C" },
      { syllabusItemId: "common", contestId: "pcpr-2026-delegado", classification: "A" },
      { syllabusItemId: "common", contestId: "pcma-2026-delegado", classification: "A" },
      { syllabusItemId: "piece", contestId: "pcma-2026-delegado", classification: "PIECE" }
    ],
    schedulableSettings: { a: {}, b: {}, m1: {}, m2: {} },
    disciplineWeights: { "DIREITO CIVIL": 1, "DIREITO PROCESSUAL CIVIL": 1, "DIREITO PENAL": 1, "PEÇA": 1 },
    contestPlanningProfiles: { joint: { categories: { C: 10 }, postSwitchCategories: { C: 20 } } },
    migrations: {}
  };
}

test("V426 revisada bloqueia sem backup antes da migração-base", () => {
  const { context } = runtime();
  const state = sampleState();
  const before = JSON.stringify(state);
  const result = context.applyDisciplineUnificationV426(state);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "backup-required");
  assert.equal(JSON.stringify(state), before);
});

test("estado novo usa a migração-base e a B.1 na mesma confirmação de backup", () => {
  const { context } = runtime();
  const state = sampleState();
  const result = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });
  assert.equal(result.blocked, false);
  assert.equal(state.planning.config.topicsPerDay, 8);
  assert.equal(state.contestPlanningProfiles.joint.categories.C, 0);
  assert.equal(state.syllabusItems.some((item) => item.id === "b"), false);
  assert.equal(state.contestSyllabusMap.some((mapping) => mapping.syllabusItemId === "b"), false);
  assert.equal(Object.hasOwn(state.schedulableSettings, "b"), false);
  assert.equal(state.migrations.disciplineUnificationV426.revisionId, "b1-e-20260901");
});

test("V426 inicial já concluída não impede B.1/E e a revisão é idempotente", () => {
  const { context } = runtime();
  const state = sampleState();
  baseApply(state, { backupConfirmation: backup("old.json") });
  const first = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup("second.json") });
  assert.equal(first.changed, true);
  assert.equal(state.migrations.disciplineUnificationV426.revisionId, "b1-e-20260901");
  const once = JSON.stringify(state);
  const second = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup("third.json") });
  assert.equal(second.repeated, true);
  assert.equal(JSON.stringify(state), once);
});

test("B.1 preserva item vinculado por qualquer um dos três caminhos de materiais", () => {
  for (const material of [
    { syllabusItemId: "m2" },
    { syllabusItemIds: ["m2"] },
    { parentSyllabusItemId: "m2" }
  ]) {
    const { context } = runtime();
    const state = sampleState();
    state.materials = [material];
    const result = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });
    assert.equal(state.syllabusItems.some((item) => item.id === "m2"), true, JSON.stringify(material));
    assert.equal(result.report.duplicatesRemoved.some((item) => item.id === "m2"), false, JSON.stringify(material));
    assert.equal(state.materials.length, 1);
  }
});

test("B.1 não remove grupo quando um candidato à remoção possui referência", () => {
  const { context } = runtime();
  const state = sampleState();
  state.dailyGoals.push({ id: "ga", syllabusItemId: "a", date: "2026-09-01", origin: "planejamento", status: "Pendente" });
  state.studies.push({ syllabusItemId: "b" });
  const result = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });
  assert.equal(state.syllabusItems.some((item) => item.id === "a"), true);
  assert.equal(state.syllabusItems.some((item) => item.id === "b"), true);
  assert.ok(result.report.duplicatePairsNotRemoved.some((item) => item.ids.includes("a") && item.ids.includes("b")));
});

test("Etapa E move apenas PCMA exclusiva, chama V158 desde 11/10 e altera somente a data", () => {
  const { context, calls } = runtime();
  const state = sampleState();
  const movable = { id: "g1", syllabusItemId: "pcma", date: "2026-09-10", data: "2026-09-10", origin: "planejamento", status: "Pendente", subject: "Competência", notes: "preservar" };
  state.dailyGoals.push(
    movable,
    { id: "g2", syllabusItemId: "common", date: "2026-09-11", origin: "planejamento", status: "Pendente" },
    { id: "g3", syllabusItemId: "pcma", date: "2026-09-12", origin: "planejamento", status: "Pendente", history: [{}] },
    { id: "g4", syllabusItemId: "pcma", date: "2026-09-13", origin: "manual", status: "Pendente" },
    { id: "g5", syllabusItemId: "pcma", date: "2026-09-14", origin: "planejamento", status: "Pendente", actualMinutes: 4 },
    { id: "g6", syllabusItemId: "piece", date: "2026-09-15", origin: "planejamento peça diária", fixedDailyPieceV183: true, status: "Pendente" }
  );
  const before = JSON.parse(JSON.stringify(movable));
  const result = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });
  const moved = state.dailyGoals.find((goal) => goal.id === "g1");
  assert.equal(moved.date, "2026-10-12");
  assert.equal(moved.data, "2026-10-12");
  for (const key of Object.keys(before).filter((key) => !["date", "data"].includes(key))) assert.deepEqual(moved[key], before[key], key);
  assert.equal(Object.hasOwn(moved, "history"), false);
  assert.deepEqual(calls, [{ goalId: "g1", startDate: "2026-10-11" }]);
  assert.equal(result.report.goalsRescheduled.length, 1);
  assert.ok(result.report.goalsNotRescheduled.length >= 5);
});

test("fonte revisada não chama appendGoalHistory", () => {
  assert.doesNotMatch(source, /appendGoalHistory\s*\(/);
});

test("loader e módulo revisado permanecem espelhados entre raiz e docs", () => {
  assert.equal(fs.readFileSync("performance-emergency-v350.js", "utf8"), fs.readFileSync("docs/performance-emergency-v350.js", "utf8"));
  assert.equal(fs.readFileSync("discipline-unification-v426-revision.js", "utf8"), fs.readFileSync("docs/discipline-unification-v426-revision.js", "utf8"));
});
