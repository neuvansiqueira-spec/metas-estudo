(() => {
  "use strict";

  const VERSION = "20260808-catastrophic-state-recovery-v275";
  const EXPECTED_KEY = "aldusRecoveryExpectedV275";
  const MAIN_KEY = "metasConcursoData";
  const CRITICAL_VERIFY_KEYS = [
    "studies",
    "dailyGoals",
    "syllabusItems",
    "questionLogs",
    "materials",
    "questionBank",
    "questionBankSessions",
    "questionErrorNotebook",
    "simulados",
    "smartReviews",
    "factoryItems",
    "factoryAgenda"
  ];

  function guardApi() {
    return globalThis.__ALDUS_CATASTROPHIC_STATE_GUARD_V275__ || null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function extractBackupState(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const direct = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
    const api = guardApi();
    if (!api || !direct || typeof direct !== "object") return null;
    const summary = api.counts(direct);
    if (!Object.values(summary).some((value) => value > 0)) return null;
    return {
      state: direct,
      envelope: parsed,
      exportedAt: parsed.exportedAt || parsed.createdAt || "",
      app: parsed.app || "",
      version: parsed.version || ""
    };
  }

  function formatCounts(summary = {}) {
    const labels = {
      studies: "estudos",
      dailyGoals: "metas",
      syllabusItems: "itens do edital",
      questionLogs: "registros de questões",
      materials: "materiais",
      questionBank: "questões do banco",
      questionBankSessions: "sessões de questões",
      questionErrorNotebook: "itens do caderno de erros",
      simulados: "simulados",
      smartReviews: "revisões inteligentes",
      factoryItems: "itens da Fábrica"
    };
    return Object.entries(labels)
      .map(([key, label]) => `${summary[key] || 0} ${label}`)
      .join("; ");
  }

  function styleBanner(banner, mode) {
    const palette = mode === "ok"
      ? { background: "#eaf8ef", border: "#198754", color: "#123b24" }
      : mode === "danger"
        ? { background: "#fff1f2", border: "#c62828", color: "#5f1515" }
        : { background: "#fff8e1", border: "#b7791f", color: "#513a08" };
    banner.style.background = palette.background;
    banner.style.border = `2px solid ${palette.border}`;
    banner.style.color = palette.color;
    banner.style.borderRadius = "14px";
    banner.style.padding = "14px 16px";
    banner.style.margin = "14px 0";
    banner.style.lineHeight = "1.45";
  }

  function ensureBanner() {
    let banner = document.getElementById("aldusRecoverySafetyV275Banner");
    if (banner) return banner;
    banner = document.createElement("div");
    banner.id = "aldusRecoverySafetyV275Banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    const backupView = document.getElementById("view-backup");
    const actions = backupView?.querySelector(".backup-actions");
    if (actions?.parentNode) actions.parentNode.insertBefore(banner, actions);
    else (document.body || document.documentElement).appendChild(banner);
    return banner;
  }

  function showStatus(message, mode = "warning") {
    const banner = ensureBanner();
    styleBanner(banner, mode);
    banner.innerHTML = message;
  }

  async function validateExpectedRecovery() {
    let expected = null;
    try { expected = JSON.parse(localStorage.getItem(EXPECTED_KEY) || "null"); } catch {}
    if (!expected?.counts) return;
    const api = guardApi();
    if (!api) return;
    const record = await api.readMainRecord().catch(() => null);
    if (!record?.data) {
      showStatus("<strong>⚠️ Recuperação ainda não validada.</strong> O estado principal não pôde ser lido do IndexedDB.", "danger");
      return;
    }
    const current = api.counts(record.data);
    const failures = CRITICAL_VERIFY_KEYS.filter((key) => {
      const target = Number(expected.counts[key] || 0);
      const actual = Number(current[key] || 0);
      if (!target) return false;
      if (key === "dailyGoals" || key === "syllabusItems" || key === "factoryItems" || key === "factoryAgenda") {
        return actual < Math.floor(target * 0.95);
      }
      return actual < target;
    });
    if (failures.length) {
      showStatus(`<strong>🚨 A restauração não passou na validação.</strong> Coleções abaixo do esperado: ${escapeHtml(failures.join(", "))}. Não continue usando o site até nova verificação.`, "danger");
      return;
    }
    showStatus(`<strong>✅ Recuperação V275 validada.</strong> O IndexedDB contém pelo menos os volumes esperados do backup restaurado. Backup de origem: ${escapeHtml(expected.fileName || "arquivo selecionado")}.`, "ok");
    try { localStorage.removeItem(EXPECTED_KEY); } catch {}
  }

  async function restoreBackupFile(file) {
    const api = guardApi();
    if (!api) throw new Error("Proteção V275 ainda não está pronta.");
    const raw = await file.text();
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error("O arquivo selecionado não é um JSON válido."); }
    const backup = extractBackupState(parsed);
    if (!backup) throw new Error("O arquivo não contém um estado reconhecível do Aldus Meta.");
    if (backup.app && backup.app !== "metas-estudo") throw new Error(`Backup de aplicativo inesperado: ${backup.app}.`);

    const nextCounts = api.counts(backup.state);
    const currentRecord = await api.readMainRecord().catch(() => null);
    const currentCounts = api.counts(currentRecord?.data || {});
    const exportedLabel = backup.exportedAt
      ? new Date(backup.exportedAt).toLocaleString("pt-BR")
      : "data não informada";

    const message = [
      "RECUPERAÇÃO SEGURA V275",
      "",
      `Arquivo: ${file.name}`,
      `Exportado em: ${exportedLabel}`,
      "",
      `Backup selecionado: ${formatCounts(nextCounts)}.`,
      `Estado atual: ${formatCounts(currentCounts)}.`,
      "",
      "O estado atual será preservado em um snapshot de segurança antes da restauração. Deseja continuar?"
    ].join("\n");
    if (!window.confirm(message)) return { cancelled: true };

    showStatus("<strong>⏳ Restaurando backup com verificação...</strong> Não feche esta aba.", "warning");
    if (currentRecord?.data) {
      await api.saveSafetySnapshot(currentRecord.data, "antes-da-restauracao-manual", "recovery-v275").catch(() => null);
    }

    const restored = typeof structuredClone === "function"
      ? structuredClone(backup.state)
      : JSON.parse(JSON.stringify(backup.state));
    restored.recoverySafetyV275 = {
      version: VERSION,
      restoredAt: new Date().toISOString(),
      backupExportedAt: backup.exportedAt || "",
      backupFileName: file.name,
      previousCounts: currentCounts,
      restoredCounts: nextCounts
    };

    api.allowDestructiveWrite(30000);
    const verified = await api.writeMainState(restored, "manual-backup-recovery-v275");
    const verifyCounts = api.counts(verified.data);
    const missing = CRITICAL_VERIFY_KEYS.filter((key) => Number(verifyCounts[key] || 0) < Number(nextCounts[key] || 0));
    if (missing.length) throw new Error(`Verificação do IndexedDB falhou para: ${missing.join(", ")}.`);

    await api.saveSafetySnapshot(verified.data, "backup-restaurado-validado", file.name).catch(() => null);
    try {
      localStorage.removeItem(MAIN_KEY);
      localStorage.setItem(EXPECTED_KEY, JSON.stringify({
        version: VERSION,
        restoredAt: new Date().toISOString(),
        fileName: file.name,
        exportedAt: backup.exportedAt || "",
        counts: nextCounts
      }));
    } catch {}

    showStatus("<strong>✅ Backup gravado e verificado no IndexedDB.</strong> A página será recarregada para validar o estado restaurado.", "ok");
    window.setTimeout(() => window.location.reload(), 1200);
    return { restored: true, counts: verifyCounts };
  }

  function installImportOverride() {
    document.addEventListener("change", async (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.id !== "backupFileInput") return;
      const file = input.files?.[0];
      if (!file) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await restoreBackupFile(file);
      } catch (error) {
        console.error("[Aldus V275] Falha na restauração segura.", error);
        showStatus(`<strong>🚨 Restauração interrompida.</strong> ${escapeHtml(error?.message || error)} O estado atual não foi substituído sem validação.`, "danger");
        window.alert(`Restauração interrompida: ${error?.message || error}`);
      } finally {
        input.value = "";
      }
    }, true);

    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#clearAllLocalData, #clearData");
      if (!button) return;
      guardApi()?.allowDestructiveWrite(20000);
    }, true);
  }

  function installWriteBlockedAlert() {
    window.addEventListener("aldus:catastrophic-write-blocked-v275", (event) => {
      const losses = Array.isArray(event.detail?.losses) ? event.detail.losses : [];
      const detail = losses.map((item) => `${item.key}: ${item.previous}→${item.current}`).join("; ");
      showStatus(`<strong>🛡️ Gravação destrutiva bloqueada.</strong> O Aldus impediu que um estado muito menor substituísse o histórico protegido.${detail ? ` ${escapeHtml(detail)}` : ""}`, "danger");
    });
  }

  async function install() {
    const api = guardApi();
    if (!api) {
      window.setTimeout(install, 100);
      return;
    }
    try { await api.ready; } catch {}
    installImportOverride();
    installWriteBlockedAlert();

    const status = globalThis.__ALDUS_CATASTROPHIC_STATE_STATUS_V275__;
    if (status?.action === "recovered") {
      const source = status?.recovery?.source || "snapshot de segurança";
      showStatus(`<strong>🛡️ Proteção V275 recuperou automaticamente um estado mais completo antes da inicialização.</strong> Fonte: ${escapeHtml(source)}. Exporte um novo backup após conferir os dados.`, "ok");
    } else {
      showStatus("<strong>🛡️ Proteção V275 ativa.</strong> Regressões catastróficas de estudos, metas, questões e simulados serão bloqueadas. A importação de backup nesta tela passa por snapshot e verificação do IndexedDB.", "warning");
    }
    await validateExpectedRecovery();
  }

  globalThis.__aldusRecoverySafetyV275 = Object.freeze({ VERSION, restoreBackupFile, validateExpectedRecovery });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
