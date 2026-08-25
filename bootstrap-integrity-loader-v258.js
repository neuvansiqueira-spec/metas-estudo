(() => {
  "use strict";

  const VERSION = "20260821-timer-goal-integrity-v366";
  const UPDATE_FLOW_SCRIPT = "update-flow-v395.js?v=20260825-no-auto-reload-v395";
  const TIMER_AUDIO_STABILITY_SCRIPT = "timer-audio-stability-v396.js?v=20260825-timer-audio-stability-v396";
  const CORE_SCRIPT = "bootstrap-integrity-loader-v258-core.js?v=20260815-bootstrap-performance-v342&planning=v371";
  const DIAGNOSTICS_SCRIPT = "duplicate-diagnostics-v260.js?v=20260806-duplicate-diagnostics-v260";
  const DIAGNOSTICS_STYLESHEET = "duplicate-diagnostics-v260.css?v=20260806-duplicate-diagnostics-v260";
  const TIMER_SOUND_MASTER_SCRIPT = "timer-sound-master-v265.js?v=20260806-timer-sound-master-v265&hotfix=master-mute-hotfix1";
  const TIMER_CONTROLS_SCRIPT = "timer-controls-hardening-v268.js?v=20260808-timer-controls-sound-v268&hotfix=timer-controls-hardening-hotfix1";
  const PLANNING_SHIFT_PERSISTENCE_SCRIPT = "planning-shift-persistence-v283.js?v=20260809-planejamento-plantao-salvamento-v283";
  const HEADER_BRAND_FIX_SCRIPT = "header-brand-fix.js?v=20260815-logo-alta-qualidade-v338";
  const TIMER_GOAL_INTEGRITY_SCRIPT = "timer-goal-integrity-v366.js?v=20260821-timer-goal-integrity-v366";
  const PRELOAD_SCRIPTS = [UPDATE_FLOW_SCRIPT, TIMER_AUDIO_STABILITY_SCRIPT, HEADER_BRAND_FIX_SCRIPT];

  function installStylesheet(baseUrl) {
    if (document.getElementById("aldusDuplicateDiagnosticsStylesV260")) return;
    const link = document.createElement("link");
    link.id = "aldusDuplicateDiagnosticsStylesV260";
    link.rel = "stylesheet";
    link.href = new URL(DIAGNOSTICS_STYLESHEET, baseUrl).toString();
    (document.head || document.documentElement).appendChild(link);
  }

  function installScriptPreloads(baseUrl) {
    const head = document.head || document.documentElement;
    PRELOAD_SCRIPTS.forEach((sourceUrl, index) => {
      const id = `aldusBootstrapChainPreloadV283-${index + 1}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "preload";
      link.as = "script";
      link.href = new URL(sourceUrl, baseUrl).toString();
      head.appendChild(link);
    });
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

  function reportLoadError(version, label) {
    return () => console.error(`[${version}] Falha ao carregar ${label}.`);
  }

  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;
  const parent = source?.parentNode || document.head || document.documentElement;

  installScriptPreloads(baseUrl);
  installStylesheet(baseUrl);

  const updateFlow = makeScript("aldusUpdateFlowV395", UPDATE_FLOW_SCRIPT, baseUrl, source);
  updateFlow.addEventListener("error", reportLoadError(VERSION, "a proteção contra recarga automática"));

  const timerAudioStability = makeScript("aldusTimerAudioStabilityV396", TIMER_AUDIO_STABILITY_SCRIPT, baseUrl, source);
  timerAudioStability.addEventListener("error", reportLoadError(VERSION, "a estabilidade do áudio do cronômetro"));

  const brandFix = makeScript("aldusHeaderBrandFixV338", HEADER_BRAND_FIX_SCRIPT, baseUrl, source);
  brandFix.addEventListener("error", reportLoadError(VERSION, "a restauração da logo em alta qualidade"));

  const core = makeScript(source?.id || "aldusBootstrapIntegrityLoaderV258", CORE_SCRIPT, baseUrl, source);
  if (source?.id) source.removeAttribute("id");
  core.addEventListener("error", reportLoadError(VERSION, "o núcleo de inicialização preservado"));

  const timerGoalIntegrity = makeScript("aldusTimerGoalIntegrityV366", TIMER_GOAL_INTEGRITY_SCRIPT, baseUrl, source);
  timerGoalIntegrity.addEventListener("error", reportLoadError(VERSION, "a integridade do tempo do cronômetro nas metas"));

  const shiftPersistence = makeScript("aldusPlanningShiftPersistenceV283", PLANNING_SHIFT_PERSISTENCE_SCRIPT, baseUrl, source);
  shiftPersistence.addEventListener("error", reportLoadError(VERSION, "a persistência das disciplinas de plantão"));

  const diagnostics = makeScript("aldusDuplicateDiagnosticsScriptV260", DIAGNOSTICS_SCRIPT, baseUrl, source);
  diagnostics.addEventListener("error", reportLoadError(VERSION, "o diagnóstico de duplicações"));

  const soundMaster = makeScript("aldusTimerSoundMasterV265", TIMER_SOUND_MASTER_SCRIPT, baseUrl, source);
  soundMaster.addEventListener("error", reportLoadError(VERSION, "o controle geral de som do cronômetro"));

  const timerControls = makeScript("aldusTimerControlsHardeningV268", TIMER_CONTROLS_SCRIPT, baseUrl, source);
  timerControls.addEventListener("error", reportLoadError(VERSION, "a proteção dos controles do cronômetro"));

  parent.insertBefore(updateFlow, source?.nextSibling || null);
  parent.insertBefore(timerAudioStability, updateFlow.nextSibling);
  parent.insertBefore(brandFix, timerAudioStability.nextSibling);
  parent.insertBefore(core, brandFix.nextSibling);
  parent.insertBefore(timerGoalIntegrity, core.nextSibling);
  parent.insertBefore(shiftPersistence, timerGoalIntegrity.nextSibling);
  parent.insertBefore(diagnostics, shiftPersistence.nextSibling);
  parent.insertBefore(soundMaster, diagnostics.nextSibling);
  parent.insertBefore(timerControls, soundMaster.nextSibling);

  globalThis.__aldusDuplicateDiagnosticsLoaderV260 = Object.freeze({
    version: VERSION,
    updateFlow: UPDATE_FLOW_SCRIPT,
    timerAudioStability: TIMER_AUDIO_STABILITY_SCRIPT,
    headerBrandFix: HEADER_BRAND_FIX_SCRIPT,
    core: CORE_SCRIPT,
    timerGoalIntegrity: TIMER_GOAL_INTEGRITY_SCRIPT,
    planningShiftPersistence: PLANNING_SHIFT_PERSISTENCE_SCRIPT,
    script: DIAGNOSTICS_SCRIPT,
    stylesheet: DIAGNOSTICS_STYLESHEET,
    timerSoundMaster: TIMER_SOUND_MASTER_SCRIPT,
    timerControls: TIMER_CONTROLS_SCRIPT,
    preloadedScripts: PRELOAD_SCRIPTS.length
  });
})();
