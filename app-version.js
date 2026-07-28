(() => {
  "use strict";

  const VERSION = "20260727-fabrica-simples-recolhivel-v163";
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
      || typeof factoryGoalGroupsForDate !== "function"
      || typeof factoryQueueForDate !== "function"
      || typeof factoryResumoAulaPending !== "function"
      || typeof factoryResumoAulaReady !== "function"
      || typeof normalizeFactoryModules !== "function"
      || typeof exactFactoryGoalMatches !== "function"
      || typeof factoryGoalSubtopic !== "function"
      || typeof factoryUnlockedDayDate !== "function"
      || typeof factoryDoNowQueue !== "function"
      || typeof todayISO !== "function"
      || typeof ensureFactoryAgenda !== "function"
    ) return false;

    const originalGoalGroupsForDate = factoryGoalGroupsForDate;
    const originalResumoAulaPending = factoryResumoAulaPending;
    const originalUnlockedDayDate = factoryUnlockedDayDate;
    const originalDoNowQueue = factoryDoNowQueue;
    const originalRecorteHoje = typeof factoryRecorteHoje === "function" ? factoryRecorteHoje : null;
    const originalRenderFactory = renderFactory;

    function factoryIsDayScopeV159() {
      return typeof factoryProductionScope === "undefined" || factoryProductionScope === "day";
    }

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

    factoryGoalGroupsForDate = function factoryGoalGroupsForDateV159(date = todayISO(), agenda = []) {
      if (!factoryIsDayScopeV159() || date !== todayISO()) return originalGoalGroupsForDate(date, agenda);
      const dayGoals = (state.dailyGoals || []).filter((goal) => (goal.date || goal.data) === date);
      const groups = new Map();
      const modes = new Set();
      const unmatchedGoals = [];
      dayGoals.forEach((goal) => {
        const match = exactFactoryGoalMatches(goal, agenda);
        if (match.items.length) modes.add(match.mode);
        else unmatchedGoals.push(goal.id || goal.syllabusItemId || `${goal.discipline || goal.disciplina}|${goal.subject || goal.assunto}`);
        match.items.forEach((item) => {
          if (!groups.has(item.id)) groups.set(item.id, { item, goals: [], subtopics: new Set() });
          const group = groups.get(item.id);
          group.goals.push(goal);
          const subtopic = factoryGoalSubtopic(goal);
          if (subtopic) group.subtopics.add(subtopic);
        });
      });
      if (date === todayISO()) {
        lastFactoryTodayInfo = {
          goals: dayGoals.length,
          matched: groups.size,
          matchModes: [...modes],
          unmatchedGoals
        };
      }
      return [...groups.values()].map((group) => ({
        ...group,
        date,
        subtopics: [...group.subtopics].sort((left, right) => left.localeCompare(right, "pt-BR"))
      }));
    };

    factoryResumoAulaPending = function factoryResumoAulaPendingV159(entry = {}) {
      if (!factoryIsDayScopeV159()) return originalResumoAulaPending(entry);
      const item = entry.item || entry;
      const modules = normalizeFactoryModules(item.modules || {}, item);
      return modules.resumoAula?.status !== "Não se aplica"
        && !factoryResumoAulaReady({ ...item, modules });
    };

    factoryUnlockedDayDate = function factoryUnlockedDayDateV159(agenda = ensureFactoryAgenda()) {
      if (!factoryIsDayScopeV159()) return originalUnlockedDayDate(agenda);
      return todayISO();
    };

    factoryDoNowQueue = function factoryDoNowQueueV159(agenda = ensureFactoryAgenda()) {
      if (!factoryIsDayScopeV159()) return originalDoNowQueue(agenda);
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
        if (factoryIsDayScopeV159()) {
          const notice = document.querySelector(".factory-scope-notice");
          const unmatchedCount = Array.isArray(lastFactoryTodayInfo?.unmatchedGoals) ? lastFactoryTodayInfo.unmatchedGoals.length : 0;
          if (notice) {
            notice.textContent = `Exibindo somente os temas do Plano do Dia de ${typeof formatDateBR === "function" ? formatDateBR(todayISO()) : todayISO()}. Pendências de outros dias não substituem esta lista.${unmatchedCount ? ` ${unmatchedCount} meta(s) não possuem vínculo exato com tema ativo da Fábrica.` : ""}`;
          }
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
    if (attempt >= 2400) {
      console.error("[Aldus v159] A correção da Fábrica não pôde ser instalada.");
      return;
    }
    setTimeout(() => scheduleFactoryPlanDayFix(attempt + 1), 25);
  }

  function loadFactorySimpleUiV163() {
    if (globalThis.__ALDUS_FACTORY_SIMPLE_V163__ || document.querySelector('script[data-aldus-factory-simple="v163"]')) return;
    const script = document.createElement("script");
    script.src = `factory-simple-v163.js?v=${VERSION}`;
    script.async = false;
    script.dataset.aldusFactorySimple = "v163";
    script.addEventListener("error", () => {
      console.warn("[Aldus v163] A simplificação visual da Fábrica não pôde ser carregada. Nenhum dado foi alterado.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scheduleFactoryPlanDayFix();
      loadFactorySimpleUiV163();
    }, { once: true });
  } else {
    scheduleFactoryPlanDayFix();
    loadFactorySimpleUiV163();
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
