const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("aldus-contrast-v53.css", "utf8");

test("v53 é a última camada visual e renova o cache público", () => {
  assert.ok(html.includes(`aldus-contrast-v53.css?v=${version}`));
  assert.ok(html.indexOf("aldus-responsive-v52.css") < html.indexOf("aldus-contrast-v53.css"));
  assert.ok(html.indexOf("aldus-contrast-v53.css") < html.indexOf("script.js"));
  assert.match(worker, /"aldus-contrast-v53\.css"/);
  assert.match(worker, /aldus-contrast-v53\.css\?v=\$\{CURRENT_VERSION\}/);
  assert.match(worker, /endsWith\("\/aldus-contrast-v53\.css"\)/);
});

test("Plano do Dia recebe contraste para título, resumo e cartões numéricos", () => {
  assert.match(css, /\.daily-plan-title[\s\S]*color: var\(--v53-text\) !important/);
  assert.match(css, /\.daily-plan-resume[\s\S]*color: var\(--v53-muted\) !important/);
  assert.match(css, /\.daily-goal-summary > span:first-child span/);
  assert.match(css, /\.stat-card > :is\(span, small\)[\s\S]*color: var\(--v53-muted-strong\) !important/);
  assert.match(css, /\.stat-card > strong[\s\S]*color: var\(--v53-text\) !important/);
});

test("todas as famílias de acordeão e títulos internos recebem texto legível", () => {
  assert.match(css, /\.app-view\.active :is\(h2, h3, h4, h5\)/);
  assert.match(css, /\.app-view\.active details > summary/);
  for (const selector of [
    ".interface-collapsible-summary",
    ".goal-calendar-section > summary",
    ".question-register-section > summary",
    ".factory-theme-details summary",
    ".analytics-section > summary",
    ".material-item-summary"
  ]) assert.ok(css.includes(selector), `${selector} deve estar coberto`);
});

test("superfícies claras e modo de alto contraste continuam protegidos", () => {
  assert.match(css, /\.selected-day-banner[\s\S]*color: var\(--v53-light-surface-text\) !important/);
  assert.match(css, /\.linked-materials/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
});

test("Fábrica não mantém ilhas brancas nem botões desativados ilegíveis", () => {
  assert.match(css, /#view-fabrica-resumos :is\([\s\S]*\.factory-do-now[\s\S]*\.factory-prompt-box/);
  assert.match(css, /#view-fabrica-resumos \.factory-theme-highlight[\s\S]*background: linear-gradient/);
  assert.match(css, /#view-fabrica-resumos \.factory-step\.current/);
  assert.match(css, /#view-fabrica-resumos button:disabled[\s\S]*color: #8ea3b5 !important/);
  assert.match(css, /#view-fabrica-resumos \.factory-do-now > \.card-actions[\s\S]*grid-template-columns: 1fr !important/);
});

test("versão v53 e publicação docs permanecem idênticas", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(html, new RegExp(`Versão: ${version}`));
  for (const file of [
    "index.html", "script.js", "service-worker.js", "header-brand-fix.js",
    "sync-integral-time-protection.js", "aldus-contrast-v53.css"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
