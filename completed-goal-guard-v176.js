(() => {
  "use strict";

  if (globalThis.__aldusCompletedGoalGuardV176) return;

  const VERSION = "20260730-concluidos-fora-do-plano-v176";
  const MIGRATION_KEY = "completedSubjectsOutsideAutomaticPlanV176";

  function canonicalValue(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isReinforcementGoal(goal = {}) {
    return canonicalValue(goal.type || goal.tipo) === "reforco";
  }

  function isManualGoal(goal = {}) {
    try {
      if (typeof isManualDailyGoal === "function") return isManualDailyGoal(goal);
    } catch {}
    const origin = canonicalValue(goal.origin || goal.origem);
    return origin.includes("manual") || goal.manual === true || goal.isManual === true;
  }

  function hasExecution(goal = {}) {
    return [
      goal.studyActualMinutes,
      goal.questionActualMinutes,
      goal.actualMinutes,
      goal.tempo_real_minutos,
      goal.minutesDone,
      goal.performedMinutes
    ].some((value) => Number(value) > 0);
  }

  function isCompletedGoal(goal = {}) {
    try {
      if (typeof isGoalDone === "function") return isGoalDone(goal);
    } catch {}
    return ["concluida", "concluido", "estudado", "dominado"]
      .includes(canonicalValue(goal.status || goal.studyStatus));
  }

  function isUntouchedAutomaticPendingGoal(goal = {}) {
    if (isManualGoal(goal) || isCompletedGoal(goal) || hasExecution(goal)) return false;
    const status = canonicalValue(goal.status || "Pendente");
    if (!["", "pendente"].includes(status)) return false;
    if (goal.completed || goal.completedAt || goal.startedAt || goal.iniciadoEm) return false;
    return true;
  }

  function normalTypeForItem(item = {}, targetState = null) {
    try {
      if (typeof normalGoalTypeForItemV157 === "function") {
        return normalGoalTypeForItemV157(item, targetState || state);
      }
    } catch {}
    const mode = item?.importMeta?.tipo_agendamento
      || item?.tipo_agendamento
      || targetState?.schedulableSettings?.[item?.id]?.mode
      || "Estudo teórico";
    if (mode === "Revisão apenas" || item?.status === "Revisar") return "Revisão";
    if (mode === "Questões apenas") return "Questões";
    return "Estudo novo";
  }

  function completedRecords(targetState = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    if (!currentState) return [];
    try {
      if (typeof completedPlanningSubjectRecords === "function") {
        return completedPlanningSubjectRecords(currentState);
      }
    } catch {}
    return (currentState.syllabusItems || []).filter((item) =>
      ["concluido", "estudado", "dominado"].includes(canonicalValue(item.status))
    );
  }

  function matchesCompletedSubject(record = {}, targetState = null, records = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    const completed = records || completedRecords(currentState);
    try {
      if (typeof planningRecordMatchesCompletedSubject === "function") {
        return planningRecordMatchesCompletedSubject(record, completed);
      }
    } catch {}

    const itemId = String(record.syllabusItemId || record.id || "");
    if (itemId && completed.some((item) => String(item.syllabusItemId || item.id || "") === itemId)) return true;

    const discipline = canonicalValue(record.discipline || record.disciplina);
    const subject = canonicalValue(record.baseSubject || record.subject || record.assunto);
    return Boolean(discipline && subject && completed.some((item) =>
      canonicalValue(item.discipline || item.disciplina) === discipline
      && canonicalValue(item.baseSubject || item.subject || item.assunto) === subject
    ));
  }

  function installCandidateGuard() {
    try {
      if (typeof buildPlanningScoreContext !== "function") return false;
      const original = buildPlanningScoreContext;
      if (original.__aldusCompletedGuardV176) return true;

      const guarded = function completedSubjectsOutsideCandidatesV176(targetState = state) {
        const context = original.apply(this, arguments);
        if (!context || !Array.isArray(context.candidates)) return context;
        const completed = completedRecords(targetState);
        context.candidates = context.candidates.filter((item) =>
          !matchesCompletedSubject(item, targetState, completed)
        );
        return context;
      };
      Object.defineProperty(guarded, "__aldusCompletedGuardV176", { value: true });
      buildPlanningScoreContext = guarded;
      return true;
    } catch (error) {
      console.warn("[Aldus v176] Não foi possível bloquear assuntos concluídos no planejamento.", error);
      return false;
    }
  }

  function repairExistingAutomaticGoals() {
    try {
      if (typeof state === "undefined" || !Array.isArray(state?.dailyGoals)) {
        return { changed: false, removed: [], converted: [] };
      }

      const completed = completedRecords(state);
      const syllabusById = new Map(
        (state.syllabusItems || []).map((item) => [String(item?.id || ""), item])
      );
      const removed = [];
      const converted = [];
      const kept = [];

      state.dailyGoals.forEach((goal) => {
        if (!isUntouchedAutomaticPendingGoal(goal)) {
          kept.push(goal);
          return;
        }

        if (matchesCompletedSubject(goal, state, completed)) {
          removed.push({
            id: goal.id,
            date: goal.date || goal.data || "",
            syllabusItemId: goal.syllabusItemId || "",
            type: goal.type || goal.tipo || "",
            reason: "assunto concluído"
          });
          return;
        }

        if (isReinforcementGoal(goal)) {
          const item = syllabusById.get(String(goal.syllabusItemId || "")) || {};
          const previousType = goal.type || goal.tipo || "Reforço";
          const nextType = normalTypeForItem(item, state);
          goal.type = nextType;
          goal.tipo = String(nextType).toLowerCase();
          goal.updatedAt = new Date().toISOString();
          converted.push({
            id: goal.id,
            date: goal.date || goal.data || "",
            syllabusItemId: goal.syllabusItemId || "",
            previousType,
            nextType
          });
        }

        kept.push(goal);
      });

      state.dailyGoals = kept;
      state.migrations ||= {};
      state.migrations[MIGRATION_KEY] = {
        completedAt: new Date().toISOString(),
        removedCompletedAutomaticGoals: removed.length,
        convertedAutomaticReinforcementGoals: converted.length,
        policy: "automatic-pending-unexecuted-only",
        preserved: "manual, completed, started and executed goals"
      };

      const changed = Boolean(removed.length || converted.length);
      if (typeof saveData === "function") saveData({ markLocalChange: true });
      if (changed && typeof render === "function") render();
      if (changed && typeof autoSyncAfterSave === "function") {
        autoSyncAfterSave("completed-subject-guard-v176");
      }

      return { changed, removed, converted };
    } catch (error) {
      console.warn("[Aldus v176] Não foi possível limpar metas automáticas inválidas.", error);
      return { changed: false, removed: [], converted: [], error };
    }
  }

  const candidateGuardInstalled = installCandidateGuard();
  const repair = repairExistingAutomaticGoals();

  globalThis.__aldusCompletedGoalGuardV176 = Object.freeze({
    version: VERSION,
    candidateGuardInstalled,
    repair
  });
})();
