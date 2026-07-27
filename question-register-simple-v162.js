(() => {
  "use strict";

  const PATCH_VERSION = "20260727-registrar-questoes-simples-v162";
  const STORAGE_KEY = "aldus.questionRegistrationDraft.v162";
  const FIELD_IDS = [
    "questionDiscipline",
    "questionSyllabusItem",
    "questionBoard",
    "questionQcNumber",
    "questionDate",
    "questionTrainingType",
    "questionTotal",
    "questionMinutes",
    "questionCorrect",
    "questionWrong",
    "questionBlank",
    "questionNotes",
    "questionQcCode",
    "questionQcLink",
    "questionItemResult",
    "questionItemDifficulty",
    "questionStatement",
    "questionAlternatives",
    "questionMarkedAnswer",
    "questionAnswerKey",
    "questionPersonalComment",
    "questionErrorReason",
    "questionLegalBasis",
    "questionBizu1",
    "questionBizu2",
    "questionBizu3",
    "questionAddToErrorNotebook"
  ];
  const CALCULATION_FIELD_IDS = [
    "questionTotal",
    "questionCorrect",
    "questionWrong",
    "questionBlank"
  ];

  if (globalThis.__ALDUS_QUESTION_REGISTER_SIMPLE_V162__) return;

  function field(id) {
    return document.getElementById(id);
  }

  function dispatch(element, type) {
    if (!element) return;
    element.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function setStatus(message, type = "neutral") {
    const status = field("questionNotebookDraftStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
    status.hidden = !message;
  }

  function injectStyles() {
    if (document.getElementById("questionRegisterSimpleStylesV162")) return;
    const style = document.createElement("style");
    style.id = "questionRegisterSimpleStylesV162";
    style.textContent = `
      #view-questoes.question-register-simple-v162 .question-notebook-save-actions-v162 {
        display: grid;
        grid-template-columns: minmax(180px, 280px) minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        margin-top: 4px;
        padding-top: 16px;
        border-top: 1px solid rgba(120, 167, 205, .34);
      }
      #view-questoes.question-register-simple-v162 #saveQuestionNotebookDraft {
        width: 100%;
      }
      #view-questoes.question-register-simple-v162 #questionNotebookDraftStatus {
        margin: 0;
        min-height: 1.35em;
        color: var(--muted, #9fb5c7);
        font-size: .9rem;
        font-weight: 700;
      }
      #view-questoes.question-register-simple-v162 #questionNotebookDraftStatus[data-status="success"] {
        color: var(--success, #7dd3a7);
      }
      #view-questoes.question-register-simple-v162 #questionNotebookDraftStatus[data-status="error"] {
        color: var(--danger, #fca5a5);
      }
      @media (max-width: 720px) {
        #view-questoes.question-register-simple-v162 .question-notebook-save-actions-v162 {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setLabelText(controlId, text) {
    const control = field(controlId);
    const label = control?.closest("label");
    if (!label) return;
    const textNode = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );
    if (textNode) textNode.textContent = text;
    else label.insertBefore(document.createTextNode(text), label.firstChild);
  }

  function simplifyInterface(view) {
    view.classList.add("question-register-simple-v162");

    const description = view.querySelector(".view-identity-description");
    if (description) description.hidden = true;

    const directNotice = [...view.children].find(
      (element) => element.matches?.("p.notice")
    );
    if (directNotice) directNotice.hidden = true;

    const form = field("questionForm");
    const sections = form
      ? [...form.children].filter((element) => element.matches?.("details.question-register-section"))
      : [];

    const firstSummary = sections[0]?.querySelector(":scope > summary");
    const secondSummary = sections[1]?.querySelector(":scope > summary");
    const firstStrong = firstSummary?.querySelector("strong");
    const firstHint = firstSummary?.querySelector("em");
    const secondStrong = secondSummary?.querySelector("strong");
    const secondHint = secondSummary?.querySelector("em");

    if (firstStrong) firstStrong.textContent = "Conteúdo e filtros";
    if (firstHint) firstHint.textContent = "Escolha disciplina, assunto e banca";
    if (secondStrong) secondStrong.textContent = "Resultado da sessão";
    if (secondHint) secondHint.textContent = "Informe quantidade, desempenho e tempo";

    setLabelText("questionSyllabusItem", "Assunto do edital");
    setLabelText("questionQcNumber", "Número do assunto no QC");

    const qcButton = field("saveQuestionQcNumber");
    if (qcButton) qcButton.textContent = "Salvar número do QC";

    const qcHelp = field("questionQcNumberHelp");
    if (qcHelp) qcHelp.textContent = "O número do QC é diferente da referência do edital.";
  }

  function ensureSaveControls() {
    const content = document.querySelector("#questionNotebookPanel .question-notebook-content");
    if (!content) return false;
    if (field("saveQuestionNotebookDraft")) return true;

    const actions = document.createElement("div");
    actions.className = "wide question-notebook-save-actions-v162";

    const button = document.createElement("button");
    button.id = "saveQuestionNotebookDraft";
    button.type = "button";
    button.textContent = "Salvar ficha";

    const status = document.createElement("p");
    status.id = "questionNotebookDraftStatus";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;

    actions.append(button, status);
    content.appendChild(actions);
    return true;
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || typeof parsed.fields !== "object") return null;
      return parsed;
    } catch (error) {
      console.warn("[Registrar Questões v162] Não foi possível ler a ficha salva.", error);
      return null;
    }
  }

  function collectDraft() {
    const fields = {};
    FIELD_IDS.forEach((id) => {
      const element = field(id);
      if (!element) return;
      fields[id] = element.type === "checkbox" ? Boolean(element.checked) : element.value;
    });
    return {
      version: PATCH_VERSION,
      savedAt: new Date().toISOString(),
      fields
    };
  }

  function saveDraft() {
    try {
      const draft = collectDraft();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      const time = new Date(draft.savedAt).toLocaleString("pt-BR");
      setStatus(`Ficha salva neste navegador em ${time}.`, "success");
    } catch (error) {
      console.error("[Registrar Questões v162] Falha ao salvar a ficha.", error);
      setStatus("Não foi possível salvar a ficha. Nenhum lançamento existente foi alterado.", "error");
    }
  }

  function meaningfulCurrentInput() {
    const ids = [
      "questionNotes",
      "questionQcCode",
      "questionQcLink",
      "questionItemResult",
      "questionItemDifficulty",
      "questionStatement",
      "questionAlternatives",
      "questionMarkedAnswer",
      "questionAnswerKey",
      "questionPersonalComment",
      "questionErrorReason",
      "questionLegalBasis",
      "questionBizu1",
      "questionBizu2",
      "questionBizu3"
    ];
    return ids.some((id) => String(field(id)?.value || "").trim())
      || Boolean(field("questionAddToErrorNotebook")?.checked);
  }

  function setElementValue(id, value) {
    const element = field(id);
    if (!element || value === undefined || value === null) return false;
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
      dispatch(element, "change");
      return true;
    }
    if (element.tagName === "SELECT" && value && ![...element.options].some((option) => option.value === value)) {
      return false;
    }
    element.value = String(value);
    dispatch(element, element.tagName === "SELECT" ? "change" : "input");
    return true;
  }

  function restoreRemainingFields(draft) {
    FIELD_IDS.forEach((id) => {
      if (["questionDiscipline", "questionSyllabusItem"].includes(id)) return;
      setElementValue(id, draft.fields[id]);
    });
    CALCULATION_FIELD_IDS.forEach((id) => dispatch(field(id), "input"));
    const savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString("pt-BR") : "data não informada";
    setStatus(`Ficha recuperada automaticamente • salva em ${savedAt}.`, "success");
  }

  function restoreDraftWhenReady(draft, attempt = 0) {
    const form = field("questionForm");
    if (!form || !draft?.fields) return;
    if (field("questionEditingId")?.value || meaningfulCurrentInput()) return;

    const discipline = field("questionDiscipline");
    const syllabus = field("questionSyllabusItem");
    if (!discipline || !syllabus || !discipline.options.length) {
      if (attempt < 120) setTimeout(() => restoreDraftWhenReady(draft, attempt + 1), 50);
      return;
    }

    const savedDiscipline = draft.fields.questionDiscipline;
    if (savedDiscipline && [...discipline.options].some((option) => option.value === savedDiscipline)) {
      discipline.value = savedDiscipline;
      dispatch(discipline, "change");
    }

    const applySyllabusAndRest = (syllabusAttempt = 0) => {
      const currentSyllabus = field("questionSyllabusItem");
      const savedSyllabus = draft.fields.questionSyllabusItem;
      const canApplySyllabus = !savedSyllabus
        || (currentSyllabus && [...currentSyllabus.options].some((option) => option.value === savedSyllabus));

      if (!canApplySyllabus && syllabusAttempt < 80) {
        setTimeout(() => applySyllabusAndRest(syllabusAttempt + 1), 50);
        return;
      }

      if (savedSyllabus && currentSyllabus) {
        currentSyllabus.value = savedSyllabus;
        dispatch(currentSyllabus, "change");
      }
      restoreRemainingFields(draft);
    };

    setTimeout(() => applySyllabusAndRest(), 0);
  }

  function clearDraftAfterSuccessfulFullSave() {
    const form = field("questionForm");
    if (!form || form.dataset.questionDraftClearBound === "true") return;
    form.dataset.questionDraftClearBound = "true";

    form.addEventListener("submit", () => {
      const editingBefore = field("questionEditingId")?.value || "";
      const logsBefore = typeof state !== "undefined" && Array.isArray(state.questionLogs)
        ? state.questionLogs.length
        : null;

      setTimeout(() => {
        const logsAfter = typeof state !== "undefined" && Array.isArray(state.questionLogs)
          ? state.questionLogs.length
          : null;
        const editingAfter = field("questionEditingId")?.value || "";
        const newLogSaved = logsBefore !== null && logsAfter !== null && logsAfter > logsBefore;
        const editedLogSaved = Boolean(editingBefore) && !editingAfter;
        if (!newLogSaved && !editedLogSaved) return;
        localStorage.removeItem(STORAGE_KEY);
        setStatus("Ficha incorporada ao lançamento completo.", "success");
      }, 350);
    });
  }

  function init() {
    const view = field("view-questoes");
    if (!view) return;

    injectStyles();
    simplifyInterface(view);
    if (!ensureSaveControls()) return;

    field("saveQuestionNotebookDraft")?.addEventListener("click", saveDraft);
    clearDraftAfterSuccessfulFullSave();

    const draft = readDraft();
    if (draft) setTimeout(() => restoreDraftWhenReady(draft), 450);

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      const updatedDraft = readDraft();
      if (!updatedDraft) {
        setStatus("A ficha salva foi removida em outra aba.");
        return;
      }
      const savedAt = updatedDraft.savedAt
        ? new Date(updatedDraft.savedAt).toLocaleString("pt-BR")
        : "data não informada";
      setStatus(`Ficha atualizada em outra aba • ${savedAt}.`, "success");
    });

    Object.defineProperty(globalThis, "__ALDUS_QUESTION_REGISTER_SIMPLE_V162__", {
      value: Object.freeze({ version: PATCH_VERSION, storageKey: STORAGE_KEY }),
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
