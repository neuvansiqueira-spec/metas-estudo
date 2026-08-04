(() => {
  "use strict";

  const VERSION = "20260804-planejamento-metas-fabrica-integridade-v235";
  const SNAPSHOT_KEY = "aldusPlanningManualGoalsV235";
  const SCRIPT_ID = "aldusPlanningIntegrityCoreV235";
  const FACTORY_SCRIPT_ID = "aldusFactoryQueueIntegrityV236";
  const FACTORY_HOTFIX = "factory-queue-integrity-hotfix3";
  let loaded = false;

  function bootstrapReady() {
    try {
      return typeof bootstrapStateReady === "undefined" || bootstrapStateReady === true;
    } catch {
      return false;
    }
  }

  function positiveInteger(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function readLocalSnapshot() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      return positiveInteger(parsed?.disciplines) ? parsed : null;
    } catch {
      return null;
    }
  }

  function newestSnapshot() {
    const stateSnapshot = typeof state !== "undefined" ? state?.planning?.manualGoalsConfigV235 : null;
    const localSnapshot = readLocalSnapshot();
    if (!stateSnapshot) return localSnapshot;
    if (!localSnapshot) return stateSnapshot;
    return (Date.parse(localSnapshot.savedAt || "") || 0) > (Date.parse(stateSnapshot.savedAt || "") || 0)
      ? localSnapshot
      : stateSnapshot;
  }

  function enforceSnapshot() {
    if (typeof state === "undefined" || !state?.planning) return false;
    const snapshot = newestSnapshot();
    const disciplines = positiveInteger(snapshot?.disciplines);
    if (!disciplines) return false;
    const topics = Math.max(disciplines, positiveInteger(snapshot?.topics, disciplines));
    state.planning.config ||= {};
    const changed = positiveInteger(state.planning.config.disciplinesPerDay) !== disciplines
      || positiveInteger(state.planning.config.topicsPerDay) !== topics;
    if (changed) {
      state.planning.config.disciplinesPerDay = disciplines;
      state.planning.config.topicsPerDay = topics;
    }
    return changed;
  }

  function installPersistenceGuards() {
    if (typeof replaceState === "function" && !replaceState.__aldusIntegrityLoaderV235) {
      const originalReplaceState = replaceState;
      const guardedReplaceState = function replaceStateIntegrityV235(...args) {
        const result = originalReplaceState.apply(this, args);
        enforceSnapshot();
        return result;
      };
      guardedReplaceState.__aldusIntegrityLoaderV235 = true;
      guardedReplaceState.__aldusOriginal = originalReplaceState;
      replaceState = guardedReplaceState;
    }

    if (typeof saveData === "function" && !saveData.__aldusIntegrityLoaderV235) {
      const originalSaveData = saveData;
      const guardedSaveData = function saveDataIntegrityV235(...args) {
        enforceSnapshot();
        return originalSaveData.apply(this, args);
      };
      guardedSaveData.__aldusIntegrityLoaderV235 = true;
      guardedSaveData.__aldusOriginal = originalSaveData;
      saveData = guardedSaveData;
    }
  }

  function loadFactoryQueueIntegrity(releaseVersion) {
    if (globalThis.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__ || document.getElementById(FACTORY_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = FACTORY_SCRIPT_ID;
    script.src = `factory-queue-integrity-v236.js?v=${encodeURIComponent(releaseVersion)}&hotfix=${encodeURIComponent(FACTORY_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V236] A correção da fila da Fábrica será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadIntegrityCore() {
    if (loaded || document.getElementById(SCRIPT_ID)) return true;
    if (!bootstrapReady()) return false;
    loaded = true;
    installPersistenceGuards();
    const releaseVersion = globalThis.__ALDUS_APP_RELEASE__?.version || VERSION;
    loadFactoryQueueIntegrity(releaseVersion);
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `planning-integrity-v235.js?v=${encodeURIComponent(releaseVersion)}`;
    script.async = false;
    script.addEventListener("load", () => {
      installPersistenceGuards();
      window.setTimeout(() => {
        enforceSnapshot();
        try {
          if (typeof ensureDailyPlanAlignedWithPlanningV174 === "function") {
            const date = typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10);
            const result = ensureDailyPlanAlignedWithPlanningV174(state, date);
            if (result?.changed && typeof saveData === "function") saveData({ markLocalChange: true });
          }
        } catch (error) {
          console.warn("[Aldus v235] A confirmação pós-carregamento será repetida na próxima abertura.", error);
        }
      }, 250);
    }, { once: true });
    script.addEventListener("error", () => {
      loaded = false;
      script.remove();
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  const timer = window.setInterval(() => {
    if (loadIntegrityCore()) window.clearInterval(timer);
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(timer);
    loadIntegrityCore();
  }, 20000);
})();
