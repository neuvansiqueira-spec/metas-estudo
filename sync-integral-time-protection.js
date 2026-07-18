const TIME_STORAGE_PROTECTION_VERSION = "20260718-diagnostico-recuperacao-tempo-v49";
const TIME_STORAGE_BACKUP_KEY = "metasEstudoBackupAntesDaMesclagem";
const TIME_STORAGE_MANUAL_RECOVERY_BACKUP_KEY = "metasEstudoBackupAntesDaRecuperacaoTempoV49";
const TIME_RECOVERY_COLLECTIONS = ["studies", "dailyGoals", "questionLogs"];
const TIME_RECOVERY_NUMERIC_FIELDS = new Set([
  "minutes", "seconds", "elapsedSeconds", "actualDurationSeconds", "actualDuration",
  "actualMinutes", "studyActualMinutes", "questionActualMinutes", "tempo_real_minutos",
  "performedMinutes", "tempoRealizado", "tempo_realizado", "realizedMinutes"
]);

function timeProtectionClone(value) {
  return typeof cloneData === "function" ? cloneData(value ?? null) : JSON.parse(JSON.stringify(value ?? null));
}

function timeProtectionHasUserData(value = {}) {
  if (typeof stateHasUserData === "function") return stateHasUserData(value);
  return ["subjects", "studies", "syllabusItems", "dailyGoals", "questionLogs", "materials", "questionBank", "simulados", "smartReviews", "factoryAgenda", "factoryItems"]
    .some((key) => Array.isArray(value?.[key]) && value[key].length);
}

function timeProtectionHasTimeData(value = {}) {
  return TIME_RECOVERY_COLLECTIONS.some((key) => Array.isArray(value?.[key]) && value[key].length);
}

function timeProtectionSessionKey(study = {}) {
  return String(study.timerSessionId || study.sessionId || study.id || "");
}

function timeProtectionStudyMinutes(study = {}) {
  const seconds = Math.max(0, Number(study.seconds) || Number(study.elapsedSeconds) || Number(study.actualDurationSeconds) || 0);
  return Math.max(0, Number(study.minutes) || (seconds ? Math.round(seconds / 60) : 0));
}

function timeProtectionGoalStudyMinutes(goal = {}) {
  if (goal.studyActualMinutes !== undefined && goal.studyActualMinutes !== null && goal.studyActualMinutes !== "") {
    return Math.max(0, Number(goal.studyActualMinutes) || 0);
  }
  return Math.max(0, (Number(goal.actualMinutes ?? goal.tempo_real_minutos) || 0) - (Number(goal.questionActualMinutes) || 0));
}

function timeProtectionEffectiveStudyMinutes(value = {}) {
  const studies = Array.isArray(value?.studies) ? value.studies : [];
  const goals = Array.isArray(value?.dailyGoals) ? value.dailyGoals : [];
  const seenSessions = new Set();
  const archived = studies.reduce((sum, study) => {
    const key = timeProtectionSessionKey(study);
    if (key && seenSessions.has(key)) return sum;
    if (key) seenSessions.add(key);
    const isQuestions = study.timerKind === "questions" || study.kind === "questions";
    return isQuestions ? sum : sum + timeProtectionStudyMinutes(study);
  }, 0);
  const unlogged = goals.reduce((sum, goal) => {
    const linked = studies.reduce((linkedSum, study) => {
      if (study.goalId !== goal.id || study.origin !== "timer" || study.updatesGoal === false) return linkedSum;
      if (study.timerKind === "questions" || study.kind === "questions") return linkedSum;
      return linkedSum + timeProtectionStudyMinutes(study);
    }, 0);
    return sum + Math.max(0, timeProtectionGoalStudyMinutes(goal) - linked);
  }, 0);
  return archived + unlogged;
}

function timeProtectionSummary(value = {}) {
  const studies = Array.isArray(value?.studies) ? value.studies : [];
  const goals = Array.isArray(value?.dailyGoals) ? value.dailyGoals : [];
  const questionLogs = Array.isArray(value?.questionLogs) ? value.questionLogs : [];
  const archivedMinutes = studies.reduce((sum, study) => sum + timeProtectionStudyMinutes(study), 0);
  const archivedStudyMinutes = studies.reduce((sum, study) => {
    const isQuestions = study.timerKind === "questions" || study.kind === "questions";
    return isQuestions ? sum : sum + timeProtectionStudyMinutes(study);
  }, 0);
  const goalMinutes = goals.reduce((sum, goal) => sum + Math.max(
    Number(goal.actualMinutes) || 0,
    Number(goal.tempo_real_minutos) || 0,
    (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0)
  ), 0);
  const goalStudyMinutes = goals.reduce((sum, goal) => sum + timeProtectionGoalStudyMinutes(goal), 0);
  const questionLogMinutes = questionLogs.reduce((sum, log) => sum + Math.max(0, Number(log.minutes) || 0), 0);
  return {
    studies: studies.length,
    goals: goals.length,
    questionLogs: questionLogs.length,
    archivedMinutes,
    archivedStudyMinutes,
    goalMinutes,
    goalStudyMinutes,
    questionLogMinutes,
    conservativeStudyMinutes: Math.max(archivedStudyMinutes, goalStudyMinutes),
    effectiveStudyMinutes: timeProtectionEffectiveStudyMinutes(value)
  };
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
  if (globalThis.__aldusGoalTimeNonRegressionV49 || typeof normalizeGoalTimeFields !== "function") return;
  globalThis.__aldusGoalTimeNonRegressionV49 = true;
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

function timeProtectionCollectionKey(item, collection) {
  if (typeof syncCollectionKey === "function") return syncCollectionKey(item, collection);
  return `${collection}:${String(item?.id || item?.sessionId || item?.timerSessionId || JSON.stringify(item || {}))}`;
}

function timeProtectionMergeArrays(left, right) {
  if (typeof syncPrimitiveArray === "function") return syncPrimitiveArray(Array.isArray(left) ? left : [], Array.isArray(right) ? right : []);
  const seen = new Set();
  return [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].filter((item) => {
    const key = typeof item === "object" && item !== null ? JSON.stringify(item) : `${typeof item}:${String(item)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function timeProtectionMergeRecordMaximum(current = {}, candidate = {}) {
  const merged = typeof syncMergeRecord === "function"
    ? syncMergeRecord(current || {}, candidate || {}, "remote")
    : { ...timeProtectionClone(current || {}), ...timeProtectionClone(candidate || {}) };
  const keys = new Set([...Object.keys(current || {}), ...Object.keys(candidate || {})]);
  keys.forEach((key) => {
    if (TIME_RECOVERY_NUMERIC_FIELDS.has(key)) {
      merged[key] = Math.max(Number(current?.[key]) || 0, Number(candidate?.[key]) || 0);
    } else if (["history", "historico", "events", "logs", "auditTrail"].includes(key)) {
      merged[key] = timeProtectionMergeArrays(current?.[key], candidate?.[key]);
    }
  });
  return merged;
}

function timeProtectionRecordMinutes(item = {}, collection = "") {
  if (collection === "studies") return timeProtectionStudyMinutes(item);
  if (collection === "dailyGoals") return Math.max(
    Number(item.actualMinutes) || 0,
    Number(item.tempo_real_minutos) || 0,
    (Number(item.studyActualMinutes) || 0) + (Number(item.questionActualMinutes) || 0)
  );
  return Math.max(0, Number(item.minutes) || 0);
}

function mergeTimeRecoveryIgnoringTombstones(currentState, candidateState) {
  const result = timeProtectionClone(currentState || {}) || {};
  const restoredKeys = { studies: [], dailyGoals: [], questionLogs: [] };

  TIME_RECOVERY_COLLECTIONS.forEach((collection) => {
    const currentList = Array.isArray(result[collection]) ? result[collection] : [];
    const candidateList = Array.isArray(candidateState?.[collection]) ? candidateState[collection] : [];
    const map = new Map(currentList.map((item) => [timeProtectionCollectionKey(item, collection), timeProtectionClone(item)]));

    candidateList.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const key = timeProtectionCollectionKey(item, collection);
      const before = map.get(key);
      const merged = before ? timeProtectionMergeRecordMaximum(before, item) : timeProtectionClone(item);
      const gained = !before || timeProtectionRecordMinutes(merged, collection) > timeProtectionRecordMinutes(before, collection);
      if (gained) restoredKeys[collection].push(key);
      map.set(key, merged);
    });

    result[collection] = [...map.values()];
  });

  const tombstones = timeProtectionClone(result.syncTombstones || {}) || {};
  tombstones.collections ||= {};
  TIME_RECOVERY_COLLECTIONS.forEach((collection) => {
    tombstones.collections[collection] ||= {};
    restoredKeys[collection].forEach((key) => { delete tombstones.collections[collection][key]; });
  });
  result.syncTombstones = tombstones;

  if (typeof syncRebuildGoalTotals === "function") syncRebuildGoalTotals(result);
  (result.dailyGoals || []).forEach((goal) => {
    if (typeof reconcileGoalWithTimerHistory === "function") reconcileGoalWithTimerHistory(goal);
    if (typeof normalizeGoalTimeFields === "function") normalizeGoalTimeFields(goal);
  });

  return { state: result, restoredKeys };
}

function installPrimaryStorageMergeProtection() {
  if (globalThis.__aldusPrimaryStorageMergeProtectionV49 || typeof loadPrimaryStateFromIndexedDB !== "function") return;
  globalThis.__aldusPrimaryStorageMergeProtectionV49 = true;
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
  if (globalThis.__aldusExactTimerSecondsArchiveV49 || typeof submitTimerStudyModal !== "function") return;
  globalThis.__aldusExactTimerSecondsArchiveV49 = true;
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
  if (globalThis.__aldusRecoveredTimePersistenceV49) return;
  globalThis.__aldusRecoveredTimePersistenceV49 = true;
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

function timeProtectionExtractCandidate(parsed, key = "") {
  if (!parsed) return null;
  if (parsed.state && typeof parsed.state === "object" && !Array.isArray(parsed.state)) return parsed.state;
  if (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) return parsed.data;
  if (Array.isArray(parsed)) {
    if (["metasDoDia", "dailyGoals"].includes(key)) return { dailyGoals: parsed };
    if (["studies", "sessoesEstudo", "historicoEstudos"].includes(key)) return { studies: parsed };
    return null;
  }
  return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

function timeProtectionAddCandidate(list, seen, label, candidate, key = "") {
  const extracted = timeProtectionExtractCandidate(candidate, key);
  if (!timeProtectionHasTimeData(extracted)) return;
  const fingerprint = typeof syncStateFingerprint === "function"
    ? syncStateFingerprint({
      studies: extracted.studies || [],
      dailyGoals: extracted.dailyGoals || [],
      questionLogs: extracted.questionLogs || []
    })
    : JSON.stringify([extracted.studies || [], extracted.dailyGoals || [], extracted.questionLogs || []]);
  const existing = seen.get(fingerprint);
  if (existing) {
    if (!existing.labels.includes(label)) existing.labels.push(label);
    return;
  }
  const entry = { labels: [label], state: timeProtectionClone(extracted), fingerprint, summary: timeProtectionSummary(extracted) };
  seen.set(fingerprint, entry);
  list.push(entry);
}

async function collectTimeRecoveryCandidates() {
  const candidates = [];
  const seen = new Map();
  timeProtectionAddCandidate(candidates, seen, "Estado atualmente carregado", typeof state !== "undefined" ? state : null);

  try {
    if (typeof loadStateFromIndexedDB === "function") {
      const record = await loadStateFromIndexedDB();
      timeProtectionAddCandidate(candidates, seen, "IndexedDB", record?.data);
    }
  } catch (error) {
    console.warn("[Aldus Meta] Falha ao examinar IndexedDB no diagnóstico de tempo.", error);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) timeProtectionAddCandidate(candidates, seen, "localStorage principal", JSON.parse(local), STORAGE_KEY);
  } catch (error) {
    console.warn("[Aldus Meta] Falha ao examinar localStorage principal.", error);
  }

  try {
    const backup = localStorage.getItem(TIME_STORAGE_BACKUP_KEY);
    if (backup) timeProtectionAddCandidate(candidates, seen, "Backup anterior à mesclagem", JSON.parse(backup), TIME_STORAGE_BACKUP_KEY);
  } catch (error) {
    console.warn("[Aldus Meta] Falha ao examinar backup anterior à mesclagem.", error);
  }

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || [STORAGE_KEY, TIME_STORAGE_BACKUP_KEY].includes(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 2 || (!raw.startsWith("{") && !raw.startsWith("["))) continue;
      try {
        timeProtectionAddCandidate(candidates, seen, `Chave local: ${key}`, JSON.parse(raw), key);
      } catch (error) {}
    }
  } catch (error) {
    console.warn("[Aldus Meta] Falha ao examinar outras chaves locais.", error);
  }

  return candidates;
}

function buildTimeRecoveryPreview(candidates = []) {
  let preview = timeProtectionClone(typeof state !== "undefined" ? state : {}) || {};
  const restoredKeys = { studies: new Set(), dailyGoals: new Set(), questionLogs: new Set() };
  candidates.forEach((candidate) => {
    const merged = mergeTimeRecoveryIgnoringTombstones(preview, candidate.state);
    preview = merged.state;
    TIME_RECOVERY_COLLECTIONS.forEach((collection) => merged.restoredKeys[collection].forEach((key) => restoredKeys[collection].add(key)));
  });
  return {
    state: preview,
    restoredKeys,
    current: timeProtectionSummary(typeof state !== "undefined" ? state : {}),
    recovered: timeProtectionSummary(preview)
  };
}

function timeProtectionFormatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function timeProtectionTombstoneCount(value = {}) {
  const collections = value?.syncTombstones?.collections || {};
  return TIME_RECOVERY_COLLECTIONS.reduce((sum, collection) => sum + Object.keys(collections[collection] || {}).length, 0);
}

function ensureTimeRecoveryDiagnosticHost() {
  if (typeof document === "undefined") return null;
  let host = document.getElementById("timeRecoveryDiagnosticV49");
  if (host) return host;
  const review = document.getElementById("legacyTimerRecoveryReview");
  if (!review) return null;
  host = document.createElement("section");
  host.id = "timeRecoveryDiagnosticV49";
  host.className = "sync-status time-recovery-diagnostic";
  host.setAttribute("aria-live", "polite");
  review.insertAdjacentElement("afterend", host);
  return host;
}

function timeProtectionEscape(value) {
  return typeof escapeHTML === "function"
    ? escapeHTML(String(value ?? ""))
    : String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

async function renderTimeRecoveryDiagnostic() {
  const host = ensureTimeRecoveryDiagnosticHost();
  if (!host) return;
  host.innerHTML = "<p>Examinando todas as cópias locais de tempo...</p>";
  try {
    const candidates = await collectTimeRecoveryCandidates();
    const preview = buildTimeRecoveryPreview(candidates);
    const current = preview.current;
    const recovered = preview.recovered;
    const studyGain = Math.max(0, recovered.conservativeStudyMinutes - current.conservativeStudyMinutes);
    const sessionGain = Math.max(0, recovered.studies - current.studies);
    const goalGain = Math.max(0, recovered.goalStudyMinutes - current.goalStudyMinutes);
    const questionTimeGain = Math.max(0, recovered.questionLogMinutes - current.questionLogMinutes);
    const hasGain = studyGain > 0 || sessionGain > 0 || goalGain > 0 || questionTimeGain > 0;
    const tombstones = timeProtectionTombstoneCount(typeof state !== "undefined" ? state : {});
    const candidateRows = candidates.map((candidate) => {
      const summary = candidate.summary;
      return `<li><strong>${timeProtectionEscape(candidate.labels.join(" / "))}</strong>: ${summary.studies} sessões • ${timeProtectionFormatMinutes(summary.archivedStudyMinutes)} nas sessões • ${timeProtectionFormatMinutes(summary.goalStudyMinutes)} de estudo nas metas</li>`;
    }).join("");

    globalThis.__aldusTimeRecoveryDiagnosticV49 = { candidates, preview, hasGain, studyGain, sessionGain, goalGain, questionTimeGain, tombstones };
    const recoveryPanel = document.getElementById("legacyTimerRecoveryPanel");
    if (recoveryPanel) recoveryPanel.open = true;

    host.innerHTML = `
      <div class="section-heading"><div><p class="eyebrow">Diagnóstico ampliado</p><h3>RECUPERAÇÃO CONTROLADA DO TEMPO</h3></div></div>
      <p class="notice ${hasGain ? "warning-notice" : ""}">
        ${hasGain
          ? `Foram encontrados registros que podem acrescentar pelo menos <strong>${timeProtectionFormatMinutes(studyGain)}</strong> ao tempo de estudo preservado e <strong>${sessionGain}</strong> sessão(ões).`
          : "Nenhuma cópia local examinada apresentou tempo de estudo maior do que o estado atualmente carregado."}
      </p>
      <div class="card-meta-grid">
        <span>Tempo atual preservado: <strong>${timeProtectionFormatMinutes(current.conservativeStudyMinutes)}</strong></span>
        <span>Maior tempo recuperável: <strong>${timeProtectionFormatMinutes(recovered.conservativeStudyMinutes)}</strong></span>
        <span>Sessões atuais: <strong>${current.studies}</strong></span>
        <span>Sessões após recuperação: <strong>${recovered.studies}</strong></span>
        <span>Marcadores de exclusão ligados ao tempo: <strong>${tombstones}</strong></span>
        <span>Cópias distintas examinadas: <strong>${candidates.length}</strong></span>
      </div>
      <div class="actions">
        <button type="button" class="secondary-button" data-time-recovery-scan>Verificar novamente</button>
        <button type="button" data-time-recovery-apply ${hasGain ? "" : "disabled"}>Recuperar maior tempo encontrado</button>
      </div>
      <details><summary>Ver fontes e totais encontrados</summary><ul>${candidateRows || "<li>Nenhuma fonte local com registros de tempo foi encontrada.</li>"}</ul></details>
      <p class="item-meta">A recuperação ignora somente os marcadores que bloqueiam os registros de tempo escolhidos. Materiais, configurações, prompts e outras áreas permanecem como estão. Antes da alteração será criada uma cópia integral de segurança.</p>
    `;
  } catch (error) {
    console.warn("[Aldus Meta] Falha no diagnóstico ampliado do tempo.", error);
    host.innerHTML = `<p class="notice warning-notice">Não foi possível concluir o diagnóstico do tempo: ${timeProtectionEscape(error?.message || error)}</p><div class="actions"><button type="button" class="secondary-button" data-time-recovery-scan>Tentar novamente</button></div>`;
  }
}

function applyTimeRecoveryDiagnostic() {
  const diagnostic = globalThis.__aldusTimeRecoveryDiagnosticV49;
  if (!diagnostic?.hasGain || !diagnostic.preview?.state) return;
  const message = `Recuperar os registros encontrados?\n\nTempo atual preservado: ${timeProtectionFormatMinutes(diagnostic.preview.current.conservativeStudyMinutes)}\nTempo preservado após recuperação: ${timeProtectionFormatMinutes(diagnostic.preview.recovered.conservativeStudyMinutes)}\n\nSerá criado um backup integral antes da alteração. A nuvem não será atualizada automaticamente.`;
  if (typeof confirm === "function" && !confirm(message)) return;

  try {
    localStorage.setItem(TIME_STORAGE_MANUAL_RECOVERY_BACKUP_KEY, JSON.stringify({
      app: "aldus-meta",
      version: TIME_STORAGE_PROTECTION_VERSION,
      createdAt: new Date().toISOString(),
      state: timeProtectionClone(state)
    }));
    if (typeof replaceState === "function") replaceState(diagnostic.preview.state);
    else Object.assign(state, timeProtectionClone(diagnostic.preview.state));
    if (typeof reconcileSavedTimerTotals === "function") reconcileSavedTimerTotals();
    saveData({ markLocalChange: true });
    if (typeof markPendingSync === "function") {
      markPendingSync("manual-time-recovery-v49", "Tempo recuperado manualmente neste dispositivo; confira antes de enviar à nuvem.");
    }
    render();
    if (typeof showDailyGoalMessage === "function") {
      showDailyGoalMessage(`Recuperação concluída: pelo menos ${timeProtectionFormatMinutes(diagnostic.studyGain)} acrescentados ao tempo de estudo preservado.`, "success");
    }
    setTimeout(renderTimeRecoveryDiagnostic, 450);
  } catch (error) {
    console.error("[Aldus Meta] Não foi possível aplicar a recuperação controlada do tempo.", error);
    if (typeof showDailyGoalMessage === "function") showDailyGoalMessage("Não foi possível recuperar o tempo. Nenhum envio para a nuvem foi realizado.", "error");
  }
}

function installTimeRecoveryDiagnosticUI() {
  if (typeof document === "undefined" || globalThis.__aldusTimeRecoveryDiagnosticUIV49) return;
  globalThis.__aldusTimeRecoveryDiagnosticUIV49 = true;
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-time-recovery-scan]")) {
      event.preventDefault();
      renderTimeRecoveryDiagnostic();
    }
    if (event.target.closest("[data-time-recovery-apply]")) {
      event.preventDefault();
      applyTimeRecoveryDiagnostic();
    }
  });
  const schedule = () => setTimeout(renderTimeRecoveryDiagnostic, 250);
  window.addEventListener("hashchange", () => {
    if (String(location.hash || "").includes("backup")) schedule();
  });
  setTimeout(renderTimeRecoveryDiagnostic, 3300);
}

installGoalTimeNonRegressionProtection();
installPrimaryStorageMergeProtection();
installExactTimerSecondsArchive();
installRecoveredTimePersistence();
installTimeRecoveryDiagnosticUI();
