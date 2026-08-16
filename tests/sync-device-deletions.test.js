const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadSyncEngine() {
  const source = [
    "const defaultState = {};",
    "let state = {};",
    "function cloneData(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    fs.readFileSync("sync-integral-core.js", "utf8"),
    fs.readFileSync("sync-integral-deletions.js", "utf8"),
    fs.readFileSync("sync-integral-state.js", "utf8"),
    "globalThis.__syncExports = { SYNC_COLLECTIONS, mergeSyncStates, syncSnapshotCollections, syncTrackCollectionMutations, syncCollectionKey, syncRecordSignature };"
  ].join("\n");
  const context = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    localStorage: { setItem() {} },
    getDeviceId: () => "device-test"
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__syncExports;
}

function tombstone(collection, id, deletedAt) {
  const key = `${collection}:id:${id}`;
  return { schemaVersion: 1, collections: { [collection]: { [key]: { key, collection, deletedAt, deviceId: "device-a" } } } };
}

test("exclusão mais recente impede que registro antigo reapareça", () => {
  const sync = loadSyncEngine();
  const old = "2026-07-17T10:00:00.000Z";
  const deleted = "2026-07-17T11:00:00.000Z";
  const local = { materials: [], syncTombstones: tombstone("materials", "m1", deleted) };
  const remote = { materials: [{ id: "m1", title: "Material antigo", updatedAt: old }] };
  const merged = sync.mergeSyncStates(local, remote, "remote");
  assert.equal(merged.materials.length, 0);
  assert.ok(merged.syncTombstones.collections.materials["materials:id:m1"]);
});

test("edição posterior à exclusão restaura conscientemente o registro", () => {
  const sync = loadSyncEngine();
  const deleted = "2026-07-17T11:00:00.000Z";
  const edited = "2026-07-17T12:00:00.000Z";
  const local = { materials: [{ id: "m1", title: "Material restaurado", updatedAt: edited }], syncTombstones: tombstone("materials", "m1", deleted) };
  const merged = sync.mergeSyncStates(local, { materials: [] }, "remote");
  assert.equal(merged.materials.length, 1);
  assert.equal(merged.materials[0].title, "Material restaurado");
  assert.equal(Object.keys(merged.syncTombstones.collections.materials).length, 0);
});

test("edição numérica mais recente pode reduzir um valor", () => {
  const sync = loadSyncEngine();
  const local = { dailyGoals: [{ id: "g1", minutes: 60, updatedAt: "2026-07-17T12:00:00.000Z" }] };
  const remote = { dailyGoals: [{ id: "g1", minutes: 75, updatedAt: "2026-07-17T10:00:00.000Z" }] };
  const merged = sync.mergeSyncStates(local, remote, "remote");
  assert.equal(merged.dailyGoals[0].minutes, 60);
});

test("lista editável mais recente pode remover valores antigos", () => {
  const sync = loadSyncEngine();
  const local = { materials: [{ id: "m1", tags: ["resumo"], updatedAt: "2026-07-17T12:00:00.000Z" }] };
  const remote = { materials: [{ id: "m1", tags: ["resumo", "antigo"], updatedAt: "2026-07-17T10:00:00.000Z" }] };
  const merged = sync.mergeSyncStates(local, remote, "remote");
  assert.deepEqual(Array.from(merged.materials[0].tags), ["resumo"]);
});

test("adições diferentes nos dois dispositivos são preservadas", () => {
  const sync = loadSyncEngine();
  const local = { materials: [{ id: "local", title: "PC", updatedAt: "2026-07-17T10:00:00.000Z" }] };
  const remote = { materials: [{ id: "remote", title: "Celular", updatedAt: "2026-07-17T10:01:00.000Z" }] };
  const merged = sync.mergeSyncStates(local, remote, "remote");
  assert.deepEqual(Array.from(merged.materials, (item) => item.id).sort(), ["local", "remote"]);
});

test("rastreador cria marcador de exclusão e data de edição", () => {
  const sync = loadSyncEngine();
  const previousState = { materials: [{ id: "m1", title: "Antes" }], subjects: [{ id: "s1", name: "Penal" }] };
  const snapshot = sync.syncSnapshotCollections(previousState);
  const currentState = { materials: [], subjects: [{ id: "s1", name: "Direito Penal" }] };
  const changedAt = "2026-07-17T13:00:00.000Z";
  sync.syncTrackCollectionMutations(snapshot, currentState, changedAt);
  assert.equal(currentState.syncTombstones.collections.materials["materials:id:m1"].deletedAt, changedAt);
  assert.equal(currentState.subjects[0].updatedAt, changedAt);
});

test("snapshot de exclusões guarda apenas assinatura e não clona o registro inteiro", () => {
  const sync = loadSyncEngine();
  const source = { materials: [{ id: "m1", title: "Material", nested: { tags: ["a", "b"] } }] };
  const snapshot = sync.syncSnapshotCollections(source);
  const entry = snapshot.materials.get("materials:id:m1");
  assert.equal(typeof entry.signature, "string");
  assert.equal(Object.prototype.hasOwnProperty.call(entry, "record"), false);
});

test("rastreador atualiza o próprio snapshot e não redetecta a mesma edição no save seguinte", () => {
  const sync = loadSyncEngine();
  const previousState = { materials: [{ id: "m1", title: "Antes", nested: { tags: ["a"] } }] };
  const snapshot = sync.syncSnapshotCollections(previousState);
  const currentState = { materials: [{ id: "m1", title: "Antes", nested: { tags: ["a"] } }] };

  assert.equal(sync.syncTrackCollectionMutations(snapshot, currentState, "2026-07-17T13:00:00.000Z"), false);
  currentState.materials[0].nested.tags.push("b");
  assert.equal(sync.syncTrackCollectionMutations(snapshot, currentState, "2026-07-17T13:01:00.000Z"), true);
  assert.equal(currentState.materials[0].updatedAt, "2026-07-17T13:01:00.000Z");
  assert.equal(sync.syncTrackCollectionMutations(snapshot, currentState, "2026-07-17T13:02:00.000Z"), false);
  assert.equal(currentState.materials[0].updatedAt, "2026-07-17T13:01:00.000Z");
});

test("campos de revisão não alteram a assinatura usada para detectar conteúdo", () => {
  const sync = loadSyncEngine();
  const before = { id: "m1", title: "Material", updatedAt: "2026-07-17T10:00:00.000Z", savedAt: "2026-07-17T10:00:01.000Z" };
  const after = { ...before, updatedAt: "2026-07-17T11:00:00.000Z", savedAt: "2026-07-17T11:00:01.000Z" };
  assert.equal(sync.syncRecordSignature(before), sync.syncRecordSignature(after));
});

test("arquivos publicados permanecem idênticos e cache usa a versão atual", () => {
  assert.equal(fs.readFileSync("sync-integral-deletions.js", "utf8"), fs.readFileSync("docs/sync-integral-deletions.js", "utf8"));
  assert.equal(fs.readFileSync("sync-integral-state.js", "utf8"), fs.readFileSync("docs/sync-integral-state.js", "utf8"));
  assert.equal(fs.readFileSync("service-worker.js", "utf8"), fs.readFileSync("docs/service-worker.js", "utf8"));
  const worker = fs.readFileSync("service-worker.js", "utf8");
  const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
  assert.match(worker, /const CURRENT_VERSION = self\.__ALDUS_APP_RELEASE__\.version/);
  assert.match(fs.readFileSync("app-version.js", "utf8"), new RegExp(`const VERSION = "${version}"`));
  assert.match(worker, /sync-integral-deletions\.js/);
  assert.match(worker, /\["sync-integral-core\.js", "sync-integral-deletions\.js", "sync-integral-state\.js", "sync-integral-cloud\.js", "sync-integral-time-protection\.js"\]/);
});
