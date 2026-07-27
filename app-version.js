(() => {
  "use strict";

  const VERSION = "20260727-fabrica-plano-dia-v159";
  const RELEASE_TEXT = `Versão: ${VERSION}`;
  let correctionScheduled = false;

  function applyDocumentVersion() {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.aldusReleaseVersion = VERSION;
    document.querySelectorAll(".app-version").forEach((element) => {
      if (element.textContent !== RELEASE_TEXT) element.textContent = RELEASE_TEXT;
    });
  }

  function scheduleCorrection() {
    if (correctionScheduled) return;
    correctionScheduled = true;
    queueMicrotask(() => {
      correctionScheduled = false;
      applyDocumentVersion();
    });
  }

  const release = Object.freeze({
    version: VERSION,
    text: RELEASE_TEXT,
    suffix: VERSION.match(/v\d+$/)?.[0] || "current",
    apply: applyDocumentVersion
  });

  Object.defineProperty(globalThis, "__ALDUS_APP_RELEASE__", {
    value: release,
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (typeof document === "undefined") return;
  applyDocumentVersion();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDocumentVersion, { once: true });
  }

  function installFactoryPlanDayFix() {
    if (globalThis.__ALDUS_FACTORY_PLAN_DAY_V159__) return true;
    if (
      typeof renderFactory !== "function"
      || typeof factoryQueueForDate !== "function"
      || typeof factoryResumoAulaPending !== "function"
      || typeof factoryUnlockedDayDate !== "function"
      || typeof factoryDoNowQueue !== "function"
      || typeof todayISO !== "function"
      || typeof ensureFactoryAgenda !== "function"
    ) return false;

    const originalUnlockedDayDate = factoryUnlockedDayDate;
    const originalDoNowQueue = factoryDoNowQueue;
    const originalRecorteHoje = typeof factoryRecorteHoje === "function" ? factoryRecorteHoje : null;
    const originalRenderFactory = renderFactory;

    function factoryGoalTypeLabelV159(goal = {}) {
      const raw = String(goal.type || goal.tipo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (raw.includes("refor")) return "Meta de reforço";
      if (raw.includes("revis")) return "Revisão";
      if (raw.includes("quest")) return "Questões";
      return "Estudo";
    }

    function factoryGoalStatusLabelV159(goal = {}) {
      if (typeof isGoalDone === "function" && isGoalDone(goal)) return "Meta concluída";
      if (typeof isGoalInProgress === "function" && isGoalInProgress(goal)) return "Em andamento";
      return "Meta pendente";
    }

    function factoryGoalHasMaterialV159(goal = {}) {
      if (goal.hasMaterial === true || (Array.isArray(goal.materialIds) && goal.materialIds.length > 0)) return true;
      if (typeof getDailyGoalMaterialState !== "function") return false;
      try {
        return getDailyGoalMaterialState(goal).hasMaterials === true;
      } catch (error) {
        console.warn("[Aldus v159] Não foi possível conferir o material da meta.", error);
        return false;
      }
    }

    factoryUnlockedDayDate = function factoryUnlockedDayDateV159(agenda = ensureFactoryAgenda()) {
      if (typeof factoryProductionScope !== "undefined" && factoryProductionScope === "week") {
        return originalUnlockedDayDate(agenda);
      }
      return todayISO();
    };

    factoryDoNowQueue = function factoryDoNowQueueV159(agenda = ensureFactoryAgenda()) {
      if (typeof factoryProductionScope !== "undefined" && factoryProductionScope === "week") {
        return originalDoNowQueue(agenda);
      }
      const date = todayISO();
      const activeAgenda = (agenda || []).filter((item) => item?.editalActive !== false);
      return factoryQueueForDate(date, activeAgenda)
        .filter(factoryResumoAulaPending)
        .map((entry) => ({ ...entry, sourceDate: date }));
    };

    if (originalRecorteHoje) {
      factoryRecorteHoje = function factoryRecorteHojeV159(entry = {}) {
        const goals = Array.isArray(entry.goals) ? entry.goals.filter(Boolean) : (entry.goal ? [entry.goal] : []);
        if (!goals.length) return originalRecorteHoje(entry);
        const unique = (values) => [...new Set(values.filter(Boolean))];
        const goalSubjects = unique(goals.map((goal) => goal.subject || goal.assunto || goal.baseSubject || ""));
        const subtopics = unique(entry.subtopics || []);
        const types = unique(goals.map(factoryGoalTypeLabelV159));
        const statuses = unique(goals.map(factoryGoalStatusLabelV159));
        const materialLabel = goals.every(factoryGoalHasMaterialV159) ? "Material já disponível" : "Material a produzir";
        return [...goalSubjects, ...subtopics, ...types, ...statuses, materialLabel].join(" • ") || originalRecorteHoje(entry);
      };
    }

    renderFactory = function renderFactoryV159(...args) {
      const result = originalRenderFactory.apply(this, args);
      try {
        if (typeof factoryProductionScope !== "undefined" && factoryProductionScope === "day") {
          const notice = document.querySelector(".factory-scope-notice");
          if (notice) notice.textContent = `Exibindo somente as metas pendentes do Plano do Dia de ${typeof formatDateBR === "function" ? formatDateBR(todayISO()) : todayISO()}. Pendências de outros dias não substituem esta lista.`;
        }
      } catch (error) {
        console.warn("[Aldus v159] Falha apenas na mensagem visual da Fábrica.", error);
      }
      return result;
    };

    Object.defineProperty(globalThis, "__ALDUS_FACTORY_PLAN_DAY_V159__", {
      value: Object.freeze({ version: VERSION, installedAt: new Date().toISOString() }),
      configurable: false,
      enumerable: false,
      writable: false
    });

    if (location.hash === "#fabrica-resumos" || document.querySelector('[data-view="fabrica-resumos"].active')) {
      renderFactory();
    }
    return true;
  }

  function scheduleFactoryPlanDayFix(attempt = 0) {
    if (installFactoryPlanDayFix()) return;
    if (attempt >= 200) {
      console.error("[Aldus v159] A correção da Fábrica não pôde ser instalada.");
      return;
    }
    setTimeout(() => scheduleFactoryPlanDayFix(attempt + 1), 25);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scheduleFactoryPlanDayFix(), { once: true });
  } else {
    scheduleFactoryPlanDayFix();
  }

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => (
        mutation.type === "characterData"
        || mutation.target?.closest?.(".app-version")
        || [...(mutation.addedNodes || [])].some((node) => (
          node.nodeType === 1 && (node.matches?.(".app-version") || node.querySelector?.(".app-version"))
        ))
      ))) scheduleCorrection();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
})();
