import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-central-period-cards-v248";
const read = (path) => fs.readFileSync(path, "utf8");

test("raiz e docs permanecem idênticos", () => {
  for (const path of [
    "central-goals-period-palette-v248.css",
    "central-goals-period-palette-v248.js",
    "index.html",
    "service-worker-v236.js"
  ]) assert.equal(read(path), read(`docs/${path}`));
});

test("o HTML contém a área real da Central de Metas", () => {
  const html = read("index.html");
  assert.match(html, /id="view-central-metas"/);
  assert.match(html, /Hoje • Esta semana • Este mês/);
  assert.match(html, /id="centralGoalsCards"/);
});

test("o JavaScript identifica os três cartões pelo título visível", () => {
  const source = read("central-goals-period-palette-v248.js");
  assert.match(source, /\["Hoje", "today"\]/);
  assert.match(source, /\["Esta semana", "week"\]/);
  assert.match(source, /\["Este mês", "month"\]/);
  assert.match(source, /dataset\.centralPeriod/);
  assert.match(source, /MutationObserver/);
});

test("a paleta usa as cores normais já adotadas no site", () => {
  const css = read("central-goals-period-palette-v248.css");
  assert.match(css, /data-central-period="today"[\s\S]*#a78bfa/);
  assert.match(css, /data-central-period="week"[\s\S]*#58b8ff/);
  assert.match(css, /data-central-period="month"[\s\S]*#d9e7ef/);
  assert.doesNotMatch(css, /nth-child/);
  assert.match(css, /Os botões mantêm o azul padrão do site/);
});

test("o HTML carrega CSS e JS V248 diretamente", () => {
  const html = read("index.html");
  assert.match(html, new RegExp(`central-goals-period-palette-v248\\.css\\?v=${VERSION}`));
  assert.match(html, new RegExp(`central-goals-period-palette-v248\\.js\\?v=${VERSION}`));
  assert.equal((html.match(/aldusCentralPeriodCardsV248/g) || []).length, 1);
  assert.equal((html.match(/aldusCentralPeriodCardsScriptV248/g) || []).length, 1);
});

test("o service worker usa cache e fallback V248", () => {
  const worker = read("service-worker-v236.js");
  assert.match(worker, /central-period-cards-v248/);
  assert.match(worker, /CENTRAL_PERIOD_CARDS_STYLESHEET/);
  assert.match(worker, /CENTRAL_PERIOD_CARDS_SCRIPT/);
  assert.match(worker, /x-aldus-central-period-cards/);
});

test("CSS possui chaves equilibradas", () => {
  const css = read("central-goals-period-palette-v248.css");
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
