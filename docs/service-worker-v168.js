"use strict";

const CURRENT_VERSION = "20260729-sem-reforco-automatico-v169";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-v169.css?v=${CURRENT_VERSION}`,
  `app-v169.js?v=${CURRENT_VERSION}`,
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
