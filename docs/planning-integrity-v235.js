(() => {
  "use strict";

  const VERSION = "20260804-planejamento-metas-fabrica-integridade-v235";
  const USER_RESTORE_DATE = "2026-08-04";
  const USER_RESTORE_COUNT = 5;
  const SNAPSHOT_KEY = "aldusPlanningManualGoalsV235";
  const FACTORY_VIEW = "fabrica-resumos";
  const DAILY_VIEW = "metas-do-dia";
  let reconciling = false;
  let installed = false;

  function positiveInteger(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function localDateISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function currentDate() {
    try {
      if (typeof todayISO === "function") return todayISO();
    } catch {}
    return localDateISO();
  }

  function planningState(targetState = typeof state !== "undefined" ? state : null) {
    if (!targetState || typeof targetState !== "object") return null;
    targetState.planning ||= {};
    targetState.planning.config ||= {};
    return targetState.planning;
  }

  function readSnapshot() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      if (!parsed || positiveInteger(parsed.disciplines) < 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeSnapshot(snapshot) {
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch {}
  }

  function newerSnapshot(left, right) {
    if (!left) return right || null;
    if (!right) return left;
    const leftTime = Date.parse(left.savedAt || "") || 0;
    const rightTime = Date.parse(right.savedAt || "") || 0;
    return rightTime > leftTime ? right : left;
  }

  function stateSnapshot(targetState = typeof state !== "undefined" ? state : null) {
    const planning = planningState(targetState);
    return planning?.manualGoalsConfigV235 || null;
  }

  function authoritativeSnapshot(targetState = typeof state !== "undefined" ? state : null) {
    return newerSnapshot(stateSnapshot(targetState), readSnapshot());
  }

  function recordManualCount(disciplines, topics = disciplines, targetState = typeof state !== "undefined" ? state : null, savedAt = new Date().toISOString()) {
    const planning = planningState(targetState);
    const count = positiveInteger(disciplines);
    if (!planning || !count) return null;
    const snapshot = {
      version: VERSION,
      disciplines: count,
      topics: Math.max(count, positiveInteger(topics, count)),
      savedAt
    };
    planning.manualGoalsConfigV235 = snapshot;
    planning.config.disciplinesPerDay = snapshot.disciplines;
    planning.config.topicsPerDay = snapshot.topics;
    writeSnapshot(snapshot);
    return snapshot;
  }

  function dayType(date, targetState = typeof state !== "undefined" ? state : null) {
    try {
      return typeof getPlanningDayType === "function" ? getPlanningDayType(date, targetState) : "normal";
    } catch {
      return "normal";
    }
  }

  function overrideForDate(date, targetState = typeof state !== "undefined" ? state : null) {
    return planningState(targetState)?.dailyGoalOverridesV235?.[date] || null;
  }

  function setDateOverride(date, disciplines, topics = disciplines, targetState = typeof state !== "undefined" ? state : null, source = "manual") {
    const planning = planningState(targetState);
    const count = positiveInteger(disciplines);
    if (!planning || !date || !count) return null;
    planning.dailyGoalOverridesV235 ||= {};
    const override = {
      disciplines: count,
      topics: Math.max(count, positiveInteger(topics, count)),
      source,
      updatedAt: new Date().toISOString()
    };
    planning.dailyGoalOverridesV235[date] = override;
    return override;
  }

  function installTargetGuard() {
    if (typeof planningTargetsForDate !== "function" || planningTargetsForDate.__aldusIntegrityV235) return false;
    const original = planningTargetsForDate;
    const guarded = function planningTargetsForDateV235(date, targetState = typeof state !== "undefined" ? state : null, opts = {}) {
      const targets = original(date, targetState, opts);
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
    guarded.__aldusIntegrityV235 = true;
    guarded.__aldusOriginal = original;
    planningTargetsForDate = guarded;
    return true;
  }

  function invalidateViews() {
    try {
      if (typeof viewRenderCacheV172 !== "undefined" && viewRenderCacheV172?.delete) {
        viewRenderCacheV172.delete(DAILY_VIEW);
        viewRenderCacheV172.delete(FACTORY_VIEW);
        viewRenderCacheV172.delete("planejamento");
      }
    } catch {}
  }

  function installAlignmentGuard() {
    if (typeof ensureDailyPlanAlignedWithPlanningV174 !== "function" || ensureDailyPlanAlignedWithPlanningV174.__aldusIntegrityV235) return false;
    const original = ensureDailyPlanAlignedWithPlanningV174;
    const guarded = function ensureDailyPlanAlignedWithPlanningV235(...args) {
      const result = original.apply(this, args);
      if (result?.changed) invalidateViews();
      return result;
    };
    guarded.__aldusIntegrityV235 = true;
    guarded.__aldusOriginal = original;
    ensureDailyPlanAlignedWithPlanningV174 = guarded;
    return true;
  }

  function installFactoryGuard() {
    if (typeof renderFactory !== "function" || renderFactory.__aldusIntegrityV235) return false;
    const original = renderFactory;
    const guarded = function renderFactoryV235(...args) {
      if (!reconciling && typeof ensureDailyPlanAlignedWithPlanningV174 === "function") {
        try {
          reconciling = true;
          const alignment = ensureDailyPlanAlignedWithPlanningV174(typeof state !== "undefined" ? state : undefined, currentDate());
          if (alignment?.changed && typeof saveData === "function") saveData({ markLocalChange: true });
        } catch (error) {
          console.warn("[Aldus v235] Não foi possível alinhar o Plano do Dia antes da Fábrica.", error);
        } finally {
          reconciling = false;
        }
      }
      invalidateViews();
      return original.apply(this, args);
    };
    guarded.__aldusIntegrityV235 = true;
    guarded.__aldusOriginal = original;
    renderFactory = guarded;
    return true;
  }

  function bindPlanningForm() {
    const form = document.getElementById("planningConfigForm");
    const countInput = document.getElementById("planningDisciplinesPerDay");
    const topicsInput = document.getElementById("planningTopicsPerDay");
    if (!form || !countInput || form.dataset.integrityV235Bound === "true") return false;
    form.dataset.integrityV235Bound = "true";
    form.addEventListener("submit", () => {
      const count = positiveInteger(countInput.value);
      if (!count) return;
      const topics = Math.max(count, positiveInteger(topicsInput?.value, count));
      recordManualCount(count, topics);
      const date = document.getElementById("goalDate")?.value || currentDate();
      if (overrideForDate(date)) setDateOverride(date, count, topics, undefined, "manual-planning-save");
      invalidateViews();
      window.setTimeout(() => {
        try {
          if (typeof ensureDailyPlanAlignedWithPlanningV174 === "function") {
            const result = ensureDailyPlanAlignedWithPlanningV174(state, date);
            if (result?.changed && typeof saveData === "function") saveData({ markLocalChange: true });
          }
          invalidateViews();
        } catch (error) {
          console.warn("[Aldus v235] Falha ao confirmar o planejamento salvo.", error);
        }
      }, 0);
    }, true);
    return true;
  }

  function restoreAuthorizedGoals() {
    if (typeof state === "undefined") return { changed: false, reason: "state-unavailable" };
    const planning = planningState(state);
    if (!planning) return { changed: false, reason: "planning-unavailable" };
    const alreadyApplied = planning.integrityMigrationV235?.authorizedRestoreDate === USER_RESTORE_DATE;
    const snapshot = authoritativeSnapshot(state);
    let changed = false;

    if (!alreadyApplied) {
      recordManualCount(USER_RESTORE_COUNT, Math.max(USER_RESTORE_COUNT, positiveInteger(planning.config.topicsPerDay, USER_RESTORE_COUNT)), state);
      setDateOverride(USER_RESTORE_DATE, USER_RESTORE_COUNT, USER_RESTORE_COUNT, state, "user-authorized-restoration");
      planning.integrityMigrationV235 = {
        version: VERSION,
        authorizedRestoreDate: USER_RESTORE_DATE,
        goals: USER_RESTORE_COUNT,
        executedAt: new Date().toISOString()
      };
      changed = true;
    } else if (snapshot) {
      const count = positiveInteger(snapshot.disciplines);
      const topics = Math.max(count, positiveInteger(snapshot.topics, count));
      if (positiveInteger(planning.config.disciplinesPerDay) !== count || positiveInteger(planning.config.topicsPerDay) !== topics) {
        planning.config.disciplinesPerDay = count;
        planning.config.topicsPerDay = topics;
        changed = true;
      }
    }

    return { changed, reason: changed ? "restored" : "already-applied" };
  }

  function reconcileTodayAndPersist(configurationChanged) {
    if (typeof state === "undefined") return false;
    let changed = Boolean(configurationChanged);
    const date = currentDate();
    try {
      if (typeof ensureDailyPlanAlignedWithPlanningV174 === "function") {
        const alignment = ensureDailyPlanAlignedWithPlanningV174(state, date);
        changed = Boolean(alignment?.changed) || changed;
      }
      invalidateViews();
      if (changed && typeof saveData === "function") {
        const saved = saveData({ markLocalChange: true });
        if (saved !== false && typeof autoSyncAfterSave === "function") autoSyncAfterSave("integridade-planejamento-v235");
      }
      if (changed && typeof render === "function") render();
      const factoryActive = location.hash === "#fabrica-resumos" || document.querySelector('[data-view="fabrica-resumos"].active');
      if (factoryActive && typeof renderFactory === "function") renderFactory();
      return changed;
    } catch (error) {
      console.error("[Aldus v235] Falha ao recompor as metas autorizadas.", error);
      return false;
    }
  }

  function applyVisibleVersion() {
    document.documentElement.dataset.aldusIntegrityVersion = VERSION;
    const release = globalThis.__ALDUS_APP_RELEASE__;
    if (release?.apply) {
      release.apply();
      return;
    }
    document.querySelectorAll(".app-version").forEach((element) => {
      element.textContent = `Versão: ${VERSION}`;
    });
  }

  function install() {
    if (installed) return true;
    if (typeof document === "undefined" || typeof state === "undefined" || typeof planningTargetsForDate !== "function") return false;
    installTargetGuard();
    installAlignmentGuard();
    installFactoryGuard();
    bindPlanningForm();
    const restoration = restoreAuthorizedGoals();
    applyVisibleVersion();
    reconcileTodayAndPersist(restoration.changed);
    globalThis.__ALDUS_PLANNING_INTEGRITY_V235__ = Object.freeze({
      version: VERSION,
      restoredDate: USER_RESTORE_DATE,
      restoredGoals: USER_RESTORE_COUNT,
      installedAt: new Date().toISOString()
    });
    installed = true;
    return true;
  }

  const timer = window.setInterval(() => {
    if (install()) window.clearInterval(timer);
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(timer);
    install();
  }, 15000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyVisibleVersion, { once: true });
  else applyVisibleVersion();
})();
