(() => {
  "use strict";

  const VERSION = "20260805-daily-summary-elegant-v250";
  const container = document.getElementById("dailyGoalsSummary");
  if (!container) return;

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const rules = [
    [/metas concluidas/, "completed"],
    [/metas pendentes/, "pending"],
    [/tempo planejado/, "planned"],
    [/tempo realizado/, "realized"],
    [/historico de estudo registrado/, "history"],
    [/questoes realizadas/, "questions"],
    [/progresso geral/, "progress"]
  ];

  function applyMarkers() {
    for (const card of container.querySelectorAll(":scope > .stat-card")) {
      const text = normalize(card.textContent);
      const match = rules.find(([pattern]) => pattern.test(text));
      if (match) {
        card.dataset.dailySummaryKind = match[1];
        card.dataset.dailySummaryElegantVersion = VERSION;
      } else {
        delete card.dataset.dailySummaryKind;
        delete card.dataset.dailySummaryElegantVersion;
      }
    }
  }

  const observer = new MutationObserver(applyMarkers);
  observer.observe(container, { childList: true, subtree: true, characterData: true });
  applyMarkers();
})();
