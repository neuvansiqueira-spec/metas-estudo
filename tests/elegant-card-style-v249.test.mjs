import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-elegant-card-style-v249";
const CSS = "elegant-card-style-v249.css";
const read = (path) => fs.readFileSync(path, "utf8");

test("arquivos publicados na raiz e em docs permanecem idênticos", () => {
  assert.equal(read(CSS), read(`docs/${CSS}`));
  assert.equal(read("index.html"), read("docs/index.html"));
  assert.equal(read("service-worker-v236.js"), read("docs/service-worker-v236.js"));
});

test("o novo estilo usa fundo azul-escuro uniforme em todos os grupos", () => {
  const css = read(CSS);
  assert.match(css, /background:\s*linear-gradient\(145deg, #103954 0%, #0b2b43 100%\)\s*!important/);
  assert.match(css, /#dashboardGoalsScaleSummary/);
  assert.match(css, /#todayGoalsTotal/);
  assert.match(css, /#centralGoalsCards/);
  assert.match(css, /data-central-period/);
});

test("as cores continuam apenas como destaque sem fundos temáticos fortes", () => {
  const css = read(CSS);
  for (const color of ["#a78bfa", "#f7d462", "#58b8ff", "#d9e7ef", "#34d399", "#fb923c", "#2dd4bf"]) {
    assert.ok(css.includes(color), `Cor semântica ausente: ${color}`);
  }
  assert.match(css, /border-left:\s*7px solid var\(--elegant-accent\)\s*!important/);
  assert.match(css, /color:\s*var\(--elegant-accent\)\s*!important/);
  assert.doesNotMatch(css, /--elegant-bg/);
});

test("os textos auxiliares permanecem neutros", () => {
  const css = read(CSS);
  assert.match(css, /color:\s*#c9dceb\s*!important/);
  assert.match(css, /color:\s*#aec7da\s*!important/);
  assert.match(css, /color:\s*#f7fbff\s*!important/);
});

test("o HTML carrega V249 depois das paletas anteriores", () => {
  const html = read("index.html");
  const v248 = html.indexOf("aldusCentralPeriodCardsV248");
  const v249 = html.indexOf("aldusElegantCardStyleV249");
  assert.ok(v248 >= 0, "Paleta V248 precisa continuar carregada.");
  assert.ok(v249 > v248, "V249 precisa vir depois da V248 para prevalecer.");
  assert.match(html, new RegExp(`${CSS.replace(".", "\\.")}\\?v=${VERSION}`));
  assert.equal((html.match(/aldusElegantCardStyleV249/g) || []).length, 1);
});

test("o service worker renova cache e injeta a V249", () => {
  const worker = read("service-worker-v236.js");
  assert.match(worker, /elegant-card-style-v249/);
  assert.match(worker, /const ELEGANT_CARD_VERSION = "20260805-elegant-card-style-v249"/);
  assert.match(worker, /ELEGANT_CARD_STYLESHEET,/);
  assert.match(worker, /id="aldusElegantCardStyleV249"/);
  assert.match(worker, /x-aldus-elegant-card-style/);
});

test("a estrutura CSS está íntegra", () => {
  const css = read(CSS);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
