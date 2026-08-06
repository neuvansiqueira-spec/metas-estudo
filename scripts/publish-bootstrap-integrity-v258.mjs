import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const VERSION = "20260805-bootstrap-integrity-v258";
const FILE = "bootstrap-integrity-loader-v258.js";
const LOADER_URL = `${FILE}?v=${VERSION}&hotfix=preboot-atomic-selection1`;
const LOADER_TAG = `<script id="aldusBootstrapIntegrityLoaderV258" src="${LOADER_URL}"></script>`;
const QUOTA_URL = "storage-quota-guard-v256.js?v=20260805-indexeddb-quota-guard-v256&hotfix=indexeddb-only1";
const QUOTA_TAG = `<script id="aldusStorageQuotaGuardV256" src="${QUOTA_URL}"></script>`;
const LOADER_GZIP_BASE64 = "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";
const LEGACY_IDS = [
  "aldusStorageRecoveryV254",
  "aldusAppBundleScript",
  "aldusDailySummaryTimeFormatV243Direct",
  "aldusDashboardTodayTimeSyncV253",
  "aldusDashboardTodayQuestionsSyncV257",
  "aldusPlanningIntegrityLoaderV235",
  "aldusCentralPeriodCardsScriptV248",
  "aldusDailySummaryElegantScriptV250",
  "aldusTimerSessionIntegrityV236"
];
const MANAGED_FILENAMES = [
  "app-v236.js",
  "daily-summary-time-format-v243.js",
  "dashboard-today-time-sync-v253.js",
  "dashboard-today-questions-sync-v257.js",
  "planning-integrity-loader-v235.js",
  "central-goals-period-palette-v248.js",
  "daily-summary-elegant-v250.js",
  "timer-session-integrity-v236.js",
  "storage-recovery-v254.js"
];

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(ROOT, file), content, "utf8");
const removeScript = (html, id) => html.replace(new RegExp(`\\s*<script\\s+id=["']${id}["'][^>]*><\\/script>`, "gi"), "");

function emitLoader() {
  const source = zlib.gunzipSync(Buffer.from(LOADER_GZIP_BASE64, "base64")).toString("utf8");
  write(FILE, source);
  write(`docs/${FILE}`, source);
  return source;
}

function patchIndex(file) {
  let html = read(file);
  for (const id of LEGACY_IDS) html = removeScript(html, id);
  html = removeScript(html, "aldusBootstrapIntegrityLoaderV258");
  if (!html.includes("aldusStorageQuotaGuardV256")) {
    html = html.includes("</body>") ? html.replace("</body>", `  ${QUOTA_TAG}\n</body>`) : `${html}\n${QUOTA_TAG}\n`;
  }
  const quotaPattern = /(<script\s+id=["']aldusStorageQuotaGuardV256["'][^>]*><\/script>)/i;
  if (!quotaPattern.test(html)) throw new Error(`${file}: V256 ausente.`);
  html = html.replace(quotaPattern, `$1\n  ${LOADER_TAG}`);
  if ((html.match(/aldusBootstrapIntegrityLoaderV258/g) || []).length !== 1) throw new Error(`${file}: V258 duplicada.`);
  if (LEGACY_IDS.some((id) => html.includes(`id="${id}"`) || html.includes(`id='${id}'`))) throw new Error(`${file}: script legado presente.`);
  write(file, html);
}

function patchWorker(file) {
  let source = read(file);
  if (!source.includes("bootstrap-integrity-v258")) {
    source = source.replace(/const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}([^`]*)`;/, (_m, suffix) => `const CACHE_NAME = \`metas-estudo-\${CURRENT_VERSION}${suffix}-bootstrap-integrity-v258\`;`);
  }
  if (!source.includes("BOOTSTRAP_INTEGRITY_VERSION")) {
    const constants = `// BEGIN BOOTSTRAP_INTEGRITY_V258_CONSTANTS\nconst BOOTSTRAP_INTEGRITY_VERSION = "${VERSION}";\nconst BOOTSTRAP_INTEGRITY_SCRIPT = \`${LOADER_URL}\`;\nconst STORAGE_QUOTA_GUARD_V256_SCRIPT = \`${QUOTA_URL}\`;\nconst BOOTSTRAP_MANAGED_FILENAMES_V258 = ${JSON.stringify(MANAGED_FILENAMES)};\n// END BOOTSTRAP_INTEGRITY_V258_CONSTANTS\n`;
    const anchor = "// END STORAGE_RECOVERY_V254_CONSTANTS\n";
    if (!source.includes(anchor)) throw new Error(`${file}: marcador de constantes ausente.`);
    source = source.replace(anchor, anchor + constants);
  }
  if (!source.includes("  STORAGE_QUOTA_GUARD_V256_SCRIPT,")) {
    source = source.replace("  STORAGE_RECOVERY_SCRIPT,\n", "  STORAGE_RECOVERY_SCRIPT,\n  STORAGE_QUOTA_GUARD_V256_SCRIPT,\n  BOOTSTRAP_INTEGRITY_SCRIPT,\n");
  }
  if (!source.includes("BEGIN BOOTSTRAP_INTEGRITY_V258_HTML")) {
    const block = `  // BEGIN BOOTSTRAP_INTEGRITY_V258_HTML
  {
    const legacyIds = ${JSON.stringify(LEGACY_IDS)};
    for (const id of legacyIds) {
      const pattern = new RegExp("\\\\s*<script\\\\s+id=[\\\"']" + id + "[\\\"'][^>]*><\\\\/script>", "gi");
      patchedHtml = patchedHtml.replace(pattern, "");
    }
    patchedHtml = patchedHtml.replace(/\\s*<script\\s+id=["']aldusBootstrapIntegrityLoaderV258["'][^>]*><\\/script>/gi, "");
    const quotaTag = '<script id="aldusStorageQuotaGuardV256" src="' + STORAGE_QUOTA_GUARD_V256_SCRIPT + '"><\\/script>';
    const loaderTag = '<script id="aldusBootstrapIntegrityLoaderV258" src="' + BOOTSTRAP_INTEGRITY_SCRIPT + '"><\\/script>';
    const quotaPattern = /(<script\\s+id=["']aldusStorageQuotaGuardV256["'][^>]*><\\/script>)/i;
    if (quotaPattern.test(patchedHtml)) patchedHtml = patchedHtml.replace(quotaPattern, "$1\\n  " + loaderTag);
    else if (patchedHtml.includes("</body>")) patchedHtml = patchedHtml.replace("</body>", "  " + quotaTag + "\\n  " + loaderTag + "\\n</body>");
    else patchedHtml += "\\n" + quotaTag + "\\n" + loaderTag + "\\n";
    const managedMarker = "<!-- aldus-v258-managed: " + BOOTSTRAP_MANAGED_FILENAMES_V258.join(" ") + " -->";
    if (!patchedHtml.includes("aldus-v258-managed:")) patchedHtml = patchedHtml.includes("</body>") ? patchedHtml.replace("</body>", "  " + managedMarker + "\\n</body>") : patchedHtml + "\\n" + managedMarker;
  }
  // END BOOTSTRAP_INTEGRITY_V258_HTML
`;
    const anchor = "  // BEGIN CENTRAL_PERIOD_V248_SCRIPT\n";
    if (!source.includes(anchor)) throw new Error(`${file}: ponto de injeção ausente.`);
    source = source.replace(anchor, block + anchor);
  }
  if (!source.includes("BEGIN BOOTSTRAP_INTEGRITY_V258_HEADER")) {
    const block = `  // BEGIN BOOTSTRAP_INTEGRITY_V258_HEADER\n  headers.set("x-aldus-bootstrap-integrity", BOOTSTRAP_INTEGRITY_VERSION);\n  headers.set("x-aldus-bootstrap-policy", "pre-render-atomic-conservative");\n  // END BOOTSTRAP_INTEGRITY_V258_HEADER\n`;
    const anchor = "  // BEGIN STORAGE_RECOVERY_V254_HEADER\n";
    if (!source.includes(anchor)) throw new Error(`${file}: cabeçalho V254 ausente.`);
    source = source.replace(anchor, block + anchor);
  }
  source = source.replace('headers.set("x-aldus-storage-recovery", STORAGE_RECOVERY_VERSION);', 'headers.set("x-aldus-storage-recovery", "disabled-by-v258");');
  write(file, source);
}

function runUnitChecks(loaderPath) {
  const require = createRequire(import.meta.url);
  delete require.cache[require.resolve(loaderPath)];
  const api = require(loaderPath);
  const rows = (n, prefix, updatedAt = "2026-08-05T20:00:00-03:00") => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, updatedAt }));
  const state = (extra = {}) => ({ subjects: [], studies: [], syllabusItems: [], dailyGoals: [], questionLogs: [], materials: [], questionBank: [], questionBankSessions: [], questionErrorNotebook: [], simulados: [], smartReviews: [], factoryAgenda: [], factoryItems: [], ...extra });
  const idb = api.makeCandidate("indexeddb", state({ studies: rows(86, "s") }));
  const smaller = api.makeCandidate("localStorage:metasConcursoData", state({ studies: rows(10, "x", "2026-08-05T23:00:00-03:00") }));
  assert.equal(api.chooseCandidate([idb, smaller]).candidate.source, "indexeddb");
  const superior = api.makeCandidate("localStorage:metasConcursoData", state({ studies: rows(90, "s", "2026-08-05T22:00:00-03:00"), questionLogs: rows(3, "q", "2026-08-05T22:00:00-03:00") }));
  assert.equal(api.chooseCandidate([idb, superior]).candidate.source, "localStorage:metasConcursoData");
  const conflictIdb = api.makeCandidate("indexeddb", state({ studies: rows(86, "s"), questionBank: rows(100, "b") }));
  const conflict = api.makeCandidate("localStorage:metasConcursoData", state({ studies: rows(87, "x"), questionBank: rows(1, "b") }));
  assert.equal(api.chooseCandidate([conflictIdb, conflict]).candidate.source, "indexeddb");
  const envelope = JSON.stringify({ state: JSON.stringify({ raw: JSON.stringify(state({ subjects: rows(2, "d") })) }) });
  assert.equal(api.extractStates(envelope).length, 1);
}

const loader = emitLoader();
if (!loader.includes("reconcileBeforeBootstrap") || !loader.includes("metas-estudo-safety-v258")) throw new Error("Loader V258 incompleto.");
for (const file of ["index.html", "docs/index.html"]) patchIndex(file);
for (const file of ["service-worker-v236.js", "docs/service-worker-v236.js"]) patchWorker(file);
runUnitChecks(path.join(ROOT, FILE));
for (const file of ["index.html", "docs/index.html", "service-worker-v236.js", "docs/service-worker-v236.js"]) if (!read(file).includes(FILE)) throw new Error(`${file}: referência V258 ausente.`);
console.log("V258 publicada e validada com política conservadora, gravação atômica e backups rotativos.");
