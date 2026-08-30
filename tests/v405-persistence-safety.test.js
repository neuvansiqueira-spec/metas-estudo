const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { checksumForState, resolveIndexedDBWriteCandidate } = require("../storage-indexeddb.js");

function validRecord(data) {
  return {
    id: "current",
    schemaVersion: 1,
    savedAt: "2026-08-30T00:00:00.000Z",
    checksum: checksumForState(data),
    data
  };
}

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return source.slice(from, to);
}

test("V405 detecta revisão concorrente e mescla antes de gravar", () => {
  const stored = { subjects: [{ id: "stored" }], studies: [] };
  const local = { subjects: [{ id: "local" }], studies: [] };
  const existing = validRecord(stored);
  const result = resolveIndexedDBWriteCandidate(local, existing, {
    expectedChecksum: "fnv1a-json-v2-obsoleto",
    mergeConcurrentState: (candidate, current) => ({ ...candidate, subjects: [...current.subjects, ...candidate.subjects] })
  });

  assert.equal(result.concurrentMerge, true);
  assert.equal(result.previousChecksum, existing.checksum);
  assert.deepEqual(result.data.subjects.map((item) => item.id), ["stored", "local"]);
});

test("V405 recusa estado vazio mesmo durante conflito entre abas", () => {
  const existing = validRecord({ subjects: [{ id: "preservar" }], studies: [] });
  assert.throws(
    () => resolveIndexedDBWriteCandidate({}, existing),
    /estado vazio não substitui IndexedDB válido/
  );
});

test("V405 restaura backup somente depois de validar IndexedDB", () => {
  const script = fs.readFileSync("script.js", "utf8");
  const restore = sourceBetween(script, "async function restoreBackup(payload, mode)", "async function handleBackupFile(file)");
  const saveAt = restore.indexOf("await saveStateToIndexedDB(snapshot");
  const validateAt = restore.indexOf("statesMatchIndexedDBRecord(null, reloaded, saved.checksum)");
  const clearAt = restore.indexOf("if (mode === \"replace\") clearProjectLocalStorage()");
  const successAt = restore.indexOf("e validado com sucesso");

  assert.ok(saveAt >= 0 && saveAt < validateAt);
  assert.ok(validateAt < clearAt);
  assert.ok(clearAt < successAt);
  assert.match(restore, /replaceState\(previousState\)/);
});

test("V405 avisa outras abas por evento, sem novo polling", () => {
  const script = fs.readFileSync("script.js", "utf8");
  const signals = sourceBetween(script, "function publishIndexedDBPersistenceSignal(record)", "function persistStateSafely(options = {})");
  assert.match(signals, /BroadcastChannel/);
  assert.match(signals, /addEventListener\("storage"/);
  assert.doesNotMatch(signals, /setInterval|setTimeout/);

  const queue = sourceBetween(script, "async function processIndexedDBStateCopyQueue()", "function publishIndexedDBPersistenceSignal(record)");
  assert.doesNotMatch(queue, /cloneData\(state\)/);
  assert.match(queue, /expectedChecksum: indexedDBPersistBaseChecksum/);
  assert.match(queue, /publishIndexedDBPersistenceSignal\(record\)/);
});

test("V405 reverte memória se a nuvem falhar antes da persistência", () => {
  const cloud = fs.readFileSync("sync-integral-cloud.js", "utf8");
  const apply = sourceBetween(cloud, "async function applyCloudPayloadIntegral", "const DEVICE_SYNC_AUTH_RETRY_INTERVAL_MS");
  assert.match(apply, /const previousState = cloneData\(state\)/);
  assert.match(apply, /let localPersistenceCommitted = false/);
  assert.match(apply, /if \(!localPersistenceCommitted\) replaceState\(previousState\)/);
});

test("V405 mantém fontes publicadas sincronizadas", () => {
  for (const filename of ["script.js", "storage-indexeddb.js", "sync-integral-cloud.js"]) {
    assert.equal(fs.readFileSync(filename, "utf8"), fs.readFileSync(`docs/${filename}`, "utf8"));
  }
});

test("V405 renova somente o cache do runtime preservando a versão pública estável", () => {
  const worker = fs.readFileSync("service-worker.js", "utf8");
  const packageVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
  assert.equal(packageVersion, "20260827-factory-cross-area-integrity-v402");
  assert.match(worker, /const PERSISTENCE_SAFETY_VERSION = "20260830-persistence-safety-v405"/);
  assert.match(worker, /timer-audio-stability-v396-persistence-safety-v405/);
  assert.match(worker, /headers\.set\("x-aldus-persistence-safety", PERSISTENCE_SAFETY_VERSION\)/);
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
});
