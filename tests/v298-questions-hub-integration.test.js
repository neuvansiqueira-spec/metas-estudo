const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("V298 reúne Banco, Registro e Desempenho no módulo Questões", () => {
  const html = read("index.html");
  const hubs = html.match(/data-questions-hub/g) || [];
  const groupedMenuEntries = html.match(/data-view-group="questions">Questões<\/a>/g) || [];

  assert.equal(hubs.length, 3, "cada tela preservada deve receber a navegação integrada");
  assert.equal(groupedMenuEntries.length, 2, "menus móvel e lateral devem exibir uma única entrada do módulo");
  assert.match(html, /id="view-banco-questoes"/);
  assert.match(html, /id="view-questoes"/);
  assert.match(html, /id="view-historico-questoes"/);
  assert.match(html, /id="questionForm"/);
  assert.match(html, /id="qbStats"/);
  assert.match(html, /id="questionHistoryBody"/);
  assert.match(html, /data-view-link="banco-questoes"><strong>Banco<\/strong>/);
  assert.match(html, /data-view-link="questoes"><strong>Registrar<\/strong>/);
  assert.match(html, /data-view-link="historico-questoes"><strong>Desempenho<\/strong>/);
});

test("V298 mantém a entrada Questões ativa nas três telas do módulo", () => {
  const script = read("questions-hub-v298.js");
  assert.match(script, /new Set\(\["banco-questoes", "questoes", "historico-questoes"\]\)/);
  assert.match(script, /function syncQuestionsMenu\(target = activeView\(\)\)/);
  assert.match(script, /window\.addEventListener\("aldus:view-active"/);
});

test("V298 consolida os indicadores do Dashboard sem remover seus IDs", () => {
  const html = read("index.html");
  for (const id of [
    "totalQuestions",
    "accuracyRate",
    "generalCebraspeNet",
    "dashboardQuestionBankTotal",
    "dashboardQuestionBankSessions",
    "dashboardQuestionBankLinked"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /dashboard-block dashboard-questions-hub/);
  assert.match(html, /Resolver questões/);
  assert.match(html, /Registrar resultado/);
  assert.match(html, /Ver desempenho/);
});

test("V298 publica estilos, navegação e cache com paridade em docs", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});
