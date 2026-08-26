(() => {
  "use strict";

  const VERSION = "20260826-planning-legacy-mutator-guard-v399";
  const ALIGN_MARKER = "__aldusPlanningConsentGuardV399";
  const LEGACY_MUTATOR_MARKER = "__aldusPlanningLegacyMutatorGuardV399";
  const FACTORY_BRIDGE_SCRIPT_ID = "aldusFactoryLc259LinkV398";
  const FACTORY_BRIDGE_VERSION = "20260826-factory-lc259-link-v398";

  // Identificadores legados mantidos apenas para diagnóstico/histórico. Não são carregados automaticamente.
  const RESTORE_SCRIPT_ID = "aldusAuthorizedGoalRestoreV391";
  const RESTORE_VERSION = "20260824-restaura-planejamento-gestao-estrategica-v391";
  const CORRECTION_SCRIPT_ID = "aldusAuthorizedGoalRestoreV392";
  const CORRECTION_VERSION = "20260824-corrige-identidade-meta-planejamento-v392";
  const EXPLICIT_ALIGNMENT_SCRIPT_ID = "aldusDailyPlanExplicitAlignmentV393";
  const EXPLICIT_ALIGNMENT_VERSION = "20260824-explicit-daily-plan-alignment-v393";

  if (globalThis.__ALDUS_STARTUP_PLANNING_STABILITY_V387__?.version === VERSION) return;

  function startupGuardActive() {
    return true;
  }

  function explicitMutationAllowed(options = {}) {
    return options?.explicit === true || options?.allowRebuild === true;
  }

  function wrapDailyPlanAlignment() {
    const current = globalThis.ensureDailyPlanAlignedWithPlanningV174;
    if (typeof current !== "function") return false;
    if (current[ALIGN_MARKER] === VERSION) return true;

    const wrapped = function(targetState, date, options) {
      if (explicitMutationAllowed(options)) return current.apply(this, arguments);
      return {
        changed: false,
        skipped: VERSION,
        date: String(date || ""),
        report: null
      };
    };
    Object.defineProperty(wrapped, ALIGN_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.ensureDailyPlanAlignedWithPlanningV174 = wrapped;
    return true;
  }

  function wrapIntegratedPlanningPriority() {
    const current = globalThis.applyIntegratedPlanningPrioritiesV155;
    if (typeof current !== "function") return false;
    if (current[LEGACY_MUTATOR_MARKER] === VERSION) return true;

    const wrapped = function(targetState, options = {}) {
      if (explicitMutationAllowed(options)) return current.apply(this, arguments);
      return {
        ok: true,
        changed: false,
        skipped: true,
        blockedBy: VERSION,
        reason: String(options?.reason || "automatic-planning-mutation-blocked"),
        errors: []
      };
    };
    Object.defineProperty(wrapped, LEGACY_MUTATOR_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.applyIntegratedPlanningPrioritiesV155 = wrapped;
    return true;
  }

  function wrapQuestionPerformanceRefresh() {
    const current = globalThis.refreshPlanningPrioritiesForQuestionChangesV155;
    if (typeof current !== "function") return false;
    if (current[LEGACY_MUTATOR_MARKER] === VERSION) return true;

    const wrapped = function(targetState, options = {}) {
      if (explicitMutationAllowed(options)) return current.apply(this, arguments);
      return {
        ok: true,
        changed: false,
        skipped: true,
        blockedBy: VERSION,
        reason: "automatic-question-performance-replan-blocked",
        errors: []
      };
    };
    Object.defineProperty(wrapped, LEGACY_MUTATOR_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.refreshPlanningPrioritiesForQuestionChangesV155 = wrapped;
    return true;
  }

  function wrapDailyInflationRepair() {
    const current = globalThis.repairDailyPlanningInflationV108;
    if (typeof current !== "function") return false;
    if (current[LEGACY_MUTATOR_MARKER] === VERSION) return true;

    const wrapped = function(targetState, options = {}) {
      if (explicitMutationAllowed(options)) return current.apply(this, arguments);
      return {
        changed: false,
        removed: [],
        reports: [],
        skipped: VERSION,
        source: String(options?.source || "automatic")
      };
    };
    Object.defineProperty(wrapped, LEGACY_MUTATOR_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.repairDailyPlanningInflationV108 = wrapped;
    return true;
  }

  function wrapReinforcementRepair() {
    const current = globalThis.repairInvalidReinforcementGoalsV157;
    if (typeof current !== "function") return false;
    if (current[LEGACY_MUTATOR_MARKER] === VERSION) return true;

    const wrapped = function(targetState, options = {}) {
      if (explicitMutationAllowed(options)) return current.apply(this, arguments);
      return {
        changed: false,
        corrected: [],
        skipped: VERSION
      };
    };
    Object.defineProperty(wrapped, LEGACY_MUTATOR_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.repairInvalidReinforcementGoalsV157 = wrapped;
    return true;
  }

  function installPlanningMutationGuards() {
    return {
      alignment: wrapDailyPlanAlignment(),
      integratedPriority: wrapIntegratedPlanningPriority(),
      performanceRefresh: wrapQuestionPerformanceRefresh(),
      inflationRepair: wrapDailyInflationRepair(),
      reinforcementRepair: wrapReinforcementRepair()
    };
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
        new URL("daily-plan-explicit-alignment-v393.js", location.href),
        new URL("factory-lc259-link-v398.js", location.href),
        new URL("startup-planning-stability-v387.js", location.href)
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
      console.warn("[Aldus V399] Não foi possível limpar integralmente o cache dos runtimes antigos.", error);
    }
    return { caches: touched, deleted };
  }

  function loadFactoryLc259BridgeV398() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(FACTORY_BRIDGE_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = FACTORY_BRIDGE_SCRIPT_ID;
    script.src = `factory-lc259-link-v398.js?v=${encodeURIComponent(FACTORY_BRIDGE_VERSION)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.error("[Aldus V398] Falha ao carregar o vínculo da LC 259 com a Fábrica de Resumos.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
    return true;
  }

  // V391/V392/V393 eram reparos pontuais de 24/08/2026 e não podem mais escrever no estado durante o startup.
  function loadAuthorizedRestoreV391() { return false; }
  function loadAuthorizedCorrectionV392() { return false; }
  function loadExplicitAlignmentV393() { return false; }
  function legacyAutomaticRepairsDisabledV399() {
    if (false) {
      loadAuthorizedRestoreV391();
      loadAuthorizedCorrectionV392();
      loadExplicitAlignmentV393();
    }
    return true;
  }

  installPlanningMutationGuards();
  queueMicrotask(installPlanningMutationGuards);
  evictLegacyRuntimeCache();
  loadFactoryLc259BridgeV398();
  legacyAutomaticRepairsDisabledV399();

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", installPlanningMutationGuards, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", installPlanningMutationGuards, { once: true });
    window.addEventListener("aldus:bootstrap-ready", installPlanningMutationGuards, { once: true });
    window.addEventListener("load", installPlanningMutationGuards, { once: true });
  }

  globalThis.__ALDUS_STARTUP_PLANNING_STABILITY_V387__ = Object.freeze({
    version: VERSION,
    startupGuardActive,
    explicitMutationAllowed,
    wrapDailyPlanAlignment,
    wrapIntegratedPlanningPriority,
    wrapQuestionPerformanceRefresh,
    wrapDailyInflationRepair,
    wrapReinforcementRepair,
    installPlanningMutationGuards,
    evictLegacyRuntimeCache,
    loadFactoryLc259BridgeV398,
    legacyAutomaticRepairsDisabledV399,
    legacyAutomaticRepairsDisabled: Object.freeze([
      `${RESTORE_SCRIPT_ID}:${RESTORE_VERSION}`,
      `${CORRECTION_SCRIPT_ID}:${CORRECTION_VERSION}`,
      `${EXPLICIT_ALIGNMENT_SCRIPT_ID}:${EXPLICIT_ALIGNMENT_VERSION}`,
      "applyIntegratedPlanningPrioritiesV155:auto",
      "refreshPlanningPrioritiesForQuestionChangesV155:auto",
      "repairDailyPlanningInflationV108:auto",
      "repairInvalidReinforcementGoalsV157:auto"
    ])
  });
})();
