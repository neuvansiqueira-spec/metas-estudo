(() => {
  "use strict";
  if (typeof document === "undefined" || globalThis.__ALDUS_BOOTSTRAP_V167__) return;

  const RELEASE_VERSION = "20260727-inicializacao-unica-segura-v167";
  const current = document.currentScript;
  const parent = current?.parentNode || document.head || document.documentElement;

  Object.defineProperty(globalThis, "__ALDUS_BOOTSTRAP_V167__", {
    value: Object.freeze({
      version: RELEASE_VERSION,
      startedAt: new Date().toISOString(),
      mode: "single-loader-ordered-dependencies"
    }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  function loadScript(src, marker, id = "") {
    return new Promise((resolve, reject) => {
      const selector = `script[data-aldus-patch="${marker}"]`;
      const existing = document.querySelector(selector);
      if (existing?.dataset.loaded === "true") {
        resolve(existing);
        return;
      }

      const script = existing || document.createElement("script");
      script.async = false;
      script.dataset.aldusPatch = marker;
      if (id && !script.id) script.id = id;

      const onLoad = () => {
        script.dataset.loaded = "true";
        resolve(script);
      };
      const onError = () => reject(new Error(`Não foi possível carregar ${src}.`));

      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });

      if (!existing) {
        script.src = src;
        if (marker === "core-v158-v167") {
          parent.insertBefore(script, current?.nextSibling || null);
        } else {
          (document.head || document.documentElement).appendChild(script);
        }
      }
    });
  }

  function waitForCondition(test, { attempts = 600, interval = 25, label = "condição" } = {}) {
    return new Promise((resolve, reject) => {
      let attempt = 0;
      const check = () => {
        let ready = false;
        try {
          ready = Boolean(test());
        } catch {}
        if (ready) {
          resolve(true);
          return;
        }
        if (attempt >= attempts) {
          reject(new Error(`Tempo esgotado aguardando ${label}.`));
          return;
        }
        attempt += 1;
        setTimeout(check, interval);
      };
      check();
    });
  }

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

  function reportRejected(results) {
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("[Aldus v167] Complemento não carregado.", result.reason);
      }
    });
  }

  async function loadCurrentPatches() {
    await waitForCondition(
      () => typeof renderFactory === "function" && typeof state !== "undefined",
      { label: "o núcleo do aplicativo" }
    );

    installTimerFirstBeepFix();

    const firstPhase = await Promise.allSettled([
      loadScript("timer-motivation-v161.js?v=20260727-cronometro-motivacao-tempo-v161", "timer-motivation-v161"),
      loadScript("question-register-simple-v162.js?v=20260727-registrar-questoes-simples-v162", "question-register-simple-v162"),
      loadScript("factory-simple-v163.js?v=20260727-fabrica-simples-recolhivel-v163", "factory-simple-v163")
    ]);
    reportRejected(firstPhase);

    const secondPhase = [
      loadScript(`update-flow-v167.js?v=${RELEASE_VERSION}`, "update-flow-v167")
    ];

    try {
      await waitForCondition(
        () => Boolean(globalThis.__ALDUS_FACTORY_SIMPLE_V163__),
        { attempts: 240, interval: 50, label: "a estrutura simplificada da Fábrica" }
      );
      secondPhase.unshift(
        loadScript("factory-polish-v164.js?v=20260727-fabrica-polimento-visual-v164", "factory-polish-v164")
      );
    } catch (error) {
      console.warn("[Aldus v167] Polimento da Fábrica não iniciado porque sua estrutura-base não ficou pronta.", error);
    }

    const finalResults = await Promise.allSettled(secondPhase);
    reportRejected(finalResults);
  }

  loadScript(
    `app-v158.js?v=${RELEASE_VERSION}`,
    "core-v158-v167",
    "aldusAppCoreV167"
  )
    .then(() => loadCurrentPatches())
    .catch((error) => {
      console.error("[Aldus v167] A inicialização segura não pôde ser concluída.", error);
    });
})();
