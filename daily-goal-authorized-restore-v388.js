(() => {
  "use strict";

  const VERSION = "20260824-restaura-meta-planejamento-gestao-publica-v388";
  const TARGET_DATE = "2026-08-24";
  const EXPECTED_TOTAL = 7;
  const TARGET_DISCIPLINE = "direito administrativo e gestao publica";
  const TARGET_SUBJECT = "planejamento e gestao publica";
  const MIGRATION_KEY = "authorizedPlanningPublicManagementRestoreV388";

  if (globalThis.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__) return;

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const dateOf = (goal = {}) => String(goal.date || goal.data || "").slice(0, 10);
  const disciplineOf = (goal = {}) => canonical(goal.discipline || goal.disciplina);
  const subjectOf = (goal = {}) => canonical(goal.baseSubject || goal.subject || goal.assunto || goal.tema || goal.topic || goal.topico || goal.title || goal.titulo);

  function isTarget(goal = {}) {
    return disciplineOf(goal) === TARGET_DISCIPLINE && subjectOf(goal) === TARGET_SUBJECT;
  }

  function targetDayGoals(targetState) {
    return Array.isArray(targetState?.dailyGoals)
      ? targetState.dailyGoals.filter((goal) => dateOf(goal) === TARGET_DATE)
      : [];
  }

  function planningGoalsForTargetDay(targetState) {
    return targetDayGoals(targetState).filter((goal) => {
      try { return typeof globalThis.isPlanningStudyGoal === "function" ? globalThis.isPlanningStudyGoal(goal) : true; }
      catch { return true; }
    });
  }

  function findCandidate(targetState) {
    const existingGoals = planningGoalsForTargetDay(targetState);
    try {
      if (typeof globalThis.eligiblePlanningGoalsForDate === "function") {
        const scoreContext = typeof globalThis.buildPlanningScoreContext === "function"
          ? globalThis.buildPlanningScoreContext(targetState)
          : undefined;
        const eligible = globalThis.eligiblePlanningGoalsForDate(TARGET_DATE, {
          targetState,
          scoreContext,
          existingGoals
        });
        const candidate = Array.isArray(eligible) ? eligible.find(isTarget) : null;
        if (candidate) return { candidate, source: "eligible-planning" };
      }
    } catch (error) {
      console.warn("[Aldus V388] Não foi possível consultar os candidatos elegíveis do planejamento.", error);
    }

    const historical = Array.isArray(targetState?.dailyGoals)
      ? targetState.dailyGoals.find((goal) => dateOf(goal) !== TARGET_DATE && isTarget(goal))
      : null;
    return historical ? { candidate: historical, source: "historical-goal" } : null;
  }

  function persistRestore(targetState, restoredGoal, source) {
    const now = new Date().toISOString();
    targetState.migrations ||= {};
    targetState.migrations[MIGRATION_KEY] = {
      version: VERSION,
      date: TARGET_DATE,
      discipline: restoredGoal.discipline || restoredGoal.disciplina || "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
      subject: restoredGoal.baseSubject || restoredGoal.subject || restoredGoal.assunto || restoredGoal.tema || "Planejamento e Gestão Pública",
      source,
      executedAt: now
    };
    try {
      if (typeof globalThis.saveData === "function") {
        const saved = globalThis.saveData({ markLocalChange: true, reason: VERSION });
        if (saved !== false && typeof globalThis.autoSyncAfterSave === "function") globalThis.autoSyncAfterSave(VERSION);
      }
    } catch (error) {
      console.warn("[Aldus V388] A meta foi restaurada em memória, mas o salvamento apresentou erro.", error);
    }
    try { if (typeof globalThis.render === "function") globalThis.render(); } catch {}
    return targetState.migrations[MIGRATION_KEY];
  }

  function restore(targetState = globalThis.state) {
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return { changed: false, skipped: "state-unavailable" };

    const dayGoals = targetDayGoals(targetState);
    if (dayGoals.some(isTarget)) {
      return { changed: false, skipped: "already-present", total: dayGoals.length };
    }
    if (dayGoals.length >= EXPECTED_TOTAL) {
      return { changed: false, skipped: "day-already-has-seven", total: dayGoals.length };
    }

    const located = findCandidate(targetState);
    if (!located?.candidate) return { changed: false, skipped: "candidate-not-found", total: dayGoals.length };

    const now = new Date().toISOString();
    const sourceGoal = located.candidate;
    const idAlreadyUsed = sourceGoal.id && targetState.dailyGoals.some((goal) => goal !== sourceGoal && goal.id === sourceGoal.id);
    const restoredGoal = {
      ...sourceGoal,
      id: idAlreadyUsed ? "authorized-v388-20260824-planejamento-gestao-publica" : (sourceGoal.id || "authorized-v388-20260824-planejamento-gestao-publica"),
      date: TARGET_DATE,
      data: TARGET_DATE,
      origin: "planejamento",
      origem: "planejamento",
      createdAt: sourceGoal.createdAt || now,
      updatedAt: now,
      restoredBy: VERSION
    };

    targetState.dailyGoals.push(restoredGoal);
    persistRestore(targetState, restoredGoal, located.source);
    return { changed: true, restored: restoredGoal.id, source: located.source, total: targetDayGoals(targetState).length };
  }

  function attempt() {
    const report = restore(globalThis.state);
    globalThis.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__ = Object.freeze({ version: VERSION, ...report });
    return report.skipped !== "state-unavailable" && report.skipped !== "candidate-not-found";
  }

  if (!attempt() && typeof window !== "undefined") {
    const retry = () => {
      if (globalThis.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__?.changed || globalThis.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__?.skipped === "already-present") return;
      attempt();
    };
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", retry, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", retry, { once: true });
    window.addEventListener("aldus:bootstrap-ready", retry, { once: true });
    window.addEventListener("load", retry, { once: true });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VERSION, TARGET_DATE, EXPECTED_TOTAL, isTarget, targetDayGoals, findCandidate, restore };
  }
})();
