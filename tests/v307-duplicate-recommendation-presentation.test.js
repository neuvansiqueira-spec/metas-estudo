"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const diagnostics = require("../duplicate-diagnostics-v304.js");

function stateWithScreenshotTopics() {
  const topics = [
    ["person", "DIREITO PENAL", "1.7 Crimes Contra a Pessoa."],
    ["property", "DIREITO PENAL", "1.8 Crimes Contra o Patrimônio."],
    ["acts", "DIREITO ADMINISTRATIVO", "9.3 Atos Administrativos."],
    ["state", "DIREITO CONSTITUCIONAL", "8.4 Organização do Estado."],
    ["thanatology", "CIÊNCIAS FORENSES", "8.5 Tanatologia Forense."]
  ];
  return {
    syllabusItems: topics.flatMap(([prefix, discipline, topic], index) => [
      { id: `${prefix}-a`, discipline, code: `${index + 1}.1`, topic },
      { id: `${prefix}-b`, discipline: discipline.toLowerCase(), code: `${index + 20}.2`, topic: topic.replace(/\.$/, "") }
    ]),
    contestSyllabusMap: [], studies: [], dailyGoals: [], questionLogs: [], smartReviews: [],
    simulados: [], materials: [], questionBank: [], questionBankSessions: [],
    questionErrorNotebook: [], factoryItems: [], factoryAgenda: [], migrations: {}
  };
}

const state = stateWithScreenshotTopics();
const report = diagnostics.diagnoseState(state, { includeDecided: true });
const exactPairs = report.pairs.filter((pair) => pair.classification === "exact");
const plan = diagnostics.recommendedBatchPlan(report);

assert.equal(exactPairs.length, 5, "os cinco títulos idênticos mostrados no print devem ser duplicidades exatas");
assert.ok(exactPairs.every((pair) => pair.confidence >= 94), "títulos visíveis idênticos não podem permanecer em 89%");
assert.equal(plan.actions.length, 5, "os exemplos do print devem ser apresentados na prévia de consolidação");

const indexSource = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const inlineScript = indexSource.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1] || "";
let writtenShell = "";
const legacyShell = `<!DOCTYPE html><html><head></head><body>
  <script id="legacyCore" src="duplicate-diagnostics-v260.js?v=old"></script>
  <script id="legacyLoader" src="duplicate-diagnostics-loader-v269.js?v=old"></script>
  <script id="legacyBatch" src="duplicate-diagnostics-batch-v304.js?v=old"></script>
</body></html>`;
class MockRequest {
  open() {}
  setRequestHeader() {}
  send() {
    this.status = 200;
    this.responseText = legacyShell;
  }
}
const sandbox = {
  console,
  Date,
  encodeURIComponent,
  XMLHttpRequest: MockRequest,
  document: {
    open() {},
    close() {},
    write(value) { writtenShell = String(value); }
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(inlineScript, sandbox);

assert.doesNotMatch(writtenShell, /duplicate-diagnostics-v260\.js/, "a entrada deve retirar o núcleo antigo que produzia 89%");
assert.doesNotMatch(writtenShell, /duplicate-diagnostics-batch-v304\.js/, "a entrada deve retirar o handler de lote antigo");
assert.match(writtenShell, /duplicate-diagnostics-v304\.js\?v=20260811-duplicate-core-delivery-v307/, "a entrada deve forçar o núcleo ampliado");
assert.match(writtenShell, /duplicate-diagnostics-batch-v305\.js/, "a entrada deve preservar o commit autoritativo");
assert.ok(
  writtenShell.indexOf("duplicate-diagnostics-v304.js") < writtenShell.indexOf("duplicate-diagnostics-loader-v269.js"),
  "o núcleo correto deve executar antes do loader que poderia reintroduzir a versão antiga"
);

console.log("v307 duplicate recommendation presentation: covered");
