(() => {
  "use strict";

  const GLOBAL_KEY = "__metasQuestionAccuracySpectrumV34";
  const STYLE_ID = "questionAccuracySpectrumStylesV34";
  const TIMER_RUNTIME_KEY = "__metasTimerMotivationAlignedV35";
  const TIMER_MILESTONES = [10, 25, 40, 50, 65, 75, 90, 100];
  const INPUT_IDS = new Set([
    "questionTotal",
    "questionCorrect",
    "questionWrong",
    "questionBlank"
  ]);

  function clampAccuracyPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(100, Math.max(0, number));
  }

  function questionAccuracyFromValues(total, correct) {
    const normalizedTotal = Math.max(0, Number(total) || 0);
    const normalizedCorrect = Math.max(0, Number(correct) || 0);
    return normalizedTotal
      ? clampAccuracyPercent((normalizedCorrect / normalizedTotal) * 100)
      : 0;
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

    const total = document.getElementById("questionTotal")?.value;
    const correct = document.getElementById("questionCorrect")?.value;
    return questionAccuracyFromValues(total, correct);
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
        display: grid;
        gap: 12px;
        overflow: hidden;
        border: 1px solid hsl(var(--question-accuracy-hue) 68% 42% / .72);
        background:
          radial-gradient(circle at 100% 0%, hsl(var(--question-accuracy-hue) 88% 78% / .38), transparent 48%),
          linear-gradient(135deg, hsl(var(--question-accuracy-hue) 90% 98%), hsl(calc(var(--question-accuracy-hue) + 16) 82% 92%));
        box-shadow: 0 12px 30px hsl(var(--question-accuracy-hue) 72% 38% / .13), inset 0 1px 0 rgba(255,255,255,.82);
        transition: background .35s ease, border-color .35s ease, box-shadow .35s ease;
      }

      .question-accuracy-spectrum-visual {
        display: grid;
        gap: 7px;
        padding-top: 2px;
      }

      .question-accuracy-spectrum-track {
        position: relative;
        height: 14px;
        overflow: visible;
        border: 1px solid rgba(15, 23, 42, .14);
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
        width: 20px;
        height: 20px;
        border: 3px solid #0f172a;
        border-radius: 999px;
        background: #fff;
        box-shadow: 0 4px 12px rgba(15, 23, 42, .28);
        transform: translate(-50%, -50%);
        transition: left .28s ease;
      }

      .question-accuracy-spectrum-label {
        color: #0f172a;
        font-size: .86rem;
        font-weight: 900;
        letter-spacing: .01em;
      }

      @media (max-width: 620px) {
        .question-accuracy-spectrum-track { height: 13px; }
        .question-accuracy-spectrum-marker { width: 19px; height: 19px; }
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

  function renderQuestionAccuracySpectrum() {
    const box = document.getElementById("questionCalculated");
    if (!box) return;

    ensureStyles();
    const accuracy = readAccuracyPercent();
    const hue = accuracySpectrumHue(accuracy);
    const markerPercent = Math.min(99, Math.max(1, accuracy));
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
    if (!box || box.dataset.accuracySpectrumObserved === "true" || typeof MutationObserver === "undefined") return;
    box.dataset.accuracySpectrumObserved = "true";
    const observer = new MutationObserver(() => scheduleRender());
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
    const parts = String(document.getElementById("timerTime")?.textContent || "00:00:00")
      .split(":")
      .map((part) => Number(part) || 0);
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

  function synchronizeTimerMilestones(milestones) {
    try {
      if (typeof floatingTimer === "undefined") return;
      const current = Array.isArray(floatingTimer.displayedMotivationalMilestones)
        ? floatingTimer.displayedMotivationalMilestones
        : [];
      floatingTimer.displayedMotivationalMilestones = [...new Set([...current, ...milestones])];
    } catch (error) {}
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
      if (typeof chooseTimerMotivationalMessage === "function") {
        phrase = chooseTimerMotivationalMessage(milestone) || phrase;
      }
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

      try {
        if (typeof floatingTimer !== "undefined" && Array.isArray(floatingTimer.displayedMotivationalMilestones)) {
          floatingTimer.displayedMotivationalMilestones.forEach((milestone) => shown.add(Number(milestone)));
        }
      } catch (error) {}

      const displayedPercent = Math.round(timerDisplayedPercent());
      const reached = TIMER_MILESTONES.filter((milestone) => displayedPercent >= milestone);
      const pending = reached.filter((milestone) => !shown.has(milestone));
      const milestone = pending[pending.length - 1];
      if (!milestone) return;

      reached.forEach((value) => shown.add(value));
      synchronizeTimerMilestones(reached);
      showAlignedTimerMotivation(milestone);
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") setTimeout(check, 100);
    });
    document.addEventListener("change", (event) => {
      if (event.target?.id === "timerMode" || event.target?.matches?.('[data-timer-pref="motivationalMessages"]')) {
        setTimeout(check, 50);
      }
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
