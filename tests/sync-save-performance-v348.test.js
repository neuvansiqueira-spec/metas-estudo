const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const hotfix = fs.readFileSync(path.join(__dirname, '..', 'sync-save-performance-v348.js'), 'utf8');

function stableSerialize(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).sort().join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const base = String.raw`
const SYNC_COLLECTIONS = ['subjects', 'studies', 'dailyGoals'];
const SYNC_REVISION_FIELDS = new Set(['updatedAt', 'modifiedAt', 'savedAt', 'syncedAt', '_syncUpdatedAt']);
function syncComparableValue(value) {
  if (Array.isArray(value)) return value.map(syncComparableValue);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  Object.keys(value).sort().forEach((key) => {
    if (SYNC_REVISION_FIELDS.has(key)) return;
    result[key] = syncComparableValue(value[key]);
  });
  return result;
}
function syncRecordSignature(value) { return syncStableSerialize(syncComparableValue(value)); }
function syncRecordRevisionTimestamp(value = {}) {
  const candidates = [value.updatedAt, value.modifiedAt, value.savedAt, value.syncedAt, value._syncUpdatedAt, value.createdAt]
    .map((entry) => Date.parse(entry || '')).filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : 0;
}
function syncEnsureTombstoneStore(targetState = state) {
  if (!targetState.syncTombstones || typeof targetState.syncTombstones !== 'object' || Array.isArray(targetState.syncTombstones)) {
    targetState.syncTombstones = { schemaVersion: 1, collections: {} };
  }
  targetState.syncTombstones.collections ||= {};
  return targetState.syncTombstones;
}
function syncSnapshotCollections(targetState = state) {
  const snapshot = {};
  SYNC_COLLECTIONS.forEach((collection) => {
    const map = new Map();
    (Array.isArray(targetState?.[collection]) ? targetState[collection] : []).forEach((item) => {
      if (!item || typeof item !== 'object') return;
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
    list.forEach((item) => { if (item && typeof item === 'object') current.set(syncCollectionKey(item, collection), item); });
    const tombstones = store.collections[collection] ||= {};
    previous.forEach((entry, key) => {
      if (current.has(key)) return;
      tombstones[key] = { key, collection, deletedAt: changedAt, deviceId: getDeviceId() };
      changed = true;
    });
    current.forEach((item, key) => {
      const before = previous.get(key);
      if (!before) { item.updatedAt = changedAt; if (tombstones[key]) delete tombstones[key]; changed = true; return; }
      if (before.signature !== syncRecordSignature(item)) { item.updatedAt = changedAt; changed = true; }
      const tombstoneTime = Date.parse(tombstones[key]?.deletedAt || '');
      if (Number.isFinite(tombstoneTime) && syncRecordRevisionTimestamp(item) > tombstoneTime) { delete tombstones[key]; changed = true; }
    });
  });
  return changed;
}
let syncDeletionSnapshot = null;
let syncDeletionTrackingReady = false;
function syncDeletionTrackingSuppressed() { return false; }
function syncRefreshDeletionSnapshot() {
  syncEnsureTombstoneStore(state);
  syncDeletionSnapshot = syncSnapshotCollections(state);
}
function installSyncDeletionTracking() {
  const originalSaveData = saveData;
  saveData = function saveDataWithSyncDeletionTracking(...args) {
    if (syncDeletionTrackingReady && syncDeletionSnapshot && !syncDeletionTrackingSuppressed()) {
      syncTrackCollectionMutations(syncDeletionSnapshot, state);
    }
    const result = originalSaveData.apply(this, args);
    syncRefreshDeletionSnapshot();
    return result;
  };
  syncRefreshDeletionSnapshot();
  syncDeletionTrackingReady = true;
}
installSyncDeletionTracking();
`;

function harness(initialState, mutateInsideSave) {
  let signatureCalls = 0;
  let cloneCalls = 0;
  const context = {
    state: structuredClone(initialState),
    syncStableSerialize(value) { signatureCalls += 1; return stableSerialize(value); },
    syncCollectionKey(item, collection) { return `${collection}:id:${item.id}`; },
    syncClone(value) { cloneCalls += 1; return structuredClone(value); },
    getDeviceId() { return 'device-test'; },
    saveData(options) { if (mutateInsideSave) mutateInsideSave(context.state, options); return true; },
    structuredClone, console, Date, Map, Set, Object, Array, Number, String, JSON,
    globalThis: null
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(base, context);
  vm.runInContext(hotfix, context);
  return {
    context,
    counts: () => ({ signatureCalls, cloneCalls }),
    reset: () => { signatureCalls = 0; cloneCalls = 0; }
  };
}

test('hotfix instala sobre o rastreamento existente', () => {
  const { context } = harness({ subjects: [], studies: [], dailyGoals: [] });
  assert.equal(context.__aldusSyncSavePerformanceV348.version, '20260816-sync-save-performance-v348');
});

test('salvamento elimina clones e segunda assinatura integral', () => {
  const records = Array.from({ length: 2000 }, (_, i) => ({ id: `s${i}`, name: `D${i}`, nested: { a: i, b: [1, 2, 3] } }));
  const { context, counts, reset } = harness({ subjects: records, studies: [], dailyGoals: [] });
  reset();
  context.state.subjects[100].name = 'Alterada';
  context.saveData({ skipDerivedRefresh: true });
  assert.equal(counts().cloneCalls, 0);
  assert.equal(counts().signatureCalls, records.length);
});

test('troca no-op do array subjects não força nova varredura', () => {
  const records = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, name: `D${i}` }));
  const { context, counts, reset } = harness(
    { subjects: records, studies: [], dailyGoals: [] },
    (state) => { state.subjects = state.subjects.filter(() => true); }
  );
  reset();
  context.saveData({ skipDerivedRefresh: true });
  assert.equal(counts().signatureCalls, records.length);
});

test('remoção feita antes do save continua gerando tombstone', () => {
  const records = [{ id: 's1', name: 'Penal' }, { id: 's2', name: 'Civil' }];
  const { context } = harness({ subjects: records, studies: [], dailyGoals: [] });
  context.state.subjects = context.state.subjects.filter((item) => item.id !== 's2');
  context.saveData({ skipDerivedRefresh: true });
  assert.ok(context.state.syncTombstones.collections.subjects['subjects:id:s2']);
});

test('remoção interna ao save força refresh estrutural do snapshot', () => {
  const records = [{ id: 's1', name: 'Penal' }, { id: 's2', name: 'Civil' }];
  const { context } = harness(
    { subjects: records, studies: [], dailyGoals: [] },
    (state) => { state.subjects = state.subjects.filter((item) => item.id !== 's2'); }
  );
  context.saveData({ skipDerivedRefresh: true });
  const size = vm.runInContext('syncDeletionSnapshot.subjects.size', context);
  assert.equal(size, 1);
});

test('dailyGoals é reassinado depois da normalização em persistência', () => {
  const { context, counts, reset } = harness(
    { subjects: [{ id: 's1', name: 'Penal' }], studies: [], dailyGoals: [{ id: 'g1', minutes: 10 }] },
    (state) => { state.dailyGoals[0].normalized = true; }
  );
  reset();
  context.saveData({ skipDerivedRefresh: true });
  assert.equal(counts().signatureCalls, 3);
});
