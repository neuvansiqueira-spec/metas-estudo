import fs from "node:fs";

const VERSION = "20260805-daily-summary-elegant-v250";
const CSS_FILE = "daily-summary-elegant-v250.css";
const JS_FILE = "daily-summary-elegant-v250.js";
const LINK_ID = "aldusDailySummaryElegantV250";
const SCRIPT_ID = "aldusDailySummaryElegantScriptV250";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const SCRIPT_TAG = `  <script id="${SCRIPT_ID}" src="${JS_FILE}?v=${VERSION}"></script>`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html
    .replace(/^\s*<link\s+id=["']aldusDailySummaryElegantV250["'][^>]*>\s*$/gim, "")
    .replace(/^\s*<script\s+id=["']aldusDailySummaryElegantScriptV250["'][^>]*><\/script>\s*$/gim, "");

  const styleAnchor = /(^\s*<link\s+id=["']aldusElegantCardStyleV249["'][^>]*>\s*$)/m;
  const fallbackStyleAnchor = /(^\s*<link\s+id=["']aldusAppBundleStyles["'][^>]*>\s*$)/m;
  const chosenStyleAnchor = styleAnchor.test(html) ? styleAnchor : fallbackStyleAnchor;
  if (!chosenStyleAnchor.test(html)) throw new Error(`Âncora de CSS não encontrada em ${filePath}.`);
  html = html.replace(chosenStyleAnchor, `$1\n${LINK_TAG}`);

  if (!html.includes("</body>")) throw new Error(`Fechamento de body não encontrado em ${filePath}.`);
  html = html.replace("</body>", `${SCRIPT_TAG}\n</body>`);
  fs.writeFileSync(filePath, html, "utf8");
}

function removeMarkedBlock(source, marker) {
  return source.replace(new RegExp(`\\n?\\s*// BEGIN ${marker}[\\s\\S]*?// END ${marker}\\n?`, "g"), "\n");
}

function patchServiceWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_ELEGANT_V250_CONSTANTS");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_ELEGANT_V250_STYLE");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_ELEGANT_V250_SCRIPT");
  source = removeMarkedBlock(source, "DAILY_SUMMARY_ELEGANT_V250_HEADER");
  source = source
    .replace(/^\s*DAILY_SUMMARY_ELEGANT_STYLESHEET,\s*$/gm, "")
    .replace(/^\s*DAILY_SUMMARY_ELEGANT_SCRIPT,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-daily-summary-elegant-v250`;");

  const constants = `// BEGIN DAILY_SUMMARY_ELEGANT_V250_CONSTANTS\nconst DAILY_SUMMARY_ELEGANT_VERSION = "${VERSION}";\nconst DAILY_SUMMARY_ELEGANT_STYLESHEET = \`${CSS_FILE}?v=\${DAILY_SUMMARY_ELEGANT_VERSION}\`;\nconst DAILY_SUMMARY_ELEGANT_SCRIPT = \`${JS_FILE}?v=\${DAILY_SUMMARY_ELEGANT_VERSION}\`;\n// END DAILY_SUMMARY_ELEGANT_V250_CONSTANTS\n`;
  const constantsAnchor = /(\/\/ END ELEGANT_CARD_V249_CONSTANTS\n)/;
  const fallbackConstantsAnchor = /(const ELEGANT_CARD_STYLESHEET\s*=\s*`[^`]+`;\n)/;
  const chosenConstantsAnchor = constantsAnchor.test(source) ? constantsAnchor : fallbackConstantsAnchor;
  if (!chosenConstantsAnchor.test(source)) throw new Error(`Âncora de constantes não encontrada em ${filePath}.`);
  source = source.replace(chosenConstantsAnchor, `$1${constants}`);

  const assetsAnchor = /(\s+ELEGANT_CARD_STYLESHEET,\n)/;
  const fallbackAssetsAnchor = /(\s+CENTRAL_PERIOD_CARDS_SCRIPT,\n)/;
  const chosenAssetsAnchor = assetsAnchor.test(source) ? assetsAnchor : fallbackAssetsAnchor;
  if (!chosenAssetsAnchor.test(source)) throw new Error(`Âncora de assets não encontrada em ${filePath}.`);
  source = source.replace(chosenAssetsAnchor, `$1  DAILY_SUMMARY_ELEGANT_STYLESHEET,\n  DAILY_SUMMARY_ELEGANT_SCRIPT,\n`);

  const styleBlock = `\n  // BEGIN DAILY_SUMMARY_ELEGANT_V250_STYLE\n  if (!html.includes(DAILY_SUMMARY_ELEGANT_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${DAILY_SUMMARY_ELEGANT_STYLESHEET}" />\`);\n  }\n  // END DAILY_SUMMARY_ELEGANT_V250_STYLE\n`;
  const styleInsertAnchor = /(\n\s*let patchedHtml = missingTags\.length === 0)/;
  if (!styleInsertAnchor.test(source)) throw new Error(`Âncora de injeção de CSS não encontrada em ${filePath}.`);
  source = source.replace(styleInsertAnchor, `${styleBlock}$1`);

  const scriptBlock = `\n  // BEGIN DAILY_SUMMARY_ELEGANT_V250_SCRIPT\n  if (!patchedHtml.includes("${JS_FILE}")) {\n    const dailySummaryElegantScript = \`<script id="${SCRIPT_ID}" src="\${DAILY_SUMMARY_ELEGANT_SCRIPT}"><\\/script>\`;\n    patchedHtml = patchedHtml.includes("</body>")\n      ? patchedHtml.replace("</body>", \`  \${dailySummaryElegantScript}\\n</body>\`)\n      : \`\${patchedHtml}\\n\${dailySummaryElegantScript}\`;\n  }\n  // END DAILY_SUMMARY_ELEGANT_V250_SCRIPT\n`;
  const scriptInsertAnchor = /(\n\s*if \(!patchedHtml\.includes\("planning-integrity-loader-v235\.js"\)\) \{)/;
  if (!scriptInsertAnchor.test(source)) throw new Error(`Âncora de injeção de JS não encontrada em ${filePath}.`);
  source = source.replace(scriptInsertAnchor, `${scriptBlock}$1`);

  const headerBlock = `\n  // BEGIN DAILY_SUMMARY_ELEGANT_V250_HEADER\n  headers.set("x-aldus-daily-summary-elegant", DAILY_SUMMARY_ELEGANT_VERSION);\n  // END DAILY_SUMMARY_ELEGANT_V250_HEADER\n`;
  const headerInsertAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerInsertAnchor.test(source)) throw new Error(`Âncora de cabeçalho não encontrada em ${filePath}.`);
  source = source.replace(headerInsertAnchor, `${headerBlock}$1`);

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Resumo do Dia] Estilo elegante ${VERSION} aplicado ao componente real #dailyGoalsSummary.`);
