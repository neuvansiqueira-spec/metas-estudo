(() => {
  "use strict";

  const VERSION = "20260810-timer-alarm-audio-v297";
  const HOTFIX = "timer-audio-recovery-hotfix5";
  const GLOBAL_KEY = "__ALDUS_TIMER_AUDIO_RECOVERY_V236__";
  const CONTROL_FLAG = "__aldusTimerAudioRecoveryV236";
  const MOTIVATION_STORAGE_KEY = "metasEstudoMotivationalSoundEnabled";
  const AUDIO_EVENT_STORAGE_KEY = "metasEstudoTimerAudioEventV240";
  const MOTIVATION_SESSION_EVENT_STORAGE_KEY = "metasEstudoTimerAudioSessionEventV297";
  const CONTROL_SHARED_DEDUPE_MS = 350;
  const MOTIVATION_SHARED_DEDUPE_MS = 1500;
  const MOTIVATION_GENERIC_DEDUPE_MS = 60000;
  const MOTIVATION_RESUME_DEDUPE_SECONDS = 300;
  const MOTIVATION_FALLBACK_BUCKET_SECONDS = 600;
  const MOTIVATION_SESSION_RETENTION_MS = 12 * 60 * 60 * 1000;
  const SHARED_EVENT_RETENTION_MS = 15000;
  const SOUND_PRIORITIES = Object.freeze({ control: 1, motivation: 2, final: 3, preview: 4 });

  if (globalThis[GLOBAL_KEY]) return;

  let audioContext = null;
  let lastControlType = "";
  let lastControlAt = 0;
  let lastMessageSignature = "";
  let lastMessageAt = 0;
  let messageObserver = null;
  let activeSound = null;
  let activeSoundSequence = 0;
  let fallbackSessionGeneration = 1;
  let fallbackSessionGoalId = "";
  let fallbackSessionLastElapsed = 0;

  function timerPreferences() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") {
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

  function claimSharedAudioEvent(eventKey, dedupeMs, now = Date.now()) {
    const key = normalizeAudioEventKey(eventKey);
    if (!key) return true;
    try {
      const parsed = JSON.parse(localStorage.getItem(AUDIO_EVENT_STORAGE_KEY) || "null");
      const previousEvents = parsed?.events && typeof parsed.events === "object"
        ? parsed.events
        : {};
      const previousAt = Number(previousEvents[key] || 0);
      const elapsed = now - previousAt;
      if (previousAt > 0 && elapsed >= 0 && elapsed < dedupeMs) return false;

      const cutoff = now - SHARED_EVENT_RETENTION_MS;
      const events = {};
      Object.entries(previousEvents).forEach(([storedKey, storedAt]) => {
        const timestamp = Number(storedAt || 0);
        if (timestamp >= cutoff && timestamp <= now + 1000) events[storedKey] = timestamp;
      });
      events[key] = now;
      localStorage.setItem(AUDIO_EVENT_STORAGE_KEY, JSON.stringify({ version: 1, events }));
      return true;
    } catch {
      return true;
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
    if (explicit) return `session:${String(explicit)}`;

    const goalId = String(timer?.goalId || timer?.id || "sem-meta");
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
    const explicitMilestone = normalized.match(/(?:marco\s*[:=-]?\s*|\b)(\d+(?:[.,]\d+)?)\s*%/i)
      || normalized.match(/\bmarco\s*[:=-]?\s*(\d+(?:[.,]\d+)?)/i);
    if (explicitMilestone) {
      const value = Number(String(explicitMilestone[1]).replace(",", "."));
      if (Number.isFinite(value)) return { key: `milestone:${value}`, dedupeMs: Infinity };
    }
    if (/100\s*%|tempo concluido|sessao concluida|\bfinal\b/i.test(normalized) || (Number(milestone) >= 100 && /conclu|final|tempo/i.test(normalized))) {
      return { key: "completion", dedupeMs: Infinity };
    }
    if (/foco retomado/i.test(normalized)) {
      return { key: `focus-resumed:${Math.floor(elapsed / MOTIVATION_RESUME_DEDUPE_SECONDS)}`, dedupeMs: Infinity };
    }
    if (/bom comeco/i.test(normalized)) {
      return { key: "start-cue", dedupeMs: Infinity };
    }
    if (/sessao em andamento/i.test(normalized)) {
      return { key: "restored-cue", dedupeMs: Infinity };
    }
    if (/continue firme/i.test(normalized)) {
      return { key: `fallback:${Math.floor(elapsed / MOTIVATION_FALLBACK_BUCKET_SECONDS)}`, dedupeMs: Infinity };
    }
    return {
      key: `message:${normalized.slice(0, 180) || String(milestone || "motivacao")}`,
      dedupeMs: MOTIVATION_GENERIC_DEDUPE_MS
    };
  }

  function claimMotivationalSessionEvent(signature, milestone, now = Date.now()) {
    const sessionKey = timerAudioSessionKey();
    const event = motivationalSessionEvent(signature, milestone);
    if (!sessionKey || !event.key) return true;
    try {
      const parsed = JSON.parse(localStorage.getItem(MOTIVATION_SESSION_EVENT_STORAGE_KEY) || "null");
      const sourceSessions = parsed?.sessions && typeof parsed.sessions === "object"
        ? parsed.sessions
        : {};
      const cutoff = now - MOTIVATION_SESSION_RETENTION_MS;
      const sessions = {};
      Object.entries(sourceSessions).forEach(([storedSession, value]) => {
        const touchedAt = Number(value?.touchedAt || 0);
        if (touchedAt >= cutoff && touchedAt <= now + 1000 && value?.events && typeof value.events === "object") {
          sessions[storedSession] = { touchedAt, events: { ...value.events } };
        }
      });

      const session = sessions[sessionKey] || { touchedAt: now, events: {} };
      const previousAt = Number(session.events[event.key] || 0);
      const elapsedSince = now - previousAt;
      if (previousAt > 0 && elapsedSince >= 0 && elapsedSince < event.dedupeMs) return false;

      session.touchedAt = now;
      session.events[event.key] = now;
      sessions[sessionKey] = session;
      localStorage.setItem(MOTIVATION_SESSION_EVENT_STORAGE_KEY, JSON.stringify({ version: 1, sessions }));
      return true;
    } catch {
      return true;
    }
  }

  function ensurePreferenceDefaults() {
    const preferences = timerPreferences();
    if (!preferences) return false;
    let changed = false;
    if (typeof preferences.sound !== "boolean") {
      preferences.sound = true;
      changed = true;
    }
    if (typeof preferences.motivationalSound !== "boolean") {
      preferences.motivationalSound = true;
      changed = true;
    }
    const sound = document.querySelector('[data-timer-pref="sound"]');
    const motivation = document.querySelector('[data-timer-pref="motivationalSound"]');
    if (sound && document.activeElement !== sound) sound.checked = preferences.sound;
    if (motivation && document.activeElement !== motivation) motivation.checked = preferences.motivationalSound;
    if (changed) {
      try {
        if (typeof saveTimerPreferences === "function") saveTimerPreferences();
        else if (typeof saveData === "function") saveData();
      } catch (error) {
        console.warn("[Aldus V297] Não foi possível persistir os padrões de áudio.", error);
      }
    }
    return changed;
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextClass();
    }
    return audioContext;
  }

  async function unlockAudio() {
    try {
      const context = getAudioContext();
      if (!context) return null;
      if (context.state === "suspended") await context.resume();
      return context.state === "running" ? context : null;
    } catch (error) {
      console.warn("[Aldus V297] O navegador não liberou o áudio do cronômetro.", error);
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
    sound.cleanupTimer = window.setTimeout?.(() => stopSound(sound), Math.max(100, expectedDurationMs + 100));
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
        stopSound(activeSound);
        lastMessageSignature = normalizedSignature;
        lastMessageAt = now;
        return true;
      }
      if (!claimSharedAudioEvent(`motivation:${normalizedSignature}`, MOTIVATION_SHARED_DEDUPE_MS, now)) return true;
      lastMessageSignature = normalizedSignature;
      lastMessageAt = now;
    }

    const context = await unlockAudio();
    if (!context) return false;
    const finalMessage = Number(milestone) >= 100 || /100\s*%|tempo conclu[ií]do|sess[aã]o conclu[ií]da|final/i.test(normalizedSignature);
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
    try {
      if (typeof playTimerControlBeep === "function") original = playTimerControlBeep;
    } catch {}
    if (original?.[CONTROL_FLAG]) return true;
    const replacement = function playTimerControlBeepAudioRecoveryV236(type = "start") {
      return playControlSound(type);
    };
    Object.defineProperty(replacement, CONTROL_FLAG, { value: true });
    Object.defineProperty(replacement, "__aldusOriginal", { value: original });
    try {
      playTimerControlBeep = replacement;
      globalThis.playTimerControlBeep = replacement;
      return true;
    } catch (error) {
      console.warn("[Aldus V297] Não foi possível substituir o bip antigo do cronômetro.", error);
      return false;
    }
  }

  function installMotivationalApiOverride() {
    const api = globalThis.MetasQuestionAccuracySpectrum;
    if (!api || api[CONTROL_FLAG]) return Boolean(api);
    const replacement = Object.freeze({
      ...api,
      [CONTROL_FLAG]: true,
      unlockMotivationalAudio: unlockAudio,
      playMotivationalChime(milestone = 10, options = {}) {
        return playMotivationalSound(`marco:${milestone}`, milestone, options);
      }
    });
    try {
      globalThis.MetasQuestionAccuracySpectrum = replacement;
      return true;
    } catch (error) {
      console.warn("[Aldus V297] Não foi possível conectar o som motivacional recuperado.", error);
      return false;
    }
  }

  function visibleMessageSignature(element) {
    if (!element || element.hidden) return "";
    const style = window.getComputedStyle?.(element);
    if (style?.display === "none" || style?.visibility === "hidden") return "";
    return String(element.textContent || "").trim().replace(/\s+/g, " ");
  }

  function percentageMessageAlreadyHandledByApi(signature) {
    return Boolean(globalThis.MetasQuestionAccuracySpectrum?.[CONTROL_FLAG])
      && /\d+(?:[.,]\d+)?\s*%\s*(?:conclu[ií]do)?/i.test(signature);
  }

  function inspectMotivationalMessages() {
    const candidates = [
      document.getElementById("timerMotivationalToast"),
      document.getElementById("timerMotivationInlineV161")
    ];
    for (const element of candidates) {
      const signature = visibleMessageSignature(element);
      if (!signature || signature === lastMessageSignature) continue;
      if (percentageMessageAlreadyHandledByApi(signature)) {
        lastMessageSignature = signature;
        lastMessageAt = Date.now();
        continue;
      }
      const percent = Number(signature.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(",", ".")) || 10;
      void playMotivationalSound(signature, percent);
      return;
    }
  }

  function installMessageObserver() {
    if (messageObserver || typeof MutationObserver === "undefined" || !document.body) return false;
    messageObserver = new MutationObserver(inspectMotivationalMessages);
    messageObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden", "class"]
    });
    inspectMotivationalMessages();
    return true;
  }

  function installUserGestureRecovery() {
    if (document.documentElement.dataset.timerAudioRecoveryV236 === "true") return;
    document.documentElement.dataset.timerAudioRecoveryV236 = "true";
    const unlock = () => { void unlockAudio(); };
    document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, { capture: true });
  }

  function install() {
    ensurePreferenceDefaults();
    const control = installControlOverride();
    const motivation = installMotivationalApiOverride();
    installMessageObserver();
    installUserGestureRecovery();
    return control && motivation;
  }

  install();
  const retryTimer = window.setInterval(install, 100);
  window.setTimeout(() => window.clearInterval(retryTimer), 15000);

  globalThis[GLOBAL_KEY] = Object.freeze({
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
    activeSound: () => activeSound ? Object.freeze({ id: activeSound.id, kind: activeSound.kind, priority: activeSound.priority }) : null
  });
})();
