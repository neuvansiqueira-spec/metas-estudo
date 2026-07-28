(() => {
  "use strict";

  const PATCH_VERSION = "20260727-fabrica-simples-recolhivel-v163";
  const SESSION_PREFIX = "aldus.factory.ui.v163.";

  if (typeof document === "undefined" || globalThis.__ALDUS_FACTORY_SIMPLE_V163__) return;

  function directChild(view, selector) {
    return [...view.children].find((element) => element.matches?.(selector)) || null;
  }

  function injectStyles() {
    if (document.getElementById("factorySimpleStylesV163")) return;
    const style = document.createElement("style");
    style.id = "factorySimpleStylesV163";
    style.textContent = `
      #view-fabrica-resumos.factory-simple-v163 {
        display: grid;
        gap: 12px;
      }
      #view-fabrica-resumos.factory-simple-v163 > .section-heading {
        margin-bottom: 0;
      }
      #view-fabrica-resumos.factory-simple-v163 > .section-heading h2 {
        margin-bottom: 0;
      }
      #view-fabrica-resumos.factory-simple-v163 .factory-simple-intro-v163 {
        margin: -2px 0 2px;
        color: var(--muted, #a9bfd0);
        font-size: .94rem;
        line-height: 1.45;
      }
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel {
        margin: 0;
        overflow: clip;
        border: 1px solid rgba(126, 167, 198, .34);
        border-radius: 16px;
        background: rgba(4, 29, 49, .56);
        box-shadow: none;
      }
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 58px;
        padding: 14px 18px;
        cursor: pointer;
        list-style: none;
        color: var(--text, #f4f9fd);
        font-weight: 800;
      }
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary::-webkit-details-marker,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary::-webkit-details-marker,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary::-webkit-details-marker {
        display: none;
      }
      #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary::after {
        content: "⌄";
        flex: 0 0 auto;
        font-size: 1.25rem;
        line-height: 1;
        transform: rotate(-90deg);
        transition: transform .18s ease;
      }
      #view-fabrica-resumos.factory-simple-v163 > details[open].factory-top-panel-v163 > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details[open].factory-filter-panel > summary::after,
      #view-fabrica-resumos.factory-simple-v163 > details[open].factory-register-panel > summary::after {
        transform: rotate(0deg);
      }
      #view-fabrica-resumos.factory-simple-v163 .factory-panel-title-v163 {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      #view-fabrica-resumos.factory-simple-v163 .factory-panel-title-v163 strong {
        font-size: 1rem;
      }
      #view-fabrica-resumos.factory-simple-v163 .factory-panel-title-v163 small {
        color: var(--muted, #a9bfd0);
        font-size: .8rem;
        font-weight: 650;
      }
      #view-fabrica-resumos.factory-simple-v163 .factory-top-content-v163,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > .factory-filter-actions,
      #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > .factory-form {
        margin: 0;
        padding: 4px 18px 18px;
      }
      #view-fabrica-resumos.factory-simple-v163 #factoryOverviewPanelV163 .factory-summary {
        margin: 0 0 12px;
      }
      #view-fabrica-resumos.factory-simple-v163 #factoryOverviewPanelV163 .factory-production-tabs {
        margin: 0;
      }
      #view-fabrica-resumos.factory-simple-v163 #factoryProductionPanelV163 .factory-list {
        margin: 0;
      }
      #view-fabrica-resumos.factory-simple-v163 #factoryPromptPanelV163 .factory-settings-actions {
        margin: 0 0 12px;
      }
      #view-fabrica-resumos.factory-simple-v163 #factoryPromptPanelV163 .factory-prompt-library {
        margin: 0;
      }
      #view-fabrica-resumos.factory-simple-v163 #factoryInfoPanelV163 .notice {
        margin: 0;
        padding: 14px;
        font-size: .9rem;
        line-height: 1.5;
      }
      #view-fabrica-resumos.factory-simple-v163 .factory-scope-notice {
        margin-top: 0;
      }
      @media (max-width: 720px) {
        #view-fabrica-resumos.factory-simple-v163 {
          gap: 10px;
        }
        #view-fabrica-resumos.factory-simple-v163 > details.factory-top-panel-v163 > summary,
        #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > summary,
        #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > summary {
          min-height: 54px;
          padding: 13px 14px;
        }
        #view-fabrica-resumos.factory-simple-v163 .factory-top-content-v163,
        #view-fabrica-resumos.factory-simple-v163 > details.factory-filter-panel > .factory-filter-actions,
        #view-fabrica-resumos.factory-simple-v163 > details.factory-register-panel > .factory-form {
          padding: 2px 14px 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function summaryMarkup(title, hint) {
    return `<span class="factory-panel-title-v163"><strong>${title}</strong><small>${hint}</small></span>`;
  }

  function createPanel(id, title, hint) {
    const details = document.createElement("details");
    details.id = id;
    details.className = "factory-top-panel-v163";

    const summary = document.createElement("summary");
    summary.innerHTML = summaryMarkup(title, hint);

    const content = document.createElement("div");
    content.className = "factory-top-content-v163";

    details.append(summary, content);
    return { details, content };
  }

  function setExistingSummary(details, title, hint) {
    const summary = details?.querySelector(":scope > summary");
    if (!summary) return;
    summary.innerHTML = summaryMarkup(title, hint);
  }

  function bindOpenState(details, key, defaultOpen) {
    if (!details || details.dataset.factoryUiStateV163 === "true") return;
    details.dataset.factoryUiStateV163 = "true";
    const storageKey = `${SESSION_PREFIX}${key}`;
    try {
      const stored = sessionStorage.getItem(storageKey);
      details.open = stored === null ? defaultOpen : stored === "open";
    } catch {
      details.open = defaultOpen;
    }
    details.addEventListener("toggle", () => {
      try {
        sessionStorage.setItem(storageKey, details.open ? "open" : "closed");
      } catch {}
    });
  }

  function installFactorySimpleUi() {
    const view = document.getElementById("view-fabrica-resumos");
    if (!view) return false;
    if (view.dataset.factorySimpleV163 === "true") return true;

    const heading = directChild(view, ".section-heading");
    const notice = directChild(view, "p.notice");
    const promptActions = directChild(view, ".factory-settings-actions");
    const promptPanel = document.getElementById("factoryPromptLibraryPanel");
    const factorySummary = document.getElementById("factorySummary");
    const productionTabs = directChild(view, ".factory-production-tabs");
    const filterPanel = directChild(view, "details.factory-filter-panel");
    const registerPanel = document.getElementById("factoryRegisterPanel");
    const factoryList = document.getElementById("factoryList");

    if (!heading || !notice || !promptActions || !promptPanel || !factorySummary || !productionTabs || !filterPanel || !registerPanel || !factoryList) {
      return false;
    }

    injectStyles();
    view.classList.add("factory-simple-v163");

    let intro = directChild(view, ".factory-simple-intro-v163");
    if (!intro) {
      intro = document.createElement("p");
      intro.className = "factory-simple-intro-v163";
      intro.textContent = "Produza, acompanhe e organize os materiais sem alterar os registros já salvos.";
      heading.after(intro);
    }

    let overview = document.getElementById("factoryOverviewPanelV163");
    if (!overview) {
      const panel = createPanel(
        "factoryOverviewPanelV163",
        "Visão geral e período",
        "Resumo da fila e escolha entre Plano do Dia e semana"
      );
      panel.content.append(factorySummary, productionTabs);
      overview = panel.details;
    }

    let production = document.getElementById("factoryProductionPanelV163");
    if (!production) {
      const panel = createPanel(
        "factoryProductionPanelV163",
        "Produção e temas",
        "Fila, tema atual, materiais e detalhes de cada item"
      );
      panel.content.append(factoryList);
      production = panel.details;
    }

    let prompts = document.getElementById("factoryPromptPanelV163");
    if (!prompts) {
      const panel = createPanel(
        "factoryPromptPanelV163",
        "Biblioteca de prompts",
        "Editar os modelos usados pela Fábrica"
      );
      panel.content.append(promptActions, promptPanel);
      prompts = panel.details;
    }

    let info = document.getElementById("factoryInfoPanelV163");
    if (!info) {
      const panel = createPanel(
        "factoryInfoPanelV163",
        "Informações e segurança",
        "Persistência, backup e sincronização"
      );
      panel.content.append(notice);
      info = panel.details;
    }

    filterPanel.classList.add("factory-top-existing-v163");
    registerPanel.classList.add("factory-top-existing-v163");
    setExistingSummary(filterPanel, "Filtros e etapas", "Mostrar somente o estágio necessário");
    setExistingSummary(registerPanel, "Cadastrar ou editar tema", "Formulário completo preservado");

    [overview, production, filterPanel, registerPanel, prompts, info].forEach((panel) => view.appendChild(panel));

    bindOpenState(overview, "overview", true);
    bindOpenState(production, "production", true);
    bindOpenState(filterPanel, "filters", false);
    bindOpenState(registerPanel, "register", Boolean(document.getElementById("factoryEditingId")?.value));
    bindOpenState(prompts, "prompts", false);
    bindOpenState(info, "info", false);

    view.dataset.factorySimpleV163 = "true";
    Object.defineProperty(globalThis, "__ALDUS_FACTORY_SIMPLE_V163__", {
      value: Object.freeze({
        version: PATCH_VERSION,
        installedAt: new Date().toISOString(),
        persistence: "sessionStorage-only-for-open-state"
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
    return true;
  }

  function installOnce() {
    if (installFactorySimpleUi()) return;
    console.error("[Fábrica v163] A simplificação visual não pôde ser instalada. Nenhum dado foi alterado.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installOnce, { once: true });
  } else {
    installOnce();
  }
})();
