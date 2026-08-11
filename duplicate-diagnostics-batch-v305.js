(() => {
  "use strict";

  const VERSION = "20260811-duplicate-batch-core-pin-v308";
  const EXPECTED_API_VERSION = "20260811-duplicate-batch-performance-v304";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const MAIN_LOCAL_KEY = "metasConcursoData";
  const MAIN_DB_NAME = "metas-estudo-db";
  const MAIN_STORE = "appState";
  const MAIN_RECORD_ID = "current";
  const BACKUP_DB_NAME = "aldus-duplicate-diagnostics-v260";
  const BACKUP_STORE = "snapshots";
  const PLAN_CACHE_KEY = "__aldusDuplicateBatchPlanV304";

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

  function runtimeStateCandidates() {
    const candidates = [];
    const add = (candidate) => {
      if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.syllabusItems)) return;
      if (!candidates.includes(candidate)) candidates.push(candidate);
    };
    try {
      if (typeof state !== "undefined") add(state);
    } catch {}
    try { add(globalThis.state); } catch {}
    return candidates;
  }

  function planIds(plan) {
    return [...new Set((plan?.actions || []).flatMap((action) => [
      String(action?.keeperId || ""),
      String(action?.removedId || "")
    ]).filter(Boolean))];
  }

  function stateContainsPlan(stateValue, plan) {
    const activeIds = new Set((stateValue?.syllabusItems || []).map((item) => String(item?.id || "")));
    return planIds(plan).every((id) => activeIds.has(id));
  }

  function selectRuntimeState(plan) {
    const candidates = runtimeStateCandidates();
    const exact = candidates.find((candidate) => stateContainsPlan(candidate, plan));
    return exact || candidates[0] || null;
  }

  function synchronizeRuntimeStates(nextState) {
    const candidates = runtimeStateCandidates();
    candidates.forEach((candidate) => replaceStateContents(candidate, nextState));
    return candidates.length;
  }

  function diagnosticsApi() {
    const pinned = globalThis.AldusDuplicateDiagnosticsV304;
    if (pinned?.VERSION === EXPECTED_API_VERSION) return pinned;
    const compatible = globalThis.AldusDuplicateDiagnosticsV260;
    return compatible?.VERSION === EXPECTED_API_VERSION ? compatible : null;
  }

  function checksumText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-v308-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function checksumState(value) {
    return checksumText(JSON.stringify(value || {}));
  }

  function removedIdsFromPlan(plan) {
    return new Set((plan?.actions || []).map((action) => String(action?.removedId || "")).filter(Boolean));
  }

  function remainingRemovedIds(targetState, removedIds) {
    const activeIds = new Set((targetState?.syllabusItems || []).map((item) => String(item?.id || "")));
    return [...removedIds].filter((id) => activeIds.has(id));
  }

  function ensureDeletionTombstones(targetState, removedIds, deletedAt) {
    targetState.syncTombstones ||= { schemaVersion: 1, collections: {} };
    targetState.syncTombstones.schemaVersion ||= 1;
    targetState.syncTombstones.collections ||= {};
    targetState.syncTombstones.collections.syllabusItems ||= {};
    const tombstones = targetState.syncTombstones.collections.syllabusItems;
    [...removedIds].forEach((removedId) => {
      const key = `syllabusItems:id:${removedId}`;
      const existing = tombstones[key];
      const existingTime = Date.parse(existing?.deletedAt || "");
      const requestedTime = Date.parse(deletedAt || "");
      if (!existing || !Number.isFinite(existingTime) || existingTime < requestedTime) {
        tombstones[key] = {
          key,
          collection: "syllabusItems",
          deletedAt,
          deviceId: (() => {
            try { return typeof getDeviceId === "function" ? getDeviceId() : ""; } catch { return ""; }
          })(),
          reason: "duplicate-consolidation-v308",
          version: VERSION
        };
      }
    });
    return tombstones;
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
      id: `v308-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  function writeLocalStorageSnapshot(snapshot) {
    try {
      localStorage.setItem(MAIN_LOCAL_KEY, JSON.stringify(snapshot));
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] A cópia localStorage não pôde ser atualizada.`, error);
      return false;
    }
  }

  function validateSnapshot(snapshot, removedIds, expectedChecksum = "") {
    if (!snapshot || typeof snapshot !== "object") throw new Error("O estado persistido ficou indisponível após a consolidação.");
    const remaining = remainingRemovedIds(snapshot, removedIds);
    if (remaining.length) throw new Error(`A validação encontrou ${remaining.length} metas ainda presentes após a gravação.`);
    if (expectedChecksum && checksumState(snapshot) !== expectedChecksum) {
      throw new Error("O estado relido não corresponde ao lote consolidado que foi gravado.");
    }
    return snapshot;
  }

  function yieldToBrowser() {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
      else setTimeout(resolve, 0);
    });
  }

  function shortDelay(ms = 24) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function persistAuthoritativeState(targetState, removedIds) {
    const authoritative = cloneData(targetState);
    const expectedChecksum = checksumState(authoritative);

    synchronizeRuntimeStates(authoritative);
    writeLocalStorageSnapshot(authoritative);
    await writeMainIndexedDB(authoritative);

    let stored = await readMainIndexedDB();
    let verified = validateSnapshot(stored?.data, removedIds, expectedChecksum);
    synchronizeRuntimeStates(verified);

    try {
      if (typeof saveData === "function") {
        await Promise.resolve(saveData({ markLocalChange: true, skipDerivedRefresh: true }));
      }
    } catch (error) {
      console.warn(`[${VERSION}] Salvamento normal não concluiu; mantendo o snapshot autoritativo.`, error);
    }

    for (let cycle = 0; cycle < 4; cycle += 1) {
      await yieldToBrowser();
      await shortDelay(cycle === 0 ? 0 : 18);
      const runtimeCandidates = runtimeStateCandidates();
      const runtimeRegressed = runtimeCandidates.some((candidate) => remainingRemovedIds(candidate, removedIds).length > 0);
      stored = await readMainIndexedDB();
      const storedRegressed = remainingRemovedIds(stored?.data, removedIds).length > 0;
      if (runtimeRegressed || storedRegressed) {
        synchronizeRuntimeStates(verified);
        writeLocalStorageSnapshot(verified);
        await writeMainIndexedDB(verified);
      } else if (stored?.data && checksumState(stored.data) === checksumState(verified)) {
        verified = cloneData(stored.data);
        synchronizeRuntimeStates(verified);
      }
    }

    stored = await readMainIndexedDB();
    verified = validateSnapshot(stored?.data, removedIds);
    synchronizeRuntimeStates(verified);
    writeLocalStorageSnapshot(verified);
    return { stored, verified, runtimeCopies: runtimeStateCandidates().length };
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
    globalThis.__aldusDuplicateBatchV308LastRun = Object.freeze(cloneData(details));
    try {
      localStorage.setItem("aldusDuplicateBatchV308LastRun", JSON.stringify(details));
    } catch {}
  }

  function cachedPlanForState(targetState, api) {
    const cached = globalThis[PLAN_CACHE_KEY];
    if (!cached || cached.version !== api?.VERSION || !cached.plan?.actions?.length) return null;
    const activeIds = new Set((targetState?.syllabusItems || []).map((item) => String(item?.id || "")));
    if (Number(cached.itemCount) !== activeIds.size) return null;
    const valid = cached.plan.actions.every((action) =>
      activeIds.has(String(action?.keeperId || ""))
      && activeIds.has(String(action?.removedId || ""))
    );
    return valid ? cloneData(cached.plan) : null;
  }

  function clearCachedPlan() {
    try { delete globalThis[PLAN_CACHE_KEY]; } catch { globalThis[PLAN_CACHE_KEY] = null; }
  }

  async function refreshDiagnostic(root) {
    clearCachedPlan();
    const runButton = root?.querySelector("[data-dup-run]");
    if (!runButton) return;
    setControlsBusy(root, false);
    runButton.click();
  }

  async function resolveStateAndPlan(api) {
    const cached = globalThis[PLAN_CACHE_KEY];
    let targetState = selectRuntimeState(cached?.plan);
    if (targetState) {
      const cachedPlan = cachedPlanForState(targetState, api);
      if (cachedPlan) return { targetState, plan: cachedPlan, source: "runtime-cache" };
      const report = api.diagnoseState(targetState, { includeDecided: true });
      return { targetState, plan: api.recommendedBatchPlan(report), source: "runtime-recalculated" };
    }

    const stored = await readMainIndexedDB();
    if (!stored?.data || !Array.isArray(stored.data.syllabusItems)) {
      throw new Error("Não foi possível localizar o estado atual para consolidar as recomendações.");
    }
    targetState = cloneData(stored.data);
    const cachedPlan = cachedPlanForState(targetState, api);
    if (cachedPlan) return { targetState, plan: cachedPlan, source: "indexeddb-cache" };
    const report = api.diagnoseState(targetState, { includeDecided: true });
    return { targetState, plan: api.recommendedBatchPlan(report), source: "indexeddb-recalculated" };
  }

  async function applyBatch(event) {
    const confirmButton = event.target.closest?.(`#${ROOT_ID} [data-dup-batch-confirm]`);
    if (!confirmButton) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const root = document.getElementById(ROOT_ID);
    const api = diagnosticsApi();
    if (!root || !api?.diagnoseState || !api?.recommendedBatchPlan || !api?.consolidateItems) {
      setStatus(root, `A correção ${VERSION} bloqueou um núcleo antigo do diagnóstico. Atualize a página uma vez e tente novamente.`, "error");
      return;
    }

    globalThis.__aldusDuplicateConsolidationInProgressV305 = true;
    setControlsBusy(root, true);
    closePreview(root);
    setStatus(root, "V308: vinculando a recomendação ao mesmo núcleo da prévia…");
    await yieldToBrowser();

    let targetState = null;
    let rollbackState = null;
    let plan = null;
    let startedAt = "";

    try {
      const resolved = await resolveStateAndPlan(api);
      targetState = resolved.targetState;
      plan = resolved.plan;
      if (!plan?.actions?.length) {
        setControlsBusy(root, false);
        setStatus(root, "Nenhuma recomendação segura permanece disponível para consolidação.", "info");
        return;
      }

      rollbackState = cloneData(targetState);
      const workingState = cloneData(targetState);
      const removedIds = removedIdsFromPlan(plan);
      startedAt = new Date().toISOString();
      setStatus(root, `V308: criando cópia integral antes de ${plan.actions.length} consolidações…`);
      await yieldToBrowser();

      const backup = await saveBackupSnapshot(targetState, `before-authoritative-batch-v308-${plan.actions.length}`);
      let remappedLinks = 0;
      for (let index = 0; index < plan.actions.length; index += 1) {
        const action = plan.actions[index];
        const result = api.consolidateItems(workingState, action.keeperId, action.removedId, {
          backupId: backup.id,
          decidedAt: startedAt,
          auditId: `v308-${Date.now()}-${index + 1}`
        });
        remappedLinks += Number(result?.remappedLinks) || 0;
        setStatus(root, `V308: processando ${index + 1} de ${plan.actions.length} consolidações…`);
        await yieldToBrowser();
      }

      ensureDeletionTombstones(workingState, removedIds, startedAt);
      const preparedRemaining = remainingRemovedIds(workingState, removedIds);
      if (preparedRemaining.length) {
        throw new Error(`O lote preparado ainda contém ${preparedRemaining.length} metas que deveriam ser consolidadas.`);
      }

      synchronizeRuntimeStates(workingState);
      if (targetState && typeof targetState === "object") replaceStateContents(targetState, workingState);
      setStatus(root, "V308: gravando, relendo e estabilizando o estado consolidado…");
      const persisted = await persistAuthoritativeState(targetState || workingState, removedIds);
      const verifiedState = cloneData(persisted.verified);

      synchronizeRuntimeStates(verifiedState);
      const postReport = api.diagnoseState(verifiedState, { includeDecided: true });
      const postPlan = api.recommendedBatchPlan(postReport);
      const removedStillRecommended = postPlan.actions.filter((action) => removedIds.has(String(action?.keeperId || "")) || removedIds.has(String(action?.removedId || "")));
      if (removedStillRecommended.length) {
        throw new Error("O diagnóstico pós-gravação ainda referencia metas removidas; o lote foi bloqueado para evitar inconsistência.");
      }

      clearCachedPlan();
      recordDiagnostic({
        version: VERSION,
        status: "success",
        startedAt,
        finishedAt: new Date().toISOString(),
        beforeItems: rollbackState?.syllabusItems?.length || 0,
        afterItems: verifiedState?.syllabusItems?.length || 0,
        consolidations: plan.actions.length,
        remappedLinks,
        remainingSafeRecommendations: postPlan.actions.length,
        removedIds: [...removedIds],
        runtimeCopies: persisted.runtimeCopies,
        backupId: backup.id
      });
      setStatus(root, `V308 concluída: ${plan.actions.length} metas consolidadas, ${remappedLinks} vínculos preservados e estado relido com sucesso. Atualizando o diagnóstico…`, "success");
      await yieldToBrowser();
      await refreshDiagnostic(root);
    } catch (error) {
      if (rollbackState) {
        try {
          synchronizeRuntimeStates(rollbackState);
          if (targetState && typeof targetState === "object") replaceStateContents(targetState, rollbackState);
          writeLocalStorageSnapshot(rollbackState);
          await writeMainIndexedDB(rollbackState);
        } catch (rollbackError) {
          console.error(`[${VERSION}] Falha ao restaurar o estado anterior.`, rollbackError);
        }
      }
      clearCachedPlan();
      recordDiagnostic({
        version: VERSION,
        status: "error",
        startedAt: startedAt || new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        error: String(error?.message || error)
      });
      console.error(`[${VERSION}] Consolidação autoritativa não concluída.`, error);
      setControlsBusy(root, false);
      setStatus(root, `V305 não concluiu o lote: ${String(error?.message || error)} Nenhuma exclusão foi mantida.`, "error");
    } finally {
      globalThis.__aldusDuplicateConsolidationInProgressV305 = false;
    }
  }

  function markInstalled() {
    const root = document.getElementById(ROOT_ID);
    const button = root?.querySelector("[data-dup-batch]");
    if (button) {
      button.dataset.authoritativeBatchVersion = VERSION;
      button.title = "Consolidação V308 vinculada ao núcleo da prévia, com commit persistido e barreira contra reaparecimento.";
    }
    return Boolean(root && button);
  }

  function install() {
    if (globalThis.__aldusDuplicateBatchAuthoritativeV305) return;
    window.addEventListener("click", applyBatch, true);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (markInstalled() || attempts >= 100) window.clearInterval(timer);
    }, 100);
    globalThis.__aldusDuplicateBatchAuthoritativeV305 = Object.freeze({
      version: VERSION,
      replaceStateContents,
      runtimeStateCandidates,
      selectRuntimeState,
      synchronizeRuntimeStates,
      removedIdsFromPlan,
      remainingRemovedIds,
      ensureDeletionTombstones,
      validateSnapshot,
      persistAuthoritativeState
    });
  }

  const API = Object.freeze({
    VERSION,
    cloneData,
    replaceStateContents,
    runtimeStateCandidates,
    planIds,
    stateContainsPlan,
    selectRuntimeState,
    removedIdsFromPlan,
    remainingRemovedIds,
    ensureDeletionTombstones,
    validateSnapshot,
    cachedPlanForState,
    diagnosticsApi
  });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
    return;
  }
  if (typeof document !== "undefined") install();
})();
