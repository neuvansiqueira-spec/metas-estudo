/* Aldus V360: catálogo persistente e rodízio real de Peças para Delegado */
(() => {
  "use strict";

  const VERSION = "20260819-delegate-piece-catalog-v360";
  const MIGRATION_KEY = "delegatePieceCatalogV360";
  const DISCIPLINE = "PEÇA PARA DELEGADO DE POLÍCIA CIVIL";
  const PLANNING_ROUTES = new Set(["planejamento", "metas-do-dia", "calendario-metas", "central-metas"]);
  const CONTEST_IDS = Object.freeze(["pcpr-2026-delegado", "pcma-2026-delegado"]);
  const DEFINITIONS = Object.freeze([
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

  let catalogScheduled = false;
  let catalogCompleted = false;
  let auditScheduled = false;
  let auditCompleted = false;
  let lastCatalog = null;
  let lastAudit = null;
  let maintenanceReady = false;

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
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

  const PIECE_INDEX = new Map(DEFINITIONS.map((definition, index) => [subjectKey(definition.subject), index]));

  function routeName() {
    if (typeof location === "undefined") return "";
    return String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0];
  }

  function currentDate() {
    try { if (typeof todayISO === "function") return todayISO(); } catch {}
    return new Date().toISOString().slice(0, 10);
  }

  function goalDate(record = {}) {
    return String(record.date || record.data || "").slice(0, 10);
  }

  function recordSubject(record = {}) {
    return String(record.baseSubject || record.subject || record.assunto || record.topic || record.topico || record.tema || "")
      .replace(/\s+[—-]\s+parte\s+\d+\/\d+\s*$/i, "")
      .trim();
  }

  function looksLikePiece(record = {}) {
    if (!record || typeof record !== "object") return false;
    if (record.fixedDailyPieceV183 === true || record.supplementalDelegatePieceV360 === true) return true;
    const category = canonical(record.contestCategory || record.category || record.classification);
    if (category === "piece") return true;
    const discipline = canonical(record.discipline || record.disciplina);
    return discipline.includes("peca") && discipline.includes("delegad");
  }

  function ignored(record = {}) {
    return ["ignorada", "ignorado", "nao cumprida", "nao cumprido"].includes(canonical(record.status));
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
    return ["concluida", "concluido", "em andamento", "estudado", "dominado", "revisado"].includes(canonical(record.status));
  }

  function isManual(record = {}) {
    try { if (typeof isManualDailyGoal === "function" && isManualDailyGoal(record)) return true; } catch {}
    const origin = canonical(record.origin || record.origem);
    return origin === "manual" || origin.startsWith("manual ") || origin.includes("usuario");
  }

  function protectedPiece(record = {}) {
    return looksLikePiece(record) && (hasExecution(record) || isManual(record));
  }

  function buildPieceItem(definition) {
    return {
      id: definition.id,
      discipline: DISCIPLINE,
      disciplina: DISCIPLINE,
      topic: definition.subject,
      topico: definition.subject,
      subject: definition.subject,
      assunto: definition.subject,
      subtopic: "Peças práticas",
      subassunto: "Peças práticas",
      reference: "Complemento prático Aldus — Delegado de Polícia",
      priority: "Alta",
      weight: 5,
      status: "Não iniciado",
      domain: "Não avaliado",
      notes: "Peça prática complementar para treinamento de Delegado. Não representa inclusão literal no texto do edital oficial.",
      imported: true,
      officialCatalogItem: false,
      supplementalPlanningItem: true,
      supplementalDelegatePieceV360: true,
      contestCategory: "PIECE",
      category: "PIECE",
      classification: "PIECE",
      contestCategories: ["PIECE"],
      contestIds: [...CONTEST_IDS],
      contestScope: "PRACTICAL_COMPLEMENT",
      importKey: `aldus|delegate-piece|${subjectKey(definition.subject).replace(/\s+/g, "|")}`,
      importMeta: {
        concurso: "PCPR/PCMA 2026",
        cargo: "Delegado de Polícia",
        fonte: "Complemento prático Aldus",
        agendavel: true,
        tipo_agendamento: "Estudo + questões",
        imported: true,
        officialLiteral: false
      }
    };
  }

  function ensureCatalog(targetState) {
    targetState.syllabusItems ||= [];
    targetState.schedulableSettings ||= {};
    targetState.migrations ||= {};

    const existingBySubject = new Map();
    targetState.syllabusItems.forEach((item) => {
      if (!looksLikePiece(item)) return;
      const key = subjectKey(recordSubject(item));
      if (key && !existingBySubject.has(key)) existingBySubject.set(key, item);
    });

    const itemBySubject = new Map();
    const added = [];
    DEFINITIONS.forEach((definition) => {
      const key = subjectKey(definition.subject);
      let item = existingBySubject.get(key);
      if (!item) {
        item = buildPieceItem(definition);
        targetState.syllabusItems.push(item);
        existingBySubject.set(key, item);
        added.push(item);
      }
      itemBySubject.set(key, item);
      if (!targetState.schedulableSettings[item.id]) {
        targetState.schedulableSettings[item.id] = {
          availability: "Agendável",
          mode: "Estudo + questões",
          priority: true
        };
      }
    });

    targetState.migrations[MIGRATION_KEY] = {
      version: VERSION,
      ensuredAt: targetState.migrations[MIGRATION_KEY]?.ensuredAt || new Date().toISOString(),
      pieceCount: DEFINITIONS.length,
      supplemental: true
    };
    return { itemBySubject, added };
  }

  function bindGoalToPiece(goal, item) {
    if (!goal || !item) return false;
    const subject = item.subject || item.topic;
    const beforeSubject = recordSubject(goal);
    const beforeId = String(goal.syllabusItemId || goal.syllabus_item_id || "");
    const changed = subjectKey(beforeSubject) !== subjectKey(subject)
      || beforeId !== String(item.id)
      || Boolean(goal.pieceCatalogKeyV357);
    if (!changed) return false;

    goal.discipline = DISCIPLINE;
    goal.disciplina = DISCIPLINE;
    goal.subject = subject;
    goal.assunto = subject;
    goal.baseSubject = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topic")) goal.topic = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topico")) goal.topico = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "tema")) goal.tema = subject;
    goal.syllabusItemId = item.id;
    if (Object.prototype.hasOwnProperty.call(goal, "syllabus_item_id")) goal.syllabus_item_id = item.id;
    if (Object.prototype.hasOwnProperty.call(goal, "pieceCatalogKeyV357")) delete goal.pieceCatalogKeyV357;
    goal.fixedDailyPieceV183 = true;
    goal.planningPieceCatalogPolicyV360 = VERSION;
    goal.updatedAt = new Date().toISOString();
    return true;
  }

  function rotateFuturePieces(targetState, itemBySubject) {
    targetState.dailyGoals ||= [];
    const today = currentDate();
    const indexed = targetState.dailyGoals.map((goal, index) => ({ goal, index }));
    let lastIndex = -1;

    indexed
      .filter(({ goal }) => looksLikePiece(goal) && !ignored(goal) && goalDate(goal) && goalDate(goal) < today)
      .sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index)
      .forEach(({ goal }) => {
        const index = PIECE_INDEX.get(subjectKey(recordSubject(goal)));
        if (Number.isInteger(index)) lastIndex = index;
      });

    const groups = new Map();
    indexed.forEach(({ goal, index }) => {
      const date = goalDate(goal);
      if (!date || date < today || !looksLikePiece(goal) || ignored(goal)) return;
      const list = groups.get(date) || [];
      list.push({ goal, index });
      groups.set(date, list);
    });

    const removeSet = new Set();
    const affectedDates = new Set();
    let reassigned = 0;
    let protectedDates = 0;

    [...groups.keys()].sort().forEach((date) => {
      const entries = groups.get(date).sort((a, b) => a.index - b.index);
      const protectedEntries = entries.filter(({ goal }) => protectedPiece(goal));
      const automaticEntries = entries.filter(({ goal }) => !protectedPiece(goal));

      if (protectedEntries.length) {
        protectedDates += 1;
        automaticEntries.forEach(({ goal }) => {
          removeSet.add(goal);
          affectedDates.add(date);
        });
        protectedEntries.forEach(({ goal }) => {
          const index = PIECE_INDEX.get(subjectKey(recordSubject(goal)));
          if (Number.isInteger(index)) lastIndex = index;
        });
        return;
      }

      if (!automaticEntries.length) return;
      const keep = automaticEntries[0].goal;
      automaticEntries.slice(1).forEach(({ goal }) => {
        removeSet.add(goal);
        affectedDates.add(date);
      });

      lastIndex = (lastIndex + 1 + DEFINITIONS.length) % DEFINITIONS.length;
      const definition = DEFINITIONS[lastIndex];
      const item = itemBySubject.get(subjectKey(definition.subject));
      if (bindGoalToPiece(keep, item)) reassigned += 1;
    });

    if (removeSet.size) {
      targetState.dailyGoals = targetState.dailyGoals.filter((goal) => !removeSet.has(goal));
      if (typeof reconcilePlanningDates === "function" && affectedDates.size) {
        try { reconcilePlanningDates(targetState, [...affectedDates].sort(), { rebuildAutomatic: false }); }
        catch (error) { console.warn(`[${VERSION}] Duplicatas de Peça removidas sem recomposição automática.`, error); }
      }
    }

    return { reassigned, removedDuplicates: removeSet.size, protectedDates, futureDates: groups.size };
  }

  function persistChanges(reason) {
    if (typeof saveData !== "function") return false;
    saveData({ markLocalChange: true, reason });
    if (typeof render === "function") render();
    if (typeof autoSyncAfterSave === "function") autoSyncAfterSave(reason);
    return true;
  }

  function runCatalog(reason = "catalog") {
    if (catalogCompleted) return lastCatalog;
    const targetState = typeof state !== "undefined" ? state : globalThis.state;
    if (!targetState || !Array.isArray(targetState.syllabusItems) || typeof saveData !== "function") {
      return Object.freeze({ version: VERSION, reason, waitingForState: true, changed: false, added: 0 });
    }
    const started = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const { added } = ensureCatalog(targetState);
    if (added.length) persistChanges("delegate-piece-catalog-v360");
    catalogCompleted = true;
    const finished = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    lastCatalog = Object.freeze({
      version: VERSION,
      reason,
      waitingForState: false,
      changed: added.length > 0,
      catalogSize: DEFINITIONS.length,
      added: added.length,
      totalMs: Number((finished - started).toFixed?.(1) ?? (finished - started))
    });
    return lastCatalog;
  }

  function runAudit(reason = "idle-audit") {
    if (auditCompleted) return lastAudit;
    const targetState = typeof state !== "undefined" ? state : globalThis.state;
    if (!targetState || !Array.isArray(targetState.syllabusItems) || typeof saveData !== "function") return null;

    const started = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const { itemBySubject, added } = ensureCatalog(targetState);
    catalogCompleted = true;
    const rotation = rotateFuturePieces(targetState, itemBySubject);

    if (!rotation.futureDates) {
      if (added.length) persistChanges("delegate-piece-catalog-v360");
      const finished = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      lastAudit = Object.freeze({
        version: VERSION,
        reason,
        changed: added.length > 0,
        waitingForGoals: true,
        catalogSize: DEFINITIONS.length,
        added: added.length,
        reassigned: 0,
        removedDuplicates: 0,
        protectedDates: 0,
        futureDates: 0,
        totalMs: Number((finished - started).toFixed?.(1) ?? (finished - started))
      });
      return lastAudit;
    }

    const changed = added.length > 0 || rotation.reassigned > 0 || rotation.removedDuplicates > 0;
    if (changed) persistChanges("delegate-piece-catalog-v360");
    auditCompleted = true;
    const finished = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    lastAudit = Object.freeze({
      version: VERSION,
      reason,
      changed,
      waitingForGoals: false,
      catalogSize: DEFINITIONS.length,
      added: added.length,
      reassigned: rotation.reassigned,
      removedDuplicates: rotation.removedDuplicates,
      protectedDates: rotation.protectedDates,
      futureDates: rotation.futureDates,
      totalMs: Number((finished - started).toFixed?.(1) ?? (finished - started))
    });
    return lastAudit;
  }

  function scheduleIdle(callback, timeout = 1800) {
    if (typeof requestIdleCallback === "function") requestIdleCallback(callback, { timeout });
    else if (typeof setTimeout === "function") setTimeout(callback, 0);
    else queueMicrotask(callback);
  }

  function scheduleCatalog(reason = "bootstrap") {
    if (catalogCompleted || catalogScheduled) return false;
    catalogScheduled = true;
    scheduleIdle(() => {
      catalogScheduled = false;
      const report = runCatalog(reason);
      if (report?.waitingForState) catalogCompleted = false;
    });
    return true;
  }

  function scheduleAudit(reason = "planning-route") {
    if (auditCompleted || auditScheduled || !PLANNING_ROUTES.has(routeName())) return false;
    auditScheduled = true;
    scheduleIdle(() => {
      auditScheduled = false;
      runAudit(reason);
    });
    return true;
  }

  function scheduleForCurrentRoute(reason) {
    if (PLANNING_ROUTES.has(routeName())) return scheduleAudit(reason);
    return scheduleCatalog(reason);
  }

  if (typeof window !== "undefined") {
    const afterMaintenance = () => {
      maintenanceReady = true;
      scheduleForCurrentRoute("post-bootstrap-maintenance");
    };
    if (globalThis.__aldusPostBootstrapMaintenanceComplete === true) queueMicrotask(afterMaintenance);
    else window.addEventListener("aldus:post-bootstrap-maintenance-complete", afterMaintenance, { once: true });
    window.addEventListener("hashchange", () => {
      if (!maintenanceReady) return;
      if (PLANNING_ROUTES.has(routeName())) scheduleAudit("route-entered");
      else scheduleCatalog("route-entered");
    });
  }

  const publicApi = Object.freeze({
    version: VERSION,
    pieceTypes: Object.freeze(DEFINITIONS.map((definition) => definition.subject)),
    pieceDefinitions: DEFINITIONS,
    runCatalog,
    runAudit,
    scheduleCatalog,
    scheduleAudit,
    getLastCatalog: () => lastCatalog,
    getLastAudit: () => lastAudit
  });
  globalThis.__aldusPieceRotationRepairV358 = publicApi;
  globalThis.__aldusPieceRotationTimingV359 = publicApi;
  globalThis.__aldusDelegatePieceCatalogV360 = publicApi;
})();
