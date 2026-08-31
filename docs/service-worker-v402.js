"use strict";

const CACHE_FIX_VERSION = "20260830-planning-integrity-cache-v408";
// Contrato do pipeline V395: o deploy acrescenta o sufixo de entrega ao
// CACHE_NAME do worker ativo. Esta constante não é usada pela ponte em runtime;
// o cache efetivo continua pertencendo ao service-worker.js canônico importado.
const CACHE_NAME = `metas-estudo-v408-active-bridge`;
const PLANNING_INTEGRITY_PATHS = new Set([
  new URL("planning-integrity-v235.js", self.registration.scope).pathname,
  new URL("planning-integrity-loader-v235.js", self.registration.scope).pathname
]);

async function invalidatePlanningIntegrityCacheV408() {
  const names = await caches.keys();
  const appCaches = names.filter((name) => name.startsWith("metas-estudo-"));

  await Promise.all(appCaches.map(async (name) => {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    const stalePlanningRequests = requests.filter((request) =>
      PLANNING_INTEGRITY_PATHS.has(new URL(request.url).pathname)
    );
    await Promise.all(stalePlanningRequests.map((request) => cache.delete(request)));
  }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(invalidatePlanningIntegrityCacheV408());
});

// Mantém integralmente a estratégia cache-first já validada. A V408 apenas
// remove, uma única vez na ativação, as cópias antigas do núcleo de planejamento.
importScripts(`service-worker.js?v=${CACHE_FIX_VERSION}`);
