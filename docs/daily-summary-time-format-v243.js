(() => {
  "use strict";

  const VERSION = "20260805-daily-summary-hours-minutes-v243";
  const HOTFIX = "daily-summary-time-format-hotfix2";
  const GLOBAL_KEY = "__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__";
  const PLANNED_SELECTOR = ".planned-today-stat > strong";
  const REALIZED_SELECTOR = ".realized-today-stat > strong";
  const CENTRAL_PALETTE_STYLE_ID = "aldusCentralGoalsPaletteV245";
  const CENTRAL_PALETTE_VERSION = "20260805-central-goals-palette-v245";

  function installCentralGoalsPalette() {
    if (typeof document === "undefined" || document.getElementById(CENTRAL_PALETTE_STYLE_ID)) return false;
    const style = document.createElement("style");
    style.id = CENTRAL_PALETTE_STYLE_ID;
    style.dataset.version = CENTRAL_PALETTE_VERSION;
    style.textContent = `
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(1) {
        --central-goal-accent: #a78bfa;
        --central-goal-border: #8b5cf6;
        --central-goal-value: #d8c4ff;
        --central-goal-muted: #ddd2f7;
        --central-goal-background: linear-gradient(145deg, #2b1d4f 0%, #181a35 100%);
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(2) {
        --central-goal-accent: #f6d365;
        --central-goal-border: #d6a925;
        --central-goal-value: #ffe681;
        --central-goal-muted: #f5e9b9;
        --central-goal-background: linear-gradient(145deg, #46380f 0%, #2b260f 100%);
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(3) {
        --central-goal-accent: #59b7ff;
        --central-goal-border: #2f9edc;
        --central-goal-value: #75caff;
        --central-goal-muted: #c6e6fb;
        --central-goal-background: linear-gradient(145deg, #0b3a5d 0%, #082840 100%);
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(4) {
        --central-goal-accent: #d6e5ef;
        --central-goal-border: #9fb9c8;
        --central-goal-value: #e6f2f8;
        --central-goal-muted: #d2e0e8;
        --central-goal-background: linear-gradient(145deg, #2c4050 0%, #1c2c39 100%);
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) {
        border: 1px solid var(--central-goal-border) !important;
        border-left: 7px solid var(--central-goal-accent) !important;
        background: var(--central-goal-background) !important;
        box-shadow: 0 10px 26px rgba(0, 6, 18, .28) !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) h3 {
        color: #f8fbff !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) > strong {
        color: var(--central-goal-value) !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .28) !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) .card-meta-grid,
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) .card-meta-grid span,
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) .item-meta,
      html[data-aldus-theme="premium-stable"] #view-central-metas #centralGoalsCards > .goal-central-card:nth-child(-n+4) small {
        color: var(--central-goal-muted) !important;
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
    installCentralGoalsPalette();
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
    centralPaletteVersion: CENTRAL_PALETTE_VERSION,
    formatDurationMinutes,
    calculateSummaryMinutes,
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
