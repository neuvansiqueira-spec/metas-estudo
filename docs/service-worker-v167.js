"use strict";

const ALDUS_V167_RELEASE = "20260727-inicializacao-unica-segura-v167";

async function aldusInstantNavigationV167(event) {
  const request = event.request;
  const networkPromise = fetchFreshNavigation(request).catch(() => null);
  event.waitUntil(networkPromise.then(() => undefined));

  const cached = await caches.match(request, { ignoreSearch: true })
    || await caches.match("index.html", { ignoreSearch: true });

  if (cached) {
    return patchTextResponse(cached, patchHtmlSource, "text/html; charset=utf-8");
  }

  const fresh = await networkPromise;
  if (fresh?.ok) return fresh;

  return new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function aldusCurrentVersionV167(event) {
  const request = event.request;
  const networkPromise = fetch(request, { cache: "no-store" })
    .then(async (response) => {
      if (response?.ok) await cacheResponse(request, response.clone());
      return response;
    })
    .catch(() => null);

  event.waitUntil(networkPromise.then(() => undefined));

  const exact = await caches.match(request);
  if (exact) return exact;

  const compatible = requestTargetsCurrentVersion(request)
    ? await caches.match(request, { ignoreSearch: true })
    : null;
  if (compatible) return compatible;

  const fresh = await networkPromise;
  if (fresh?.ok) return fresh;

  return new Response("Versão indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "application/javascript; charset=utf-8" }
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(aldusInstantNavigationV167(event));
    event.stopImmediatePropagation();
    return;
  }

  if (url.pathname.endsWith("/app-version.js")) {
    event.respondWith(aldusCurrentVersionV167(event));
    event.stopImmediatePropagation();
  }
});

importScripts(`./service-worker-v158.js?v=${ALDUS_V167_RELEASE}`);
