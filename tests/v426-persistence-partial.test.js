const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const revisionSource = fs.readFileSync("discipline-unification-v426-revision.js", "utf8");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    dump(key) { return values.get(key); }
  };
}

function partialState() {
  return {
    planning: {
      config: { topicsPerDay: 5, disciplinesPerDay: 5 },
      manualGoalsConfigV235: { disciplines: 5, topics: 5, savedAt: "2026-09-01T18:00:00Z" },
      topicPrioritySignalsV155: {}
    },
    syllabusItems: [
      { id: "med", discipline: "MEDICINA LEGAL", subject: "Quesitos oficiais" },
      { id: "forense", discipline: "CIÊNCIAS FORENSES", subject: "Criminalística" },
      { id: "keep", discipline: "DIREITO CIVIL", subject: "Pessoa natural" },
      { id: "remove", discipline: "DIREITO CIVIL", subject: "Pessoa Natural" },
      { id: "pcma", discipline: "DIREITO PROCESSUAL CIVIL", subject: "Competência" }
    ],
    dailyGoals: [
      { id: "already-moved", syllabusItemId: "pcma", date: "2026-10-12", origin: "planejamento", status: "Pendente", subject: "Competência" }
    ],
    studies: [], materials: [], questionLogs: [], questionBank: [], questionBankSessions: [],
    questionErrorNotebook: [], smartReviews: [], simulados: [], factoryItems: [], subjects: [],
    contestSyllabusMap: [
      { syllabusItemId: "keep", contestId: "pcpr-2026-delegado", classification: "A" },
      { syllabusItemId: "pcma", contestId: "pcma-2026-delegado", classification: "C" }
    ],
    schedulableSettings: { keep: {}, remove: {} },
    disciplineWeights: { "MEDICINA LEGAL": 9, "CIÊNCIAS FORENSES": 5, "DIREITO CIVIL": 1, "DIREITO PROCESSUAL CIVIL": 1 },
    contestPlanningProfiles: { joint: { categories: { C: 0 }, postSwitchCategories: { C: 20 } } },
    migrations: {
      disciplineUnificationV426: {
        version: "20260901-discipline-unification-v426-revision-b1-e-r2",
        revisionId: "b1-e-20260901",
        executedAt: "2026-09-01T20:20:00Z",
        completed: true,
        report: {
          goalsRescheduled: [{ id: "already-moved", syllabusItemId: "pcma", from: "2026-09-10", to: "2026-10-12", subject: "Competência" }],
          goalsNotRescheduled: [],
          duplicatesRemoved: [{ id: "remove", keptId: "keep", discipline: "DIREITO CIVIL", subject: "Pessoa Natural" }],
          syllabusItemsBefore: 575,
          syllabusItemsAfter: 557,
          distinctDisciplineNamesAfter: 18,
          configChanges: [{ path: "planning.config.topicsPerDay", before: 5, after: 8 }]
        }
      }
    }
  };
}

function makeRuntime() {
  const localStorage = memoryStorage({
    aldusPlanningManualGoalsV235: JSON.stringify({ disciplines: 5, topics: 5, savedAt: "2026-09-01T18:00:00Z" })
  });
  let dateFinderCalls = 0;
  let persisted = null;

  const baseApi = {
    version: "base-r3",
    basePostConditionsSatisfied(state) {
      return !(state.syllabusItems || []).some((item) => item.discipline === "MEDICINA LEGAL")
        && !("MEDICINA LEGAL" in (state.disciplineWeights || {}))
        && Number(state?.planning?.config?.topicsPerDay) === 8
        && Number(state?.planning?.config?.disciplinesPerDay) >= 8
        && Number(state?.contestPlanningProfiles?.joint?.categories?.C) === 0;
    },
    apply(state, { backupConfirmation } = {}) {
      if (!backupConfirmation?.confirmed) return { blocked: true, reason: "backup-required" };
      const prior = clone(state.migrations?.disciplineUnificationV426 || {});
      for (const item of state.syllabusItems || []) if (item.discipline === "MEDICINA LEGAL") item.discipline = "CIÊNCIAS FORENSES";
      const sourceWeight = Number(state.disciplineWeights?.["MEDICINA LEGAL"] || 0);
      const targetWeight = Number(state.disciplineWeights?.["CIÊNCIAS FORENSES"] || 0);
      state.disciplineWeights["CIÊNCIAS FORENSES"] = Math.max(sourceWeight, targetWeight);
      delete state.disciplineWeights["MEDICINA LEGAL"];
      state.planning.config.topicsPerDay = 8;
      state.planning.config.disciplinesPerDay = 8;
      state.contestPlanningProfiles.joint.categories.C = 0;
      state.migrations ||= {};
      state.migrations.disciplineUnificationV426 = {
        ...prior,
        version: "base-r3",
        completed: true,
        report: { ...(prior.report || {}), baseReapplied: true }
      };
      return { changed: true, blocked: false, report: state.migrations.disciplineUnificationV426.report };
    },
    clearMigrationAbortLock() {},
    migrationAbortLockApplies() { return false; }
  };

  const context = {
    console,
    Blob,
    setTimeout,
    clearTimeout,
    localStorage,
    __ALDUS_DISCIPLINE_UNIFICATION_V426__: baseApi,
    __ALDUS_PLANNING_INTEGRITY_V235__: {
      recordManualCount(disciplines, topics, targetState) {
        const snapshot = { version: "v235-test", disciplines, topics, savedAt: new Date().toISOString() };
        targetState.planning ||= {};
        targetState.planning.config ||= {};
        targetState.planning.manualGoalsConfigV235 = snapshot;
        targetState.planning.config.disciplinesPerDay = disciplines;
        targetState.planning.config.topicsPerDay = topics;
        localStorage.setItem("aldusPlanningManualGoalsV235", JSON.stringify(snapshot));
        return snapshot;
      }
    },
    nextReplacementDateV158() {
      dateFinderCalls += 1;
      return "2026-10-13";
    },
    saveData() { return true; },
    async saveStateToIndexedDB(snapshot) { persisted = clone(snapshot); return true; },
    async loadStateFromIndexedDB() { return persisted ? { id: "current", data: clone(persisted) } : null; }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(revisionSource, context);
  return {
    context,
    baseApi,
    localStorage,
    getDateFinderCalls: () => dateFinderCalls,
    getPersisted: () => clone(persisted)
  };
}

function backup() {
  return { confirmed: true, fileName: "backup-parcial-v426.json", savedAt: "2026-09-01T21:00:00Z", bytes: 1234 };
}

test("V426 reconhece completed:true parcial, reaplica somente pós-condições faltantes e não repete Etapa E", () => {
  const rt = makeRuntime();
  const state = partialState();
  const result = rt.context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });

  assert.equal(result.blocked, false);
  assert.equal(result.stageEReused, true);
  assert.equal(rt.getDateFinderCalls(), 0, "Etapa E já persistida não pode chamar nextReplacementDateV158 novamente");

  assert.equal(state.syllabusItems.some((item) => item.discipline === "MEDICINA LEGAL"), false);
  assert.equal(state.syllabusItems.find((item) => item.id === "med").discipline, "CIÊNCIAS FORENSES");
  assert.equal(state.syllabusItems.some((item) => item.id === "remove"), false);
  assert.equal(state.syllabusItems.length, 4);
  assert.equal(state.contestSyllabusMap.some((mapping) => mapping.syllabusItemId === "remove"), false);
  assert.equal(Object.hasOwn(state.schedulableSettings, "remove"), false);
  assert.ok(state.syncTombstones?.collections?.syllabusItems?.["syllabusItems:id:remove"]);

  assert.equal(state.planning.config.topicsPerDay, 8);
  assert.equal(state.planning.config.disciplinesPerDay, 8);
  assert.equal(state.planning.manualGoalsConfigV235.topics, 8);
  assert.equal(state.planning.manualGoalsConfigV235.disciplines, 8);
  const storedManual = JSON.parse(rt.localStorage.getItem("aldusPlanningManualGoalsV235"));
  assert.equal(storedManual.topics, 8);
  assert.equal(storedManual.disciplines, 8);

  assert.equal(state.migrations.disciplineUnificationV426.stages.B1.completed, true);
  assert.equal(state.migrations.disciplineUnificationV426.stages.E.completed, true);
  assert.equal(state.migrations.disciplineUnificationV426.stages.E.reusedPriorExecution, true);
  assert.equal(state.migrations.disciplineUnificationV426.report.goalsRescheduled.length, 1);
});

test("relatório final nasce do estado relido e completed só vira true depois da verificação persistida", async () => {
  const rt = makeRuntime();
  const state = partialState();
  const result = rt.context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });
  const verified = await rt.context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.persistAndVerify(state, result, rt.baseApi);
  const stored = rt.getPersisted();

  assert.equal(verified.persistedVerified, true);
  assert.equal(stored.migrations.disciplineUnificationV426.completed, true);
  assert.equal(stored.migrations.disciplineUnificationV426.verificationStatus, "verified");
  assert.equal(verified.report.persistenceVerification.verified, true);
  assert.equal(verified.report.syllabusItemsAfter, stored.syllabusItems.length);
  assert.equal(verified.report.distinctDisciplineNamesAfter, new Set(stored.syllabusItems.map((item) => item.discipline)).size);
  assert.equal(verified.report.persistenceVerification.removedIdsVerified, 1);
  assert.equal(stored.syllabusItems.some((item) => item.id === "remove"), false);
  assert.equal(stored.syllabusItems.some((item) => item.discipline === "MEDICINA LEGAL"), false);
  assert.equal(rt.getDateFinderCalls(), 0);

  const planning = verified.report.persistenceVerification.planning;
  assert.deepEqual(
    [planning.configDisciplines, planning.configTopics, planning.snapshotDisciplines, planning.snapshotTopics, planning.localDisciplines, planning.localTopics],
    [8, 8, 8, 8, 8, 8]
  );
});

test("planning-integrity exporta recordManualCount e o v387 já invalida a API de planejamento sem alterar o worker", () => {
  const planning = fs.readFileSync("planning-integrity-v235.js", "utf8");
  const docsPlanning = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
  const startup = fs.readFileSync("startup-planning-stability-v387.js", "utf8");

  assert.equal(planning, docsPlanning);
  assert.match(planning, /__ALDUS_PLANNING_INTEGRITY_V235__/);
  assert.match(planning, /recordManualCount,/);

  assert.match(startup, /function evictLegacyRuntimeCache\(\)/);
  assert.match(startup, /new URL\("planning-integrity-v235\.js", location\.href\)/);
  assert.match(startup, /new URL\("planning-integrity-loader-v235\.js", location\.href\)/);
  assert.match(startup, /cache\.delete\(target, \{ ignoreSearch: true \}\)/);
});
