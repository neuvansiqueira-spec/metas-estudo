const CACHE_NAME = "metas-estudo-cache-20260708-delete-controls-v2";
const FILES_TO_CACHE = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "custom-actions.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

function shouldPreferNetwork(request) {
  const destination = request.destination;
  return request.mode === "navigate" || ["document", "script", "style", "worker"].includes(destination);
}

function isHtmlResponse(response) {
  return (response.headers.get("content-type") || "").includes("text/html");
}

function isScriptJsRequest(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith("/script.js") || url.pathname.endsWith("script.js");
}

async function injectCustomActionsIntoHtml(response) {
  if (!response || !isHtmlResponse(response)) return response;
  const html = await response.clone().text();
  if (html.includes("custom-actions.js")) return response;
  const patched = html.includes("</body>")
    ? html.replace("</body>", '<script src="custom-actions.js?v=20260708-delete-controls-v2"></script></body>')
    : `${html}<script src="custom-actions.js?v=20260708-delete-controls-v2"></script>`;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function injectCustomActionsIntoScript(response) {
  const script = await response.clone().text();
  if (script.includes("20260708-delete-discipline-subject-v1")) return response;
  let custom = "";
  try {
    custom = await fetch("custom-actions.js?v=20260708-delete-controls-v2").then((res) => res.ok ? res.text() : "");
  } catch (error) {
    custom = "";
  }
  if (!custom) return response;
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/javascript;charset=utf-8");
  headers.delete("content-length");
  return new Response(`${script}\n\n;${custom}`, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    const cacheResponse = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheResponse));
    if (isScriptJsRequest(request)) return injectCustomActionsIntoScript(response);
    return injectCustomActionsIntoHtml(response);
  } catch (error) {
    const cachedResponse = await caches.match(request) || await caches.match("index.html");
    if (isScriptJsRequest(request)) return injectCustomActionsIntoScript(cachedResponse);
    return injectCustomActionsIntoHtml(cachedResponse);
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (shouldPreferNetwork(event.request)) {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
