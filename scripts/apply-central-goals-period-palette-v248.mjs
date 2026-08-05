import fs from "node:fs";

const VERSION = "20260805-central-period-cards-v248";
const CSS_FILE = "central-goals-period-palette-v248.css";
const JS_FILE = "central-goals-period-palette-v248.js";
const LINK_ID = "aldusCentralPeriodCardsV248";
const SCRIPT_ID = "aldusCentralPeriodCardsScriptV248";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const SCRIPT_TAG = `  <script id="${SCRIPT_ID}" src="${JS_FILE}?v=${VERSION}"></script>`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html
    .replace(/^\s*<link\s+id=["']aldusCentralPeriodCardsV248["'][^>]*>\s*$/gim, "")
    .replace(/^\s*<script\s+id=["']aldusCentralPeriodCardsScriptV248["'][^>]*><\/script>\s*$/gim, "");

  const styleAnchor = /(^\s*<link\s+id=["']aldusDashboardTodayPaletteV247["'][^>]*>\s*$)/m;
  const fallbackAnchor = /(^\s*<link\s+id=["']aldusCentralGoalsPaletteV246["'][^>]*>\s*$)/m;
  const appAnchor = /(^\s*<link\s+id=["']aldusAppBundleStyles["'][^>]*>\s*$)/m;
  const anchor = styleAnchor.test(html) ? styleAnchor : fallbackAnchor.test(html) ? fallbackAnchor : appAnchor;
  if (!anchor.test(html)) throw new Error(`Âncora de CSS não encontrada em ${filePath}.`);
  html = html.replace(anchor, `$1\n${LINK_TAG}`);

  if (!html.includes("</body>")) throw new Error(`Fechamento de body não encontrado em ${filePath}.`);
  html = html.replace("</body>", `${SCRIPT_TAG}\n</body>`);
  fs.writeFileSync(filePath, html, "utf8");
}

function removeMarkedBlock(source, marker) {
  const expression = new RegExp(`\\n?\\s*// BEGIN ${marker}[\\s\\S]*?// END ${marker}\\n?`, "g");
  return source.replace(expression, "\n");
}

function patchServiceWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = removeMarkedBlock(source, "CENTRAL_PERIOD_V248_CONSTANTS");
  source = removeMarkedBlock(source, "CENTRAL_PERIOD_V248_STYLE");
  source = removeMarkedBlock(source, "CENTRAL_PERIOD_V248_SCRIPT");
  source = removeMarkedBlock(source, "CENTRAL_PERIOD_V248_HEADER");
  source = source
    .replace(/^\s*CENTRAL_PERIOD_CARDS_STYLESHEET,\s*$/gm, "")
    .replace(/^\s*CENTRAL_PERIOD_CARDS_SCRIPT,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-central-period-cards-v248`;");

  const constants = `// BEGIN CENTRAL_PERIOD_V248_CONSTANTS\nconst CENTRAL_PERIOD_CARDS_VERSION = "${VERSION}";\nconst CENTRAL_PERIOD_CARDS_STYLESHEET = \`${CSS_FILE}?v=\${CENTRAL_PERIOD_CARDS_VERSION}\`;\nconst CENTRAL_PERIOD_CARDS_SCRIPT = \`${JS_FILE}?v=\${CENTRAL_PERIOD_CARDS_VERSION}\`;\n// END CENTRAL_PERIOD_V248_CONSTANTS\n`;
  const constantsAnchor = /(const DASHBOARD_TODAY_PALETTE_STYLESHEET\s*=\s*`[^`]+`;\n)/;
  const fallbackConstantsAnchor = /(const CENTRAL_GOALS_PALETTE_STYLESHEET\s*=\s*`[^`]+`;\n)/;
  const chosenConstantsAnchor = constantsAnchor.test(source) ? constantsAnchor : fallbackConstantsAnchor;
  if (!chosenConstantsAnchor.test(source)) throw new Error(`Âncora de constantes não encontrada em ${filePath}.`);
  source = source.replace(chosenConstantsAnchor, `$1${constants}`);

  const assetsAnchor = /(\s+DASHBOARD_TODAY_PALETTE_STYLESHEET,\n)/;
  const fallbackAssetsAnchor = /(\s+CENTRAL_GOALS_PALETTE_STYLESHEET,\n)/;
  const chosenAssetsAnchor = assetsAnchor.test(source) ? assetsAnchor : fallbackAssetsAnchor;
  if (!chosenAssetsAnchor.test(source)) throw new Error(`Âncora de assets não encontrada em ${filePath}.`);
  source = source.replace(chosenAssetsAnchor, `$1  CENTRAL_PERIOD_CARDS_STYLESHEET,\n  CENTRAL_PERIOD_CARDS_SCRIPT,\n`);

  const styleBlock = `\n  // BEGIN CENTRAL_PERIOD_V248_STYLE\n  if (!html.includes(CENTRAL_PERIOD_CARDS_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${CENTRAL_PERIOD_CARDS_STYLESHEET}" />\`);\n  }\n  // END CENTRAL_PERIOD_V248_STYLE\n`;
  const styleInsertAnchor = /(\n\s*let patchedHtml = missingTags\.length === 0)/;
  if (!styleInsertAnchor.test(source)) throw new Error(`Âncora de injeção de CSS não encontrada em ${filePath}.`);
  source = source.replace(styleInsertAnchor, `${styleBlock}$1`);

  const scriptBlock = `\n  // BEGIN CENTRAL_PERIOD_V248_SCRIPT\n  if (!patchedHtml.includes("${JS_FILE}")) {\n    const centralPeriodScript = \`<script id="${SCRIPT_ID}" src="\${CENTRAL_PERIOD_CARDS_SCRIPT}"><\\/script>\`;\n    patchedHtml = patchedHtml.includes("</body>")\n      ? patchedHtml.replace("</body>", \`  \${centralPeriodScript}\\n</body>\`)\n      : \`\${patchedHtml}\\n\${centralPeriodScript}\`;\n  }\n  // END CENTRAL_PERIOD_V248_SCRIPT\n`;
  const scriptInsertAnchor = /(\n\s*if \(!patchedHtml\.includes\("planning-integrity-loader-v235\.js"\)\) \{)/;
  if (!scriptInsertAnchor.test(source)) throw new Error(`Âncora de injeção de script não encontrada em ${filePath}.`);
  source = source.replace(scriptInsertAnchor, `${scriptBlock}$1`);

  const headerBlock = `\n  // BEGIN CENTRAL_PERIOD_V248_HEADER\n  headers.set("x-aldus-central-period-cards", CENTRAL_PERIOD_CARDS_VERSION);\n  // END CENTRAL_PERIOD_V248_HEADER\n`;
  const headerInsertAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerInsertAnchor.test(source)) throw new Error(`Âncora de cabeçalho não encontrada em ${filePath}.`);
  source = source.replace(headerInsertAnchor, `${headerBlock}$1`);

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Central de Metas] Paleta ${VERSION} aplicada por título aos cartões Hoje, Esta semana e Este mês.`);
