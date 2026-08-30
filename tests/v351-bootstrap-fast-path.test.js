const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const api = require(path.join(root, "bootstrap-fast-path-v351.js"));

function validState() {
  return {
    subjects: [{ id: "s1" }],
    studies: [],
    syllabusItems: [],
    dailyGoals: [],
    questionLogs: [],
    materials: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: [],
    simulados: [],
    smartReviews: [],
    factoryAgenda: [],
    factoryItems: []
  };
}

test("V351 aceita somente estado principal com formato conhecido e dados reais", () => {
  assert.equal(api.stateValid(validState()), true);
  assert.equal(api.stateValid({ subjects: "invalido" }), false);
  assert.equal(api.stateValid({ subjects: [] }), false);
  assert.equal(api.stateValid(null), false);
});

test("V351 exige checksum íntegro antes do fast path", () => {
  const data = validState();
  const checksum = api.checksumState(data);
  assert.equal(api.recordIntegrity({ id: "current", checksum, data }), true);
  assert.equal(api.recordIntegrity({ id: "current", checksum: "quebrado", data }), false);
  assert.equal(api.recordIntegrity({ id: "current", data }), false);
  assert.equal(api.recordIntegrity({ id: "outro", checksum, data }), false);
});

test("V351 sonda existência do IndexedDB sem criar banco", async () => {
  const previous = global.indexedDB;
  try {
    global.indexedDB = { databases: async () => [{ name: "metas-estudo-db", version: 1 }] };
    assert.equal(await api.databaseExists(), true);
    global.indexedDB = { databases: async () => [{ name: "outro", version: 1 }] };
    assert.equal(await api.databaseExists(), false);
    global.indexedDB = {};
    assert.equal(await api.databaseExists(), null);
  } finally {
    if (previous === undefined) delete global.indexedDB;
    else global.indexedDB = previous;
  }
});

test("fast path não contém operações de escrita, limpeza ou migração de dados", () => {
  const source = fs.readFileSync(path.join(root, "bootstrap-fast-path-v351.js"), "utf8");
  assert.doesNotMatch(source, /createObjectStore\s*\(/);
  assert.doesNotMatch(source, /deleteDatabase\s*\(/);
  assert.doesNotMatch(source, /objectStore\([^)]*\)\.put\s*\(/);
  assert.doesNotMatch(source, /localStorage\.removeItem\s*\(/);
  assert.match(source, /transaction\(MAIN_STORE, "readonly"\)/);
  assert.match(source, /request\.transaction\?\.abort\(\)/);
});

test("loader V351 não aguarda o guard pesado antes de carregar o fast path", () => {
  const loader = fs.readFileSync(path.join(root, "bootstrap-integrity-loader-v275.js"), "utf8");
  assert.match(loader, /bootstrap-fast-path-v351\.js/);
  assert.doesNotMatch(loader, /__ALDUS_CATASTROPHIC_GUARD_READY_V275__/);
  assert.doesNotMatch(loader, /await guardPromise/);
});

test("Service Worker entrega o fast path atual e não inicia o guard pesado no boot normal", () => {
  const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  const currentVersion = worker.match(/const CURRENT_VERSION = "([^"]+)";/)?.[1] || "";
  const fastBootstrapVersion = worker.match(/const FAST_BOOTSTRAP_VERSION = "([^"]+)";/)?.[1] || "";
  assert.ok(currentVersion, "CURRENT_VERSION deve existir no Service Worker");
  assert.ok(fastBootstrapVersion, "FAST_BOOTSTRAP_VERSION deve existir no Service Worker");
  const fastPath = fs.readFileSync(path.join(root, "bootstrap-fast-path-v351.js"), "utf8");
  assert.match(
    fastPath,
    new RegExp(`const VERSION = "${fastBootstrapVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
    "o token do fast path deve acompanhar a URL entregue pelo worker"
  );
  assert.notEqual(fastBootstrapVersion, "", "o cache buster do fast path deve ser explícito");
  assert.match(worker, /BOOTSTRAP_FAST_PATH = `bootstrap-fast-path-v351\.js/);
  assert.match(worker, /bootstrap-fast-path-v351(?:-[^`]*)?`/);
  const start = worker.indexOf("function installProtectedBootstrapV275");
  const end = worker.indexOf("function installSecurityHardeningV296", start);
  const route = worker.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /aldusBootstrapIntegrityLoaderV275/);
  assert.doesNotMatch(route, /<script id="aldusCatastrophicStateGuardV275"/);
  assert.match(worker, /CATASTROPHIC_STATE_GUARD/);
  assert.match(worker, /bootstrap-fast-path-v351/);
  assert.match(worker, /-bootstrap-fast-path-v351(?:-[^`]*)?`/);
});
