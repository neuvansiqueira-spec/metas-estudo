"use strict";

const CURRENT_VERSION = "20260823-indexeddb-direct-snapshot-v378";
const RELEASE_SUFFIX = CURRENT_VERSION.match(/v\d+$/)?.[0] || "current";
const SECURITY_VERSION = "20260810-seguranca-estabilidade-v296";
const PROTECTION_VERSION = "20260815-bootstrap-performance-v342";
const BOOTSTRAP_VERSION = "20260815-bootstrap-performance-v342";
const FAST_BOOTSTRAP_VERSION = "20260823-indexeddb-direct-snapshot-v378";
const NAVIGATION_DELIVERY_VERSION = "20260817-navigation-bootstrap-delivery-v353";
const PLANNING_QUALITY_VERSION = "20260826-planning-stability-v397";
const TIMER_GOAL_INTEGRITY_VERSION = "20260821-timer-goal-integrity-v366";
const UPDATE_FLOW_VERSION = "20260825-no-auto-reload-v395";
const TIMER_AUDIO_STABILITY_VERSION = "20260825-timer-audio-stability-v396";
const DUPLICATE_CONTINUITY_VERSION = "20260811-duplicate-flow-owner-v309";
const DUPLICATE_RECOMMENDATIONS_VERSION = "20260811-duplicate-flow-owner-v309";
const DUPLICATE_BATCH_HOTFIX_VERSION = "20260811-duplicate-flow-owner-v309";
const ENTRY_RECOVERY_VERSION = "20260811-duplicate-flow-owner-v309";
const FACTORY_SCHEDULE_VERSION = "20260808-factory-schedule-scope-v277";
const FACTORY_SCHEDULE_FILTERS_VERSION = "20260808-factory-schedule-planning-preview-filters-v280";
const FACTORY_SCHEDULE_DATES_VERSION = "20260809-factory-schedule-planning-dates-v281";
const QUESTIONS_HUB_VERSION = "20260814-desempenho-integral-v329";
const QUESTION_JSON_DETAILS_VERSION = "20260810-revisao-json-explicacoes-v299";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-factory-weekly-dedupe-v237-hotfix2-timer-alarm-audio-v297-hotfix5-timer-audio-unified-v241-hotfix1-timer-message-last-five-v242-hotfix1-daily-summary-direct-v244-hotfix2-duplicate-search-v274-data-protection-v275-duplicate-consolidation-continuity-v276-duplicate-recommended-batch-v300-duplicate-batch-persistence-v301-duplicate-batch-performance-v304-duplicate-batch-commit-v305-entry-parser-recovery-v306-duplicate-core-delivery-v307-duplicate-batch-core-pin-v308-duplicate-flow-owner-v309-factory-schedule-v277-factory-schedule-preview-v280-factory-schedule-dates-v281-planning-shift-save-v283-weekly-registered-minutes-hotfix4-security-v296-questions-hub-v298-question-json-details-v299-factory-simulado-escolha-automatica-v312-simulado-interativo-v313-integracao-v318-reparo-factory-simulado-visibility-v315-posthog-telemetry-v317-simulado-location-v328-factory-resumo-aula-canonical-v327-qconcursos-filter-v337-dom-style-hot-path-v355-factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-timer-goal-integrity-v366-planning-stability-v397-planning-consent-v398-no-auto-reload-v395-timer-audio-stability-v396`;
const CONTRAST_VERSION = "20260802-contraste-distribuicao-v222";
const CONTRAST_STYLESHEET = `question-history-contrast-v222.css?v=${CONTRAST_VERSION}`;
const HISTORY_LAYOUT_VERSION = "20260802-tabela-historico-compacta-v223";
const HISTORY_LAYOUT_STYLESHEET = `question-history-layout-v223.css?v=${HISTORY_LAYOUT_VERSION}`;
const FACTORY_QUEUE_INTEGRITY = `factory-queue-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=factory-queue-integrity-hotfix5`;
const FACTORY_DESTINATION_INTEGRITY = "factory-destination-integrity-v237.js?v=20260804-pastas-destino-classificacao-exata-v237&hotfix=factory-destination-on-demand-v354";
const FACTORY_SCHEDULE_SCOPE = `factory-schedule-scope-v277.js?v=${FACTORY_SCHEDULE_VERSION}`;
const FACTORY_SCHEDULE_FILTERS = `factory-schedule-filters-v279.js?v=${FACTORY_SCHEDULE_FILTERS_VERSION}`;
const FACTORY_SCHEDULE_DATES = `factory-schedule-dates-v281.js?v=${FACTORY_SCHEDULE_DATES_VERSION}`;
const TIMER_AUDIO_RECOVERY = "timer-audio-recovery-v236.js?v=20260810-timer-alarm-audio-v297&hotfix=timer-audio-recovery-hotfix5";
const TIMER_AUDIO_STABILITY = `timer-audio-stability-v396.js?v=${TIMER_AUDIO_STABILITY_VERSION}`;
const TIMER_AUDIO_UNIFIER = "timer-audio-unifier-v241.js?v=20260805-timer-audio-unified-v241&hotfix=timer-audio-unifier-hotfix1";
const TIMER_MESSAGE_DEDUPE = "timer-message-dedupe-v239.js?v=20260805-timer-message-last-five-v242&hotfix=timer-message-last-five-hotfix1";
const DAILY_SUMMARY_TIME_FORMAT = "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix4";
const TIMER_SESSION_INTEGRITY = `timer-session-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=timer-session-integrity-hotfix1`;
const INTEGRITY_LOADER = `planning-integrity-loader-v235.js?v=${CURRENT_VERSION}`;
const INTEGRITY_CORE = `planning-integrity-v235.js?v=${CURRENT_VERSION}`;
const CATASTROPHIC_STATE_GUARD = `catastrophic-state-guard-v275.js?v=${PROTECTION_VERSION}`;
const BOOTSTRAP_PROTECTED = `bootstrap-integrity-loader-v275.js?v=${FAST_BOOTSTRAP_VERSION}&planning=v397&update=v395&audio=v396`;
const BOOTSTRAP_FAST_PATH = `bootstrap-fast-path-v351.js?v=${FAST_BOOTSTRAP_VERSION}&planning=v397`;
const BOOTSTRAP_CORE = `bootstrap-integrity-loader-v258-core.js?v=${BOOTSTRAP_VERSION}`;
const UPDATE_FLOW_SCRIPT = `update-flow-v395.js?v=${UPDATE_FLOW_VERSION}`;
const QCONCURSOS_FILTER_ROUTE_V333 = `qconcursos-filter-route-v333.js?v=${BOOTSTRAP_VERSION}`;
const QCONCURSOS_ALL_FILTERS_V334 = `qconcursos-all-filters-v334.js?v=${BOOTSTRAP_VERSION}`;
const QCONCURSOS_ROUTE_SAFETY_V335 = `qconcursos-route-safety-v335.js?v=${BOOTSTRAP_VERSION}`;
const QCONCURSOS_NATIVE_SUBJECT_V336 = `qconcursos-native-subject-v336.js?v=${BOOTSTRAP_VERSION}`;
const QCONCURSOS_CURRENT_CATALOG_V337 = `qconcursos-current-catalog-v337.js?v=${BOOTSTRAP_VERSION}`;
const RECOVERY_SAFETY = `recovery-safety-v275.js?v=${PROTECTION_VERSION}`;
const SECURITY_HARDENING = `security-hardening-v296.js?v=${SECURITY_VERSION}`;
const DUPLICATE_DIAGNOSTICS_LOADER = `duplicate-diagnostics-loader-v269.js?v=${DUPLICATE_CONTINUITY_VERSION}`;
const DUPLICATE_DIAGNOSTICS_SEARCH = `duplicate-diagnostics-search-v272.js?v=${DUPLICATE_CONTINUITY_VERSION}`;
const DUPLICATE_DIAGNOSTICS_MAP = `duplicate-diagnostics-map-v273.js?v=${DUPLICATE_CONTINUITY_VERSION}`;
const DUPLICATE_DIAGNOSTICS_ACTIONS = `duplicate-diagnostics-actions-v274.js?v=${DUPLICATE_CONTINUITY_VERSION}`;
const DUPLICATE_DIAGNOSTICS_SEARCH_CSS = `duplicate-diagnostics-search-v271.css?v=${DUPLICATE_CONTINUITY_VERSION}`;
const DUPLICATE_DIAGNOSTICS_CORE_CSS = `duplicate-diagnostics-v260.css?v=${DUPLICATE_RECOMMENDATIONS_VERSION}`;
const DUPLICATE_RECOMMENDATIONS_CORE = `duplicate-diagnostics-v309.js?v=${DUPLICATE_RECOMMENDATIONS_VERSION}`;
const DUPLICATE_BATCH_HOTFIX = `duplicate-diagnostics-batch-v305.js?v=${DUPLICATE_BATCH_HOTFIX_VERSION}`;
const QUESTIONS_HUB_STYLESHEET = `questions-hub-v298.css?v=${QUESTIONS_HUB_VERSION}`;
const QUESTIONS_HUB_SCRIPT = `questions-hub-v322.js?v=${QUESTIONS_HUB_VERSION}`;
const QUESTION_JSON_DETAILS_SCRIPT = `question-bank-json-details-v299.js?v=${QUESTION_JSON_DETAILS_VERSION}`;
const FACTORY_SIMULADO_SCRIPT = "factory-simulado-prompt-v310.js?v=20260814-desempenho-integral-v329";
const FACTORY_SIMULADO_STYLESHEET = "factory-simulado-prompt-v310.css?v=20260814-desempenho-integral-v329";
const FACTORY_SIMULADO_VISIBILITY_LOADER = "factory-simulado-visibility-v315.js?v=20260814-desempenho-integral-v329";
const TIMER_RUNTIME_V316 = "timer-runtime-v316.js?v=20260814-desempenho-integral-v329";
const USAGE_TELEMETRY_V317 = "usage-telemetry-v315.js?v=20260814-desempenho-integral-v329";
const SIMULADO_INTERATIVO_SCRIPT = "simulado-interativo-v313.js?v=20260811-simulado-interativo-v313";
const SIMULADO_INTERATIVO_STYLESHEET = "simulado-interativo-v313.css?v=20260811-simulado-interativo-v313";
const SIMULADO_INTEGRACAO_SCRIPT = "simulado-integracao-v314.js?v=20260812-simulado-integracao-v318-reparo";
const FACTORY_PENALTIES_SCRIPT = "factory-penalties-v320.js?v=20260814-desempenho-integral-v329";
const FACTORY_RESUMO_AULA_VISUAL_SCRIPT = "factory-resumo-aula-visual-v326.js?v=20260814-desempenho-integral-v329";
const FACTORY_RESUMO_AULA_CANONICAL_SCRIPT = "factory-resumo-aula-canonical-v327.js?v=20260814-desempenho-integral-v329";
const PLANNING_QUALITY_SCRIPT = `planning-quality-v368.js?v=${PLANNING_QUALITY_VERSION}`;
const TIMER_GOAL_INTEGRITY_SCRIPT = `timer-goal-integrity-v366.js?v=${TIMER_GOAL_INTEGRITY_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-${RELEASE_SUFFIX}.css?v=${CURRENT_VERSION}`,
  `app-${RELEASE_SUFFIX}.js?v=${CURRENT_VERSION}`,
  FACTORY_QUEUE_INTEGRITY,
  FACTORY_DESTINATION_INTEGRITY,
  FACTORY_SCHEDULE_SCOPE,
  FACTORY_SCHEDULE_FILTERS,
  FACTORY_SCHEDULE_DATES,
  TIMER_AUDIO_RECOVERY,
  TIMER_AUDIO_STABILITY,
  TIMER_AUDIO_UNIFIER,
  TIMER_MESSAGE_DEDUPE,
  DAILY_SUMMARY_TIME_FORMAT,
  TIMER_SESSION_INTEGRITY,
  INTEGRITY_LOADER,
  INTEGRITY_CORE,
  CATASTROPHIC_STATE_GUARD,
  BOOTSTRAP_PROTECTED,
  BOOTSTRAP_FAST_PATH,
  BOOTSTRAP_CORE,
  UPDATE_FLOW_SCRIPT,
  QCONCURSOS_FILTER_ROUTE_V333,
  QCONCURSOS_ALL_FILTERS_V334,
  QCONCURSOS_ROUTE_SAFETY_V335,
  QCONCURSOS_NATIVE_SUBJECT_V336,
  QCONCURSOS_CURRENT_CATALOG_V337,
  RECOVERY_SAFETY,
  SECURITY_HARDENING,
  CONTRAST_STYLESHEET,
  HISTORY_LAYOUT_STYLESHEET,
  DUPLICATE_DIAGNOSTICS_LOADER,
  DUPLICATE_DIAGNOSTICS_SEARCH,
  DUPLICATE_DIAGNOSTICS_MAP,
  DUPLICATE_DIAGNOSTICS_ACTIONS,
  DUPLICATE_DIAGNOSTICS_SEARCH_CSS,
  DUPLICATE_DIAGNOSTICS_CORE_CSS,
  DUPLICATE_RECOMMENDATIONS_CORE,
  DUPLICATE_BATCH_HOTFIX,
  QUESTIONS_HUB_STYLESHEET,
  QUESTIONS_HUB_SCRIPT,
  QUESTION_JSON_DETAILS_SCRIPT,
  FACTORY_SIMULADO_SCRIPT,
  FACTORY_SIMULADO_STYLESHEET,
  FACTORY_SIMULADO_VISIBILITY_LOADER,
  TIMER_RUNTIME_V316,
  USAGE_TELEMETRY_V317,
  SIMULADO_INTERATIVO_SCRIPT,
  SIMULADO_INTERATIVO_STYLESHEET,
  SIMULADO_INTEGRACAO_SCRIPT,
  FACTORY_PENALTIES_SCRIPT,
  FACTORY_RESUMO_AULA_VISUAL_SCRIPT,
  FACTORY_RESUMO_AULA_CANONICAL_SCRIPT,
  PLANNING_QUALITY_SCRIPT,
  TIMER_GOAL_INTEGRITY_SCRIPT,
  "vendor/pdf.mjs",
  "vendor/pdf.worker.mjs",
  "vendor/pdfjs-LICENSE.txt",
  "manifest.json",
  "icons/aldus-visual-320.webp",
  "icons/aldus-visual.png",
  "icons/aldus-brand-mark-v93.png",
  "icons/logo-mark.svg",
  "icons/icon.svg",
  "icons/icon-maskable.svg"
];
const STATIC_PATHS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));
const CANONICAL_DOCUMENT_URL = new URL("index.html", self.registration.scope).href;
const ESSENTIAL_ASSETS = [
  `app-${RELEASE_SUFFIX}.css?v=${CURRENT_VERSION}`,
  `app-${RELEASE_SUFFIX}.js?v=${CURRENT_VERSION}`,
  "icons/aldus-visual-320.webp",
  SECURITY_HARDENING,
  CATASTROPHIC_STATE_GUARD,
  BOOTSTRAP_PROTECTED,
  UPDATE_FLOW_SCRIPT,
  TIMER_AUDIO_STABILITY,
  BOOTSTRAP_FAST_PATH,
  BOOTSTRAP_CORE,
  PLANNING_QUALITY_SCRIPT,
  TIMER_GOAL_INTEGRITY_SCRIPT
];

async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ESSENTIAL_ASSETS);

  const response = await fetch(CANONICAL_DOCUMENT_URL, { cache: "no-store" });
  if (!response?.ok) throw new Error(`Documento inicial indisponível: ${response?.status || 0}`);
  const patchedResponse = await ensurePageStylesheets(response);
  if (!await responseHasProtectedBootstrap(patchedResponse)) {
    throw new Error("Documento inicial sem bootstrap V351 após transformação.");
  }
  await cache.put(CANONICAL_DOCUMENT_URL, patchedResponse.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAssets().then(() => self.skipWaiting()));
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

function injectBeforeFinalClosingTag(html, closingTag, markup) {
  const source = String(html || "");
  const normalized = source.toLowerCase();
  const marker = String(closingTag || "").toLowerCase();
  const index = marker ? normalized.lastIndexOf(marker) : -1;
  if (index < 0) return `${source}\n${markup}`;
  return `${source.slice(0, index)}  ${markup}\n${source.slice(index)}`;
}

function installProtectedBootstrapV275(html) {
  let patched = html
    .replace(/<script\s+[^>]*src=["'][^"']*storage-quota-guard-v256\.js[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script\s+[^>]*src=["'][^"']*bootstrap-integrity-loader-v(?:258|275)\.js[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script\s+id=["']aldusCatastrophicStateGuardV275["'][^>]*><\/script>/gi, "")
    .replace(/<script\s+id=["']aldusBootstrapIntegrityLoaderV275["'][^>]*><\/script>/gi, "");

  const tag = `<script id="aldusBootstrapIntegrityLoaderV275" src="${BOOTSTRAP_PROTECTED}"></script>`;
  return injectBeforeFinalClosingTag(patched, "</body>", tag);
}

function installSecurityHardeningV296(html) {
  if (html.includes("security-hardening-v296.js")) return html;
  const tag = `<script id="aldusSecurityHardeningV296" src="${SECURITY_HARDENING}"></script>`;
  return injectBeforeFinalClosingTag(html, "</head>", tag);
}

function installDuplicateDiagnosticsV276(html) {
  const tag = `<script id="aldusDuplicateDiagnosticsLoaderV301" src="${DUPLICATE_DIAGNOSTICS_LOADER}"></script>`;
  let patched = html.replace(
    /<script\s+id=["']aldusDuplicateDiagnosticsLoaderV(?:266|269|270|271|272|273|274|276|300|301)["'][^>]*><\/script>/gi,
    ""
  );
  patched = patched.replace(
    /<script\s+[^>]*src=["'][^"']*duplicate-diagnostics-loader-v(?:266|269)\.js[^"']*["'][^>]*><\/script>/gi,
    ""
  );
  patched = injectBeforeFinalClosingTag(patched, "</body>", tag);
  return patched;
}

function installDuplicateRecommendationsV309(html) {
  const tag = `<script id="aldusDuplicateDiagnosticsCoreV309" src="${DUPLICATE_RECOMMENDATIONS_CORE}"></script>`;
  const styleTag = `<link id="aldusDuplicateDiagnosticsStylesV309" rel="stylesheet" href="${DUPLICATE_DIAGNOSTICS_CORE_CSS}" />`;
  const corePattern = /<script\s+[^>]*src=["'][^"']*duplicate-diagnostics-v(?:260|303|304|309)\.js[^"']*["'][^>]*><\/script>/gi;
  let patched = html.replace(corePattern, "");
  patched = patched.replace(/<link\s+[^>]*href=["'][^"']*duplicate-diagnostics-v260\.css[^"']*["'][^>]*>/gi, "");
  return injectBeforeFinalClosingTag(patched, "</head>", `${styleTag}\n  ${tag}`);
}

function installDuplicateBatchV309(html) {
  const tag = `<script id="aldusDuplicateBatchAuthoritativeV309" src="${DUPLICATE_BATCH_HOTFIX}"></script>`;
  let patched = html.replace(
    /<script\s+id=["']aldusDuplicateBatchAuthoritativeV(?:302|303|304|305|309)["'][^>]*><\/script>/gi,
    ""
  );
  patched = patched.replace(
    /<script\s+[^>]*src=["'][^"']*duplicate-diagnostics-batch-v(?:302|303|304|305)\.js[^"']*["'][^>]*><\/script>/gi,
    ""
  );
  patched = injectBeforeFinalClosingTag(patched, "</body>", tag);
  return patched;
}

function installFactoryScheduleV277(html) {
  const tags = [
    `<script id="aldusFactoryScheduleScopeV277" src="${FACTORY_SCHEDULE_SCOPE}"></script>`,
    `<script id="aldusFactoryScheduleFiltersV280" src="${FACTORY_SCHEDULE_FILTERS}"></script>`,
    `<script id="aldusFactoryScheduleDatesV281" src="${FACTORY_SCHEDULE_DATES}"></script>`
  ].join("\n  ");
  let patched = html.replace(
    /<script\s+id=["']aldusFactoryScheduleScopeV\d+["'][^>]*><\/script>/gi,
    ""
  ).replace(
    /<script\s+id=["']aldusFactoryScheduleFiltersV\d+["'][^>]*><\/script>/gi,
    ""
  ).replace(
    /<script\s+id=["']aldusFactoryScheduleDatesV\d+["'][^>]*><\/script>/gi,
    ""
  );
  patched = patched.replace(
    /<script\s+[^>]*src=["'][^"']*factory-schedule-scope-v\d+\.js[^"']*["'][^>]*><\/script>/gi,
    ""
  ).replace(
    /<script\s+[^>]*src=["'][^"']*factory-schedule-filters-v\d+\.js[^"']*["'][^>]*><\/script>/gi,
    ""
  ).replace(
    /<script\s+[^>]*src=["'][^"']*factory-schedule-dates-v\d+\.js[^"']*["'][^>]*><\/script>/gi,
    ""
  );
  patched = injectBeforeFinalClosingTag(patched, "</body>", tags);
  return patched;
}

async function ensurePageStylesheets(response) {
  if (!response?.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const missingTags = [];
  if (!html.includes("question-history-contrast-v222.css")) missingTags.push(`<link rel="stylesheet" href="${CONTRAST_STYLESHEET}" />`);
  if (!html.includes("question-history-layout-v223.css")) missingTags.push(`<link rel="stylesheet" href="${HISTORY_LAYOUT_STYLESHEET}" />`);

  let patchedHtml = missingTags.length === 0
    ? html
    : html.includes("</head>")
      ? injectBeforeFinalClosingTag(html, "</head>", missingTags.join("\n  "))
      : `${missingTags.join("\n")}\n${html}`;

  patchedHtml = installSecurityHardeningV296(patchedHtml);
  patchedHtml = installProtectedBootstrapV275(patchedHtml);

  if (!patchedHtml.includes("planning-integrity-loader-v235.js")) {
    const scriptTag = `<script id="aldusPlanningIntegrityLoaderV235" src="${INTEGRITY_LOADER}"></script>`;
    patchedHtml = injectBeforeFinalClosingTag(patchedHtml, "</body>", scriptTag);
  }
  if (!patchedHtml.includes("timer-session-integrity-v236.js")) {
    const scriptTag = `<script id="aldusTimerSessionIntegrityV236" src="${TIMER_SESSION_INTEGRITY}"></script>`;
    patchedHtml = injectBeforeFinalClosingTag(patchedHtml, "</body>", scriptTag);
  }
  if (!patchedHtml.includes("timer-message-dedupe-v239.js")) {
    const scriptTag = `<script id="aldusTimerMessageDedupeV239" src="${TIMER_MESSAGE_DEDUPE}"></script>`;
    patchedHtml = injectBeforeFinalClosingTag(patchedHtml, "</body>", scriptTag);
  }
  if (!patchedHtml.includes("timer-audio-unifier-v241.js")) {
    const scriptTag = `<script id="aldusTimerAudioUnifierV241" src="${TIMER_AUDIO_UNIFIER}"></script>`;
    patchedHtml = injectBeforeFinalClosingTag(patchedHtml, "</body>", scriptTag);
  }
  if (!patchedHtml.includes("daily-summary-time-format-v243.js")) {
    const scriptTag = `<script id="aldusDailySummaryTimeFormatV243" src="${DAILY_SUMMARY_TIME_FORMAT}"></script>`;
    patchedHtml = injectBeforeFinalClosingTag(patchedHtml, "</body>", scriptTag);
  }

  patchedHtml = installDuplicateRecommendationsV309(patchedHtml);
  patchedHtml = installDuplicateDiagnosticsV276(patchedHtml);
  patchedHtml = installDuplicateBatchV309(patchedHtml);
  patchedHtml = installFactoryScheduleV277(patchedHtml);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-aldus-integrity-version", CURRENT_VERSION);
  headers.set("x-aldus-data-protection", PROTECTION_VERSION);
  headers.set("x-aldus-duplicate-search", "duplicate-flow-owner-v309");
  headers.set("x-aldus-entry-recovery", ENTRY_RECOVERY_VERSION);
  headers.set("x-aldus-factory-schedule", FACTORY_SCHEDULE_VERSION);
  headers.set("x-aldus-factory-schedule-filters", FACTORY_SCHEDULE_FILTERS_VERSION);
  headers.set("x-aldus-factory-schedule-dates", FACTORY_SCHEDULE_DATES_VERSION);
  headers.set("x-aldus-security", SECURITY_VERSION);

  return new Response(patchedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function responseHasProtectedBootstrap(response) {
  if (!response?.ok) return false;
  if (response.headers.get("x-aldus-integrity-version") !== CURRENT_VERSION) return false;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return false;
  const html = await response.clone().text();
  return html.includes('id="aldusBootstrapIntegrityLoaderV275"')
    && html.includes(BOOTSTRAP_PROTECTED)
    && html.includes(FAST_BOOTSTRAP_VERSION);
}

async function cacheNavigationResponse(response) {
  if (!response?.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(CANONICAL_DOCUMENT_URL, response.clone());
  return response;
}

async function refreshNavigation(request) {
  const response = await fetch(request, { cache: "no-store" });
  if (!response?.ok) throw new Error(`Navegação indisponível: ${response?.status || 0}`);
  const patchedResponse = await ensurePageStylesheets(response);
  if (!await responseHasProtectedBootstrap(patchedResponse)) {
    throw new Error("Navegação sem bootstrap V351 após transformação.");
  }
  return cacheNavigationResponse(patchedResponse);
}

async function cachedFirstNavigation(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(CANONICAL_DOCUMENT_URL, { ignoreSearch: true });

  if (cached && await responseHasProtectedBootstrap(cached)) {
    event?.waitUntil?.(refreshNavigation(request).catch((error) => {
      console.warn(`[${NAVIGATION_DELIVERY_VERSION}] Falha ao atualizar a navegação em segundo plano.`, error);
    }));
    return cached;
  }

  try {
    return await refreshNavigation(request);
  } catch (error) {
    console.error(`[${NAVIGATION_DELIVERY_VERSION}] Falha ao entregar navegação protegida.`, error);
  }

  if (cached) {
    try {
      const repaired = await ensurePageStylesheets(cached);
      if (await responseHasProtectedBootstrap(repaired)) {
        return cacheNavigationResponse(repaired);
      }
    } catch (error) {
      console.error(`[${NAVIGATION_DELIVERY_VERSION}] Falha ao reparar HTML cacheado.`, error);
    }
  }

  return new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
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
    event.respondWith(cachedFirstNavigation(request, event));
    return;
  }
  if (STATIC_PATHS.has(url.pathname)) event.respondWith(cacheFirstStatic(request));
});
