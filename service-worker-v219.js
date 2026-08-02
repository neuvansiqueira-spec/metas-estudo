"use strict";

const CURRENT_VERSION = "20260802-versionamento-publicacao-estavel-v219";
const RELEASE_SUFFIX = CURRENT_VERSION.match(/v\d+$/)?.[0] || "current";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "index.html",
  `app-${RELEASE_SUFFIX}.css?v=${CURRENT_VERSION}`,
  `app-${RELEASE_SUFFIX}.js?v=${CURRENT_VERSION}`,
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

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) return cacheResponse(request, response);
  } catch {}

  const cached = await caches.match(request, { ignoreSearch: true })
    || await caches.match(new URL("index.html", self.registration.scope).href, { ignoreSearch: true });
  return cached || new Response("Aplicativo indisponível temporariamente.", {
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
