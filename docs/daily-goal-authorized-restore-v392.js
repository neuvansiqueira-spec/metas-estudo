(() => {
  "use strict";

  const VERSION = "20260824-corrige-identidade-meta-planejamento-v392";
  const TARGET_DATE = "2026-08-24";
  const TARGET_DISCIPLINE = "direito administrativo e gestao publica";
  const TARGET_SUBJECT = "planejamento e gestao estrategica";
  const TARGET_REFERENCE = "5 11 2";
  const V391_VERSION = "20260824-restaura-planejamento-gestao-estrategica-v391";
  const STATUS_KEY = "__ALDUS_AUTHORIZED_GOAL_RESTORE_V392__";
  const MIGRATION_KEY = "authorizedStrategicPlanningIdentityFixV392";

  if (globalThis[STATUS_KEY]?.version === VERSION) return;

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const dateOf = (record = {}) => String(record.date || record.data || "").slice(0, 10);
  const disciplineOf = (record = {}) => canonical(record.discipline || record.disciplina);
  const subjectOf = (record = {}) => canonical(
    record.baseSubject || record.subject || record.assunto || record.tema || record.topic || record.topico || record.title || record.titulo
  ).replace(/^5 11 2\s+/, "");

  function referenceOf(record = {}) {
    const values = [
      record.reference,
      record.referencia,
      record.ref,
      record.editalReference,
      record.editalRef,
      record.itemReference,
      record.itemRef,
      record.importMeta?.reference,
      record.importMeta?.referencia,
      record.importMeta?.ref
    ];
    for (const value of values) {
      const normalized = canonical(value);
      if (normalized) return normalized;
    }
    return "";
  }

  function appState() {
    try {
      return typeof state !== "undefined" && state && Array.isArray(state.dailyGoals) ? state : null;
    } catch {
      return null;
    }
  }

  function isExactTargetItem(item = {}) {
    if (disciplineOf(item) !== TARGET_DISCIPLINE) return false;
    if (subjectOf(item) === TARGET_SUBJECT) return true;
    const reference = referenceOf(item);
    return reference === TARGET_REFERENCE || reference.endsWith(` ${TARGET_REFERENCE}`);
  }

  function findExactTargetItem(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    return items.find((item) => item && !item.legacyOnly && !item.hiddenFromCatalog && isExactTargetItem(item)) || null;
  }

  function itemSubject(item = {}) {
    const raw = String(
      item.baseSubject || item.subject || item.assunto || item.tema || item.topic || item.topico || item.title || item.titulo || ""
    ).trim();
    return raw.replace(/^\s*5\.11\.2\s+/i, "").trim() || "Planejamento e gestão estratégica.";
  }

  function itemDiscipline(item = {}) {
    return String(item.discipline || item.disciplina || "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA").trim();
  }

  function uniqueItemId(targetState, item) {
    const id = String(item?.id || "").trim();
    if (!id) return "";
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    return items.filter((candidate) => String(candidate?.id || "").trim() === id).length === 1 ? id : "";
  }

  function hasExecution(goal = {}) {
    if ([goal.actualMinutes, goal.tempo_real_minutos, goal.studyActualMinutes, goal.questionActualMinutes, goal.performedMinutes]
      .some((value) => Number(value) > 0)) return true;
    const status = canonical(goal.status);
    return ["concluida", "concluido", "em andamento", "estudado", "dominado", "revisado"].includes(status);
  }

  function findV391Goal(targetState) {
    return (targetState?.dailyGoals || []).find((goal) =>
      dateOf(goal) === TARGET_DATE && String(goal.restoredBy || "") === V391_VERSION
    ) || null;
  }

  function alreadyCorrect(goal = {}) {
    return disciplineOf(goal) === TARGET_DISCIPLINE && subjectOf(goal) === TARGET_SUBJECT;
  }

  function normalizeAliases(goal, item, targetState) {
    const discipline = itemDiscipline(item);
    const subject = itemSubject(item);
    const uniqueId = uniqueItemId(targetState, item);

    goal.discipline = discipline;
    goal.disciplina = discipline;
    goal.subject = subject;
    goal.assunto = subject;
    goal.baseSubject = subject;

    for (const key of ["topic", "topico", "tema", "title", "titulo"]) {
      if (Object.prototype.hasOwnProperty.call(goal, key)) goal[key] = subject;
    }

    if (uniqueId) {
      goal.syllabusItemId = uniqueId;
      if (Object.prototype.hasOwnProperty.call(goal, "syllabus_item_id")) goal.syllabus_item_id = uniqueId;
    } else {
      delete goal.syllabusItemId;
      delete goal.syllabus_item_id;
    }

    goal.origin = "planejamento";
    goal.origem = "planejamento";
    goal.restoredFrom = V391_VERSION;
    goal.restoredBy = VERSION;
    goal.correctedIdentityV392 = true;
    goal.updatedAt = new Date().toISOString();

    return { discipline, subject, uniqueId };
  }

  function persist(targetState, goal, item, normalized) {
    const now = new Date().toISOString();
    targetState.migrations ||= {};
    targetState.migrations[MIGRATION_KEY] = {
      version: VERSION,
      date: TARGET_DATE,
      goalId: String(goal.id || ""),
      discipline: normalized.discipline,
      subject: normalized.subject,
      reference: "5.11.2",
      syllabusItemId: normalized.uniqueId,
      sourceItemId: String(item.id || ""),
      executedAt: now
    };

    try {
      if (typeof saveData === "function") {
        const saved = saveData({ markLocalChange: true, reason: VERSION });
        if (saved !== false && typeof autoSyncAfterSave === "function") autoSyncAfterSave(VERSION);
      }
    } catch (error) {
      console.warn("[Aldus V392] A identidade da meta foi corrigida em memória, mas o salvamento apresentou erro.", error);
    }

    try { if (typeof render === "function") render(); } catch {}
  }

  function restore(targetState = appState()) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) {
      return { changed: false, skipped: "state-unavailable" };
    }

    const dayGoals = targetState.dailyGoals.filter((goal) => dateOf(goal) === TARGET_DATE);
    const wrongGoal = findV391Goal(targetState);

    if (!wrongGoal) {
      const correct = dayGoals.find(alreadyCorrect);
      return correct
        ? { changed: false, skipped: "target-already-correct", total: dayGoals.length }
        : { changed: false, skipped: "v391-goal-not-found", total: dayGoals.length };
    }

    if (alreadyCorrect(wrongGoal)) {
      return { changed: false, skipped: "target-already-correct", total: dayGoals.length };
    }

    if (dayGoals.length !== 7) {
      return { changed: false, skipped: "unexpected-day-total", total: dayGoals.length };
    }

    if (hasExecution(wrongGoal)) {
      return { changed: false, skipped: "wrong-goal-has-execution", total: dayGoals.length };
    }

    const item = findExactTargetItem(targetState);
    if (!item) {
      return { changed: false, skipped: "target-item-not-found", total: dayGoals.length };
    }

    const before = {
      discipline: wrongGoal.discipline || wrongGoal.disciplina || "",
      subject: wrongGoal.baseSubject || wrongGoal.subject || wrongGoal.assunto || "",
      syllabusItemId: wrongGoal.syllabusItemId || wrongGoal.syllabus_item_id || ""
    };

    const normalized = normalizeAliases(wrongGoal, item, targetState);
    persist(targetState, wrongGoal, item, normalized);

    return {
      changed: true,
      corrected: String(wrongGoal.id || ""),
      before,
      discipline: normalized.discipline,
      subject: normalized.subject,
      syllabusItemId: normalized.uniqueId,
      total: targetState.dailyGoals.filter((goal) => dateOf(goal) === TARGET_DATE).length
    };
  }

  function publish(report) {
    globalThis[STATUS_KEY] = Object.freeze({ version: VERSION, ...report });
    return report;
  }

  function terminal(report = {}) {
    return report.changed === true || [
      "target-already-correct",
      "v391-goal-not-found",
      "unexpected-day-total",
      "wrong-goal-has-execution",
      "target-item-not-found"
    ].includes(report.skipped);
  }

  let finished = false;
  function attempt() {
    if (finished) return globalThis[STATUS_KEY];
    const report = publish(restore(appState()));
    if (terminal(report)) finished = true;
    return report;
  }

  const initial = attempt();
  if (!terminal(initial) && typeof window !== "undefined") {
    const retry = () => attempt();
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", retry, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", retry, { once: true });
    window.addEventListener("aldus:bootstrap-ready", retry, { once: true });
    window.addEventListener("load", retry, { once: true });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      VERSION,
      TARGET_DATE,
      appState,
      isExactTargetItem,
      findExactTargetItem,
      uniqueItemId,
      findV391Goal,
      alreadyCorrect,
      normalizeAliases,
      restore
    };
  }
})();