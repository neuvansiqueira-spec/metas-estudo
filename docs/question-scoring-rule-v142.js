(() => {
  "use strict";
  if (window.__aldusQuestionScoringRuleV142) return;
  window.__aldusQuestionScoringRuleV142 = true;

  const VERSION = "20260725-regra-pontuacao-questoes-v142";
  const watched = new Set([
    "questionBoard", "questionTotal", "questionCorrect", "questionWrong", "questionBlank",
    "questionScoringRuleV142", "questionScoreCorrectWeightV142",
    "questionScoreWrongWeightV142", "questionScoreBlankWeightV142"
  ]);
  const choices = new Map();
  let boardSeen = "";
  let rendering = false;
  let queued = false;

  const read = (id) => {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };
  const weight = (id, fallback) => {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const numberBR = (value) => new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
  const percentBR = (value) => new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
  const defaultRule = (board) => String(board || "").trim().toLowerCase() === "cebraspe" ? "ce" : "simple";

  function ensureStyles() {
    if (document.getElementById("questionScoringRuleStylesV142")) return;
    const style = document.createElement("style");
    style.id = "questionScoringRuleStylesV142";
    style.textContent = `
      #questionBoardResultV141{display:none!important}
      #questionScoringRulePanelV142{display:grid;gap:14px;padding:18px;border:1px solid var(--border,#dbe4f0);border-radius:18px;background:var(--surface,#fff)}
      #questionScoringRulePanelV142 .score-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
      #questionScoringRulePanelV142 .score-head strong{display:block;margin-top:3px}
      #questionScoringRulePanelV142 .score-fields{display:grid;grid-template-columns:minmax(220px,1.3fr) repeat(3,minmax(120px,.7fr));gap:12px;align-items:end}
      #questionScoringRulePanelV142 .score-custom[hidden]{display:none!important}
      #questionScoringRulePanelV142 .score-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #questionScoringRulePanelV142 .score-results span{padding:11px 12px;border:1px solid var(--border,#dbe4f0);border-radius:13px;background:rgba(37,99,235,.05)}
      #questionScoringRulePanelV142 .score-results small{display:block;margin-bottom:4px;opacity:.72;font-weight:700}
      #questionScoringRulePanelV142 [data-score-check="warning"]{color:#b45309;font-weight:800}
      html[data-aldus-theme="premium-stable"] #questionScoringRulePanelV142{border-color:rgba(104,173,220,.44);background:rgba(7,39,64,.72)}
      html[data-aldus-theme="premium-stable"] #questionScoringRulePanelV142 .score-results span{border-color:rgba(104,173,220,.34);background:rgba(10,54,86,.72)}
      @media(max-width:820px){#questionScoringRulePanelV142 .score-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#questionScoringRulePanelV142 .score-fields>label:first-child{grid-column:1/-1}}
      @media(max-width:620px){#questionScoringRulePanelV142 .score-head{flex-direction:column}#questionScoringRulePanelV142 .score-fields,#questionScoringRulePanelV142 .score-results{grid-template-columns:1fr}#questionScoringRulePanelV142 .score-fields>label:first-child{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    const calculated = document.getElementById("questionCalculated");
    if (!calculated) return null;
    let panel = document.getElementById("questionScoringRulePanelV142");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "questionScoringRulePanelV142";
    panel.className = "wide";
    panel.setAttribute("aria-live", "polite");
    panel.dataset.questionScoringRuleVersion = VERSION;
    panel.innerHTML = `
      <div class="score-head"><div><small>CRITÉRIO DE CORREÇÃO</small><strong>Defina como a sessão deve ser pontuada</strong></div><small>A regra ajusta o cálculo exibido nesta sessão; prevalece sempre o edital.</small></div>
      <div class="score-fields">
        <label>Modelo de pontuação<select id="questionScoringRuleV142"><option value="simple">Pontuação por acertos — erro não desconta</option><option value="ce">Certo/Errado com penalização — erro desconta 1</option><option value="custom">Regra personalizada do edital</option></select></label>
        <label class="score-custom" hidden>Valor do acerto<input id="questionScoreCorrectWeightV142" type="number" step="0.01" value="1"></label>
        <label class="score-custom" hidden>Valor do erro<input id="questionScoreWrongWeightV142" type="number" step="0.01" value="0"></label>
        <label class="score-custom" hidden>Valor do branco<input id="questionScoreBlankWeightV142" type="number" step="0.01" value="0"></label>
      </div>
      <div class="score-results"><span><small>Aproveitamento</small><strong data-score-accuracy>0,0%</strong></span><span><small data-score-label>Pontuação simples</small><strong data-score-value>0</strong></span><span><small>Conferência</small><strong data-score-counts>0 de 0 respostas informadas</strong></span></div>
      <p class="item-meta" data-score-method></p><p class="item-meta" data-score-check></p>`;
    calculated.insertAdjacentElement("beforebegin", panel);
    return panel;
  }

  function selectedRule(panel, board) {
    const select = panel.querySelector("#questionScoringRuleV142");
    if (board !== boardSeen) {
      boardSeen = board;
      select.value = choices.get(board) || defaultRule(board);
    }
    return select.value || defaultRule(board);
  }

  function weights(rule) {
    if (rule === "ce") return { correct: 1, wrong: -1, blank: 0 };
    if (rule === "custom") return {
      correct: weight("questionScoreCorrectWeightV142", 1),
      wrong: weight("questionScoreWrongWeightV142", 0),
      blank: weight("questionScoreBlankWeightV142", 0)
    };
    return { correct: 1, wrong: 0, blank: 0 };
  }

  function labels(rule) {
    if (rule === "ce") return { score: "Líquido C/E", rule: "Certo/Errado com penalização" };
    if (rule === "custom") return { score: "Pontuação personalizada", rule: "Regra personalizada" };
    return { score: "Pontuação simples", rule: "Pontuação por acertos" };
  }

  function updateOriginalSummary(label, score) {
    const box = document.getElementById("questionCalculated");
    if (!box || typeof document.createTreeWalker !== "function") return;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    let node = null;
    while (walker.nextNode()) {
      if (/Total calculado:/i.test(walker.currentNode.textContent || "")) { node = walker.currentNode; break; }
    }
    if (!node) return;
    const source = String(node.textContent || "");
    const replacement = `• ${label}: ${numberBR(score)}`;
    const pattern = /•\s*(?:Líquido\s+Cebraspe|Líquido\s+C\/E|Pontuação\s+simples|Pontuação\s+personalizada):\s*-?\d+(?:[.,]\d+)?/i;
    const next = pattern.test(source) ? source.replace(pattern, replacement) : `${source.trim()} ${replacement}`;
    if (next !== source) node.textContent = next;
  }

  function render() {
    if (rendering) return;
    rendering = true;
    try {
      ensureStyles();
      const panel = ensurePanel();
      if (!panel) return;
      const board = String(document.getElementById("questionBoard")?.value || "").trim();
      const rule = selectedRule(panel, board);
      panel.querySelectorAll(".score-custom").forEach((field) => { field.hidden = rule !== "custom"; });

      const total = read("questionTotal");
      const correct = read("questionCorrect");
      const wrong = read("questionWrong");
      const blank = read("questionBlank");
      const informed = correct + wrong + blank;
      const accuracy = total ? Math.min(100, Math.max(0, correct / total * 100)) : 0;
      const ruleWeights = weights(rule);
      const score = correct * ruleWeights.correct + wrong * ruleWeights.wrong + blank * ruleWeights.blank;
      const text = labels(rule);

      panel.querySelector("[data-score-accuracy]").textContent = `${percentBR(accuracy)}%`;
      panel.querySelector("[data-score-label]").textContent = text.score;
      panel.querySelector("[data-score-value]").textContent = numberBR(score);
      panel.querySelector("[data-score-counts]").textContent = `${numberBR(informed)} de ${numberBR(total)} respostas informadas`;
      panel.querySelector("[data-score-method]").textContent = `${board || "Banca não informada"} • ${text.rule} • acerto ${numberBR(ruleWeights.correct)}, erro ${numberBR(ruleWeights.wrong)}, branco ${numberBR(ruleWeights.blank)}.`;

      const check = panel.querySelector("[data-score-check]");
      const mismatch = total > 0 && informed !== total;
      check.dataset.scoreCheck = mismatch ? "warning" : "ok";
      check.textContent = mismatch ? `Confira: acertos + erros + brancos = ${numberBR(informed)}, mas o total é ${numberBR(total)}.` : "Cálculo conferido pelos valores informados. Pesos, anulações e regras adicionais devem ser confirmados no edital.";
      updateOriginalSummary(text.score, score);
    } finally { rendering = false; }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || window.setTimeout)(() => { queued = false; render(); }, 0);
  }

  document.addEventListener("input", (event) => { if (watched.has(event.target?.id)) schedule(); }, true);
  document.addEventListener("change", (event) => {
    if (!watched.has(event.target?.id)) return;
    if (event.target.id === "questionScoringRuleV142") choices.set(String(document.getElementById("questionBoard")?.value || "").trim(), event.target.value);
    schedule();
  }, true);
  document.getElementById("questionForm")?.addEventListener("reset", () => { boardSeen = ""; window.setTimeout(schedule, 0); });
  window.addEventListener("hashchange", schedule);
  document.addEventListener("DOMContentLoaded", schedule, { once: true });
  const calculated = document.getElementById("questionCalculated");
  if (calculated && typeof MutationObserver !== "undefined") new MutationObserver(() => { if (!rendering) schedule(); }).observe(calculated, { childList: true, characterData: true, subtree: true });
  schedule();
})();