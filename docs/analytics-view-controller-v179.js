(() => {
  "use strict";

  if (globalThis.__aldusAnalyticsViewControllerV179) return;

  const VERSION = "20260729-analise-controlador-unico-v179";
  const VIEW_ID = "analise-estrategica";
  const VIEW_SELECTOR = `#view-${VIEW_ID}`;
  const openState = new Map();
  const runtime = {
    version: VERSION,
    initialized: false,
    observerCount: 0,
    processRuns: 0,
    scheduledRuns: 0
  };
  let observer = null;
  let scheduled = false;
  let mutating = false;

  function elementFromTarget(target) {
    if (target instanceof Element) return target;
    return target?.parentElement instanceof Element ? target.parentElement : null;
  }

  function directChildWithClass(parent, className) {
    return [...(parent?.children || [])].find((child) => child.classList?.contains(className)) || null;
  }

  function detailsKey(details) {
    if (!details || details.tagName !== "DETAILS") return "";
    if (details.dataset.analyticsControllerKeyV179) return details.dataset.analyticsControllerKeyV179;
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

  function registerDetails(details, key, defaultOpen = details?.open) {
    if (!details || details.tagName !== "DETAILS" || !key) return;
    details.dataset.analyticsControllerKeyV179 = key;
    details.dataset.analyticsControllerVersion = VERSION;
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
    const body = document.createElement("div");
    body.className = "analytics-collapsible-body-v145";

    node.before(details);
    details.append(shellSummary(title || "Painel da análise", resume), body);
    body.appendChild(node);
    node.dataset.analyticsControllerWrappedV179 = "true";
    registerDetails(details, key, defaultOpen);
    return details;
  }

  function fixedHeader(view) {
    let wrapper = view.querySelector(":scope > .analytics-fixed-header-v149");
    if (wrapper) return wrapper;

    const legacyIntroShell = view.querySelector(':scope > details[data-analytics-collapsible-key-v145="shell:intro"]');
    const heading = legacyIntroShell?.querySelector(".section-heading")
      || directChildWithClass(view, "section-heading");
    if (!heading) return null;

    wrapper = document.createElement("div");
    wrapper.className = "analytics-fixed-header-v149";
    wrapper.dataset.analyticsControllerVersion = VERSION;
    heading.classList.remove("analytics-intro-source-v145");
    heading.classList.add("view-identity-heading");
    const title = heading.querySelector("h2");
    if (title) title.id = "analise-estrategica-title";

    const anchor = legacyIntroShell || heading;
    anchor.before(wrapper);
    wrapper.appendChild(heading);
    legacyIntroShell?.remove();
    return wrapper;
  }

  function normalizeFilters(view) {
    const details = view.querySelector(":scope > details.analytics-filters-section");
    if (!details) return null;

    details.classList.add("analytics-collapsible-v145", "analytics-filter-shell-v149");
    registerDetails(details, "core:filters", details.open);

    const summary = details.querySelector(":scope > summary");
    if (!summary) return details;

    summary.classList.add("analytics-collapsible-summary-v145");
    let heading = summary.querySelector(":scope > .analytics-collapsible-heading-v145");
    let chevron = summary.querySelector(":scope > .analytics-collapsible-chevron-v145");

    if (!heading) {
      const titleText = summary.textContent.trim() || "Filtros da análise";
      heading = document.createElement("span");
      heading.className = "analytics-collapsible-heading-v145";
      const strong = document.createElement("strong");
      strong.textContent = titleText;
      heading.appendChild(strong);
    }

    if (!chevron) {
      chevron = document.createElement("span");
      chevron.className = "analytics-collapsible-chevron-v145";
      chevron.setAttribute("aria-hidden", "true");
    }

    if (summary.firstElementChild !== heading || summary.lastElementChild !== chevron || summary.children.length !== 2) {
      summary.replaceChildren(heading, chevron);
    }
    summary.dataset.analyticsSingleArrowV150 = "consolidated-v179";
    return details;
  }

  function ensureExportShell(view) {
    const toolbar = directChildWithClass(view, "analytics-export-toolbar");
    if (!toolbar) return view.querySelector('[data-analytics-controller-key-v179="shell:export"]');
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
      return {
        key: "dynamic:context",
        title: "Contexto da análise",
        resume: "Período, disciplina e origem",
        defaultOpen: false,
        className: "analytics-context-shell-v145"
      };
    }
    if (node.id === "analyticsPracticalReadingV143") {
      return {
        key: "dynamic:practical",
        title: "Leitura prática",
        resume: "Avanço, atenção e próxima ação",
        defaultOpen: true,
        className: "analytics-practical-shell-v145"
      };
    }
    const heading = node.querySelector?.("h2, h3, h4")?.textContent?.trim();
    const identity = node.id
      || [...(node.classList || [])].find(Boolean)
      || String([...node.parentElement.children].indexOf(node));
    return {
      key: `dynamic:${identity}`,
      title: heading || "Painel da análise",
      resume: "Conteúdo complementar",
      defaultOpen: false,
      className: "analytics-generic-shell-v145"
    };
  }

  function ensureDynamicShells() {
    const host = document.getElementById("analyticsContent");
    if (!host) return;
    [...host.children].forEach((child) => {
      if (child.tagName === "DETAILS" || !child.matches("article, section")) return;
      wrapNode(child, dynamicPanelConfig(child));
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

  function syncDetails(details) {
    const summary = details?.firstElementChild;
    if (summary?.tagName !== "SUMMARY") return;
    summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    summary.dataset.analyticsControllerV179 = "true";
    details.dataset.analyticsControllerV179 = "true";
    details.dataset.analyticsControllerVersion = VERSION;
  }

  function normalizeDetails(view) {
    view.querySelectorAll(
      "details.analytics-filters-section, details.analytics-section, details.analytics-subsection, details.analytics-collapsible-v145"
    ).forEach((details) => {
      const key = detailsKey(details);
      if (key) registerDetails(details, key, details.open);
      syncDetails(details);
    });
  }

  function ensureStyles() {
    if (document.getElementById("analyticsViewControllerStylesV179")) return;
    const style = document.createElement("style");
    style.id = "analyticsViewControllerStylesV179";
    style.textContent = `
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149{margin:0 0 28px}
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 > .section-heading{margin:0}
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 .eyebrow,
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 h2{display:block!important}
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 .privacy-note{margin:0}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145{overflow:clip;margin:0 0 14px;border:1px solid var(--border,#dbe4f0);border-radius:18px;background:var(--surface,#fff);box-shadow:0 8px 22px rgba(15,23,42,.06)}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:62px;padding:14px 17px;cursor:pointer;list-style:none;user-select:none;touch-action:manipulation}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary::-webkit-details-marker{display:none}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary::marker{content:""}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary::before,
      ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary::after{content:none!important;display:none!important}
      ${VIEW_SELECTOR} .analytics-collapsible-heading-v145{display:grid;gap:3px;min-width:0}
      ${VIEW_SELECTOR} .analytics-collapsible-heading-v145 strong{color:var(--text,#0f172a);font-size:1rem;line-height:1.25}
      ${VIEW_SELECTOR} .analytics-collapsible-heading-v145 small{overflow:hidden;color:var(--muted,#64748b);font-size:.79rem;line-height:1.35;text-overflow:ellipsis}
      ${VIEW_SELECTOR} .analytics-collapsible-chevron-v145{display:inline-block!important;width:11px;height:11px;flex:0 0 11px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;color:var(--muted,#64748b);visibility:visible!important;transform:rotate(-45deg);transition:transform .18s ease}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145[open] > summary .analytics-collapsible-chevron-v145{transform:rotate(45deg) translate(-2px,-2px)}
      ${VIEW_SELECTOR} details.analytics-collapsible-v145[open] > summary{border-bottom:1px solid var(--border,#dbe4f0)}
      ${VIEW_SELECTOR} .analytics-collapsible-body-v145{padding:16px 17px 18px}
      ${VIEW_SELECTOR} .analytics-export-toolbar,
      ${VIEW_SELECTOR} .analytics-compact-header,
      ${VIEW_SELECTOR} #analyticsPracticalReadingV143,
      ${VIEW_SELECTOR} #analyticsPlanPreview{margin:0!important}
      ${VIEW_SELECTOR} .analytics-export-shell-v145 .analytics-collapsible-body-v145{padding-top:12px}
      html[data-aldus-theme="premium-stable"] ${VIEW_SELECTOR} details.analytics-collapsible-v145{border-color:rgba(95,168,216,.42);background:rgba(6,30,49,.86);box-shadow:0 12px 28px rgba(0,7,18,.28)}
      html[data-aldus-theme="premium-stable"] ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary{background:linear-gradient(145deg,rgba(9,49,78,.92),rgba(7,35,58,.96))}
      html[data-aldus-theme="premium-stable"] ${VIEW_SELECTOR} .analytics-collapsible-heading-v145 strong{color:#f8fbff}
      html[data-aldus-theme="premium-stable"] ${VIEW_SELECTOR} .analytics-collapsible-heading-v145 small,
      html[data-aldus-theme="premium-stable"] ${VIEW_SELECTOR} .analytics-collapsible-chevron-v145{color:#c9deed}
      @media(max-width:720px){
        ${VIEW_SELECTOR} > .analytics-fixed-header-v149{margin-bottom:20px}
        ${VIEW_SELECTOR} details.analytics-collapsible-v145 > summary{padding:13px 14px}
        ${VIEW_SELECTOR} .analytics-collapsible-body-v145{padding:14px}
      }
      @media(prefers-reduced-motion:reduce){
        ${VIEW_SELECTOR} .analytics-collapsible-chevron-v145{transition:none}
      }
    `;
    document.head.appendChild(style);
  }

  function processView(view) {
    if (!view?.isConnected || mutating) return;
    mutating = true;
    runtime.processRuns += 1;
    try {
      ensureStyles();
      fixedHeader(view);
      normalizeFilters(view);
      ensureExportShell(view);
      ensureDynamicShells();
      ensurePlanPreviewShell();
      normalizeDetails(view);
      view.querySelector("#analyticsCollapseToolbarV145")?.remove();
      view.dataset.analyticsViewControllerV179 = "true";
      view.dataset.analyticsViewControllerVersion = VERSION;
    } finally {
      mutating = false;
    }
  }

  function scheduleProcess(view) {
    if (scheduled) return;
    scheduled = true;
    runtime.scheduledRuns += 1;
    const schedule = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout(callback, 0));
    schedule(() => {
      scheduled = false;
      processView(view);
    });
  }

  function directDetailsForSummary(summary, view) {
    if (!(summary instanceof HTMLElement) || summary.tagName !== "SUMMARY") return null;
    const details = summary.parentElement;
    if (!(details instanceof HTMLDetailsElement) || !view.contains(details)) return null;
    return details.firstElementChild === summary ? details : null;
  }

  function interactiveChild(target, summary) {
    const element = elementFromTarget(target);
    if (!element || element === summary) return false;
    const interactive = element.closest("a,button,input,select,textarea,label,[role='button'],[contenteditable='true']");
    return Boolean(interactive && summary.contains(interactive));
  }

  function toggleFromEvent(event) {
    const element = elementFromTarget(event.target);
    const view = element?.closest?.(VIEW_SELECTOR);
    if (!view) return;
    const summary = element.closest?.("summary");
    const details = directDetailsForSummary(summary, view);
    if (!details || interactiveChild(element, summary)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    details.open = !details.open;
    syncDetails(details);
    const key = detailsKey(details);
    if (key) openState.set(key, details.open);
  }

  function initialize() {
    const view = document.querySelector(VIEW_SELECTOR);
    if (!view || runtime.initialized) return;

    processView(view);
    document.addEventListener("click", toggleFromEvent, true);
    view.addEventListener("toggle", (event) => {
      if (!(event.target instanceof HTMLDetailsElement)) return;
      syncDetails(event.target);
      const key = detailsKey(event.target);
      if (key) openState.set(key, event.target.open);
    }, true);

    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        if (!mutating) scheduleProcess(view);
      });
      observer.observe(view, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden"]
      });
      runtime.observerCount = 1;
    }
    runtime.initialized = true;
  }

  Object.defineProperty(globalThis, "__aldusAnalyticsViewControllerV179", {
    value: runtime,
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (typeof globalThis.__aldusDeferViewInitializerV169 === "function") {
    globalThis.__aldusDeferViewInitializerV169(
      "analytics-view-controller-v179",
      VIEW_ID,
      initialize
    );
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
