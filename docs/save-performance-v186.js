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

  // V653 — passos derivados que devolvem { changed: false } não mudaram nada.
  // Resultado ausente ou diferente conta como mudança (comportamento anterior).
  function reportedUnchanged(result) {
    return Boolean(result && typeof result === "object" && result.changed === false);
  }

  // V653 — a tela ativa foi desenhada com a revisão atual dos dados (o mesmo
  // registro que renderView usa em reuseIfFresh). saveData e render() avançam a
  // revisão, então "igual" quer dizer: desenhada depois do último salvamento.
  function activeViewIsCurrent() {
    try {
      if (typeof viewRenderCacheV172 === "undefined" || typeof viewDataRevisionV172 === "undefined") return false;
      const activeView = typeof hashToView === "function" ? hashToView() : "dashboard";
      const target = typeof resolveViewTarget === "function" ? resolveViewTarget(activeView) : activeView;
      const cached = viewRenderCacheV172.get(target);
      return Boolean(cached && cached.revision === viewDataRevisionV172);
    } catch {
      return false;
    }
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
      let priorityResult = null;
      let reinforcementResult = null;
      let factoryResult = null;
      if (typeof refreshPlanningPrioritiesForQuestionChangesV155 === "function") {
        const step = performance.now();
        priorityResult = refreshPlanningPrioritiesForQuestionChangesV155(state);
        report.planningPriorityMs = Number((performance.now() - step).toFixed(1));
      }
      if (typeof repairInvalidReinforcementGoalsV157 === "function") {
        const step = performance.now();
        reinforcementResult = repairInvalidReinforcementGoalsV157(state);
        globalThis.__reinforcementClassificationRepairV157 = reinforcementResult;
        report.reinforcementRepairMs = Number((performance.now() - step).toFixed(1));
      }
      if (typeof syncFactoryMaterialsPlanningV80 === "function") {
        const step = performance.now();
        factoryResult = syncFactoryMaterialsPlanningV80(state);
        report.factoryPlanningMs = Number((performance.now() - step).toFixed(1));
      }

      // V653 — sem mudança derivada, o salvamento imediato já gravou o estado e
      // a tela já mostra esta revisão: regravar os ~20 MB e redesenhar a tela
      // custava de 1 a 2 s de página parada a cada ação. A sincronização com a
      // nuvem segue chamada sempre, como antes.
      const nothingChanged = reportedUnchanged(priorityResult)
        && reportedUnchanged(reinforcementResult)
        && reportedUnchanged(factoryResult);
      report.repeatedSaveSkipped = nothingChanged;
      if (!nothingChanged) {
        const persistenceStartedAt = performance.now();
        originalSaveData({ skipDerivedRefresh: true, markLocalChange: false });
        report.persistenceMs = Number((performance.now() - persistenceStartedAt).toFixed(1));
      }

      report.repeatedRenderSkipped = nothingChanged && activeViewIsCurrent();
      if (!report.repeatedRenderSkipped && (typeof document === "undefined" || !document.hidden)) {
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
