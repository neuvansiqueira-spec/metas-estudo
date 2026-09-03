(() => {
  "use strict";

  // V441 — metas protegidas continuam visíveis no Plano do Dia mesmo quando
  // o filtro de acionáveis encontra o mesmo assunto concluído em outro lugar.

  const VERSION = "20260903-daily-plan-visible-goals-v441";
  const API_KEY = "__ALDUS_DAILY_PLAN_VISIBLE_GOALS_V441__";
  const WRAP_MARK = "__aldusDailyPlanVisibleGoalsV441";

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const idOf = (goal) => String(goal?.id ?? "").trim();

  function resolveAppState() {
    try {
      // O núcleo declara este binding com `const`; ele não é propriedade global.
      // eslint-disable-next-line no-undef
      if (typeof state !== "undefined" && isObject(state)) return state;
    } catch { /* binding ainda indisponível */ }
    return null;
  }

  function today() {
    try {
      // eslint-disable-next-line no-undef
      if (typeof todayISO === "function") return todayISO();
    } catch { /* núcleo ainda indisponível */ }
    return new Date().toISOString().slice(0, 10);
  }

  function dateOf(goal) {
    try {
      // eslint-disable-next-line no-undef
      if (typeof goalDateValue === "function") return goalDateValue(goal);
    } catch { /* usa os campos compatíveis abaixo */ }
    return String(goal?.date ?? goal?.data ?? "").trim();
  }

  function protectedGoal(goal) {
    try {
      // eslint-disable-next-line no-undef
      return typeof isProtectedDailyGoal === "function" && isProtectedDailyGoal(goal);
    } catch {
      return false;
    }
  }

  function restoreProtectedGoals(list, targetState, date) {
    if (!Array.isArray(list) || !Array.isArray(targetState?.dailyGoals)) return list;

    const visibleReferences = new Set(list);
    const visibleIds = new Set(list.map(idOf).filter(Boolean));
    const restored = [];

    for (const goal of targetState.dailyGoals) {
      if (dateOf(goal) !== date || !protectedGoal(goal)) continue;
      const id = idOf(goal);
      if (visibleReferences.has(goal) || (id && visibleIds.has(id))) continue;
      restored.push(goal);
      visibleReferences.add(goal);
      if (id) visibleIds.add(id);
    }

    return restored.length ? [...list, ...restored] : list;
  }

  function install() {
    const original = globalThis.dailyPlanGoalsForDisplay;
    if (typeof original !== "function") return false;
    if (original[WRAP_MARK] === VERSION) return true;

    const wrapped = function dailyPlanGoalsForDisplayV441(...args) {
      const list = original.apply(this, args);
      if (!Array.isArray(list)) return list;
      const targetState = isObject(args[0]) ? args[0] : resolveAppState();
      const date = args[1] === undefined ? today() : args[1];
      return restoreProtectedGoals(list, targetState, date);
    };

    Object.defineProperty(wrapped, WRAP_MARK, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusV441Original", { value: original });
    globalThis.dailyPlanGoalsForDisplay = wrapped;
    return true;
  }

  const api = Object.freeze({
    version: VERSION,
    restoreProtectedGoals,
    install
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("aldus:bootstrap-ready", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();
