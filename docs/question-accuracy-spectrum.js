(() => {
  "use strict";

  const GLOBAL_KEY = "__metasQuestionAccuracySpectrumV37";
  const STYLE_ID = "questionAccuracySpectrumStylesV37";
  const TIMER_RUNTIME_KEY = "__metasTimerMotivationAlignedV37";
  const TIMER_MILESTONES = [10, 25, 40, 50, 65, 75, 90, 100];
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
    });
  }

  function observeCalculatedBox() {
    const box = document.getElementById("questionCalculated");
    if (!box || box.dataset.accuracySpectrumObservedV37 === "true" || typeof MutationObserver === "undefined") return;
    box.dataset.accuracySpectrumObservedV37 = "true";
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

  function timerSessionIdentity() {
    try {
      if (typeof floatingTimer !== "undefined") {
        return [floatingTimer.sessionId || "", floatingTimer.goalId || "", floatingTimer.openedAt || ""].join("|");
      }
    } catch (error) {}
    return [
      document.getElementById("timerDiscipline")?.textContent || "",
      document.getElementById("timerSubject")?.textContent || "",
      document.getElementById("timerKind")?.textContent || ""
    ].join("|");
  }

  function timerMotivationalEnabled() {
    const checkbox = document.querySelector('[data-timer-pref="motivationalMessages"]');
    return !checkbox || checkbox.checked;
  }

  function timerFreeModeVisible() {
    const timer = document.getElementById("floatingTimer");
    return Boolean(timer && !timer.hidden && document.getElementById("timerMode")?.value === "free");
  }

  let timerHideTimeout = null;
  function showAlignedTimerMotivation(milestone) {
    let toast = document.getElementById("timerMotivationalToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "timerMotivationalToast";
      toast.className = "timer-motivational-toast";
      toast.setAttribute("aria-live", "polite");
      toast.setAttribute("aria-atomic", "true");
      document.body.appendChild(toast);
    }
    let phrase = "Você está avançando. Continue firme.";
    try {
      if (typeof chooseTimerMotivationalMessage === "function") phrase = chooseTimerMotivationalMessage(milestone) || phrase;
    } catch (error) {}
    toast.innerHTML = `<strong>${milestone}% CONCLUÍDO</strong><span>${phrase}</span>`;
    toast.hidden = false;
    toast.classList.add("visible");
    Object.assign(toast.style, {
      display: "grid",
      position: "fixed",
      top: "18px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "100000",
      opacity: "1",
      visibility: "visible",
      pointerEvents: "none",
      maxWidth: "min(92vw, 620px)"
    });
    clearTimeout(timerHideTimeout);
    timerHideTimeout = setTimeout(() => {
      toast.classList.remove("visible");
      toast.style.opacity = "0";
      timerHideTimeout = setTimeout(() => {
        toast.hidden = true;
        toast.style.display = "none";
      }, 260);
    }, 30000);
  }

  function installAlignedTimerMotivation() {
    if (typeof document === "undefined" || globalThis[TIMER_RUNTIME_KEY]) return;
    globalThis[TIMER_RUNTIME_KEY] = true;
    let activeSession = "";
    let lastElapsed = 0;
    let shown = new Set();
    const check = () => {
      if (!timerFreeModeVisible() || !timerMotivationalEnabled()) return;
      const session = timerSessionIdentity();
      const elapsed = timerElapsedSeconds();
      if (session !== activeSession || elapsed + 2 < lastElapsed) {
        activeSession = session;
        shown = new Set();
      }
      lastElapsed = elapsed;
      const displayedPercent = Math.round(timerDisplayedPercent());
      const reached = TIMER_MILESTONES.filter((milestone) => displayedPercent >= milestone);
      const pending = reached.filter((milestone) => !shown.has(milestone));
      const milestone = pending[pending.length - 1];
      if (!milestone) return;
      reached.forEach((value) => shown.add(value));
      showAlignedTimerMotivation(milestone);
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") setTimeout(check, 100);
    });
    document.addEventListener("change", (event) => {
      if (event.target?.id === "timerMode" || event.target?.matches?.('[data-timer-pref="motivationalMessages"]')) setTimeout(check, 50);
    }, true);
    globalThis.addEventListener?.("focus", () => setTimeout(check, 100));
    setInterval(check, 500);
    setTimeout(check, 250);
  }

  globalThis.MetasQuestionAccuracySpectrum = Object.freeze({
    clampAccuracyPercent,
    questionAccuracyFromValues,
    accuracySpectrumHue,
    renderQuestionAccuracySpectrum,
    installQuestionAccuracySpectrum,
    timerDisplayedPercent,
    timerElapsedSeconds,
    installAlignedTimerMotivation
  });

  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = true;
    installQuestionAccuracySpectrum();
  }
  installAlignedTimerMotivation();
})();
