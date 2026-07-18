(() => {
  "use strict";

  const THEME_VERSION = "20260717-tema-premium-aldus-v44";
  const DESIRED_HTML = `
    <div class="brand-copy">
      <strong>Aldus Metas Concurso</strong>
      <small>Planeje, Registre e Revise</small>
    </div>
    <span class="brand-icon" aria-hidden="true"><img src="icons/logo-mark.svg" alt="" /></span>
  `;

  let applying = false;

  function ensurePremiumTheme() {
    document.documentElement.dataset.aldusTheme = "premium";
    document.title = "Aldus Metas Concurso — Painel de Estudos";

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#031426");

    if (!document.getElementById("aldusPremiumCriticalStyle")) {
      const critical = document.createElement("style");
      critical.id = "aldusPremiumCriticalStyle";
      critical.textContent = `html,body{background:#031426;color:#f7fbff}.hero{background:#061c33}`;
      document.head.appendChild(critical);
    }

    let link = document.getElementById("aldusPremiumTheme");
    if (!link) {
      link = document.createElement("link");
      link.id = "aldusPremiumTheme";
      link.rel = "stylesheet";
      link.addEventListener("load", () => document.getElementById("aldusPremiumCriticalStyle")?.remove(), { once: true });
      document.head.appendChild(link);
    }

    const expectedHref = `aldus-premium-theme.css?v=${THEME_VERSION}`;
    if (!link.getAttribute("href")?.includes(THEME_VERSION)) link.href = expectedHref;
  }

  function applyCorrectHeader() {
    if (applying) return;
    const brand = document.querySelector(".topbar .brand");
    if (!brand) return;

    const title = brand.querySelector(".brand-copy strong")?.textContent?.trim();
    const subtitle = brand.querySelector(".brand-copy small")?.textContent?.trim();
    const hasCorrectIcon = Boolean(brand.querySelector('.brand-icon img[src*="icons/logo-mark.svg"]'));
    const correct = title === "Aldus Metas Concurso" && subtitle === "Planeje, Registre e Revise" && hasCorrectIcon;

    applying = true;
    document.getElementById("aldusMetaBrandStyles")?.remove();
    brand.classList.remove("aldus-meta-brand");
    brand.removeAttribute("data-aldus-meta-brand");
    if (!correct) brand.innerHTML = DESIRED_HTML;
    applying = false;
  }

  function start() {
    ensurePremiumTheme();
    applyCorrectHeader();
    const observer = new MutationObserver(() => {
      ensurePremiumTheme();
      applyCorrectHeader();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(applyCorrectHeader, 0);
    setTimeout(applyCorrectHeader, 150);
    setTimeout(applyCorrectHeader, 600);
  }

  ensurePremiumTheme();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("load", () => {
    ensurePremiumTheme();
    applyCorrectHeader();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  }
})();