const SYNC_TOMBSTONE_SCHEMA_VERSION = 1;
const SYNC_REVISION_FIELDS = new Set(["updatedAt", "modifiedAt", "savedAt", "syncedAt", "_syncUpdatedAt"]);
const SYNC_APPEND_ONLY_ARRAY_FIELDS = new Set(["history", "historico", "events", "logs", "auditTrail"]);

function syncComparableValue(value) {
  if (Array.isArray(value)) return value.map(syncComparableValue);
  if (!value || typeof value !== "object") return value;
  const result = {};
  Object.keys(value).sort().forEach((key) => {
    if (SYNC_REVISION_FIELDS.has(key)) return;
    result[key] = syncComparableValue(value[key]);
  });
  return result;
}

function syncRecordSignature(value) {
  return syncStableSerialize(syncComparableValue(value));
}

function syncRecordRevisionTimestamp(value = {}) {
  const candidates = [value.updatedAt, value.modifiedAt, value.savedAt, value.syncedAt, value._syncUpdatedAt, value.createdAt]
    .map((entry) => Date.parse(entry || ""))
    .filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : 0;
}

function syncEnsureTombstoneStore(targetState = state) {
  if (!targetState.syncTombstones || typeof targetState.syncTombstones !== "object" || Array.isArray(targetState.syncTombstones)) {
    targetState.syncTombstones = { schemaVersion: SYNC_TOMBSTONE_SCHEMA_VERSION, collections: {} };
  }
  targetState.syncTombstones.schemaVersion = SYNC_TOMBSTONE_SCHEMA_VERSION;
  if (!targetState.syncTombstones.collections || typeof targetState.syncTombstones.collections !== "object" || Array.isArray(targetState.syncTombstones.collections)) {
    targetState.syncTombstones.collections = {};
  }
  return targetState.syncTombstones;
}

function syncSnapshotCollections(targetState = state) {
  const snapshot = {};
  SYNC_COLLECTIONS.forEach((collection) => {
    const map = new Map();
    (Array.isArray(targetState?.[collection]) ? targetState[collection] : []).forEach((item) => {
      if (!item || typeof item !== "object") return;
      const key = syncCollectionKey(item, collection);
      map.set(key, { record: syncClone(item), signature: syncRecordSignature(item) });
    });
    snapshot[collection] = map;
  });
  return snapshot;
}

function syncTrackCollectionMutations(previousSnapshot = {}, targetState = state, changedAt = new Date().toISOString()) {
  const store = syncEnsureTombstoneStore(targetState);
  let changed = false;
  SYNC_COLLECTIONS.forEach((collection) => {
    const previous = previousSnapshot?.[collection] instanceof Map ? previousSnapshot[collection] : new Map();
    const current = new Map();
    const list = Array.isArray(targetState?.[collection]) ? targetState[collection] : [];
    list.forEach((item) => {
      if (!item || typeof item !== "object") return;
      current.set(syncCollectionKey(item, collection), item);
    });
    const tombstones = store.collections[collection] ||= {};

    previous.forEach((entry, key) => {
      if (current.has(key)) return;
      tombstones[key] = {
        key,
        collection,
        deletedAt: changedAt,
        deviceId: typeof getDeviceId === "function" ? getDeviceId() : ""
      };
      changed = true;
    });

    current.forEach((item, key) => {
      const before = previous.get(key);
      if (!before) {
        item.updatedAt = changedAt;
        if (tombstones[key]) delete tombstones[key];
        changed = true;
        return;
      }
      if (before.signature !== syncRecordSignature(item)) {
        item.updatedAt = changedAt;
        changed = true;
      }
      const tombstoneTime = Date.parse(tombstones[key]?.deletedAt || "");
      if (Number.isFinite(tombstoneTime) && syncRecordRevisionTimestamp(item) > tombstoneTime) {
        delete tombstones[key];
        changed = true;
      }
    });
  });
  return changed;
}

function syncNormalizeTombstones(value = {}) {
  const normalized = { schemaVersion: SYNC_TOMBSTONE_SCHEMA_VERSION, collections: {} };
  const collections = value?.collections && typeof value.collections === "object" ? value.collections : {};
  SYNC_COLLECTIONS.forEach((collection) => {
    const source = collections[collection] && typeof collections[collection] === "object" ? collections[collection] : {};
    normalized.collections[collection] = {};
    Object.entries(source).forEach(([key, entry]) => {
      const deletedAt = entry?.deletedAt || "";
      if (!Number.isFinite(Date.parse(deletedAt))) return;
      normalized.collections[collection][key] = { ...syncClone(entry), key, collection, deletedAt };
    });
  });
  return normalized;
}

function syncMergeTombstones(localValue = {}, remoteValue = {}) {
  const local = syncNormalizeTombstones(localValue);
  const remote = syncNormalizeTombstones(remoteValue);
  const merged = { schemaVersion: SYNC_TOMBSTONE_SCHEMA_VERSION, collections: {} };
  SYNC_COLLECTIONS.forEach((collection) => {
    const entries = {};
    const add = (entry, key) => {
      if (!entry) return;
      const current = entries[key];
      if (!current || Date.parse(entry.deletedAt) > Date.parse(current.deletedAt)) entries[key] = syncClone(entry);
    };
    Object.entries(local.collections[collection] || {}).forEach(([key, entry]) => add(entry, key));
    Object.entries(remote.collections[collection] || {}).forEach(([key, entry]) => add(entry, key));
    merged.collections[collection] = entries;
  });
  return merged;
}

function syncApplyTombstones(targetState = {}, tombstoneValue = targetState.syncTombstones) {
  const store = syncNormalizeTombstones(tombstoneValue);
  targetState.syncTombstones = store;
  SYNC_COLLECTIONS.forEach((collection) => {
    const tombstones = store.collections[collection] || {};
    targetState[collection] = (Array.isArray(targetState[collection]) ? targetState[collection] : []).filter((item) => {
      if (!item || typeof item !== "object") return true;
      const key = syncCollectionKey(item, collection);
      const tombstone = tombstones[key];
      if (!tombstone) return true;
      const deletedAt = Date.parse(tombstone.deletedAt || "");
      const revisedAt = syncRecordRevisionTimestamp(item);
      if (revisedAt > deletedAt) {
        delete tombstones[key];
        return true;
      }
      return false;
    });
  });
  return targetState;
}

function syncMergeRecordVersioned(localValue = {}, remoteValue = {}, prefer = "remote") {
  if (!localValue || typeof localValue !== "object") return syncClone(remoteValue);
  if (!remoteValue || typeof remoteValue !== "object") return syncClone(localValue);
  const localTime = syncTimestamp(localValue);
  const remoteTime = syncTimestamp(remoteValue);
  const remotePreferred = remoteTime === localTime ? prefer === "remote" : remoteTime > localTime;
  const primary = remotePreferred ? remoteValue : localValue;
  const secondary = remotePreferred ? localValue : remoteValue;
  const result = { ...syncClone(secondary), ...syncClone(primary) };
  const keys = new Set([...Object.keys(localValue), ...Object.keys(remoteValue)]);
  keys.forEach((key) => {
    const left = localValue[key];
    const right = remoteValue[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      if ((localTime || remoteTime) && localTime !== remoteTime && !SYNC_APPEND_ONLY_ARRAY_FIELDS.has(key)) {
        const preferredArray = remotePreferred ? right : left;
        const fallbackArray = remotePreferred ? left : right;
        result[key] = syncClone(Array.isArray(preferredArray) ? preferredArray : (Array.isArray(fallbackArray) ? fallbackArray : []));
      } else {
        result[key] = syncPrimitiveArray(Array.isArray(left) ? left : [], Array.isArray(right) ? right : []);
      }
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object") {
      result[key] = syncMergeRecordVersioned(left, right, remotePreferred ? "remote" : "local");
      return;
    }
    if (SYNC_MAX_NUMERIC_FIELDS.has(key)) {
      const preferredValue = remotePreferred ? right : left;
      const fallbackValue = remotePreferred ? left : right;
      if ((localTime || remoteTime) && localTime !== remoteTime) {
        if (syncValueEmpty(preferredValue) && !syncValueEmpty(fallbackValue)) result[key] = syncClone(fallbackValue);
        else {
          const number = Number(preferredValue);
          result[key] = Number.isFinite(number) ? number : 0;
        }
      } else {
        result[key] = Math.max(Number(left) || 0, Number(right) || 0);
      }
      return;
    }
    const preferredValue = remotePreferred ? right : left;
    const fallbackValue = remotePreferred ? left : right;
    result[key] = syncValueEmpty(preferredValue) && !syncValueEmpty(fallbackValue) ? syncClone(fallbackValue) : syncClone(preferredValue);
  });
  return result;
}

syncMergeRecord = syncMergeRecordVersioned;

let syncDeletionSnapshot = null;
let syncDeletionTrackingReady = false;

function syncDeletionTrackingSuppressed() {
  return Boolean(
    globalThis.__metasSyncTombstoneApplyingV39 ||
    (typeof isApplyingRemote !== "undefined" && isApplyingRemote) ||
    (typeof isSyncing !== "undefined" && isSyncing) ||
    (typeof sameDeviceStateSyncApplying !== "undefined" && sameDeviceStateSyncApplying)
  );
}

function syncRefreshDeletionSnapshot() {
  if (typeof state === "undefined" || !state) return;
  syncEnsureTombstoneStore(state);
  syncDeletionSnapshot = syncSnapshotCollections(state);
}

function installSyncDeletionTracking() {
  if (globalThis.__metasSyncDeletionTrackingV39 || typeof saveData !== "function") return;
  globalThis.__metasSyncDeletionTrackingV39 = true;
  const originalSaveData = saveData;
  saveData = function saveDataWithSyncDeletionTracking(...args) {
    if (syncDeletionTrackingReady && syncDeletionSnapshot && !syncDeletionTrackingSuppressed()) {
      syncTrackCollectionMutations(syncDeletionSnapshot, state);
    }
    const result = originalSaveData.apply(this, args);
    syncRefreshDeletionSnapshot();
    return result;
  };
  const arm = () => {
    syncRefreshDeletionSnapshot();
    syncDeletionTrackingReady = true;
  };
  if (typeof window !== "undefined") window.addEventListener("load", () => setTimeout(arm, 400), { once: true });
  setTimeout(arm, 2500);
}

const TIMER_MATERIAL_LINK_FIX_VERSION = "20260717-material-cronometro-v40";
function installTimerMaterialLinkFixAsset() {
  if (typeof document === "undefined" || globalThis.__metasTimerMaterialLinkFixAssetV40) return;
  globalThis.__metasTimerMaterialLinkFixAssetV40 = true;
  const load = () => {
    if (document.querySelector('script[data-timer-material-link-fix="v40"]')) return;
    const script = document.createElement("script");
    script.src = `timer-material-link-fix.js?v=${TIMER_MATERIAL_LINK_FIX_VERSION}`;
    script.dataset.timerMaterialLinkFix = "v40";
    script.addEventListener("load", () => {
      const version = document.querySelector(".app-version");
      if (version) version.textContent = `Versão: ${TIMER_MATERIAL_LINK_FIX_VERSION}`;
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else setTimeout(load, 0);
}

installSyncDeletionTracking();
installTimerMaterialLinkFixAsset();
