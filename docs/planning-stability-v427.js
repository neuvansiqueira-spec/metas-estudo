(() => {
  "use strict";

  // V427 — Estabilidade do Plano do Dia.
  //
  // Duas correções, ambas medidas no estado real do usuário em 01/09/2026:
  //
  // 1. A COTA NÃO FICAVA EM 8. A V426 gravou 8 em `planning.config`, mas o
  //    `planning-integrity-v235.js` reaplica `manualGoalsConfigV235` por cima a
  //    cada saveData(). O snapshot vive em três lugares — `planning.
  //    manualGoalsConfigV235`, `planning.config` e a chave
  //    `aldusPlanningManualGoalsV235` do localStorage — e escrever em apenas um
  //    deles é desfeito no salvamento seguinte. Medido: topicsPerDay = 5.
  //
  // 2. O BOTÃO "ATUALIZAR CONFORME PLANEJAMENTO" ERA DESTRUTIVO.
  //    `ensureDailyPlanAlignedWithPlanningV174` fixa `rebuildAutomatic: true`
  //    (script.js:7384), e essa opção executa `removeGoals(automatic)` —
  //    apaga todas as metas pendentes não protegidas e sorteia outras. É a
  //    causa direta de preparar resumo para A, B e C e voltar com D, E e F.
  //    O reparo troca a reconstrução por preenchimento aditivo.
  //
  // V441 acrescenta uma rede de segurança estreita: se a reconciliação aditiva
  // remover uma meta protegida, ela é restaurada. Metas automáticas intactas
  // continuam sujeitas à deduplicação normal e nunca entram nessa restauração.
  //
  // Nada aqui roda sozinho sobre as metas: a cota é escrita uma vez, e o
  // comportamento aditivo só age quando o usuário clica no botão.

  const VERSION = "20260903-planning-stability-v427-protected-restore-r2";
  const MARKER_KEY = "planningStabilityV427";
  const API_KEY = "__ALDUS_PLANNING_STABILITY_V427__";
  const SNAPSHOT_KEY = "aldusPlanningManualGoalsV235";
  const WRAP_MARKER = "__aldusPlanningStabilityV427";

  const TARGET_DISCIPLINES = 8;
  const TARGET_TOPICS = 8;

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const positiveInteger = (value, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const goalDate = (goal = {}) => String(goal.date || goal.data || "").slice(0, 10);

  // `script.js` declara o estado como `const state`, que não existe em
  // globalThis. O identificador direto é o único caminho.
  function resolveAppState() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(state)) return state;
    } catch { /* binding inexistente ou em TDZ */ }
    return null;
  }

  function isProtectedByCore(goal) {
    try {
      return typeof globalThis.isProtectedDailyGoal === "function"
        && globalThis.isProtectedDailyGoal(goal) === true;
    } catch {
      return false;
    }
  }

  function protectedGoalsForDate(targetState, date) {
    if (!Array.isArray(targetState?.dailyGoals)) return [];
    return targetState.dailyGoals.filter((goal) => goalDate(goal) === date && isProtectedByCore(goal));
  }

  function restoreProtectedGoals(targetState, protectedBefore, report = {}) {
    if (!Array.isArray(targetState?.dailyGoals) || !Array.isArray(protectedBefore) || !protectedBefore.length) {
      report.restoredProtected ||= [];
      return [];
    }

    const restored = [];
    for (const goal of protectedBefore) {
      // Revalida a política no momento da restauração. Nunca há fallback por
      // origem/status: sem isProtectedDailyGoal verdadeiro, a meta fica fora.
      if (!isProtectedByCore(goal)) continue;
      const id = goal?.id;
      const stillPresent = targetState.dailyGoals.includes(goal)
        || Boolean(id && targetState.dailyGoals.some((item) => item?.id === id));
      if (stillPresent) continue;
      targetState.dailyGoals.push(goal);
      restored.push(goal);
    }

    const restoredIds = restored.map((goal) => goal?.id).filter(Boolean);
    report.restoredProtected = restoredIds;
    if (restoredIds.length) {
      const restoredSet = new Set(restoredIds);
      if (Array.isArray(report.removed)) {
        report.removed = report.removed.filter((id) => !restoredSet.has(id));
      }
      report.preserved = [...new Set([
        ...(Array.isArray(report.preserved) ? report.preserved : []),
        ...restoredIds
      ])];
    }
    return restored;
  }

  // --- 1. Cota: escrever nas três fontes, senão o V235 desfaz -------------

  function writeQuota(targetState, disciplines = TARGET_DISCIPLINES, topics = TARGET_TOPICS) {
    const planning = isObject(targetState?.planning) ? targetState.planning : null;
    if (!planning || !isObject(planning.config)) return null;
    const snapshot = {
      version: VERSION,
      disciplines: positiveInteger(disciplines, TARGET_DISCIPLINES),
      topics: Math.max(positiveInteger(disciplines, TARGET_DISCIPLINES), positiveInteger(topics, TARGET_TOPICS)),
      savedAt: new Date().toISOString()
    };
    planning.manualGoalsConfigV235 = snapshot;
    planning.config.disciplinesPerDay = snapshot.disciplines;
    planning.config.topicsPerDay = snapshot.topics;
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch { /* modo privado */ }
    return snapshot;
  }

  function quotaOf(targetState) {
    const config = targetState?.planning?.config || {};
    return { disciplines: config.disciplinesPerDay, topics: config.topicsPerDay };
  }

  // --- 2. Botão aditivo em vez de reconstrutivo --------------------------

  // Reproduz ensureDailyPlanAlignedWithPlanningV174 com uma diferença: não
  // passa `rebuildAutomatic`. Sem ele, reconcileDailyGoalsWithPlanning
  // preserva as metas pendentes existentes e apenas completa o que falta.
  function alignAdditively(targetState, date, opts = {}) {
    const authorized = opts.explicit === true || opts.allowRebuild === true;
    if (!authorized) {
      return { changed: false, skipped: "explicit-authorization-required", date, status: statusFor(targetState, date), report: null };
    }
    const status = statusFor(targetState, date);
    if (status?.aligned && !opts.force) {
      return { changed: false, skipped: status.skipped || "already-aligned", date, status, report: null };
    }
    if (status?.targets && status.targets.topics <= 0) {
      return { changed: false, skipped: "zero-target-safety", date, status, report: null };
    }

    const protectedBefore = protectedGoalsForDate(targetState, date);
    const report = globalThis.reconcileDailyGoalsWithPlanning(targetState, date, {
      ...opts,
      explicit: true,
      allowRebuild: true,
      rebuildAutomatic: false
    }) || {};
    const restoredProtected = restoreProtectedGoals(targetState, protectedBefore, report);

    if (typeof globalThis.markDailyPlanAlignmentV174 === "function") {
      globalThis.markDailyPlanAlignmentV174(targetState, date);
    }
    return {
      changed: Boolean((report.added || []).length || (report.removed || []).length || restoredProtected.length || !status?.aligned),
      skipped: "",
      date,
      status,
      report,
      additive: true
    };
  }

  function statusFor(targetState, date) {
    try {
      if (typeof globalThis.dailyPlanAlignmentStatusV174 === "function") {
        return globalThis.dailyPlanAlignmentStatusV174(targetState, date);
      }
    } catch { /* estado incompleto */ }
    return null;
  }

  function installAdditiveAlignment() {
    const original = globalThis.ensureDailyPlanAlignedWithPlanningV174;
    if (typeof original !== "function") return false;
    if (original[WRAP_MARKER] === VERSION) return true;
    if (typeof globalThis.reconcileDailyGoalsWithPlanning !== "function") return false;

    const wrapped = function ensureDailyPlanAlignedWithPlanningV174(targetState, date, opts = {}) {
      // A reconstrução destrutiva continua disponível, mas deixa de ser o
      // padrão: só ocorre quando alguém pedir explicitamente.
      if (opts.rebuildAutomatic === true) return original.call(this, targetState, date, opts);
      return alignAdditively(targetState, date, opts);
    };
    Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusV427Original", { value: original });
    globalThis.ensureDailyPlanAlignedWithPlanningV174 = wrapped;
    return true;
  }

  // --- Instalação --------------------------------------------------------

  function applyPlanningStabilityV427(targetState, options = {}) {
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    const before = quotaOf(targetState);
    const already = targetState?.migrations?.[MARKER_KEY]?.completed === true;
    if (already && !options.force) {
      return { changed: false, blocked: false, repeated: true, quota: before };
    }
    const snapshot = writeQuota(targetState, options.disciplines, options.topics);
    if (!snapshot) return { changed: false, blocked: true, reason: "planning-unavailable" };
    targetState.migrations ||= {};
    targetState.migrations[MARKER_KEY] = {
      version: VERSION,
      executedAt: new Date().toISOString(),
      completed: true,
      quotaBefore: before,
      quotaAfter: quotaOf(targetState)
    };
    return { changed: true, blocked: false, quotaBefore: before, quota: quotaOf(targetState) };
  }

  const api = Object.freeze({
    version: VERSION,
    markerKey: MARKER_KEY,
    snapshotKey: SNAPSHOT_KEY,
    targetDisciplines: TARGET_DISCIPLINES,
    targetTopics: TARGET_TOPICS,
    writeQuota,
    quotaOf,
    protectedGoalsForDate,
    restoreProtectedGoals,
    alignAdditively,
    installAdditiveAlignment,
    apply: applyPlanningStabilityV427
  });

  globalThis[API_KEY] = api;
  globalThis.applyPlanningStabilityV427 = applyPlanningStabilityV427;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function runOnce() {
    try {
      installAdditiveAlignment();
      const appState = resolveAppState();
      if (!appState) return;
      const result = applyPlanningStabilityV427(appState);
      if (result.blocked || !result.changed) return;
      console.info("[Aldus V427] Cota do Plano do Dia fixada.", result.quotaBefore, "→", result.quota);
      try { if (typeof saveData === "function") saveData(); }
      catch (error) { console.warn("[Aldus V427] Falha ao persistir a cota.", error); }
    } catch (error) {
      console.warn("[Aldus V427] Estabilidade não aplicada.", error);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", runOnce, { once: true });
    window.addEventListener("aldus:bootstrap-ready", runOnce, { once: true });
    window.addEventListener("load", runOnce, { once: true });
  }
})();
