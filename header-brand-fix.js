(() => {
  "use strict";

  const THEME_VERSION = "20260720-identidade-metas-concursos-v90";
  const DESIRED_HTML = `
    <img class="aldus-visual-brand-image" src="icons/aldus-visual.png?v=${THEME_VERSION}" alt="Aldus — Metas Concursos" width="1254" height="1254" fetchpriority="high" decoding="async" />
  `;

  function ensureStylesheet(id, href, required = false) {
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    if (!link.getAttribute("href")?.includes(THEME_VERSION)) {
      link.href = `${href}?v=${THEME_VERSION}`;
    }

    if (required && link.dataset.fallbackBound !== "true") {
      link.dataset.fallbackBound = "true";
      link.addEventListener("error", () => {
        delete document.documentElement.dataset.aldusTheme;
        link.remove();
        console.warn("[Aldus] Tema premium indisponível; visual clássico preservado.");
      }, { once: true });
    }

    return link;
  }

  function enablePremiumTheme() {
    const root = document.documentElement;
    root.dataset.aldusTheme = "premium-stable";
    document.title = "Aldus Metas Concurso — Painel de Estudos";

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#031426");

    ensureStylesheet("aldusPremiumStableTheme", "aldus-premium-theme.css", true);
    ensureStylesheet("aldusPremiumRefinement", "aldus-premium-refinement-v47.css");
    ensureStylesheet("aldusVisualV58", "aldus-visual-v58.css");
    ensureStylesheet("aldusPlanningV59", "aldus-planning-v59.css");
    ensureStylesheet("aldusPlanningHistoryV60", "aldus-planning-history-v60.css");
    ensureStylesheet("aldusCalendarV61", "aldus-calendar-v61.css");
    ensureStylesheet("aldusCalendarV62", "aldus-calendar-v62.css");
    ensureStylesheet("aldusExportBrandV63", "aldus-export-brand-v63.css");
    ensureStylesheet("aldusExportBrandV64", "aldus-export-brand-v64.css");
    ensureStylesheet("aldusContrastSystemV68", "aldus-contrast-system-v68.css");
    ensureStylesheet("aldusComponentContrastV69", "aldus-component-contrast-v69.css");
    ensureStylesheet("aldusAdvisorLayoutV70", "aldus-advisor-layout-v70.css");
    ensureStylesheet("aldusBackupContrastV71", "aldus-backup-contrast-v71.css");
    ensureStylesheet("aldusNavigationScrollV73", "aldus-navigation-scroll-v73.css");
  }

  function applyCorrectHeader() {
    const brand = document.querySelector(".topbar .brand");
    if (!brand) return;

    const visual = brand.querySelector('.aldus-visual-brand-image[src*="icons/aldus-visual.png"]');
    const correct = Boolean(visual);

    document.getElementById("aldusMetaBrandStyles")?.remove();
    brand.classList.remove("aldus-meta-brand");
    brand.classList.add("aldus-visual-brand");
    brand.removeAttribute("data-aldus-meta-brand");
    if (!correct) brand.innerHTML = DESIRED_HTML;
  }

  function start() {
    enablePremiumTheme();
    applyCorrectHeader();
    window.setTimeout(applyCorrectHeader, 120);
    window.setTimeout(applyCorrectHeader, 500);
  }

  enablePremiumTheme();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("load", applyCorrectHeader, { once: true });

})();
