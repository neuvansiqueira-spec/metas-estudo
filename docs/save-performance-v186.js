(() => {
  "use strict";

  if (globalThis.__aldusSavePerformanceV186) return;
  if (typeof saveData !== "function") return;
  if (typeof requestIdleCallback !== "function" && typeof setTimeout !== "function") return;

  const VERSION = "20260730-salvamento-responsivo-v186";
  const originalSaveData = saveData;
  let derivedRefreshPending = false;
  let derivedRefreshInFlight = false;
  let derivedRefreshHandle = null;
  let derivedScheduleMode = "";
  let pendingReasons = new Set();

  function cancelScheduledRefresh() {
    if (derivedRefreshHandle === null) return;
    if (derivedScheduleMode === "idle" && typeof cancelIdleCallback === "function") {
      cancelIdleCallback(derivedRefreshHandle);
    } else {
      clearTimeout(derivedRefreshHandle);
    }
    derivedRefreshHandle = null;
    derivedScheduleMode = "";
  }

  function runDerivedRefresh(reason = "scheduled") {
    if (!derivedRefreshPending || derivedRefreshInFlight) return false;
    cancelScheduledRefresh();
    derivedRefreshPending = false;
    derivedRefreshInFlight = true;

    const startedAt = performance.now();
    const report = {
      version: VERSION,
      reason,
      pendingReasons: [...pendingReasons],
      planningPriorityMs: 0,
      reinforcementRepairMs: 0,
      factoryPlanningMs: 0,
      persistenceMs: 0,
      renderMs: 0,
      totalMs: 0
    };
    pendingReasons = new Set();

    try {
      if (typeof refreshPlanningPrioritiesForQuestionChangesV155 === "function") {
        const step = performance.now();
        refreshPlanningPrioritiesForQuestionChangesV155(state);
        report.planningPriorityMs = Number((performance.now() - step).toFixed(1));
      }
      if (typeof repairInvalidReinforcementGoalsV157 === "function") {
        const step = performance.now();
        globalThis.__reinforcementClassificationRepairV157 = repairInvalidReinforcementGoalsV157(state);
        report.reinforcementRepairMs = Number((performance.now() - step).toFixed(1));
      }
      if (typeof syncFactoryMaterialsPlanningV80 === "function") {
        const step = performance.now();
        syncFactoryMaterialsPlanningV80(state);
        report.factoryPlanningMs = Number((performance.now() - step).toFixed(1));
      }

      const persistenceStartedAt = performance.now();
      originalSaveData({ skipDerivedRefresh: true, markLocalChange: false });
      report.persistenceMs = Number((performance.now() - persistenceStartedAt).toFixed(1));

      if (typeof document === "undefined" || !document.hidden) {
        const renderStartedAt = performance.now();
        if (typeof render === "function") render();
        report.renderMs = Number((performance.now() - renderStartedAt).toFixed(1));
      }
      if (typeof autoSyncAfterSave === "function") {
        autoSyncAfterSave("deferred-derived-refresh-v186");
      }
      return true;
    } catch (error) {
      report.error = String(error?.message || error);
      console.warn("[Aldus v186] A atualização derivada em segundo plano falhou; os dados principais já foram preservados.", error);
      return false;
    } finally {
      report.totalMs = Number((performance.now() - startedAt).toFixed(1));
      report.finishedAt = new Date().toISOString();
      globalThis.__aldusDeferredDerivedRefreshV186 = Object.freeze(report);
      derivedRefreshInFlight = false;
      if (derivedRefreshPending) scheduleDerivedRefresh("queued-during-refresh");
    }
  }

  function scheduleDerivedRefresh(reason = "save") {
    derivedRefreshPending = true;
    pendingReasons.add(reason);
    cancelScheduledRefresh();

    const run = () => {
      derivedRefreshHandle = null;
      derivedScheduleMode = "";
      runDerivedRefresh("idle");
    };

    if (typeof requestIdleCallback === "function") {
      derivedScheduleMode = "idle";
      derivedRefreshHandle = requestIdleCallback(run, { timeout: 900 });
    } else {
      derivedScheduleMode = "timeout";
      derivedRefreshHandle = setTimeout(run, 220);
    }
  }

  const responsiveSaveData = function responsiveSaveDataV186(options = {}) {
    if (options.skipDerivedRefresh === true || options.forceDerivedRefresh === true || derivedRefreshInFlight) {
      return originalSaveData(options);
    }

    const startedAt = performance.now();
    const result = originalSaveData({ ...options, skipDerivedRefresh: true });
    const immediateReport = globalThis.__aldusSavePerformanceV170 || {};
    globalThis.__aldusSavePerformanceV186LastImmediate = Object.freeze({
      version: VERSION,
      at: new Date().toISOString(),
      immediateMs: Number((performance.now() - startedAt).toFixed(1)),
      persistenceMs: Number(immediateReport.persistenceMs || 0),
      derivedRefreshDeferred: result === true
    });
    if (result === true) scheduleDerivedRefresh(options.reason || "saveData");
    return result;
  };

  Object.defineProperty(responsiveSaveData, "__aldusResponsiveSaveV186", { value: true });
  saveData = responsiveSaveData;

  globalThis.__aldusSavePerformanceV186 = Object.freeze({
    version: VERSION,
    originalSaveData,
    runDerivedRefresh,
    scheduleDerivedRefresh,
    isPending: () => derivedRefreshPending,
    isInFlight: () => derivedRefreshInFlight
  });
})();
