import fs from "node:fs";

const VERSION = "20260805-storage-recovery-v254";
const HOTFIX = "stale-indexeddb-localstorage-guard1";
const SCRIPT_FILE = "storage-recovery-v254.js";
const SCRIPT_ID = "aldusStorageRecoveryV254";
const SCRIPT_TAG = `  <script id="${SCRIPT_ID}" src="${SCRIPT_FILE}?v=${VERSION}&hotfix=${HOTFIX}"></script>`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Arquivo obrigatório ausente: ${filePath}`);
}

function removeMarkedBlock(source, marker) {
  return source.replace(new RegExp(`\\n?\\s*// BEGIN ${marker}[\\s\\S]*?// END ${marker}\\n?`, "g"), "\n");
}

function patchHtml(filePath) {
  requireFile(filePath);
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<script\s+id=["']aldusStorageRecoveryV254["'][^>]*><\/script>\s*$/gim, "");

  const appAnchor = /(^\s*<script\s+id=["']aldusAppBundleScript["'][^>]*><\/script>\s*$)/m;
  if (!appAnchor.test(html)) throw new Error(`Âncora do aplicativo não encontrada em ${filePath}.`);
  html = html.replace(appAnchor, `${SCRIPT_TAG}\n$1`);

  if (!html.includes(`${SCRIPT_FILE}?v=${VERSION}&hotfix=${HOTFIX}`)) {
    throw new Error(`A recuperação V254 não foi inserida em ${filePath}.`);
  }
  fs.writeFileSync(filePath, html, "utf8");
}

function patchWorker(filePath) {
  requireFile(filePath);
  let source = fs.readFileSync(filePath, "utf8");
  source = removeMarkedBlock(source, "STORAGE_RECOVERY_V254_CONSTANTS");
  source = removeMarkedBlock(source, "STORAGE_RECOVERY_V254_SCRIPT");
  source = removeMarkedBlock(source, "STORAGE_RECOVERY_V254_HEADER");
  source = source
    .replace(/^\s*STORAGE_RECOVERY_SCRIPT,\s*$/gm, "")
    .replace(/const CACHE_NAME = `[^`]+`;/, "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-storage-recovery-v254`;" );

  const constants = `// BEGIN STORAGE_RECOVERY_V254_CONSTANTS\nconst STORAGE_RECOVERY_VERSION = "${VERSION}";\nconst STORAGE_RECOVERY_SCRIPT = \`${SCRIPT_FILE}?v=\${STORAGE_RECOVERY_VERSION}&hotfix=${HOTFIX}\`;\n// END STORAGE_RECOVERY_V254_CONSTANTS\n`;
  const preferredConstantsAnchor = /(\/\/ END DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS\n)/;
  const fallbackConstantsAnchor = /(const INTEGRITY_CORE = [^\n]+\n)/;
  const constantsAnchor = preferredConstantsAnchor.test(source) ? preferredConstantsAnchor : fallbackConstantsAnchor;
  if (!constantsAnchor.test(source)) throw new Error(`Âncora de constantes não encontrada em ${filePath}.`);
  source = source.replace(constantsAnchor, `$1${constants}`);

  const preferredAssetAnchor = /(\s+DASHBOARD_TODAY_TIME_SYNC_SCRIPT,\n)/;
  const fallbackAssetAnchor = /(\s+INTEGRITY_CORE,\n)/;
  const assetAnchor = preferredAssetAnchor.test(source) ? preferredAssetAnchor : fallbackAssetAnchor;
  if (!assetAnchor.test(source)) throw new Error(`Lista de assets não encontrada em ${filePath}.`);
  source = source.replace(assetAnchor, `$1  STORAGE_RECOVERY_SCRIPT,\n`);

  const scriptBlock = `\n  // BEGIN STORAGE_RECOVERY_V254_SCRIPT\n  if (!patchedHtml.includes("${SCRIPT_FILE}")) {\n    const storageRecoveryScript = \`<script id="${SCRIPT_ID}" src="\${STORAGE_RECOVERY_SCRIPT}"><\\/script>\`;\n    const appBundleMatch = patchedHtml.match(/<script\\s+id=["']aldusAppBundleScript["'][^>]*><\\/script>/i);\n    if (appBundleMatch?.[0]) {\n      patchedHtml = patchedHtml.replace(appBundleMatch[0], \`\${storageRecoveryScript}\\n  \${appBundleMatch[0]}\`);\n    } else {\n      patchedHtml = patchedHtml.includes("</body>")\n        ? patchedHtml.replace("</body>", \`  \${storageRecoveryScript}\\n</body>\`)\n        : \`\${patchedHtml}\\n\${storageRecoveryScript}\`;\n    }\n  }\n  // END STORAGE_RECOVERY_V254_SCRIPT\n`;
  const scriptAnchor = /(\n\s*if \(!patchedHtml\.includes\("planning-integrity-loader-v235\.js"\)\) \{)/;
  if (!scriptAnchor.test(source)) throw new Error(`Ponto de injeção de scripts não encontrado em ${filePath}.`);
  source = source.replace(scriptAnchor, `${scriptBlock}$1`);

  const headerBlock = `\n  // BEGIN STORAGE_RECOVERY_V254_HEADER\n  headers.set("x-aldus-storage-recovery", STORAGE_RECOVERY_VERSION);\n  // END STORAGE_RECOVERY_V254_HEADER\n`;
  const headerAnchor = /(\n\s*return new Response\(patchedHtml, \{)/;
  if (!headerAnchor.test(source)) throw new Error(`Ponto de cabeçalho não encontrado em ${filePath}.`);
  source = source.replace(headerAnchor, `${headerBlock}$1`);

  for (const marker of [
    VERSION,
    "STORAGE_RECOVERY_SCRIPT,",
    "BEGIN STORAGE_RECOVERY_V254_SCRIPT",
    "x-aldus-storage-recovery"
  ]) {
    if (!source.includes(marker)) throw new Error(`Marcador ${marker} ausente após atualizar ${filePath}.`);
  }
  fs.writeFileSync(filePath, source, "utf8");
}

requireFile(SCRIPT_FILE);
fs.mkdirSync("docs", { recursive: true });
fs.copyFileSync(SCRIPT_FILE, `docs/${SCRIPT_FILE}`);
for (const filePath of INDEX_FILES) patchHtml(filePath);
for (const filePath of WORKER_FILES) patchWorker(filePath);

console.log(`[Aldus V254] Recuperação emergencial publicada antes do bootstrap em ${INDEX_FILES.length} páginas e ${WORKER_FILES.length} service workers.`);
