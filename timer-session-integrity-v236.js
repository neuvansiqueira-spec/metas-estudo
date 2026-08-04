(() => {
  "use strict";

  const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
  const HOTFIX = "timer-session-integrity-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_SESSION_INTEGRITY_V236__";
  const MIGRATION_KEY = "timerSessionIncidentRecoveryV236_20260804";
  const SAFETY_KEY = "metasEstudoTimerSessionSafety";
  const RECOVERY_SESSION_ID = "timer-recovery-v236-20260804-lei-antiterrorismo";
  const TARGET_DATE = "2026-08-04";
  const TARGET_DISCIPLINE = "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE";
  const TARGET_SUBJECT = "Lei Antiterrorismo (Lei n.º 13.260/2016).";
  const TARGET_TOTAL_MINUTES = 20;
  const SNAPSHOT_INTERVAL_MS = 10000;

  if (globalThis[GLOBAL_KEY]) return;

  let intervalId = null;
  let retryId = null;
  let attempts = 0;

  function canonical(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");
  }

  function currentState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    return globalThis.state && typeof globalThis.state === "object" ? globalThis.state : null;
  }

  function goalDate(goal = {}) {
    return String(goal.date || goal.data || "").slice(0, 10);
  }

  function goalTotal(goal = {}) {
    return Math.max(
      0,
      Number(goal.actualMinutes) || 0,
      Number(goal.tempo_real_minutos) || 0,
      (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0)
    );
  }

  function comparable(value) {
    return canonical(value).replace(/[^a-z0-9]+/g, " ").trim();
  }

  function targetGoal(targetState) {
    return (targetState.dailyGoals || []).find((goal) => {
      const discipline = comparable(goal.discipline || goal.disciplina);
      const subject = comparable(goal.baseSubject || goal.subject || goal.assunto);
      return goalDate(goal) === TARGET_DATE
        && discipline.includes("legislacao penal")
        && discipline.includes("processual penal extravagante")
        && subject.includes("lei antiterrorismo")
        && subject.includes("13 260 2016");
    }) || null;
  }

  function appendRecoveryHistory(goal, missingMinutes) {
    const text = `Recuperação automática de ${missingMinutes} minuto(s) da sessão do cronômetro interrompida durante a atualização da V236 em 04/08/2026. Total preservado: ${TARGET_TOTAL_MINUTES} minutos.`;
    try {
      if (typeof appendGoalHistory === "function") {
        appendGoalHistory(goal, text);
        return;
      }
    } catch {}
    goal.history ||= [];
    goal.history.push({ at: new Date().toISOString(), text });
    goal.notes = [goal.notes || "", text].filter(Boolean).join("\n");
  }

  function ensureRecoveryStudy(targetState, goal, missingMinutes) {
    targetState.studies ||= [];
    const existing = targetState.studies.find((study) =>
      String(study.timerSessionId || study.sessionId || study.id || "") === RECOVERY_SESSION_ID
    );
    if (existing || missingMinutes <= 0) return false;

    targetState.studies.push({
      id: RECOVERY_SESSION_ID,
      timerSessionId: RECOVERY_SESSION_ID,
      sessionId: RECOVERY_SESSION_ID,
      date: TARGET_DATE,
      discipline: goal.discipline || goal.disciplina || TARGET_DISCIPLINE,
      topic: goal.baseSubject || goal.subject || goal.assunto || TARGET_SUBJECT,
      subject: goal.baseSubject || goal.subject || goal.assunto || TARGET_SUBJECT,
      syllabusItemId: goal.syllabusItemId || "",
      goalId: goal.id || "",
      minutes: missingMinutes,
      seconds: missingMinutes * 60,
      elapsedSeconds: missingMinutes * 60,
      actualDuration: missingMinutes,
      actualDurationSeconds: missingMinutes * 60,
      origin: "timer",
      timerMode: "recovery",
      timerKind: "study",
      kind: "study",
      updatesGoal: true,
      notes: "Tempo restaurado automaticamente após interrupção técnica durante atualização da V236.",
      createdAt: new Date().toISOString()
    });
    return true;
  }

  function recoverIncident() {
    const targetState = currentState();
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return false;
    targetState.migrations ||= {};
    if (targetState.migrations[MIGRATION_KEY]) return true;

    const goal = targetGoal(targetState);
    if (!goal) return false;

    const before = goalTotal(goal);
    const missingMinutes = Math.max(0, TARGET_TOTAL_MINUTES - before);
    let changed = false;

    if (missingMinutes > 0) {
      const studyBefore = Math.max(0, Number(goal.studyActualMinutes) || 0);
      const questions = Math.max(0, Number(goal.questionActualMinutes) || 0);
      goal.studyActualMinutes = studyBefore + missingMinutes;
      goal.questionActualMinutes = questions;
      goal.actualMinutes = Math.max(TARGET_TOTAL_MINUTES, goal.studyActualMinutes + questions);
      goal.tempo_real_minutos = Math.max(Number(goal.tempo_real_minutos) || 0, goal.actualMinutes);
      if (!/conclu/i.test(String(goal.status || ""))) goal.status = "Em andamento";
      appendRecoveryHistory(goal, missingMinutes);
      changed = ensureRecoveryStudy(targetState, goal, missingMinutes) || changed;
      changed = true;
    }

    targetState.migrations[MIGRATION_KEY] = {
      version: VERSION,
      hotfix: HOTFIX,
      executedAt: new Date().toISOString(),
      goalId: goal.id || "",
      beforeMinutes: before,
      restoredMinutes: missingMinutes,
      afterMinutes: goalTotal(goal)
    };

    if (changed) {
      try {
        if (typeof saveData === "function") saveData({ markLocalChange: true });
      } catch (error) {
        console.warn("[Aldus V236] Não foi possível persistir imediatamente o tempo recuperado.", error);
      }
      try { if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("timer-session-recovery-v236"); } catch {}
      try { if (typeof render === "function") render(); } catch {}
    } else {
      try { if (typeof saveData === "function") saveData({ markLocalChange: true }); } catch {}
    }

    globalThis.__aldusTimerSessionRecoveryReportV236 = Object.freeze({
      beforeMinutes: before,
      restoredMinutes: missingMinutes,
      afterMinutes: goalTotal(goal),
      goalId: goal.id || "",
      executedAt: targetState.migrations[MIGRATION_KEY].executedAt
    });
    return true;
  }

  function flushTimerSnapshot() {
    try {
      if (typeof persistFloatingTimerSession === "function") {
        persistFloatingTimerSession({ storageOnly: true });
        return true;
      }
    } catch (error) {
      console.warn("[Aldus V236] Falha ao atualizar o snapshot periódico do cronômetro.", error);
    }

    try {
      if (typeof floatingTimer !== "object" || !floatingTimer?.goalId || typeof currentTimerSeconds !== "function") return false;
      const snapshotAt = Date.now();
      const snapshot = {
        ...floatingTimer,
        elapsedSeconds: Math.max(0, Number(currentTimerSeconds()) || 0),
        startedAt: floatingTimer.paused ? null : snapshotAt,
        intervalId: null,
        snapshotAt
      };
      localStorage.setItem(SAFETY_KEY, JSON.stringify(snapshot));
      return true;
    } catch (error) {
      console.warn("[Aldus V236] Não foi possível gravar o snapshot alternativo do cronômetro.", error);
      return false;
    }
  }

  function installSnapshotProtection() {
    if (intervalId) return;
    intervalId = window.setInterval(flushTimerSnapshot, SNAPSHOT_INTERVAL_MS);
    window.addEventListener("beforeunload", flushTimerSnapshot, { capture: true });
    window.addEventListener("pagehide", flushTimerSnapshot, { capture: true });
    window.addEventListener("freeze", flushTimerSnapshot, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushTimerSnapshot();
    }, { capture: true });
    navigator.serviceWorker?.addEventListener?.("controllerchange", flushTimerSnapshot);
  }

  function install() {
    attempts += 1;
    installSnapshotProtection();
    const recovered = recoverIncident();
    if (recovered || attempts >= 300) {
      if (retryId) window.clearInterval(retryId);
    }
  }

  retryId = window.setInterval(install, 100);
  install();

  globalThis[GLOBAL_KEY] = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    installedAt: new Date().toISOString(),
    migrationKey: MIGRATION_KEY,
    targetMinutes: TARGET_TOTAL_MINUTES,
    snapshotIntervalMs: SNAPSHOT_INTERVAL_MS,
    flushTimerSnapshot,
    recoverIncident
  });
})();
