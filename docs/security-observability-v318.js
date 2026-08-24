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
    if (cumulativeLayoutShift > 0) {
      // Preserve the existing numeric field without expanding the telemetry schema.
      emit("performance_metric", "cls-x1000", "observe", cumulativeLayoutShift);
    }
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0];
      if (nav && Number.isFinite(nav.loadEventEnd) && nav.loadEventEnd > 0) {
        emit("performance_metric", "page-load", "observe", nav.loadEventEnd / 1000);
      }
    } catch {}
  }

  // V350 — carregamento emergencial e isolado da otimização de mapeamentos.
  // Este arquivo já é executado antes do bootstrap do aplicativo e não é parte
  // do cache estático autoritativo. O hotfix apenas troca a consulta O(n) por
  // índice WeakMap; não toca em estado, persistência, sincronização ou cronômetro.
  function installEmergencyPerformanceV350() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusEmergencyPerformanceV350")) return;
    const script = document.createElement("script");
    script.id = "aldusEmergencyPerformanceV350";
    script.src = "performance-emergency-v350.js?v=20260817-emergency-performance-v350";
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
  }

  // V379 — metas manuais são adicionais e nunca consomem a cota automática.
  // O guard é carregado como módulo isolado e só atua em geração/reparo de metas,
  // sem observadores de DOM, polling ou trabalho contínuo em segundo plano.
  function installManualGoalAdditiveV379() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusManualGoalAdditiveV379")) return;
    const script = document.createElement("script");
    script.id = "aldusManualGoalAdditiveV379";
    script.src = "manual-goal-additive-v379.js?v=20260824-manual-goal-additive-v379";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V379] Falha ao carregar a proteção aditiva de metas manuais.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V380 — novo prompt integrado, isolado do bundle principal e dos hot paths.
  // O módulo só registra o tipo após o bootstrap e redesenha a Fábrica apenas
  // quando a própria tela de Fábrica já está aberta.
  function installFactoryResumoAulaJurisprudenciaV380() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryResumoAulaJurisprudenciaV380")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryResumoAulaJurisprudenciaV380";
    script.src = "factory-resumo-aula-jurisprudencia-v380.js?v=20260824-factory-resumo-aula-jurisprudencia-v380";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V380] Falha ao carregar o prompt Resumo/Aula + Jurisprudência.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V381 — sumário obrigatório nos quatro prompts de conteúdo da Fábrica.
  // A extensão atua somente sobre texto de prompt e não adiciona observadores,
  // polling, timers, medições de layout ou persistência automática.
  function installFactorySummaryTocV381() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactorySummaryTocV381")) return;
    const script = document.createElement("script");
    script.id = "aldusFactorySummaryTocV381";
    script.src = "factory-summary-toc-v381.js?v=20260824-factory-summary-toc-v381";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V381] Falha ao carregar a regra de sumário dos prompts da Fábrica.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
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
  installManualGoalAdditiveV379();
  installFactoryResumoAulaJurisprudenciaV380();
  installFactorySummaryTocV381();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
