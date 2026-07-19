const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const visual = fs.readFileSync("aldus-visual-v58.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const headerFix = fs.readFileSync("header-brand-fix.js", "utf8");

test("v58 permanece carregada antes das correções visuais posteriores", () => {
  assert.match(version, /contraste-integral-v68$/);
  const contrastPosition = html.indexOf("aldus-contrast-v53.css");
  const visualPosition = html.indexOf("aldus-visual-v58.css");
  assert.ok(contrastPosition >= 0);
  assert.ok(visualPosition > contrastPosition);
  assert.match(html, new RegExp(`aldus-visual-v58\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`Versão: ${version}`));
});

test("estrutura global fica contida na largura da tela", () => {
  assert.match(visual, /overflow-x: hidden !important/);
  assert.match(visual, /\.app-view\.active > \*/);
  assert.match(visual, /\.screen-stage,[\s\S]*\.app-view\.active/);
  assert.match(visual, /min-width: 0 !important/);
  assert.match(visual, /max-width: 100% !important/);
});

test("celular usa formulários em uma coluna e navegação contida", () => {
  assert.match(visual, /@media \(max-width: 1050px\)/);
  assert.match(visual, /\.form-grid,[\s\S]*\.advisor-mission-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(visual, /\.mobile-quick-nav \{[\s\S]*max-width: calc\(100vw - 16px\) !important/);
  assert.match(visual, /padding-bottom: calc\(var\(--v58-nav-height\) \+ 34px/);
  assert.match(visual, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
});

test("cartões claros conflitantes passam a usar uma superfície escura coerente", () => {
  for (const selector of [
    ".qb-section",
    ".smart-review-card",
    ".analytics-compact-header",
    ".advisor-nav-panel",
    ".filters"
  ]) assert.ok(visual.includes(selector), `${selector} deve estar coberto pela camada v58`);
  assert.match(visual, /background: linear-gradient\(145deg, rgba\(12, 49, 80, \.96\), rgba\(6, 28, 48, \.98\)\) !important/);
  assert.match(visual, /color: var\(--v58-text\) !important/);
});

test("tabelas rolam dentro da aba sem aumentar a largura da página", () => {
  assert.match(visual, /:is\(\.table-wrapper, \.responsive-table\)/);
  assert.match(visual, /overflow-x: auto !important/);
  assert.match(visual, /#view-historico-questoes :is\(th, td\)/);
  assert.match(visual, /white-space: normal !important/);
});

test("gráfico de rosca preserva contraste no centro claro", () => {
  assert.match(visual, /\.qh-donut-center strong \{[\s\S]*color: #082b49 !important/);
  assert.match(visual, /\.qh-donut-center span \{[\s\S]*color: #526b7f !important/);
});

test("service worker, reforço de tema e cópia publicada conhecem a v58", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-cruzamento-qc-completo-v57"/);
  assert.match(worker, /"20260718-revisao-visual-global-v58"/);
  assert.match(worker, /"20260718-planejamento-contraste-v59"/);
  assert.match(worker, /"aldus-visual-v58\.css"/);
  assert.match(worker, /id="aldusVisualV58"/);
  assert.match(headerFix, new RegExp(`const THEME_VERSION = "${version}"`));
  assert.match(headerFix, /ensureStylesheet\("aldusVisualV58", "aldus-visual-v58\.css"\)/);
  for (const file of [
    "index.html",
    "script.js",
    "service-worker.js",
    "sync-integral-time-protection.js",
    "header-brand-fix.js",
    "aldus-visual-v58.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
