const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadServiceWorker(file) {
  const source = fs.readFileSync(file, "utf8");
  const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
  const context = {
    self: {
      __ALDUS_APP_RELEASE__: { version, suffix: version.match(/v\d+$/)?.[0] },
      registration: { scope: "https://aldus.test/" },
      location: { origin: "https://aldus.test" },
      addEventListener() {}, skipWaiting() {}, clients: { claim() {} }
    },
    importScripts() {},
    caches: { open: async () => ({ addAll() {}, put() {} }), keys: async () => [], delete: async () => true, match: async () => null },
    fetch: async () => ({ ok: false }),
    Headers,
    Response,
    URL,
    console
  };
  vm.runInNewContext(`${source}; result = { CURRENT_VERSION, STATIC_ASSETS };`, context);
  return context.result;
}

function loadSyncFunctions(files) {
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const context = {
    cloneData: (value) => JSON.parse(JSON.stringify(value)),
    defaultState: {
      subjects: [], studies: [], syllabusItems: [], dailyGoals: [], questionLogs: [], smartReviews: [], simulados: [], materials: [], questionBank: [], questionBankSessions: [], questionErrorNotebook: [], factoryItems: [], factoryAgenda: [],
      settings: {}, planning: {}, edital: {}, schedulableSettings: {}, disciplineWeights: {}, monthlyGoals: {}, factoryPromptLibrary: {}, timerSession: null
    },
    state: {},
    Date, Map, Set, Math, JSON, Number, String, Object, Array,
    localStorage: { setItem() {} },
    console
  };
  vm.runInNewContext(`${source}; result = { mergeSyncStates, syncStateFingerprint, syncPayloadFingerprint };`, context);
  return context.result;
}

const helperFiles = ["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js", "sync-integral-cloud.js"];
const currentVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;

test("mescla sessões de dispositivos diferentes e recompõe o total da meta", () => {
  const { mergeSyncStates } = loadSyncFunctions(helperFiles);
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
  const { mergeSyncStates } = loadSyncFunctions(helperFiles);
  const local = { studies: [{ id: "local-id", sessionId: "sessao-unica", goalId: "meta-1", minutes: 25, notes: "" }], dailyGoals: [{ id: "meta-1" }], questionLogs: [] };
  const remote = { studies: [{ id: "remote-id", sessionId: "sessao-unica", goalId: "meta-1", minutes: 30, notes: "detalhes completos" }], dailyGoals: [{ id: "meta-1" }], questionLogs: [] };
  const merged = mergeSyncStates(local, remote, "remote");
  assert.equal(merged.studies.length, 1);
  assert.equal(merged.studies[0].minutes, 30);
  assert.equal(merged.studies[0].notes, "detalhes completos");
});

test("preserva sessões antigas ambíguas quando não há identificador confiável", () => {
  const { mergeSyncStates } = loadSyncFunctions(helperFiles);
  const common = { goalId: "meta-antiga", date: "2026-07-10", discipline: "Direito Penal", topic: "Culpabilidade" };
  const local = { studies: [{ ...common, minutes: 15, notes: "sessão no computador" }], dailyGoals: [{ id: "meta-antiga" }], questionLogs: [] };
  const remote = { studies: [{ ...common, minutes: 25, notes: "sessão no tablet" }], dailyGoals: [{ id: "meta-antiga" }], questionLogs: [] };
  const merged = mergeSyncStates(local, remote, "remote");
  assert.equal(merged.studies.length, 2);
  assert.equal(merged.dailyGoals[0].actualMinutes, 40);
});

test("fingerprint detecta conteúdo diferente mesmo com o mesmo horário de sincronização", () => {
  const { syncStateFingerprint, syncPayloadFingerprint } = loadSyncFunctions(helperFiles);
  const pc = { studies: [{ id: "pc", minutes: 64 }], dailyGoals: [{ id: "meta", actualMinutes: 64 }] };
  const phone = { studies: [{ id: "celular", minutes: 24 }], dailyGoals: [{ id: "meta", actualMinutes: 24 }] };
  assert.notEqual(syncStateFingerprint(pc), syncStateFingerprint(phone));
  assert.equal(syncPayloadFingerprint({ state: pc }), syncStateFingerprint(pc));
});

test("fingerprint ignora apenas diferenças de ordem das coleções", () => {
  const { syncStateFingerprint } = loadSyncFunctions(helperFiles);
  const a = { studies: [{ id: "1", minutes: 10 }, { id: "2", minutes: 20 }] };
  const b = { studies: [{ id: "2", minutes: 20 }, { id: "1", minutes: 10 }] };
  assert.equal(syncStateFingerprint(a), syncStateFingerprint(b));
});

test("service worker publica a versão atual e a sincronização integral continua baseada em conteúdo", () => {
  const sw = loadServiceWorker("service-worker.js");
  const helper = helperFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.equal(sw.CURRENT_VERSION, currentVersion);
  assert.ok(sw.STATIC_ASSETS.some((asset) => String(asset).includes(`app-${currentVersion.match(/v\d+$/)?.[0]}.js`)));
  assert.match(helper, /function syncStateFingerprint/);
  assert.match(helper, /function syncPayloadFingerprint/);
  assert.match(helper, /function mergeSyncStates/);
  assert.doesNotMatch(helper, /\+remoteDate === \+localDate/);
  assert.match(helper, /Mesclar os dados da nuvem com os dados deste dispositivo/);
});

test("arquivos publicados permanecem sincronizados", () => {
  assert.equal(fs.readFileSync("service-worker.js", "utf8"), fs.readFileSync("docs/service-worker.js", "utf8"));
  for (const file of helperFiles) assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"));
});
