(() => {
  "use strict";

  const PATCH_VERSION = "20260727-atualizacao-rapida-segura-v165";
  const CHECK_INTERVAL_MS = 60_000;
  const BANNER_ID = "aldusUpdateBannerV165";
  let lastCheckAt = 0;
  let registrationRef = null;
  let hadController = Boolean(navigator.serviceWorker?.controller);

  if (typeof document === "undefined" || !("serviceWorker" in navigator) || globalThis.__ALDUS_UPDATE_FLOW_V165__) return;

  function injectStyles() {
    if (document.getElementById("aldusUpdateStylesV165")) return;
    const style = document.createElement("style");
    style.id = "aldusUpdateStylesV165";
    style.textContent = `
      #${BANNER_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 100000;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 14px;
        width: min(430px, calc(100vw - 28px));
        padding: 14px 15px;
        border: 1px solid rgba(242, 207, 101, .72);
        border-radius: 16px;
        background: rgba(4, 29, 49, .97);
        color: #f4f9fd;
        box-shadow: 0 18px 48px rgba(0, 0, 0, .34);
        backdrop-filter: blur(12px);
      }
      #${BANNER_ID}[hidden] { display: none !important; }
      #${BANNER_ID} .aldus-update-copy-v165 { display: grid; gap: 3px; min-width: 0; }
      #${BANNER_ID} strong { font-size: .96rem; }
      #${BANNER_ID} small { color: #b8d0e1; font-size: .79rem; line-height: 1.35; }
      #${BANNER_ID} button {
        min-height: 40px;
        padding: 9px 13px;
        border-radius: 12px;
        white-space: nowrap;
      }
      @media (max-width: 560px) {
        #${BANNER_ID} {
          right: 14px;
          bottom: 14px;
          grid-template-columns: 1fr;
        }
        #${BANNER_ID} button { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBanner() {
    let banner = document.getElementById(BANNER_ID);
    if (banner) return banner;

    banner = document.createElement("aside");
    banner.id = BANNER_ID;
    banner.hidden = true;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `
      <span class="aldus-update-copy-v165">
        <strong>Nova versão pronta</strong>
        <small>Atualize quando terminar o que estiver preenchendo. Os dados já salvos serão preservados.</small>
      </span>
      <button type="button" data-aldus-update-now-v165>Atualizar agora</button>
    `;
    banner.querySelector("[data-aldus-update-now-v165]")?.addEventListener("click", () => {
      try { sessionStorage.setItem("aldus.update.reload.v165", PATCH_VERSION); } catch {}
      location.reload();
    });
    document.body.appendChild(banner);
    return banner;
  }

  function showUpdateReady() {
    injectStyles();
    const banner = ensureBanner();
    banner.hidden = false;
  }

  async function checkForUpdate(force = false) {
    const now = Date.now();
    if (!force && now - lastCheckAt < CHECK_INTERVAL_MS) return false;
    lastCheckAt = now;

    try {
      registrationRef ||= await navigator.serviceWorker.ready;
      await registrationRef.update();
      if (registrationRef.waiting) showUpdateReady();
      return true;
    } catch (error) {
      console.warn("[Aldus v165] Não foi possível verificar atualização agora.", error);
      return false;
    }
  }

  function install() {
    injectStyles();
    ensureBanner();

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      showUpdateReady();
    });

    window.addEventListener("focus", () => checkForUpdate());
    window.addEventListener("pageshow", () => checkForUpdate(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });

    setTimeout(() => checkForUpdate(true), 1200);

    Object.defineProperty(globalThis, "__ALDUS_UPDATE_FLOW_V165__", {
      value: Object.freeze({
        version: PATCH_VERSION,
        installedAt: new Date().toISOString(),
        reloadMode: "user-confirmed"
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
