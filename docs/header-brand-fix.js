(() => {
  "use strict";

  const THEME_VERSION = "20260718-historico-planejamento-v60";
  const DESIRED_HTML = `
    <div class="brand-copy">
      <strong>Aldus Metas Concurso</strong>
      <small>Planeje, Registre e Revise</small>
    </div>
    <span class="brand-icon" aria-hidden="true"><img src="icons/logo-mark.svg" alt="" /></span>
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
  }

  function applyCorrectHeader() {
    const brand = document.querySelector(".topbar .brand");
    if (!brand) return;

    const title = brand.querySelector(".brand-copy strong")?.textContent?.trim();
    const subtitle = brand.querySelector(".brand-copy small")?.textContent?.trim();
    const hasCorrectIcon = Boolean(brand.querySelector('.brand-icon img[src*="icons/logo-mark.svg"]'));
    const correct = title === "Aldus Metas Concurso"
      && subtitle === "Planeje, Registre e Revise"
      && hasCorrectIcon;

    document.getElementById("aldusMetaBrandStyles")?.remove();
    brand.classList.remove("aldus-meta-brand");
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  }
})();
