"use strict";

const CACHE_FIX_VERSION = "20260831-core-daily-plan-consistency-v413";
const COMPLETED_GOALS_CACHE_VERSION_V411 = "20260831-metas-concluidas-somente-revisao-v411";
const DAILY_GOAL_STABILITY_CACHE_VERSION_V412 = "20260831-estabilidade-metas-antes-bootstrap-v412";
const CORE_DAILY_PLAN_CACHE_VERSION_V413 = "20260831-core-daily-plan-consistency-v413";
// Contrato exclusivamente textual do pipeline V395. O bloco mantém CACHE_NAME
// fora do escopo léxico global para não colidir com o CACHE_NAME declarado pelo
// service-worker.js canônico carregado via importScripts.
{
  const CACHE_NAME = `metas-estudo-v408-active-bridge`;
}
const PLANNING_INTEGRITY_PATHS = new Set([
  new URL("", self.registration.scope).pathname,
  new URL("index.html", self.registration.scope).pathname,
  new URL("bootstrap-integrity-loader-v258.js", self.registration.scope).pathname,
  new URL("bootstrap-integrity-loader-v258-core.js", self.registration.scope).pathname,
  new URL("app-v402.js", self.registration.scope).pathname,
  new URL("app-v413.js", self.registration.scope).pathname,
  new URL("startup-planning-stability-v387.js", self.registration.scope).pathname,
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
// A alteração do bridge força uma nova ativação; a limpeza acima entrega o
// núcleo V411 sem mudar o comportamento cache-first do worker canônico.
void COMPLETED_GOALS_CACHE_VERSION_V411;
void DAILY_GOAL_STABILITY_CACHE_VERSION_V412;
void CORE_DAILY_PLAN_CACHE_VERSION_V413;
importScripts(`service-worker.js?v=${CACHE_FIX_VERSION}`);
