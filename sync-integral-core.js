const SYNC_COLLECTIONS = [
  "subjects", "studies", "syllabusItems", "dailyGoals", "questionLogs",
  "smartReviews", "simulados", "materials", "questionBank",
  "questionBankSessions", "questionErrorNotebook", "factoryItems", "factoryAgenda"
];
const SYNC_MAX_NUMERIC_FIELDS = new Set([
  "minutes", "seconds", "elapsedSeconds", "plannedMinutes", "actualMinutes",
  "studyActualMinutes", "questionActualMinutes", "tempo_real_minutos",
  "performedMinutes", "tempoRealizado", "tempo_realizado", "realizedMinutes",
  "questions", "total", "correct", "wrong", "blank", "net", "attempts",
  "usefulPages", "estimatedMinutes", "manualEstimatedMinutes",
  "automaticEstimatedMinutes", "sessionGoalMinutes"
]);
function syncClone(value) { return cloneData(value ?? null); }
function syncValueEmpty(value) { return value === undefined || value === null || value === ""; }
function syncTimestamp(value = {}) {
  const dates = [value.updatedAt, value.savedAt, value.endedAt, value.completedAt, value.modifiedAt, value.createdAt, value.startedAt, value.openedAt, value.date]
    .map((entry) => Date.parse(entry || ""))
    .filter(Number.isFinite);
  return dates.length ? Math.max(...dates) : 0;
}
function syncPrimitiveArray(local = [], remote = []) {
  const result = [];
  const seen = new Set();
  [...local, ...remote].forEach((item) => {
    const key = typeof item === "object" && item !== null ? JSON.stringify(item) : `${typeof item}:${String(item)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(syncClone(item));
  });
  return result;
}
function syncStableSerialize(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(syncStableSerialize).sort().join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${syncStableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function syncStateFingerprint(value = {}) {
  const serialized = syncStableSerialize(value || {});
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${serialized.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function syncPayloadFingerprint(payload = {}) {
  return payload.stateFingerprint || syncStateFingerprint(payload.state || {});
}
function syncCollectionKey(item = {}, collection = "records") {
  const directId = (["studies", "questionBankSessions"].includes(collection) ? (item.sessionId || item.id) : (item.id || item.sessionId)) || item.uuid || item.key;
  if (directId) return `${collection}:id:${String(directId)}`;
  const preciseStart = item.startedAt || item.startTime || "";
  const preciseEnd = item.endedAt || item.endTime || "";
  if (["studies", "questionLogs", "questionBankSessions"].includes(collection) && !preciseStart && !preciseEnd) {
    return `${collection}:legacy:${JSON.stringify(item)}`;
  }
  const fieldSets = {
    studies: [item.goalId, preciseStart, preciseEnd, item.date, item.discipline || item.disciplina, item.topic || item.subject || item.assunto],
    dailyGoals: [item.date || item.data, item.discipline || item.disciplina, item.subject || item.assunto, item.type || item.tipo, item.syllabusItemId],
    questionLogs: [item.goalId || item.dailyGoalId, item.date, item.discipline || item.disciplina, item.subject || item.assunto, preciseStart, preciseEnd, item.trainingType],
    questionBankSessions: [preciseStart, preciseEnd, item.date, item.mode, item.discipline],
    smartReviews: [item.date, item.syllabusItemId, item.discipline, item.subject, item.status],
    simulados: [item.date, item.name, item.board],
    materials: [item.link, item.title, item.discipline, item.subject, item.type],
    subjects: [item.name],
    syllabusItems: [item.discipline, item.subject, item.subtopic, item.reference],
    factoryItems: [item.discipline, item.subject, item.theme, item.module],
    factoryAgenda: [item.date, item.factoryItemId, item.module]
  };
  const fields = (fieldSets[collection] || [item.date, item.name, item.title, item.subject, item.discipline]).map((value) => String(value ?? "").trim());
  const meaningful = fields.some(Boolean);
  return meaningful ? `${collection}:fp:${fields.join("|")}` : `${collection}:json:${JSON.stringify(item)}`;
}
function syncMergeRecord(localValue = {}, remoteValue = {}, prefer = "remote") {
  if (!localValue || typeof localValue !== "object") return syncClone(remoteValue);
  if (!remoteValue || typeof remoteValue !== "object") return syncClone(localValue);
  const localTime = syncTimestamp(localValue);
  const remoteTime = syncTimestamp(remoteValue);
  const remotePreferred = remoteTime === localTime ? prefer === "remote" : remoteTime > localTime;
  const primary = remotePreferred ? remoteValue : localValue;
  const secondary = remotePreferred ? localValue : remoteValue;
  const result = { ...syncClone(secondary), ...syncClone(primary) };
  const keys = new Set([...Object.keys(localValue), ...Object.keys(remoteValue)]);
  keys.forEach((key) => {
    const left = localValue[key];
    const right = remoteValue[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      result[key] = syncPrimitiveArray(Array.isArray(left) ? left : [], Array.isArray(right) ? right : []);
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object") {
      result[key] = syncMergeRecord(left, right, remotePreferred ? "remote" : "local");
      return;
    }
    if (SYNC_MAX_NUMERIC_FIELDS.has(key)) {
      result[key] = Math.max(Number(left) || 0, Number(right) || 0);
      return;
    }
    const preferredValue = remotePreferred ? right : left;
    const fallbackValue = remotePreferred ? left : right;
    result[key] = syncValueEmpty(preferredValue) && !syncValueEmpty(fallbackValue) ? syncClone(fallbackValue) : syncClone(preferredValue);
  });
  return result;
}

function timerGoalTotalsSnapshot(goal = {}) {
  return [
    Number(goal.studyActualMinutes) || 0,
    Number(goal.questionActualMinutes) || 0,
    Number(goal.actualMinutes) || 0,
    Number(goal.tempo_real_minutos) || 0
  ].join("|");
}

function timerHistoryText(entry) {
  if (typeof entry === "string") return entry;
  return String(entry?.text || entry?.message || entry?.descricao || "");
}

function reconcileGoalWithTimerHistory(goal = {}) {
  let studyMinutes = Number(goal.studyActualMinutes) || 0;
  let questionMinutes = Number(goal.questionActualMinutes) || 0;
  let currentTotal = Math.max(Number(goal.actualMinutes) || 0, Number(goal.tempo_real_minutos) || 0, studyMinutes + questionMinutes);
  let changed = false;

  (goal.history || goal.historico || []).forEach((entry) => {
    const text = timerHistoryText(entry);
    const match = text.match(/Tempo salvo pelo cronômetro:\s*\+(\d+)\s*min\s*em\s*(Estudo|Questões).*?Total realizado:\s*(\d+)\s*min/i);
    if (!match) return;
    const recordedTotal = Number(match[3]) || 0;
    if (recordedTotal <= currentTotal) return;
    const missingMinutes = recordedTotal - currentTotal;
    if (/quest/i.test(match[2])) questionMinutes += missingMinutes;
    else studyMinutes += missingMinutes;
    currentTotal = recordedTotal;
    changed = true;
  });

  const rebuiltTotal = Math.max(currentTotal, studyMinutes + questionMinutes);
  if (studyMinutes !== (Number(goal.studyActualMinutes) || 0)) { goal.studyActualMinutes = studyMinutes; changed = true; }
  if (questionMinutes !== (Number(goal.questionActualMinutes) || 0)) { goal.questionActualMinutes = questionMinutes; changed = true; }
  if (rebuiltTotal !== (Number(goal.actualMinutes) || 0)) { goal.actualMinutes = rebuiltTotal; changed = true; }
  if (rebuiltTotal !== (Number(goal.tempo_real_minutos) || 0)) { goal.tempo_real_minutos = rebuiltTotal; changed = true; }
  if (changed && (!goal.status || goal.status === "Pendente") && rebuiltTotal > 0) goal.status = "Em andamento";
  return changed;
}

function reconcileSavedTimerTotals() {
  if (typeof state === "undefined" || typeof syncRebuildGoalTotals !== "function") return false;
  const before = new Map((state.dailyGoals || []).map((goal) => [goal.id, timerGoalTotalsSnapshot(goal)]));
  syncRebuildGoalTotals(state);
  let changed = false;
  (state.dailyGoals || []).forEach((goal) => {
    reconcileGoalWithTimerHistory(goal);
    if (before.get(goal.id) !== timerGoalTotalsSnapshot(goal)) changed = true;
  });
  return changed;
}

function installTimerSaveTotalReconciliation() {
  if (globalThis.__metasTimerSaveTotalReconciliationV33 || typeof submitTimerStudyModal !== "function") return;
  globalThis.__metasTimerSaveTotalReconciliationV33 = true;
  const originalSubmitTimerStudyModal = submitTimerStudyModal;
  submitTimerStudyModal = function submitTimerStudyModalWithTotalReconciliation(event) {
    const previousSessionIds = new Set((state.studies || []).map((study) => study.timerSessionId || study.sessionId).filter(Boolean));
    const beforeGoals = new Map((state.dailyGoals || []).map((goal) => [goal.id, {
      studyActualMinutes: Number(goal.studyActualMinutes) || 0,
      questionActualMinutes: Number(goal.questionActualMinutes) || 0
    }]));
    const result = originalSubmitTimerStudyModal(event);
    const newlySavedSessions = (state.studies || []).filter((study) => {
      const sessionId = study.timerSessionId || study.sessionId;
      return sessionId && !previousSessionIds.has(sessionId) && study.updatesGoal !== false;
    });
    if (newlySavedSessions.length) {
      const addedByGoal = new Map();
      newlySavedSessions.forEach((study) => {
        const goalId = study.goalId || study.dailyGoalId;
        if (!goalId) return;
        const entry = addedByGoal.get(goalId) || { study: 0, questions: 0 };
        const minutes = Math.max(0, Number(study.minutes) || Math.round((Number(study.seconds) || 0) / 60));
        if (study.timerKind === "questions" || study.kind === "questions") entry.questions += minutes;
        else entry.study += minutes;
        addedByGoal.set(goalId, entry);
      });
      addedByGoal.forEach((added, goalId) => {
        const goal = (state.dailyGoals || []).find((item) => item.id === goalId);
        const before = beforeGoals.get(goalId);
        if (!goal || !before) return;
        goal.studyActualMinutes = Math.max(Number(goal.studyActualMinutes) || 0, before.studyActualMinutes + added.study);
        goal.questionActualMinutes = Math.max(Number(goal.questionActualMinutes) || 0, before.questionActualMinutes + added.questions);
        goal.actualMinutes = Math.max(Number(goal.actualMinutes) || 0, goal.studyActualMinutes + goal.questionActualMinutes);
        goal.tempo_real_minutos = Math.max(Number(goal.tempo_real_minutos) || 0, goal.actualMinutes);
      });
      reconcileSavedTimerTotals();
      saveData({ markLocalChange: true });
      render();
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("timer-recovery");
    }
    return result;
  };
}

function installSavedTimerTotalsStartupRecovery() {
  if (globalThis.__metasSavedTimerTotalsStartupRecoveryV33) return;
  globalThis.__metasSavedTimerTotalsStartupRecoveryV33 = true;
  setTimeout(() => {
    try {
      if (!reconcileSavedTimerTotals()) return;
      saveData({ markLocalChange: true });
      render();
      if (typeof showDailyGoalMessage === "function") showDailyGoalMessage("Total da meta recuperado a partir da sessão salva.", "success");
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("timer-recovery");
    } catch (error) {
      console.warn("[Metas Estudo] Não foi possível reconciliar os totais salvos pelo cronômetro.", error);
    }
  }, 1800);
}

installTimerSaveTotalReconciliation();
installSavedTimerTotalsStartupRecovery();