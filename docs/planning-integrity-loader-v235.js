(() => {
  "use strict";

  const VERSION = "20260804-planejamento-metas-fabrica-integridade-v235";
  const STARTUP_STABILITY_VERSION = "20260824-startup-planning-stability-v387";
  const FACTORY_STARTUP_CONSISTENCY_VERSION = "20260825-factory-startup-consistency-v394";
  const PLANNING_CORE_VERSION = "20260831-daily-goals-explicit-mutation-v419";
  const SNAPSHOT_KEY = "aldusPlanningManualGoalsV235";
  const SCRIPT_ID = "aldusPlanningIntegrityCoreV235";
  const FACTORY_SCRIPT_ID = "aldusFactoryQueueIntegrityV236";
  const FACTORY_HOTFIX = "factory-queue-integrity-hotfix6";
  const FACTORY_DESTINATION_SCRIPT_ID = "aldusFactoryDestinationIntegrityV237";
  const FACTORY_DESTINATION_VERSION = "20260902-factory-destination-tree-fingerprint-v430";
  const FACTORY_DESTINATION_HOTFIX = "factory-destination-tree-fingerprint-v430";
  const TIMER_AUDIO_SCRIPT_ID = "aldusTimerAudioRecoveryV236";
  const TIMER_AUDIO_HOTFIX = "timer-audio-recovery-hotfix5";
  const TIMER_AUDIO_UNIFIER_SCRIPT_ID = "aldusTimerAudioUnifierV241";
  const TIMER_AUDIO_UNIFIER_VERSION = "20260805-timer-audio-unified-v241";
  const TIMER_AUDIO_UNIFIER_HOTFIX = "timer-audio-unifier-hotfix1";
  const TIMER_MESSAGE_SCRIPT_ID = "aldusTimerMessageDedupeV239";
  const TIMER_MESSAGE_VERSION = "20260805-timer-message-last-five-v242";
  const TIMER_MESSAGE_HOTFIX = "timer-message-last-five-hotfix1";
  const DAILY_SUMMARY_TIME_SCRIPT_ID = "aldusDailySummaryTimeFormatV243";
  const DAILY_SUMMARY_TIME_VERSION = "20260805-daily-summary-hours-minutes-v243";
  const DAILY_SUMMARY_TIME_HOTFIX = "daily-summary-time-format-hotfix4";
  const TIMER_SESSION_SCRIPT_ID = "aldusTimerSessionIntegrityV236";
  const TIMER_SESSION_HOTFIX = "timer-session-integrity-hotfix1";
  const FACTORY_VIEW = "fabrica-resumos";
  const FACTORY_STARTUP_NOTICE_ID = "aldusFactoryStartupConsistencyV394";
  let loaded = false;

  function bootstrapReady() {
    try {
      return typeof bootstrapStateReady === "undefined" || bootstrapStateReady === true;
    } catch {
      return false;
    }
  }

  function factoryViewActive() {
    try {
      const route = String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0];
      return route === FACTORY_VIEW || Boolean(document.querySelector('[data-view="fabrica-resumos"].active'));
    } catch {
      return false;
    }
  }

  function setFactoryStartupGuard(active) {
    if (typeof document === "undefined") return false;
    const list = document.getElementById("factoryList");
    if (!list) return false;
    let notice = document.getElementById(FACTORY_STARTUP_NOTICE_ID);
    if (active) {
      if (!notice) {
        notice = document.createElement("p");
        notice.id = FACTORY_STARTUP_NOTICE_ID;
        notice.className = "notice";
        notice.setAttribute("role", "status");
        notice.setAttribute("aria-live", "polite");
        notice.textContent = "Sincronizando pendências da Fábrica com o Plano do Dia…";
        list.before(notice);
      }
      list.dataset.startupConsistencyPending = "true";
      list.hidden = true;
      return true;
    }
    delete list.dataset.startupConsistencyPending;
    list.hidden = false;
    notice?.remove();
    return true;
  }

  function prepareFactoryStartupGuard() {
    if (!bootstrapReady() && factoryViewActive()) setFactoryStartupGuard(true);
  }

  function releaseFactoryStartupGuard({ redraw = true } = {}) {
    setFactoryStartupGuard(false);
    if (!redraw || !factoryViewActive()) return;
    try {
      if (typeof renderFactory === "function") renderFactory();
    } catch (error) {
      console.warn("[Aldus V394] A Fábrica será redesenhada na próxima atualização da tela.", error);
    }
  }

  function positiveInteger(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function readLocalSnapshot() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
      return positiveInteger(parsed?.disciplines) ? parsed : null;
    } catch {
      return null;
    }
  }

  function newestSnapshot() {
    const stateSnapshot = typeof state !== "undefined" ? state?.planning?.manualGoalsConfigV235 : null;
    const localSnapshot = readLocalSnapshot();
    if (!stateSnapshot) return localSnapshot;
    if (!localSnapshot) return stateSnapshot;
    return (Date.parse(localSnapshot.savedAt || "") || 0) > (Date.parse(stateSnapshot.savedAt || "") || 0)
      ? localSnapshot
      : stateSnapshot;
  }

  function enforceSnapshot() {
    if (typeof state === "undefined" || !state?.planning) return false;
    const snapshot = newestSnapshot();
    const disciplines = positiveInteger(snapshot?.disciplines);
    if (!disciplines) return false;
    const topics = Math.max(disciplines, positiveInteger(snapshot?.topics, disciplines));
    state.planning.config ||= {};
    const changed = positiveInteger(state.planning.config.disciplinesPerDay) !== disciplines
      || positiveInteger(state.planning.config.topicsPerDay) !== topics;
    if (changed) {
      state.planning.config.disciplinesPerDay = disciplines;
      state.planning.config.topicsPerDay = topics;
    }
    return changed;
  }

  function installPersistenceGuards() {
    if (typeof replaceState === "function" && !replaceState.__aldusIntegrityLoaderV235) {
      const originalReplaceState = replaceState;
      const guardedReplaceState = function replaceStateIntegrityV235(...args) {
        const result = originalReplaceState.apply(this, args);
        enforceSnapshot();
        return result;
      };
      guardedReplaceState.__aldusIntegrityLoaderV235 = true;
      guardedReplaceState.__aldusOriginal = originalReplaceState;
      replaceState = guardedReplaceState;
    }

    if (typeof saveData === "function" && !saveData.__aldusIntegrityLoaderV235) {
      const originalSaveData = saveData;
      const guardedSaveData = function saveDataIntegrityV235(...args) {
        enforceSnapshot();
        return originalSaveData.apply(this, args);
      };
      guardedSaveData.__aldusIntegrityLoaderV235 = true;
      guardedSaveData.__aldusOriginal = originalSaveData;
      saveData = guardedSaveData;
    }
  }

  function loadFactoryQueueIntegrity(releaseVersion) {
    if (globalThis.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__) {
      releaseFactoryStartupGuard();
      return true;
    }
    const existing = document.getElementById(FACTORY_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => releaseFactoryStartupGuard(), { once: true });
      return true;
    }
    const script = document.createElement("script");
    script.id = FACTORY_SCRIPT_ID;
    script.src = `factory-queue-integrity-v236.js?v=${encodeURIComponent(releaseVersion)}&hotfix=${encodeURIComponent(FACTORY_HOTFIX)}&stability=${encodeURIComponent(FACTORY_STARTUP_CONSISTENCY_VERSION)}`;
    script.async = false;
    script.addEventListener("load", () => releaseFactoryStartupGuard(), { once: true });
    script.addEventListener("error", () => {
      script.remove();
      releaseFactoryStartupGuard({ redraw: false });
      console.warn("[Aldus V236] A correção da fila da Fábrica será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadFactoryDestinationIntegrity() {
    if (globalThis.__ALDUS_FACTORY_DESTINATION_INTEGRITY_V237__ || document.getElementById(FACTORY_DESTINATION_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = FACTORY_DESTINATION_SCRIPT_ID;
    script.src = `factory-destination-integrity-v237.js?v=${encodeURIComponent(FACTORY_DESTINATION_VERSION)}&hotfix=${encodeURIComponent(FACTORY_DESTINATION_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V237] A correção das pastas de destino será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadTimerAudioRecovery(releaseVersion) {
    if (globalThis.__ALDUS_TIMER_AUDIO_RECOVERY_V236__ || document.getElementById(TIMER_AUDIO_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = TIMER_AUDIO_SCRIPT_ID;
    script.src = `timer-audio-recovery-v236.js?v=${encodeURIComponent(releaseVersion)}&hotfix=${encodeURIComponent(TIMER_AUDIO_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V236] A recuperação do áudio do cronômetro será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadTimerAudioUnifier() {
    if (globalThis.__ALDUS_TIMER_AUDIO_UNIFIER_V241__ || document.getElementById(TIMER_AUDIO_UNIFIER_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = TIMER_AUDIO_UNIFIER_SCRIPT_ID;
    script.src = `timer-audio-unifier-v241.js?v=${encodeURIComponent(TIMER_AUDIO_UNIFIER_VERSION)}&hotfix=${encodeURIComponent(TIMER_AUDIO_UNIFIER_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V241] A unificação dos alarmes do cronômetro será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadTimerMessageDedupe() {
    if (globalThis.__ALDUS_TIMER_MESSAGE_LAST_FIVE_V242__ || document.getElementById(TIMER_MESSAGE_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = TIMER_MESSAGE_SCRIPT_ID;
    script.src = `timer-message-dedupe-v239.js?v=${encodeURIComponent(TIMER_MESSAGE_VERSION)}&hotfix=${encodeURIComponent(TIMER_MESSAGE_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V242] A proteção das últimas cinco mensagens será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadDailySummaryTimeFormat() {
    if (globalThis.__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__ || document.getElementById(DAILY_SUMMARY_TIME_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = DAILY_SUMMARY_TIME_SCRIPT_ID;
    script.src = `daily-summary-time-format-v243.js?v=${encodeURIComponent(DAILY_SUMMARY_TIME_VERSION)}&hotfix=${encodeURIComponent(DAILY_SUMMARY_TIME_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V243] O formato de horas e minutos será tentado novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadTimerSessionIntegrity(releaseVersion) {
    if (globalThis.__ALDUS_TIMER_SESSION_INTEGRITY_V236__ || document.getElementById(TIMER_SESSION_SCRIPT_ID)) return true;
    const script = document.createElement("script");
    script.id = TIMER_SESSION_SCRIPT_ID;
    script.src = `timer-session-integrity-v236.js?v=${encodeURIComponent(releaseVersion)}&hotfix=${encodeURIComponent(TIMER_SESSION_HOTFIX)}`;
    script.async = false;
    script.addEventListener("error", () => {
      script.remove();
      console.warn("[Aldus V236] A proteção do tempo do cronômetro será tentada novamente na próxima abertura.");
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  function loadIntegrityCore() {
    const releaseVersion = globalThis.__ALDUS_APP_RELEASE__?.version || VERSION;
    prepareFactoryStartupGuard();
    // A fila da Fábrica precisa instalar antes do bootstrap assinalar o estado como pronto.
    // Caso contrário a tela pode mostrar contadores transitórios incorretos e corrigir-se segundos depois.
    loadFactoryQueueIntegrity(releaseVersion);

    if (loaded || document.getElementById(SCRIPT_ID)) return true;
    if (!bootstrapReady()) return false;
    loaded = true;
    installPersistenceGuards();
    loadFactoryDestinationIntegrity();
    loadTimerAudioRecovery(releaseVersion);
    loadTimerAudioUnifier();
    loadTimerMessageDedupe();
    loadDailySummaryTimeFormat();
    loadTimerSessionIntegrity(releaseVersion);
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `planning-integrity-v235.js?v=${encodeURIComponent(PLANNING_CORE_VERSION)}`;
    script.async = false;
    script.addEventListener("load", () => {
      installPersistenceGuards();
      enforceSnapshot();
      releaseFactoryStartupGuard();
    }, { once: true });
    script.addEventListener("error", () => {
      loaded = false;
      script.remove();
      releaseFactoryStartupGuard({ redraw: false });
    }, { once: true });
    document.body.appendChild(script);
    return true;
  }

  const attemptLoad = () => loadIntegrityCore();
  attemptLoad();
  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", attemptLoad, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", attemptLoad, { once: true });
    window.addEventListener("aldus:bootstrap-ready", attemptLoad, { once: true });
    window.addEventListener("load", attemptLoad, { once: true });
    window.addEventListener("hashchange", () => {
      if (factoryViewActive() && !bootstrapReady()) setFactoryStartupGuard(true);
      attemptLoad();
    });
  }
})();
