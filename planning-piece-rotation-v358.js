/* Aldus V359: repara o timing do rodízio futuro de Peças sem criar hot path */
(() => {
  "use strict";

  const VERSION = "20260818-piece-rotation-post-bootstrap-v359";
  if (globalThis.__aldusPieceRotationRepairV358?.version === VERSION) return;

  const PIECE_ID_PREFIX = "v357-piece:";
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

  function subjectKey(value) {
    let key = canonical(value)
      .replace(/^\d+(?:\.\d+)*\s+/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (key.startsWith("representacao por ")) key = key.slice("representacao por ".length);
    return key;
  }

  const PIECE_INDEX = new Map(PIECE_TYPES.map((subject, index) => [subjectKey(subject), index]));

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

  function goalSubject(record = {}) {
    return String(record.baseSubject || record.subject || record.assunto || record.topic || record.topico || record.tema || "")
      .replace(/\s+[—-]\s+parte\s+\d+\/\d+\s*$/i, "")
      .trim();
  }

  function looksLikePiece(record = {}) {
    if (!record || typeof record !== "object") return false;
    if (record.fixedDailyPieceV183 === true || record.pieceCatalogKeyV357) return true;
    const category = canonical(record.contestCategory || record.category || record.classification);
    if (category === "piece") return true;
    const discipline = canonical(record.discipline || record.disciplina);
    return discipline.includes("peca") && discipline.includes("delegad");
  }

  function ignoredGoal(record = {}) {
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
    try {
      if (typeof isManualDailyGoal === "function" && isManualDailyGoal(record)) return true;
    } catch {}
    const origin = canonical(record.origin || record.origem);
    return origin === "manual" || origin.startsWith("manual ") || origin.includes("usuario");
  }

  function protectedPiece(record = {}) {
    return looksLikePiece(record) && (hasExecution(record) || isManual(record));
  }

  function pieceIndex(record = {}) {
    return PIECE_INDEX.get(subjectKey(goalSubject(record))) ?? -1;
  }

  function virtualPieceId(subject) {
    return `${PIECE_ID_PREFIX}${subjectKey(subject).replace(/\s+/g, "-")}`;
  }

  function assignPieceType(goal, subject) {
    if (!goal || !subject) return false;
    const before = goalSubject(goal);
    const catalogKey = virtualPieceId(subject);
    const alreadyCorrect = subjectKey(before) === subjectKey(subject)
      && String(goal.pieceCatalogKeyV357 || "") === catalogKey
      && !String(goal.syllabusItemId || goal.syllabus_item_id || "");
    if (alreadyCorrect) return false;

    goal.subject = subject;
    goal.assunto = subject;
    goal.baseSubject = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topic")) goal.topic = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "topico")) goal.topico = subject;
    if (Object.prototype.hasOwnProperty.call(goal, "tema")) goal.tema = subject;
    goal.pieceCatalogKeyV357 = catalogKey;
    goal.syllabusItemId = "";
    if (Object.prototype.hasOwnProperty.call(goal, "syllabus_item_id")) goal.syllabus_item_id = "";
    goal.fixedDailyPieceV183 = true;
    goal.planningPieceRotationPolicyV358 = VERSION;
    return true;
  }

  function auditPieceRotation(reason = "idle-audit") {
    if (auditCompleted) return lastAudit;
    const targetState = typeof state !== "undefined" ? state : null;
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return null;

    const startedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    const today = currentDate();
    const indexedGoals = targetState.dailyGoals.map((goal, index) => ({ goal, index }));
    const historicalPieces = indexedGoals
      .filter(({ goal }) => looksLikePiece(goal) && !ignoredGoal(goal) && goalDate(goal) && goalDate(goal) < today)
      .sort((a, b) => goalDate(a.goal).localeCompare(goalDate(b.goal)) || a.index - b.index);

    let lastIndex = -1;
    historicalPieces.forEach(({ goal }) => {
      const index = pieceIndex(goal);
      if (index >= 0) lastIndex = index;
    });

    const futureGroups = new Map();
    indexedGoals.forEach(({ goal, index }) => {
      const date = goalDate(goal);
      if (!date || date < today || !looksLikePiece(goal) || ignoredGoal(goal)) return;
      const entries = futureGroups.get(date) || [];
      entries.push({ goal, index });
      futureGroups.set(date, entries);
    });

    // V359: cronograma vazio/incompleto durante o bootstrap não encerra a auditoria.
    // A V186 pode criar as Peças no pós-bootstrap; aguardamos esse estado real antes de concluir.
    if (!futureGroups.size) {
      const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      lastAudit = Object.freeze({
        version: VERSION,
        reason,
        changed: false,
        waitingForGoals: true,
        reassigned: 0,
        removedDuplicates: 0,
        protectedDates: 0,
        futureDates: 0,
        totalMs: Number((finishedAt - startedAt).toFixed?.(1) ?? (finishedAt - startedAt))
      });
      return lastAudit;
    }

    const removeSet = new Set();
    const affectedDates = new Set();
    let reassigned = 0;
    let protectedDates = 0;

    [...futureGroups.keys()].sort().forEach((date) => {
      const entries = futureGroups.get(date).sort((a, b) => a.index - b.index);
      const protectedEntries = entries.filter(({ goal }) => protectedPiece(goal));
      const automaticEntries = entries.filter(({ goal }) => !protectedPiece(goal));

      if (protectedEntries.length) {
        protectedDates += 1;
        automaticEntries.forEach(({ goal }) => {
          removeSet.add(goal);
          affectedDates.add(date);
        });
        protectedEntries.forEach(({ goal }) => {
          const index = pieceIndex(goal);
          if (index >= 0) lastIndex = index;
        });
        return;
      }

      if (!automaticEntries.length) return;
      const keep = automaticEntries[0].goal;
      automaticEntries.slice(1).forEach(({ goal }) => {
        removeSet.add(goal);
        affectedDates.add(date);
      });
      lastIndex = (lastIndex + 1 + PIECE_TYPES.length) % PIECE_TYPES.length;
      if (assignPieceType(keep, PIECE_TYPES[lastIndex])) reassigned += 1;
    });

    if (removeSet.size) {
      targetState.dailyGoals = targetState.dailyGoals.filter((goal) => !removeSet.has(goal));
      if (typeof reconcilePlanningDates === "function" && affectedDates.size) {
        try {
          reconcilePlanningDates(targetState, [...affectedDates].sort(), { rebuildAutomatic: false });
        } catch (error) {
          console.warn(`[${VERSION}] Duplicata de Peça removida sem recomposição automática.`, error);
        }
      }
    }

    const changed = reassigned > 0 || removeSet.size > 0;
    auditCompleted = true;
    if (changed) {
      if (typeof saveData === "function") saveData({ markLocalChange: true, reason: "piece-rotation-post-bootstrap-v359" });
      if (typeof render === "function") render();
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("piece-rotation-post-bootstrap-v359");
    }

    const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    lastAudit = Object.freeze({
      version: VERSION,
      reason,
      changed,
      waitingForGoals: false,
      reassigned,
      removedDuplicates: removeSet.size,
      protectedDates,
      futureDates: futureGroups.size,
      totalMs: Number((finishedAt - startedAt).toFixed?.(1) ?? (finishedAt - startedAt))
    });
    return lastAudit;
  }

  function scheduleAudit(reason = "planning-route") {
    if (auditCompleted || auditScheduled || !PLANNING_ROUTES.has(routeName())) return false;
    auditScheduled = true;
    const execute = () => {
      auditScheduled = false;
      auditPieceRotation(reason);
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(execute, { timeout: 1500 });
    else if (typeof setTimeout === "function") setTimeout(execute, 0);
    else queueMicrotask(execute);
    return true;
  }

  function onBootstrapReady() {
    scheduleAudit("bootstrap-planning-route");
  }

  if (typeof window !== "undefined") {
    if (globalThis.__aldusBootstrapReady) queueMicrotask(onBootstrapReady);
    else window.addEventListener("aldus:bootstrap-ready", onBootstrapReady, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", () => {
      scheduleAudit("post-bootstrap-maintenance");
    }, { once: true });
    window.addEventListener("hashchange", () => scheduleAudit("route-entered"));
  }

  const publicApi = Object.freeze({
    version: VERSION,
    pieceTypes: PIECE_TYPES,
    runAudit: auditPieceRotation,
    scheduleAudit,
    getLastAudit: () => lastAudit
  });
  globalThis.__aldusPieceRotationRepairV358 = publicApi;
  globalThis.__aldusPieceRotationTimingV359 = publicApi;
})();
