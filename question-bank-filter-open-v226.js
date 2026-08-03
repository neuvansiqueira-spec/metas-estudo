(() => {
  "use strict";
  if (globalThis.__aldusQuestionBankFilterOpenV226) return;
  globalThis.__aldusQuestionBankFilterOpenV226 = true;

  const VERSION = "20260803-corrige-funcionamento-banco-questoes-v228";
  const FILTER_IDS = [
    "qbTrainingScope",
    "qbReviewType",
    "qbFilterDiscipline",
    "qbFilterSubject",
    "qbFilterTheme",
    "qbFilterBoard",
    "qbFilterYear",
    "qbFilterAgencyV224",
    "qbFilterRoleV224",
    "qbFilterTypeV224",
    "qbFilterKeyStatusV224"
  ];

  const protectedSelects = new WeakMap();

  function protectSelect(select) {
    if (!select || protectedSelects.has(select)) return;
    protectedSelects.set(select, true);
    if (!select.disabled) select.removeAttribute?.("aria-disabled");
    select.style.pointerEvents = "auto";
    select.style.position = select.style.position || "relative";
    select.style.zIndex = "3";
    select.dataset.qbFilterOpenV226 = "true";

  }

  function ensureFiltersAreInteractive() {
    FILTER_IDS.forEach((id) => protectSelect(document.getElementById(id)));
    document.documentElement.dataset.qbFilterOpenVersion = VERSION;
  }

  function installStyles() {
    if (document.getElementById("qbFilterOpenStylesV226")) return;
    const style = document.createElement("style");
    style.id = "qbFilterOpenStylesV226";
    style.textContent = `
      #view-banco-questoes .qb-filter-grid label,
      #view-questoes .qb-filter-grid label { position: relative; overflow: visible; }
      #view-banco-questoes .qb-filter-grid select[data-qb-filter-open-v226="true"],
      #view-questoes .qb-filter-grid select[data-qb-filter-open-v226="true"] {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 3 !important;
        opacity: 1 !important;
        cursor: pointer;
      }
      #view-banco-questoes .qb-filter-grid::before,
      #view-banco-questoes .qb-filter-grid::after,
      #view-questoes .qb-filter-grid::before,
      #view-questoes .qb-filter-grid::after { pointer-events: none !important; }
    `;
    document.head.appendChild(style);
  }

  function initialize() {
    installStyles();
    ensureFiltersAreInteractive();
  }

  const api = Object.freeze({ VERSION, protectSelect, ensureFiltersAreInteractive });
  Object.defineProperty(globalThis, "__aldusQuestionBankFilterOpenV226Api", {
    value: api,
    configurable: true
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
