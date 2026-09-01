(() => {
  "use strict";

  const VERSION = "20260901-discipline-unification-v426-revision-authoritative-r3";
  const REVISION_ID = "b1-e-20260901";
  const MIGRATION_KEY = "disciplineUnificationV426";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const INSTALL_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426_REVISION_INSTALLED__";
  const BASE_SCRIPT_ID = "aldusDisciplineUnificationV426";
  const PANEL_ID = "aldusV426MigrationPanel";
  const PCMA_ID = "pcma-2026-delegado";
  const PCPR_EXAM_DATE = "2026-10-11";
  const PLANNING_SNAPSHOT_KEY = "aldusPlanningManualGoalsV235";
  const STORAGE_KEY = "metasConcursoData";
  const VERIFY_ATTEMPTS = 28;
  const VERIFY_DELAY_MS = 50;

  const LEGACY_DISCIPLINES = new Set([
    "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE",
    "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL",
    "CRIMINOLOGIA",
    "MEDICINA LEGAL",
    "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO"
  ]);

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

  function replaceStateContents(targetState, nextState) {
    const replacement = clone(nextState);
    for (const key of Object.keys(targetState || {})) delete targetState[key];
    Object.assign(targetState, replacement);
    return targetState;
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
    const study = Number(goal?.studyActualMinutes || 0);
    const questions = Number(goal?.questionActualMinutes || 0);
    return (Number.isFinite(study) ? study : 0) + (Number.isFinite(questions) ? questions : 0);
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
      for (const [key, value] of Object.entries(signals)) if (cleanText(key) === id || referencesId(value, id)) prioritySignals += 1;
    } else if (Array.isArray(signals)) prioritySignals = countRefs(signals, id);

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
    profile.referenceCount = Object.entries(profile)
      .filter(([key]) => key !== "goalTimeMinutes")
      .reduce((sum, [, value]) => sum + Number(value || 0), 0);
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
    return (Array.isArray(state.contestSyllabusMap) ? state.contestSyllabusMap : [])
      .filter((mapping) => cleanText(mapping?.syllabusItemId) === id).length;
  }

  function duplicatePlan(state) {
    const groups = new Map();
    for (const item of Array.isArray(state.syllabusItems) ? state.syllabusItems : []) {
      const key = duplicateKey(item);
      if (!key) continue;
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    }

    const removable = [];
    const blockedGroups = [];
    for (const [key, rawGroup] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))) {
      if (rawGroup.length < 2) continue;
      const group = rawGroup.slice().sort((a, b) => cleanText(a.id).localeCompare(cleanText(b.id)));
      const profiles = new Map(group.map((item) => [cleanText(item.id), duplicateReferenceProfile(state, cleanText(item.id))]));
      const ranked = group.slice().sort((a, b) => {
        const aId = cleanText(a.id), bId = cleanText(b.id);
        const aProfile = profiles.get(aId), bProfile = profiles.get(bId);
        if (Number(Boolean(aProfile?.hasHistory)) !== Number(Boolean(bProfile?.hasHistory))) {
          return Number(Boolean(bProfile?.hasHistory)) - Number(Boolean(aProfile?.hasHistory));
        }
        const aMapped = mappingCount(state, aId) > 0, bMapped = mappingCount(state, bId) > 0;
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
        blockedGroups.push({
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
        if (id && id !== keepId) removable.push({ item, id, keepId });
      }
    }
    return { removable, blockedGroups };
  }

  function contestMappingSyncKey(mapping = {}) {
    const directId = cleanText(mapping.id || mapping.uuid || mapping.key);
    if (directId) return `contestSyllabusMap:id:${directId}`;
    return `contestSyllabusMap:fp:${cleanText(mapping.contestId)}|${cleanText(mapping.syllabusItemId)}|${cleanText(mapping.code)}`;
  }

  function ensureTombstoneCollection(state, collection) {
    state.syncTombstones ||= { schemaVersion: 1, collections: {} };
    state.syncTombstones.schemaVersion ||= 1;
    state.syncTombstones.collections ||= {};
    state.syncTombstones.collections[collection] ||= {};
    return state.syncTombstones.collections[collection];
  }

  function deviceId() {
    try { return typeof globalThis.getDeviceId === "function" ? cleanText(globalThis.getDeviceId()) : ""; }
    catch { return ""; }
  }

  function putTombstone(state, collection, key, deletedAt, reason) {
    const store = ensureTombstoneCollection(state, collection);
    const existingTime = Date.parse(store[key]?.deletedAt || "");
    const requestedTime = Date.parse(deletedAt || "");
    if (!store[key] || !Number.isFinite(existingTime) || existingTime < requestedTime) {
      store[key] = { key, collection, deletedAt, deviceId: deviceId(), reason, version: VERSION };
    }
  }

  function removeHistoryFreeDuplicates(working, report, mutationAt = new Date().toISOString()) {
    const plan = duplicatePlan(working);
    report.duplicatePairsNotRemoved.push(...plan.blockedGroups);
    const removedIds = new Set();
    for (const entry of plan.removable) {
      removedIds.add(entry.id);
      report.duplicatesRemoved.push({
        id: entry.id,
        keptId: entry.keepId,
        discipline: cleanText(entry.item.discipline),
        subject: recordSubject(entry.item),
        reason: "duplicata normalizada sem referências, histórico ou tempo"
      });
    }
    if (!removedIds.size) return [];

    const mappingsBefore = (working.contestSyllabusMap || []).filter((mapping) => removedIds.has(cleanText(mapping?.syllabusItemId)));
    working.syllabusItems = (working.syllabusItems || []).filter((item) => !removedIds.has(cleanText(item.id)));
    working.contestSyllabusMap = (working.contestSyllabusMap || []).filter((mapping) => !removedIds.has(cleanText(mapping?.syllabusItemId)));
    if (isObject(working.schedulableSettings)) for (const id of removedIds) delete working.schedulableSettings[id];

    for (const id of removedIds) putTombstone(working, "syllabusItems", `syllabusItems:id:${id}`, mutationAt, "v426-b1-duplicate-removal");
    for (const mapping of mappingsBefore) putTombstone(working, "contestSyllabusMap", contestMappingSyncKey(mapping), mutationAt, "v426-b1-mapping-removal");
    return [...removedIds].sort();
  }

  function assertRemovedPointersClean(state, ids = []) {
    const removed = new Set(ids);
    if (!removed.size) return;
    if ((state.contestSyllabusMap || []).some((mapping) => removed.has(cleanText(mapping?.syllabusItemId)))) throw new Error("V426: B.1 deixou mapeamento órfão.");
    if (isObject(state.schedulableSettings) && [...removed].some((id) => hasOwn(state.schedulableSettings, id))) throw new Error("V426: B.1 deixou schedulableSettings órfão.");
    const tombstones = state?.syncTombstones?.collections?.syllabusItems || {};
    for (const id of removed) if (!tombstones[`syllabusItems:id:${id}`]) throw new Error(`V426: B.1 não criou tombstone para ${id}.`);
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
    return new Set((state.contestSyllabusMap || [])
      .filter((mapping) => cleanText(mapping?.syllabusItemId) === id)
      .map((mapping) => cleanText(mapping?.contestId)).filter(Boolean));
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

  function previousStageEExecuted(migration = {}) {
    if (migration?.stageProgress?.E?.completed === true) return true;
    if (migration?.revisionId === REVISION_ID) return true;
    return cleanText(migration?.version).includes("discipline-unification-v426-revision-b1-e");
  }

  function priorStageEReport(migration = {}) {
    const source = isObject(migration.report) ? migration.report : {};
    return {
      goalsRescheduled: clone(source.goalsRescheduled || []),
      goalsNotRescheduled: clone(source.goalsNotRescheduled || [])
    };
  }

  function reconcilePriorStageE(working, priorMigration, report) {
    const prior = priorStageEReport(priorMigration);
    report.goalsRescheduled = prior.goalsRescheduled;
    report.goalsNotRescheduled = prior.goalsNotRescheduled;
    report.stageESkippedAsPreviouslyExecuted = true;
    report.stageERecoveredDates = [];
    report.stageERecoveryNotApplied = [];

    for (const entry of prior.goalsRescheduled) {
      const id = cleanText(entry.id);
      const to = cleanText(entry.to).slice(0, 10);
      if (!id || !to) continue;
      const goal = (working.dailyGoals || []).find((candidate) => cleanText(candidate.id) === id);
      if (!goal || goalDate(goal) === to) continue;
      const reasons = protectionReasons(goal, working);
      if (reasons.length) {
        report.stageERecoveryNotApplied.push({ id, expected: to, current: goalDate(goal), reasons });
        continue;
      }
      const from = goalDate(goal);
      setDateOnly(goal, to);
      report.stageERecoveredDates.push({ id, from, to });
    }
  }

  function namedDisciplineValues(state) {
    const values = [];
    const add = (value) => { const text = cleanText(value); if (text) values.push(text); };
    const listFields = [
      ["syllabusItems", ["discipline"]], ["dailyGoals", ["discipline", "disciplina"]],
      ["studies", ["discipline"]], ["materials", ["discipline"]],
      ["questionLogs", ["discipline", "disciplina"]], ["questionBank", ["discipline", "disciplina"]],
      ["questionErrorNotebook", ["discipline", "disciplina"]], ["factoryItems", ["disciplina"]], ["subjects", ["discipline"]]
    ];
    for (const [collection, fields] of listFields) for (const record of state?.[collection] || []) for (const field of fields) add(record?.[field]);
    for (const session of state?.questionBankSessions || []) for (const item of session?.items || []) add(item?.disciplina);
    for (const simulado of state?.simulados || []) for (const item of simulado?.disciplines || []) add(item?.discipline);
    for (const key of Object.keys(isObject(state?.disciplineWeights) ? state.disciplineWeights : {})) add(key);
    return values;
  }

  function legacyNamesRemaining(state) {
    return [...new Set(namedDisciplineValues(state).filter((name) => LEGACY_DISCIPLINES.has(name)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function distinctDisciplineCount(state) {
    return new Set((state.syllabusItems || []).map((item) => cleanText(item.discipline)).filter(Boolean)).size;
  }

  function removableDuplicateCount(state) {
    return duplicatePlan(state).removable.length;
  }

  function planningConfigSatisfied(state) {
    return Number(state?.planning?.config?.topicsPerDay) === 8 && Number(state?.planning?.config?.disciplinesPerDay) === 8;
  }

  function categoryCSatisfied(state) {
    const categories = state?.contestPlanningProfiles?.joint?.categories;
    return !isObject(categories) || Number(categories.C) === 0;
  }

  function priorStageEReportMatchesState(state, migration = {}) {
    if (!previousStageEExecuted(migration)) return true;
    for (const entry of migration?.report?.goalsRescheduled || []) {
      const id = cleanText(entry.id), to = cleanText(entry.to).slice(0, 10);
      if (!id || !to) continue;
      const goal = (state.dailyGoals || []).find((candidate) => cleanText(candidate.id) === id);
      if (goal && goalDate(goal) !== to) return false;
    }
    return true;
  }

  function revisionPostconditionsSatisfied(state, migration = state?.migrations?.[MIGRATION_KEY] || {}) {
    return legacyNamesRemaining(state).length === 0
      && removableDuplicateCount(state) === 0
      && planningConfigSatisfied(state)
      && categoryCSatisfied(state)
      && priorStageEReportMatchesState(state, migration);
  }

  function revisionCompleted(state) {
    const migration = state?.migrations?.[MIGRATION_KEY];
    if (migration?.completed !== true) return false;
    if (!revisionPostconditionsSatisfied(state, migration)) return false;
    if (migration?.version === VERSION) return migration?.verifiedPersistence === true;
    return previousStageEExecuted(migration);
  }

  function baseNeedsReconciliation(state) {
    return legacyNamesRemaining(state).length > 0 || !planningConfigSatisfied(state) || !categoryCSatisfied(state);
  }

  function recordKey(record = {}, collection = "") {
    const directId = cleanText(record.id || record.sessionId || record.uuid || record.key);
    return directId ? `${collection}:${directId}` : "";
  }

  function disciplineProjection(record = {}, collection = "") {
    if (collection === "questionBankSessions") return JSON.stringify((record.items || []).map((item) => cleanText(item?.disciplina)));
    if (collection === "simulados") return JSON.stringify((record.disciplines || []).map((item) => cleanText(item?.discipline)));
    return JSON.stringify([cleanText(record.discipline), cleanText(record.disciplina)]);
  }

  function stampBaseRewrites(beforeState, afterState, changedAt) {
    const collections = ["syllabusItems", "dailyGoals", "studies", "materials", "questionLogs", "questionBank", "questionBankSessions", "questionErrorNotebook", "simulados", "factoryItems", "subjects"];
    for (const collection of collections) {
      const beforeList = Array.isArray(beforeState?.[collection]) ? beforeState[collection] : [];
      const afterList = Array.isArray(afterState?.[collection]) ? afterState[collection] : [];
      const beforeByKey = new Map(beforeList.map((record, index) => [recordKey(record, collection) || `${collection}:index:${index}`, record]));
      afterList.forEach((record, index) => {
        const key = recordKey(record, collection) || `${collection}:index:${index}`;
        const before = beforeByKey.get(key);
        if (!before) return;
        if (disciplineProjection(before, collection) !== disciplineProjection(record, collection)) record.updatedAt = changedAt;
      });
    }
  }

  function ensurePlanningSnapshot8(state, changedAt, report) {
    state.planning ||= {};
    state.planning.config ||= {};
    const beforeTopics = Number(state.planning.config.topicsPerDay);
    const beforeDisciplines = Number(state.planning.config.disciplinesPerDay);
    state.planning.config.topicsPerDay = 8;
    state.planning.config.disciplinesPerDay = 8;
    const snapshot = { version: VERSION, disciplines: 8, topics: 8, savedAt: changedAt };
    state.planning.manualGoalsConfigV235 = snapshot;
    if (beforeTopics !== 8) report.configChanges.push({ path: "planning.config.topicsPerDay", before: Number.isFinite(beforeTopics) ? beforeTopics : null, after: 8 });
    if (beforeDisciplines !== 8) report.configChanges.push({ path: "planning.config.disciplinesPerDay", before: Number.isFinite(beforeDisciplines) ? beforeDisciplines : null, after: 8 });
    report.authoritativePlanningSnapshot = clone(snapshot);
    return snapshot;
  }

  function writePlanningSnapshotLocal(state) {
    const snapshot = state?.planning?.manualGoalsConfigV235;
    if (!isObject(snapshot) || Number(snapshot.disciplines) !== 8 || Number(snapshot.topics) !== 8) return false;
    try { localStorage.setItem(PLANNING_SNAPSHOT_KEY, JSON.stringify(snapshot)); return true; }
    catch { return false; }
  }

  function readPlanningSnapshotLocalRaw() {
    try { return localStorage.getItem(PLANNING_SNAPSHOT_KEY); }
    catch { return null; }
  }

  function restorePlanningSnapshotLocalRaw(raw) {
    try {
      if (raw === null || raw === undefined) localStorage.removeItem(PLANNING_SNAPSHOT_KEY);
      else localStorage.setItem(PLANNING_SNAPSHOT_KEY, raw);
      return true;
    } catch { return false; }
  }

  function mergeReport(state, backup, beforeCounts, priorMigration) {
    const baseReport = isObject(state?.migrations?.[MIGRATION_KEY]?.report) ? clone(state.migrations[MIGRATION_KEY].report) : {};
    return {
      ...baseReport,
      version: VERSION,
      revisionId: REVISION_ID,
      backup: clone(backup),
      previousExecution: priorMigration?.executedAt ? { version: priorMigration.version || "", executedAt: priorMigration.executedAt } : null,
      duplicatesRemoved: [],
      duplicatePairsNotRemoved: [],
      goalsRescheduled: [],
      goalsNotRescheduled: [],
      stageESkippedAsPreviouslyExecuted: false,
      stageERecoveredDates: [],
      stageERecoveryNotApplied: [],
      authoritativePlanningSnapshot: null,
      syllabusItemsBefore: beforeCounts.syllabusItems,
      syllabusItemsAfter: null,
      distinctDisciplineNamesAfter: null,
      removableDuplicatesAfter: null,
      legacyDisciplinesAfter: [],
      planningConfigAfter: null,
      persistenceEvidence: null
    };
  }

  function finalizeReportFromState(report, state, persistenceEvidence = null) {
    const finalReport = clone(report);
    finalReport.syllabusItemsAfter = (state.syllabusItems || []).length;
    finalReport.distinctDisciplineNamesAfter = distinctDisciplineCount(state);
    finalReport.removableDuplicatesAfter = removableDuplicateCount(state);
    finalReport.legacyDisciplinesAfter = legacyNamesRemaining(state);
    finalReport.planningConfigAfter = {
      topicsPerDay: Number(state?.planning?.config?.topicsPerDay),
      disciplinesPerDay: Number(state?.planning?.config?.disciplinesPerDay)
    };
    finalReport.persistenceEvidence = persistenceEvidence ? clone(persistenceEvidence) : null;
    return finalReport;
  }

  function reportMatchesState(report, state) {
    return Number(report?.syllabusItemsAfter) === (state.syllabusItems || []).length
      && Number(report?.distinctDisciplineNamesAfter) === distinctDisciplineCount(state)
      && Number(report?.removableDuplicatesAfter) === removableDuplicateCount(state)
      && Number(report?.planningConfigAfter?.topicsPerDay) === Number(state?.planning?.config?.topicsPerDay)
      && Number(report?.planningConfigAfter?.disciplinesPerDay) === Number(state?.planning?.config?.disciplinesPerDay)
      && JSON.stringify(report?.legacyDisciplinesAfter || []) === JSON.stringify(legacyNamesRemaining(state));
  }

  function applyRevision(targetState, options, baseApply) {
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (revisionCompleted(targetState)) return { changed: false, blocked: false, repeated: true, report: clone(targetState.migrations[MIGRATION_KEY].report || {}) };
    const existingMigration = targetState?.migrations?.[MIGRATION_KEY];
    if (existingMigration?.version === VERSION
      && existingMigration?.completed === false
      && revisionPostconditionsSatisfied(targetState, existingMigration)) {
      return {
        changed: false, blocked: false, repeated: true, pendingPersistence: true,
        removedIds: clone(existingMigration?.stageProgress?.B1?.removedIds || []),
        report: clone(existingMigration.report || {})
      };
    }
    const backup = options?.backupConfirmation;
    if (!backup?.confirmed || !cleanText(backup.fileName)) return { changed: false, blocked: true, reason: "backup-required" };

    const beforeCounts = { syllabusItems: (targetState.syllabusItems || []).length, dailyGoals: (targetState.dailyGoals || []).length };
    const priorMigration = clone(targetState?.migrations?.[MIGRATION_KEY] || {});
    const working = clone(targetState);
    const mutationAt = new Date().toISOString();

    if (baseNeedsReconciliation(working) || priorMigration.completed !== true) {
      const beforeBase = clone(working);
      working.migrations ||= {};
      if (working.migrations[MIGRATION_KEY]) working.migrations[MIGRATION_KEY].completed = false;
      const baseResult = baseApply(working, { backupConfirmation: backup });
      if (baseResult?.blocked) return baseResult;
      stampBaseRewrites(beforeBase, working, mutationAt);
    }

    const report = mergeReport(working, backup, beforeCounts, priorMigration);
    const protectedLengths = Object.fromEntries(["dailyGoals", "studies", "materials", "questionLogs", "questionBank", "questionBankSessions", "questionErrorNotebook", "smartReviews", "simulados", "factoryItems", "subjects"].map((key) => [key, Array.isArray(working[key]) ? working[key].length : 0]));

    const removedIds = removeHistoryFreeDuplicates(working, report, mutationAt);
    if (previousStageEExecuted(priorMigration)) reconcilePriorStageE(working, priorMigration, report);
    else reschedulePcmaGoals(working, report);
    ensurePlanningSnapshot8(working, mutationAt, report);

    for (const [key, before] of Object.entries(protectedLengths)) {
      const after = Array.isArray(working[key]) ? working[key].length : 0;
      if (after !== before) throw new Error(`V426: coleção protegida ${key} mudou de tamanho (${before} → ${after}).`);
    }
    assertRemovedPointersClean(working, removedIds);

    const stageProgress = {
      base: { completed: legacyNamesRemaining(working).length === 0 && categoryCSatisfied(working) },
      B1: { completed: removableDuplicateCount(working) === 0, removedIds: clone(removedIds) },
      D: { completed: planningConfigSatisfied(working) },
      E: {
        completed: true,
        repeated: previousStageEExecuted(priorMigration),
        source: previousStageEExecuted(priorMigration) ? "prior-execution" : "current-execution"
      }
    };

    const provisionalReport = finalizeReportFromState(report, working);
    working.migrations ||= {};
    working.migrations[MIGRATION_KEY] = {
      version: VERSION,
      revisionId: REVISION_ID,
      executedAt: mutationAt,
      completed: false,
      verifiedPersistence: false,
      backup: clone(backup),
      stageProgress,
      report: clone(provisionalReport)
    };

    if (!revisionPostconditionsSatisfied(working, working.migrations[MIGRATION_KEY])) {
      throw new Error("V426: pós-condições da revisão falharam antes da persistência.");
    }
    replaceStateContents(targetState, working);
    return { changed: true, blocked: false, pendingPersistence: true, removedIds, report: clone(provisionalReport) };
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function readPersistedState() {
    try {
      if (typeof globalThis.loadStateFromIndexedDB === "function") {
        const record = await globalThis.loadStateFromIndexedDB();
        if (record?.data && isObject(record.data)) return { source: "indexedDB", state: clone(record.data) };
      }
    } catch {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { source: "localStorage", state: JSON.parse(raw) };
    } catch {}
    return null;
  }

  async function waitForPersistedEvidence(expectedCompleted) {
    let last = null;
    for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
      last = await readPersistedState();
      const migration = last?.state?.migrations?.[MIGRATION_KEY];
      if (migration?.version === VERSION
        && migration?.completed === expectedCompleted
        && revisionPostconditionsSatisfied(last.state, migration)
        && reportMatchesState(migration.report || {}, last.state)) {
        return {
          source: last.source,
          attempt: attempt + 1,
          verifiedAt: new Date().toISOString(),
          state: last.state
        };
      }
      await wait(VERIFY_DELAY_MS);
    }
    const migration = last?.state?.migrations?.[MIGRATION_KEY];
    throw new Error(`V426: a releitura persistida não confirmou o estado esperado (fonte=${last?.source || "indisponível"}, completed=${String(migration?.completed)}).`);
  }

  async function saveWithoutDerivedRefresh() {
    if (typeof globalThis.saveData !== "function") throw new Error("Função de persistência indisponível; nenhuma migração foi iniciada.");
    const result = await Promise.resolve(globalThis.saveData({ markLocalChange: true, skipDerivedRefresh: true, reason: "v426-authoritative-r3" }));
    if (result === false) throw new Error("saveData informou falha ao persistir a V426.");
    return result;
  }

  async function persistAndVerify(targetState, operationResult) {
    if (!operationResult?.pendingPersistence) throw new Error("V426: resultado não está preparado para persistência verificada.");
    writePlanningSnapshotLocal(targetState);
    await saveWithoutDerivedRefresh();

    const provisional = await waitForPersistedEvidence(false);
    const persistedWorking = clone(provisional.state);
    const migration = persistedWorking.migrations[MIGRATION_KEY];
    const evidence = {
      provisionalSource: provisional.source,
      provisionalVerifiedAt: provisional.verifiedAt,
      provisionalReadAttempt: provisional.attempt
    };
    const finalReport = finalizeReportFromState(migration.report || operationResult.report || {}, persistedWorking, evidence);
    migration.report = finalReport;
    migration.completed = true;
    migration.verifiedPersistence = true;
    migration.verifiedAt = new Date().toISOString();
    migration.stageProgress ||= {};
    migration.stageProgress.persistence = { completed: true, provisionalSource: provisional.source, verifiedAt: migration.verifiedAt };

    replaceStateContents(targetState, persistedWorking);
    writePlanningSnapshotLocal(targetState);
    await saveWithoutDerivedRefresh();

    const finalRead = await waitForPersistedEvidence(true);
    const finalState = clone(finalRead.state);
    replaceStateContents(targetState, finalState);
    return {
      changed: true,
      blocked: false,
      persisted: true,
      source: finalRead.source,
      verifiedAt: finalRead.verifiedAt,
      report: clone(finalState.migrations[MIGRATION_KEY].report)
    };
  }

  function reportText(report = {}) {
    const validation = report.weightValidation || {};
    const lines = [
      "V426 revisada — Relatório final verificado",
      `Backup confirmado: ${report.backup?.fileName || "não informado"}`,
      `syllabusItems: ${report.syllabusItemsBefore ?? "?"} → ${report.syllabusItemsAfter ?? "?"}`,
      `Nomes distintos após revisão: ${report.distinctDisciplineNamesAfter ?? "?"}`,
      `Duplicatas removíveis restantes: ${report.removableDuplicatesAfter ?? "?"}`,
      `Legados restantes: ${(report.legacyDisciplinesAfter || []).join("; ") || "nenhum"}`,
      `Planejamento persistido: ${report.planningConfigAfter?.disciplinesPerDay ?? "?"} disciplina(s) / ${report.planningConfigAfter?.topicsPerDay ?? "?"} tópico(s)`,
      `Fonte verificada: ${report.persistenceEvidence?.finalSource || report.persistenceEvidence?.provisionalSource || "não informada"}`,
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
    if (report.stageESkippedAsPreviouslyExecuted) lines.push("- Etapa E não foi executada novamente; resultado anterior foi preservado.");
    lines.push("", "Etapa E — metas não reagendadas:");
    if (!(report.goalsNotRescheduled || []).length) lines.push("- nenhuma");
    else for (const item of report.goalsNotRescheduled) lines.push(`- ${item.subject} | ${item.from} | ${(item.reasons || []).join("; ")}`);
    lines.push("", "Etapas A/B/C/D:");
    lines.push(`- reatribuições A nesta execução: ${(report.stageAReassignments || []).length}`);
    lines.push(`- fusões de peso nesta execução: ${(report.weightMerges || []).length}`);
    lines.push(`- disciplinas excluídas: ${(report.excludedDisciplines || []).join("; ") || "nenhuma"}`);
    lines.push("", "Validação de disciplineWeights — pós-condição:");
    lines.push(`- disciplinas legítimas sem item de edital: ${(validation.legitimateNonSyllabusWeights || []).join("; ") || "nenhuma"}`);
    lines.push(`- chaves órfãs preexistentes não relacionadas: ${(validation.unrelatedPreexistingOrphanWeights || []).join("; ") || "nenhuma"}`);
    lines.push(`- inválidas entre disciplinas tocadas: ${(validation.touchedInvalidWeights || []).join("; ") || "nenhuma"}`);
    return lines.join("\n");
  }

  async function buildAndSaveBackup(targetState) {
    if (typeof globalThis.showSaveFilePicker !== "function") throw new Error("Este navegador não permite confirmar a gravação do backup. Use Chrome/Edge desktop atualizado.");
    const exportedAt = new Date().toISOString();
    let storageValue = "";
    try { storageValue = localStorage.getItem(STORAGE_KEY) || ""; } catch {}
    const envelope = {
      app: "Aldus Meta",
      schema: "discipline-unification-v426-revised-pre-migration-backup",
      version: 3,
      storageKey: STORAGE_KEY,
      exportedAt,
      data: clone(targetState),
      localStorage: { [STORAGE_KEY]: storageValue || JSON.stringify(targetState) }
    };
    const payload = JSON.stringify(envelope, null, 2);
    const suggestedName = `backup-metas-estudo-v426-revisada-${exportedAt.replace(/[:.]/g, "-")}.json`;
    const handle = await globalThis.showSaveFilePicker({ suggestedName, types: [{ description: "Backup JSON Aldus Meta", accept: { "application/json": [".json"] } }] });
    const writable = await handle.createWritable();
    try { await writable.write(payload); await writable.close(); }
    catch (error) { try { await writable.abort?.(); } catch {} throw error; }
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
      panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(560px,calc(100vw - 32px));max-height:72vh;overflow:auto;background:#fff;border:1px solid #c9c3b8;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.22);padding:16px;font:14px/1.45 Arial,sans-serif;color:#181818";
      document.body.appendChild(panel);
    }
    const detail = alreadyBaseApplied
      ? "A V426 anterior foi detectada. A validação agora compara o marcador com o estado real e reaplica somente as etapas cuja pós-condição não foi persistida; a Etapa E não é executada duas vezes."
      : "A revisão aplica a V426 completa em clone, grava sem atualização derivada e só marca completed=true depois de reler o estado persistido.";
    panel.innerHTML = `<strong style="display:block;font-size:16px;margin-bottom:8px">V426 revisada — persistência verificada</strong><p style="margin:0 0 12px">${detail} Antes de qualquer nova escrita, será gravado e relido um backup JSON completo.</p><button type="button" data-v426-revision-apply style="border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer">Salvar backup e aplicar V426 revisada</button><div data-v426-revision-status style="margin-top:10px"></div>`;
    return panel;
  }

  function renderAbortLock(baseApi, panel) {
    if (typeof baseApi?.migrationAbortLockApplies !== "function" || !baseApi.migrationAbortLockApplies(VERSION)) return false;
    const lock = typeof baseApi.readMigrationAbortLock === "function" ? baseApi.readMigrationAbortLock() : null;
    const button = panel?.querySelector?.("[data-v426-revision-apply]");
    const status = panel?.querySelector?.("[data-v426-revision-status]");
    if (button) { button.disabled = true; button.textContent = "V426 aguardando correção publicada"; }
    if (status) status.textContent = `A tentativa anterior abortou depois do backup ${lock?.backupFileName || "confirmado"}. Esta versão não solicitará outro backup. A tentativa será liberada automaticamente quando uma versão corrigida for publicada.`;
    return true;
  }

  function installWithBase(baseApi) {
    if (globalThis[INSTALL_KEY]) return true;
    if (!baseApi || typeof baseApi.apply !== "function") return false;
    globalThis[INSTALL_KEY] = true;
    const baseApply = baseApi.apply;

    function apply(targetState = {}, options = {}) {
      return applyRevision(targetState, options, baseApply);
    }

    async function runBrowserMigration(targetState, backupConfirmation) {
      const before = clone(targetState);
      const beforePlanningSnapshotRaw = readPlanningSnapshotLocalRaw();
      const working = clone(targetState);
      try {
        const operation = apply(working, { backupConfirmation });
        if (operation.blocked) throw new Error(operation.reason || "Migração bloqueada.");
        replaceStateContents(targetState, working);
        const persisted = await persistAndVerify(targetState, operation);
        baseApi.clearMigrationAbortLock?.();
        return persisted;
      } catch (error) {
        replaceStateContents(targetState, before);
        restorePlanningSnapshotLocalRaw(beforePlanningSnapshotRaw);
        try {
          if (typeof globalThis.saveData === "function") await Promise.resolve(globalThis.saveData({ markLocalChange: true, skipDerivedRefresh: true, reason: "v426-rollback-r3" }));
        } catch {}
        throw error;
      }
    }

    function armBrowserMigration() {
      try {
        if (typeof state === "undefined" || !isObject(state)) return false;
        if (revisionCompleted(state)) {
          baseApi.clearMigrationAbortLock?.();
          return true;
        }
        const panel = createOrReplacePanel(Boolean(state?.migrations?.[MIGRATION_KEY]?.completed));
        if (!panel) return false;
        if (renderAbortLock(baseApi, panel)) return true;
        const button = panel.querySelector("[data-v426-revision-apply]");
        const status = panel.querySelector("[data-v426-revision-status]");
        button?.addEventListener("click", async () => {
          button.disabled = true;
          status.textContent = "Gravando e relendo o backup…";
          let backupConfirmation = null;
          try {
            backupConfirmation = await buildAndSaveBackup(state);
            status.textContent = "Aplicando em clone e verificando a persistência…";
            const result = await runBrowserMigration(state, backupConfirmation);
            const text = reportText(result.report);
            status.innerHTML = '<strong>V426 revisada aplicada e relida do estado persistido.</strong><pre data-v426-revision-report style="white-space:pre-wrap;max-height:42vh;overflow:auto;background:#f7f5f1;padding:10px;border-radius:8px"></pre><button type="button" data-v426-revision-copy style="margin-top:8px">Copiar relatório</button>';
            status.querySelector("[data-v426-revision-report]").textContent = text;
            status.querySelector("[data-v426-revision-copy]")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(text); } catch {} });
            console.info("[Aldus V426 revisada] Persistência verificada", result.report);
          } catch (error) {
            const cancelled = error?.name === "AbortError";
            if (!cancelled && backupConfirmation?.confirmed) baseApi.markMigrationAbort?.(error, backupConfirmation, VERSION);
            status.textContent = cancelled ? "Backup cancelado. Nenhum dado da revisão foi alterado." : `V426 revisada não aplicada: ${error?.message || String(error)}`;
            if (!renderAbortLock(baseApi, panel)) button.disabled = false;
          }
        });
        return true;
      } catch { return false; }
    }

    const api = Object.freeze({
      ...baseApi,
      version: VERSION,
      revisionId: REVISION_ID,
      apply,
      reportText,
      removeHistoryFreeDuplicates,
      reschedulePcmaGoals,
      revisionPostconditionsSatisfied,
      revisionCompleted,
      removableDuplicateCount,
      legacyNamesRemaining,
      ensurePlanningSnapshot8,
      writePlanningSnapshotLocal,
      readPlanningSnapshotLocalRaw,
      restorePlanningSnapshotLocalRaw,
      finalizeReportFromState,
      reportMatchesState,
      persistAndVerify,
      runBrowserMigration,
      previousStageEExecuted,
      armBrowserMigration
    });
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
    if (api?.revisionId === REVISION_ID && api?.version === VERSION) return true;
    if (api?.revisionId === REVISION_ID && typeof api?.__aldusOriginalBaseApply === "function") return installWithBase(api);
    return false;
  }

  if (install()) return;
  if (typeof document !== "undefined") {
    const baseScript = document.getElementById(BASE_SCRIPT_ID);
    if (baseScript) baseScript.addEventListener("load", install, { once: true });
    else {
      const script = document.createElement("script");
      script.id = BASE_SCRIPT_ID;
      script.src = "discipline-unification-v426.js?v=20260901-discipline-unification-v426-postcondition-r2";
      script.async = false;
      script.addEventListener("load", install, { once: true });
      (document.head || document.documentElement).appendChild(script);
    }
  }
})();