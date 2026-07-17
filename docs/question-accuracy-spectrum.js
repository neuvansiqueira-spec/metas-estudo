(() => {
  "use strict";

  const GLOBAL_KEY = "__metasQuestionAccuracySpectrumV34";
  const STYLE_ID = "questionAccuracySpectrumStylesV34";
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

  globalThis.MetasQuestionAccuracySpectrum = Object.freeze({
    clampAccuracyPercent,
    questionAccuracyFromValues,
    accuracySpectrumHue,
    renderQuestionAccuracySpectrum,
    installQuestionAccuracySpectrum
  });

  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = true;
    installQuestionAccuracySpectrum();
  }
})();
