(() => {
  "use strict";

  const VERSION = "20260805-central-period-cards-v248";
  const container = document.getElementById("centralGoalsCards");
  if (!container) return;

  const periods = new Map([
    ["Hoje", "today"],
    ["Esta semana", "week"],
    ["Este mês", "month"]
  ]);

  function applyPeriodMarkers() {
    for (const card of container.querySelectorAll(":scope > .goal-central-card")) {
      const title = card.querySelector("h3")?.textContent.trim() || "";
      const period = periods.get(title);
      if (period) {
        card.dataset.centralPeriod = period;
        card.dataset.centralPeriodVersion = VERSION;
      } else {
        delete card.dataset.centralPeriod;
        delete card.dataset.centralPeriodVersion;
      }
    }
  }

  const observer = new MutationObserver(applyPeriodMarkers);
  observer.observe(container, { childList: true, subtree: true, characterData: true });
  applyPeriodMarkers();
})();
