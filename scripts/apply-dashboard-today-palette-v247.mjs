import fs from "node:fs";

const VERSION = "20260805-dashboard-hoje-cores-v247";
const LINK_ID = "aldusDashboardTodayPaletteV247";
const CSS_FILE = "dashboard-today-palette-v247.css";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchIndex(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<link\s+id=["']aldusDashboardTodayPaletteV247["'][^>]*>\s*$/gim, "");

  const centralPalette = /(^\s*<link\s+id=["']aldusCentralGoalsPaletteV246["'][^>]*>\s*$)/m;
  const appStyles = /(^\s*<link\s+id=["']aldusAppBundleStyles["'][^>]*>\s*$)/m;
  const anchor = centralPalette.test(html) ? centralPalette : appStyles;

  if (!anchor.test(html)) {
    throw new Error(`Não foi possível localizar o ponto de inserção da paleta em ${filePath}.`);
  }

  html = html.replace(anchor, `$1\n${LINK_TAG}`);
  fs.writeFileSync(filePath, html, "utf8");
}

function patchWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");

  source = source.replace(
    /const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}-[^`]+`;/,
    'const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-dashboard-hoje-cores-v247`;'
  );

  const centralConstants = 'const CENTRAL_GOALS_PALETTE_STYLESHEET = `central-goals-palette-v245.css?v=${CENTRAL_GOALS_PALETTE_VERSION}`;';
  const todayConstants = `const DASHBOARD_TODAY_PALETTE_VERSION = "${VERSION}";\nconst DASHBOARD_TODAY_PALETTE_STYLESHEET = \`${CSS_FILE}?v=\${DASHBOARD_TODAY_PALETTE_VERSION}\`;`;

  if (/const DASHBOARD_TODAY_PALETTE_VERSION = "[^"]+";/.test(source)) {
    source = source
      .replace(/const DASHBOARD_TODAY_PALETTE_VERSION = "[^"]+";/, `const DASHBOARD_TODAY_PALETTE_VERSION = "${VERSION}";`)
      .replace(/const DASHBOARD_TODAY_PALETTE_STYLESHEET = `[^`]+`;/, `const DASHBOARD_TODAY_PALETTE_STYLESHEET = \`${CSS_FILE}?v=\${DASHBOARD_TODAY_PALETTE_VERSION}\`;`);
  } else {
    if (!source.includes(centralConstants)) throw new Error(`Constantes centrais não encontradas em ${filePath}.`);
    source = source.replace(centralConstants, `${centralConstants}\n${todayConstants}`);
  }

  if (!source.includes("DASHBOARD_TODAY_PALETTE_STYLESHEET,")) {
    source = source.replace(
      "  CENTRAL_GOALS_PALETTE_STYLESHEET,",
      "  CENTRAL_GOALS_PALETTE_STYLESHEET,\n  DASHBOARD_TODAY_PALETTE_STYLESHEET,"
    );
  }

  const todayInjection = `  if (!html.includes(DASHBOARD_TODAY_PALETTE_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${DASHBOARD_TODAY_PALETTE_STYLESHEET}" />\`);\n  }`;

  if (!source.includes("html.includes(DASHBOARD_TODAY_PALETTE_VERSION)")) {
    const centralBlock = /  if \(!html\.includes\(CENTRAL_GOALS_PALETTE_VERSION\)\) \{\n    missingTags\.push\(`<link id="aldusCentralGoalsPaletteV246" rel="stylesheet" href="\$\{CENTRAL_GOALS_PALETTE_STYLESHEET\}" \/>`\);\n  \}/;
    if (!centralBlock.test(source)) throw new Error(`Bloco de injeção central não encontrado em ${filePath}.`);
    source = source.replace(centralBlock, (match) => `${match}\n${todayInjection}`);
  }

  if (!source.includes('headers.set("x-aldus-dashboard-today-palette"')) {
    source = source.replace(
      '  headers.set("x-aldus-central-goals-palette", CENTRAL_GOALS_PALETTE_VERSION);',
      '  headers.set("x-aldus-central-goals-palette", CENTRAL_GOALS_PALETTE_VERSION);\n  headers.set("x-aldus-dashboard-today-palette", DASHBOARD_TODAY_PALETTE_VERSION);'
    );
  }

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchIndex(filePath);
for (const filePath of WORKER_FILES) patchWorker(filePath);

console.log(`[Dashboard Hoje] Paleta ${VERSION} aplicada aos seis cartões visíveis e preparada para publicação.`);
