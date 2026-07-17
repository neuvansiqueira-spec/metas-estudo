function syncPreparePayload(payload = {}) {
  const prepared = { ...payload, state: cloneData(payload.state || state) };
  prepared.stateFingerprint = syncStateFingerprint(prepared.state);
  return prepared;
}

async function uploadSyncPayloadIntegral(payload = makeSyncPayload(), { statusMessage = "Dados enviados para a nuvem com sucesso." } = {}) {
  if (isSyncing) return null;
  isSyncing = true;
  try {
    payload = syncPreparePayload(payload);
    const file = await findSyncFile();
    if (file) {
      const remotePayload = await downloadSyncFile(file.id);
      validateCloudPayload(remotePayload);
      syncCreateSafetyBackup(state, "before-cloud-upload-merge");
      const mergedAt = new Date().toISOString();
      const mergedState = mergeSyncStates(remotePayload.state, payload.state, "local");
      payload = {
        ...remotePayload,
        ...payload,
        app: "metas-estudo",
        schemaVersion: 1,
        updatedAt: mergedAt,
        cloudDataUpdatedAt: mergedAt,
        localDataUpdatedAt: mergedAt,
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        mergedDeviceIds: [...new Set([...(remotePayload.mergedDeviceIds || []), remotePayload.deviceId, ...(payload.mergedDeviceIds || []), payload.deviceId].filter(Boolean))],
        state: mergedState,
        stateFingerprint: syncStateFingerprint(mergedState)
      };
    }
    payload = syncPreparePayload(payload);
    const saved = file ? await updateSyncFile(file.id, payload) : await createSyncFile(payload);
    replaceState(payload.state);
    saveData({ skipSyncTimestamp: true });
    writeSyncMeta({ connected: true, pendingSync: false, pendingSyncReason: null, localDirty: false, lastSyncAt: new Date().toISOString(), remoteUpdatedAt: syncPayloadUpdatedAt(payload), cloudDataUpdatedAt: syncPayloadUpdatedAt(payload), localDataUpdatedAt: syncPayloadUpdatedAt(payload), lastLocalUpdateAt: syncPayloadUpdatedAt(payload), remoteDeviceName: payload.deviceName, stateFingerprint: payload.stateFingerprint, error: "" });
    suppressAutoChecksAfterSync();
    render();
    renderSyncStatus(statusMessage);
    return saved;
  } finally {
    isSyncing = false;
  }
}

async function applyCloudPayloadIntegral(payload, { preserveView = false } = {}) {
  isApplyingRemote = true;
  try {
    validateCloudPayload(payload);
    syncCreateSafetyBackup(state, "before-cloud-download-merge");
    const mergedAt = new Date().toISOString();
    const mergedState = mergeSyncStates(state, payload.state, "remote");
    const mergedPayload = {
      ...payload,
      updatedAt: mergedAt,
      cloudDataUpdatedAt: mergedAt,
      localDataUpdatedAt: mergedAt,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      mergedDeviceIds: [...new Set([...(payload.mergedDeviceIds || []), payload.deviceId, getDeviceId()].filter(Boolean))],
      state: cloneData(mergedState),
      stateFingerprint: syncStateFingerprint(mergedState)
    };
    replaceState(mergedState);
    const snapshot = cloneData(state);
    const saved = await saveStateToIndexedDB(snapshot);
    const reloaded = await loadStateFromIndexedDB();
    if (!statesMatchIndexedDBRecord(snapshot, reloaded)) throw new Error("A validação da restauração no IndexedDB falhou.");
    indexedDBStatus.available = true;
    indexedDBStatus.activeSource = "IndexedDB";
    indexedDBStatus.lastLoadedSource = "Mesclagem Google Drive";
    indexedDBStatus.lastCopyAt = saved.savedAt;
    indexedDBStatus.validation = "Dados locais e da nuvem mesclados e validados no IndexedDB";
    indexedDBStatus.size = estimateSerializedStateSize(snapshot);
    writeCloudStateTransaction(snapshot, mergedPayload);
    let uploadSucceeded = false;
    try {
      await uploadSyncPayloadIntegral(mergedPayload, { statusMessage: "Dados dos dispositivos mesclados e enviados para a nuvem." });
      uploadSucceeded = true;
    } catch (uploadError) {
      console.warn("[Metas Estudo] A mesclagem foi preservada localmente, mas o reenvio para a nuvem ficou pendente.", uploadError);
      markPendingSync("cloud-merge", "Dados mesclados neste dispositivo. Reenvio para a nuvem pendente.");
    }
    writeSyncMeta({ connected: true, pendingSync: !uploadSucceeded, pendingSyncReason: uploadSucceeded ? null : "cloud-merge", localDirty: !uploadSucceeded, lastLocalUpdateAt: mergedAt, localDataUpdatedAt: mergedAt, lastSyncAt: new Date().toISOString(), lastAutoSyncError: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", remoteUpdatedAt: mergedAt, cloudDataUpdatedAt: mergedAt, remoteDeviceName: payload.deviceName || "", stateFingerprint: mergedPayload.stateFingerprint, error: uploadSucceeded ? "" : "Dados mesclados; envio para a nuvem pendente.", errorDetails: "", lastCloudDialogAt: "" });
    suppressAutoChecksAfterSync();
    render();
    if (!preserveView) showView("backup");
    renderSyncStatus(uploadSucceeded ? "Sincronização integral concluída sem perda de sessões." : "Dados mesclados neste dispositivo. Reenvio para a nuvem pendente.");
  } catch (error) {
    if (!error.cloudSyncKind) throw cloudSyncError("apply", "Erro ao mesclar os dados da nuvem. Os dados locais foram preservados.", error);
    throw error;
  } finally {
    isApplyingRemote = false;
  }
}

const DEVICE_SYNC_AUTH_RETRY_INTERVAL_MS = 10 * 60 * 1000;
let deviceSyncAuthorizationLastAttemptAt = 0;
let deviceSyncAuthorizationInFlight = null;

async function ensureConnectedGoogleDriveAuthorization({ force = false } = {}) {
  const meta = readSyncMeta();
  if (!meta.connected) return false;
  if (hasValidGoogleDriveAccessToken()) return true;
  const now = Date.now();
  if (!force && now - deviceSyncAuthorizationLastAttemptAt < DEVICE_SYNC_AUTH_RETRY_INTERVAL_MS) return false;
  if (deviceSyncAuthorizationInFlight) return deviceSyncAuthorizationInFlight;
  deviceSyncAuthorizationLastAttemptAt = now;
  deviceSyncAuthorizationInFlight = (async () => {
    try {
      await getAccessToken({ prompt: "" });
      if (hasValidGoogleDriveAccessToken()) {
        writeSyncMeta({ connected: true, error: "", errorDetails: "" });
        renderSyncStatus("Autorização Google renovada. Sincronização retomada.");
        return true;
      }
    } catch (error) {
      console.warn("[Metas Estudo] A autorização Google não pôde ser renovada silenciosamente.", error);
    }
    const message = "Autorização expirada. Toque em Conectar Google Drive para renovar e enviar as alterações pendentes.";
    writeSyncMeta({ connected: true, pendingSync: true, error: message });
    renderSyncStatus(message);
    return false;
  })();
  try {
    return await deviceSyncAuthorizationInFlight;
  } finally {
    deviceSyncAuthorizationInFlight = null;
  }
}

async function syncNowIntegral() {
  if (!canRunAutoSyncChecks()) return;
  try {
    if (readSyncMeta()?.connected && !hasValidGoogleDriveAccessToken()) {
      const authorized = await ensureConnectedGoogleDriveAuthorization({ force: true });
      if (!authorized) return;
    }
    const remote = await pullSyncPayload();
    const localFingerprint = syncStateFingerprint(state);
    const remoteFingerprint = syncPayloadFingerprint(remote);
    if (localFingerprint === remoteFingerprint) {
      writeSyncMeta({ connected: true, stateFingerprint: localFingerprint, error: "" });
      renderSyncStatus("Tudo sincronizado. O conteúdo dos dispositivos é idêntico.");
      return;
    }
    await applyCloudPayloadIntegral(remote);
  } catch (error) {
    recordCloudSyncError(error, "Erro ao sincronizar.");
  }
}

async function checkCloudForNewerVersionIntegral(context = "open") {
  if (!canRunAutoSyncChecks()) return;
  const meta = readSyncMeta();
  if (!meta.connected) {
    if (context === "open") renderSyncStatus("Conecte ao Google Drive para verificar atualizações da nuvem.");
    return;
  }
  if (!hasValidGoogleDriveAccessToken()) {
    const mayRetryAuthorization = !String(context).includes("interval");
    const authorized = mayRetryAuthorization ? await ensureConnectedGoogleDriveAuthorization() : false;
    if (!authorized) {
      if (context === "open" || String(context).startsWith("device-")) {
        renderSyncStatus("Autorização expirada. Toque em Conectar Google Drive para renovar.");
      }
      return;
    }
  }
  const now = Date.now();
  if (cloudAutoCheckRunning || now < suppressAutoCheckUntil || (context !== "open" && now - lastCloudAutoCheckAt < 5000)) return;
  cloudAutoCheckRunning = true;
  lastCloudAutoCheckAt = now;
  try {
    const remote = await pullSyncPayload();
    const localFingerprint = syncStateFingerprint(state);
    const remoteFingerprint = syncPayloadFingerprint(remote);
    if (localFingerprint === remoteFingerprint) {
      writeSyncMeta({ connected: true, stateFingerprint: localFingerprint, error: "" });
      renderSyncStatus("Tudo sincronizado. O conteúdo dos dispositivos é idêntico.");
      return;
    }
    await applyCloudPayloadIntegral(remote, { preserveView: true });
  } catch (error) {
    recordCloudSyncError(error, "Erro ao consultar a nuvem.");
  } finally {
    cloudAutoCheckRunning = false;
  }
}

const DEVICE_SYNC_REFRESH_INTERVAL_MS = 20000;
let deviceSyncRefreshRunning = false;
let deviceSyncRefreshLastAt = 0;

function deviceSyncRefreshCanRun() {
  if (typeof document === "undefined" || document.visibilityState === "hidden") return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (typeof readSyncMeta !== "function" || !readSyncMeta()?.connected) return false;
  if (typeof isSyncing !== "undefined" && isSyncing) return false;
  if (typeof isApplyingRemote !== "undefined" && isApplyingRemote) return false;
  if (typeof cloudAutoCheckRunning !== "undefined" && cloudAutoCheckRunning) return false;
  if (typeof floatingTimer !== "undefined" && floatingTimer?.startedAt && !floatingTimer?.paused) return false;
  const activeTag = String(document.activeElement?.tagName || "").toUpperCase();
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return false;
  return true;
}

async function refreshDeviceFromCloud(reason = "interval") {
  if (!deviceSyncRefreshCanRun() || deviceSyncRefreshRunning) return;
  const now = Date.now();
  if (reason === "interval" && now - deviceSyncRefreshLastAt < DEVICE_SYNC_REFRESH_INTERVAL_MS - 1000) return;
  deviceSyncRefreshRunning = true;
  deviceSyncRefreshLastAt = now;
  try {
    await checkCloudForNewerVersionIntegral(`device-${reason}`);
  } catch (error) {
    console.warn("[Metas Estudo] A atualização automática deste dispositivo falhou.", error);
  } finally {
    deviceSyncRefreshRunning = false;
  }
}

function installDeviceSyncRefresh() {
  if (typeof window === "undefined" || typeof document === "undefined" || globalThis.__metasDeviceSyncRefreshV33) return;
  globalThis.__metasDeviceSyncRefreshV33 = true;
  const schedule = (reason, delay = 250) => setTimeout(() => refreshDeviceFromCloud(reason), delay);
  window.addEventListener("focus", () => schedule("focus"));
  window.addEventListener("pageshow", () => schedule("pageshow", 400));
  window.addEventListener("online", () => schedule("online", 500));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule("visible", 350);
  });
  setInterval(() => refreshDeviceFromCloud("interval"), DEVICE_SYNC_REFRESH_INTERVAL_MS);
  schedule("startup", 1800);
}

let sameDeviceStateSyncApplying = false;

function installSameDeviceStateSync() {
  if (typeof window === "undefined" || globalThis.__metasSameDeviceStateSyncV33) return;
  globalThis.__metasSameDeviceStateSyncV33 = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue || sameDeviceStateSyncApplying) return;
    try {
      const incomingState = JSON.parse(event.newValue);
      if (!incomingState || typeof incomingState !== "object" || Array.isArray(incomingState)) return;
      const currentFingerprint = syncStateFingerprint(state);
      const incomingFingerprint = syncStateFingerprint(incomingState);
      if (currentFingerprint === incomingFingerprint) return;
      sameDeviceStateSyncApplying = true;
      const mergedState = mergeSyncStates(state, incomingState, "remote");
      replaceState(mergedState);
      saveData({ skipSyncTimestamp: true });
      render();
      if (typeof showDailyGoalMessage === "function") {
        showDailyGoalMessage("Dados atualizados pelo outro aplicativo deste dispositivo.", "success");
      }
    } catch (error) {
      console.warn("[Metas Estudo] Falha ao atualizar outra janela deste dispositivo.", error);
    } finally {
      setTimeout(() => { sameDeviceStateSyncApplying = false; }, 0);
    }
  });
}

function installAutoSyncAuthorizationRetry() {
  if (globalThis.__metasAutoSyncAuthorizationRetryV33 || typeof runAutoSyncAfterSave !== "function") return;
  globalThis.__metasAutoSyncAuthorizationRetryV33 = true;
  const originalRunAutoSyncAfterSave = runAutoSyncAfterSave;
  runAutoSyncAfterSave = async function runAutoSyncAfterSaveWithAuthorization(reason) {
    const meta = readSyncMeta();
    if (meta.connected && !hasValidGoogleDriveAccessToken()) {
      await ensureConnectedGoogleDriveAuthorization({ force: true });
    }
    return originalRunAutoSyncAfterSave(reason);
  };
}

installSameDeviceStateSync();
installAutoSyncAuthorizationRetry();
installDeviceSyncRefresh();