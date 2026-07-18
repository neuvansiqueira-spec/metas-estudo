const TIME_STORAGE_PROTECTION_VERSION = "20260718-protecao-recuperacao-tempo-v48";
const TIME_STORAGE_BACKUP_KEY = "metasEstudoBackupAntesDaMesclagem";

function timeProtectionClone(value) {
  return typeof cloneData === "function" ? cloneData(value ?? null) : JSON.parse(JSON.stringify(value ?? null));
}

function timeProtectionHasUserData(value = {}) {
  if (typeof stateHasUserData === "function") return stateHasUserData(value);
  return ["subjects", "studies", "syllabusItems", "dailyGoals", "questionLogs", "materials", "questionBank", "simulados", "smartReviews", "factoryAgenda", "factoryItems"]
    .some((key) => Array.isArray(value?.[key]) && value[key].length);
}

function timeProtectionSummary(value = {}) {
  const studies = Array.isArray(value?.studies) ? value.studies : [];
  const goals = Array.isArray(value?.dailyGoals) ? value.dailyGoals : [];
  const archivedMinutes = studies.reduce((sum, study) => sum + Math.max(0, Number(study.minutes) || Math.round((Number(study.seconds) || Number(study.elapsedSeconds) || 0) / 60)), 0);
  const goalMinutes = goals.reduce((sum, goal) => sum + Math.max(
    Number(goal.actualMinutes) || 0,
    Number(goal.tempo_real_minutos) || 0,
    (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0)
  ), 0);
  return { studies: studies.length, goals: goals.length, archivedMinutes, goalMinutes };
}

function readTimeProtectionBackupState() {
  try {
    const raw = localStorage.getItem(TIME_STORAGE_BACKUP_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const backupState = payload?.state;
    return backupState && typeof backupState === "object" && !Array.isArray(backupState) && timeProtectionHasUserData(backupState)
      ? backupState
      : null;
  } catch (error) {
    console.warn("[Aldus Meta] Não foi possível examinar o backup anterior à mesclagem.", error);
    return null;
  }
}

function installGoalTimeNonRegressionProtection() {
  if (globalThis.__aldusGoalTimeNonRegressionV48 || typeof normalizeGoalTimeFields !== "function") return;
  globalThis.__aldusGoalTimeNonRegressionV48 = true;
  const originalNormalizeGoalTimeFields = normalizeGoalTimeFields;

  normalizeGoalTimeFields = function normalizeGoalTimeFieldsWithoutRegression(goal = {}) {
    const preservedTotal = Math.max(
      Number(goal.actualMinutes) || 0,
      Number(goal.tempo_real_minutos) || 0,
      (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0)
    );
    const normalized = originalNormalizeGoalTimeFields(goal) || goal;
    let studyMinutes = Math.max(0, Number(normalized.studyActualMinutes) || 0);
    const questionMinutes = Math.max(0, Number(normalized.questionActualMinutes) || 0);
    const splitTotal = studyMinutes + questionMinutes;

    if (preservedTotal > splitTotal) studyMinutes += preservedTotal - splitTotal;

    normalized.studyActualMinutes = studyMinutes;
    normalized.questionActualMinutes = questionMinutes;
    normalized.actualMinutes = Math.max(preservedTotal, studyMinutes + questionMinutes);
    normalized.tempo_real_minutos = Math.max(Number(normalized.tempo_real_minutos) || 0, normalized.actualMinutes);
    return normalized;
  };
}

function mergeProtectedTimeStates(baseState, incomingState, prefer = "remote") {
  if (!timeProtectionHasUserData(incomingState)) return timeProtectionClone(baseState || {});
  if (!timeProtectionHasUserData(baseState)) return timeProtectionClone(incomingState || {});
  if (typeof mergeSyncStates === "function") return mergeSyncStates(baseState, incomingState, prefer);
  return { ...timeProtectionClone(baseState || {}), ...timeProtectionClone(incomingState || {}) };
}

function mergeTimeOnlyRecoveryBackup(currentState, backupState) {
  if (!timeProtectionHasUserData(backupState)) return timeProtectionClone(currentState || {});
  const current = timeProtectionClone(currentState || {}) || {};
  const candidate = {
    ...timeProtectionClone(current),
    studies: timeProtectionClone(backupState.studies || []),
    dailyGoals: timeProtectionClone(backupState.dailyGoals || []),
    questionLogs: timeProtectionClone(backupState.questionLogs || []),
    syncTombstones: timeProtectionClone(current.syncTombstones || {})
  };
  return mergeProtectedTimeStates(current, candidate, "remote");
}

function installPrimaryStorageMergeProtection() {
  if (globalThis.__aldusPrimaryStorageMergeProtectionV48 || typeof loadPrimaryStateFromIndexedDB !== "function") return;
  globalThis.__aldusPrimaryStorageMergeProtectionV48 = true;
  const originalLoadPrimaryStateFromIndexedDB = loadPrimaryStateFromIndexedDB;

  loadPrimaryStateFromIndexedDB = async function loadPrimaryStateWithRecoveryCandidates() {
    let result;
    let indexedDBError = null;
    try {
      result = await originalLoadPrimaryStateFromIndexedDB();
    } catch (error) {
      indexedDBError = error;
      result = { valid: false, empty: true, record: null, data: null };
    }

    const sources = [];
    let protectedState = result?.valid && timeProtectionHasUserData(result.data) ? timeProtectionClone(result.data) : null;
    if (protectedState) sources.push("IndexedDB");

    let localState = null;
    try {
      localState = typeof readJSONStorage === "function" ? readJSONStorage(STORAGE_KEY, {}) : JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível examinar o localStorage durante a recuperação.", error);
    }
    if (timeProtectionHasUserData(localState)) {
      protectedState = mergeProtectedTimeStates(protectedState, localState, "remote");
      sources.push("localStorage");
    }

    const backupState = readTimeProtectionBackupState();
    if (timeProtectionHasUserData(backupState)) {
      protectedState = mergeTimeOnlyRecoveryBackup(protectedState, backupState);
      sources.push("backup-de-tempo-antes-da-mesclagem");
    }

    if (!timeProtectionHasUserData(protectedState)) {
      if (indexedDBError) throw indexedDBError;
      return result;
    }

    const originalSummary = timeProtectionSummary(result?.data || {});
    const protectedSummary = timeProtectionSummary(protectedState);
    const changed = typeof syncStateFingerprint === "function"
      ? syncStateFingerprint(result?.data || {}) !== syncStateFingerprint(protectedState)
      : JSON.stringify(result?.data || {}) !== JSON.stringify(protectedState);

    globalThis.__aldusTimeStorageRecoveryReport = {
      version: TIME_STORAGE_PROTECTION_VERSION,
      changed,
      sources: [...new Set(sources)],
      original: originalSummary,
      recovered: protectedSummary,
      recoveredAt: changed ? new Date().toISOString() : "",
      indexedDBError: indexedDBError ? String(indexedDBError.message || indexedDBError) : ""
    };

    return { ...result, valid: true, empty: false, data: protectedState, recoveredFrom: [...new Set(sources)] };
  };
}

function installExactTimerSecondsArchive() {
  if (globalThis.__aldusExactTimerSecondsArchiveV48 || typeof submitTimerStudyModal !== "function") return;
  globalThis.__aldusExactTimerSecondsArchiveV48 = true;
  const originalSubmitTimerStudyModal = submitTimerStudyModal;

  submitTimerStudyModal = function submitTimerStudyModalWithExactSeconds(event) {
    const draft = typeof pendingTimerStudyDraft !== "undefined" && pendingTimerStudyDraft
      ? { sessionId: pendingTimerStudyDraft.sessionId, seconds: Math.max(0, Number(pendingTimerStudyDraft.seconds) || 0) }
      : null;
    const result = originalSubmitTimerStudyModal(event);
    if (!draft?.sessionId || !draft.seconds) return result;

    const session = (state.studies || []).find((study) => String(study.timerSessionId || study.sessionId || "") === String(draft.sessionId));
    if (!session) return result;
    const previousSeconds = Math.max(0, Number(session.seconds) || Number(session.elapsedSeconds) || 0);
    if (previousSeconds >= draft.seconds) return result;

    session.seconds = draft.seconds;
    session.elapsedSeconds = draft.seconds;
    session.actualDurationSeconds = draft.seconds;
    saveData({ markLocalChange: true });
    if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("timer-exact-seconds");
    return result;
  };
}

function installRecoveredTimePersistence() {
  if (globalThis.__aldusRecoveredTimePersistenceV48) return;
  globalThis.__aldusRecoveredTimePersistenceV48 = true;
  setTimeout(() => {
    try {
      const report = globalThis.__aldusTimeStorageRecoveryReport;
      if (!report?.changed) return;
      if (typeof reconcileSavedTimerTotals === "function") reconcileSavedTimerTotals();
      saveData({ markLocalChange: true });
      render();
      if (typeof showDailyGoalMessage === "function") {
        showDailyGoalMessage("Tempos recuperados localmente. Revise antes de enviar à nuvem.", "success");
      }
      if (typeof markPendingSync === "function") {
        markPendingSync("time-storage-recovery", "Tempo recuperado localmente; revise os totais antes de sincronizar com outros dispositivos.");
      }
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível persistir automaticamente o tempo recuperado.", error);
    }
  }, 2400);
}

installGoalTimeNonRegressionProtection();
installPrimaryStorageMergeProtection();
installExactTimerSecondsArchive();
installRecoveredTimePersistence();
