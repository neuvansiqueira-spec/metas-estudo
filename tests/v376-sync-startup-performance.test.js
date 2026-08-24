const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadTracker() {
  let cloneCalls = 0;
  const source = [
    "const defaultState = {};",
    "let state = {};",
    "function cloneData(value) { globalThis.__cloneCalls += 1; return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    fs.readFileSync("sync-integral-core.js", "utf8"),
    fs.readFileSync("sync-integral-deletions.js", "utf8"),
    "globalThis.__v376 = { syncSnapshotCollections, syncRecordSignature };"
  ].join("\n");
  const context = {
    console,
    __cloneCalls: cloneCalls,
    setTimeout: () => 0,
    clearTimeout: () => {},
    localStorage: { setItem() {} },
    getDeviceId: () => "device-test"
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.__v376, context };
}

test("V376 cria snapshot sem clonar cada registro", () => {
  const { api, context } = loadTracker();
  const state = {
    materials: [
      { id: "m1", title: "A", body: "x".repeat(10000) },
      { id: "m2", title: "B", body: "y".repeat(10000) }
    ],
    subjects: [{ id: "s1", name: "Penal" }]
  };
  const snapshot = api.syncSnapshotCollections(state);
  assert.equal(context.__cloneCalls, 0);
  assert.equal(snapshot.materials.size, 2);
  assert.deepEqual(Object.keys(snapshot.materials.get("materials:id:m1")), ["signature"]);
});

test("V376 ignora campos de revisão, mas detecta alteração real", () => {
  const { api } = loadTracker();
  const base = { id: "m1", title: "Material", updatedAt: "2026-08-23T20:00:00.000Z", nested: { savedAt: "2026-08-23T20:00:00.000Z", value: 1 } };
  const revisionOnly = { ...base, updatedAt: "2026-08-23T21:00:00.000Z", nested: { savedAt: "2026-08-23T21:00:00.000Z", value: 1 } };
  const edited = { ...revisionOnly, title: "Material editado" };
  assert.equal(api.syncRecordSignature(base), api.syncRecordSignature(revisionOnly));
  assert.notEqual(api.syncRecordSignature(base), api.syncRecordSignature(edited));
});

test("V376 tira a fotografia inicial do caminho crítico do bootstrap", () => {
  const source = fs.readFileSync("sync-integral-deletions.js", "utf8");
  assert.doesNotMatch(source, /record:\s*syncClone\(item\)/);
  assert.match(source, /JSON\.stringify\(value,/);
  assert.match(source, /requestIdleCallback\(build, \{ timeout: 500 \}\)/);
  assert.match(source, /syncRefreshDeletionSnapshot\(\{ defer: true \}\)/);
  assert.equal(source, fs.readFileSync("docs/sync-integral-deletions.js", "utf8"));
});

test("bundle V376 incorpora a correção quando gerado", { skip: !fs.existsSync("app-v376.js") }, () => {
  const bundle = fs.readFileSync("app-v376.js", "utf8");
  assert.match(bundle, /20260823-sync-startup-performance-v376/);
  assert.match(bundle, /syncRefreshDeletionSnapshot\(\{ defer: true \}\)/);
  assert.doesNotMatch(bundle, /record:\s*syncClone\(item\)/);
});
