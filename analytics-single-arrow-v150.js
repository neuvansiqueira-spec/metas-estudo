(() => {
  "use strict";

  if (window.__aldusAnalyticsSingleArrowV150) return;
  window.__aldusAnalyticsSingleArrowV150 = true;

  const VERSION = "20260725-analise-estrategica-seta-unica-v150";
  const VIEW_SELECTOR = "#view-analise-estrategica";
  const FILTER_SELECTOR = `${VIEW_SELECTOR} > details.analytics-filters-section > summary`;

  function ensureStyles() {
    if (document.getElementById("analyticsSingleArrowStylesV150")) return;

    const style = document.createElement("style");
    style.id = "analyticsSingleArrowStylesV150";
    style.textContent = `
      ${FILTER_SELECTOR} {
        list-style: none !important;
      }
      ${FILTER_SELECTOR}::-webkit-details-marker {
        display: none !important;
      }
      ${FILTER_SELECTOR}::marker {
        content: "" !important;
        display: none !important;
      }
      ${FILTER_SELECTOR}::before,
      ${FILTER_SELECTOR}::after {
        content: none !important;
        display: none !important;
        border: 0 !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      ${FILTER_SELECTOR} > .analytics-collapsible-chevron-v145 {
        display: inline-block !important;
        flex: 0 0 auto !important;
        visibility: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  function apply() {
    ensureStyles();

    const summary = document.querySelector(FILTER_SELECTOR);
    if (!summary) return false;

    summary.dataset.analyticsSingleArrowV150 = "true";
    summary.dataset.analyticsSingleArrowVersion = VERSION;
    return true;
  }

  function start() {
    if (apply() || typeof MutationObserver === "undefined") return;

    const view = document.querySelector(VIEW_SELECTOR);
    if (!view) return;

    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(view, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

(() => {
  if (window.__aldusContestCountdownLoaderV151) return;
  window.__aldusContestCountdownLoaderV151 = true;
  const script = document.createElement("script");
  script.src = "contest-countdown-v151.js?v=20260725-contagem-concurso-v151";
  script.async = false;
  script.dataset.aldusContestCountdown = "v151";
  document.head.appendChild(script);
})();
