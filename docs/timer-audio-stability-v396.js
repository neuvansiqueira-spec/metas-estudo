(() => {
  "use strict";

  const VERSION = "20260825-timer-audio-stability-v396";
  const HOTFIX = "timer-audio-stability-v396";
  const GLOBAL_KEY = "__ALDUS_TIMER_AUDIO_RECOVERY_V236__";
  const CONTROL_FLAG = "__aldusTimerAudioRecoveryV236";
  const MOTIVATION_STORAGE_KEY = "metasEstudoMotivationalSoundEnabled";
  const AUDIO_EVENT_STORAGE_KEY = "metasEstudoTimerAudioEventV396";
  const OLD_AUDIO_EVENT_KEYS = [
    "metasEstudoTimerAudioEventV240",
    "metasEstudoTimerAudioSessionEventV297"
  ];
  const MOTIVATION_HISTORY_KEY = "metasEstudoTimerMotivationalHistoryV161";
  const TIMER_DIAGNOSTICS_KEY = "aldus:timer:diagnostics:v316";
  const STORAGE_PROBE_KEY = "aldus:timer:audio:probe:v396";
  const CONTROL_SHARED_DEDUPE_MS = 350;
  const MOTIVATION_GENERIC_DEDUPE_MS = 60 * 1000;
  const MOTIVATION_EVENT_RETENTION_MS = 12 * 60 * 60 * 1000;
  const MOTIVATION_RESUME_BUCKET_SECONDS = 300;
  const MOTIVATION_FALLBACK_BUCKET_SECONDS = 600;
  const SOUND_PRIORITIES = Object.freeze({ control: 1, motivation: 2, final: 3, preview: 4 });

  if (globalThis[GLOBAL_KEY]) return;

  let audioContext = null;
  let activeSound = null;
  let activeSoundSequence = 0;
  let lastMessageSignature = "";
  let lastMessageAt = 0;
  let lastControlType = "";
  let lastControlAt = 0;
  let fallbackSessionGeneration = 1;
  let fallbackSessionGoalId = "";
  let fallbackSessionLastElapsed = 0;
  let discoveryObserver = null;
  let targetObserver = null;
  let installAttempts = 0;
  let storageReliefAttempted = false;
  const boundMessageTargets = new WeakSet();
  const memoryClaims = new Map();

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

  function controlSoundEnabled() {
    const preference = timerPreferences()?.sound;
    return typeof preference === "boolean" ? preference : true;
  }

  function motivationalSoundEnabled() {
    const preference = timerPreferences()?.motivationalSound;
    if (typeof preference === "boolean") return preference;
    try {
      const stored = localStorage.getItem(MOTIVATION_STORAGE_KEY);
      return stored == null ? true : stored !== "false";
    } catch {
      return true;
    }
  }

  function normalizeAudioEventKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isQuotaError(error) {
    return error?.name === "QuotaExceededError"
      || error?.code === 22
      || /quota/i.test(String(error?.message || ""));
  }

  function trimTimerDiagnostics() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TIMER_DIAGNOSTICS_KEY) || "null");
      if (!Array.isArray(parsed) || parsed.length <= 24) return false;
      localStorage.setItem(TIMER_DIAGNOSTICS_KEY, JSON.stringify(parsed.slice(-24)));
      return true;
    } catch {
      try { localStorage.removeItem(TIMER_DIAGNOSTICS_KEY); } catch {}
      return false;
    }
  }

  function relieveStoragePressure() {
    if (storageReliefAttempted) return false;
    storageReliefAttempted = true;
    try { localStorage.removeItem(MOTIVATION_HISTORY_KEY); } catch {}
    for (const key of OLD_AUDIO_EVENT_KEYS) {
      try { localStorage.removeItem(key); } catch {}
    }
    try { localStorage.removeItem(AUDIO_EVENT_STORAGE_KEY); } catch {}
    trimTimerDiagnostics();
    return true;
  }

  function ensureStorageHeadroom() {
    try {
      localStorage.setItem(STORAGE_PROBE_KEY, "1");
      localStorage.removeItem(STORAGE_PROBE_KEY);
      return true;
    } catch (error) {
      if (!isQuotaError(error)) return false;
      relieveStoragePressure();
      try {
        localStorage.setItem(STORAGE_PROBE_KEY, "1");
        localStorage.removeItem(STORAGE_PROBE_KEY);
        return true;
      } catch {
        return false;
      }
    }
  }

  function fallbackClaimAllowed() {
    try {
      return document.visibilityState === "visible"
        && (typeof document.hasFocus !== "function" || document.hasFocus());
    } catch {
      return false;
    }
  }

  function pruneMemoryClaims(now = Date.now()) {
    const cutoff = now - MOTIVATION_EVENT_RETENTION_MS;
    for (const [key, timestamp] of memoryClaims.entries()) {
      if (Number(timestamp) < cutoff) memoryClaims.delete(key);
    }
  }

  function claimMemoryEvent(key, dedupeMs, now = Date.now()) {
    pruneMemoryClaims(now);
    const previousAt = Number(memoryClaims.get(key) || 0);
    if (previousAt > 0 && now - previousAt >= 0 && now - previousAt < dedupeMs) return false;
    memoryClaims.set(key, now);
    return true;
  }

  function claimSharedAudioEvent(eventKey, dedupeMs, now = Date.now()) {
    const key = normalizeAudioEventKey(eventKey);
    if (!key) return true;
    if (!claimMemoryEvent(key, dedupeMs, now)) return false;

    const tryStorageClaim = () => {
      const parsed = JSON.parse(localStorage.getItem(AUDIO_EVENT_STORAGE_KEY) || "null");
      const sourceEvents = parsed?.events && typeof parsed.events === "object" ? parsed.events : {};
      const previousAt = Number(sourceEvents[key] || 0);
      const elapsed = now - previousAt;
      if (previousAt > 0 && elapsed >= 0 && elapsed < dedupeMs) return false;

      const cutoff = now - MOTIVATION_EVENT_RETENTION_MS;
      const events = {};
      Object.entries(sourceEvents).forEach(([storedKey, storedAt]) => {
        const timestamp = Number(storedAt || 0);
        if (timestamp >= cutoff && timestamp <= now + 1000) events[storedKey] = timestamp;
      });
      events[key] = now;
      localStorage.setItem(AUDIO_EVENT_STORAGE_KEY, JSON.stringify({ version: 396, events }));
      return true;
    };

    try {
      return tryStorageClaim();
    } catch (error) {
      if (isQuotaError(error)) {
        relieveStoragePressure();
        try { return tryStorageClaim(); } catch {}
      }
      // Nunca falhar aberto em abas ocultas: evita vários bipes quando o armazenamento está cheio.
      return fallbackClaimAllowed();
    }
  }

  function coreTimer() {
    try {
      if (typeof floatingTimer === "object" && floatingTimer) return floatingTimer;
    } catch {}
    try {
      return globalThis.floatingTimer && typeof globalThis.floatingTimer === "object"
        ? globalThis.floatingTimer
        : null;
    } catch {
      return null;
    }
  }

  function timerElapsedSeconds() {
    try {
      if (typeof currentTimerSeconds === "function") {
        const value = Number(currentTimerSeconds());
        if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
      }
    } catch {}
    const timer = coreTimer();
    const base = Math.max(0, Number(timer?.elapsedSeconds) || 0);
    if (!timer?.startedAt || timer?.paused) return Math.floor(base);
    return Math.floor(base + Math.max(0, Date.now() - Number(timer.startedAt || 0)) / 1000);
  }

  function timerAudioSessionKey() {
    const timer = coreTimer();
    const explicit = timer?.sessionId || timer?.timerSessionId || timer?.sessionKey;
    if (explicit) return `session:${String(explicit).slice(0, 120)}`;

    const goalId = String(timer?.goalId || timer?.id || "sem-meta").slice(0, 100);
    const elapsed = timerElapsedSeconds();
    if (fallbackSessionGoalId !== goalId || elapsed + 5 < fallbackSessionLastElapsed) {
      fallbackSessionGeneration += 1;
    }
    fallbackSessionGoalId = goalId;
    fallbackSessionLastElapsed = elapsed;
    return `goal:${goalId}:generation:${fallbackSessionGeneration}`;
  }

  function motivationalSessionEvent(signature, milestone) {
    const normalized = normalizeAudioEventKey(signature);
    const elapsed = timerElapsedSeconds();

    const focusMinutes = normalized.match(/\b(\d{1,4})\s*minutos?\s+de\s+foco\b/i);
    if (focusMinutes) {
      const value = Number(focusMinutes[1]);
      if (Number.isFinite(value) && value >= 0) {
        return { key: `focus-minutes:${value}`, dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
      }
    }

    const explicitMilestone = normalized.match(/(?:marco\s*[:=-]?\s*|\b)(\d+(?:[.,]\d+)?)\s*%/i)
      || normalized.match(/\bmarco\s*[:=-]?\s*(\d+(?:[.,]\d+)?)/i);
    if (explicitMilestone) {
      const value = Number(String(explicitMilestone[1]).replace(",", "."));
      if (Number.isFinite(value)) return { key: `milestone:${value}`, dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
    }

    if (/100\s*%|tempo concluido|sessao concluida|\bfinal\b/i.test(normalized)
      || (Number(milestone) >= 100 && /conclu|final|tempo/i.test(normalized))) {
      return { key: "completion", dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
    }
    if (/foco retomado/i.test(normalized)) {
      return { key: `focus-resumed:${Math.floor(elapsed / MOTIVATION_RESUME_BUCKET_SECONDS)}`, dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
    }
    if (/bom comeco/i.test(normalized)) {
      return { key: "start-cue", dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
    }
    if (/sessao em andamento/i.test(normalized)) {
      return { key: "restored-cue", dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
    }
    if (/continue firme/i.test(normalized)) {
      return { key: `fallback:${Math.floor(elapsed / MOTIVATION_FALLBACK_BUCKET_SECONDS)}`, dedupeMs: MOTIVATION_EVENT_RETENTION_MS };
    }
    return {
      key: `message:${normalized.slice(0, 180) || String(milestone || "motivacao")}`,
      dedupeMs: MOTIVATION_GENERIC_DEDUPE_MS
    };
  }

  function claimMotivationalSessionEvent(signature, milestone, now = Date.now()) {
    const sessionKey = timerAudioSessionKey();
    const event = motivationalSessionEvent(signature, milestone);
    return claimSharedAudioEvent(`motivation:${sessionKey}:${event.key}`, event.dedupeMs, now);
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
    return audioContext;
  }

  async function unlockAudio() {
    try {
      const context = getAudioContext();
      if (!context) return null;
      if (context.state === "suspended") await context.resume();
      return context.state === "running" ? context : null;
    } catch {
      return null;
    }
  }

  function disconnectNode(node) {
    try { node?.disconnect?.(); } catch {}
  }

  function stopSound(sound = activeSound) {
    if (!sound) return false;
    if (sound.cleanupTimer) window.clearTimeout?.(sound.cleanupTimer);
    sound.nodes.forEach(({ oscillator, gain }) => {
      try { oscillator.stop(audioContext?.currentTime || 0); } catch {}
      disconnectNode(oscillator);
      disconnectNode(gain);
    });
    sound.nodes.clear();
    if (activeSound?.id === sound.id) activeSound = null;
    return true;
  }

  function beginSound(kind, priority, expectedDurationMs) {
    if (activeSound) {
      if (priority < activeSound.priority) return null;
      stopSound(activeSound);
    }
    const sound = {
      id: ++activeSoundSequence,
      kind,
      priority,
      nodes: new Set(),
      cleanupTimer: null
    };
    activeSound = sound;
    sound.cleanupTimer = window.setTimeout?.(() => stopSound(sound), Math.max(100, expectedDurationMs + 120));
    return sound;
  }

  function scheduleTone(context, sound, frequency, delay, duration, peakVolume, type = "sine") {
    if (!sound || activeSound?.id !== sound.id) return false;
    const startAt = context.currentTime + Math.max(0.01, delay);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const nodePair = { oscillator, gain };
    sound.nodes.add(nodePair);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener?.("ended", () => {
      sound.nodes.delete(nodePair);
      disconnectNode(oscillator);
      disconnectNode(gain);
    }, { once: true });
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
    return true;
  }

  async function playControlSound(type = "start") {
    if (!controlSoundEnabled()) return false;
    const normalizedType = type === "pause" ? "pause" : (type === "resume" ? "resume" : "start");
    const now = Date.now();
    if (normalizedType === lastControlType && now - lastControlAt < 220) return true;
    if (!claimSharedAudioEvent(`control:${normalizedType}`, CONTROL_SHARED_DEDUPE_MS, now)) return true;
    lastControlType = normalizedType;
    lastControlAt = now;

    const context = await unlockAudio();
    if (!context) return false;
    const tone = normalizedType === "pause"
      ? { frequency: 440, duration: 0.13, volume: 0.085 }
      : normalizedType === "resume"
        ? { frequency: 720, duration: 0.15, volume: 0.095 }
        : { frequency: 820, duration: 0.15, volume: 0.095 };
    const sound = beginSound(`control:${normalizedType}`, SOUND_PRIORITIES.control, 220);
    if (!sound) return true;
    scheduleTone(context, sound, tone.frequency, 0.012, tone.duration, tone.volume);
    return true;
  }

  async function playMotivationalSound(signature = "", milestone = 10, { preview = false } = {}) {
    if (!preview && !motivationalSoundEnabled()) return false;
    const normalizedSignature = String(signature || milestone || "motivacao").trim().replace(/\s+/g, " ");
    const now = Date.now();

    if (!preview) {
      if (normalizedSignature === lastMessageSignature && now - lastMessageAt < 1200) return true;
      if (!claimMotivationalSessionEvent(normalizedSignature, milestone, now)) {
        lastMessageSignature = normalizedSignature;
        lastMessageAt = now;
        return true;
      }
      lastMessageSignature = normalizedSignature;
      lastMessageAt = now;
    }

    const context = await unlockAudio();
    if (!context) return false;
    const finalMessage = Number(milestone) >= 100
      || /100\s*%|tempo conclu[ií]do|sess[aã]o conclu[ií]da|final/i.test(normalizedSignature);
    const priority = preview
      ? SOUND_PRIORITIES.preview
      : finalMessage
        ? SOUND_PRIORITIES.final
        : SOUND_PRIORITIES.motivation;
    const tones = finalMessage
      ? [
          { frequency: 659.25, delay: 0.01, duration: 0.18 },
          { frequency: 783.99, delay: 0.22, duration: 0.18 },
          { frequency: 987.77, delay: 0.43, duration: 0.23 }
        ]
      : [
          { frequency: 659.25, delay: 0.01, duration: 0.18 },
          { frequency: 880, delay: 0.22, duration: 0.22 }
        ];
    const expectedDurationMs = Math.ceil(Math.max(...tones.map((tone) => tone.delay + tone.duration + 0.03)) * 1000);
    const sound = beginSound(finalMessage ? "motivation:final" : "motivation", priority, expectedDurationMs);
    if (!sound) return true;
    tones.forEach((tone) => scheduleTone(context, sound, tone.frequency, tone.delay, tone.duration, 0.08));
    return true;
  }

  function installControlOverride() {
    let original = null;
    try { if (typeof playTimerControlBeep === "function") original = playTimerControlBeep; } catch {}
    if (original?.[CONTROL_FLAG]) return true;
    if (!original && typeof globalThis.playTimerControlBeep !== "function") return false;
    const replacement = function playTimerControlBeepAudioStabilityV396(type = "start") {
      return playControlSound(type);
    };
    Object.defineProperty(replacement, CONTROL_FLAG, { value: true });
    Object.defineProperty(replacement, "__aldusOriginal", { value: original });
    try {
      globalThis.playTimerControlBeep = replacement;
      try { playTimerControlBeep = replacement; } catch {}
      return true;
    } catch {
      return false;
    }
  }

  function installMotivationalApiOverride() {
    const current = globalThis.MetasQuestionAccuracySpectrum;
    if (!current || typeof current !== "object") return false;
    if (current[CONTROL_FLAG]) return true;
    const replacement = Object.freeze({
      ...current,
      [CONTROL_FLAG]: true,
      unlockMotivationalAudio: unlockAudio,
      playMotivationalChime(milestone = 10, options = {}) {
        return playMotivationalSound(`marco:${milestone}%`, milestone, options);
      }
    });
    try {
      globalThis.MetasQuestionAccuracySpectrum = replacement;
      return true;
    } catch {
      return false;
    }
  }

  function visibleMessageSignature(element) {
    if (!element || element.hidden) return "";
    const style = window.getComputedStyle?.(element);
    if (style?.display === "none" || style?.visibility === "hidden") return "";
    return String(element.textContent || "").trim().replace(/\s+/g, " ");
  }

  function inspectMotivationalMessages() {
    const candidates = [
      document.getElementById("timerMotivationalToast"),
      document.getElementById("timerMotivationInlineV161")
    ];
    for (const element of candidates) {
      const signature = visibleMessageSignature(element);
      if (!signature || signature === lastMessageSignature) continue;
      const percent = Number(signature.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(",", ".")) || 10;
      void playMotivationalSound(signature, percent);
      return;
    }
  }

  function bindMessageTargets() {
    if (typeof MutationObserver === "undefined") return false;
    targetObserver ||= new MutationObserver(inspectMotivationalMessages);
    let bound = 0;
    for (const id of ["timerMotivationalToast", "timerMotivationInlineV161"]) {
      const element = document.getElementById(id);
      if (!element) continue;
      bound += 1;
      if (boundMessageTargets.has(element)) continue;
      boundMessageTargets.add(element);
      targetObserver.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["hidden", "class"]
      });
    }
    if (bound >= 2 && discoveryObserver) {
      discoveryObserver.disconnect();
      discoveryObserver = null;
    }
    inspectMotivationalMessages();
    return bound > 0;
  }

  function installMessageObserver() {
    if (typeof MutationObserver === "undefined" || !document.body) return false;
    bindMessageTargets();
    if (!discoveryObserver && (!document.getElementById("timerMotivationalToast") || !document.getElementById("timerMotivationInlineV161"))) {
      discoveryObserver = new MutationObserver(bindMessageTargets);
      discoveryObserver.observe(document.body, { childList: true, subtree: true });
    }
    return true;
  }

  function installUserGestureRecovery() {
    if (document.documentElement.dataset.timerAudioStabilityV396 === HOTFIX) return true;
    document.documentElement.dataset.timerAudioStabilityV396 = HOTFIX;
    const unlock = () => { void unlockAudio(); };
    document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, { capture: true });
    return true;
  }

  function install() {
    installAttempts += 1;
    ensureStorageHeadroom();
    installControlOverride();
    installMotivationalApiOverride();
    installMessageObserver();
    installUserGestureRecovery();
    return true;
  }

  const api = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    installedAt: new Date().toISOString(),
    unlockAudio,
    playControlSound,
    playMotivationalSound,
    claimSharedAudioEvent,
    claimMotivationalSessionEvent,
    timerAudioSessionKey,
    stopActiveSound: () => stopSound(activeSound),
    activeSound: () => activeSound ? Object.freeze({ id: activeSound.id, kind: activeSound.kind, priority: activeSound.priority }) : null,
    ensureStorageHeadroom
  });
  globalThis[GLOBAL_KEY] = api;

  if (typeof document === "undefined") return;
  install();
  const retryTimer = window.setInterval?.(() => {
    install();
    if (installAttempts >= 160) window.clearInterval?.(retryTimer);
  }, 100);
  window.setTimeout?.(() => {
    window.clearInterval?.(retryTimer);
    install();
  }, 16000);
})();
