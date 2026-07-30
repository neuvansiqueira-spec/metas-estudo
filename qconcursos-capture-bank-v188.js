(() => {
  "use strict";

  const VERSION = "20260730-cadastro-segmentado-captura-v188";
  const NEW_VALUE = "__new_question__";
  const FIELDS = [
    "disciplina", "assunto", "tema", "banca", "ano", "orgao", "cargo", "prova",
    "referencia", "enunciado", "alternativas", "comentarioQc"
  ];

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function first(...values) {
    return values.find((value) => String(value ?? "").trim()) ?? "";
  }

  function questionDraft(match = {}) {
    return match.questionDraft || qbCaptureImportDraft?.structuredQuestions?.[match.index] || {};
  }

  function alternativesText(alternatives = {}) {
    return Object.entries(alternatives || {})
      .filter(([key, value]) => /^[A-E]$/.test(key) && String(value).trim())
      .map(([key, value]) => `${key}) ${String(value).trim()}`)
      .join("\n");
  }

  function parseAlternatives(value) {
    const output = {};
    let current = "";
    String(value || "").split(/\r?\n/).forEach((line) => {
      const conventional = line.match(/^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i);
      const loose = line.match(/^\s*([A-E])\s+(.{3,})$/i);
      const match = conventional || loose;
      if (match) {
        current = match[1].toUpperCase();
        output[current] = (match[2] || "").trim();
      } else if (current && line.trim()) {
        output[current] = `${output[current]} ${line.trim()}`.trim();
      }
    });
    return output;
  }

  function questionOptions(selected = "") {
    const output = [
      `<option value="${NEW_VALUE}" ${!selected ? "selected" : ""}>Criar nova questão com os dados da captura</option>`
    ];
    (state.questionBank || []).slice()
      .sort((a, b) => `${a.disciplina} ${a.assunto} ${a.referencia}`.localeCompare(`${b.disciplina} ${b.assunto} ${b.referencia}`, "pt-BR"))
      .forEach((question) => {
        const label = [
          question.referencia || question.qcCodigo,
          question.disciplina,
          question.assunto,
          String(question.enunciado || "").slice(0, 80)
        ].filter(Boolean).join(" • ");
        output.push(`<option value="${escapeHTML(question.id)}" ${question.id === selected ? "selected" : ""}>${escapeHTML(label)}</option>`);
      });
    return output.join("");
  }

  function actionOptions(existing) {
    return existing
      ? '<option value="update" selected>Atualizar cadastro com os dados revisados</option><option value="result_only">Apenas registrar o resultado</option><option value="create">Criar como nova questão</option>'
      : '<option value="create" selected>Criar nova questão completa</option><option value="result_only">Apenas registrar resultado em questão existente</option>';
  }

  function fieldValue(match, existing, name) {
    const draft = questionDraft(match);
    if (name === "alternativas") return alternativesText(first(draft.alternativas, existing?.alternativas) || {});
    if (name === "comentarioQc") {
      return first(draft.comentarioQc, draft.justificativa, match.comment, existing?.comentarioQc, existing?.justificativa);
    }
    return first(draft[name], existing?.[name]);
  }

  function injectStyles() {
    if (document.getElementById("qbCaptureSegmentedStylesV188")) return;
    const style = document.createElement("style");
    style.id = "qbCaptureSegmentedStylesV188";
    style.textContent = `
      .qb-capture-row-v188 { display: grid; gap: 14px; }
      .qb-capture-row-v188 .qb-capture-full-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
      .qb-capture-row-v188 .wide { grid-column: 1 / -1; }
      .qb-capture-row-v188 details { border: 1px solid rgba(120, 167, 205, .28); border-radius: 12px; padding: 10px 12px; }
      .qb-capture-row-v188 details summary { cursor: pointer; font-weight: 800; }
      .qb-capture-row-v188 textarea[data-qb-capture-statement] { min-height: 130px; }
      .qb-capture-row-v188 textarea[data-qb-capture-alternatives] { min-height: 150px; font-family: ui-monospace, Consolas, monospace; }
      .qb-capture-row-v188 .qb-ocr-confidence { font-size: .82rem; color: var(--muted, #9fb5c7); }
      .qb-capture-row-v188 .qb-community-comment-note { margin: 0; color: var(--success, #7dd3a7); font-size: .83rem; font-weight: 700; }
      .qb-capture-row-v188[data-review-required="true"] { outline: 2px solid rgba(245, 158, 11, .55); outline-offset: 2px; }
      @media (max-width: 850px) { .qb-capture-row-v188 .qb-capture-full-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .qb-capture-row-v188 .qb-capture-full-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function renderCapturePreviewV188() {
    if (!qbCaptureImportDraft || !elements.qbCapturePreview) return;
    injectStyles();
    const matches = qbCaptureImportDraft.matches || [];
    const newCount = matches.filter((match) => !match.questionId).length;
    const detailed = matches.filter((match) => String(questionDraft(match).enunciado || "").trim()).length;
    const textMatches = matches.filter((match) => match.matchMethod === "texto").length;
    const ignoredCommunityComments = Number(qbCaptureImportDraft.ignoredCommunityComments) || 0;

    elements.qbCapturePreview.hidden = false;
    elements.qbCaptureStats.innerHTML = [
      ["Dimensões", `${qbCaptureImportDraft.width} × ${qbCaptureImportDraft.height}`],
      ["Cartões separados", qbCaptureImportDraft.cardCount || matches.length],
      ["Questões identificadas", matches.length],
      ["Cadastros novos sugeridos", newCount],
      ["Enunciados extraídos", detailed],
      ["Vínculos existentes", textMatches],
      ["Comentários de usuários ignorados", ignoredCommunityComments]
    ].map(([label, value]) => `<article class="qb-pdf-import-stat"><span>${label}</span><strong>${escapeHTML(value)}</strong></article>`).join("");

    elements.qbCapturePreviewList.innerHTML = matches.map((match, index) => {
      const existing = qbQuestionById(match.questionId);
      const draft = questionDraft(match);
      const type = match.detectedType || draft.tipo || qbCaptureSuggestedType(existing, match);
      const confidence = Number(draft.confidence || 0);
      const review = Boolean(draft.reviewRequired || !draft.enunciado || !draft.disciplina || !draft.assunto);
      const communityNote = draft.ignoredCommunityComments
        ? '<p class="qb-community-comment-note">O painel “Comentários” continha mensagens de usuários e foi excluído do cadastro desta questão.</p>'
        : "";
      return `<article class="qb-capture-row qb-capture-row-v188" data-qb-capture-row="${index}" data-qb-capture-option-count="${Number(match.optionCount) || 0}" data-review-required="${review}">
        <div class="qb-capture-row-heading">
          <label class="qb-check"><input type="checkbox" data-qb-capture-include checked /> Incluir questão ${index + 1}</label>
          <span class="badge ${review ? "warning" : "neutral"}">${review ? "Revisar campos" : "Cartão separado"}</span>
        </div>
        <div class="qb-capture-row-grid">
          <label>Questão correspondente ou nova<select data-qb-capture-question>${questionOptions(match.questionId)}</select></label>
          <label>Ação no banco<select data-qb-capture-action>${actionOptions(Boolean(existing))}</select></label>
          <label>Tipo confirmado<select data-qb-capture-type>${qbCaptureTypeOptions(type || "ce")}</select></label>
          <label>Resposta marcada<select data-qb-capture-marked>${qbCaptureAnswerOptions(match.marked)}</select></label>
          <label>Gabarito<select data-qb-capture-key>${qbCaptureAnswerOptions(match.officialKey, false)}</select></label>
          <label>Resultado<select data-qb-capture-status>${qbCaptureStatusOptions(match.status)}</select></label>
        </div>
        <details open>
          <summary>Cadastro completo da questão</summary>
          <p class="qb-ocr-confidence">Confiança dos campos: ${confidence}% — cada cartão foi lido separadamente. Corrija somente o que ainda estiver incorreto.</p>
          ${communityNote}
          <div class="qb-capture-full-grid">
            <label>Disciplina<input data-qb-capture-field="disciplina" value="${escapeHTML(fieldValue(match, existing, "disciplina"))}" /></label>
            <label>Assunto<input data-qb-capture-field="assunto" value="${escapeHTML(fieldValue(match, existing, "assunto"))}" /></label>
            <label>Tema/Subassunto<input data-qb-capture-field="tema" value="${escapeHTML(fieldValue(match, existing, "tema"))}" /></label>
            <label>Banca<input data-qb-capture-field="banca" value="${escapeHTML(fieldValue(match, existing, "banca"))}" /></label>
            <label>Ano<input data-qb-capture-field="ano" value="${escapeHTML(fieldValue(match, existing, "ano"))}" /></label>
            <label>Órgão<input data-qb-capture-field="orgao" value="${escapeHTML(fieldValue(match, existing, "orgao"))}" /></label>
            <label>Cargo<input data-qb-capture-field="cargo" value="${escapeHTML(fieldValue(match, existing, "cargo"))}" /></label>
            <label>Prova<input data-qb-capture-field="prova" value="${escapeHTML(fieldValue(match, existing, "prova"))}" /></label>
            <label>Referência/Código QC<input data-qb-capture-field="referencia" value="${escapeHTML(fieldValue(match, existing, "referencia"))}" /></label>
            <label class="wide">Enunciado<textarea data-qb-capture-statement data-qb-capture-field="enunciado">${escapeHTML(fieldValue(match, existing, "enunciado"))}</textarea></label>
            <label class="wide">Alternativas — uma por linha, no formato A) texto<textarea data-qb-capture-alternatives data-qb-capture-field="alternativas">${escapeHTML(fieldValue(match, existing, "alternativas"))}</textarea></label>
            <label class="wide">Comentário oficial, justificativa ou fundamento<textarea data-qb-capture-comment data-qb-capture-field="comentarioQc">${escapeHTML(fieldValue(match, existing, "comentarioQc"))}</textarea></label>
          </div>
        </details>
      </article>`;
    }).join("");

    const warning = qbCaptureImportDraft.ocrError ? ` A leitura ficou parcial: ${qbCaptureImportDraft.ocrError}` : "";
    const ignored = ignoredCommunityComments
      ? ` ${ignoredCommunityComments} painel(is) de comentários de usuários foram ignorados para não contaminar as questões.`
      : "";
    elements.qbCaptureStatus.textContent = `Prévia pronta com ${matches.length} questão(ões) separadas em cartões. Revise os campos destacados antes de cadastrar.${ignored}${warning}`;
    qbSetCaptureProgress(1);
  }

  function taxonomyForImport(questions) {
    const source = [
      ...(state.syllabusItems || []),
      ...(questions || [])
    ];
    const unique = new Map();
    source.forEach((item) => {
      const discipline = String(item.discipline || item.disciplina || "").trim();
      const subject = String(item.subject || item.assunto || item.topic || "").trim();
      const theme = String(item.theme || item.tema || item.subtopic || item.subassunto || "").trim();
      const key = `${canonical(discipline)}|${canonical(subject)}|${canonical(theme)}`;
      if ((discipline || subject) && !unique.has(key)) unique.set(key, { discipline, subject, theme });
    });
    return [...unique.values()];
  }

  async function readCaptureImportFileV188(file) {
    if (!file) return;
    qbResetCaptureImport("Localizando e separando os cartões de questão…");
    try {
      const importer = globalThis.AldusQconcursosCaptureImport;
      if (!importer?.readFile) throw new Error("O leitor segmentado de captura não foi carregado.");
      const filtered = qbFilteredQuestions();
      const questions = filtered.length ? filtered : (state.questionBank || []);
      const existingFingerprints = new Set((state.questionBankSessions || []).map((session) => session.sourceFingerprint).filter(Boolean));
      qbSetCaptureProgress(0.02, "Localizando os cabeçalhos Q... de cada cartão…");
      const parsed = await importer.readFile(file, {
        questions,
        knownTaxonomy: taxonomyForImport(questions),
        existingFingerprints,
        onProgress(message = {}) {
          const progress = Math.max(0.03, Number(message.progress) || 0);
          qbSetCaptureProgress(progress, `${message.status || "Reconhecendo cartão"}… ${Math.round(progress * 100)}%`);
        }
      });
      qbCaptureImportDraft = { ...parsed, fileName: file.name };
      renderCapturePreviewV188();
    } catch (error) {
      qbResetCaptureImport(`Erro ao ler a captura: ${error.message}`);
    }
  }

  function collectFields(row) {
    const fields = {};
    FIELDS.forEach((name) => {
      fields[name] = row.querySelector(`[data-qb-capture-field="${name}"]`)?.value?.trim?.() || "";
    });
    fields.alternativas = parseAlternatives(fields.alternativas);
    return fields;
  }

  function captureRowsV188() {
    return [...(elements.qbCapturePreviewList?.querySelectorAll("[data-qb-capture-row]") || [])]
      .filter((row) => row.querySelector("[data-qb-capture-include]")?.checked)
      .map((row) => {
        const displayIndex = Number(row.dataset.qbCaptureRow) + 1;
        const selectedId = row.querySelector("[data-qb-capture-question]")?.value || "";
        const question = selectedId && selectedId !== NEW_VALUE ? qbQuestionById(selectedId) : null;
        return {
          displayIndex,
          rowElement: row,
          questionId: question?.id || "",
          question,
          action: row.querySelector("[data-qb-capture-action]")?.value || "create",
          marked: row.querySelector("[data-qb-capture-marked]")?.value || "",
          officialKey: row.querySelector("[data-qb-capture-key]")?.value || "",
          status: row.querySelector("[data-qb-capture-status]")?.value || "revisar",
          questionType: row.querySelector("[data-qb-capture-type]")?.value || "ce",
          comment: row.querySelector("[data-qb-capture-comment]")?.value.trim() || "",
          fields: collectFields(row)
        };
      });
  }

  function validateCaptureRowsV188(rows) {
    if (!rows.length) return { message: "Selecione ao menos uma questão para registrar." };
    for (const row of rows) {
      if (row.action === "result_only" && !row.question) {
        return { message: `Selecione uma questão existente para registrar apenas o resultado ${row.displayIndex}.`, row, field: "[data-qb-capture-question]" };
      }
      if (row.action !== "result_only") {
        if (!row.fields.disciplina) return { message: `Informe a disciplina da questão ${row.displayIndex}.`, row, field: '[data-qb-capture-field="disciplina"]' };
        if (!row.fields.assunto) return { message: `Informe o assunto da questão ${row.displayIndex}.`, row, field: '[data-qb-capture-field="assunto"]' };
        if (!row.fields.enunciado) return { message: `Revise e informe o enunciado da questão ${row.displayIndex}.`, row, field: '[data-qb-capture-field="enunciado"]' };
      }
      if (row.status === "revisar") return { message: `Revise a situação da questão ${row.displayIndex} antes de salvar.`, row, field: "[data-qb-capture-status]" };
      const choices = row.questionType === "multipla" ? ["A", "B", "C", "D", "E"] : ["C", "E"];
      if (row.marked && row.marked !== QB_MARK_BLANK && !choices.includes(row.marked)) {
        return { message: `A resposta marcada na questão ${row.displayIndex} não corresponde ao tipo.`, row, field: "[data-qb-capture-marked]" };
      }
      if (row.officialKey && !choices.includes(row.officialKey)) {
        return { message: `O gabarito da questão ${row.displayIndex} não corresponde ao tipo.`, row, field: "[data-qb-capture-key]" };
      }
      if (["certo", "errado"].includes(row.status) && (!row.marked || row.marked === QB_MARK_BLANK || !row.officialKey)) {
        return { message: `Informe resposta e gabarito na questão ${row.displayIndex}.`, row, field: "[data-qb-capture-key]" };
      }
      if (row.status === "certo" && row.marked !== row.officialKey) {
        return { message: `Na questão ${row.displayIndex}, o resultado está como certo, mas resposta e gabarito são diferentes.`, row, field: "[data-qb-capture-key]" };
      }
      if (row.status === "errado" && row.marked === row.officialKey) {
        return { message: `Na questão ${row.displayIndex}, o resultado está como errado, mas resposta e gabarito são iguais.`, row, field: "[data-qb-capture-status]" };
      }
    }
    return null;
  }

  function duplicateQuestion(fields) {
    const reference = canonical(fields.referencia);
    const statement = canonical(fields.enunciado).slice(0, 420);
    const board = canonical(fields.banca);
    const year = canonical(fields.ano);
    return (state.questionBank || []).find((question) => {
      const questionReference = canonical(question.referencia || question.qcCodigo || question.id);
      if (reference && questionReference && reference === questionReference) return true;
      const questionStatement = canonical(question.enunciado).slice(0, 420);
      return statement.length > 80
        && questionStatement === statement
        && (!board || canonical(question.banca) === board)
        && (!year || canonical(question.ano) === year);
    }) || null;
  }

  function uniqueQuestionId(fields) {
    const preferred = String(fields.referencia || "").trim();
    if (preferred && !(state.questionBank || []).some((question) => question.id === preferred)) return preferred;
    return `qb-capture-${createId()}`;
  }

  function normalizedQuestion(row, id) {
    return normalizeQuestionBankItem({
      id,
      ...row.fields,
      tipo: qbCaptureTypeLabel(row.questionType),
      gabarito: row.officialKey,
      justificativa: row.comment,
      fundamento: row.comment,
      comentarioQc: row.comment,
      fonte: "QConcursos — captura segmentada",
      arquivoFonte: qbCaptureImportDraft.fileName,
      capturaFonte: qbCaptureImportDraft.fileName,
      qcCodigo: row.fields.referencia,
      importadoPor: "captura-segmentada-v188",
      importadoEm: new Date().toISOString()
    }, 0);
  }

  function applyQuestionUpdate(existing, incoming) {
    [
      "disciplina", "assunto", "tema", "syllabusItemId", "banca", "ano", "orgao", "cargo", "prova",
      "referencia", "tipo", "enunciado", "gabarito", "justificativa", "fundamento", "comentarioQc",
      "observacoes", "fonte", "arquivoFonte", "capturaFonte", "qcCodigo"
    ].forEach((key) => {
      const value = incoming[key];
      if (value !== undefined && value !== null && (typeof value !== "string" || value.trim())) existing[key] = value;
    });
    if (Object.keys(incoming.alternativas || {}).length) existing.alternativas = incoming.alternativas;
    existing.importadoPor = "captura-segmentada-v188";
    existing.importadoEm = new Date().toISOString();
    return existing;
  }

  function confirmCaptureImportV188() {
    if (!qbCaptureImportDraft) return;
    if ((state.questionBankSessions || []).some((session) => session.sourceFingerprint === qbCaptureImportDraft.fingerprint)) {
      qbResetCaptureImport("Esta captura já foi registrada anteriormente.");
      return;
    }

    const rows = captureRowsV188();
    const validationIssue = validateCaptureRowsV188(rows);
    if (validationIssue) {
      qbShowCaptureValidation(validationIssue);
      return;
    }

    state.questionBank ||= [];
    let created = 0;
    let updated = 0;
    let resultOnly = 0;
    const enriched = [];

    rows.forEach((row) => {
      let bankQuestion = row.question || duplicateQuestion(row.fields);
      if (row.action === "result_only") {
        resultOnly += 1;
      } else if (bankQuestion) {
        applyQuestionUpdate(bankQuestion, normalizedQuestion(row, bankQuestion.id));
        updated += 1;
      } else {
        bankQuestion = normalizedQuestion(row, uniqueQuestionId(row.fields));
        state.questionBank.push(bankQuestion);
        created += 1;
      }

      if (!bankQuestion) return;
      const marked = row.status === "branco" ? QB_MARK_BLANK : row.marked;
      enriched.push({
        ...bankQuestion,
        tipo: qbCaptureTypeLabel(row.questionType),
        marcado: marked,
        gabarito: row.officialKey || bankQuestion.gabarito || "",
        status: row.status,
        comentarioQc: row.comment || bankQuestion.comentarioQc || "",
        capturaFonte: qbCaptureImportDraft.fileName
      });
    });

    const summary = qbCaptureSummary(enriched);
    const session = {
      id: createId(),
      createdAt: qbCaptureCreatedAt(elements.qbCaptureDate?.value),
      origin: "qconcursos-captura-segmentada",
      arquivoFonte: qbCaptureImportDraft.fileName,
      sourceFingerprint: qbCaptureImportDraft.fingerprint,
      captureImporterVersion: VERSION,
      cardCount: qbCaptureImportDraft.cardCount || enriched.length,
      ignoredCommunityComments: qbCaptureImportDraft.ignoredCommunityComments || 0,
      hasAnyKey: enriched.some(qbHasKey),
      hasCebraspeNet: enriched.some((item) => qbHasKey(item) && !qbIsMultipleChoice(item)),
      summary,
      items: enriched.map((item) => ({
        id: item.id,
        syllabusItemId: item.syllabusItemId || resolvePlanningEvidenceItemIdV155(state, item),
        disciplina: item.disciplina,
        assunto: item.assunto,
        tema: item.tema,
        banca: item.banca,
        ano: item.ano,
        orgao: item.orgao,
        cargo: item.cargo,
        prova: item.prova,
        referencia: item.referencia,
        tipo: item.tipo,
        enunciado: item.enunciado,
        alternativas: item.alternativas,
        marcado: item.marcado,
        gabarito: item.gabarito,
        status: item.status,
        comentarioQc: item.comentarioQc,
        justificativa: qbExplanationText(item),
        fundamento: qbExplanationText(item)
      }))
    };

    state.questionBankSessions.unshift(session);
    qbSaveNotebookItems(enriched.filter((item) => item.status === "errado" || item.status === "branco"));
    saveData();
    renderQuestionBank();
    qbRenderResult(session);
    elements.qbTrainingPanel.hidden = true;
    elements.qbResultPanel.hidden = false;
    const message = `${summary.total} resultado(s): ${created} questão(ões) criada(s), ${updated} atualizada(s) e ${resultOnly} apenas vinculada(s).`;
    qbResetCaptureImport(message);
    if (elements.qbMessage) elements.qbMessage.textContent = message;
  }

  function bindSelectionBehavior() {
    if (!elements.qbCapturePreviewList || elements.qbCapturePreviewList.dataset.qbSegmentedBindingV188 === "true") return;
    elements.qbCapturePreviewList.dataset.qbSegmentedBindingV188 = "true";
    elements.qbCapturePreviewList.addEventListener("change", (event) => {
      if (!event.target.matches?.("[data-qb-capture-question]")) return;
      const row = event.target.closest("[data-qb-capture-row]");
      const action = row?.querySelector("[data-qb-capture-action]");
      if (action) action.value = event.target.value && event.target.value !== NEW_VALUE ? "update" : "create";
    });
  }

  qbReadCaptureImportFile = readCaptureImportFileV188;
  qbRenderCapturePreview = renderCapturePreviewV188;
  qbCaptureRowsForConfirmation = captureRowsV188;
  qbValidateCaptureRows = validateCaptureRowsV188;
  qbConfirmCaptureImport = confirmCaptureImportV188;
  bindSelectionBehavior();

  globalThis.__ALDUS_QC_CAPTURE_BANK_V188__ = Object.freeze({
    version: VERSION,
    render: renderCapturePreviewV188,
    read: readCaptureImportFileV188,
    confirm: confirmCaptureImportV188
  });
})();
