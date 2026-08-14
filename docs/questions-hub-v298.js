(() => {
  "use strict";

  const VERSION = "20260814-gerador-simulados-em-questoes-v328";
  const QUESTION_VIEWS = new Set(["banco-questoes", "simulados", "questoes", "historico-questoes"]);
  const STYLE_ID = "aldusQuestionsHubSimuladosV328";
  const LAYOUT_VERSION = "v328";

  function activeView() {
    return document.documentElement.dataset.activeView
      || String(window.location.hash || "").replace(/^#/, "")
      || "dashboard";
  }

  function hubMarkup() {
    return '<div class="questions-hub-copy"><p class="eyebrow">Módulo integrado</p><strong>Questões</strong><span>Banco, simulados, registro e desempenho no mesmo fluxo.</span></div>' +
      '<nav class="questions-hub-tabs" aria-label="Áreas de questões">' +
        '<a class="questions-hub-tab" href="#banco-questoes" data-view-link="banco-questoes"><strong>Banco</strong><small>Resolver</small></a>' +
        '<a class="questions-hub-tab" href="#simulados" data-view-link="simulados"><strong>Simulados</strong><small>Gerar e resolver</small></a>' +
        '<a class="questions-hub-tab" href="#questoes" data-view-link="questoes"><strong>Registrar</strong><small>Resultado externo</small></a>' +
        '<a class="questions-hub-tab" href="#historico-questoes" data-view-link="historico-questoes"><strong>Desempenho</strong><small>Histórico unificado</small></a>' +
      '</nav>';
  }

  function ensureResponsiveLayout() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".questions-hub-tabs{grid-template-columns:repeat(4,minmax(0,1fr));}",
      "@media (max-width:820px){.questions-hub-tabs{grid-template-columns:repeat(2,minmax(0,1fr));}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function applyHubLayout(hub) {
    if (!hub || hub.dataset.layoutVersion === LAYOUT_VERSION) return;
    hub.innerHTML = hubMarkup();
    hub.dataset.layoutVersion = LAYOUT_VERSION;
  }

  function ensureSimuladosHub() {
    const view = document.getElementById("view-simulados");
    if (!view) return;

    let hub = Array.from(view.children).find((child) => child.matches?.("header.questions-hub[data-questions-hub]"));
    if (!hub) {
      hub = document.createElement("header");
      hub.className = "questions-hub";
      hub.dataset.questionsHub = "";
      view.prepend(hub);
    }
    applyHubLayout(hub);
  }

  function removeStandaloneSimuladosNavigation() {
    document.querySelectorAll('.mobile-menu-group a[data-view-link="simulados"], .side-nav-group a[data-view-link="simulados"]').forEach((link) => {
      link.remove();
    });
  }

  function placeGeneratorInSimulados() {
    const builder = document.getElementById("factorySimuladoBuilderV310");
    const view = document.getElementById("view-simulados");
    if (!builder || !view || builder.closest("#view-simulados")) return false;
    const hub = Array.from(view.children).find((child) => child.matches?.("header.questions-hub[data-questions-hub]"));
    if (hub) hub.insertAdjacentElement("afterend", builder);
    else view.prepend(builder);
    return true;
  }

  function integrateQuestionsHub() {
    ensureResponsiveLayout();
    document.querySelectorAll("header.questions-hub[data-questions-hub]").forEach(applyHubLayout);
    ensureSimuladosHub();
    placeGeneratorInSimulados();
    removeStandaloneSimuladosNavigation();
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
    document.querySelectorAll(".questions-hub-tab[data-view-link]").forEach((tab) => {
      const active = tab.dataset.viewLink === target;
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  function syncAll(target = activeView()) {
    integrateQuestionsHub();
    syncQuestionsMenu(target);
    syncHubTabs(target);
  }

  window.addEventListener("aldus:view-active", (event) => {
    syncAll(event.detail?.view || activeView());
  });
  window.addEventListener("hashchange", () => setTimeout(() => syncAll(), 0));

  const generatorObserver = new MutationObserver(() => placeGeneratorInSimulados());
  generatorObserver.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => syncAll(), { once: true });
  } else {
    syncAll();
  }

  globalThis.__aldusQuestionsHubV298 = Object.freeze({ version: VERSION, views: [...QUESTION_VIEWS] });
})();
