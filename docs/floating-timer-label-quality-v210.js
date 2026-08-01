(() => {
  "use strict";

  const VERSION = "20260731-refina-titulo-cronometro-v210";
  const STYLE_ID = "floatingTimerLabelQualityV210Style";

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return false;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #floatingTimer .floating-timer-label {
        display: inline-flex;
        align-items: center;
        width: max-content;
        padding: 3px 8px;
        border: 1px solid rgba(167, 125, 37, .42);
        border-radius: 999px;
        background: rgba(255, 255, 255, .78);
        color: var(--primary-dark, #09264a) !important;
        font-size: .82rem;
        font-weight: 800 !important;
        line-height: 1.2;
        letter-spacing: .01em !important;
        text-transform: none !important;
        text-shadow: none !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function initialize() {
    if (typeof document === "undefined" || !document.head) return false;
    return ensureStyle() || Boolean(document.getElementById(STYLE_ID));
  }

  function boot() {
    if (initialize()) return;
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  }

  globalThis.AldusFloatingTimerLabelQualityV210 = Object.freeze({
    version: VERSION,
    initialize
  });

  boot();
})();
