import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VERSION = "20260805-dashboard-hoje-cores-v247";
const CSS_FILE = "dashboard-today-palette-v247.css";
const DOCS_CSS_FILE = `docs/${CSS_FILE}`;
const INDEX_FILE = "index.html";
const DOCS_INDEX_FILE = "docs/index.html";
const SW_FILE = "service-worker-v236.js";
const DOCS_SW_FILE = `docs/${SW_FILE}`;
const DIRECT_LINK = `<link id="aldusDashboardTodayPaletteV247" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function paletteBlock(css, id) {
  const expression = new RegExp(
    `\\.stat-card:has\\(> strong#${id}\\)\\s*\\{([\\s\\S]*?)\\}`,
    "m"
  );
  const match = css.match(expression);
  assert.ok(match, `O cartão ${id} precisa ter bloco de paleta próprio.`);
  return match[1];
}

test("arquivos da raiz e de docs permanecem idênticos", () => {
  assert.equal(read(CSS_FILE), read(DOCS_CSS_FILE));
  assert.equal(read(INDEX_FILE), read(DOCS_INDEX_FILE));
  assert.equal(read(SW_FILE), read(DOCS_SW_FILE));
});

test("os seis cartões visíveis existem no HTML real", () => {
  const html = read(INDEX_FILE);
  for (const id of [
    "todayGoalsTotal",
    "dashboardTodayGoal",
    "todayHours",
    "dashboardTodayRemaining",
    "todayPendingGoals",
    "todayDoneGoals"
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `ID ${id} ausente do HTML real.`);
  }
});

test("cada cartão recebe a cor solicitada ou semanticamente apropriada", () => {
  const css = read(CSS_FILE);
  const expected = [
    { id: "todayGoalsTotal", name: "Plano do Dia — verde", accent: "#34d399", border: "#10b981" },
    { id: "dashboardTodayGoal", name: "Meta de horas hoje — amarelo", accent: "#f7d462", border: "#d8ad2f" },
    { id: "todayHours", name: "Tempo estudado hoje — azul", accent: "#58b8ff", border: "#279ddd" },
    { id: "dashboardTodayRemaining", name: "Tempo faltante hoje — cinza-gelo", accent: "#d9e7ef", border: "#a9c0cd" },
    { id: "todayPendingGoals", name: "Metas pendentes — laranja", accent: "#fb923c", border: "#ea580c" },
    { id: "todayDoneGoals", name: "Metas concluídas — turquesa", accent: "#2dd4bf", border: "#0d9488" }
  ];

  for (const item of expected) {
    const block = paletteBlock(css, item.id);
    assert.match(block, new RegExp(`--today-card-accent:\\s*${item.accent}`, "i"), item.name);
    assert.match(block, new RegExp(`--today-card-border:\\s*${item.border}`, "i"), item.name);
    assert.match(block, /--today-card-bg:\s*linear-gradient/i, item.name);
  }
});

test("as regras compartilhadas atingem os seis IDs reais", () => {
  const css = read(CSS_FILE);
  for (const id of [
    "todayGoalsTotal",
    "dashboardTodayGoal",
    "todayHours",
    "dashboardTodayRemaining",
    "todayPendingGoals",
    "todayDoneGoals"
  ]) {
    assert.match(css, new RegExp(`\\.stat-card:has\\(> strong#${id}\\)`));
  }
  assert.match(css, /border-left:\s*7px\s+solid\s+var\(--today-card-accent\)\s*!important/i);
  assert.match(css, /background:\s*var\(--today-card-bg\)\s*!important/i);
});

test("o HTML carrega a V247 diretamente depois da paleta da Central", () => {
  for (const path of [INDEX_FILE, DOCS_INDEX_FILE]) {
    const html = read(path);
    assert.ok(html.includes(DIRECT_LINK), `${path} precisa carregar a V247 diretamente.`);
    assert.equal(html.split("aldusDashboardTodayPaletteV247").length - 1, 1, `${path} não pode duplicar a V247.`);
    assert.ok(
      html.indexOf("aldusCentralGoalsPaletteV246") < html.indexOf("aldusDashboardTodayPaletteV247"),
      `${path}: a V247 deve vir após a paleta da Central.`
    );
  }
});

test("o service worker usa cache novo, pré-carrega e injeta a V247", () => {
  const worker = read(SW_FILE);
  assert.match(worker, /CACHE_NAME\s*=\s*`metas-estudo-\$\{CURRENT_VERSION\}-dashboard-hoje-cores-v247`/);
  assert.match(worker, /const DASHBOARD_TODAY_PALETTE_VERSION\s*=\s*"20260805-dashboard-hoje-cores-v247"/);
  assert.match(worker, /DASHBOARD_TODAY_PALETTE_STYLESHEET,/);
  assert.match(worker, /html\.includes\(DASHBOARD_TODAY_PALETTE_VERSION\)/);
  assert.match(worker, /id="aldusDashboardTodayPaletteV247"/);
  assert.match(worker, /x-aldus-dashboard-today-palette/);
});

test("estrutura CSS está íntegra", () => {
  const css = read(CSS_FILE);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  assert.ok(css.includes("#view-dashboard"));
  assert.ok(css.includes(":has(> strong#todayGoalsTotal)"));
});
