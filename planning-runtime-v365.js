/* Aldus V365: invariantes pós-geração do cronograma */
(() => {
  "use strict";

  const VERSION = "20260819-planning-post-generation-v365";
  if (globalThis.__aldusPlanningRuntimeV365?.version === VERSION) return;

  const PIECE_DISCIPLINE = "PEÇA PARA DELEGADO DE POLÍCIA CIVIL";
  const PLANNING_ROUTES = new Set(["planejamento", "metas-do-dia", "calendario-metas", "central-metas"]);
  const AUTO_ORIGINS = new Set([
    "planejamento", "edital verticalizado", "plano do dia",
    "planejamento calendario", "planejamento calendário", "calendario", "calendário",
    "geracao automatica", "geração automática"
  ]);
  const GENERATION_IDS = new Set(["generateCalendarGoals", "generateDailyGoals", "refreshDailyGoalsFromPlanning"]);
  const EXPORT_IDS = new Set(["exportGoalCalendarExcel", "exportGoalCalendarPdf", "exportGoalCalendarImage"]);
  const FRONTIER_WIDTH = 2;

  const FALLBACK_PIECES = Object.freeze([
    ["4d0ea920-103f-5837-9a0f-52c578953e5d", "Representação por Prisão Temporária"],
    ["e0906c87-c3d8-59f6-9c7f-784eb0fcc546", "Representação por Prisão Preventiva"],
    ["752a1824-290b-585d-a033-d1630647df77", "Representação por Busca e Apreensão"],
    ["5ae73131-f876-5c20-a573-4f59ce7411f8", "Representação por Interceptação Telefônica"],
    ["261e0e54-798c-5394-92d0-fb875b26e263", "Representação por Interceptação Telemática"],
    ["fdd2ecb9-0b9c-506f-99cd-2c38dcfca534", "Representação por Interceptação Ambiental"],
    ["75efe26c-7291-5981-a51c-42dce41b3aa8", "Representação por Quebra de Sigilo Financeiro"],
    ["958b698b-5323-5d06-8930-ca79252bc265", "Representação por Quebra de Sigilo Bancário"],
    ["322d5a10-97e0-53c1-976b-c6efbdb9596a", "Representação por Quebra de Sigilo Fiscal"],
    ["d2002c8c-a3b8-5a5b-9b67-1c166d6cb7df", "Representação por Quebra de Sigilo Telefônico"],
    ["a739d529-5420-5d11-8cd7-da3bc3b9dd88", "Representação por Quebra de Sigilo Telemático"]
  ].map(([id, subject]) => Object.freeze({ id, subject })));

  let selectionInstalled = false;
  let listenersInstalled = false;
  let lastReport = null;
  let orderSource = null;
  let orderLength = -1;
  let orderById = new Map();
  let orderByKey = new Map();

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const routeName = () => typeof location === "undefined"
    ? ""
    : String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0];

  const currentDate = () => {
    try { if (typeof todayISO === "function") return todayISO(); } catch {}
    return new Date().toISOString().slice(0, 10);
  };

  const goalDate = (record = {}) => String(record.date || record.data || "").slice(0, 10);

  const recordSubject = (record = {}) => String(
    record.baseSubject || record.subject || record.assunto || record.topic || record.topico || record.tema || ""
  ).replace(/\s+[—-]\s+parte\s+\d+\/\d+\s*$/i, "").trim();

  function subjectKey(value) {
    let key = canonical(value)
      .replace(/^\d+(?:\.\d+)*\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (key.startsWith("representacao por ")) key = key.slice("representacao por ".length);
    return key;
  }

  const disciplineKey = (value) => canonical(value)
    .replace(/legislacao penal e legislacao processual penal/g, "legislacao penal e processual penal")
    .replace(/pecas? para delegado(?: de policia civil)?/g, "peca para delegado")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const semanticKey = (record = {}) => {
    const discipline = disciplineKey(record.discipline || record.disciplina);
    const subject = subjectKey(recordSubject(record));
    return discipline && subject ? `${discipline}|${subject}` : "";
  };

  function hasExecution(record = {}) {
    const history = record.history || record.historico;
    if (Array.isArray(history) ? history.length > 0 : Boolean(history)) return true;
    if ([
      record.actualMinutes, record.tempo_real_minutos, record.studyActualMinutes,
      record.questionActualMinutes, record.performedMinutes, record.tempoRealizado,
      record.tempo_realizado
    ].some((value) => Number(value) > 0)) return true;
    return ["concluida", "concluido", "em andamento", "estudado", "dominado", "revisado"]
      .includes(canonical(record.status));
  }

  function isManual(record = {}) {
    try { if (typeof isManualDailyGoal === "function" && isManualDailyGoal(record)) return true; } catch {}
    const origin = canonical(record.origin || record.origem);
    return origin === "manual" || origin.startsWith("manual ") || origin.includes("usuario");
  }

  function looksLikePiece(record = {}) {
    if (!record || typeof record !== "object") return false;
    if (record.fixedDailyPieceV183 === true || record.supplementalDelegatePieceV360 === true || record.pieceCatalogKeyV357) return true;
    if (canonical(record.contestCategory || record.category || record.classification) === "piece") return true;
    const discipline = canonical(record.discipline || record.disciplina);
    return discipline.includes("peca") && discipline.includes("delegad");
  }

  function isAutomaticNewStudy(record = {}) {
    if (!record || typeof record !== "object" || looksLikePiece(record) || isManual(record) || hasExecution(record)) return false;
    const type = canonical(record.type || record.tipo || "estudo novo");
    if (type && type !== "estudo novo" && type !== "estudo") return false;
    const origin = canonical(record.origin || record.origem);
    return AUTO_ORIGINS.has(origin);
  }

  function rebuildOrder(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    if (items === orderSource && items.length === orderLength) return;
    orderSource = items;
    orderLength = items.length;
    orderById = new Map();
    orderByKey = new Map();
    items.forEach((item, index) => {
      const id = String(item.id || "");
      if (id && !orderById.has(id)) orderById.set(id, index);
      const key = semanticKey(item);
      if (key && !orderByKey.has(key)) orderByKey.set(key, index);
    });
  }

  function orderOf(record, targetState) {
    rebuildOrder(targetState);
    const id = String(record?.syllabusItemId || record?.syllabus_item_id || record?.id || "");
    if (id && orderById.has(id)) return orderById.get(id);
    const key = semanticKey(record);
    return key && orderByKey.has(key) ? orderByKey.get(key) : Infinity;
  }

  function findSyllabusItem(record, targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    const id = String(record?.syllabusItemId || record?.syllabus_item_id || "");
    if (id) {
      const byId = items.find((item) => String(item.id || "") === id);
      if (byId) return byId;
    }
    const key = semanticKey(record);
    return key ? items.find((item) => semanticKey(item) === key) || null : null;
  }

  function bindGoalToItem(goal, item) {
    if (!goal || !item) return false;
    const subject = recordSubject(item);
    const discipline = String(item.discipline || item.disciplina || goal.discipline || goal.disciplina || "").trim();
    const id = String(item.id || "");
    if (!subject || !discipline) return false;
    const before = `${semanticKey(goal)}|${String(goal.syllabusItemId || goal.syllabus_item_id || "")}`;
    const after = `${disciplineKey(discipline)}|${subjectKey(subject)}|${id}`;
    if (before === after) return false;

    goal.discipline = discipline;
    goal.disciplina = discipline;
    goal.subject = subject;
    goal.assunto = subject;
    goal.baseSubject = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topic")) goal.topic = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topico")) goal.topico = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "tema")) goal.tema = subject;
    if (Object.prototype.hasOwnProperty.call(item, "subtopic")) goal.subtopic = item.subtopic;
    if (Object.prototype.hasOwnProperty.call(item, "subassunto")) goal.subassunto = item.subassunto;
    if (id) {
      goal.syllabusItemId = id;
      if (Object.prototype.hasOwnProperty.call(goal, "syllabus_item_id")) goal.syllabus_item_id = id;
    }
    if (item.priority != null) goal.priority = item.priority;
    if (item.prioridade != null) goal.prioridade = item.prioridade;
    if (item.weight != null) goal.weight = item.weight;
    if (item.peso != null) goal.peso = item.peso;
    goal.planningPedagogyRuntimeV365 = VERSION;
    goal.updatedAt = new Date().toISOString();
    return true;
  }

  function repairDidacticSchedule(targetState) {
    if (!targetState || !Array.isArray(targetState.dailyGoals) || !Array.isArray(targetState.syllabusItems)) {
      return { changed: 0, disciplines: 0 };
    }
    const today = currentDate();
    const groups = new Map();
    targetState.dailyGoals.forEach((goal, index) => {
      if (goalDate(goal) < today || !isAutomaticNewStudy(goal)) return;
      const discipline = disciplineKey(goal.discipline || goal.disciplina);
      if (!discipline) return;
      const item = findSyllabusItem(goal, targetState);
      const order = item ? orderOf(item, targetState) : Infinity;
      if (!item || !Number.isFinite(order)) return;
      const list = groups.get(discipline) || [];
      list.push({ goal, index, item, order });
      groups.set(discipline, list);
    });

    let changed = 0;
    let disciplines = 0;
    groups.forEach((entries) => {
      if (entries.length < 2) return;
      const slots = entries.slice().sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index);
      const desired = entries.slice().sort((a, b) => a.order - b.order || a.index - b.index);
      const already = slots.every((slot, index) => semanticKey(slot.item) === semanticKey(desired[index].item));
      if (already) return;
      disciplines += 1;
      slots.forEach((slot, index) => {
        if (bindGoalToItem(slot.goal, desired[index].item)) changed += 1;
      });
    });
    return { changed, disciplines };
  }

  function pieceDefinitions() {
    const api = globalThis.__aldusDelegatePieceCatalogV360 || globalThis.__aldusPieceRotationRepairV358;
    return Array.isArray(api?.pieceDefinitions) && api.pieceDefinitions.length === 11
      ? api.pieceDefinitions
      : FALLBACK_PIECES;
  }

  function bindGoalToPiece(goal, definition, targetState) {
    const key = subjectKey(definition.subject);
    const item = (targetState?.syllabusItems || []).find((candidate) => subjectKey(recordSubject(candidate)) === key && looksLikePiece(candidate)) || {
      id: definition.id,
      discipline: PIECE_DISCIPLINE,
      disciplina: PIECE_DISCIPLINE,
      subject: definition.subject,
      assunto: definition.subject,
      priority: "Alta",
      weight: 5
    };
    const changed = bindGoalToItem(goal, item);
    goal.fixedDailyPieceV183 = true;
    goal.planningPieceRuntimeV365 = VERSION;
    if (Object.prototype.hasOwnProperty.call(goal, "pieceCatalogKeyV357")) delete goal.pieceCatalogKeyV357;
    return changed;
  }

  function repairPieceRotation(targetState) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return { changed: 0, removed: 0, futureDates: 0 };
    const definitions = pieceDefinitions();
    const indexBySubject = new Map(definitions.map((definition, index) => [subjectKey(definition.subject), index]));
    const today = currentDate();
    const indexed = targetState.dailyGoals.map((goal, index) => ({ goal, index }));
    let lastIndex = -1;

    indexed
      .filter(({ goal }) => looksLikePiece(goal) && goalDate(goal) && goalDate(goal) < today)
      .sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index)
      .forEach(({ goal }) => {
        const index = indexBySubject.get(subjectKey(recordSubject(goal)));
        if (Number.isInteger(index)) lastIndex = index;
      });

    const groups = new Map();
    indexed.forEach(({ goal, index }) => {
      const date = goalDate(goal);
      if (!date || date < today || !looksLikePiece(goal)) return;
      const list = groups.get(date) || [];
      list.push({ goal, index });
      groups.set(date, list);
    });

    const remove = new Set();
    let changed = 0;
    [...groups.keys()].sort().forEach((date) => {
      const entries = groups.get(date).sort((a, b) => a.index - b.index);
      const protectedEntries = entries.filter(({ goal }) => isManual(goal) || hasExecution(goal));
      const automaticEntries = entries.filter(({ goal }) => !isManual(goal) && !hasExecution(goal));

      if (protectedEntries.length) {
        automaticEntries.forEach(({ goal }) => remove.add(goal));
        protectedEntries.forEach(({ goal }) => {
          const index = indexBySubject.get(subjectKey(recordSubject(goal)));
          if (Number.isInteger(index)) lastIndex = index;
        });
        return;
      }

      if (!automaticEntries.length) return;
      const keep = automaticEntries[0].goal;
      automaticEntries.slice(1).forEach(({ goal }) => remove.add(goal));
      lastIndex = (lastIndex + 1 + definitions.length) % definitions.length;
      if (bindGoalToPiece(keep, definitions[lastIndex], targetState)) changed += 1;
    });

    if (remove.size) targetState.dailyGoals = targetState.dailyGoals.filter((goal) => !remove.has(goal));
    return { changed, removed: remove.size, futureDates: groups.size };
  }

  function persist(reason, options = {}) {
    if (typeof saveData === "function") saveData({ markLocalChange: true, reason });
    if (options.render !== false && typeof render === "function") render();
    if (options.sync !== false && typeof autoSyncAfterSave === "function") autoSyncAfterSave(reason);
  }

  function run(reason = "manual", options = {}) {
    const targetState = typeof state !== "undefined" ? state : globalThis.state;
    if (!targetState || !Array.isArray(targetState.dailyGoals)) {
      return Object.freeze({ version: VERSION, reason, waitingForState: true, changed: false });
    }

    const catalogApi = globalThis.__aldusDelegatePieceCatalogV360 || globalThis.__aldusPieceRotationRepairV358;
    if (typeof catalogApi?.runCatalog === "function") {
      try { catalogApi.runCatalog(`v365-${reason}`); } catch (error) { console.warn(`[${VERSION}] Catálogo V360 não pôde ser reafirmado.`, error); }
    }

    const started = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const pieces = repairPieceRotation(targetState);
    const pedagogy = repairDidacticSchedule(targetState);
    const changed = pieces.changed > 0 || pieces.removed > 0 || pedagogy.changed > 0;
    if (changed && options.persist !== false) persist(`planning-runtime-v365:${reason}`, options);
    const finished = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    lastReport = Object.freeze({
      version: VERSION,
      reason,
      waitingForState: false,
      changed,
      pieceReassigned: pieces.changed,
      pieceDuplicatesRemoved: pieces.removed,
      pieceFutureDates: pieces.futureDates,
      didacticReassigned: pedagogy.changed,
      didacticDisciplines: pedagogy.disciplines,
      totalMs: Number((finished - started).toFixed?.(1) ?? (finished - started))
    });
    return lastReport;
  }

  function frontierArgs(args = {}, targetState) {
    const eligible = Array.isArray(args.eligibleGoals) ? args.eligibleGoals : null;
    if (!eligible?.length || !targetState) return args;
    const existing = Array.isArray(args.existingGoals) ? args.existingGoals : [];
    const need = Math.max(0, (Number(args.topicTarget) || 0) - existing.length);
    if (!need) return args;

    const passthrough = [];
    const groups = new Map();
    eligible.forEach((candidate, index) => {
      if (!isAutomaticNewStudy(candidate)) {
        passthrough.push({ candidate, index });
        return;
      }
      const discipline = disciplineKey(candidate.discipline || candidate.disciplina);
      const order = orderOf(candidate, targetState);
      if (!discipline || !Number.isFinite(order)) {
        passthrough.push({ candidate, index });
        return;
      }
      const list = groups.get(discipline) || [];
      list.push({ candidate, index, order });
      groups.set(discipline, list);
    });

    const allowed = new Set(passthrough.map((entry) => entry.candidate));
    groups.forEach((entries) => {
      entries.sort((a, b) => a.order - b.order || a.index - b.index)
        .slice(0, FRONTIER_WIDTH)
        .forEach((entry) => allowed.add(entry.candidate));
    });
    const filtered = eligible.filter((candidate) => allowed.has(candidate));
    return filtered.length < need ? args : { ...args, eligibleGoals: filtered };
  }

  function installSelectionGate() {
    if (selectionInstalled) return true;
    const original = globalThis.selectPlanningGoalsForTargets;
    if (typeof original !== "function") return false;
    if (original.__aldusPlanningRuntimeV365 === VERSION) {
      selectionInstalled = true;
      return true;
    }
    const wrapped = function(args = {}) {
      const targetState = args.targetState || (typeof state !== "undefined" ? state : globalThis.state);
      return original.call(this, frontierArgs(args, targetState));
    };
    Object.defineProperty(wrapped, "__aldusPlanningRuntimeV365", { value: VERSION });
    globalThis.selectPlanningGoalsForTargets = wrapped;
    selectionInstalled = true;
    return true;
  }

  function elementId(target) {
    let node = target;
    while (node && node !== document) {
      if (node.id) return node.id;
      node = node.parentElement;
    }
    return "";
  }

  function scheduleAfterGeneration(id) {
    queueMicrotask(() => {
      installSelectionGate();
      run(`after-${id}`);
    });
  }

  function installListeners() {
    if (listenersInstalled || typeof document === "undefined" || typeof document.addEventListener !== "function") return false;
    listenersInstalled = true;

    document.addEventListener("click", (event) => {
      const id = elementId(event.target);
      if (GENERATION_IDS.has(id)) scheduleAfterGeneration(id);
    }, false);

    document.addEventListener("click", (event) => {
      const id = elementId(event.target);
      if (!EXPORT_IDS.has(id)) return;
      installSelectionGate();
      const report = run(`before-${id}`, { persist: false, render: false, sync: false });
      if (report?.changed) {
        queueMicrotask(() => persist(`planning-runtime-v365:after-${id}`));
      }
    }, true);
    return true;
  }

  function scheduleInitialRepair(reason) {
    const callback = () => {
      installSelectionGate();
      if (PLANNING_ROUTES.has(routeName())) run(reason);
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(callback, { timeout: 1800 });
    else if (typeof setTimeout === "function") setTimeout(callback, 0);
    else queueMicrotask(callback);
  }

  installListeners();
  queueMicrotask(installSelectionGate);
  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-ready", () => queueMicrotask(installSelectionGate), { once: true });
    const afterMaintenance = () => scheduleInitialRepair("post-bootstrap-maintenance");
    if (globalThis.__aldusPostBootstrapMaintenanceComplete === true) queueMicrotask(afterMaintenance);
    else window.addEventListener("aldus:post-bootstrap-maintenance-complete", afterMaintenance, { once: true });
  }

  globalThis.__aldusPlanningRuntimeV365 = Object.freeze({
    version: VERSION,
    run,
    repairPieceRotation,
    repairDidacticSchedule,
    installSelectionGate,
    getLastReport: () => lastReport
  });
})();
