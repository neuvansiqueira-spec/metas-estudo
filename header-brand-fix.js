(() => {
  "use strict";

  const THEME_VERSION = "20260717-premium-estavel-v46";
  const DESIRED_HTML = `
    <div class="brand-copy">
      <strong>Aldus Metas Concurso</strong>
      <small>Planeje, Registre e Revise</small>
    </div>
    <span class="brand-icon" aria-hidden="true"><img src="icons/logo-mark.svg" alt="" /></span>
  `;

  function enablePremiumTheme() {
    const root = document.documentElement;
    root.dataset.aldusTheme = "premium-stable";
    document.title = "Aldus Metas Concurso — Painel de Estudos";

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#031426");

    let link = document.getElementById("aldusPremiumStableTheme");
    if (!link) {
      link = document.createElement("link");
      link.id = "aldusPremiumStableTheme";
      link.rel = "stylesheet";
      link.href = `aldus-premium-theme.css?v=${THEME_VERSION}`;
      link.addEventListener("error", () => {
        delete root.dataset.aldusTheme;
        link.remove();
        console.warn("[Aldus] Tema premium não carregou; visual clássico preservado.");
      }, { once: true });
      document.head.appendChild(link);
    }
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