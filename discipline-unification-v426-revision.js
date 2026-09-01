(() => {
  "use strict";

  const VERSION = "20260901-discipline-unification-v426-revision-b1-e";
  const REVISION_ID = "b1-e-20260901";
  const MIGRATION_KEY = "disciplineUnificationV426";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const INSTALL_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426_REVISION_INSTALLED__";
  const BASE_SCRIPT_ID = "aldusDisciplineUnificationV426";
  const PANEL_ID = "aldusV426MigrationPanel";
  const PCMA_ID = "pcma-2026-delegado";
  const PCPR_EXAM_DATE = "2026-10-11";

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  function cleanText(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function canonical(value) {
    return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function recordSubject(record = {}) {
    return cleanText(record.subject || record.assunto || record.topic || record.topico || record.title || record.name || "");
  }

  function recordLabel(record = {}) {
    return recordSubject(record) || cleanText(record.id || "(sem assunto)");
  }

  function recordSyllabusId(record = {}) {
    return cleanText(record.syllabusItemId || record.syllabus_item_id || "");
  }

  function oldMigrationCompleted(state) {
    return state?.migrations?.[MIGRATION_KEY]?.completed === true;
  }

  function revisionCompleted(state) {
    const migration = state?.migrations?.[MIGRATION_KEY];
    return migration?.completed === true && migration?.revisionId === REVISION_ID;
  }

  function referencesId(record, id, options = {}) {
    if (!record || typeof record !== "object" || !id) return false;
    if (cleanText(record.syllabusItemId || record.syllabus_item_id) === id) return true;
    if (options.material && cleanText(record.parentSyllabusItemId) === id) return true;
    if (options.material && Array.isArray(record.syllabusItemIds) && record.syllabusItemIds.some((value) => cleanText(value) === id)) return true;
    return false;
  }

  function goalActualMinutes(goal = {}) {
    try {
      if (typeof globalThis.goalTotalActualMinutes === "function") {
        const value = Number(globalThis.goalTotalActualMinutes(goal));
        if (Number.isFinite(value) && value > 0) return value;
      }
    } catch {}
    for (const field of ["actualMinutes", "actual_minutes", "elapsedMinutes", "timeSpentMinutes", "tempoRealMinutos", "tempo_real_minutos", "completedMinutes"]) {
      const value = Number(goal?.[field]);
      if (Number.isFinite(value) && value > 0) return value;
    }
    for (const field of ["elapsedSeconds", "timerSeconds", "secondsSpent", "studySeconds", "totalSeconds"]) {
      const value = Number(goal?.[field]);
      if (Number.isFinite(value) && value > 0) return value / 60;
    }
    return 0;
  }

  function countRefs(list, id, options = {}) {
    return (Array.isArray(list) ? list : []).reduce((sum, record) => sum + (referencesId(record, id, options) ? 1 : 0), 0);
  }

  function duplicateReferenceProfile(state, id) {
    const linkedGoals = (Array.isArray(state.dailyGoals) ? state.dailyGoals : []).filter((goal) => referencesId(goal, id));
    let sessionRefs = 0;
    for (const session of Array.isArray(state.questionBankSessions) ? state.questionBankSessions : []) {
      for (const item of Array.isArray(session?.items) ? session.items : []) if (referencesId(item, id)) sessionRefs += 1;
    }
    let prioritySignals = 0;
    const signals = state?.planning?.topicPrioritySignalsV155;
    if (isObject(signals)) {
      for (const [key, value] of Object.entries(signals)) {
        if (cleanText(key) === id || referencesId(value, id)) prioritySignals += 1;
      }
    } else if (Array.isArray(signals)) {
      prioritySignals = countRefs(signals, id);
    }
    const profile = {
      dailyGoals: linkedGoals.length,
      studies: countRefs(state.studies, id),
      materials: countRefs(state.materials, id, { material: true }),
      questionLogs: countRefs(state.questionLogs, id),
      questionBank: countRefs(state.questionBank, id),
      questionBankSessions: sessionRefs,
      questionErrorNotebook: countRefs(state.questionErrorNotebook, id),
      smartReviews: countRefs(state.smartReviews, id),
      prioritySignals,
      goalTimeMinutes: linkedGoals.reduce((sum, goal) => sum + goalActualMinutes(goal), 0)
    };
    profile.referenceCount = Object.entries(profile).filter(([key]) => key !== "goalTimeMinutes").reduce((sum, [, value]) => sum + Number(value || 0), 0);
    profile.hasHistory = profile.referenceCount > 0 || profile.goalTimeMinutes > 0;
    return profile;
  }

  function duplicateBlockers(profile = {}) {
    const blockers = [];
    if (profile.dailyGoals > 0) blockers.push(`dailyGoals=${profile.dailyGoals}`);
    if (profile.studies > 0) blockers.push(`studies=${profile.studies}`);
    if (profile.materials > 0) blockers.push(`materials=${profile.materials}`);
    if (profile.questionLogs > 0) blockers.push(`questionLogs=${profile.questionLogs}`);
    if (profile.questionBank > 0) blockers.push(`questionBank=${profile.questionBank}`);
    if (profile.questionBankSessions > 0) blockers.push(`questionBankSessions=${profile.questionBankSessions}`);
    if (profile.questionErrorNotebook > 0) blockers.push(`questionErrorNotebook=${profile.questionErrorNotebook}`);
    if (profile.smartReviews > 0) blockers.push(`smartReviews=${profile.smartReviews}`);
    if (profile.prioritySignals > 0) blockers.push(`topicPrioritySignalsV155=${profile.prioritySignals}`);
    if (profile.goalTimeMinutes > 0) blockers.push(`tempo=${profile.goalTimeMinutes}`);
    return blockers;
  }

  function duplicateKey(item = {}) {
    const discipline = canonical(item.discipline);
    const subject = canonical(recordSubject(item));
    return discipline && subject ? `${discipline}\u0000${subject}` : "";
  }

  function mappingCount(state, id) {
    return (Array.isArray(state.contestSyllabusMap) ? state.contestSyllabusMap : []).filter((mapping) => cleanText(mapping?.syllabusItemId) === id).length;
  }

  function removeHistoryFreeDuplicates(working, report) {
    const groups = new Map();
    for (const item of Array.isArray(working.syllabusItems) ? working.syllabusItems : []) {
      const key = duplicateKey(item);
      if (!key) continue;
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    }

    const removedIds = new Set();
    for (const [key, rawGroup] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))) {
      if (rawGroup.length < 2) continue;
      const group = rawGroup.slice().sort((a, b) => cleanText(a.id).localeCompare(cleanText(b.id)));
      const profiles = new Map(group.map((item) => [cleanText(item.id), duplicateReferenceProfile(working, cleanText(item.id))]));
      const ranked = group.slice().sort((a, b) => {
        const aId = cleanText(a.id), bId = cleanText(b.id);
        const aProfile = profiles.get(aId), bProfile = profiles.get(bId);
        if (Number(Boolean(aProfile?.hasHistory)) !== Number(Boolean(bProfile?.hasHistory))) return Number(Boolean(bProfile?.hasHistory)) - Number(Boolean(aProfile?.hasHistory));
        const aMapped = mappingCount(working, aId) > 0, bMapped = mappingCount(working, bId) > 0;
        if (Number(aMapped) !== Number(bMapped)) return Number(bMapped) - Number(aMapped);
        return aId.localeCompare(bId);
      });
      const keep = ranked[0];
      const keepId = cleanText(keep?.id);
      const candidates = ranked.slice(1);
      const blocked = candidates.map((item) => {
        const id = cleanText(item.id);
        return { id, blockers: duplicateBlockers(profiles.get(id)) };
      }).filter((entry) => entry.blockers.length > 0);

      if (!keepId || blocked.length) {
        report.duplicatePairsNotRemoved.push({
          key,
          discipline: cleanText(keep?.discipline || group[0]?.discipline),
          subject: recordSubject(keep || group[0]),
          ids: group.map((item) => cleanText(item.id)),
          keptCandidateId: keepId,
          reasons: blocked.length ? blocked.map((entry) => `${entry.id}: ${entry.blockers.join(", ")}`) : ["grupo sem item preservável"]
        });
        continue;
      }

      for (const item of candidates) {
        const id = cleanText(item.id);
        if (!id || id === keepId) continue;
        removedIds.add(id);
        report.duplicatesRemoved.push({ id, keptId: keepId, discipline: cleanText(item.discipline), subject: recordSubject(item), reason: "duplicata normalizada sem referências, histórico ou tempo" });
      }
    }

    if (removedIds.size) {
      working.syllabusItems = (working.syllabusItems || []).filter((item) => !removedIds.has(cleanText(item.id)));
      working.contestSyllabusMap = (working.contestSyllabusMap || []).filter((mapping) => !removedIds.has(cleanText(mapping?.syllabusItemId)));
      if (isObject(working.schedulableSettings)) for (const id of removedIds) delete working.schedulableSettings[id];
    }
    return [...removedIds].sort();
  }

  function assertRemovedPointersClean(state, ids = []) {
    const removed = new Set(ids);
    if (!removed.size) return;
    if ((state.contestSyllabusMap || []).some((mapping) => removed.has(cleanText(mapping?.syllabusItemId)))) throw new Error("V426: B.1 deixou mapeamento órfão.");
    if (isObject(state.schedulableSettings) && [...removed].some((id) => hasOwn(state.schedulableSettings, id))) throw new Error("V426: B.1 deixou schedulableSettings órfão.");
  }

  function goalDate(goal = {}) {
    return cleanText(goal.date || goal.data || "").slice(0, 10);
  }

  function goalHistoryCount(goal = {}) {
    const history = goal.history || goal.historico;
    return Array.isArray(history) ? history.length : (history ? 1 : 0);
  }

  function isManualGoal(goal = {}) {
    try { if (typeof globalThis.isManualDailyGoal === "function") return Boolean(globalThis.isManualDailyGoal(goal)); } catch {}
    return !["edital verticalizado", "planejamento", "plano do dia"].includes(canonical(goal.origin || goal.origem || "manual"));
  }

  function isCompletedGoal(goal = {}) {
    try { if (typeof globalThis.isGoalDone === "function" && globalThis.isGoalDone(goal)) return true; } catch {}
    return ["concluido", "concluida", "estudado", "dominado"].includes(canonical(goal.status));
  }

  function isStartedGoal(goal = {}) {
    try { if (typeof globalThis.isGoalInProgress === "function" && globalThis.isGoalInProgress(goal)) return true; } catch {}
    return ["em andamento", "iniciado", "iniciada"].includes(canonical(goal.status)) || Boolean(goal.startedAt || goal.started_at);
  }

  function isDailyPieceGoal(goal = {}, state = {}) {
    if (goal.fixedDailyPieceV183 === true || canonical(goal.origin || goal.origem) === "planejamento peca diaria") return true;
    const id = recordSyllabusId(goal);
    return Boolean(id) && (state.contestSyllabusMap || []).some((mapping) => cleanText(mapping?.syllabusItemId) === id && canonical(mapping?.classification || mapping?.category) === "piece");
  }

  function protectionReasons(goal, state) {
    const reasons = [];
    if (isManualGoal(goal)) reasons.push("meta manual");
    if (isCompletedGoal(goal)) reasons.push("meta concluída");
    if (isStartedGoal(goal)) reasons.push("meta iniciada");
    if (goalActualMinutes(goal) > 0) reasons.push("meta com tempo registrado");
    if (goalHistoryCount(goal) > 0) reasons.push("meta com histórico");
    if (isDailyPieceGoal(goal, state)) reasons.push("peça diária");
    try {
      if (typeof globalThis.isProtectedDailyGoal === "function" && globalThis.isProtectedDailyGoal(goal) && !reasons.length) reasons.push("meta protegida pelo Plano do Dia");
    } catch {}
    return reasons;
  }

  function contestIdsForItem(state, id) {
    return new Set((state.contestSyllabusMap || []).filter((mapping) => cleanText(mapping?.syllabusItemId) === id).map((mapping) => cleanText(mapping?.contestId)).filter(Boolean));
  }

  function mapsExclusivelyToPcma(state, id) {
    const ids = contestIdsForItem(state, id);
    return ids.size === 1 && ids.has(PCMA_ID);
  }

  function setDateOnly(goal, date) {
    if (hasOwn(goal, "date")) goal.date = date;
    if (hasOwn(goal, "data")) goal.data = date;
    if (!hasOwn(goal, "date") && !hasOwn(goal, "data")) goal.date = date;
  }

  function reschedulePcmaGoals(working, report) {
    const candidates = (working.dailyGoals || [])
      .filter((goal) => goalDate(goal) && goalDate(goal) <= PCPR_EXAM_DATE)
      .filter((goal) => contestIdsForItem(working, recordSyllabusId(goal)).has(PCMA_ID))
      .slice()
      .sort((a, b) => goalDate(a).localeCompare(goalDate(b)) || cleanText(a.id).localeCompare(cleanText(b.id)));

    const needsDateFinder = candidates.some((goal) => mapsExclusivelyToPcma(working, recordSyllabusId(goal)) && protectionReasons(goal, working).length === 0);
    if (needsDateFinder && typeof globalThis.nextReplacementDateV158 !== "function") throw new Error("V426: nextReplacementDateV158 indisponível; nenhuma alteração foi aplicada.");

    for (const goal of candidates) {
      const itemId = recordSyllabusId(goal);
      const base = { id: cleanText(goal.id), syllabusItemId: itemId, subject: recordLabel(goal), from: goalDate(goal) };
      if (!mapsExclusivelyToPcma(working, itemId)) {
        report.goalsNotRescheduled.push({ ...base, reasons: ["conteúdo comum PCPR/PCMA ou mapeamento não exclusivo"] });
        continue;
      }
      const reasons = protectionReasons(goal, working);
      if (reasons.length) {
        report.goalsNotRescheduled.push({ ...base, reasons });
        continue;
      }
      const nextDate = cleanText(globalThis.nextReplacementDateV158(working, goal, PCPR_EXAM_DATE));
      if (!nextDate || nextDate <= PCPR_EXAM_DATE) {
        report.goalsNotRescheduled.push({ ...base, reasons: ["nenhuma data futura segura encontrada"] });
        continue;
      }
      setDateOnly(goal, nextDate);
      report.goalsRescheduled.push({ ...base, to: nextDate });
    }
  }

  function mergeReport(state, backup, beforeCounts) {
    const migration = state?.migrations?.[MIGRATION_KEY] || {};
    const baseReport = isObject(migration.report) ? clone(migration.report) : {};
    return {
      ...baseReport,
      version: VERSION,
      revisionId: REVISION_ID,
      backup: clone(backup),
      previousExecution: migration.executedAt ? { version: migration.version || "", executedAt: migration.executedAt } : null,
      duplicatesRemoved: [],
      duplicatePairsNotRemoved: [],
      goalsRescheduled: [],
      goalsNotRescheduled: [],
      syllabusItemsBefore: beforeCounts.syllabusItems,
      syllabusItemsAfter: null,
      distinctDisciplineNamesAfter: null
    };
  }

  function distinctDisciplineCount(state) {
    return new Set((state.syllabusItems || []).map((item) => cleanText(item.discipline)).filter(Boolean)).size;
  }

  function applyRevision(targetState, options, baseApply) {
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (revisionCompleted(targetState)) return { changed: false, blocked: false, repeated: true, report: clone(targetState.migrations[MIGRATION_KEY].report || {}) };
    const backup = options?.backupConfirmation;
    if (!backup?.confirmed || !cleanText(backup.fileName)) return { changed: false, blocked: true, reason: "backup-required" };

    const beforeCounts = { syllabusItems: (targetState.syllabusItems || []).length, dailyGoals: (targetState.dailyGoals || []).length };
    const working = clone(targetState);
    if (!oldMigrationCompleted(working)) {
      const baseResult = baseApply(working, { backupConfirmation: backup });
      if (baseResult?.blocked) return baseResult;
    }
    const report = mergeReport(working, backup, beforeCounts);
    const protectedLengths = Object.fromEntries(["dailyGoals", "studies", "materials", "questionLogs", "questionBank", "questionBankSessions", "questionErrorNotebook", "smartReviews", "simulados", "factoryItems", "subjects"].map((key) => [key, Array.isArray(working[key]) ? working[key].length : 0]));

    const removedIds = removeHistoryFreeDuplicates(working, report);
    reschedulePcmaGoals(working, report);

    for (const [key, before] of Object.entries(protectedLengths)) {
      const after = Array.isArray(working[key]) ? working[key].length : 0;
      if (after !== before) throw new Error(`V426: coleção protegida ${key} mudou de tamanho (${before} → ${after}).`);
    }
    assertRemovedPointersClean(working, removedIds);
    report.syllabusItemsAfter = (working.syllabusItems || []).length;
    report.distinctDisciplineNamesAfter = distinctDisciplineCount(working);

    working.migrations ||= {};
    working.migrations[MIGRATION_KEY] = {
      version: VERSION,
      revisionId: REVISION_ID,
      executedAt: new Date().toISOString(),
      completed: true,
      backup: clone(backup),
      report: clone(report)
    };

    for (const key of Object.keys(targetState)) delete targetState[key];
    Object.assign(targetState, working);
    return { changed: true, blocked: false, report: clone(report) };
  }

  function reportText(report = {}) {
    const lines = [
      "V426 revisada — Relatório final",
      `Backup confirmado: ${report.backup?.fileName || "não informado"}`,
      `syllabusItems: ${report.syllabusItemsBefore ?? "?"} → ${report.syllabusItemsAfter ?? "?"}`,
      `Nomes distintos após revisão: ${report.distinctDisciplineNamesAfter ?? "?"}`,
      "",
      "Etapa B.1 — itens removidos:"
    ];
    if (!(report.duplicatesRemoved || []).length) lines.push("- nenhum");
    else for (const item of report.duplicatesRemoved) lines.push(`- ${item.subject} | ${item.discipline} | removido ${item.id}; preservado ${item.keptId}`);
    lines.push("", "Etapa B.1 — pares/grupos não removidos:");
    if (!(report.duplicatePairsNotRemoved || []).length) lines.push("- nenhum");
    else for (const item of report.duplicatePairsNotRemoved) lines.push(`- ${item.subject} | ${item.discipline} | ${item.ids.join(", ")} | ${item.reasons.join("; ")}`);
    lines.push("", "Etapa E — metas reagendadas:");
    if (!(report.goalsRescheduled || []).length) lines.push("- nenhuma");
    else for (const item of report.goalsRescheduled) lines.push(`- ${item.subject} | ${item.from} → ${item.to} | ${item.id || item.syllabusItemId}`);
    lines.push("", "Etapa E — metas não reagendadas:");
    if (!(report.goalsNotRescheduled || []).length) lines.push("- nenhuma");
    else for (const item of report.goalsNotRescheduled) lines.push(`- ${item.subject} | ${item.from} | ${(item.reasons || []).join("; ")}`);
    lines.push("", "Relatório da etapa original A/B/C/D:");
    lines.push(`- reatribuições A: ${(report.stageAReassignments || []).length}`);
    lines.push(`- fusões de peso: ${(report.weightMerges || []).length}`);
    lines.push(`- disciplinas excluídas: ${(report.excludedDisciplines || []).join("; ") || "nenhuma"}`);
    lines.push(`- configurações: ${(report.configChanges || []).map((item) => `${item.path}: ${String(item.before)}→${String(item.after)}`).join("; ") || "nenhuma"}`);
    return lines.join("\n");
  }

  async function buildAndSaveBackup(targetState) {
    if (typeof globalThis.showSaveFilePicker !== "function") throw new Error("Este navegador não permite confirmar a gravação do backup. Use Chrome/Edge desktop atualizado.");
    const exportedAt = new Date().toISOString();
    let storageValue = "";
    try { storageValue = localStorage.getItem("metasConcursoData") || ""; } catch {}
    const envelope = {
      app: "Aldus Meta",
      schema: "discipline-unification-v426-revised-pre-migration-backup",
      version: 2,
      storageKey: "metasConcursoData",
      exportedAt,
      data: clone(targetState),
      localStorage: { metasConcursoData: storageValue || JSON.stringify(targetState) }
    };
    const payload = JSON.stringify(envelope, null, 2);
    const suggestedName = `backup-metas-estudo-v426-revisada-${exportedAt.replace(/[:.]/g, "-")}.json`;
    const handle = await globalThis.showSaveFilePicker({ suggestedName, types: [{ description: "Backup JSON Aldus Meta", accept: { "application/json": [".json"] } }] });
    const writable = await handle.createWritable();
    try { await writable.write(payload); await writable.close(); } catch (error) { try { await writable.abort?.(); } catch {} throw error; }
    const file = await handle.getFile();
    const expectedBytes = new Blob([payload]).size;
    if (file.size !== expectedBytes) throw new Error(`Backup incompleto: esperado ${expectedBytes} bytes, gravado ${file.size}.`);
    if (typeof file.text === "function" && await file.text() !== payload) throw new Error("A releitura do backup divergiu do conteúdo gravado.");
    return { confirmed: true, fileName: file.name || handle.name || suggestedName, savedAt: new Date().toISOString(), bytes: file.size };
  }

  function createOrReplacePanel(alreadyBaseApplied) {
    if (typeof document === "undefined") return null;
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("section");
      panel.id = PANEL_ID;
      panel.setAttribute("role", "status");
      panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(540px,calc(100vw - 32px));max-height:72vh;overflow:auto;background:#fff;border:1px solid #c9c3b8;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.22);padding:16px;font:14px/1.45 Arial,sans-serif;color:#181818";
      document.body.appendChild(panel);
    }
    const detail = alreadyBaseApplied ? "A V426 inicial já foi aplicada. Esta revisão adiciona obrigatoriamente a limpeza B.1 e o reagendamento E." : "A revisão aplica a V426 completa e acrescenta B.1 + E na mesma transação.";
    panel.innerHTML = `<strong style="display:block;font-size:16px;margin-bottom:8px">V426 revisada — B.1 + E</strong><p style="margin:0 0 12px">${detail} Antes de qualquer nova escrita, será gravado e relido um backup JSON completo.</p><button type="button" data-v426-revision-apply style="border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer">Salvar backup e aplicar V426 revisada</button><div data-v426-revision-status style="margin-top:10px"></div>`;
    return panel;
  }

  function installWithBase(baseApi) {
    if (globalThis[INSTALL_KEY]) return true;
    if (!baseApi || typeof baseApi.apply !== "function") return false;
    globalThis[INSTALL_KEY] = true;
    const baseApply = baseApi.apply;

    function apply(targetState = {}, options = {}) {
      return applyRevision(targetState, options, baseApply);
    }

    function armBrowserMigration() {
      try {
        if (typeof state === "undefined" || !isObject(state)) return false;
        if (revisionCompleted(state)) return true;
        const panel = createOrReplacePanel(oldMigrationCompleted(state));
        if (!panel) return false;
        const button = panel.querySelector("[data-v426-revision-apply]");
        const status = panel.querySelector("[data-v426-revision-status]");
        button?.addEventListener("click", async () => {
          button.disabled = true;
          status.textContent = "Gravando e relendo o backup…";
          try {
            const backupConfirmation = await buildAndSaveBackup(state);
            if (typeof saveData !== "function") throw new Error("Função de persistência indisponível; nenhuma migração foi iniciada.");
            const before = clone(state);
            const result = apply(state, { backupConfirmation });
            if (result.blocked) throw new Error(result.reason || "Migração bloqueada.");
            try { baseApi.enforcePostMigrationPlanningProfile?.(state); saveData(); }
            catch (saveError) { for (const key of Object.keys(state)) delete state[key]; Object.assign(state, before); throw new Error(`Falha ao persistir a revisão; estado em memória restaurado. ${saveError?.message || String(saveError)}`); }
            const text = reportText(result.report);
            status.innerHTML = '<strong>V426 revisada aplicada com backup confirmado.</strong><pre data-v426-revision-report style="white-space:pre-wrap;max-height:42vh;overflow:auto;background:#f7f5f1;padding:10px;border-radius:8px"></pre><button type="button" data-v426-revision-copy style="margin-top:8px">Copiar relatório</button>';
            status.querySelector("[data-v426-revision-report]").textContent = text;
            status.querySelector("[data-v426-revision-copy]")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(text); } catch {} });
            console.info("[Aldus V426 revisada] Migração concluída", result.report);
          } catch (error) {
            status.textContent = error?.name === "AbortError" ? "Backup cancelado. Nenhum dado da revisão foi alterado." : `V426 revisada não aplicada: ${error?.message || String(error)}`;
            button.disabled = false;
          }
        });
        return true;
      } catch { return false; }
    }

    const api = Object.freeze({ ...baseApi, version: VERSION, revisionId: REVISION_ID, apply, reportText, removeHistoryFreeDuplicates, reschedulePcmaGoals, armBrowserMigration });
    globalThis[API_KEY] = api;
    globalThis.applyDisciplineUnificationV426 = apply;
    if (typeof module !== "undefined" && module.exports) module.exports = api;

    if (typeof window !== "undefined") {
      window.addEventListener("aldus:bootstrap-ready", armBrowserMigration, { once: true });
      window.addEventListener("aldus:post-bootstrap-maintenance-complete", armBrowserMigration, { once: true });
      window.addEventListener("load", armBrowserMigration, { once: true });
      try { armBrowserMigration(); } catch {}
    }
    return true;
  }

  function install() {
    const api = globalThis[API_KEY];
    if (api && api.revisionId !== REVISION_ID && typeof api.apply === "function") return installWithBase(api);
    return api?.revisionId === REVISION_ID;
  }

  if (install()) return;
  if (typeof document !== "undefined") {
    const baseScript = document.getElementById(BASE_SCRIPT_ID);
    if (baseScript) baseScript.addEventListener("load", install, { once: true });
    else {
      const script = document.createElement("script");
      script.id = BASE_SCRIPT_ID;
      script.src = "discipline-unification-v426.js?v=20260901-discipline-unification-v426";
      script.async = false;
      script.addEventListener("load", install, { once: true });
      (document.head || document.documentElement).appendChild(script);
    }
  }
})();
