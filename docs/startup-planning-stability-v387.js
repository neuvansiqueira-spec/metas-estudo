(() => {
  "use strict";

  const VERSION = "20260824-startup-planning-stability-v387";
  const ALIGN_MARKER = "__aldusStartupPlanningStabilityV387";
  const STARTUP_GUARD_MS = 5000;
  const RESTORE_SCRIPT_ID = "aldusAuthorizedGoalRestoreV391";
  const RESTORE_VERSION = "20260824-restaura-planejamento-gestao-estrategica-v391";
  const CORRECTION_SCRIPT_ID = "aldusAuthorizedGoalRestoreV392";
  const CORRECTION_VERSION = "20260824-corrige-identidade-meta-planejamento-v392";
  const EXPLICIT_ALIGNMENT_SCRIPT_ID = "aldusDailyPlanExplicitAlignmentV393";
  const EXPLICIT_ALIGNMENT_VERSION = "20260824-explicit-daily-plan-alignment-v393";
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
        new URL("planning-integrity-v235.js", location.href),
        new URL("manual-goal-additive-v379.js", location.href),
        new URL("daily-goal-authorized-restore-v388.js", location.href),
        new URL("daily-goal-authorized-restore-v389.js", location.href),
        new URL("daily-goal-authorized-restore-v390.js", location.href),
        new URL("daily-goal-authorized-restore-v391.js", location.href),
        new URL("daily-goal-authorized-restore-v392.js", location.href),
        new URL("daily-plan-explicit-alignment-v393.js", location.href)
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

  function loadAuthorizedRestoreV391() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(RESTORE_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = RESTORE_SCRIPT_ID;
    script.src = `daily-goal-authorized-restore-v391.js?v=${encodeURIComponent(RESTORE_VERSION)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.error("[Aldus V391] Falha ao carregar a recuperação autorizada da meta do Plano do Dia.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
    return true;
  }

  function loadAuthorizedCorrectionV392() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(CORRECTION_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = CORRECTION_SCRIPT_ID;
    script.src = `daily-goal-authorized-restore-v392.js?v=${encodeURIComponent(CORRECTION_VERSION)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.error("[Aldus V392] Falha ao carregar a correção de identidade da meta do Plano do Dia.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
    return true;
  }

  function loadExplicitAlignmentV393() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(EXPLICIT_ALIGNMENT_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = EXPLICIT_ALIGNMENT_SCRIPT_ID;
    script.src = `daily-plan-explicit-alignment-v393.js?v=${encodeURIComponent(EXPLICIT_ALIGNMENT_VERSION)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.error("[Aldus V393] Falha ao carregar a proteção permanente do Plano do Dia.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
    return true;
  }

  function installAlignmentGuards() {
    wrapDailyPlanAlignment();
  }

  installAlignmentGuards();
  queueMicrotask(installAlignmentGuards);
  evictLegacyRuntimeCache();
  loadAuthorizedRestoreV391();
  loadAuthorizedCorrectionV392();
  loadExplicitAlignmentV393();

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
    evictLegacyRuntimeCache,
    loadAuthorizedRestoreV391,
    loadAuthorizedCorrectionV392,
    loadExplicitAlignmentV393
  });
})();