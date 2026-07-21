function syncMergeCollection(localList = [], remoteList = [], collection = "records", prefer = "remote") {
  const merged = new Map();
  const add = (item, side) => {
    if (!item || typeof item !== "object") return;
    const key = syncCollectionKey(item, collection);
    const current = merged.get(key);
    if (!current) merged.set(key, syncClone(item));
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
function mergeSyncStates(localState = {}, remoteState = {}, prefer = "remote") {
  const local = syncClone(localState || {}) || {};
  const remote = syncClone(remoteState || {}) || {};
  const merged = syncMergeObject({ ...cloneData(defaultState), ...local }, { ...cloneData(defaultState), ...remote }, prefer);
  SYNC_COLLECTIONS.forEach((collection) => {
    merged[collection] = syncMergeCollection(local[collection], remote[collection], collection, prefer);
  });
  merged.settings = syncMergeObject(local.settings || {}, remote.settings || {}, prefer);
  merged.planning = syncMergeObject(local.planning || {}, remote.planning || {}, prefer);
  merged.edital = syncMergeObject(local.edital || {}, remote.edital || {}, prefer);
  merged.schedulableSettings = syncMergeObject(local.schedulableSettings || {}, remote.schedulableSettings || {}, prefer);
  merged.disciplineWeights = syncMergeObject(local.disciplineWeights || {}, remote.disciplineWeights || {}, prefer);
  merged.monthlyGoals = syncMergeObject(local.monthlyGoals || {}, remote.monthlyGoals || {}, prefer);
  merged.factoryPromptLibrary = syncMergeObject(local.factoryPromptLibrary || {}, remote.factoryPromptLibrary || {}, prefer);
  merged.migrations = syncMergeObject(local.migrations || {}, remote.migrations || {}, prefer);
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
