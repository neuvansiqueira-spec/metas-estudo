import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-daily-summary-elegant-nested-v252";
const CSS_FILE = "daily-summary-elegant-nested-v252.css";
const read = (path) => fs.readFileSync(path, "utf8");

test("raiz e docs permanecem idênticos", () => {
  assert.equal(read(CSS_FILE), read(`docs/${CSS_FILE}`));
  assert.equal(read("index.html"), read("docs/index.html"));
  assert.equal(read("service-worker-v236.js"), read("docs/service-worker-v236.js"));
});

test("o app renderiza os cartões dentro de details e da grade daily-goals-summary", () => {
  const app = read("app-v236.js");
  assert.match(app, /dailyGoalsSummary\.innerHTML\s*=\s*`<details/);
  assert.match(app, /<div class="daily-plan-content daily-goals-summary stats-grid compact">/);
  assert.match(app, /<article class="stat-card planned-today-stat">/);
  assert.match(app, /<article class="stat-card realized-today-stat">/);
  assert.match(app, /<article class="stat-card historical-time-stat">/);
});

test("o CSS atinge a grade aninhada real, e não filhos diretos inexistentes", () => {
  const css = read(CSS_FILE);
  assert.match(css, /#dailyGoalsSummary \.daily-goals-summary > \.stat-card:nth-child\(1\)/);
  assert.match(css, /#dailyGoalsSummary \.daily-goals-summary > \.stat-card:nth-child\(-n\+7\)/);
  assert.doesNotMatch(css, /#dailyGoalsSummary\s*>\s*\.stat-card/);
});

test("os sete cartões mantêm a paleta semântica", () => {
  const css = read(CSS_FILE);
  for (const color of ["#2dd4bf", "#fb923c", "#58b8ff", "#34d399", "#f7d462", "#a78bfa", "#d9e7ef"]) {
    assert.ok(css.includes(color), `Cor ausente: ${color}`);
  }
});

test("todos os cartões usam fundo elegante uniforme", () => {
  const css = read(CSS_FILE);
  assert.match(css, /background:\s*linear-gradient\(145deg, #103954 0%, #0b2b43 100%\)\s*!important/);
  assert.match(css, /border-left:\s*7px solid var\(--daily-nested-accent\)\s*!important/);
  assert.match(css, /color:\s*var\(--daily-nested-accent\)\s*!important/);
});

test("os fundos antigos de planejado, realizado e histórico são sobrescritos explicitamente", () => {
  const css = read(CSS_FILE);
  assert.match(css, /\.planned-today-stat,[\s\S]*\.realized-today-stat,[\s\S]*\.historical-time-stat\s*\{/);
  assert.match(css, /background-color:\s*#0b2b43\s*!important/);
});

test("o HTML carrega V252 diretamente depois da V251", () => {
  const html = read("index.html");
  const v251 = html.indexOf("aldusDailySummaryElegantDirectV251");
  const v252 = html.indexOf("aldusDailySummaryElegantNestedV252");
  assert.ok(v251 >= 0, "V251 precisa continuar carregada.");
  assert.ok(v252 > v251, "V252 precisa vir depois da V251.");
  assert.match(html, new RegExp(`${CSS_FILE.replaceAll(".", "\\.")}\\?v=${VERSION}`));
  assert.equal((html.match(/aldusDailySummaryElegantNestedV252/g) || []).length, 1);
});

test("o service worker renova cache e inclui V252", () => {
  const worker = read("service-worker-v236.js");
  assert.match(worker, /daily-summary-elegant-nested-v252/);
  assert.match(worker, /const DAILY_SUMMARY_NESTED_VERSION = "20260805-daily-summary-elegant-nested-v252"/);
  assert.match(worker, /DAILY_SUMMARY_NESTED_STYLESHEET,/);
  assert.match(worker, /id="aldusDailySummaryElegantNestedV252"/);
  assert.match(worker, /x-aldus-daily-summary-nested/);
});

test("a estrutura CSS está íntegra", () => {
  const css = read(CSS_FILE);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
