(() => {
  "use strict";

  if (window.__aldusAnalyticsHeaderArrowV149) return;
  window.__aldusAnalyticsHeaderArrowV149 = true;

  const VERSION = "20260725-analise-estrategica-cabecalho-fixo-v149";
  const VIEW_SELECTOR = "#view-analise-estrategica";
  let observer = null;
  let scheduled = false;
  let mutating = false;

  function fixedHeader(view) {
    let wrapper = view.querySelector(":scope > .analytics-fixed-header-v149");
    if (wrapper) return wrapper;

    const introShell = view.querySelector(':scope > details[data-analytics-collapsible-key-v145="shell:intro"]');
    const heading = introShell?.querySelector(".section-heading")
      || [...view.children].find((child) => child.classList?.contains("section-heading"));
    if (!heading) return null;

    wrapper = document.createElement("div");
    wrapper.className = "analytics-fixed-header-v149";
    wrapper.dataset.analyticsFixedHeaderVersion = VERSION;

    heading.classList.remove("analytics-intro-source-v145");
    heading.classList.add("view-identity-heading");
    const title = heading.querySelector("h2");
    if (title) title.id = "analise-estrategica-title";

    const anchor = introShell || heading;
    anchor.before(wrapper);
    wrapper.appendChild(heading);
    if (introShell) introShell.remove();
    return wrapper;
  }

  function normalizeFilters(view) {
    const details = view.querySelector(":scope > details.analytics-filters-section");
    if (!details) return null;

    details.classList.add("analytics-collapsible-v145", "analytics-filter-shell-v149");
    details.dataset.analyticsFilterArrowVersion = VERSION;

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
    summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    return details;
  }

  function ensureStyles() {
    if (document.getElementById("analyticsHeaderArrowStylesV149")) return;
    const style = document.createElement("style");
    style.id = "analyticsHeaderArrowStylesV149";
    style.textContent = `
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 {
        margin: 0 0 28px;
      }
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 > .section-heading {
        margin: 0;
      }
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 .eyebrow,
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 h2 {
        display: block !important;
      }
      ${VIEW_SELECTOR} > .analytics-fixed-header-v149 .privacy-note {
        margin: 0;
      }
      ${VIEW_SELECTOR} > details.analytics-filter-shell-v149 > summary {
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
      ${VIEW_SELECTOR} > details.analytics-filter-shell-v149 > summary::-webkit-details-marker {
        display: none;
      }
      ${VIEW_SELECTOR} > details.analytics-filter-shell-v149 > summary::marker {
        content: "";
      }
      ${VIEW_SELECTOR} > details.analytics-filter-shell-v149[open] > summary {
        border-bottom: 1px solid var(--border, #dbe4f0);
      }
      @media (max-width: 720px) {
        ${VIEW_SELECTOR} > .analytics-fixed-header-v149 {
          margin-bottom: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function prepare() {
    const view = document.querySelector(VIEW_SELECTOR);
    if (!view || mutating) return;
    mutating = true;
    try {
      ensureStyles();
      fixedHeader(view);
      normalizeFilters(view);
      view.dataset.analyticsHeaderArrowV149 = "true";
      view.dataset.analyticsHeaderArrowVersion = VERSION;
    } finally {
      mutating = false;
    }
  }

  function schedulePrepare() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(() => {
      scheduled = false;
      prepare();
    }, 0);
  }

  function start() {
    prepare();
    const view = document.querySelector(VIEW_SELECTOR);
    if (view && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        if (!mutating) schedulePrepare();
      });
      observer.observe(view, { childList: true, subtree: true });
    }
    view?.addEventListener("toggle", (event) => {
      const details = event.target;
      if (details?.matches?.("details.analytics-filter-shell-v149")) {
        details.querySelector(":scope > summary")?.setAttribute("aria-expanded", details.open ? "true" : "false");
      }
    }, true);
    window.addEventListener("pageshow", schedulePrepare);
    window.addEventListener("hashchange", schedulePrepare);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
