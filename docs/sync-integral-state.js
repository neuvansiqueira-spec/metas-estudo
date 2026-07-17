function syncMergeCollection(localList = [], remoteList = [], collection = "records", prefer = "remote") {
  const merged = new Map();
  const add = (item, side) => {
    if (!item || typeof item !== "object") return;
    const key = syncCollectionKey(item, collection);
    const current = merged.get(key);
    if (!current) merged.set(key, syncClone(item));
    else merged.set(key, side === "remote" ? syncMergeRecord(current, item, prefer) : syncMergeRecord(item, current, prefer));
  };
  (Array.isArray(localList) ? localList : []).forEach((item) => add(item, "local"));
  (Array.isArray(remoteList) ? remoteList : []).forEach((item) => add(item, "remote"));
  return [...merged.values()];
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
function syncRebuildGoalTotals(mergedState) {
  const studyTotals = new Map();
  const questionTotals = new Map();
  (mergedState.studies || []).forEach((study) => {
    if (study.updatesGoal === false) return;
    const goalId = study.goalId || study.dailyGoalId;
    if (!goalId) return;
    const minutes = Math.max(0, Number(study.minutes) || Math.round((Number(study.seconds) || 0) / 60));
    const isQuestions = study.timerKind === "questions" || study.kind === "questions";
    const map = isQuestions ? questionTotals : studyTotals;
    map.set(goalId, (map.get(goalId) || 0) + minutes);
  });
  (mergedState.questionLogs || []).forEach((log) => {
    const goalId = log.goalId || log.dailyGoalId;
    if (!goalId) return;
    questionTotals.set(goalId, (questionTotals.get(goalId) || 0) + Math.max(0, Number(log.minutes) || 0));
  });
  mergedState.dailyGoals = (mergedState.dailyGoals || []).map((goal) => {
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
  return syncRebuildGoalTotals(merged);
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