(() => {
  "use strict";

  const VERSION = "20260815-bootstrap-fast-path-v339";
  const STATUS_KEY = "aldusBootstrapIntegrityV258";
  const SCRIPT_CHAIN = [
    ["aldusAppBundleScript", "app-v332.js?v=20260814-restaura-topificacao-jurisprudencia-v332"],
    ["aldusQconcursosFilterRouteV333", "qconcursos-filter-route-v333.js?v=20260814-restaura-filtros-qconcursos-v333"],
    ["aldusQconcursosAllFiltersV334", "qconcursos-all-filters-v334.js?v=20260814-qconcursos-todas-disciplinas-v334"],
    ["aldusQconcursosRouteSafetyV335", "qconcursos-route-safety-v335.js?v=20260814-qconcursos-rota-segura-v335"],
    ["aldusQconcursosNativeSubjectV336", "qconcursos-native-subject-v336.js?v=20260814-qconcursos-assunto-nativo-v336"],
    ["aldusQconcursosCurrentCatalogV337", "qconcursos-current-catalog-v337.js?v=20260814-qconcursos-catalogo-atual-v337"],
    ["aldusFactorySimuladoVisibilityV315", "factory-simulado-visibility-v315.js?v=20260814-gerador-simulados-em-questoes-v328"],
    ["aldusFactorySimuladoPromptV310", "factory-simulado-prompt-v310.js?v=20260814-gerador-simulados-em-questoes-v328"],
    ["aldusSimuladoInterativoV313", "simulado-interativo-v313.js?v=20260811-simulado-interativo-v313"],
    ["aldusSimuladoIntegracaoV314", "simulado-integracao-v314.js?v=20260811-simulado-integracao-v314"],
    ["aldusDailySummaryTimeFormatV243Direct", "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix3"],
    ["aldusDashboardTodayTimeSyncV253", "dashboard-today-time-sync-v253.js?v=20260805-dashboard-today-time-sync-v253&hotfix=dashboard-today-time-sync-hotfix1"],
    ["aldusDashboardTodayQuestionsSyncV257", "dashboard-today-questions-sync-v257.js?v=20260805-dashboard-today-questions-sync-v257&hotfix=question-bank-sessions1"],
    ["aldusPlanningIntegrityLoaderV235", "planning-integrity-loader-v235.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&publication=v244"],
    ["aldusCentralPeriodCardsScriptV248", "central-goals-period-palette-v248.js?v=20260805-central-period-cards-v248"],
    ["aldusDailySummaryElegantScriptV250", "daily-summary-elegant-v250.js?v=20260805-daily-summary-elegant-v250"],
    ["aldusTimerSessionIntegrityV236", "timer-session-integrity-v236.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&hotfix=timer-session-integrity-hotfix1"]
  ];

  function readPreviousStatus() {
    try {
      return JSON.parse(localStorage.getItem(STATUS_KEY) || "null") || {};
    } catch {
      return {};
    }
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        // Scripts declarados antes do bootstrap já executaram por causa da ordem de `defer`.
        resolve(existing);
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener("load", () => {
        script.dataset.aldusLoaded = "true";
        resolve(script);
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}.`)), { once: true });
      document.body.appendChild(script);
    });
  }

  async function start() {
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Abrindo seus estudos...";

    const [application, ...enhancements] = SCRIPT_CHAIN;
    await loadScript(...application);
    await Promise.all(enhancements.map(([id, src]) => loadScript(id, src)));

    const previous = readPreviousStatus();
    const status = {
      ...previous,
      ready: true,
      fastPath: true,
      fastPathVersion: VERSION,
      fastPathAt: new Date().toISOString()
    };
    globalThis.__ALDUS_BOOTSTRAP_FAST_V339__ = Object.freeze(status);
    window.dispatchEvent(new CustomEvent("aldus:bootstrap-integrity-v258-ready", { detail: status }));
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VERSION, SCRIPT_CHAIN };
    return;
  }

  start().catch((error) => {
    console.error("[Aldus V339] Falha no caminho rápido de inicialização.", error);
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Falha ao iniciar. Recarregue a página.";
  });
})();
