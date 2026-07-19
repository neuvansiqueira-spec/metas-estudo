const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const css = fs.readFileSync("aldus-contrast-system-v68.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const headerFix = fs.readFileSync("header-brand-fix.js", "utf8");

test("v68 é a última camada visual e usa a versão atual", () => {
  assert.equal(version, "20260719-conselheiro-layout-v70");
  assert.match(html, new RegExp(`aldus-contrast-system-v68\\.css\\?v=${version}`));
  assert.ok(html.indexOf("aldus-contrast-system-v68.css") > html.indexOf("aldus-daily-time-v67.css"));
  assert.match(html, new RegExp(`Versão: ${version}`));
});

test("contrato cobre textos, cartões, caixas, tabelas, controles e acordeões", () => {
  for (const selector of [
    ".stat-card",
    ".daily-goal-section",
    ".planning-summary-card",
    ".smart-review-card",
    ".question-register-section",
    ".factory-card",
    ".material-collapsible-item",
    ".advisor-nav-panel",
    ".analytics-section",
    ".goal-completion-grid > span"
  ]) assert.ok(css.includes(selector), `${selector} deve estar coberto pela v68`);
  assert.match(css, /table tbody tr:nth-child\(even\) td/);
  assert.match(css, /:is\(input, select, textarea\)/);
  assert.match(css, /\.app-view\.active details > summary/);
  assert.match(css, /--v68-text: #f8fbff/);
  assert.match(css, /--v68-muted: #bfd0de/);
});

test("modal de conclusão não mantém cartões brancos nem texto apagado", () => {
  assert.match(css, /\.app-modal-card \{[\s\S]*background: linear-gradient\(145deg, #0b3151, #061d33\) !important/);
  assert.match(css, /\.goal-completion-grid > span/);
  assert.match(css, /\.goal-completion-zero/);
  assert.match(css, /\.goal-completion-summary h3/);
  assert.match(css, /\.goal-completion-grid strong \{[\s\S]*color: var\(--v68-muted\) !important/);
  assert.match(css, /max-height: min\(88dvh, 820px\)/);
});

test("estados semânticos e gráficos preservam contraste próprio", () => {
  assert.match(css, /--v68-success: #bff5df/);
  assert.match(css, /--v68-warning: #ffe7a3/);
  assert.match(css, /--v68-danger: #ffd0d5/);
  assert.match(css, /\.analytics-svg-chart :is\(text, tspan\)/);
  assert.match(css, /\.qh-donut-center strong \{[\s\S]*color: #082b49 !important/);
});

test("celular, alto contraste e impressão são protegidos", () => {
  assert.match(css, /@media screen/);
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /width: calc\(100vw - 18px\) !important/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("cache, reforço do tema e cópia publicada carregam a v68", () => {
  assert.match(worker, /const CURRENT_VERSION = "20260719-conselheiro-layout-v70"/);
  assert.match(worker, /"20260719-tempo-acumulado-backup-v67"/);
  assert.match(worker, /"aldus-contrast-system-v68\.css"/);
  assert.match(worker, /id="aldusContrastSystemV68"/);
  assert.match(headerFix, /ensureStylesheet\("aldusContrastSystemV68", "aldus-contrast-system-v68\.css"\)/);
  for (const file of [
    "index.html",
    "service-worker.js",
    "header-brand-fix.js",
    "aldus-contrast-system-v68.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
