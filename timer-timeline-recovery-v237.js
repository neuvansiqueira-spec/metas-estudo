(() => {
  "use strict";

  const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
  const HOTFIX = "timer-timeline-recovery-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_TIMELINE_RECOVERY_V237__";
  const CONTROL_FLAG = "__aldusTimerTimelineRecoveryV237";
  const RETRY_INTERVAL_MS = 100;
  const RETRY_LIMIT = 300;

  if (globalThis[GLOBAL_KEY]) return;

  let retryId = null;
  let attempts = 0;
  let restoreWrapped = false;
  let lastReport = null;

  function timestamp(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function calculateTimelineElapsedSeconds(session = {}, now = Date.now()) {
    const stored = Math.max(0, Number(session.elapsedSeconds) || 0);
    if (!session?.goalId || session.closed || session.completed || session.completionAlarmPlayed) return stored;

    const openedAt = timestamp(session.openedAt);
    const currentAt = Number(now);
    if (!openedAt || !Number.isFinite(currentAt) || currentAt <= openedAt) return stored;

    const pauses = Array.isArray(session.pauses) ? session.pauses.map(timestamp).filter(Boolean) : [];
    const resumes = Array.isArray(session.resumes) ? session.resumes.map(timestamp).filter(Boolean) : [];
    const lastPause = pauses.at(-1) || 0;
    const endAt = session.paused && lastPause >= openedAt ? Math.min(lastPause, currentAt) : currentAt;
    if (endAt <= openedAt) return stored;

    let pausedMilliseconds = 0;
    for (let index = 0; index < pauses.length; index += 1) {
      const pauseAt = pauses[index];
      const resumeAt = resumes[index];
      if (pauseAt < openedAt || pauseAt > endAt) continue;
      if (!resumeAt || resumeAt <= pauseAt) continue;
      pausedMilliseconds += Math.max(0, Math.min(resumeAt, endAt) - pauseAt);
    }

    const timeline = Math.max(0, Math.floor((endAt - openedAt - pausedMilliseconds) / 1000));
    return Math.max(stored, timeline);
  }

  function activeTimer() {
    try {
      return typeof floatingTimer === "object" && floatingTimer ? floatingTimer : null;
    } catch {
      return null;
    }
  }

  function activeTimerSeconds(timer) {
    try {
      if (typeof currentTimerSeconds === "function") return Math.max(0, Number(currentTimerSeconds()) || 0);
    } catch {}
    return Math.max(0, Number(timer?.elapsedSeconds) || 0);
  }

  function persistReconciledTimer() {
    try {
      if (typeof persistFloatingTimerSession === "function") {
        persistFloatingTimerSession({ storageOnly: true });
        return true;
      }
    } catch (error) {
      console.warn("[Aldus V237] Não foi possível persistir a recuperação da linha do tempo.", error);
    }
    return false;
  }

  function reconcileTimerTimeline(now = Date.now()) {
    const timer = activeTimer();
    if (!timer?.goalId || timer.closed || timer.completed || timer.completionAlarmPlayed) return false;

    const current = activeTimerSeconds(timer);
    const recovered = calculateTimelineElapsedSeconds(timer, now);
    if (recovered <= current) return false;

    const addedSeconds = recovered - current;
    timer.elapsedSeconds = recovered;
    timer.startedAt = timer.paused ? null : Number(now);
    timer.timelineRecoveredAtV237 = new Date(Number(now)).toISOString();
    timer.timelineRecoveredSecondsV237 = Math.max(0, Number(timer.timelineRecoveredSecondsV237) || 0) + addedSeconds;

    persistReconciledTimer();
    try { if (typeof renderFloatingTimer === "function") renderFloatingTimer(); } catch {}

    lastReport = Object.freeze({
      goalId: String(timer.goalId || ""),
      beforeSeconds: current,
      recoveredSeconds: recovered,
      addedSeconds,
      recoveredAt: timer.timelineRecoveredAtV237
    });
    globalThis.__aldusTimerTimelineRecoveryReportV237 = lastReport;
    return true;
  }

  function installRestoreWrapper() {
    if (restoreWrapped) return true;
    let original = null;
    try {
      if (typeof restoreFloatingTimerSession === "function") original = restoreFloatingTimerSession;
    } catch {}
    if (!original) return false;
    if (original[CONTROL_FLAG]) {
      restoreWrapped = true;
      return true;
    }

    const replacement = function restoreFloatingTimerSessionWithTimelineV237(...args) {
      const result = original.apply(this, args);
      reconcileTimerTimeline();
      return result;
    };
    Object.defineProperty(replacement, CONTROL_FLAG, { value: true });
    Object.defineProperty(replacement, "__aldusOriginal", { value: original });
    try {
      restoreFloatingTimerSession = replacement;
      globalThis.restoreFloatingTimerSession = replacement;
      restoreWrapped = true;
      return true;
    } catch (error) {
      console.warn("[Aldus V237] Não foi possível proteger a restauração do cronômetro.", error);
      return false;
    }
  }

  function install() {
    attempts += 1;
    const wrapped = installRestoreWrapper();
    reconcileTimerTimeline();
    if ((wrapped && activeTimer()?.goalId) || attempts >= RETRY_LIMIT) {
      if (retryId) window.clearInterval(retryId);
    }
  }

  window.addEventListener("pageshow", () => reconcileTimerTimeline(), { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reconcileTimerTimeline();
  }, { capture: true });

  retryId = window.setInterval(install, RETRY_INTERVAL_MS);
  install();

  globalThis[GLOBAL_KEY] = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    installedAt: new Date().toISOString(),
    calculateTimelineElapsedSeconds,
    reconcileTimerTimeline,
    installRestoreWrapper,
    get lastReport() { return lastReport; }
  });
})();
