(() => {
  "use strict";

  const VERSION = "20260730-revisao-visivel-json-qconcursos-v192";
  if (globalThis.__ALDUS_QB_JSON_REVIEW_V192__) return;

  function html(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function text(value) { return String(value ?? "").trim(); }
  function sourceItems(payload) {
    if (Array.isArray(payload)) return payload;
    return payload?.questionBank || payload?.questoes || payload?.questions || payload?.items || [];
  }
  function markedAnswer(raw = {}) {
    return text(raw.resposta_marcada ?? raw.respostaMarcada ?? raw.userAnswer ?? raw.marked ?? raw.marcado ?? "");
  }
  function officialAnswer(raw = {}) {
    return text(raw.gabarito ?? raw.correctAnswer ?? raw.officialKey ?? raw.resposta_correta ?? "");
  }
  function statusLabel(status) {
    return ({ certo: "Certa", errado: "Errada", branco: "Não respondida", duvida: "Dúvida" }[status] || "Sem resultado");
  }
  function actionLabel(action) {
    return ({ created: "Nova", updated: "Atualizar", unchanged: "Sem alteração" }[action] || action);
  }

  function buildReviewRows(payload, api, currentBank = []) {
    const rows = [];
    sourceItems(payload).forEach((raw, index) => {
      const question = api.normalizeImportedQuestion(raw, index);
      if (!text(question.enunciado)) return;
      const existingIndex = api.findExistingQuestionIndex(currentBank, question);
      let action = "created";
      if (existingIndex >= 0) {
        const existing = currentBank[existingIndex];
        const merged = api.mergeMeaningful(existing, question);
        merged.id = existing.id || question.id;
        action = JSON.stringify(merged) === JSON.stringify(existing) ? "unchanged" : "updated";
      }
      const status = api.hasPerformanceEvidence(raw) ? (api.resultStatus(raw) || "") : "";
      rows.push({ raw, question, action, status });
    });
    return rows;
  }

  function ensureStyle() {
    if (document.getElementById("aldusQbJsonReviewV192Style")) return;
    const style = document.createElement("style");
    style.id = "aldusQbJsonReviewV192Style";
    style.textContent = `
      .aldus-json-review-v192{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(2,12,25,.72)}
      .aldus-json-review-v192[hidden]{display:none}
      .aldus-json-review-card-v192{width:min(1180px,96vw);max-height:92vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#102033);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.38);padding:20px}
      .aldus-json-review-head-v192{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
      .aldus-json-review-head-v192 h2{margin:3px 0 6px;font-size:1.35rem}
      .aldus-json-review-head-v192 p{margin:0}
      .aldus-json-review-close-v192{min-width:42px}
      .aldus-json-review-stats-v192{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:14px 0}
      .aldus-json-review-stat-v192{border:1px solid rgba(100,120,145,.28);border-radius:12px;padding:10px;background:rgba(125,145,170,.08)}
      .aldus-json-review-stat-v192 span{display:block;font-size:.78rem;opacity:.78}
      .aldus-json-review-stat-v192 strong{display:block;font-size:1.08rem;margin-top:3px}
      .aldus-json-review-note-v192{border:1px solid rgba(175,125,20,.35);border-radius:12px;padding:10px 12px;margin:10px 0;background:rgba(235,180,55,.10)}
      .aldus-json-review-table-wrap-v192{overflow:auto;max-height:48vh;border:1px solid rgba(100,120,145,.28);border-radius:12px}
      .aldus-json-review-table-v192{width:100%;border-collapse:collapse;font-size:.84rem;min-width:980px}
      .aldus-json-review-table-v192 th,.aldus-json-review-table-v192 td{padding:9px 10px;border-bottom:1px solid rgba(100,120,145,.20);text-align:left;vertical-align:top}
      .aldus-json-review-table-v192 th{position:sticky;top:0;background:var(--surface,#fff);z-index:1}
      .aldus-json-review-actions-v192{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;position:sticky;bottom:-20px;padding:14px 0 2px;background:var(--surface,#fff)}
      .aldus-json-review-code-v192{white-space:nowrap;font-weight:700}
      .aldus-json-review-summary-v192{max-width:300px}
      @media(max-width:720px){.aldus-json-review-v192{padding:8px}.aldus-json-review-card-v192{max-height:96vh;padding:14px}.aldus-json-review-head-v192{align-items:center}.aldus-json-review-actions-v192{flex-direction:column-reverse}.aldus-json-review-actions-v192 button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function showReview(plan, rows, fileName) {
    ensureStyle();
    return new Promise((resolve) => {
      const previous = document.getElementById("aldusQbJsonReviewV192");
      previous?.remove();
      const modal = document.createElement("div");
      modal.id = "aldusQbJsonReviewV192";
      modal.className = "aldus-json-review-v192";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "aldusQbJsonReviewTitleV192");
      const rowHtml = rows.map((row, index) => {
        const q = row.question;
        const code = q.qcCodigo || q.numero_qconcursos || q.referencia || q.id || `Questão ${index + 1}`;
        const statement = text(q.enunciado).slice(0, 190);
        const marked = markedAnswer(row.raw) || "—";
        const key = officialAnswer(row.raw) || text(q.gabarito) || "—";
        return `<tr>
          <td>${index + 1}</td>
          <td class="aldus-json-review-code-v192">${html(code)}</td>
          <td><strong>${html(q.disciplina || "Sem disciplina")}</strong><br>${html(q.assunto || "Sem assunto")}</td>
          <td class="aldus-json-review-summary-v192">${html(statement)}${text(q.enunciado).length > 190 ? "…" : ""}</td>
          <td>${html(actionLabel(row.action))}</td>
          <td>${html(marked)}</td>
          <td>${html(key)}</td>
          <td>${html(statusLabel(row.status))}${row.raw?.revisao_manual === true ? " • revisão manual" : ""}</td>
        </tr>`;
      }).join("");
      const duplicateNote = plan.duplicateSession
        ? "O desempenho deste mesmo arquivo já existe e não será duplicado. Os dados das questões ainda podem ser atualizados."
        : (plan.session ? `${plan.notebookItems.length} item(ns) serão encaminhados ao Caderno de Erros.` : "Nenhum desempenho do usuário foi identificado; somente o banco será atualizado.");
      modal.innerHTML = `<section class="aldus-json-review-card-v192">
        <header class="aldus-json-review-head-v192">
          <div><p class="eyebrow">REVISAR ANTES DE SALVAR</p><h2 id="aldusQbJsonReviewTitleV192">Importação JSON do QConcursos</h2><p>${html(fileName)}</p></div>
          <button type="button" class="secondary-button aldus-json-review-close-v192" data-json-review-cancel aria-label="Cancelar importação">×</button>
        </header>
        <div class="aldus-json-review-stats-v192">
          <article class="aldus-json-review-stat-v192"><span>Questões válidas</span><strong>${plan.counts.read}</strong></article>
          <article class="aldus-json-review-stat-v192"><span>Novas</span><strong>${plan.counts.created}</strong></article>
          <article class="aldus-json-review-stat-v192"><span>Atualizadas</span><strong>${plan.counts.updated}</strong></article>
          <article class="aldus-json-review-stat-v192"><span>Sem alteração</span><strong>${plan.counts.unchanged}</strong></article>
          <article class="aldus-json-review-stat-v192"><span>Certas</span><strong>${plan.counts.correct}</strong></article>
          <article class="aldus-json-review-stat-v192"><span>Erradas</span><strong>${plan.counts.wrong}</strong></article>
          <article class="aldus-json-review-stat-v192"><span>Não respondidas</span><strong>${plan.counts.blank}</strong></article>
        </div>
        <p class="aldus-json-review-note-v192">${html(duplicateNote)}</p>
        <div class="aldus-json-review-table-wrap-v192"><table class="aldus-json-review-table-v192">
          <thead><tr><th>#</th><th>Código</th><th>Disciplina e assunto</th><th>Enunciado</th><th>Ação</th><th>Marcada</th><th>Gabarito</th><th>Resultado</th></tr></thead>
          <tbody>${rowHtml}</tbody>
        </table></div>
        <div class="aldus-json-review-actions-v192"><button type="button" class="secondary-button" data-json-review-cancel>Cancelar sem salvar</button><button type="button" data-json-review-confirm>Confirmar importação</button></div>
      </section>`;
      document.body.appendChild(modal);
      const finish = (approved) => { document.removeEventListener("keydown", onKey); modal.remove(); resolve(approved); };
      const onKey = (event) => { if (event.key === "Escape") { event.preventDefault(); finish(false); } };
      document.addEventListener("keydown", onKey);
      modal.addEventListener("click", (event) => {
        if (event.target === modal || event.target.closest("[data-json-review-cancel]")) finish(false);
        else if (event.target.closest("[data-json-review-confirm]")) finish(true);
      });
      modal.querySelector("[data-json-review-confirm]")?.focus();
    });
  }

  function commitPlan(plan) {
    state.questionBank = plan.bank;
    state.questionBankSessions ||= [];
    if (plan.session) {
      state.questionBankSessions.unshift(plan.session);
      if (typeof qbSaveNotebookItems === "function") qbSaveNotebookItems(plan.notebookItems);
    }
    saveData({ markLocalChange: true });
    if (typeof renderQuestionBank === "function") renderQuestionBank();
    if (typeof qbRenderErrorNotebook === "function") qbRenderErrorNotebook();
    if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("question-bank-json-import");
  }

  async function handleJsonChange(event) {
    const target = event?.target;
    if (!target || target.id !== "qbFile") return;
    const file = target.files?.[0];
    if (!file) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const api = globalThis.AldusQuestionBankJsonImportV191;
      if (!api?.buildImportPlan) throw new Error("O adaptador de importação V191 não foi carregado.");
      const payload = JSON.parse(await file.text());
      const plan = api.buildImportPlan(payload, state.questionBank || [], state.questionBankSessions || []);
      const rows = buildReviewRows(payload, api, state.questionBank || []);
      if (typeof elements !== "undefined" && elements.qbMessage) elements.qbMessage.textContent = `Prévia pronta: revise ${rows.length} questão(ões) antes de confirmar.`;
      const approved = await showReview(plan, rows, file.name);
      if (!approved) {
        if (typeof elements !== "undefined" && elements.qbMessage) elements.qbMessage.textContent = "Importação JSON cancelada; nenhum dado foi alterado.";
        return;
      }
      commitPlan(plan);
      const performanceMessage = plan.duplicateSession
        ? " O desempenho idêntico já existia e não foi duplicado."
        : (plan.session ? ` ${plan.counts.results} resultado(s) registrado(s) no histórico.` : " Nenhum resultado de desempenho foi identificado.");
      if (typeof elements !== "undefined" && elements.qbMessage) elements.qbMessage.textContent = `${plan.counts.created} questão(ões) nova(s), ${plan.counts.updated} atualizada(s) e ${plan.counts.unchanged} sem alteração.${performanceMessage} Banco atual: ${state.questionBank.length}.`;
    } catch (error) {
      console.error("[Aldus V192] Falha na revisão da importpãão JSON.", error);
      if (typeof elements !== "undefined" && elements.qbMessage) elements.qbMessage.textContent = `Erro ao importar: ${error.message}`;
    } finally {
      target.value = "";
    }
  }

  if (typeof document !== "undefined") document.addEventListener("change", handleJsonChange, true);
  const api = Object.freeze({ version: VERSION, buildReviewRows, showReview, handleJsonChange });
  globalThis.AldusQuestionBankJsonReviewV192 = api;
  globalThis.__ALDUS_QB_JSON_REVIEW_V192__ = api;
})();
