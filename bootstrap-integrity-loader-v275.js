(() => {
  "use strict";

  const VERSION = "20260823-indexeddb-direct-snapshot-v378";
  const LEGACY_VERSION = "20260815-bootstrap-performance-v342";
  const UPDATE_FLOW_SCRIPT = "update-flow-v395.js?v=20260825-no-auto-reload-v395";
  const TIMER_AUDIO_STABILITY_SCRIPT = "timer-audio-stability-v396.js?v=20260825-timer-audio-stability-v396";
  const CORE_SCRIPT = `bootstrap-fast-path-v351.js?v=${VERSION}&planning=v371`;
  const DIAGNOSTICS_SCRIPT = `duplicate-diagnostics-v260.js?v=${LEGACY_VERSION}`;
  const DIAGNOSTICS_STYLESHEET = `duplicate-diagnostics-v260.css?v=${LEGACY_VERSION}`;
  const RECOVERY_SCRIPT = `recovery-safety-v275.js?v=${LEGACY_VERSION}`;
  const PLANNING_SHIFT_PERSISTENCE_SCRIPT = `planning-shift-persistence-v283.js?v=${LEGACY_VERSION}`;
  const TIMER_SOUND_MASTER_SCRIPT = `timer-sound-master-v265.js?v=${LEGACY_VERSION}&hotfix=master-mute-hotfix1`;
  const TIMER_CONTROLS_SCRIPT = `timer-controls-hardening-v268.js?v=${LEGACY_VERSION}&hotfix=timer-controls-hardening-hotfix2`;

  function installStylesheet(baseUrl) {
    if (document.getElementById("aldusDuplicateDiagnosticsStylesV260")) return;
    const link = document.createElement("link");
    link.id = "aldusDuplicateDiagnosticsStylesV260";
    link.rel = "stylesheet";
    link.href = new URL(DIAGNOSTICS_STYLESHEET, baseUrl).toString();
    (document.head || document.documentElement).appendChild(link);
  }

  function makeScript(id, sourceUrl, baseUrl, source) {
    const script = document.createElement("script");
    script.id = id;
    script.src = new URL(sourceUrl, baseUrl).toString();
    script.async = false;
    if (source?.nonce) script.nonce = source.nonce;
    if (source?.crossOrigin) script.crossOrigin = source.crossOrigin;
    if (source?.referrerPolicy) script.referrerPolicy = source.referrerPolicy;
    return script;
  }

  function loadSignal(script, label) {
    return new Promise((resolve) => {
      script.addEventListener("load", () => resolve(true), { once: true });
      script.addEventListener("error", () => {
        console.error(`[${VERSION}] Falha ao carregar ${label}; o aplicativo continuará abrindo.`);
        resolve(false);
      }, { once: true });
    });
  }

  async function start() {
    const source = document.currentScript;
    const baseUrl = source?.src || document.baseURI;
    const parent = source?.parentNode || document.body || document.documentElement;
    installStylesheet(baseUrl);

    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Abrindo seus dados protegidos...";

    const updateFlow = makeScript("aldusUpdateFlowV395", UPDATE_FLOW_SCRIPT, baseUrl, source);
    const timerAudioStability = makeScript("aldusTimerAudioStabilityV396", TIMER_AUDIO_STABILITY_SCRIPT, baseUrl, source);
    const core = makeScript("aldusBootstrapIntegrityCoreV275", CORE_SCRIPT, baseUrl, source);
    const shiftPersistence = makeScript("aldusPlanningShiftPersistenceV283", PLANNING_SHIFT_PERSISTENCE_SCRIPT, baseUrl, source);
    const modernDiagnostics = globalThis.AldusDuplicateDiagnosticsV309;
    const diagnostics = modernDiagnostics?.VERSION === "20260811-duplicate-flow-owner-v309"
      ? null
      : makeScript("aldusDuplicateDiagnosticsScriptV260", DIAGNOSTICS_SCRIPT, baseUrl, source);
    const recovery = makeScript("aldusRecoverySafetyV275", RECOVERY_SCRIPT, baseUrl, source);
    const soundMaster = makeScript("aldusTimerSoundMasterV265", TIMER_SOUND_MASTER_SCRIPT, baseUrl, source);
    const timerControls = makeScript("aldusTimerControlsHardeningV268", TIMER_CONTROLS_SCRIPT, baseUrl, source);

    const updateFlowReady = loadSignal(updateFlow, "a proteção contra recarga automática");
    const timerAudioReady = loadSignal(timerAudioStability, "a estabilidade do áudio do cronômetro");
    core.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar o fast path de inicialização.`), { once: true });
    shiftPersistence.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar a persistência das disciplinas de plantão.`), { once: true });
    diagnostics?.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar o diagnóstico de duplicações.`), { once: true });
    recovery.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar a recuperação segura.`), { once: true });
    soundMaster.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar o controle geral de som do cronômetro.`), { once: true });
    timerControls.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar a proteção dos controles do cronômetro.`), { once: true });

    parent.insertBefore(updateFlow, source?.nextSibling || null);
    await updateFlowReady;
    parent.insertBefore(timerAudioStability, updateFlow.nextSibling);
    await timerAudioReady;
    parent.insertBefore(core, timerAudioStability.nextSibling);
    parent.insertBefore(shiftPersistence, core.nextSibling);
    if (diagnostics) parent.insertBefore(diagnostics, shiftPersistence.nextSibling);
    parent.insertBefore(recovery, (diagnostics || shiftPersistence).nextSibling);
    parent.insertBefore(soundMaster, recovery.nextSibling);
    parent.insertBefore(timerControls, soundMaster.nextSibling);

    globalThis.__aldusBootstrapIntegrityLoaderV275 = Object.freeze({
      version: VERSION,
      updateFlow: UPDATE_FLOW_SCRIPT,
      timerAudioStability: TIMER_AUDIO_STABILITY_SCRIPT,
      core: CORE_SCRIPT,
      planningShiftPersistence: PLANNING_SHIFT_PERSISTENCE_SCRIPT,
      diagnostics: diagnostics ? DIAGNOSTICS_SCRIPT : "duplicate-diagnostics-v309.js (pinned)",
      recovery: RECOVERY_SCRIPT,
      timerSoundMaster: TIMER_SOUND_MASTER_SCRIPT,
      timerControls: TIMER_CONTROLS_SCRIPT
    });
  }

  start().catch((error) => {
    console.error(`[${VERSION}] Falha ao iniciar o carregador protegido.`, error);
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Falha na proteção dos dados. Recarregue a página antes de continuar.";
  });
})();
