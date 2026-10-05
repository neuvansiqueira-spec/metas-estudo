// V649 — Sincronização leve e conferência de dados entre aparelhos.
//
// 1. A conferência automática da nuvem (a cada 20 s, ao voltar para a aba, ao
//    abrir) baixava o arquivo inteiro do Drive e montava a impressão digital de
//    todo o estado (~16 MB, ~2,5 s parado no PC) mesmo sem nada novo na nuvem.
//    Agora pergunta antes só a data do arquivo (findSyncFile, sem baixar). Se a
//    data é a mesma da última conferência completa e não há envio pendente neste
//    aparelho, não há o que trazer: a conferência termina ali.
// 2. Na aba Backup, "Conferir dados deste aparelho" mostra contagens e códigos
//    do conteúdo, para comparar o PC com o celular.
(() => {
  "use strict";

  const VERSION = "V649";
  const INSTALL_KEY = "__ALDUS_SYNC_LEVE_CONFERENCIA_V649__";
  const PANEL_ID = "aldusConferenciaDadosV649";
  const INSTALL_TIMEOUT_MS = 60000;
  if (globalThis[INSTALL_KEY]) return;

  let lastFullCheckModifiedTime = "";
  let uploadRevision = 0;

  function syncPending() {
    try {
      const meta = readSyncMeta();
      if (typeof hasLocalSyncPending === "function" && hasLocalSyncPending(meta)) return true;
      return Boolean(meta?.pendingSync || meta?.localDirty);
    } catch {
      return true;
    }
  }

  function canProbe() {
    try {
      if (!readSyncMeta()?.connected || !hasValidGoogleDriveAccessToken()) return false;
      if (typeof canRunAutoSyncChecks === "function" && !canRunAutoSyncChecks()) return false;
      if (typeof cloudAutoCheckRunning !== "undefined" && cloudAutoCheckRunning) return false;
      if (typeof isSyncing !== "undefined" && isSyncing) return false;
      return true;
    } catch {
      return false;
    }
  }

  function installLightCheck() {
    const original = globalThis.checkCloudForNewerVersionIntegral;
    const originalPull = globalThis.pullSyncPayload;
    if (typeof original !== "function" || typeof originalPull !== "function" || typeof globalThis.findSyncFile !== "function") return false;

    let probedModifiedTime = "";
    let pullSucceeded = false;

    globalThis.pullSyncPayload = async function pullSyncPayloadV649(...args) {
      const payload = await originalPull.apply(this, args);
      pullSucceeded = true;
      return payload;
    };

    globalThis.checkCloudForNewerVersionIntegral = async function checkCloudForNewerVersionV649(context = "open") {
      if (!canProbe()) return original.call(this, context);
      let file = null;
      try {
        file = await findSyncFile();
      } catch {
        return original.call(this, context);
      }
      const modifiedTime = String(file?.modifiedTime || "");
      // V655 — com envio em lote, há alteração local pendente por até 10 min. Se a
      // nuvem não mudou, não há o que trazer: o lote agendado leva o pendente.
      const batchScheduled = typeof autoSyncBatchScheduled === "function" && autoSyncBatchScheduled();
      if (modifiedTime && modifiedTime === lastFullCheckModifiedTime && (!syncPending() || batchScheduled)) return undefined;

      const uploadRevisionBeforeCheck = uploadRevision;
      probedModifiedTime = modifiedTime;
      pullSucceeded = false;
      try {
        return await original.call(this, context);
      } finally {
        // Só vale como "conferido" quando o arquivo foi baixado e nada ficou pendente.
        // Se houve envio, preserve a versão nova registrada pelo próprio envio.
        if (pullSucceeded && probedModifiedTime && !syncPending() && uploadRevision === uploadRevisionBeforeCheck) lastFullCheckModifiedTime = probedModifiedTime;
        pullSucceeded = false;
      }
    };
    // V655 — o arquivo que este aparelho acabou de enviar já é conhecido: a
    // próxima conferência não precisa baixá-lo de volta.
    for (const name of ["updateSyncFile", "createSyncFile"]) {
      const originalWrite = globalThis[name];
      if (typeof originalWrite !== "function" || originalWrite.__aldusV655) continue;
      const wrappedWrite = async function (...args) {
        const saved = await originalWrite.apply(this, args);
        if (saved?.modifiedTime) {
          lastFullCheckModifiedTime = String(saved.modifiedTime);
          uploadRevision += 1;
        }
        return saved;
      };
      Object.defineProperty(wrappedWrite, "__aldusV655", { value: true });
      globalThis[name] = wrappedWrite;
    }
    return true;
  }

  function goalIsDone(goal) {
    try { if (typeof isGoalDone === "function") return Boolean(isGoalDone(goal)); } catch {}
    return goal?.status === "Concluída";
  }

  function shortCode(value) {
    const fingerprint = syncStateFingerprint(value || []);
    return String(fingerprint).split(":").pop().toUpperCase();
  }

  function count(list) {
    return Array.isArray(list) ? list.length : 0;
  }

  function conferenceRows(data) {
    const goals = Array.isArray(data.dailyGoals) ? data.dailyGoals : [];
    const done = goals.filter(goalIsDone).length;
    return [
      ["Metas", `${goals.length} (${done} concluídas, ${goals.length - done} não concluídas)`],
      ["Código das metas", shortCode(goals)],
      ["Questões no banco", String(count(data.questionBank))],
      ["Itens da Fábrica", String(count(data.factoryItems))],
      ["Assuntos do edital", String(count(data.syllabusItems))],
      ["Código do conteúdo principal", shortCode({
        dailyGoals: goals,
        questionBank: data.questionBank || [],
        factoryItems: data.factoryItems || [],
        syllabusItems: data.syllabusItems || []
      })]
    ];
  }

  function renderConference(output) {
    const data = typeof state !== "undefined" && state && typeof state === "object" ? state : {};
    const rows = conferenceRows(data);
    const when = new Date().toLocaleString("pt-BR");
    output.replaceChildren();
    const list = document.createElement("dl");
    list.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:8px 0";
    rows.forEach(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.style.margin = "0";
      detail.style.fontWeight = "700";
      detail.textContent = value;
      list.append(term, detail);
    });
    const note = document.createElement("p");
    note.className = "notice";
    note.textContent = `Conferido em ${when}. Abra esta mesma tela no outro aparelho: se os números e os códigos forem iguais, os dados são os mesmos. Números iguais com código diferente indicam diferença em algum detalhe das metas ou do conteúdo.`;
    output.append(list, note);
  }

  function installConferencePanel() {
    if (typeof document === "undefined") return true;
    if (document.getElementById(PANEL_ID)) return true;
    const status = document.getElementById("syncStatus");
    if (!status || typeof syncStateFingerprint !== "function") return false;
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "sync-conference";
    panel.style.marginTop = "12px";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = "Conferir dados deste aparelho";
    const output = document.createElement("div");
    output.setAttribute("aria-live", "polite");
    button.addEventListener("click", () => {
      button.disabled = true;
      output.textContent = "Conferindo…";
      setTimeout(() => {
        try { renderConference(output); }
        catch (error) { output.textContent = `Não foi possível conferir: ${error?.message || String(error)}`; }
        finally { button.disabled = false; }
      }, 30);
    });
    panel.append(button, output);
    status.insertAdjacentElement("afterend", panel);
    return true;
  }

  let lightDone = false;
  let panelDone = false;
  function tryInstall() {
    if (!lightDone) lightDone = installLightCheck();
    if (!panelDone) panelDone = installConferencePanel();
    if (lightDone && panelDone) {
      globalThis[INSTALL_KEY] = Object.freeze({ version: VERSION, installedAt: new Date().toISOString() });
      return true;
    }
    return false;
  }

  if (tryInstall()) return;
  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (tryInstall() || Date.now() - startedAt >= INSTALL_TIMEOUT_MS) {
      clearInterval(timer);
      if (!lightDone || !panelDone) console.error(`[Aldus ${VERSION}] Instalação incompleta (sincronização leve: ${lightDone}, conferência: ${panelDone}).`);
    }
  }, 250);
})();
