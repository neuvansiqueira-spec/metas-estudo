(() => {
  "use strict";

  if (window.__aldusAnalyticsTabsFixV146) return;
  window.__aldusAnalyticsTabsFixV146 = true;

  const VERSION = "20260725-analise-estrategica-abas-corrigidas-v146";
  const view = document.getElementById("view-analise-estrategica");
  if (!view) return;

  let observer = null;
  let scheduled = false;

  function ensureStyles() {
    if (document.getElementById("analyticsTabsFixStylesV146")) return;
    const style = document.createElement("style");
    style.id = "analyticsTabsFixStylesV146";
    style.textContent = `
      #view-analise-estrategica #analyticsCollapseToolbarV145 {
        display: none !important;
      }
      #view-analise-estrategica details > summary {
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  }

  function hideObsoleteToolbar() {
    const toolbar = document.getElementById("analyticsCollapseToolbarV145");
    if (!toolbar) return false;
    toolbar.hidden = true;
    toolbar.setAttribute("aria-hidden", "true");
    toolbar.dataset.disabledByV146 = "true";
    return true;
  }

  function directSummaryDetails(summary) {
    if (!summary || summary.tagName !== "SUMMARY") return null;
    const details = summary.parentElement;
    if (!details || details.tagName !== "DETAILS") return null;
    if (!view.contains(details)) return null;
    if (details.querySelector(":scope > summary") !== summary) return null;
    return details;
  }

  function isInteractiveInsideSummary(target, summary) {
    const interactive = target.closest?.("a, button, input, select, textarea, label, [role='button'], [contenteditable='true']");
    return Boolean(interactive && interactive !== summary && summary.contains(interactive));
  }

  function syncExpandedState(details) {
    const summary = details.querySelector(":scope > summary");
    if (summary) summary.setAttribute("aria-expanded", details.open ? "true" : "false");
  }

  function prepareDetails() {
    view.querySelectorAll("details").forEach(syncExpandedState);
    hideObsoleteToolbar();
    view.dataset.analyticsTabsFixV146 = "true";
    view.dataset.analyticsTabsFixVersion = VERSION;
  }

  function schedulePrepare() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(() => {
      scheduled = false;
      prepareDetails();
    }, 0);
  }

  view.addEventListener("click", (event) => {
    const summary = event.target.closest?.("summary");
    const details = directSummaryDetails(summary);
    if (!details || isInteractiveInsideSummary(event.target, summary)) return;

    event.preventDefault();
    details.open = !details.open;
    syncExpandedState(details);
  }, true);

  view.addEventListener("toggle", (event) => {
    if (event.target?.tagName === "DETAILS") syncExpandedState(event.target);
  }, true);

  ensureStyles();
  prepareDetails();

  if (typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(schedulePrepare);
    observer.observe(view, { childList: true, subtree: true });
  }

  window.addEventListener("pageshow", schedulePrepare);
  window.addEventListener("hashchange", schedulePrepare);
})();
