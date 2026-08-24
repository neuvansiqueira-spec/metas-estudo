(() => {
  "use strict";

  const VERSION = "20260824-manual-goal-additive-v379";
  const MARKER = "__aldusManualGoalAdditiveV379";
  const GENERATION_IDS = new Set(["generateCalendarGoals", "generateDailyGoals", "refreshDailyGoalsFromPlanning"]);
  const PLANNING_ROUTES = new Set(["planejamento", "metas-do-dia", "calendario-metas", "central-metas"]);
  const AUTO_ORIGINS = new Set([
    "planejamento", "edital verticalizado", "plano do dia", "planejamento peca diaria",
    "planejamento calendario", "planejamento calendário", "calendario", "calendário",
    "geracao automatica", "geração automática"
  ]);

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const routeName = () => typeof location === "undefined"
    ? ""
    : String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0];

  const goalDate = (goal = {}) => String(goal.date || goal.data || "").slice(0, 10);

  function isManualGoal(goal = {}) {
    if (!goal || typeof goal !== "object") return false;
    const origin = canonical(goal.origin || goal.origem);
    if (goal.manual === true || goal.isManual === true) return true;
    if (origin === "manual" || origin.startsWith("manual ") || origin.includes("usuario")) return true;
    if (AUTO_ORIGINS.has(origin)) return false;
    try {
      if (typeof globalThis.isManualDailyGoal === "function" && globalThis.isManualDailyGoal(goal)) return true;
    } catch {}
    return false;
  }

  function goalIdentity(goal = {}, index = -1) {
    const id = String(goal.id || goal.goalId || goal.dailyGoalId || "").trim();
    if (id) return `id:${id}`;
    return [
      "semantic",
      goalDate(goal),
      canonical(goal.discipline || goal.disciplina),
      canonical(goal.baseSubject || goal.subject || goal.assunto || goal.topic || goal.topico),
      String(goal.createdAt || goal.created_at || ""),
      String(index)
    ].join("|");
  }

  function currentState() {
    try { if (typeof state !== "undefined" && state) return state; } catch {}
    return globalThis.state || null;
  }

  function withManualGoalsOutsideQuota(targetState, operation) {
    if (!targetState || !Array.isArray(targetState.dailyGoals) || typeof operation !== "function") {
      return operation?.();
    }
    const manualGoals = targetState.dailyGoals.filter(isManualGoal);
    if (!manualGoals.length) return operation();

    const automaticGoals = targetState.dailyGoals.filter((goal) => !isManualGoal(goal));
    targetState.dailyGoals = automaticGoals;
    try {
      return operation();
    } finally {
      const resultingGoals = Array.isArray(targetState.dailyGoals) ? targetState.dailyGoals : [];
      const existing = new Set(resultingGoals.map((goal, index) => goalIdentity(goal, index)));
      const restored = manualGoals.filter((goal, index) => !existing.has(goalIdentity(goal, index)));
      targetState.dailyGoals = restored.length ? [...resultingGoals, ...restored] : resultingGoals;
    }
  }

  function wrapStateRoutine(name) {
    const original = globalThis[name];
    if (typeof original !== "function") return false;
    if (original[MARKER] === VERSION) return true;

    const wrapped = function(targetState, ...rest) {
      const resolved = targetState && typeof targetState === "object" ? targetState : currentState();
      if (!resolved || !Array.isArray(resolved.dailyGoals)) return original.call(this, targetState, ...rest);
      return withManualGoalsOutsideQuota(resolved, () => original.call(this, resolved, ...rest));
    };
    Object.defineProperty(wrapped, MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusManualGoalAdditiveOriginal", { value: original });
    globalThis[name] = wrapped;
    return true;
  }

  function wrapSelectionRoutine() {
    const original = globalThis.selectPlanningGoalsForTargets;
    if (typeof original !== "function") return false;
    if (original[MARKER] === VERSION) return true;

    const wrapped = function(args = {}) {
      if (!args || !Array.isArray(args.existingGoals)) return original.call(this, args);
      const existingGoals = args.existingGoals.filter((goal) => !isManualGoal(goal));
      return original.call(this, existingGoals.length === args.existingGoals.length ? args : { ...args, existingGoals });
    };
    Object.defineProperty(wrapped, MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusManualGoalAdditiveOriginal", { value: original });
    globalThis.selectPlanningGoalsForTargets = wrapped;
    return true;
  }

  function installGuards() {
    const repair = wrapStateRoutine("repairDailyPlanningInflationV108");
    const replenish = wrapStateRoutine("replenishMissingDailyPlanningGoalsV116");
    const selection = wrapSelectionRoutine();
    return { repair, replenish, selection };
  }

  function snapshotDate(targetState, date) {
    if (!targetState || !Array.isArray(targetState.dailyGoals) || !date) return [];
    return targetState.dailyGoals
      .map((goal, index) => ({ goal, index, key: goalIdentity(goal, index) }))
      .filter(({ goal }) => goalDate(goal) === date && !isManualGoal(goal));
  }

  function snapshotManualDates(targetState) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return new Map();
    const dates = new Set(targetState.dailyGoals.filter(isManualGoal).map(goalDate).filter(Boolean));
    return new Map([...dates].map((date) => [date, snapshotDate(targetState, date)]));
  }

  function restoreSnapshot(targetState, snapshot) {
    if (!targetState || !Array.isArray(targetState.dailyGoals) || !(snapshot instanceof Map)) return 0;
    let restored = 0;
    const existingIds = new Set(targetState.dailyGoals.map((goal, index) => goalIdentity(goal, index)));
    snapshot.forEach((entries) => {
      entries.forEach(({ goal, key }) => {
        if (existingIds.has(key)) return;
        targetState.dailyGoals.push(goal);
        existingIds.add(key);
        restored += 1;
      });
    });
    return restored;
  }

  function hasManualGoalOnDate(targetState, date) {
    return Boolean(targetState?.dailyGoals?.some((goal) => goalDate(goal) === date && isManualGoal(goal)));
  }

  function ensureAutomaticQuota(targetState, date) {
    if (!targetState || !date || !hasManualGoalOnDate(targetState, date)) return { changed: false, skipped: "no-manual-goal" };
    installGuards();
    const replenish = globalThis.replenishMissingDailyPlanningGoalsV116;
    if (typeof replenish !== "function") return { changed: false, skipped: "replenisher-unavailable" };
    try {
      return replenish(targetState, date) || { changed: false };
    } catch (error) {
      console.warn(`[${VERSION}] Não foi possível recompor a cota automática de ${date}.`, error);
      return { changed: false, skipped: "replenisher-error" };
    }
  }

  function persistIfNeeded(reason, changed) {
    if (!changed) return;
    try { if (typeof saveData === "function") saveData({ markLocalChange: true, reason }); } catch {}
    try { if (typeof render === "function") render(); } catch {}
    try { if (typeof autoSyncAfterSave === "function") autoSyncAfterSave(reason); } catch {}
  }

  function reconcileSnapshot(targetState, snapshot, reason) {
    installGuards();
    const restored = restoreSnapshot(targetState, snapshot);
    let replenished = 0;
    snapshot.forEach((_, date) => {
      const report = ensureAutomaticQuota(targetState, date);
      if (report?.changed) replenished += Array.isArray(report.added) ? report.added.length : 1;
    });
    persistIfNeeded(`manual-goal-additive-v379:${reason}`, restored > 0 || replenished > 0);
    return { restored, replenished };
  }

  function nestedMicrotask(callback) {
    queueMicrotask(() => queueMicrotask(callback));
  }

  function installRuntimeListeners() {
    if (typeof document === "undefined" || document.documentElement?.dataset?.aldusManualGoalAdditiveV379 === "true") return;
    if (document.documentElement) document.documentElement.dataset.aldusManualGoalAdditiveV379 = "true";

    document.addEventListener("submit", (event) => {
      if (event.target?.id !== "goalForm") return;
      installGuards();
      const targetState = currentState();
      const date = String(document.getElementById("goalDate")?.value || "").slice(0, 10);
      const snapshot = new Map([[date, snapshotDate(targetState, date)]]);
      nestedMicrotask(() => reconcileSnapshot(targetState, snapshot, "manual-submit"));
    }, true);

    document.addEventListener("click", (event) => {
      let node = event.target;
      let id = "";
      while (node && node !== document) {
        if (node.id) { id = node.id; break; }
        node = node.parentElement;
      }
      if (!GENERATION_IDS.has(id) || !PLANNING_ROUTES.has(routeName())) return;
      installGuards();
      const targetState = currentState();
      const snapshot = snapshotManualDates(targetState);
      if (!snapshot.size) return;
      nestedMicrotask(() => reconcileSnapshot(targetState, snapshot, `after-${id}`));
    }, true);

    if (typeof window !== "undefined") {
      window.addEventListener("load", () => nestedMicrotask(installGuards), { once: true });
      window.addEventListener("aldus:bootstrap-integrity-v258-ready", installGuards, { once: true });
      window.addEventListener("aldus:post-bootstrap-maintenance-complete", installGuards, { once: true });
      window.addEventListener("aldus:bootstrap-ready", installGuards, { once: true });
      window.addEventListener("hashchange", () => {
        if (PLANNING_ROUTES.has(routeName())) installGuards();
      });
    }
  }

  const api = Object.freeze({
    version: VERSION,
    isManualGoal,
    withManualGoalsOutsideQuota,
    snapshotDate,
    restoreSnapshot,
    ensureAutomaticQuota,
    installGuards
  });

  globalThis.__aldusManualGoalAdditiveV379 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    installGuards();
    installRuntimeListeners();
    nestedMicrotask(installGuards);
  }
})();