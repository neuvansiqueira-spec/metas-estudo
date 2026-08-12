"use strict";

const CURRENT_VERSION = "20260812-gerador-simulados-visibilidade-v315";
const RELEASE_SUFFIX = CURRENT_VERSION.match(/v\d+$/)?.[0] || "current";
const SECURITY_VERSION = "20260810-seguranca-estabilidade-v296";
const PROTECTION_VERSION = "20260808-catastrophic-state-recovery-v275";
const BOOTSTRAP_VERSION = "20260812-gerador-simulados-visibilidade-v315";
const DUPLICATE_CONTINUITY_VERSION = "20260811-duplicate-flow-owner-v309";
const DUPLICATE_RECOMMENDATIONS_VERSION = "20260811-duplicate-flow-owner-v309";
const DUPLICATE_BATCH_HOTFIX_VERSION = "20260811-duplicate-flow-owner-v309";
const ENTRY_RECOVERY_VERSION = "20260811-duplicate-flow-owner-v309";
const FACTORY_SCHEDULE_VERSION = "20260808-factory-schedule-scope-v277";
const FACTORY_SCHEDULE_FILTERS_VERSION = "20260808-factory-schedule-planning-preview-filters-v280";
const FACTORY_SCHEDULE_DATES_VERSION = "20260809-factory-schedule-planning-dates-v281";
const QUESTIONS_HUB_VERSION = "20260810-questoes-integradas-v298";
const QUESTION_JSON_DETAILS_VERSION = "20260810-revisao-json-explicacoes-v299";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-factory-weekly-dedupe-v237-hotfix2-timer-alarm-audio-v297-hotfix5-timer-audio-unified-v241-hotfix1-timer-message-last-five-v242-hotfix1-daily-summary-direct-v244-hotfix2-duplicate-search-v274-data-protection-v275-duplicate-consolidation-continuity-v276-duplicate-recommended-batch-v300-duplicate-batch-persistence-v301-duplicate-batch-performance-v304-duplicate-batch-commit-v305-entry-parser-recovery-v306-duplicate-core-delivery-v307-duplicate-batch-core-pin-v308-duplicate-flow-owner-v309-factory-schedule-v277-factory-schedule-preview-v280-factory-schedule-dates-v281-planning-shift-save-v283-weekly-registered-minutes-hotfix4-security-v296-questions-hub-v298-question-json-details-v299-factory-simulado-escolha-automatica-v312-simulado-interativo-v313-integracao-v314-factory-simulado-visibility-v315`;
const CONTRAST_VERSION = "20260802-contraste-distribuicao-v222";
const CONTRAST_STYLESHEET = `question-history-contrast-v222.css?v=${CONTRAST_VERSION}`;
const HISTORY_LAYOUT_VERSION = "20260802-tabela-historico-compacta-v223";
const HISTORY_LAYOUT_STYLESHEET = `question-history-layout-v223.css?v=${HISTORY_LAYOUT_VERSION}`;
const FACTORY_QUEUE_INTEGRITY = `factory-queue-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=factory-queue-integrity-hotfix5`;
const FACTORY_DESTINATION_INTEGRITY = "factory-destination-integrity-v237.js?v=20260804-pastas-destino-classificacao-exata-v237&hotfix=discipline-topic-exact1";
const FACTORY_SCHEDULE_SCOPE = `factory-schedule-scope-v277.js?v=${FACTORY_SCHEDULE_VERSION}`;
const FACTORY_SCHEDULE_FILTERS = `factory-schedule-filters-v279.js?v=${FACTORY_SCHEDULE_FILTERS_VERSION}`;
const FACTORY_SCHEDULE_DATES = `factory-schedule-dates-v281.js?v=${FACTORY_SCHEDULE_DATES_VERSION}`;
const TIMER_AUDIO_RECOVERY = "timer-audio-recovery-v236.js?v=20260810-timer-alarm-audio-v297&hotfix=timer-audio-recovery-hotfix5";
const TIMER_AUDIO_UNIFIER = "timer-audio-unifier-v241.js?v=20260805-timer-audio-unified-v241&hotfix=timer-audio-unifier-hotfix1";
const TIMER_MESSAGE_DEDUPE = "timer-message-dedupe-v239.js?v=20260805-timer-message-last-five-v242&hotfix=timer-message-last-five-hotfix1";
const DAILY_SUMMARY_TIME_FORMAT = "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix4";
const TIMER_SESSION_INTEGRITY = `timer-session-integrity-v236.js?v=${CURRENT_VERSION}&hotfix=timer-session-integrity-hotfix1`;
const INTEGRITY_LOADER = `planning-integrity-loader-v235.js?v=${CURRENT_VERSION}`;
const INTEGRITY_CORE = `planning-integrity-v235.js?v=${CURRENT_VERSION}`;
const CATASTROPHIC_STATE_GUARD = `catastrophic-state-guard-v275.js?v=${PROTECTION_VERSION}`;
const BOOTSTRAP_PROTECTED = `bootstrap-integrity-loader-v275.js?v=${BOOTSTRAP_VERSION}`;
const BOOTSTRAP_CORE = `bootstrap-integrity-loader-v258-core.js?v=${BOOTSTRAP_VERSION}`;
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
const QUESTIONS_HUB_SCRIPT = `questions-hub-v298.js?v=${QUESTIONS_HUB_VERSION}`;
const QUESTION_JSON_DETAILS_SCRIPT = `question-bank-json-details-v299.js?v=${QUESTION_JSON_DETAILS_VERSION}`;
const FACTORY_SIMULADO_SCRIPT = "factory-simulado-prompt-v310.js?v=20260811-gerador-simulados-escolha-automatica-v312";
const FACTORY_SIMULADO_STYLESHEET = "factory-simulado-prompt-v310.css?v=20260811-gerador-simulados-escolha-automatica-v312";
const FACTORY_SIMULADO_VISIBILITY_LOADER = "factory-simulado-visibility-v315.js?v=20260812-gerador-simulados-visibilidade-v315";
const SIMULADO_INTERATIVO_SCRIPT = "simulado-interativo-v313.js?v=20260811-simulado-interativo-v313";
const SIMULADO_INTERATIVO_STYLESHEET = "simulado-interativo-v313.css?v=20260811-simulado-interativo-v313";
const SIMULADO_INTEGRACAO_SCRIPT = "simulado-integracao-v314.js?v=20260811-simulado-integracao-v314";
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
  TIMER_AUDIO_UNIFIER,
  TIMER_MESSAGE_DEDUPE,
  DAILY_SUMMARY_TIME_FORMAT,
  TIMER_SESSION_INTEGRITY,
  INTEGRITY_LOADER,
  INTEGRITY_CORE,
  CATASTROPHIC_STATE_GUARD,
  BOOTSTRAP_PROTECTED,
  BOOTSTRAP_CORE,
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
  SIMULADO_INTERATIVO_SCRIPT,
  SIMULADO_INTERATIVO_STYLESHEET,
  SIMULADO_INTEGRACAO_SCRIPT,
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
const STATIC_PATHS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));
const ESSENTIAL_ASSETS = ["./", "index.html", `app-${RELEASE_SUFFIX}.css?v=${CURRENT_VERSION}`, `app-${RELEASE_SUFFIX}.js?v=${CURRENT_VERSION}`, QUESTIONS_HUB_STYLESHEET, QUESTIONS_HUB_SCRIPT, QUESTION_JSON_DETAILS_SCRIPT, FACTORY_SIMULADO_SCRIPT, FACTORY_SIMULADO_STYLESHEET, FACTORY_SIMULADO_VISIBILITY_LOADER, SIMULADO_INTERATIVO_SCRIPT, SIMULADO_INTERATIVO_STYLESHEET, SIMULADO_INTEGRACAO_SCRIPT, DUPLICATE_RECOMMENDATIONS_CORE, DUPLICATE_DIAGNOSTICS_CORE_CSS, DUPLICATE_BATCH_HOTFIX, SECURITY_HARDENING, CATASTROPHIC_STATE_GUARD, BOOTSTRAP_PROTECTED, BOOTSTRAP_CORE];

async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ESSENTIAL_ASSETS);
  const essential = new Set(ESSENTIAL_ASSETS);
  await Promise.allSettled(STATIC_ASSETS.filter((asset) => !essential.has(asset)).map((asset) => cache.add(asset)));
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

  const tags = [
    `<script id="aldusCatastrophicStateGuardV275" src="${CATASTROPHIC_STATE_GUARD}"></script>`,
    `<script id="aldusBootstrapIntegrityLoaderV275" src="${BOOTSTRAP_PROTECTED}"></script>`
  ].join("\n  ");
  return injectBeforeFinalClosingTag(patched, "</body>", tags);
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
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (STATIC_PATHS.has(url.pathname)) event.respondWith(cacheFirstStatic(request));
});
