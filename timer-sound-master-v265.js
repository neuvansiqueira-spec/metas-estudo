(() => {
  "use strict";

  const VERSION = "20260806-timer-sound-master-v265";
  const HOTFIX = "master-mute-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_SOUND_MASTER_V265__";
  const WRAP_FLAG = "__aldusTimerSoundMasterV265";
  const MASTER_STORAGE_KEY = "metasEstudoTimerSoundEnabled";
  const MASTER_SELECTOR = '[data-timer-pref="sound"]';
  const RECOVERY_KEY = "__ALDUS_TIMER_AUDIO_RECOVERY_V236__";
  const UNIFIER_KEY = "__ALDUS_TIMER_AUDIO_UNIFIER_V241__";

  if (globalThis[GLOBAL_KEY]) {
    try { globalThis[GLOBAL_KEY].install?.(); } catch {}
    return;
  }

  let captureInstalled = false;
  let storageInstalled = false;
  let installAttempts = 0;

  function timerPreferences() {
    try {
      if (typeof state === "object" && state) {
        state.settings ||= {};
        state.settings.timerPreferences ||= {};
        return state.settings.timerPreferences;
      }
    } catch {}
    return null;
  }

  function storedMasterPreference() {
    try {
      const stored = localStorage.getItem(MASTER_STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {}
    return null;
  }

  function masterSoundEnabled() {
    const preference = timerPreferences()?.sound;
    if (typeof preference === "boolean") return preference;
    const stored = storedMasterPreference();
    return typeof stored === "boolean" ? stored : true;
  }

  function syncMasterInputs(enabled = masterSoundEnabled()) {
    if (typeof document === "undefined") return;
    document.querySelectorAll?.(MASTER_SELECTOR).forEach((input) => {
      if (document.activeElement !== input) input.checked = Boolean(enabled);
      input.dataset.aldusSoundMaster = enabled ? "on" : "off";
      input.setAttribute?.("aria-checked", String(Boolean(enabled)));
    });
  }

  function stopAllSounds() {
    let stopped = false;
    try {
      stopped = Boolean(globalThis[RECOVERY_KEY]?.stopActiveSound?.()) || stopped;
    } catch {}
    try {
      stopped = Boolean(globalThis[UNIFIER_KEY]?.silenceUnifiedAlarm?.()) || stopped;
    } catch {}
    try {
      const silence = globalThis.silenceTimerAlert;
      const original = silence?.[WRAP_FLAG] ? silence.__aldusOriginal : silence;
      if (typeof original === "function") stopped = Boolean(original.call(globalThis)) || stopped;
    } catch {}
    return stopped;
  }

  function persistMasterSound(enabled, { save = true } = {}) {
    const normalized = Boolean(enabled);
    try { localStorage.setItem(MASTER_STORAGE_KEY, String(normalized)); } catch {}

    const preferences = timerPreferences();
    if (preferences) preferences.sound = normalized;
    syncMasterInputs(normalized);

    if (!normalized) stopAllSounds();

    if (save) {
      try {
        if (typeof saveTimerPreferences === "function") saveTimerPreferences();
        else if (typeof saveData === "function") saveData();
      } catch (error) {
        console.warn("[Aldus V265] Não foi possível salvar a preferência geral de som.", error);
      }
    }
    return normalized;
  }

  function blockedResult() {
    stopAllSounds();
    return Promise.resolve(false);
  }

  function globalFunction(name) {
    try {
      const value = globalThis[name];
      return typeof value === "function" ? value : null;
    } catch {
      return null;
    }
  }

  function assignGlobalFunction(name, replacement) {
    try { globalThis[name] = replacement; } catch {}
    try {
      if (name === "playTimerControlBeep") playTimerControlBeep = replacement;
      if (name === "playTimerBeep") playTimerBeep = replacement;
      if (name === "playTimerCompletionAlarm") playTimerCompletionAlarm = replacement;
    } catch {}
    return globalFunction(name) === replacement;
  }

  function wrapPlayFunction(name) {
    const current = globalFunction(name);
    if (!current) return false;
    if (current[WRAP_FLAG]) return true;

    const replacement = function timerSoundMasterGuardV265(...args) {
      if (!masterSoundEnabled()) return blockedResult();
      return current.apply(this, args);
    };
    Object.defineProperty(replacement, WRAP_FLAG, { value: true });
    Object.defineProperty(replacement, "__aldusOriginal", { value: current });
    return assignGlobalFunction(name, replacement);
  }

  function installRecoveryGuard() {
    const current = globalThis[RECOVERY_KEY];
    if (!current || typeof current !== "object") return false;
    if (current[WRAP_FLAG]) return true;

    const guarded = Object.freeze({
      ...current,
      [WRAP_FLAG]: true,
      __aldusOriginal: current,
      playControlSound(...args) {
        if (!masterSoundEnabled()) return blockedResult();
        return current.playControlSound?.(...args) ?? false;
      },
      playMotivationalSound(...args) {
        if (!masterSoundEnabled()) return blockedResult();
        return current.playMotivationalSound?.(...args) ?? false;
      },
      stopActiveSound(...args) {
        return current.stopActiveSound?.(...args) ?? false;
      }
    });

    try { globalThis[RECOVERY_KEY] = guarded; } catch {}
    return globalThis[RECOVERY_KEY] === guarded;
  }

  function installSpectrumGuard() {
    const current = globalThis.MetasQuestionAccuracySpectrum;
    if (!current || typeof current !== "object") return false;
    if (current[WRAP_FLAG]) return true;

    const guarded = Object.freeze({
      ...current,
      [WRAP_FLAG]: true,
      __aldusOriginal: current,
      playMotivationalChime(...args) {
        if (!masterSoundEnabled()) return blockedResult();
        return current.playMotivationalChime?.(...args) ?? false;
      }
    });

    try { globalThis.MetasQuestionAccuracySpectrum = guarded; } catch {}
    return globalThis.MetasQuestionAccuracySpectrum === guarded;
  }

  function handleMasterPreferenceChange(event) {
    const input = event.target?.closest?.(MASTER_SELECTOR);
    if (!input) return;

    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
    persistMasterSound(input.checked);
  }

  function installPreferenceCapture() {
    if (captureInstalled || typeof document === "undefined") return captureInstalled;
    document.addEventListener("change", handleMasterPreferenceChange, true);
    captureInstalled = true;
    return true;
  }

  function handleStorage(event) {
    if (event.key !== MASTER_STORAGE_KEY) return;
    const enabled = event.newValue !== "false";
    const preferences = timerPreferences();
    if (preferences) preferences.sound = enabled;
    syncMasterInputs(enabled);
    if (!enabled) stopAllSounds();
  }

  function installStorageSync() {
    if (storageInstalled || typeof window === "undefined") return storageInstalled;
    window.addEventListener?.("storage", handleStorage);
    storageInstalled = true;
    return true;
  }

  function markInstallation() {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.aldusTimerSoundMasterV265 = HOTFIX;
    syncMasterInputs();
  }

  function install() {
    installAttempts += 1;
    installPreferenceCapture();
    installStorageSync();
    installRecoveryGuard();
    installSpectrumGuard();
    wrapPlayFunction("playTimerControlBeep");
    wrapPlayFunction("playTimerBeep");
    wrapPlayFunction("playTimerCompletionAlarm");
    markInstallation();
    if (!masterSoundEnabled()) stopAllSounds();
    return Boolean(globalFunction("playTimerBeep")?.[WRAP_FLAG])
      && Boolean(globalFunction("playTimerCompletionAlarm")?.[WRAP_FLAG]);
  }

  const api = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    masterSoundEnabled,
    persistMasterSound,
    stopAllSounds,
    install,
    installed: () => Boolean(globalFunction("playTimerBeep")?.[WRAP_FLAG])
      && Boolean(globalFunction("playTimerCompletionAlarm")?.[WRAP_FLAG])
  });
  globalThis[GLOBAL_KEY] = api;

  if (typeof document === "undefined") return;

  install();
  const retryTimer = window.setInterval?.(() => {
    if (install() || installAttempts >= 200) window.clearInterval?.(retryTimer);
  }, 100);
  window.setTimeout?.(() => {
    window.clearInterval?.(retryTimer);
    install();
  }, 20000);
})();
