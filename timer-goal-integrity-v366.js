(() => {
  "use strict";

  const VERSION = "20260916-goal-time-history-reconcile-v425";
  const READY_RETRY_MS = 75;
  const READY_RETRY_LIMIT = 160;
  const HISTORY_LIMIT = 100;

  if (globalThis.__aldusTimerGoalIntegrityV366) return;

  const toMinutes = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  };

  const timerSessionKey = (study = {}) => String(study.timerSessionId || study.sessionId || study.id || "");

  function timerStudyMinutes(study = {}) {
    for (const field of ["seconds", "elapsedSeconds", "actualDurationSeconds"]) {
      const value = Number(study?.[field]);
      if (Number.isFinite(value) && value > 0) return value / 60;
    }
    return toMinutes(study.minutes ?? study.actualDuration);
  }

  function isGoalUpdatingTimerStudy(study = {}) {
    if (!study || study.updatesGoal === false) return false;
    if (!timerStudyMinutes(study)) return false;
    if (study.origin === "timer") return true;
    return Boolean(study.timerSessionId || (study.sessionId && study.timerMode) || study.timerSource || study.timerOrigin);
  }

  function applyGoalMinimums(goal, studyMinutes, questionMinutes) {
    if (!goal) return false;
    const currentStudy = Math.max(0, Number(goal.studyActualMinutes) || 0);
    const currentQuestions = Math.max(0, Number(goal.questionActualMinutes) || 0);
    const nextStudy = Math.max(currentStudy, toMinutes(studyMinutes));
    const nextQuestions = Math.max(currentQuestions, toMinutes(questionMinutes));
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

      const minutes = timerStudyMinutes(study);
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

  function reconcileGoalFromLedger(goal, targetState = state) {
    if (!goal || !globalThis.__ALDUS_STUDY_TIME__?.goalSeconds) return { changed: false, repairedGoals: 0, repairedMinutes: 0 };
    const before = Math.max(0, Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0);
    const studyMinutes = globalThis.__ALDUS_STUDY_TIME__.goalSeconds(goal, targetState, "study") / 60;
    const questionMinutes = globalThis.__ALDUS_STUDY_TIME__.goalSeconds(goal, targetState, "questions") / 60;
    const changed = applyGoalMinimums(goal, studyMinutes, questionMinutes);
    return {
      changed,
      repairedGoals: changed ? 1 : 0,
      repairedMinutes: changed ? Math.max(0, (Number(goal.actualMinutes) || 0) - before) : 0
    };
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
          const minutes = timerStudyMinutes(study);
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

  function historyTimestamp(record = {}) {
    for (const field of ["endedAt", "endTime", "startedAt", "startTime"]) {
      const parsed = Date.parse(String(record?.[field] || ""));
      if (Number.isFinite(parsed)) return parsed;
    }
    const day = String(record.date || record.data || "").slice(0, 10);
    const parsed = Date.parse(day ? `${day}T00:00:00` : "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function installHistoryVisibilityFix() {
    if (globalThis.__aldusGoalHistoryVisibilityV425 || typeof renderHistory !== "function") return;
    globalThis.__aldusGoalHistoryVisibilityV425 = true;

    renderHistory = function renderHistoryWithReconciledGoalTime() {
      const baseStudies = Array.isArray(state?.studies) ? state.studies : [];
      const residualGoalLogs = globalThis.__ALDUS_STUDY_TIME__?.logs
        ? globalThis.__ALDUS_STUDY_TIME__.logs(state).filter((entry) => String(entry?.id || "").startsWith("goal-"))
        : [];
      const studies = [...baseStudies, ...residualGoalLogs]
        .sort((left, right) => historyTimestamp(right) - historyTimestamp(left))
        .slice(0, HISTORY_LIMIT);

      elements.historyBody.innerHTML = "";
      if (!studies.length) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="8" class="empty-message">Nenhum registro geral de estudo encontrado.</td>`;
        elements.historyBody.appendChild(row);
        return;
      }

      studies.forEach((study) => {
        const row = document.createElement("tr");
        const minutes = globalThis.__ALDUS_STUDY_TIME__?.recordSeconds
          ? globalThis.__ALDUS_STUDY_TIME__.recordSeconds(study) / 60
          : Number(study.minutes) || 0;
        row.innerHTML = `<td>${formatDateBR(study.date)}</td><td>${escapeHTML(study.discipline || subjectNameById(study.subjectId))}</td><td>${escapeHTML(study.topic || "")}</td><td>${formatHours(minutes)}</td><td>${Number(study.questions) || 0}</td><td>${Number(study.correct) || 0}</td><td>${Number(study.wrong) || 0}</td><td>${Number(study.blank) || 0}</td>`;
        elements.historyBody.appendChild(row);
      });
    };
  }

  function installGoalCompletionReconciliation() {
    if (globalThis.__aldusGoalCompletionReconcileV425 || typeof confirmGoalCompletion !== "function") return;
    globalThis.__aldusGoalCompletionReconcileV425 = true;
    const originalConfirmGoalCompletion = confirmGoalCompletion;

    confirmGoalCompletion = function confirmGoalCompletionWithReconciledTime(goalId) {
      const resolvedGoalId = goalId || (typeof goalCompletionActiveGoalId !== "undefined" ? goalCompletionActiveGoalId : "");
      const goal = state.dailyGoals?.find((item) => String(item?.id || "") === String(resolvedGoalId));
      if (goal) {
        const directReport = reconcileDirectTimerTotals(state);
        const ledgerReport = reconcileGoalFromLedger(goal, state);
        if (directReport.changed || ledgerReport.changed) {
          persistRepair({
            changed: true,
            repairedGoals: Math.max(directReport.repairedGoals || 0, ledgerReport.repairedGoals || 0),
            repairedMinutes: Math.max(directReport.repairedMinutes || 0, ledgerReport.repairedMinutes || 0)
          }, "before-goal-completion");
        }
      }

      try {
        return originalConfirmGoalCompletion.call(this, resolvedGoalId);
      } finally {
        try {
          if (typeof goalCompletionInProgress !== "undefined") goalCompletionInProgress.delete(resolvedGoalId);
          const confirmButton = document.getElementById("goalCompletionConfirm");
          if (confirmButton && !confirmButton.closest("[hidden]")) confirmButton.disabled = false;
        } catch {}
      }
    };
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
    installHistoryVisibilityFix();
    installGoalCompletionReconciliation();
    installStateReplacementGuard();
    scheduleIdleReconciliation("bootstrap");

    globalThis.__aldusTimerGoalIntegrityV366 = Object.freeze({
      version: VERSION,
      reconcile: () => reconcileDirectTimerTotals(state),
      reconcileGoal: (goal) => reconcileGoalFromLedger(goal, state)
    });
  }

  installWhenReady();
})();
