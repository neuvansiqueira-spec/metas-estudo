"use strict";

const CURRENT_VERSION = "20260808-timer-controls-sound-v268";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const NAVIGATION_FALLBACK = new URL("index.html", self.registration.scope).href;
const TIMER_SOUND_MASTER = "timer-sound-master-v265.js?v=20260806-timer-sound-master-v265&hotfix=master-mute-hotfix1";
const TIMER_CONTROLS_HARDENING = "timer-controls-hardening-v268.js?v=20260808-timer-controls-sound-v268&hotfix=timer-controls-hardening-hotfix1";
const DUPLICATE_LOADER = `duplicate-diagnostics-loader-v266.js?v=${CURRENT_VERSION}`;
const DUPLICATE_RELATIONS = `duplicate-diagnostics-relations-v266.js?v=${CURRENT_VERSION}`;
const DUPLICATE_RELATIONS_CSS = `duplicate-diagnostics-relations-v266.css?v=${CURRENT_VERSION}`;
const NETWORK_FIRST_PATHS = new Set([
  TIMER_SOUND_MASTER,
  TIMER_CONTROLS_HARDENING,
  DUPLICATE_LOADER,
  DUPLICATE_RELATIONS,
  DUPLICATE_RELATIONS_CSS
].map((asset) => new URL(asset, self.registration.scope).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([
        "./",
        "index.html",
        TIMER_SOUND_MASTER,
        TIMER_CONTROLS_HARDENING,
        DUPLICATE_LOADER,
        DUPLICATE_RELATIONS,
        DUPLICATE_RELATIONS_CSS
      ]))
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
          .filter((name) => name.startsWith("metas-estudo-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

function injectBeforeBody(html, tag) {
  return html.includes("</body>")
    ? html.replace("</body>", `  ${tag}\n</body>`)
    : `${html}\n${tag}`;
}

async function patchHtml(response) {
  if (!response?.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();
  const timerTag = `<script id="aldusTimerSoundMasterV265" src="${TIMER_SOUND_MASTER}"></script>`;
  const controlsTag = `<script id="aldusTimerControlsHardeningV268" src="${TIMER_CONTROLS_HARDENING}"></script>`;
  const loaderTag = `<script id="aldusDuplicateDiagnosticsLoaderV266" src="${DUPLICATE_LOADER}"></script>`;

  if (!html.includes("timer-sound-master-v265.js")) html = injectBeforeBody(html, timerTag);
  if (!html.includes("timer-controls-hardening-v268.js")) html = injectBeforeBody(html, controlsTag);

  const oldLoaderPattern = /<script\s+id="aldusDuplicateDiagnosticsLoaderV26[34]"[^>]*><\/script>/i;
  if (oldLoaderPattern.test(html)) html = html.replace(oldLoaderPattern, loaderTag);
  else if (!html.includes("duplicate-diagnostics-loader-v266.js")) html = injectBeforeBody(html, loaderTag);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-aldus-timer-sound-master", "master-mute-hotfix1");
  headers.set("x-aldus-timer-controls-hardening", "timer-controls-hardening-hotfix1");
  headers.set("x-aldus-duplicate-relations", CURRENT_VERSION);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function cacheResponse(request, response) {
  if (!response?.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) {
      const patched = await patchHtml(response);
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, patched.clone());
      await cache.put(NAVIGATION_FALLBACK, patched.clone());
      return patched;
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true })
      || await caches.match(NAVIGATION_FALLBACK, { ignoreSearch: true });
    return cached
      ? patchHtml(cached)
      : new Response("Aplicativo indisponível temporariamente.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" }
        });
  }
}

async function networkFirstAsset(request) {
  try {
    return await cacheResponse(request, await fetch(request, { cache: "no-store" }));
  } catch {
    return await caches.match(request, { ignoreSearch: true })
      || new Response("Recurso temporariamente indisponível.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
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

  if (NETWORK_FIRST_PATHS.has(url.pathname)) {
    event.respondWith(networkFirstAsset(request));
  }
});
