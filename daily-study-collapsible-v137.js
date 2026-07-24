(() => {
  if (window.__aldusDailyStudyCollapsibleV137) return;
  window.__aldusDailyStudyCollapsibleV137 = true;

  const VERSION = "20260724-plano-dia-recolhivel-v137";
  const root = document.getElementById("view-metas-do-dia");
  const panel = root?.querySelector(".today-study-panel");
  const heading = panel?.querySelector(":scope > .section-heading");
  const list = document.getElementById("dailyGoalsList");
  if (!root || !panel || !heading || !list) return;
  if (panel.dataset.dailyStudyCollapsibleV137 === "true") return;

  function ensureStyles() {
    if (document.getElementById("dailyStudyCollapsibleStylesV137")) return;
    const style = document.createElement("style");
    style.id = "dailyStudyCollapsibleStylesV137";
    style.textContent = `
      #view-metas-do-dia .today-study-panel.today-study-collapsible-v137 {
        overflow: hidden;
      }
      #view-metas-do-dia .today-study-heading-v137 {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        margin-bottom: 0 !important;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--border, #dbe4f0);
      }
      #view-metas-do-dia .today-study-heading-copy-v137 {
        min-width: 0;
      }
      #view-metas-do-dia .today-study-heading-copy-v137 .eyebrow {
        margin-bottom: 8px;
      }
      #view-metas-do-dia .today-study-heading-copy-v137 h2 {
        margin-bottom: 0 !important;
      }
      #view-metas-do-dia .today-study-toggle-v137 {
        display: inline-grid;
        grid-template-columns: auto auto;
        align-items: center;
        justify-content: center;
        gap: 9px;
        width: auto !important;
        min-width: 118px;
        min-height: 42px;
        padding: 9px 14px;
        border: 1px solid var(--border, #dbe4f0) !important;
        border-radius: 13px !important;
        background: var(--surface, #ffffff) !important;
        color: var(--primary-dark, #1d4ed8) !important;
        box-shadow: none !important;
        transform: none !important;
      }
      #view-metas-do-dia .today-study-toggle-v137:hover,
      #view-metas-do-dia .today-study-toggle-v137:focus-visible {
        border-color: var(--primary, #2563eb) !important;
        background: rgba(37, 99, 235, .08) !important;
      }
      #view-metas-do-dia .today-study-toggle-icon-v137 {
        display: inline-block;
        font-size: 1.15rem;
        line-height: 1;
        transition: transform .18s ease;
      }
      #view-metas-do-dia .today-study-toggle-v137[aria-expanded="false"] .today-study-toggle-icon-v137 {
        transform: rotate(-90deg);
      }
      #view-metas-do-dia .today-study-content-v137 {
        padding-top: 22px;
      }
      #view-metas-do-dia .today-study-content-v137[hidden] {
        display: none !important;
      }
      #view-metas-do-dia .today-study-collapsible-v137[data-collapsed="true"] .today-study-heading-v137 {
        padding-bottom: 0;
        border-bottom-color: transparent;
      }
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .today-study-heading-v137 {
        border-bottom-color: rgba(111, 175, 219, .26);
      }
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .today-study-toggle-v137 {
        border-color: rgba(104, 173, 220, .46) !important;
        background: rgba(7, 39, 64, .82) !important;
        color: #e7f3fa !important;
      }
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .today-study-toggle-v137:hover,
      html[data-aldus-theme="premium-stable"] #view-metas-do-dia .today-study-toggle-v137:focus-visible {
        border-color: #70b6e5 !important;
        background: rgba(14, 62, 96, .92) !important;
      }
      @media (max-width: 620px) {
        #view-metas-do-dia .today-study-heading-v137 {
          grid-template-columns: minmax(0, 1fr);
          align-items: stretch;
          gap: 12px;
        }
        #view-metas-do-dia .today-study-toggle-v137 {
          width: 100% !important;
        }
        #view-metas-do-dia .today-study-content-v137 {
          padding-top: 16px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #view-metas-do-dia .today-study-toggle-icon-v137 {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  ensureStyles();

  const headingCopy = document.createElement("div");
  headingCopy.className = "today-study-heading-copy-v137";
  [...heading.children].forEach((child) => headingCopy.appendChild(child));
  heading.appendChild(headingCopy);
  heading.classList.add("today-study-heading-v137");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "today-study-toggle-v137";
  toggle.setAttribute("aria-controls", "dailyGoalsList");
  toggle.setAttribute("aria-expanded", "true");
  toggle.innerHTML = '<span class="today-study-toggle-label-v137">Recolher</span><span class="today-study-toggle-icon-v137" aria-hidden="true">⌄</span>';
  heading.appendChild(toggle);

  const content = document.createElement("div");
  content.className = "today-study-content-v137";
  list.before(content);
  content.appendChild(list);

  function setCollapsed(collapsed) {
    const isCollapsed = Boolean(collapsed);
    content.hidden = isCollapsed;
    panel.dataset.collapsed = String(isCollapsed);
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
    toggle.querySelector(".today-study-toggle-label-v137").textContent = isCollapsed ? "Abrir" : "Recolher";
    toggle.setAttribute("aria-label", isCollapsed ? "Abrir O que estudar hoje" : "Recolher O que estudar hoje");
    toggle.title = isCollapsed ? "Abrir O que estudar hoje" : "Recolher O que estudar hoje";
  }

  toggle.addEventListener("click", () => setCollapsed(toggle.getAttribute("aria-expanded") === "true"));
  panel.classList.add("today-study-collapsible-v137");
  panel.dataset.dailyStudyCollapsibleV137 = "true";
  panel.dataset.dailyStudyCollapsibleVersion = VERSION;
  setCollapsed(false);
})();
