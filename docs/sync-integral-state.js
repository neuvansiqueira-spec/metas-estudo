// V654 — ownedInputs: as listas já são cópias próprias da mesclagem (mergeSyncStates
// clona os dois estados no início); o item que só existe de um lado não precisa
// de outra cópia. Sem a opção, o comportamento é o anterior.
function syncMergeCollection(localList = [], remoteList = [], collection = "records", prefer = "remote", ownedInputs = false) {
  const merged = new Map();
  const add = (item, side) => {
    if (!item || typeof item !== "object") return;
    const key = syncCollectionKey(item, collection);
    const current = merged.get(key);
    if (!current) merged.set(key, ownedInputs ? item : syncClone(item));
    else if (collection === "dailyGoals") merged.set(key, side === "remote" ? syncMergeDailyGoalRecord(current, item, prefer) : syncMergeDailyGoalRecord(item, current, prefer));
    else merged.set(key, side === "remote" ? syncMergeRecord(current, item, prefer) : syncMergeRecord(item, current, prefer));
  };
  (Array.isArray(localList) ? localList : []).forEach((item) => add(item, "local"));
  (Array.isArray(remoteList) ? remoteList : []).forEach((item) => add(item, "remote"));
  return [...merged.values()];
}
function syncDailyGoalExecutionScore(goal = {}) {
  const completed = syncExecutionText(goal.status) === "concluida" ? 1 : 0;
  const actual = Math.max(Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0, (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0));
  const history = (goal.history || goal.historico || []).length;
  return completed * 1e9 + actual * 1e5 + history;
}
function syncMergeDailyGoalRecord(localGoal = {}, remoteGoal = {}, prefer = "remote") {
  const merged = syncMergeRecord(localGoal, remoteGoal, prefer);
  const localScore = syncDailyGoalExecutionScore(localGoal);
  const remoteScore = syncDailyGoalExecutionScore(remoteGoal);
  const remotePreferred = syncTimestamp(remoteGoal) === syncTimestamp(localGoal)
    ? prefer === "remote"
    : syncTimestamp(remoteGoal) > syncTimestamp(localGoal);
  const keeper = localScore === remoteScore ? (remotePreferred ? remoteGoal : localGoal) : (remoteScore > localScore ? remoteGoal : localGoal);
  if (keeper.id) merged.id = keeper.id;

  const study = Math.max(Number(localGoal.studyActualMinutes) || 0, Number(remoteGoal.studyActualMinutes) || 0);
  const questions = Math.max(Number(localGoal.questionActualMinutes) || 0, Number(remoteGoal.questionActualMinutes) || 0);
  const actual = Math.max(Number(localGoal.actualMinutes) || 0, Number(remoteGoal.actualMinutes) || 0, Number(localGoal.tempo_real_minutos) || 0, Number(remoteGoal.tempo_real_minutos) || 0, study + questions);
  merged.studyActualMinutes = study;
  merged.questionActualMinutes = questions;
  merged.actualMinutes = actual;
  merged.tempo_real_minutos = actual;
  if ([localGoal, remoteGoal].some((goal) => syncExecutionText(goal.status) === "concluida")) merged.status = "Concluída";
  else if (actual > 0 && (!merged.status || merged.status === "Pendente")) merged.status = "Em andamento";
  return merged;
}
function syncMergeObject(localValue = {}, remoteValue = {}, prefer = "remote") {
  const result = syncMergeRecord(localValue || {}, remoteValue || {}, prefer);
  Object.keys(result).forEach((key) => {
    if (Array.isArray(localValue?.[key]) || Array.isArray(remoteValue?.[key])) {
      result[key] = syncPrimitiveArray(Array.isArray(localValue?.[key]) ? localValue[key] : [], Array.isArray(remoteValue?.[key]) ? remoteValue[key] : []);
    }
  });
  return result;
}
function syncExecutionDate(value) {
  const direct = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}
function syncExecutionText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function syncExecutionSessionKey(record = {}) {
  return String(record.timerSessionId || record.sessionId || record.id || "");
}
function syncGoalForExecutionRecord(record = {}, goals = [], goalById = new Map(), migrations = {}) {
  const directGoalId = record.goalId || record.dailyGoalId || record.metaId || "";
  if (directGoalId && goalById.has(directGoalId)) return goalById.get(directGoalId);

  const assignedGoalId = migrations?.legacyTimerRecoveryV2?.assignments?.[syncExecutionSessionKey(record)]?.goalId || "";
  if (assignedGoalId && goalById.has(assignedGoalId)) return goalById.get(assignedGoalId);

  const date = syncExecutionDate(record.date || record.data || record.startedAt || record.startTime || record.endedAt || record.endTime);
  if (!date) return null;
  const sameDate = goals.filter((goal) => syncExecutionDate(goal.date || goal.data) === date);
  const syllabusItemId = String(record.syllabusItemId || "").trim();
  if (syllabusItemId) {
    const syllabusMatches = sameDate.filter((goal) => String(goal.syllabusItemId || "").trim() === syllabusItemId);
    if (syllabusMatches.length === 1) return syllabusMatches[0];
    if (syllabusMatches.length > 1) return null;
  }

  const discipline = syncExecutionText(record.discipline || record.disciplina);
  const topic = syncExecutionText(record.topic || record.subject || record.assunto);
  if (!discipline || !topic) return null;
  const exactMatches = sameDate.filter((goal) => {
    const goalDiscipline = syncExecutionText(goal.discipline || goal.disciplina);
    const goalTopic = syncExecutionText(goal.baseSubject || goal.subject || goal.assunto);
    return goalDiscipline === discipline && goalTopic === topic;
  });
  return exactMatches.length === 1 ? exactMatches[0] : null;
}
function syncRelinkExecutionRecord(record, goal) {
  if (!record || !goal?.id || record.goalId === goal.id) return false;
  record.previousGoalId ||= record.goalId || record.dailyGoalId || "";
  record.goalId = goal.id;
  record.dailyGoalId = goal.id;
  record.timeRelinkedAt ||= new Date().toISOString();
  return true;
}
function syncRebuildGoalTotals(mergedState) {
  const studyTotals = new Map();
  const questionTotals = new Map();
  const goals = mergedState.dailyGoals || [];
  const goalById = new Map(goals.filter((goal) => goal?.id).map((goal) => [goal.id, goal]));
  const seenStudySessions = new Set();
  const seenQuestionSessions = new Set();
  (mergedState.studies || []).forEach((study) => {
    if (study.updatesGoal === false) return;
    const sessionKey = syncExecutionSessionKey(study) || JSON.stringify(study);
    if (seenStudySessions.has(sessionKey)) return;
    seenStudySessions.add(sessionKey);
    const goal = syncGoalForExecutionRecord(study, goals, goalById, mergedState.migrations || {});
    if (!goal) return;
    syncRelinkExecutionRecord(study, goal);
    const goalId = goal.id;
    const minutes = Math.max(0, Number(study.minutes) || Math.round((Number(study.seconds) || 0) / 60));
    const isQuestions = study.timerKind === "questions" || study.kind === "questions";
    const map = isQuestions ? questionTotals : studyTotals;
    map.set(goalId, (map.get(goalId) || 0) + minutes);
  });
  (mergedState.questionLogs || []).forEach((log) => {
    const sessionKey = String(log.id || log.sessionId || JSON.stringify(log));
    if (seenQuestionSessions.has(sessionKey)) return;
    seenQuestionSessions.add(sessionKey);
    const goal = syncGoalForExecutionRecord(log, goals, goalById, mergedState.migrations || {});
    if (!goal) return;
    syncRelinkExecutionRecord(log, goal);
    const goalId = goal.id;
    questionTotals.set(goalId, (questionTotals.get(goalId) || 0) + Math.max(0, Number(log.minutes) || 0));
  });
  mergedState.dailyGoals = goals.map((goal) => {
    const studyMinutes = Math.max(Number(goal.studyActualMinutes) || 0, studyTotals.get(goal.id) || 0);
    const questionMinutes = Math.max(Number(goal.questionActualMinutes) || 0, questionTotals.get(goal.id) || 0);
    const total = Math.max(Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0, studyMinutes + questionMinutes);
    return { ...goal, studyActualMinutes: studyMinutes, questionActualMinutes: questionMinutes, actualMinutes: total, tempo_real_minutos: total };
  });
  return mergedState;
}
// V654 — chaves que mergeSyncStates mescla de novo, uma a uma, depois da passada
// geral. Na passada geral elas eram percorridas e clonadas inteiras (as coleções
// somam ~15 MB) e o resultado ia fora. Entram vazias nessa passada, na mesma
// posição, e o resultado final é o mesmo.
function syncSeparatelyMergedKeysV654() {
  return [
    ...SYNC_COLLECTIONS, "settings", "planning", "edital", "schedulableSettings", "activeContestId", "planningMode",
    "contestPlanningProfiles", "disciplineWeights", "monthlyGoals", "factoryPromptLibrary", "migrations", "timerSession", "syncTombstones"
  ];
}
function syncWithoutSeparatelyMergedKeys(source) {
  const shallow = { ...source };
  syncSeparatelyMergedKeysV654().forEach((key) => { if (Object.prototype.hasOwnProperty.call(shallow, key)) shallow[key] = null; });
  return shallow;
}
// V660.3 — a mesclagem une as listas de ids dos dois lados. Uma cópia mais antiga
// (nuvem ou outro aparelho) trazia de volta, para 264 itens da Fábrica, os ids de
// temas que já tinham sido fundidos em outro (reproduzido em 06/10/2026), e
// desfazia a correção V660.1. Depois da mesclagem, todo id que aparece no
// mergedFrom de um tema existente passa a ser o id desse tema. Não muda
// horários: as duas cópias chegam ao mesmo resultado ao se mesclar.
const SYNC_SYLLABUS_LINK_COLLECTIONS_V660 = ["dailyGoals", "studies", "materials", "factoryAgenda", "factoryItems"];
function syncRepointMergedSyllabusIds(target = {}) {
  const items = Array.isArray(target.syllabusItems) ? target.syllabusItems : [];
  const existing = new Set(items.map((item) => item?.id).filter(Boolean));
  const keeperOf = new Map();
  items.forEach((item) => {
    (Array.isArray(item?.mergedFrom) ? item.mergedFrom : []).forEach((id) => {
      if (id && !existing.has(id) && !keeperOf.has(id)) keeperOf.set(id, item.id);
    });
  });
  if (!keeperOf.size) return 0;
  const resolve = (id) => keeperOf.get(id) || id;
  const resolveList = (list) => {
    const next = [...new Set(list.map(resolve))];
    return next.length !== list.length || next.some((id, index) => id !== list[index]) ? next : list;
  };
  const seen = new Set();
  let changed = 0;
  SYNC_SYLLABUS_LINK_COLLECTIONS_V660.forEach((collection) => {
    (Array.isArray(target[collection]) ? target[collection] : []).forEach((record) => {
      if (!record || typeof record !== "object" || seen.has(record)) return;
      seen.add(record);
      ["syllabusItemId", "parentSyllabusItemId"].forEach((field) => {
        if (record[field] && keeperOf.has(record[field])) { record[field] = resolve(record[field]); changed += 1; }
      });
      if (Array.isArray(record.syllabusItemIds)) {
        const next = resolveList(record.syllabusItemIds);
        if (next !== record.syllabusItemIds) { record.syllabusItemIds = next; changed += 1; }
      }
      if (Array.isArray(record.editalLink?.itemIds)) {
        const next = resolveList(record.editalLink.itemIds);
        if (next !== record.editalLink.itemIds) { record.editalLink.itemIds = next; changed += 1; }
      }
    });
  });
  return changed;
}

function mergeSyncStates(localState = {}, remoteState = {}, prefer = "remote") {
  const local = syncClone(localState || {}) || {};
  const remote = syncClone(remoteState || {}) || {};
  const merged = syncMergeObject(
    syncWithoutSeparatelyMergedKeys({ ...cloneData(defaultState), ...local }),
    syncWithoutSeparatelyMergedKeys({ ...cloneData(defaultState), ...remote }),
    prefer
  );
  SYNC_COLLECTIONS.forEach((collection) => {
    merged[collection] = syncMergeCollection(local[collection], remote[collection], collection, prefer, true);
  });
  syncRepointMergedSyllabusIds(merged);
  merged.settings =syncMergeObject(local.settings || {}, remote.settings || {}, prefer);
  merged.planning = syncMergeObject(local.planning || {}, remote.planning || {}, prefer);
  merged.edital = syncMergeObject(local.edital || {}, remote.edital || {}, prefer);
  merged.schedulableSettings = syncMergeObject(local.schedulableSettings || {}, remote.schedulableSettings || {}, prefer);
  merged.activeContestId = prefer === "remote"
    ? (remote.activeContestId || local.activeContestId || null)
    : (local.activeContestId || remote.activeContestId || null);
  merged.planningMode = prefer === "remote"
    ? (remote.planningMode || local.planningMode || "joint")
    : (local.planningMode || remote.planningMode || "joint");
  merged.contestPlanningProfiles = syncMergeObject(local.contestPlanningProfiles || {}, remote.contestPlanningProfiles || {}, prefer);
  merged.disciplineWeights = syncMergeObject(local.disciplineWeights || {}, remote.disciplineWeights || {}, prefer);
  merged.monthlyGoals = syncMergeObject(local.monthlyGoals || {}, remote.monthlyGoals || {}, prefer);
  merged.factoryPromptLibrary = syncMergeObject(local.factoryPromptLibrary || {}, remote.factoryPromptLibrary || {}, prefer);
  merged.migrations = syncMergeObject(local.migrations || {}, remote.migrations || {}, prefer);
  // V660.2 — as cópias avulsas que a V660 tirou dos dados e guardou num banco
  // separado (aldus-arquivo-v660) voltavam da cópia do Drive, porque a mesclagem
  // une as chaves dos dois lados (visto em 06/10/2026, 12:22). Depois de
  // arquivadas em algum aparelho, elas não entram mais na mesclagem.
  const archivedKeysV660 = merged.migrations?.dataRepairsV660?.archivedCopies?.keys;
  if (Array.isArray(archivedKeysV660)) {
    archivedKeysV660.filter((key) => /^backup(Metas|Fabrica)V6\d\d$/.test(key)).forEach((key) => { delete merged[key]; });
  }
  merged.timerSession = syncMergeRecord(local.timerSession || {}, remote.timerSession || {}, prefer);
  if (!merged.timerSession?.goalId) merged.timerSession = local.timerSession?.goalId ? syncClone(local.timerSession) : (remote.timerSession?.goalId ? syncClone(remote.timerSession) : null);
  merged.syncTombstones = syncMergeTombstones(local.syncTombstones, remote.syncTombstones);
  globalThis.__metasSyncTombstoneApplyingV39 = true;
  try {
    syncApplyTombstones(merged, merged.syncTombstones);
  } finally {
    globalThis.__metasSyncTombstoneApplyingV39 = false;
  }
  syncRebuildGoalTotals(merged);
  if (typeof repairDailyPlanningInflationV108 === "function") {
    repairDailyPlanningInflationV108(merged, { source: "sync-merge" });
  }
  if (typeof applyPcprPcma2026Migration === "function") applyPcprPcma2026Migration(merged);
  return merged;
}

function syncCreateSafetyBackup(sourceState, sourceLabel = "before-merge") {
  try {
    localStorage.setItem("metasEstudoBackupAntesDaMesclagem", JSON.stringify({
      app: "metas-estudo",
      createdAt: new Date().toISOString(),
      source: sourceLabel,
      state: syncClone(sourceState || {})
    }));
    return true;
  } catch (error) {
    console.warn("[Metas Estudo] Não foi possível criar a cópia adicional de segurança da mesclagem.", error);
    return false;
  }
}
