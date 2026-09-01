const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function runtime() {
  const context = { console, Blob, setTimeout, clearTimeout };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "discipline-unification-v426.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "pcpr-pcma-2026-migration.js"), "utf8"), context);
  return context;
}

function sampleState() {
  const syllabusItems = [
    { id: "lep", discipline: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", subject: "Lei de Execução Penal — Lei 7.210/1984" },
    { id: "improbidade", discipline: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", subject: "Improbidade Administrativa — Lei 8.429/1992" },
    { id: "alienacao", discipline: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", subject: "Alienação Parental — Lei 12.318/2010" },
    { id: "software", discipline: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", subject: "Software — Lei 9.609/1998" },
    { id: "terrorismo", discipline: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", subject: "Lei Antiterrorismo — Lei 13.260/2016" },
    { id: "criminologia", discipline: "CRIMINOLOGIA", subject: "Prevenção terciária" },
    { id: "medicina", discipline: "MEDICINA LEGAL", subject: "Perícia médico-legal" },
    { id: "adm-publica", discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA", subject: "Atos administrativos" },
    { id: "adm-especial", discipline: "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO", subject: "Lei especial administrativa" },
    { id: "penal-dest", discipline: "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL", subject: "Crimes hediondos" },
    { id: "proc-dest", discipline: "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL", subject: "Lei processual penal" },
    { id: "civil", discipline: "DIREITO CIVIL", subject: "Bens" },
    { id: "adm", discipline: "DIREITO ADMINISTRATIVO", subject: "Poderes administrativos" },
    { id: "forense", discipline: "CIÊNCIAS FORENSES", subject: "Criminalística" },
    { id: "adm-spec-dest", discipline: "LEGISLAÇÃO ESPECÍFICA – DIREITO ADMINISTRATIVO", subject: "Lei administrativa" }
  ];
  return {
    planningMode: "joint",
    planning: { config: { topicsPerDay: 5, disciplinesPerDay: 4 } },
    syllabusItems,
    dailyGoals: [
      { id: "g1", syllabusItemId: "lep", discipline: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", disciplina: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", subject: "Lei 7.210" },
      { id: "g2", syllabusItemId: "criminologia", discipline: "CRIMINOLOGIA", subject: "Prevenção terciária" }
    ],
    studies: [{ syllabusItemId: "terrorismo", discipline: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", subject: "Lei 13.260" }],
    materials: [{ syllabusItemId: "medicina", discipline: "MEDICINA LEGAL" }],
    questionLogs: [{ syllabusItemId: "improbidade", discipline: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", disciplina: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", subject: "Lei 8.429" }],
    questionBank: [{ syllabusItemId: "alienacao", discipline: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", disciplina: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", subject: "Lei 12.318" }],
    questionBankSessions: [{ items: [{ syllabusItemId: "software", disciplina: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL", subject: "Lei 9.609" }] }],
    questionErrorNotebook: [{ syllabusItemId: "adm-publica", discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA", disciplina: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA" }],
    simulados: [{ disciplines: [{ discipline: "MEDICINA LEGAL" }, { discipline: "CRIMINOLOGIA" }] }],
    factoryItems: [{ syllabusItemId: "adm-especial", disciplina: "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO" }],
    subjects: [{ discipline: "CRIMINOLOGIA" }, { discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA" }],
    disciplineWeights: {
      "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE": 20,
      "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL": 12,
      "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL": 8,
      "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL": 11,
      CRIMINOLOGIA: 8,
      "MEDICINA LEGAL": 9,
      "CIÊNCIAS FORENSES": 5,
      "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA": 10,
      "DIREITO ADMINISTRATIVO": 7,
      "DIREITO CIVIL": 6,
      "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO": 6,
      "LEGISLAÇÃO ESPECÍFICA – DIREITO ADMINISTRATIVO": 4,
      "Direito Penal e Legislação Complementar": 2,
      "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS": 3
    },
    contestPlanningProfiles: {
      joint: {
        switchDate: "2026-10-12",
        nextExamDate: "2026-11-01",
        categories: { A: 65, B: 20, C: 10, D: 0, PIECE: 5 },
        postSwitchCategories: { A: 40, B: 0, C: 20, D: 40, PIECE: 0 }
      }
    },
    migrations: {}
  };
}

function collectionLengths(state) {
  const keys = ["syllabusItems", "dailyGoals", "studies", "materials", "questionLogs", "questionBank", "questionBankSessions", "questionErrorNotebook", "simulados", "factoryItems", "subjects"];
  return Object.fromEntries(keys.map((key) => [key, state[key].length]));
}

function allNamedDisciplines(state) {
  const values = [];
  for (const item of state.syllabusItems) values.push(item.discipline);
  for (const item of state.dailyGoals) values.push(item.discipline, item.disciplina);
  for (const item of state.studies) values.push(item.discipline);
  for (const item of state.materials) values.push(item.discipline);
  for (const item of state.questionLogs) values.push(item.discipline, item.disciplina);
  for (const item of state.questionBank) values.push(item.discipline, item.disciplina);
  for (const session of state.questionBankSessions) for (const item of session.items) values.push(item.disciplina);
  for (const item of state.questionErrorNotebook) values.push(item.discipline, item.disciplina);
  for (const simulado of state.simulados) for (const item of simulado.disciplines) values.push(item.discipline);
  for (const item of state.factoryItems) values.push(item.disciplina);
  for (const item of state.subjects) values.push(item.discipline);
  return values.filter(Boolean);
}

test("V426 bloqueia integralmente sem backup confirmado", () => {
  const context = runtime();
  const state = sampleState();
  const before = JSON.stringify(state);
  const result = context.applyDisciplineUnificationV426(state);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "backup-required");
  assert.equal(JSON.stringify(state), before);
});

test("V426 reatribui por lei, funde disciplinas, preserva registros e usa maior peso", () => {
  const context = runtime();
  const state = sampleState();
  const lengths = collectionLengths(state);
  const result = context.applyDisciplineUnificationV426(state, {
    backupConfirmation: { confirmed: true, fileName: "backup-v426.json", savedAt: "2026-09-01T19:30:00.000Z", bytes: 12345 }
  });
  assert.equal(result.blocked, false);
  assert.equal(result.changed, true);
  assert.deepEqual(collectionLengths(state), lengths);

  const byId = Object.fromEntries(state.syllabusItems.map((item) => [item.id, item]));
  assert.equal(byId.lep.discipline, "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL");
  assert.equal(byId.improbidade.discipline, "DIREITO ADMINISTRATIVO");
  assert.equal(byId.alienacao.discipline, "DIREITO CIVIL");
  assert.equal(byId.software.discipline, "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL");
  assert.equal(byId.terrorismo.discipline, "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL");
  assert.equal(byId.criminologia.discipline, "CIÊNCIAS FORENSES");
  assert.equal(byId.medicina.discipline, "CIÊNCIAS FORENSES");
  assert.equal(byId["adm-publica"].discipline, "DIREITO ADMINISTRATIVO");
  assert.equal(byId["adm-especial"].discipline, "LEGISLAÇÃO ESPECÍFICA – DIREITO ADMINISTRATIVO");

  assert.equal(result.report.stageAReassignments.length, 5);
  assert.deepEqual(Array.from(result.report.stageAUnmatched, (item) => item.id), ["terrorismo"]);
  assert.equal(state.disciplineWeights["LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL"], 20);
  assert.equal(state.disciplineWeights["CIÊNCIAS FORENSES"], 9);
  assert.equal(state.disciplineWeights["DIREITO ADMINISTRATIVO"], 10);
  assert.equal(state.disciplineWeights["LEGISLAÇÃO ESPECÍFICA – DIREITO ADMINISTRATIVO"], 6);
  assert.equal("CRIMINOLOGIA" in state.disciplineWeights, false);
  assert.equal("MEDICINA LEGAL" in state.disciplineWeights, false);
  assert.equal("Direito Penal e Legislação Complementar" in state.disciplineWeights, false);
  assert.equal("LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS" in state.disciplineWeights, false);

  const syllabusNames = new Set(state.syllabusItems.map((item) => item.discipline));
  assert.deepEqual(Object.keys(state.disciplineWeights).filter((name) => !syllabusNames.has(name)), []);
  const forbidden = [
    "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE",
    "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL",
    "CRIMINOLOGIA",
    "MEDICINA LEGAL",
    "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO"
  ];
  assert.deepEqual(allNamedDisciplines(state).filter((name) => forbidden.includes(name)), []);
});

test("V426 aplica cota 8, recorta PCMA antes da PCPR e mantém C=20 após switchDate", () => {
  const context = runtime();
  const state = sampleState();
  const postBefore = JSON.stringify(state.contestPlanningProfiles.joint.postSwitchCategories);
  context.applyDisciplineUnificationV426(state, {
    backupConfirmation: { confirmed: true, fileName: "backup-v426.json", savedAt: "2026-09-01T19:30:00.000Z" }
  });
  assert.equal(state.planning.config.topicsPerDay, 8);
  assert.equal(state.planning.config.disciplinesPerDay, 8);
  assert.equal(state.contestPlanningProfiles.joint.categories.C, 0);
  assert.equal(JSON.stringify(state.contestPlanningProfiles.joint.postSwitchCategories), postBefore);
  assert.equal(context.contestPlanningProfile(state, "2026-09-15").categories.C, 0);
  assert.equal(context.contestPlanningProfile(state, "2026-10-12").categories.C, 20);
});

test("V426 é idempotente e registra backup, executedAt e relatório", () => {
  const context = runtime();
  const state = sampleState();
  const first = context.applyDisciplineUnificationV426(state, {
    backupConfirmation: { confirmed: true, fileName: "backup-v426.json", savedAt: "2026-09-01T19:30:00.000Z", bytes: 777 }
  });
  const once = JSON.stringify(state);
  const second = context.applyDisciplineUnificationV426(state, {
    backupConfirmation: { confirmed: true, fileName: "outro.json" }
  });
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(second.repeated, true);
  assert.equal(JSON.stringify(state), once);
  const migration = state.migrations.disciplineUnificationV426;
  assert.equal(migration.completed, true);
  assert.equal(migration.backup.fileName, "backup-v426.json");
  assert.match(migration.executedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(migration.report.collectionRewriteCounts);
});

test("V426 preserva travessão U+2013 em todos os destinos de legislação específica", () => {
  const context = runtime();
  const destinations = Object.values(context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.destinations);
  assert.equal(destinations.length, 4);
  for (const name of destinations) {
    assert.equal(name.includes(" – "), true, name);
    assert.equal(name.includes(" - "), false, name);
  }
});

test("wrapper V426 impede migração PCPR/PCMA posterior de ressuscitar categoria C=10", () => {
  const context = runtime();
  const state = sampleState();
  context.applyDisciplineUnificationV426(state, {
    backupConfirmation: { confirmed: true, fileName: "backup-v426.json" }
  });
  context.applyPcprPcma2026Migration = (target) => {
    target.contestPlanningProfiles.joint.categories.C = 10;
    return { changed: true };
  };
  assert.equal(context.__ALDUS_DISCIPLINE_UNIFICATION_V426__.installPcprCompatibilityWrapper(), true);
  context.applyPcprPcma2026Migration(state);
  assert.equal(state.contestPlanningProfiles.joint.categories.C, 0);
});
