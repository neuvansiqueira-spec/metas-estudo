(() => {
  "use strict";

  if (window.__aldusAnalyticsCollapsiblesV145) return;
  window.__aldusAnalyticsCollapsiblesV145 = true;

  const VERSION = "20260725-analise-estrategica-recolhivel-v145";
  const view = document.getElementById("view-analise-estrategica");
  if (!view) return;

  const openState = new Map();
  let observer = null;
  let scheduled = false;
  let mutating = false;

  function ensureStyles() {
    if (document.getElementById("analyticsCollapsiblesStylesV145")) return;
    const style = document.createElement("style");
    style.id = "analyticsCollapsiblesStylesV145";
    style.textContent = `
      #view-analise-estrategica .analytics-collapse-toolbar-v145 {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 9px;
        margin: 0 0 14px;
      }
      #view-analise-estrategica .analytics-collapse-toolbar-v145 button {
        min-height: 38px;
        padding: 8px 13px;
        border-radius: 11px;
      }
      #view-analise-estrategica details.analytics-collapsible-v145 {
        overflow: clip;
        margin: 0 0 14px;
        border: 1px solid var(--border, #dbe4f0);
        border-radius: 18px;
        background: var(--surface, #ffffff);
        box-shadow: 0 8px 22px rgba(15, 23, 42, .06);
      }
      #view-analise-estrategica details.analytics-collapsible-v145 > summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 62px;
        padding: 14px 17px;
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      #view-analise-estrategica details.analytics-collapsible-v145 > summary::-webkit-details-marker { display: none; }
      #view-analise-estrategica .analytics-collapsible-heading-v145 {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      #view-analise-estrategica .analytics-collapsible-heading-v145 strong {
        color: var(--text, #0f172a);
        font-size: 1rem;
        line-height: 1.25;
      }
      #view-analise-estrategica .analytics-collapsible-heading-v145 small {
        overflow: hidden;
        color: var(--muted, #64748b);
        font-size: .79rem;
        line-height: 1.35;
        text-overflow: ellipsis;
      }
      #view-analise-estrategica .analytics-collapsible-chevron-v145 {
        width: 11px;
        height: 11px;
        flex: 0 0 11px;
        border-right: 2px solid currentColor;
        border-bottom: 2px solid currentColor;
        color: var(--muted, #64748b);
        transform: rotate(-45deg);
        transition: transform .18s ease;
      }
      #view-analise-estrategica details.analytics-collapsible-v145[open] > summary .analytics-collapsible-chevron-v145 {
        transform: rotate(45deg) translate(-2px, -2px);
      }
      #view-analise-estrategica details.analytics-collapsible-v145[open] > summary {
        border-bottom: 1px solid var(--border, #dbe4f0);
      }
      #view-analise-estrategica .analytics-collapsible-body-v145 {
        padding: 16px 17px 18px;
      }
      #view-analise-estrategica .analytics-intro-shell-v145 {
        border-color: rgba(213, 169, 29, .78) !important;
      }
      #view-analise-estrategica .analytics-intro-source-v145 {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      #view-analise-estrategica .analytics-intro-source-v145 > .eyebrow,
      #view-analise-estrategica .analytics-intro-source-v145 > h2 {
        display: none !important;
      }
      #view-analise-estrategica .analytics-intro-source-v145 .privacy-note,
      #view-analise-estrategica .analytics-export-toolbar,
      #view-analise-estrategica .analytics-compact-header,
      #view-analise-estrategica #analyticsPracticalReadingV143,
      #view-analise-estrategica #analyticsPlanPreview {
        margin: 0 !important;
      }
      #view-analise-estrategica .analytics-export-shell-v145 .analytics-collapsible-body-v145 {
        padding-top: 12px;
      }
      html[data-aldus-theme="premium-stable"] #view-analise-estrategica details.analytics-collapsible-v145 {
        border-color: rgba(95, 168, 216, .42);
        background: rgba(6, 30, 49, .86);
        box-shadow: 0 12px 28px rgba(0, 7, 18, .28);
      }
      html[data-aldus-theme="premium-stable"] #view-analise-estrategica details.analytics-collapsible-v145 > summary {
        background: linear-gradient(145deg, rgba(9, 49, 78, .92), rgba(7, 35, 58, .96));
      }
      html[data-aldus-theme="premium-stable"] #view-analise-estrategica .analytics-collapsible-heading-v145 strong {
        color: #f8fbff;
      }
      html[data-aldus-theme="premium-stable"] #view-analise-estrategica .analytics-collapsible-heading-v145 small,
      html[data-aldus-theme="premium-stable"] #view-analise-estrategica .analytics-collapsible-chevron-v145 {
        color: #c9deed;
      }
      @media (max-width: 720px) {
        #view-analise-estrategica .analytics-collapse-toolbar-v145 { justify-content: stretch; }
        #view-analise-estrategica .analytics-collapse-toolbar-v145 button { flex: 1 1 140px; }
        #view-analise-estrategica details.analytics-collapsible-v145 > summary { padding: 13px 14px; }
        #view-analise-estrategica .analytics-collapsible-body-v145 { padding: 14px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #view-analise-estrategica .analytics-collapsible-chevron-v145 { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function directChildWithClass(parent, className) {
    return [...parent.children].find((child) => child.classList?.contains(className)) || null;
  }

  function detailsKey(details) {
    if (!details || details.tagName !== "DETAILS") return "";
    if (details.dataset.analyticsCollapsibleKeyV145) return details.dataset.analyticsCollapsibleKeyV145;
    if (details.classList.contains("analytics-filters-section")) return "core:filters";
    if (details.dataset.analyticsSection) return `core:${details.dataset.analyticsSection}`;
    if (details.classList.contains("analytics-subsection")) {
      const parent = details.closest("details[data-analytics-section]");
      const title = details.querySelector(":scope > summary")?.textContent?.trim() || "subsecao";
      return `sub:${parent?.dataset.analyticsSection || "geral"}:${title}`;
    }
    return "";
  }

  function registerDetails(details, key, defaultOpen = details.open) {
    if (!details || details.tagName !== "DETAILS" || !key) return;
    details.dataset.analyticsCollapsibleKeyV145 = key;
    details.dataset.analyticsCollapsibleVersion = VERSION;
    if (openState.has(key)) details.open = openState.get(key);
    else openState.set(key, Boolean(defaultOpen));
  }

  function shellSummary(title, resume) {
    const summary = document.createElement("summary");
    summary.className = "analytics-collapsible-summary-v145";

    const heading = document.createElement("span");
    heading.className = "analytics-collapsible-heading-v145";

    const strong = document.createElement("strong");
    strong.textContent = title;
    heading.appendChild(strong);

    if (resume) {
      const small = document.createElement("small");
      small.textContent = resume;
      heading.appendChild(small);
    }

    const chevron = document.createElement("span");
    chevron.className = "analytics-collapsible-chevron-v145";
    chevron.setAttribute("aria-hidden", "true");
    summary.append(heading, chevron);
    return summary;
  }

  function wrapNode(node, { key, title, resume = "", defaultOpen = false, className = "" } = {}) {
    if (!node || !node.isConnected) return null;
    const existing = node.closest("details.analytics-collapsible-v145");
    if (existing) {
      registerDetails(existing, key || detailsKey(existing), defaultOpen);
      return existing;
    }

    const details = document.createElement("details");
    details.className = `analytics-collapsible-v145 ${className}`.trim();
    const summary = shellSummary(title || "Painel da análise", resume);
    const body = document.createElement("div");
    body.className = "analytics-collapsible-body-v145";

    node.before(details);
    details.append(summary, body);
    body.appendChild(node);
    node.dataset.analyticsCollapsibleWrappedV145 = "true";
    registerDetails(details, key, defaultOpen);
    return details;
  }

  function ensureIntroShell() {
    const intro = directChildWithClass(view, "section-heading");
    if (!intro) return view.querySelector('details[data-analytics-collapsible-key-v145="shell:intro"]');

    const eyebrow = intro.querySelector(":scope > .eyebrow")?.textContent?.trim() || "Diagnóstico local";
    const titleNode = intro.querySelector(":scope > h2");
    const title = titleNode?.textContent?.trim() || "Análise Estratégica";
    intro.classList.add("analytics-intro-source-v145");

    const shell = wrapNode(intro, {
      key: "shell:intro",
      title,
      resume: `${eyebrow} • privacidade e processamento local`,
      defaultOpen: false,
      className: "analytics-intro-shell-v145"
    });

    const summaryTitle = shell?.querySelector(".analytics-collapsible-heading-v145 strong");
    if (titleNode?.id && summaryTitle) {
      summaryTitle.id = titleNode.id;
      titleNode.removeAttribute("id");
    }
    return shell;
  }

  function ensureExportShell() {
    const toolbar = directChildWithClass(view, "analytics-export-toolbar");
    if (!toolbar) return view.querySelector('details[data-analytics-collapsible-key-v145="shell:export"]');
    return wrapNode(toolbar, {
      key: "shell:export",
      title: "Exportação e compartilhamento",
      resume: "PDF, imagem, Excel e demais opções",
      defaultOpen: false,
      className: "analytics-export-shell-v145"
    });
  }

  function dynamicPanelConfig(node) {
    if (node.classList?.contains("analytics-compact-header")) {
      return { key: "dynamic:context", title: "Contexto da análise", resume: "Período, disciplina e origem", defaultOpen: false, className: "analytics-context-shell-v145" };
    }
    if (node.id === "analyticsPracticalReadingV143") {
      return { key: "dynamic:practical", title: "Leitura prática", resume: "Avanço, atenção e próxima ação", defaultOpen: true, className: "analytics-practical-shell-v145" };
    }
    const heading = node.querySelector?.("h2, h3, h4")?.textContent?.trim();
    const identity = node.id || [...(node.classList || [])].find(Boolean) || String([...node.parentElement.children].indexOf(node));
    return { key: `dynamic:${identity}`, title: heading || "Painel da análise", resume: "Conteúdo complementar", defaultOpen: false, className: "analytics-generic-shell-v145" };
  }

  function ensureDynamicShells() {
    const host = document.getElementById("analyticsContent");
    if (!host) return;

    [...host.children].forEach((child) => {
      if (child.tagName === "DETAILS") return;
      if (!child.matches("article, section")) return;
      const config = dynamicPanelConfig(child);
      wrapNode(child, config);
    });
  }

  function ensurePlanPreviewShell() {
    const preview = document.getElementById("analyticsPlanPreview");
    if (!preview) return;
    const shell = wrapNode(preview, {
      key: "shell:plan-preview",
      title: "Plano sugerido",
      resume: "Ações geradas a partir da análise",
      defaultOpen: true,
      className: "analytics-plan-shell-v145"
    });
    if (shell) shell.hidden = preview.hidden || !preview.textContent.trim();
  }

  function ensureControls() {
    if (document.getElementById("analyticsCollapseToolbarV145")) return;
    const toolbar = document.createElement("div");
    toolbar.id = "analyticsCollapseToolbarV145";
    toolbar.className = "analytics-collapse-toolbar-v145";
    toolbar.setAttribute("aria-label", "Organização dos painéis da análise");
    toolbar.innerHTML = '<button type="button" class="secondary-button" data-analytics-collapse-v145="close">Recolher tudo</button><button type="button" class="secondary-button" data-analytics-collapse-v145="open">Abrir tudo</button>';

    const introShell = view.querySelector('details[data-analytics-collapsible-key-v145="shell:intro"]');
    if (introShell) introShell.after(toolbar);
    else view.prepend(toolbar);
  }

  function normalizeNativeDetails() {
    view.querySelectorAll("details.analytics-filters-section, details.analytics-section, details.analytics-subsection, details.analytics-collapsible-v145").forEach((details) => {
      const key = detailsKey(details);
      if (!key) return;
      registerDetails(details, key, details.open);
    });
  }

  function topLevelDetails() {
    const host = document.getElementById("analyticsContent");
    const direct = [...view.children].filter((child) => child.tagName === "DETAILS");
    const dynamic = host ? [...host.children].filter((child) => child.tagName === "DETAILS") : [];
    return [...new Set([...direct, ...dynamic])].filter((details) => !details.hidden);
  }

  function setAll(open) {
    topLevelDetails().forEach((details) => {
      details.open = open;
      const key = detailsKey(details);
      if (key) openState.set(key, open);
    });
  }

  function processPanels() {
    if (mutating) return;
    mutating = true;
    try {
      ensureStyles();
      ensureIntroShell();
      ensureControls();
      ensureExportShell();
      ensureDynamicShells();
      ensurePlanPreviewShell();
      normalizeNativeDetails();
    } finally {
      mutating = false;
    }
  }

  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(() => {
      scheduled = false;
      processPanels();
    }, 0);
  }

  view.addEventListener("toggle", (event) => {
    const details = event.target;
    if (details?.tagName !== "DETAILS") return;
    const key = detailsKey(details);
    if (key) openState.set(key, details.open);
  }, true);

  view.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-analytics-collapse-v145]");
    if (!button) return;
    setAll(button.dataset.analyticsCollapseV145 === "open");
  });

  processPanels();
  observer = new MutationObserver(scheduleProcess);
  observer.observe(view, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("hashchange", scheduleProcess);
  window.addEventListener("pageshow", scheduleProcess);

  view.dataset.analyticsCollapsiblesV145 = "true";
  view.dataset.analyticsCollapsiblesVersion = VERSION;
})();
