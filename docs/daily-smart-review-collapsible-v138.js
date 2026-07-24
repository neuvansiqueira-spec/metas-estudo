(() => {
  if (window.__aldusDailySmartReviewCollapsibleV138) return;
  window.__aldusDailySmartReviewCollapsibleV138 = true;

  const VERSION = "20260724-revisao-diaria-recolhivel-v138";
  const root = document.getElementById("view-metas-do-dia");
  const panel = root?.querySelector("details.day-smart-review-panel");
  const summary = panel?.querySelector(":scope > summary.day-smart-review-summary");
  const toggle = summary?.querySelector(".day-smart-review-toggle");
  const content = document.getElementById("daySmartReview");
  if (!root || !panel || !summary || !toggle || !content) return;
  if (panel.dataset.dailySmartReviewCollapsibleV138 === "true") return;

  function ensureStyles() {
    if (document.getElementById("dailySmartReviewCollapsibleStylesV138")) return;
    const style = document.createElement("style");
    style.id = "dailySmartReviewCollapsibleStylesV138";
    style.textContent = `
      #view-metas-do-dia .day-smart-review-panel.day-smart-review-collapsible-v138 {
        overflow: hidden;
      }
      #view-metas-do-dia .day-smart-review-summary.day-smart-review-summary-v138 {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        cursor: pointer;
        list-style: none;
      }
      #view-metas-do-dia .day-smart-review-summary-v138::-webkit-details-marker {
        display: none;
      }
      #view-metas-do-dia .day-smart-review-toggle.day-smart-review-toggle-v138 {
        display: inline-grid;
        grid-template-columns: auto auto;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-width: 118px;
        min-height: 42px;
        padding: 9px 14px;
        border: 1px solid var(--border, #dbe4f0);
        border-radius: 13px;
        background: var(--surface, #ffffff);
        color: var(--primary-dark, #1d4ed8);
        font-weight: 800;
        line-height: 1;
      }
      #view-metas-do-dia .day-smart-review-summary-v138:hover .day-smart-review-toggle-v138,
      #view-metas-do-dia .day-smart-review-summary-v138:focus-visible .day-smart-review-toggle-v138 {
        border-color: var(--primary, #2563eb);
        background: rgba(37, 99, 235, .08);
      }
      #view-metas-do-dia .day-smart-review-toggle-icon-v138 {
        display: inline-block;
        font-size: 1.15rem;
        line-height: 1;
        transition: transform .18s ease;
      }
      #view-metas-do-dia .day-smart-review-summary-v138[aria-expanded="false"] .day-smart-review-toggle-icon-v138 {
        transform: rotate(-90deg);
      }
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .day-smart-review-toggle-v138 {
        border-color: rgba(104, 173, 220, .46);
        background: rgba(7, 39, 64, .82);
        color: #e7f3fa;
      }
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .day-smart-review-summary-v138:hover .day-smart-review-toggle-v138,
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .day-smart-review-summary-v138:focus-visible .day-smart-review-toggle-v138 {
        border-color: #70b6e5;
        background: rgba(14, 62, 96, .92);
      }
      @media (max-width: 620px) {
        #view-metas-do-dia .day-smart-review-summary.day-smart-review-summary-v138 {
          grid-template-columns: minmax(0, 1fr);
          align-items: stretch;
          gap: 12px;
        }
        #view-metas-do-dia .day-smart-review-toggle-v138 {
          width: 100%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #view-metas-do-dia .day-smart-review-toggle-icon-v138 {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function updateState() {
    const isOpen = panel.open;
    summary.setAttribute("aria-expanded", String(isOpen));
    toggle.querySelector(".day-smart-review-toggle-label-v138").textContent = isOpen ? "Recolher" : "Abrir";
    toggle.setAttribute("aria-hidden", "true");
    summary.setAttribute("aria-label", isOpen ? "Recolher Revisão Inteligente de Hoje" : "Abrir Revisão Inteligente de Hoje");
    summary.title = isOpen ? "Recolher Revisão Inteligente de Hoje" : "Abrir Revisão Inteligente de Hoje";
  }

  ensureStyles();
  summary.classList.add("day-smart-review-summary-v138");
  summary.setAttribute("aria-controls", "daySmartReview");
  toggle.classList.add("day-smart-review-toggle-v138");
  toggle.innerHTML = '<span class="day-smart-review-toggle-label-v138"></span><span class="day-smart-review-toggle-icon-v138" aria-hidden="true">⌄</span>';

  panel.addEventListener("toggle", updateState);
  panel.classList.add("day-smart-review-collapsible-v138");
  panel.dataset.dailySmartReviewCollapsibleV138 = "true";
  panel.dataset.dailySmartReviewCollapsibleVersion = VERSION;
  updateState();
})();
