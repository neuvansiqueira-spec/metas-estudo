(() => {
  "use strict";

  const VERSION = "20260731-suaviza-titulo-navegacao-v207";
  const DESKTOP_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 761px)";
  const LAYOUT_SELECTOR = ".app-layout";
  const NAV_SELECTOR = "[data-side-nav]";
  const TOGGLE_SELECTOR = "#sideNavToggle";
  const ROOT_COLLAPSED_ATTRIBUTE = "data-side-nav-collapsed";
  const COLLAPSED_CLASS = "side-nav-collapsed";
  const MODULE_CLASS = "side-nav-hover-v207";
  const STYLE_ID = "sideNavHoverV207Style";
  const OPEN_DELAY_MS = 130;
  const CLOSE_DELAY_MS = 150;

  let root = null;
  let layout = null;
  let nav = null;
  let toggle = null;
  let mediaQuery = null;
  let openTimer = 0;
  let closeTimer = 0;

  function isDesktop() {
    return Boolean(mediaQuery?.matches);
  }

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (hover:hover) and (pointer:fine) and (min-width:761px){
        .${MODULE_CLASS}{
          --aldus-side-nav-hover-duration:.22s;
        }
        .${MODULE_CLASS},
        .${MODULE_CLASS} .side-nav{
          transition-property:grid-template-columns,width,padding,box-shadow;
          transition-duration:var(--aldus-side-nav-hover-duration);
          transition-timing-function:ease;
        }
        .${MODULE_CLASS} .side-nav{
          will-change:width;
        }
        .${MODULE_CLASS} .side-nav-heading{
          grid-template-columns:minmax(0,1fr) !important;
        }
        .${MODULE_CLASS} .side-nav-title{
          min-width:0 !important;
          overflow:hidden !important;
        }
        .${MODULE_CLASS} .side-nav-title-text{
          display:block;
          min-width:0;
          overflow:hidden;
          white-space:nowrap;
          text-overflow:clip;
        }
        html[data-side-nav-collapsed="false"] .${MODULE_CLASS} .side-nav-title-text{
          opacity:0;
          transform:translateX(-6px);
          animation:aldusSideNavTitleRevealV207 .14s ease .16s forwards;
        }
        #sideNavToggle[data-side-nav-auto-hover="true"]{
          display:none !important;
        }
        html[data-side-nav-collapsed="true"] .${MODULE_CLASS} .side-nav-heading{
          min-height:64px !important;
          gap:0 !important;
        }
        @keyframes aldusSideNavTitleRevealV207{
          from{opacity:0;transform:translateX(-6px)}
          to{opacity:1;transform:translateX(0)}
        }
      }
      @media (hover:hover) and (pointer:fine) and (min-width:761px) and (prefers-reduced-motion:reduce){
        html[data-side-nav-collapsed="false"] .${MODULE_CLASS} .side-nav-title-text{
          opacity:1;
          transform:none;
          animation:none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function clearTimers() {
    if (openTimer) window.clearTimeout(openTimer);
    if (closeTimer) window.clearTimeout(closeTimer);
    openTimer = 0;
    closeTimer = 0;
  }

  function setRootCollapsed(collapsed) {
    if (!root) return;
    root.setAttribute(ROOT_COLLAPSED_ATTRIBUTE, collapsed ? "true" : "false");
  }

  function setCollapsed(collapsed) {
    if (!layout || !isDesktop()) return;
    const value = Boolean(collapsed);
    layout.classList.toggle(COLLAPSED_CLASS, value);
    setRootCollapsed(value);
    toggle?.setAttribute("aria-expanded", value ? "false" : "true");
  }

  function restoreMobileToggle() {
    if (!toggle) return;
    toggle.removeAttribute("data-side-nav-auto-hover");
    toggle.removeAttribute("aria-hidden");
    toggle.removeAttribute("tabindex");
  }

  function applyDesktopState() {
    if (!root || !layout || !nav) return;
    clearTimers();

    if (!isDesktop()) {
      layout.classList.remove(MODULE_CLASS, COLLAPSED_CLASS);
      nav.classList.remove("side-nav-hover-enabled-v207");
      root.removeAttribute(ROOT_COLLAPSED_ATTRIBUTE);
      restoreMobileToggle();
      return;
    }

    layout.classList.add(MODULE_CLASS, COLLAPSED_CLASS);
    nav.classList.add("side-nav-hover-enabled-v207");
    setRootCollapsed(true);
    if (toggle) {
      toggle.dataset.sideNavAutoHover = "true";
      toggle.setAttribute("aria-hidden", "true");
      toggle.setAttribute("tabindex", "-1");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function scheduleOpen() {
    if (!isDesktop()) return;
    if (closeTimer) window.clearTimeout(closeTimer);
    if (openTimer) window.clearTimeout(openTimer);
    openTimer = window.setTimeout(() => {
      openTimer = 0;
      setCollapsed(false);
    }, OPEN_DELAY_MS);
  }

  function scheduleClose() {
    if (!isDesktop()) return;
    if (openTimer) window.clearTimeout(openTimer);
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      const activeInside = nav?.contains(document.activeElement);
      const pointerInside = nav?.matches?.(":hover");
      if (!activeInside && !pointerInside) setCollapsed(true);
    }, CLOSE_DELAY_MS);
  }

  function handleMediaChange() {
    applyDesktopState();
    if (isDesktop()) {
      window.setTimeout(applyDesktopState, 180);
      window.setTimeout(applyDesktopState, 700);
    }
  }

  function bindEvents() {
    if (!nav || nav.dataset.sideNavHoverBoundV207 === "true") return;
    nav.dataset.sideNavHoverBoundV207 = "true";
    nav.addEventListener("pointerenter", scheduleOpen, { passive: true });
    nav.addEventListener("pointerleave", scheduleClose, { passive: true });
    nav.addEventListener("focusin", scheduleOpen);
    nav.addEventListener("focusout", scheduleClose);
    mediaQuery?.addEventListener?.("change", handleMediaChange);
    window.addEventListener("pageshow", applyDesktopState);
  }

  function initialize() {
    if (typeof document === "undefined" || typeof window === "undefined") return false;
    root = document.documentElement;
    layout = document.querySelector(LAYOUT_SELECTOR);
    nav = document.querySelector(NAV_SELECTOR);
    toggle = document.querySelector(TOGGLE_SELECTOR);
    if (!root || !layout || !nav) return false;

    ensureStyle();
    mediaQuery = window.matchMedia(DESKTOP_QUERY);
    bindEvents();
    applyDesktopState();
    window.setTimeout(applyDesktopState, 250);
    window.setTimeout(applyDesktopState, 800);
    return true;
  }

  function boot() {
    if (initialize()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (initialize() || attempts >= 40) window.clearInterval(timer);
    }, 100);
  }

  globalThis.AldusSideNavHoverV207 = Object.freeze({
    version: VERSION,
    desktopQuery: DESKTOP_QUERY,
    initialize,
    setCollapsed
  });

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    queueMicrotask(boot);
  }
})();