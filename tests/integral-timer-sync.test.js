const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadServiceWorker(file) {
  const source = fs.readFileSync(file, "utf8");
  const context = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => ({ addAll() {}, put() {} }), keys: async () => [], delete: async () => true, match: async () => null },
    fetch: async () => ({ ok: false }),
    Headers,
    Response,
    URL,
    console
  };
  vm.runInNewContext(`${source}; result = { CURRENT_VERSION, patchAppScriptSource };`, context);
  return context.result;
}

function loadMergeFunction(files) {
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const context = {
    cloneData: (value) => JSON.parse(JSON.stringify(value)),
    defaultState: {
      subjects: [], studies: [], syllabusItems: [], dailyGoals: [], questionLogs: [], smartReviews: [], simulados: [], materials: [], questionBank: [], questionBankSessions: [], questionErrorNotebook: [], factoryItems: [], factoryAgenda: [],
      settings: {}, planning: {}, edital: {}, schedulableSettings: {}, disciplineWeights: {}, monthlyGoals: {}, factoryPromptLibrary: {}, timerSession: null
    },
    Date, Map, Set, Math, JSON, Number, String, Object, Array,
    localStorage: { setItem() {} },
    console
  };
  vm.runInNewContext(`${source}; result = mergeSyncStates;`, context);
  return context.result;
}

test("mescla sessões de dispositivos diferentes e recompõe o total da meta", () => {
  const mergeSyncStates = loadMergeFunction(["sync-integral-core.js", "sync-integral-state.js", "sync-integral-cloud.js"]);
  const local = {
    studies: [{ id: "sessao-local", sessionId: "sessao-local", goalId: "meta-1", minutes: 30, difficultyNotes: "detalhe local" }],
    dailyGoals: [{ id: "meta-1", date: "2026-07-17", discipline: "Direito Penal", subject: "Teoria Geral do Crime", studyActualMinutes: 30, actualMinutes: 30 }],
    questionLogs: []
  };
  const remote = {
    studies: [{ id: "sessao-remota", sessionId: "sessao-remota", goalId: "meta-1", minutes: 20, difficultyNotes: "detalhe remoto" }],
    dailyGoals: [{ id: "meta-1", date: "2026-07-17", discipline: "Direito Penal", subject: "Teoria Geral do Crime", studyActualMinutes: 20, actualMinutes: 20 }],
    questionLogs: []
  };
  const merged = mergeSyncStates(local, remote, "remote");
  assert.equal(merged.studies.length, 2);
  assert.deepEqual(new Set(merged.studies.map((item) => item.id)), new Set(["sessao-local", "sessao-remota"]));
  assert.equal(merged.dailyGoals[0].studyActualMinutes, 50);
  assert.equal(merged.dailyGoals[0].actualMinutes, 50);
  assert.equal(merged.dailyGoals[0].tempo_real_minutos, 50);
});

test("deduplica a mesma sessão e preserva a versão mais completa", () => {
  const mergeSyncStates = loadMergeFunction(["sync-integral-core.js", "sync-integral-state.js", "sync-integral-cloud.js"]);
  const local = { studies: [{ id: "local-id", sessionId: "sessao-unica", goalId: "meta-1", minutes: 25, notes: "" }], dailyGoals: [{ id: "meta-1" }], questionLogs: [] };
  const remote = { studies: [{ id: "remote-id", sessionId: "sessao-unica", goalId: "meta-1", minutes: 30, notes: "detalhes completos" }], dailyGoals: [{ id: "meta-1" }], questionLogs: [] };
  const merged = mergeSyncStates(local, remote, "remote");
  assert.equal(merged.studies.length, 1);
  assert.equal(merged.studies[0].minutes, 30);
  assert.equal(merged.studies[0].notes, "detalhes completos");
});

test("service worker injeta a sincronização integral sem substituir o estado local", () => {
  const sw = loadServiceWorker("service-worker.js");
  const helper = ["sync-integral-core.js", "sync-integral-state.js", "sync-integral-cloud.js"].map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const original = [
    'const APP_VERSION = "20260717-numero-qc-v26";',
    'async function uploadSyncPayload(payload = makeSyncPayload(), { statusMessage = "Dados enviados para a nuvem com sucesso." } = {}) { if (isSyncing) return null; isSyncing = true; try { const file = await findSyncFile(); const saved = file ? await updateSyncFile(file.id, payload) : await createSyncFile(payload); return saved; } finally { isSyncing = false; } }',
    'async function runAutoSyncAfterSave(reason) {}',
    'async function applyCloudPayload(payload) { isApplyingRemote = true; try { replaceState(payload.state); } finally { isApplyingRemote = false; } }',
    'async function syncNow() {}',
    'async function forcePullFromCloud() { if (!confirm("Baixar dados da nuvem e substituir os dados deste dispositivo? Um backup local automático será criado antes.")) return; }'
  ].join("\n");
  const patched = sw.patchAppScriptSource(original, helper);
  assert.equal(sw.CURRENT_VERSION, "20260717-sincronizacao-integral-cronometro-v29");
  assert.match(patched, /function mergeSyncStates/);
  assert.match(patched, /return uploadSyncPayloadIntegral\(payload, options\)/);
  assert.match(patched, /return applyCloudPayloadIntegral\(payload\)/);
  assert.doesNotMatch(patched, /async function applyCloudPayload\(payload\) \{[^}]*replaceState\(payload\.state\)/);
  assert.match(patched, /Mesclar os dados da nuvem com os dados deste dispositivo/);
});

test("arquivos publicados permanecem sincronizados", () => {
  assert.equal(fs.readFileSync("service-worker.js", "utf8"), fs.readFileSync("docs/service-worker.js", "utf8"));
  for (const file of ["sync-integral-core.js", "sync-integral-state.js", "sync-integral-cloud.js"]) assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"));
});
