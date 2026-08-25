"use strict";

// Hotfix V389: mantém o worker V378 compatível, mas impede que runtimes críticos
// permaneçam presos em uma cópia antiga do cache após atualização/recarregamento.
const ALDUS_CRITICAL_FRESHNESS_V389 = "20260825-factory-startup-consistency-v389";
const ALDUS_CRITICAL_RUNTIME_PATHS_V389 = new Set([
  "bootstrap-integrity-loader-v258.js",
  "bootstrap-integrity-loader-v258-core.js",
  "bootstrap-integrity-loader-v275.js",
  "bootstrap-fast-path-v351.js",
  "planning-integrity-loader-v235.js",
  "planning-integrity-v235.js",
  "factory-queue-integrity-v236.js",
  "timer-runtime-v316.js",
  "timer-goal-integrity-v366.js"
].map((name) => new URL(name, self.registration.scope).pathname));

async function aldusCriticalNetworkFirstV389(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) return response;
  } catch {}
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  return new Response("Recurso crítico temporariamente indisponível.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET") return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin || !ALDUS_CRITICAL_RUNTIME_PATHS_V389.has(url.pathname)) return;
  event.respondWith(aldusCriticalNetworkFirstV389(request));
  // O worker legado, importado abaixo, continua responsável por todo o restante.
  // Para estes caminhos críticos, apenas esta estratégia deve responder.
  event.stopImmediatePropagation();
});

importScripts(`service-worker.js?hotfix=${encodeURIComponent(ALDUS_CRITICAL_FRESHNESS_V389)}`);
