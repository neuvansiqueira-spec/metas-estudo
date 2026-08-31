(() => {
  "use strict";

  if (globalThis.__aldusCompletedGoalGuardV177) return;

  const VERSION = "20260730-metas-concluidas-fora-do-plano-v177";
  const POLICY_VERSION = "20260831-daily-goals-explicit-mutation-v419";
  const MIGRATION_KEY = "completedSubjectsOutsideAutomaticPlanV177";

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
    try {
      if (typeof goalTotalActualMinutes === "function" && Number(goalTotalActualMinutes(goal)) > 0) return true;
    } catch {}
    return [
      goal.studyActualMinutes,
      goal.questionActualMinutes,
      goal.actualMinutes,
      goal.tempo_real_minutos,
      goal.minutesDone,
      goal.performedMinutes
    ].some((value) => Number(value) > 0);
  }

  function hasHistory(goal = {}) {
    const history = goal.history || goal.historico || goal.auditTrail;
    return Array.isArray(history) ? history.length > 0 : Boolean(String(history || "").trim());
  }

  function isCompletedGoal(goal = {}) {
    try {
      if (typeof isGoalDone === "function") return isGoalDone(goal);
    } catch {}
    return ["concluida", "concluido", "estudado", "dominado"]
      .includes(canonicalValue(goal.status || goal.studyStatus));
  }

  function isUntouchedAutomaticPendingGoal(goal = {}) {
    if (isManualGoal(goal) || isCompletedGoal(goal) || hasExecution(goal) || hasHistory(goal)) return false;
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

    const records = [];
    (currentState.syllabusItems || []).forEach((item) => {
      if (["concluido", "estudado", "dominado"].includes(canonicalValue(item.status))) records.push(item);
    });
    (currentState.dailyGoals || []).forEach((goal) => {
      if (isCompletedGoal(goal)) records.push(goal);
    });
    return records;
  }

  function recordSyllabusId(record = {}) {
    return String(record.syllabusItemId || record.syllabus_item_id || record.id || "");
  }

  function matchesCompletedSubject(record = {}, targetState = null, records = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    const completed = records || completedRecords(currentState);
    const syllabusItemId = recordSyllabusId(record);

    if (syllabusItemId && completed.some((item) => recordSyllabusId(item) === syllabusItemId)) return true;

    try {
      if (typeof planningRecordMatchesCompletedSubject === "function") {
        return planningRecordMatchesCompletedSubject(record, completed);
      }
    } catch {}

    const discipline = canonicalValue(record.discipline || record.disciplina);
    const subject = canonicalValue(record.baseSubject || record.subject || record.assunto || record.topic || record.topico);
    return Boolean(discipline && subject && completed.some((item) =>
      canonicalValue(item.discipline || item.disciplina) === discipline
      && canonicalValue(item.baseSubject || item.subject || item.assunto || item.topic || item.topico) === subject
    ));
  }

  function installAutomaticGoalTypeGuard() {
    try {
      if (typeof planningGoalTypeForItemV157 !== "function") return false;
      const guarded = function noAutomaticReinforcementV177(item = {}, date = "", metrics = null, targetState = state) {
        return normalTypeForItem(item, targetState);
      };
      Object.defineProperty(guarded, "__aldusNoAutomaticReinforcementV177", { value: true });
      planningGoalTypeForItemV157 = guarded;
      return true;
    } catch (error) {
      console.warn("[Aldus v177] Não foi possível fixar o tipo normal das metas automáticas.", error);
      return false;
    }
  }

  function installCandidateGuard() {
    try {
      if (typeof buildPlanningScoreContext !== "function") return false;
      const original = buildPlanningScoreContext;
      if (original.__aldusCompletedGuardV177) return true;

      const guarded = function completedSubjectsOutsideCandidatesV177(targetState = state) {
        const context = original.apply(this, arguments);
        if (!context || !Array.isArray(context.candidates)) return context;
        const completed = completedRecords(targetState);
        context.candidates = context.candidates.filter((item) =>
          !matchesCompletedSubject(item, targetState, completed)
        );
        return context;
      };
      Object.defineProperty(guarded, "__aldusCompletedGuardV177", { value: true });
      buildPlanningScoreContext = guarded;
      return true;
    } catch (error) {
      console.warn("[Aldus v177] Não foi possível excluir assuntos concluídos dos candidatos.", error);
      return false;
    }
  }

  function repairExistingAutomaticGoals(targetState = null, reason = "audit", options = {}) {
    if (options?.explicit !== true || options?.allowMutations !== true) {
      return { changed: false, removed: [], converted: [], reason, skipped: "explicit-authorization-required" };
    }
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    try {
      if (!currentState || !Array.isArray(currentState.dailyGoals)) {
        return { changed: false, removed: [], converted: [], reason };
      }

      const completed = completedRecords(currentState);
      const syllabusById = new Map(
        (currentState.syllabusItems || []).map((item) => [String(item?.id || ""), item])
      );
      const removed = [];
      const converted = [];
      const kept = [];
      const now = new Date().toISOString();

      currentState.dailyGoals.forEach((goal) => {
        if (!isUntouchedAutomaticPendingGoal(goal)) {
          kept.push(goal);
          return;
        }

        if (matchesCompletedSubject(goal, currentState, completed)) {
          removed.push({
            id: goal.id,
            date: goal.date || goal.data || "",
            syllabusItemId: goal.syllabusItemId || "",
            type: goal.type || goal.tipo || "",
            reason: "assunto já concluído"
          });
          return;
        }

        if (isReinforcementGoal(goal)) {
          const item = syllabusById.get(String(goal.syllabusItemId || "")) || {};
          const previousType = goal.type || goal.tipo || "Reforço";
          const nextType = normalTypeForItem(item, currentState);
          goal.type = nextType;
          goal.tipo = String(nextType).toLowerCase();
          goal.updatedAt = now;
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

      const changed = Boolean(removed.length || converted.length);
      if (!changed) return { changed: false, removed, converted, reason };

      currentState.dailyGoals = kept;
      currentState.migrations ||= {};
      currentState.migrations[MIGRATION_KEY] = {
        completedAt: now,
        reason,
        removedCompletedAutomaticGoals: removed.length,
        convertedAutomaticReinforcementGoals: converted.length,
        policy: "automatic-pending-unexecuted-without-history-only",
        preserved: "manual, completed, started, executed and historical goals"
      };

      if (typeof saveData === "function") saveData({ markLocalChange: true });
      if (typeof render === "function") render();
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("completed-goal-guard-v177");

      return { changed, removed, converted, reason };
    } catch (error) {
      console.warn("[Aldus v177] Não foi possível limpar metas automáticas inválidas.", error);
      return { changed: false, removed: [], converted: [], reason, error };
    }
  }

  function runAudit(reason = "audit", options = {}) {
    const goalTypeGuardInstalled = installAutomaticGoalTypeGuard();
    const candidateGuardInstalled = installCandidateGuard();
    const repair = repairExistingAutomaticGoals(null, reason, options);
    globalThis.__aldusCompletedGoalGuardV177LastAudit = Object.freeze({
      at: new Date().toISOString(),
      reason,
      goalTypeGuardInstalled,
      candidateGuardInstalled,
      repair
    });
    return repair;
  }

  const goalTypeGuardInstalled = installAutomaticGoalTypeGuard();
  const candidateGuardInstalled = installCandidateGuard();

  // V419: bootstrap, pageshow e storage são somente leitura; nenhum reparo é agendado automaticamente.

  globalThis.__aldusCompletedGoalGuardV177 = Object.freeze({
    version: VERSION,
    policyVersion: POLICY_VERSION,
    automaticMutationDisabled: true,
    goalTypeGuardInstalled,
    candidateGuardInstalled,
    runAudit,
    repairExistingAutomaticGoals,
    matchesCompletedSubject
  });
})();
