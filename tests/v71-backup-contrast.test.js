const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("aldus-backup-contrast-v71.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const header = fs.readFileSync("header-brand-fix.js", "utf8");

test("v71 carrega depois do layout do Conselheiro e renova o cache", () => {
  assert.equal(version, "20260719-rolagem-navegacao-v73");
  assert.ok(html.indexOf("aldus-backup-contrast-v71.css") > html.indexOf("aldus-advisor-layout-v70.css"));
  assert.match(worker, /const CURRENT_VERSION = "20260719-rolagem-navegacao-v73"/);
  assert.match(worker, /"20260719-conselheiro-layout-v70"/);
  assert.match(worker, /"aldus-backup-contrast-v71\.css"/);
  assert.match(header, /ensureStylesheet\("aldusBackupContrastV71", "aldus-backup-contrast-v71\.css"\)/);
});

test("seletor acompanha os article realmente criados pelo status de sincronização", () => {
  assert.match(script, /<div class="sync-status-grid">.*<article>/s);
  assert.match(css, /#view-backup \.sync-status-grid > article/);
  assert.match(css, /background: linear-gradient\(145deg, rgba\(11, 53, 85, \.98\)/);
  assert.match(css, /#view-backup \.sync-status-grid > article > span/);
  assert.match(css, /#view-backup \.sync-status-grid > article > strong/);
  assert.match(css, /color: #ffffff !important/);
});

test("mensagens, armazenamento, resumo e prévia recebem contraste próprio", () => {
  assert.match(css, /\.sync-message\.sync-success/);
  assert.match(css, /\.sync-message\.sync-error/);
  assert.match(css, /#storageDiagnostics, #legacyTimerRecoveryReview/);
  assert.match(css, /\.backup-meta, \.backup-summary/);
  assert.match(css, /\.backup-preview:not\(:empty\)/);
  assert.match(css, /max-width: 768px/);
});

test("arquivos de publicação permanecem idênticos", () => {
  assert.equal(css, fs.readFileSync("docs/aldus-backup-contrast-v71.css", "utf8"));
  assert.equal(html, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(script, fs.readFileSync("docs/script.js", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(header, fs.readFileSync("docs/header-brand-fix.js", "utf8"));
});
