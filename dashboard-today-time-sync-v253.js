(() => {
  "use strict";

  const VERSION = "20260805-dashboard-today-time-sync-v253";
  const HOTFIX = "dashboard-today-time-sync-hotfix1";
  const GLOBAL_KEY = "__ALDUS_DASHBOARD_TODAY_TIME_SYNC_V253__";
  const STORAGE_KEY = "metasConcursoData";
  const DASHBOARD_SELECTOR = "#todayHours";
  const SUMMARY_SELECTOR = "#dailyGoalsSummary .daily-goals-summary > .realized-today-stat > strong";

  if (globalThis[GLOBAL_KEY]) return;

  function localTodayISO() {
    try {
      if (typeof todayISO === "function") return String(todayISO()).slice(0, 10);
    } catch {}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function recordDate(record = {}) {
    return String(record.date || record.data || record.scheduledDate || "").slice(0, 10);
  }

  function actualMinutes(goal = {}) {
    try {
      if (typeof goalTotalActualMinutes === "function") return Math.max(0, Number(goalTotalActualMinutes(goal)) || 0);
    } catch {}
    const study = Math.max(0, Number(goal.studyActualMinutes) || 0);
    const questions = Math.max(0, Number(goal.questionActualMinutes) || 0);
    if (study || questions) return study + questions;
    return Math.max(0, Number(goal.actualMinutes || goal.minutesDone || goal.performedMinutes) || 0);
  }

  function uniqueStudyMinutes(studies = [], date = localTodayISO()) {
    const seen = new Set();
    return (Array.isArray(studies) ? studies : []).reduce((total, study) => {
      if (recordDate(study) !== date) return total;
      const key = String(study.timerSessionId || study.sessionId || study.id || JSON.stringify(study));
      if (seen.has(key)) return total;
      seen.add(key);
      return total + Math.max(0, Number(study.minutes) || Math.round((Number(study.seconds) || 0) / 60));
    }, 0);
  }

  function linkedTimerMinutes(goal, studies = []) {
    const seen = new Set();
    return (Array.isArray(studies) ? studies : []).reduce((total, study) => {
      if (String(study.goalId || "") !== String(goal.id || "")) return total;
      if (study.origin !== "timer" || study.updatesGoal === false) return total;
      const key = String(study.timerSessionId || study.sessionId || study.id || "");
      if (key && seen.has(key)) return total;
      if (key) seen.add(key);
      return total + Math.max(0, Number(study.minutes) || 0);
    }, 0);
  }

  function calculateTodayMinutes(sourceState, date = localTodayISO()) {
    const current = sourceState && typeof sourceState === "object" ? sourceState : {};
    const studies = Array.isArray(current.studies) ? current.studies : [];
    const goals = Array.isArray(current.dailyGoals) ? current.dailyGoals : [];
    const questionLogs = Array.isArray(current.questionLogs) ? current.questionLogs : [];

    const recordedStudies = uniqueStudyMinutes(studies, date);
    const unloggedGoalMinutes = goals
      .filter((goal) => recordDate(goal) === date)
      .reduce((total, goal) => total + Math.max(0, actualMinutes(goal) - linkedTimerMinutes(goal, studies)), 0);
    const standaloneQuestionMinutes = questionLogs
      .filter((log) => recordDate(log) === date)
      .reduce((total, log) => total + Math.max(0, Number(log.minutes) || 0), 0);

    return Math.round(recordedStudies + unloggedGoalMinutes + standaloneQuestionMinutes);
  }

  function runtimeState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function formatDurationMinutes(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (total < 60) return `${total}min`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
  }

  function selectedGoalDateIsToday() {
    const selected = document.getElementById("goalDate")?.value;
    return !selected || String(selected).slice(0, 10) === localTodayISO();
  }

  function setValue(element, minutes, kind) {
    if (!element) return false;
    const next = formatDurationMinutes(minutes);
    if (element.textContent === next && element.dataset.dashboardTodayTimeSyncV253 === VERSION) return false;
    element.textContent = next;
    element.dataset.dashboardTodayTimeSyncV253 = VERSION;
    element.dataset.dashboardTodayTimeSyncHotfix = HOTFIX;
    element.dataset.dashboardTodayTimeMinutes = String(minutes);
    element.dataset.dashboardTodayTimeKind = kind;
    return true;
  }

  function apply() {
    if (typeof document === "undefined") return { changed: 0, minutes: 0 };
    const sourceState = runtimeState();
    if (!sourceState) return { changed: 0, minutes: 0 };
    const minutes = calculateTodayMinutes(sourceState, localTodayISO());
    let changed = 0;
    if (setValue(document.querySelector(DASHBOARD_SELECTOR), minutes, "dashboard")) changed += 1;
    if (selectedGoalDateIsToday() && setValue(document.querySelector(SUMMARY_SELECTOR), minutes, "daily-summary")) changed += 1;
    return { changed, minutes };
  }

  const api = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    localTodayISO,
    recordDate,
    actualMinutes,
    uniqueStudyMinutes,
    linkedTimerMinutes,
    calculateTodayMinutes,
    formatDurationMinutes,
    apply
  });
  globalThis[GLOBAL_KEY] = api;

  if (typeof document === "undefined") return;

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    const run = () => {
      scheduled = false;
      apply();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else window.setTimeout(run, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleApply, { once: true });
  else scheduleApply();

  new MutationObserver(scheduleApply).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener("change", (event) => {
    if (event.target?.id === "goalDate") scheduleApply();
  });
  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === STORAGE_KEY) scheduleApply();
  });
  window.addEventListener("focus", scheduleApply);
  window.addEventListener("pageshow", scheduleApply);
  window.addEventListener("hashchange", scheduleApply);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleApply();
  });
  window.setTimeout(scheduleApply, 250);
  window.setTimeout(scheduleApply, 1000);
})();
