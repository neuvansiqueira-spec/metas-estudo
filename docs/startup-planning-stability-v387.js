(() => {
  "use strict";

  const VERSION = "20260824-startup-planning-stability-v387";
  const ALIGN_MARKER = "__aldusStartupPlanningStabilityV387";
  const STARTUP_GUARD_MS = 5000;
  const startedAt = Date.now();

  if (globalThis.__ALDUS_STARTUP_PLANNING_STABILITY_V387__) return;

  function startupGuardActive() {
    return Date.now() - startedAt < STARTUP_GUARD_MS;
  }

  function hasTrustedUserActivation() {
    try { return navigator?.userActivation?.isActive === true; } catch { return false; }
  }

  function wrapDailyPlanAlignment() {
    const current = globalThis.ensureDailyPlanAlignedWithPlanningV174;
    if (typeof current !== "function") return false;
    if (current[ALIGN_MARKER] === VERSION) return true;

    const wrapped = function(...args) {
      if (startupGuardActive() && !hasTrustedUserActivation()) {
        return { changed: false, skipped: VERSION };
      }
      return current.apply(this, args);
    };
    Object.defineProperty(wrapped, ALIGN_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.ensureDailyPlanAlignedWithPlanningV174 = wrapped;
    return true;
  }

  async function evictLegacyRuntimeCache() {
    if (typeof caches === "undefined" || typeof location === "undefined") return { caches: 0, deleted: 0 };
    let deleted = 0;
    let touched = 0;
    try {
      const names = await caches.keys();
      const targets = [
        new URL("factory-queue-integrity-v236.js", location.href),
        new URL("planning-integrity-loader-v235.js", location.href),
        new URL("manual-goal-additive-v379.js", location.href)
      ];
      for (const name of names) {
        if (!String(name).startsWith("metas-estudo-")) continue;
        touched += 1;
        const cache = await caches.open(name);
        for (const target of targets) {
          if (await cache.delete(target, { ignoreSearch: true })) deleted += 1;
        }
      }
    } catch (error) {
      console.warn("[Aldus V387] Não foi possível limpar integralmente o cache dos runtimes antigos.", error);
    }
    return { caches: touched, deleted };
  }

  function installAlignmentGuards() {
    wrapDailyPlanAlignment();
  }

  installAlignmentGuards();
  queueMicrotask(installAlignmentGuards);
  evictLegacyRuntimeCache();

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", installAlignmentGuards, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", installAlignmentGuards, { once: true });
    window.addEventListener("aldus:bootstrap-ready", installAlignmentGuards, { once: true });
    window.addEventListener("load", installAlignmentGuards, { once: true });
  }

  globalThis.__ALDUS_STARTUP_PLANNING_STABILITY_V387__ = Object.freeze({
    version: VERSION,
    startupGuardActive,
    wrapDailyPlanAlignment,
    evictLegacyRuntimeCache
  });
})();