(() => {
  "use strict";

  const VERSION = "20260731-remove-nota-disciplinas-plantao-v202";
  const STYLE_ID = "planningShiftDisciplinesPerDayStyle";
  const FIELD_ID = "planningShiftDisciplinesPerDay";
  const LABEL_SELECTOR = "[data-planning-shift-disciplines-v200]";

  function applyVisualFix() {
    if (typeof document === "undefined") return false;
    const style = document.getElementById(STYLE_ID);
    const field = document.getElementById(FIELD_ID);
    const label = field?.closest(LABEL_SELECTOR);
    if (!style || !field || !label) return false;

    label.querySelector("small")?.remove();

    style.textContent = `
      ${LABEL_SELECTOR}{
        position:relative;
        display:flex;
        flex-direction:column;
        gap:0;
        min-width:0;
        padding:0;
        border:0;
        border-radius:0;
        background:none;
        color:inherit;
      }
      #${FIELD_ID}{
        width:100%;
        min-height:68px;
        margin-top:10px;
        font:inherit;
        font-weight:800;
      }
      #${FIELD_ID}:focus{
        outline:3px solid color-mix(in srgb, currentColor 18%, transparent);
        outline-offset:1px;
      }
      @media (max-width:768px){
        #${FIELD_ID}{min-height:58px}
      }
    `;
    label.dataset.planningShiftVisualV202 = "true";
    return true;
  }

  function initialize() {
    if (applyVisualFix()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (applyVisualFix() || attempts >= 20) clearInterval(timer);
    }, 100);
  }

  globalThis.AldusPlanningShiftVisualV202 = Object.freeze({
    version: VERSION,
    applyVisualFix,
    initialize
  });

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    queueMicrotask(initialize);
  }
})();