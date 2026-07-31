(() => {
  "use strict";

  const VERSION = "20260731-alinha-altura-disciplinas-plantao-v203";
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
        display:grid;
        gap:7px;
        min-width:0;
        padding:0;
        border:0;
        border-radius:0;
        background:none;
      }
      #${FIELD_ID}{
        width:100%;
        min-height:0;
        height:auto;
        margin:0;
      }
    `;
    label.dataset.planningShiftVisualV203 = "true";
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

  globalThis.AldusPlanningShiftVisualV203 = Object.freeze({
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