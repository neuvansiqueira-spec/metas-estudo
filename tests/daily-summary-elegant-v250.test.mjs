import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-daily-summary-elegant-v250";
const read = (path) => fs.readFileSync(path, "utf8");

test("raiz e docs permanecem idênticos", () => {
  for (const path of [
    "daily-summary-elegant-v250.css",
    "daily-summary-elegant-v250.js",
    "index.html",
    "service-worker-v236.js"
  ]) assert.equal(read(path), read(`docs/${path}`));
});

test("o alvo real do Resumo do Dia existe", () => {
  const html = read("index.html");
  assert.match(html, /id="view-metas-do-dia"/);
  assert.match(html, /id="dailyGoalsSummary"/);
  assert.match(html, /Resumo do dia/);
});

test("o marcador identifica os sete cartões por conteúdo", () => {
  const source = read("daily-summary-elegant-v250.js");
  for (const kind of ["completed", "pending", "planned", "realized", "history", "questions", "progress"]) {
    assert.ok(source.includes(`"${kind}"`), `Tipo ausente: ${kind}`);
  }
  assert.match(source, /document\.getElementById\("dailyGoalsSummary"\)/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /dataset\.dailySummaryKind/);
});

test("todos os cartões recebem fundo uniforme e apenas o destaque semântico", () => {
  const css = read("daily-summary-elegant-v250.css");
  assert.match(css, /background:\s*linear-gradient\(145deg, #103954 0%, #0b2b43 100%\)\s*!important/);
  assert.match(css, /border-left:\s*7px solid var\(--daily-accent\)\s*!important/);
  assert.match(css, /color:\s*var\(--daily-accent\)\s*!important/);
  assert.doesNotMatch(css, /#4a3a10|#2c260f/);
});

test("o Histórico mantém amarelo somente como destaque", () => {
  const css = read("daily-summary-elegant-v250.css");
  assert.match(css, /data-daily-summary-kind="history"[^\{]*\{[^\}]*--daily-accent:\s*#f7d462/);
  assert.match(css, /data-daily-summary-kind="history"[^\{]*\{[^\}]*--daily-border:\s*#d8ad2f/);
});

test("o HTML carrega CSS e JS V250 diretamente", () => {
  const html = read("index.html");
  assert.match(html, new RegExp(`daily-summary-elegant-v250\\.css\\?v=${VERSION}`));
  assert.match(html, new RegExp(`daily-summary-elegant-v250\\.js\\?v=${VERSION}`));
  assert.equal((html.match(/aldusDailySummaryElegantV250/g) || []).length, 1);
  assert.equal((html.match(/aldusDailySummaryElegantScriptV250/g) || []).length, 1);
  assert.ok(html.indexOf("aldusDailySummaryElegantV250") > html.indexOf("aldusElegantCardStyleV249"));
});

test("o service worker renova cache e inclui V250", () => {
  const worker = read("service-worker-v236.js");
  assert.match(worker, /daily-summary-elegant-v250/);
  assert.match(worker, /DAILY_SUMMARY_ELEGANT_STYLESHEET/);
  assert.match(worker, /DAILY_SUMMARY_ELEGANT_SCRIPT/);
  assert.match(worker, /x-aldus-daily-summary-elegant/);
});

test("estrutura CSS íntegra", () => {
  const css = read("daily-summary-elegant-v250.css");
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
