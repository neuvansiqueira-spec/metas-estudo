const CACHE_NAME = "metas-estudo-cache-20260708-delete-controls";
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

async function injectCustomActions(response) {
  if (!response || !isHtmlResponse(response)) return response;
  const html = await response.clone().text();
  if (html.includes("custom-actions.js")) return response;
  const patched = html.includes("</body>")
    ? html.replace("</body>", '<script src="custom-actions.js"></script></body>')
    : `${html}<script src="custom-actions.js"></script>`;
  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    const cacheResponse = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheResponse));
    return injectCustomActions(response);
  } catch (error) {
    const cachedResponse = await caches.match(request) || await caches.match("index.html");
    return injectCustomActions(cachedResponse);
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
