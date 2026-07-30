(() => {
  "use strict";

  if (globalThis.__aldusDailyDelegatePieceGoalV183) return;

  const VERSION = "20260730-meta-diaria-peca-delegado-v183";
  const MIGRATION_KEY = "dailyDelegatePieceGoalV183";
  const FIXED_ORIGIN = "planejamento peça diária";
  const AUDIT_DAYS = 21;

  function canonicalValue(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function goalDate(goal = {}) {
    return String(goal.date || goal.data || "");
  }

  function datePlus(date, days) {
    try {
      if (typeof addDays === "function") return addDays(date, days);
    } catch {}
    const parsed = new Date(`${date}T12:00:00`);
    parsed.setDate(parsed.getDate() + days);
    return parsed.toISOString().slice(0, 10);
  }

  function currentDate() {
    try {
      if (typeof todayISO === "function") return todayISO();
    } catch {}
    return new Date().toISOString().slice(0, 10);
  }

  function recordSyllabusId(record = {}) {
    return String(record.syllabusItemId || record.syllabus_item_id || record.id || "");
  }

  function officialPieceMapping(record = {}, targetState = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    const id = recordSyllabusId(record);
    if (!currentState || !id) return false;
    return (currentState.contestSyllabusMap || []).some((mapping) =>
      String(mapping.syllabusItemId || "") === id
      && canonicalValue(mapping.classification || mapping.category) === "piece"
    );
  }

  function isDelegatePieceRecord(record = {}, targetState = null) {
    if (!record || typeof record !== "object") return false;
    if (record.fixedDailyPieceV183 === true) return true;

    const categories = [
      record.contestCategory,
      record.category,
      record.classification,
      ...(Array.isArray(record.contestCategories) ? record.contestCategories : [])
    ].map(canonicalValue);
    if (categories.includes("piece")) return true;

    const discipline = canonicalValue(record.discipline || record.disciplina);
    const subject = canonicalValue(record.baseSubject || record.subject || record.assunto || record.topic || record.topico);
    const disciplineMatch = discipline.includes("peca") && discipline.includes("delegad");
    const subjectMatch = subject.includes("peca") && subject.includes("delegad");
    return disciplineMatch || subjectMatch || officialPieceMapping(record, targetState);
  }

  function ignoredGoal(goal = {}) {
    return ["ignorada", "ignorado", "nao cumprida", "nao cumprido"]
      .includes(canonicalValue(goal.status));
  }

  function activePieceGoalExists(goals = [], targetState = null) {
    return goals.some((goal) => !ignoredGoal(goal) && isDelegatePieceRecord(goal, targetState));
  }

  function isCompletedItem(item = {}) {
    try {
      if (typeof completedStatus === "function") return completedStatus(item);
    } catch {}
    return ["concluido", "concluida", "estudado", "dominado"]
      .includes(canonicalValue(item.status));
  }

  function isEligiblePieceItem(item = {}) {
    if (!item?.id || item.legacyOnly || item.hiddenFromCatalog) return false;
    return !["ignorado", "ignorada"].includes(canonicalValue(item.status));
  }

  function pieceItems(targetState = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    if (!currentState) return [];
    const all = (currentState.syllabusItems || []).filter((item) =>
      isEligiblePieceItem(item) && isDelegatePieceRecord(item, currentState)
    );
    const enabled = all.filter((item) => {
      const setting = currentState.schedulableSettings?.[item.id] || {};
      return canonicalValue(setting.availability) !== "nao agendavel";
    });
    return enabled.length ? enabled : all;
  }

  function planningIsActive(date, targetState = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    try {
      if (typeof planningTargetsForDate === "function") {
        const targets = planningTargetsForDate(date, currentState);
        return Number(targets?.topics || 0) > 0 && !targets?.unavailable;
      }
    } catch {}
    try {
      if (typeof availabilityForDate === "function" && availabilityForDate(date, currentState)?.type === "indisponível") return false;
      if (typeof getDayContentConfig === "function" && typeof dayModeIncludesGoals === "function") {
        return dayModeIncludesGoals(getDayContentConfig(date, currentState)?.mode);
      }
    } catch {}
    return true;
  }

  function rotationMetrics(targetState, date) {
    const metrics = new Map();
    (targetState.dailyGoals || []).forEach((goal) => {
      if (!isDelegatePieceRecord(goal, targetState) || ignoredGoal(goal)) return;
      const id = recordSyllabusId(goal);
      if (!id || goalDate(goal) === date) return;
      const current = metrics.get(id) || { count: 0, lastDate: "" };
      current.count += 1;
      if (goalDate(goal) > current.lastDate) current.lastDate = goalDate(goal);
      metrics.set(id, current);
    });
    return metrics;
  }

  function choosePieceItem(date, targetState = null, reservedRecords = [], scoreContext = null) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    if (!currentState) return null;
    const reservedIds = new Set(reservedRecords.map(recordSyllabusId).filter(Boolean));
    const items = pieceItems(currentState).filter((item) => !reservedIds.has(String(item.id)));
    if (!items.length) return null;

    const metrics = rotationMetrics(currentState, date);
    const scoreFor = (item) => Number(scoreContext?.scores?.get(item.id)) || 0;
    return items.slice().sort((a, b) => {
      const completionDifference = Number(isCompletedItem(a)) - Number(isCompletedItem(b));
      if (completionDifference) return completionDifference;
      const aMetric = metrics.get(String(a.id)) || { count: 0, lastDate: "" };
      const bMetric = metrics.get(String(b.id)) || { count: 0, lastDate: "" };
      if (aMetric.count !== bMetric.count) return aMetric.count - bMetric.count;
      if (aMetric.lastDate !== bMetric.lastDate) return aMetric.lastDate.localeCompare(bMetric.lastDate);
      const scoreDifference = scoreFor(b) - scoreFor(a);
      if (scoreDifference) return scoreDifference;
      return String(a.subject || a.topic || "").localeCompare(String(b.subject || b.topic || ""), "pt-BR");
    })[0] || null;
  }

  function pieceGoalType(item, targetState) {
    if (isCompletedItem(item)) return "Revisão";
    try {
      if (typeof normalGoalTypeForItemV157 === "function") return normalGoalTypeForItemV157(item, targetState);
    } catch {}
    const mode = item?.importMeta?.tipo_agendamento || item?.tipo_agendamento || targetState?.schedulableSettings?.[item?.id]?.mode || "";
    if (canonicalValue(mode) === "questoes apenas") return "Questões";
    if (canonicalValue(mode) === "revisao apenas") return "Revisão";
    return "Estudo novo";
  }

  function createFallbackId() {
    try {
      if (typeof createId === "function") return createId();
    } catch {}
    return `piece-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function buildFixedPieceGoal(item, date, targetState = null, scoreContext = null) {
    if (!item) return null;
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    const type = pieceGoalType(item, currentState);
    let goal = null;
    try {
      if (typeof makeGoal === "function") [goal] = makeGoal(item, date, type, scoreContext, currentState);
    } catch {}
    if (!goal) {
      const minutes = type === "Revisão" ? 30 : type === "Questões" ? 45 : 60;
      goal = {
        id: createFallbackId(),
        date,
        data: date,
        discipline: item.discipline,
        disciplina: item.discipline,
        syllabusItemId: item.id,
        subject: item.subject || item.topic,
        assunto: item.subject || item.topic,
        baseSubject: item.subject || item.topic,
        type,
        tipo: canonicalValue(type),
        minutes,
        tempo_sugerido_minutos: minutes,
        status: "Pendente"
      };
    }

    goal.fixedDailyPieceV183 = true;
    goal.fixedDailyPiecePolicy = VERSION;
    goal.origin = FIXED_ORIGIN;
    goal.origem = FIXED_ORIGIN;
    goal.status ||= "Pendente";
    goal.notes = `${goal.notes ? `${goal.notes} ` : ""}Meta fixa diária de Peça para Delegado, conforme regra V183.`;
    goal.observacoes = `${goal.observacoes ? `${goal.observacoes} ` : ""}Vaga diária reservada para prática de peça.`;
    goal.updatedAt = new Date().toISOString();
    return goal;
  }

  function isProtectedGoal(goal = {}) {
    try {
      if (typeof isProtectedDailyGoal === "function") return isProtectedDailyGoal(goal);
    } catch {}
    try {
      if (typeof isManualDailyGoal === "function" && isManualDailyGoal(goal)) return true;
      if (typeof isGoalDone === "function" && isGoalDone(goal)) return true;
      if (typeof isGoalInProgress === "function" && isGoalInProgress(goal)) return true;
      if (typeof goalTotalActualMinutes === "function" && Number(goalTotalActualMinutes(goal)) > 0) return true;
    } catch {}
    const history = goal.history || goal.historico;
    return Array.isArray(history) ? history.length > 0 : Boolean(history);
  }

  function isStudyGoal(goal = {}) {
    try {
      if (typeof isPlanningStudyGoal === "function") return isPlanningStudyGoal(goal);
    } catch {}
    return !ignoredGoal(goal);
  }

  function planningTargetTopics(date, targetState) {
    try {
      if (typeof planningTargetsForDate === "function") return Math.max(0, Number(planningTargetsForDate(date, targetState)?.topics) || 0);
    } catch {}
    return 0;
  }

  function lowestAutomaticReplacement(goals, targetState, date, scoreContext) {
    const removable = goals.filter((goal) =>
      !isDelegatePieceRecord(goal, targetState)
      && !isProtectedGoal(goal)
      && !goal.fixedDailyPieceV183
    );
    if (!removable.length) return null;
    try {
      if (typeof planningDistributionOrderV77 === "function") {
        const ordered = planningDistributionOrderV77(removable, targetState, date, scoreContext);
        return ordered[ordered.length - 1] || removable[removable.length - 1];
      }
    } catch {}
    return removable[removable.length - 1];
  }

  function ensureDailyPieceForDate(date, targetState = null, options = {}) {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    if (!currentState || !Array.isArray(currentState.dailyGoals) || !planningIsActive(date, currentState)) {
      return { changed: false, date, skipped: "inactive-or-missing-state", added: null, removed: null };
    }

    const dayGoals = currentState.dailyGoals.filter((goal) => goalDate(goal) === date && !ignoredGoal(goal));
    if (activePieceGoalExists(dayGoals, currentState)) {
      return { changed: false, date, skipped: "piece-already-present", added: null, removed: null };
    }

    let context = options.scoreContext || null;
    if (!context) {
      try {
        if (typeof buildPlanningScoreContext === "function") context = buildPlanningScoreContext(currentState);
      } catch {}
    }
    const item = choosePieceItem(date, currentState, dayGoals, context);
    const pieceGoal = buildFixedPieceGoal(item, date, currentState, context);
    if (!pieceGoal) return { changed: false, date, skipped: "no-piece-item", added: null, removed: null };

    const targetTopics = planningTargetTopics(date, currentState);
    const studyGoals = dayGoals.filter(isStudyGoal);
    let removed = null;
    if (targetTopics > 0 && studyGoals.length >= targetTopics) {
      removed = lowestAutomaticReplacement(studyGoals, currentState, date, context);
      if (removed) currentState.dailyGoals = currentState.dailyGoals.filter((goal) => goal !== removed);
    }
    currentState.dailyGoals.push(pieceGoal);
    return { changed: true, date, skipped: "", added: pieceGoal, removed };
  }

  function installSelectionGuard() {
    try {
      if (typeof selectPlanningGoalsForTargets !== "function") return false;
      const original = selectPlanningGoalsForTargets;
      if (original.__aldusDailyPieceV183) return true;
      const guarded = function selectPlanningGoalsWithDailyPieceV183(args = {}) {
        const currentState = args.targetState || (typeof state !== "undefined" ? state : null);
        const date = args.date || currentDate();
        const existingGoals = Array.isArray(args.existingGoals) ? args.existingGoals : [];
        const targetTopics = Math.max(0, Number(args.topicTarget) || 0);
        if (!currentState || targetTopics <= 0 || !planningIsActive(date, currentState) || activePieceGoalExists(existingGoals, currentState)) {
          return original.apply(this, arguments);
        }

        let context = null;
        try {
          if (typeof buildPlanningScoreContext === "function") context = buildPlanningScoreContext(currentState);
        } catch {}
        const item = choosePieceItem(date, currentState, existingGoals, context);
        const pieceGoal = buildFixedPieceGoal(item, date, currentState, context);
        if (!pieceGoal) return original.apply(this, arguments);

        const result = original.call(this, {
          ...args,
          existingGoals: [...existingGoals, pieceGoal],
          eligibleGoals: (args.eligibleGoals || []).filter((goal) => !isDelegatePieceRecord(goal, currentState))
        });
        const selected = [pieceGoal, ...(result?.selected || [])];
        const all = [...existingGoals, ...selected];
        return {
          ...result,
          selected,
          foundTopics: all.length,
          foundDisciplines: new Set(all.map((goal) => canonicalValue(goal.discipline || goal.disciplina)).filter(Boolean)).size
        };
      };
      Object.defineProperty(guarded, "__aldusDailyPieceV183", { value: true });
      selectPlanningGoalsForTargets = guarded;
      return true;
    } catch (error) {
      console.warn("[Aldus v183] Não foi possível reservar Peça na seleção do planejamento.", error);
      return false;
    }
  }

  function installGenerationGuard() {
    try {
      if (typeof generateGoalsForDate !== "function") return false;
      const original = generateGoalsForDate;
      if (original.__aldusDailyPieceV183) return true;
      const guarded = function generateGoalsWithDailyPieceV183(date, opts = {}) {
        const currentState = opts.targetState || (typeof state !== "undefined" ? state : null);
        const generated = original.apply(this, arguments) || [];
        if (!currentState || !planningIsActive(date, currentState)) return generated;
        const existingGoals = (currentState.dailyGoals || []).filter((goal) => goalDate(goal) === date && !ignoredGoal(goal));
        if (activePieceGoalExists([...existingGoals, ...generated], currentState)) return generated;

        let context = opts.scoreContext || null;
        if (!context) {
          try {
            if (typeof buildPlanningScoreContext === "function") context = buildPlanningScoreContext(currentState);
          } catch {}
        }
        const item = choosePieceItem(date, currentState, [...existingGoals, ...generated], context);
        const pieceGoal = buildFixedPieceGoal(item, date, currentState, context);
        if (!pieceGoal) return generated;

        const targetTopics = Math.max(0, Number(opts.topicLimit) || planningTargetTopics(date, currentState));
        const output = generated.slice();
        if (targetTopics > 0 && existingGoals.filter(isStudyGoal).length + output.length >= targetTopics) {
          const replacement = lowestAutomaticReplacement(output, currentState, date, context);
          if (replacement) output.splice(output.indexOf(replacement), 1);
        }
        output.unshift(pieceGoal);
        return output;
      };
      Object.defineProperty(guarded, "__aldusDailyPieceV183", { value: true });
      generateGoalsForDate = guarded;
      return true;
    } catch (error) {
      console.warn("[Aldus v183] Não foi possível reservar Peça na geração diária.", error);
      return false;
    }
  }

  function installReconciliationGuard() {
    try {
      if (typeof reconcileDailyGoalsWithPlanning !== "function") return false;
      const original = reconcileDailyGoalsWithPlanning;
      if (original.__aldusDailyPieceV183) return true;
      const guarded = function reconcileWithDailyPieceV183(targetState = state, date = currentDate(), opts = {}) {
        const report = original.apply(this, arguments) || {};
        const ensured = ensureDailyPieceForDate(date, targetState, {});
        if (ensured.changed) {
          report.added ||= [];
          report.removed ||= [];
          if (ensured.added) report.added.push(ensured.added);
          if (ensured.removed) report.removed.push(ensured.removed);
        }
        return report;
      };
      Object.defineProperty(guarded, "__aldusDailyPieceV183", { value: true });
      reconcileDailyGoalsWithPlanning = guarded;
      return true;
    } catch (error) {
      console.warn("[Aldus v183] Não foi possível proteger Peça na reconciliação.", error);
      return false;
    }
  }

  function auditDates(targetState = null, reason = "audit") {
    const currentState = targetState || (typeof state !== "undefined" ? state : null);
    if (!currentState || !Array.isArray(currentState.dailyGoals)) return { changed: false, reason, dates: [] };
    const today = currentDate();
    const dates = new Set();
    for (let index = 0; index < AUDIT_DAYS; index += 1) dates.add(datePlus(today, index));
    (currentState.dailyGoals || []).map(goalDate).filter((date) => date >= today).forEach((date) => dates.add(date));

    const reports = [...dates].sort().map((date) => ensureDailyPieceForDate(date, currentState));
    const changedReports = reports.filter((report) => report.changed);
    if (!changedReports.length) return { changed: false, reason, dates: reports };

    const now = new Date().toISOString();
    currentState.migrations ||= {};
    currentState.migrations[MIGRATION_KEY] = {
      version: VERSION,
      appliedAt: now,
      reason,
      auditedDates: reports.length,
      addedPieceGoals: changedReports.filter((report) => report.added).length,
      replacedAutomaticGoals: changedReports.filter((report) => report.removed).length,
      preservedPolicy: "metas manuais, concluídas, iniciadas, com tempo ou histórico não são removidas"
    };
    if (typeof saveData === "function") saveData({ markLocalChange: true });
    if (typeof render === "function") render();
    if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("daily-delegate-piece-v183");
    return { changed: true, reason, dates: reports };
  }

  const selectionGuardInstalled = installSelectionGuard();
  const generationGuardInstalled = installGenerationGuard();
  const reconciliationGuardInstalled = installReconciliationGuard();

  const runAudit = (reason) => auditDates(null, reason);
  const onBootstrapReady = () => runAudit("bootstrap-ready");
  if (globalThis.__aldusBootstrapReady) queueMicrotask(onBootstrapReady);
  else window.addEventListener("aldus:bootstrap-ready", onBootstrapReady, { once: true });
  window.addEventListener("aldus:post-bootstrap-maintenance-complete", () => runAudit("post-bootstrap-maintenance"), { once: true });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) runAudit("pageshow-bfcache");
  });

  globalThis.__aldusDailyDelegatePieceGoalV183 = Object.freeze({
    version: VERSION,
    selectionGuardInstalled,
    generationGuardInstalled,
    reconciliationGuardInstalled,
    isDelegatePieceRecord,
    choosePieceItem,
    buildFixedPieceGoal,
    ensureDailyPieceForDate,
    auditDates,
    runAudit
  });
})();
