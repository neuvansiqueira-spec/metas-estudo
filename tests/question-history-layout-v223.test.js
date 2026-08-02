const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const layout = fs.readFileSync("question-history-layout-v223.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

test("linhas do histórico não ocupam a altura livre do contêiner", () => {
  assert.match(layout, /#view-historico-questoes table tbody tr/);
  assert.match(layout, /height: auto !important/);
  assert.match(layout, /min-height: 0 !important/);
  assert.match(layout, /flex: 0 0 auto !important/);
  assert.match(layout, /grid-auto-rows: max-content !important/);
});

test("células mantêm espaçamento compacto e alinhamento superior", () => {
  assert.match(layout, /padding-top: 18px !important/);
  assert.match(layout, /padding-bottom: 18px !important/);
  assert.match(layout, /vertical-align: top !important/);
});

test("service worker publica a folha de compactação V223", () => {
  assert.match(worker, /question-history-layout-v223\.css/);
  assert.match(worker, /20260802-tabela-historico-compacta-v223/);
  assert.match(worker, /ensurePageStylesheets/);
});
