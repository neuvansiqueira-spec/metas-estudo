(() => {
  "use strict";

  const VERSION = "20260831-daily-goals-explicit-mutation-v419";
  const SNAPSHOT_KEY = "aldusPlanningManualGoalsV235";
  const FACTORY_VIEW = "fabrica-resumos";
  const DAILY_VIEW = "metas-do-dia";
  const STARTUP_RECONCILE_MARKER = "__aldusDailyPlanStartupReconciledV406";
  const POST_BOOTSTRAP_ATTR = "data-aldus-bootstrap-maintenance-ms";
  let installed = false;

  function positiveInteger(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function currentState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    const fallback = globalThis.state;
    return fallback && typeof fallback === "object" ? fallback : null;
  }

  function planningState(targetState = currentState()) {
    if (!targetState || typeof targetState !== "object") return null;
    targetState.planning ||= {};
    targetState.planning.config ||= {};
    return targetState.planning;
  }

  function readSnapshot() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      return parsed && positiveInteger(parsed.disciplines) ? parsed : null;
    } catch {
      return null;
    }
  }

  function stateSnapshot(targetState = currentState()) {
    return planningState(targetState)?.manualGoalsConfigV235 || null;
  }

  function newerSnapshot(left, right) {
    if (!left) return right || null;
    if (!right) return left;
    return (Date.parse(right.savedAt || "") || 0) > (Date.parse(left.savedAt || "") || 0) ? right : left;
  }

  function authoritativeSnapshot(targetState = currentState()) {
    return newerSnapshot(stateSnapshot(targetState), readSnapshot());
  }

  function enforceSnapshot(targetState = currentState()) {
    const planning = planningState(targetState);
    const snapshot = authoritativeSnapshot(targetState);
    const disciplines = positiveInteger(snapshot?.disciplines);
    if (!planning || !disciplines) return false;
    const topics = Math.max(disciplines, positiveInteger(snapshot?.topics, disciplines));
    const changed = positiveInteger(planning.config.disciplinesPerDay) !== disciplines
      || positiveInteger(planning.config.topicsPerDay) !== topics;
    if (changed) {
      planning.config.disciplinesPerDay = disciplines;
      planning.config.topicsPerDay = topics;
    }
    return changed;
  }

  function postBootstrapMaintenanceComplete() {
    try {
      const root = typeof document !== "undefined" ? document.documentElement : null;
      return Boolean(root && typeof root.getAttribute === "function" && root.getAttribute(POST_BOOTSTRAP_ATTR) !== null);
    } catch {
      return false;
    }
  }

  function installPersistenceGuards() {
    if (typeof globalThis.replaceState === "function" && !globalThis.replaceState.__aldusIntegrityV388) {
      const original = globalThis.replaceState;
      const guarded = function replaceStateIntegrityV388(...args) {
        const result = original.apply(this, args);
        enforceSnapshot();
        return result;
      };
      Object.defineProperty(guarded, "__aldusIntegrityV388", { value: VERSION });
      Object.defineProperty(guarded, "__aldusOriginal", { value: original });
      globalThis.replaceState = guarded;
    }
    if (typeof globalThis.saveData === "function" && !globalThis.saveData.__aldusIntegrityV388) {
      const original = globalThis.saveData;
      const guarded = function saveDataIntegrityV388(...args) {
        enforceSnapshot();
        return original.apply(this, args);
      };
      Object.defineProperty(guarded, "__aldusIntegrityV388", { value: VERSION });
      Object.defineProperty(guarded, "__aldusOriginal", { value: original });
      globalThis.saveData = guarded;
    }
  }

  function recordManualCount(disciplines, topics = disciplines, targetState = currentState()) {
    const planning = planningState(targetState);
    const count = positiveInteger(disciplines);
    if (!planning || !count) return null;
    const snapshot = {
      version: VERSION,
      disciplines: count,
      topics: Math.max(count, positiveInteger(topics, count)),
      savedAt: new Date().toISOString()
    };
    planning.manualGoalsConfigV235 = snapshot;
    planning.config.disciplinesPerDay = snapshot.disciplines;
    planning.config.topicsPerDay = snapshot.topics;
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch {}
    return snapshot;
  }

  function dayType(date, targetState = currentState()) {
    try { return typeof globalThis.getPlanningDayType === "function" ? globalThis.getPlanningDayType(date, targetState) : "normal"; }
    catch { return "normal"; }
  }

  function completedRecordsV411(targetState = currentState()) {
    try {
      return typeof globalThis.completedPlanningSubjectRecords === "function"
        ? globalThis.completedPlanningSubjectRecords(targetState)
        : (targetState?.dailyGoals || []).filter((goal) => goal?.status === "Concluída");
    } catch {
      return [];
    }
  }

  function recordMatchesCompletedSubjectV411(record = {}, completedRecords = completedRecordsV411()) {
    try {
      return typeof globalThis.planningRecordMatchesCompletedSubject === "function"
        ? globalThis.planningRecordMatchesCompletedSubject(record, completedRecords)
        : record?.status === "Concluída";
    } catch {
      return record?.status === "Concluída";
    }
  }

  function isCompletedGoalV411(goal = {}) {
    try {
      return typeof globalThis.isGoalDone === "function"
        ? globalThis.isGoalDone(goal)
        : goal?.status === "Concluída";
    } catch {
      return goal?.status === "Concluída";
    }
  }

  function isPlanningStudyGoalV411(goal = {}) {
    try {
      return typeof globalThis.isPlanningStudyGoal === "function"
        ? globalThis.isPlanningStudyGoal(goal)
        : true;
    } catch {
      return true;
    }
  }

  function shouldHideFromDailyPlanV411(goal = {}, completedRecords = completedRecordsV411()) {
    return isCompletedGoalV411(goal) || recordMatchesCompletedSubjectV411(goal, completedRecords);
  }

  function isActionableStudyGoalV411(goal = {}, completedRecords = completedRecordsV411()) {
    return isPlanningStudyGoalV411(goal) && !shouldHideFromDailyPlanV411(goal, completedRecords);
  }

  function goalDateV411(goal = {}) {
    return goal.date || goal.data || "";
  }

  function installScoreContextGuardV411() {
    const current = globalThis.buildPlanningScoreContext;
    if (typeof current !== "function" || current.__aldusCompletedGoalsV411) return false;
    const guarded = function buildPlanningScoreContextV411(targetState = currentState(), ...args) {
      const context = current.call(this, targetState, ...args);
      if (!context || !Array.isArray(context.candidates)) return context;
      const completedRecords = completedRecordsV411(targetState);
      return {
        ...context,
        candidates: context.candidates.filter((candidate) => !recordMatchesCompletedSubjectV411(candidate, completedRecords))
      };
    };
    Object.defineProperty(guarded, "__aldusCompletedGoalsV411", { value: VERSION });
    Object.defineProperty(guarded, "__aldusOriginal", { value: current });
    globalThis.buildPlanningScoreContext = guarded;
    return true;
  }

  function installReplenishmentGuardV411() {
    const current = globalThis.replenishMissingDailyPlanningGoalsV116;
    if (typeof current !== "function" || current.__aldusCompletedGoalsV411) return false;
    const guarded = function replenishMissingDailyPlanningGoalsV411(targetState = currentState(), date = currentDateISO(), opts = {}) {
      if (!targetState || !Array.isArray(targetState.dailyGoals)
        || typeof globalThis.planningTargetsForDate !== "function"
        || typeof globalThis.eligiblePlanningGoalsForDate !== "function"
        || typeof globalThis.selectPlanningGoalsForTargets !== "function") {
        return current.call(this, targetState, date, opts);
      }

      const targets = globalThis.planningTargetsForDate(date, targetState, opts) || {};
      const topicTarget = Math.max(0, Number(targets.topics) || 0);
      const allStudyGoals = targetState.dailyGoals.filter((goal) => goalDateV411(goal) === date && isPlanningStudyGoalV411(goal));
      const completedRecords = completedRecordsV411(targetState);
      const actionableGoals = allStudyGoals.filter((goal) => isActionableStudyGoalV411(goal, completedRecords));
      const report = {
        date,
        topicTarget,
        before: actionableGoals.length,
        after: actionableGoals.length,
        added: [],
        preserved: allStudyGoals.map((goal) => goal.id).filter(Boolean),
        warnings: [],
        changed: false,
        skipped: ""
      };

      if (topicTarget <= 0) { report.skipped = "zero-target-safety"; return report; }
      if (actionableGoals.length >= topicTarget) { report.skipped = "target-already-met"; return report; }

      const reservedSyllabusIds = new Set();
      actionableGoals.forEach((goal) => {
        try {
          const key = typeof globalThis.goalSyllabusReservationKey === "function"
            ? globalThis.goalSyllabusReservationKey(goal)
            : goal.syllabusItemId;
          if (key) reservedSyllabusIds.add(key);
        } catch {}
      });
      const scoreContext = opts.scoreContext || globalThis.buildPlanningScoreContext(targetState);
      const eligibleGoals = globalThis.eligiblePlanningGoalsForDate(date, {
        targetState,
        scoreContext,
        existingGoals: actionableGoals,
        reservedSyllabusIds
      }).filter((goal) => isActionableStudyGoalV411(goal, completedRecords));
      const selection = globalThis.selectPlanningGoalsForTargets({
        date,
        topicTarget,
        disciplineTarget: Math.max(1, Number(targets.disciplines) || 1),
        eligibleGoals,
        existingGoals: actionableGoals
      });
      const now = new Date().toISOString();
      (selection?.selected || []).forEach((goal) => {
        if (!isActionableStudyGoalV411(goal, completedRecords)) return;
        goal.origin = goal.origem = "planejamento";
        goal.createdAt ||= now;
        goal.updatedAt = now;
        targetState.dailyGoals.push(goal);
        report.added.push(goal.id);
      });
      report.after = targetState.dailyGoals.filter((goal) => goalDateV411(goal) === date && isActionableStudyGoalV411(goal, completedRecords)).length;
      report.changed = report.added.length > 0;
      if (report.after < topicTarget) report.warnings.push(`Planejamento prevê ${topicTarget} assunto(s), mas existem apenas ${report.after} assunto(s) elegível(is) sem repetição.`);
      if (report.changed) {
        targetState.migrations ||= {};
        targetState.migrations.dailyPlanningReplenishmentV411 = {
          executedAt: now,
          date,
          before: report.before,
          after: report.after,
          added: report.added.length
        };
      }
      return report;
    };
    Object.defineProperty(guarded, "__aldusCompletedGoalsV411", { value: VERSION });
    Object.defineProperty(guarded, "__aldusOriginal", { value: current });
    globalThis.replenishMissingDailyPlanningGoalsV116 = guarded;
    return true;
  }

  function installNextGoalGuardV411() {
    const current = globalThis.renderNextDailyGoal;
    if (typeof current !== "function" || current.__aldusCompletedGoalsV411) return false;
    const guarded = function renderNextDailyGoalV411(dayGoals = [], ...args) {
      const completedRecords = completedRecordsV411(currentState());
      return current.call(this, (dayGoals || []).filter((goal) => !shouldHideFromDailyPlanV411(goal, completedRecords)), ...args);
    };
    Object.defineProperty(guarded, "__aldusCompletedGoalsV411", { value: VERSION });
    Object.defineProperty(guarded, "__aldusOriginal", { value: current });
    globalThis.renderNextDailyGoal = guarded;
    return true;
  }

  function hideCompletedDailyGoalCardsV411(targetState = currentState()) {
    if (typeof document === "undefined" || !targetState) return 0;
    const completedRecords = completedRecordsV411(targetState);
    const goalsById = new Map((targetState.dailyGoals || []).map((goal) => [String(goal.id || ""), goal]));
    let removed = 0;
    document.querySelectorAll('#view-metas-do-dia [data-daily-goal-details]').forEach((card) => {
      const goal = goalsById.get(String(card.dataset?.dailyGoalDetails || ""));
      if (!goal || !shouldHideFromDailyPlanV411(goal, completedRecords)) return;
      card.remove();
      removed += 1;
    });
    const board = document.querySelector("#view-metas-do-dia .daily-goals-board");
    const resume = board?.closest("details")?.querySelector(".daily-plan-resume");
    if (resume) {
      const visible = board.querySelectorAll("[data-daily-goal-details]").length;
      resume.textContent = `${visible} meta(s) pendente(s)`;
    }
    return removed;
  }

  function installDailyGoalsRenderGuardV411() {
    const current = globalThis.renderDailyGoals;
    if (typeof current !== "function" || current.__aldusCompletedGoalsV411) return false;
    const guarded = function renderDailyGoalsV411(...args) {
      const result = current.apply(this, args);
      hideCompletedDailyGoalCardsV411(currentState());
      return result;
    };
    Object.defineProperty(guarded, "__aldusCompletedGoalsV411", { value: VERSION });
    Object.defineProperty(guarded, "__aldusOriginal", { value: current });
    globalThis.renderDailyGoals = guarded;
    return true;
  }

  function installCompletedGoalGuardsV411() {
    installScoreContextGuardV411();
    installReplenishmentGuardV411();
    installNextGoalGuardV411();
    installDailyGoalsRenderGuardV411();
  }

  function overrideForDate(date, targetState = currentState()) {
    return planningState(targetState)?.dailyGoalOverridesV235?.[date] || null;
  }

  function installTargetGuard() {
    const current = globalThis.planningTargetsForDate;
    if (typeof current !== "function" || current.__aldusIntegrityV388) return false;
    const guarded = function planningTargetsForDateV388(date, targetState = currentState(), opts = {}) {
      const targets = current(date, targetState, opts);
      if (!targets || Number(targets.disciplines) <= 0) return targets;
      const override = overrideForDate(date, targetState);
      if (override) {
        const disciplines = positiveInteger(override.disciplines, Number(targets.disciplines) || 1);
        return { ...targets, disciplines, topics: Math.max(disciplines, positiveInteger(override.topics, disciplines)) };
      }
      if (dayType(date, targetState) === "plantao") return targets;
      const config = planningState(targetState)?.config || {};
      const snapshot = authoritativeSnapshot(targetState);
      const disciplines = positiveInteger(snapshot?.disciplines, positiveInteger(config.disciplinesPerDay, Number(targets.disciplines) || 1));
      const topics = Math.max(disciplines, positiveInteger(snapshot?.topics, positiveInteger(config.topicsPerDay, disciplines)));
      return { ...targets, disciplines, topics };
    };
    Object.defineProperty(guarded, "__aldusIntegrityV388", { value: VERSION });
    Object.defineProperty(guarded, "__aldusOriginal", { value: current });
    globalThis.planningTargetsForDate = guarded;
    return true;
  }

  function invalidateViews() {
    try {
      if (typeof globalThis.viewRenderCacheV172 !== "undefined" && globalThis.viewRenderCacheV172?.delete) {
        globalThis.viewRenderCacheV172.delete(DAILY_VIEW);
        globalThis.viewRenderCacheV172.delete(FACTORY_VIEW);
        globalThis.viewRenderCacheV172.delete("planejamento");
      }
    } catch {}
  }

  function currentDateISO() {
    try {
      if (typeof globalThis.todayISO === "function") return globalThis.todayISO();
    } catch {}
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function reconcileDailyPlanOnStartup(targetState = currentState()) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return { changed: false, skipped: "state-unavailable" };
    if (globalThis[STARTUP_RECONCILE_MARKER] === true) return { changed: false, skipped: "already-diagnosed" };

    const date = currentDateISO();
    const completedRecords = completedRecordsV411(targetState);
    const allStudyGoals = targetState.dailyGoals.filter((goal) => goalDateV411(goal) === date && isPlanningStudyGoalV411(goal));
    const actionableGoals = allStudyGoals.filter((goal) => isActionableStudyGoalV411(goal, completedRecords));
    let targets = {};
    try {
      targets = typeof globalThis.planningTargetsForDate === "function"
        ? (globalThis.planningTargetsForDate(date, targetState) || {})
        : {};
    } catch {}
    const topicTarget = Math.max(0, Number(targets.topics) || 0);
    const report = {
      changed: false,
      date,
      topicTarget,
      totalStudyGoals: allStudyGoals.length,
      actionableGoals: actionableGoals.length,
      missingActionableGoals: Math.max(0, topicTarget - actionableGoals.length),
      skipped: "automatic-mutation-disabled-v419"
    };
    globalThis[STARTUP_RECONCILE_MARKER] = true;
    globalThis.__aldusDailyPlanStartupDiagnosticV419 = Object.freeze({ ...report });
    return report;
  }

  function finalizeStartupReconcile(targetState = currentState()) {
    if (!postBootstrapMaintenanceComplete()) return { changed: false, skipped: "post-bootstrap-pending" };
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return { changed: false, skipped: "state-unavailable" };
    enforceSnapshot(targetState);
    return reconcileDailyPlanOnStartup(targetState);
  }

  function installFactoryGuard() {
    const current = globalThis.renderFactory;
    if (typeof current !== "function" || current.__aldusIntegrityV388) return false;
    const guarded = function renderFactoryV388(...args) {
      invalidateViews();
      return current.apply(this, args);
    };
    Object.defineProperty(guarded, "__aldusIntegrityV388", { value: VERSION });
    Object.defineProperty(guarded, "__aldusOriginal", { value: current });
    globalThis.renderFactory = guarded;
    return true;
  }

  function bindPlanningForm() {
    const form = document.getElementById("planningConfigForm");
    const countInput = document.getElementById("planningDisciplinesPerDay");
    const topicsInput = document.getElementById("planningTopicsPerDay");
    if (!form || !countInput || form.dataset.integrityV388Bound === "true") return false;
    form.dataset.integrityV388Bound = "true";
    form.addEventListener("submit", () => {
      const count = positiveInteger(countInput.value);
      if (!count) return;
      recordManualCount(count, Math.max(count, positiveInteger(topicsInput?.value, count)));
      invalidateViews();
    }, true);
    return true;
  }

  function install() {
    const targetState = currentState();
    if (typeof document === "undefined" || !targetState || typeof globalThis.planningTargetsForDate !== "function") return false;

    if (!installed) {
      installPersistenceGuards();
      installTargetGuard();
      installCompletedGoalGuardsV411();
      installFactoryGuard();
      bindPlanningForm();

      document.documentElement.dataset.aldusIntegrityVersion = VERSION;
      globalThis.__ALDUS_PLANNING_INTEGRITY_V235__ = Object.freeze({
        version: VERSION,
        explicitOnly: true,
        startupDailyPlanReconcile: false,
        automaticDailyGoalMutationDisabled: true,
        postBootstrapAuthoritative: true,
        completedGoalsReviewOnly: true,
        installedAt: new Date().toISOString()
      });
      installed = true;
    }

    finalizeStartupReconcile(currentState());
    return true;
  }

  const attemptInstall = () => install();
  attemptInstall();
  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", attemptInstall, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", attemptInstall, { once: true });
    window.addEventListener("aldus:bootstrap-ready", attemptInstall, { once: true });
    window.addEventListener("load", attemptInstall, { once: true });
  }
  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attemptInstall, { once: true });
  }
})();
