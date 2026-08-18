(() => {
  "use strict";

  const VERSION = "20260818-simulado-recovery-hot-path-v356";
  const INTERACTIVE_STORAGE_KEY = "aldusSimuladosInterativosV313";
  const STATUS_ID = "aldusSimuladoRecoveryStatusV319";
  const BACKUP_KEYS = [
    "metasConcursoData",
    "metasEstudoBackupAntesDaMesclagem",
    "aldusEmergencyLocalSnapshotV254",
    "aldusBeforeStorageRecoveryV254",
    "aldusBeforeIndexedDBActivationV256",
    "aldusEmergencyIndexedDBActivationBackupV256"
  ];
  const RETRY_DELAYS = [0, 500, 1500, 3000, 6000, 10000, 15000, 25000, 40000, 60000, 90000, 120000];
  const RECOVERY_VIEWS = new Set(["simulados", "banco-questoes", "fabrica-resumos"]);

  let lastReport = null;
  let attempt = 0;
  let automaticPending = false;
  let lastAutomaticRoute = "";

  const text = (value) => String(value ?? "").trim();
  const safeParse = (value) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return null; }
  };

  function structuredBackupValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trimStart();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
    return safeParse(value);
  }

  function currentRoute() {
    if (typeof location === "undefined") return "";
    return text(location.hash).replace(/^#/, "").split(/[?&]/)[0];
  }

  function recoveryViewActive() {
    return RECOVERY_VIEWS.has(currentRoute());
  }

  function stateReady() {
    return typeof state !== "undefined" && state && typeof state === "object" && typeof saveData === "function";
  }

  function readLocalExams() {
    if (typeof localStorage === "undefined") return [];
    const parsed = safeParse(localStorage.getItem(INTERACTIVE_STORAGE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.exams)) return [];
    return parsed.exams.filter((exam) => exam?.status === "completed" && Array.isArray(exam.questions) && exam.questions.length);
  }

  function interactiveSessions(targetState) {
    return (targetState?.questionBankSessions || []).filter((session) => {
      const id = text(session?.id);
      return session?.source === "simulado-interativo" || id.startsWith("simulado-interativo:");
    });
  }

  function collectBackupStates(value, output, seen, budget) {
    if (budget.count >= 4000) return;
    const parsed = structuredBackupValue(value);
    if (!parsed || typeof parsed !== "object") return;
    if (seen.has(parsed)) return;
    seen.add(parsed);
    budget.count += 1;

    if (Array.isArray(parsed.questionBank) || Array.isArray(parsed.questionBankSessions)) output.push(parsed);

    if (Array.isArray(parsed)) {
      for (const entry of parsed.slice(0, 100)) collectBackupStates(entry, output, seen, budget);
      return;
    }

    for (const [key, entry] of Object.entries(parsed)) {
      if (key === "questionBank" || key === "questionBankSessions") continue;
      collectBackupStates(entry, output, seen, budget);
    }
  }

  function readBackupStates() {
    if (typeof localStorage === "undefined") return [];
    const output = [];
    const seen = new Set();
    const budget = { count: 0 };
    BACKUP_KEYS.forEach((key) => collectBackupStates(localStorage.getItem(key), output, seen, budget));
    return output;
  }

  function sessionQuestionIds(sessions) {
    const ids = new Set();
    sessions.forEach((session) => {
      (session?.items || []).forEach((item) => {
        const id = text(item?.id);
        if (id) ids.add(id);
      });
    });
    return ids;
  }

  function localExamQuestionIds(exams) {
    const ids = new Set();
    exams.forEach((exam) => (exam.questions || []).forEach((question) => {
      const id = text(question?.id);
      if (id) ids.add(id);
    }));
    return ids;
  }

  function backupInteractiveSessions(backupStates) {
    return backupStates.flatMap((candidate) => interactiveSessions(candidate));
  }

  function recoverQuestionsFromBackups(targetState, requestedIds, backupStates) {
    const currentIds = new Set((targetState.questionBank || []).map((question) => text(question?.id)).filter(Boolean));
    const missingIds = [...requestedIds].filter((id) => id && !currentIds.has(id));
    if (!missingIds.length) return { recovered: 0, requested: 0, unresolved: 0 };

    const missingSet = new Set(missingIds);
    const recovered = new Map();
    backupStates.forEach((candidate) => {
      (candidate?.questionBank || []).forEach((question) => {
        const id = text(question?.id);
        if (!id || !missingSet.has(id) || recovered.has(id)) return;
        if (!text(question?.enunciado) && !text(question?.statement) && !text(question?.texto)) return;
        recovered.set(id, question);
      });
    });

    if (recovered.size) {
      targetState.questionBank ||= [];
      targetState.questionBank.push(...recovered.values());
    }

    return {
      recovered: recovered.size,
      requested: missingIds.length,
      unresolved: Math.max(0, missingIds.length - recovered.size)
    };
  }

  function renderStatus(report) {
    if (typeof document === "undefined") return;
    const root = document.getElementById("aldusInteractiveExamV313")
      || document.querySelector('[data-view="simulados"] .section-heading')
      || document.querySelector('#view-simulados .section-heading');
    if (!root) return;

    let node = document.getElementById(STATUS_ID);
    if (!node) {
      node = document.createElement("div");
      node.id = STATUS_ID;
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      node.style.margin = "10px 0";
      node.style.padding = "10px 12px";
      node.style.border = "1px solid currentColor";
      node.style.borderRadius = "8px";
      node.style.fontSize = "0.92rem";
      node.style.opacity = "0.9";
      root.prepend(node);
    }

    if (!report.stateAvailable) {
      node.textContent = "Verificação dos simulados: aguardando o carregamento completo do banco de dados…";
      return;
    }

    const restored = Number(report.repairedByIntegration || 0) + Number(report.repairedFromBackup || 0);
    if (report.localExams > 0) {
      node.textContent = `Integridade dos simulados: ${report.localExams} simulado(s) local(is) • ${report.localQuestions} questão(ões) verificadas • ${restored} restaurada(s) • ${report.missingAfter} ainda ausente(s).`;
      return;
    }

    if (report.sessionQuestions > 0) {
      node.textContent = `Integridade dos simulados: nenhum simulado completo foi encontrado no armazenamento local • ${report.sessionQuestions} questão(ões) identificada(s) pelas sessões/resultados • ${report.repairedFromBackup} recuperada(s) de backup • ${report.missingAfter} ainda sem cópia completa neste dispositivo.`;
      return;
    }

    node.textContent = "Integridade dos simulados: nenhum simulado local nem sessão interativa foi encontrado neste dispositivo.";
  }

  async function persistIfNeeded(changed) {
    if (!changed || typeof saveData !== "function") return false;
    await Promise.resolve(saveData({ markLocalChange: true }));
    if (typeof renderQuestionBank === "function") renderQuestionBank();
    if (typeof renderQuestionHistory === "function") renderQuestionHistory();
    return true;
  }

  async function run(origin = "manual") {
    attempt += 1;
    const localExams = readLocalExams();
    const localIds = localExamQuestionIds(localExams);

    if (!stateReady()) {
      lastReport = {
        version: VERSION,
        origin,
        attempt,
        stateAvailable: false,
        apiAvailable: Boolean(globalThis.__ALDUS_SIMULADO_INTEGRACAO_V314__),
        localExams: localExams.length,
        localQuestions: localIds.size,
        sessions: 0,
        sessionQuestions: 0,
        repairedByIntegration: 0,
        repairedFromBackup: 0,
        missingAfter: 0,
        checkedAt: new Date().toISOString()
      };
      renderStatus(lastReport);
      return lastReport;
    }

    const integration = globalThis.__ALDUS_SIMULADO_INTEGRACAO_V314__;
    let repairedByIntegration = 0;
    let integrationChecked = 0;
    let integrationErrors = 0;
    if (integration?.repairStoredExams) {
      try {
        const report = integration.repairStoredExams();
        repairedByIntegration = Number(report?.repairedQuestions) || 0;
        integrationChecked = Number(report?.checked) || 0;
        integrationErrors = Number(report?.errors) || 0;
      } catch (error) {
        integrationErrors += 1;
        console.warn(`[${VERSION}] Falha no reparo V318; a V319 continuará pela trilha de backup.`, error);
      }
    }

    const backupStates = readBackupStates();
    const liveSessions = interactiveSessions(state);
    const backupSessions = backupInteractiveSessions(backupStates);
    const sessionIds = sessionQuestionIds([...liveSessions, ...backupSessions]);
    const requestedIds = new Set([...localIds, ...sessionIds]);
    const beforeIds = new Set((state.questionBank || []).map((question) => text(question?.id)).filter(Boolean));
    const missingBefore = [...requestedIds].filter((id) => !beforeIds.has(id)).length;
    const backupRecovery = recoverQuestionsFromBackups(state, requestedIds, backupStates);
    await persistIfNeeded(backupRecovery.recovered > 0);

    const afterIds = new Set((state.questionBank || []).map((question) => text(question?.id)).filter(Boolean));
    const missingAfter = [...requestedIds].filter((id) => !afterIds.has(id)).length;

    lastReport = {
      version: VERSION,
      origin,
      attempt,
      stateAvailable: true,
      apiAvailable: Boolean(integration),
      localExams: localExams.length,
      localQuestions: localIds.size,
      sessions: liveSessions.length,
      sessionQuestions: sessionIds.size,
      backupStates: backupStates.length,
      integrationChecked,
      integrationErrors,
      missingBefore,
      repairedByIntegration,
      repairedFromBackup: backupRecovery.recovered,
      missingAfter,
      checkedAt: new Date().toISOString()
    };

    renderStatus(lastReport);
    if (typeof CustomEvent === "function" && typeof globalThis.dispatchEvent === "function") {
      globalThis.dispatchEvent(new CustomEvent("aldus:simulado-recovery-v319", { detail: lastReport }));
    }
    if (repairedByIntegration || backupRecovery.recovered) console.info(`[${VERSION}] Verificação concluída.`, lastReport);
    return lastReport;
  }

  async function runAutomatic(origin) {
    const route = currentRoute();
    if (!RECOVERY_VIEWS.has(route)) {
      lastAutomaticRoute = "";
      return lastReport;
    }
    if (automaticPending) return lastReport;
    if (lastAutomaticRoute === route && lastReport?.stateAvailable) return lastReport;

    automaticPending = true;
    try {
      const report = await run(origin);
      if (report?.stateAvailable) lastAutomaticRoute = route;
      return report;
    } finally {
      automaticPending = false;
    }
  }

  function schedule() {
    if (typeof setTimeout !== "function") return;
    RETRY_DELAYS.forEach((delay) => setTimeout(() => runAutomatic(`retry-${delay}`).catch((error) => {
      console.warn(`[${VERSION}] Tentativa automática falhou.`, error);
    }), delay));
  }

  if (typeof window !== "undefined") {
    window.addEventListener("load", () => runAutomatic("load").catch(() => {}));
    window.addEventListener("pageshow", () => runAutomatic("pageshow").catch(() => {}));
    window.addEventListener("focus", () => runAutomatic("focus").catch(() => {}));
    window.addEventListener("hashchange", () => runAutomatic("hashchange").catch(() => {}));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") runAutomatic("visible").catch(() => {});
    });
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.("[data-view-link], a[href^='#']");
      if (!link) return;
      const target = text(link.getAttribute?.("data-view-link") || link.getAttribute?.("href")).replace(/^#/, "");
      if (RECOVERY_VIEWS.has(target)) {
        setTimeout(() => runAutomatic(`view-${target}`).catch(() => {}), 250);
      }
    }, true);
  }

  const api = Object.freeze({
    version: VERSION,
    run,
    getLastReport: () => lastReport,
    readLocalExams,
    readBackupStates,
    recoveryViewActive
  });
  globalThis.__ALDUS_SIMULADO_RECOVERY_V319__ = api;
  schedule();
})();