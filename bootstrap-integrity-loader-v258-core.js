(() => {
  "use strict";

  const VERSION = "20260815-bootstrap-performance-v342";
  const MAIN_DB = "metas-estudo-db";
  const MAIN_STORE = "appState";
  const MAIN_ID = "current";
  const SAFETY_DB = "metas-estudo-safety-v258";
  const SAFETY_STORE = "snapshots";
  const MAIN_LOCAL_KEY = "metasConcursoData";
  const STATUS_KEY = "aldusBootstrapIntegrityV258";
  const MAX_SNAPSHOTS = 3;
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
  const CRITICAL_KEYS = [
    "subjects",
    "studies",
    "syllabusItems",
    "dailyGoals",
    "questionLogs",
    "questionBank",
    "questionBankSessions",
    "simulados"
  ];
  const WEIGHTS = {
    subjects: 5,
    studies: 18,
    syllabusItems: 3,
    dailyGoals: 14,
    questionLogs: 15,
    materials: 4,
    questionBank: 5,
    questionBankSessions: 12,
    questionErrorNotebook: 6,
    simulados: 15,
    smartReviews: 6,
    factoryAgenda: 4,
    factoryItems: 4
  };
  const LEGACY_STATE_KEYS = [
    MAIN_LOCAL_KEY,
    "metasEstudoBackupAntesDaMesclagem",
    "aldusEmergencyLocalSnapshotV254",
    "aldusBeforeStorageRecoveryV254",
    "aldusBeforeIndexedDBActivationV256",
    "aldusEmergencyIndexedDBActivationBackupV256"
  ];
  const SCRIPT_CHAIN = [
    ["aldusAppBundleScript", "app-v419.js?v=20260831-daily-goals-explicit-mutation-v419"],
    ["aldusPlanningQualityV368", "planning-quality-v368.js?v=20260826-planning-stability-v397"],
    ["aldusTimerGoalIntegrityV366", "timer-goal-integrity-v366.js?v=20260821-timer-goal-integrity-v366"],
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

  function safeParse(value) {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function cloneData(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function counts(state = {}) {
    return Object.fromEntries(COLLECTION_KEYS.map((key) => [
      key,
      Array.isArray(state?.[key]) ? state[key].length : 0
    ]));
  }

  function stateHasUserData(state = {}) {
    const summary = counts(state);
    return Object.values(summary).some((value) => value > 0);
  }

  function stateShapeValid(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return false;
    if (!COLLECTION_KEYS.every((key) => state[key] === undefined || Array.isArray(state[key]))) return false;
    return stateHasUserData(state);
  }

  function extractStates(value, path = "raiz", depth = 0, seen = new Set()) {
    if (depth > 5) return [];
    const parsed = safeParse(value);
    if (!parsed || typeof parsed !== "object") return [];
    if (seen.has(parsed)) return [];
    seen.add(parsed);

    const found = [];
    if (stateShapeValid(parsed)) found.push({ state: parsed, path });

    if (Array.isArray(parsed)) {
      parsed.slice(0, 12).forEach((entry, index) => {
        found.push(...extractStates(entry, `${path}[${index}]`, depth + 1, seen));
      });
      return found;
    }

    const envelopeKeys = [
      "state",
      "data",
      "raw",
      "runtime",
      "indexedDB",
      "current",
      "snapshot",
      "backup",
      "payload"
    ];
    for (const key of envelopeKeys) {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        found.push(...extractStates(parsed[key], `${path}.${key}`, depth + 1, seen));
      }
    }
    return found;
  }

  function checksumText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-json-v2-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function checksumState(state) {
    return checksumText(JSON.stringify(state || {}));
  }

  function parseTimestamp(value, now = Date.now()) {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = typeof value === "number" ? value : Date.parse(String(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    if (parsed > now + 10 * 60 * 1000) return 0;
    return parsed;
  }

  function stateTimestamp(state = {}, now = Date.now()) {
    const timestampKeys = [
      "updatedAt",
      "savedAt",
      "createdAt",
      "completedAt",
      "finishedAt",
      "startedAt",
      "capturedAt",
      "importedAt",
      "lastModifiedAt"
    ];
    let latest = 0;
    const inspect = (object) => {
      if (!object || typeof object !== "object") return;
      for (const key of timestampKeys) {
        latest = Math.max(latest, parseTimestamp(object[key], now));
      }
    };
    inspect(state);
    inspect(state.syncMeta);
    inspect(state.meta);
    inspect(state.planning);
    for (const key of COLLECTION_KEYS) {
      const rows = Array.isArray(state[key]) ? state[key] : [];
      for (const row of rows) inspect(row);
    }
    return latest;
  }

  function scoreState(state = {}) {
    const summary = counts(state);
    return COLLECTION_KEYS.reduce(
      (total, key) => total + summary[key] * (WEIGHTS[key] || 1),
      0
    );
  }

  function scoreCounts(summary = {}) {
    return COLLECTION_KEYS.reduce(
      (total, key) => total + (summary[key] || 0) * (WEIGHTS[key] || 1),
      0
    );
  }

  function makeCandidate(source, state, extra = {}) {
    const summary = counts(state);
    return {
      source,
      state,
      counts: summary,
      score: scoreCounts(summary),
      timestamp: stateTimestamp(state),
      checksum: checksumState(state),
      ...extra
    };
  }

  function sameCriticalCounts(left, right) {
    return CRITICAL_KEYS.every((key) => left.counts[key] === right.counts[key]);
  }

  function dominates(left, right) {
    let grew = false;
    for (const key of CRITICAL_KEYS) {
      if (left.counts[key] < right.counts[key]) return false;
      if (left.counts[key] > right.counts[key]) grew = true;
    }
    return grew;
  }

  function candidateOrder(left, right) {
    if (left.score !== right.score) return right.score - left.score;
    if (left.timestamp !== right.timestamp) return right.timestamp - left.timestamp;
    const priority = (source) => source === "indexeddb" ? 3 : source === "localStorage:metasConcursoData" ? 2 : 1;
    return priority(right.source) - priority(left.source);
  }

  function chooseCandidate(candidates = []) {
    const unique = [];
    const checksums = new Set();
    for (const candidate of candidates.filter(Boolean)) {
      if (!candidate.state || !stateShapeValid(candidate.state) || checksums.has(candidate.checksum)) continue;
      checksums.add(candidate.checksum);
      unique.push(candidate);
    }
    if (!unique.length) return { candidate: null, reason: "nenhuma-copia-valida", conflict: false };

    const indexed = unique.find((candidate) => candidate.source === "indexeddb");
    if (indexed) {
      const safeSuperior = unique
        .filter((candidate) => candidate !== indexed)
        .filter((candidate) => {
          if (dominates(candidate, indexed)) {
            return !indexed.timestamp || !candidate.timestamp || candidate.timestamp >= indexed.timestamp;
          }
          return sameCriticalCounts(candidate, indexed)
            && candidate.timestamp > indexed.timestamp + 1000;
        })
        .sort(candidateOrder);
      if (safeSuperior.length) {
        return { candidate: safeSuperior[0], reason: "copia-superior-validada", conflict: false };
      }

      const conflicting = unique.some((candidate) => candidate !== indexed
        && candidate.checksum !== indexed.checksum
        && !dominates(candidate, indexed)
        && !dominates(indexed, candidate)
        && !sameCriticalCounts(candidate, indexed));
      return {
        candidate: indexed,
        reason: conflicting ? "conflito-conservador-indexeddb-preservado" : "indexeddb-valido-preservado",
        conflict: conflicting
      };
    }

    const nonDominated = unique.filter((candidate) => !unique.some((other) => other !== candidate && dominates(other, candidate)));
    nonDominated.sort(candidateOrder);
    return {
      candidate: nonDominated[0],
      reason: nonDominated.length > 1 ? "melhor-copia-sem-indexeddb-com-conflito" : "melhor-copia-sem-indexeddb",
      conflict: nonDominated.length > 1
    };
  }

  function openMainDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MAIN_DB);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MAIN_STORE)) {
          database.createObjectStore(MAIN_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o IndexedDB principal."));
      request.onblocked = () => reject(new Error("IndexedDB principal bloqueado por outra aba."));
    });
  }

  function readRecord(database, storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Falha ao ler o IndexedDB."));
      transaction.onabort = () => reject(transaction.error || new Error("Leitura do IndexedDB abortada."));
    });
  }

  function putRecord(database, storeName, record) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(record);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao gravar no IndexedDB."));
      transaction.onabort = () => reject(transaction.error || new Error("Gravação no IndexedDB abortada."));
    });
  }

  async function readMainRecord() {
    const database = await openMainDatabase();
    try {
      return await readRecord(database, MAIN_STORE, MAIN_ID);
    } finally {
      database.close();
    }
  }

  async function writeMainState(state) {
    const serialized = JSON.stringify(state);
    const record = {
      id: MAIN_ID,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      checksum: checksumText(serialized),
      serializedSize: serialized.length,
      data: cloneData(state)
    };
    const database = await openMainDatabase();
    try {
      await putRecord(database, MAIN_STORE, record);
      const verified = await readRecord(database, MAIN_STORE, MAIN_ID);
      if (!verified || verified.checksum !== record.checksum || checksumState(verified.data) !== record.checksum) {
        throw new Error("A validação da gravação principal falhou.");
      }
      return verified;
    } finally {
      database.close();
    }
  }

  function openSafetyDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SAFETY_DB, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(SAFETY_STORE)) {
          database.createObjectStore(SAFETY_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir banco de segurança."));
      request.onblocked = () => reject(new Error("Banco de segurança bloqueado por outra aba."));
    });
  }

  function getAllRecords(database, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error("Falha ao listar backups rotativos."));
    });
  }

  function getAllKeys(database, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAllKeys();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error("Falha ao listar chaves dos backups rotativos."));
    });
  }

  function deleteRecords(database, storeName, ids) {
    if (!ids.length) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      ids.forEach((id) => store.delete(id));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao rotacionar backups."));
      transaction.onabort = () => reject(transaction.error || new Error("Rotação de backups abortada."));
    });
  }

  function snapshotKeyTimestamp(id) {
    const timestamp = Number(String(id || "").split("-", 1)[0]);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  async function saveSafetySnapshot(state, label, source, knownChecksum = "") {
    if (!stateShapeValid(state)) return null;
    const checksum = knownChecksum || checksumState(state);
    const checksumSuffix = checksum.slice(-16);
    const database = await openSafetyDatabase();
    try {
      const existingKeys = await getAllKeys(database, SAFETY_STORE);
      if (existingKeys.some((id) => String(id).endsWith(checksumSuffix))) return null;
      const record = {
        id: `${Date.now()}-${label}-${checksumSuffix}`,
        version: VERSION,
        createdAt: new Date().toISOString(),
        label,
        source,
        checksum,
        counts: counts(state),
        data: cloneData(state)
      };
      try {
        await putRecord(database, SAFETY_STORE, record);
      } catch (error) {
        const old = existingKeys
          .slice()
          .sort((left, right) => snapshotKeyTimestamp(left) - snapshotKeyTimestamp(right));
        if (old.length) {
          await deleteRecords(database, SAFETY_STORE, old.slice(0, Math.max(1, old.length - 1)));
          await putRecord(database, SAFETY_STORE, record);
        } else {
          throw error;
        }
      }
      const allKeys = await getAllKeys(database, SAFETY_STORE);
      const excess = allKeys
        .slice()
        .sort((left, right) => snapshotKeyTimestamp(right) - snapshotKeyTimestamp(left))
        .slice(MAX_SNAPSHOTS);
      await deleteRecords(database, SAFETY_STORE, excess);
      return record;
    } finally {
      database.close();
    }
  }

  function localCandidateEntries() {
    const keys = new Set(LEGACY_STATE_KEYS);
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (/^(aldus|metas)/i.test(key) && /(backup|snapshot|recover|restore|state|mesclagem)/i.test(key)) keys.add(key);
      }
    } catch {}

    const candidates = [];
    for (const key of keys) {
      let raw = "";
      try {
        raw = localStorage.getItem(key) || "";
      } catch {
        continue;
      }
      if (!raw) continue;
      for (const entry of extractStates(raw, "raiz")) {
        candidates.push(makeCandidate(`localStorage:${key}`, entry.state, { path: entry.path }));
      }
    }
    return candidates;
  }

  function persistStatus(status) {
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(status));
    } catch {}
    globalThis.__ALDUS_BOOTSTRAP_INTEGRITY_V258__ = Object.freeze(status);
  }

  async function reconcileBeforeBootstrap() {
    const candidates = [];
    const mainRecord = await readMainRecord().catch((error) => ({ error }));
    if (mainRecord?.data && stateShapeValid(mainRecord.data)) {
      const indexedCandidate = makeCandidate("indexeddb", mainRecord.data, {
        recordChecksum: mainRecord.checksum || ""
      });
      indexedCandidate.checksumValid = !mainRecord.checksum || indexedCandidate.checksum === mainRecord.checksum;
      candidates.push(indexedCandidate);
    }
    candidates.push(...localCandidateEntries());

    const decision = chooseCandidate(candidates);
    if (!decision.candidate) {
      const status = {
        version: VERSION,
        checkedAt: new Date().toISOString(),
        ready: true,
        source: "nenhuma-copia",
        reason: decision.reason,
        conflict: false,
        snapshots: 0
      };
      persistStatus(status);
      return status;
    }

    const chosen = decision.candidate;
    const currentIndexed = candidates.find((candidate) => candidate.source === "indexeddb");
    if (currentIndexed) {
      await saveSafetySnapshot(currentIndexed.state, "antes-do-bootstrap", currentIndexed.source, currentIndexed.checksum).catch((error) => {
        console.warn("[Aldus V258] Backup anterior não pôde ser gravado.", error);
      });
    }

    const mustRewrite = chosen.source !== "indexeddb"
      || !currentIndexed
      || !mainRecord?.checksum
      || currentIndexed.checksum !== chosen.checksum
      || currentIndexed.checksumValid === false;
    const finalRecord = mustRewrite ? await writeMainState(chosen.state) : mainRecord;
    if (!finalRecord?.data || !finalRecord.checksum) {
      throw new Error("O estado escolhido não passou pela validação final.");
    }
    if (mustRewrite && finalRecord.checksum !== chosen.checksum) {
      throw new Error("A cópia gravada divergiu do estado escolhido.");
    }
    if (!mustRewrite && currentIndexed?.checksum !== finalRecord.checksum) {
      throw new Error("O estado principal mudou durante a validação.");
    }

    await saveSafetySnapshot(finalRecord.data, "estado-validado", chosen.source, finalRecord.checksum).catch((error) => {
      console.warn("[Aldus V258] Backup validado não pôde ser gravado.", error);
    });

    try {
      localStorage.removeItem(MAIN_LOCAL_KEY);
    } catch {}

    const status = {
      version: VERSION,
      checkedAt: new Date().toISOString(),
      ready: true,
      source: chosen.source,
      reason: decision.reason,
      conflict: decision.conflict,
      checksum: finalRecord.checksum,
      counts: chosen.counts,
      score: chosen.score,
      timestamp: chosen.timestamp,
      rewritten: mustRewrite,
      candidateCount: candidates.length,
      backupDatabase: SAFETY_DB,
      maxSnapshots: MAX_SNAPSHOTS
    };
    persistStatus(status);
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

  async function loadApplicationChain() {
    const [application, ...enhancements] = SCRIPT_CHAIN;
    await loadScript(...application);
    await Promise.all(enhancements.map(([id, src]) => loadScript(id, src)));
  }

  async function start() {
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Validando e protegendo seus dados...";
    let status;
    try {
      status = await reconcileBeforeBootstrap();
    } catch (error) {
      status = {
        version: VERSION,
        checkedAt: new Date().toISOString(),
        ready: false,
        source: "erro",
        reason: String(error?.message || error),
        conflict: true
      };
      persistStatus(status);
      console.error("[Aldus V258] Falha na validação anterior ao bootstrap.", error);
    }

    await loadApplicationChain();
    window.dispatchEvent(new CustomEvent("aldus:bootstrap-integrity-v258-ready", { detail: status }));
  }

  const testApi = {
    VERSION,
    counts,
    stateHasUserData,
    stateShapeValid,
    extractStates,
    checksumState,
    stateTimestamp,
    scoreState,
    makeCandidate,
    dominates,
    sameCriticalCounts,
    chooseCandidate
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = testApi;
    return;
  }

  if (typeof document !== "undefined") {
    start().catch((error) => {
      console.error("[Aldus V258] Falha ao iniciar o aplicativo.", error);
      const loading = document.getElementById("appLoadingState");
      if (loading) loading.textContent = "Falha ao validar os dados. Recarregue a página.";
    });
  }
})();
