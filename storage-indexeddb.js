const STUDY_DB_NAME = "metas-estudo-db";
const STUDY_DB_VERSION = 1;
const STUDY_DB_APP_STATE_STORE = "appState";
const STUDY_DB_METADATA_STORE = "storageMetadata";
const STUDY_DB_CURRENT_ID = "current";
const STUDY_DB_MIGRATION_STATUS_ID = "migration-status";
const STUDY_DB_SCHEMA_VERSION = 1;
const STUDY_DB_CHECKSUM_JSON_V2_PREFIX = "fnv1a-json-v2";

function indexedDBAvailable() {
  return typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";
}

function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
}

function checksumForText(text, prefix = "fnv1a") {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
}

function legacyChecksumForState(state) {
  return checksumForText(stableSerialize(state || {}));
}

function checksumForSerializedState(serializedState) {
  return checksumForText(serializedState, STUDY_DB_CHECKSUM_JSON_V2_PREFIX);
}

function checksumForState(state) {
  return checksumForSerializedState(JSON.stringify(state || {}));
}

function checksumMatchesState(checksum, state) {
  if (String(checksum || "").startsWith(`${STUDY_DB_CHECKSUM_JSON_V2_PREFIX}-`)) {
    return checksum === checksumForState(state);
  }
  return checksum === legacyChecksumForState(state);
}

function estimateSerializedStateSize(state) {
  const text = JSON.stringify(state || {});
  if (typeof Blob !== "undefined") return new Blob([text]).size;
  return text.length;
}

function openStudyDatabase() {
  return new Promise((resolve, reject) => {
    if (!indexedDBAvailable()) {
      reject(new Error("IndexedDB indisponível neste navegador."));
      return;
    }
    const request = indexedDB.open(STUDY_DB_NAME, STUDY_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STUDY_DB_APP_STATE_STORE)) database.createObjectStore(STUDY_DB_APP_STATE_STORE, { keyPath: "id" });
      if (!database.objectStoreNames.contains(STUDY_DB_METADATA_STORE)) database.createObjectStore(STUDY_DB_METADATA_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB."));
    request.onblocked = () => reject(new Error("A abertura do IndexedDB foi bloqueada por outra aba."));
  });
}

function runStoreOperation(storeName, mode, operation) {
  return openStudyDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request;
    transaction.oncomplete = () => { database.close(); resolve(request?.result); };
    transaction.onerror = () => { database.close(); reject(transaction.error || request?.error || new Error("Falha na transação IndexedDB.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error || request?.error || new Error("Transação IndexedDB abortada.")); };
    request = operation(store);
  }));
}

function indexedDBStateHasUserData(state = {}) {
  return ["subjects", "studies", "syllabusItems", "dailyGoals", "questionLogs", "materials", "questionBank", "simulados", "smartReviews", "factoryAgenda", "factoryItems"].some((key) => Array.isArray(state?.[key]) && state[key].length);
}

function resolveIndexedDBWriteCandidate(source, existing, options = {}) {
  const current = validateIndexedDBState(existing) ? existing : null;
  const expectedChecksum = String(options.expectedChecksum || "");
  const concurrentMerge = Boolean(current && expectedChecksum && current.checksum !== expectedChecksum);
  let data = source || {};

  if (concurrentMerge) {
    if (typeof options.mergeConcurrentState !== "function") {
      throw new Error("Conflito de gravação detectado: o IndexedDB foi atualizado por outra aba.");
    }
    data = options.mergeConcurrentState(data, current.data);
  }

  if (!indexedDBStateHasUserData(data) && current && indexedDBStateHasUserData(current.data)) {
    throw new Error("Proteção ativada: estado vazio não substitui IndexedDB válido.");
  }

  return { data, concurrentMerge, previousChecksum: current?.checksum || "" };
}

function saveIndexedDBStateAtomically(source, options = {}) {
  return openStudyDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STUDY_DB_APP_STATE_STORE, "readwrite");
    const store = transaction.objectStore(STUDY_DB_APP_STATE_STORE);
    const request = store.get(STUDY_DB_CURRENT_ID);
    let record = null;
    let failure = null;

    request.onsuccess = () => {
      try {
        const resolved = resolveIndexedDBWriteCandidate(source, request.result || null, options);
        const serializedState = JSON.stringify(resolved.data);
        record = {
          id: STUDY_DB_CURRENT_ID,
          schemaVersion: STUDY_DB_SCHEMA_VERSION,
          savedAt: new Date().toISOString(),
          checksum: checksumForSerializedState(serializedState),
          serializedSize: serializedState.length,
          data: resolved.data,
          concurrentMerge: resolved.concurrentMerge,
          previousChecksum: resolved.previousChecksum
        };
        store.put(record);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    request.onerror = () => {
      failure = request.error || new Error("Falha ao consultar o estado atual do IndexedDB.");
    };
    transaction.oncomplete = () => { database.close(); resolve(record); };
    transaction.onerror = () => { database.close(); reject(failure || transaction.error || new Error("Falha na transação IndexedDB.")); };
    transaction.onabort = () => { database.close(); reject(failure || transaction.error || new Error("Transação IndexedDB abortada.")); };
  }));
}

async function saveStateToIndexedDB(state, options = {}) {
  const source = state || {};
  if (options.directSnapshot || options.detachedSnapshot) {
    return saveIndexedDBStateAtomically(source, options);
  }
  const data = typeof structuredClone === "function" ? structuredClone(source) : JSON.parse(JSON.stringify(source));
  return saveIndexedDBStateAtomically(data, options);
}

function loadStateFromIndexedDB() {
  return runStoreOperation(STUDY_DB_APP_STATE_STORE, "readonly", (store) => store.get(STUDY_DB_CURRENT_ID)).then((record) => record || null);
}

function getIndexedDBMetadata() {
  return runStoreOperation(STUDY_DB_METADATA_STORE, "readonly", (store) => store.get(STUDY_DB_MIGRATION_STATUS_ID)).then((record) => record || null);
}

function saveIndexedDBMetadata(metadata) {
  return runStoreOperation(STUDY_DB_METADATA_STORE, "readwrite", (store) => store.put({ id: STUDY_DB_MIGRATION_STATUS_ID, ...metadata }));
}

function validateIndexedDBState(record) {
  if (!record || record.id !== STUDY_DB_CURRENT_ID || record.schemaVersion !== STUDY_DB_SCHEMA_VERSION || !record.data || typeof record.data !== "object" || Array.isArray(record.data)) return false;
  const arrayKeys = ["subjects", "studies", "syllabusItems", "dailyGoals", "questionLogs", "smartReviews", "simulados", "materials", "questionBank", "questionBankSessions", "questionErrorNotebook"];
  if (!arrayKeys.every((key) => record.data[key] === undefined || Array.isArray(record.data[key]))) return false;
  return checksumMatchesState(record.checksum, record.data);
}

function statesMatchIndexedDBRecord(state, record, expectedChecksum = "") {
  if (!validateIndexedDBState(record)) return false;
  const stateChecksum = expectedChecksum || (
    String(record.checksum || "").startsWith(`${STUDY_DB_CHECKSUM_JSON_V2_PREFIX}-`)
      ? checksumForState(state || {})
      : legacyChecksumForState(state || {})
  );
  return record.checksum === stateChecksum;
}

async function migrateLocalStorageStateToIndexedDB(state) {
  const existing = await loadStateFromIndexedDB().catch(() => null);
  if (statesMatchIndexedDBRecord(state, existing)) return { completed: true, reused: true, record: existing };
  const saved = await saveStateToIndexedDB(state);
  const reloaded = await loadStateFromIndexedDB();
  if (!statesMatchIndexedDBRecord(state, reloaded)) throw new Error("A validação da cópia no IndexedDB falhou.");
  const metadata = { id: STUDY_DB_MIGRATION_STATUS_ID, completed: true, migratedAt: new Date().toISOString(), source: "localStorage", verified: true, checksum: saved.checksum, savedAt: saved.savedAt };
  await saveIndexedDBMetadata(metadata);
  return { completed: true, reused: false, record: reloaded, metadata };
}

if (typeof window !== "undefined") Object.assign(window, { openStudyDatabase, saveStateToIndexedDB, loadStateFromIndexedDB, getIndexedDBMetadata, validateIndexedDBState, estimateSerializedStateSize, migrateLocalStorageStateToIndexedDB, statesMatchIndexedDBRecord, indexedDBStateHasUserData, checksumForState });
if (typeof module !== "undefined") module.exports = { openStudyDatabase, saveStateToIndexedDB, loadStateFromIndexedDB, getIndexedDBMetadata, validateIndexedDBState, estimateSerializedStateSize, migrateLocalStorageStateToIndexedDB, checksumForState, legacyChecksumForState, checksumMatchesState, statesMatchIndexedDBRecord, indexedDBStateHasUserData, resolveIndexedDBWriteCandidate };
