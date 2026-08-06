"use strict";

const CURRENT_VERSION = "20260806-timer-sound-master-v265";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const NAVIGATION_FALLBACK = new URL("index.html", self.registration.scope).href;
const TIMER_SOUND_MASTER = `timer-sound-master-v265.js?v=${CURRENT_VERSION}&hotfix=master-mute-hotfix1`;
const TIMER_SOUND_MASTER_PATH = new URL(TIMER_SOUND_MASTER, self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(["./", "index.html", TIMER_SOUND_MASTER]))
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

async function injectTimerSoundMaster(response) {
  if (!response?.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const scriptTag = `<script id="aldusTimerSoundMasterV265" src="${TIMER_SOUND_MASTER}"></script>`;
  const patchedHtml = html.includes("timer-sound-master-v265.js")
    ? html
    : html.includes("</body>")
      ? html.replace("</body>", `  ${scriptTag}\n</body>`)
      : `${html}\n${scriptTag}`;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("x-aldus-timer-sound-master", "master-mute-hotfix1");

  return new Response(patchedHtml, {
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
      const patched = await injectTimerSoundMaster(response);
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
      ? injectTimerSoundMaster(cached)
      : new Response("Aplicativo indisponível temporariamente.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" }
        });
  }
}

async function networkFirstTimerSoundMaster(request) {
  try {
    return await cacheResponse(request, await fetch(request, { cache: "no-store" }));
  } catch {
    return await caches.match(request, { ignoreSearch: true })
      || await caches.match(TIMER_SOUND_MASTER, { ignoreSearch: true })
      || new Response("Correção de áudio indisponível temporariamente.", {
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

  if (url.pathname === TIMER_SOUND_MASTER_PATH) {
    event.respondWith(networkFirstTimerSoundMaster(request));
  }
});
