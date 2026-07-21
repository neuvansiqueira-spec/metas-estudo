const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = packageJson.version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const recovery = fs.readFileSync("sync-integral-time-protection.js", "utf8");
const interfaceCss = fs.readFileSync("aldus-interface-v51.css", "utf8");
const bundleCss = fs.readFileSync("app.bundle.css", "utf8");

test("recuperação do Drive é manual e examina arquivo atual e histórico de revisões", () => {
  assert.match(recovery, /data-time-recovery-drive-scan/);
  assert.match(recovery, /async function scanGoogleDriveTimeRecoveryHistory\(\)/);
  assert.match(recovery, /await getAccessToken\(\{ prompt: hasValidGoogleDriveAccessToken\(\) \? "" : "consent" \}\)/);
  assert.match(recovery, /\/drive\/v3\/files\/\$\{encodeURIComponent\(fileId\)\}\/revisions\?/);
  assert.match(recovery, /\/revisions\/\$\{encodeURIComponent\(revisionId\)\}\?alt=media/);
  assert.match(recovery, /await downloadSyncFile\(file\.id\)/);
  assert.match(recovery, /__aldusDriveTimeRecoveryCandidatesV51/);

  const installStart = recovery.indexOf("function installTimeRecoveryDiagnosticUI");
  const installBody = recovery.slice(installStart, recovery.indexOf("installGoalTimeNonRegressionProtection", installStart));
  assert.match(installBody, /data-time-recovery-drive-scan[\s\S]*scanGoogleDriveTimeRecoveryHistory\(\)/);
  const startupCalls = recovery.slice(recovery.lastIndexOf("installGoalTimeNonRegressionProtection"));
  assert.doesNotMatch(startupCalls, /scanGoogleDriveTimeRecoveryHistory\(\)/);
});

test("recuperação continua protegida por confirmação, backup e ausência de envio automático", () => {
  const start = recovery.indexOf("function applyTimeRecoveryDiagnostic");
  const end = recovery.indexOf("function installTimeRecoveryDiagnosticUI", start);
  const body = recovery.slice(start, end);
  assert.match(body, /confirm\(message\)/);
  assert.match(body, /TIME_STORAGE_MANUAL_RECOVERY_BACKUP_KEY/);
  assert.match(body, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(body, /markPendingSync/);
  assert.doesNotMatch(body, /uploadSyncPayload|forcePushToCloud|syncNow/);
});

test("nova interface cobre estrutura, cartões, formulários, tabelas e responsividade", () => {
  assert.ok(html.includes(`app-v113.css?v=${version}`));
  assert.ok(html.indexOf("app-v113.css") < html.indexOf("app-v113.js"));
  assert.ok(bundleCss.includes("/* Aldus source: aldus-interface-v51.css */"));
  assert.match(script, /document\.documentElement\.dataset\.activeView = target/);
  assert.match(interfaceCss, /:not\(\[data-active-view="dashboard"\]\) \.hero-content/);
  assert.match(interfaceCss, /\.app-layout\s*\{[\s\S]*grid-template-columns: 218px minmax\(0, 1fr\)/);
  assert.match(interfaceCss, /\.question-register-section/);
  assert.match(interfaceCss, /\.factory-theme-details/);
  assert.match(interfaceCss, /\.analytics-section/);
  assert.match(interfaceCss, /:is\(input, select, textarea\)/);
  assert.match(interfaceCss, /@media \(max-width: 620px\)/);
  assert.match(interfaceCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.ok(worker.includes('`app-v113.css?v=${CURRENT_VERSION}`'));
  assert.match(worker, /"aldus-interface-v51\.css"/);
});

test("versão v51 e arquivos publicados permanecem coerentes", () => {
  assert.match(script, new RegExp(`const APP_VERSION = "${version}"`));
  assert.match(recovery, new RegExp(`const TIME_STORAGE_PROTECTION_VERSION = "${version}"`));
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(html, new RegExp(`Versão: ${version}`));
  for (const file of [
    "index.html", "script.js", "service-worker.js", "header-brand-fix.js",
    "sync-integral-time-protection.js", "aldus-interface-v51.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
