(() => {
  "use strict";

  const VERSION = "20260805-timer-audio-unified-v241";
  const HOTFIX = "timer-audio-unifier-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_AUDIO_UNIFIER_V241__";
  const WRAP_FLAG = "__aldusTimerAudioUnifiedV241";
  const MOTIVATIONAL_SOUND_STORAGE_KEY = "metasEstudoMotivationalSoundEnabled";

  if (globalThis[GLOBAL_KEY]) return;

  let legacyCompletionAlarm = null;
  let legacySilenceAlert = null;
  let preferenceCaptureInstalled = false;
  let installAttempts = 0;

  function recoveryApi() {
    const api = globalThis.__ALDUS_TIMER_AUDIO_RECOVERY_V236__;
    return api && typeof api.playMotivationalSound === "function" ? api : null;
  }

  function globalFunction(name) {
    try {
      const value = globalThis[name];
      return typeof value === "function" ? value : null;
    } catch {
      return null;
    }
  }

  function timerSessionKey() {
    try {
      const timer = typeof floatingTimer === "object" && floatingTimer ? floatingTimer : globalThis.floatingTimer;
      return String(timer?.sessionId || timer?.goalId || timer?.startedAt || "sessao");
    } catch {
      return "sessao";
    }
  }

  function stopLegacyAlarm() {
    if (!legacySilenceAlert) return false;
    try {
      legacySilenceAlert.call(globalThis);
      return true;
    } catch (error) {
      console.warn("[Aldus V241] Não foi possível interromper o alarme antigo.", error);
      return false;
    }
  }

  async function playUnifiedAlarm(type = "completed") {
    const normalizedType = type === "test" ? "test" : "completed";
    const api = recoveryApi();

    stopLegacyAlarm();

    if (!api) {
      if (!legacyCompletionAlarm) return false;
      try {
        return Boolean(await legacyCompletionAlarm.call(globalThis, normalizedType));
      } catch (error) {
        console.warn("[Aldus V241] O alarme alternativo não pôde ser reproduzido.", error);
        return false;
      }
    }

    if (normalizedType === "test") {
      return api.playMotivationalSound("teste do alarme do cronômetro", 100, { preview: true });
    }

    return api.playMotivationalSound(
      `tempo concluído:${timerSessionKey()}`,
      100,
      { preview: false }
    );
  }

  function silenceUnifiedAlarm() {
    const centralStopped = Boolean(recoveryApi()?.stopActiveSound?.());
    const legacyStopped = stopLegacyAlarm();
    return centralStopped || legacyStopped;
  }

  function assignGlobalFunction(name, replacement) {
    try {
      globalThis[name] = replacement;
    } catch {}
    try {
      if (name === "playTimerCompletionAlarm") playTimerCompletionAlarm = replacement;
      if (name === "playTimerBeep") playTimerBeep = replacement;
      if (name === "silenceTimerAlert") silenceTimerAlert = replacement;
    } catch {}
    return globalFunction(name) === replacement;
  }

  function installAlarmOverrides() {
    const currentCompletion = globalFunction("playTimerCompletionAlarm");
    const currentBeep = globalFunction("playTimerBeep");
    const currentSilence = globalFunction("silenceTimerAlert");

    if (!legacyCompletionAlarm) {
      if (currentCompletion && !currentCompletion[WRAP_FLAG]) legacyCompletionAlarm = currentCompletion;
      else if (currentBeep && !currentBeep[WRAP_FLAG]) legacyCompletionAlarm = currentBeep;
    }
    if (!legacySilenceAlert && currentSilence && !currentSilence[WRAP_FLAG]) {
      legacySilenceAlert = currentSilence;
    }

    if (!legacyCompletionAlarm && !currentCompletion && !currentBeep) return false;

    let completionWrapper = currentCompletion?.[WRAP_FLAG] ? currentCompletion : null;
    if (!completionWrapper) {
      completionWrapper = function playTimerCompletionAlarmUnifiedV241(type = "completed") {
        return playUnifiedAlarm(type);
      };
      Object.defineProperty(completionWrapper, WRAP_FLAG, { value: true });
      Object.defineProperty(completionWrapper, "__aldusOriginal", { value: legacyCompletionAlarm });
    }

    let silenceWrapper = currentSilence?.[WRAP_FLAG] ? currentSilence : null;
    if (!silenceWrapper) {
      silenceWrapper = function silenceTimerAlertUnifiedV241() {
        return silenceUnifiedAlarm();
      };
      Object.defineProperty(silenceWrapper, WRAP_FLAG, { value: true });
      Object.defineProperty(silenceWrapper, "__aldusOriginal", { value: legacySilenceAlert });
    }

    const completionInstalled = assignGlobalFunction("playTimerCompletionAlarm", completionWrapper);
    const beepInstalled = assignGlobalFunction("playTimerBeep", completionWrapper);
    const silenceInstalled = assignGlobalFunction("silenceTimerAlert", silenceWrapper);
    return completionInstalled && beepInstalled && silenceInstalled;
  }

  function persistMotivationalPreference(enabled) {
    const normalized = Boolean(enabled);
    const spectrum = globalThis.MetasQuestionAccuracySpectrum;
    if (typeof spectrum?.persistMotivationalSound === "function") {
      try {
        spectrum.persistMotivationalSound(normalized);
        return normalized;
      } catch {}
    }

    try { localStorage.setItem(MOTIVATIONAL_SOUND_STORAGE_KEY, String(normalized)); } catch {}
    try {
      if (typeof state === "object" && state) {
        state.settings ||= {};
        state.settings.timerPreferences ||= {};
        state.settings.timerPreferences.motivationalSound = normalized;
        if (typeof saveData === "function") saveData();
      }
    } catch {}
    return normalized;
  }

  function handleMotivationalPreferenceChange(event) {
    const input = event.target?.closest?.('[data-timer-pref="motivationalSound"]');
    if (!input) return;

    event.stopImmediatePropagation?.();
    event.stopPropagation?.();

    const enabled = persistMotivationalPreference(input.checked);
    if (!enabled) {
      recoveryApi()?.stopActiveSound?.();
      return;
    }

    void recoveryApi()?.playMotivationalSound?.(
      "prévia do aviso motivacional",
      10,
      { preview: true }
    );
  }

  function installPreferenceCapture() {
    if (preferenceCaptureInstalled || typeof document === "undefined") return preferenceCaptureInstalled;
    document.addEventListener("change", handleMotivationalPreferenceChange, true);
    preferenceCaptureInstalled = true;
    return true;
  }

  function markInstallation() {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.aldusTimerAudioUnifiedV241 = "true";
    document.querySelectorAll?.("[data-timer-audio-status]").forEach((element) => {
      element.dataset.timerAudioUnified = HOTFIX;
      element.title = `Áudio unificado ativo — ${HOTFIX}`;
    });
  }

  function install() {
    installAttempts += 1;
    const overrides = installAlarmOverrides();
    const preference = installPreferenceCapture();
    markInstallation();
    return overrides && preference && Boolean(recoveryApi());
  }

  const api = {
    version: VERSION,
    hotfix: HOTFIX,
    playUnifiedAlarm,
    silenceUnifiedAlarm,
    installAlarmOverrides,
    installPreferenceCapture,
    installed: () => Boolean(globalFunction("playTimerBeep")?.[WRAP_FLAG])
      && Boolean(globalFunction("playTimerCompletionAlarm")?.[WRAP_FLAG])
      && Boolean(globalFunction("silenceTimerAlert")?.[WRAP_FLAG])
  };
  globalThis[GLOBAL_KEY] = Object.freeze(api);

  if (typeof document === "undefined") return;

  const retryTimer = window.setInterval(() => {
    if (install() || installAttempts >= 200) window.clearInterval(retryTimer);
  }, 100);
  install();
  window.setTimeout(() => {
    window.clearInterval(retryTimer);
    install();
  }, 20000);
})();