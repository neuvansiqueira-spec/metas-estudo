(() => {
  "use strict";

  const VERSION = "20260810-questoes-integradas-v298";
  const QUESTION_VIEWS = new Set(["banco-questoes", "questoes", "historico-questoes"]);

  function activeView() {
    return document.documentElement.dataset.activeView
      || String(window.location.hash || "").replace(/^#/, "")
      || "dashboard";
  }

  function syncQuestionsMenu(target = activeView()) {
    const active = QUESTION_VIEWS.has(target);
    document.querySelectorAll('[data-view-group="questions"]').forEach((link) => {
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("aldus:view-active", (event) => {
    syncQuestionsMenu(event.detail?.view);
  });
  window.addEventListener("hashchange", () => setTimeout(() => syncQuestionsMenu(), 0));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => syncQuestionsMenu(), { once: true });
  } else {
    syncQuestionsMenu();
  }

  globalThis.__aldusQuestionsHubV298 = Object.freeze({ version: VERSION, views: [...QUESTION_VIEWS] });
})();
