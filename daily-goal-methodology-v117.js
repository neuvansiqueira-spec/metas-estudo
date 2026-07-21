(function activateDailyGoalMethodologyV117() {
  const VERSION = "20260721-metodologia-metas-v117";
  let completed = false;

  function reconcile(targetState, date) {
    targetState.dailyGoals ||= [];
    const target = Math.max(1, Number(planningConfig(targetState).disciplinesPerDay) || 1);
    let dayGoals = targetState.dailyGoals.filter((goal) => goalDateValue(goal) === date && isPlanningStudyGoal(goal));
    const protectedGoals = dayGoals.filter(isProtectedDailyGoal);
    const usedDisciplines = new Set(protectedGoals.map((goal) => canonical(goal.discipline || goal.disciplina)).filter(Boolean));
    const keptAutomatic = [];
    const removed = [];

    dayGoals.filter((goal) => !isProtectedDailyGoal(goal)).forEach((goal) => {
      const discipline = canonical(goal.discipline || goal.disciplina);
      if (!discipline || usedDisciplines.has(discipline) || protectedGoals.length + keptAutomatic.length >= target) removed.push(goal);
      else { keptAutomatic.push(goal); usedDisciplines.add(discipline); }
    });
    if (removed.length) {
      const removedSet = new Set(removed);
      targetState.dailyGoals = targetState.dailyGoals.filter((goal) => !removedSet.has(goal));
    }

    dayGoals = targetState.dailyGoals.filter((goal) => goalDateValue(goal) === date && isPlanningStudyGoal(goal));
    const scoreContext = buildPlanningScoreContext(targetState);
    const eligible = eligiblePlanningGoalsForDate(date, { targetState, scoreContext, existingGoals: dayGoals });
    const added = [];
    const now = new Date().toISOString();
    for (const goal of eligible) {
      if (dayGoals.length + added.length >= target) break;
      const discipline = canonical(goal.discipline || goal.disciplina);
      if (!discipline || usedDisciplines.has(discipline)) continue;
      goal.origin = goal.origem = "planejamento";
      goal.createdAt ||= now;
      goal.updatedAt = now;
      targetState.dailyGoals.push(goal);
      added.push(goal);
      usedDisciplines.add(discipline);
    }
    targetState.migrations ||= {};
    targetState.migrations.dailyGoalMethodologyV117 = { executedAt: now, date, target, preserved: protectedGoals.length, removed: removed.length, added: added.length };
    return { date, target, preserved: protectedGoals.map((goal) => goal.id), removed: removed.map((goal) => goal.id), added: added.map((goal) => goal.id), final: targetState.dailyGoals.filter((goal) => goalDateValue(goal) === date && isPlanningStudyGoal(goal)).length, disciplines: usedDisciplines.size };
  }

  function activateVersion() {
    document.querySelectorAll(".app-version").forEach((element) => { element.textContent = `Versão: ${VERSION}`; });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`service-worker-v117.js?v=${encodeURIComponent(VERSION)}`, { updateViaCache: "none" }).catch(() => {});
  }

  function run() {
    if (completed || typeof state === "undefined" || typeof indexedDBStatus === "undefined" || !["concluída", "erro recuperado"].includes(indexedDBStatus.bootstrap)) return false;
    const report = reconcile(state, todayISO());
    window.__dailyGoalMethodologyV117 = report;
    completed = true;
    if (report.added.length || report.removed.length) {
      saveData({ markLocalChange: true });
      render();
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("daily-goal-methodology-v117");
    }
    activateVersion();
    return true;
  }

  const timer = window.setInterval(() => { if (run()) window.clearInterval(timer); }, 100);
  window.setTimeout(() => { window.clearInterval(timer); run(); activateVersion(); }, 10000);
})();
