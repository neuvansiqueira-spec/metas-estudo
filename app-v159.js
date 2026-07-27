(() => {
  "use strict";
  if (typeof document === "undefined") return;

  const current = document.currentScript;
  const parent = current?.parentNode || document.head || document.documentElement;
  const script = document.createElement("script");
  script.id = "aldusAppBundleScript";
  script.src = "app-v158.js?v=20260727-fabrica-plano-dia-v159";
  script.async = false;
  parent.insertBefore(script, current?.nextSibling || null);

  function installTimerFirstBeepFix() {
    if (globalThis.__ALDUS_TIMER_FIRST_BEEP_V160__) return true;
    if (
      typeof playTimerControlBeep !== "function"
      || typeof state === "undefined"
      || typeof timerAlertVolumeGain !== "function"
      || typeof timerAudioContext === "undefined"
      || typeof timerAudioPrepared === "undefined"
      || typeof timerAudioUserMessage === "undefined"
    ) return false;

    playTimerControlBeep = function playTimerControlBeepV160(type = "start") {
      if (!state.settings?.timerPreferences?.sound) return Promise.resolve(false);

      try {
        timerAudioUserMessage = "";
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          timerAudioUserMessage = "O navegador não permitiu o som. O aviso visual continuará funcionando. Toque em ‘Testar alarme’ para tentar novamente.";
          return Promise.resolve(false);
        }

        if (!timerAudioContext || timerAudioContext.state === "closed") {
          timerAudioContext = new AudioCtx();
          timerAudioPrepared = false;
        }

        const ctx = timerAudioContext;
        const duration = type === "pause" ? 0.11 : 0.13;
        const frequency = type === "pause" ? 440 : 720;
        const start = ctx.currentTime + 0.012;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          Math.min(0.12, 0.065 * timerAlertVolumeGain()),
          start + 0.018
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration + 0.025);
        timerAudioPrepared = true;

        if (ctx.state === "running") return Promise.resolve(true);

        let resumeResult;
        try {
          resumeResult = ctx.resume();
        } catch (error) {
          console.warn("Falha ao liberar o áudio do cronômetro", error);
          return Promise.resolve(false);
        }

        return Promise.resolve(resumeResult)
          .then(() => ctx.state === "running")
          .catch((error) => {
            console.warn("Falha ao liberar o áudio do cronômetro", error);
            return false;
          });
      } catch (error) {
        console.warn("Falha no bip de controle do cronômetro", error);
        return Promise.resolve(false);
      }
    };

    Object.defineProperty(globalThis, "__ALDUS_TIMER_FIRST_BEEP_V160__", {
      value: Object.freeze({
        version: "20260727-cronometro-primeiro-bip-v160",
        installedAt: new Date().toISOString()
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
    return true;
  }

  function scheduleTimerFirstBeepFix(attempt = 0) {
    if (installTimerFirstBeepFix()) return;
    if (attempt >= 2400) {
      console.error("[Aldus v160] A correção do primeiro bip não pôde ser instalada.");
      return;
    }
    setTimeout(() => scheduleTimerFirstBeepFix(attempt + 1), 25);
  }

  scheduleTimerFirstBeepFix();
})();