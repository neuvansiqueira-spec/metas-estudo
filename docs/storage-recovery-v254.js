(() => {
  "use strict";

  const VERSION = "20260805-storage-recovery-v254";
  const STORAGE_KEY = "metasConcursoData";
  const SNAPSHOT_KEY = "aldusEmergencyLocalSnapshotV254";
  const BEFORE_RESTORE_KEY = "aldusBeforeStorageRecoveryV254";
  const REPORT_KEY = "aldusStorageRecoveryReportV254";
  const GLOBAL_KEY = "__ALDUS_STORAGE_RECOVERY_V254__";
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
    studies: 12,
    syllabusItems: 2,
    dailyGoals: 9,
    questionLogs: 9,
    materials: 3,
    questionBank: 3,
    questionBankSessions: 5,
    questionErrorNotebook: 5,
    simulados: 8,
    smartReviews: 5,
    factoryAgenda: 4,
    factoryItems: 4
  };

  if (globalThis[GLOBAL_KEY]) return;

  function parseJSON(raw, fallback = null) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function cloneData(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function counts(source = {}) {
    return Object.fromEntries(COLLECTION_KEYS.map((key) => [key, Array.isArray(source?.[key]) ? source[key].length : 0]));
  }

  function stateHasUserData(source = {}) {
    return Object.values(counts(source)).some((value) => value > 0);
  }

  function stateScore(source = {}) {
    const summary = counts(source);
    return COLLECTION_KEYS.reduce((total, key) => total + summary[key] * (WEIGHTS[key] || 1), 0);
  }

  function timestampOf(source = {}) {
    const candidates = [
      source?.updatedAt,
      source?.savedAt,
      source?.syncMeta?.updatedAt,
      source?.meta?.updatedAt,
      source?.planning?.updatedAt
    ];
    return Math.max(0, ...candidates.map((value) => Date.parse(value || "") || 0));
  }

  function actualGoalMinutes(goal = {}) {
    const study = Math.max(0, Number(goal.studyActualMinutes) || 0);
    const questions = Math.max(0, Number(goal.questionActualMinutes) || 0);
    if (study || questions) return study + questions;
    return Math.max(0, Number(goal.actualMinutes || goal.minutesDone || goal.performedMinutes) || 0);
  }

  function recordedMinutes(source = {}) {
    const studies = (Array.isArray(source.studies) ? source.studies : [])
      .reduce((total, item) => total + Math.max(0, Number(item.minutes) || Math.round((Number(item.seconds) || 0) / 60)), 0);
    const goals = (Array.isArray(source.dailyGoals) ? source.dailyGoals : [])
      .reduce((total, item) => total + actualGoalMinutes(item), 0);
    const questions = (Array.isArray(source.questionLogs) ? source.questionLogs : [])
      .reduce((total, item) => total + Math.max(0, Number(item.minutes) || 0), 0);
    return Math.round(studies + goals + questions);
  }

  function isArraySuperset(candidate = {}, current = {}) {
    const candidateCounts = counts(candidate);
    const currentCounts = counts(current);
    let grew = false;
    for (const key of COLLECTION_KEYS) {
      if (candidateCounts[key] < currentCounts[key]) return false;
      if (candidateCounts[key] > currentCounts[key]) grew = true;
    }
    return grew;
  }

  function noCriticalRegression(candidate = {}, current = {}) {
    const candidateCounts = counts(candidate);
    const currentCounts = counts(current);
    return ["subjects", "studies", "dailyGoals", "questionLogs", "simulados", "syllabusItems"]
      .every((key) => candidateCounts[key] >= currentCounts[key]);
  }

  function shouldRestore(candidate = {}, current = {}) {
    if (!stateHasUserData(candidate)) return { restore: false, reason: "snapshot-sem-dados" };
    if (!stateHasUserData(current)) return { restore: true, reason: "estado-atual-vazio" };
    if (isArraySuperset(candidate, current)) return { restore: true, reason: "snapshot-superconjunto" };

    const candidateScore = stateScore(candidate);
    const currentScore = stateScore(current);
    const candidateMinutes = recordedMinutes(candidate);
    const currentMinutes = recordedMinutes(current);
    const candidateTime = timestampOf(candidate);
    const currentTime = timestampOf(current);
    const safeCounts = noCriticalRegression(candidate, current);

    if (safeCounts && candidateScore >= currentScore && candidateMinutes > currentMinutes) {
      return { restore: true, reason: "snapshot-com-mais-tempo" };
    }
    if (safeCounts && candidateScore > currentScore && candidateTime > currentTime) {
      return { restore: true, reason: "snapshot-mais-completo-e-recente" };
    }
    return { restore: false, reason: "sem-superioridade-segura" };
  }

  function readSavedSnapshot() {
    const envelope = parseJSON(localStorage.getItem(SNAPSHOT_KEY) || "null");
    if (!envelope || typeof envelope !== "object") return null;
    const data = typeof envelope.raw === "string" ? parseJSON(envelope.raw) : envelope.data;
    return stateHasUserData(data) ? { ...envelope, data } : null;
  }

  function captureLocalSnapshot() {
    let raw = "";
    try {
      raw = localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return null;
    }
    const data = parseJSON(raw);
    if (!stateHasUserData(data)) return readSavedSnapshot();

    const next = {
      version: VERSION,
      capturedAt: new Date().toISOString(),
      score: stateScore(data),
      minutes: recordedMinutes(data),
      counts: counts(data),
      updatedAt: timestampOf(data),
      raw
    };
    const previous = readSavedSnapshot();
    const previousData = previous?.data;
    const preservePrevious = previousData
      && !isArraySuperset(data, previousData)
      && (stateScore(previousData) > next.score || recordedMinutes(previousData) > next.minutes);
    if (preservePrevious) return previous;

    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("[Aldus V254] Não foi possível gravar a cópia emergencial no localStorage.", error);
    }
    return { ...next, data };
  }

  const capturedSnapshot = captureLocalSnapshot();

  function runtimeState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    return parseJSON(localStorage.getItem(STORAGE_KEY) || "null");
  }

  function waitForBootstrap(timeoutMs = 25000) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        let ready = Boolean(globalThis.__aldusBootstrapReady);
        try {
          ready ||= typeof bootstrapStateReady !== "undefined" && bootstrapStateReady === true;
        } catch {}
        if (ready || Date.now() - startedAt >= timeoutMs) {
          resolve(ready);
          return;
        }
        window.setTimeout(check, 50);
      };
      check();
    });
  }

  async function readIndexedDBRecord() {
    try {
      if (typeof loadStateFromIndexedDB === "function") return await loadStateFromIndexedDB();
    } catch (error) {
      console.warn("[Aldus V254] Leitura do IndexedDB indisponível durante a recuperação.", error);
    }
    return null;
  }

  function persistReport(report) {
    try {
      localStorage.setItem(REPORT_KEY, JSON.stringify(report));
    } catch {}
  }

  async function restoreSnapshot(snapshot, current, idbRecord, reason) {
    const restored = cloneData(snapshot.data);
    const backup = {
      version: VERSION,
      createdAt: new Date().toISOString(),
      reason,
      runtime: current,
      indexedDB: idbRecord?.data || null
    };
    try {
      localStorage.setItem(BEFORE_RESTORE_KEY, JSON.stringify(backup));
    } catch (error) {
      console.warn("[Aldus V254] O estado anterior foi mantido em memória, mas não coube no localStorage.", error);
    }

    if (typeof replaceState === "function") replaceState(restored);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));

    try {
      if (typeof render === "function") render();
      if (typeof renderFloatingTimer === "function") renderFloatingTimer();
      if (typeof updateStorageDiagnostics === "function") updateStorageDiagnostics();
    } catch (error) {
      console.warn("[Aldus V254] Os dados foram restaurados; uma parte da interface será redesenhada no próximo acesso.", error);
    }

    try {
      if (typeof saveData === "function") saveData({ markLocalChange: true });
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    } catch (error) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      console.warn("[Aldus V254] A persistência principal foi refeita diretamente.", error);
    }

    try {
      if (typeof saveStateToIndexedDB === "function") {
        await saveStateToIndexedDB(restored, { detachedSnapshot: true });
      }
    } catch (error) {
      console.warn("[Aldus V254] Estado restaurado no navegador; a atualização do IndexedDB será repetida pelo aplicativo.", error);
    }

    const report = {
      version: VERSION,
      restored: true,
      reason,
      restoredAt: new Date().toISOString(),
      before: { score: stateScore(current), minutes: recordedMinutes(current), counts: counts(current) },
      after: { score: stateScore(restored), minutes: recordedMinutes(restored), counts: counts(restored) }
    };
    persistReport(report);
    window.dispatchEvent(new CustomEvent("aldus:storage-recovered-v254", { detail: report }));
    return report;
  }

  async function reconcile() {
    await waitForBootstrap();
    const snapshot = readSavedSnapshot() || capturedSnapshot;
    const current = cloneData(runtimeState() || {});
    const idbRecord = await readIndexedDBRecord();
    const decision = shouldRestore(snapshot?.data || {}, current);

    if (decision.restore) {
      return restoreSnapshot(snapshot, current, idbRecord, decision.reason);
    }

    const report = {
      version: VERSION,
      restored: false,
      reason: decision.reason,
      checkedAt: new Date().toISOString(),
      snapshot: snapshot ? { score: stateScore(snapshot.data), minutes: recordedMinutes(snapshot.data), counts: counts(snapshot.data) } : null,
      current: { score: stateScore(current), minutes: recordedMinutes(current), counts: counts(current) },
      indexedDB: idbRecord?.data ? { score: stateScore(idbRecord.data), minutes: recordedMinutes(idbRecord.data), counts: counts(idbRecord.data) } : null
    };
    persistReport(report);
    return report;
  }

  const api = Object.freeze({
    version: VERSION,
    snapshotKey: SNAPSHOT_KEY,
    reportKey: REPORT_KEY,
    counts,
    stateScore,
    recordedMinutes,
    shouldRestore,
    captureLocalSnapshot,
    reconcile
  });
  Object.defineProperty(globalThis, GLOBAL_KEY, {
    value: api,
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => reconcile().catch((error) => console.error("[Aldus V254] Falha na recuperação automática.", error)), { once: true });
  } else {
    reconcile().catch((error) => console.error("[Aldus V254] Falha na recuperação automática.", error));
  }
})();
