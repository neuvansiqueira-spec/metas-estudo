/* Aldus V367: qualidade didática e rodízio efetivamente entregue no cronograma */
(() => {
  "use strict";

  const VERSION = "20260821-planning-quality-v367";
  if (globalThis.__aldusPlanningQualityV367?.version === VERSION) return;

  const PIECE_DISCIPLINE = "PEÇA PARA DELEGADO DE POLÍCIA CIVIL";
  const PIECE_TOPIC = "Peças de Delegado";
  const FRONTIER_WIDTH = 3;
  const PLANNING_ROUTES = new Set(["planejamento", "metas-do-dia", "calendario-metas", "central-metas"]);
  const AUTO_ORIGINS = new Set([
    "planejamento", "edital verticalizado", "plano do dia", "planejamento peca diaria",
    "planejamento calendario", "calendario", "geracao automatica"
  ]);
  const GENERATION_IDS = new Set(["generateCalendarGoals", "generateDailyGoals", "refreshDailyGoalsFromPlanning"]);
  const EXPORT_IDS = new Set(["exportGoalCalendarExcel", "exportGoalCalendarPdf", "exportGoalCalendarImage"]);
  const STOP_WORDS = new Set(["a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "sem", "um", "uma"]);
  const GENERIC_SUBJECTS = new Set([
    "administracao publica", "analise de documentos", "aspectos introdutorios",
    "conceitos fundamentais", "conceitos gerais", "consideracoes gerais",
    "generalidades", "gestao publica", "introducao", "nocoes gerais", "parte geral"
  ]);
  const PIECES = Object.freeze([
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
  let initialScheduled = false;
  let lastReport = null;
  let orderSource = null;
  let orderLength = -1;
  let orderById = new Map();
  let orderBySemanticKey = new Map();

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
  const rawSubject = (record = {}) => String(
    record.baseSubject || record.subject || record.assunto || record.topic || record.topico || record.tema || ""
  ).replace(/\s+[—-]\s+parte\s+\d+\/\d+\s*$/i, "").trim();
  const rawTopic = (record = {}) => String(record.topic || record.topico || record.group || record.grupo || "").trim();
  const rawSubtopic = (record = {}) => String(record.subtopic || record.subassunto || record.subtema || "").trim();

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
    const subject = subjectKey(rawSubject(record));
    return discipline && subject ? `${discipline}|${subject}` : "";
  };

  function meaningfulTokens(value) {
    return subjectKey(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  }

  function similarSubjects(left, right) {
    const a = subjectKey(left);
    const b = subjectKey(right);
    if (!a || !b) return false;
    if (a === b) return true;
    const at = meaningfulTokens(a);
    const bt = meaningfulTokens(b);
    if (!at.length || !bt.length) return false;
    if (Math.min(at.length, bt.length) >= 2 && (a.includes(b) || b.includes(a))) return true;
    const as = new Set(at);
    const bs = new Set(bt);
    let intersection = 0;
    as.forEach((token) => { if (bs.has(token)) intersection += 1; });
    const union = new Set([...as, ...bs]).size;
    const coverage = intersection / Math.min(as.size, bs.size);
    return intersection / Math.max(1, union) >= 0.72 || (intersection >= 2 && coverage >= 0.86);
  }

  function isGenericSubject(value) {
    const key = subjectKey(value).replace(/[0-9]+/g, "").replace(/\s+/g, " ").trim();
    return GENERIC_SUBJECTS.has(key);
  }

  function didacticTitle(item = {}) {
    const subject = rawSubject(item);
    if (!subject) return "Assunto";
    if (!isGenericSubject(subject)) return subject;
    const parents = [rawSubtopic(item), rawTopic(item)]
      .filter((value) => value && !similarSubjects(value, subject) && !isGenericSubject(value));
    const parent = parents[0];
    return parent ? `${parent} — ${subject}` : subject;
  }

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
    return record.manual === true || record.isManual === true || origin === "manual" || origin.startsWith("manual ") || origin.includes("usuario");
  }

  function looksLikePiece(record = {}) {
    if (!record || typeof record !== "object") return false;
    if (record.fixedDailyPieceV183 === true || record.supplementalDelegatePieceV367 === true || record.pieceCatalogKeyV357) return true;
    if (canonical(record.contestCategory || record.category || record.classification) === "piece") return true;
    const discipline = canonical(record.discipline || record.disciplina);
    return discipline.includes("peca") && discipline.includes("delegad");
  }

  function isAutomaticNewStudy(record = {}) {
    if (!record || typeof record !== "object" || looksLikePiece(record) || isManual(record) || hasExecution(record)) return false;
    const type = canonical(record.type || record.tipo || "estudo novo");
    if (type && type !== "estudo novo" && type !== "estudo") return false;
    return AUTO_ORIGINS.has(canonical(record.origin || record.origem));
  }

  function completedItem(item = {}) {
    return ["concluida", "concluido", "estudado", "dominado", "ignorada", "ignorado"]
      .includes(canonical(item.status));
  }

  function rebuildOrder(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    if (items === orderSource && items.length === orderLength) return;
    orderSource = items;
    orderLength = items.length;
    orderById = new Map();
    orderBySemanticKey = new Map();
    items.forEach((item, index) => {
      const id = String(item.id || "");
      if (id && !orderById.has(id)) orderById.set(id, index);
      const key = semanticKey(item);
      if (key && !orderBySemanticKey.has(key)) orderBySemanticKey.set(key, index);
    });
  }

  function orderOf(record, targetState) {
    rebuildOrder(targetState);
    const id = String(record?.syllabusItemId || record?.syllabus_item_id || record?.id || "");
    if (id && orderById.has(id)) return orderById.get(id);
    const key = semanticKey(record);
    return key && orderBySemanticKey.has(key) ? orderBySemanticKey.get(key) : Infinity;
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
    const subject = didacticTitle(item);
    const discipline = String(item.discipline || item.disciplina || goal.discipline || goal.disciplina || "").trim();
    const id = String(item.id || "");
    if (!subject || !discipline) return false;
    const before = [goal.discipline, goal.disciplina, goal.subject, goal.assunto, goal.baseSubject, goal.syllabusItemId, goal.syllabus_item_id]
      .map((value) => String(value || "")).join("|");

    goal.discipline = discipline;
    goal.disciplina = discipline;
    goal.subject = subject;
    goal.assunto = subject;
    goal.baseSubject = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topic")) goal.topic = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topico")) goal.topico = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "tema")) goal.tema = subject;
    if (id) {
      goal.syllabusItemId = id;
      if (Object.prototype.hasOwnProperty.call(goal, "syllabus_item_id")) goal.syllabus_item_id = id;
    }
    if (item.priority != null) goal.priority = item.priority;
    if (item.prioridade != null) goal.prioridade = item.prioridade;
    goal.planningQualityV367 = VERSION;
    const after = [goal.discipline, goal.disciplina, goal.subject, goal.assunto, goal.baseSubject, goal.syllabusItemId, goal.syllabus_item_id]
      .map((value) => String(value || "")).join("|");
    if (before === after) return false;
    goal.updatedAt = new Date().toISOString();
    return true;
  }

  function ensurePieceCatalog(targetState) {
    if (!targetState || !Array.isArray(targetState.syllabusItems)) return { added: 0 };
    const existing = new Map();
    targetState.syllabusItems.filter(looksLikePiece).forEach((item) => existing.set(subjectKey(rawSubject(item)), item));
    let added = 0;
    PIECES.forEach((definition) => {
      if (existing.has(subjectKey(definition.subject))) return;
      targetState.syllabusItems.push({
        id: definition.id,
        discipline: PIECE_DISCIPLINE,
        disciplina: PIECE_DISCIPLINE,
        topic: PIECE_TOPIC,
        subject: definition.subject,
        assunto: definition.subject,
        status: "Não iniciado",
        domain: "Não avaliado",
        priority: "Alta",
        weight: 5,
        classification: "PIECE",
        category: "PIECE",
        contestCategory: "PIECE",
        supplementalDelegatePieceV367: true,
        origin: "catálogo técnico de Peças de Delegado",
        createdAt: new Date().toISOString()
      });
      added += 1;
    });
    if (added) {
      orderSource = null;
      orderLength = -1;
    }
    return { added };
  }

  function bindGoalToPiece(goal, definition, targetState) {
    const wanted = subjectKey(definition.subject);
    const item = (targetState?.syllabusItems || []).find((candidate) => looksLikePiece(candidate) && subjectKey(rawSubject(candidate)) === wanted) || {
      id: definition.id,
      discipline: PIECE_DISCIPLINE,
      disciplina: PIECE_DISCIPLINE,
      subject: definition.subject,
      assunto: definition.subject,
      priority: "Alta"
    };
    const changed = bindGoalToItem(goal, item);
    goal.fixedDailyPieceV183 = true;
    goal.planningPieceRotationV367 = VERSION;
    return changed;
  }

  function repairPieceRotation(targetState) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return { changed: 0, removed: 0, futureDates: 0 };
    const today = currentDate();
    const indexBySubject = new Map(PIECES.map((definition, index) => [subjectKey(definition.subject), index]));
    const indexed = targetState.dailyGoals.map((goal, index) => ({ goal, index }));
    let lastIndex = -1;

    indexed
      .filter(({ goal }) => looksLikePiece(goal) && goalDate(goal) && goalDate(goal) < today)
      .sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index)
      .forEach(({ goal }) => {
        const index = indexBySubject.get(subjectKey(rawSubject(goal)));
        if (Number.isInteger(index)) lastIndex = index;
      });

    const groups = new Map();
    indexed.forEach(({ goal, index }) => {
      const date = goalDate(goal);
      if (!date || date < today || !looksLikePiece(goal)) return;
      const entries = groups.get(date) || [];
      entries.push({ goal, index });
      groups.set(date, entries);
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
          const index = indexBySubject.get(subjectKey(rawSubject(goal)));
          if (Number.isInteger(index)) lastIndex = index;
        });
        return;
      }
      if (!automaticEntries.length) return;
      const keep = automaticEntries[0].goal;
      automaticEntries.slice(1).forEach(({ goal }) => remove.add(goal));
      lastIndex = (lastIndex + 1 + PIECES.length) % PIECES.length;
      if (bindGoalToPiece(keep, PIECES[lastIndex], targetState)) changed += 1;
    });
    if (remove.size) targetState.dailyGoals = targetState.dailyGoals.filter((goal) => !remove.has(goal));
    return { changed, removed: remove.size, futureDates: groups.size };
  }

  function candidatePool(targetState, discipline) {
    return (targetState?.syllabusItems || [])
      .filter((item) => !looksLikePiece(item) && !completedItem(item) && disciplineKey(item.discipline || item.disciplina) === discipline && rawSubject(item))
      .map((item) => ({ item, order: orderOf(item, targetState) }))
      .filter((entry) => Number.isFinite(entry.order))
      .sort((a, b) => a.order - b.order);
  }

  function replacementCandidate(pool, minimumOrder, seenSubjects, reservedItems, assignedItems) {
    const eligible = pool.filter(({ item, order }) => order >= minimumOrder
      && !assignedItems.has(item)
      && !seenSubjects.some((subject) => similarSubjects(subject, rawSubject(item))));
    return eligible.find(({ item }) => !reservedItems.has(item))?.item || eligible[0]?.item || null;
  }

  function repairDidacticSchedule(targetState) {
    if (!targetState || !Array.isArray(targetState.dailyGoals) || !Array.isArray(targetState.syllabusItems)) {
      return { changed: 0, disciplines: 0, replacements: 0, clarified: 0 };
    }
    const today = currentDate();
    const groups = new Map();
    targetState.dailyGoals.forEach((goal, index) => {
      if (goalDate(goal) < today || !isAutomaticNewStudy(goal)) return;
      const discipline = disciplineKey(goal.discipline || goal.disciplina);
      const item = findSyllabusItem(goal, targetState);
      if (!discipline || !item) return;
      const entries = groups.get(discipline) || [];
      entries.push({ goal, index, item, order: orderOf(item, targetState) });
      groups.set(discipline, entries);
    });

    let changed = 0;
    let disciplines = 0;
    let replacements = 0;
    let clarified = 0;
    groups.forEach((entries, discipline) => {
      const slots = entries.slice().sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index);
      const desired = entries.slice().sort((a, b) => a.order - b.order || a.index - b.index).map((entry) => entry.item);
      const pool = candidatePool(targetState, discipline);
      const reservedItems = new Set(desired);
      const assignedItems = new Set();
      const seenSubjects = [];
      let groupChanged = false;

      slots.forEach((slot, position) => {
        let item = desired[position] || slot.item;
        const duplicate = assignedItems.has(item) || seenSubjects.some((subject) => similarSubjects(subject, rawSubject(item)));
        if (duplicate) {
          const alternative = replacementCandidate(pool, Number.isFinite(slot.order) ? slot.order : 0, seenSubjects, reservedItems, assignedItems);
          if (alternative) {
            item = alternative;
            replacements += 1;
          }
        }
        const previousTitle = rawSubject(slot.goal);
        const nextTitle = didacticTitle(item);
        if (bindGoalToItem(slot.goal, item)) {
          changed += 1;
          groupChanged = true;
          if (previousTitle !== nextTitle && isGenericSubject(rawSubject(item))) clarified += 1;
        }
        assignedItems.add(item);
        seenSubjects.push(rawSubject(item));
      });
      if (groupChanged) disciplines += 1;
    });
    return { changed, disciplines, replacements, clarified };
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
    const started = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const catalog = ensurePieceCatalog(targetState);
    const pieces = repairPieceRotation(targetState);
    const pedagogy = repairDidacticSchedule(targetState);
    const changed = catalog.added > 0 || pieces.changed > 0 || pieces.removed > 0 || pedagogy.changed > 0;
    if (changed && options.persist !== false) persist(`planning-quality-v367:${reason}`, options);
    const finished = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    lastReport = Object.freeze({
      version: VERSION,
      reason,
      waitingForState: false,
      changed,
      catalogAdded: catalog.added,
      pieceReassigned: pieces.changed,
      pieceDuplicatesRemoved: pieces.removed,
      pieceFutureDates: pieces.futureDates,
      didacticReassigned: pedagogy.changed,
      didacticDisciplines: pedagogy.disciplines,
      similarGoalsReplaced: pedagogy.replacements,
      vagueTitlesClarified: pedagogy.clarified,
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
    const date = String(args.date || currentDate());
    const seenByDiscipline = new Map();
    [...(targetState.dailyGoals || []), ...existing].forEach((goal) => {
      if (!isAutomaticNewStudy(goal) || (goalDate(goal) && goalDate(goal) > date)) return;
      const discipline = disciplineKey(goal.discipline || goal.disciplina);
      const subjects = seenByDiscipline.get(discipline) || [];
      subjects.push(rawSubject(goal));
      seenByDiscipline.set(discipline, subjects);
    });

    const passthrough = [];
    const groups = new Map();
    eligible.forEach((candidate, index) => {
      if (!isAutomaticNewStudy(candidate)) return passthrough.push({ candidate, index });
      const discipline = disciplineKey(candidate.discipline || candidate.disciplina);
      const order = orderOf(candidate, targetState);
      if (!discipline || !Number.isFinite(order)) return passthrough.push({ candidate, index });
      const seen = seenByDiscipline.get(discipline) || [];
      if (seen.some((subject) => similarSubjects(subject, rawSubject(candidate)))) return;
      const entries = groups.get(discipline) || [];
      if (!entries.some((entry) => similarSubjects(rawSubject(entry.candidate), rawSubject(candidate)))) entries.push({ candidate, index, order });
      groups.set(discipline, entries);
    });

    const allowed = new Set(passthrough.map((entry) => entry.candidate));
    groups.forEach((entries) => entries
      .sort((a, b) => a.order - b.order || a.index - b.index)
      .slice(0, FRONTIER_WIDTH)
      .forEach((entry) => allowed.add(entry.candidate)));
    const filtered = eligible.filter((candidate) => allowed.has(candidate));
    return filtered.length < need ? args : { ...args, eligibleGoals: filtered };
  }

  function installSelectionGate() {
    if (selectionInstalled) return true;
    const original = globalThis.selectPlanningGoalsForTargets;
    if (typeof original !== "function") return false;
    if (original.__aldusPlanningQualityV367 === VERSION) {
      selectionInstalled = true;
      return true;
    }
    const wrapped = function(args = {}) {
      const targetState = args.targetState || (typeof state !== "undefined" ? state : globalThis.state);
      return original.call(this, frontierArgs(args, targetState));
    };
    Object.defineProperty(wrapped, "__aldusPlanningQualityV367", { value: VERSION });
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
      if (!PLANNING_ROUTES.has(routeName())) return;
      const id = elementId(event.target);
      if (GENERATION_IDS.has(id)) {
        scheduleAfterGeneration(id);
      } else if (EXPORT_IDS.has(id)) {
        installSelectionGate();
        const report = run(`before-${id}`, { persist: false, render: false, sync: false });
        if (report?.changed) queueMicrotask(() => persist(`planning-quality-v367:after-${id}`));
      }
    }, true);
    return true;
  }

  function scheduleInitialRepair(reason) {
    if (initialScheduled || !PLANNING_ROUTES.has(routeName())) return false;
    initialScheduled = true;
    const callback = () => {
      initialScheduled = false;
      installSelectionGate();
      run(reason);
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(callback, { timeout: 1800 });
    else if (typeof setTimeout === "function") setTimeout(callback, 0);
    else queueMicrotask(callback);
    return true;
  }

  installListeners();
  queueMicrotask(installSelectionGate);
  if (typeof window !== "undefined") {
    const afterMaintenance = () => scheduleInitialRepair("post-bootstrap-maintenance");
    if (globalThis.__aldusPostBootstrapMaintenanceComplete === true) queueMicrotask(afterMaintenance);
    else window.addEventListener("aldus:post-bootstrap-maintenance-complete", afterMaintenance, { once: true });
    window.addEventListener("hashchange", () => scheduleInitialRepair("planning-route-entered"));
  }

  globalThis.__aldusPlanningQualityV367 = Object.freeze({
    version: VERSION,
    pieceTypes: PIECES.map((definition) => definition.subject),
    run,
    ensurePieceCatalog,
    repairPieceRotation,
    repairDidacticSchedule,
    similarSubjects,
    didacticTitle,
    frontierArgs,
    installSelectionGate,
    getLastReport: () => lastReport
  });
})();
