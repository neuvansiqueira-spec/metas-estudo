const PREVIOUS_VERSION = "20260717-numero-qc-v26";
const CURRENT_VERSION = "20260717-cronometro-livre-motivacao-v27";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const ASSET_CACHE_NAME = `${CACHE_NAME}-startup-v2`;
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
  "icons/logo-mark.svg",
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

function replaceVersion(source) {
  return String(source || "").split(PREVIOUS_VERSION).join(CURRENT_VERSION);
}

function patchHtmlSource(source) {
  return replaceVersion(source);
}

function patchAppScriptSource(source) {
  const oldGuard = 'if (!goal || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;';
  const newGuard = 'if ((floatingTimer.mode !== "free" && !goal) || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;';
  return replaceVersion(source)
    .replace(oldGuard, newGuard)
    .replace("const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 5000;", "const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000;");
}

async function patchTextResponse(response, transform, contentType) {
  if (!response || !response.ok) return response;
  const source = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.set("content-type", contentType);
  return new Response(transform(source), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function patchHtmlResponse(response) {
  return patchTextResponse(response, patchHtmlSource, "text/html; charset=utf-8");
}

function patchAppScriptResponse(response) {
  return patchTextResponse(response, patchAppScriptSource, "application/javascript; charset=utf-8");
}

function isMainAppScript(request) {
  try {
    return new URL(request.url).pathname.endsWith("/script.js");
  } catch (error) {
    return false;
  }
}

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    const patchedResponse = await patchHtmlResponse(networkResponse);
    cacheResponse(request, patchedResponse.clone());
    return patchedResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request) || await caches.match("index.html");
    return cachedResponse ? patchHtmlResponse(cachedResponse) : cachedResponse;
  }
}

async function patchedAppScript(request) {
  try {
    const networkResponse = await fetch(request);
    const patchedResponse = await patchAppScriptResponse(networkResponse);
    cacheResponse(request, patchedResponse.clone());
    return patchedResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse ? patchAppScriptResponse(cachedResponse) : cachedResponse;
  }
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

  if (isMainAppScript(event.request)) {
    event.respondWith(patchedAppScript(event.request));
    return;
  }

  if (shouldPreferNetwork(event.request) && (event.request.mode === "navigate" || event.request.destination === "document")) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (["script", "style", "worker", "image", "manifest"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
