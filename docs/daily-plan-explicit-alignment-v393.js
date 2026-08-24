(() => {
  "use strict";

  const VERSION = "20260824-explicit-daily-plan-alignment-v393";
  const TARGET_DATE = "2026-08-24";
  const TARGET_DISCIPLINE = "direito administrativo e gestao publica";
  const TARGET_SUBJECT = "planejamento e gestao estrategica";
  const TARGET_REFERENCE = "5 11 2";
  const WRONG_DISCIPLINE = "legislacao estadual e institucional";
  const WRONG_SUBJECT_MARKERS = [
    "estruturacao das carreiras da policia civil do estado do parana",
    "lei complementar estadual n 259",
    "lei complementar estadual no 259"
  ];
  const STATUS_KEY = "__ALDUS_DAILY_PLAN_EXPLICIT_ALIGNMENT_V393__";
  const WRAP_MARKER = "__aldusExplicitDailyPlanAlignmentV393";

  if (globalThis[STATUS_KEY]?.version === VERSION) return;

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const dateOf = (record = {}) => String(record.date || record.data || "").slice(0, 10);
  const disciplineOf = (record = {}) => canonical(record.discipline || record.disciplina);
  const subjectOf = (record = {}) => canonical(
    record.baseSubject || record.subject || record.assunto || record.tema || record.topic || record.topico || record.title || record.titulo
  ).replace(/^5 11 2\s+/, "");

  function referenceOf(record = {}) {
    const values = [
      record.reference, record.referencia, record.ref,
      record.editalReference, record.editalRef,
      record.itemReference, record.itemRef,
      record.importMeta?.reference, record.importMeta?.referencia, record.importMeta?.ref
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

  function isTargetItem(record = {}) {
    if (disciplineOf(record) !== TARGET_DISCIPLINE) return false;
    if (subjectOf(record) === TARGET_SUBJECT) return true;
    const reference = referenceOf(record);
    return reference === TARGET_REFERENCE || reference.endsWith(` ${TARGET_REFERENCE}`);
  }

  function findTargetItem(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    return items.find((item) => item && !item.legacyOnly && !item.hiddenFromCatalog && isTargetItem(item)) || null;
  }

  function hasExecution(goal = {}) {
    if ([goal.actualMinutes, goal.tempo_real_minutos, goal.studyActualMinutes, goal.questionActualMinutes, goal.performedMinutes]
      .some((value) => Number(value) > 0)) return true;
    const status = canonical(goal.status);
    return ["concluida", "concluido", "em andamento", "estudado", "dominado", "revisado"].includes(status);
  }

  function isWrongReplacement(goal = {}) {
    if (dateOf(goal) !== TARGET_DATE || disciplineOf(goal) !== WRONG_DISCIPLINE) return false;
    const subject = subjectOf(goal);
    return WRONG_SUBJECT_MARKERS.some((marker) => subject.includes(marker));
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

  function normalizeGoalToTarget(goal, item, targetState) {
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
    goal.correctedBy = VERSION;
    goal.updatedAt = new Date().toISOString();
    return { discipline, subject, uniqueId };
  }

  function blockAutomaticAlignment() {
    const current = globalThis.ensureDailyPlanAlignedWithPlanningV174;
    if (typeof current !== "function") return false;
    if (current[WRAP_MARKER] === VERSION) return true;

    const wrapped = function(targetState, date, options) {
      if (options?.explicit === true || options?.allowRebuild === true) {
        return current.apply(this, arguments);
      }
      return {
        changed: false,
        skipped: VERSION,
        date: String(date || ""),
        report: null
      };
    };
    Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.ensureDailyPlanAlignedWithPlanningV174 = wrapped;
    return true;
  }

  function markCurrentPlanAligned(targetState) {
    try {
      if (typeof markDailyPlanAlignmentV174 === "function") {
        markDailyPlanAlignmentV174(targetState, TARGET_DATE);
        return true;
      }
    } catch {}
    return false;
  }

  function repairCurrentState(targetState = appState()) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) {
      return { changed: false, skipped: "state-unavailable" };
    }
    const dayGoals = targetState.dailyGoals.filter((goal) => dateOf(goal) === TARGET_DATE);
    if (dayGoals.some(isTargetItem)) {
      markCurrentPlanAligned(targetState);
      return { changed: false, skipped: "target-already-present", total: dayGoals.length };
    }
    if (dayGoals.length !== 7) {
      return { changed: false, skipped: "unexpected-day-total", total: dayGoals.length };
    }

    const wrong = dayGoals.find(isWrongReplacement);
    if (!wrong) return { changed: false, skipped: "wrong-replacement-not-found", total: dayGoals.length };
    if (hasExecution(wrong)) return { changed: false, skipped: "wrong-replacement-has-execution", total: dayGoals.length };

    const item = findTargetItem(targetState);
    if (!item) return { changed: false, skipped: "target-item-not-found", total: dayGoals.length };

    const before = {
      id: String(wrong.id || ""),
      discipline: wrong.discipline || wrong.disciplina || "",
      subject: wrong.baseSubject || wrong.subject || wrong.assunto || "",
      syllabusItemId: wrong.syllabusItemId || wrong.syllabus_item_id || ""
    };
    const normalized = normalizeGoalToTarget(wrong, item, targetState);
    markCurrentPlanAligned(targetState);

    targetState.migrations ||= {};
    targetState.migrations.explicitDailyPlanAlignmentV393 = {
      version: VERSION,
      date: TARGET_DATE,
      goalId: String(wrong.id || ""),
      before,
      discipline: normalized.discipline,
      subject: normalized.subject,
      syllabusItemId: normalized.uniqueId,
      executedAt: new Date().toISOString()
    };

    try {
      if (typeof saveData === "function") {
        const saved = saveData({ markLocalChange: true, reason: VERSION });
        if (saved !== false && typeof autoSyncAfterSave === "function") autoSyncAfterSave(VERSION);
      }
    } catch (error) {
      console.warn("[Aldus V393] Meta corrigida em memória, mas o salvamento apresentou erro.", error);
    }
    try { if (typeof render === "function") render(); } catch {}

    return {
      changed: true,
      corrected: String(wrong.id || ""),
      before,
      discipline: normalized.discipline,
      subject: normalized.subject,
      syllabusItemId: normalized.uniqueId,
      total: targetState.dailyGoals.filter((goal) => dateOf(goal) === TARGET_DATE).length
    };
  }

  function publish(report) {
    globalThis[STATUS_KEY] = Object.freeze({ version: VERSION, ...report, guardInstalled: blockAutomaticAlignment() });
    return report;
  }

  let finished = false;
  function attempt() {
    blockAutomaticAlignment();
    if (finished) return globalThis[STATUS_KEY];
    const report = publish(repairCurrentState(appState()));
    if (report.changed === true || report.skipped !== "state-unavailable") finished = true;
    return report;
  }

  const initial = attempt();
  if (initial?.skipped === "state-unavailable" && typeof window !== "undefined") {
    const retry = () => attempt();
    window.addEventListener("aldus:bootstrap-ready", retry, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", retry, { once: true });
    window.addEventListener("load", retry, { once: true });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      VERSION,
      TARGET_DATE,
      appState,
      isTargetItem,
      isWrongReplacement,
      findTargetItem,
      uniqueItemId,
      normalizeGoalToTarget,
      blockAutomaticAlignment,
      repairCurrentState
    };
  }
})();