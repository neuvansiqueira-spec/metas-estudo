(() => {
  "use strict";

  const VERSION = "20260805-daily-summary-hours-minutes-v243";
  const HOTFIX = "daily-summary-time-format-hotfix4";
  const GLOBAL_KEY = "__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__";
  const PLANNED_SELECTOR = ".planned-today-stat > strong";
  const REALIZED_SELECTOR = ".realized-today-stat > strong";
  const WEEKLY_STATUS_SELECTOR = "#weeklyGoalStatus";
  const CENTRAL_PALETTE_STYLE_ID = "aldusCentralGoalsPaletteV246";
  const CENTRAL_PALETTE_VERSION = "20260805-dashboard-central-metas-cores-v246";

  function installCentralGoalsPalette() {
    if (typeof document === "undefined" || document.getElementById(CENTRAL_PALETTE_STYLE_ID)) return false;
    const style = document.createElement("style");
    style.id = CENTRAL_PALETTE_STYLE_ID;
    style.dataset.version = CENTRAL_PALETTE_VERSION;
    style.textContent = `
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(1) {
        --central-goal-accent: #a78bfa;
        --central-goal-border: #8b5cf6;
        --central-goal-value: #e0d2ff;
        --central-goal-muted: #ddd3f4;
        --central-goal-background: linear-gradient(145deg, #302052 0%, #1a1c38 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(2) {
        --central-goal-accent: #f7d462;
        --central-goal-border: #d8ad2f;
        --central-goal-value: #ffe782;
        --central-goal-muted: #f3e8b6;
        --central-goal-background: linear-gradient(145deg, #4a3a10 0%, #2c260f 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(3) {
        --central-goal-accent: #58b8ff;
        --central-goal-border: #279ddd;
        --central-goal-value: #79cbff;
        --central-goal-muted: #c8e7fb;
        --central-goal-background: linear-gradient(145deg, #0b3d62 0%, #082a44 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(4) {
        --central-goal-accent: #d9e7ef;
        --central-goal-border: #a9c0cd;
        --central-goal-value: #edf7fb;
        --central-goal-muted: #d8e5eb;
        --central-goal-background: linear-gradient(145deg, #334957 0%, #21323d 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(-n+4) {
        border: 1px solid var(--central-goal-border) !important;
        border-left: 7px solid var(--central-goal-accent) !important;
        background: var(--central-goal-background) !important;
        box-shadow: 0 12px 28px rgba(0, 6, 18, .30) !important;
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(-n+4) > span {
        color: var(--central-goal-muted) !important;
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(-n+4) > strong {
        color: var(--central-goal-value) !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .30) !important;
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  installCentralGoalsPalette();
  if (globalThis[GLOBAL_KEY]) return;

  function formatDurationMinutes(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (total < 60) return `${total}min`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
  }

  function defaultGoalDate(goal) {
    return String(goal?.date || goal?.data || goal?.scheduledDate || "").slice(0, 10);
  }

  function defaultActualMinutes(goal) {
    if (Number.isFinite(Number(goal?.studyActualMinutes))) return Math.max(0, Number(goal.studyActualMinutes));
    if (Number.isFinite(Number(goal?.actualMinutes))) {
      return Math.max(0, Number(goal.actualMinutes) - Math.max(0, Number(goal?.questionActualMinutes) || 0));
    }
    return Math.max(0, Number(goal?.minutesDone || goal?.performedMinutes || 0));
  }

  function calculateSummaryMinutes(goals, date, availability = { hours: 0 }, helpers = {}) {
    const readDate = typeof helpers.goalDateValue === "function" ? helpers.goalDateValue : defaultGoalDate;
    const readActual = typeof helpers.goalTotalActualMinutes === "function" ? helpers.goalTotalActualMinutes : defaultActualMinutes;
    const selected = (Array.isArray(goals) ? goals : []).filter((goal) => {
      try {
        return String(readDate(goal) || "").slice(0, 10) === date;
      } catch {
        return false;
      }
    });
    const planned = selected.reduce((sum, goal) => sum + Math.max(0, Number(goal?.minutes) || 0), 0);
    const done = selected.reduce((sum, goal) => {
      try {
        return sum + Math.max(0, Number(readActual(goal)) || 0);
      } catch {
        return sum;
      }
    }, 0);
    const target = planned || Math.max(0, Number(availability?.hours) || 0) * 60;
    return { target, done, planned, count: selected.length };
  }

  function calculateRegisteredMinutesBetween(logs, start, end) {
    return (Array.isArray(logs) ? logs : []).reduce((sum, log) => {
      const date = String(log?.date || log?.data || "").slice(0, 10);
      if (!date || date < start || date > end) return sum;
      return sum + Math.max(0, Number(log?.minutes) || 0);
    }, 0);
  }

  function addDaysFallback(dateString, amount) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toLocaleDateString("en-CA");
  }

  function weekStartFallback(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return date.toLocaleDateString("en-CA");
  }

  function selectedDate() {
    try {
      if (typeof elements !== "undefined" && elements?.goalDate?.value) return String(elements.goalDate.value).slice(0, 10);
    } catch {}
    const input = document.getElementById("goalDate");
    if (input?.value) return String(input.value).slice(0, 10);
    try {
      if (typeof todayISO === "function") return todayISO();
    } catch {}
    return new Date().toLocaleDateString("en-CA");
  }

  function currentSummaryMinutes() {
    try {
      if (typeof state === "undefined" || !Array.isArray(state?.dailyGoals)) return null;
      const date = selectedDate();
      const availability = typeof availabilityForDate === "function" ? availabilityForDate(date) : { hours: 0 };
      return calculateSummaryMinutes(state.dailyGoals, date, availability, {
        goalDateValue: typeof goalDateValue === "function" ? goalDateValue : defaultGoalDate,
        goalTotalActualMinutes: typeof goalTotalActualMinutes === "function" ? goalTotalActualMinutes : defaultActualMinutes
      });
    } catch {
      return null;
    }
  }

  function currentWeekRegisteredMinutes() {
    try {
      if (typeof state === "undefined") return null;
      if (typeof bootstrapStateReady !== "undefined" && bootstrapStateReady !== true) return null;
      if (typeof centralTimeChartLogs !== "function") return null;
      const today = typeof todayISO === "function" ? todayISO() : new Date().toLocaleDateString("en-CA");
      const start = typeof weekStart === "function" ? weekStart(today) : weekStartFallback(today);
      const end = typeof addDays === "function" ? addDays(start, 6) : addDaysFallback(start, 6);
      return calculateRegisteredMinutesBetween(centralTimeChartLogs(), start, end);
    } catch {
      return null;
    }
  }

  function setFormattedValue(selector, minutes) {
    const element = document.querySelector(selector);
    if (!element) return false;
    const nextText = formatDurationMinutes(minutes);
    if (element.textContent === nextText && element.dataset.dailySummaryTimeFormatV243 === VERSION) return false;
    element.textContent = nextText;
    element.dataset.dailySummaryTimeFormatV243 = VERSION;
    element.dataset.dailySummaryTimeFormatHotfix = HOTFIX;
    return true;
  }

  function setWeeklyRegisteredValue(minutes) {
    const element = document.querySelector(WEEKLY_STATUS_SELECTOR);
    if (!element || minutes === null) return false;
    const nextText = `${formatDurationMinutes(minutes)} registradas`;
    if (element.textContent === nextText && element.dataset.dailySummaryTimeFormatHotfix === HOTFIX) return false;
    element.textContent = nextText;
    element.dataset.dailySummaryTimeFormatV243 = VERSION;
    element.dataset.dailySummaryTimeFormatHotfix = HOTFIX;
    element.dataset.weeklyRegisteredMinutes = String(Math.max(0, Math.round(Number(minutes) || 0)));
    return true;
  }

  function apply() {
    if (typeof document === "undefined") return { changed: 0, summary: null, weeklyMinutes: null };
    installCentralGoalsPalette();
    const summary = currentSummaryMinutes();
    const weeklyMinutes = currentWeekRegisteredMinutes();
    let changed = 0;
    if (summary) {
      if (setFormattedValue(PLANNED_SELECTOR, summary.target)) changed += 1;
      if (setFormattedValue(REALIZED_SELECTOR, summary.done)) changed += 1;
    }
    if (setWeeklyRegisteredValue(weeklyMinutes)) changed += 1;
    return { changed, summary, weeklyMinutes };
  }

  const api = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    centralPaletteVersion: CENTRAL_PALETTE_VERSION,
    formatDurationMinutes,
    calculateSummaryMinutes,
    calculateRegisteredMinutesBetween,
    currentWeekRegisteredMinutes,
    installCentralGoalsPalette,
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

  function mutationElement(target) {
    if (!target) return null;
    if (target.nodeType === 3) return target.parentElement || null;
    return target;
  }

  function isOwnOutputMutation(mutation) {
    const element = mutationElement(mutation?.target);
    return Boolean(element?.closest?.(".planned-today-stat, .realized-today-stat, #weeklyGoalStatus"));
  }

  function scheduleApplyForMutations(mutations) {
    const records = Array.from(mutations || []);
    if (records.length && records.every(isOwnOutputMutation)) return;
    scheduleApply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleApply, { once: true });
  } else {
    scheduleApply();
  }

  const observerTarget = document.querySelector(".screen-stage");
  const observer = new MutationObserver(scheduleApplyForMutations);
  if (observerTarget) {
    observer.observe(observerTarget, { childList: true, subtree: true, characterData: true });
  }
  document.addEventListener("change", (event) => {
    if (event.target?.id === "goalDate") scheduleApply();
  });
  document.addEventListener("aldus:view-active", scheduleApply);
  window.addEventListener("hashchange", scheduleApply);
  window.setTimeout(scheduleApply, 250);
  window.setTimeout(scheduleApply, 1000);
})();
