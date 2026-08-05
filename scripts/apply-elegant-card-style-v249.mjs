import fs from "node:fs";

const VERSION = "20260805-elegant-card-style-v249";
const CSS_FILE = "elegant-card-style-v249.css";
const LINK_ID = "aldusElegantCardStyleV249";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<link\s+id=["']aldusElegantCardStyleV249["'][^>]*>\s*$/gim, "");

  const preferredAnchor = /(^\s*<link\s+id=["']aldusCentralPeriodCardsV248["'][^>]*>\s*$)/m;
  const fallbackAnchor = /(^\s*<link\s+id=["']aldusDashboardTodayPaletteV247["'][^>]*>\s*$)/m;
  const baseAnchor = /(^\s*<link\s+id=["']aldusAppBundleStyles["'][^>]*>\s*$)/m;
  const anchor = preferredAnchor.test(html) ? preferredAnchor : fallbackAnchor.test(html) ? fallbackAnchor : baseAnchor;
  if (!anchor.test(html)) throw new Error(`Âncora de CSS não encontrada em ${filePath}.`);

  html = html.replace(anchor, `$1\n${LINK_TAG}`);
  fs.writeFileSync(filePath, html, "utf8");
}

function removeMarkedBlock(source, marker) {
  return source.replace(new RegExp(`\\n?\\s*// BEGIN ${marker}[\\s\\S]*?// END ${marker}\\n?`, "g"), "\n");
}

function patchServiceWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = removeMarkedBlock(source, "ELEGANT_CARD_V249_CONSTANTS");
  source = removeMarkedBlock(source, "ELEGANT_CARD_V249_STYLE");
  source = removeMarkedBlock(source, "ELEGANT_CARD_V249_HEADER");
  source = source
    .replace(/^\s*ELEGANT_CARD_STYLESHEET,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-elegant-card-style-v249`;");

  const constants = `// BEGIN ELEGANT_CARD_V249_CONSTANTS\nconst ELEGANT_CARD_VERSION = "${VERSION}";\nconst ELEGANT_CARD_STYLESHEET = \`${CSS_FILE}?v=\${ELEGANT_CARD_VERSION}\`;\n// END ELEGANT_CARD_V249_CONSTANTS\n`;
  const constantsAnchor = /(\/\/ END CENTRAL_PERIOD_V248_CONSTANTS\n)/;
  const fallbackConstantsAnchor = /(const DASHBOARD_TODAY_PALETTE_STYLESHEET\s*=\s*`[^`]+`;\n)/;
  const chosenConstantsAnchor = constantsAnchor.test(source) ? constantsAnchor : fallbackConstantsAnchor;
  if (!chosenConstantsAnchor.test(source)) throw new Error(`Âncora de constantes não encontrada em ${filePath}.`);
  source = source.replace(chosenConstantsAnchor, `$1${constants}`);

  const assetsAnchor = /(\s+CENTRAL_PERIOD_CARDS_SCRIPT,\n)/;
  const fallbackAssetsAnchor = /(\s+DASHBOARD_TODAY_PALETTE_STYLESHEET,\n)/;
  const chosenAssetsAnchor = assetsAnchor.test(source) ? assetsAnchor : fallbackAssetsAnchor;
  if (!chosenAssetsAnchor.test(source)) throw new Error(`Âncora de assets não encontrada em ${filePath}.`);
  source = source.replace(chosenAssetsAnchor, `$1  ELEGANT_CARD_STYLESHEET,\n`);

  const styleBlock = `\n  // BEGIN ELEGANT_CARD_V249_STYLE\n  if (!html.includes(ELEGANT_CARD_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${ELEGANT_CARD_STYLESHEET}" />\`);\n  }\n  // END ELEGANT_CARD_V249_STYLE\n`;
  const styleAnchor = /(\n\s*let patchedHtml = missingTags\.length === 0)/;
  if (!styleAnchor.test(source)) throw new Error(`Âncora de injeção não encontrada em ${filePath}.`);
  source = source.replace(styleAnchor, `${styleBlock}$1`);

  const headerBlock = `\n  // BEGIN ELEGANT_CARD_V249_HEADER\n  headers.set("x-aldus-elegant-card-style", ELEGANT_CARD_VERSION);\n  // END ELEGANT_CARD_V249_HEADER\n`;
  const headerAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerAnchor.test(source)) throw new Error(`Âncora de cabeçalho não encontrada em ${filePath}.`);
  source = source.replace(headerAnchor, `${headerBlock}$1`);

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Visual] Estilo elegante ${VERSION} aplicado aos cartões já coloridos.`);
