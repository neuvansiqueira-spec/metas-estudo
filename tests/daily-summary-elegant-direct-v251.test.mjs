import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-daily-summary-elegant-direct-v251";
const CSS_FILE = "daily-summary-elegant-direct-v251.css";
const read = (path) => fs.readFileSync(path, "utf8");

test("raiz e docs permanecem idênticos", () => {
  assert.equal(read(CSS_FILE), read(`docs/${CSS_FILE}`));
  assert.equal(read("index.html"), read("docs/index.html"));
  assert.equal(read("service-worker-v236.js"), read("docs/service-worker-v236.js"));
});

test("o CSS atinge diretamente o componente real sem depender de marcadores JavaScript", () => {
  const css = read(CSS_FILE);
  assert.match(css, /#view-metas-do-dia #dailyGoalsSummary > \.stat-card:nth-child\(1\)/);
  assert.match(css, /#view-metas-do-dia #dailyGoalsSummary > \.stat-card:nth-child\(-n\+7\)/);
  assert.match(css, /#dailyGoalsSummary > \.planned-today-stat/);
  assert.match(css, /#dailyGoalsSummary > \.realized-today-stat/);
  assert.doesNotMatch(css, /data-daily-summary-kind/);
});

test("os sete cartões mantêm a paleta semântica definida", () => {
  const css = read(CSS_FILE);
  const colors = ["#2dd4bf", "#fb923c", "#58b8ff", "#34d399", "#f7d462", "#a78bfa", "#d9e7ef"];
  for (const color of colors) assert.ok(css.includes(color), `Cor ausente: ${color}`);
});

test("todos os cartões usam o fundo elegante uniforme", () => {
  const css = read(CSS_FILE);
  assert.match(css, /background:\s*linear-gradient\(145deg, #103954 0%, #0b2b43 100%\)\s*!important/);
  assert.match(css, /background-color:\s*#0b2b43\s*!important/);
  assert.match(css, /border-left:\s*7px solid var\(--daily-direct-accent\)\s*!important/);
  assert.match(css, /color:\s*var\(--daily-direct-accent\)\s*!important/);
});

test("o Histórico e os cartões de tempo têm sobrescrita explícita dos fundos antigos", () => {
  const css = read(CSS_FILE);
  assert.match(css, /\.planned-today-stat,[\s\S]*\.realized-today-stat,[\s\S]*\.stat-card:nth-child\(5\)[\s\S]*background:/);
});

test("o HTML carrega a V251 diretamente depois da V250", () => {
  const html = read("index.html");
  const v250 = html.indexOf("aldusDailySummaryElegantV250");
  const v251 = html.indexOf("aldusDailySummaryElegantDirectV251");
  assert.ok(v250 >= 0, "V250 precisa continuar presente como histórico da correção anterior.");
  assert.ok(v251 > v250, "V251 deve ser carregada depois da V250 para prevalecer.");
  assert.match(html, new RegExp(`${CSS_FILE.replace(".", "\\.")}\\?v=${VERSION}`));
  assert.equal((html.match(/aldusDailySummaryElegantDirectV251/g) || []).length, 1);
});

test("o service worker renova cache e inclui a V251", () => {
  const worker = read("service-worker-v236.js");
  assert.match(worker, /daily-summary-elegant-direct-v251/);
  assert.match(worker, /const DAILY_SUMMARY_DIRECT_VERSION = "20260805-daily-summary-elegant-direct-v251"/);
  assert.match(worker, /DAILY_SUMMARY_DIRECT_STYLESHEET,/);
  assert.match(worker, /id="aldusDailySummaryElegantDirectV251"/);
  assert.match(worker, /x-aldus-daily-summary-direct/);
});

test("a estrutura CSS está íntegra", () => {
  const css = read(CSS_FILE);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
