const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const indexedDBSource = fs.readFileSync("storage-indexeddb.js", "utf8");
const {
  checksumForState,
  legacyChecksumForState,
  validateIndexedDBState,
  statesMatchIndexedDBRecord
} = require("../storage-indexeddb.js");

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return source.slice(from, to);
}

test("checksum novo é linear e registros antigos continuam válidos", () => {
  const state = {
    subjects: [{ id: "subject-1", name: "Direito Penal" }],
    dailyGoals: [{ id: "goal-1", subject: "Teoria do Crime" }],
    materials: [],
    syllabusItems: [],
    studies: [],
    questionLogs: [],
    smartReviews: [],
    simulados: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: []
  };
  const currentRecord = {
    id: "current",
    schemaVersion: 1,
    checksum: checksumForState(state),
    data: structuredClone(state)
  };
  const legacyRecord = {
    ...currentRecord,
    checksum: legacyChecksumForState(state)
  };

  assert.match(currentRecord.checksum, /^fnv1a-json-v2-/);
  assert.match(legacyRecord.checksum, /^fnv1a-/);
  assert.equal(validateIndexedDBState(currentRecord), true);
  assert.equal(validateIndexedDBState(legacyRecord), true);
  assert.equal(statesMatchIndexedDBRecord(state, currentRecord, currentRecord.checksum), true);
  assert.equal(statesMatchIndexedDBRecord(state, legacyRecord), true);
});

test("gravação grande evita insistir no localStorage sem apagar a cópia existente", () => {
  const persistence = sourceBetween(
    script,
    "function persistStateSafely(options = {})",
    "function saveData(options = {})"
  );

  assert.match(script, /LOCAL_STORAGE_SAFE_STATE_BYTES = 4 \* 1024 \* 1024/);
  assert.match(persistence, /knownLargeState/);
  assert.match(persistence, /indexedDBStatus\.size > LOCAL_STORAGE_SAFE_STATE_BYTES/);
  assert.match(persistence, /queueIndexedDBStateCopy\(\)/);
  assert.doesNotMatch(
    persistence,
    /localStorage\.clear|removeItem|deleteDatabase|clearProjectLocalStorage/i
  );
});

test("cópia IndexedDB roda quando o navegador estiver livre e valida o checksum salvo", () => {
  const queue = sourceBetween(
    script,
    "function queueIndexedDBStateCopy()",
    "function persistStateSafely(options = {})"
  );

  assert.match(queue, /requestIdleCallback\(run, \{ timeout: 1000 \}\)/);
  assert.match(queue, /saveStateToIndexedDB\(snapshot, \{ detachedSnapshot: true \}\)/);
  assert.match(queue, /statesMatchIndexedDBRecord\(snapshot, reloaded, record\.checksum\)/);
  assert.match(queue, /if \(indexedDBPersistQueued\) queueIndexedDBStateCopy\(\)/);
});

test("payload do Drive não dispara um segundo salvamento completo", () => {
  const payload = sourceBetween(
    script,
    "function makeSyncPayload()",
    "function syncPayloadUpdatedAt"
  );
  const autoSync = sourceBetween(
    script,
    'function autoSyncAfterSave(reason = "alteração")',
    "function isQuotaExceededError"
  );

  assert.match(payload, /markLocalUpdated\(updatedAt\)/);
  assert.doesNotMatch(payload, /saveData\(/);
  assert.match(autoSync, /AUTO_SYNC_DEBOUNCE_MS/);
  assert.match(autoSync, /requestIdleCallback\(run, \{ timeout: 2000 \}\)/);
  assert.doesNotMatch(autoSync, /\}, 750\)/);
});

test("módulo IndexedDB evita validar o registro anterior em salvamento não vazio", () => {
  const save = sourceBetween(
    indexedDBSource,
    "async function saveStateToIndexedDB(state, options = {})",
    "function loadStateFromIndexedDB()"
  );

  assert.match(save, /if \(!indexedDBStateHasUserData\(data\)\)/);
  assert.match(save, /detachedSnapshot/);
  assert.match(save, /serializedSize/);
  assert.doesNotMatch(save, /stableSerialize\(data\)/);
});
