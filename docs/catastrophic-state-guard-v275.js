(() => {
  "use strict";

  const VERSION = "20260815-bootstrap-performance-v342";
  const MAIN_KEY = "metasConcursoData";
  const META_KEY = "aldusIndexedDBOnlyStateV256";
  const STATUS_KEY = "aldusCatastrophicStateGuardV275";
  const EXPECTED_KEY = "aldusRecoveryExpectedV275";
  const DB_NAME = "metas-estudo-db";
  const DB_VERSION = 1;
  const STORE_NAME = "appState";
  const CURRENT_ID = "current";
  const SAFETY_DB = "metas-estudo-safety-v275";
  const SAFETY_STORE = "snapshots";
  const LEGACY_SAFETY_DB = "metas-estudo-safety-v258";
  const LEGACY_SAFETY_STORE = "snapshots";
  const SOFT_LIMIT = 2_000_000;
  const MAX_SNAPSHOTS = 10;

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

  const WEIGHTS = {
    subjects: 4,
    studies: 24,
    syllabusItems: 4,
    dailyGoals: 18,
    questionLogs: 20,
    materials: 7,
    questionBank: 8,
    questionBankSessions: 16,
    questionErrorNotebook: 8,
    simulados: 24,
    smartReviews: 10,
    factoryAgenda: 5,
    factoryItems: 5
  };

  const COLLAPSE_RULES = {
    studies: { minReference: 12, maxRatio: 0.35 },
    dailyGoals: { minReference: 45, maxRatio: 0.35 },
    syllabusItems: { minReference: 300, maxRatio: 0.62 },
    questionLogs: { minReference: 5, maxRatio: 0.30 },
    materials: { minReference: 20, maxRatio: 0.30 },
    questionBank: { minReference: 120, maxRatio: 0.35 },
    questionBankSessions: { minReference: 5, maxRatio: 0.30 },
    questionErrorNotebook: { minReference: 25, maxRatio: 0.45 },
    simulados: { minReference: 2, maxRatio: 0.25 },
    smartReviews: { minReference: 5, maxRatio: 0.30 },
    factoryItems: { minReference: 200, maxRatio: 0.62 },
    factoryAgenda: { minReference: 200, maxRatio: 0.62 }
  };

  const LOCAL_CANDIDATE_KEYS = [
    MAIN_KEY,
    "metasEstudoBackupAntesDaMesclagem",
    "aldusEmergencyLocalSnapshotV254",
    "aldusBeforeStorageRecoveryV254",
    "aldusBeforeIndexedDBActivationV256",
    "aldusEmergencyIndexedDBActivationBackupV256"
  ];

  if (globalThis.__ALDUS_CATASTROPHIC_STATE_GUARD_V275__) return;

  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  let pendingSerialized = "";
  let pendingReason = "";
  let pendingTimer = 0;
  let persistInFlight = false;
  let goldenCounts = null;
  let goldenScore = 0;
  let destructiveBypassUntil = 0;

  function cloneData(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(value) {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function counts(state = {}) {
    return Object.fromEntries(COLLECTION_KEYS.map((key) => [key, Array.isArray(state?.[key]) ? state[key].length : 0]));
  }

  function scoreCounts(summary = {}) {
    return COLLECTION_KEYS.reduce((total, key) => total + (summary[key] || 0) * (WEIGHTS[key] || 1), 0);
  }

  function score(state = {}) {
    return scoreCounts(counts(state));
  }

  function stateShapeValid(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return false;
    return COLLECTION_KEYS.some((key) => Array.isArray(state[key]) && state[key].length > 0);
  }

  function checksumForText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-json-v2-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function checksumState(state) {
    return checksumForText(JSON.stringify(state || {}));
  }

  function catastrophicRegressionFromCounts(nextState = {}, reference = {}) {
    const next = counts(nextState);
    const losses = [];

    for (const [key, rule] of Object.entries(COLLAPSE_RULES)) {
      const previous = Number(reference?.[key]) || 0;
      const current = next[key] || 0;
      if (previous < rule.minReference) continue;
      const ratio = previous ? current / previous : 1;
      if (ratio <= rule.maxRatio) losses.push({ key, previous, current, ratio });
    }

    const historyCollapse = losses.filter((entry) => [
      "studies", "questionLogs", "questionBank", "questionBankSessions", "simulados", "smartReviews"
    ].includes(entry.key));
    const broadCollapse = losses.length >= 3;
    const multiHistoryCollapse = historyCollapse.length >= 2;
    const emptyHistoryCluster = ["studies", "questionLogs", "questionBank", "simulados"]
      .filter((key) => (Number(reference?.[key]) || 0) > 0 && (next[key] || 0) === 0).length >= 2;

    return {
      catastrophic: broadCollapse || multiHistoryCollapse || emptyHistoryCluster,
      losses,
      reference,
      next
    };
  }

  function catastrophicRegression(nextState = {}, referenceState = {}) {
    if (!stateShapeValid(referenceState)) return { catastrophic: false, losses: [] };
    return catastrophicRegressionFromCounts(nextState, counts(referenceState));
  }

  function extractStates(value, depth = 0, seen = new Set()) {
    if (depth > 5) return [];
    const parsed = safeParse(value);
    if (!parsed || typeof parsed !== "object") return [];
    if (seen.has(parsed)) return [];
    seen.add(parsed);
    const found = [];
    if (stateShapeValid(parsed)) found.push(parsed);
    const keys = ["data", "state", "raw", "runtime", "indexedDB", "current", "snapshot", "backup", "payload"];
    if (Array.isArray(parsed)) {
      parsed.slice(0, 12).forEach((entry) => found.push(...extractStates(entry, depth + 1, seen)));
    } else {
      keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) found.push(...extractStates(parsed[key], depth + 1, seen));
      });
    }
    return found;
  }

  function isQuotaError(error) {
    return Boolean(error && (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    ));
  }

  function openDatabase(name = DB_NAME, version = DB_VERSION, storeName = STORE_NAME) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "id" });
        if (name === DB_NAME && !database.objectStoreNames.contains("storageMetadata")) {
          database.createObjectStore("storageMetadata", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`Falha ao abrir ${name}.`));
      request.onblocked = () => reject(new Error(`${name} bloqueado por outra aba.`));
    });
  }

  function readRecord(database, storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Falha ao ler IndexedDB."));
      transaction.onabort = () => reject(transaction.error || new Error("Leitura IndexedDB abortada."));
    });
  }

  function putRecord(database, storeName, record) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(record);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao gravar IndexedDB."));
      transaction.onabort = () => reject(transaction.error || new Error("Gravação IndexedDB abortada."));
    });
  }

  function getAllRecords(database, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error("Falha ao listar snapshots."));
    });
  }

  function getAllKeys(database, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAllKeys();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error("Falha ao listar chaves dos snapshots."));
    });
  }

  function deleteRecords(database, storeName, ids) {
    if (!ids.length) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      ids.forEach((id) => store.delete(id));
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao rotacionar snapshots."));
      transaction.onabort = () => reject(transaction.error || new Error("Rotação de snapshots abortada."));
    });
  }

  function snapshotKeyTimestamp(id) {
    const timestamp = Number(String(id || "").split("-", 1)[0]);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  async function readMainRecord() {
    const database = await openDatabase();
    try {
      return await readRecord(database, STORE_NAME, CURRENT_ID);
    } finally {
      database.close();
    }
  }

  async function writeMainState(state, reason = "write") {
    const serialized = JSON.stringify(state);
    const record = {
      id: CURRENT_ID,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      checksum: checksumForText(serialized),
      serializedSize: serialized.length,
      recoveryVersion: VERSION,
      recoveryReason: reason,
      data: cloneData(state)
    };
    const database = await openDatabase();
    try {
      await putRecord(database, STORE_NAME, record);
      const verified = await readRecord(database, STORE_NAME, CURRENT_ID);
      if (!verified?.data || verified.checksum !== record.checksum || checksumState(verified.data) !== record.checksum) {
        throw new Error("Falha na verificação pós-gravação do estado principal.");
      }
      return verified;
    } finally {
      database.close();
    }
  }

  async function saveSafetySnapshot(state, label = "snapshot", source = "runtime", knownChecksum = "") {
    if (!stateShapeValid(state)) return null;
    const checksum = knownChecksum || checksumState(state);
    const checksumSuffix = checksum.slice(-12);
    const database = await openDatabase(SAFETY_DB, 1, SAFETY_STORE);
    try {
      const existingKeys = await getAllKeys(database, SAFETY_STORE);
      if (existingKeys.some((id) => String(id).endsWith(checksumSuffix))) return null;
      const summary = counts(state);
      const stateScore = scoreCounts(summary);
      const record = {
        id: `${Date.now()}-${String(stateScore).padStart(12, "0")}-${label}-${checksumSuffix}`,
        version: VERSION,
        createdAt: new Date().toISOString(),
        label,
        source,
        checksum,
        counts: summary,
        score: stateScore,
        data: cloneData(state)
      };
      await putRecord(database, SAFETY_STORE, record);
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

  async function readSafetyCandidates(name, storeName) {
    try {
      const database = await openDatabase(name, 1, storeName);
      try {
        return (await getAllRecords(database, storeName))
          .filter((item) => stateShapeValid(item?.data))
          .map((item) => ({ source: `${name}:${item.id}`, state: item.data, score: Number(item.score) || score(item.data) }));
      } finally {
        database.close();
      }
    } catch {
      return [];
    }
  }

  function localCandidates() {
    const candidates = [];
    const keys = new Set(LOCAL_CANDIDATE_KEYS);
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        if (/^(aldus|metas)/i.test(key) && /(backup|snapshot|recover|restore|state|mesclagem)/i.test(key)) keys.add(key);
      }
    } catch {}
    for (const key of keys) {
      let raw = "";
      try { raw = localStorage.getItem(key) || ""; } catch { continue; }
      if (!raw) continue;
      for (const state of extractStates(raw)) {
        candidates.push({ source: `localStorage:${key}`, state, score: score(state) });
      }
    }
    return candidates;
  }

  function setGolden(state) {
    if (!stateShapeValid(state)) return;
    const summary = counts(state);
    const stateScore = scoreCounts(summary);
    if (!goldenCounts || stateScore >= goldenScore) {
      goldenCounts = summary;
      goldenScore = stateScore;
    }
  }

  function readPreviousStatus() {
    try {
      const parsed = safeParse(localStorage.getItem(STATUS_KEY) || "");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeStatus(status) {
    const payload = { version: VERSION, checkedAt: new Date().toISOString(), ...status };
    try { nativeSetItem.call(localStorage, STATUS_KEY, JSON.stringify(payload)); } catch {}
    globalThis.__ALDUS_CATASTROPHIC_STATE_STATUS_V275__ = Object.freeze(payload);
    return payload;
  }

  async function reconcilePrebootstrap() {
    const mainRecord = await readMainRecord().catch(() => null);
    const mainState = stateShapeValid(mainRecord?.data) ? mainRecord.data : null;
    const previousStatus = readPreviousStatus();

    if (mainState && previousStatus?.ready === true && previousStatus?.counts && typeof previousStatus.counts === "object") {
      const regression = catastrophicRegressionFromCounts(mainState, previousStatus.counts);
      if (!regression.catastrophic) {
        const summary = counts(mainState);
        setGolden(mainState);
        return writeStatus({
          ready: true,
          action: "preserved-fast",
          recovery: null,
          candidateCount: 1,
          chosenSource: "indexeddb",
          counts: summary,
          score: scoreCounts(summary),
          previousVersion: previousStatus.version || ""
        });
      }
    }

    const candidates = [
      ...(mainState ? [{ source: "indexeddb", state: mainState, score: score(mainState), recordChecksum: mainRecord?.checksum || "" }] : []),
      ...localCandidates(),
      ...(await readSafetyCandidates(LEGACY_SAFETY_DB, LEGACY_SAFETY_STORE)),
      ...(await readSafetyCandidates(SAFETY_DB, SAFETY_STORE))
    ];

    const unique = [];
    const checksums = new Set();
    for (const candidate of candidates) {
      const checksum = candidate.recordChecksum || checksumState(candidate.state);
      if (checksums.has(checksum)) continue;
      checksums.add(checksum);
      unique.push({ ...candidate, checksum });
    }

    if (!unique.length) {
      writeStatus({ ready: true, action: "no-state-found", candidateCount: 0, counts: {} });
      return { ready: true, action: "no-state-found" };
    }

    unique.sort((a, b) => b.score - a.score);
    const richest = unique[0];
    let chosen = mainState ? unique.find((item) => item.source === "indexeddb") || richest : richest;
    let recovery = null;

    if (!mainState) {
      chosen = richest;
      await writeMainState(chosen.state, "prebootstrap-no-main-state");
      recovery = { reason: "main-state-missing", source: chosen.source };
    } else {
      const catastrophicCandidates = unique
        .filter((item) => item.source !== "indexeddb")
        .map((item) => ({ item, regression: catastrophicRegression(mainState, item.state) }))
        .filter((entry) => entry.regression.catastrophic)
        .sort((a, b) => b.item.score - a.item.score);

      if (catastrophicCandidates.length) {
        const best = catastrophicCandidates[0];
        await saveSafetySnapshot(mainState, "estado-degradado-antes-recuperacao", "indexeddb", mainRecord?.checksum || "").catch(() => null);
        const recoveredRecord = await writeMainState(best.item.state, "prebootstrap-catastrophic-recovery");
        chosen = { ...best.item, checksum: recoveredRecord.checksum };
        recovery = {
          reason: "catastrophic-regression-detected",
          source: best.item.source,
          losses: best.regression.losses
        };
      }
    }

    setGolden(chosen.state);
    await saveSafetySnapshot(chosen.state, "estado-dourado-prebootstrap", chosen.source, chosen.checksum || "").catch(() => null);
    const summary = counts(chosen.state);
    const status = writeStatus({
      ready: true,
      action: recovery ? "recovered" : "preserved",
      recovery,
      candidateCount: unique.length,
      chosenSource: chosen.source,
      counts: summary,
      score: scoreCounts(summary)
    });
    return status;
  }

  function destructiveWriteAllowed() {
    return Date.now() < destructiveBypassUntil;
  }

  function allowDestructiveWrite(milliseconds = 15000) {
    destructiveBypassUntil = Date.now() + Math.max(1000, Number(milliseconds) || 15000);
    return destructiveBypassUntil;
  }

  function shouldBlockState(nextState) {
    if (destructiveWriteAllowed() || !goldenCounts || !stateShapeValid(nextState)) return { block: false, regression: null };
    const regression = catastrophicRegressionFromCounts(nextState, goldenCounts);
    return { block: regression.catastrophic, regression };
  }

  async function persistSerialized(serialized, reason = "quota") {
    if (!serialized) return false;
    const data = JSON.parse(serialized);
    const decision = shouldBlockState(data);
    if (decision.block) {
      writeStatus({
        ready: true,
        action: "write-blocked",
        reason,
        losses: decision.regression.losses,
        attemptedCounts: counts(data),
        goldenCounts
      });
      globalThis.dispatchEvent(new CustomEvent("aldus:catastrophic-write-blocked-v275", { detail: decision.regression }));
      console.error("[Aldus V275] Gravação bloqueada por regressão catastrófica.", decision.regression);
      return false;
    }

    const current = await readMainRecord().catch(() => null);
    if (stateShapeValid(current?.data)) {
      await saveSafetySnapshot(current.data, "antes-da-gravacao", reason, current.checksum || "").catch(() => null);
    }
    const record = await writeMainState(data, reason);
    setGolden(data);

    try {
      nativeRemoveItem.call(localStorage, MAIN_KEY);
      nativeSetItem.call(localStorage, META_KEY, JSON.stringify({
        version: VERSION,
        mode: "indexeddb-only",
        reason,
        savedAt: record.savedAt,
        checksum: record.checksum,
        serializedSize: record.serializedSize
      }));
    } catch {}
    globalThis.dispatchEvent(new CustomEvent("aldus:indexeddb-state-saved", { detail: { version: VERSION, reason } }));
    return true;
  }

  function schedulePersist(serialized, reason) {
    pendingSerialized = serialized;
    pendingReason = reason;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      if (persistInFlight || !pendingSerialized) return;
      const current = pendingSerialized;
      const currentReason = pendingReason || reason;
      pendingSerialized = "";
      pendingReason = "";
      persistInFlight = true;
      try {
        await persistSerialized(current, currentReason);
      } catch (error) {
        console.error("[Aldus V275] Falha ao persistir estado no IndexedDB.", error);
        writeStatus({ ready: true, action: "persist-error", reason: String(error?.message || error), counts: goldenCounts || {} });
      } finally {
        persistInFlight = false;
        if (pendingSerialized) schedulePersist(pendingSerialized, pendingReason || "queued");
      }
    }, 120);
  }

  Storage.prototype.setItem = function guardedSetItemV275(key, value) {
    if (this === localStorage && key === MAIN_KEY && typeof value === "string") {
      let parsed = null;
      try { parsed = JSON.parse(value); } catch {}
      if (parsed) {
        const decision = shouldBlockState(parsed);
        if (decision.block) {
          writeStatus({
            ready: true,
            action: "localstorage-write-blocked",
            losses: decision.regression.losses,
            attemptedCounts: counts(parsed),
            goldenCounts
          });
          globalThis.dispatchEvent(new CustomEvent("aldus:catastrophic-write-blocked-v275", { detail: decision.regression }));
          return undefined;
        }
      }
      if (value.length > SOFT_LIMIT) {
        schedulePersist(value, "oversized-localstorage-state");
        return undefined;
      }
      try {
        const result = nativeSetItem.call(this, key, value);
        if (parsed && stateShapeValid(parsed)) setGolden(parsed);
        return result;
      } catch (error) {
        if (!isQuotaError(error)) throw error;
        schedulePersist(value, "localstorage-quota-exceeded");
        return undefined;
      }
    }
    return nativeSetItem.call(this, key, value);
  };

  const readyPromise = reconcilePrebootstrap().catch((error) => {
    console.error("[Aldus V275] Falha na reconciliação preventiva.", error);
    return writeStatus({ ready: false, action: "prebootstrap-error", reason: String(error?.message || error), counts: goldenCounts || {} });
  });

  const api = Object.freeze({
    version: VERSION,
    counts,
    score,
    catastrophicRegression,
    readMainRecord,
    writeMainState,
    saveSafetySnapshot,
    persistSerialized,
    schedulePersist,
    allowDestructiveWrite,
    expectedKey: EXPECTED_KEY,
    safetyDatabase: SAFETY_DB,
    ready: readyPromise
  });

  Object.defineProperty(globalThis, "__ALDUS_CATASTROPHIC_STATE_GUARD_V275__", { value: api, configurable: false });
  Object.defineProperty(globalThis, "__ALDUS_STORAGE_QUOTA_GUARD_V256__", { value: api, configurable: true });
  globalThis.__ALDUS_CATASTROPHIC_GUARD_READY_V275__ = readyPromise;
})();
