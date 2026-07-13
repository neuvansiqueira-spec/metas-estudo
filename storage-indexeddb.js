const STUDY_DB_NAME = "metas-estudo-db";
const STUDY_DB_VERSION = 1;
const STUDY_DB_APP_STATE_STORE = "appState";
const STUDY_DB_METADATA_STORE = "storageMetadata";
const STUDY_DB_CURRENT_ID = "current";
const STUDY_DB_MIGRATION_STATUS_ID = "migration-status";
const STUDY_DB_SCHEMA_VERSION = 1;

function indexedDBAvailable() {
  return typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";
}

function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
}

function checksumForState(state) {
  const text = stableSerialize(state || {});
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
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

async function saveStateToIndexedDB(state) {
  const data = JSON.parse(JSON.stringify(state || {}));
  const existing = await loadStateFromIndexedDB().catch(() => null);
  if (validateIndexedDBState(existing) && indexedDBStateHasUserData(existing.data) && !indexedDBStateHasUserData(data)) throw new Error("Proteção ativada: estado vazio não substitui IndexedDB válido.");
  const record = { id: STUDY_DB_CURRENT_ID, schemaVersion: STUDY_DB_SCHEMA_VERSION, savedAt: new Date().toISOString(), checksum: checksumForState(data), data };
  return runStoreOperation(STUDY_DB_APP_STATE_STORE, "readwrite", (store) => store.put(record)).then(() => record);
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
  return record.checksum === checksumForState(record.data);
}

function statesMatchIndexedDBRecord(state, record) {
  return validateIndexedDBState(record) && record.checksum === checksumForState(state || {});
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

if (typeof window !== "undefined") Object.assign(window, { openStudyDatabase, saveStateToIndexedDB, loadStateFromIndexedDB, getIndexedDBMetadata, validateIndexedDBState, estimateSerializedStateSize, migrateLocalStorageStateToIndexedDB, statesMatchIndexedDBRecord, indexedDBStateHasUserData });
if (typeof module !== "undefined") module.exports = { openStudyDatabase, saveStateToIndexedDB, loadStateFromIndexedDB, getIndexedDBMetadata, validateIndexedDBState, estimateSerializedStateSize, migrateLocalStorageStateToIndexedDB, checksumForState, statesMatchIndexedDBRecord, indexedDBStateHasUserData };
