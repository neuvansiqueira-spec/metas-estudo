import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-central-goals-palette-v245";
const CSS_FILE = "central-goals-palette-v245.css";
const DOCS_CSS_FILE = `docs/${CSS_FILE}`;
const SW_FILE = "service-worker-v236.js";
const DOCS_SW_FILE = `docs/${SW_FILE}`;
const INDEX_FILE = "index.html";
const DOCS_INDEX_FILE = "docs/index.html";
const DIRECT_LINK = `<link id="aldusCentralGoalsPaletteV245" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function paletteBlock(css, child) {
  const expression = new RegExp(
    `#centralGoalsCards\\s*>\\s*:nth-child\\(${child}\\)\\s*\\{([\\s\\S]*?)\\}`,
    "m"
  );
  const match = css.match(expression);
  assert.ok(match, `Cartão ${child} precisa ter bloco de paleta próprio.`);
  return match[1];
}

test("arquivos publicados na raiz e em docs permanecem idênticos", () => {
  assert.equal(read(CSS_FILE), read(DOCS_CSS_FILE));
  assert.equal(read(SW_FILE), read(DOCS_SW_FILE));
  assert.equal(read(INDEX_FILE), read(DOCS_INDEX_FILE));
});

test("a paleta usa as quatro cores solicitadas", () => {
  const css = read(CSS_FILE);
  const expected = [
    { child: 1, name: "Hoje — roxo", accent: "#a78bfa", border: "#8b5cf6" },
    { child: 2, name: "Meta de Hoje — amarelo", accent: "#f7d462", border: "#d8ad2f" },
    { child: 3, name: "Meta da Semana — azul", accent: "#58b8ff", border: "#279ddd" },
    { child: 4, name: "Meta do Mês — cinza-gelo", accent: "#d9e7ef", border: "#a9c0cd" }
  ];

  for (const item of expected) {
    const block = paletteBlock(css, item.child);
    assert.match(block, new RegExp(`--central-card-accent:\\s*${item.accent}`, "i"), item.name);
    assert.match(block, new RegExp(`--central-card-border:\\s*${item.border}`, "i"), item.name);
    assert.match(block, /--central-card-bg:\s*linear-gradient/i, item.name);
  }
});

test("a aplicação visual vence o tema antigo sem atingir Plantão e Folga", () => {
  const css = read(CSS_FILE);
  const shared = css.match(/#centralGoalsCards\s*>\s*:nth-child\(-n\+4\)\s*\{([\s\S]*?)\}/m);
  assert.ok(shared, "Precisa existir regra compartilhada somente para os quatro primeiros cartões.");
  assert.match(shared[1], /border-left:\s*7px\s+solid\s+var\(--central-card-accent\)\s*!important/i);
  assert.match(shared[1], /background:\s*var\(--central-card-bg\)\s*!important/i);
  assert.match(shared[1], /border:\s*1px\s+solid\s+var\(--central-card-border\)\s*!important/i);
  assert.doesNotMatch(css, /:nth-child\(5\)\s*\{[\s\S]*--central-card-/m);
  assert.doesNotMatch(css, /:nth-child\(6\)\s*\{[\s\S]*--central-card-/m);
});

test("o HTML carrega o CSS diretamente, sem depender do service worker", () => {
  for (const path of [INDEX_FILE, DOCS_INDEX_FILE]) {
    const html = read(path);
    assert.ok(html.includes(DIRECT_LINK), `${path} precisa carregar a paleta diretamente.`);
    assert.equal(html.split("aldusCentralGoalsPaletteV245").length - 1, 1, `${path} não pode duplicar o link.`);
    assert.ok(
      html.indexOf("aldusAppBundleStyles") < html.indexOf("aldusCentralGoalsPaletteV245"),
      `${path}: a paleta deve vir depois do CSS principal para ter precedência.`
    );
  }
});

test("o service worker também publica e injeta a paleta como redundância", () => {
  const worker = read(SW_FILE);
  assert.match(worker, /CACHE_NAME\s*=\s*`metas-estudo-\$\{CURRENT_VERSION\}-central-goals-palette-v245`/);
  assert.match(worker, /const CENTRAL_GOALS_PALETTE_VERSION\s*=\s*"20260805-central-goals-palette-v245"/);
  assert.match(worker, /CENTRAL_GOALS_PALETTE_STYLESHEET,/);
  assert.match(worker, /html\.includes\("central-goals-palette-v245\.css"\)/);
  assert.match(worker, /id=\\"aldusCentralGoalsPaletteV245\\"/);
  assert.match(worker, /x-aldus-central-goals-palette/);
});

test("estrutura CSS básica está íntegra", () => {
  const css = read(CSS_FILE);
  const openings = (css.match(/\{/g) || []).length;
  const closings = (css.match(/\}/g) || []).length;
  assert.equal(openings, closings, "Quantidade de chaves CSS precisa ser equilibrada.");
  assert.ok(css.includes("#view-central-metas"));
  assert.ok(css.includes("#centralGoalsCards"));
});
