(() => {
  "use strict";

  const VERSION = "20260808-startup-performance-v276";
  const PROTECTION_VERSION = "20260808-catastrophic-state-recovery-v275";
  const PERFORMANCE_KEY = "aldusStartupPerformanceV276";
  const RECOVERY_SCRIPT = `recovery-safety-v275.js?v=${PROTECTION_VERSION}`;
  const SCRIPT_CHAIN = [
    ["aldusAppBundleScript", "app-v236.js?v=20260804-simulados-sem-fabrica-cache-unico-v236"],
    ["aldusDailySummaryTimeFormatV243Direct", "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix3"],
    ["aldusDashboardTodayTimeSyncV253", "dashboard-today-time-sync-v253.js?v=20260805-dashboard-today-time-sync-v253&hotfix=dashboard-today-time-sync-hotfix1"],
    ["aldusDashboardTodayQuestionsSyncV257", "dashboard-today-questions-sync-v257.js?v=20260805-dashboard-today-questions-sync-v257&hotfix=question-bank-sessions1"],
    ["aldusPlanningIntegrityLoaderV235", "planning-integrity-loader-v235.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&publication=v244"],
    ["aldusCentralPeriodCardsScriptV248", "central-goals-period-palette-v248.js?v=20260805-central-period-cards-v248"],
    ["aldusDailySummaryElegantScriptV250", "daily-summary-elegant-v250.js?v=20260805-daily-summary-elegant-v250"],
    ["aldusTimerSessionIntegrityV236", "timer-session-integrity-v236.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&hotfix=timer-session-integrity-hotfix1"],
    ["aldusTimerMessageDedupeV239", "timer-message-dedupe-v239.js?v=20260805-timer-message-last-five-v242&hotfix=timer-message-last-five-hotfix1"],
    ["aldusTimerAudioUnifierV241", "timer-audio-unifier-v241.js?v=20260805-timer-audio-unified-v241&hotfix=timer-audio-unifier-hotfix1"]
  ];

  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        existing.dataset.aldusLoaded = "true";
        resolve(existing);
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener("load", () => {
        script.dataset.aldusLoaded = "true";
        resolve(script);
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}.`)), { once: true });
      (document.body || document.documentElement).appendChild(script);
    });
  }

  function persistPerformance(detail) {
    const payload = {
      version: VERSION,
      capturedAt: new Date().toISOString(),
      ...detail
    };
    globalThis.__ALDUS_STARTUP_PERFORMANCE_V276__ = Object.freeze(payload);
    try { localStorage.setItem(PERFORMANCE_KEY, JSON.stringify(payload)); } catch {}
    return payload;
  }

  async function waitForProtection() {
    const promise = globalThis.__ALDUS_CATASTROPHIC_GUARD_READY_V275__;
    if (!promise || typeof promise.then !== "function") return { waited: false, status: null };
    const before = now();
    try {
      const status = await promise;
      return { waited: true, status, durationMs: Math.round(now() - before) };
    } catch (error) {
      console.error(`[${VERSION}] A proteção V275 informou erro antes da inicialização.`, error);
      return { waited: true, status: null, durationMs: Math.round(now() - before), error: String(error?.message || error) };
    }
  }

  async function start() {
    if (globalThis.__aldusBootstrapIntegrityLoaderV276) return;
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Protegendo dados e iniciando em modo rápido...";

    const protection = await waitForProtection();
    const afterProtection = now();

    // A V275 já escolheu/protegeu o estado antes deste ponto. A antiga V258
    // repetia a leitura, clonagem, checksum e snapshots do mesmo estado.
    // V276 carrega diretamente a aplicação após a proteção V275 ficar pronta.
    for (const [id, src] of SCRIPT_CHAIN) await loadScript(id, src);
    await loadScript("aldusRecoverySafetyV275", RECOVERY_SCRIPT);

    const finishedAt = now();
    const detail = persistPerformance({
      mode: "single-prebootstrap-audit",
      redundantV258AuditSkipped: true,
      protectionWaitMs: protection.durationMs || Math.round(afterProtection - startedAt),
      applicationLoadMs: Math.round(finishedAt - afterProtection),
      totalBootstrapMs: Math.round(finishedAt - startedAt),
      protectionAction: protection.status?.action || "unknown"
    });

    globalThis.__aldusBootstrapIntegrityLoaderV276 = Object.freeze({
      version: VERSION,
      protectionVersion: PROTECTION_VERSION,
      scripts: SCRIPT_CHAIN.map((entry) => entry[1]),
      recovery: RECOVERY_SCRIPT,
      performance: detail
    });

    window.dispatchEvent(new CustomEvent("aldus:startup-performance-v276-ready", { detail }));
  }

  start().catch((error) => {
    console.error(`[${VERSION}] Falha na inicialização rápida.`, error);
    persistPerformance({
      mode: "startup-error",
      redundantV258AuditSkipped: true,
      totalBootstrapMs: Math.round(now() - startedAt),
      error: String(error?.message || error)
    });
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Falha ao iniciar. Seus dados permanecem protegidos; recarregue a página.";
  });
})();
