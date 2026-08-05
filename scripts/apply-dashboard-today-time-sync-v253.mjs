import fs from "node:fs";

const VERSION = "20260805-dashboard-today-time-sync-v253";
const SCRIPT_FILE = "dashboard-today-time-sync-v253.js";
const SCRIPT_ID = "aldusDashboardTodayTimeSyncV253";
const SCRIPT_TAG = `  <script id="${SCRIPT_ID}" src="${SCRIPT_FILE}?v=${VERSION}&hotfix=dashboard-today-time-sync-hotfix1"></script>`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<script\s+id=["']aldusDashboardTodayTimeSyncV253["'][^>]*><\/script>\s*$/gim, "");

  const preferredAnchor = /(^\s*<script\s+id=["']aldusDailySummaryTimeFormatV243Direct["'][^>]*><\/script>\s*$)/m;
  const fallbackAnchor = /(^\s*<script\s+id=["']aldusAppBundleScript["'][^>]*><\/script>\s*$)/m;
  const anchor = preferredAnchor.test(html) ? preferredAnchor : fallbackAnchor;
  if (!anchor.test(html)) throw new Error(`Âncora de inicialização não encontrada em ${filePath}.`);

  html = html.replace(anchor, `$1\n${SCRIPT_TAG}`);
  fs.writeFileSync(filePath, html, "utf8");
}

function removeMarkedBlock(source, marker) {
  return source.replace(new RegExp(`\\n?\\s*// BEGIN ${marker}[\\s\\S]*?// END ${marker}\\n?`, "g"), "\n");
}

function patchServiceWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = removeMarkedBlock(source, "DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS");
  source = removeMarkedBlock(source, "DASHBOARD_TODAY_TIME_SYNC_V253_SCRIPT");
  source = removeMarkedBlock(source, "DASHBOARD_TODAY_TIME_SYNC_V253_HEADER");
  source = source
    .replace(/^\s*DASHBOARD_TODAY_TIME_SYNC_SCRIPT,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-dashboard-today-time-sync-v253`;");

  const constants = `// BEGIN DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS\nconst DASHBOARD_TODAY_TIME_SYNC_VERSION = "${VERSION}";\nconst DASHBOARD_TODAY_TIME_SYNC_SCRIPT = \`${SCRIPT_FILE}?v=\${DASHBOARD_TODAY_TIME_SYNC_VERSION}&hotfix=dashboard-today-time-sync-hotfix1\`;\n// END DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS\n`;
  const constantsAnchor = /(\/\/ END DAILY_SUMMARY_NESTED_V252_CONSTANTS\n)/;
  if (!constantsAnchor.test(source)) throw new Error(`Âncora V252 não encontrada em ${filePath}.`);
  source = source.replace(constantsAnchor, `$1${constants}`);

  const assetsAnchor = /(\s+DAILY_SUMMARY_NESTED_STYLESHEET,\n)/;
  if (!assetsAnchor.test(source)) throw new Error(`Lista de assets V252 não encontrada em ${filePath}.`);
  source = source.replace(assetsAnchor, `$1  DASHBOARD_TODAY_TIME_SYNC_SCRIPT,\n`);

  const scriptBlock = `\n  // BEGIN DASHBOARD_TODAY_TIME_SYNC_V253_SCRIPT\n  if (!patchedHtml.includes("${SCRIPT_FILE}")) {\n    const dashboardTodayTimeSyncScript = \`<script id="${SCRIPT_ID}" src="\${DASHBOARD_TODAY_TIME_SYNC_SCRIPT}"><\\/script>\`;\n    patchedHtml = patchedHtml.includes("</body>")\n      ? patchedHtml.replace("</body>", \`  \${dashboardTodayTimeSyncScript}\\n</body>\`)\n      : \`\${patchedHtml}\\n\${dashboardTodayTimeSyncScript}\`;\n  }\n  // END DASHBOARD_TODAY_TIME_SYNC_V253_SCRIPT\n`;
  const scriptAnchor = /(\n\s*if \(!patchedHtml\.includes\("planning-integrity-loader-v235\.js"\)\) \{)/;
  if (!scriptAnchor.test(source)) throw new Error(`Ponto de injeção de script não encontrado em ${filePath}.`);
  source = source.replace(scriptAnchor, `${scriptBlock}$1`);

  const headerBlock = `\n  // BEGIN DASHBOARD_TODAY_TIME_SYNC_V253_HEADER\n  headers.set("x-aldus-dashboard-today-time-sync", DASHBOARD_TODAY_TIME_SYNC_VERSION);\n  // END DASHBOARD_TODAY_TIME_SYNC_V253_HEADER\n`;
  const headerAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerAnchor.test(source)) throw new Error(`Ponto de cabeçalho não encontrado em ${filePath}.`);
  source = source.replace(headerAnchor, `${headerBlock}$1`);

  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Dashboard] Sincronização ${VERSION} aplicada ao #todayHours e ao Tempo realizado do Resumo do Dia.`);
