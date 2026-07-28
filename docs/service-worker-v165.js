"use strict";

const ALDUS_V165_NAVIGATION_TIMEOUT_MS = 2500;
const ALDUS_V165_VERSION_TIMEOUT_MS = 1500;

function aldusTimeoutV165(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), ms);
  });
}

async function aldusNetworkFirstNavigationV165(event) {
  const request = event.request;
  const freshPromise = fetchFreshNavigation(request);
  event.waitUntil(freshPromise.then(() => undefined).catch(() => undefined));

  try {
    const fresh = await Promise.race([
      freshPromise,
      aldusTimeoutV165(ALDUS_V165_NAVIGATION_TIMEOUT_MS)
    ]);
    if (fresh?.ok) return fresh;
  } catch (error) {}

  const cached = await caches.match(request, { ignoreSearch: true })
    || await caches.match("index.html", { ignoreSearch: true });
  if (cached) return patchTextResponse(cached, patchHtmlSource, "text/html; charset=utf-8");

  try {
    const lateFresh = await freshPromise;
    if (lateFresh?.ok) return lateFresh;
  } catch (error) {}

  return new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function aldusNetworkFirstVersionV165(event) {
  const request = event.request;
  const networkPromise = fetch(request, { cache: "no-store" })
    .then(async (response) => {
      if (response?.ok) await cacheResponse(request, response.clone());
      return response;
    });
  event.waitUntil(networkPromise.then(() => undefined).catch(() => undefined));

  try {
    const fresh = await Promise.race([
      networkPromise,
      aldusTimeoutV165(ALDUS_V165_VERSION_TIMEOUT_MS)
    ]);
    if (fresh?.ok) return fresh;
  } catch (error) {}

  const cached = await caches.match(request)
    || await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const lateFresh = await networkPromise;
    if (lateFresh?.ok) return lateFresh;
  } catch (error) {}

  return new Response("Versão indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "application/javascript; charset=utf-8" }
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(aldusNetworkFirstNavigationV165(event));
    event.stopImmediatePropagation();
    return;
  }

  if (url.pathname.endsWith("/app-version.js")) {
    event.respondWith(aldusNetworkFirstVersionV165(event));
    event.stopImmediatePropagation();
  }
});

importScripts("./service-worker-v158.js?v=20260727-atualizacao-rapida-segura-v165");
