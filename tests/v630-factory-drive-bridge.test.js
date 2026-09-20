const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const rootScript = fs.readFileSync("factory-drive-bridge-v630.js", "utf8");
const docsScript = fs.readFileSync("docs/factory-drive-bridge-v630.js", "utf8");
const rootHtml = fs.readFileSync("index.html", "utf8");
const docsHtml = fs.readFileSync("docs/index.html", "utf8");

test("V630 mantém integração do bridge espelhada entre raiz e docs", () => {
  assert.equal(rootScript, docsScript);
  assert.equal(rootHtml, docsHtml);
});

test("V630 libera somente os endpoints locais necessários no CSP", () => {
  assert.match(rootHtml, /connect-src[^"]*http:\/\/127\.0\.0\.1:8765/);
  assert.match(rootHtml, /connect-src[^"]*http:\/\/localhost:8765/);
  assert.match(rootHtml, /id="aldusFactoryDriveBridgeV630"[^>]+factory-drive-bridge-v630\.js/);
});

test("V630 enriquece somente o prompt de triagem com a pré-busca local", () => {
  assert.match(rootScript, /const BRIDGE_URL = "http:\/\/127\.0\.0\.1:8765"/);
  assert.match(rootScript, /type !== "triagem"/);
  assert.match(rootScript, /modo: "triagem"/);
  assert.match(rootScript, /limite: 10/);
  assert.match(rootScript, /PACOTE LOCAL DE PRÉ-TRIAGEM — GOOGLE DRIVE/);
  assert.match(rootScript, /data-factory-prompt-text/);
  assert.match(rootScript, /data-factory-router-text/);
});

test("V630 preserva o prompt original quando o bridge estiver indisponível", () => {
  assert.match(rootScript, /Prompt original mantido/);
  assert.match(rootScript, /setPromptBusy\(id, false/);
});
