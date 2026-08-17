(() => {
  "use strict";

  const VERSION = "20260816-storage-consistency-v345";
  const MAIN_DB = "metas-estudo-db";
  const MAIN_STORE = "appState";
  const MAIN_ID = "current";
  const MAIN_LOCAL_KEY = "metasConcursoData";
  const STATUS_KEY = "aldusBootstrapFastPathV345";
  const CONCURRENCY_SCRIPT = "storage-concurrency-v345.js?v=20260817-concurrency-disabled-v346";
  const FALLBACK_CORE = "bootstrap-integrity-loader-v258-core.js?v=20260816-storage-consistency-v345&fallback=v345";
  const SCRIPT_CHAIN = [
    ["aldusAppBundleScript", "app-v345.js?v=20260816-storage-consistency-v345"],
    ["aldusQconcursosFilterRouteV333", "qconcursos-filter-route-v333.js?v=20260814-restaura-filtros-qconcursos-v333"],
    ["aldusQconcursosAllFiltersV334", "qconcursos-all-filters-v334.js?v=20260814-qconcursos-todas-disciplinas-v334"],
    ["aldusQconcursosRouteSafetyV335", "qconcursos-route-safety-v335.js?v=20260814-qconcursos-rota-segura-v335"],
    ["aldusQconcursosNativeSubjectV336", "qconcursos-native-subject-v336.js?v=20260814-qconcursos-assunto-nativo-v336"],
    ["aldusQconcursosCurrentCatalogV337", "qconcursos-current-catalog-v337.js?v=20260814-qconcursos-catalogo-atual-v337"],
    ["aldusFactorySimuladoVisibilityV315", "factory-simulado-visibility-v315.js?v=20260814-gerador-simulados-em-questoes-v328"],
    ["aldusFactorySimuladoPromptV310", "factory-simulado-prompt-v310.js?v=20260814-gerador-simulados-em-questoes-v328"],
    ["aldusSimuladoInterativoV313", "simulado-interativo-v313.js?v=20260811-simulado-interativo-v313"],
    ["aldusSimuladoIntegracaoV314", "simulado-integracao-v314.js?v=20260816-multitab-timer-simulado-v346"],
    ["aldusDailySummaryTimeFormatV243Direct", "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix3"],
    ["aldusDashboardTodayTimeSyncV253", "dashboard-today-time-sync-v253.js?v=20260805-dashboard-today-time-sync-v253&hotfix=dashboard-today-time-sync-hotfix1"],
    ["aldusDashboardTodayQuestionsSyncV257", "dashboard-today-questions-sync-v257.js?v=20260805-dashboard-today-questions-sync-v257&hotfix=question-bank-sessions1"],
    ["aldusPlanningIntegrityLoaderV235", "planning-integrity-loader-v235.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&publication=v244"],
    ["aldusCentralPeriodCardsScriptV248", "central-goals-period-palette-v248.js?v=20260805-central-period-cards-v248"],
    ["aldusDailySummaryElegantScriptV250", "daily-summary-elegant-v250.js?v=20260805-daily-summary-elegant-v250"],
    ["aldusTimerSessionIntegrityV236", "timer-session-integrity-v236.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&hotfix=timer-session-integrity-hotfix1"]
  ];
  const CRITICAL_KEYS = ["subjects", "studies", "syllabusItems", "dailyGoals", "questionLogs", "questionBank", "questionBankSessions", "simulados"];

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function stateValid(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value)
      && CRITICAL_KEYS.some((key) => Array.isArray(value[key]) && value[key].length > 0));
  }

  function checksumText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-json-v2-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function checksumState(value) {
    return checksumText(JSON.stringify(value || {}));
  }

  function counts(value = {}) {
    return Object.fromEntries(CRITICAL_KEYS.map((key) => [key, Array.isArray(value[key]) ? value[key].length : 0]));
  }

  function timeScore(value = {}) {
    const studies = (value.studies || []).reduce((sum, item) =>
      sum + Math.max(0, Number(item?.minutes) || Math.round((Number(item?.seconds) || Number(item?.elapsedSeconds) || 0) / 60)), 0);
    const goals = (value.dailyGoals || []).reduce((sum, goal) =>
      sum + Math.max(0, Number(goal?.actualMinutes) || 0, Number(goal?.tempo_real_minutos) || 0,
        (Number(goal?.studyActualMinutes) || 0) + (Number(goal?.questionActualMinutes) || 0)), 0);
    const questions = (value.questionLogs || []).reduce((sum, item) => sum + Math.max(0, Number(item?.minutes) || 0), 0);
    return Math.round(studies + goals + questions);
  }

  function compareLocalToIndexed(localState, indexedState) {
    if (!stateValid(localState)) return "indexed";
    if (!stateValid(indexedState)) return "local";
    const localCounts = counts(localState);
    const indexedCounts = counts(indexedState);
    let localHigher = false;
    let indexedHigher = false;
    for (const key of CRITICAL_KEYS) {
      if (localCounts[key] > indexedCounts[key]) localHigher = true;
      if (localCounts[key] < indexedCounts[key]) indexedHigher = true;
    }
    if (localHigher && !indexedHigher) return "local";
    if (indexedHigher && !localHigher) return "indexed";
    if (!localHigher && !indexedHigher) {
      const localTime = timeScore(localState);
      const indexedTime = timeScore(indexedState);
      if (localTime > indexedTime) return "local";
      return "indexed";
    }
    return "ambiguous";
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MAIN_DB);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MAIN_STORE)) db.createObjectStore(MAIN_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB."));
      request.onblocked = () => reject(new Error("IndexedDB bloqueado por outra aba."));
    });
  }

  function readRecord(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MAIN_STORE, "readonly");
      const request = tx.objectStore(MAIN_STORE).get(MAIN_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Falha ao ler IndexedDB."));
      tx.onabort = () => reject(tx.error || new Error("Leitura IndexedDB abortada."));
    });
  }

  function putRecord(db, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MAIN_STORE, "readwrite");
      tx.objectStore(MAIN_STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error("Falha ao gravar IndexedDB."));
      tx.onabort = () => reject(tx.error || new Error("Gravação IndexedDB abortada."));
    });
  }

  async function readMain() {
    const db = await openDatabase();
    try { return await readRecord(db); }
    finally { db.close(); }
  }

  async function writeMain(value) {
    const serialized = JSON.stringify(value);
    const record = {
      id: MAIN_ID,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      checksum: checksumText(serialized),
      serializedSize: serialized.length,
      fastBootstrapVersion: VERSION,
      data: clone(value)
    };
    const db = await openDatabase();
    try {
      await putRecord(db, record);
      const verified = await readRecord(db);
      if (!verified?.data || verified.checksum !== record.checksum || checksumState(verified.data) !== record.checksum) {
        throw new Error("A validação da gravação rápida falhou.");
      }
      return verified;
    } finally {
      db.close();
    }
  }

  function readLiveLocalState() {
    try {
      const raw = localStorage.getItem(MAIN_LOCAL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return stateValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function setStatus(detail) {
    const status = { version: VERSION, checkedAt: new Date().toISOString(), ...detail };
    try { localStorage.setItem(STATUS_KEY, JSON.stringify(status)); } catch {}
    globalThis.__ALDUS_FAST_BOOTSTRAP_V345__ = Object.freeze(status);
    return status;
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.aldusLoaded === "true") resolve(existing);
        else existing.addEventListener("load", () => resolve(existing), { once: true });
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

  async function loadApplication() {
    await loadScript("aldusStorageConcurrencyV345", CONCURRENCY_SCRIPT);
    const [application, ...enhancements] = SCRIPT_CHAIN;
    await loadScript(...application);
    await Promise.all(enhancements.map(([id, src]) => loadScript(id, src)));
  }

  async function fallback(reason) {
    setStatus({ fast: false, fallback: true, reason });
    await loadScript("aldusStorageConcurrencyV345", CONCURRENCY_SCRIPT).catch(() => null);
    await loadScript("aldusBootstrapIntegrityFallbackV258", FALLBACK_CORE);
  }

  async function start() {
    const startedAt = performance.now();
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Abrindo seus dados protegidos...";
    let record;
    try {
      record = await readMain();
    } catch (error) {
      return fallback(`indexeddb-error:${String(error?.message || error)}`);
    }
    const indexedState = record?.data;
    if (!stateValid(indexedState) || (record?.checksum && checksumState(indexedState) !== record.checksum)) {
      return fallback("indexeddb-invalido-ou-vazio");
    }

    const localState = readLiveLocalState();
    const decision = compareLocalToIndexed(localState, indexedState);
    if (decision === "ambiguous") return fallback("conflito-live-local-indexeddb");

    if (decision === "local") {
      try {
        record = await writeMain(localState);
      } catch (error) {
        return fallback(`falha-promover-local:${String(error?.message || error)}`);
      }
    }

    try { localStorage.removeItem(MAIN_LOCAL_KEY); } catch {}
    setStatus({
      fast: true,
      fallback: false,
      source: decision === "local" ? "localStorage-promovido" : "indexeddb",
      durationMsBeforeApp: Number((performance.now() - startedAt).toFixed(1)),
      indexedChecksum: record?.checksum || ""
    });
    await loadApplication();
  }

  const api = Object.freeze({ VERSION, stateValid, checksumState, counts, timeScore, compareLocalToIndexed });
  globalThis.AldusBootstrapFastPathV345 = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  start().catch((error) => fallback(`fast-core-error:${String(error?.message || error)}`).catch((fallbackError) => {
    console.error("[Aldus V345] Falha também no fallback de bootstrap.", fallbackError);
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Falha ao abrir os dados. Use a Central de Recuperação.";
  }));
})();
