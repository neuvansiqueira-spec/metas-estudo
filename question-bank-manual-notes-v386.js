(() => {
  "use strict";

  const VERSION = "20260824-question-bank-manual-notes-v386";
  const GLOBAL_KEY = "__aldusQuestionBankManualNotesV386";
  const NOTES_FIELD = "anotacoesManuais";
  const INSTALL_FLAG = "aldusQuestionBankManualNotesV386";
  const MAX_RESULTS = 20;

  if (globalThis[GLOBAL_KEY]) return;

  function text(value) {
    return String(value ?? "").trim();
  }

  function normalize(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[char]);
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      const candidate = text(value);
      if (candidate) return candidate;
    }
    return "";
  }

  function questionIdentity(question = {}) {
    return [
      question.numero_qconcursos,
      question.numeroQconcursos,
      question.qcCodigo,
      question.codigoQc,
      question.referencia,
      question.reference,
      question.id
    ].map(normalize).find(Boolean) || [
      normalize(question.enunciado),
      normalize(question.banca),
      text(question.ano)
    ].join("|");
  }

  function sameQuestion(left = {}, right = {}) {
    const a = questionIdentity(left);
    const b = questionIdentity(right);
    return Boolean(a && b && a === b);
  }

  function bank() {
    try {
      return Array.isArray(state?.questionBank) ? state.questionBank : [];
    } catch {
      return [];
    }
  }

  function currentTrainingQuestion() {
    try {
      const training = questionBankTraining;
      if (!training?.items?.length) return null;
      const index = Math.min(Math.max(0, Number(training.index) || 0), training.items.length - 1);
      return training.items[index] || null;
    } catch {
      return null;
    }
  }

  function canonicalQuestion(candidate) {
    if (!candidate) return null;
    const questions = bank();
    const directId = text(candidate.id);
    if (directId) {
      const byId = questions.find((question) => text(question.id) === directId);
      if (byId) return byId;
    }
    const identity = questionIdentity(candidate);
    if (!identity) return null;
    return questions.find((question) => questionIdentity(question) === identity) || null;
  }

  function notesFor(question = {}) {
    const notes = question?.[NOTES_FIELD];
    if (!notes || typeof notes !== "object" || Array.isArray(notes)) {
      return { comentario: "", bizu: "", jurisprudencia: "" };
    }
    return {
      comentario: text(notes.comentario),
      bizu: text(notes.bizu),
      jurisprudencia: text(notes.jurisprudencia)
    };
  }

  function noteCount(question = {}) {
    const notes = notesFor(question);
    return [notes.comentario, notes.bizu, notes.jurisprudencia].filter(Boolean).length;
  }

  function questionTitle(question = {}) {
    const ref = firstNonEmpty(question.numero_qconcursos, question.qcCodigo, question.referencia, question.id);
    const subject = firstNonEmpty(question.assunto, question.tema, question.disciplina);
    return [ref ? `Questão ${ref}` : "Questão", subject].filter(Boolean).join(" • ");
  }

  function questionPreview(question = {}) {
    const statement = text(question.enunciado);
    return statement.length > 180 ? `${statement.slice(0, 177)}...` : statement;
  }

  function searchQuestions(query) {
    const needle = normalize(query);
    if (!needle) return [];
    const results = [];
    const questions = bank();
    for (let index = 0; index < questions.length && results.length < MAX_RESULTS; index += 1) {
      const question = questions[index];
      const haystack = normalize([
        question.id,
        question.numero_qconcursos,
        question.numeroQconcursos,
        question.qcCodigo,
        question.referencia,
        question.disciplina,
        question.assunto,
        question.tema,
        question.banca,
        question.ano,
        question.enunciado
      ].filter(Boolean).join(" "));
      if (haystack.includes(needle)) results.push({ question, index });
    }
    return results;
  }

  function updateTrainingSnapshot(question) {
    try {
      const training = questionBankTraining;
      if (!training?.items?.length) return;
      const target = training.items.find((item) => sameQuestion(item, question));
      if (!target) return;
      if (question[NOTES_FIELD]) target[NOTES_FIELD] = { ...question[NOTES_FIELD] };
      else delete target[NOTES_FIELD];
    } catch {}
  }

  function persistQuestionNotes(question, values = {}) {
    const target = canonicalQuestion(question);
    if (!target) return { saved: false, reason: "question-not-found" };

    const next = {
      comentario: text(values.comentario),
      bizu: text(values.bizu),
      jurisprudencia: text(values.jurisprudencia)
    };
    const hasAny = Boolean(next.comentario || next.bizu || next.jurisprudencia);
    if (hasAny) {
      target[NOTES_FIELD] = {
        ...next,
        updatedAt: new Date().toISOString(),
        source: "manual"
      };
    } else {
      delete target[NOTES_FIELD];
    }

    updateTrainingSnapshot(target);

    try {
      if (typeof saveData === "function") saveData({ markLocalChange: true });
    } catch (error) {
      console.error("[Aldus V386] Falha ao salvar anotações manuais da questão.", error);
      return { saved: false, reason: "save-failed" };
    }

    try {
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("question-bank-manual-notes");
    } catch {}

    return { saved: true, cleared: !hasAny, question: target };
  }

  function ensureStyles() {
    if (document.getElementById("aldusQuestionBankManualNotesV386Style")) return;
    const style = document.createElement("style");
    style.id = "aldusQuestionBankManualNotesV386Style";
    style.textContent = `
      .aldus-qb-notes-launchers-v386{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
      .aldus-qb-notes-launchers-v386 button{min-height:38px}
      .aldus-qb-notes-modal-v386[hidden]{display:none!important}
      .aldus-qb-notes-modal-v386{position:fixed;inset:0;z-index:10080;display:grid;place-items:center;padding:18px;background:rgba(2,12,27,.56);backdrop-filter:blur(2px)}
      .aldus-qb-notes-dialog-v386{width:min(920px,100%);max-height:min(88vh,900px);overflow:auto;border:1px solid rgba(96,126,160,.28);border-radius:20px;background:var(--surface,#fff);box-shadow:0 28px 80px rgba(0,0,0,.28);padding:18px}
      .aldus-qb-notes-head-v386{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
      .aldus-qb-notes-head-v386 h3{margin:0}.aldus-qb-notes-head-v386 p{margin:4px 0 0;opacity:.76}
      .aldus-qb-notes-search-v386{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:12px 0}
      .aldus-qb-notes-results-v386{display:grid;gap:7px;margin:8px 0 14px;max-height:250px;overflow:auto}
      .aldus-qb-notes-result-v386{display:block;width:100%;text-align:left;padding:10px 12px;border:1px solid rgba(96,126,160,.22);border-radius:12px;background:rgba(41,112,169,.05)}
      .aldus-qb-notes-result-v386 strong{display:block;margin-bottom:3px}.aldus-qb-notes-result-v386 span{display:block;font-size:.85rem;opacity:.78}
      .aldus-qb-notes-editor-v386[hidden]{display:none!important}
      .aldus-qb-notes-editor-v386{display:grid;gap:12px;margin-top:12px}
      .aldus-qb-notes-question-v386{padding:11px 12px;border-left:4px solid #2563eb;border-radius:10px;background:rgba(37,99,235,.07)}
      .aldus-qb-notes-question-v386 strong{display:block;margin-bottom:4px}.aldus-qb-notes-question-v386 p{margin:0;line-height:1.45;white-space:pre-wrap}
      .aldus-qb-note-grid-v386{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .aldus-qb-note-grid-v386 label{display:grid;gap:6px;font-weight:700}.aldus-qb-note-grid-v386 textarea{min-height:150px;resize:vertical;font:inherit;line-height:1.45}
      .aldus-qb-notes-actions-v386{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
      .aldus-qb-notes-status-v386{min-height:22px;margin:0;font-size:.88rem;opacity:.82}
      html[data-aldus-theme="premium-stable"] .aldus-qb-notes-dialog-v386{background:#071c2d;border-color:rgba(125,211,252,.24)}
      html[data-aldus-theme="premium-stable"] .aldus-qb-notes-result-v386{background:rgba(14,116,144,.18);border-color:rgba(125,211,252,.22)}
      html[data-aldus-theme="premium-stable"] .aldus-qb-notes-question-v386{background:rgba(30,64,175,.20)}
      @media(max-width:760px){.aldus-qb-note-grid-v386{grid-template-columns:1fr}.aldus-qb-notes-search-v386{grid-template-columns:1fr}.aldus-qb-notes-dialog-v386{padding:14px}.aldus-qb-note-grid-v386 textarea{min-height:120px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let modal = document.getElementById("aldusQbManualNotesV386");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "aldusQbManualNotesV386";
    modal.className = "aldus-qb-notes-modal-v386";
    modal.hidden = true;
    modal.innerHTML = `
      <section class="aldus-qb-notes-dialog-v386" role="dialog" aria-modal="true" aria-labelledby="aldusQbManualNotesTitleV386">
        <div class="aldus-qb-notes-head-v386">
          <div><h3 id="aldusQbManualNotesTitleV386">📝 Anotações manuais</h3><p>Comentários, bizus e jurisprudência ficam vinculados à questão e são preservados em reimportações do JSON.</p></div>
          <button type="button" class="secondary-button" data-qb-notes-close-v386>Fechar</button>
        </div>
        <div class="aldus-qb-notes-search-v386">
          <input type="search" id="aldusQbNotesSearchV386" placeholder="Buscar por número, referência, disciplina, assunto ou trecho do enunciado" />
          <button type="button" data-qb-notes-search-v386>Buscar questão</button>
        </div>
        <div id="aldusQbNotesResultsV386" class="aldus-qb-notes-results-v386" hidden></div>
        <div id="aldusQbNotesEditorV386" class="aldus-qb-notes-editor-v386" hidden>
          <div id="aldusQbNotesQuestionV386" class="aldus-qb-notes-question-v386"></div>
          <div class="aldus-qb-note-grid-v386">
            <label>💬 Comentário<textarea id="aldusQbNotesCommentV386" maxlength="12000" placeholder="Seu comentário pessoal sobre a questão"></textarea></label>
            <label>💡 Bizu<textarea id="aldusQbNotesBizuV386" maxlength="12000" placeholder="Macete, pegadinha, distinção ou lembrete de prova"></textarea></label>
            <label>⚖️ Jurisprudência<textarea id="aldusQbNotesJurisV386" maxlength="16000" placeholder="Tese, precedente ou observação jurisprudencial que você queira registrar"></textarea></label>
          </div>
          <p id="aldusQbNotesStatusV386" class="aldus-qb-notes-status-v386" aria-live="polite"></p>
          <div class="aldus-qb-notes-actions-v386">
            <button type="button" class="secondary-button" data-qb-notes-clear-v386>Limpar campos</button>
            <button type="button" data-qb-notes-save-v386>Salvar anotações</button>
          </div>
        </div>
      </section>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-qb-notes-close-v386]")) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.target.closest("[data-qb-notes-search-v386]")) {
        event.preventDefault();
        runSearch();
        return;
      }
      const result = event.target.closest("[data-qb-notes-result-v386]");
      if (result) {
        event.preventDefault();
        const index = Number(result.dataset.qbNotesResultV386);
        const question = bank()[index];
        if (question) selectQuestion(question);
        return;
      }
      if (event.target.closest("[data-qb-notes-clear-v386]")) {
        event.preventDefault();
        fillEditor({ comentario: "", bizu: "", jurisprudencia: "" });
        setStatus("Campos limpos. Clique em Salvar anotações para confirmar a remoção.");
        return;
      }
      if (event.target.closest("[data-qb-notes-save-v386]")) {
        event.preventDefault();
        saveEditor();
      }
    });

    modal.querySelector("#aldusQbNotesSearchV386")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runSearch();
    });

    return modal;
  }

  let selectedQuestion = null;

  function setStatus(message) {
    const status = document.getElementById("aldusQbNotesStatusV386");
    if (status) status.textContent = message || "";
  }

  function fillEditor(notes) {
    const comment = document.getElementById("aldusQbNotesCommentV386");
    const bizu = document.getElementById("aldusQbNotesBizuV386");
    const juris = document.getElementById("aldusQbNotesJurisV386");
    if (comment) comment.value = notes.comentario || "";
    if (bizu) bizu.value = notes.bizu || "";
    if (juris) juris.value = notes.jurisprudencia || "";
  }

  function selectQuestion(question) {
    const canonical = canonicalQuestion(question) || question;
    selectedQuestion = canonical;
    const editor = document.getElementById("aldusQbNotesEditorV386");
    const questionBox = document.getElementById("aldusQbNotesQuestionV386");
    if (questionBox) {
      questionBox.innerHTML = `<strong>${escapeHTML(questionTitle(canonical))}</strong><p>${escapeHTML(questionPreview(canonical))}</p>`;
    }
    fillEditor(notesFor(canonical));
    setStatus(noteCount(canonical) ? `${noteCount(canonical)} campo(s) de anotação já preenchido(s).` : "Nenhuma anotação manual cadastrada ainda.");
    if (editor) editor.hidden = false;
  }

  function runSearch() {
    const input = document.getElementById("aldusQbNotesSearchV386");
    const resultsBox = document.getElementById("aldusQbNotesResultsV386");
    if (!resultsBox) return;
    const query = text(input?.value);
    if (!query) {
      resultsBox.hidden = false;
      resultsBox.innerHTML = `<p class="muted">Digite um número, referência, disciplina, assunto ou trecho do enunciado.</p>`;
      return;
    }
    const results = searchQuestions(query);
    resultsBox.hidden = false;
    resultsBox.innerHTML = results.length
      ? results.map(({ question, index }) => `<button type="button" class="aldus-qb-notes-result-v386" data-qb-notes-result-v386="${index}"><strong>${escapeHTML(questionTitle(question))}${noteCount(question) ? ` • 📝 ${noteCount(question)}` : ""}</strong><span>${escapeHTML(questionPreview(question))}</span></button>`).join("")
      : `<p class="muted">Nenhuma questão encontrada.</p>`;
  }

  function saveEditor() {
    if (!selectedQuestion) {
      setStatus("Selecione uma questão antes de salvar.");
      return;
    }
    const result = persistQuestionNotes(selectedQuestion, {
      comentario: document.getElementById("aldusQbNotesCommentV386")?.value,
      bizu: document.getElementById("aldusQbNotesBizuV386")?.value,
      jurisprudencia: document.getElementById("aldusQbNotesJurisV386")?.value
    });
    if (!result.saved) {
      setStatus("Não foi possível salvar as anotações desta questão.");
      return;
    }
    selectedQuestion = result.question;
    setStatus(result.cleared ? "Anotações removidas e alteração salva." : "Anotações salvas com sucesso.");
  }

  function openModal(question = null) {
    const modal = ensureModal();
    modal.hidden = false;
    selectedQuestion = null;
    const editor = document.getElementById("aldusQbNotesEditorV386");
    const results = document.getElementById("aldusQbNotesResultsV386");
    if (editor) editor.hidden = true;
    if (results) results.hidden = true;
    setStatus("");
    if (question) selectQuestion(question);
    else document.getElementById("aldusQbNotesSearchV386")?.focus();
  }

  function closeModal() {
    const modal = document.getElementById("aldusQbManualNotesV386");
    if (modal) modal.hidden = true;
    selectedQuestion = null;
  }

  function ensureLaunchers() {
    if (document.getElementById("aldusQbNotesLaunchersV386")) return true;
    let anchor = null;
    try {
      anchor = elements?.qbMessage || elements?.qbTrainingPanel || null;
    } catch {}
    if (!anchor?.parentElement) return false;

    const launchers = document.createElement("div");
    launchers.id = "aldusQbNotesLaunchersV386";
    launchers.className = "aldus-qb-notes-launchers-v386";
    launchers.innerHTML = `
      <button type="button" class="secondary-button" data-qb-notes-manage-v386>📝 Gerenciar anotações</button>
      <button type="button" class="secondary-button" data-qb-notes-current-v386>✏️ Anotar questão atual</button>`;
    anchor.insertAdjacentElement("afterend", launchers);

    launchers.addEventListener("click", (event) => {
      if (event.target.closest("[data-qb-notes-manage-v386]")) {
        event.preventDefault();
        openModal();
        return;
      }
      if (event.target.closest("[data-qb-notes-current-v386]")) {
        event.preventDefault();
        const current = currentTrainingQuestion();
        if (!current) {
          openModal();
          setStatus("Não há questão de treino ativa. Use a busca para selecionar uma questão do banco.");
          return;
        }
        openModal(current);
      }
    });
    return true;
  }

  function install() {
    if (typeof document === "undefined") return false;
    if (document.documentElement?.dataset?.[INSTALL_FLAG] === "true") return true;
    ensureStyles();
    if (!ensureLaunchers()) return false;
    if (document.documentElement) document.documentElement.dataset[INSTALL_FLAG] = "true";
    return true;
  }

  const api = Object.freeze({
    version: VERSION,
    notesField: NOTES_FIELD,
    questionIdentity,
    sameQuestion,
    notesFor,
    noteCount,
    searchQuestions,
    persistQuestionNotes,
    open: openModal,
    install
  });

  globalThis.AldusQuestionBankManualNotesV386 = api;
  globalThis[GLOBAL_KEY] = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", install, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("aldus:bootstrap-ready", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();