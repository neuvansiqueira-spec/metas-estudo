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

const VERSION = "20260718-diagnostico-recuperacao-tempo-v49";

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
  assert.match(rootCore, /Total da meta recuperado a partir da sessão salva/);
});

test("total anterior maior nunca é reduzido pela normalização", () => {
  assert.match(rootTimeProtection, /function installGoalTimeNonRegressionProtection\(\)/);
  assert.match(rootTimeProtection, /const preservedTotal = Math\.max\(/);
  assert.match(rootTimeProtection, /if \(preservedTotal > splitTotal\) studyMinutes \+= preservedTotal - splitTotal/);
  assert.match(rootTimeProtection, /normalized\.actualMinutes = Math\.max\(preservedTotal, studyMinutes \+ questionMinutes\)/);
});

test("abertura mescla IndexedDB, localStorage e dados de tempo do backup", () => {
  assert.match(rootTimeProtection, /function installPrimaryStorageMergeProtection\(\)/);
  assert.match(rootTimeProtection, /sources\.push\("IndexedDB"\)/);
  assert.match(rootTimeProtection, /sources\.push\("localStorage"\)/);
  assert.match(rootTimeProtection, /sources\.push\("backup-de-tempo-antes-da-mesclagem"\)/);
  assert.match(rootTimeProtection, /function mergeTimeOnlyRecoveryBackup\(currentState, backupState\)/);
});

test("diagnóstico manual encontra cópias e ignora tombstones apenas para registros recuperados", () => {
  assert.match(rootTimeProtection, /function collectTimeRecoveryCandidates\(\)/);
  assert.match(rootTimeProtection, /for \(let index = 0; index < localStorage\.length; index \+= 1\)/);
  assert.match(rootTimeProtection, /function mergeTimeRecoveryIgnoringTombstones\(currentState, candidateState\)/);
  assert.match(rootTimeProtection, /restoredKeys\[collection\]\.forEach\(\(key\) => \{ delete tombstones\.collections\[collection\]\[key\]; \}\)/);
  assert.match(rootTimeProtection, /Marcadores de exclusão ligados ao tempo/);
});

test("recuperação manual cria backup integral e não envia automaticamente à nuvem", () => {
  assert.match(rootTimeProtection, /metasEstudoBackupAntesDaRecuperacaoTempoV49/);
  assert.match(rootTimeProtection, /function applyTimeRecoveryDiagnostic\(\)/);
  assert.match(rootTimeProtection, /localStorage\.setItem\(TIME_STORAGE_MANUAL_RECOVERY_BACKUP_KEY/);
  assert.match(rootTimeProtection, /markPendingSync\("manual-time-recovery-v49"/);
  assert.doesNotMatch(rootTimeProtection, /autoSyncAfterSave\("manual-time-recovery-v49"/);
});

test("painel de recuperação fica visível na aba Backup", () => {
  assert.match(rootTimeProtection, /timeRecoveryDiagnosticV49/);
  assert.match(rootTimeProtection, /legacyTimerRecoveryPanel/);
  assert.match(rootTimeProtection, /recoveryPanel\.open = true/);
  assert.match(rootTimeProtection, /Recuperar maior tempo encontrado/);
  assert.match(rootTimeProtection, /Verificar novamente/);
});

test("sessões novas preservam também os segundos exatos", () => {
  assert.match(rootTimeProtection, /function installExactTimerSecondsArchive\(\)/);
  assert.match(rootTimeProtection, /pendingTimerStudyDraft\.seconds/);
  assert.match(rootTimeProtection, /session\.seconds = draft\.seconds/);
  assert.match(rootTimeProtection, /session\.elapsedSeconds = draft\.seconds/);
});

test("app instalado e aba comum trocam o estado local sem depender da nuvem", () => {
  assert.match(rootCloud, /function installSameDeviceStateSync\(\)/);
  assert.match(rootCloud, /window\.addEventListener\("storage"/);
  assert.match(rootCloud, /mergeSyncStates\(state, incomingState, "remote"\)/);
});

test("atualização automática só roda em condição segura", () => {
  assert.match(rootCloud, /document\.visibilityState === "hidden"/);
  assert.match(rootCloud, /navigator\.onLine === false/);
  assert.match(rootCloud, /floatingTimer\?\.startedAt && !floatingTimer\?\.paused/);
  assert.match(rootCloud, /\["INPUT", "TEXTAREA", "SELECT"\]\.includes\(activeTag\)/);
});

test("publicação da v49 permanece sincronizada entre raiz e docs", () => {
  assert.equal(rootCore, docsCore);
  assert.equal(rootState, docsState);
  assert.equal(rootCloud, docsCloud);
  assert.equal(rootTimeProtection, docsTimeProtection);
  assert.equal(rootWorker, docsWorker);
  assert.equal(packageJson.version, VERSION);
  assert.match(rootWorker, new RegExp(VERSION));
  assert.match(rootWorker, /startup-v22/);
  assert.match(rootWorker, /20260718-protecao-recuperacao-tempo-v48/);
  assert.match(rootWorker, /sync-integral-time-protection\.js/);
});
