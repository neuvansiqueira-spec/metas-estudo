/* Status manual das questões do treino — V625.
   Anulada, desatualizada, outro e fora do tema ficam auditáveis, mas não entram
   em questionBank nem no histórico de desempenho importado. */
(() => {
  "use strict";

  const VERSION = "20260918-question-training-status-v625";
  const KEY = "__ALDUS_QUESTION_TRAINING_STATUS_V625__";
  const TEMPLATE_MARK = "__aldusQuestionTrainingStatusTemplateV625";
  const PROMPT_MARK = "__aldusQuestionTrainingStatusPromptV625";
  const EXCLUDED = new Set(["anulada", "desatualizada", "outro", "fora do tema", "fora_do_tema"]);
  const LABELS = Object.freeze({
    normal: "Normal",
    anulada: "Anulada",
    desatualizada: "Desatualizada",
    outro: "Outro",
    fora_do_tema: "Fora do tema"
  });

  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  function normalizeStatus(value) {
    const c = canon(value);
    if (c === "fora do tema") return "fora_do_tema";
    if (["anulada", "desatualizada", "outro"].includes(c)) return c;
    return "normal";
  }

  function statusOf(question = {}) {
    const explicit = question.situacao_questao ?? question.situacaoQuestao ?? question.status_questao ?? question.statusQuestao;
    const normalized = normalizeStatus(explicit);
    if (normalized !== "normal") return normalized;
    if (question.excluir_do_banco === true || question.excluirDoBanco === true) {
      const fallback = normalizeStatus(question.motivo_exclusao ?? question.motivoExclusao ?? question.resultado);
      return fallback === "normal" ? "outro" : fallback;
    }
    const legacy = normalizeStatus(question.resultado);
    return legacy === "normal" ? "normal" : legacy;
  }

  function isExcluded(question = {}) {
    return statusOf(question) !== "normal";
  }

  function sourceKey(payload) {
    if (Array.isArray(payload)) return null;
    for (const key of ["questionBank", "questoes", "questions", "items"]) {
      if (Array.isArray(payload?.[key])) return key;
    }
    return null;
  }

  function sanitizePayload(payload) {
    const clone = typeof structuredClone === "function"
      ? structuredClone(payload)
      : JSON.parse(JSON.stringify(payload));
    const key = sourceKey(clone);
    const source = Array.isArray(clone) ? clone : (key ? clone[key] : []);
    if (!Array.isArray(source)) return { payload: clone, excluded: [], kept: 0 };

    const excluded = [];
    const kept = source.filter((question) => {
      const status = statusOf(question);
      if (status === "normal") return true;
      excluded.push({
        ...question,
        situacao_questao: status,
        excluir_do_banco: true,
        motivo_exclusao: LABELS[status] || status
      });
      return false;
    });

    if (Array.isArray(clone)) return { payload: kept, excluded, kept: kept.length };
    clone[key] = kept;
    if (excluded.length) {
      const previous = Array.isArray(clone.questoes_excluidas) ? clone.questoes_excluidas : [];
      clone.questoes_excluidas = [...previous, ...excluded];
      clone.metadata = {
        ...(clone.metadata && typeof clone.metadata === "object" ? clone.metadata : {}),
        excludedQuestionCount: clone.questoes_excluidas.length,
        excludedQuestionStatuses: [...new Set(clone.questoes_excluidas.map(statusOf).filter((s) => s !== "normal"))]
      };
    }
    return { payload: clone, excluded, kept: kept.length };
  }

  function standaloneRuntime() {
    const EXCLUDED = new Set(["anulada", "desatualizada", "outro", "fora_do_tema"]);
    const LABELS = { normal: "Normal", anulada: "Anulada", desatualizada: "Desatualizada", outro: "Outro", fora_do_tema: "Fora do tema" };
    const initial = JSON.parse(document.getElementById("training-data").textContent);
    const round = initial.trainingRound || initial.metadata?.trainingRound || {};
    const identity = round.id || initial.questionBank?.map((q) => q.id).join("|") || "treino";
    const dataKey = `aldus-training:${identity}`;
    const statusKey = `aldus-training-status-v625:${identity}`;
    let lastOutput = "";
    let decorating = false;

    function currentData() {
      try {
        const saved = JSON.parse(localStorage.getItem(dataKey));
        if (saved?.questionBank) return saved;
      } catch {}
      return initial;
    }
    function loadStatuses() {
      try {
        const value = JSON.parse(localStorage.getItem(statusKey));
        return value && typeof value === "object" ? value : {};
      } catch { return {}; }
    }
    function saveStatuses(value) {
      try { localStorage.setItem(statusKey, JSON.stringify(value)); } catch {}
    }
    function statusFor(question, statuses) {
      const value = statuses[question.id] || question.situacao_questao || "normal";
      return EXCLUDED.has(value) ? value : "normal";
    }
    function excluded(question, statuses) { return statusFor(question, statuses) !== "normal"; }
    function addStyle() {
      if (document.getElementById("aldusTrainingStatusStyleV625")) return;
      const style = document.createElement("style");
      style.id = "aldusTrainingStatusStyleV625";
      style.textContent = `
        .qt-card.qt-correct-v625{border:3px solid #63d17a;box-shadow:0 0 0 2px rgba(99,209,122,.16)}
        .qt-card.qt-wrong-v625{border:3px solid #f4d35e;box-shadow:0 0 0 2px rgba(244,211,94,.18)}
        .qt-card.qt-excluded-v625{border:2px dashed #a9b6c2;box-shadow:none}
        .qt-status-selector-v625{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 14px;margin:12px 0 18px;border:1px solid #54758d;border-radius:10px;background:#102f47}
        .qt-status-selector-v625 select{font:inherit;padding:8px 10px;border-radius:8px;background:#061a2b;color:#fff;border:1px solid #6b879b}
        .qt-excluded-note-v625{color:#ffe580;font-weight:700}
        .qt-result-badge-v625{margin-left:auto;font-weight:800}
        .qt-correct-v625 .qt-result-badge-v625{color:#8af0a0}
        .qt-wrong-v625 .qt-result-badge-v625{color:#ffe580}
      `;
      document.head.appendChild(style);
    }
    function statusControl(question, status) {
      const wrap = document.createElement("label");
      wrap.className = "qt-status-selector-v625";
      wrap.append(document.createTextNode("Esta questão está: "));
      const select = document.createElement("select");
      select.dataset.questionStatusV625 = question.id;
      for (const [value, label] of Object.entries(LABELS)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = value === status;
        select.appendChild(option);
      }
      wrap.appendChild(select);
      if (status !== "normal") {
        const note = document.createElement("span");
        note.className = "qt-excluded-note-v625";
        note.textContent = "Não será exportada para o Banco de Questões.";
        wrap.appendChild(note);
      }
      return wrap;
    }
    function decorate() {
      if (decorating) return;
      decorating = true;
      try {
        addStyle();
        const data = currentData();
        const statuses = loadStatuses();
        const cards = [...document.querySelectorAll(".qt-card")];
        cards.forEach((card, index) => {
          const question = data.questionBank?.[index];
          if (!question) return;
          const status = statusFor(question, statuses);
          card.classList.remove("qt-correct-v625", "qt-wrong-v625", "qt-excluded-v625");
          card.querySelector(".qt-status-selector-v625")?.remove();
          card.querySelector(".qt-result-badge-v625")?.remove();

          const body = card.querySelector(".qt-body");
          if (body) body.insertBefore(statusControl(question, status), body.firstChild);

          if (status !== "normal") {
            card.classList.add("qt-excluded-v625");
            card.querySelectorAll("button").forEach((button) => {
              const label = button.textContent.trim();
              if (["Marcar", "Marcada", "CORRIGIR QUESTÃO"].includes(label)) button.disabled = true;
            });
          } else if (question.corrigida) {
            const correct = question.resposta_marcada === question.gabarito;
            card.classList.add(correct ? "qt-correct-v625" : "qt-wrong-v625");
            const toolbar = card.querySelector(".qt-toolbar");
            if (toolbar) {
              const badge = document.createElement("span");
              badge.className = "qt-result-badge-v625";
              badge.textContent = correct ? "✓ ACERTO" : "✗ ERRO";
              toolbar.appendChild(badge);
            }
          }
        });

        const valid = (data.questionBank || []).filter((question) => !excluded(question, statuses));
        const done = valid.filter((question) => question.corrigida);
        const correct = done.filter((question) => question.resposta_marcada === question.gabarito).length;
        const score = document.getElementById("score");
        if (score) {
          const removed = (data.questionBank || []).length - valid.length;
          score.textContent = `Válidas ${valid.length} · Excluídas ${removed} · Corrigidas ${done.length} · Acertos ${correct} · Erros ${done.length-correct} · Não respondidas ${valid.filter((q)=>!q.resposta_marcada).length} · ${done.length?Math.round(correct/done.length*100):0}%`;
        }
      } finally {
        decorating = false;
      }
    }
    function buildExport(all) {
      const data = currentData();
      const statuses = loadStatuses();
      const removed = [];
      const valid = (data.questionBank || []).filter((question) => {
        const status = statusFor(question, statuses);
        if (status === "normal") return true;
        removed.push({ ...question, situacao_questao: status, excluir_do_banco: true, motivo_exclusao: LABELS[status] });
        return false;
      });
      const selected = (all ? valid : valid.filter((question) => question.corrigida)).map((question) => ({
        ...question,
        situacao_questao: "normal",
        excluir_do_banco: false,
        resposta_correta: question.gabarito,
        resultado: question.corrigida
          ? (question.resposta_marcada === question.gabarito ? "ACERTEI" : "ERREI")
          : (question.resposta_marcada ? "RESPONDIDA_SEM_CORRECAO" : "NAO_RESPONDIDA")
      }));
      return {
        ...data,
        schema: "aldus-question-training-v1",
        exportMode: all ? "complete" : "corrected",
        questionBank: selected,
        questoes_excluidas: removed,
        metadata: {
          ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
          excludedQuestionCount: removed.length,
          excludedQuestionStatuses: [...new Set(removed.map((q) => q.situacao_questao))]
        }
      };
    }
    function filename() {
      const data = currentData();
      const r = data.trainingRound || data.metadata?.trainingRound || {};
      return `${r.outputBaseName || "treino-questoes"}.json`;
    }
    function download() {
      if (!lastOutput) return;
      const url = URL.createObjectURL(new Blob([lastOutput], { type: "application/json;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename();
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2500);
    }
    function exportFile(all) {
      const payload = buildExport(all);
      lastOutput = JSON.stringify(payload, null, 2);
      const area = document.getElementById("export-area");
      const textarea = document.getElementById("json");
      const info = document.getElementById("export-info");
      if (textarea) textarea.value = lastOutput;
      if (area) area.hidden = false;
      if (info) info.textContent = `Exportadas ${payload.questionBank.length} questão(ões) válida(s) · Excluídas ${payload.questoes_excluidas.length}: ${payload.questoes_excluidas.map((q)=>q.id+" ("+LABELS[q.situacao_questao]+")").join(", ") || "nenhuma"}`;
      download();
    }

    document.addEventListener("change", (event) => {
      const select = event.target.closest?.("select[data-question-status-v625]");
      if (!select) return;
      const statuses = loadStatuses();
      statuses[select.dataset.questionStatusV625] = select.value;
      saveStatuses(statuses);
      decorate();
    }, true);

    document.addEventListener("click", (event) => {
      const button = event.target.closest?.("#complete,#corrected,#download-again");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (button.id === "complete") exportFile(true);
      else if (button.id === "corrected") exportFile(false);
      else download();
    }, true);

    const root = document.getElementById("cards");
    if (root && "MutationObserver" in globalThis) {
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        queueMicrotask(() => { queued = false; decorate(); });
      }).observe(root, { childList: true, subtree: true });
    }
    decorate();
  }

  function augmentHtml(html) {
    const source = text(html);
    if (!source || source.includes("__ALDUS_TRAINING_STATUS_STANDALONE_V625__")) return source;
    const script = `<script>globalThis.__ALDUS_TRAINING_STATUS_STANDALONE_V625__=true;(${standaloneRuntime.toString()})();<\/script>`;
    return source.includes("</html>") ? source.replace("</html>", `${script}</html>`) : `${source}${script}`;
  }

  function installTemplate() {
    const template = globalThis.AldusTrainingTemplate;
    if (!template || typeof template.buildHTML !== "function") return false;
    if (template.buildHTML[TEMPLATE_MARK]) return true;
    const previous = template.buildHTML;
    const wrapped = function(payload) { return augmentHtml(previous.call(this, payload)); };
    Object.defineProperty(wrapped, TEMPLATE_MARK, { value: true });
    template.buildHTML = wrapped;
    return true;
  }

  const STATUS_PROMPT = `

# SITUAÇÃO MANUAL DA QUESTÃO — OBRIGATÓRIO
Em CADA cartão do HTML, disponibilize o campo “Esta questão está:” com as opções:
- Normal;
- Anulada;
- Desatualizada;
- Outro;
- Fora do tema.

“Normal” é o padrão. Anulada, Desatualizada, Outro e Fora do tema são estados de EXCLUSÃO.
Questão excluída pode permanecer visível no treino para auditoria, mas:
1. não pode entrar em questionBank em NENHUMA exportação;
2. não pode contar como corrigida, acerto, erro, branco ou percentual;
3. não pode alimentar Banco de Questões, histórico ou Caderno de Erros;
4. deve ser registrada somente em questoes_excluidas, com situacao_questao e excluir_do_banco=true.
Após corrigir uma questão NORMAL, identifique visualmente o cartão inteiro: VERDE para acerto e AMARELO para erro. Preserve contraste e legibilidade; não use cor para revelar a resposta antes da correção.
O JSON de “GUARDAR TREINO COMPLETO” e o de “EXPORTAR CORRIGIDAS” devem aplicar a mesma exclusão.
`;

  function installPrompt() {
    const api = globalThis.AldusQuestionTraining;
    if (!api || typeof api.prompt !== "function") return false;
    if (api.prompt[PROMPT_MARK]) return true;
    const previous = api.prompt;
    const wrapped = function(...args) {
      const result = previous.apply(this, args);
      if (result && !text(result.htmlInstruction).includes("# SITUAÇÃO MANUAL DA QUESTÃO — OBRIGATÓRIO")) {
        result.htmlInstruction = `${text(result.htmlInstruction)}${STATUS_PROMPT}`;
      }
      return result;
    };
    Object.defineProperty(wrapped, PROMPT_MARK, { value: true });
    api.prompt = wrapped;
    return true;
  }

  const sanitizedEvents = new WeakSet();
  async function interceptQuestionJson(event) {
    const input = event?.target;
    if (!input || input.id !== "qbFile" || sanitizedEvents.has(event)) return;
    const file = input.files?.[0];
    if (!file || typeof file.text !== "function") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try {
      const parsed = JSON.parse(await file.text());
      const result = sanitizePayload(parsed);
      if (result.excluded.length && !result.kept) {
        const message = document.getElementById("qbMessage");
        if (message) message.textContent = `Importação bloqueada: todas as ${result.excluded.length} questão(ões) estão marcadas como excluídas.`;
        input.value = "";
        return;
      }
      const safeFile = new File([JSON.stringify(result.payload, null, 2)], file.name || "questoes.json", { type: "application/json" });
      const transfer = new DataTransfer();
      transfer.items.add(safeFile);
      input.files = transfer.files;
      const next = new Event("change", { bubbles: true });
      sanitizedEvents.add(next);
      input.dispatchEvent(next);
    } catch (error) {
      const message = document.getElementById("qbMessage");
      if (message) message.textContent = `Erro ao filtrar questões excluídas: ${error?.message || error}`;
      input.value = "";
    }
  }

  function install() {
    const template = installTemplate();
    const prompt = installPrompt();
    return template && prompt;
  }

  const api = Object.freeze({
    version: VERSION,
    labels: LABELS,
    normalizeStatus,
    statusOf,
    isExcluded,
    sanitizePayload,
    augmentHtml,
    install
  });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof document === "undefined") return;

  // Registrado cedo no capture para sanitizar o arquivo antes do importador do banco.
  document.addEventListener("change", (event) => { void interceptQuestionJson(event); }, true);

  let attempts = 0;
  const timer = setInterval(() => {
    install();
    if ((globalThis.AldusTrainingTemplate?.buildHTML?.[TEMPLATE_MARK] && globalThis.AldusQuestionTraining?.prompt?.[PROMPT_MARK]) || ++attempts >= 400) {
      clearInterval(timer);
    }
  }, 25);
  install();
})();