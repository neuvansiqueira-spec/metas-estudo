(() => {
  "use strict";

  const VERSION = "20260717-logo-aldus-meta-v41";
  if (globalThis.__aldusMetaBrandingV41) return;
  globalThis.__aldusMetaBrandingV41 = true;

  function installBrandStyles() {
    if (document.getElementById("aldusMetaBrandStyles")) return;
    const style = document.createElement("style");
    style.id = "aldusMetaBrandStyles";
    style.textContent = `
      .brand.aldus-meta-brand {
        display: flex;
        align-items: center;
        justify-content: center;
        width: min(340px, 38vw);
        min-width: 250px;
        padding: 5px 12px;
        border: 1px solid rgba(255, 255, 255, .45);
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 12px 32px rgba(0, 20, 55, .18);
        overflow: hidden;
      }
      .aldus-meta-brand-logo {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 1200 / 440;
        object-fit: contain;
      }
      @media (max-width: 900px) {
        .brand.aldus-meta-brand {
          width: min(310px, 72vw);
          min-width: 0;
        }
      }
      @media (max-width: 620px) {
        .brand.aldus-meta-brand {
          width: min(260px, 82vw);
          padding: 4px 9px;
          border-radius: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function updateDocumentBrand() {
    document.title = "Aldus Meta — Metas de Estudo";
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute("content", "Aldus Meta");

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.setAttribute("href", `icons/logo-mark.svg?v=${VERSION}`);

    const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (touchIcon) touchIcon.setAttribute("href", `icons/icon.svg?v=${VERSION}`);
  }

  function applyHeaderBrand() {
    const brand = document.querySelector(".topbar .brand");
    if (!brand || brand.dataset.aldusMetaBrand === "v41") return;
    brand.dataset.aldusMetaBrand = "v41";
    brand.classList.add("aldus-meta-brand");
    brand.innerHTML = `<img class="aldus-meta-brand-logo" src="icons/aldus-meta-logo.svg?v=${VERSION}" alt="Aldus Meta">`;
  }

  function updateVisibleVersion() {
    document.querySelectorAll(".app-version").forEach((element) => {
      element.textContent = `Versão: ${VERSION}`;
    });
  }

  function applyBranding() {
    installBrandStyles();
    updateDocumentBrand();
    applyHeaderBrand();
    updateVisibleVersion();
    document.documentElement.dataset.brand = "aldus-meta";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyBranding, { once: true });
  } else {
    applyBranding();
  }

  window.addEventListener("load", applyBranding, { once: true });
})();
