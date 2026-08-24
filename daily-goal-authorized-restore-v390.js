(() => {
  "use strict";

  const VERSION = "20260824-restaura-meta-planejamento-gestao-publica-v390";
  const TARGET_DATE = "2026-08-24";
  const EXPECTED_TOTAL = 7;
  const TARGET_DISCIPLINE = "direito administrativo e gestao publica";
  const TARGET_SUBJECT = "planejamento e gestao publica";
  const MIGRATION_KEY = "authorizedPlanningPublicManagementRestoreV390";
  const STATUS_KEY = "__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__";

  if (globalThis[STATUS_KEY]?.version === VERSION) return;

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const dateOf = (goal = {}) => String(goal.date || goal.data || "").slice(0, 10);
  const disciplineOf = (record = {}) => canonical(record.discipline || record.disciplina);
  const subjectOf = (record = {}) => canonical(
    record.baseSubject || record.subject || record.assunto || record.tema || record.topic || record.topico || record.title || record.titulo
  );

  function appState() {
    try {
      return typeof state !== "undefined" && state && Array.isArray(state.dailyGoals) ? state : null;
    } catch {
      return null;
    }
  }

  function isTarget(record = {}) {
    return disciplineOf(record) === TARGET_DISCIPLINE && subjectOf(record) === TARGET_SUBJECT;
  }

  function targetDayGoals(targetState) {
    return Array.isArray(targetState?.dailyGoals)
      ? targetState.dailyGoals.filter((goal) => dateOf(goal) === TARGET_DATE)
      : [];
  }

  function planningGoalsForTargetDay(targetState) {
    return targetDayGoals(targetState).filter((goal) => {
      try { return typeof isPlanningStudyGoal === "function" ? isPlanningStudyGoal(goal) : true; }
      catch { return true; }
    });
  }

  function findSyllabusItem(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    return items.find((item) => item && !item.legacyOnly && !item.hiddenFromCatalog && isTarget(item)) || null;
  }

  function goalTypeForItem(item, targetState) {
    try {
      if (typeof normalGoalTypeForItemV157 === "function") {
        const type = normalGoalTypeForItemV157(item, targetState);
        if (type) return type;
      }
    } catch {}
    try {
      if (typeof completedStatus === "function" && completedStatus(item)) return "Revisão";
    } catch {}
    const mode = canonical(
      item?.importMeta?.tipo_agendamento
      || item?.tipo_agendamento
      || targetState?.schedulableSettings?.[item?.id]?.mode
      || ""
    );
    if (mode === "questoes apenas") return "Questões";
    if (mode === "revisao apenas") return "Revisão";
    return "Estudo novo";
  }

  function buildGoalFromSyllabus(item, targetState) {
    if (!item?.id) return null;
    const type = goalTypeForItem(item, targetState);
    let scoreContext;
    try {
      if (typeof buildPlanningScoreContext === "function") scoreContext = buildPlanningScoreContext(targetState);
    } catch {}
    try {
      if (typeof makeGoal === "function") {
        const built = makeGoal(item, TARGET_DATE, type, scoreContext, targetState);
        const goal = Array.isArray(built) ? built[0] : built;
        if (goal && typeof goal === "object") return goal;
      }
    } catch (error) {
      console.warn("[Aldus V390] O item do edital foi localizado, mas a criação padrão da meta falhou.", error);
    }
    return null;
  }

  function findCandidate(targetState) {
    const existingGoals = planningGoalsForTargetDay(targetState);
    try {
      if (typeof eligiblePlanningGoalsForDate === "function") {
        const scoreContext = typeof buildPlanningScoreContext === "function"
          ? buildPlanningScoreContext(targetState)
          : undefined;
        const eligible = eligiblePlanningGoalsForDate(TARGET_DATE, {
          targetState,
          scoreContext,
          existingGoals
        });
        const candidate = Array.isArray(eligible) ? eligible.find(isTarget) : null;
        if (candidate) return { candidate, source: "eligible-planning" };
      }
    } catch (error) {
      console.warn("[Aldus V390] Não foi possível consultar os candidatos elegíveis do planejamento.", error);
    }

    const historical = Array.isArray(targetState?.dailyGoals)
      ? targetState.dailyGoals.find((goal) => dateOf(goal) !== TARGET_DATE && isTarget(goal))
      : null;
    if (historical) return { candidate: historical, source: "historical-goal" };

    const syllabusItem = findSyllabusItem(targetState);
    if (!syllabusItem) return null;
    const builtGoal = buildGoalFromSyllabus(syllabusItem, targetState);
    return builtGoal ? { candidate: builtGoal, source: "syllabus-item", syllabusItemId: syllabusItem.id } : null;
  }

  function persistRestore(targetState, restoredGoal, source, syllabusItemId = "") {
    const now = new Date().toISOString();
    targetState.migrations ||= {};
    targetState.migrations[MIGRATION_KEY] = {
      version: VERSION,
      date: TARGET_DATE,
      discipline: restoredGoal.discipline || restoredGoal.disciplina || "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
      subject: restoredGoal.baseSubject || restoredGoal.subject || restoredGoal.assunto || restoredGoal.tema || "Planejamento e Gestão Pública",
      source,
      syllabusItemId: syllabusItemId || restoredGoal.syllabusItemId || "",
      executedAt: now
    };

    try {
      if (typeof saveData === "function") {
        const saved = saveData({ markLocalChange: true, reason: VERSION });
        if (saved !== false && typeof autoSyncAfterSave === "function") autoSyncAfterSave(VERSION);
      }
    } catch (error) {
      console.warn("[Aldus V390] A meta foi restaurada em memória, mas o salvamento apresentou erro.", error);
    }

    try { if (typeof render === "function") render(); } catch {}
    return targetState.migrations[MIGRATION_KEY];
  }

  function restore(targetState = appState()) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) {
      return { changed: false, skipped: "state-unavailable" };
    }

    const dayGoals = targetDayGoals(targetState);
    if (dayGoals.some(isTarget)) {
      return { changed: false, skipped: "already-present", total: dayGoals.length };
    }
    if (dayGoals.length >= EXPECTED_TOTAL) {
      return { changed: false, skipped: "day-already-has-seven", total: dayGoals.length };
    }
    if (dayGoals.length !== EXPECTED_TOTAL - 1) {
      return { changed: false, skipped: "unexpected-day-total", total: dayGoals.length };
    }

    const located = findCandidate(targetState);
    if (!located?.candidate) {
      const syllabusPresent = Boolean(findSyllabusItem(targetState));
      return { changed: false, skipped: syllabusPresent ? "syllabus-item-unbuildable" : "candidate-not-found", total: dayGoals.length };
    }

    const now = new Date().toISOString();
    const sourceGoal = located.candidate;
    const sourceId = String(sourceGoal.id || "");
    const idAlreadyUsed = sourceId && targetState.dailyGoals.some((goal) => goal !== sourceGoal && String(goal.id || "") === sourceId);
    const restoredGoal = {
      ...sourceGoal,
      id: idAlreadyUsed ? "authorized-v390-20260824-planejamento-gestao-publica" : (sourceId || "authorized-v390-20260824-planejamento-gestao-publica"),
      date: TARGET_DATE,
      data: TARGET_DATE,
      discipline: sourceGoal.discipline || sourceGoal.disciplina || "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
      disciplina: sourceGoal.disciplina || sourceGoal.discipline || "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
      subject: sourceGoal.subject || sourceGoal.baseSubject || sourceGoal.assunto || "Planejamento e Gestão Pública",
      assunto: sourceGoal.assunto || sourceGoal.subject || sourceGoal.baseSubject || "Planejamento e Gestão Pública",
      baseSubject: sourceGoal.baseSubject || sourceGoal.subject || sourceGoal.assunto || "Planejamento e Gestão Pública",
      origin: "planejamento",
      origem: "planejamento",
      status: sourceGoal.status || "Pendente",
      createdAt: sourceGoal.createdAt || now,
      updatedAt: now,
      restoredBy: VERSION
    };

    targetState.dailyGoals.push(restoredGoal);
    persistRestore(targetState, restoredGoal, located.source, located.syllabusItemId);
    return {
      changed: true,
      restored: restoredGoal.id,
      source: located.source,
      syllabusItemId: located.syllabusItemId || restoredGoal.syllabusItemId || "",
      total: targetDayGoals(targetState).length
    };
  }

  function publishReport(report) {
    globalThis[STATUS_KEY] = Object.freeze({ version: VERSION, ...report });
    return report;
  }

  function terminal(report = {}) {
    return report.changed === true || [
      "already-present",
      "day-already-has-seven",
      "unexpected-day-total",
      "syllabus-item-unbuildable"
    ].includes(report.skipped);
  }

  let finished = false;
  function attempt() {
    if (finished) return globalThis[STATUS_KEY];
    const report = publishReport(restore(appState()));
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
      EXPECTED_TOTAL,
      appState,
      isTarget,
      targetDayGoals,
      findSyllabusItem,
      buildGoalFromSyllabus,
      findCandidate,
      restore
    };
  }
})();