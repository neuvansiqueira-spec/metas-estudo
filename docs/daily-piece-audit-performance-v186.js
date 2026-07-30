(() => {
  "use strict";

  if (globalThis.__aldusDailyPieceAuditPerformanceV186) return;

  const VERSION = "20260730-auditoria-peca-consolidada-v186";
  const MIGRATION_KEY = "dailyPieceAuditPerformanceV186";
  const AUDIT_DAYS = 21;
  const prelude = globalThis.__aldusDailyPieceAuditPreludeV186;
  const api = globalThis.__aldusDailyDelegatePieceGoalV183;

  if (prelude?.originalAddEventListener && typeof window !== "undefined") {
    window.addEventListener = prelude.originalAddEventListener;
  }
  try {
    if (prelude?.originalBootstrapReady) globalThis.__aldusBootstrapReady = prelude.originalBootstrapReady;
  } catch {}
  if (!api || typeof api.ensureDailyPieceForDate !== "function") return;

  let initialAuditCompleted = false;
  let scheduledHandle = null;
  let scheduledMode = "";

  function goalDate(goal = {}) {
    return String(goal.date || goal.data || "");
  }

  function currentDate() {
    try {
      if (typeof todayISO === "function") return todayISO();
    } catch {}
    return new Date().toISOString().slice(0, 10);
  }

  function datePlus(date, days) {
    try {
      if (typeof addDays === "function") return addDays(date, days);
    } catch {}
    const parsed = new Date(`${date}T12:00:00`);
    parsed.setDate(parsed.getDate() + days);
    return parsed.toISOString().slice(0, 10);
  }

  function ignoredGoal(goal = {}) {
    const value = String(goal.status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    return ["ignorada", "ignorado", "nao cumprida", "nao cumprido"].includes(value);
  }

  function buildAuditIndex(targetState) {
    const today = currentDate();
    const goalsByDate = new Map();
    const futureDates = new Set();
    (targetState.dailyGoals || []).forEach((goal) => {
      const date = goalDate(goal);
      if (!date) return;
      if (date >= today) futureDates.add(date);
      if (ignoredGoal(goal)) return;
      const records = goalsByDate.get(date) || [];
      records.push(goal);
      goalsByDate.set(date, records);
    });
    const dates = new Set(futureDates);
    for (let index = 0; index < AUDIT_DAYS; index += 1) dates.add(datePlus(today, index));
    return { today, goalsByDate, dates: [...dates].sort() };
  }

  function hasPiece(goals, targetState) {
    return goals.some((goal) => api.isDelegatePieceRecord?.(goal, targetState));
  }

  function withCachedPlanningContext(callback) {
    if (typeof buildPlanningScoreContext !== "function") return callback({ builds: 0 });
    const original = buildPlanningScoreContext;
    let built = false;
    let cached = null;
    buildPlanningScoreContext = function cachedPlanningScoreContextV186() {
      if (!built) {
        cached = original.apply(this, arguments);
        built = true;
      }
      return cached;
    };
    try {
      return callback({ get builds() { return built ? 1 : 0; } });
    } finally {
      buildPlanningScoreContext = original;
    }
  }

  function runAudit(reason = "audit") {
    const targetState = typeof state !== "undefined" ? state : null;
    if (!targetState || !Array.isArray(targetState.dailyGoals)) {
      return { changed: false, reason, auditedDates: 0, missingDates: 0 };
    }

    const startedAt = performance.now();
    const index = buildAuditIndex(targetState);
    const missingDates = index.dates.filter((date) => !hasPiece(index.goalsByDate.get(date) || [], targetState));
    const reports = withCachedPlanningContext((cache) => {
      const output = missingDates.map((date) => api.ensureDailyPieceForDate(date, targetState));
      output.scoreContextBuilds = cache.builds;
      return output;
    });
    const changedReports = reports.filter((report) => report?.changed);
    const performanceReport = {
      version: VERSION,
      reason,
      totalGoals: targetState.dailyGoals.length,
      auditedDates: index.dates.length,
      missingDates: missingDates.length,
      scoreContextBuilds: reports.scoreContextBuilds || 0,
      changedDates: changedReports.length,
      totalMs: Number((performance.now() - startedAt).toFixed(1))
    };
    globalThis.__aldusDailyPieceAuditLastV186 = Object.freeze(performanceReport);

    if (!changedReports.length) return { changed: false, reason, reports, performance: performanceReport };

    targetState.migrations ||= {};
    targetState.migrations[MIGRATION_KEY] = {
      ...performanceReport,
      appliedAt: new Date().toISOString(),
      addedPieceGoals: changedReports.filter((report) => report.added).length,
      replacedAutomaticGoals: changedReports.filter((report) => report.removed).length,
      preservedPolicy: "metas manuais, concluídas, iniciadas, com tempo ou histórico não são removidas"
    };
    if (typeof saveData === "function") saveData({ markLocalChange: true, reason: "daily-piece-audit-v186" });
    if (typeof render === "function") render();
    if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("daily-piece-audit-v186");
    return { changed: true, reason, reports, performance: performanceReport };
  }

  function cancelScheduledAudit() {
    if (scheduledHandle === null) return;
    if (scheduledMode === "idle" && typeof cancelIdleCallback === "function") cancelIdleCallback(scheduledHandle);
    else if (scheduledMode === "timeout") clearTimeout(scheduledHandle);
    scheduledHandle = null;
    scheduledMode = "";
  }

  function executeInitialAudit(reason) {
    if (initialAuditCompleted) return false;
    cancelScheduledAudit();
    initialAuditCompleted = true;
    runAudit(reason);
    return true;
  }

  function scheduleInitialAudit(reason, preferIdle = false) {
    if (initialAuditCompleted) return false;
    cancelScheduledAudit();
    const execute = () => {
      scheduledHandle = null;
      scheduledMode = "";
      executeInitialAudit(reason);
    };
    if (preferIdle && typeof requestIdleCallback === "function") {
      scheduledMode = "idle";
      scheduledHandle = requestIdleCallback(execute, { timeout: 500 });
    } else if (typeof setTimeout === "function") {
      scheduledMode = "timeout";
      scheduledHandle = setTimeout(execute, preferIdle ? 0 : 1000);
    } else {
      queueMicrotask(execute);
    }
    return true;
  }

  const onBootstrapReady = () => scheduleInitialAudit("bootstrap-fallback", false);
  if (prelude?.originalBootstrapReady || globalThis.__aldusBootstrapReady) queueMicrotask(onBootstrapReady);
  else window.addEventListener("aldus:bootstrap-ready", onBootstrapReady, { once: true });
  window.addEventListener("aldus:post-bootstrap-maintenance-complete", () => {
    scheduleInitialAudit("post-bootstrap-maintenance", true);
  }, { once: true });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) runAudit("pageshow-bfcache");
  });

  globalThis.__aldusDailyPieceAuditPerformanceV186 = Object.freeze({
    version: VERSION,
    runAudit,
    scheduleInitialAudit,
    legacyListenersSuppressed: prelude?.suppressed?.length || 0
  });
})();
