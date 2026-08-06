(() => {
  "use strict";

  if (globalThis.__aldusDashboardTodayQuestionsSyncV257) return;

  const VERSION = "20260805-dashboard-today-questions-sync-v257";
  const DB_NAME = "metas-estudo-db";
  const STORE_NAME = "appState";
  const CURRENT_ID = "current";
  const TODAY = localDay(new Date());
  let refreshPending = false;
  let lastTotal = -1;

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function localDay(value) {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    }
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
    return localDay(parsed);
  }

  function recordDay(item = {}) {
    return localDay(
      item.date || item.data || item.createdAt || item.startedAt || item.finishedAt ||
      item.completedAt || item.doneAt || item.updatedAt || item.savedAt
    );
  }

  function sessionTotal(session = {}) {
    const direct = [
      session.summary?.total,
      session.total,
      session.totalQuestions,
      session.questions,
      session.questoes,
      session.quantity,
      session.quantidade
    ].map(number).find(Boolean);
    if (direct) return direct;
    for (const key of ["items", "results", "resultados", "answers", "respostas"]) {
      if (Array.isArray(session[key])) return session[key].length;
    }
    const parts = number(session.summary?.correct ?? session.correct ?? session.acertos)
      + number(session.summary?.wrong ?? session.wrong ?? session.erros)
      + number(session.summary?.blank ?? session.blank ?? session.brancos ?? session.unanswered)
      + number(session.summary?.doubt ?? session.doubt ?? session.duvidas);
    return parts;
  }

  function logTotal(log = {}) {
    const direct = [
      log.total,
      log.totalQuestions,
      log.questions,
      log.questoes,
      log.quantity,
      log.quantidade
    ].map(number).find(Boolean);
    if (direct) return direct;
    const parts = number(log.correct ?? log.acertos)
      + number(log.wrong ?? log.erros)
      + number(log.blank ?? log.brancos ?? log.unanswered)
      + number(log.doubt ?? log.duvidas);
    return parts || 1;
  }

  function sessionKey(item = {}) {
    return String(
      item.questionBankSessionId || item.trainingSessionId || item.sourceSessionId ||
      item.sessionId || item.id || ""
    ).trim();
  }

  function todayQuestionTotal(data = {}) {
    const sessions = Array.isArray(data.questionBankSessions) ? data.questionBankSessions : [];
    const logs = Array.isArray(data.questionLogs) ? data.questionLogs : [];
    const todaySessions = sessions.filter((item) => recordDay(item) === TODAY);
    const todayLogs = logs.filter((item) => recordDay(item) === TODAY);

    const seenSessions = new Set();
    let sessionsTotal = 0;
    todaySessions.forEach((session, index) => {
      const key = sessionKey(session) || `session-${index}-${sessionTotal(session)}`;
      if (seenSessions.has(key)) return;
      seenSessions.add(key);
      sessionsTotal += sessionTotal(session);
    });

    let logsTotal = 0;
    let unmatchedLogsTotal = 0;
    let linkedLogFound = false;
    todayLogs.forEach((log) => {
      const amount = logTotal(log);
      logsTotal += amount;
      const key = String(
        log.questionBankSessionId || log.trainingSessionId || log.sourceSessionId || log.sessionId || ""
      ).trim();
      if (key && seenSessions.has(key)) linkedLogFound = true;
      else unmatchedLogsTotal += amount;
    });

    if (!sessionsTotal) return logsTotal;
    if (!logsTotal) return sessionsTotal;
    if (linkedLogFound) return sessionsTotal + unmatchedLogsTotal;
    return Math.max(sessionsTotal, logsTotal);
  }

  function runtimeState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    for (const key of ["__ALDUS_STATE__", "aldusState", "appState"]) {
      const candidate = globalThis[key];
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
    }
    return null;
  }

  function loadIndexedDBState() {
    return new Promise((resolve) => {
      if (!globalThis.indexedDB) return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.close();
          resolve(null);
          return;
        }
        const transaction = database.transaction(STORE_NAME, "readonly");
        const getRequest = transaction.objectStore(STORE_NAME).get(CURRENT_ID);
        getRequest.onsuccess = () => resolve(getRequest.result?.data || null);
        getRequest.onerror = () => resolve(null);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
        transaction.onabort = () => database.close();
      };
    });
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function findQuestionsValueElement() {
    const direct = document.querySelector(
      '#dailyGoalsSummary [data-daily-summary-kind="questions"] strong, ' +
      '[data-daily-summary-kind="questions"] strong'
    );
    if (direct) return direct;

    const root = document.querySelector("#dailyGoalsSummary") || document;
    const labels = [...root.querySelectorAll("h2,h3,h4,p,span,div")]
      .filter((element) => normalizeText(element.textContent) === "questoes realizadas");
    for (const label of labels) {
      let card = label.closest("[data-daily-summary-kind], article, li, .summary-card, .metric-card");
      if (!card) card = label.parentElement;
      for (let depth = 0; card && depth < 3; depth += 1, card = card.parentElement) {
        const candidates = [...card.querySelectorAll("strong")]
          .filter((element) => /^\d+(?:[.,]\d+)?$/.test(element.textContent.trim()));
        if (candidates.length) return candidates[candidates.length - 1];
      }
    }
    return null;
  }

  async function refresh() {
    refreshPending = false;
    const data = runtimeState() || await loadIndexedDBState();
    if (!data) return false;
    const total = todayQuestionTotal(data);
    const valueElement = findQuestionsValueElement();
    if (!valueElement) return false;
    const text = String(Math.max(0, Math.round(total)));
    if (valueElement.textContent.trim() !== text) valueElement.textContent = text;
    valueElement.dataset.aldusQuestionsSyncVersion = VERSION;
    lastTotal = total;
    globalThis.__aldusDashboardTodayQuestionsSyncV257.lastReport = Object.freeze({
      version: VERSION,
      day: TODAY,
      total,
      questionLogs: Array.isArray(data.questionLogs) ? data.questionLogs.filter((item) => recordDay(item) === TODAY).length : 0,
      questionBankSessions: Array.isArray(data.questionBankSessions) ? data.questionBankSessions.filter((item) => recordDay(item) === TODAY).length : 0,
      updatedAt: new Date().toISOString()
    });
    return true;
  }

  function scheduleRefresh() {
    if (refreshPending) return;
    refreshPending = true;
    queueMicrotask(() => refresh().catch(() => { refreshPending = false; }));
  }

  const api = {
    version: VERSION,
    refresh,
    calculate: todayQuestionTotal,
    get lastTotal() { return lastTotal; },
    lastReport: null
  };
  globalThis.__aldusDashboardTodayQuestionsSyncV257 = api;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleRefresh, { once: true });
  else scheduleRefresh();
  window.addEventListener("load", scheduleRefresh, { once: true });
  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("pageshow", scheduleRefresh);
  window.addEventListener("storage", scheduleRefresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleRefresh(); });

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  let attempts = 0;
  const bootstrapInterval = setInterval(() => {
    scheduleRefresh();
    attempts += 1;
    if (attempts >= 30) clearInterval(bootstrapInterval);
  }, 500);
})();
