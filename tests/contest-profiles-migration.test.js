const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const script = fs.readFileSync("script.js", "utf8");

function loadSyncEngine() {
  const source = [
    "const defaultState = { contestProfiles: [], activeContestId: null, contestSyllabusMap: [] };",
    "function cloneData(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    fs.readFileSync("sync-integral-core.js", "utf8"),
    fs.readFileSync("sync-integral-deletions.js", "utf8"),
    fs.readFileSync("sync-integral-state.js", "utf8"),
    "globalThis.__exports = { SYNC_COLLECTIONS, mergeSyncStates, syncCollectionKey };",
  ].join("\n");
  const context = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    localStorage: { setItem() {} },
    getDeviceId: () => "device-test",
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__exports;
}

test("estado, restauração e mesclagem reconhecem perfis de concurso sem recriar syllabus UUID", () => {
  assert.match(script, /contestProfiles:\s*\[\],\s*activeContestId:\s*null,\s*contestSyllabusMap:\s*\[\]/);
  assert.match(script, /state\.contestProfiles \|\|= \[\]/);
  assert.match(script, /state\.contestSyllabusMap \|\|= \[\]/);
  assert.match(script, /mergeArrays\(state\.contestProfiles, data\.contestProfiles \|\| \[\], \(item\) => item\.id\)/);
  assert.match(script, /mergeArrays\(state\.contestSyllabusMap, data\.contestSyllabusMap \|\| \[\], \(item\) => item\.id \|\| \[item\.contestId, item\.syllabusItemId, item\.code\]\.join\("\|"\)\)/);
  assert.doesNotMatch(
    script,
    /mergeArrays\(state\.contestSyllabusMap[\s\S]{0,250}createId\(/,
  );
});

test("sincronização preserva adições independentes e não duplica mapeamentos", () => {
  const sync = loadSyncEngine();
  assert.ok(sync.SYNC_COLLECTIONS.includes("contestProfiles"));
  assert.ok(sync.SYNC_COLLECTIONS.includes("contestSyllabusMap"));
  const local = {
    contestProfiles: [{ id: "pcpr", name: "PCPR" }],
    contestSyllabusMap: [{ id: "map-a", contestId: "pcpr", syllabusItemId: "uuid-antigo", code: "1.1" }],
    activeContestId: "pcpr",
  };
  const remote = {
    contestProfiles: [{ id: "pcma", name: "PCMA" }],
    contestSyllabusMap: [
      { id: "map-a", contestId: "pcpr", syllabusItemId: "uuid-antigo", code: "1.1" },
      { id: "map-b", contestId: "pcma", syllabusItemId: "uuid-antigo", code: "5.1" },
    ],
    activeContestId: "pcma",
  };
  const merged = sync.mergeSyncStates(local, remote, "remote");
  assert.deepEqual(Array.from(merged.contestProfiles, (item) => item.id).sort(), ["pcma", "pcpr"]);
  assert.deepEqual(Array.from(merged.contestSyllabusMap, (item) => item.id).sort(), ["map-a", "map-b"]);
  assert.equal(merged.contestSyllabusMap.find((item) => item.id === "map-a").syllabusItemId, "uuid-antigo");
  assert.equal(merged.activeContestId, "pcma");
});

test("chaves de sincronização usam IDs estáveis dos novos registros", () => {
  const sync = loadSyncEngine();
  assert.equal(
    sync.syncCollectionKey({ id: "profile-1", name: "PCPR" }, "contestProfiles"),
    "contestProfiles:id:profile-1",
  );
  assert.equal(
    sync.syncCollectionKey({ id: "map-1", contestId: "pcpr", syllabusItemId: "uuid-antigo" }, "contestSyllabusMap"),
    "contestSyllabusMap:id:map-1",
  );
});
