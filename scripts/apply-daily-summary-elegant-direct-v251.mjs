import fs from "node:fs";

const VERSION = "20260805-daily-summary-elegant-direct-v251";
const CSS_FILE = "daily-summary-elegant-direct-v251.css";
const LINK_ID = "aldusDailySummaryElegantDirectV251";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<link\s+id=["']aldusDailySummaryElegantDirectV251["'][^>]*>\s*$/gim, "");

  const preferredAnchor = /(^\s*<link\s+id=["']aldusDailySummaryElegantV250["'][^>]*>\s*$)/m;
  const fallbackAnchor = /(^\s*<link\s+id=["']aldusElegantCardStyleV249["'][^>]*>\s*$)/m;
  if (!preferredAnchor.test(html) && !fallbackAnchor.test(html)) {
    throw new Error(`Âncora da paleta anterior não encontrada em ${filePath}.`);
  }
  const anchor = preferredAnchor.test(html) ? preferredAnchor : fallbackAnchor;
  html = html.replace(anchor, `$1\n${LINK_TAG}`);
  fs.writeFileSync(filePath, html, "utf8");
}

function removeMarkedBlock(source, marker) {
  return source.replace(new RegExp(`\\n?\\s*// BEGIN ${marker}[\\s\\S]*?// END ${marker}\\n?`, "g"), "\n");
}

function patchServiceWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_DIRECT_V251_CONSTANTS");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_DIRECT_V251_STYLE");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_DIRECT_V251_HEADER");
  source = source
    .replace(/^\s*DAILY_SUMMARY_DIRECT_STYLESHEET,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-daily-summary-elegant-direct-v251`;");

  const constants = `// BEGIN DAILY_SUMMARY_DIRECT_V251_CONSTANTS\nconst DAILY_SUMMARY_DIRECT_VERSION = "${VERSION}";\nconst DAILY_SUMMARY_DIRECT_STYLESHEET = \`${CSS_FILE}?v=\${DAILY_SUMMARY_DIRECT_VERSION}\`;\n// END DAILY_SUMMARY_DIRECT_V251_CONSTANTS\n`;
  const constantsAnchor = /(\/\/ END DAILY_SUMMARY_ELEGANT_V250_CONSTANTS\n)/;
  if (!constantsAnchor.test(source)) throw new Error(`Âncora V250 não encontrada em ${filePath}.`);
  source = source.replace(constantsAnchor, `$1${constants}`);

  const assetsAnchor = /(\s+DAILY_SUMMARY_ELEGANT_SCRIPT,\n)/;
  if (!assetsAnchor.test(source)) throw new Error(`Lista de assets V250 não encontrada em ${filePath}.`);
  source = source.replace(assetsAnchor, `$1  DAILY_SUMMARY_DIRECT_STYLESHEET,\n`);

  const styleBlock = `\n  // BEGIN DAILY_SUMMARY_DIRECT_V251_STYLE\n  if (!html.includes(DAILY_SUMMARY_DIRECT_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${DAILY_SUMMARY_DIRECT_STYLESHEET}" />\`);\n  }\n  // END DAILY_SUMMARY_DIRECT_V251_STYLE\n`;
  const styleAnchor = /(\n\s*let patchedHtml = missingTags\.length === 0)/;
  if (!styleAnchor.test(source)) throw new Error(`Ponto de injeção de CSS não encontrado em ${filePath}.`);
  source = source.replace(styleAnchor, `${styleBlock}$1`);

  const headerBlock = `\n  // BEGIN DAILY_SUMMARY_DIRECT_V251_HEADER\n  headers.set("x-aldus-daily-summary-direct", DAILY_SUMMARY_DIRECT_VERSION);\n  // END DAILY_SUMMARY_DIRECT_V251_HEADER\n`;
  const headerAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerAnchor.test(source)) throw new Error(`Ponto de cabeçalho não encontrado em ${filePath}.`);
  source = source.replace(headerAnchor, `${headerBlock}$1`);

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Resumo do Dia] Correção direta ${VERSION} aplicada a #dailyGoalsSummary por nth-child e classes reais.`);
