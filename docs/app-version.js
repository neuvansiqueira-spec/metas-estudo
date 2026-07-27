(() => {
  "use strict";

  const VERSION = "20260727-escolher-assunto-dia-v158";
  const RELEASE_TEXT = `Versão: ${VERSION}`;
  let correctionScheduled = false;

  function applyDocumentVersion() {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.aldusReleaseVersion = VERSION;
    document.querySelectorAll(".app-version").forEach((element) => {
      if (element.textContent !== RELEASE_TEXT) element.textContent = RELEASE_TEXT;
    });
  }

  function scheduleCorrection() {
    if (correctionScheduled) return;
    correctionScheduled = true;
    queueMicrotask(() => {
      correctionScheduled = false;
      applyDocumentVersion();
    });
  }

  const release = Object.freeze({
    version: VERSION,
    text: RELEASE_TEXT,
    suffix: VERSION.match(/v\d+$/)?.[0] || "current",
    apply: applyDocumentVersion
  });

  Object.defineProperty(globalThis, "__ALDUS_APP_RELEASE__", {
    value: release,
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (typeof document === "undefined") return;
  applyDocumentVersion();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDocumentVersion, { once: true });
  }

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => (
        mutation.type === "characterData"
        || mutation.target?.closest?.(".app-version")
        || [...(mutation.addedNodes || [])].some((node) => (
          node.nodeType === 1 && (node.matches?.(".app-version") || node.querySelector?.(".app-version"))
        ))
      ))) scheduleCorrection();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
})();
