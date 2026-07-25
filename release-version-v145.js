(() => {
  "use strict";

  if (window.__aldusReleaseVersionV145) return;
  window.__aldusReleaseVersionV145 = true;
  window.__aldusReleaseVersionV144 = true;

  const VERSION = "20260725-analise-estrategica-recolhivel-v145";
  const DISPLAY = `Versão: ${VERSION}`;
  const VERSION_PATTERN = /Versão:\s*\d{8}-[a-z0-9-]+-v\d+/i;
  let observer = null;
  let stopTimer = null;

  function applyVersion() {
    const preferred = document.querySelector("footer .app-version");
    if (preferred) {
      if (preferred.textContent !== DISPLAY) preferred.textContent = DISPLAY;
      preferred.dataset.appVersion = VERSION;
      document.documentElement.dataset.aldusReleaseVersion = VERSION;
      return true;
    }

    const footer = document.querySelector("footer");
    if (!footer || typeof document.createTreeWalker !== "function") return false;
    const walker = document.createTreeWalker(footer, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const source = String(node.textContent || "");
      if (!VERSION_PATTERN.test(source)) continue;
      node.textContent = source.replace(VERSION_PATTERN, DISPLAY);
      node.parentElement?.setAttribute("data-app-version", VERSION);
      document.documentElement.dataset.aldusReleaseVersion = VERSION;
      return true;
    }
    return false;
  }

  function stopWatching() {
    observer?.disconnect();
    observer = null;
    if (stopTimer) window.clearTimeout(stopTimer);
    stopTimer = null;
  }

  function startWatching() {
    applyVersion();
    if (typeof MutationObserver === "undefined") return;
    observer = new MutationObserver(applyVersion);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
    stopTimer = window.setTimeout(() => {
      applyVersion();
      stopWatching();
    }, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWatching, { once: true });
  } else {
    startWatching();
  }

  window.addEventListener("pageshow", applyVersion);
})();
