(() => {
  "use strict";
  if (globalThis.__aldusQuestionBankFilterOpenV226) return;
  globalThis.__aldusQuestionBankFilterOpenV226 = true;

  const VERSION = "20260803-corrige-abertura-filtros-v226";
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

  const elementInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  const selectValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  const protectedSelects = new WeakMap();

  function originalHTML(select) {
    return elementInnerHTML?.get ? elementInnerHTML.get.call(select) : "";
  }

  function setOriginalHTML(select, value) {
    if (elementInnerHTML?.set) elementInnerHTML.set.call(select, value);
  }

  function originalValue(select) {
    return selectValue?.get ? selectValue.get.call(select) : "";
  }

  function setOriginalValue(select, value) {
    if (selectValue?.set) selectValue.set.call(select, value);
  }

  function hasOption(select, value) {
    return [...(select.options || [])].some((option) => String(option.value) === String(value));
  }

  function flush(select) {
    const state = protectedSelects.get(select);
    if (!state || state.applying) return;
    state.locked = false;
    state.applying = true;
    try {
      const previousValue = originalValue(select);
      if (state.pendingHTML !== null) {
        setOriginalHTML(select, state.pendingHTML);
        state.pendingHTML = null;
      }
      const desiredValue = state.pendingValue !== null ? state.pendingValue : previousValue;
      state.pendingValue = null;
      if (hasOption(select, desiredValue)) setOriginalValue(select, desiredValue);
      else if (hasOption(select, "")) setOriginalValue(select, "");
    } finally {
      state.applying = false;
    }
  }

  function lock(select) {
    const state = protectedSelects.get(select);
    if (!state) return;
    state.locked = true;
    clearTimeout(state.releaseTimer);
  }

  function releaseSoon(select, delay = 40) {
    const state = protectedSelects.get(select);
    if (!state) return;
    clearTimeout(state.releaseTimer);
    state.releaseTimer = setTimeout(() => flush(select), delay);
  }

  function protectSelect(select) {
    if (!select || protectedSelects.has(select)) return;
    const state = {
      locked: false,
      applying: false,
      pendingHTML: null,
      pendingValue: null,
      releaseTimer: 0
    };
    protectedSelects.set(select, state);

    try {
      Object.defineProperty(select, "innerHTML", {
        configurable: true,
        enumerable: false,
        get() {
          return originalHTML(this);
        },
        set(next) {
          const incoming = String(next ?? "");
          const current = originalHTML(this);
          if (incoming === current) return;
          const currentState = protectedSelects.get(this);
          if (currentState?.locked && !currentState.applying) {
            currentState.pendingHTML = incoming;
            return;
          }
          setOriginalHTML(this, incoming);
        }
      });

      Object.defineProperty(select, "value", {
        configurable: true,
        enumerable: true,
        get() {
          return originalValue(this);
        },
        set(next) {
          const incoming = String(next ?? "");
          const current = originalValue(this);
          if (incoming === current) return;
          const currentState = protectedSelects.get(this);
          if (currentState?.locked && !currentState.applying) {
            currentState.pendingValue = incoming;
            return;
          }
          setOriginalValue(this, incoming);
        }
      });
    } catch {
      // Navegadores que não permitem sombrear acessores continuam com o reforço visual abaixo.
    }

    select.disabled = false;
    select.removeAttribute?.("aria-disabled");
    select.style.pointerEvents = "auto";
    select.style.position = select.style.position || "relative";
    select.style.zIndex = "3";
    select.dataset.qbFilterOpenV226 = "true";

    select.addEventListener("pointerdown", () => lock(select), true);
    select.addEventListener("mousedown", () => lock(select), true);
    select.addEventListener("touchstart", () => lock(select), { capture: true, passive: true });
    select.addEventListener("focus", () => lock(select), true);
    select.addEventListener("change", () => releaseSoon(select, 0), true);
    select.addEventListener("blur", () => releaseSoon(select, 0), true);
    select.addEventListener("keydown", (event) => {
      if (["Escape", "Enter", "Tab"].includes(event.key)) releaseSoon(select, 0);
    }, true);
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
    const observer = new MutationObserver(() => ensureFiltersAreInteractive());
    observer.observe(document.body, { childList: true, subtree: true });
    globalThis.__aldusQuestionBankFilterOpenV226Observer = observer;
  }

  const api = Object.freeze({ VERSION, protectSelect, flush, ensureFiltersAreInteractive });
  Object.defineProperty(globalThis, "__aldusQuestionBankFilterOpenV226Api", {
    value: api,
    configurable: true
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
