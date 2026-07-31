(() => {
  "use strict";

  const VERSION = "20260731-corrige-menu-lateral-hover-v205";
  const DESKTOP_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 761px)";
  const PIN_KEY = "aldus.sideNavPinnedOpen.v205";
  const LAYOUT_SELECTOR = ".app-layout";
  const NAV_SELECTOR = "[data-side-nav]";
  const TOGGLE_SELECTOR = "#sideNavToggle";
  const ROOT_COLLAPSED_ATTRIBUTE = "data-side-nav-collapsed";
  const COLLAPSED_CLASS = "side-nav-collapsed";
  const MODULE_CLASS = "side-nav-hover-v205";
  const PINNED_CLASS = "side-nav-pinned-v205";
  const STYLE_ID = "sideNavHoverV205Style";
  const OPEN_DELAY_MS = 130;
  const CLOSE_DELAY_MS = 150;

  let root = null;
  let layout = null;
  let nav = null;
  let toggle = null;
  let mediaQuery = null;
  let pinned = false;
  let openTimer = 0;
  let closeTimer = 0;
  let originalToggleHTML = "";
  let originalToggleLabel = "Alternar navegação";
  let originalToggleTitle = "Alternar navegação";
  let originalToggleExpanded = "true";
  let originalTogglePressed = null;

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
      // Preferência visual opcional; não interfere nos dados de estudo.
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

  function setRootCollapsed(collapsed) {
    if (!root) return;
    root.setAttribute(ROOT_COLLAPSED_ATTRIBUTE, collapsed ? "true" : "false");
  }

  function setCollapsed(collapsed) {
    if (!layout || !isDesktop() || pinned) return;
    const value = Boolean(collapsed);
    layout.classList.toggle(COLLAPSED_CLASS, value);
    setRootCollapsed(value);
    toggle?.setAttribute("aria-expanded", value ? "false" : "true");
  }

  function setToggleIcon(symbol) {
    if (!toggle) return;
    const icon = toggle.querySelector(".side-nav-toggle-icon");
    if (icon) icon.textContent = symbol;
    else toggle.textContent = symbol;
  }

  function restoreTogglePresentation() {
    if (!toggle) return;
    toggle.innerHTML = originalToggleHTML;
    toggle.setAttribute("aria-label", originalToggleLabel);
    toggle.title = originalToggleTitle;
    toggle.setAttribute("aria-expanded", originalToggleExpanded);
    if (originalTogglePressed === null) toggle.removeAttribute("aria-pressed");
    else toggle.setAttribute("aria-pressed", originalTogglePressed);
    toggle.removeAttribute("data-side-nav-hover-control");
    toggle.removeAttribute("data-side-nav-pinned");
  }

  function updateTogglePresentation() {
    if (!toggle) return;
    if (!isDesktop()) {
      restoreTogglePresentation();
      return;
    }
    toggle.dataset.sideNavHoverControl = "true";
    toggle.dataset.sideNavPinned = pinned ? "true" : "false";
    setToggleIcon(pinned ? "📍" : "📌");
    const label = pinned ? "Soltar menu lateral" : "Fixar menu lateral aberto";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    toggle.setAttribute("aria-pressed", pinned ? "true" : "false");
  }

  function applyDesktopState() {
    if (!root || !layout || !nav) return;
    clearTimers();
    if (!isDesktop()) {
      layout.classList.remove(MODULE_CLASS, PINNED_CLASS, COLLAPSED_CLASS);
      nav.classList.remove("side-nav-hover-enabled-v205");
      root.removeAttribute(ROOT_COLLAPSED_ATTRIBUTE);
      restoreTogglePresentation();
      return;
    }

    layout.classList.add(MODULE_CLASS);
    nav.classList.add("side-nav-hover-enabled-v205");
    layout.classList.toggle(PINNED_CLASS, pinned);
    layout.classList.toggle(COLLAPSED_CLASS, !pinned);
    setRootCollapsed(!pinned);
    toggle?.setAttribute("aria-expanded", pinned ? "true" : "false");
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
    if (isDesktop()) {
      window.setTimeout(applyDesktopState, 180);
      window.setTimeout(applyDesktopState, 700);
    }
  }

  function bindEvents() {
    if (!nav || !toggle || nav.dataset.sideNavHoverBoundV205 === "true") return;
    nav.dataset.sideNavHoverBoundV205 = "true";
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
    root = document.documentElement;
    layout = document.querySelector(LAYOUT_SELECTOR);
    nav = document.querySelector(NAV_SELECTOR);
    toggle = document.querySelector(TOGGLE_SELECTOR);
    if (!root || !layout || !nav || !toggle) return false;

    ensureStyle();
    mediaQuery = window.matchMedia(DESKTOP_QUERY);
    originalToggleHTML = toggle.innerHTML;
    originalToggleLabel = toggle.getAttribute("aria-label") || "Alternar navegação";
    originalToggleTitle = toggle.title || originalToggleLabel;
    originalToggleExpanded = toggle.getAttribute("aria-expanded") || "true";
    originalTogglePressed = toggle.getAttribute("aria-pressed");
    pinned = readPinnedPreference();
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

  globalThis.AldusSideNavHoverV205 = Object.freeze({
    version: VERSION,
    desktopQuery: DESKTOP_QUERY,
    pinKey: PIN_KEY,
    initialize,
    setPinned,
    setCollapsed,
    isPinned: () => pinned
  });

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    queueMicrotask(boot);
  }
})();