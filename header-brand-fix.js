(() => {
  "use strict";

  const DESIRED_HTML = `
    <div class="brand-copy">
      <strong>Aldus Metas Concurso</strong>
      <small>Planeje, Registre e Revise</small>
    </div>
    <span class="brand-icon" aria-hidden="true"><img src="icons/logo-mark.svg" alt="" /></span>
  `;

  let applying = false;

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
    applyCorrectHeader();
    const observer = new MutationObserver(applyCorrectHeader);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(applyCorrectHeader, 0);
    setTimeout(applyCorrectHeader, 150);
    setTimeout(applyCorrectHeader, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("load", applyCorrectHeader);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  }
})();
