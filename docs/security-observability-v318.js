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
    script.src = "performance-emergency-v350.js?v=20260905-factory-destination-queue-cooldown-v449";
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
  }

  // V399 — protege o planejamento contra mutadores legados silenciosos sem
  // adicionar polling, observadores de DOM ou trabalho contínuo.
  function installStartupPlanningStabilityV387() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusStartupPlanningStabilityV387")) return;
    const script = document.createElement("script");
    script.id = "aldusStartupPlanningStabilityV387";
    script.src = "startup-planning-stability-v387.js?v=20260826-planning-legacy-mutator-guard-v399";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V399] Falha ao carregar a proteção de estabilidade do planejamento.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V401 — metas manuais continuam aditivas e retomadas da semana passam a
  // ser registradas no Plano do Dia em que o estudo realmente é iniciado.
  function installManualGoalAdditiveV379() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusManualGoalAdditiveV379")) return;
    const script = document.createElement("script");
    script.id = "aldusManualGoalAdditiveV379";
    script.src = "manual-goal-additive-v379.js?v=20260826-manual-goal-additive-v401-previous-goal-resume-today";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V401] Falha ao carregar a proteção aditiva e a retomada de metas no Plano do Dia.");
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

  // V383 — novo prompt Lei + Jurisprudência, também isolado do bundle principal.
  // Atua apenas sobre biblioteca/roteamento de prompts e não adiciona trabalho
  // contínuo, observadores, polling ou persistência automática.
  function installFactoryLeiJurisprudenciaV383() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryLeiJurisprudenciaV383")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryLeiJurisprudenciaV383";
    script.src = "factory-lei-jurisprudencia-v383.js?v=20260824-factory-lei-jurisprudencia-v383";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V383] Falha ao carregar o prompt Lei + Jurisprudência.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V384 — revisão/consolidação final consciente dos dois produtos integrados.
  // Carregamento isolado: apenas prompt, inventário e roteamento; sem polling,
  // observadores de DOM, persistência automática ou alteração do bundle principal.
  function installFactoryFinalReviewV384() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryFinalReviewV384")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryFinalReviewV384";
    script.src = "factory-final-review-v384.js?v=20260824-final-review-consolidation-v384";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V384] Falha ao carregar a revisão e consolidação final integrada.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V384 compat — remove somente instruções legadas V128 que possam anteceder
  // a nova consolidação. Continua isolado, sem trabalho contínuo ou persistência.
  function installFactoryFinalReviewCompatV384() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryFinalReviewCompatV384")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryFinalReviewCompatV384";
    script.src = "factory-final-review-v384-compat.js?v=20260824-final-review-consolidation-v384-compat";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V384] Falha ao carregar a compatibilidade da consolidação final.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V385 — padronização visual final de DOCX alterado com sumário didático.
  // O módulo apenas registra prompt/roteamento e preserva o conteúdo do usuário;
  // sem polling, observadores, persistência automática ou hot paths.
  function installFactoryPadronizacaoFinalSumarioV385() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryPadronizacaoFinalSumarioV385")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryPadronizacaoFinalSumarioV385";
    script.src = "factory-padronizacao-final-sumario-v385.js?v=20260901-factory-padronizacao-final-sumario-v422";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V385] Falha ao carregar Padronização Final + Sumário.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V425 — novo prompt Fusão Final, isolado do bundle principal.
  // Registra apenas tipo, descrição e prompt-base; sem polling, observadores,
  // requestAnimationFrame ou persistência automática.
  // V431 - relocacao de jurisprudencia e preservacao do sublinhado na Fusao
  // Final. Carregado apos a V425 para embrulhar o roteador ja instalado.
  function installFactoryFusaoFinalRelocationV431() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryFusaoFinalRelocationV431")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryFusaoFinalRelocationV431";
    script.src = "factory-fusao-final-relocation-v431.js?v=20260902-factory-fusao-final-relocation-v431-fidelity-r2";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V431] Falha ao carregar a relocacao de jurisprudencia da Fusao Final.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  function installFactoryFusaoFinalV425() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryFusaoFinalV425")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryFusaoFinalV425";
    script.src = "factory-fusao-final-v425.js?v=20260901-factory-fusao-final-v425";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V425] Falha ao carregar o prompt Fusão Final.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V386 — comentários, bizus e jurisprudência manuais por questão.
  // O editor é sob demanda: não varre o banco no bootstrap, não observa o DOM
  // e só persiste quando o usuário confirma explicitamente o salvamento.
  function installQuestionBankManualNotesV386() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusQuestionBankManualNotesV386")) return;
    const script = document.createElement("script");
    script.id = "aldusQuestionBankManualNotesV386";
    script.src = "question-bank-manual-notes-v386.js?v=20260824-question-bank-manual-notes-v386";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V386] Falha ao carregar anotações manuais do Banco de Questões.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V382 — sumário com a mesma didática visual dos quatro módulos de conteúdo.
  // A extensão atua somente sobre texto de prompt e não adiciona observadores,
  // polling, timers, medições de layout ou persistência automática.
  function installFactorySummaryTocV382() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactorySummaryTocV382")) return;
    const script = document.createElement("script");
    script.id = "aldusFactorySummaryTocV382";
    script.src = "factory-summary-toc-v381.js?v=20260902-factory-summary-toc-fusao-final-v431";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V382] Falha ao carregar a formatação didática do sumário.");
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
  installStartupPlanningStabilityV387();
  installManualGoalAdditiveV379();
  installFactoryResumoAulaJurisprudenciaV380();
  installFactoryLeiJurisprudenciaV383();
  installFactoryFinalReviewV384();
  installFactoryFinalReviewCompatV384();
  installFactoryPadronizacaoFinalSumarioV385();
  installFactoryFusaoFinalV425();
  installFactoryFusaoFinalRelocationV431();
  installQuestionBankManualNotesV386();
  installFactorySummaryTocV382();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();