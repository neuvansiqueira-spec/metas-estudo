const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const rootCloud = fs.readFileSync("sync-integral-cloud.js", "utf8");
const docsCloud = fs.readFileSync("docs/sync-integral-cloud.js", "utf8");
const rootWorker = fs.readFileSync("service-worker.js", "utf8");
const docsWorker = fs.readFileSync("docs/service-worker.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const VERSION = "20260717-sincronizacao-automatica-dispositivos-v32";

test("celular consulta a nuvem ao retornar para a página e periodicamente", () => {
  assert.match(rootCloud, /const DEVICE_SYNC_REFRESH_INTERVAL_MS = 20000;/);
  assert.match(rootCloud, /window\.addEventListener\("focus"/);
  assert.match(rootCloud, /window\.addEventListener\("pageshow"/);
  assert.match(rootCloud, /window\.addEventListener\("online"/);
  assert.match(rootCloud, /document\.addEventListener\("visibilitychange"/);
  assert.match(rootCloud, /setInterval\(\(\) => refreshDeviceFromCloud\("interval"\), DEVICE_SYNC_REFRESH_INTERVAL_MS\)/);
  assert.match(rootCloud, /await checkCloudForNewerVersionIntegral\(`device-\$\{reason\}`\)/);
});

test("atualização automática só roda em condição segura", () => {
  assert.match(rootCloud, /document\.visibilityState === "hidden"/);
  assert.match(rootCloud, /navigator\.onLine === false/);
  assert.match(rootCloud, /!readSyncMeta\(\)\?\.connected/);
  assert.match(rootCloud, /!hasValidGoogleDriveAccessToken\(\)/);
  assert.match(rootCloud, /isSyncing/);
  assert.match(rootCloud, /isApplyingRemote/);
  assert.match(rootCloud, /cloudAutoCheckRunning/);
  assert.match(rootCloud, /floatingTimer\?\.startedAt && !floatingTimer\?\.paused/);
  assert.match(rootCloud, /\["INPUT", "TEXTAREA", "SELECT"\]\.includes\(activeTag\)/);
});

test("mesclagem automática preserva a tela atual", () => {
  assert.match(rootCloud, /async function applyCloudPayloadIntegral\(payload, \{ preserveView = false \} = \{\}\)/);
  assert.match(rootCloud, /if \(!preserveView\) showView\("backup"\)/);
  assert.match(rootCloud, /applyCloudPayloadIntegral\(remote, \{ preserveView: true \}\)/);
});

test("publicação da v32 permanece sincronizada entre raiz e docs", () => {
  assert.equal(rootCloud, docsCloud);
  assert.equal(rootWorker, docsWorker);
  assert.equal(packageJson.version, VERSION);
  assert.match(rootWorker, new RegExp(VERSION));
  assert.match(rootWorker, /startup-v8/);
});
