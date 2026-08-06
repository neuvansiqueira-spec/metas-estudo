import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VERSION = "20260805-dashboard-today-questions-sync-v257";
const FILE = "dashboard-today-questions-sync-v257.js";
const SCRIPT_URL = `${FILE}?v=${VERSION}&hotfix=question-bank-sessions1`;
const SCRIPT_TAG = `<script id="aldusDashboardTodayQuestionsSyncV257" src="${SCRIPT_URL}"></script>`;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(ROOT, relativePath), content, "utf8");
}

function patchIndex(relativePath) {
  let html = read(relativePath);
  if (html.includes(FILE)) return;

  const afterTimeSync = /(<script\s+id=["']aldusDashboardTodayTimeSyncV253["'][^>]*><\/script>)/i;
  if (afterTimeSync.test(html)) {
    html = html.replace(afterTimeSync, `$1\n  ${SCRIPT_TAG}`);
  } else {
    const beforePlanning = /(<script\s+id=["']aldusPlanningIntegrityLoaderV235["'][^>]*><\/script>)/i;
    if (beforePlanning.test(html)) html = html.replace(beforePlanning, `${SCRIPT_TAG}\n  $1`);
    else if (html.includes("</body>")) html = html.replace("</body>", `  ${SCRIPT_TAG}\n</body>`);
    else html += `\n${SCRIPT_TAG}\n`;
  }
  write(relativePath, html);
}

function patchServiceWorker(relativePath) {
  let source = read(relativePath);

  if (!source.includes("dashboard-questions-v257")) {
    source = source.replace(
      /const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}([^`]*)`;/,
      (_match, suffix) => `const CACHE_NAME = \`metas-estudo-\${CURRENT_VERSION}${suffix}-dashboard-questions-v257\`;`
    );
  }

  if (!source.includes("DASHBOARD_TODAY_QUESTIONS_SYNC_VERSION")) {
    const constants = `// BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_CONSTANTS\nconst DASHBOARD_TODAY_QUESTIONS_SYNC_VERSION = "${VERSION}";\nconst DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT = \`${SCRIPT_URL}\`;\n// END DASHBOARD_TODAY_QUESTIONS_SYNC_V257_CONSTANTS\n`;
    const anchor = "// END DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS\n";
    if (!source.includes(anchor)) throw new Error(`${relativePath}: marcador V253 não encontrado.`);
    source = source.replace(anchor, `${anchor}${constants}`);
  }

  if (!source.includes("  DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT,")) {
    source = source.replace(
      "  DASHBOARD_TODAY_TIME_SYNC_SCRIPT,\n",
      "  DASHBOARD_TODAY_TIME_SYNC_SCRIPT,\n  DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT,\n"
    );
  }

  if (!source.includes("BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_SCRIPT")) {
    const block = `  // BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_SCRIPT\n  if (!patchedHtml.includes("${FILE}")) {\n    const dashboardTodayQuestionsSyncScript = \`<script id="aldusDashboardTodayQuestionsSyncV257" src="\${DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT}"><\\/script>\`;\n    patchedHtml = patchedHtml.includes("</body>")\n      ? patchedHtml.replace("</body>", \`  \${dashboardTodayQuestionsSyncScript}\\n</body>\`)\n      : \`\${patchedHtml}\\n\${dashboardTodayQuestionsSyncScript}\`;\n  }\n  // END DASHBOARD_TODAY_QUESTIONS_SYNC_V257_SCRIPT\n`;
    const anchor = "  // BEGIN STORAGE_RECOVERY_V254_SCRIPT\n";
    if (!source.includes(anchor)) throw new Error(`${relativePath}: ponto de injeção V254 não encontrado.`);
    source = source.replace(anchor, `${block}${anchor}`);
  }

  if (!source.includes("BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_HEADER")) {
    const block = `  // BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_HEADER\n  headers.set("x-aldus-dashboard-today-questions-sync", DASHBOARD_TODAY_QUESTIONS_SYNC_VERSION);\n  // END DASHBOARD_TODAY_QUESTIONS_SYNC_V257_HEADER\n`;
    const anchor = "  // BEGIN STORAGE_RECOVERY_V254_HEADER\n";
    if (!source.includes(anchor)) throw new Error(`${relativePath}: cabeçalho V254 não encontrado.`);
    source = source.replace(anchor, `${block}${anchor}`);
  }

  write(relativePath, source);
}

const sourcePath = path.join(ROOT, FILE);
if (!fs.existsSync(sourcePath)) throw new Error(`${FILE} não encontrado.`);
fs.copyFileSync(sourcePath, path.join(ROOT, "docs", FILE));

for (const indexPath of ["index.html", "docs/index.html"]) patchIndex(indexPath);
for (const workerPath of ["service-worker-v236.js", "docs/service-worker-v236.js"]) patchServiceWorker(workerPath);

for (const required of [
  "docs/dashboard-today-questions-sync-v257.js",
  "index.html",
  "docs/index.html",
  "service-worker-v236.js",
  "docs/service-worker-v236.js"
]) {
  const content = read(required);
  if (!content.includes(FILE) && !required.endsWith(FILE)) {
    throw new Error(`${required}: referência à V257 ausente.`);
  }
}

console.log("Publicação V257 aplicada com sucesso.");
