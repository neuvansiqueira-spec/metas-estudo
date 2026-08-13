const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("V298 preserva Banco, Registro e Desempenho na estrutura base do módulo Questões", () => {
  const html = read("index.html");
  const hubs = html.match(/data-questions-hub/g) || [];
  const groupedMenuEntries = html.match(/data-view-group="questions">Questões<\/a>/g) || [];

  assert.equal(hubs.length, 3, "as três telas originalmente integradas devem preservar o hub estático");
  assert.equal(groupedMenuEntries.length, 2, "menus móvel e lateral devem exibir uma única entrada do módulo");
  assert.match(html, /id="view-banco-questoes"/);
  assert.match(html, /id="view-questoes"/);
  assert.match(html, /id="view-historico-questoes"/);
  assert.match(html, /id="view-simulados"/);
  assert.match(html, /id="questionForm"/);
  assert.match(html, /id="qbStats"/);
  assert.match(html, /id="questionHistoryBody"/);
  assert.match(html, /data-view-link="banco-questoes"><strong>Banco<\/strong>/);
  assert.match(html, /data-view-link="questoes"><strong>Registrar<\/strong>/);
  assert.match(html, /data-view-link="historico-questoes"><strong>Desempenho<\/strong>/);
});

test("V322 integra Simulados ao hub de Questões e mantém a entrada Questões ativa nas quatro telas", () => {
  const script = read("questions-hub-v298.js");
  assert.match(script, /20260813-simulados-no-hub-questoes-v322/);
  assert.match(script, /new Set\(\["banco-questoes", "questoes", "simulados", "historico-questoes"\]\)/);
  assert.match(script, /view: "simulados", title: "Simulados", subtitle: "Gerar e resolver"/);
  assert.match(script, /function ensureSimuladosHub\(\)/);
  assert.match(script, /function removeStandaloneSimuladosMenuEntries\(\)/);
  assert.match(script, /function syncHubTabs\(target = activeView\(\)\)/);
  assert.match(script, /window\.addEventListener\("aldus:view-active"/);
});

test("V322 usa quatro colunas no desktop e grade 2x2 no celular", () => {
  const css = read("questions-hub-v298.css");
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
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

test("V322 mantém estilos e navegação com paridade em docs", () => {
  const html = read("index.html");
  const worker = read("service-worker.js");
  assert.match(html, /questions-hub-v298\.css\?v=20260810-questoes-integradas-v298/);
  assert.match(html, /questions-hub-v298\.js\?v=20260810-questoes-integradas-v298/);
  assert.match(worker, /QUESTIONS_HUB_STYLESHEET/);
  assert.match(worker, /QUESTIONS_HUB_SCRIPT/);
  for (const file of ["index.html", "questions-hub-v298.css", "questions-hub-v298.js", "service-worker.js"]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
