"use strict";

const CURRENT_VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
const RELEASE_SUFFIX = CURRENT_VERSION.match(/v\d+$/)?.[0] || "current";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-daily-summary-elegant-v250`;
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
  // BEGIN ELEGANT_CARD_V249_STYLE
  if (!html.includes(ELEGANT_CARD_VERSION)) {
    missingTags.push(`<link id="aldusElegantCardStyleV249" rel="stylesheet" href="${ELEGANT_CARD_STYLESHEET}" />`);
  }
  // END ELEGANT_CARD_V249_STYLE
  // BEGIN DAILY_SUMMARY_ELEGANT_V250_STYLE
  if (!html.includes(DAILY_SUMMARY_ELEGANT_VERSION)) {
    missingTags.push(`<link id="aldusDailySummaryElegantV250" rel="stylesheet" href="${DAILY_SUMMARY_ELEGANT_STYLESHEET}" />`);
  }
  // END DAILY_SUMMARY_ELEGANT_V250_STYLE




  let patchedHtml = missingTags.length === 0
    ? html
    : html.includes("</head>")
      ? html.replace("</head>", `  ${missingTags.join("\n  ")}\n</head>`)
      : `${missingTags.join("\n")}\n${html}`;
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
  // BEGIN ELEGANT_CARD_V249_HEADER
  headers.set("x-aldus-elegant-card-style", ELEGANT_CARD_VERSION);
  // END ELEGANT_CARD_V249_HEADER
  // BEGIN DAILY_SUMMARY_ELEGANT_V250_HEADER
  headers.set("x-aldus-daily-summary-elegant", DAILY_SUMMARY_ELEGANT_VERSION);
  // END DAILY_SUMMARY_ELEGANT_V250_HEADER




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
