(() => {
  "use strict";

  const VERSION = "20260731-menu-lateral-hover-v204";
  const DESKTOP_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 761px)";
  const PIN_KEY = "aldus.sideNavPinnedOpen.v204";
  const SHELL_SELECTOR = ".app-shell";
  const NAV_SELECTOR = "#sideNav";
  const TOGGLE_SELECTOR = "#sideNavToggle";
  const COLLAPSED_CLASS = "side-nav-collapsed";
  const MODULE_CLASS = "side-nav-hover-v204";
  const PINNED_CLASS = "side-nav-pinned-v204";
  const STYLE_ID = "sideNavHoverV204Style";
  const OPEN_DELAY_MS = 130;
  const CLOSE_DELAY_MS = 150;

  let shell = null;
  let nav = null;
  let toggle = null;
  let mediaQuery = null;
  let pinned = false;
  let openTimer = 0;
  let closeTimer = 0;
  let originalToggleText = "☰";
  let originalToggleLabel = "Alternar menu";

  function isDesktop() {
    return Boolean(mediaQuery?.matches);
  }

  function readPinnedPreference() {
    try {
      return localStorage.getItem(PIN_KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function writePinnedPreference(value) {
    try {
      localStorage.setItem(PIN_KEY, value ? "true" : "false");
    } catch (_) {
      // Preferência visual opcional; não interfere no aplicativo.
    }
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
        .${MODULE_CLASS}.${PINNED_CLASS} .side-nav{
          box-shadow:8px 0 26px rgba(2,18,36,.16);
        }
        #sideNavToggle[data-side-nav-hover-control="true"]{
          transition:background-color .18s ease,color .18s ease,transform .18s ease;
        }
        #sideNavToggle[data-side-nav-hover-control="true"]:hover{
          transform:translateY(-1px);
        }
        #sideNavToggle[data-side-nav-pinned="true"]{
          background:rgba(250,204,21,.16);
          color:#fde68a;
          box-shadow:inset 0 0 0 1px rgba(250,204,21,.38);
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

  function setCollapsed(value) {
    if (!shell || !isDesktop() || pinned) return;
    shell.classList.toggle(COLLAPSED_CLASS, Boolean(value));
    if (toggle) toggle.setAttribute("aria-expanded", value ? "false" : "true");
  }

  function updateTogglePresentation() {
    if (!toggle) return;
    if (!isDesktop()) {
      toggle.textContent = originalToggleText;
      toggle.setAttribute("aria-label", originalToggleLabel);
      toggle.title = originalToggleLabel;
      toggle.removeAttribute("data-side-nav-hover-control");
      toggle.removeAttribute("data-side-nav-pinned");
      return;
    }
    toggle.dataset.sideNavHoverControl = "true";
    toggle.dataset.sideNavPinned = pinned ? "true" : "false";
    toggle.textContent = pinned ? "📍" : "📌";
    const label = pinned ? "Soltar menu lateral" : "Fixar menu lateral aberto";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    toggle.setAttribute("aria-pressed", pinned ? "true" : "false");
  }

  function applyDesktopState() {
    if (!shell || !nav) return;
    clearTimers();
    if (!isDesktop()) {
      shell.classList.remove(MODULE_CLASS, PINNED_CLASS, COLLAPSED_CLASS);
      nav.classList.remove("side-nav-hover-enabled-v204");
      updateTogglePresentation();
      return;
    }
    shell.classList.add(MODULE_CLASS);
    nav.classList.add("side-nav-hover-enabled-v204");
    shell.classList.toggle(PINNED_CLASS, pinned);
    shell.classList.toggle(COLLAPSED_CLASS, !pinned);
    if (toggle) toggle.setAttribute("aria-expanded", pinned ? "true" : "false");
    updateTogglePresentation();
  }

  function setPinned(value, persist = true) {
    pinned = Boolean(value);
    if (persist) writePinnedPreference(pinned);
    applyDesktopState();
  }

  function scheduleOpen() {
    if (!isDesktop() || pinned) return;
    if (closeTimer) window.clearTimeout(closeTimer);
    if (openTimer) window.clearTimeout(openTimer);
    openTimer = window.setTimeout(() => {
      openTimer = 0;
      setCollapsed(false);
    }, OPEN_DELAY_MS);
  }

  function scheduleClose() {
    if (!isDesktop() || pinned) return;
    if (openTimer) window.clearTimeout(openTimer);
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      const activeInside = nav?.contains(document.activeElement);
      const pointerInside = nav?.matches?.(":hover");
      if (!activeInside && !pointerInside) setCollapsed(true);
    }, CLOSE_DELAY_MS);
  }

  function handleToggleClick(event) {
    if (!isDesktop()) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setPinned(!pinned);
  }

  function handleMediaChange() {
    applyDesktopState();
    if (isDesktop()) window.setTimeout(applyDesktopState, 180);
  }

  function bindEvents() {
    if (!nav || !toggle || nav.dataset.sideNavHoverBoundV204 === "true") return;
    nav.dataset.sideNavHoverBoundV204 = "true";
    nav.addEventListener("pointerenter", scheduleOpen, { passive: true });
    nav.addEventListener("pointerleave", scheduleClose, { passive: true });
    nav.addEventListener("focusin", scheduleOpen);
    nav.addEventListener("focusout", scheduleClose);
    toggle.addEventListener("click", handleToggleClick, true);
    mediaQuery?.addEventListener?.("change", handleMediaChange);
    window.addEventListener("pageshow", applyDesktopState);
  }

  function initialize() {
    if (typeof document === "undefined" || typeof window === "undefined") return false;
    shell = document.querySelector(SHELL_SELECTOR);
    nav = document.querySelector(NAV_SELECTOR);
    toggle = document.querySelector(TOGGLE_SELECTOR);
    if (!shell || !nav || !toggle) return false;

    ensureStyle();
    mediaQuery = window.matchMedia(DESKTOP_QUERY);
    originalToggleText = toggle.textContent || "☰";
    originalToggleLabel = toggle.getAttribute("aria-label") || toggle.title || "Alternar menu";
    pinned = readPinnedPreference();
    bindEvents();
    applyDesktopState();
    window.setTimeout(applyDesktopState, 250);
    return true;
  }

  function boot() {
    if (initialize()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (initialize() || attempts >= 30) window.clearInterval(timer);
    }, 100);
  }

  globalThis.AldusSideNavHoverV204 = Object.freeze({
    version: VERSION,
    desktopQuery: DESKTOP_QUERY,
    pinKey: PIN_KEY,
    initialize,
    setPinned,
    isPinned: () => pinned
  });

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    queueMicrotask(boot);
  }
})();
