(() => {
  "use strict";
  if (window.__aldusReleaseVersionV144) return;
  window.__aldusReleaseVersionV144 = true;

  const VERSION = "20260725-versao-publica-v144";
  const DISPLAY = `Versão: ${VERSION}`;
  const LEGACY_VERSION_PATTERN = /Versão:\s*\d{8}-[a-z0-9-]+-v\d+/i;
  let observer = null;
  let stopTimer = null;

  function updateVersionLabel() {
    const preferred = document.querySelector("footer .app-version");
    if (preferred) {
      if (preferred.textContent !== DISPLAY) preferred.textContent = DISPLAY;
      preferred.dataset.appVersion = VERSION;
      document.documentElement.dataset.aldusReleaseVersion = VERSION;
      return true;
    }

    const scope = document.querySelector("footer") || document.body;
    if (!scope || typeof document.createTreeWalker !== "function") return false;

    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const source = String(node.textContent || "");
      if (!LEGACY_VERSION_PATTERN.test(source)) continue;
      node.textContent = source.replace(LEGACY_VERSION_PATTERN, DISPLAY);
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

  function applyVersion() {
    if (updateVersionLabel()) {
      stopWatching();
      return true;
    }
    return false;
  }

  function start() {
    if (applyVersion() || typeof MutationObserver === "undefined") return;
    observer = new MutationObserver(applyVersion);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    stopTimer = window.setTimeout(stopWatching, 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
