const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const read = (file) => fs.readFileSync(file, "utf8");
const source = read("analytics-view-controller-v179.js");
const published = read("docs/analytics-view-controller-v179.js");
const bundle = read("app-v169.js");

test("controlador consolidado possui sintaxe válida e paridade de publicação", () => {
  execFileSync(process.execPath, ["--check", "analytics-view-controller-v179.js"]);
  assert.equal(source, published);
});

test("quatro controladores antigos foram substituídos por uma única execução", () => {
  assert.equal((bundle.match(/Aldus source: analytics-view-controller-v179\.js/g) || []).length, 1);
  for (const retired of [
    "analytics-collapsibles-v145.js",
    "analytics-accordion-fix-v148.js",
    "analytics-header-arrow-v149.js",
    "analytics-single-arrow-v150.js"
  ]) {
    assert.doesNotMatch(bundle, new RegExp(`Aldus source: ${retired.replaceAll(".", "\\.")}`));
    assert.equal(fs.existsSync(retired), true, `${retired} deve permanecer reversível`);
  }
});

test("painel visual antigo de outras bancas permanece reversível, mas não executa", () => {
  assert.equal(fs.existsSync("question-board-result-v141.js"), true);
  assert.equal(fs.existsSync("docs/question-board-result-v141.js"), true);
  assert.doesNotMatch(bundle, /Aldus source: question-board-result-v141\.js/);
  assert.match(bundle, /Aldus source: question-scoring-rule-v142\.js/);
  assert.doesNotMatch(read("question-scoring-rule-v142.js"), /#questionBoardResultV141/);
});

test("controlador usa um único observador e um único agendador da análise", () => {
  assert.equal((source.match(/new MutationObserver/g) || []).length, 1);
  assert.match(source, /runtime\.observerCount = 1/);
  assert.match(source, /function scheduleProcess\(view\)/);
  assert.match(source, /if \(scheduled\) return/);
  assert.doesNotMatch(source, /addEventListener\("hashchange"|addEventListener\("pageshow"/);
});

test("controlador preserva acordeão, cabeçalho, filtros e seta única", () => {
  assert.match(source, /document\.addEventListener\("click", toggleFromEvent, true\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /analytics-fixed-header-v149/);
  assert.match(source, /analytics-filter-shell-v149/);
  assert.match(source, /analytics-collapsible-chevron-v145/);
  assert.match(source, /summary::marker/);
  assert.match(source, /summary::before/);
  assert.match(source, /summary\.replaceChildren\(heading, chevron\)/);
  assert.match(source, /aria-expanded/);
});

test("controlador não cria a barra que o hotfix anterior removia", () => {
  assert.doesNotMatch(source, /createElement\("div"\)[\s\S]{0,300}analyticsCollapseToolbarV145/);
  assert.match(source, /querySelector\("#analyticsCollapseToolbarV145"\)\?\.remove\(\)/);
});

test("piloto não acessa dados, persistência, sincronização, cronômetro ou rede", () => {
  for (const forbidden of [
    "saveData", "localStorage", "sessionStorage", "indexedDB", "state.",
    "syncIntegral", "floatingTimer", "fetch(", "XMLHttpRequest", "WebSocket"
  ]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});
