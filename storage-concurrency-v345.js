(() => {
  "use strict";

  const VERSION = "20260816-multitab-timer-simulado-v346";
  const WRITER_KEY = "aldus:state-writer:v345";
  const TIMER_JOURNAL_KEY = "aldus:timer:commit-journal:v345";
  const REQUEST_PREFIX = "aldus:module-request:v346:";
  const ACK_PREFIX = "aldus:module-ack:v346:";
  const LEASE_MS = 8000;
  const RENEW_MS = 2500;
  const INSTALL_RETRY_MS = 50;
  const REQUEST_TIMEOUT_MS = 12000;
  const TAB_ID = (() => {
    try { return crypto.randomUUID(); } catch {}
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  })();

  if (globalThis.AldusStorageConcurrencyV345?.version === VERSION) return;

  let primaryWriter = false;
  let writerReady = true;
  let everSecondary = false;
  let handoffInFlight = false;
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

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function currentState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    return globalThis.state && typeof globalThis.state === "object" ? globalThis.state : null;
  }

  function signalDailySummaryRefresh(commitType) {
    if (typeof document === "undefined" || typeof document.dispatchEvent !== "function" || typeof CustomEvent !== "function") return false;
    try {
      document.dispatchEvent(new CustomEvent("aldus:view-active", {
        detail: { source: "storage-concurrency-v346", commitType: String(commitType || "module") }
      }));
      return true;
    } catch (error) {
      console.warn("[Aldus V347] Não foi possível solicitar a atualização do resumo diário após commit entre abas.", error);
      return false;
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

  function ensurePassiveNotice() {
    if (typeof document === "undefined" || primaryWriter) return null;
    let notice = document.getElementById("aldusPassiveTabNoticeV345");
    if (notice) return notice;
    notice = document.createElement("div");
    notice.id = "aldusPassiveTabNoticeV345";
    notice.setAttribute("role", "status");
    notice.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:10000;max-width:380px;padding:10px 12px;border-radius:12px;background:#0f2f3a;color:#f0fdfa;border:1px solid #2dd4bf;box-shadow:0 10px 30px rgba(0,0,0,.28);font:700 13px/1.35 system-ui,sans-serif";
    notice.textContent = "Outra aba protege os salvamentos gerais. Cronômetro e simulado continuam funcionando normalmente nesta aba.";
    document.body?.appendChild(notice);
    return notice;
  }

  function updatePassiveNotice() {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("aldusPassiveTabNoticeV345");
    if (primaryWriter) existing?.remove();
    else ensurePassiveNotice();
  }

  function setWriterMode(isPrimary, reason = "lease") {
    primaryWriter = Boolean(isPrimary);
    if (!primaryWriter) {
      everSecondary = true;
      writerReady = false;
    }
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.aldusWriterMode = primaryWriter ? "primary" : "secondary";
      document.documentElement.dataset.aldusWriterReason = reason;
    }
    updatePassiveNotice();
    return primaryWriter;
  }

  function warnSecondary(message = "Outra aba do Aldus está protegendo os salvamentos gerais. Cronômetro e simulado continuam disponíveis.") {
    const now = Date.now();
    if (now - lastWarningAt < 5000) return;
    lastWarningAt = now;
    try {
      if (typeof showDailyGoalMessage === "function") showDailyGoalMessage(message, "warning");
      else console.warn("[Aldus V346]", message);
    } catch {}
    updatePassiveNotice();
  }

  function replaceStateInPlace(target, source) {
    if (!target || !source || typeof target !== "object" || typeof source !== "object") return false;
    Object.keys(target).forEach((key) => delete target[key]);
    Object.assign(target, clone(source));
    return true;
  }

  async function prepareWriterHandoff(reason = "handoff") {
    if (!primaryWriter || handoffInFlight) return false;
    if (!everSecondary) {
      writerReady = true;
      return true;
    }
    if (typeof loadStateFromIndexedDB !== "function") return false;
    const live = currentState();
    if (!live) return false;
    handoffInFlight = true;
    writerReady = false;
    try {
      const record = await loadStateFromIndexedDB();
      if (record?.data && typeof record.data === "object") {
        replaceStateInPlace(live, record.data);
        try { if (typeof render === "function") render(); } catch {}
      }
      writerReady = true;
      queueMicrotask(() => {
        processPendingRequests().catch((error) => console.error("[Aldus V346] Falha ao processar fila após troca de aba.", error));
        recoverTimerJournal().catch(() => false);
      });
      return true;
    } catch (error) {
      console.error(`[Aldus V346] Não foi possível sincronizar a nova aba gravadora (${reason}).`, error);
      return false;
    } finally {
      handoffInFlight = false;
    }
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
    if (!writeWriter(next)) {
      writerReady = true;
      return setWriterMode(true, "storage-unavailable");
    }
    const acquired = readWriter()?.tabId === TAB_ID;
    setWriterMode(acquired, reason);
    if (acquired) {
      if (everSecondary) prepareWriterHandoff(reason).catch(() => false);
      else writerReady = true;
    }
    return acquired;
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
    if (!writeWriter(current)) {
      writerReady = true;
      return setWriterMode(true, "storage-unavailable");
    }
    setWriterMode(true, "renew");
    return true;
  }

  function releaseWriter(reason = "pagehide") {
    const current = readWriter();
    if (current?.tabId !== TAB_ID) return false;
    try { localStorage.removeItem(WRITER_KEY); } catch { return false; }
    primaryWriter = false;
    writerReady = false;
    try {
      globalThis.dispatchEvent(new CustomEvent("aldus:writer-released-v345", { detail: { tabId: TAB_ID, reason } }));
    } catch {}
    return true;
  }

  function writeJournal(payload) {
    try {
      localStorage.setItem(TIMER_JOURNAL_KEY, JSON.stringify({ version: VERSION, ...payload }));
      return true;
    } catch (error) {
      console.error("[Aldus V346] Falha ao gravar o diário durável do cronômetro.", error);
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
      status: goal.status || "",
      history: Array.isArray(goal.history) ? clone(goal.history) : []
    };
  }

  function mergeGoalHistory(goal, saved = {}) {
    if (!Array.isArray(saved.history) || !saved.history.length) return;
    goal.history ||= [];
    const seen = new Set(goal.history.map((entry) => JSON.stringify(entry)));
    saved.history.forEach((entry) => {
      const key = JSON.stringify(entry);
      if (!seen.has(key)) {
        goal.history.push(clone(entry));
        seen.add(key);
      }
    });
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
    mergeGoalHistory(goal, saved);
    return before !== JSON.stringify(timerGoalFields(goal));
  }

  function applyTimerPayload(targetState, payload = {}) {
    if (!targetState || !payload?.sessionId || !payload?.study) return { changed: false, studyAdded: false };
    targetState.studies ||= [];
    targetState.dailyGoals ||= [];
    const sessionId = String(payload.sessionId);
    let study = findStudy(sessionId, targetState);
    const studyAdded = !study;
    if (!study) {
      study = clone(payload.study);
      targetState.studies.push(study);
    }
    const goalId = payload.goalId || study?.goalId || "";
    const goal = findGoal(goalId, targetState);
    if (goal) {
      if (studyAdded && study?.updatesGoal !== false) {
        const minutes = Math.max(0, Number(payload.minutes) || Number(study?.minutes) || 0);
        const field = study?.timerKind === "questions" ? "questionActualMinutes" : "studyActualMinutes";
        goal.studyActualMinutes = Math.max(0, Number(goal.studyActualMinutes) || 0);
        goal.questionActualMinutes = Math.max(0, Number(goal.questionActualMinutes) || 0);
        goal[field] += minutes;
        goal.actualMinutes = goal.studyActualMinutes + goal.questionActualMinutes;
        goal.tempo_real_minutos = Math.max(Number(goal.tempo_real_minutos) || 0, goal.actualMinutes);
        if (goal.actualMinutes > 0) {
          goal.studyStatus ||= "Iniciado";
          if (!goal.status || goal.status === "Pendente") goal.status = "Em andamento";
        }
        mergeGoalHistory(goal, payload.goal || {});
      } else {
        mergeGoalNonRegression(goal, payload.goal || {});
      }
    }
    const result = { changed: studyAdded || Boolean(goal), studyAdded, study, goal };
    if (result.changed) signalDailySummaryRefresh("timer");
    return result;
  }

  function ensureArray(targetState, key) {
    if (!Array.isArray(targetState[key])) targetState[key] = [];
    return targetState[key];
  }

  function addUniqueById(target, incoming = []) {
    const ids = new Set(target.map((item) => String(item?.id || "")));
    let added = 0;
    for (const item of incoming || []) {
      const id = String(item?.id || "");
      if (!id || ids.has(id)) continue;
      target.push(clone(item));
      ids.add(id);
      added += 1;
    }
    return added;
  }

  function simulationSessionExists(targetState, sessionId) {
    return ensureArray(targetState, "questionBankSessions").some((session) => String(session?.id || "") === String(sessionId || ""));
  }

  function applySimulationPayload(targetState, payload = {}) {
    if (!targetState || !payload?.sessionId) return { changed: false, alreadyIntegrated: false, repairedQuestions: 0, notebookEntries: [] };
    const alreadyIntegrated = simulationSessionExists(targetState, payload.sessionId);
    const repairedQuestions = addUniqueById(ensureArray(targetState, "questionBank"), payload.bankQuestions || []);
    let sessionsAdded = 0;
    let logsAdded = 0;
    let mockAdded = 0;
    let notebookEntries = [];

    if (!alreadyIntegrated) {
      sessionsAdded = addUniqueById(ensureArray(targetState, "questionBankSessions"), payload.session ? [payload.session] : []);
      logsAdded = addUniqueById(ensureArray(targetState, "questionLogs"), payload.questionLogs || []);
      mockAdded = addUniqueById(ensureArray(targetState, "simulados"), payload.mock ? [payload.mock] : []);

      if (typeof registrarNoCadernoErros === "function") {
        for (const entry of payload.notebook || []) {
          try { registrarNoCadernoErros(entry.question, entry.mark, entry.reason); } catch (error) { console.warn("[Aldus V346] Falha ao registrar item do caderno.", error); }
        }
        const ids = new Set((payload.notebook || []).map((entry) => String(entry?.question?.id || "")).filter(Boolean));
        notebookEntries = ensureArray(targetState, "questionErrorNotebook").filter((entry) => ids.has(String(entry?.id || ""))).map(clone);
      }
    }

    const result = {
      changed: repairedQuestions > 0 || sessionsAdded > 0 || logsAdded > 0 || mockAdded > 0 || notebookEntries.length > 0,
      alreadyIntegrated,
      repairedQuestions,
      sessionsAdded,
      logsAdded,
      mockAdded,
      notebookEntries
    };
    if (result.changed) signalDailySummaryRefresh("simulation");
    return result;
  }

  async function writeAndVerifyCurrentState(sessionId = "", simulationSessionId = "") {
    if (!primaryWriter || !writerReady) return { durable: false, reason: primaryWriter ? "writer-syncing" : "secondary-tab" };
    const liveState = currentState();
    if (!liveState) return { durable: false, reason: "state-unavailable" };
    if (typeof saveStateToIndexedDB !== "function" || typeof loadStateFromIndexedDB !== "function") {
      return { durable: false, reason: "indexeddb-api-unavailable" };
    }
    const snapshot = clone(liveState);
    const record = await saveStateToIndexedDB(snapshot, { detachedSnapshot: true });
    const reloaded = await loadStateFromIndexedDB();
    if (!reloaded?.data) throw new Error("IndexedDB não retornou estado após a gravação protegida.");
    if (sessionId && !findStudy(sessionId, reloaded.data)) {
      throw new Error("A sessão do cronômetro não apareceu na verificação do IndexedDB.");
    }
    if (simulationSessionId && !simulationSessionExists(reloaded.data, simulationSessionId)) {
      throw new Error("O resultado do simulado não apareceu na verificação do IndexedDB.");
    }
    return { durable: true, reason: "indexeddb-verified", savedAt: record?.savedAt || "", record };
  }

  function persistPrimaryState() {
    if (!primaryWriter || !writerReady) return false;
    if (typeof originalSaveData === "function") {
      try { originalSaveData({ markLocalChange: true }); } catch (error) { console.warn("[Aldus V346] Salvamento padrão falhou antes da confirmação durável.", error); }
    }
    return true;
  }

  async function commitTimerOnPrimary(payload) {
    if (!primaryWriter || !writerReady) return { durable: false, reason: "writer-not-ready" };
    applyTimerPayload(currentState(), payload);
    persistPrimaryState();
    const durable = await writeAndVerifyCurrentState(payload.sessionId);
    if (durable.durable) clearJournal(payload.sessionId);
    return durable;
  }

  async function commitSimulationOnPrimary(payload) {
    if (!primaryWriter || !writerReady) return { durable: false, reason: "writer-not-ready" };
    const live = currentState();
    if (!live) return { durable: false, reason: "state-unavailable" };
    const applied = applySimulationPayload(live, payload);
    if (!applied.changed && applied.alreadyIntegrated) {
      return { durable: true, reason: "already-integrated", ...applied };
    }
    persistPrimaryState();
    const durable = await writeAndVerifyCurrentState("", payload.sessionId);
    return { ...durable, ...applied };
  }

  function requestKey(requestId) { return `${REQUEST_PREFIX}${requestId}`; }
  function ackKey(requestId) { return `${ACK_PREFIX}${requestId}`; }

  function makeRequestId() {
    try { return crypto.randomUUID(); } catch {}
    return `${TAB_ID}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function postBroadcast(message) {
    try {
      if (typeof BroadcastChannel === "function") {
        const channel = new BroadcastChannel("aldus-module-commits-v346");
        channel.postMessage(message);
        channel.close();
      }
    } catch {}
  }

  function writeRequest(type, payload) {
    const id = makeRequestId();
    const request = { id, type, payload, requesterTabId: TAB_ID, createdAt: Date.now(), version: VERSION };
    try {
      localStorage.setItem(requestKey(id), JSON.stringify(request));
      postBroadcast({ type: "request", key: requestKey(id) });
      return request;
    } catch (error) {
      console.error("[Aldus V346] Não foi possível criar a fila protegida entre abas.", error);
      return null;
    }
  }

  function readAck(id) {
    try { return parseJson(localStorage.getItem(ackKey(id)), null); } catch { return null; }
  }

  function cleanupRequest(id) {
    try { localStorage.removeItem(requestKey(id)); } catch {}
    try { localStorage.removeItem(ackKey(id)); } catch {}
  }

  async function waitForAck(request) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
      const ack = readAck(request.id);
      if (ack) {
        cleanupRequest(request.id);
        if (ack.ok) return ack.result || { durable: true, reason: "writer-ack" };
        return { durable: false, reason: ack.reason || "writer-error", error: ack.error || "" };
      }
      const current = readWriter();
      if (!writerAlive(current)) {
        claimWriter("module-request-recovery");
        if (primaryWriter && writerReady) await processRequest(request);
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return { durable: false, reason: "writer-timeout" };
  }

  async function processRequest(request) {
    if (!request?.id || !primaryWriter || !writerReady) return false;
    let result;
    try {
      if (request.type === "timer") result = await commitTimerOnPrimary(request.payload || {});
      else if (request.type === "simulation") result = await commitSimulationOnPrimary(request.payload || {});
      else throw new Error(`Tipo de gravação não suportado: ${request.type}`);
      localStorage.setItem(ackKey(request.id), JSON.stringify({ ok: Boolean(result?.durable), result, reason: result?.reason || "", completedAt: Date.now(), writerTabId: TAB_ID }));
    } catch (error) {
      try {
        localStorage.setItem(ackKey(request.id), JSON.stringify({ ok: false, reason: "writer-error", error: String(error?.message || error), completedAt: Date.now(), writerTabId: TAB_ID }));
      } catch {}
    }
    return true;
  }

  async function processRequestKey(key) {
    if (!primaryWriter || !writerReady || !String(key || "").startsWith(REQUEST_PREFIX)) return false;
    let request = null;
    try { request = parseJson(localStorage.getItem(key), null); } catch {}
    if (!request) return false;
    return processRequest(request);
  }

  async function processPendingRequests() {
    if (!primaryWriter || !writerReady || typeof localStorage === "undefined") return false;
    const keys = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(REQUEST_PREFIX)) keys.push(key);
      }
    } catch { return false; }
    for (const key of keys) await processRequestKey(key);
    return true;
  }

  async function requestModuleCommit(type, payload) {
    if (primaryWriter && writerReady) {
      if (type === "timer") return commitTimerOnPrimary(payload);
      if (type === "simulation") return commitSimulationOnPrimary(payload);
    }
    const request = writeRequest(type, payload);
    if (!request) return { durable: false, reason: "request-write-failed" };
    return waitForAck(request);
  }

  async function commitTimerState({ sessionId, goalId = "", minutes = 0 } = {}) {
    if (!sessionId) return { durable: false, reason: "session-missing" };
    const study = findStudy(sessionId);
    const goal = findGoal(goalId || study?.goalId || "");
    const payload = {
      sessionId: String(sessionId),
      goalId: String(goal?.id || goalId || ""),
      minutes: Math.max(0, Number(minutes) || Number(study?.minutes) || 0),
      study: study ? clone(study) : null,
      goal: goal ? timerGoalFields(goal) : null,
      committedAt: new Date().toISOString()
    };
    if (!payload.study) return { durable: false, reason: "study-missing" };
    if (!writeJournal({ phase: "state-applied", ...payload })) return { durable: false, reason: "journal-write-failed" };
    try {
      const result = await requestModuleCommit("timer", payload);
      if (result?.durable) clearJournal(sessionId);
      return result;
    } catch (error) {
      console.error("[Aldus V346] O cronômetro ficou protegido no diário local para nova tentativa.", error);
      return { durable: true, protectedByJournal: true, reason: "journal-fallback", error: String(error?.message || error) };
    }
  }

  async function commitSimulationState(payload = {}) {
    if (!payload?.sessionId) return { durable: false, reason: "simulation-session-missing" };
    const compactPayload = {
      sessionId: String(payload.sessionId),
      bankQuestions: clone(payload.bankQuestions || []),
      session: payload.session ? clone(payload.session) : null,
      questionLogs: clone(payload.questionLogs || []),
      mock: payload.mock ? clone(payload.mock) : null,
      notebook: clone(payload.notebook || [])
    };
    return requestModuleCommit("simulation", compactPayload);
  }

  async function recoverTimerJournal() {
    if (recoveryInFlight || !primaryWriter || !writerReady) return false;
    const journal = readJournal();
    if (!journal?.sessionId || journal.phase !== "state-applied" || !journal.study) return false;
    recoveryInFlight = true;
    try {
      const result = await commitTimerOnPrimary(journal);
      return Boolean(result?.durable);
    } catch (error) {
      console.error("[Aldus V346] O diário do cronômetro será mantido para nova tentativa.", error);
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
      if (!primaryWriter || !writerReady) {
        warnSecondary(primaryWriter
          ? "A nova aba gravadora está sincronizando os dados antes de salvar."
          : "Outra aba protege os salvamentos gerais. Cronômetro e simulado continuam funcionando nesta aba.");
        return false;
      }
      return originalSaveData(options);
    };

    originalAutoSyncAfterSave = autoSyncAfterSave;
    autoSyncAfterSave = function autoSyncAfterSaveSingleWriterV345(reason = "alteração") {
      if (!primaryWriter || !writerReady) return Promise.resolve(false);
      return originalAutoSyncAfterSave(reason);
    };

    if (typeof uploadSyncPayload === "function") {
      originalUploadSyncPayload = uploadSyncPayload;
      uploadSyncPayload = function uploadSyncPayloadSingleWriterV345(...args) {
        if (!primaryWriter || !writerReady) return Promise.reject(new Error("Outra aba controla os salvamentos gerais."));
        return originalUploadSyncPayload(...args);
      };
    }

    runtimeWrapped = true;
    if (primaryWriter && everSecondary) prepareWriterHandoff("runtime-ready").catch(() => false);
    else writerReady = primaryWriter;
    queueMicrotask(() => {
      processPendingRequests().catch(() => false);
      recoverTimerJournal().catch(() => false);
    });
    return true;
  }

  function captureTimerSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "timerStudyForm") return;
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
    if (event.key === WRITER_KEY) {
      const current = readWriter();
      if (current?.tabId === TAB_ID) setWriterMode(true, "storage-self");
      else if (writerAlive(current)) setWriterMode(false, "storage-other");
      else claimWriter("storage-expired");
      return;
    }
    if (event.key?.startsWith(REQUEST_PREFIX) && event.newValue && primaryWriter && writerReady) {
      processRequestKey(event.key).catch((error) => console.error("[Aldus V346] Falha na solicitação entre abas.", error));
    }
  }

  let broadcast = null;
  try {
    if (typeof BroadcastChannel === "function") {
      broadcast = new BroadcastChannel("aldus-module-commits-v346");
      broadcast.addEventListener("message", (event) => {
        if (event.data?.type === "request" && event.data?.key && primaryWriter && writerReady) {
          processRequestKey(event.data.key).catch(() => false);
        }
      });
    }
  } catch {}

  claimWriter("startup");
  document?.addEventListener?.("submit", captureTimerSubmit, true);
  addEventListener("storage", onStorage);
  addEventListener("focus", () => claimWriter("focus"), { passive: true });
  addEventListener("pagehide", () => {
    try { broadcast?.close(); } catch {}
    releaseWriter("pagehide");
  }, { passive: true });
  document?.addEventListener?.("visibilitychange", () => {
    if (!document.hidden) claimWriter("visible");
  }, { passive: true });

  const renewTimer = setInterval(renewWriter, RENEW_MS);
  const installTimer = setInterval(() => {
    if (installRuntimeGuards()) clearInterval(installTimer);
  }, INSTALL_RETRY_MS);

  const api = Object.freeze({
    version: VERSION,
    tabId: TAB_ID,
    isPrimaryWriter: () => primaryWriter && writerReady,
    claimWriter,
    releaseWriter,
    readWriter,
    readJournal,
    clearJournal,
    commitTimerState,
    commitSimulationState,
    recoverTimerJournal,
    installRuntimeGuards,
    processPendingRequests,
    mergeGoalNonRegression,
    applyTimerPayload,
    applySimulationPayload,
    renewTimer
  });

  globalThis.AldusStorageConcurrencyV345 = api;
  globalThis.AldusStorageConcurrencyV346 = api;
})();