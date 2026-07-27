const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { assertCurrentReleaseContract } = require("./current-release-contract.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const backup = JSON.parse(read("../sources/backup-metas-estudo-2026-07-25-22-44.json"));

function migrationRuntime() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(read("pcpr-pcma-2026-catalog.js"), context);
  vm.runInContext(read("pcpr-pcma-2026-migration.js"), context);
  return context;
}

function priorityRuntime(targetState) {
  const start = script.indexOf("const INTEGRATED_PLANNING_PRIORITY_VERSION_V155");
  const end = script.indexOf("function buildPlanningScoreContext", start);
  assert.ok(start >= 0 && end > start);
  const context = {
    state: targetState,
    normalizePlanningState: (planning) => planning || {},
    canonical: (value) => String(value || "").trim().toLowerCase(),
    isSchedulable: () => true,
    console, Map, Set, Math, Number, String, Object, Array, JSON
  };
  vm.createContext(context);
  vm.runInContext(`${script.slice(start, end)}; result = { INITIAL_WRONG_TOPICS_V155, planningPriorityMetricsV155, planningPriorityFingerprintV155 };`, context);
  return context.result;
}

test("os 16 erros informados apontam para 17 UUIDs oficiais (dois sistemas de Direitos Humanos)", () => {
  const runtime = migrationRuntime();
  const state = JSON.parse(JSON.stringify(backup.data));
  runtime.applyPcprPcma2026Migration(state);
  const priority = priorityRuntime(state);
  const ids = priority.INITIAL_WRONG_TOPICS_V155.map((entry) => entry.syllabusItemId);
  const syllabusIds = new Set(state.syllabusItems.map((item) => item.id));
  const officialIds = new Set(state.contestSyllabusMap.map((mapping) => mapping.syllabusItemId));

  assert.equal(ids.length, 17);
  assert.equal(new Set(ids).size, 17);
  assert.equal(ids.every((id) => syllabusIds.has(id)), true);
  assert.equal(ids.every((id) => officialIds.has(id)), true);
});

test("todo item oficial ativo fica alcançável antes ou depois da virada PCPR", () => {
  const runtime = migrationRuntime();
  const state = JSON.parse(JSON.stringify(backup.data));
  runtime.applyPcprPcma2026Migration(state);
  const active = state.syllabusItems.filter((item) => !item.legacyOnly && !item.hiddenFromCatalog && item.status !== "Ignorado" && state.contestSyllabusMap.some((mapping) => mapping.syllabusItemId === item.id));
  const unreachable = active.filter((item) => (
    !runtime.isItemEnabledForPlanning(state, item.id, "2026-10-11")
    && !runtime.isItemEnabledForPlanning(state, item.id, "2026-10-12")
  ));

  assert.equal(active.length, 726);
  assert.deepEqual(unreachable, []);
});

test("erros repetidos aumentam a prioridade e acertos posteriores a reduzem gradualmente", () => {
  const syllabusItemId = "21b2bf54-3b13-42ad-b8f8-abcf45f06c77";
  const state = {
    planning: { topicPrioritySignalsV155: { seed: { syllabusItemId, wrong: 1, correct: 0, source: "test" } } },
    syllabusItems: [{ id: syllabusItemId, discipline: "Direito Penal", subject: "Administração Pública" }],
    contestSyllabusMap: [{ syllabusItemId }],
    questionLogs: [],
    questionBankSessions: []
  };
  const priority = priorityRuntime(state);
  const initial = priority.planningPriorityMetricsV155(state).get(syllabusItemId).boost;
  state.questionLogs.push({ id: "wrong-1", syllabusItemId, wrong: 2, correct: 0, updatedAt: "2026-07-26T10:00:00Z" });
  const repeatedWrong = priority.planningPriorityMetricsV155(state).get(syllabusItemId).boost;
  state.questionLogs.push({ id: "correct-1", syllabusItemId, wrong: 0, correct: 4, updatedAt: "2026-07-27T10:00:00Z" });
  const laterCorrect = priority.planningPriorityMetricsV155(state).get(syllabusItemId).boost;

  assert.ok(repeatedWrong > initial);
  assert.ok(laterCorrect < repeatedWrong);
  assert.ok(laterCorrect > 0);
  assert.notEqual(priority.planningPriorityFingerprintV155(state), "");
});

test("erro diagnosticado pode ser antecipado sem liberar antecipadamente todo o bloco PCMA", () => {
  const eligibility = script.slice(
    script.indexOf("function eligiblePlanningGoalsForDate"),
    script.indexOf("function selectDistinctPlanningItems")
  );
  assert.match(eligibility, /diagnosticBoost <= 0/);
  assert.match(eligibility, /!isItemEnabledForPlanning\(targetState, item\.id, date\)/);
  assert.doesNotMatch(eligibility, /planningMode\s*=/);
});

test("replanejamento V155 valida em cópia e só grava metas pendentes futuras", () => {
  assert.match(script, /const beforeState = cloneData\(targetState\)/);
  assert.match(script, /const simulation = cloneData\(targetState\)/);
  assert.match(script, /goalDateValue\(goal\) >= fromDate/);
  assert.match(script, /!isManualDailyGoal\(goal\)/);
  assert.match(script, /shouldRecalculateDailyGoal\(goal\)/);
  assert.match(script, /if \(!validation\.ok\) return \{ ok: false, changed: false/);
  assert.match(script, /targetState\.dailyGoals = prepared\.candidateState\.dailyGoals/);
  assert.match(script, /PLANNING_PROTECTED_COLLECTIONS_V155/);
  assert.match(script, /duplicate-future-planning-topic/);
  assert.match(script, /protected-goal-changed/);
  assert.match(script, /past-goal-changed/);
});

test("novos registros de questões acionam replanejamento sem apagar storage do usuário", () => {
  assert.match(script, /refreshPlanningPrioritiesForQuestionChangesV155\(state\)/);
  assert.match(script, /prioritySourceFingerprintV155/);
  assert.match(script, /syllabusItemId:q\.syllabusItemId\|\|resolvePlanningEvidenceItemIdV155\(state,q\)/);
  const v155Source = script.slice(
    script.indexOf("const INTEGRATED_PLANNING_PRIORITY_VERSION_V155"),
    script.indexOf("function replanFutureGoalsAfterCompletionV77")
  );
  assert.doesNotMatch(v155Source, /localStorage\.clear|indexedDB\.deleteDatabase|removeItem\(/);
});

test("v155 mantém versão, bundles, worker e raiz/docs em paridade", () => {
  assertCurrentReleaseContract();
});
