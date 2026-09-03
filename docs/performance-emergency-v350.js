(() => {
  "use strict";

  const VERSION = "20260817-emergency-performance-v350";
  const INSTALL_TIMEOUT_MS = 30000;
  const RETRY_MS = 25;
  const indexCache = new WeakMap();
  let installed = false;

  // V426 — transporte pré-bootstrap para a migração-base de disciplinas.
  function installDisciplineUnificationV426() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusDisciplineUnificationV426")) return;
    const script = document.createElement("script");
    script.id = "aldusDisciplineUnificationV426";
    script.src = "discipline-unification-v426.js?v=20260901-discipline-unification-v426-postcondition-r2";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V426] Falha ao carregar a migração de unificação de disciplinas.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V426 revisada — B.1 (duplicatas sem histórico) + E (reagendamento PCMA).
  // O complemento espera a migração-base, reutiliza o mesmo backup no fluxo novo
  // e exige novo backup apenas quando a V426 inicial já havia sido aplicada.
  function installDisciplineUnificationRevisionV426() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusDisciplineUnificationRevisionV426")) return;
    const script = document.createElement("script");
    script.id = "aldusDisciplineUnificationRevisionV426";
    script.src = "discipline-unification-v426-revision.js?v=20260901-discipline-unification-v426-revision-b1-e-r2";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V426 revisada] Falha ao carregar B.1/E.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V428 - reparo do vinculo do edital na Fabrica: renomeia factoryAgenda,
  // reescreve editalLink.groupKey e remove as copias vazias que o sync criou.
  function installFactoryEditalLinkRepairV428() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusFactoryEditalLinkRepairV428")) return;
    const script = document.createElement("script");
    script.id = "aldusFactoryEditalLinkRepairV428";
    script.src = "factory-edital-link-repair-v428.js?v=20260902-factory-edital-link-repair-v428-state-binding-r2";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V428] Falha ao carregar o reparo do vinculo do edital.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V427 - estabilidade do Plano do Dia: fixa a cota nas tres fontes do V235
  // e troca a reconstrucao destrutiva do botao por preenchimento aditivo.
  function installPlanningStabilityV427() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusPlanningStabilityV427")) return;
    const script = document.createElement("script");
    script.id = "aldusPlanningStabilityV427";
    script.src = "planning-stability-v427.js?v=20260902-planning-stability-v427";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V427] Falha ao carregar a estabilidade do Plano do Dia.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V429 - painel de pendentes de outros dias no Plano do Dia.
  function installDailyPlanPendingPanelV429() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusDailyPlanPendingPanelV429")) return;
    const script = document.createElement("script");
    script.id = "aldusDailyPlanPendingPanelV429";
    script.src = "daily-plan-pending-panel-v429.js?v=20260902-daily-plan-pending-panel-v429";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V429] Falha ao carregar o painel de pendentes.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V433 - horas liquidas do dia com o mesmo destaque da meta semanal.
  function installDailyNetHoursCardV433() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusDailyNetHoursCardLoaderV433")) return;
    const script = document.createElement("script");
    script.id = "aldusDailyNetHoursCardLoaderV433";
    script.src = "daily-net-hours-card-v433.js?v=20260902-daily-net-hours-card-v433-pair-r4";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V433] Falha ao carregar o card de horas do dia.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V435 - reata duas prioridades do simulado cujos ids nao existem mais.
  function installPlanningPriorityRemapV435() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusPlanningPriorityRemapV435")) return;
    const script = document.createElement("script");
    script.id = "aldusPlanningPriorityRemapV435";
    script.src = "planning-priority-remap-v435.js?v=20260902-planning-priority-remap-v435";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V435] Falha ao carregar o remapeamento de prioridades.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  // V436 - lancamento rapido de questoes no Plano do Dia.
  function installQuickQuestionEntryV436() {
    if (typeof document === "undefined") return;
    if (document.getElementById("aldusQuickQuestionEntryLoaderV436")) return;
    const script = document.createElement("script");
    script.id = "aldusQuickQuestionEntryLoaderV436";
    script.src = "quick-question-entry-v436.js?v=20260902-quick-question-entry-v436";
    script.async = false;
    script.addEventListener("error", () => {
      console.error("[Aldus V436] Falha ao carregar o lancamento rapido de questoes.");
    }, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }

  function indexFor(list) {
    const cached = indexCache.get(list);
    if (cached
      && cached.length === list.length
      && cached.first === list[0]
      && cached.last === list[list.length - 1]) {
      return cached.index;
    }

    const index = new Map();
    list.forEach((mapping) => {
      if (!mapping) return;
      const id = mapping.syllabusItemId;
      const bucket = index.get(id);
      if (bucket) bucket.push(mapping);
      else index.set(id, [mapping]);
    });

    indexCache.set(list, {
      index,
      length: list.length,
      first: list[0],
      last: list[list.length - 1]
    });
    return index;
  }

  function indexedOfficialMappingsForItem(targetState = {}, syllabusItemId = "") {
    const list = targetState?.contestSyllabusMap || [];
    if (!Array.isArray(list) || list.length === 0) return [];
    return (indexFor(list).get(syllabusItemId) || []).slice();
  }

  function install() {
    if (installed) return true;
    if (typeof globalThis.officialMappingsForItem !== "function") return false;

    globalThis.officialMappingsForItem = indexedOfficialMappingsForItem;
    if (typeof globalThis.officialPlanningMappingsV155 === "function") {
      globalThis.officialPlanningMappingsV155 = (targetState = globalThis.state || {}, syllabusItemId = "") =>
        indexedOfficialMappingsForItem(targetState, syllabusItemId);
    }

    installed = true;
    globalThis.__ALDUS_EMERGENCY_PERFORMANCE_V350__ = Object.freeze({
      version: VERSION,
      installedAt: new Date().toISOString(),
      indexedOfficialMappings: true
    });
    console.info(`[Aldus ${VERSION}] Índice de mapeamentos ativado em modo de emergência.`);
    return true;
  }

  installDisciplineUnificationV426();
  installDisciplineUnificationRevisionV426();
  installFactoryEditalLinkRepairV428();
  installPlanningStabilityV427();
  installDailyNetHoursCardV433();
  installPlanningPriorityRemapV435();
  installQuickQuestionEntryV436();
  installDailyPlanPendingPanelV429();
  if (install()) return;

  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (install() || Date.now() - startedAt >= INSTALL_TIMEOUT_MS) {
      clearInterval(timer);
      if (!installed) {
        console.warn(`[Aldus ${VERSION}] O núcleo não expôs officialMappingsForItem dentro do prazo; nenhuma alteração foi aplicada.`);
      }
    }
  }, RETRY_MS);
})();