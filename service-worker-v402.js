"use strict";

const CACHE_FIX_VERSION = "20260901-daily-plan-completed-visible-v424";
const COMPLETED_GOALS_CACHE_VERSION_V411 = "20260831-metas-concluidas-somente-revisao-v411";
const DAILY_GOAL_STABILITY_CACHE_VERSION_V412 = "20260831-estabilidade-metas-antes-bootstrap-v412";
const CORE_DAILY_PLAN_CACHE_VERSION_V413 = "20260831-core-daily-plan-consistency-v413";
const CURRENT_HTML_GUARD_VERSION_V413 = "20260831-rejeita-html-v402-em-cache-v413";
const UPDATE_BANNER_STABILITY_VERSION_V414 = "20260831-update-banner-stability-v414";
const DAILY_PLAN_DETERMINISTIC_CACHE_VERSION_V417 = "20260831-daily-plan-deterministic-integrity-v417";
const GOAL_INTEGRITY_NO_AUTO_AUDIT_CACHE_VERSION_V418 = "20260831-metas-integridade-sem-auditoria-v418";
const DAILY_GOALS_EXPLICIT_MUTATION_CACHE_VERSION_V419 = "20260831-daily-goals-explicit-mutation-v419";
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
  new URL("bootstrap-integrity-loader-v275.js", self.registration.scope).pathname,
  new URL("update-flow-v395.js", self.registration.scope).pathname,
  new URL("app-v402.js", self.registration.scope).pathname,
  new URL("app-v413.js", self.registration.scope).pathname,
  new URL("app-v414.js", self.registration.scope).pathname,
  new URL("app-v417.js", self.registration.scope).pathname,
  new URL("app-v418.js", self.registration.scope).pathname,
  new URL("app-v419.js", self.registration.scope).pathname,
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
// núcleo atual sem mudar o comportamento cache-first do worker canônico.
void COMPLETED_GOALS_CACHE_VERSION_V411;
void DAILY_GOAL_STABILITY_CACHE_VERSION_V412;
void CORE_DAILY_PLAN_CACHE_VERSION_V413;
void CURRENT_HTML_GUARD_VERSION_V413;
void UPDATE_BANNER_STABILITY_VERSION_V414;
void DAILY_PLAN_DETERMINISTIC_CACHE_VERSION_V417;
void GOAL_INTEGRITY_NO_AUTO_AUDIT_CACHE_VERSION_V418;
void DAILY_GOALS_EXPLICIT_MUTATION_CACHE_VERSION_V419;
importScripts(`service-worker.js?v=${CACHE_FIX_VERSION}`);
