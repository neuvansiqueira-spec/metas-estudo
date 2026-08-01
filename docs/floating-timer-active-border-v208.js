(() => {
  "use strict";

  const VERSION = "20260731-borda-ativa-cronometro-v208";
  const STYLE_ID = "floatingTimerActiveBorderV208Style";

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return false;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #floatingTimer.floating-timer:not([hidden]):not(.timer-finished) {
        border-right-color: rgba(199, 154, 59, .78) !important;
        border-bottom-color: rgba(199, 154, 59, .78) !important;
        border-left-color: rgba(199, 154, 59, .78) !important;
        box-shadow:
          0 0 0 1px rgba(199, 154, 59, .16),
          0 26px 64px rgba(4, 27, 45, .28) !important;
      }

      @media (prefers-reduced-motion: no-preference) {
        #floatingTimer.floating-timer {
          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function initialize() {
    if (typeof document === "undefined") return false;
    if (!document.head) return false;
    return ensureStyle() || Boolean(document.getElementById(STYLE_ID));
  }

  function boot() {
    if (initialize()) return;
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  }

  globalThis.AldusFloatingTimerActiveBorderV208 = Object.freeze({
    version: VERSION,
    initialize
  });

  boot();
})();