(() => {
  "use strict";

  const VERSION = "20260916-goal-time-history-hotfix-v425";
  const READY_RETRY_MS = 75;
  const READY_RETRY_LIMIT = 160;
  const HISTORY_LIMIT = 100;

  if (globalThis.__ALDUS_GOAL_TIME_HISTORY_HOTFIX_V425__?.version === VERSION) return;

  const positiveNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  };

  function studySeconds(study = {}) {
    for (const field of ["seconds", "elapsedSeconds", "actualDurationSeconds"]) {
      const value = positiveNumber(study[field]);
      if (value) return Math.round(value);
    }
    return Math.round(positiveNumber(study.minutes ?? study.actualDuration) * 60);
  }

  function isGoalTimerStudy(study = {}) {
    if (!study || study.updatesGoal === false || !study.goalId) return false;
    if (!studySeconds(study)) return false;
    if (study.origin === "timer") return true;
    return Boolean(study.timerSessionId || (study.sessionId && study.timerMode) || study.timerSource || study.timerOrigin);
  }

  function timerSessionKey(study = {}) {
    return String(study.timerSessionId || study.sessionId || study.id || "");
  }

  function goalTimerSeconds(goal, targetState, kind) {
    const seen = new Set();
    return (Array.isArray(targetState?.studies) ? targetState.studies : []).reduce((total, study) => {
      if (!isGoalTimerStudy(study) || String(study.goalId) !== String(goal.id)) return total;
      const sessionKey = timerSessionKey(study);
      if (!sessionKey || seen.has(sessionKey)) return total;
      const studyKind = study.timerKind === "questions" || study.kind === "questions" ? "questions" : "study";
      if (kind && studyKind !== kind) return total;
      seen.add(sessionKey);
      return total + studySeconds(study);
    }, 0);
  }

  function displayedGoalSeconds(goal, targetState, kind) {
    if (globalThis.__ALDUS_STUDY_TIME__?.goalSeconds) {
      return Math.max(0, Number(globalThis.__ALDUS_STUDY_TIME__.goalSeconds(goal, targetState, kind)) || 0);
    }
    return goalTimerSeconds(goal, targetState, kind);
  }

  function reconcileGoal(goal, targetState = state) {
    if (!goal) return { changed: false, before: 0, after: 0 };

    const beforeStudy = Math.max(0, Number(goal.studyActualMinutes) || 0);
    const beforeQuestions = Math.max(0, Number(goal.questionActualMinutes) || 0);
    const beforeTotal = Math.max(0, Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0);

    const ledgerStudy = displayedGoalSeconds(goal, targetState, "study") / 60;
    const ledgerQuestions = displayedGoalSeconds(goal, targetState, "questions") / 60;
    const timerStudy = goalTimerSeconds(goal, targetState, "study") / 60;
    const timerQuestions = goalTimerSeconds(goal, targetState, "questions") / 60;

    const nextStudy = Math.max(beforeStudy, ledgerStudy, timerStudy);
    const nextQuestions = Math.max(beforeQuestions, ledgerQuestions, timerQuestions);
    const nextTotal = Math.max(beforeTotal, nextStudy + nextQuestions);

    const changed = nextStudy !== beforeStudy || nextQuestions !== beforeQuestions || nextTotal !== beforeTotal;
    if (!changed) return { changed: false, before: beforeTotal, after: beforeTotal };

    goal.studyActualMinutes = nextStudy;
    goal.questionActualMinutes = nextQuestions;
    goal.actualMinutes = nextTotal;
    goal.tempo_real_minutos = nextTotal;
    goal.timerGoalIntegrityVersion = VERSION;
    goal.timerGoalIntegrityAt = new Date().toISOString();
    if (nextTotal > 0 && (goal.status || "Pendente") === "Pendente") goal.status = "Em andamento";
    if (nextTotal > 0 && (!goal.studyStatus || goal.studyStatus === "Pendente")) goal.studyStatus = "Iniciado";

    return { changed: true, before: beforeTotal, after: nextTotal };
  }

  function persistRepair(report, reason) {
    if (!report?.changed) return false;
    try {
      if (typeof saveData === "function") saveData({ markLocalChange: true });
      if (typeof render === "function") render();
      console.info(`[${VERSION}] Tempo da meta reconciliado`, { reason, ...report });
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] Falha ao persistir a reconciliação da meta.`, error);
      return false;
    }
  }

  function historyTimestamp(record = {}) {
    for (const field of ["endedAt", "endTime", "startedAt", "startTime"]) {
      const parsed = Date.parse(String(record[field] || ""));
      if (Number.isFinite(parsed)) return parsed;
    }
    const day = String(record.date || record.data || "").slice(0, 10);
    const parsed = Date.parse(day ? `${day}T00:00:00` : "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function installHistoryFix() {
    if (globalThis.__aldusGoalHistoryVisibilityV425 || typeof renderHistory !== "function") return false;
    globalThis.__aldusGoalHistoryVisibilityV425 = true;

    renderHistory = function renderHistoryWithGoalLedger() {
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
        const seconds = globalThis.__ALDUS_STUDY_TIME__?.recordSeconds
          ? globalThis.__ALDUS_STUDY_TIME__.recordSeconds(study)
          : studySeconds(study);
        row.innerHTML = `<td>${formatDateBR(study.date)}</td><td>${escapeHTML(study.discipline || subjectNameById(study.subjectId))}</td><td>${escapeHTML(study.topic || "")}</td><td>${formatHours(seconds / 60)}</td><td>${Number(study.questions) || 0}</td><td>${Number(study.correct) || 0}</td><td>${Number(study.wrong) || 0}</td><td>${Number(study.blank) || 0}</td>`;
        elements.historyBody.appendChild(row);
      });
    };
    return true;
  }

  function installCompletionFix() {
    if (globalThis.__aldusGoalCompletionReconcileV425 || typeof confirmGoalCompletion !== "function") return false;
    globalThis.__aldusGoalCompletionReconcileV425 = true;
    const originalConfirmGoalCompletion = confirmGoalCompletion;

    confirmGoalCompletion = function confirmGoalCompletionWithReconciledTime(goalId) {
      const resolvedGoalId = goalId || (typeof goalCompletionActiveGoalId !== "undefined" ? goalCompletionActiveGoalId : "");
      const goal = state.dailyGoals?.find((item) => String(item?.id || "") === String(resolvedGoalId));
      if (goal) persistRepair(reconcileGoal(goal, state), "before-goal-completion");

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
    return true;
  }

  function reconcileAllGoals() {
    let changed = false;
    let repairedGoals = 0;
    (Array.isArray(state?.dailyGoals) ? state.dailyGoals : []).forEach((goal) => {
      const report = reconcileGoal(goal, state);
      if (!report.changed) return;
      changed = true;
      repairedGoals += 1;
    });
    if (changed) persistRepair({ changed, repairedGoals }, "bootstrap-hotfix");
    return { changed, repairedGoals };
  }

  function appReady() {
    return typeof state !== "undefined"
      && Array.isArray(state?.dailyGoals)
      && Array.isArray(state?.studies)
      && typeof saveData === "function"
      && typeof render === "function"
      && typeof renderHistory === "function"
      && typeof confirmGoalCompletion === "function";
  }

  let attempts = 0;
  function installWhenReady() {
    attempts += 1;
    if (!appReady()) {
      if (attempts < READY_RETRY_LIMIT) setTimeout(installWhenReady, READY_RETRY_MS);
      return;
    }

    installHistoryFix();
    installCompletionFix();
    reconcileAllGoals();

    globalThis.__ALDUS_GOAL_TIME_HISTORY_HOTFIX_V425__ = Object.freeze({
      version: VERSION,
      reconcileGoal: (goal) => reconcileGoal(goal, state),
      reconcileAllGoals,
      installHistoryFix,
      installCompletionFix
    });
  }

  installWhenReady();
})();
