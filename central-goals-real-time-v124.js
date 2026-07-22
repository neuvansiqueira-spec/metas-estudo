(() => {
  const PATCH_VERSION = "20260721-central-tempo-real-v124";
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
