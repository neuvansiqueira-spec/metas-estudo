(() => {
  "use strict";

  if (globalThis.__ALDUS_SECURITY_OBSERVABILITY_V318__) return;

  const VERSION = "20260812-security-observability-v318";
  const MAX_EVENTS_PER_MINUTE = 30;
  const RATE_WINDOW_MS = 60_000;
  let windowStartedAt = Date.now();
  let emittedInWindow = 0;
  let lastLcpMs = 0;
  let cumulativeLayoutShift = 0;
  let performanceReported = false;

  function telemetry() {
    const api = globalThis.AldusUsage;
    return api && typeof api.track === "function" ? api : null;
  }

  function canEmit() {
    const now = Date.now();
    if (now - windowStartedAt >= RATE_WINDOW_MS) {
      windowStartedAt = now;
      emittedInWindow = 0;
    }
    if (emittedInWindow >= MAX_EVENTS_PER_MINUTE) return false;
    emittedInWindow += 1;
    return true;
  }

  function clean(value, fallback = "unknown") {
    const result = String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70);
    return result || fallback;
  }

  function emit(event, feature, action, durationSeconds = null) {
    const api = telemetry();
    if (!api || !canEmit()) return null;
    const detail = {
      view: "system-health",
      feature: clean(feature, "system"),
      action: clean(action, "observe")
    };
    if (Number.isFinite(durationSeconds)) detail.durationSeconds = Math.max(0, durationSeconds);
    return api.track(event, detail);
  }

  function runtimeErrorKind(error) {
    const name = String(error?.name || "").toLowerCase();
    const allowed = new Set([
      "typeerror", "referenceerror", "syntaxerror", "rangeerror",
      "urierror", "evalerror", "aborterror", "networkerror",
      "notallowederror", "quotaexceedederror", "securityerror"
    ]);
    return allowed.has(name) ? name : "runtime-error";
  }

  function installRuntimeMonitoring() {
    addEventListener("error", (event) => {
      const target = event.target;
      if (target && target !== globalThis && target instanceof Element) {
        const tag = clean(target.tagName, "resource");
        emit("resource_load_error", `resource-${tag}`, "load-error");
        return;
      }
      emit("client_error", runtimeErrorKind(event.error), "uncaught");
    }, true);

    addEventListener("unhandledrejection", (event) => {
      emit("client_error", runtimeErrorKind(event.reason), "unhandled-rejection");
    });
  }

  function installSecurityMonitoring() {
    addEventListener("securitypolicyviolation", (event) => {
      // Deliberately do not transmit blockedURI, sourceFile or sample.
      emit("security_event", `csp-${clean(event.effectiveDirective || event.violatedDirective, "directive")}`, "blocked");
    });

    addEventListener("aldus:unsafe-file-blocked", () => {
      emit("security_event", "unsafe-file", "blocked");
    });
  }

  function installPerformanceMonitoring() {
    try {
      const navigation = performance.getEntriesByType?.("navigation")?.[0];
      if (navigation && Number.isFinite(navigation.responseStart)) {
        emit("performance_metric", "ttfb", "observe", navigation.responseStart / 1000);
      }
    } catch {}

    try {
      if ("PerformanceObserver" in globalThis) {
        const lcp = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last && Number.isFinite(last.startTime)) lastLcpMs = last.startTime;
        });
        lcp.observe({ type: "largest-contentful-paint", buffered: true });

        const cls = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput && Number.isFinite(entry.value)) cumulativeLayoutShift += entry.value;
          }
        });
        cls.observe({ type: "layout-shift", buffered: true });
      }
    } catch {}
  }

  function reportPerformanceOnce() {
    if (performanceReported) return;
    performanceReported = true;
    if (lastLcpMs > 0) emit("performance_metric", "lcp", "observe", lastLcpMs / 1000);
    if (cumulativeLayoutShift > 0) emit("performance_metric", "cls-x1000", "observe", cumulativeLayoutShift);
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0];
      if (nav && Number.isFinite(nav.loadEventEnd) && nav.loadEventEnd > 0) {
        emit("performance_metric", "page-load", "observe", nav.loadEventEnd / 1000);
      }
    } catch {}
  }

  function appendRuntime(id, src, errorMessage) {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    if (errorMessage) {
      script.addEventListener("error", () => console.error(errorMessage), { once: true });
    }
    (document.head || document.documentElement).appendChild(script);
  }

  function installEmergencyPerformanceV350() {
    appendRuntime(
      "aldusEmergencyPerformanceV350",
      "performance-emergency-v350.js?v=20260817-emergency-performance-v350"
    );
  }

  // V387 deve entrar antes das rotinas de metas/planejamento. Ele bloqueia apenas
  // mutação automática no startup e limpa do cache os três runtimes legados que
  // foram corrigidos, sem varrer dados, metas ou armazenamento da aplicação.
  function installStartupPlanningStabilityV387() {
    appendRuntime(
      "aldusStartupPlanningStabilityV387",
      "startup-planning-stability-v387.js?v=20260824-startup-planning-stability-v387",
      "[Aldus V387] Falha ao carregar a proteção de estabilidade do planejamento."
    );
  }

  function installManualGoalAdditiveV379() {
    appendRuntime(
      "aldusManualGoalAdditiveV379",
      "manual-goal-additive-v379.js?v=20260824-manual-goal-additive-v379-stability-v387",
      "[Aldus V379] Falha ao carregar a proteção aditiva de metas manuais."
    );
  }

  function installFactoryResumoAulaJurisprudenciaV380() {
    appendRuntime(
      "aldusFactoryResumoAulaJurisprudenciaV380",
      "factory-resumo-aula-jurisprudencia-v380.js?v=20260824-factory-resumo-aula-jurisprudencia-v380",
      "[Aldus V380] Falha ao carregar o prompt Resumo/Aula + Jurisprudência."
    );
  }

  function installFactoryLeiJurisprudenciaV383() {
    appendRuntime(
      "aldusFactoryLeiJurisprudenciaV383",
      "factory-lei-jurisprudencia-v383.js?v=20260824-factory-lei-jurisprudencia-v383",
      "[Aldus V383] Falha ao carregar o prompt Lei + Jurisprudência."
    );
  }

  function installFactoryFinalReviewV384() {
    appendRuntime(
      "aldusFactoryFinalReviewV384",
      "factory-final-review-v384.js?v=20260824-final-review-consolidation-v384",
      "[Aldus V384] Falha ao carregar a revisão e consolidação final integrada."
    );
  }

  function installFactoryFinalReviewCompatV384() {
    appendRuntime(
      "aldusFactoryFinalReviewCompatV384",
      "factory-final-review-v384-compat.js?v=20260824-final-review-consolidation-v384-compat",
      "[Aldus V384] Falha ao carregar a compatibilidade da consolidação final."
    );
  }

  function installFactoryPadronizacaoFinalSumarioV385() {
    appendRuntime(
      "aldusFactoryPadronizacaoFinalSumarioV385",
      "factory-padronizacao-final-sumario-v385.js?v=20260824-factory-padronizacao-final-sumario-v385",
      "[Aldus V385] Falha ao carregar Padronização Final + Sumário."
    );
  }

  function installQuestionBankManualNotesV386() {
    appendRuntime(
      "aldusQuestionBankManualNotesV386",
      "question-bank-manual-notes-v386.js?v=20260824-question-bank-manual-notes-v386",
      "[Aldus V386] Falha ao carregar anotações manuais do Banco de Questões."
    );
  }

  function installFactorySummaryTocV382() {
    appendRuntime(
      "aldusFactorySummaryTocV382",
      "factory-summary-toc-v381.js?v=20260824-factory-summary-toc-v382",
      "[Aldus V382] Falha ao carregar a formatação didática do sumário."
    );
  }

  function init() {
    installRuntimeMonitoring();
    installSecurityMonitoring();
    installPerformanceMonitoring();
    addEventListener("pagehide", reportPerformanceOnce, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") reportPerformanceOnce();
    }, { passive: true });
  }

  const api = Object.freeze({
    version: VERSION,
    emit,
    reportPerformance: reportPerformanceOnce
  });
  globalThis.__ALDUS_SECURITY_OBSERVABILITY_V318__ = api;

  installEmergencyPerformanceV350();
  installStartupPlanningStabilityV387();
  installManualGoalAdditiveV379();
  installFactoryResumoAulaJurisprudenciaV380();
  installFactoryLeiJurisprudenciaV383();
  installFactoryFinalReviewV384();
  installFactoryFinalReviewCompatV384();
  installFactoryPadronizacaoFinalSumarioV385();
  installQuestionBankManualNotesV386();
  installFactorySummaryTocV382();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();