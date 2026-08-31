(() => {
  "use strict";

  const VERSION = "20260830-plano-dia-post-bootstrap-v410";
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
        if (postBootstrapMaintenanceComplete()) reconcileDailyPlanOnStartup();
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
    if (globalThis[STARTUP_RECONCILE_MARKER] === true) return { changed: false, skipped: "already-reconciled" };

    const replenish = globalThis.replenishMissingDailyPlanningGoalsV116;
    if (typeof replenish !== "function") return { changed: false, skipped: "replenisher-unavailable" };

    const date = currentDateISO();
    try {
      const report = replenish(targetState, date) || { changed: false };

      if (report.changed) {
        invalidateViews();
        const reason = "daily-plan-post-bootstrap-reconcile-v410";
        if (typeof globalThis.saveData === "function") {
          globalThis.saveData({ markLocalChange: true, skipDerivedRefresh: true, reason });
        }
        if (typeof globalThis.render === "function") globalThis.render();
        try { if (typeof globalThis.autoSyncAfterSave === "function") globalThis.autoSyncAfterSave(reason); } catch {}
      }

      globalThis[STARTUP_RECONCILE_MARKER] = true;
      return report;
    } catch (error) {
      globalThis[STARTUP_RECONCILE_MARKER] = false;
      console.warn(`[${VERSION}] Não foi possível reconciliar automaticamente o Plano do Dia.`, error);
      return { changed: false, skipped: "replenisher-error" };
    }
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
      installFactoryGuard();
      bindPlanningForm();

      document.documentElement.dataset.aldusIntegrityVersion = VERSION;
      globalThis.__ALDUS_PLANNING_INTEGRITY_V235__ = Object.freeze({
        version: VERSION,
        explicitOnly: true,
        startupDailyPlanReconcile: true,
        postBootstrapAuthoritative: true,
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
