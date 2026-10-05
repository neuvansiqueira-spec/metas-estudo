const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const db = require('../storage-indexeddb.js');

// Requests execute in transaction order; another transaction writes only after
// commit. Inject corruption into readback to exercise the actual abort path.
function storageHarness({ corrupt = false, afterCommit } = {}) {
  let stored = null;
  const operations = [];
  const context = { console, Date, structuredClone, setImmediate, Blob,
    indexedDB: { open() {
      const request = {};
      setImmediate(() => {
        request.result = { close() {}, transaction() {
          const before = structuredClone(stored);
          let pending = 0, aborted = false, completed = false;
          const tx = { abort() { aborted = true; stored = before; setImmediate(() => tx.onabort()); },
            objectStore() { return {
              get() {
                operations.push('get');
                pending++;
                const result = {};
                setImmediate(() => {
                  if (aborted) return;
                  result.result = structuredClone(stored);
                  if (corrupt && operations.includes('put') && result.result) result.result.data.dailyGoals.push({ id: 'corrupt' });
                  result.onsuccess?.();
                  pending--;
                  setImmediate(() => {
                    if (!pending && !aborted && !completed) { completed = true; tx.oncomplete(); afterCommit?.(() => stored, value => { stored = value; }); }
                  });
                });
                return result;
              },
              put(value) { operations.push('put'); stored = structuredClone(value); return {}; }
            }; }
          };
          return tx;
        } };
        request.onsuccess();
      });
      return request;
    } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('storage-indexeddb.js', 'utf8'), context);
  return { context, operations, stored: () => stored };
}

test('V659 valida a cópia persistida antes de liberar outra gravação', async () => {
  const h = storageHarness({ afterCommit(get, set) {
    const next = get();
    next.data.dailyGoals.push({ id: 'outra-aba' });
    next.checksum = db.checksumForState(next.data);
    set(next);
  } });
  const saved = await h.context.saveStateToIndexedDB({ dailyGoals: [{ id: 'local' }, { id: 'nuvem' }] }, { verify: true });
  assert.deepEqual(h.operations, ['get', 'put', 'get']);
  assert.equal(db.validateIndexedDBState(saved), true);
  assert.equal(db.validateIndexedDBState(h.stored()), true);
  assert.notEqual(saved.checksum, h.stored().checksum);
  assert.deepEqual(Array.from(saved.data.dailyGoals, g => g.id), ['local', 'nuvem']);
});

test('V659 rejeita e aborta uma cópia realmente inválida', async () => {
  const h = storageHarness({ corrupt: true });
  await assert.rejects(h.context.saveStateToIndexedDB({ dailyGoals: [{ id: 'local' }] }, { verify: true }), /validação da gravação/);
  assert.equal(h.stored(), null);
});

function cloudHarness({ fail = false } = {}) {
  const local = { dailyGoals: [{ id: 'local' }], settings: {} };
  let saved;
  const c = { console, Date, state: structuredClone(local), isApplyingRemote: false,
    indexedDBPersistBaseChecksum: 'base', indexedDBStatus: {}, cloneData: structuredClone,
    validateCloudPayload() {}, syncCreateSafetyBackup() {},
    mergeSyncStates: (a, b) => ({ ...a, dailyGoals: [...a.dailyGoals, ...b.dailyGoals] }),
    getDeviceId: () => 'pc', getDeviceName: () => 'PC', syncStateFingerprint: db.checksumForState,
    replaceState(v) { c.state = structuredClone(v); },
    async saveStateToIndexedDB(v, options) {
      assert.equal(options.verify, true);
      if (fail) throw new Error('transação abortada');
      saved = { data: structuredClone(v), checksum: db.checksumForState(v), savedAt: 'now' };
      return saved;
    },
    loadStateFromIndexedDB() { throw new Error('Outra revisão não deve validar esta gravação'); },
    publishIndexedDBPersistenceSignal() {}, estimateSerializedStateSize: () => 0,
    writeCloudStateTransaction() {}, uploadSyncPayloadIntegral: async () => {},
    writeSyncMeta() {}, suppressAutoChecksAfterSync() {}, render() {}, showView() {}, renderSyncStatus() {}, markPendingSync() {},
    cloudSyncError(kind, message, error) { error.cloudSyncKind = kind; return error; }
  };
  vm.createContext(c);
  const source = fs.readFileSync('sync-integral-cloud.js', 'utf8');
  vm.runInContext(source.slice(source.indexOf('async function applyCloudPayloadIntegral('), source.indexOf('const DEVICE_SYNC_AUTH_RETRY_INTERVAL_MS')), c);
  return { c, saved: () => saved };
}

test('V659 nuvem preserva metas locais e remotas após commit validado', async () => {
  const { c, saved } = cloudHarness();
  await c.applyCloudPayloadIntegral({ state: { dailyGoals: [{ id: 'nuvem' }] } });
  assert.deepEqual(c.state.dailyGoals.map(g => g.id), ['local', 'nuvem']);
  assert.equal(c.indexedDBPersistBaseChecksum, saved().checksum);
  assert.equal(c.isApplyingRemote, false);
});

test('V659 nuvem continua revertendo memória se a transação abortar', async () => {
  const { c } = cloudHarness({ fail: true });
  await assert.rejects(c.applyCloudPayloadIntegral({ state: { dailyGoals: [{ id: 'nuvem' }] } }), /transação abortada/);
  assert.deepEqual(c.state.dailyGoals.map(g => g.id), ['local']);
  assert.equal(c.isApplyingRemote, false);
});

test('V659 não baixa o próprio envio e continua detectando mudança externa', async () => {
  let revision = 'inicial', pulls = 0, checks = 0;
  const c = { console, Date, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0,
    readSyncMeta: () => ({ connected: true, pendingSync: false, localDirty: false }),
    hasValidGoogleDriveAccessToken: () => true, canRunAutoSyncChecks: () => true,
    findSyncFile: async () => ({ id: 'file', modifiedTime: revision }),
    pullSyncPayload: async () => { pulls++; return { state: {} }; },
    updateSyncFile: async () => { revision = 'enviado'; return { modifiedTime: revision }; },
    createSyncFile: async () => ({ modifiedTime: revision }),
    checkCloudForNewerVersionIntegral: async () => { checks++; await c.pullSyncPayload(); if (checks === 1) await c.updateSyncFile(); }
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync('sync-leve-conferencia-v649.js', 'utf8'), c);
  await c.checkCloudForNewerVersionIntegral();
  await c.checkCloudForNewerVersionIntegral();
  assert.equal(pulls, 1);
  revision = 'alteracao-tablet';
  await c.checkCloudForNewerVersionIntegral();
  assert.equal(pulls, 2);
});
