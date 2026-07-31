(() => {
  "use strict";

  const VERSION = "20260731-disciplinas-dia-plantao-v200";
  const FIELD_ID = "planningShiftDisciplinesPerDay";
  const LABEL_MARKER = "planning-shift-disciplines-v200";
  const MIN_DISCIPLINES = 1;
  const MAX_DISCIPLINES = 12;

  function integerInRange(value, fallback = 2) {
    const parsed = Number.parseInt(value, 10);
    const safeFallback = Number.parseInt(fallback, 10);
    const normalizedFallback = Number.isFinite(safeFallback)
      ? Math.min(MAX_DISCIPLINES, Math.max(MIN_DISCIPLINES, safeFallback))
      : 2;
    if (!Number.isFinite(parsed)) return normalizedFallback;
    return Math.min(MAX_DISCIPLINES, Math.max(MIN_DISCIPLINES, parsed));
  }

  function configFor(targetState = typeof state !== "undefined" ? state : null) {
    if (typeof planningConfig === "function") return planningConfig(targetState);
    return targetState?.planning?.config || {};
  }

  function shiftDisciplineCount(targetState = typeof state !== "undefined" ? state : null) {
    const config = configFor(targetState);
    return integerInRange(config.shiftDisciplinesPerDay, config.disciplinesPerDay || 2);
  }

  function isShiftDay(date, targetState = typeof state !== "undefined" ? state : null) {
    return typeof getPlanningDayType === "function" && getPlanningDayType(date, targetState) === "plantao";
  }

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(`${FIELD_ID}Style`)) return;
    const style = document.createElement("style");
    style.id = `${FIELD_ID}Style`;
    style.textContent = `
      [data-${LABEL_MARKER}]{position:relative;padding:12px 13px;border:1px solid #bfd4e8;border-radius:16px;background:linear-gradient(180deg,#f7fbff,#eef6ff)}
      [data-${LABEL_MARKER}] small{display:block;color:#526b7f;font-size:.76rem;font-weight:650;line-height:1.35}
      #${FIELD_ID}{background:#fff;color:#172033;font-weight:800}
      #${FIELD_ID}:focus{outline:3px solid rgba(37,99,235,.18);border-color:#2563eb}
    `;
    document.head.appendChild(style);
  }

  function ensureField() {
    if (typeof document === "undefined") return null;
    ensureStyle();
    const shiftHours = document.getElementById("planningShiftHours");
    const host = shiftHours?.closest("label");
    if (!host?.parentElement) return null;
    let input = document.getElementById(FIELD_ID);
    if (!input) {
      const label = document.createElement("label");
      label.setAttribute(`data-${LABEL_MARKER}`, "true");
      label.innerHTML = `Disciplinas no dia de plantão<input id="${FIELD_ID}" name="${FIELD_ID}" type="number" min="${MIN_DISCIPLINES}" max="${MAX_DISCIPLINES}" step="1" inputmode="numeric" required><small>Usada somente nos dias classificados como Plantão. Dias normais e folgas continuam seguindo “Disciplinas por dia”.</small>`;
      host.insertAdjacentElement("afterend", label);
      input = label.querySelector(`#${FIELD_ID}`);
    }
    const value = shiftDisciplineCount();
    if (document.activeElement !== input) input.value = String(value);
    return input;
  }

  function syncSummaryCard() {
    if (typeof document === "undefined") return;
    const summary = document.getElementById("planningSummaryCards");
    if (!summary) return;
    summary.querySelector('[data-planning-shift-summary-v200]')?.remove();
    const card = document.createElement("article");
    card.className = "planning-summary-card";
    card.setAttribute("data-planning-shift-summary-v200", "true");
    const label = document.createElement("span");
    label.className = "planning-summary-label";
    label.textContent = "Disciplinas no plantão";
    const value = document.createElement("strong");
    value.className = "planning-summary-value";
    value.textContent = String(shiftDisciplineCount());
    card.append(label, value);
    summary.appendChild(card);

    const resume = document.getElementById("planningSummaryResume");
    if (resume) {
      const base = String(resume.textContent || "").replace(/\s*•\s*Plantão:\s*\d+\s*disciplina\(s\)\.?/i, "").trim();
      resume.textContent = `${base} • Plantão: ${shiftDisciplineCount()} disciplina(s).`;
    }
  }

  function persistInputBeforeNativeSubmit(event) {
    const form = event.target?.closest?.("#planningConfigForm") || event.target;
    if (form?.id !== "planningConfigForm") return;
    const input = ensureField();
    if (!input) return;
    const count = integerInRange(input.value, shiftDisciplineCount());
    input.value = String(count);
    const config = configFor();
    config.shiftDisciplinesPerDay = count;
  }

  function installPlanningTargetWrapper() {
    if (typeof planningTargetsForDate !== "function" || planningTargetsForDate.__aldusShiftDisciplinesV200) return;
    const original = planningTargetsForDate;
    const wrapped = function planningTargetsForDateV200(date, targetState = typeof state !== "undefined" ? state : null, opts = {}) {
      const targets = original(date, targetState, opts);
      if (!targets || !isShiftDay(date, targetState) || Number(targets.disciplines) <= 0) return targets;
      const disciplines = shiftDisciplineCount(targetState);
      return { ...targets, disciplines, topics: Math.max(disciplines, Number(targets.topics) || 0) };
    };
    wrapped.__aldusShiftDisciplinesV200 = true;
    wrapped.__aldusOriginal = original;
    planningTargetsForDate = wrapped;
  }

  function installGoalGeneratorWrapper() {
    if (typeof generateGoalsForDate !== "function" || generateGoalsForDate.__aldusShiftDisciplinesV200) return;
    const original = generateGoalsForDate;
    const wrapped = function generateGoalsForDateV200(date, opts = {}) {
      const targetState = opts.targetState || (typeof state !== "undefined" ? state : null);
      if (!isShiftDay(date, targetState)) return original(date, opts);
      return original(date, { ...opts, disciplineLimit: shiftDisciplineCount(targetState) });
    };
    wrapped.__aldusShiftDisciplinesV200 = true;
    wrapped.__aldusOriginal = original;
    generateGoalsForDate = wrapped;
  }

  function installSelectableWrapper() {
    if (typeof selectableDisciplineGoalsForDate !== "function" || selectableDisciplineGoalsForDate.__aldusShiftDisciplinesV200) return;
    const original = selectableDisciplineGoalsForDate;
    const wrapped = function selectableDisciplineGoalsForDateV200(date, opts = {}) {
      const targetState = opts.targetState || (typeof state !== "undefined" ? state : null);
      if (!isShiftDay(date, targetState)) return original(date, opts);
      const config = configFor(targetState);
      const previous = config.disciplinesPerDay;
      config.disciplinesPerDay = shiftDisciplineCount(targetState);
      try { return original(date, opts); }
      finally { config.disciplinesPerDay = previous; }
    };
    wrapped.__aldusShiftDisciplinesV200 = true;
    wrapped.__aldusOriginal = original;
    selectableDisciplineGoalsForDate = wrapped;
  }

  function installRenderWrappers() {
    if (typeof renderPlanningSummary === "function" && !renderPlanningSummary.__aldusShiftDisciplinesV200) {
      const originalSummary = renderPlanningSummary;
      const wrappedSummary = function renderPlanningSummaryV200(...args) {
        const result = originalSummary(...args);
        ensureField();
        syncSummaryCard();
        return result;
      };
      wrappedSummary.__aldusShiftDisciplinesV200 = true;
      renderPlanningSummary = wrappedSummary;
    }
    if (typeof renderPlanning === "function" && !renderPlanning.__aldusShiftDisciplinesV200) {
      const originalPlanning = renderPlanning;
      const wrappedPlanning = function renderPlanningV200(...args) {
        const result = originalPlanning(...args);
        ensureField();
        syncSummaryCard();
        return result;
      };
      wrappedPlanning.__aldusShiftDisciplinesV200 = true;
      renderPlanning = wrappedPlanning;
    }
  }

  function initialize() {
    installPlanningTargetWrapper();
    installGoalGeneratorWrapper();
    installSelectableWrapper();
    installRenderWrappers();
    const field = ensureField();
    syncSummaryCard();
    const form = typeof document !== "undefined" ? document.getElementById("planningConfigForm") : null;
    if (form && form.dataset.shiftDisciplinesBoundV200 !== "true") {
      form.dataset.shiftDisciplinesBoundV200 = "true";
      form.addEventListener("submit", persistInputBeforeNativeSubmit, true);
      field?.addEventListener("input", () => {
        const valid = Number.isInteger(Number(field.value)) && Number(field.value) >= MIN_DISCIPLINES && Number(field.value) <= MAX_DISCIPLINES;
        field.setCustomValidity(valid ? "" : `Informe um número inteiro entre ${MIN_DISCIPLINES} e ${MAX_DISCIPLINES}.`);
      });
    }
    return Boolean(field || typeof document === "undefined");
  }

  const api = Object.freeze({ version: VERSION, fieldId: FIELD_ID, integerInRange, shiftDisciplineCount, isShiftDay, initialize });
  globalThis.AldusPlanningShiftDisciplinesV200 = api;

  if (typeof document === "undefined") initialize();
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else setTimeout(initialize, 0);
})();
