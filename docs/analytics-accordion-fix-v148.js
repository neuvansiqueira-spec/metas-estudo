(() => {
  "use strict";

  if (window.__aldusAnalyticsAccordionFixV148) return;
  window.__aldusAnalyticsAccordionFixV148 = true;

  // Impede que os controladores antigos e conflitantes sejam carregados novamente.
  window.__aldusAnalyticsTabsFixV146 = true;
  window.__aldusAnalyticsTabsFixLoaderV146 = true;
  window.__aldusReleaseVersionV147 = true;
  window.__aldusReleaseVersionLoaderV147 = true;

  const VERSION = "20260725-analise-estrategica-abas-funcionais-v148";
  const VIEW_SELECTOR = "#view-analise-estrategica";
  let observer = null;
  let scheduled = false;

  function elementFromTarget(target) {
    if (target instanceof Element) return target;
    return target?.parentElement instanceof Element ? target.parentElement : null;
  }

  function viewForTarget(target) {
    return elementFromTarget(target)?.closest?.(VIEW_SELECTOR) || null;
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

  function syncDetails(details) {
    const summary = details.firstElementChild;
    if (summary?.tagName !== "SUMMARY") return;
    summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    summary.dataset.analyticsAccordionV148 = "true";
    details.dataset.analyticsAccordionV148 = "true";
    details.dataset.analyticsAccordionVersion = VERSION;
  }

  function prepareView(view) {
    view.querySelector("#analyticsCollapseToolbarV145")?.remove();
    view.querySelectorAll("details").forEach(syncDetails);
    view.dataset.analyticsAccordionV148 = "true";
    view.dataset.analyticsAccordionVersion = VERSION;
  }

  function schedulePrepare(view) {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(() => {
      scheduled = false;
      if (view?.isConnected) prepareView(view);
    }, 0);
  }

  function toggleFromEvent(event) {
    const view = viewForTarget(event.target);
    if (!view) return;

    const element = elementFromTarget(event.target);
    const summary = element?.closest?.("summary");
    const details = directDetailsForSummary(summary, view);
    if (!details || interactiveChild(element, summary)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const nextOpen = !details.open;
    details.open = nextOpen;
    syncDetails(details);

    // Confirma o estado no próximo quadro, protegendo contra controladores antigos em cache.
    window.requestAnimationFrame?.(() => {
      if (details.isConnected && details.open !== nextOpen) {
        details.open = nextOpen;
        syncDetails(details);
      }
    });
  }

  function ensureStyles() {
    if (document.getElementById("analyticsAccordionFixStylesV148")) return;
    const style = document.createElement("style");
    style.id = "analyticsAccordionFixStylesV148";
    style.textContent = `
      ${VIEW_SELECTOR} #analyticsCollapseToolbarV145 { display: none !important; }
      ${VIEW_SELECTOR} details > summary { cursor: pointer; touch-action: manipulation; }
    `;
    document.head.appendChild(style);
  }

  function start() {
    const view = document.querySelector(VIEW_SELECTOR);
    if (!view) return;

    ensureStyles();
    prepareView(view);

    // O listener fica no documento para funcionar mesmo quando outro código interrompe
    // o clique antes de ele alcançar a própria aba.
    document.addEventListener("click", toggleFromEvent, true);

    view.addEventListener("toggle", (event) => {
      if (event.target instanceof HTMLDetailsElement) syncDetails(event.target);
    }, true);

    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => schedulePrepare(view));
      observer.observe(view, { childList: true, subtree: true });
    }

    window.addEventListener("pageshow", () => {
      schedulePrepare(view);
    });
    window.addEventListener("hashchange", () => schedulePrepare(view));
  }

  if (typeof globalThis.__aldusDeferViewInitializerV169 === "function") {
    globalThis.__aldusDeferViewInitializerV169("analytics-accordion-fix-v148", "analise-estrategica", start);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
