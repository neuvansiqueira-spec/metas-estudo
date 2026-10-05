const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const read = name => fs.readFileSync(name, 'utf8');
const previous = name => execFileSync('git', ['show', `644f218:${name}`], { encoding: 'utf8' });
function core(source) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.api = { syncStableSerialize, syncStateFingerprint };', context);
  return context.api;
}
const before = core(previous('sync-integral-core.js'));
const after = core(read('sync-integral-core.js'));

test('V658 preserves serialization and fingerprint including aliases, sparse arrays and edits', () => {
  const shared = [{ id: 'f1', modules: { text: 'ação \ud83d\ude00', empty: null } }];
  const value = { factoryItems: shared, factoryAgenda: shared, array: [3, undefined, , 1, null], special: [NaN, Infinity, -0], settings: { a: true } };
  const check = () => {
    assert.equal(after.syncStableSerialize(value), before.syncStableSerialize(value));
    assert.equal(after.syncStateFingerprint(value), before.syncStateFingerprint(value));
  };
  check();
  shared[0].modules.text = 'edited';
  check();
  for (let index = 0; index < 100; index++) {
    const nested = { number: index, list: [index % 3, `s${index}`, false] };
    const sample = { z: nested, a: nested, records: [nested, { ...nested, number: -index }] };
    assert.equal(after.syncStateFingerprint(sample), before.syncStateFingerprint(sample));
  }
});

function uploadHarness(source, hasFile) {
  const fixed = '2026-10-05T22:00:00.000Z';
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [fixed])); } }
  const calls = { fingerprints: 0, repairs: 0, uploaded: null, replaced: null };
  const context = {
    Date: FixedDate, isSyncing: false, state: { dailyGoals: [{ id: 'local', actualMinutes: 5 }], settings: { minutes: 90 } },
    cloneData: structuredClone,
    repairInvalidReinforcementGoalsV157(value) { calls.repairs++; value.repaired = true; },
    syncStateFingerprint(value) { calls.fingerprints++; return before.syncStateFingerprint(value); },
    findSyncFile: async () => hasFile ? { id: 'file', modifiedTime: fixed } : null,
    downloadSyncFile: async () => ({ deviceId: 'phone', state: { dailyGoals: [{ id: 'remote', actualMinutes: 7 }] } }),
    validateCloudPayload() {}, syncCreateSafetyBackup() {},
    mergeSyncStates(a, b) { return { ...a, ...b, dailyGoals: [...a.dailyGoals, ...b.dailyGoals] }; },
    getDeviceId: () => 'pc', getDeviceName: () => 'PC',
    updateSyncFile: async (id, payload) => { calls.uploaded = structuredClone(payload); return { id }; },
    createSyncFile: async payload => { calls.uploaded = structuredClone(payload); return { id: 'file' }; },
    replaceState(value) { calls.replaced = structuredClone(value); },
    saveData() {}, writeSyncMeta() {}, syncPayloadUpdatedAt: () => fixed,
    suppressAutoChecksAfterSync() {}, render() {}, renderSyncStatus() {},
    makeSyncPayload: () => ({ state: {} })
  };
  vm.createContext(context);
  vm.runInContext(source.slice(0, source.indexOf('async function applyCloudPayloadIntegral(')) + '\nglobalThis.upload = uploadSyncPayloadIntegral;', context);
  return { calls, context };
}
for (const hasFile of [false, true]) {
  test(`V658 uploads exactly the same repaired payload with one fingerprint (file=${hasFile})`, async () => {
    const oldRun = uploadHarness(previous('sync-integral-cloud.js'), hasFile);
    const newRun = uploadHarness(read('sync-integral-cloud.js'), hasFile);
    const input = { app: 'metas-estudo', stateFingerprint: 'outdated', state: structuredClone(newRun.context.state) };
    const original = JSON.stringify(input);
    await oldRun.context.upload(input);
    await newRun.context.upload(input);
    assert.equal(JSON.stringify(newRun.calls.uploaded), JSON.stringify(oldRun.calls.uploaded));
    assert.equal(JSON.stringify(newRun.calls.replaced), JSON.stringify(oldRun.calls.replaced));
    assert.equal(newRun.calls.fingerprints, 1);
    assert.equal(oldRun.calls.fingerprints, hasFile ? 3 : 2);
    assert.equal(newRun.calls.repairs, oldRun.calls.repairs);
    assert.equal(newRun.calls.uploaded.stateFingerprint, before.syncStateFingerprint(newRun.calls.uploaded.state));
    assert.equal(JSON.stringify(input), original);
    assert.equal(newRun.context.isSyncing, false);
  });
}

test('V658 keeps source/docs parity', () => {
  for (const file of ['sync-integral-core.js', 'sync-integral-cloud.js']) {
    assert.equal(read(file), read(`docs/${file}`));
  }
});
