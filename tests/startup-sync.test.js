const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('script.js', 'utf8');
const start = script.indexOf('function stableStartupStateHash');
const end = script.indexOf('function updateStartupSyncReport', start);
function resolver(meta, { session = true, metadata, payload, fail = false } = {}) {
  const code = script.slice(start, end);
  const make = new Function('readSyncMeta','hasValidGoogleDriveAccessToken','stateHasUserData','validateCloudPayload','STARTUP_SYNC_TIMEOUT_MS', `${code}; return { resolveStartupStateWithCloud, stableStartupStateHash };`);
  const api = make(() => meta, () => session, (s) => Boolean(s && (s.dailyGoals || []).length), (p) => { if (!p || !p.state) throw new Error('invalid'); }, 25);
  return api.resolveStartupStateWithCloud({ dailyGoals: [{ id: 'old' }] }, { localSource: 'indexeddb', cloudSessionAvailable: session, findFile: async () => { if (fail) throw new Error('offline'); return metadata; }, downloadFile: async () => payload });
}
const baseMeta = { lastRemoteFileId: 'f', lastRemoteModifiedTime: '2026-01-01T00:00:00Z', lastRemoteVersion: '1', lastSyncedStateHash: 'x', localStateHash: 'x', pendingSync: false, localDirty: false };
test('startup picks newer Drive state without rendering local state', async () => {
 const r = await resolver(baseMeta, { metadata: { id:'f', version:'2', modifiedTime:'2026-02-01T00:00:00Z' }, payload: { state:{ dailyGoals:[{id:'new'}] } } });
 assert.equal(r.source, 'google-drive'); assert.equal(r.state.dailyGoals[0].id, 'new'); assert.equal(r.cloudChecked, true);
});
test('equal Drive metadata does not download full content', async () => {
 let downloaded = false; const code = script.slice(start, end); const api = new Function('readSyncMeta','hasValidGoogleDriveAccessToken','stateHasUserData','validateCloudPayload','STARTUP_SYNC_TIMEOUT_MS', `${code}; return resolveStartupStateWithCloud;`)(() => baseMeta, () => true, s => Boolean(s.dailyGoals?.length), () => {}, 25);
 const r = await api({dailyGoals:[{id:'local'}]}, { cloudSessionAvailable:true, findFile: async()=>({id:'f',version:'1',modifiedTime:baseMeta.lastRemoteModifiedTime}), downloadFile:async()=>{downloaded=true;} });
 assert.equal(r.source, 'indexeddb'); assert.equal(downloaded, false);
});
test('simultaneous local and remote changes produce a conflict and preserve local', async () => {
 const r = await resolver({...baseMeta, pendingSync:true, localDirty:true}, { metadata:{id:'f',version:'2',modifiedTime:'2026-02-01T00:00:00Z'}, payload:{state:{dailyGoals:[{id:'remote'}]}} });
 assert.equal(r.conflict, true); assert.equal(r.source, 'conflict-local'); assert.equal(r.state.dailyGoals[0].id, 'old');
});
test('offline cloud failure falls back without replacing local', async () => {
 const r = await resolver(baseMeta, { fail:true }); assert.equal(r.source, 'offline-fallback'); assert.equal(r.offlineFallback, true); assert.equal(r.state.dailyGoals[0].id, 'old');
});
test('bootstrap has one post-resolution render and blocks uploads while resolving', () => {
 assert.match(script, /let startupSyncInProgress = true/); assert.match(script, /if \(startupSyncInProgress\) \{ startupSyncWriteQueue\.push\(reason\); return; \}/); assert.match(script, /renderedBeforeResolution: false/); assert.match(script, /renderCountAfterResolution: 1/);
});

test('reopened connected app silently requests a Drive authorization before checking cloud', async () => {
 const start = script.indexOf('function waitForGoogleIdentityServices');
 const end = script.indexOf('async function driveFetch', start);
 const code = script.slice(start, end);
 const calls = [];
 const api = new Function('STARTUP_GOOGLE_IDENTITY_TIMEOUT_MS', 'window', 'hasValidGoogleDriveAccessToken', 'readSyncMeta', 'isGoogleClientConfigured', 'getAccessToken', `${code}; return ensureStartupGoogleDriveAuthorization;`)(1500, { google: { accounts: { oauth2: {} } } }, () => false, () => ({ connected: true }), () => true, async (options) => { calls.push(options); });
 const result = await api();
 assert.deepEqual(calls, [{ prompt: 'none' }]);
 assert.deepEqual(result, { authorized: true, mode: 'silent' });
});
test('silent authorization requiring interaction keeps startup behind the internal choice screen', async () => {
 const start = script.indexOf('function waitForGoogleIdentityServices');
 const end = script.indexOf('async function driveFetch', start);
 const code = script.slice(start, end);
 const api = new Function('STARTUP_GOOGLE_IDENTITY_TIMEOUT_MS', 'window', 'hasValidGoogleDriveAccessToken', 'readSyncMeta', 'isGoogleClientConfigured', 'getAccessToken', `${code}; return ensureStartupGoogleDriveAuthorization;`)(1500, { google: { accounts: { oauth2: {} } } }, () => false, () => ({ connected: true }), () => true, async () => { throw new Error('interaction_required'); });
 const result = await api();
 assert.equal(result.authorized, false);
 assert.equal(result.mode, 'interaction-required');
 assert.equal(result.interactionRequired, true);
 assert.match(script, /Confirme a atualização para carregar seus dados mais recentes\./);
 assert.match(script, /data-startup-drive-choice="cloud"/);
 assert.match(script, /getAccessToken\(\{ prompt: "" \}\)/);
});
test('startup authorization never persists tokens and local choice disables automatic checks', () => {
 assert.doesNotMatch(script, /localStorage\.setItem\([^\n]*googleDriveAccessToken/);
 assert.doesNotMatch(script, /localStorage\.setItem\([^\n]*Authorization/);
 assert.match(script, /startupDriveVerificationDeferred = true/);
 assert.match(script, /if \(startupDriveVerificationDeferred \|\| isSyncLocked\(\)\) return;/);
 assert.match(script, /Dados deste aparelho — atualização do Drive não verificada/);
});
test('startup reports authorization outcome before the sole post-resolution render', () => {
 assert.match(script, /authorizationAttempted: false/);
 assert.match(script, /authorizationRequiredInteraction: Boolean\(authorization\.interactionRequired\)/);
 assert.match(script, /renderCountBeforeResolution: 0/);
 assert.match(script, /render\(\); updateStartupSyncReport\(\{ renderCountAfterResolution: 1 \}\)/);
});
test('bootstrap hides app cards while authorization or the user decision is pending', () => {
 assert.match(script, /Verificando autorização do Google Drive…/);
 const css = fs.readFileSync('style.css', 'utf8');
 assert.match(css, /body\.app-bootstrapping \.app-layout \{\n  pointer-events: none;\n  visibility: hidden;/);
});
