(() => {
  "use strict";

  const VERSION = "20260806-duplicate-diagnostics-ui-v261-stability";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";

  function detachRewriteObservers(root) {
    if (!root || root.dataset.v261StabilityApplied) return false;
    if (!root.dataset.v261Initialized) return false;

    const summary = root.querySelector("[data-dup-summary]");
    const status = root.querySelector("[data-dup-status]");
    if (summary) summary.replaceWith(summary.cloneNode(true));
    if (status) status.replaceWith(status.cloneNode(true));

    root.dataset.v261StabilityApplied = "true";
    return true;
  }

  function install() {
    const root = document.getElementById(ROOT_ID);
    if (detachRewriteObservers(root)) return;

    const observer = new MutationObserver(() => {
      const current = document.getElementById(ROOT_ID);
      if (!detachRewriteObservers(current)) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-v261-initialized"]
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();

  globalThis.__aldusDuplicateDiagnosticsUiV261Stability = Object.freeze({ version: VERSION });
})();
