(() => {
  "use strict";
  if (window.__aldusReinforcementGoalPresentationV156) return;
  window.__aldusReinforcementGoalPresentationV156 = true;

  const VERSION = "20260729-sem-reforco-automatico-v175";
  const MIGRATION_KEY = "noAutomaticReinforcementV175";
  const LABEL = "META DE REFORÇO";

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isReinforcementGoal(goal) {
    return canonical(goal?.type || goal?.tipo) === "reforco";
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

  function disableAutomaticReinforcementClassification() {
    try {
      if (typeof planningGoalTypeForItemV157 !== "function") return false;
      planningGoalTypeForItemV157 = function noAutomaticReinforcementV175(item = {}, date = "", metrics = null, targetState = state) {
        return normalTypeForItem(item, targetState);
      };
      return true;
    } catch (error) {
      console.warn("[Aldus v175] Não foi possível desativar a classificação automática de reforço.", error);
      return false;
    }
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

  function hasHistory(goal = {}) {
    const history = goal.history || goal.historico;
    return Array.isArray(history) ? history.length > 0 : Boolean(String(history || "").trim());
  }

  function isManualGoal(goal = {}) {
    try {
      if (typeof isManualDailyGoal === "function") return isManualDailyGoal(goal);
    } catch {}
    const origin = canonical(goal.origin || goal.origem);
    return origin.includes("manual") || goal.manual === true || goal.isManual === true;
  }

  function isUntouchedAutomaticPendingReinforcement(goal = {}) {
    if (!isReinforcementGoal(goal) || isManualGoal(goal)) return false;
    const status = canonical(goal.status || "Pendente");
    if (!["", "pendente"].includes(status)) return false;
    if (hasExecution(goal) || hasHistory(goal)) return false;
    if (goal.completed || goal.completedAt || goal.startedAt || goal.iniciadoEm) return false;
    return true;
  }

  function repairPendingAutomaticReinforcementGoals() {
    try {
      if (typeof state === "undefined" || !Array.isArray(state?.dailyGoals)) {
        return { changed: false, corrected: [] };
      }
      state.migrations ||= {};
      if (state.migrations[MIGRATION_KEY]?.completedAt) {
        return { changed: false, corrected: [], alreadyApplied: true };
      }

      const syllabusById = new Map(
        (state.syllabusItems || []).map((item) => [String(item?.id || ""), item])
      );
      const corrected = [];

      state.dailyGoals.forEach((goal) => {
        if (!isUntouchedAutomaticPendingReinforcement(goal)) return;
        const item = syllabusById.get(String(goal.syllabusItemId || "")) || {};
        const nextType = normalTypeForItem(item, state);
        const previousType = goal.type || goal.tipo || "Reforço";
        goal.type = nextType;
        goal.tipo = String(nextType).toLowerCase();
        goal.updatedAt = new Date().toISOString();
        corrected.push({
          id: goal.id,
          syllabusItemId: goal.syllabusItemId || "",
          previousType,
          nextType
        });
      });

      state.migrations[MIGRATION_KEY] = {
        completedAt: new Date().toISOString(),
        corrected: corrected.length,
        policy: "automatic-pending-untouched-only",
        preserved: "manual, completed, started, executed and historical goals"
      };

      if (corrected.length) {
        if (typeof saveData === "function") saveData({ markLocalChange: true });
        if (typeof render === "function") render();
        if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("disable-automatic-reinforcement-v175");
      } else if (typeof saveData === "function") {
        saveData({ markLocalChange: true });
      }

      return { changed: corrected.length > 0, corrected };
    } catch (error) {
      console.warn("[Aldus v175] Não foi possível corrigir as metas automáticas de reforço.", error);
      return { changed: false, corrected: [], error };
    }
  }

  const classificationDisabled = disableAutomaticReinforcementClassification();
  const migrationResult = repairPendingAutomaticReinforcementGoals();
  window.__aldusNoAutomaticReinforcementV175 = Object.freeze({
    version: VERSION,
    classificationDisabled,
    migration: migrationResult
  });

  function goalFromProjection(goalId) {
    const projection = window.__dailyPlanProjectionByGoalId;
    if (!goalId || !projection || typeof projection.get !== "function") return null;
    return projection.get(goalId)?.goal || null;
  }

  function goalFromState(goalId) {
    if (!goalId) return null;
    try {
      if (typeof state === "undefined" || !Array.isArray(state?.dailyGoals)) return null;
      return state.dailyGoals.find((goal) => goal?.id === goalId) || null;
    } catch {
      return null;
    }
  }

  function goalById(goalId) {
    return goalFromProjection(goalId) || goalFromState(goalId);
  }

  function ensureStyles() {
    if (document.getElementById("reinforcementGoalPresentationStylesV156")) return;
    const style = document.createElement("style");
    style.id = "reinforcementGoalPresentationStylesV156";
    style.textContent = `
      #view-metas-do-dia .reinforcement-goal-v156 {
        border-color: rgba(245, 190, 72, .72) !important;
      }
      #view-metas-do-dia .reinforcement-goal-badge-v156 {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        margin: 0 0 8px;
        padding: 5px 10px;
        border: 1px solid rgba(245, 190, 72, .78);
        border-radius: 999px;
        background: rgba(245, 190, 72, .14);
        color: #fff1bd;
        font-size: .78rem;
        font-weight: 900;
        letter-spacing: .055em;
        line-height: 1.2;
        text-transform: uppercase;
      }
      #view-metas-do-dia .daily-goal-summary .reinforcement-goal-badge-v156 {
        margin: 0 0 5px;
      }
      #view-metas-do-dia .reinforcement-goal-callout-v156 {
        display: grid;
        gap: 3px;
        margin: 0 0 14px;
        padding: 12px 14px;
        border: 1px solid rgba(245, 190, 72, .58);
        border-radius: 14px;
        background: rgba(245, 190, 72, .09);
      }
      #view-metas-do-dia .reinforcement-goal-callout-v156 strong {
        color: #fff1bd;
        font-size: .86rem;
        letter-spacing: .04em;
      }
      #view-metas-do-dia .reinforcement-goal-callout-v156 span {
        color: inherit;
        font-size: .9rem;
      }
      @media (max-width: 620px) {
        #view-metas-do-dia .reinforcement-goal-badge-v156 {
          font-size: .73rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createBadge(location) {
    const badge = document.createElement("span");
    badge.className = "reinforcement-goal-badge-v156";
    badge.dataset.reinforcementGoalLabel = location;
    badge.dataset.reinforcementGoalVersion = VERSION;
    badge.textContent = LABEL;
    return badge;
  }

  function removeLabels(container) {
    container?.querySelectorAll?.("[data-reinforcement-goal-label]").forEach((element) => element.remove());
  }

  function markGoalDetails(details) {
    const goalId = details?.dataset?.dailyGoalDetails || "";
    const goal = goalById(goalId);
    const reinforcement = isReinforcementGoal(goal);
    details?.classList.toggle("reinforcement-goal-v156", reinforcement);

    if (!reinforcement) {
      removeLabels(details);
      return;
    }

    const summaryMain = details.querySelector(".daily-goal-summary > span:first-child");
    if (summaryMain && !summaryMain.querySelector('[data-reinforcement-goal-label="summary"]')) {
      summaryMain.prepend(createBadge("summary"));
    }

    const content = details.querySelector("[data-daily-goal-body] .daily-goal-content");
    if (content && !content.querySelector('[data-reinforcement-goal-label="details"]')) {
      const callout = document.createElement("div");
      callout.className = "reinforcement-goal-callout-v156";
      callout.dataset.reinforcementGoalLabel = "details";
      callout.dataset.reinforcementGoalVersion = VERSION;
      const title = document.createElement("strong");
      title.textContent = LABEL;
      const description = document.createElement("span");
      description.textContent = "Atividade adicional criada manualmente para reforçar este assunto.";
      callout.append(title, description);
      content.prepend(callout);
    }
  }

  function nextGoalId(container) {
    return container?.querySelector?.("[data-goal-timer][data-id]")?.dataset?.id
      || container?.querySelector?.("[data-goal-action][data-id]")?.dataset?.id
      || container?.querySelector?.("[data-open-goal-material]")?.dataset?.openGoalMaterial
      || "";
  }

  function markNextGoal() {
    const container = document.getElementById("nextDailyGoal");
    if (!container) return;
    const goal = goalById(nextGoalId(container));
    const reinforcement = isReinforcementGoal(goal);
    container.classList.toggle("reinforcement-goal-v156", reinforcement);

    if (!reinforcement) {
      removeLabels(container);
      return;
    }

    const content = container.querySelector(".daily-plan-content");
    if (content && !content.querySelector('[data-reinforcement-goal-label="next"]')) {
      content.prepend(createBadge("next"));
    }
  }

  function applyPresentation() {
    ensureStyles();
    document.querySelectorAll("#view-metas-do-dia [data-daily-goal-details]").forEach(markGoalDetails);
    markNextGoal();
  }

  let scheduled = false;
  function schedulePresentation() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(() => {
      scheduled = false;
      applyPresentation();
    }, 0);
  }

  [document.getElementById("dailyGoalsList"), document.getElementById("nextDailyGoal")]
    .filter(Boolean)
    .forEach((container) => {
      if (typeof MutationObserver !== "undefined") {
        new MutationObserver(schedulePresentation).observe(container, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    });

  window.addEventListener("hashchange", schedulePresentation);
  window.addEventListener("storage", schedulePresentation);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedulePresentation();
  });
  document.addEventListener("toggle", (event) => {
    if (event.target?.matches?.("#view-metas-do-dia [data-daily-goal-details]")) schedulePresentation();
  }, true);

  schedulePresentation();
})();
