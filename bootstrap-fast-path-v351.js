(() => {
  "use strict";

  const VERSION = "20260817-bootstrap-fast-path-v351";
  const MAIN_DB = "metas-estudo-db";
  const MAIN_STORE = "appState";
  const MAIN_ID = "current";
  const MAIN_LOCAL_KEY = "metasConcursoData";
  const STATUS_KEY = "aldusBootstrapFastPathV351";
  const FALLBACK_CORE = `bootstrap-integrity-loader-v258-core.js?v=${VERSION}&fallback=v351`;
  const SCRIPT_CHAIN = [
    ["aldusAppBundleScript", "app-v344.js?v=20260817-qb-package-single-pass-v344"],
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
  const COLLECTION_KEYS = [
    "subjects",
    "studies",
    "syllabusItems",
    "dailyGoals",
    "questionLogs",
    "materials",
    "questionBank",
    "questionBankSessions",
    "questionErrorNotebook",
    "simulados",
    "smartReviews",
    "factoryAgenda",
    "factoryItems"
  ];
  const SAFE_GUARD_ACTIONS = new Set(["preserved-fast", "preserved", "recovered", "no-state-found"]);

  function stateValid(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (!COLLECTION_KEYS.every((key) => value[key] === undefined || Array.isArray(value[key]))) return false;
    return COLLECTION_KEYS.some((key) => Array.isArray(value[key]) && value[key].length > 0);
  }

  function guardAllowsFastPath(status = globalThis.__ALDUS_CATASTROPHIC_STATE_STATUS_V275__) {
    return Boolean(status?.ready === true && SAFE_GUARD_ACTIONS.has(status.action));
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MAIN_DB);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MAIN_STORE)) {
          database.createObjectStore(MAIN_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB principal."));
      request.onblocked = () => reject(new Error("IndexedDB principal bloqueado por outra aba."));
    });
  }

  function readRecord(database) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(MAIN_STORE, "readonly");
      const request = transaction.objectStore(MAIN_STORE).get(MAIN_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Falha ao ler IndexedDB principal."));
      transaction.onabort = () => reject(transaction.error || new Error("Leitura do IndexedDB abortada."));
    });
  }

  async function readMainRecord() {
    const database = await openDatabase();
    try {
      return await readRecord(database);
    } finally {
      database.close();
    }
  }

  function liveLocalStateExists() {
    try {
      const raw = localStorage.getItem(MAIN_LOCAL_KEY);
      if (!raw) return false;
      return stateValid(JSON.parse(raw));
    } catch {
      return true;
    }
  }

  function setStatus(detail) {
    const status = {
      version: VERSION,
      checkedAt: new Date().toISOString(),
      ...detail
    };
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(status));
    } catch {}
    globalThis.__ALDUS_BOOTSTRAP_FAST_PATH_V351__ = Object.freeze(status);
    return status;
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.aldusLoaded === "true") resolve(existing);
        else {
          existing.addEventListener("load", () => resolve(existing), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}.`)), { once: true });
        }
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

  async function loadApplicationChain() {
    const [application, ...enhancements] = SCRIPT_CHAIN;
    await loadScript(...application);
    await Promise.all(enhancements.map(([id, src]) => loadScript(id, src)));
  }

  async function fallback(reason) {
    setStatus({ fast: false, fallback: true, reason });
    await loadScript("aldusBootstrapIntegrityFallbackV258", FALLBACK_CORE);
  }

  async function start() {
    const startedAt = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Abrindo seus dados protegidos...";

    const guardStatus = globalThis.__ALDUS_CATASTROPHIC_STATE_STATUS_V275__;
    if (guardAllowsFastPath(guardStatus)) {
      setStatus({
        fast: true,
        fallback: false,
        source: `guard:${guardStatus.action}`,
        durationMsBeforeApp: 0
      });
      await loadApplicationChain();
      return;
    }

    let record;
    try {
      record = await readMainRecord();
    } catch (error) {
      await fallback(`indexeddb-error:${String(error?.message || error)}`);
      return;
    }

    if (!stateValid(record?.data)) {
      await fallback("indexeddb-invalido-ou-vazio");
      return;
    }
    if (liveLocalStateExists()) {
      await fallback("estado-local-primario-presente");
      return;
    }

    const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
    setStatus({
      fast: true,
      fallback: false,
      source: "indexeddb",
      durationMsBeforeApp: Number((finishedAt - startedAt).toFixed(1))
    });
    await loadApplicationChain();
  }

  const api = Object.freeze({ VERSION, stateValid, guardAllowsFastPath, liveLocalStateExists });
  globalThis.AldusBootstrapFastPathV351 = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  if (typeof document !== "undefined") {
    start().catch((error) => fallback(`fast-path-error:${String(error?.message || error)}`).catch((fallbackError) => {
      console.error("[Aldus V351] Falha também no fallback de bootstrap.", fallbackError);
      const loading = document.getElementById("appLoadingState");
      if (loading) loading.textContent = "Falha ao abrir os dados. Use a Central de Recuperação.";
    }));
  }
})();
