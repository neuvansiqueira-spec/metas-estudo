(() => {
  "use strict";

  const VERSION = "20260816-sync-save-performance-v348";

  function install() {
    if (globalThis.__aldusSyncSavePerformanceV348) return true;

    const required = [
      typeof syncSnapshotCollections === "function",
      typeof syncTrackCollectionMutations === "function",
      typeof syncRefreshDeletionSnapshot === "function",
      typeof syncEnsureTombstoneStore === "function",
      typeof syncRecordSignature === "function",
      typeof syncRecordRevisionTimestamp === "function",
      typeof syncCollectionKey === "function",
      typeof syncDeletionSnapshot !== "undefined",
      typeof SYNC_COLLECTIONS !== "undefined" && Array.isArray(SYNC_COLLECTIONS),
      typeof state !== "undefined" && state
    ];
    if (!required.every(Boolean)) return false;

    const POST_SAVE_REFRESH_COLLECTIONS = new Set(["dailyGoals"]);
    let pendingSnapshot = null;
    let pendingShapes = null;
    let pendingState = null;

    function snapshotCollectionsFast(targetState = state, collections = SYNC_COLLECTIONS) {
      const snapshot = {};
      collections.forEach((collection) => {
        const map = new Map();
        (Array.isArray(targetState?.[collection]) ? targetState[collection] : []).forEach((item) => {
          if (!item || typeof item !== "object") return;
          const key = syncCollectionKey(item, collection);
          map.set(key, { signature: syncRecordSignature(item) });
        });
        snapshot[collection] = map;
      });
      return snapshot;
    }

    function collectionShape(targetState, collection) {
      const list = Array.isArray(targetState?.[collection]) ? targetState[collection] : null;
      return { list, length: list?.length || 0, items: list ? list.slice() : [] };
    }

    function collectionEquivalent(before, current) {
      if (!before) return false;
      if (before.list === current) return true;
      if (!current || before.length !== current.length) return false;
      for (let index = 0; index < before.items.length; index += 1) {
        if (before.items[index] !== current[index]) return false;
      }
      return true;
    }

    function trackCollectionMutationsFast(
      previousSnapshot = {},
      targetState = state,
      changedAt = new Date().toISOString(),
      nextSnapshot = null
    ) {
      const store = syncEnsureTombstoneStore(targetState);
      const next = nextSnapshot || {};
      const shapes = nextSnapshot ? null : new Map();
      let changed = false;

      SYNC_COLLECTIONS.forEach((collection) => {
        const previous = previousSnapshot?.[collection] instanceof Map ? previousSnapshot[collection] : new Map();
        const current = new Map();
        const nextMap = new Map();
        const list = Array.isArray(targetState?.[collection]) ? targetState[collection] : [];
        if (shapes) shapes.set(collection, collectionShape(targetState, collection));

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
          const signature = syncRecordSignature(item);
          if (!before) {
            item.updatedAt = changedAt;
            if (tombstones[key]) delete tombstones[key];
            changed = true;
          } else if (before.signature !== signature) {
            item.updatedAt = changedAt;
            changed = true;
          }

          const tombstoneTime = Date.parse(tombstones[key]?.deletedAt || "");
          if (Number.isFinite(tombstoneTime) && syncRecordRevisionTimestamp(item) > tombstoneTime) {
            delete tombstones[key];
            changed = true;
          }
          nextMap.set(key, { signature });
        });
        next[collection] = nextMap;
      });

      if (!nextSnapshot) {
        pendingSnapshot = next;
        pendingShapes = shapes;
        pendingState = targetState;
      }
      return changed;
    }

    function refreshDeletionSnapshotFast() {
      if (typeof state === "undefined" || !state) return;
      syncEnsureTombstoneStore(state);

      if (pendingSnapshot && pendingState === state && pendingShapes) {
        const refreshCollections = new Set(POST_SAVE_REFRESH_COLLECTIONS);
        SYNC_COLLECTIONS.forEach((collection) => {
          const before = pendingShapes.get(collection);
          const current = Array.isArray(state?.[collection]) ? state[collection] : null;
          if (!collectionEquivalent(before, current)) refreshCollections.add(collection);
        });
        Object.assign(pendingSnapshot, snapshotCollectionsFast(state, [...refreshCollections]));
        syncDeletionSnapshot = pendingSnapshot;
      } else {
        syncDeletionSnapshot = snapshotCollectionsFast(state);
      }

      pendingSnapshot = null;
      pendingShapes = null;
      pendingState = null;
    }

    syncSnapshotCollections = snapshotCollectionsFast;
    syncTrackCollectionMutations = trackCollectionMutationsFast;
    syncRefreshDeletionSnapshot = refreshDeletionSnapshotFast;

    globalThis.__aldusSyncSavePerformanceV348 = Object.freeze({
      version: VERSION,
      appliedAt: new Date().toISOString(),
      postSaveRefreshCollections: [...POST_SAVE_REFRESH_COLLECTIONS]
    });
    globalThis.__aldusSyncSavePerformanceV348Pending = false;
    return true;
  }

  if (install()) return;
  if (globalThis.__aldusSyncSavePerformanceV348Pending) return;
  globalThis.__aldusSyncSavePerformanceV348Pending = true;

  const retry = () => install();
  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", retry, { once: true });
    [0, 250, 1000, 3000].forEach((delay) => window.setTimeout(retry, delay));
  }
})();
