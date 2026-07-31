"use strict";

const CURRENT_VERSION = "20260730-contraste-resultado-liquido-v169";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const RUNTIME_PRELUDE_ASSET = "./daily-piece-audit-prelude-v186.js";
const RUNTIME_SAVE_ASSET = "./save-performance-v186.js";
const RUNTIME_DAILY_AUDIT_ASSET = "./daily-piece-audit-performance-v186.js";
const RUNTIME_CAPTURE_READER_ASSET = "./qconcursos-capture-segmented-v188.js";
const RUNTIME_CAPTURE_ACCURACY_ASSET = "./qconcursos-capture-accuracy-v190.js";
const RUNTIME_CAPTURE_BANK_ASSET = "./qconcursos-capture-bank-v188.js";
const RUNTIME_CAPTURE_REPROCESS_ASSET = "./qconcursos-capture-reprocess-v188.js";
const RUNTIME_CAPTURE_UI_STRICT_ASSET = "./qconcursos-capture-ui-strict-v190.js";
const RUNTIME_QB_JSON_IMPORT_ASSET = "./question-bank-json-import-v191.js";
const RUNTIME_QB_JSON_REVIEW_ASSET = "./question-bank-json-review-v192.js";
const RUNTIME_QB_JSON_CONTRAST_ASSET = "./question-bank-json-contrast-v193.js";
const RUNTIME_QB_JSON_PRIORITY_ASSET = "./question-bank-json-priority-v195.js";
const RUNTIME_QB_JSON_COMPLETION_ASSET = "./question-bank-json-completion-v196.js";
const RUNTIME_SCROLL_STABILITY_ASSET = "./loading-scrollbar-stability-v197.css";
const RUNTIME_QUESTION_HISTORY_CORE_ASSET = "./question-history-report-core-v198.js";
const RUNTIME_QUESTION_HISTORY_EXPORT_ASSET = "./question-history-report-export-v198.js";
const RUNTIME_QUESTION_HISTORY_UI_ASSET = "./question-history-report-ui-v198.js";
const RUNTIME_QUESTION_HISTORY_VISUAL_ASSET = "./question-history-visual-fix-v199.css";
const STATIC_ASSETS = [
  "./", "index.html", `app-v169.css?v=${CURRENT_VERSION}`, `app-v169.js?v=${CURRENT_VERSION}`,
  RUNTIME_PRELUDE_ASSET, RUNTIME_SAVE_ASSET, RUNTIME_DAILY_AUDIT_ASSET,
  RUNTIME_CAPTURE_READER_ASSET, RUNTIME_CAPTURE_ACCURACY_ASSET, RUNTIME_CAPTURE_BANK_ASSET,
  RUNTIME_CAPTURE_REPROCESS_ASSET, RUNTIME_CAPTURE_UI_STRICT_ASSET, RUNTIME_QB_JSON_IMPORT_ASSET,
  RUNTIME_QB_JSON_REVIEW_ASSET, RUNTIME_QB_JSON_CONTRAST_ASSET, RUNTIME_QB_JSON_PRIORITY_ASSET,
  RUNTIME_QB_JSON_COMPLETION_ASSET, RUNTIME_SCROLL_STABILITY_ASSET, RUNTIME_QUESTION_HISTORY_CORE_ASSET, RUNTIME_QUESTION_HISTORY_EXPORT_ASSET, RUNTIME_QUESTION_HISTORY_UI_ASSET, RUNTIME_QUESTION_HISTORY_VISUAL_ASSET,
  "vendor/pdf.mjs", "vendor/pdf.worker.mjs", "vendor/pdfjs-LICENSE.txt", "manifest.json",
  "icons/aldus-visual.png", "icons/aldus-brand-mark-v93.png", "icons/logo-mark.svg", "icons/icon.svg", "icons/icon-maskable.svg"
];
const STATIC_PATHS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))));
  self.skipWaiting();
});
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("metas-estudo-") && name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

async function putStaticResponse(request, response) {
  if (!response?.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}
function fetchAndCache(request) { return fetch(request, { cache: "no-store" }).then((response) => putStaticResponse(request, response)); }
async function cachedNavigation(request, event) {
  const network = fetchAndCache(request).catch(() => null); event.waitUntil(network.then(() => undefined));
  const cached = await caches.match(request, { ignoreSearch: true }) || await caches.match(new URL("index.html", self.registration.scope).href, { ignoreSearch: true });
  if (cached) return cached;
  return await network || new Response("Aplicativo indisponível temporariamente.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
}
async function cachedStatic(request, event) {
  const network = fetchAndCache(request).catch(() => null); event.waitUntil(network.then(() => undefined));
  return await caches.match(request, { ignoreSearch: true }) || await network || new Response("Recurso indisponível temporariamente.", { status: 503 });
}
async function runtimeAssetText(asset) {
  const request = new Request(new URL(asset, self.registration.scope), { cache: "no-store" });
  const cached = await caches.match(request, { ignoreSearch: true });
  const response = cached || await fetch(request);
  if (!response?.ok) throw new Error(`Falha ao carregar módulo: ${asset}`);
  return response.text();
}
function injectBeforeMarker(source, marker, injectedSource, label) {
  const position = source.indexOf(marker);
  if (position < 0) throw new Error(`Marcador ausente para ${label}: ${marker}`);
  return `${source.slice(0, position)}${injectedSource}\n\n${source.slice(position)}`;
}
function replaceSourceModule(source, possibleMarkers, nextMarker, newMarker, replacementSource) {
  const marker = possibleMarkers.find((candidate) => source.includes(candidate));
  if (!marker) throw new Error("Não foi possível localizar o leitor antigo de captura.");
  const start = source.indexOf(marker); const end = source.indexOf(nextMarker, start + marker.length);
  if (start < 0 || end < 0) throw new Error(`Não foi possível substituir o módulo ${marker}`);
  return `${source.slice(0, start)}${newMarker}\n${replacementSource.trim()}\n\n${source.slice(end)}`;
}
function repairCaptureReaderSource(source) {
  const repaired = source.replace(/(\n\s*)alternativas,(\n\s*comentarioQc:)/, "$1alternativas: alternatives,$2");
  if (!repaired.includes("alternativas: alternatives")) throw new Error("Não foi possível aplicar a correção do campo alternativas.");
  return repaired;
}

async function patchedApplicationResponse(request, event) {
  const response = await cachedStatic(request, event);
  if (!response?.ok) return response;
  try {
    const [applicationSource, preludeSource, saveSource, dailyAuditSource, captureReaderSource, captureAccuracySource, captureBankSource, captureReprocessSource, captureUiStrictSource, qbJsonImportSource, qbJsonReviewSource, qbJsonContrastSource, qbJsonPrioritySource, qbJsonCompletionSource, questionHistoryCoreSource, questionHistoryExportSource, questionHistoryUiSource] = await Promise.all([
      response.text(), runtimeAssetText(RUNTIME_PRELUDE_ASSET), runtimeAssetText(RUNTIME_SAVE_ASSET), runtimeAssetText(RUNTIME_DAILY_AUDIT_ASSET),
      runtimeAssetText(RUNTIME_CAPTURE_READER_ASSET), runtimeAssetText(RUNTIME_CAPTURE_ACCURACY_ASSET), runtimeAssetText(RUNTIME_CAPTURE_BANK_ASSET),
      runtimeAssetText(RUNTIME_CAPTURE_REPROCESS_ASSET), runtimeAssetText(RUNTIME_CAPTURE_UI_STRICT_ASSET), runtimeAssetText(RUNTIME_QB_JSON_IMPORT_ASSET), runtimeAssetText(RUNTIME_QB_JSON_REVIEW_ASSET), runtimeAssetText(RUNTIME_QB_JSON_CONTRAST_ASSET),
      runtimeAssetText(RUNTIME_QB_JSON_PRIORITY_ASSET), runtimeAssetText(RUNTIME_QB_JSON_COMPLETION_ASSET), runtimeAssetText(RUNTIME_QUESTION_HISTORY_CORE_ASSET), runtimeAssetText(RUNTIME_QUESTION_HISTORY_EXPORT_ASSET), runtimeAssetText(RUNTIME_QUESTION_HISTORY_UI_ASSET)
    ]);
    const repairedReader = repairCaptureReaderSource(captureReaderSource);
    let patchedSource = applicationSource
      .replaceAll("20260730-meta-diaria-peca-delegado-v169", CURRENT_VERSION)
      .replaceAll("20260730-carregamento-salvamento-rapido-v169", CURRENT_VERSION)
      .replaceAll("20260730-importacao-completa-captura-v169", CURRENT_VERSION)
      .replaceAll("20260730-segmentacao-cartoes-qconcursos-v169", CURRENT_VERSION)
      .replaceAll("20260730-correcao-alternativas-qconcursos-v169", CURRENT_VERSION)
      .replaceAll("20260730-ocr-conservador-qconcursos-v169", CURRENT_VERSION)
      .replaceAll("20260730-importacao-json-completa-qconcursos-v169", CURRENT_VERSION)
      .replaceAll("20260730-revisao-visivel-json-qconcursos-v169", CURRENT_VERSION)
      .replaceAll("20260730-contraste-revisao-json-qconcursos-v169", CURRENT_VERSION)
      .replaceAll("20260730-restaura-carregamento-json-v169", CURRENT_VERSION)
      .replaceAll("20260730-prioridade-revisao-json-v169", CURRENT_VERSION)
      .replaceAll("20260730-confirmacao-final-json-v169", CURRENT_VERSION)
      .replaceAll("20260730-estabiliza-rolagem-carregamento-v169", CURRENT_VERSION)
      .replaceAll("20260730-filtro-relatorio-historico-questoes-v169", CURRENT_VERSION)
      .replaceAll("20260730-contraste-resultado-liquido-v169", CURRENT_VERSION);

    if (!patchedSource.includes("/* Aldus runtime source: save-performance-v186.js */")) patchedSource = injectBeforeMarker(patchedSource, "/* Aldus source: question-accuracy-spectrum.js */", `/* Aldus runtime source: save-performance-v186.js */\n${saveSource}`, "salvamento responsivo");
    if (!patchedSource.includes("/* Aldus runtime source: daily-piece-audit-prelude-v186.js */")) patchedSource = injectBeforeMarker(patchedSource, "/* Aldus source: daily-delegate-piece-goal-v183.js */", `/* Aldus runtime source: daily-piece-audit-prelude-v186.js */\n${preludeSource}`, "preâmbulo da auditoria de Peças");
    if (!patchedSource.includes("/* Aldus runtime source: daily-piece-audit-performance-v186.js */")) patchedSource = injectBeforeMarker(patchedSource, "/* Aldus source: analytics-view-controller-v179.js */", `/* Aldus runtime source: daily-piece-audit-performance-v186.js */\n${dailyAuditSource}`, "auditoria consolidada de Peças");

    patchedSource = replaceSourceModule(
      patchedSource,
      ["/* Aldus source: qconcursos-capture-import-v182.js */", "/* Aldus runtime source: qconcursos-capture-complete-v187.js */", "/* Aldus runtime source: qconcursos-capture-segmented-v188.js */", "/* Aldus runtime source: qconcursos-capture-accuracy-v190.js */"],
      "/* Aldus source: script.js */",
      "/* Aldus runtime source: qconcursos-capture-accuracy-v190.js */",
      `${repairedReader}\n\n${captureAccuracySource}`
    );

    const qbEventsMarker = 'elements.qbPdfFile?.addEventListener("change", (event) => qbReadPdfImportFile(event.target.files?.[0]));';
    if (!patchedSource.includes("/* Aldus runtime source: qconcursos-capture-bank-v188.js */")) {
      patchedSource = injectBeforeMarker(
        patchedSource,
        qbEventsMarker,
        `/* Aldus runtime source: qconcursos-capture-bank-v188.js */\n${captureBankSource}\n\n/* Aldus runtime source: qconcursos-capture-reprocess-v188.js */\n${captureReprocessSource}\n\n/* Aldus runtime source: qconcursos-capture-ui-strict-v190.js */\n${captureUiStrictSource}`,
        "integração do OCR conservador e revisão obrigatória"
      );
    }
    if (!patchedSource.includes("/* Aldus runtime source: question-bank-json-review-v192.js */")) {
      patchedSource = injectBeforeMarker(patchedSource, qbEventsMarker, `/* Aldus runtime source: question-bank-json-review-v192.js */\n${qbJsonReviewSource}`, "painel visível de revisão da importação JSON");
    }
    if (!patchedSource.includes("/* Aldus runtime source: question-bank-json-contrast-v193.js */")) {
      patchedSource = injectBeforeMarker(patchedSource, qbEventsMarker, `/* Aldus runtime source: question-bank-json-contrast-v193.js */\n${qbJsonContrastSource}`, "contraste legível do painel de revisão JSON");
    }
    if (!patchedSource.includes("/* Aldus runtime source: question-bank-json-priority-v195.js */")) {
      patchedSource = injectBeforeMarker(patchedSource, qbEventsMarker, `/* Aldus runtime source: question-bank-json-priority-v195.js */\n${qbJsonPrioritySource}`, "prioridade da revisão JSON sobre importadores antigos");
    }
    if (!patchedSource.includes("/* Aldus runtime source: question-bank-json-completion-v196.js */")) {
      patchedSource = injectBeforeMarker(patchedSource, qbEventsMarker, `/* Aldus runtime source: question-bank-json-completion-v196.js */\n${qbJsonCompletionSource}`, "confirmação final visível da importação JSON");
    }
    if (!patchedSource.includes("/* Aldus runtime source: question-history-report-core-v198.js */")) {
      patchedSource = injectBeforeMarker(patchedSource, qbEventsMarker, `/* Aldus runtime source: question-history-report-core-v198.js */\n${questionHistoryCoreSource}\n\n/* Aldus runtime source: question-history-report-export-v198.js */\n${questionHistoryExportSource}\n\n/* Aldus runtime source: question-history-report-ui-v198.js */\n${questionHistoryUiSource}`, "filtros e exportação do histórico de questões");
    }
    if (!patchedSource.includes("/* Aldus runtime source: question-bank-json-import-v191.js */")) {
      patchedSource = injectBeforeMarker(patchedSource, qbEventsMarker, `/* Aldus runtime source: question-bank-json-import-v191.js */\n${qbJsonImportSource}`, "importação JSON completa do QConcursos");
    }

    const requiredMarkers = [
      "/* Aldus runtime source: question-bank-json-review-v192.js */",
      "/* Aldus runtime source: question-bank-json-contrast-v193.js */",
      "/* Aldus runtime source: question-bank-json-priority-v195.js */",
      "/* Aldus runtime source: question-bank-json-completion-v196.js */",
      "/* Aldus runtime source: question-history-report-core-v198.js */",
      "/* Aldus runtime source: question-history-report-export-v198.js */",
      "/* Aldus runtime source: question-history-report-ui-v198.js */",
      "/* Aldus runtime source: question-bank-json-import-v191.js */"
    ];
    const missingMarkers = requiredMarkers.filter((marker) => !patchedSource.includes(marker));
    if (missingMarkers.length) throw new Error(`Módulos obrigatórios ausentes: ${missingMarkers.join(", ")}`);
    const importIndex = patchedSource.indexOf(requiredMarkers[7]);
    if (![0, 2, 3, 4, 5, 6].every((index) => patchedSource.indexOf(requiredMarkers[index]) < importIndex)) throw new Error("A revisão e o relatório de questões não receberam prioridade sobre o importador direto.");

    const headers = new Headers(response.headers);
    for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-aldus-runtime-patch", CURRENT_VERSION);
    return new Response(patchedSource, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.warn("[Aldus V199] Não foi possível montar o relatório filtrado de questões; o aplicativo original será mantido.", error);
    return response;
  }
}

async function patchedStylesheetResponse(request, event) {
  const response = await cachedStatic(request, event);
  if (!response?.ok) return response;
  try {
    const [stylesheetSource, stabilitySource, questionHistoryVisualSource] = await Promise.all([
      response.text(),
      runtimeAssetText(RUNTIME_SCROLL_STABILITY_ASSET),
      runtimeAssetText(RUNTIME_QUESTION_HISTORY_VISUAL_ASSET)
    ]);
    const stabilityMarker = "/* Aldus runtime source: loading-scrollbar-stability-v197.css */";
    const visualMarker = "/* Aldus runtime source: question-history-visual-fix-v199.css */";
    let patchedSource = stylesheetSource.includes(stabilityMarker)
      ? stylesheetSource
      : `${stylesheetSource.trim()}\n\n${stabilityMarker}\n${stabilitySource.trim()}\n`;
    if (!patchedSource.includes(visualMarker)) patchedSource = `${patchedSource.trim()}\n\n${visualMarker}\n${questionHistoryVisualSource.trim()}\n`;
    const headers = new Headers(response.headers);
    for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
    headers.set("content-type", "text/css; charset=utf-8");
    headers.set("x-aldus-runtime-style-patch", CURRENT_VERSION);
    return new Response(patchedSource, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.warn("[Aldus V199] Não foi possível aplicar o contraste do histórico de questões; o CSS original será mantido.", error);
    return response;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate" || request.destination === "document") { event.respondWith(cachedNavigation(request, event)); return; }
  if (url.pathname.endsWith("/app-v169.css")) { event.respondWith(patchedStylesheetResponse(request, event)); return; }
  if (url.pathname.endsWith("/app-v169.js")) { event.respondWith(patchedApplicationResponse(request, event)); return; }
  if (STATIC_PATHS.has(url.pathname)) event.respondWith(cachedStatic(request, event));
});
