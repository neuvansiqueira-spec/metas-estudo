"use strict";

const CURRENT_VERSION = "20260730-carregamento-salvamento-rapido-v169";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const RUNTIME_PRELUDE_ASSET = "./daily-piece-audit-prelude-v186.js";
const RUNTIME_SAVE_ASSET = "./save-performance-v186.js";
const RUNTIME_DAILY_AUDIT_ASSET = "./daily-piece-audit-performance-v186.js";
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-v169.css?v=${CURRENT_VERSION}`,
  `app-v169.js?v=${CURRENT_VERSION}`,
  RUNTIME_PRELUDE_ASSET,
  RUNTIME_SAVE_ASSET,
  RUNTIME_DAILY_AUDIT_ASSET,
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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("metas-estudo-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

async function putStaticResponse(request, response) {
  if (!response?.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

function fetchAndCache(request) {
  return fetch(request, { cache: "no-store" })
    .then((response) => putStaticResponse(request, response));
}

async function cachedNavigation(request, event) {
  const network = fetchAndCache(request).catch(() => null);
  event.waitUntil(network.then(() => undefined));

  const cached = await caches.match(request, { ignoreSearch: true })
    || await caches.match(new URL("index.html", self.registration.scope).href, { ignoreSearch: true });
  if (cached) return cached;

  const fresh = await network;
  return fresh || new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function cachedStatic(request, event) {
  const network = fetchAndCache(request).catch(() => null);
  event.waitUntil(network.then(() => undefined));
  const cached = await caches.match(request, { ignoreSearch: true });
  return cached || await network || new Response("Recurso indisponível temporariamente.", { status: 503 });
}

async function runtimeAssetText(asset) {
  const request = new Request(new URL(asset, self.registration.scope), { cache: "no-store" });
  const cached = await caches.match(request, { ignoreSearch: true });
  const response = cached || await fetch(request);
  if (!response?.ok) throw new Error(`Falha ao carregar módulo de desempenho: ${asset}`);
  return response.text();
}

function injectBeforeMarker(source, marker, injectedSource, label) {
  const position = source.indexOf(marker);
  if (position < 0) throw new Error(`Marcador ausente para ${label}: ${marker}`);
  return `${source.slice(0, position)}${injectedSource}\n\n${source.slice(position)}`;
}

async function patchedApplicationResponse(request, event) {
  const response = await cachedStatic(request, event);
  if (!response?.ok) return response;

  try {
    const [applicationSource, preludeSource, saveSource, dailyAuditSource] = await Promise.all([
      response.text(),
      runtimeAssetText(RUNTIME_PRELUDE_ASSET),
      runtimeAssetText(RUNTIME_SAVE_ASSET),
      runtimeAssetText(RUNTIME_DAILY_AUDIT_ASSET)
    ]);

    let patchedSource = applicationSource.replaceAll(
      "20260730-meta-diaria-peca-delegado-v169",
      CURRENT_VERSION
    );
    patchedSource = injectBeforeMarker(
      patchedSource,
      "/* Aldus source: question-accuracy-spectrum.js */",
      `/* Aldus runtime source: save-performance-v186.js */\n${saveSource}`,
      "salvamento responsivo"
    );
    patchedSource = injectBeforeMarker(
      patchedSource,
      "/* Aldus source: daily-delegate-piece-goal-v183.js */",
      `/* Aldus runtime source: daily-piece-audit-prelude-v186.js */\n${preludeSource}`,
      "preâmbulo da auditoria de Peças"
    );
    patchedSource = injectBeforeMarker(
      patchedSource,
      "/* Aldus source: analytics-view-controller-v179.js */",
      `/* Aldus runtime source: daily-piece-audit-performance-v186.js */\n${dailyAuditSource}`,
      "auditoria consolidada de Peças"
    );

    const headers = new Headers(response.headers);
    for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-aldus-runtime-patch", CURRENT_VERSION);
    return new Response(patchedSource, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.warn("[Aldus V186] Não foi possível aplicar a otimização em tempo de execução.", error);
    return response;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(cachedNavigation(request, event));
    return;
  }

  if (url.pathname.endsWith("/app-v169.js")) {
    event.respondWith(patchedApplicationResponse(request, event));
    return;
  }

  if (STATIC_PATHS.has(url.pathname)) {
    event.respondWith(cachedStatic(request, event));
  }
});
