const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("discipline-unification-v426-revision.js", "utf8");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function storageMock(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function baseApply(state, { backupConfirmation } = {}) {
  if (!backupConfirmation?.confirmed) return { changed: false, blocked: true, reason: "backup-required" };
  for (const item of state.syllabusItems || []) {
    if (item.discipline === "MEDICINA LEGAL") item.discipline = "CIÊNCIAS FORENSES";
  }
  state.planning ||= {};
  state.planning.config ||= {};
  state.planning.config.topicsPerDay = 8;
  state.planning.config.disciplinesPerDay = 8;
  state.contestPlanningProfiles ||= { joint: { categories: { C: 0 } } };
  state.contestPlanningProfiles.joint ||= { categories: { C: 0 } };
  state.contestPlanningProfiles.joint.categories ||= { C: 0 };
  state.contestPlanningProfiles.joint.categories.C = 0;
  state.migrations ||= {};
  state.migrations.disciplineUnificationV426 = {
    ...(state.migrations.disciplineUnificationV426 || {}),
    completed: true,
    report: {
      configChanges: [], stageAReassignments: [], stageAUnmatched: [], weightMerges: [],
      excludedDisciplines: [], notEmptyDisciplines: [], collectionRewriteCounts: {}
    }
  };
  return { changed: true, blocked: false };
}

function buildPartialState() {
  const syllabusItems = [];
  for (let index = 1; index <= 18; index += 1) {
    syllabusItems.push(
      { id: `dup-${index}-a`, discipline: "DISCIPLINA 01", subject: `Tema duplicado ${index}` },
      { id: `dup-${index}-b`, discipline: "DISCIPLINA 01", subject: `Tema Duplicado ${index}` }
    );
  }
  syllabusItems.push(
    { id: "medicina", discipline: "MEDICINA LEGAL", subject: "Quesitos oficiais" },
    { id: "forense", discipline: "CIÊNCIAS FORENSES", subject: "Criminalística" }
  );
  for (let index = 2; index <= 17; index += 1) {
    syllabusItems.push({ id: `disc-${index}`, discipline: `DISCIPLINA ${String(index).padStart(2, "0")}`, subject: `Tema base ${index}` });
  }
  const fillerNeeded = 575 - syllabusItems.length;
  for (let index = 1; index <= fillerNeeded; index += 1) {
    syllabusItems.push({ id: `fill-${index}`, discipline: "DISCIPLINA 02", subject: `Tema único ${index}` });
  }
  assert.equal(syllabusItems.length, 575);
  assert.equal(new Set(syllabusItems.map((item) => item.discipline)).size, 19);

  return {
    planning: {
      config: { topicsPerDay: 5, disciplinesPerDay: 5 },
      manualGoalsConfigV235: { version: "old", disciplines: 5, topics: 5, savedAt: "2026-09-01T19:00:00Z" },
      topicPrioritySignalsV155: {}
    },
    syllabusItems,
    dailyGoals: [
      { id: "pcma-moved", syllabusItemId: "pcma-item", date: "2026-10-12", data: "2026-10-12", origin: "planejamento", status: "Pendente", subject: "Tema PCMA" }
    ],
    studies: [], materials: [], questionLogs: [], questionBank: [], questionBankSessions: [],
    questionErrorNotebook: [], smartReviews: [], simulados: [], factoryItems: [], subjects: [],
    contestSyllabusMap: [
      { id: "pcma-map", syllabusItemId: "pcma-item", contestId: "pcma-2026-delegado", classification: "C" }
    ],
    schedulableSettings: {},
    disciplineWeights: { "CIÊNCIAS FORENSES": 1 },
    contestPlanningProfiles: { joint: { categories: { C: 0 }, postSwitchCategories: { C: 20 } } },
    migrations: {
      disciplineUnificationV426: {
        version: "20260901-discipline-unification-v426-revision-b1-e-r2",
        revisionId: "b1-e-20260901",
        completed: true,
        executedAt: "2026-09-01T20:00:00Z",
        report: {
          goalsRescheduled: [{ id: "pcma-moved", syllabusItemId: "pcma-item", subject: "Tema PCMA", from: "2026-09-10", to: "2026-10-12" }],
          goalsNotRescheduled: []
        }
      }
    }
  };
}

function runtime({ failSave = false } = {}) {
  const initialPlanning = JSON.stringify({ version: "old", disciplines: 5, topics: 5, savedAt: "2026-09-01T19:00:00Z" });
  const localStorage = storageMock({ aldusPlanningManualGoalsV235: initialPlanning });
  let stored = null;
  const saveOptions = [];
  let replacementCalls = 0;
  const context = {
    console, Blob, setTimeout, clearTimeout, localStorage,
    __ALDUS_DISCIPLINE_UNIFICATION_V426__: {
      version: "base-r2",
      apply: baseApply,
      clearMigrationAbortLock() {},
      markMigrationAbort() {},
      migrationAbortLockApplies() { return false; }
    },
    nextReplacementDateV158() { replacementCalls += 1; return "2026-10-13"; },
    isManualDailyGoal() { return false; },
    isGoalDone() { return false; },
    isGoalInProgress() { return false; },
    goalTotalActualMinutes() { return 0; }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  context.saveData = async (options) => {
    saveOptions.push(clone(options));
    if (failSave) throw new Error("falha simulada de persistência");
    const authoritative = JSON.parse(localStorage.getItem("aldusPlanningManualGoalsV235"));
    context.state.planning.config.disciplinesPerDay = authoritative.disciplines;
    context.state.planning.config.topicsPerDay = authoritative.topics;
    stored = clone(context.state);
    localStorage.setItem("metasConcursoData", JSON.stringify(stored));
    return true;
  };
  context.loadStateFromIndexedDB = async () => stored ? { data: clone(stored) } : null;
  return {
    context, localStorage, saveOptions,
    getStored: () => stored,
    replacementCalls: () => replacementCalls,
    initialPlanning
  };
}

function backup() {
  return { confirmed: true, fileName: "backup-v426-r3.json", savedAt: "2026-09-01T21:00:00Z", bytes: 123 };
}

test("R3 recupera exatamente o padrão 575→557, 19→18, MEDICINA e 18 duplicatas sem repetir E", () => {
  const { context, replacementCalls } = runtime();
  const state = buildPartialState();
  context.state = state;

  const result = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });

  assert.equal(result.pendingPersistence, true);
  assert.equal(state.syllabusItems.length, 557);
  assert.equal(new Set(state.syllabusItems.map((item) => item.discipline)).size, 18);
  assert.equal(state.syllabusItems.some((item) => item.discipline === "MEDICINA LEGAL"), false);
  assert.equal(state.syllabusItems.find((item) => item.id === "medicina").discipline, "CIÊNCIAS FORENSES");
  assert.equal(context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.removableDuplicateCount(state), 0);
  assert.equal(result.report.duplicatesRemoved.length, 18);
  assert.equal(state.planning.config.topicsPerDay, 8);
  assert.equal(state.planning.config.disciplinesPerDay, 8);
  assert.equal(state.migrations.disciplineUnificationV426.completed, false, "completed só pode vir após releitura persistida");
  assert.equal(state.migrations.disciplineUnificationV426.stageProgress.E.repeated, true);
  assert.equal(replacementCalls(), 0, "Etapa E não pode chamar V158 novamente");
  for (let index = 1; index <= 18; index += 1) {
    assert.ok(state.syncTombstones.collections.syllabusItems[`syllabusItems:id:dup-${index}-b`]);
  }
  assert.ok(state.syllabusItems.find((item) => item.id === "medicina").updatedAt, "fusão precisa vencer merge remoto por timestamp");
});

test("R3 grava snapshot 8 autoritativo, relê a persistência e gera relatório do mesmo estado", async () => {
  const { context, saveOptions, getStored, replacementCalls } = runtime();
  const state = buildPartialState();
  context.state = state;

  const result = await context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.runBrowserMigration(state, backup());
  const stored = getStored();
  const migration = stored.migrations.disciplineUnificationV426;

  assert.equal(result.persisted, true);
  assert.equal(replacementCalls(), 0);
  assert.equal(stored.syllabusItems.length, 557);
  assert.equal(new Set(stored.syllabusItems.map((item) => item.discipline)).size, 18);
  assert.equal(stored.syllabusItems.some((item) => item.discipline === "MEDICINA LEGAL"), false);
  assert.equal(stored.planning.config.topicsPerDay, 8);
  assert.equal(stored.planning.config.disciplinesPerDay, 8);
  assert.equal(migration.completed, true);
  assert.equal(migration.verifiedPersistence, true);
  assert.equal(migration.report.syllabusItemsAfter, stored.syllabusItems.length);
  assert.equal(migration.report.distinctDisciplineNamesAfter, 18);
  assert.equal(migration.report.removableDuplicatesAfter, 0);
  assert.deepEqual(Array.from(migration.report.legacyDisciplinesAfter), []);
  assert.equal(migration.report.planningConfigAfter.topicsPerDay, 8);
  assert.equal(JSON.stringify(result.report), JSON.stringify(migration.report), "relatório exibido deve ser o relatório persistido");
  assert.equal(JSON.stringify(state), JSON.stringify(stored), "estado em memória deve terminar igual ao estado relido");
  assert.equal(saveOptions.length, 2);
  assert.ok(saveOptions.every((options) => options.skipDerivedRefresh === true));
});

test("R3 restaura estado e snapshot manual anteriores quando a persistência falha", async () => {
  const { context, localStorage, initialPlanning } = runtime({ failSave: true });
  const state = buildPartialState();
  const before = clone(state);
  context.state = state;

  await assert.rejects(
    context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.runBrowserMigration(state, backup()),
    /falha simulada de persistência/
  );
  assert.equal(JSON.stringify(state), JSON.stringify(before));
  assert.equal(localStorage.getItem("aldusPlanningManualGoalsV235"), initialPlanning);
});
