(() => {
  "use strict";

  const VERSION = "20260810-duplicate-batch-authoritative-v302";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const MAIN_LOCAL_KEY = "metasConcursoData";
  const MAIN_DB_NAME = "metas-estudo-db";
  const MAIN_STORE = "appState";
  const MAIN_RECORD_ID = "current";
  const BACKUP_DB_NAME = "aldus-duplicate-diagnostics-v260";
  const BACKUP_STORE = "snapshots";

  function cloneData(value) {
    if (value === undefined) return undefined;
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function replaceStateContents(targetState, nextState) {
    if (!targetState || typeof targetState !== "object" || !nextState || typeof nextState !== "object") {
      throw new Error("Estado inválido para atualização do lote.");
    }
    const replacement = cloneData(nextState);
    Object.keys(targetState).forEach((key) => delete targetState[key]);
    Object.assign(targetState, replacement);
    return targetState;
  }

  function runtimeState() {
    try {
      if (typeof state === "object" && state) return state;
    } catch {}
    return globalThis.state || null;
  }

  function diagnosticsApi() {
    return globalThis.AldusDuplicateDiagnosticsV260 || null;
  }

  function checksumText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-v302-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function removedIdsFromPlan(plan) {
    return new Set((plan?.actions || []).map((action) => String(action.removedId || "")).filter(Boolean));
  }

  function remainingRemovedIds(targetState, removedIds) {
    const activeIds = new Set((targetState?.syllabusItems || []).map((item) => String(item?.id || "")));
    return [...removedIds].filter((id) => activeIds.has(id));
  }

  function openDatabase(name, version, onUpgrade) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => onUpgrade?.(request.result);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`Falha ao abrir ${name}.`));
      request.onblocked = () => reject(new Error(`Banco ${name} bloqueado por outra aba.`));
    });
  }

  async function saveBackupSnapshot(targetState, label) {
    if (typeof indexedDB === "undefined") throw new Error("IndexedDB indisponível para criar a cópia de segurança.");
    const data = cloneData(targetState);
    const serialized = JSON.stringify(data);
    const createdAt = new Date().toISOString();
    const record = {
      id: `v302-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version: VERSION,
      createdAt,
      label,
      checksum: checksumText(serialized),
      counts: { syllabusItems: Array.isArray(data.syllabusItems) ? data.syllabusItems.length : 0 },
      data
    };
    const database = await openDatabase(BACKUP_DB_NAME, 1, (db) => {
      if (!db.objectStoreNames.contains(BACKUP_STORE)) db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(BACKUP_STORE, "readwrite");
      transaction.objectStore(BACKUP_STORE).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao criar a cópia integral."));
      transaction.onabort = () => reject(transaction.error || new Error("Cópia integral abortada."));
    }).finally(() => database.close());
    return record;
  }

  async function writeMainIndexedDB(targetState) {
    const data = cloneData(targetState);
    const serialized = JSON.stringify(data);
    const record = {
      id: MAIN_RECORD_ID,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      checksum: checksumText(serialized),
      serializedSize: serialized.length,
      data
    };
    const database = await openDatabase(MAIN_DB_NAME, 1, (db) => {
      if (!db.objectStoreNames.contains(MAIN_STORE)) db.createObjectStore(MAIN_STORE, { keyPath: "id" });
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(MAIN_STORE, "readwrite");
      transaction.objectStore(MAIN_STORE).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao gravar o estado principal."));
      transaction.onabort = () => reject(transaction.error || new Error("Gravação principal abortada."));
    }).finally(() => database.close());
    return record;
  }

  async function readMainIndexedDB() {
    const database = await openDatabase(MAIN_DB_NAME, 1, (db) => {
      if (!db.objectStoreNames.contains(MAIN_STORE)) db.createObjectStore(MAIN_STORE, { keyPath: "id" });
    });
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(MAIN_STORE, "readonly");
      const request = transaction.objectStore(MAIN_STORE).get(MAIN_RECORD_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Falha ao validar o estado principal."));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Falha ao ler o estado principal."));
      };
    });
  }

  async function persistAuthoritativeState(targetState, removedIds) {
    const authoritative = cloneData(targetState);
    try {
      if (typeof saveData === "function") {
        await Promise.resolve(saveData({ markLocalChange: true, skipDerivedRefresh: true }));
      }
    } catch (error) {
      console.warn(`[${VERSION}] Salvamento normal não concluiu; aplicando persistência autoritativa.`, error);
    }

    replaceStateContents(targetState, authoritative);
    const serialized = JSON.stringify(authoritative);
    try {
      localStorage.setItem(MAIN_LOCAL_KEY, serialized);
    } catch (error) {
      console.warn(`[${VERSION}] A cópia localStorage não pôde ser atualizada.`, error);
    }
    await writeMainIndexedDB(authoritative);

    const runtimeRemaining = remainingRemovedIds(targetState, removedIds);
    const stored = await readMainIndexedDB();
    const storedRemaining = remainingRemovedIds(stored?.data, removedIds);
    if (runtimeRemaining.length || storedRemaining.length) {
      throw new Error(`A validação encontrou ${Math.max(runtimeRemaining.length, storedRemaining.length)} metas ainda presentes após a gravação.`);
    }
    return { stored, runtimeRemaining, storedRemaining };
  }

  function setStatus(root, message, type = "info") {
    const node = root?.querySelector("[data-dup-status]");
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
  }

  function setControlsBusy(root, busy) {
    root?.querySelectorAll("button, select, input").forEach((control) => {
      if (control.matches("[data-dup-close]")) return;
      control.disabled = Boolean(busy);
    });
  }

  function closePreview(root) {
    const preview = root?.querySelector("[data-dup-batch-preview]");
    if (!preview) return;
    preview.hidden = true;
    preview.innerHTML = "";
  }

  function recordDiagnostic(details) {
    globalThis.__aldusDuplicateBatchV302LastRun = Object.freeze(cloneData(details));
    try {
      localStorage.setItem("aldusDuplicateBatchV302LastRun", JSON.stringify(details));
    } catch {}
  }

  async function refreshDiagnostic(root) {
    const runButton = root?.querySelector("[data-dup-run]");
    if (!runButton) return;
    setControlsBusy(root, false);
    runButton.click();
  }

  async function applyBatch(event) {
    const confirmButton = event.target.closest?.(`#${ROOT_ID} [data-dup-batch-confirm]`);
    if (!confirmButton) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const root = document.getElementById(ROOT_ID);
    const targetState = runtimeState();
    const api = diagnosticsApi();
    if (!root || !targetState || !api?.diagnoseState || !api?.recommendedBatchPlan || !api?.consolidateItems) {
      setStatus(root, `A correção ${VERSION} não encontrou o estado ativo. Feche outras abas do site e tente novamente.`, "error");
      return;
    }

    const report = api.diagnoseState(targetState, { includeDecided: true });
    const plan = api.recommendedBatchPlan(report);
    if (!plan.actions.length) {
      closePreview(root);
      setStatus(root, "Nenhuma recomendação segura permanece disponível para consolidação.", "info");
      return;
    }

    const rollbackState = cloneData(targetState);
    const workingState = cloneData(targetState);
    const removedIds = removedIdsFromPlan(plan);
    const startedAt = new Date().toISOString();
    setControlsBusy(root, true);
    closePreview(root);
    setStatus(root, `V302: criando cópia integral antes de ${plan.actions.length} consolidações…`);

    try {
      const backup = await saveBackupSnapshot(targetState, `before-authoritative-batch-${plan.actions.length}`);
      let remappedLinks = 0;
      plan.actions.forEach((action, index) => {
        const result = api.consolidateItems(workingState, action.keeperId, action.removedId, {
          backupId: backup.id,
          decidedAt: startedAt,
          auditId: `v302-${Date.now()}-${index + 1}`
        });
        remappedLinks += Number(result?.remappedLinks) || 0;
      });

      const preparedRemaining = remainingRemovedIds(workingState, removedIds);
      if (preparedRemaining.length) {
        throw new Error(`O lote preparado ainda contém ${preparedRemaining.length} metas que deveriam ser consolidadas.`);
      }

      replaceStateContents(targetState, workingState);
      setStatus(root, "V302: gravando e verificando o estado ativo e o IndexedDB…");
      await persistAuthoritativeState(targetState, removedIds);
      recordDiagnostic({
        version: VERSION,
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
        beforeItems: rollbackState.syllabusItems?.length || 0,
        afterItems: targetState.syllabusItems?.length || 0,
        consolidations: plan.actions.length,
        remappedLinks,
        removedIds: [...removedIds],
        backupId: backup.id
      });
      setStatus(root, `V302 concluída: ${plan.actions.length} metas consolidadas, ${remappedLinks} vínculos preservados e gravação confirmada. Atualizando o diagnóstico…`, "success");
      await refreshDiagnostic(root);
    } catch (error) {
      replaceStateContents(targetState, rollbackState);
      try {
        localStorage.setItem(MAIN_LOCAL_KEY, JSON.stringify(rollbackState));
        await writeMainIndexedDB(rollbackState);
      } catch (rollbackError) {
        console.error(`[${VERSION}] Falha ao restaurar o estado anterior.`, rollbackError);
      }
      recordDiagnostic({
        version: VERSION,
        status: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: String(error?.message || error)
      });
      console.error(`[${VERSION}] Consolidação autoritativa não concluída.`, error);
      setControlsBusy(root, false);
      setStatus(root, `V302 não concluiu o lote: ${String(error?.message || error)} Nenhuma exclusão foi mantida.`, "error");
    }
  }

  function markInstalled() {
    const root = document.getElementById(ROOT_ID);
    const button = root?.querySelector("[data-dup-batch]");
    if (button) {
      button.dataset.authoritativeBatchVersion = VERSION;
      button.title = "Consolidação autoritativa V302 com verificação pós-gravação.";
    }
    return Boolean(root && button);
  }

  function install() {
    if (globalThis.__aldusDuplicateBatchAuthoritativeV302) return;
    document.addEventListener("click", applyBatch, true);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (markInstalled() || attempts >= 100) window.clearInterval(timer);
    }, 100);
    globalThis.__aldusDuplicateBatchAuthoritativeV302 = Object.freeze({
      version: VERSION,
      replaceStateContents,
      remainingRemovedIds,
      persistAuthoritativeState
    });
  }

  const API = Object.freeze({ VERSION, cloneData, replaceStateContents, removedIdsFromPlan, remainingRemovedIds });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
    return;
  }
  if (typeof document !== "undefined") install();
})();
