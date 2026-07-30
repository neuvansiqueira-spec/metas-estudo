(() => {
  "use strict";
  const VERSION = "20260730-revisao-obrigatoria-qconcursos-v190";
  if (globalThis.__ALDUS_QC_CAPTURE_UI_STRICT_V190__) return;

  const originalTypeOptions = typeof qbCaptureTypeOptions === "function" ? qbCaptureTypeOptions : null;
  if (originalTypeOptions) {
    qbCaptureTypeOptions = function strictCaptureTypeOptions(selected = "") {
      return `<option value="" ${!selected ? "selected" : ""}>Não identificado — revisar</option>${originalTypeOptions(selected)}`;
    };
  }
  if (typeof qbCaptureSuggestedType === "function") {
    const originalSuggested = qbCaptureSuggestedType;
    qbCaptureSuggestedType = function strictSuggestedType(question, match = {}) {
      const draft = match.questionDraft || qbCaptureImportDraft?.structuredQuestions?.[match.index] || {};
      if (draft.tipo === "multipla" || draft.tipo === "ce") return draft.tipo;
      if (Number(match.optionCount) >= 4) return "multipla";
      return question ? originalSuggested(question, { ...match, optionCount: 0 }) : "";
    };
  }

  function parseAlternativeKeys(value) {
    return [...String(value || "").matchAll(/^\s*([A-E])[\)\].:\-]/gim)].map((match) => match[1].toUpperCase());
  }
  function decoratePreview() {
    const matches = qbCaptureImportDraft?.matches || [];
    [...(elements.qbCapturePreviewList?.querySelectorAll("[data-qb-capture-row]") || [])].forEach((row, index) => {
      const match = matches[index] || {}; const draft = match.questionDraft || qbCaptureImportDraft?.structuredQuestions?.[index] || {};
      const select = row.querySelector("[data-qb-capture-type]");
      if (select && !select.querySelector('option[value=""]')) select.insertAdjacentHTML("afterbegin", '<option value="">Não identificado — revisar</option>');
      if (select) select.value = draft.tipo || match.detectedType || "";
      const warnings = Array.isArray(draft.extractionWarnings) ? draft.extractionWarnings : [];
      if (warnings.length) {
        row.dataset.reviewRequired = "true";
        const note = row.querySelector(".qb-ocr-confidence");
        if (note) note.textContent = `Leitura conservadora: ${warnings.join(" ")} O sistema deixou vazios os campos não confirmados.`;
      }
    });
    if (elements.qbCaptureStatus && qbCaptureImportDraft?.accuracyMode === "strict") {
      elements.qbCaptureStatus.textContent = `${elements.qbCaptureStatus.textContent} Nenhum campo foi preenchido por suposição; itens incertos ficaram vazios para revisão.`;
    }
  }

  if (typeof qbReadCaptureImportFile === "function") {
    const originalRead = qbReadCaptureImportFile;
    qbReadCaptureImportFile = async function strictCaptureReadV190(file) {
      const result = await originalRead.apply(this, arguments);
      decoratePreview();
      return result;
    };
  }
  if (typeof qbConfirmCaptureImport === "function") {
    const originalConfirm = qbConfirmCaptureImport;
    qbConfirmCaptureImport = function strictCaptureConfirmV190() {
      const rows = [...(elements.qbCapturePreviewList?.querySelectorAll("[data-qb-capture-row]") || [])].filter((row) => row.querySelector("[data-qb-capture-include]")?.checked);
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]; const type = row.querySelector("[data-qb-capture-type]")?.value || "";
        const alternatives = row.querySelector("[data-qb-capture-alternatives]")?.value || ""; const keys = parseAlternativeKeys(alternatives);
        if (!type) { qbShowCaptureValidation({ message: `Confirme se a questão ${index + 1} é de múltipla escolha ou Certo/Errado.`, row: { rowElement: row }, field: "[data-qb-capture-type]" }); return; }
        if (type === "multipla" && new Set(keys).size < 4) { qbShowCaptureValidation({ message: `A questão ${index + 1} está como múltipla escolha, mas menos de quatro alternativas foram confirmadas. Revise antes de salvar.`, row: { rowElement: row }, field: "[data-qb-capture-alternatives]" }); return; }
        if (type === "ce" && !(keys.includes("C") && keys.includes("E"))) { qbShowCaptureValidation({ message: `A questão ${index + 1} está como Certo/Errado, mas os itens C) Certo e E) Errado não foram confirmados.`, row: { rowElement: row }, field: "[data-qb-capture-alternatives]" }); return; }
      }
      return originalConfirm.apply(this, arguments);
    };
  }
  globalThis.__ALDUS_QC_CAPTURE_UI_STRICT_V190__ = Object.freeze({ version: VERSION });
})();
