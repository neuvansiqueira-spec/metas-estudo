(() => {
  "use strict";

  const VERSION = "20260813-simulados-no-hub-questoes-v322";
  const QUESTION_VIEWS = new Set(["banco-questoes", "questoes", "simulados", "historico-questoes"]);
  const HUB_TABS = Object.freeze([
    { view: "banco-questoes", title: "Banco", subtitle: "Resolver" },
    { view: "questoes", title: "Registrar", subtitle: "Resultado externo" },
    { view: "simulados", title: "Simulados", subtitle: "Gerar e resolver" },
    { view: "historico-questoes", title: "Desempenho", subtitle: "Histórico unificado" }
  ]);

  function activeView() {
    return document.documentElement.dataset.activeView
      || String(window.location.hash || "").replace(/^#/, "")
      || "dashboard";
  }

  function buildHubHeader() {
    const header = document.createElement("header");
    header.className = "questions-hub";
    header.dataset.questionsHub = "";
    header.dataset.questionsHubGenerated = "v322";

    const copy = document.createElement("div");
    copy.className = "questions-hub-copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Módulo integrado";

    const title = document.createElement("strong");
    title.textContent = "Questões";

    const description = document.createElement("span");
    description.textContent = "Banco, registro, simulados e desempenho no mesmo fluxo.";

    copy.append(eyebrow, title, description);

    const nav = document.createElement("nav");
    nav.className = "questions-hub-tabs";
    nav.setAttribute("aria-label", "Áreas de questões");

    header.append(copy, nav);
    return header;
  }

  function rebuildTabs(nav) {
    if (!(nav instanceof HTMLElement)) return;

    nav.replaceChildren(...HUB_TABS.map(({ view, title, subtitle }) => {
      const link = document.createElement("a");
      link.className = "questions-hub-tab";
      link.href = `#${view}`;
      link.dataset.viewLink = view;

      const strong = document.createElement("strong");
      strong.textContent = title;

      const small = document.createElement("small");
      small.textContent = subtitle;

      link.append(strong, small);
      return link;
    }));
  }

  function normalizeHub(header) {
    if (!(header instanceof HTMLElement)) return;

    const copyDescription = header.querySelector(".questions-hub-copy > span");
    if (copyDescription) {
      copyDescription.textContent = "Banco, registro, simulados e desempenho no mesmo fluxo.";
    }

    const nav = header.querySelector(".questions-hub-tabs");
    if (nav) rebuildTabs(nav);
  }

  function ensureSimuladosHub() {
    const view = document.querySelector('#view-simulados[data-view="simulados"]');
    if (!view) return;

    let hub = view.querySelector(":scope > .questions-hub");
    if (!hub) {
      hub = buildHubHeader();
      view.prepend(hub);
    }
    normalizeHub(hub);
  }

  function removeStandaloneSimuladosMenuEntries() {
    document.querySelectorAll(
      '.mobile-menu-group a[data-view-link="simulados"], .side-nav-group a[data-view-link="simulados"]'
    ).forEach((link) => link.remove());
  }

  function ensureQuestionsHub() {
    document.querySelectorAll("[data-questions-hub]").forEach(normalizeHub);
    ensureSimuladosHub();
    removeStandaloneSimuladosMenuEntries();
  }

  function syncQuestionsMenu(target = activeView()) {
    const active = QUESTION_VIEWS.has(target);
    document.querySelectorAll('[data-view-group="questions"]').forEach((link) => {
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function syncHubTabs(target = activeView()) {
    document.querySelectorAll(".questions-hub-tab[data-view-link]").forEach((link) => {
      const active = link.dataset.viewLink === target;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function syncAll(target = activeView()) {
    ensureQuestionsHub();
    syncQuestionsMenu(target);
    syncHubTabs(target);
  }

  window.addEventListener("aldus:view-active", (event) => {
    syncAll(event.detail?.view || activeView());
  });

  window.addEventListener("hashchange", () => {
    setTimeout(() => syncAll(), 0);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => syncAll(), { once: true });
  } else {
    syncAll();
  }

  globalThis.__aldusQuestionsHubV298 = Object.freeze({
    version: VERSION,
    views: [...QUESTION_VIEWS],
    tabs: HUB_TABS.map((tab) => ({ ...tab }))
  });
})();
