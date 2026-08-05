"use strict";

const CURRENT_VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
const RELEASE_SUFFIX = CURRENT_VERSION.match(/v\d+$/)?.[0] || "current";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-factory-weekly-dedupe-v237-hotfix2-timer-alarm-audio-v240-hotfix4-timer-audio-unified-v241-hotfix1-timer-message-last-five-v242-hotfix1-daily-summary-time-v243-hotfix1`;
const CONTRAST_VERSION = "20260802-contraste-distribuicao-v222";
const CONTRAST_STYLESHEET = `question-history-contrast-v222.css?v=${CONTRAST_VERSION}`;
const HISTORY_LAYOUT_VERSION = "20260802-tabela-historico-compacta-v223";
const HISTORY_LAYOUT_STYLESHEET = `question-history-layout-v223.css?v=${HISTORY_LAYOUT_VERSION}`;
const FACTORY_QUEUE_INTEGRITY = `factory-queue-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=factory-queue-integrity-hotfix5`;
const FACTORY_DESTINATION_INTEGRITY = "factory-destination-integrity-v237.js?v=20260804-pastas-destino-classificacao-exata-v237&hotfix=discipline-topic-exact1";
const TIMER_AUDIO_RECOVERY = `timer-audio-recovery-v236.js?v=${CURRENT_VERSION}&hotfix=timer-audio-recovery-hotfix4`;
const TIMER_AUDIO_UNIFIER = "timer-audio-unifier-v241.js?v=20260805-timer-audio-unified-v241&hotfix=timer-audio-unifier-hotfix1";
const TIMER_MESSAGE_DEDUPE = "timer-message-dedupe-v239.js?v=20260805-timer-message-last-five-v242&hotfix=timer-message-last-five-hotfix1";
const DAILY_SUMMARY_TIME_FORMAT = "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix1";
const TIMER_SESSION_INTEGRITY = `timer-session-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=timer-session-integrity-hotfix1`;
const INTEGRITY_LOADER = `planning-integrity-loader-v235.js?v=${CURRENT_VERSION}`;
const INTEGRITY_CORE = `planning-integrity-v235.js?v=${CURRENT_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-${RELEASE_SUFFIX}.css?v=${CURRENT_VERSION}`,
  `app-${RELEASE_SUFFIX}.js?v=${CURRENT_VERSION}`,
  FACTORY_QUEUE_INTEGRITY,
  FACTORY_DESTINATION_INTEGRITY,
  TIMER_AUDIO_RECOVERY,
  TIMER_AUDIO_UNIFIER,
  TIMER_MESSAGE_DEDUPE,
  DAILY_SUMMARY_TIME_FORMAT,
  TIMER_SESSION_INTEGRITY,
  INTEGRITY_LOADER,
  INTEGRITY_CORE,
  CONTRAST_STYLESHEET,
  HISTORY_LAYOUT_STYLESHEET,
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

  let patchedHtml = missingTags.length === 0
    ? html
    : html.includes("</head>")
      ? html.replace("</head>", `  ${missingTags.join("\n  ")}\n</head>`)
      : `${missingTags.join("\n")}\n${html}`;

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

  if (!patchedHtml.includes("timer-message-dedupe-v239.js")) {
    const scriptTag = `<script id="aldusTimerMessageDedupeV239" src="${TIMER_MESSAGE_DEDUPE}"></script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${scriptTag}\n</body>`)
      : `${patchedHtml}\n${scriptTag}`;
  }

  if (!patchedHtml.includes("timer-audio-unifier-v241.js")) {
    const scriptTag = `<script id="aldusTimerAudioUnifierV241" src="${TIMER_AUDIO_UNIFIER}"></script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${scriptTag}\n</body>`)
      : `${patchedHtml}\n${scriptTag}`;
  }

  if (!patchedHtml.includes("daily-summary-time-format-v243.js")) {
    const scriptTag = `<script id="aldusDailySummaryTimeFormatV243" src="${DAILY_SUMMARY_TIME_FORMAT}"></script>`;
    patchedHtml = patchedHtml.includes("</body>")
      ? patchedHtml.replace("</body>", `  ${scriptTag}\n</body>`)
      : `${patchedHtml}\n${scriptTag}`;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-aldus-integrity-version", CURRENT_VERSION);
  headers.set("x-aldus-factory-queue-hotfix", "factory-queue-integrity-hotfix5");
  headers.set("x-aldus-factory-destination-hotfix", "20260804-pastas-destino-classificacao-exata-v237");
  headers.set("x-aldus-timer-audio-hotfix", "timer-audio-recovery-hotfix4");
  headers.set("x-aldus-timer-audio-unifier", "timer-audio-unifier-hotfix1");
  headers.set("x-aldus-timer-message-hotfix", "timer-message-last-five-hotfix1");
  headers.set("x-aldus-timer-message-policy", "last-five");
  headers.set("x-aldus-daily-summary-time", "daily-summary-time-format-hotfix1");
  headers.set("x-aldus-timer-session-hotfix", "timer-session-integrity-hotfix1");

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