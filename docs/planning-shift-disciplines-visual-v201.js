(() => {
  "use strict";

  const VERSION = "20260731-ajuste-visual-disciplinas-plantao-v201";
  const STYLE_ID = "planningShiftDisciplinesPerDayStyle";
  const FIELD_ID = "planningShiftDisciplinesPerDay";
  const LABEL_SELECTOR = "[data-planning-shift-disciplines-v200]";

  function applyVisualFix() {
    if (typeof document === "undefined") return false;
    const style = document.getElementById(STYLE_ID);
    const field = document.getElementById(FIELD_ID);
    const label = field?.closest(LABEL_SELECTOR);
    if (!style || !field || !label) return false;

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
      ${LABEL_SELECTOR} small{
        display:block;
        margin-top:8px;
        color:inherit;
        opacity:.68;
        font-size:.78rem;
        font-weight:600;
        line-height:1.45;
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
    label.dataset.planningShiftVisualV201 = "true";
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

  globalThis.AldusPlanningShiftVisualV201 = Object.freeze({
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