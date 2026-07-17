async function uploadSyncPayloadIntegral(payload = makeSyncPayload(), { statusMessage = "Dados enviados para a nuvem com sucesso." } = {}) {
  if (isSyncing) return null;
  isSyncing = true;
  try {
    const file = await findSyncFile();
    if (file) {
      const remotePayload = await downloadSyncFile(file.id);
      validateCloudPayload(remotePayload);
      syncCreateSafetyBackup(state, "before-cloud-upload-merge");
      const mergedAt = new Date().toISOString();
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
        state: mergeSyncStates(remotePayload.state, payload.state, "local")
      };
    }
    const saved = file ? await updateSyncFile(file.id, payload) : await createSyncFile(payload);
    replaceState(payload.state);
    saveData({ skipSyncTimestamp: true });
    writeSyncMeta({ connected: true, pendingSync: false, pendingSyncReason: null, localDirty: false, lastSyncAt: new Date().toISOString(), remoteUpdatedAt: syncPayloadUpdatedAt(payload), cloudDataUpdatedAt: syncPayloadUpdatedAt(payload), localDataUpdatedAt: syncPayloadUpdatedAt(payload), lastLocalUpdateAt: syncPayloadUpdatedAt(payload), remoteDeviceName: payload.deviceName, error: "" });
    suppressAutoChecksAfterSync();
    render();
    renderSyncStatus(statusMessage);
    return saved;
  } finally {
    isSyncing = false;
  }
}

async function applyCloudPayloadIntegral(payload) {
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
      state: cloneData(mergedState)
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
    writeSyncMeta({ connected: true, pendingSync: !uploadSucceeded, pendingSyncReason: uploadSucceeded ? null : "cloud-merge", localDirty: !uploadSucceeded, lastLocalUpdateAt: mergedAt, localDataUpdatedAt: mergedAt, lastSyncAt: new Date().toISOString(), lastAutoSyncError: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", remoteUpdatedAt: mergedAt, cloudDataUpdatedAt: mergedAt, remoteDeviceName: payload.deviceName || "", error: uploadSucceeded ? "" : "Dados mesclados; envio para a nuvem pendente.", errorDetails: "", lastCloudDialogAt: "" });
    suppressAutoChecksAfterSync();
    render();
    showView("backup");
    renderSyncStatus(uploadSucceeded ? "Sincronização integral concluída sem perda de sessões." : "Dados mesclados neste dispositivo. Reenvio para a nuvem pendente.");
  } catch (error) {
    if (!error.cloudSyncKind) throw cloudSyncError("apply", "Erro ao mesclar os dados da nuvem. Os dados locais foram preservados.", error);
    throw error;
  } finally {
    isApplyingRemote = false;
  }
}
