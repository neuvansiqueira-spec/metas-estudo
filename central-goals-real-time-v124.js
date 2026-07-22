(() => {
  const PATCH_VERSION = "20260721-central-tempo-visibilidade-v125";

  function ensureCentralTimeVisibilityStyles() {
    if (document.getElementById("centralTimeVisibilityV125")) return;
    const style = document.createElement("style");
    style.id = "centralTimeVisibilityV125";
    style.textContent = `
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-pie > div {
        background: #061d31 !important;
        border-color: #5fa8d8 !important;
        box-shadow: 0 10px 28px rgba(0, 5, 16, .38) !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-pie strong {
        color: #ffffff !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .35) !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-pie span {
        color: #c9deed !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-legend h4 {
        color: #ffffff !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-legend-row {
        border-color: #4b89b8 !important;
        background: linear-gradient(145deg, #0b2d47, #071f34) !important;
        color: #ffffff !important;
        box-shadow: 0 7px 18px rgba(0, 7, 18, .22) !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-legend-row span {
        color: #f6fbff !important;
        font-weight: 800 !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-legend-row strong {
        padding: 5px 9px !important;
        border: 1px solid rgba(95, 168, 216, .42) !important;
        border-radius: 9px !important;
        background: rgba(56, 189, 248, .12) !important;
        color: #e8f7ff !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }
      html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-legend > .item-meta {
        color: #c6d9e7 !important;
      }
      @media (max-width: 760px) {
        html[data-aldus-theme="premium-stable"] #view-central-metas .central-time-legend-row strong {
          justify-self: start !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  ensureCentralTimeVisibilityStyles();

  const container = document.getElementById("centralGoalsCards");
  if (!container) return;

  function safeLogs() {
    try {
      return typeof centralTimeChartLogs === "function" ? centralTimeChartLogs() : [];
    } catch (error) {
      console.warn("[Central de Metas] Não foi possível consolidar o tempo real.", error);
      return [];
    }
  }

  function totalBetween(logs, start, end) {
    return logs.reduce((sum, log) => {
      const date = String(log?.date || "");
      if (!date || date < start || date > end) return sum;
      return sum + Math.max(0, Number(log?.minutes) || 0);
    }, 0);
  }

  function formatMinutes(minutes) {
    if (typeof formatHours === "function") return formatHours(minutes);
    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes % 60);
    return hours ? `${hours}h${rest ? ` ${rest}min` : ""}` : `${rest} min`;
  }

  function findCard(title) {
    return [...container.querySelectorAll(".goal-central-card")].find(
      (card) => card.querySelector("h3")?.textContent.trim() === title
    );
  }

  function setMetric(card, key, label, minutes) {
    const grid = card?.querySelector(".card-meta-grid");
    if (!grid) return;
    let row = [...grid.querySelectorAll("span")].find(
      (span) => span.dataset.centralRealTime === key || span.textContent.trim().startsWith(`${label}:`)
    );
    if (!row) {
      row = document.createElement("span");
      grid.appendChild(row);
    }
    row.dataset.centralRealTime = key;
    row.dataset.centralRealTimeVersion = PATCH_VERSION;
    const nextText = `${label}: ${formatMinutes(minutes)}`;
    if (row.textContent !== nextText) row.textContent = nextText;
  }

  function updateCentralRealTimes() {
    if (!container.isConnected) return;
    const today = typeof todayISO === "function"
      ? todayISO()
      : new Date().toLocaleDateString("en-CA");
    const weekStartDate = typeof weekStart === "function" ? weekStart(today) : today;
    const weekEndDate = typeof addDays === "function" ? addDays(weekStartDate, 6) : today;
    const parsedToday = typeof parseDate === "function" ? parseDate(today) : new Date(`${today}T00:00:00`);
    const monthStartDate = `${today.slice(0, 7)}-01`;
    const monthEndDate = `${today.slice(0, 7)}-${String(new Date(parsedToday.getFullYear(), parsedToday.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
    const logs = safeLogs();

    setMetric(findCard("Hoje"), "day", "Horas já cumpridas", totalBetween(logs, today, today));
    setMetric(findCard("Esta semana"), "week", "Horas já cumpridas", totalBetween(logs, weekStartDate, weekEndDate));
    setMetric(findCard("Este mês"), "month", "Horas já cumpridas", totalBetween(logs, monthStartDate, monthEndDate));
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateCentralRealTimes();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(container, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", scheduleUpdate);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleUpdate();
  });
  scheduleUpdate();
})();

(() => {
  if (window.__aldusFactoryFinalReviewLoaderV128) return;
  window.__aldusFactoryFinalReviewLoaderV128 = true;
  const script = document.createElement("script");
  script.src = "factory-final-review-v128.js?v=20260722-revisao-consolidacao-v128-rodape-fix1";
  script.async = false;
  script.dataset.aldusFactoryFinalReview = "v128";
  document.head.appendChild(script);
})();

(() => {
  if (window.__aldusCalendarMonthVisibilityLoaderV131) return;
  window.__aldusCalendarMonthVisibilityLoaderV131 = true;
  const script = document.createElement("script");
  script.src = "calendar-month-visibility-v131.js?v=20260722-calendario-cache-estavel-v131";
  script.async = false;
  script.dataset.aldusCalendarMonthVisibility = "v131";
  document.head.appendChild(script);
})();
