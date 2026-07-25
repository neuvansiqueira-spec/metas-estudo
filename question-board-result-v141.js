(() => {
  "use strict";

  if (window.__aldusQuestionBoardResultV141) return;
  window.__aldusQuestionBoardResultV141 = true;

  const VERSION = "20260725-resultado-outras-bancas-v141";
  const FIELD_IDS = new Set([
    "questionBoard",
    "questionTotal",
    "questionCorrect",
    "questionWrong",
    "questionBlank"
  ]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readNumber(id) {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function formatPercent(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  function ensureStyles() {
    if (document.getElementById("questionBoardResultStylesV141")) return;
    const style = document.createElement("style");
    style.id = "questionBoardResultStylesV141";
    style.textContent = `
      #view-questoes .question-board-result-v141 {
        --question-board-result: .8%;
        display: grid;
        gap: 10px;
        padding: 16px 18px;
        border: 1px solid var(--border, #dbe4f0);
        border-radius: 18px;
        background: var(--surface, #ffffff);
      }
      #view-questoes .question-board-result-v141[hidden] {
        display: none !important;
      }
      #view-questoes .question-board-result-heading-v141 {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 14px;
        min-width: 0;
      }
      #view-questoes .question-board-result-heading-v141 span {
        color: var(--muted, #64748b);
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      #view-questoes .question-board-result-heading-v141 strong {
        min-width: 0;
        color: inherit;
        font-size: .95rem;
        font-weight: 900;
        text-align: right;
      }
      #view-questoes .question-board-result-track-v141 {
        position: relative;
        height: 10px;
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
      #view-questoes .question-board-result-marker-v141 {
        position: absolute;
        top: 50%;
        left: var(--question-board-result);
        width: 16px;
        height: 16px;
        border: 2px solid #0f172a;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 2px 7px rgba(15, 23, 42, .28);
        transform: translate(-50%, -50%);
        transition: left .22s ease;
      }
      #view-questoes .question-board-result-details-v141 {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 14px;
        margin: 0;
        color: var(--muted, #64748b);
        font-size: .78rem;
        font-weight: 700;
        line-height: 1.35;
      }
      #view-questoes .question-board-result-details-v141 [data-board-result-check="warning"] {
        color: #b45309;
      }
      html[data-aldus-theme="premium-stable"] #view-questoes .question-board-result-v141 {
        border-color: rgba(104, 173, 220, .46);
        background: rgba(7, 39, 64, .82);
      }
      html[data-aldus-theme="premium-stable"] #view-questoes .question-board-result-heading-v141 span,
      html[data-aldus-theme="premium-stable"] #view-questoes .question-board-result-details-v141 {
        color: #c9deed;
      }
      html[data-aldus-theme="premium-stable"] #view-questoes .question-board-result-marker-v141 {
        border-color: #061d31;
        background: #f7fbff;
      }
      html[data-aldus-theme="premium-stable"] #view-questoes .question-board-result-details-v141 [data-board-result-check="warning"] {
        color: #facc15;
      }
      @media (max-width: 620px) {
        #view-questoes .question-board-result-heading-v141 {
          align-items: flex-start;
          flex-direction: column;
          gap: 5px;
        }
        #view-questoes .question-board-result-heading-v141 strong {
          text-align: left;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #view-questoes .question-board-result-marker-v141 {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    const calculated = document.getElementById("questionCalculated");
    if (!calculated) return null;

    let panel = document.getElementById("questionBoardResultV141");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "questionBoardResultV141";
    panel.className = "question-board-result-v141 wide";
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");
    panel.dataset.questionBoardResultVersion = VERSION;
    panel.innerHTML = `
      <div class="question-board-result-heading-v141">
        <span>Resultado da banca selecionada</span>
        <strong data-board-result-summary>Preencha os números da sessão</strong>
      </div>
      <div class="question-board-result-track-v141" role="progressbar" aria-label="Aproveitamento em questões de outras bancas" aria-valuemin="0" aria-valuemax="100">
        <span class="question-board-result-marker-v141" aria-hidden="true"></span>
      </div>
      <p class="question-board-result-details-v141">
        <span data-board-result-breakdown></span>
        <span data-board-result-method></span>
        <span data-board-result-check></span>
      </p>
    `;
    calculated.insertAdjacentElement("afterend", panel);
    return panel;
  }

  let rendering = false;
  function render() {
    if (rendering) return;
    rendering = true;
    try {
      ensureStyles();
      const panel = ensurePanel();
      const boardSelect = document.getElementById("questionBoard");
      if (!panel || !boardSelect) return;

      const board = String(boardSelect.value || "").trim();
      const isCebraspe = board.toLocaleLowerCase("pt-BR") === "cebraspe";
      panel.hidden = !board || isCebraspe;
      if (panel.hidden) return;

      const total = readNumber("questionTotal");
      const correct = readNumber("questionCorrect");
      const wrong = readNumber("questionWrong");
      const blank = readNumber("questionBlank");
      const informed = correct + wrong + blank;
      const accuracy = total ? clamp((correct / total) * 100, 0, 100) : 0;
      const marker = clamp(accuracy, .8, 99.2);
      const boardLabel = board === "Outra" ? "Outra banca" : board;

      panel.style.setProperty("--question-board-result", `${marker}%`);
      const summary = panel.querySelector("[data-board-result-summary]");
      const track = panel.querySelector(".question-board-result-track-v141");
      const breakdown = panel.querySelector("[data-board-result-breakdown]");
      const method = panel.querySelector("[data-board-result-method]");
      const check = panel.querySelector("[data-board-result-check]");

      if (summary) {
        summary.textContent = total
          ? `${boardLabel} • ${correct} de ${total} • ${formatPercent(accuracy)}%`
          : `${boardLabel} • preencha o total de questões`;
      }
      if (track) {
        track.setAttribute("aria-valuenow", accuracy.toFixed(1));
        track.setAttribute("aria-valuetext", `${formatPercent(accuracy)}% de acertos em ${boardLabel}`);
      }
      if (breakdown) breakdown.textContent = `Acertos: ${correct} • Erros: ${wrong} • Brancos: ${blank}`;
      if (method) method.textContent = "Cálculo geral: acertos ÷ total, sem penalização.";
      if (check) {
        const mismatch = total > 0 && informed !== total;
        check.dataset.boardResultCheck = mismatch ? "warning" : "ok";
        check.textContent = mismatch
          ? `Conferência: acertos + erros + brancos = ${informed}, mas o total informado é ${total}.`
          : "Pesos, anulações e regras específicas do edital não estão incluídos.";
      }
    } finally {
      rendering = false;
    }
  }

  let queued = false;
  function scheduleRender() {
    if (queued) return;
    queued = true;
    const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
    schedule(() => {
      queued = false;
      render();
    });
  }

  document.addEventListener("input", (event) => {
    if (FIELD_IDS.has(event.target?.id)) scheduleRender();
  }, true);
  document.addEventListener("change", (event) => {
    if (FIELD_IDS.has(event.target?.id)) scheduleRender();
  }, true);
  window.addEventListener("hashchange", scheduleRender);
  document.addEventListener("DOMContentLoaded", scheduleRender, { once: true });

  const calculated = document.getElementById("questionCalculated");
  if (calculated && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(scheduleRender);
    observer.observe(calculated, { childList: true, subtree: true, characterData: true });
  }

  scheduleRender();
})();