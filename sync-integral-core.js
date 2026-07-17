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
