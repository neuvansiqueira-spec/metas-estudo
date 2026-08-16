(() => {
  "use strict";

  const VERSION = "20260816-storage-consistency-v345";
  const WRITER_KEY = "aldus:state-writer:v345";
  const TIMER_JOURNAL_KEY = "aldus:timer:commit-journal:v345";
  const LEASE_MS = 8000;
  const RENEW_MS = 2500;
  const INSTALL_RETRY_MS = 50;
  const TAB_ID = (() => {
    try { return crypto.randomUUID(); } catch {}
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  })();

  if (globalThis.AldusStorageConcurrencyV345) return;

  let primaryWriter = false;
  let lastWarningAt = 0;
  let runtimeWrapped = false;
  let recoveryInFlight = false;
  let originalSaveData = null;
  let originalAutoSyncAfterSave = null;
  let originalUploadSyncPayload = null;

  function parseJson(raw, fallback = null) {
    try {
      const parsed = JSON.parse(raw || "null");
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readWriter() {
    try {
      const value = parseJson(localStorage.getItem(WRITER_KEY), null);
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  function writeWriter(value) {
    try {
      localStorage.setItem(WRITER_KEY, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function writerAlive(writer = readWriter(), now = Date.now()) {
    return Boolean(writer?.tabId && Number(writer.expiresAt) > now);
  }

  function setWriterMode(isPrimary, reason = "lease") {
    primaryWriter = Boolean(isPrimary);
    if (document?.documentElement) {
      document.documentElement.dataset.aldusWriterMode = primaryWriter ? "primary" : "secondary";
      document.documentElement.dataset.aldusWriterReason = reason;
    }
    updatePassiveNotice();
    return primaryWriter;
  }

  function claimWriter(reason = "startup") {
    const now = Date.now();
    const current = readWriter();
    if (writerAlive(current, now) && current.tabId !== TAB_ID) {
      return setWriterMode(false, reason);
    }
    const next = {
      tabId: TAB_ID,
      claimedAt: current?.tabId === TAB_ID ? Number(current.claimedAt) || now : now,
      updatedAt: now,
      expiresAt: now + LEASE_MS,
      version: VERSION
    };
    if (!writeWriter(next)) return setWriterMode(true, "storage-unavailable");
    const acquired = readWriter()?.tabId === TAB_ID;
    return setWriterMode(acquired, reason);
  }

  function renewWriter() {
    const current = readWriter();
    if (current?.tabId !== TAB_ID) {
      if (!writerAlive(current)) claimWriter("lease-expired");
      else setWriterMode(false, "other-tab");
      return false;
    }
    current.updatedAt = Date.now();
    current.expiresAt = current.updatedAt + LEASE_MS;
    current.version = VERSION;
    if (!writeWriter(current)) return setWriterMode(true, "storage-unavailable");
    return setWriterMode(true, "renew");
  }

  function releaseWriter(reason = "pagehide") {
    const current = readWriter();
    if (current?.tabId !== TAB_ID) return false;
    try { localStorage.removeItem(WRITER_KEY); } catch { return false; }
    primaryWriter = false;
    try {
      globalThis.dispatchEvent(new CustomEvent("aldus:writer-released-v345", { detail: { tabId: TAB_ID, reason } }));
    } catch {}
    return true;
  }

  function ensurePassiveNotice() {
    if (typeof document === "undefined" || primaryWriter) return null;
    let notice = document.getElementById("aldusPassiveTabNoticeV345");
    if (notice) return notice;
    notice = document.createElement("div");
    notice.id = "aldusPassiveTabNoticeV345";
    notice.setAttribute("role", "status");
    notice.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:10000;max-width:360px;padding:10px 12px;border-radius:12px;background:#3b1d0b;color:#fff7ed;border:1px solid #fb923c;box-shadow:0 10px 30px rgba(0,0,0,.28);font:700 13px/1.35 system-ui,sans-serif";
    notice.textContent = "Outra aba do Aldus está controlando os salvamentos. Esta aba permanece em modo de leitura até a outra ser fechada.";
    document.body?.appendChild(notice);
    return notice;
  }

  function updatePassiveNotice() {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("aldusPassiveTabNoticeV345");
    if (primaryWriter) {
      existing?.remove();
      return;
    }
    ensurePassiveNotice();
  }

  function warnSecondary(message = "Outra aba do Aldus está controlando os salvamentos. Use a aba principal.") {
    const now = Date.now();
    if (now - lastWarningAt < 5000) return;
    lastWarningAt = now;
    try {
      if (typeof showDailyGoalMessage === "function") showDailyGoalMessage(message, "warning");
      else console.warn("[Aldus V345]", message);
    } catch {}
    updatePassiveNotice();
  }

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function writeJournal(payload) {
    try {
      localStorage.setItem(TIMER_JOURNAL_KEY, JSON.stringify({ version: VERSION, ...payload }));
      return true;
    } catch (error) {
      console.error("[Aldus V345] Falha ao gravar o diário durável do cronômetro.", error);
      return false;
    }
  }

  function readJournal() {
    try {
      const parsed = parseJson(localStorage.getItem(TIMER_JOURNAL_KEY), null);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function clearJournal(sessionId = "") {
    try {
      const current = readJournal();
      if (sessionId && current?.sessionId && String(current.sessionId) !== String(sessionId)) return false;
      localStorage.removeItem(TIMER_JOURNAL_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function currentState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    return globalThis.state && typeof globalThis.state === "object" ? globalThis.state : null;
  }

  function findStudy(sessionId, targetState = currentState()) {
    try {
      return (targetState?.studies || []).find((study) =>
        String(study?.timerSessionId || study?.sessionId || "") === String(sessionId || "")
      ) || null;
    } catch {
      return null;
    }
  }

  function findGoal(goalId, targetState = currentState()) {
    try {
      return (targetState?.dailyGoals || []).find((goal) => String(goal?.id || "") === String(goalId || "")) || null;
    } catch {
      return null;
    }
  }

  function timerGoalFields(goal = {}) {
    return {
      id: goal.id || "",
      actualMinutes: Math.max(0, Number(goal.actualMinutes) || 0),
      tempo_real_minutos: Math.max(0, Number(goal.tempo_real_minutos) || 0),
      studyActualMinutes: Math.max(0, Number(goal.studyActualMinutes) || 0),
      questionActualMinutes: Math.max(0, Number(goal.questionActualMinutes) || 0),
      studyStatus: goal.studyStatus || "",
      status: goal.status || ""
    };
  }

  function mergeGoalNonRegression(goal, saved = {}) {
    if (!goal || !saved) return false;
    const before = JSON.stringify(timerGoalFields(goal));
    goal.studyActualMinutes = Math.max(Number(goal.studyActualMinutes) || 0, Number(saved.studyActualMinutes) || 0);
    goal.questionActualMinutes = Math.max(Number(goal.questionActualMinutes) || 0, Number(saved.questionActualMinutes) || 0);
    const split = goal.studyActualMinutes + goal.questionActualMinutes;
    goal.actualMinutes = Math.max(Number(goal.actualMinutes) || 0, Number(saved.actualMinutes) || 0, split);
    goal.tempo_real_minutos = Math.max(Number(goal.tempo_real_minutos) || 0, Number(saved.tempo_real_minutos) || 0, goal.actualMinutes);
    if (!goal.studyStatus && saved.studyStatus) goal.studyStatus = saved.studyStatus;
    if (!goal.status && saved.status) goal.status = saved.status;
    return before !== JSON.stringify(timerGoalFields(goal));
  }

  async function writeAndVerifyCurrentState(sessionId = "") {
    if (!primaryWriter) return { durable: false, reason: "secondary-tab" };
    const liveState = currentState();
    if (!liveState) return { durable: false, reason: "state-unavailable" };
    if (typeof saveStateToIndexedDB !== "function" || typeof loadStateFromIndexedDB !== "function") {
      return { durable: false, reason: "indexeddb-api-unavailable" };
    }
    const snapshot = clone(liveState);
    const record = await saveStateToIndexedDB(snapshot, { detachedSnapshot: true });
    const reloaded = await loadStateFromIndexedDB();
    if (!reloaded?.data) throw new Error("IndexedDB não retornou estado após a gravação V345.");
    if (sessionId && !findStudy(sessionId, reloaded.data)) {
      throw new Error("A sessão do cronômetro não apareceu na verificação do IndexedDB.");
    }
    return { durable: true, reason: "indexeddb-verified", savedAt: record?.savedAt || "", record };
  }

  async function commitTimerState({ sessionId, goalId = "", minutes = 0 } = {}) {
    if (!sessionId) return { durable: false, reason: "session-missing" };
    if (!primaryWriter) {
      warnSecondary();
      return { durable: false, reason: "secondary-tab" };
    }
    const study = findStudy(sessionId);
    const goal = findGoal(goalId || study?.goalId || "");
    const journalWritten = writeJournal({
      phase: "state-applied",
      sessionId: String(sessionId),
      goalId: String(goal?.id || goalId || ""),
      minutes: Math.max(0, Number(minutes) || Number(study?.minutes) || 0),
      study: study ? clone(study) : null,
      goal: goal ? timerGoalFields(goal) : null,
      committedAt: new Date().toISOString()
    });
    if (!journalWritten) return { durable: false, reason: "journal-write-failed" };
    try {
      const result = await writeAndVerifyCurrentState(sessionId);
      if (result.durable) clearJournal(sessionId);
      return result;
    } catch (error) {
      console.error("[Aldus V345] IndexedDB não confirmou o cronômetro; o diário local foi preservado.", error);
      return { durable: true, protectedByJournal: true, reason: "journal-fallback", error: String(error?.message || error) };
    }
  }

  async function recoverTimerJournal() {
    if (recoveryInFlight || !primaryWriter) return false;
    const journal = readJournal();
    if (!journal?.sessionId || journal.phase !== "state-applied" || !journal.study) return false;
    const liveState = currentState();
    if (!liveState || !Array.isArray(liveState.studies) || !Array.isArray(liveState.dailyGoals)) return false;
    recoveryInFlight = true;
    try {
      let changed = false;
      let study = findStudy(journal.sessionId, liveState);
      if (!study) {
        liveState.studies.push(clone(journal.study));
        study = findStudy(journal.sessionId, liveState);
        changed = true;
      }
      const goal = findGoal(journal.goalId || study?.goalId || "", liveState);
      if (goal && journal.goal) changed = mergeGoalNonRegression(goal, journal.goal) || changed;
      const result = await writeAndVerifyCurrentState(journal.sessionId);
      if (result.durable) {
        clearJournal(journal.sessionId);
        if (changed) {
          try { if (typeof render === "function") render(); } catch {}
        }
        try {
          if (typeof showDailyGoalMessage === "function") {
            showDailyGoalMessage(`Tempo do cronômetro recuperado e confirmado: ${Math.max(0, Number(journal.minutes) || 0)} min.`, "success");
          }
        } catch {}
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Aldus V345] A recuperação do diário do cronômetro será mantida para nova tentativa.", error);
      return false;
    } finally {
      recoveryInFlight = false;
    }
  }

  function installRuntimeGuards() {
    if (runtimeWrapped) return true;
    if (typeof saveData !== "function" || typeof autoSyncAfterSave !== "function") return false;

    originalSaveData = saveData;
    saveData = function saveDataSingleWriterV345(options = {}) {
      if (!primaryWriter) {
        warnSecondary();
        return false;
      }
      return originalSaveData(options);
    };

    originalAutoSyncAfterSave = autoSyncAfterSave;
    autoSyncAfterSave = function autoSyncAfterSaveSingleWriterV345(reason = "alteração") {
      if (!primaryWriter) {
        warnSecondary();
        return Promise.resolve(false);
      }
      return originalAutoSyncAfterSave(reason);
    };

    if (typeof uploadSyncPayload === "function") {
      originalUploadSyncPayload = uploadSyncPayload;
      uploadSyncPayload = function uploadSyncPayloadSingleWriterV345(...args) {
        if (!primaryWriter) {
          warnSecondary();
          return Promise.reject(new Error("Outra aba controla os salvamentos."));
        }
        return originalUploadSyncPayload(...args);
      };
    }

    runtimeWrapped = true;
    queueMicrotask(() => recoverTimerJournal());
    return true;
  }

  function captureTimerSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "timerStudyForm") return;
    if (!primaryWriter) {
      event.preventDefault();
      event.stopImmediatePropagation();
      warnSecondary("O estudo não foi salvo nesta aba porque outra aba do Aldus controla os dados.");
      return;
    }
    let draft = null;
    try {
      draft = typeof pendingTimerStudyDraft !== "undefined" && pendingTimerStudyDraft
        ? {
            sessionId: String(pendingTimerStudyDraft.sessionId || ""),
            goalId: String(pendingTimerStudyDraft.goal?.id || pendingTimerStudyDraft.goalId || ""),
            minutes: Math.max(0, Number(pendingTimerStudyDraft.minutes) || 0),
            seconds: Math.max(0, Number(pendingTimerStudyDraft.seconds) || 0),
            capturedAt: new Date().toISOString()
          }
        : null;
    } catch {}
    if (!draft?.sessionId) return;
    const ok = writeJournal({ phase: "submit-captured", ...draft });
    if (!ok) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        if (typeof showDailyGoalMessage === "function") {
          showDailyGoalMessage("Não foi possível criar a cópia de segurança do cronômetro. O estudo não foi fechado.", "error");
        }
      } catch {}
    }
  }

  function onStorage(event) {
    if (event.key !== WRITER_KEY) return;
    const current = readWriter();
    if (current?.tabId === TAB_ID) setWriterMode(true, "storage-self");
    else if (writerAlive(current)) setWriterMode(false, "storage-other");
    else claimWriter("storage-expired");
  }

  claimWriter("startup");
  document?.addEventListener?.("submit", captureTimerSubmit, true);
  addEventListener("storage", onStorage);
  addEventListener("focus", () => claimWriter("focus"), { passive: true });
  addEventListener("pagehide", () => releaseWriter("pagehide"), { passive: true });
  document?.addEventListener?.("visibilitychange", () => {
    if (!document.hidden) claimWriter("visible");
  }, { passive: true });

  const renewTimer = setInterval(renewWriter, RENEW_MS);
  const installTimer = setInterval(() => {
    if (installRuntimeGuards()) clearInterval(installTimer);
  }, INSTALL_RETRY_MS);

  globalThis.AldusStorageConcurrencyV345 = Object.freeze({
    version: VERSION,
    tabId: TAB_ID,
    isPrimaryWriter: () => primaryWriter,
    claimWriter,
    releaseWriter,
    readWriter,
    readJournal,
    clearJournal,
    commitTimerState,
    recoverTimerJournal,
    installRuntimeGuards,
    renewTimer
  });
})();
