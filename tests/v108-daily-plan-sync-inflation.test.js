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

function runInflationRepair(targetState) {
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
    planningTargetsForDate: () => ({ topics: 5 }),
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
