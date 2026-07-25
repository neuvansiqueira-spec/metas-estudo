(() => {
  if (window.__aldusDailyCollapsiblesClosedV140) return;
  window.__aldusDailyCollapsiblesClosedV140 = true;

  const VERSION = "20260725-paineis-diarios-fechados-v140";
  const root = document.getElementById("view-metas-do-dia");
  if (!root) return;

  function collapseNativeDetails(panel) {
    if (!panel || panel.tagName !== "DETAILS") return false;
    if (panel.dataset.defaultCollapsedV140 === "true") return true;

    panel.open = false;
    panel.removeAttribute("open");
    panel.dataset.defaultCollapsedV140 = "true";
    panel.dataset.defaultCollapsedVersion = VERSION;
    return true;
  }

  function collapseTodayStudy() {
    const panel = root.querySelector(".today-study-panel.today-study-collapsible-v137");
    const toggle = panel?.querySelector(".today-study-toggle-v137");
    if (!panel || !toggle) return false;
    if (panel.dataset.defaultCollapsedV140 === "true") return true;

    if (toggle.getAttribute("aria-expanded") === "true") {
      toggle.click();
    }
    panel.dataset.defaultCollapsedV140 = "true";
    panel.dataset.defaultCollapsedVersion = VERSION;
    return true;
  }

  function applyCollapsedDefaults() {
    root.querySelectorAll("details").forEach(collapseNativeDetails);
    collapseTodayStudy();
  }

  applyCollapsedDefaults();

  const observer = new MutationObserver(applyCollapsedDefaults);
  observer.observe(root, { childList: true, subtree: true });

  window.setTimeout(() => {
    applyCollapsedDefaults();
    observer.disconnect();
  }, 10000);

  root.dataset.dailyCollapsiblesClosedV140 = "true";
  root.dataset.dailyCollapsiblesClosedVersion = VERSION;
})();

(() => {
  if (window.__aldusPerformancePracticalLoaderV143) return;
  window.__aldusPerformancePracticalLoaderV143 = true;
  const script = document.createElement("script");
  script.src = "performance-practical-v143.js?v=20260725-analise-didatica-pratica-v143";
  script.async = false;
  script.dataset.aldusPerformancePractical = "v143";
  document.head.appendChild(script);
})();