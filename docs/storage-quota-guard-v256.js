(() => {
  "use strict";

  const VERSION = "20260805-indexeddb-quota-guard-v256";
  const MAIN_KEY = "metasConcursoData";
  const META_KEY = "aldusIndexedDBOnlyStateV256";
  const DB_NAME = "metas-estudo-db";
  const DB_VERSION = 1;
  const STORE_NAME = "appState";
  const CURRENT_ID = "current";
  const SOFT_LIMIT = 2_000_000;

  if (globalThis.__ALDUS_STORAGE_QUOTA_GUARD_V256__) return;

  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  let pendingSerialized = "";
  let pendingTimer = 0;
  let persistInFlight = false;

  function checksumForText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-json-v2-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function isQuotaError(error) {
    return Boolean(error && (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    ));
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("storageMetadata")) {
          database.createObjectStore("storageMetadata", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB."));
      request.onblocked = () => reject(new Error("IndexedDB bloqueado por outra aba."));
    });
  }

  async function persistSerialized(serialized, reason = "quota") {
    if (!serialized) return false;
    const data = JSON.parse(serialized);
    const record = {
      id: CURRENT_ID,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      checksum: checksumForText(serialized),
      serializedSize: serialized.length,
      data
    };
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao gravar estado no IndexedDB."));
      transaction.onabort = () => reject(transaction.error || new Error("Gravação IndexedDB abortada."));
    });
    database.close();

    try {
      nativeRemoveItem.call(localStorage, MAIN_KEY);
      nativeSetItem.call(localStorage, META_KEY, JSON.stringify({
        version: VERSION,
        mode: "indexeddb-only",
        reason,
        savedAt: record.savedAt,
        checksum: record.checksum,
        serializedSize: record.serializedSize
      }));
    } catch {}
    globalThis.dispatchEvent(new CustomEvent("aldus:indexeddb-state-saved", { detail: { version: VERSION, reason } }));
    return true;
  }

  function schedulePersist(serialized, reason) {
    pendingSerialized = serialized;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      if (persistInFlight || !pendingSerialized) return;
      const current = pendingSerialized;
      pendingSerialized = "";
      persistInFlight = true;
      try {
        await persistSerialized(current, reason);
      } catch (error) {
        console.error("[Aldus V256] Falha ao salvar estado grande no IndexedDB.", error);
        try {
          nativeSetItem.call(localStorage, META_KEY, JSON.stringify({
            version: VERSION,
            mode: "indexeddb-only-error",
            failedAt: new Date().toISOString(),
            message: String(error?.message || error)
          }));
        } catch {}
      } finally {
        persistInFlight = false;
        if (pendingSerialized) schedulePersist(pendingSerialized, "queued");
      }
    }, 120);
  }

  Storage.prototype.setItem = function guardedSetItem(key, value) {
    if (this === localStorage && key === MAIN_KEY && typeof value === "string") {
      if (value.length > SOFT_LIMIT) {
        schedulePersist(value, "oversized-localstorage-state");
        return undefined;
      }
      try {
        return nativeSetItem.call(this, key, value);
      } catch (error) {
        if (!isQuotaError(error)) throw error;
        schedulePersist(value, "localstorage-quota-exceeded");
        return undefined;
      }
    }
    return nativeSetItem.call(this, key, value);
  };

  globalThis.__ALDUS_STORAGE_QUOTA_GUARD_V256__ = Object.freeze({
    version: VERSION,
    persistSerialized,
    schedulePersist,
    isQuotaError,
    mode: "indexeddb-only-for-large-state"
  });
})();
