const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadTracker() {
  let replacerCalls = 0;
  const nativeStringify = JSON.stringify.bind(JSON);
  const instrumentedJSON = Object.create(JSON);
  instrumentedJSON.stringify = (value, replacer, space) => {
    if (typeof replacer === "function") replacerCalls += 1;
    return nativeStringify(value, replacer, space);
  };
  const source = [
    "const defaultState = {};",
    "let state = {};",
    "function cloneData(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    fs.readFileSync("sync-integral-core.js", "utf8"),
    fs.readFileSync("sync-integral-deletions.js", "utf8"),
    "globalThis.__v377 = { syncRecordSignature };"
  ].join("\n");
  const context = {
    console,
    JSON: instrumentedJSON,
    setTimeout: () => 0,
    clearTimeout: () => {},
    localStorage: { setItem() {} },
    getDeviceId: () => "device-test"
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.__v377, replacerCalls: () => replacerCalls };
}

test("V377 usa caminho nativo rápido quando revisão existe somente no topo", () => {
  const { api, replacerCalls } = loadTracker();
  const record = {
    id: "q1",
    updatedAt: "2026-08-23T22:00:00.000Z",
    statement: "x".repeat(50000),
    alternatives: [{ text: "A" }, { text: "B" }, { text: "C" }]
  };
  const signature = api.syncRecordSignature(record);
  assert.equal(replacerCalls(), 0);
  assert.ok(signature.includes("q1"));
  assert.ok(!signature.includes("2026-08-23T22:00:00.000Z"));
});

test("V377 preserva semântica para revisão aninhada", () => {
  const { api, replacerCalls } = loadTracker();
  const base = {
    id: "m1",
    updatedAt: "2026-08-23T20:00:00.000Z",
    nested: { savedAt: "2026-08-23T20:00:00.000Z", value: 1 }
  };
  const revisionOnly = {
    ...base,
    updatedAt: "2026-08-23T21:00:00.000Z",
    nested: { savedAt: "2026-08-23T21:00:00.000Z", value: 1 }
  };
  const edited = { ...revisionOnly, nested: { ...revisionOnly.nested, value: 2 } };
  assert.equal(api.syncRecordSignature(base), api.syncRecordSignature(revisionOnly));
  assert.notEqual(api.syncRecordSignature(base), api.syncRecordSignature(edited));
  assert.ok(replacerCalls() > 0);
});

test("V377 remove clones redundantes antes da migração IndexedDB", () => {
  const script = fs.readFileSync("script.js", "utf8");
  assert.doesNotMatch(script, /migrateLocalStorageStateToIndexedDB\(cloneData\(state\)\)/);
  assert.match(script, /migrateLocalStorageStateToIndexedDB\(state\)/);
});

test("V377 mantém raiz e docs sincronizados", () => {
  assert.equal(
    fs.readFileSync("sync-integral-deletions.js", "utf8"),
    fs.readFileSync("docs/sync-integral-deletions.js", "utf8")
  );
  assert.equal(fs.readFileSync("script.js", "utf8"), fs.readFileSync("docs/script.js", "utf8"));
});

test("bundle V377 incorpora as otimizações quando gerado", { skip: !fs.existsSync("app-v377.js") }, () => {
  const bundle = fs.readFileSync("app-v377.js", "utf8");
  assert.match(bundle, /20260823-sync-signature-performance-v377/);
  assert.match(bundle, /SYNC_REVISION_JSON_TOKENS/);
  assert.doesNotMatch(bundle, /migrateLocalStorageStateToIndexedDB\(cloneData\(state\)\)/);
});
