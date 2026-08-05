(() => {
  "use strict";

  const VERSION = "20260805-daily-summary-hours-minutes-v243";
  const HOTFIX = "daily-summary-time-format-hotfix1";
  const GLOBAL_KEY = "__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__";
  const PLANNED_SELECTOR = ".planned-today-stat > strong";
  const REALIZED_SELECTOR = ".realized-today-stat > strong";

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

  function apply() {
    if (typeof document === "undefined") return { changed: 0, summary: null };
    const summary = currentSummaryMinutes();
    if (!summary) return { changed: 0, summary: null };
    let changed = 0;
    if (setFormattedValue(PLANNED_SELECTOR, summary.target)) changed += 1;
    if (setFormattedValue(REALIZED_SELECTOR, summary.done)) changed += 1;
    return { changed, summary };
  }

  const api = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    formatDurationMinutes,
    calculateSummaryMinutes,
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleApply, { once: true });
  } else {
    scheduleApply();
  }

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener("change", (event) => {
    if (event.target?.id === "goalDate") scheduleApply();
  });
  window.addEventListener("hashchange", scheduleApply);
  window.setTimeout(scheduleApply, 250);
  window.setTimeout(scheduleApply, 1000);
})();
