"use strict";

const CURRENT_VERSION = "20260806-diagnostico-duplicacoes-palette-v263";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const NAVIGATION_FALLBACK = new URL("index.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(["./", "index.html"]))
      .then(() => self.skipWaiting())
  );
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

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      await cache.put(NAVIGATION_FALLBACK, response.clone());
    }
    return response;
  } catch {
    return await caches.match(request, { ignoreSearch: true })
      || await caches.match(NAVIGATION_FALLBACK, { ignoreSearch: true })
      || new Response("Aplicativo indisponível temporariamente.", {
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
  }
});
