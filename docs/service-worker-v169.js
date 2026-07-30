"use strict";

const CURRENT_VERSION = "20260730-concluidos-fora-do-plano-v169";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const RUNTIME_PATCH_ASSET = `completed-goal-guard-v176.js?v=${CURRENT_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-v169.css?v=${CURRENT_VERSION}`,
  `app-v169.js?v=${CURRENT_VERSION}`,
  RUNTIME_PATCH_ASSET,
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

function isMainApplicationScript(request) {
  return new URL(request.url).pathname.endsWith("/app-v169.js");
}

async function appendRuntimePatch(request, response) {
  if (!response?.ok || !isMainApplicationScript(request)) return response;
  try {
    const appText = await response.text();
    const patchUrl = new URL(RUNTIME_PATCH_ASSET, self.registration.scope);
    const patchResponse = await fetch(patchUrl, { cache: "no-store" });
    if (!patchResponse.ok) return new Response(appText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    const patchText = await patchResponse.text();
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/javascript; charset=utf-8");
    ["content-length", "content-encoding", "etag", "last-modified"].forEach((name) => headers.delete(name));
    return new Response(`${appText}\n\n/* Aldus runtime patch: completed-goal-guard-v176.js */\n${patchText}\n`, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.warn("[Aldus V176] Falha ao anexar a correção ao aplicativo.", error);
    return response;
  }
}

async function putStaticResponse(request, response) {
  if (!response?.ok) return response;
  const prepared = await appendRuntimePatch(request, response);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, prepared.clone());
  return prepared;
}

async function precacheApplication() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(STATIC_ASSETS);
  const appRequest = new Request(new URL(`app-v169.js?v=${CURRENT_VERSION}`, self.registration.scope));
  const appResponse = await fetch(appRequest, { cache: "no-store" });
  await putStaticResponse(appRequest, appResponse);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplication());
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
  if (isMainApplicationScript(request)) {
    const fresh = await network;
    if (fresh) return fresh;
  }
  const cached = await caches.match(request, { ignoreSearch: true });
  return cached || await network || new Response("Recurso indisponível temporariamente.", { status: 503 });
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

  if (STATIC_PATHS.has(url.pathname)) {
    event.respondWith(cachedStatic(request, event));
  }
});
