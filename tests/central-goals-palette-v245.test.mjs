import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-dashboard-central-metas-cores-v246";
const CSS_FILE = "central-goals-palette-v245.css";
const DOCS_CSS_FILE = `docs/${CSS_FILE}`;
const SW_FILE = "service-worker-v236.js";
const DOCS_SW_FILE = `docs/${SW_FILE}`;
const DAILY_FILE = "daily-summary-time-format-v243.js";
const DOCS_DAILY_FILE = `docs/${DAILY_FILE}`;
const INDEX_FILE = "index.html";
const DOCS_INDEX_FILE = "docs/index.html";
const DIRECT_LINK = `<link id="aldusCentralGoalsPaletteV246" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function paletteBlock(css, child) {
  const expression = new RegExp(
    `#dashboardGoalsScaleSummary\\s*>\\s*\\.stat-card:nth-child\\(${child}\\)\\s*\\{([\\s\\S]*?)\\}`,
    "m"
  );
  const match = css.match(expression);
  assert.ok(match, `Cartão ${child} precisa ter bloco de paleta próprio no painel realmente exibido.`);
  return match[1];
}

test("arquivos publicados na raiz e em docs permanecem idênticos", () => {
  assert.equal(read(CSS_FILE), read(DOCS_CSS_FILE));
  assert.equal(read(SW_FILE), read(DOCS_SW_FILE));
  assert.equal(read(DAILY_FILE), read(DOCS_DAILY_FILE));
  assert.equal(read(INDEX_FILE), read(DOCS_INDEX_FILE));
});

test("o aplicativo realmente renderiza seis cartões em dashboardGoalsScaleSummary", () => {
  const app = read("app-v236.js");
  assert.match(app, /dashboardGoalsScaleSummary\.innerHTML/);
  assert.match(app, /<span>Hoje<\/span>/);
  assert.match(app, /<span>Meta de hoje<\/span>/i);
  assert.match(app, /<span>Meta da semana<\/span>/i);
  assert.match(app, /<span>Meta do mês<\/span>/i);
  assert.match(app, /<span>Próximo plantão<\/span>/i);
  assert.match(app, /<span>Próxima folga<\/span>/i);
});

test("a paleta usa as quatro cores solicitadas no alvo correto", () => {
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

test("a aplicação visual alcança somente os quatro primeiros cartões", () => {
  const css = read(CSS_FILE);
  const shared = css.match(/#dashboardGoalsScaleSummary\s*>\s*\.stat-card:nth-child\(-n\+4\)\s*\{([\s\S]*?)\}/m);
  assert.ok(shared, "Precisa existir regra compartilhada para os quatro primeiros cartões do resumo.");
  assert.match(shared[1], /border-left:\s*7px\s+solid\s+var\(--central-card-accent\)\s*!important/i);
  assert.match(shared[1], /background:\s*var\(--central-card-bg\)\s*!important/i);
  assert.match(shared[1], /border:\s*1px\s+solid\s+var\(--central-card-border\)\s*!important/i);
  assert.doesNotMatch(css, /\.stat-card:nth-child\(5\)\s*\{[\s\S]*--central-card-/m);
  assert.doesNotMatch(css, /\.stat-card:nth-child\(6\)\s*\{[\s\S]*--central-card-/m);
  assert.doesNotMatch(css, /#centralGoalsCards\s*>/);
});

test("o HTML carrega a versão V246 diretamente e sem duplicação", () => {
  for (const path of [INDEX_FILE, DOCS_INDEX_FILE]) {
    const html = read(path);
    assert.ok(html.includes(DIRECT_LINK), `${path} precisa carregar a paleta V246 diretamente.`);
    assert.equal(html.split("aldusCentralGoalsPaletteV246").length - 1, 1, `${path} não pode duplicar o link V246.`);
    assert.doesNotMatch(html, /aldusCentralGoalsPaletteV245/);
    assert.match(html, /daily-summary-time-format-hotfix3/);
    assert.ok(
      html.indexOf("aldusAppBundleStyles") < html.indexOf("aldusCentralGoalsPaletteV246"),
      `${path}: a paleta deve vir depois do CSS principal para ter precedência.`
    );
  }
});

test("o fallback em JavaScript usa o mesmo alvo e a mesma versão", () => {
  const source = read(DAILY_FILE);
  assert.match(source, /daily-summary-time-format-hotfix3/);
  assert.match(source, /aldusCentralGoalsPaletteV246/);
  assert.match(source, /20260805-dashboard-central-metas-cores-v246/);
  assert.match(source, /#dashboardGoalsScaleSummary > \.stat-card:nth-child\(1\)/);
  assert.doesNotMatch(source, /#view-central-metas #centralGoalsCards/);
});

test("o service worker força cache novo e injeta a versão correta", () => {
  const worker = read(SW_FILE);
  assert.match(worker, /CACHE_NAME\s*=\s*`metas-estudo-\$\{CURRENT_VERSION\}-dashboard-central-metas-cores-v246`/);
  assert.match(worker, /const CENTRAL_GOALS_PALETTE_VERSION\s*=\s*"20260805-dashboard-central-metas-cores-v246"/);
  assert.match(worker, /CENTRAL_GOALS_PALETTE_STYLESHEET,/);
  assert.match(worker, /html\.includes\(CENTRAL_GOALS_PALETTE_VERSION\)/);
  assert.match(worker, /id="aldusCentralGoalsPaletteV246"/);
  assert.match(worker, /x-aldus-central-goals-palette/);
});

test("estrutura CSS básica está íntegra", () => {
  const css = read(CSS_FILE);
  const openings = (css.match(/\{/g) || []).length;
  const closings = (css.match(/\}/g) || []).length;
  assert.equal(openings, closings, "Quantidade de chaves CSS precisa ser equilibrada.");
  assert.ok(css.includes("#dashboardGoalsScaleSummary"));
  assert.ok(css.includes(".stat-card"));
});
