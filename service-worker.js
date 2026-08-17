"use strict";

// V350 — modo de emergência: sem cache de aplicação enquanto o travamento é isolado.
// O objetivo é garantir que cada abertura receba exatamente os arquivos publicados,
// eliminando a possibilidade de um asset antigo permanecer preso no Service Worker.
const CURRENT_VERSION = "20260817-emergency-safe-mode-v350";
const PERFORMANCE_HOTFIX = "performance-emergency-v350.js?v=20260817-emergency-performance-v350";

async function clearAldusCaches() {
  const names = await caches.keys();
  await Promise.all(names.map((name) => {
    if (name.startsWith("metas-estudo-")
      || name.startsWith("aldus-runtime-modules-")
      || name.startsWith("aldus-compiled-app-")) {
      return caches.delete(name);
    }
    return Promise.resolve(false);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    clearAldusCaches()
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function injectPerformanceHotfix(html) {
  const source = String(html || "");
  if (source.includes("performance-emergency-v350.js")) return source;
  const tag = `<script id="aldusEmergencyPerformanceV350" src="${PERFORMANCE_HOTFIX}"></script>`;
  const lower = source.toLowerCase();
  const closing = lower.lastIndexOf("</body>");
  if (closing < 0) return `${source}\n${tag}`;
  return `${source.slice(0, closing)}  ${tag}\n${source.slice(closing)}`;
}

async function freshNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response?.ok) return response;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const html = injectPerformanceHotfix(await response.text());
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-aldus-emergency-mode", CURRENT_VERSION);

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return new Response("Aplicativo indisponível temporariamente. Recarregue quando houver conexão.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

async function freshAsset(request) {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch {
    return new Response("Recurso indisponível temporariamente.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(freshNavigation(request));
    return;
  }

  event.respondWith(freshAsset(request));
});
