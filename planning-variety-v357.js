/* Aldus V357: variedade do cronograma e rodízio de Peças */
(() => {
  "use strict";

  const VERSION = "20260818-planning-variety-v357";
  if (globalThis.__aldusPlanningVarietyV357?.version === VERSION) return;

  const PIECE_ID_PREFIX = "v357-piece:";
  const PIECE_DISCIPLINE = "PEÇA PARA DELEGADO DE POLÍCIA CIVIL";
  const PIECE_TYPES = Object.freeze([
    "Representação por Prisão Temporária",
    "Representação por Prisão Preventiva",
    "Representação por Busca e Apreensão",
    "Representação por Interceptação Telefônica",
    "Representação por Interceptação Telemática",
    "Representação por Interceptação Ambiental",
    "Representação por Quebra de Sigilo Financeiro",
    "Representação por Quebra de Sigilo Bancário",
    "Representação por Quebra de Sigilo Fiscal",
    "Representação por Quebra de Sigilo Telefônico",
    "Representação por Quebra de Sigilo Telemático"
  ]);
  const PLANNING_ROUTES = new Set(["planejamento", "metas-do-dia", "calendario-metas", "central-metas"]);
  const AUTOMATIC_ORIGINS = new Set(["planejamento", "edital verticalizado", "plano do dia"]);
  let flowWrappersInstalled = false;
  let auditScheduled = false;
  let auditCompleted = false;
  let lastAudit = null;

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function routeName() {
    if (typeof location === "undefined") return "";
    return String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0];
  }

  function currentDate() {
    try {
      if (typeof todayISO === "function") return todayISO();
    } catch {}
    return new Date().toISOString().slice(0, 10);
  }

  function goalDate(record = {}) {
    return String(record.date || record.data || "");
  }

  function baseSubject(record = {}) {
    try {
      if (typeof planningBaseSubject === "function") return planningBaseSubject(record);
    } catch {}
    return String(record.baseSubject || record.subject || record.assunto || record.topic || record.tema || "")
      .replace(/\s+[—-]\s+parte\s+\d+\/\d+\s*$/i, "")
      .trim();
  }

  function subjectKey(value) {
    let key = canonical(value)
      .replace(/^\d+(?:\.\d+)*\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (key.startsWith("representacao por ")) key = key.slice("representacao por ".length);
    return key;
  }

  function disciplineKey(value) {
    return canonical(value)
      .replace(/legislacao penal e legislacao processual penal/g, "legislacao penal e processual penal")
      .replace(/pecas? para delegado(?: de policia civil)?/g, "peca para delegado")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function semanticTopicKey(record = {}) {
    const discipline = disciplineKey(record.discipline || record.disciplina);
    const subject = subjectKey(baseSubject(record));
    return discipline && subject ? `${discipline}|${subject}` : "";
  }

  function looksLikePiece(record = {}) {
    if (!record || typeof record !== "object") return false;
    if (record.fixedDailyPieceV183 === true || record.pieceCatalogKeyV357) return true;
    const category = canonical(record.contestCategory || record.category || record.classification);
    if (category === "piece") return true;
    const discipline = canonical(record.discipline || record.disciplina);
    return discipline.includes("peca") && discipline.includes("delegad");
  }

  function hasExecution(record = {}) {
    const history = record.history || record.historico;
    if (Array.isArray(history) ? history.length > 0 : Boolean(history)) return true;
    const numericFields = [
      record.actualMinutes,
      record.tempo_real_minutos,
      record.studyActualMinutes,
      record.questionActualMinutes,
      record.performedMinutes,
      record.tempoRealizado,
      record.tempo_realizado
    ];
    if (numericFields.some((value) => Number(value) > 0)) return true;
    const status = canonical(record.status);
    return ["concluida", "concluido", "em andamento", "estudado", "dominado", "revisado"].includes(status);
  }

  function isAutomaticNewStudy(record = {}) {
    if (!record || typeof record !== "object" || looksLikePiece(record) || hasExecution(record)) return false;
    if (!AUTOMATIC_ORIGINS.has(canonical(record.origin || record.origem))) return false;
    const type = canonical(record.type || record.tipo || "estudo novo");
    return !type || type === "estudo novo" || type === "estudo";
  }

  function virtualPieceId(subject) {
    return `${PIECE_ID_PREFIX}${subjectKey(subject).replace(/\s+/g, "-")}`;
  }

  const VIRTUAL_PIECES = Object.freeze(PIECE_TYPES.map((subject) => Object.freeze({
    id: virtualPieceId(subject),
    discipline: PIECE_DISCIPLINE,
    disciplina: PIECE_DISCIPLINE,
    subject,
    assunto: subject,
    topic: subject,
    status: "Não iniciado",
    domain: "Não avaliado",
    priority: "Alta",
    weight: 5,
    contestCategory: "PIECE",
    category: "PIECE",
    classification: "PIECE",
    virtualPieceV357: true
  })));

  function sanitizePieceRecord(record) {
    if (!record || typeof record !== "object") return record;
    const syllabusId = String(record.syllabusItemId || record.syllabus_item_id || "");
    if (!syllabusId.startsWith(PIECE_ID_PREFIX)) return record;
    record.pieceCatalogKeyV357 = syllabusId;
    record.syllabusItemId = "";
    if (Object.prototype.hasOwnProperty.call(record, "syllabus_item_id")) record.syllabus_item_id = "";
    record.fixedDailyPieceV183 = true;
    record.planningVarietyPolicyV357 = VERSION;
    return record;
  }

  function sanitizePieceResult(value, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((entry) => sanitizePieceResult(entry, seen));
      return value;
    }
    sanitizePieceRecord(value);
    ["added", "selected", "generated", "reports", "dates", "removed"].forEach((key) => {
      if (value[key] && typeof value[key] === "object") sanitizePieceResult(value[key], seen);
    });
    return value;
  }

  function withPieceCatalog(targetState, callback) {
    if (!targetState || typeof targetState !== "object") return callback();
    const originalItems = Array.isArray(targetState.syllabusItems) ? targetState.syllabusItems : [];
    const existingPieceSubjects = new Set(
      originalItems.filter(looksLikePiece).map((item) => subjectKey(baseSubject(item))).filter(Boolean)
    );
    const virtualItems = VIRTUAL_PIECES.filter((item) => !existingPieceSubjects.has(subjectKey(item.subject)));
    const patchedGoals = [];

    (targetState.dailyGoals || []).forEach((goal) => {
      if (!goal?.pieceCatalogKeyV357) return;
      patchedGoals.push([goal, goal.syllabusItemId]);
      goal.syllabusItemId = goal.pieceCatalogKeyV357;
    });

    targetState.syllabusItems = virtualItems.length ? [...originalItems, ...virtualItems] : originalItems;
    try {
      const result = callback();
      sanitizePieceResult(result);
      return result;
    } finally {
      patchedGoals.forEach(([goal, previous]) => { goal.syllabusItemId = previous || ""; });
      targetState.syllabusItems = originalItems;
    }
  }

  function wrapPieceApi(api) {
    if (!api || typeof api !== "object" || api.planningVarietyV357 === VERSION) return api;
    const originalEnsure = typeof api.ensureDailyPieceForDate === "function"
      ? api.ensureDailyPieceForDate.bind(api)
      : null;
    if (!originalEnsure) return api;
    const wrappedEnsure = function ensureDailyPieceForDateV357(date, targetState = null, options = {}) {
      const currentState = targetState || (typeof state !== "undefined" ? state : null);
      return withPieceCatalog(currentState, () => originalEnsure(date, currentState, options));
    };
    return Object.freeze({
      ...api,
      ensureDailyPieceForDate: wrappedEnsure,
      planningVarietyV357: VERSION,
      pieceTypesV357: PIECE_TYPES
    });
  }

  function installPieceApiTrap() {
    const property = "__aldusDailyDelegatePieceGoalV183";
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, property);
    if (descriptor?.value) {
      const wrapped = wrapPieceApi(descriptor.value);
      if (wrapped !== descriptor.value && descriptor.writable !== false) globalThis[property] = wrapped;
      return;
    }
    if (descriptor && descriptor.configurable === false) return;
    let value = descriptor?.get ? descriptor.get.call(globalThis) : undefined;
    Object.defineProperty(globalThis, property, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      get() { return value; },
      set(next) {
        value = wrapPieceApi(next);
        Object.defineProperty(globalThis, property, {
          value,
          configurable: true,
          enumerable: true,
          writable: true
        });
      }
    });
  }

  function filteredSelectionArgs(args = {}, targetState) {
    const eligibleGoals = Array.isArray(args.eligibleGoals) ? args.eligibleGoals : null;
    if (!eligibleGoals?.length) return args;
    const existingGoals = Array.isArray(args.existingGoals) ? args.existingGoals : [];
    const targetTopics = Math.max(0, Number(args.topicTarget) || 0);
    const needed = Math.max(0, targetTopics - existingGoals.length);
    if (!needed) return args;
    const date = String(args.date || currentDate());
    const occupied = new Set();

    existingGoals.forEach((goal) => {
      if (!isAutomaticNewStudy(goal)) return;
      const key = semanticTopicKey(goal);
      if (key) occupied.add(key);
    });
    (targetState?.dailyGoals || []).forEach((goal) => {
      if (!isAutomaticNewStudy(goal)) return;
      const goalDay = goalDate(goal);
      if (!goalDay || goalDay >= date) return;
      const key = semanticTopicKey(goal);
      if (key) occupied.add(key);
    });

    const filtered = [];
    const localSeen = new Set(occupied);
    eligibleGoals.forEach((goal) => {
      if (!isAutomaticNewStudy(goal)) {
        filtered.push(goal);
        return;
      }
      const key = semanticTopicKey(goal);
      if (!key || !localSeen.has(key)) {
        filtered.push(goal);
        if (key) localSeen.add(key);
      }
    });
    if (filtered.length < needed) return args;
    return { ...args, eligibleGoals: filtered };
  }

  function wrapGlobalFunction(name, wrapperFactory) {
    const current = globalThis[name];
    if (typeof current !== "function" || current.__aldusPlanningVarietyV357) return false;
    const wrapped = wrapperFactory(current);
    Object.defineProperty(wrapped, "__aldusPlanningVarietyV357", { value: true });
    globalThis[name] = wrapped;
    return true;
  }

  function installFlowWrappers() {
    if (flowWrappersInstalled) return true;
    const selection = wrapGlobalFunction("selectPlanningGoalsForTargets", (original) => function selectPlanningGoalsForTargetsV357(args = {}) {
      const targetState = args.targetState || (typeof state !== "undefined" ? state : null);
      return withPieceCatalog(targetState, () => sanitizePieceResult(original.call(this, filteredSelectionArgs(args, targetState))));
    });
    wrapGlobalFunction("generateGoalsForDate", (original) => function generateGoalsForDateV357(date, opts = {}) {
      const targetState = opts.targetState || (typeof state !== "undefined" ? state : null);
      return withPieceCatalog(targetState, () => sanitizePieceResult(original.apply(this, arguments)));
    });
    wrapGlobalFunction("reconcileDailyGoalsWithPlanning", (original) => function reconcileDailyGoalsWithPlanningV357(targetState, date, opts = {}) {
      const currentState = targetState || (typeof state !== "undefined" ? state : null);
      return withPieceCatalog(currentState, () => sanitizePieceResult(original.apply(this, arguments)));
    });
    flowWrappersInstalled = selection || typeof globalThis.selectPlanningGoalsForTargets !== "function";
    return flowWrappersInstalled;
  }

  function auditSchedule(reason = "idle-audit") {
    if (auditCompleted) return lastAudit;
    const targetState = typeof state !== "undefined" ? state : null;
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return null;
    if (typeof reconcilePlanningDates !== "function") return null;

    const startedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const today = currentDate();
    const candidates = targetState.dailyGoals
      .map((goal, index) => ({ goal, index }))
      .filter(({ goal }) => goalDate(goal) >= today && isAutomaticNewStudy(goal))
      .sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index);
    const seen = new Set();
    const duplicates = [];
    candidates.forEach(({ goal }) => {
      const key = semanticTopicKey(goal);
      if (!key) return;
      if (seen.has(key)) duplicates.push(goal);
      else seen.add(key);
    });

    auditCompleted = true;
    if (!duplicates.length) {
      const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      lastAudit = Object.freeze({ version: VERSION, reason, duplicates: 0, affectedDates: 0, changed: false, totalMs: Number((finishedAt - startedAt).toFixed?.(1) ?? (finishedAt - startedAt)) });
      return lastAudit;
    }

    const duplicateSet = new Set(duplicates);
    const affectedDates = [...new Set(duplicates.map(goalDate).filter(Boolean))].sort();
    const previousGoals = targetState.dailyGoals;
    targetState.dailyGoals = previousGoals.filter((goal) => !duplicateSet.has(goal));
    let reconcileReport = null;
    try {
      reconcileReport = reconcilePlanningDates(targetState, affectedDates, { rebuildAutomatic: false });
    } catch (error) {
      targetState.dailyGoals = previousGoals;
      auditCompleted = false;
      console.warn(`[${VERSION}] Auditoria semântica não aplicada; cronograma anterior preservado.`, error);
      return null;
    }

    if (typeof saveData === "function") saveData({ markLocalChange: true, reason: "planning-variety-v357" });
    if (typeof render === "function") render();
    if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("planning-variety-v357");
    const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    lastAudit = Object.freeze({
      version: VERSION,
      reason,
      duplicates: duplicates.length,
      affectedDates: affectedDates.length,
      changed: true,
      totalMs: Number((finishedAt - startedAt).toFixed?.(1) ?? (finishedAt - startedAt)),
      replenished: Number(reconcileReport?.added?.length || 0)
    });
    return lastAudit;
  }

  function scheduleAudit(reason = "planning-route") {
    if (auditCompleted || auditScheduled || !PLANNING_ROUTES.has(routeName())) return false;
    auditScheduled = true;
    const execute = () => {
      auditScheduled = false;
      installFlowWrappers();
      auditSchedule(reason);
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(execute, { timeout: 1200 });
    else if (typeof setTimeout === "function") setTimeout(execute, 0);
    else queueMicrotask(execute);
    return true;
  }

  function onBootstrapReady() {
    installFlowWrappers();
    scheduleAudit("bootstrap-planning-route");
  }

  installPieceApiTrap();
  if (typeof window !== "undefined") {
    if (globalThis.__aldusBootstrapReady) queueMicrotask(onBootstrapReady);
    else window.addEventListener("aldus:bootstrap-ready", onBootstrapReady, { once: true });
    window.addEventListener("hashchange", () => scheduleAudit("route-entered"));
  }

  globalThis.__aldusPlanningVarietyV357 = Object.freeze({
    version: VERSION,
    pieceTypes: PIECE_TYPES,
    semanticTopicKey,
    installFlowWrappers,
    runAudit: auditSchedule,
    getLastAudit: () => lastAudit
  });
})();
