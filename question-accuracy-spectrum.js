(() => {
  "use strict";

  const GLOBAL_KEY = "__metasQuestionAccuracySpectrumV38";
  const STYLE_ID = "questionAccuracySpectrumStylesV38";
  const SOUND_STORAGE_KEY = "metasEstudoMotivationalSoundEnabled";
  const INPUT_IDS = new Set(["questionTotal", "questionCorrect", "questionWrong", "questionBlank"]);

  function clampAccuracyPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(100, Math.max(0, number));
  }

  function questionAccuracyFromValues(total, correct) {
    const normalizedTotal = Math.max(0, Number(total) || 0);
    const normalizedCorrect = Math.max(0, Number(correct) || 0);
    return normalizedTotal ? clampAccuracyPercent((normalizedCorrect / normalizedTotal) * 100) : 0;
  }

  function accuracySpectrumHue(percent) {
    return Number((clampAccuracyPercent(percent) * 1.2).toFixed(2));
  }

  function readAccuracyPercent() {
    try {
      if (typeof globalThis.questionNumbers === "function") {
        const calculated = globalThis.questionNumbers();
        if (calculated && Number.isFinite(Number(calculated.accuracy))) {
          return clampAccuracyPercent(calculated.accuracy);
        }
      }
    } catch (error) {
      console.warn("[Questões] Não foi possível ler o cálculo original de acertos.", error);
    }
    return questionAccuracyFromValues(
      document.getElementById("questionTotal")?.value,
      document.getElementById("questionCorrect")?.value
    );
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #questionCalculated.question-calculated-spectrum {
        --question-accuracy: 0%;
        --question-accuracy-hue: 0;
        position: relative;
        padding-bottom: 36px !important;
      }
      .question-accuracy-spectrum-visual {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 9px;
        display: grid;
        grid-template-columns: minmax(120px, 1fr) auto;
        align-items: center;
        gap: 10px;
        min-width: 0;
        pointer-events: none;
      }
      .question-accuracy-spectrum-track {
        position: relative;
        height: 9px;
        min-width: 0;
        border: 1px solid rgba(15, 23, 42, .15);
        border-radius: 999px;
        background: linear-gradient(90deg,
          #dc2626 0%,
          #f97316 24%,
          #facc15 50%,
          #22c55e 76%,
          #0ea5e9 100%);
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, .18);
      }
      .question-accuracy-spectrum-marker {
        position: absolute;
        top: 50%;
        left: var(--question-accuracy);
        width: 16px;
        height: 16px;
        border: 2px solid #0f172a;
        border-radius: 50%;
        background: hsl(var(--question-accuracy-hue) 82% 54%);
        box-shadow: 0 2px 7px rgba(15, 23, 42, .28);
        transform: translate(-50%, -50%);
        transition: left .25s ease, background-color .25s ease;
      }
      .question-accuracy-spectrum-label {
        margin: 0;
        color: inherit;
        font-size: .76rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
      }
      .timer-motivational-sound-option {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .timer-motivational-sound-option small {
        display: block;
        margin-top: 2px;
        opacity: .72;
        font-size: .76rem;
        font-weight: 600;
        line-height: 1.25;
      }
      @media (max-width: 620px) {
        #questionCalculated.question-calculated-spectrum { padding-bottom: 52px !important; }
        .question-accuracy-spectrum-visual {
          grid-template-columns: 1fr;
          gap: 6px;
          bottom: 8px;
        }
        .question-accuracy-spectrum-label { font-size: .72rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureVisual(box) {
    let visual = box.querySelector("[data-question-accuracy-spectrum]");
    if (visual) return visual;
    visual = document.createElement("div");
    visual.className = "question-accuracy-spectrum-visual";
    visual.dataset.questionAccuracySpectrum = "true";
    visual.innerHTML = `
      <div class="question-accuracy-spectrum-track" role="progressbar" aria-label="Percentual de acertos" aria-valuemin="0" aria-valuemax="100">
        <span class="question-accuracy-spectrum-marker" aria-hidden="true"></span>
      </div>
      <small class="question-accuracy-spectrum-label">0,0% de acertos</small>
    `;
    box.appendChild(visual);
    return visual;
  }

  let spectrumRendering = false;
  function renderQuestionAccuracySpectrum() {
    const box = document.getElementById("questionCalculated");
    if (!box || spectrumRendering) return;
    spectrumRendering = true;
    try {
      ensureStyles();
      const accuracy = readAccuracyPercent();
      const hue = accuracySpectrumHue(accuracy);
      const markerPercent = Math.min(99.2, Math.max(.8, accuracy));
      const visual = ensureVisual(box);
      const track = visual.querySelector(".question-accuracy-spectrum-track");
      const label = visual.querySelector(".question-accuracy-spectrum-label");
      box.classList.add("question-calculated-spectrum");
      box.style.setProperty("--question-accuracy", `${markerPercent}%`);
      box.style.setProperty("--question-accuracy-hue", String(hue));
      if (track) {
        track.setAttribute("aria-valuenow", accuracy.toFixed(1));
        track.setAttribute("aria-valuetext", `${accuracy.toFixed(1)}% de acertos`);
      }
      if (label) label.textContent = `${accuracy.toFixed(1).replace(".", ",")}% de acertos`;
    } finally {
      spectrumRendering = false;
    }
  }

  let renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    const schedule = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
    schedule(() => {
      renderQueued = false;
      renderQuestionAccuracySpectrum();
      observeCalculatedBox();
      ensureMotivationalSoundControl();
    });
  }

  function observeCalculatedBox() {
    const box = document.getElementById("questionCalculated");
    if (!box || box.dataset.accuracySpectrumObservedV38 === "true" || typeof MutationObserver === "undefined") return;
    box.dataset.accuracySpectrumObservedV38 = "true";
    const observer = new MutationObserver(() => {
      if (!spectrumRendering) scheduleRender();
    });
    observer.observe(box, { childList: true });
  }

  function installQuestionAccuracySpectrum() {
    if (typeof document === "undefined") return;
    document.addEventListener("input", (event) => {
      if (INPUT_IDS.has(event.target?.id)) scheduleRender();
    }, true);
    document.addEventListener("change", (event) => {
      if (INPUT_IDS.has(event.target?.id)) scheduleRender();
    }, true);
    globalThis.addEventListener?.("hashchange", scheduleRender);
    document.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
    scheduleRender();
  }

  function timerDisplayedPercent() {
    const text = String(document.getElementById("timerProgressText")?.textContent || "");
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (!match) return 0;
    return Math.min(100, Math.max(0, Number(match[1].replace(",", ".")) || 0));
  }

  function timerElapsedSeconds() {
    const parts = String(document.getElementById("timerTime")?.textContent || "00:00:00").split(":").map((part) => Number(part) || 0);
    if (parts.length !== 3) return 0;
    return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }

  function motivationalSoundEnabled() {
    try {
      const preference = globalThis.state?.settings?.timerPreferences?.motivationalSound;
      if (typeof preference === "boolean") return preference;
    } catch (error) {}
    try {
      const stored = globalThis.localStorage?.getItem(SOUND_STORAGE_KEY);
      return stored === null || stored === undefined ? true : stored !== "false";
    } catch (error) {
      return true;
    }
  }

  function persistMotivationalSound(enabled) {
    const normalized = Boolean(enabled);
    try {
      globalThis.localStorage?.setItem(SOUND_STORAGE_KEY, String(normalized));
    } catch (error) {}
    try {
      if (typeof globalThis.state === "object" && globalThis.state) {
        globalThis.state.settings ||= {};
        globalThis.state.settings.timerPreferences ||= {};
        globalThis.state.settings.timerPreferences.motivationalSound = normalized;
        if (typeof globalThis.saveData === "function") globalThis.saveData();
        if (typeof globalThis.autoSyncAfterSave === "function") globalThis.autoSyncAfterSave("timer-settings");
      }
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível salvar a preferência do aviso sonoro.", error);
    }
    return normalized;
  }

  let motivationalAudioContext = null;

  function getAudioContext() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!motivationalAudioContext || motivationalAudioContext.state === "closed") {
      motivationalAudioContext = new AudioContextClass();
    }
    return motivationalAudioContext;
  }

  async function unlockMotivationalAudio() {
    if (!motivationalSoundEnabled()) return false;
    try {
      const context = getAudioContext();
      if (!context) return false;
      if (context.state === "suspended") await context.resume();
      return context.state === "running";
    } catch (error) {
      return false;
    }
  }

  function scheduleChimeTone(context, frequency, startAt, duration, peakVolume) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startAt + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + .03);
  }

  async function playMotivationalChime(milestone = 10, { preview = false } = {}) {
    if (!preview && !motivationalSoundEnabled()) return false;
    try {
      const context = getAudioContext();
      if (!context) return false;
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return false;
      const startAt = context.currentTime + .015;
      const finalMilestone = Number(milestone) >= 100;
      const tones = finalMilestone
        ? [{ frequency: 659.25, delay: 0 }, { frequency: 783.99, delay: .12 }, { frequency: 987.77, delay: .24 }]
        : [{ frequency: 659.25, delay: 0 }, { frequency: 880, delay: .13 }];
      tones.forEach((tone, index) => {
        scheduleChimeTone(context, tone.frequency, startAt + tone.delay, index === tones.length - 1 ? .22 : .17, .038);
      });
      return true;
    } catch (error) {
      console.warn("[Cronômetro] O aviso sonoro não pôde ser reproduzido.", error);
      return false;
    }
  }

  function ensureMotivationalSoundControl() {
    if (typeof document === "undefined") return null;
    ensureStyles();
    const existing = document.querySelector('[data-timer-pref="motivationalSound"]');
    if (existing) {
      if (document.activeElement !== existing) existing.checked = motivationalSoundEnabled();
      return existing;
    }
    const motivationalCheckbox = document.querySelector('[data-timer-pref="motivationalMessages"]');
    if (!motivationalCheckbox) return null;
    const reference = motivationalCheckbox.closest("label") || motivationalCheckbox.parentElement;
    if (!reference?.parentElement) return null;

    const label = document.createElement("label");
    label.className = `${reference.className || ""} timer-motivational-sound-option`.trim();
    label.dataset.timerMotivationalSoundOption = "true";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = motivationalSoundEnabled();
    checkbox.dataset.timerPref = "motivationalSound";
    checkbox.setAttribute("aria-label", "Aviso sonoro das mensagens motivacionais");

    const text = document.createElement("span");
    text.innerHTML = `Aviso sonoro das mensagens motivacionais<small>Toque curto e suave em cada marco de progresso.</small>`;

    label.append(checkbox, text);
    reference.insertAdjacentElement("afterend", label);

    checkbox.addEventListener("change", async () => {
      persistMotivationalSound(checkbox.checked);
      if (checkbox.checked) {
        await unlockMotivationalAudio();
        await playMotivationalChime(10, { preview: true });
      }
    });
    return checkbox;
  }

  function installMotivationalAudioUnlock() {
    if (typeof document === "undefined" || globalThis.__metasMotivationalAudioUnlockV38) return;
    globalThis.__metasMotivationalAudioUnlockV38 = true;
    const unlock = () => { void unlockMotivationalAudio(); };
    document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, { capture: true });
    document.addEventListener("click", () => ensureMotivationalSoundControl(), { capture: true });
    if (typeof MutationObserver !== "undefined" && document.body) {
      const observer = new MutationObserver(() => ensureMotivationalSoundControl());
      observer.observe(document.body, { childList: true, subtree: true });
    }
    setInterval(ensureMotivationalSoundControl, 1500);
    setTimeout(ensureMotivationalSoundControl, 250);
  }

  globalThis.MetasQuestionAccuracySpectrum = Object.freeze({
    clampAccuracyPercent,
    questionAccuracyFromValues,
    accuracySpectrumHue,
    renderQuestionAccuracySpectrum,
    installQuestionAccuracySpectrum,
    timerDisplayedPercent,
    timerElapsedSeconds,
    motivationalSoundEnabled,
    persistMotivationalSound,
    unlockMotivationalAudio,
    playMotivationalChime,
    ensureMotivationalSoundControl
  });

  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = true;
    installQuestionAccuracySpectrum();
  }
  installMotivationalAudioUnlock();
})();
