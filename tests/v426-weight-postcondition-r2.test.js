const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function storageMock() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function runtime() {
  const localStorage = storageMock();
  const context = { console, Blob, setTimeout, clearTimeout, localStorage };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("discipline-unification-v426.js", "utf8"), context);
  return { context, localStorage };
}

function backup() {
  return { confirmed: true, fileName: "backup-v426-r2.json", savedAt: "2026-09-01T20:30:00Z", bytes: 123 };
}

function baseState() {
  const simulados = Array.from({ length: 6 }, (_, index) => ({
    id: `sim-${index + 1}`,
    discipline: "Simulados",
    disciplina: "Simulados",
    actualMinutes: 55
  }));
  return {
    planning: { config: { topicsPerDay: 5, disciplinesPerDay: 5 } },
    syllabusItems: [{ id: "penal", discipline: "DIREITO PENAL", subject: "Teoria do crime" }],
    dailyGoals: simulados,
    studies: [{ id: "hist-study", discipline: "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS", minutes: 40 }],
    materials: [{ id: "hist-material", discipline: "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS", title: "material antigo" }],
    questionLogs: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: [],
    simulados: [],
    factoryItems: [],
    subjects: [],
    disciplineWeights: {
      "DIREITO PENAL": 10,
      "Simulados": 8,
      "Peça": 5,
      "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS": 7,
      "ÓRFÃ EXTERNA": 3
    },
    contestPlanningProfiles: {
      joint: {
        categories: { A: 65, B: 20, C: 10, D: 0, PIECE: 5 },
        postSwitchCategories: { A: 40, B: 0, C: 20, D: 40, PIECE: 0 }
      }
    },
    migrations: {}
  };
}

test("V426 aceita Simulados/Peça, remove peso vazio da Etapa C e só reporta órfã externa", () => {
  const { context } = runtime();
  const state = baseState();
  const studiesBefore = JSON.stringify(state.studies);
  const materialsBefore = JSON.stringify(state.materials);

  const result = context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() });

  assert.equal(result.changed, true);
  assert.equal(result.blocked, false);
  assert.equal(state.disciplineWeights.Simulados, 8);
  assert.equal(state.disciplineWeights["Peça"], 5);
  assert.equal("LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS" in state.disciplineWeights, false);
  assert.equal(state.disciplineWeights["ÓRFÃ EXTERNA"], 3);
  assert.equal(JSON.stringify(state.studies), studiesBefore, "histórico de estudos não pode ser apagado/reescrito pela Etapa C");
  assert.equal(JSON.stringify(state.materials), materialsBefore, "materiais históricos não podem ser apagados/reescritos pela Etapa C");

  assert.equal(context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.disciplineExists(state, "Simulados"), true);
  assert.equal(context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.disciplineExists(state, "Peça"), true);
  assert.deepEqual(Array.from(result.report.weightValidation.legitimateNonSyllabusWeights), ["Peça", "Simulados"]);
  assert.deepEqual(Array.from(result.report.weightValidation.unrelatedPreexistingOrphanWeights), ["ÓRFÃ EXTERNA"]);
  assert.deepEqual(Array.from(result.report.weightValidation.touchedInvalidWeights), []);
  assert.ok(result.report.stageCDetails.some((entry) => entry.name === "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS" && entry.removedWeight === true && entry.preservedHistoricalReferences === 2));
});

test("pós-condição bloqueia somente inconsistência em disciplina tocada e mantém transação atômica", () => {
  const { context } = runtime();
  const state = {
    planning: { config: { topicsPerDay: 5, disciplinesPerDay: 5 } },
    syllabusItems: [], dailyGoals: [], studies: [], materials: [], questionLogs: [], questionBank: [],
    questionBankSessions: [], questionErrorNotebook: [], simulados: [], factoryItems: [], subjects: [],
    disciplineWeights: { CRIMINOLOGIA: 9 },
    contestPlanningProfiles: { joint: { categories: { C: 10 }, postSwitchCategories: { C: 20 } } },
    migrations: {}
  };
  const before = JSON.stringify(state);
  assert.throws(
    () => context.applyDisciplineUnificationV426(state, { backupConfirmation: backup() }),
    /pós-condição de disciplineWeights falhou nas disciplinas tocadas: CIÊNCIAS FORENSES/
  );
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.migrations.disciplineUnificationV426, undefined);
});

test("aborto após backup bloqueia novo backup na mesma versão e libera em versão corrigida", () => {
  const { context, localStorage } = runtime();
  const api = context.__ALDUS_DISCIPLINE_UNIFICATION_V426__;
  assert.equal(api.markMigrationAbort(new Error("falha de teste"), backup(), api.version), true);
  assert.equal(api.migrationAbortLockApplies(api.version), true);
  const lock = JSON.parse(localStorage.getItem(api.abortLockKey));
  assert.equal(lock.backupFileName, "backup-v426-r2.json");
  assert.equal(api.migrationAbortLockApplies("20260902-versao-corrigida"), false);
  assert.equal(localStorage.getItem(api.abortLockKey), null);
});

test("cadeia V426 usa query strings novas sem depender de bump do Service Worker", () => {
  const performanceLoader = fs.readFileSync("performance-emergency-v350.js", "utf8");
  const securityLoader = fs.readFileSync("security-observability-v318.js", "utf8");
  assert.match(performanceLoader, /discipline-unification-v426\.js\?v=20260901-discipline-unification-v426-postcondition-r2/);
  assert.match(performanceLoader, /discipline-unification-v426-revision\.js\?v=20260901-discipline-unification-v426-revision-authoritative-r3/);
  assert.match(securityLoader, /performance-emergency-v350\.js\?v=20260901-v426-postcondition-r2/);
});

test("raiz e docs permanecem idênticos nos módulos tocados da V426", () => {
  for (const file of [
    "discipline-unification-v426.js",
    "discipline-unification-v426-revision.js",
    "performance-emergency-v350.js",
    "security-observability-v318.js"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), file);
  }
});