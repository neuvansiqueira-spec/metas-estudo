const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const syncFiles = ["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js"];

function loadSyncEngine() {
  const source = syncFiles.map(read).join("\n");
  const context = {
    cloneData: (value) => JSON.parse(JSON.stringify(value)),
    defaultState: {},
    state: {},
    localStorage: { setItem() {} },
    console,
    Date, Map, Set, Math, JSON, Number, String, Object, Array
  };
  vm.runInNewContext(`${source}; result = { mergeSyncStates, syncCollectionKey };`, context);
  return context.result;
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `função ${name} ausente`);
  const bodyStart = source.indexOf(") {", start) + 2;
  assert.ok(bodyStart > 1, `corpo da função ${name} ausente`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`função ${name} incompleta`);
}

function runInflationRepair(targetState, topics = 5) {
  const script = read("script.js");
  const source = [
    extractFunction(script, "dailyGoalRepairTimestampV108"),
    extractFunction(script, "repairDailyPlanningInflationV108"),
    "result = repairDailyPlanningInflationV108(targetState, { source: 'test' });"
  ].join("\n");
  const context = {
    targetState,
    state: targetState,
    todayISO: () => "2026-07-21",
    goalDateValue: (goal) => goal.date || goal.data || "",
    isPlanningStudyGoal: () => true,
    isManualDailyGoal: (goal) => !["edital verticalizado", "planejamento", "plano do dia"].includes(String(goal.origin || goal.origem || "manual").toLowerCase()),
    isAutomaticIntactDailyGoal: (goal) => (goal.status || "Pendente") === "Pendente" && !(Number(goal.actualMinutes) || 0) && !(goal.history || []).length,
    planningTargetsForDate: () => ({ topics }),
    Date, Math, Number, Set
  };
  vm.runInNewContext(source, context);
  return context.result;
}

function runMissingGoalsReplenishment(targetState, topics = 5) {
  const script = read("script.js");
  const source = [
    extractFunction(script, "replenishMissingDailyPlanningGoalsV116"),
    "result = replenishMissingDailyPlanningGoalsV116(targetState, '2026-07-21');"
  ].join("\n");
  const additions = ["nova-1", "nova-2", "nova-3"].map((id, index) => ({
    id,
    date: "2026-07-21",
    discipline: `Disciplina ${index + 3}`,
    subject: `Assunto ${index + 3}`,
    status: "Pendente"
  }));
  const context = {
    targetState,
    state: targetState,
    todayISO: () => "2026-07-21",
    planningTargetsForDate: () => ({ topics, disciplines: 5 }),
    goalDateValue: (goal) => goal.date || goal.data || "",
    isPlanningStudyGoal: () => true,
    goalSyllabusReservationKey: (goal) => goal.syllabusItemId || goal.id,
    buildPlanningScoreContext: () => ({}),
    eligiblePlanningGoalsForDate: () => additions,
    selectPlanningGoalsForTargets: ({ topicTarget, existingGoals, eligibleGoals }) => ({ selected: eligibleGoals.slice(0, Math.max(0, topicTarget - existingGoals.length)) }),
    Date, Math, Number, Set
  };
  vm.runInNewContext(source, context);
  return context.result;
}

test("sincronização reconhece a mesma meta automática mesmo com IDs diferentes", () => {
  const { mergeSyncStates, syncCollectionKey } = loadSyncEngine();
  const base = { date: "2026-07-21", discipline: "Direitos Humanos", subject: "Segurança pública", origin: "planejamento" };
  const localGoal = { ...base, id: "meta-local", status: "Pendente", createdAt: "2026-07-21T10:00:00.000Z" };
  const remoteGoal = { ...base, id: "meta-remota", status: "Concluída", actualMinutes: 35, studyActualMinutes: 35, createdAt: "2026-07-21T09:00:00.000Z" };

  assert.equal(syncCollectionKey(localGoal, "dailyGoals"), syncCollectionKey(remoteGoal, "dailyGoals"));
  const merged = mergeSyncStates({ dailyGoals: [localGoal] }, { dailyGoals: [remoteGoal] }, "remote");
  assert.equal(merged.dailyGoals.length, 1);
  assert.equal(merged.dailyGoals[0].id, "meta-remota");
  assert.equal(merged.dailyGoals[0].status, "Concluída");
  assert.equal(merged.dailyGoals[0].actualMinutes, 35);
});

test("metas manuais iguais continuam independentes", () => {
  const { mergeSyncStates, syncCollectionKey } = loadSyncEngine();
  const base = { date: "2026-07-21", discipline: "Direito Penal", subject: "Culpabilidade", origin: "manual", status: "Pendente" };
  const first = { ...base, id: "manual-1" };
  const second = { ...base, id: "manual-2" };
  assert.notEqual(syncCollectionKey(first, "dailyGoals"), syncCollectionKey(second, "dailyGoals"));
  const merged = mergeSyncStates({ dailyGoals: [first] }, { dailyGoals: [second] }, "remote");
  assert.equal(merged.dailyGoals.length, 2);
});

test("reparo reduz 12 metas para as 5 planejadas e preserva a concluída", () => {
  const completed = { id: "concluida", date: "2026-07-21", discipline: "Disciplina 1", subject: "Assunto 1", origin: "planejamento", status: "Concluída", actualMinutes: 30 };
  const pending = Array.from({ length: 11 }, (_, index) => ({
    id: `pendente-${index + 1}`,
    date: "2026-07-21",
    discipline: `Disciplina ${index + 2}`,
    subject: `Assunto ${index + 2}`,
    origin: "planejamento",
    status: "Pendente",
    createdAt: new Date(Date.UTC(2026, 6, 21, 10, index)).toISOString()
  }));
  const targetState = { dailyGoals: [completed, ...pending], migrations: {} };
  const report = runInflationRepair(targetState);

  assert.equal(report.changed, true);
  assert.equal(report.removed.length, 7);
  assert.equal(targetState.dailyGoals.length, 5);
  assert.ok(targetState.dailyGoals.some((goal) => goal.id === "concluida"));
  assert.equal(targetState.dailyGoals.filter((goal) => goal.status === "Pendente").length, 4);
});

test("reparo nunca apaga metas quando o alvo diário aparece como zero", () => {
  const pending = Array.from({ length: 5 }, (_, index) => ({
    id: `meta-${index + 1}`,
    date: "2026-07-21",
    discipline: `Disciplina ${index + 1}`,
    subject: `Assunto ${index + 1}`,
    origin: "planejamento",
    status: "Pendente"
  }));
  const targetState = { dailyGoals: pending, migrations: {} };
  const report = runInflationRepair(targetState, 0);

  assert.equal(report.changed, false);
  assert.equal(report.removed.length, 0);
  assert.equal(targetState.dailyGoals.length, 5);
  assert.equal(report.reports[0].skipped, "zero-target-safety");
});

test("recomposição completa apenas as metas faltantes e preserva as existentes", () => {
  const existing = [
    { id: "concluida", date: "2026-07-21", discipline: "Direitos Humanos", subject: "Segurança Pública", status: "Concluída", actualMinutes: 71 },
    { id: "pendente", date: "2026-07-21", discipline: "Direito Administrativo", subject: "Lei nº 14.133/2021", status: "Pendente" }
  ];
  const targetState = { dailyGoals: existing.map((goal) => ({ ...goal })), migrations: {} };
  const report = runMissingGoalsReplenishment(targetState, 5);

  assert.equal(report.changed, true);
  assert.equal(report.before, 2);
  assert.equal(report.after, 5);
  assert.deepEqual([...report.added], ["nova-1", "nova-2", "nova-3"]);
  assert.equal(targetState.dailyGoals.find((goal) => goal.id === "concluida").actualMinutes, 71);
  assert.equal(targetState.dailyGoals.find((goal) => goal.id === "pendente").status, "Pendente");
});

test("recomposição não cria metas quando o alvo diário está temporariamente zerado", () => {
  const targetState = { dailyGoals: [{ id: "existente", date: "2026-07-21", status: "Pendente" }], migrations: {} };
  const report = runMissingGoalsReplenishment(targetState, 0);

  assert.equal(report.changed, false);
  assert.equal(report.skipped, "zero-target-safety");
  assert.equal(targetState.dailyGoals.length, 1);
});

test("metodologia diária usa disciplinas por dia como quantidade exata de metas", () => {
  const script = read("script.js");
  const context = {
    state: {},
    planningConfig: () => ({ disciplinesPerDay: 5, topicsPerDay: 3 }),
    getDayContentConfig: () => ({ mode: "goals_only" }),
    availabilityForDate: () => ({ type: "dia normal" }),
    dayModeIncludesGoals: () => true,
    Math, Number
  };
  vm.runInNewContext(`${extractFunction(script, "planningTargetsForDate")}; result = planningTargetsForDate('2026-07-21');`, context);

  assert.equal(context.result.topics, 5);
  assert.equal(context.result.disciplines, 5);
  assert.equal(context.result.oneGoalPerDiscipline, true);
});

test("metodologia não repete disciplina já entregue no mesmo dia", () => {
  const script = read("script.js");
  const context = {
    todayISO: () => "2026-07-21",
    canonical: (value) => String(value || "").toLowerCase(),
    planningItemKey: (goal) => `${String(goal.discipline || "").toLowerCase()}|${String(goal.subject || "").toLowerCase()}`,
    Math, Number, Set
  };
  const existingGoals = [{ discipline: "Direitos Humanos", subject: "Segurança Pública", status: "Concluída" }];
  const eligibleGoals = [
    { discipline: "Direitos Humanos", subject: "Dignidade da Pessoa Humana" },
    { discipline: "Direito Administrativo", subject: "Licitações" },
    { discipline: "Direito Penal", subject: "Teoria do Crime" },
    { discipline: "Direito Constitucional", subject: "Direitos Fundamentais" },
    { discipline: "Medicina Legal", subject: "Traumatologia" }
  ];
  const runtime = { ...context, eligibleGoals, existingGoals };
  vm.runInNewContext(`${extractFunction(script, "selectPlanningGoalsForTargets")}; result = selectPlanningGoalsForTargets({ topicTarget: 5, disciplineTarget: 5, eligibleGoals, existingGoals, distinctDisciplinesOnly: true });`, runtime);
  assert.equal(runtime.result.selected.length, 4);
  assert.equal(runtime.result.selected.some((goal) => goal.discipline === "Direitos Humanos"), false);
  assert.equal(new Set(runtime.result.selected.map((goal) => goal.discipline)).size, 4);
});

test("ativação V117 corrige a tela mostrada sem alterar a meta concluída", () => {
  const targetState = { dailyGoals: [
    { id: "administrativo", date: "2026-07-21", discipline: "Direito Administrativo", subject: "Lei nº 14.133/2021", status: "Pendente", origin: "planejamento" },
    { id: "dh-repetida", date: "2026-07-21", discipline: "Direitos Humanos", subject: "Dignidade da pessoa humana", status: "Pendente", origin: "planejamento" },
    { id: "dh-concluida", date: "2026-07-21", discipline: "Direitos Humanos", subject: "Segurança Pública", status: "Concluída", actualMinutes: 71, origin: "planejamento" }
  ], migrations: {} };
  let intervalCallback = null;
  const windowObject = {
    setInterval(callback) { intervalCallback = callback; return 1; },
    clearInterval() {}, setTimeout() {}
  };
  const additions = ["Penal", "Constitucional", "Medicina Legal", "Processo Penal"].map((discipline, index) => ({ id: `nova-${index}`, date: "2026-07-21", discipline, subject: `Assunto ${index}`, status: "Pendente" }));
  const context = {
    state: targetState,
    indexedDBStatus: { bootstrap: "concluída" },
    planningConfig: () => ({ disciplinesPerDay: 5 }),
    goalDateValue: (goal) => goal.date,
    isPlanningStudyGoal: () => true,
    isProtectedDailyGoal: (goal) => goal.status === "Concluída" || Number(goal.actualMinutes) > 0,
    canonical: (value) => String(value || "").toLowerCase(),
    buildPlanningScoreContext: () => ({}),
    eligiblePlanningGoalsForDate: () => additions,
    todayISO: () => "2026-07-21",
    saveData() {}, render() {}, autoSyncAfterSave() {},
    document: { querySelectorAll: () => [] },
    navigator: {}, window: windowObject,
    Date, Math, Number, Set
  };
  vm.runInNewContext(read("daily-goal-methodology-v117.js"), context);
  intervalCallback();

  assert.equal(targetState.dailyGoals.length, 5);
  assert.equal(targetState.dailyGoals.some((goal) => goal.id === "dh-repetida"), false);
  assert.equal(targetState.dailyGoals.find((goal) => goal.id === "dh-concluida").actualMinutes, 71);
  assert.equal(new Set(targetState.dailyGoals.map((goal) => goal.discipline)).size, 5);
});

test("reparo V108 permanece ativo na publicação atual", () => {
  const version = JSON.parse(read("package.json")).version;
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("script.js"), new RegExp(`APP_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260721-plano-dia-sincronizacao-v108"/);
  for (const file of ["index.html", "script.js", "service-worker.js", ...syncFiles]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
