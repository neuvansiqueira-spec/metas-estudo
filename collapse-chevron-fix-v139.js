(() => {
  if (window.__aldusCollapseChevronFixV139) return;
  window.__aldusCollapseChevronFixV139 = true;

  const VERSION = "20260724-setas-recolher-v139";
  const root = document.getElementById("view-metas-do-dia");
  if (!root) return;

  function ensureStyles() {
    if (document.getElementById("collapseChevronFixStylesV139")) return;
    const style = document.createElement("style");
    style.id = "collapseChevronFixStylesV139";
    style.textContent = `
      #view-metas-do-dia .day-smart-review-summary-v138::marker {
        content: "";
      }
      #view-metas-do-dia .today-study-toggle-icon-v137,
      #view-metas-do-dia .day-smart-review-toggle-icon-v138 {
        display: inline-block !important;
        width: 9px !important;
        height: 9px !important;
        flex: 0 0 9px;
        border-right: 2px solid currentColor;
        border-bottom: 2px solid currentColor;
        border-radius: 1px;
        font-size: 0 !important;
        line-height: 0 !important;
        text-indent: -9999px;
        overflow: hidden;
        transform: rotate(45deg) !important;
        transform-origin: 50% 50%;
        transition: transform .18s ease;
      }
      #view-metas-do-dia .today-study-toggle-v137[aria-expanded="false"] .today-study-toggle-icon-v137,
      #view-metas-do-dia .day-smart-review-summary-v138[aria-expanded="false"] .day-smart-review-toggle-icon-v138 {
        transform: rotate(-45deg) !important;
      }
      #view-metas-do-dia .today-study-toggle-v137[aria-expanded="true"] .today-study-toggle-icon-v137,
      #view-metas-do-dia .day-smart-review-summary-v138[aria-expanded="true"] .day-smart-review-toggle-icon-v138 {
        transform: rotate(45deg) !important;
      }
      @media (prefers-reduced-motion: reduce) {
        #view-metas-do-dia .today-study-toggle-icon-v137,
        #view-metas-do-dia .day-smart-review-toggle-icon-v138 {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeIcon(icon) {
    if (!icon) return false;
    icon.textContent = "";
    icon.setAttribute("aria-hidden", "true");
    icon.dataset.collapseChevronFixV139 = "true";
    icon.dataset.collapseChevronFixVersion = VERSION;
    return true;
  }

  function applyFix() {
    const studyIcon = root.querySelector(".today-study-toggle-icon-v137");
    const reviewIcon = root.querySelector(".day-smart-review-toggle-icon-v138");
    normalizeIcon(studyIcon);
    normalizeIcon(reviewIcon);
    return Boolean(studyIcon && reviewIcon);
  }

  ensureStyles();
  if (applyFix()) return;

  const observer = new MutationObserver(() => {
    if (applyFix()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();
