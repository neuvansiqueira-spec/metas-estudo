const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const rootCore = fs.readFileSync("sync-integral-core.js", "utf8");
const docsCore = fs.readFileSync("docs/sync-integral-core.js", "utf8");
const rootState = fs.readFileSync("sync-integral-state.js", "utf8");
const docsState = fs.readFileSync("docs/sync-integral-state.js", "utf8");
const rootCloud = fs.readFileSync("sync-integral-cloud.js", "utf8");
const docsCloud = fs.readFileSync("docs/sync-integral-cloud.js", "utf8");
const rootTimeProtection = fs.readFileSync("sync-integral-time-protection.js", "utf8");
const docsTimeProtection = fs.readFileSync("docs/sync-integral-time-protection.js", "utf8");
const rootWorker = fs.readFileSync("service-worker.js", "utf8");
const docsWorker = fs.readFileSync("docs/service-worker.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const VERSION = "20260718-protecao-recuperacao-tempo-v48";

test("sessão nova do cronômetro recompõe e grava o total da meta", () => {
  assert.match(rootCore, /function installTimerSaveTotalReconciliation\(\)/);
  assert.match(rootCore, /const originalSubmitTimerStudyModal = submitTimerStudyModal/);
  assert.match(rootCore, /before\.studyActualMinutes \+ added\.study/);
  assert.match(rootCore, /before\.questionActualMinutes \+ added\.questions/);
  assert.match(rootCore, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(rootState, /if \(study\.updatesGoal === false\) return;/);
});

test("minuto já salvo é recuperado na abertura pelo histórico da meta", () => {
  assert.match(rootCore, /function reconcileGoalWithTimerHistory\(goal = \{\}\)/);
  assert.match(rootCore, /Tempo salvo pelo cronômetro:/);
  assert.match(rootCore, /Total realizado:/);
  assert.match(rootCore, /function installSavedTimerTotalsStartupRecovery\(\)/);
  assert.match(rootCore, /setTimeout\(\(\) => \{/);
  assert.match(rootCore, /Total da meta recuperado a partir da sessão salva/);
  assert.match(rootCore, /autoSyncAfterSave\("timer-recovery"\)/);
});

test("total anterior maior nunca é reduzido pela normalização", () => {
  assert.match(rootTimeProtection, /function installGoalTimeNonRegressionProtection\(\)/);
  assert.match(rootTimeProtection, /const preservedTotal = Math\.max\(/);
  assert.match(rootTimeProtection, /if \(preservedTotal > splitTotal\) studyMinutes \+= preservedTotal - splitTotal/);
  assert.match(rootTimeProtection, /normalized\.actualMinutes = Math\.max\(preservedTotal, studyMinutes \+ questionMinutes\)/);
  assert.match(rootTimeProtection, /normalized\.tempo_real_minutos = Math\.max/);
});

test("abertura mescla IndexedDB, localStorage e backup antes de escolher o estado", () => {
  assert.match(rootTimeProtection, /function installPrimaryStorageMergeProtection\(\)/);
  assert.match(rootTimeProtection, /const originalLoadPrimaryStateFromIndexedDB = loadPrimaryStateFromIndexedDB/);
  assert.match(rootTimeProtection, /sources\.push\("IndexedDB"\)/);
  assert.match(rootTimeProtection, /sources\.push\("localStorage"\)/);
  assert.match(rootTimeProtection, /sources\.push\("backup-antes-da-mesclagem"\)/);
  assert.match(rootTimeProtection, /mergeProtectedTimeStates\(backupState, protectedState, "remote"\)/);
  assert.match(rootTimeProtection, /__aldusTimeStorageRecoveryReport/);
});

test("sessões novas preservam também os segundos exatos", () => {
  assert.match(rootTimeProtection, /function installExactTimerSecondsArchive\(\)/);
  assert.match(rootTimeProtection, /pendingTimerStudyDraft\.seconds/);
  assert.match(rootTimeProtection, /session\.seconds = draft\.seconds/);
  assert.match(rootTimeProtection, /session\.elapsedSeconds = draft\.seconds/);
  assert.match(rootTimeProtection, /autoSyncAfterSave\("timer-exact-seconds"\)/);
});

test("tempo recuperado é persistido e sincronizado somente quando houve mudança", () => {
  assert.match(rootTimeProtection, /if \(!report\?\.changed\) return/);
  assert.match(rootTimeProtection, /reconcileSavedTimerTotals\(\)/);
  assert.match(rootTimeProtection, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(rootTimeProtection, /autoSyncAfterSave\("time-storage-recovery"\)/);
});

test("app instalado e aba comum trocam o estado local sem depender da nuvem", () => {
  assert.match(rootCloud, /function installSameDeviceStateSync\(\)/);
  assert.match(rootCloud, /window\.addEventListener\("storage"/);
  assert.match(rootCloud, /event\.key !== STORAGE_KEY/);
  assert.match(rootCloud, /mergeSyncStates\(state, incomingState, "remote"\)/);
  assert.match(rootCloud, /Dados atualizados pelo outro aplicativo deste dispositivo/);
});

test("autorização expirada tenta renovação antes de manter envio pendente", () => {
  assert.match(rootCloud, /async function ensureConnectedGoogleDriveAuthorization/);
  assert.match(rootCloud, /await getAccessToken\(\{ prompt: "" \}\)/);
  assert.match(rootCloud, /installAutoSyncAuthorizationRetry/);
  assert.match(rootCloud, /ensureConnectedGoogleDriveAuthorization\(\{ force: true \}\)/);
  assert.match(rootCloud, /Autorização expirada\. Toque em Conectar Google Drive/);
});

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

test("publicação da v48 permanece sincronizada entre raiz e docs", () => {
  assert.equal(rootCore, docsCore);
  assert.equal(rootState, docsState);
  assert.equal(rootCloud, docsCloud);
  assert.equal(rootTimeProtection, docsTimeProtection);
  assert.equal(rootWorker, docsWorker);
  assert.equal(packageJson.version, VERSION);
  assert.match(rootWorker, new RegExp(VERSION));
  assert.match(rootWorker, /startup-v21/);
  assert.match(rootWorker, /sync-integral-time-protection\.js/);
});
