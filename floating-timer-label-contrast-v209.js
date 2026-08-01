(() => {
  "use strict";

  const VERSION = "20260731-contraste-titulo-cronometro-v209";
  const STYLE_ID = "floatingTimerLabelContrastV209Style";

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return false;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #floatingTimer .floating-timer-label {
        color: var(--accent-strong, #a77d25) !important;
        font-weight: 900 !important;
        letter-spacing: .08em;
        text-transform: uppercase;
        text-shadow: 0 1px 0 rgba(255, 255, 255, .72);
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

  globalThis.AldusFloatingTimerLabelContrastV209 = Object.freeze({
    version: VERSION,
    initialize
  });

  boot();
})();
