(function activateDailyGoalReplenishmentV116() {
  const VERSION = "20260721-recomposicao-metas-dia-v116";
  let completed = false;

  function replenish(targetState, date) {
    targetState.dailyGoals ||= [];
    const targets = planningTargetsForDate(date, targetState);
    const topicTarget = Math.max(0, Number(targets.topics) || 0);
    const studyGoals = targetState.dailyGoals.filter((goal) => goalDateValue(goal) === date && isPlanningStudyGoal(goal));
    const report = { date, topicTarget, before: studyGoals.length, after: studyGoals.length, added: [], preserved: studyGoals.map((goal) => goal.id).filter(Boolean), warnings: [], changed: false, skipped: "" };
    if (topicTarget <= 0) { report.skipped = "zero-target-safety"; return report; }
    if (studyGoals.length >= topicTarget) { report.skipped = "target-already-met"; return report; }
    const reservedSyllabusIds = new Set();
    studyGoals.forEach((goal) => { const key = goalSyllabusReservationKey(goal); if (key) reservedSyllabusIds.add(key); });
    const scoreContext = buildPlanningScoreContext(targetState);
    const eligibleGoals = eligiblePlanningGoalsForDate(date, { targetState, scoreContext, existingGoals: studyGoals, reservedSyllabusIds });
    const selection = selectPlanningGoalsForTargets({ date, topicTarget, disciplineTarget: Math.max(1, Number(targets.disciplines) || 1), eligibleGoals, existingGoals: studyGoals });
    const now = new Date().toISOString();
    selection.selected.forEach((goal) => {
      goal.origin = goal.origem = "planejamento";
      goal.createdAt ||= now;
      goal.updatedAt = now;
      targetState.dailyGoals.push(goal);
      report.added.push(goal.id);
    });
    report.after = targetState.dailyGoals.filter((goal) => goalDateValue(goal) === date && isPlanningStudyGoal(goal)).length;
    report.changed = report.added.length > 0;
    if (report.after < topicTarget) report.warnings.push(`Planejamento prevê ${topicTarget} assunto(s), mas existem apenas ${report.after} assunto(s) elegível(is) sem repetição.`);
    if (report.changed) {
      targetState.migrations ||= {};
      targetState.migrations.dailyPlanningReplenishmentV116 = { executedAt: now, date, before: report.before, after: report.after, added: report.added.length };
    }
    return report;
  }

  function finishVersionActivation() {
    document.querySelectorAll(".app-version").forEach((element) => { element.textContent = `Versão: ${VERSION}`; });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`service-worker-v116.js?v=${encodeURIComponent(VERSION)}`, { updateViaCache: "none" }).catch(() => {});
    }
  }

  function run() {
    if (completed || !window.__dailyPlanningInflationRepairV108) return false;
    if (typeof state === "undefined") return false;
    const report = replenish(state, todayISO());
    window.__dailyPlanningReplenishmentV116 = report;
    completed = true;
    if (report.changed) {
      saveData({ markLocalChange: true });
      render();
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("daily-goal-replenishment-v116");
    }
    finishVersionActivation();
    return true;
  }

  const timer = window.setInterval(() => { if (run()) window.clearInterval(timer); }, 100);
  window.setTimeout(() => { window.clearInterval(timer); run(); finishVersionActivation(); }, 10000);
})();
