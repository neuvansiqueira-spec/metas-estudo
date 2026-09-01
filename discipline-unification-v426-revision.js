(() => {
  "use strict";

  const VERSION = "20260901-discipline-unification-v426-revision-persistence-r3";
  const REVISION_ID = "b1-e-20260901";
  const MIGRATION_KEY = "disciplineUnificationV426";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const INSTALL_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426_REVISION_INSTALLED__";
  const PANEL_ID = "aldusV426MigrationPanel";
  const PCMA_ID = "pcma-2026-delegado";
  const PCPR_EXAM_DATE = "2026-10-11";
  const MANUAL_GOALS_STORAGE_KEY = "aldusPlanningManualGoalsV235";

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
  const cleanText = (v) => String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const canonical = (v) => cleanText(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const recordSubject = (r = {}) => cleanText(r.subject || r.assunto || r.topic || r.topico || r.title || r.name || "");
  const recordLabel = (r = {}) => recordSubject(r) || cleanText(r.id || "(sem assunto)");
  const recordSyllabusId = (r = {}) => cleanText(r.syllabusItemId || r.syllabus_item_id || "");

  function referencesId(record, id, material = false) {
    if (!record || !id) return false;
    if (recordSyllabusId(record) === id) return true;
    if (material && cleanText(record.parentSyllabusItemId) === id) return true;
    return material && Array.isArray(record.syllabusItemIds) && record.syllabusItemIds.some((v) => cleanText(v) === id);
  }
  function goalActualMinutes(goal = {}) {
    try { if (typeof globalThis.goalTotalActualMinutes === "function") { const n = Number(globalThis.goalTotalActualMinutes(goal)); if (n > 0) return n; } } catch {}
    for (const f of ["actualMinutes", "actual_minutes", "elapsedMinutes", "timeSpentMinutes", "tempoRealMinutos", "completedMinutes"]) { const n = Number(goal?.[f]); if (n > 0) return n; }
    for (const f of ["elapsedSeconds", "timerSeconds", "secondsSpent", "studySeconds", "totalSeconds"]) { const n = Number(goal?.[f]); if (n > 0) return n / 60; }
    return Math.max(0, Number(goal.studyActualMinutes) || 0) + Math.max(0, Number(goal.questionActualMinutes) || 0);
  }
  const countRefs = (list, id, material = false) => (list || []).reduce((n, r) => n + (referencesId(r, id, material) ? 1 : 0), 0);
  function duplicateReferenceProfile(state, id) {
    const linkedGoals = (state.dailyGoals || []).filter((g) => referencesId(g, id));
    let sessions = 0; for (const s of state.questionBankSessions || []) for (const item of s?.items || []) if (referencesId(item, id)) sessions += 1;
    let signals = 0; const sig = state?.planning?.topicPrioritySignalsV155;
    if (isObject(sig)) for (const [k, v] of Object.entries(sig)) if (cleanText(k) === id || referencesId(v, id)) signals += 1;
    else if (Array.isArray(sig)) signals = countRefs(sig, id);
    const p = { dailyGoals: linkedGoals.length, studies: countRefs(state.studies, id), materials: countRefs(state.materials, id, true), questionLogs: countRefs(state.questionLogs, id), questionBank: countRefs(state.questionBank, id), questionBankSessions: sessions, questionErrorNotebook: countRefs(state.questionErrorNotebook, id), smartReviews: countRefs(state.smartReviews, id), prioritySignals: signals, goalTimeMinutes: linkedGoals.reduce((n, g) => n + goalActualMinutes(g), 0) };
    p.referenceCount = Object.entries(p).filter(([k]) => k !== "goalTimeMinutes").reduce((n, [, v]) => n + Number(v || 0), 0);
    p.hasHistory = p.referenceCount > 0 || p.goalTimeMinutes > 0; return p;
  }
  function duplicateBlockers(p = {}) {
    const out = []; for (const [k, v] of Object.entries(p)) if (k !== "referenceCount" && k !== "hasHistory" && Number(v) > 0) out.push(`${k}=${v}`); return out;
  }
  function duplicateKey(item = {}) { const d = canonical(item.discipline), s = canonical(recordSubject(item)); return d && s ? `${d}\u0000${s}` : ""; }
  function mappingCount(state, id) { return (state.contestSyllabusMap || []).filter((m) => cleanText(m?.syllabusItemId) === id).length; }

  function registerDeletionTombstones(working, removedIds, previousSyncSnapshot, changedAt) {
    if (!removedIds.length) return;
    try {
      if (previousSyncSnapshot && typeof globalThis.syncTrackCollectionMutations === "function") {
        globalThis.syncTrackCollectionMutations(previousSyncSnapshot, working, changedAt);
        return;
      }
    } catch {}
    working.syncTombstones ||= { schemaVersion: 1, collections: {} };
    working.syncTombstones.schemaVersion = 1;
    working.syncTombstones.collections ||= {};
    working.syncTombstones.collections.syllabusItems ||= {};
    for (const id of removedIds) {
      const key = `syllabusItems:id:${id}`;
      working.syncTombstones.collections.syllabusItems[key] = { key, collection: "syllabusItems", deletedAt: changedAt, deviceId: (() => { try { return typeof globalThis.getDeviceId === "function" ? globalThis.getDeviceId() : ""; } catch { return ""; } })(), reason: "discipline-unification-v426-b1", version: VERSION };
    }
  }

  function removeHistoryFreeDuplicates(working, report) {
    const previousSyncSnapshot = (() => { try { return typeof globalThis.syncSnapshotCollections === "function" ? globalThis.syncSnapshotCollections(working) : null; } catch { return null; } })();
    const groups = new Map();
    for (const item of working.syllabusItems || []) { const key = duplicateKey(item); if (!key) continue; const list = groups.get(key) || []; list.push(item); groups.set(key, list); }
    const removedIds = new Set();
    for (const [key, raw] of groups) {
      if (raw.length < 2) continue;
      const group = raw.slice().sort((a, b) => cleanText(a.id).localeCompare(cleanText(b.id)));
      const profiles = new Map(group.map((i) => [cleanText(i.id), duplicateReferenceProfile(working, cleanText(i.id))]));
      const ranked = group.slice().sort((a, b) => {
        const ai = cleanText(a.id), bi = cleanText(b.id), ap = profiles.get(ai), bp = profiles.get(bi);
        if (Number(Boolean(ap?.hasHistory)) !== Number(Boolean(bp?.hasHistory))) return Number(Boolean(bp?.hasHistory)) - Number(Boolean(ap?.hasHistory));
        const am = mappingCount(working, ai) > 0, bm = mappingCount(working, bi) > 0;
        if (Number(am) !== Number(bm)) return Number(bm) - Number(am);
        return ai.localeCompare(bi);
      });
      const keep = ranked[0], keepId = cleanText(keep?.id), candidates = ranked.slice(1);
      const blocked = candidates.map((i) => ({ id: cleanText(i.id), blockers: duplicateBlockers(profiles.get(cleanText(i.id))) })).filter((x) => x.blockers.length);
      if (!keepId || blocked.length) {
        report.duplicatePairsNotRemoved.push({ key, discipline: cleanText(keep?.discipline || group[0]?.discipline), subject: recordSubject(keep || group[0]), ids: group.map((i) => cleanText(i.id)), keptCandidateId: keepId, reasons: blocked.length ? blocked.map((x) => `${x.id}: ${x.blockers.join(", ")}`) : ["grupo sem item preservável"] });
        continue;
      }
      for (const item of candidates) { const id = cleanText(item.id); if (!id || id === keepId) continue; removedIds.add(id); report.duplicatesRemoved.push({ id, keptId: keepId, discipline: cleanText(item.discipline), subject: recordSubject(item), reason: "duplicata normalizada sem referências, histórico ou tempo" }); }
    }
    const ids = [...removedIds];
    if (ids.length) {
      working.syllabusItems = (working.syllabusItems || []).filter((i) => !removedIds.has(cleanText(i.id)));
      working.contestSyllabusMap = (working.contestSyllabusMap || []).filter((m) => !removedIds.has(cleanText(m?.syllabusItemId)));
      if (isObject(working.schedulableSettings)) for (const id of ids) delete working.schedulableSettings[id];
      registerDeletionTombstones(working, ids, previousSyncSnapshot, new Date().toISOString());
    }
    return ids.sort();
  }
  function previewRemovableDuplicates(state) {
    const copy = clone(state), report = { duplicatesRemoved: [], duplicatePairsNotRemoved: [] };
    return removeHistoryFreeDuplicates(copy, report).length;
  }
  function assertRemovedPointersClean(state, ids = []) {
    const set = new Set(ids); if (!set.size) return;
    if ((state.contestSyllabusMap || []).some((m) => set.has(cleanText(m?.syllabusItemId)))) throw new Error("V426: B.1 deixou mapeamento órfão.");
    if (isObject(state.schedulableSettings) && [...set].some((id) => hasOwn(state.schedulableSettings, id))) throw new Error("V426: B.1 deixou schedulableSettings órfão.");
  }

  const goalDate = (g = {}) => cleanText(g.date || g.data || "").slice(0, 10);
  function goalHistoryCount(g = {}) { const h = g.history || g.historico; return Array.isArray(h) ? h.length : h ? 1 : 0; }
  function isManualGoal(g = {}) { try { if (typeof globalThis.isManualDailyGoal === "function") return Boolean(globalThis.isManualDailyGoal(g)); } catch {} return !["edital verticalizado", "planejamento", "plano do dia"].includes(canonical(g.origin || g.origem || "manual")); }
  function isCompletedGoal(g = {}) { try { if (typeof globalThis.isGoalDone === "function" && globalThis.isGoalDone(g)) return true; } catch {} return ["concluido", "concluida", "estudado", "dominado"].includes(canonical(g.status)); }
  function isStartedGoal(g = {}) { try { if (typeof globalThis.isGoalInProgress === "function" && globalThis.isGoalInProgress(g)) return true; } catch {} return ["em andamento", "iniciado", "iniciada"].includes(canonical(g.status)) || Boolean(g.startedAt || g.started_at); }
  function isDailyPieceGoal(g = {}, state = {}) { if (g.fixedDailyPieceV183 === true || canonical(g.origin || g.origem) === "planejamento peca diaria") return true; const id = recordSyllabusId(g); return Boolean(id) && (state.contestSyllabusMap || []).some((m) => cleanText(m?.syllabusItemId) === id && canonical(m?.classification || m?.category) === "piece"); }
  function protectionReasons(g, state) { const r = []; if (isManualGoal(g)) r.push("meta manual"); if (isCompletedGoal(g)) r.push("meta concluída"); if (isStartedGoal(g)) r.push("meta iniciada"); if (goalActualMinutes(g) > 0) r.push("meta com tempo registrado"); if (goalHistoryCount(g) > 0) r.push("meta com histórico"); if (isDailyPieceGoal(g, state)) r.push("peça diária"); try { if (typeof globalThis.isProtectedDailyGoal === "function" && globalThis.isProtectedDailyGoal(g) && !r.length) r.push("meta protegida pelo Plano do Dia"); } catch {} return r; }
  function contestIdsForItem(state, id) { return new Set((state.contestSyllabusMap || []).filter((m) => cleanText(m?.syllabusItemId) === id).map((m) => cleanText(m?.contestId)).filter(Boolean)); }
  function mapsExclusivelyToPcma(state, id) { const ids = contestIdsForItem(state, id); return ids.size === 1 && ids.has(PCMA_ID); }
  function setDateOnly(goal, date) { if (hasOwn(goal, "date")) goal.date = date; if (hasOwn(goal, "data")) goal.data = date; if (!hasOwn(goal, "date") && !hasOwn(goal, "data")) goal.date = date; }
  function reschedulePcmaGoals(working, report) {
    const candidates = (working.dailyGoals || []).filter((g) => goalDate(g) && goalDate(g) <= PCPR_EXAM_DATE && contestIdsForItem(working, recordSyllabusId(g)).has(PCMA_ID)).slice().sort((a, b) => goalDate(a).localeCompare(goalDate(b)) || cleanText(a.id).localeCompare(cleanText(b.id)));
    const needFinder = candidates.some((g) => mapsExclusivelyToPcma(working, recordSyllabusId(g)) && !protectionReasons(g, working).length);
    if (needFinder && typeof globalThis.nextReplacementDateV158 !== "function") throw new Error("V426: nextReplacementDateV158 indisponível.");
    for (const goal of candidates) {
      const itemId = recordSyllabusId(goal), base = { id: cleanText(goal.id), syllabusItemId: itemId, subject: recordLabel(goal), from: goalDate(goal) };
      if (!mapsExclusivelyToPcma(working, itemId)) { report.goalsNotRescheduled.push({ ...base, reasons: ["conteúdo comum PCPR/PCMA ou mapeamento não exclusivo"] }); continue; }
      const reasons = protectionReasons(goal, working); if (reasons.length) { report.goalsNotRescheduled.push({ ...base, reasons }); continue; }
      const next = cleanText(globalThis.nextReplacementDateV158(working, goal, PCPR_EXAM_DATE));
      if (!next || next <= PCPR_EXAM_DATE) { report.goalsNotRescheduled.push({ ...base, reasons: ["nenhuma data futura segura encontrada"] }); continue; }
      setDateOnly(goal, next); report.goalsRescheduled.push({ ...base, to: next });
    }
  }

  function legacyStageECompleted(migration = {}) {
    if (migration?.stages?.E?.completed === true) return true;
    const report = migration?.report;
    return migration?.completed === true && migration?.revisionId === REVISION_ID && Array.isArray(report?.goalsRescheduled) && Array.isArray(report?.goalsNotRescheduled);
  }
  function applyPlanningAuthority(targetState) {
    const api = globalThis.__ALDUS_PLANNING_INTEGRITY_V235__;
    if (typeof window !== "undefined" && typeof api?.recordManualCount !== "function") throw new Error("V426: API recordManualCount do planejamento indisponível.");
    if (typeof api?.recordManualCount === "function") {
      const snap = api.recordManualCount(8, 8, targetState);
      if (!snap || Number(snap.disciplines) !== 8 || Number(snap.topics) !== 8) throw new Error("V426: recordManualCount não confirmou 8/8.");
    } else {
      targetState.planning ||= {}; targetState.planning.config ||= {}; targetState.planning.config.disciplinesPerDay = 8; targetState.planning.config.topicsPerDay = 8;
    }
  }
  function planningAuthorityStatus(state) {
    let stored = null; try { stored = JSON.parse(localStorage.getItem(MANUAL_GOALS_STORAGE_KEY) || "null"); } catch {}
    return { configDisciplines: Number(state?.planning?.config?.disciplinesPerDay), configTopics: Number(state?.planning?.config?.topicsPerDay), snapshotDisciplines: Number(state?.planning?.manualGoalsConfigV235?.disciplines), snapshotTopics: Number(state?.planning?.manualGoalsConfigV235?.topics), localDisciplines: Number(stored?.disciplines), localTopics: Number(stored?.topics) };
  }
  function assertPlanningAuthority(state) {
    if (typeof localStorage === "undefined") return true;
    const p = planningAuthorityStatus(state);
    const ok = p.configDisciplines === 8 && p.configTopics === 8 && p.snapshotDisciplines === 8 && p.snapshotTopics === 8 && p.localDisciplines === 8 && p.localTopics === 8;
    if (!ok) throw new Error(`V426: pós-condição de planejamento divergente (${JSON.stringify(p)}).`);
    return true;
  }
  function distinctDisciplineCount(state) { return new Set((state.syllabusItems || []).map((i) => cleanText(i.discipline)).filter(Boolean)).size; }
  function revisionPostConditionsSatisfied(state, baseApi) {
    try {
      if (typeof baseApi?.basePostConditionsSatisfied === "function" && !baseApi.basePostConditionsSatisfied(state)) return false;
      if (previewRemovableDuplicates(state) !== 0) return false;
      assertPlanningAuthority(state);
      const m = state?.migrations?.[MIGRATION_KEY];
      return m?.stages?.B1?.completed === true && m?.stages?.E?.completed === true;
    } catch { return false; }
  }

  function mergeReport(state, backup, beforeCounts, priorMigration) {
    const baseReport = isObject(state?.migrations?.[MIGRATION_KEY]?.report) ? clone(state.migrations[MIGRATION_KEY].report) : {};
    const priorReport = isObject(priorMigration?.report) ? priorMigration.report : {};
    return { ...baseReport, version: VERSION, revisionId: REVISION_ID, backup: clone(backup), duplicatesRemoved: [], duplicatePairsNotRemoved: [], goalsRescheduled: [], goalsNotRescheduled: [], syllabusItemsBefore: beforeCounts.syllabusItems, syllabusItemsAfter: null, distinctDisciplineNamesAfter: null, persistenceVerification: null, priorStageERecovered: legacyStageECompleted(priorMigration), priorGoalsRescheduled: clone(priorReport.goalsRescheduled || []), priorGoalsNotRescheduled: clone(priorReport.goalsNotRescheduled || []) };
  }

  function applyRevision(targetState, options, baseApi) {
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (revisionPostConditionsSatisfied(targetState, baseApi)) return { changed: false, blocked: false, repeated: true, report: clone(targetState.migrations[MIGRATION_KEY].report || {}) };
    const backup = options?.backupConfirmation; if (!backup?.confirmed || !cleanText(backup.fileName)) return { changed: false, blocked: true, reason: "backup-required" };
    const priorMigration = clone(targetState?.migrations?.[MIGRATION_KEY] || {}), priorEComplete = legacyStageECompleted(priorMigration);
    const beforeCounts = { syllabusItems: (targetState.syllabusItems || []).length, dailyGoals: (targetState.dailyGoals || []).length };
    const working = clone(targetState);
    if (typeof baseApi?.basePostConditionsSatisfied !== "function" || !baseApi.basePostConditionsSatisfied(working)) {
      const baseResult = baseApi.apply(working, { backupConfirmation: backup }); if (baseResult?.blocked) return baseResult;
    }
    applyPlanningAuthority(working);
    const report = mergeReport(working, backup, beforeCounts, priorMigration);
    const protectedLengths = Object.fromEntries(["dailyGoals", "studies", "materials", "questionLogs", "questionBank", "questionBankSessions", "questionErrorNotebook", "smartReviews", "simulados", "factoryItems", "subjects"].map((k) => [k, Array.isArray(working[k]) ? working[k].length : 0]));
    const removedIds = removeHistoryFreeDuplicates(working, report);
    if (priorEComplete) { report.goalsRescheduled = clone(priorMigration.report?.goalsRescheduled || []); report.goalsNotRescheduled = clone(priorMigration.report?.goalsNotRescheduled || []); }
    else reschedulePcmaGoals(working, report);
    for (const [k, before] of Object.entries(protectedLengths)) if ((Array.isArray(working[k]) ? working[k].length : 0) !== before) throw new Error(`V426: coleção protegida ${k} mudou de tamanho.`);
    assertRemovedPointersClean(working, removedIds);
    if (previewRemovableDuplicates(working) !== 0) throw new Error("V426: B.1 deixou duplicata removível após aplicação.");
    report.syllabusItemsAfter = (working.syllabusItems || []).length; report.distinctDisciplineNamesAfter = distinctDisciplineCount(working);
    working.migrations ||= {}; const current = working.migrations[MIGRATION_KEY] || {}, now = new Date().toISOString();
    working.migrations[MIGRATION_KEY] = { ...current, version: VERSION, revisionId: REVISION_ID, executedAt: now, completed: true, backup: clone(backup), report: clone(report), stages: { ...(current.stages || {}), B1: { completed: true, executedAt: now, removedIds: clone(removedIds) }, E: { completed: true, executedAt: priorEComplete ? (priorMigration.stages?.E?.executedAt || priorMigration.executedAt || now) : now, reusedPriorExecution: priorEComplete } } };
    for (const k of Object.keys(targetState)) delete targetState[k]; Object.assign(targetState, working);
    return { changed: true, blocked: false, report: clone(report), removedIds, stageEReused: priorEComplete };
  }

  async function readPersistedState() {
    try {
      if (typeof globalThis.loadStateFromIndexedDB === "function") { const row = await globalThis.loadStateFromIndexedDB(); if (row?.data) return clone(row.data); if (row && isObject(row) && !hasOwn(row, "id")) return clone(row); }
    } catch {}
    try { const parsed = JSON.parse(localStorage.getItem("metasConcursoData") || "null"); if (parsed) return parsed; } catch {}
    return null;
  }
  async function writeAuthoritativeSnapshot(targetState) {
    if (typeof globalThis.saveData !== "function") throw new Error("Função de persistência indisponível.");
    const saved = await Promise.resolve(globalThis.saveData({ markLocalChange: true, skipDerivedRefresh: true, reason: "v426-authoritative" }));
    if (saved === false) throw new Error("saveData recusou a persistência da V426.");
    const authoritative = clone(targetState);
    if (typeof globalThis.saveStateToIndexedDB === "function") await globalThis.saveStateToIndexedDB(authoritative, { directSnapshot: true });
    try { localStorage.setItem("metasConcursoData", JSON.stringify(authoritative)); } catch {}
  }
  function verifyPersistedState(persisted, result, baseApi) {
    if (!persisted) throw new Error("V426: estado persistido não pôde ser relido.");
    if (typeof baseApi?.basePostConditionsSatisfied === "function" && !baseApi.basePostConditionsSatisfied(persisted)) throw new Error("V426: pós-condições A/B/C/D não persistiram.");
    const removed = new Set(result.removedIds || []);
    const remaining = (persisted.syllabusItems || []).filter((i) => removed.has(cleanText(i.id))).map((i) => cleanText(i.id));
    if (remaining.length) throw new Error(`V426: B.1 não persistiu ${remaining.length} remoção(ões): ${remaining.join(", ")}`);
    if (previewRemovableDuplicates(persisted) !== 0) throw new Error("V426: duplicatas removíveis reapareceram após persistência.");
    assertPlanningAuthority(persisted);
    if (!legacyStageECompleted(persisted?.migrations?.[MIGRATION_KEY])) throw new Error("V426: marcador da Etapa E não persistiu.");
    return true;
  }
  async function persistAndVerify(targetState, result, baseApi) {
    applyPlanningAuthority(targetState);
    targetState.migrations[MIGRATION_KEY].completed = false;
    targetState.migrations[MIGRATION_KEY].verificationStatus = "pending";
    await writeAuthoritativeSnapshot(targetState);
    let persisted = await readPersistedState();
    verifyPersistedState(persisted, result, baseApi);
    const migration = persisted.migrations[MIGRATION_KEY], report = clone(migration.report || result.report || {});
    report.syllabusItemsAfter = (persisted.syllabusItems || []).length;
    report.distinctDisciplineNamesAfter = distinctDisciplineCount(persisted);
    report.persistenceVerification = { verified: true, verifiedAt: new Date().toISOString(), syllabusItems: report.syllabusItemsAfter, distinctDisciplines: report.distinctDisciplineNamesAfter, planning: planningAuthorityStatus(persisted), removedIdsVerified: (result.removedIds || []).length, stageEReused: Boolean(result.stageEReused) };
    migration.completed = true; migration.verificationStatus = "verified"; migration.verifiedAt = report.persistenceVerification.verifiedAt; migration.report = clone(report);
    for (const k of Object.keys(targetState)) delete targetState[k]; Object.assign(targetState, clone(persisted));
    targetState.migrations[MIGRATION_KEY] = clone(migration);
    await writeAuthoritativeSnapshot(targetState);
    const finalPersisted = await readPersistedState();
    verifyPersistedState(finalPersisted, result, baseApi);
    if (finalPersisted?.migrations?.[MIGRATION_KEY]?.completed !== true || finalPersisted?.migrations?.[MIGRATION_KEY]?.verificationStatus !== "verified") throw new Error("V426: marcador final verificado não persistiu.");
    for (const k of Object.keys(targetState)) delete targetState[k]; Object.assign(targetState, clone(finalPersisted));
    return { ...result, report: clone(finalPersisted.migrations[MIGRATION_KEY].report), persistedVerified: true };
  }

  function reportText(report = {}) {
    const p = report.persistenceVerification;
    return ["V426 revisada — Relatório final", `Backup confirmado: ${report.backup?.fileName || "não informado"}`, `syllabusItems: ${report.syllabusItemsBefore ?? "?"} → ${report.syllabusItemsAfter ?? "?"}`, `Nomes distintos após revisão: ${report.distinctDisciplineNamesAfter ?? "?"}`, "", "Etapa B.1 — itens removidos:", ...((report.duplicatesRemoved || []).map((i) => `- ${i.subject} | ${i.discipline} | removido ${i.id}; preservado ${i.keptId}`)), "", "Etapa B.1 — pares/grupos não removidos:", ...((report.duplicatePairsNotRemoved || []).map((i) => `- ${i.subject} | ${i.discipline} | ${i.ids.join(", ")} | ${i.reasons.join("; ")}`)), "", "Etapa E — metas reagendadas:", ...((report.goalsRescheduled || []).map((i) => `- ${i.subject} | ${i.from} → ${i.to} | ${i.id || i.syllabusItemId}`)), "", "Etapa E — metas não reagendadas:", ...((report.goalsNotRescheduled || []).map((i) => `- ${i.subject} | ${i.from} | ${(i.reasons || []).join("; ")}`)), "", `Persistência verificada: ${p?.verified ? "sim" : "não"}`, p?.planning ? `Planejamento persistido: config=${p.planning.configDisciplines}/${p.planning.configTopics}; snapshot=${p.planning.snapshotDisciplines}/${p.planning.snapshotTopics}; localStorage=${p.planning.localDisciplines}/${p.planning.localTopics}` : ""].filter((x) => x !== "").join("\n");
  }

  async function buildAndSaveBackup(targetState) {
    if (typeof globalThis.showSaveFilePicker !== "function") throw new Error("Este navegador não permite confirmar a gravação do backup.");
    const exportedAt = new Date().toISOString(), payload = JSON.stringify({ app: "Aldus Meta", schema: "discipline-unification-v426-revised-pre-migration-backup", version: 3, storageKey: "metasConcursoData", exportedAt, data: clone(targetState), localStorage: { metasConcursoData: (() => { try { return localStorage.getItem("metasConcursoData") || JSON.stringify(targetState); } catch { return JSON.stringify(targetState); } })() } }, null, 2);
    const suggestedName = `backup-metas-estudo-v426-revisada-${exportedAt.replace(/[:.]/g, "-")}.json`, handle = await showSaveFilePicker({ suggestedName, types: [{ description: "Backup JSON Aldus Meta", accept: { "application/json": [".json"] } }] });
    const writable = await handle.createWritable(); await writable.write(payload); await writable.close(); const file = await handle.getFile();
    if (file.size !== new Blob([payload]).size || (typeof file.text === "function" && await file.text() !== payload)) throw new Error("Backup incompleto ou divergente.");
    return { confirmed: true, fileName: file.name || suggestedName, savedAt: new Date().toISOString(), bytes: file.size };
  }
  function createPanel(partial) {
    if (typeof document === "undefined") return null; let panel = document.getElementById(PANEL_ID);
    if (!panel) { panel = document.createElement("section"); panel.id = PANEL_ID; panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(540px,calc(100vw - 32px));max-height:72vh;overflow:auto;background:#fff;border:1px solid #c9c3b8;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.22);padding:16px;font:14px/1.45 Arial,sans-serif;color:#181818"; document.body.appendChild(panel); }
    panel.innerHTML = `<strong>V426 revisada — persistência verificada</strong><p>${partial ? "Foi detectada uma execução anterior incompleta. Só as pós-condições faltantes serão reaplicadas; a Etapa E já executada não será repetida." : "A V426 será aplicada e relida do armazenamento antes de declarar sucesso."}</p><button type="button" data-v426-revision-apply>Salvar backup e aplicar</button><div data-v426-revision-status></div>`; return panel;
  }
  function renderAbortLock(baseApi, panel) { if (!baseApi?.migrationAbortLockApplies?.(VERSION)) return false; const lock = baseApi.readMigrationAbortLock?.(); const b = panel.querySelector("[data-v426-revision-apply]"), s = panel.querySelector("[data-v426-revision-status]"); if (b) { b.disabled = true; b.textContent = "V426 aguardando correção publicada"; } if (s) s.textContent = `A tentativa anterior abortou depois do backup ${lock?.backupFileName || "confirmado"}. Esta versão não pedirá outro backup.`; return true; }

  function installWithBase(baseApi) {
    if (globalThis[INSTALL_KEY]) return true; if (!baseApi?.apply) return false; globalThis[INSTALL_KEY] = true;
    const apply = (targetState = {}, options = {}) => applyRevision(targetState, options, baseApi);
    function armBrowserMigration() {
      try {
        if (typeof state === "undefined" || !isObject(state)) return false;
        if (revisionPostConditionsSatisfied(state, baseApi)) { baseApi.clearMigrationAbortLock?.(); return true; }
        const panel = createPanel(Boolean(state?.migrations?.[MIGRATION_KEY]?.completed)); if (!panel || renderAbortLock(baseApi, panel)) return true;
        const button = panel.querySelector("[data-v426-revision-apply]"), status = panel.querySelector("[data-v426-revision-status]");
        button?.addEventListener("click", async () => {
          button.disabled = true; status.textContent = "Gravando backup e aplicando pós-condições…"; let backup = null; const before = clone(state);
          try {
            backup = await buildAndSaveBackup(state);
            const result = apply(state, { backupConfirmation: backup }); if (result.blocked) throw new Error(result.reason || "Migração bloqueada.");
            const verified = await persistAndVerify(state, result, baseApi); baseApi.clearMigrationAbortLock?.();
            const text = reportText(verified.report); status.innerHTML = '<strong>V426 aplicada e relida com sucesso.</strong><pre data-v426-revision-report style="white-space:pre-wrap"></pre>'; status.querySelector("[data-v426-revision-report]").textContent = text;
          } catch (error) {
            for (const k of Object.keys(state)) delete state[k]; Object.assign(state, before);
            const cancelled = error?.name === "AbortError"; if (!cancelled && backup?.confirmed) baseApi.markMigrationAbort?.(error, backup, VERSION);
            status.textContent = cancelled ? "Backup cancelado. Nenhum dado foi alterado." : `V426 não concluída: ${error?.message || String(error)}`; if (!renderAbortLock(baseApi, panel)) button.disabled = false;
          }
        }); return true;
      } catch { return false; }
    }
    const api = Object.freeze({ ...baseApi, version: VERSION, revisionId: REVISION_ID, apply, reportText, removeHistoryFreeDuplicates, reschedulePcmaGoals, revisionPostConditionsSatisfied, persistAndVerify, armBrowserMigration });
    globalThis[API_KEY] = api; globalThis.applyDisciplineUnificationV426 = apply;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (typeof window !== "undefined") { window.addEventListener("aldus:bootstrap-ready", armBrowserMigration, { once: true }); window.addEventListener("aldus:post-bootstrap-maintenance-complete", armBrowserMigration, { once: true }); window.addEventListener("load", armBrowserMigration, { once: true }); try { armBrowserMigration(); } catch {} }
    return true;
  }
  function install() { const api = globalThis[API_KEY]; if (api && api.revisionId !== REVISION_ID && api.apply) return installWithBase(api); return api?.revisionId === REVISION_ID; }
  install();
})();
