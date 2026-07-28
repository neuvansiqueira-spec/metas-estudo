(() => {
  "use strict";

  if (globalThis.__ALDUS_TIMER_FIRST_BEEP_V160__) return;

  function installTimerFirstBeepFix() {
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
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          Math.min(0.12, 0.065 * timerAlertVolumeGain()),
          start + 0.018
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.025);
        timerAudioPrepared = true;

        if (ctx.state === "running") return Promise.resolve(true);
        return Promise.resolve(ctx.resume())
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

  if (!installTimerFirstBeepFix()) {
    console.error("[Aldus v168] O núcleo terminou sem disponibilizar a correção do primeiro bip.");
  }
})();
