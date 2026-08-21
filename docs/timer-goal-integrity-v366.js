(() => {
  "use strict";

  const VERSION = "20260821-timer-goal-integrity-v366";
  const READY_RETRY_MS = 75;
  const READY_RETRY_LIMIT = 160;

  if (globalThis.__aldusTimerGoalIntegrityV366) return;

  const toMinutes = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
  };

  const timerSessionKey = (study = {}) => String(study.timerSessionId || study.sessionId || study.id || "");

  function isGoalUpdatingTimerStudy(study = {}) {
    if (!study || study.updatesGoal === false) return false;
    if (!toMinutes(study.minutes ?? study.actualDuration)) return false;
    if (study.origin === "timer") return true;
    return Boolean(study.timerSessionId || (study.sessionId && study.timerMode) || study.timerSource || study.timerOrigin);
  }

  function applyGoalMinimums(goal, studyMinutes, questionMinutes) {
    if (!goal) return false;
    const currentStudy = Math.max(0, Number(goal.studyActualMinutes) || 0);
    const currentQuestions = Math.max(0, Number(goal.questionActualMinutes) || 0);
    const nextStudy = Math.max(currentStudy, studyMinutes || 0);
    const nextQuestions = Math.max(currentQuestions, questionMinutes || 0);
    const currentTotal = Math.max(0, Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0);
    const nextTotal = Math.max(currentTotal, nextStudy + nextQuestions);

    if (nextStudy === currentStudy && nextQuestions === currentQuestions && nextTotal === currentTotal) return false;

    goal.studyActualMinutes = nextStudy;
    goal.questionActualMinutes = nextQuestions;
    goal.actualMinutes = nextTotal;
    goal.tempo_real_minutos = nextTotal;
    goal.studyStatus = nextTotal > 0 ? "Iniciado" : (goal.studyStatus || "Pendente");
    if ((goal.status || "Pendente") === "Pendente" && nextTotal > 0) goal.status = "Em andamento";
    goal.timerGoalIntegrityVersion = VERSION;
    goal.timerGoalIntegrityAt = new Date().toISOString();
    return true;
  }

  function reconcileDirectTimerTotals(targetState) {
    const goals = Array.isArray(targetState?.dailyGoals) ? targetState.dailyGoals : [];
    const studies = Array.isArray(targetState?.studies) ? targetState.studies : [];
    if (!goals.length || !studies.length) return { changed: false, repairedGoals: 0, repairedMinutes: 0 };

    const goalById = new Map(goals.filter((goal) => goal?.id).map((goal) => [String(goal.id), goal]));
    const studyTotals = new Map();
    const questionTotals = new Map();
    const seenSessions = new Set();

    for (const study of studies) {
      if (!isGoalUpdatingTimerStudy(study) || !study.goalId) continue;
      const goalId = String(study.goalId);
      if (!goalById.has(goalId)) continue;
      const sessionKey = timerSessionKey(study);
      if (!sessionKey || seenSessions.has(sessionKey)) continue;
      seenSessions.add(sessionKey);

      const minutes = toMinutes(study.minutes ?? study.actualDuration);
      if (!minutes) continue;
      const target = study.timerKind === "questions" || study.kind === "questions" ? questionTotals : studyTotals;
      target.set(goalId, (target.get(goalId) || 0) + minutes);
    }

    let repairedGoals = 0;
    let repairedMinutes = 0;
    const affectedGoalIds = new Set([...studyTotals.keys(), ...questionTotals.keys()]);
    for (const goalId of affectedGoalIds) {
      const goal = goalById.get(goalId);
      if (!goal) continue;
      const before = Math.max(0, Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0);
      if (applyGoalMinimums(goal, studyTotals.get(goalId) || 0, questionTotals.get(goalId) || 0)) {
        repairedGoals += 1;
        repairedMinutes += Math.max(0, (Number(goal.actualMinutes) || 0) - before);
      }
    }

    return { changed: repairedGoals > 0, repairedGoals, repairedMinutes };
  }

  function persistRepair(report, reason) {
    if (!report?.changed) return false;
    try {
      if (typeof saveData === "function") saveData({ markLocalChange: true });
      if (typeof render === "function") render();
      console.info(`[${VERSION}] Integridade do tempo restaurada`, { reason, ...report });
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] Falha ao persistir a reconciliação do cronômetro.`, error);
      return false;
    }
  }

  function scheduleIdleReconciliation(reason) {
    const run = () => {
      try {
        const report = reconcileDirectTimerTotals(state);
        persistRepair(report, reason);
      } catch (error) {
        console.warn(`[${VERSION}] Falha na reconciliação ociosa do cronômetro.`, error);
      }
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 1200 });
    else setTimeout(run, 250);
  }

  function installTimerSubmitVerification() {
    const form = document.getElementById("timerStudyForm");
    if (!form || form.dataset.aldusTimerGoalIntegrityV366 === "1") return;
    form.dataset.aldusTimerGoalIntegrityV366 = "1";
    form.addEventListener("submit", () => {
      const beforeCount = Array.isArray(state?.studies) ? state.studies.length : 0;
      setTimeout(() => {
        try {
          if (!Array.isArray(state?.studies) || state.studies.length <= beforeCount) return;
          const study = state.studies[state.studies.length - 1];
          if (!isGoalUpdatingTimerStudy(study) || !study.goalId) return;
          const goal = state.dailyGoals?.find((item) => String(item?.id || "") === String(study.goalId));
          if (!goal) return;
          const minutes = toMinutes(study.minutes ?? study.actualDuration);
          const isQuestions = study.timerKind === "questions" || study.kind === "questions";
          const report = { changed: false, repairedGoals: 0, repairedMinutes: 0 };
          const before = Math.max(0, Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0);
          if (applyGoalMinimums(goal, isQuestions ? 0 : minutes, isQuestions ? minutes : 0)) {
            report.changed = true;
            report.repairedGoals = 1;
            report.repairedMinutes = Math.max(0, (Number(goal.actualMinutes) || 0) - before);
          }
          persistRepair(report, "timer-submit-verification");
        } catch (error) {
          console.warn(`[${VERSION}] Falha na verificação pós-salvamento do cronômetro.`, error);
        }
      }, 0);
    }, true);
  }

  function installStateReplacementGuard() {
    if (globalThis.__aldusTimerGoalReplaceStateV366 || typeof replaceState !== "function") return;
    globalThis.__aldusTimerGoalReplaceStateV366 = true;
    const originalReplaceState = replaceState;
    replaceState = function replaceStateWithTimerGoalIntegrity(...args) {
      const result = originalReplaceState.apply(this, args);
      scheduleIdleReconciliation("state-replacement");
      return result;
    };
  }

  function appReady() {
    return typeof state !== "undefined"
      && Array.isArray(state?.dailyGoals)
      && Array.isArray(state?.studies)
      && typeof saveData === "function"
      && typeof render === "function"
      && globalThis.__aldusBootstrapReady === true;
  }

  let attempts = 0;
  function installWhenReady() {
    attempts += 1;
    if (!appReady()) {
      if (attempts < READY_RETRY_LIMIT) setTimeout(installWhenReady, READY_RETRY_MS);
      return;
    }

    installTimerSubmitVerification();
    installStateReplacementGuard();
    scheduleIdleReconciliation("bootstrap");

    globalThis.__aldusTimerGoalIntegrityV366 = Object.freeze({
      version: VERSION,
      reconcile: () => reconcileDirectTimerTotals(state)
    });
  }

  installWhenReady();
})();
