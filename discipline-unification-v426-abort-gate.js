(() => {
  "use strict";

  const VERSION = "20260901-v426-abort-backup-gate";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const INSTALL_KEY = "__ALDUS_V426_ABORT_GATE_INSTALLED__";
  const LOCK_KEY = "aldus:v426:aborted-build-lock";
  const DEFAULT_ATTEMPT_KEY = "aldus:v426:backup-confirmed-attempt";
  const PANEL_ID = "aldusV426MigrationPanel";

  function safeParse(value) {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }

  function currentApi() {
    return globalThis[API_KEY] || {};
  }

  function attemptKey() {
    return currentApi().attemptStorageKey || DEFAULT_ATTEMPT_KEY;
  }

  function codeToken() {
    const api = currentApi();
    return [VERSION, api.version || "", api.revisionId || "", api.weightRepairVersion || ""].join("|");
  }

  function readLock() {
    try { return safeParse(localStorage.getItem(LOCK_KEY)); } catch { return null; }
  }

  function readAttempt() {
    try { return safeParse(sessionStorage.getItem(attemptKey())); } catch { return null; }
  }

  function clearAttempt() {
    try { sessionStorage.removeItem(attemptKey()); } catch {}
  }

  function clearLock() {
    try { localStorage.removeItem(LOCK_KEY); } catch {}
  }

  function migrationCompleted() {
    try {
      const migration = globalThis.state?.migrations?.disciplineUnificationV426;
      return migration?.completed === true && Boolean(migration?.revisionId);
    } catch { return false; }
  }

  function lockMatchesCurrentBuild(lock = readLock()) {
    return Boolean(lock && lock.codeToken === codeToken());
  }

  function registerAbort(message) {
    const attempt = readAttempt();
    if (!attempt) return false;
    const lock = {
      codeToken: codeToken(),
      error: String(message || "Falha desconhecida"),
      backupFileName: attempt.backupFileName || "backup já confirmado",
      backupSavedAt: attempt.backupSavedAt || null,
      stateFingerprint: attempt.stateFingerprint || null,
      lockedAt: new Date().toISOString()
    };
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(lock)); } catch { return false; }
    return true;
  }

  function weightReportLines() {
    const report = globalThis.state?.migrations?.disciplineUnificationV426?.report || {};
    const validation = report.weightValidation || {};
    const lines = ["", "Validação de disciplineWeights:"];
    lines.push(`- regra de existência: ${validation.existenceRule || "syllabusItems|dailyGoals|operational"}`);
    lines.push(`- pesos removidos pela Etapa C: ${(validation.stageCWeightsRemoved || []).join("; ") || "nenhum"}`);
    lines.push(`- disciplinas legítimas sem item de edital: ${(validation.legitimateNonSyllabusWeights || []).join("; ") || "nenhuma"}`);
    lines.push(`- chaves órfãs preexistentes não relacionadas: ${(validation.unrelatedPreexistingOrphanWeights || []).join("; ") || "nenhuma"}`);
    return lines;
  }

  function appendWeightReport(panel) {
    const pre = panel?.querySelector?.("[data-v426-revision-report], [data-v426-report]");
    if (!pre || pre.dataset.v426WeightReportAppended === "1") return;
    const report = globalThis.state?.migrations?.disciplineUnificationV426?.report;
    if (!report?.weightValidation) return;
    pre.textContent += `\n${weightReportLines().join("\n")}`;
    pre.dataset.v426WeightReportAppended = "1";
  }

  function enforcePanel(panel) {
    if (!panel) return;
    if (migrationCompleted()) {
      clearLock();
      clearAttempt();
      appendWeightReport(panel);
      return;
    }

    const lock = readLock();
    if (lock && !lockMatchesCurrentBuild(lock)) {
      // Uma versão de código diferente significa que a causa pode ter sido corrigida.
      // O bloqueio antigo não atravessa releases.
      clearLock();
      return;
    }
    if (!lockMatchesCurrentBuild(lock)) return;

    const button = panel.querySelector("[data-v426-revision-apply], [data-v426-apply]");
    const status = panel.querySelector("[data-v426-revision-status], [data-v426-status]");
    if (button) {
      button.disabled = true;
      button.textContent = "V426 aguardando correção desta versão";
    }
    if (status) {
      const backup = lock.backupFileName || "backup já confirmado";
      status.textContent = `A tentativa anterior abortou depois de confirmar ${backup}. Nesta mesma versão a V426 fica bloqueada para não pedir outro backup sem efeito. A tentativa será liberada automaticamente quando uma versão corrigida for publicada.`;
    }
  }

  function inspectPanel(panel) {
    if (!panel) return;
    const status = panel.querySelector("[data-v426-revision-status], [data-v426-status]");
    const text = String(status?.textContent || "");
    const failed = text.startsWith("V426 revisada não aplicada:") || text.startsWith("V426 não aplicada:");
    if (failed && readAttempt()) registerAbort(text);
    if (text.includes("V426 revisada aplicada") || text.includes("V426 aplicada com backup confirmado")) {
      clearLock();
      clearAttempt();
      appendWeightReport(panel);
    }
    enforcePanel(panel);
  }

  function install() {
    if (globalThis[INSTALL_KEY]) return true;
    globalThis[INSTALL_KEY] = true;
    globalThis.__ALDUS_V426_ABORT_GATE__ = Object.freeze({
      version: VERSION,
      lockKey: LOCK_KEY,
      codeToken,
      lockMatchesCurrentBuild,
      registerAbort,
      weightReportLines
    });
    if (typeof module !== "undefined" && module.exports) module.exports = globalThis.__ALDUS_V426_ABORT_GATE__;
    if (typeof document === "undefined") return true;

    const scan = () => inspectPanel(document.getElementById(PANEL_ID));
    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-v426-revision-apply], [data-v426-apply]");
      if (!button) return;
      const lock = readLock();
      if (!lockMatchesCurrentBuild(lock)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      enforcePanel(document.getElementById(PANEL_ID));
    }, true);

    window.addEventListener("aldus:discipline-unification-v426-complete", () => {
      clearLock();
      clearAttempt();
      scan();
    });
    return true;
  }

  install();
})();