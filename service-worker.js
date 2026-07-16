// versão anterior: metas-estudo-20260714-conselheiro-local-v1
const CACHE_NAME = "metas-estudo-20260716-exportacao-didatica-v5";
const ASSET_CACHE_NAME = `${CACHE_NAME}-startup-v1`;
const FILES_TO_CACHE = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "analytics-engine.js",
  "study-advisor.js",
  "advisor-navigation-engine.js",
  "storage-indexeddb.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== ASSET_CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

function shouldPreferNetwork(request) {
  const destination = request.destination;
  return request.mode === "navigate" || ["document", "script", "style", "worker"].includes(destination);
}

function cacheResponse(request, response) {
  if (!response || !response.ok) return;
  caches.open(ASSET_CACHE_NAME).then((cache) => cache.put(request, response));
}

function networkFirstNavigation(request) {
  return fetch(request)
    .then((response) => {
      cacheResponse(request, response.clone());
      return response;
    })
    .catch(() => caches.match(request).then((cachedResponse) => cachedResponse || caches.match("index.html")));
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cachedResponse) => {
    const networkResponse = fetch(request)
      .then((response) => {
        cacheResponse(request, response.clone());
        return response;
      })
      .catch(() => cachedResponse);
    return cachedResponse || networkResponse;
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // HTML remains network-first so deployments are visible immediately. App assets use
  // stale-while-revalidate: a warm cache opens instantly and is refreshed in background.
  if (shouldPreferNetwork(event.request) && (event.request.mode === "navigate" || event.request.destination === "document")) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (["script", "style", "worker", "image", "manifest"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
