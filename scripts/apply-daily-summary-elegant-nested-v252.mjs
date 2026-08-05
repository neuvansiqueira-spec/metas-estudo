import fs from "node:fs";

const VERSION = "20260805-daily-summary-elegant-nested-v252";
const CSS_FILE = "daily-summary-elegant-nested-v252.css";
const LINK_ID = "aldusDailySummaryElegantNestedV252";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<link\s+id=["']aldusDailySummaryElegantNestedV252["'][^>]*>\s*$/gim, "");

  const preferredAnchor = /(^\s*<link\s+id=["']aldusDailySummaryElegantDirectV251["'][^>]*>\s*$)/m;
  const fallbackAnchor = /(^\s*<link\s+id=["']aldusDailySummaryElegantV250["'][^>]*>\s*$)/m;
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
  source = removeMarkedBlock(source, "DAILY_SUMMARY_NESTED_V252_CONSTANTS");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_NESTED_V252_STYLE");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_NESTED_V252_HEADER");
  source = source
    .replace(/^\s*DAILY_SUMMARY_NESTED_STYLESHEET,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-daily-summary-elegant-nested-v252`;");

  const constants = `// BEGIN DAILY_SUMMARY_NESTED_V252_CONSTANTS\nconst DAILY_SUMMARY_NESTED_VERSION = "${VERSION}";\nconst DAILY_SUMMARY_NESTED_STYLESHEET = \`${CSS_FILE}?v=\${DAILY_SUMMARY_NESTED_VERSION}\`;\n// END DAILY_SUMMARY_NESTED_V252_CONSTANTS\n`;
  const constantsAnchor = /(\/\/ END DAILY_SUMMARY_DIRECT_V251_CONSTANTS\n)/;
  const fallbackConstantsAnchor = /(\/\/ END DAILY_SUMMARY_ELEGANT_V250_CONSTANTS\n)/;
  const chosenConstantsAnchor = constantsAnchor.test(source) ? constantsAnchor : fallbackConstantsAnchor;
  if (!chosenConstantsAnchor.test(source)) throw new Error(`Âncora V251/V250 não encontrada em ${filePath}.`);
  source = source.replace(chosenConstantsAnchor, `$1${constants}`);

  const assetsAnchor = /(\s+DAILY_SUMMARY_DIRECT_STYLESHEET,\n)/;
  const fallbackAssetsAnchor = /(\s+DAILY_SUMMARY_ELEGANT_SCRIPT,\n)/;
  const chosenAssetsAnchor = assetsAnchor.test(source) ? assetsAnchor : fallbackAssetsAnchor;
  if (!chosenAssetsAnchor.test(source)) throw new Error(`Lista de assets V251/V250 não encontrada em ${filePath}.`);
  source = source.replace(chosenAssetsAnchor, `$1  DAILY_SUMMARY_NESTED_STYLESHEET,\n`);

  const styleBlock = `\n  // BEGIN DAILY_SUMMARY_NESTED_V252_STYLE\n  if (!html.includes(DAILY_SUMMARY_NESTED_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${DAILY_SUMMARY_NESTED_STYLESHEET}" />\`);\n  }\n  // END DAILY_SUMMARY_NESTED_V252_STYLE\n`;
  const styleAnchor = /(\n\s*let patchedHtml = missingTags\.length === 0)/;
  if (!styleAnchor.test(source)) throw new Error(`Ponto de injeção de CSS não encontrado em ${filePath}.`);
  source = source.replace(styleAnchor, `${styleBlock}$1`);

  const headerBlock = `\n  // BEGIN DAILY_SUMMARY_NESTED_V252_HEADER\n  headers.set("x-aldus-daily-summary-nested", DAILY_SUMMARY_NESTED_VERSION);\n  // END DAILY_SUMMARY_NESTED_V252_HEADER\n`;
  const headerAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerAnchor.test(source)) throw new Error(`Ponto de cabeçalho não encontrado em ${filePath}.`);
  source = source.replace(headerAnchor, `${headerBlock}$1`);

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Resumo do Dia] Correção ${VERSION} aplicada à estrutura real #dailyGoalsSummary > details > .daily-goals-summary > .stat-card.`);
