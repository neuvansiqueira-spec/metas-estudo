(() => {
  "use strict";
  if (globalThis.__aldusCaptureQuestionPreviewV187) return;
  const api = globalThis.AldusQconcursosCaptureQuestionParserV187;
  if (!api) return;
  const NEW = "__aldus_capture_new_question_v187__";
  const esc = (value) => typeof escapeHTML === "function" ? escapeHTML(value) : String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const originalImporter = globalThis.AldusQconcursosCaptureImport;
  if (originalImporter?.readFile && !originalImporter.__fullQuestionV187) {
    globalThis.AldusQconcursosCaptureImport = Object.freeze({
      ...originalImporter,
      __fullQuestionV187: true,
      async readFile(file, options = {}) {
        const parsed = await originalImporter.readFile(file, options);
        const questions = options.questions || [];
        parsed.matches = (parsed.matches || []).map((match, index) => {
          const result = parsed.ocrResults?.[index] || {};
          const draft = api.parseQuestionSegment(result.segment || match.segment || "", { lines: result.segmentLines || [], comment: result.comment || match.comment || "", officialKey: result.officialKey || match.officialKey || "" });
          const exact = questions.find((question) => api.identity(question) === api.identity(draft));
          const strong = match.matchMethod === "texto" && Number(match.matchScore) >= 0.55;
          return { ...match, questionId: exact?.id || match.questionId || "", questionDraft: draft, createNewQuestion: Boolean(draft.extractionComplete && !exact && !strong) };
        });
        return parsed;
      }
    });
  }
  function fields(draft = {}) {
    const alternative = (key) => esc(draft.alternativas?.[key] || "");
    return `<details class="qb-capture-full-question-v187" open data-qb-capture-full-question-v187><summary><strong>Dados da questão que serão gravados no banco</strong></summary><p class="item-meta" data-qb-capture-storage-mode-v187></p><div class="form-grid compact">
      <label>Referência/código<input data-qb-full-field="referencia" value="${esc(draft.referencia || draft.qcCodigo || "")}" /></label>
      <label>Disciplina<input data-qb-full-field="disciplina" value="${esc(draft.disciplina || "")}" /></label><label>Assunto<input data-qb-full-field="assunto" value="${esc(draft.assunto || "")}" /></label><label>Tema<input data-qb-full-field="tema" value="${esc(draft.tema || "")}" /></label>
      <label>Banca<input data-qb-full-field="banca" value="${esc(draft.banca || "")}" /></label><label>Ano<input data-qb-full-field="ano" value="${esc(draft.ano || "")}" /></label><label>Órgão<input data-qb-full-field="orgao" value="${esc(draft.orgao || "")}" /></label><label>Cargo<input data-qb-full-field="cargo" value="${esc(draft.cargo || "")}" /></label>
      <label class="wide">Prova<input data-qb-full-field="prova" value="${esc(draft.prova || "")}" /></label><label class="wide">Enunciado<textarea data-qb-full-field="enunciado" rows="5">${esc(draft.enunciado || "")}</textarea></label>
      ${["A", "B", "C", "D", "E"].map((key) => `<label class="wide">Alternativa ${key}<textarea data-qb-full-field="alternativa-${key}" rows="2">${alternative(key)}</textarea></label>`).join("")}
    </div><p class="item-meta">Revise o OCR antes de confirmar. Valores vazios não apagam campos já existentes.</p></details>`;
  }
  function mode(row) {
    const select = row.querySelector("[data-qb-capture-question]"); const note = row.querySelector("[data-qb-capture-storage-mode-v187]"); if (!select || !note) return;
    note.textContent = select.value === NEW ? "Será criada uma nova questão completa no banco." : "A questão selecionada será enriquecida nos campos ausentes ou incompletos.";
  }
  function enhance() {
    if (!qbCaptureImportDraft || !elements.qbCapturePreviewList) return;
    [...elements.qbCapturePreviewList.querySelectorAll("[data-qb-capture-row]")].forEach((row) => {
      if (row.querySelector("[data-qb-capture-full-question-v187]")) return;
      const match = qbCaptureImportDraft.matches?.[Number(row.dataset.qbCaptureRow)] || {}; const select = row.querySelector("[data-qb-capture-question]");
      if (select) {
        const option = document.createElement("option"); option.value = NEW; option.textContent = "Criar nova questão com os dados da captura"; select.prepend(option);
        if (match.createNewQuestion || !match.questionId) select.value = NEW;
        select.addEventListener("change", () => mode(row));
      }
      row.insertAdjacentHTML("beforeend", fields(match.questionDraft || {})); mode(row);
    });
    const complete = (qbCaptureImportDraft.matches || []).filter((match) => match.questionDraft?.extractionComplete).length;
    elements.qbCaptureStatus.textContent = `Prévia pronta com ${qbCaptureImportDraft.matches?.length || 0} resultado(s). ${complete} questão(ões) possuem enunciado extraído para criação ou atualização no banco.`;
  }
  if (typeof qbRenderCapturePreview === "function" && !qbRenderCapturePreview.__fullQuestionV187) {
    const original = qbRenderCapturePreview;
    qbRenderCapturePreview = function qbRenderCapturePreviewFullV187() { const result = original.apply(this, arguments); enhance(); return result; };
    Object.defineProperty(qbRenderCapturePreview, "__fullQuestionV187", { value: true });
  }
  if (!document.getElementById("qbCaptureFullQuestionV187Styles")) {
    const style = document.createElement("style"); style.id = "qbCaptureFullQuestionV187Styles"; style.textContent = `.qb-capture-full-question-v187{margin-top:12px;border:1px solid rgba(82,145,187,.35);border-radius:12px;padding:10px 12px}.qb-capture-full-question-v187>summary{cursor:pointer}.qb-capture-full-question-v187 .form-grid{margin-top:10px}.qb-capture-full-question-v187 textarea{min-height:68px}.qb-capture-full-question-v187 [data-qb-full-field="enunciado"]{min-height:130px}`; document.head.appendChild(style);
  }
  globalThis.__aldusCaptureQuestionPreviewV187 = Object.freeze({ version: api.version, NEW, enhance });
})();
