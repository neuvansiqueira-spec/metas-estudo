"use strict";

const CURRENT_VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
const RELEASE_SUFFIX = CURRENT_VERSION.match(/v\d+$/)?.[0] || "current";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-elegant-card-style-v249`;
const CONTRAST_VERSION = "20260802-contraste-distribuicao-v222";
const CONTRAST_STYLESHEET = `question-history-contrast-v222.css?v=${CONTRAST_VERSION}`;
const HISTORY_LAYOUT_VERSION = "20260802-tabela-historico-compacta-v223";
const HISTORY_LAYOUT_STYLESHEET = `question-history-layout-v223.css?v=${HISTORY_LAYOUT_VERSION}`;
const CENTRAL_GOALS_PALETTE_VERSION = "20260805-dashboard-central-metas-cores-v246";
const CENTRAL_GOALS_PALETTE_STYLESHEET = `central-goals-palette-v245.css?v=${CENTRAL_GOALS_PALETTE_VERSION}`;
const DASHBOARD_TODAY_PALETTE_VERSION = "20260805-dashboard-hoje-cores-v247";
const DASHBOARD_TODAY_PALETTE_STYLESHEET = `dashboard-today-palette-v247.css?v=${DASHBOARD_TODAY_PALETTE_VERSION}`;
// BEGIN CENTRAL_PERIOD_V248_CONSTANTS
const CENTRAL_PERIOD_CARDS_VERSION = "20260805-central-period-cards-v248";
const CENTRAL_PERIOD_CARDS_STYLESHEET = `central-goals-period-palette-v248.css?v=${CENTRAL_PERIOD_CARDS_VERSION}`;
const CENTRAL_PERIOD_CARDS_SCRIPT = `central-goals-period-palette-v248.js?v=${CENTRAL_PERIOD_CARDS_VERSION}`;
// END CENTRAL_PERIOD_V248_CONSTANTS
// BEGIN ELEGANT_CARD_V249_CONSTANTS
const ELEGANT_CARD_VERSION = "20260805-elegant-card-style-v249";
const ELEGANT_CARD_STYLESHEET = `elegant-card-style-v249.css?v=${ELEGANT_CARD_VERSION}`;
// END ELEGANT_CARD_V249_CONSTANTS
// BEGIN DAILY_SUMMARY_ELEGANT_V250_CONSTANTS
const DAILY_SUMMARY_ELEGANT_VERSION = "20260805-daily-summary-elegant-v250";
const DAILY_SUMMARY_ELEGANT_STYLESHEET = `daily-summary-elegant-v250.css?v=${DAILY_SUMMARY_ELEGANT_VERSION}`;
const DAILY_SUMMARY_ELEGANT_SCRIPT = `daily-summary-elegant-v250.js?v=${DAILY_SUMMARY_ELEGANT_VERSION}`;
// END DAILY_SUMMARY_ELEGANT_V250_CONSTANTS
// BEGIN DAILY_SUMMARY_DIRECT_V251_CONSTANTS
const DAILY_SUMMARY_DIRECT_VERSION = "20260805-daily-summary-elegant-direct-v251";
const DAILY_SUMMARY_DIRECT_STYLESHEET = `daily-summary-elegant-direct-v251.css?v=${DAILY_SUMMARY_DIRECT_VERSION}`;
// END DAILY_SUMMARY_DIRECT_V251_CONSTANTS
// BEGIN DAILY_SUMMARY_NESTED_V252_CONSTANTS
const DAILY_SUMMARY_NESTED_VERSION = "20260805-daily-summary-elegant-nested-v252";
const DAILY_SUMMARY_NESTED_STYLESHEET = `daily-summary-elegant-nested-v252.css?v=${DAILY_SUMMARY_NESTED_VERSION}`;
// END DAILY_SUMMARY_NESTED_V252_CONSTANTS
// BEGIN DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS
const DASHBOARD_TODAY_TIME_SYNC_VERSION = "20260805-dashboard-today-time-sync-v253";
const DASHBOARD_TODAY_TIME_SYNC_SCRIPT = `dashboard-today-time-sync-v253.js?v=${DASHBOARD_TODAY_TIME_SYNC_VERSION}&hotfix=dashboard-today-time-sync-hotfix1`;
// END DASHBOARD_TODAY_TIME_SYNC_V253_CONSTANTS
// BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_CONSTANTS
const DASHBOARD_TODAY_QUESTIONS_SYNC_VERSION = "20260805-dashboard-today-questions-sync-v257";
const DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT = `dashboard-today-questions-sync-v257.js?v=20260805-dashboard-today-questions-sync-v257&hotfix=question-bank-sessions1`;
// END DASHBOARD_TODAY_QUESTIONS_SYNC_V257_CONSTANTS
// BEGIN STORAGE_RECOVERY_V254_CONSTANTS
const STORAGE_RECOVERY_VERSION = "20260805-storage-recovery-v254";
const STORAGE_RECOVERY_SCRIPT = `storage-recovery-v254.js?v=${STORAGE_RECOVERY_VERSION}&hotfix=stale-indexeddb-localstorage-guard1`;
// END STORAGE_RECOVERY_V254_CONSTANTS
// BEGIN BOOTSTRAP_INTEGRITY_V258_CONSTANTS
const BOOTSTRAP_INTEGRITY_VERSION = "20260805-bootstrap-integrity-v258";
const BOOTSTRAP_INTEGRITY_SCRIPT = `bootstrap-integrity-loader-v258.js?v=20260805-bootstrap-integrity-v258&hotfix=preboot-atomic-selection1`;
const STORAGE_QUOTA_GUARD_V256_SCRIPT = `storage-quota-guard-v256.js?v=20260805-indexeddb-quota-guard-v256&hotfix=indexeddb-only1`;
const BOOTSTRAP_MANAGED_FILENAMES_V258 = ["app-v236.js","daily-summary-time-format-v243.js","dashboard-today-time-sync-v253.js","dashboard-today-questions-sync-v257.js","planning-integrity-loader-v235.js","central-goals-period-palette-v248.js","daily-summary-elegant-v250.js","timer-session-integrity-v236.js","storage-recovery-v254.js"];
// END BOOTSTRAP_INTEGRITY_V258_CONSTANTS
const FACTORY_QUEUE_INTEGRITY = `factory-queue-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=factory-queue-integrity-hotfix3`;
const TIMER_AUDIO_RECOVERY = `timer-audio-recovery-v236.js?v=${CURRENT_VERSION}&hotfix=timer-audio-recovery-hotfix2`;
const TIMER_SESSION_INTEGRITY = `timer-session-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=timer-session-integrity-hotfix1`;
const INTEGRITY_LOADER = `planning-integrity-loader-v235.js?v=${CURRENT_VERSION}`;
const INTEGRITY_CORE = `planning-integrity-v235.js?v=${CURRENT_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-${RELEASE_SUFFIX}.css?v=${CURRENT_VERSION}`,
  `app-${RELEASE_SUFFIX}.js?v=${CURRENT_VERSION}`,
  FACTORY_QUEUE_INTEGRITY,
  TIMER_AUDIO_RECOVERY,
  TIMER_SESSION_INTEGRITY,
  INTEGRITY_LOADER,
  INTEGRITY_CORE,
  CONTRAST_STYLESHEET,
  HISTORY_LAYOUT_STYLESHEET,
  CENTRAL_GOALS_PALETTE_STYLESHEET,
  DASHBOARD_TODAY_PALETTE_STYLESHEET,
  CENTRAL_PERIOD_CARDS_STYLESHEET,
  CENTRAL_PERIOD_CARDS_SCRIPT,
  ELEGANT_CARD_STYLESHEET,

  DAILY_SUMMARY_ELEGANT_STYLESHEET,
  DAILY_SUMMARY_ELEGANT_SCRIPT,
  DAILY_SUMMARY_DIRECT_STYLESHEET,
  DAILY_SUMMARY_NESTED_STYLESHEET,
  DASHBOARD_TODAY_TIME_SYNC_SCRIPT,
  DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT,
  STORAGE_RECOVERY_SCRIPT,
  STORAGE_QUOTA_GUARD_V256_SCRIPT,
  BOOTSTRAP_INTEGRITY_SCRIPT,
  "vendor/pdf.mjs",
  "vendor/pdf.worker.mjs",
  "vendor/pdfjs-LICENSE.txt",
  "manifest.json",
  "icons/aldus-visual.png",
  "icons/aldus-brand-mark-v93.png",
  "icons/logo-mark.svg",
  "icons/icon.svg",
  "icons/icon-maskable.svg"
];
const STATIC_PATHS = new Set(
  STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname)
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) =>
            (name.startsWith("metas-estudo-") && name !== CACHE_NAME)
            || name.startsWith("aldus-runtime-modules-")
            || name.startsWith("aldus-compiled-app-")
          )
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (!response?.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function ensurePageStylesheets(response) {
  if (!response?.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const missingTags = [];

  if (!html.includes("question-history-contrast-v222.css")) {
    missingTags.push(`<link rel="stylesheet" href="${CONTRAST_STYLESHEET}" />`);
  }
  if (!html.includes("question-history-layout-v223.css")) {
    missingTags.push(`<link rel="stylesheet" href="${HISTORY_LAYOUT_STYLESHEET}" />`);
  }
  if (!html.includes(CENTRAL_GOALS_PALETTE_VERSION)) {
    missingTags.push(`<link id="aldusCentralGoalsPaletteV246" rel="stylesheet" href="${CENTRAL_GOALS_PALETTE_STYLESHEET}" />`);
  }
  if (!html.includes(DASHBOARD_TODAY_PALETTE_VERSION)) {
    missingTags.push(`<link id="aldusDashboardTodayPaletteV247" rel="stylesheet" href="${DASHBOARD_TODAY_PALETTE_STYLESHEET}" />`);
  }
  // BEGIN CENTRAL_PERIOD_V248_STYLE
  if (!html.includes(CENTRAL_PERIOD_CARDS_VERSION)) {
    missingTags.push(`<link id="aldusCentralPeriodCardsV248" rel="stylesheet" href="${CENTRAL_PERIOD_CARDS_STYLESHEET}" />`);
  }
  // END CENTRAL_PERIOD_V248_STYLE
  // BEGIN DAILY_SUMMARY_ELEGANT_V250_STYLE
  if (!html.includes(DAILY_SUMMARY_ELEGANT_VERSION)) {
    missingTags.push(`<link id="aldusDailySummaryElegantV250" rel="stylesheet" href="${DAILY_SUMMARY_ELEGANT_STYLESHEET}" />`);
  }
  // END DAILY_SUMMARY_ELEGANT_V250_STYLE
  // BEGIN DAILY_SUMMARY_DIRECT_V251_STYLE
  if (!html.includes(DAILY_SUMMARY_DIRECT_VERSION)) {
    missingTags.push(`<link id="aldusDailySummaryElegantDirectV251" rel="stylesheet" href="${DAILY_SUMMARY_DIRECT_STYLESHEET}" />`);
  }
  // END DAILY_SUMMARY_DIRECT_V251_STYLE
  // BEGIN DAILY_SUMMARY_NESTED_V252_STYLE
  if (!html.includes(DAILY_SUMMARY_NESTED_VERSION)) {
    missingTags.push(`<link id="aldusDailySummaryElegantNestedV252" rel="stylesheet" href="${DAILY_SUMMARY_NESTED_STYLESHEET}" />`);
  }
  // END DAILY_SUMMARY_NESTED_V252_STYLE
  // BEGIN ELEGANT_CARD_V249_STYLE
  if (!html.includes(ELEGANT_CARD_VERSION)) {
    missingTags.push(`<link id="aldusElegantCardStyleV249" rel="stylesheet" href="${ELEGANT_CARD_STYLESHEET}" />`);
  }
  // END ELEGANT_CARD_V249_STYLE







  let patchedHtml = missingTags.length === 0
    ? html
    : html.includes("</head>")
      ? html.replace("</head>", `  ${missingTags.join("\n  ")}\n</head>`)
      : `${missingTags.join("\n")}\n${html}`;
  // BEGIN BOOTSTRAP_INTEGRITY_V258_HTML
  {
    const legacyIds = ["aldusStorageRecoveryV254","aldusAppBundleScript","aldusDailySummaryTimeFormatV243Direct","aldusDashboardTodayTimeSyncV253","aldusDashboardTodayQuestionsSyncV257","aldusPlanningIntegrityLoaderV235","aldusCentralPeriodCardsScriptV248","aldusDailySummaryElegantScriptV250","aldusTimerSessionIntegrityV236"];
    for (const id of legacyIds) {
      const pattern = new RegExp("\\s*<script\\s+id=[\"']" + id + "[\"'][^>]*><\\/script>", "gi");
      patchedHtml = patchedHtml.replace(pattern, "");
    }
    patchedHtml = patchedHtml.replace(/\s*<script\s+id=["']aldusBootstrapIntegrityLoaderV258["'][^>]*><\/script>/gi, "");
    const quotaTag = '<script id="aldusStorageQuotaGuardV256" src="' + STORAGE_QUOTA_GUARD_V256_SCRIPT + '"><\/script>';
    const loaderTag = '<script id="aldusBootstrapIntegrityLoaderV258" src="' + BOOTSTRAP_INTEGRITY_SCRIPT + '"><\/script>';
    const quotaPattern = /(<script\s+id=["']aldusStorageQuotaGuardV256["'][^>]*><\/script>)/i;
    if (quotaPattern.test(patchedHtml)) patchedHtml = patchedHtml.replace(quotaPattern, "$1\n  " + loaderTag);
    else if (patchedHtml.includes("</body>")) patchedHtml = patchedHtml.replace("</body>", "  " + quotaTag + "\n  " + loaderTag + "\n</body>");
    else patchedHtml += "\n" + quotaTag + "\n" + loaderTag + "\n";
    const managedMarker = "<!-- aldus-v258-managed: " + BOOTSTRAP_MANAGED_FILENAMES_V258.join(" ") + " -->";
    if (!patchedHtml.includes("aldus-v258-managed:")) patchedHtml = patchedHtml.includes("</body>") ? patchedHtml.replace("</body>", "  " + managedMarker + "\n</body>") : patchedHtml + "\n" + managedMarker;
  }
  // END BOOTSTRAP_INTEGRITY_V258_HTML
  // BEGIN CENTRAL_PERIOD_V248_SCRIPT
  if (!patchedHtml.includes("central-goals-period-palette-v248.js")) {
    const centralPeriodScript = `<script id="aldusCentralPeriodCardsScriptV248" src="${CENTRAL_PERIOD_CARDS_SCRIPT}"><\/script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${centralPeriodScript}\n</body>`)
      : `${patchedHtml}\n${centralPeriodScript}`;
  }
  // END CENTRAL_PERIOD_V248_SCRIPT
  // BEGIN DAILY_SUMMARY_ELEGANT_V250_SCRIPT
  if (!patchedHtml.includes("daily-summary-elegant-v250.js")) {
    const dailySummaryElegantScript = `<script id="aldusDailySummaryElegantScriptV250" src="${DAILY_SUMMARY_ELEGANT_SCRIPT}"><\/script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${dailySummaryElegantScript}\n</body>`)
      : `${patchedHtml}\n${dailySummaryElegantScript}`;
  }
  // END DAILY_SUMMARY_ELEGANT_V250_SCRIPT
  // BEGIN DASHBOARD_TODAY_TIME_SYNC_V253_SCRIPT
  if (!patchedHtml.includes("dashboard-today-time-sync-v253.js")) {
    const dashboardTodayTimeSyncScript = `<script id="aldusDashboardTodayTimeSyncV253" src="${DASHBOARD_TODAY_TIME_SYNC_SCRIPT}"><\/script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${dashboardTodayTimeSyncScript}\n</body>`)
      : `${patchedHtml}\n${dashboardTodayTimeSyncScript}`;
  }
  // END DASHBOARD_TODAY_TIME_SYNC_V253_SCRIPT
  // BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_SCRIPT
  if (!patchedHtml.includes("dashboard-today-questions-sync-v257.js")) {
    const dashboardTodayQuestionsSyncScript = `<script id="aldusDashboardTodayQuestionsSyncV257" src="${DASHBOARD_TODAY_QUESTIONS_SYNC_SCRIPT}"><\/script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${dashboardTodayQuestionsSyncScript}\n</body>`)
      : `${patchedHtml}\n${dashboardTodayQuestionsSyncScript}`;
  }
  // END DASHBOARD_TODAY_QUESTIONS_SYNC_V257_SCRIPT
  // BEGIN STORAGE_RECOVERY_V254_SCRIPT
  if (!patchedHtml.includes("storage-recovery-v254.js")) {
    const storageRecoveryScript = `<script id="aldusStorageRecoveryV254" src="${STORAGE_RECOVERY_SCRIPT}"><\/script>`;
    const appBundleMatch = patchedHtml.match(/<script\s+id=["']aldusAppBundleScript["'][^>]*><\/script>/i);
    if (appBundleMatch?.[0]) {
      patchedHtml = patchedHtml.replace(appBundleMatch[0], `${storageRecoveryScript}\n  ${appBundleMatch[0]}`);
    } else {
      patchedHtml = patchedHtml.includes("</body>")
        ? patchedHtml.replace("</body>", `  ${storageRecoveryScript}\n</body>`)
        : `${patchedHtml}\n${storageRecoveryScript}`;
    }
  }
  // END STORAGE_RECOVERY_V254_SCRIPT





  if (!patchedHtml.includes("planning-integrity-loader-v235.js")) {
    const scriptTag = `<script id="aldusPlanningIntegrityLoaderV235" src="${INTEGRITY_LOADER}"></script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${scriptTag}\n</body>`)
      : `${patchedHtml}\n${scriptTag}`;
  }

  if (!patchedHtml.includes("timer-session-integrity-v236.js")) {
    const scriptTag = `<script id="aldusTimerSessionIntegrityV236" src="${TIMER_SESSION_INTEGRITY}"></script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${scriptTag}\n</body>`)
      : `${patchedHtml}\n${scriptTag}`;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-aldus-integrity-version", CURRENT_VERSION);
  headers.set("x-aldus-factory-queue-hotfix", "factory-queue-integrity-hotfix3");
  headers.set("x-aldus-timer-audio-hotfix", "timer-audio-recovery-hotfix2");
  headers.set("x-aldus-timer-session-hotfix", "timer-session-integrity-hotfix1");
  headers.set("x-aldus-central-goals-palette", CENTRAL_GOALS_PALETTE_VERSION);
  headers.set("x-aldus-dashboard-today-palette", DASHBOARD_TODAY_PALETTE_VERSION);
  // BEGIN CENTRAL_PERIOD_V248_HEADER
  headers.set("x-aldus-central-period-cards", CENTRAL_PERIOD_CARDS_VERSION);
  // END CENTRAL_PERIOD_V248_HEADER
  // BEGIN DAILY_SUMMARY_ELEGANT_V250_HEADER
  headers.set("x-aldus-daily-summary-elegant", DAILY_SUMMARY_ELEGANT_VERSION);
  // END DAILY_SUMMARY_ELEGANT_V250_HEADER
  // BEGIN DAILY_SUMMARY_DIRECT_V251_HEADER
  headers.set("x-aldus-daily-summary-direct", DAILY_SUMMARY_DIRECT_VERSION);
  // END DAILY_SUMMARY_DIRECT_V251_HEADER
  // BEGIN DAILY_SUMMARY_NESTED_V252_HEADER
  headers.set("x-aldus-daily-summary-nested", DAILY_SUMMARY_NESTED_VERSION);
  // END DAILY_SUMMARY_NESTED_V252_HEADER
  // BEGIN DASHBOARD_TODAY_TIME_SYNC_V253_HEADER
  headers.set("x-aldus-dashboard-today-time-sync", DASHBOARD_TODAY_TIME_SYNC_VERSION);
  // END DASHBOARD_TODAY_TIME_SYNC_V253_HEADER
  // BEGIN DASHBOARD_TODAY_QUESTIONS_SYNC_V257_HEADER
  headers.set("x-aldus-dashboard-today-questions-sync", DASHBOARD_TODAY_QUESTIONS_SYNC_VERSION);
  // END DASHBOARD_TODAY_QUESTIONS_SYNC_V257_HEADER
  // BEGIN BOOTSTRAP_INTEGRITY_V258_HEADER
  headers.set("x-aldus-bootstrap-integrity", BOOTSTRAP_INTEGRITY_VERSION);
  headers.set("x-aldus-bootstrap-policy", "pre-render-atomic-conservative");
  // END BOOTSTRAP_INTEGRITY_V258_HEADER
  // BEGIN STORAGE_RECOVERY_V254_HEADER
  headers.set("x-aldus-storage-recovery", "disabled-by-v258");
  // END STORAGE_RECOVERY_V254_HEADER
  // BEGIN ELEGANT_CARD_V249_HEADER
  headers.set("x-aldus-elegant-card-style", ELEGANT_CARD_VERSION);
  // END ELEGANT_CARD_V249_HEADER









  return new Response(patchedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) {
      const patchedResponse = await ensurePageStylesheets(response);
      return cacheResponse(request, patchedResponse);
    }
  } catch {}

  const cached = await caches.match(request, { ignoreSearch: true })
    || await caches.match(new URL("index.html", self.registration.scope).href, { ignoreSearch: true });
  if (cached) return ensurePageStylesheets(cached);

  return new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    return await cacheResponse(request, await fetch(request, { cache: "no-store" }));
  } catch {
    return new Response("Recurso indisponível temporariamente.", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (STATIC_PATHS.has(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
  }
});
