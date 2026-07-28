(() => {
  "use strict";
  if (typeof document === "undefined") return;

  const RELEASE_VERSION = "20260727-fabrica-simples-recolhivel-v163";
  const current = document.currentScript;
  const parent = current?.parentNode || document.head || document.documentElement;

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-aldus-patch="${marker}"]`);
      if (existing?.dataset.loaded === "true") {
        resolve();
        return;
      }
      const script = existing || document.createElement("script");
      script.async = false;
      script.dataset.aldusPatch = marker;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Não foi possível carregar ${src}.`)), { once: true });
      if (!existing) {
        script.src = src;
        (document.head || document.documentElement).appendChild(script);
      }
    });
  }

  const core = document.createElement("script");
  core.id = "aldusAppBundleScript";
  core.src = `app-v159.js?v=${RELEASE_VERSION}`;
  core.async = false;
  parent.insertBefore(core, current?.nextSibling || null);

  function loadCurrentPatches(attempt = 0) {
    const coreReady = typeof renderFactory === "function" && typeof state !== "undefined";
    if (!coreReady) {
      if (attempt >= 2400) {
        console.error("[Aldus v163] O núcleo não ficou disponível para carregar as correções complementares.");
        return;
      }
      setTimeout(() => loadCurrentPatches(attempt + 1), 25);
      return;
    }

    Promise.allSettled([
      loadScript("timer-motivation-v161.js?v=20260727-cronometro-motivacao-tempo-v161", "timer-motivation-v161"),
      loadScript("question-register-simple-v162.js?v=20260727-registrar-questoes-simples-v162", "question-register-simple-v162"),
      loadScript(`factory-simple-v163.js?v=${RELEASE_VERSION}`, "factory-simple-v163")
    ]).then((results) => {
      results.forEach((result) => {
        if (result.status === "rejected") console.warn("[Aldus v163] Correção complementar não carregada.", result.reason);
      });
    });
  }

  core.addEventListener("load", () => loadCurrentPatches(), { once: true });
  setTimeout(() => loadCurrentPatches(), 0);
})();
