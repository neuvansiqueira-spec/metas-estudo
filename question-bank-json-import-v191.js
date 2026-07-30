(() => {
  "use strict";

  const VERSION = "20260730-importacao-json-completa-qconcursos-v191";
  const SCHEMA = "metas-estudo-question-bank-v1";
  const BLANK_MARK = typeof QB_MARK_BLANK !== "undefined" ? QB_MARK_BLANK : "__blank__";

  if (globalThis.__ALDUS_QB_JSON_IMPORT_V191__) return;

  function own(object, key) {
    return Boolean(object && Object.prototype.hasOwnProperty.call(object, key));
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (value !== null && value !== undefined && typeof value !== "string") return value;
    }
    return "";
  }

  function canonicalJson(value) {
    if (typeof canonical === "function") return canonical(value);
    return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function normalizeAnswerJson(value) {
    if (typeof normalizeQuestionBankAnswer === "function") return normalizeQuestionBankAnswer(value);
    if (value === true) return "C";
    if (value === false) return "E";
    const raw = canonicalJson(value).replace(/[^a-z]/g, "");
    if (["c", "certo", "correto", "verdadeiro", "v"].includes(raw)) return "C";
    if (["e", "errado", "incorreto", "falso", "f"].includes(raw)) return "E";
    return /^[abcde]$/.test(raw) ? raw.toUpperCase() : "";
  }

  function normalizeStringArray(value) {
    const source = Array.isArray(value) ? value : (text(value) ? text(value).split(/\s*;\s*/) : []);
    return [...new Set(source.map(text).filter(Boolean))];
  }

  function hasPerformanceEvidence(raw = {}) {
    return ["resposta_marcada", "respostaMarcada", "marcado", "userAnswer", "resposta_usuario", "resultado", "status_resultado", "acertou", "nao_respondida", "não_respondida"]
      .some((key) => own(raw, key));
  }

  function resultStatus(raw = {}) {
    const result = canonicalJson(firstNonEmpty(raw.resultado, raw.status_resultado, raw.statusResultado, raw.status));
    if (result.includes("nao respond") || result.includes("em branco") || result === "branco") return "branco";
    if (result.includes("duvida") || result.includes("revisar")) return "duvida";
    if (result.includes("errad") || result.includes("incorret")) return "errado";
    if (result.includes("cert") || result.includes("corret") || result.includes("acert")) return "certo";
    if (raw.acertou === true) return "certo";
    if (raw.acertou === false) return "errado";
    if (raw.nao_respondida === true || raw["não_respondida"] === true) return "branco";
    const marked = normalizeAnswerJson(firstNonEmpty(raw.resposta_marcada, raw.respostaMarcada, raw.marcado, raw.userAnswer, raw.resposta_usuario, raw.resposta));
    const key = normalizeAnswerJson(firstNonEmpty(raw.gabarito, raw.resposta_correta, raw.correctAnswer, raw.answerKey));
    if (marked && key) return marked === key ? "certo" : "errado";
    if (!marked && hasPerformanceEvidence(raw)) return "branco";
    return "";
  }

  function importedMarkedAnswer(raw = {}, status = resultStatus(raw)) {
    if (status === "branco") return BLANK_MARK;
    return normalizeAnswerJson(firstNonEmpty(raw.resposta_marcada, raw.respostaMarcada, raw.marcado, raw.userAnswer, raw.resposta_usuario, raw.resposta));
  }

  function importedCorrectAnswer(raw = {}) {
    const explicit = firstNonEmpty(raw.gabarito, raw.resposta_correta, raw.correctAnswer, raw.answerKey);
    if (text(explicit)) return normalizeAnswerJson(explicit);
    return hasPerformanceEvidence(raw) ? "" : normalizeAnswerJson(raw.resposta);
  }

  function meaningful(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  }

  function mergeMeaningful(existing = {}, incoming = {}) {
    const merged = { ...existing };
    Object.entries(incoming).forEach(([key, value]) => {
      if (!meaningful(value)) return;
      if (Array.isArray(value)) {
        merged[key] = value.slice();
        return;
      }
      if (value && typeof value === "object" && !Array.isArray(value) && existing[key] && typeof existing[key] === "object" && !Array.isArray(existing[key])) {
        merged[key] = { ...existing[key], ...value };
        return;
      }
      merged[key] = value;
    });
    return merged;
  }

  function questionIdentifiers(question = {}) {
    return new Set([
      question.id,
      question.numero_qconcursos,
      question.numeroQconcursos,
      question.qcCodigo,
      question.codigoQc,
      question.referencia,
      question.reference,
      question.codigo
    ].map(canonicalJson).filter(Boolean));
  }

  function questionStatementKey(question = {}) {
    const statement = canonicalJson(firstNonEmpty(question.enunciado, question.statement, question.texto, question.question));
    if (!statement) return "";
    return `${statement}|${canonicalJson(firstNonEmpty(question.banca, question.board))}|${text(firstNonEmpty(question.ano, question.year))}`;
  }

  function explanationFromRaw(raw = {}) {
    return text(firstNonEmpty(raw.justificativa, raw.fundamento, raw.comentario, raw["comentário"], raw.comentarioQc, raw.explanation, raw.notes));
  }

  function normalizeImportedQuestion(raw = {}, index = 0) {
    const performance = hasPerformanceEvidence(raw);
    const qcNumber = text(firstNonEmpty(raw.numero_qconcursos, raw.numeroQconcursos, raw.qcCodigo, raw.codigoQc, raw.referencia, raw.id));
    const prepared = {
      ...raw,
      id: text(raw.id || qcNumber) || `qb-json-${index + 1}`,
      referencia: text(raw.referencia || qcNumber),
      qcCodigo: text(raw.qcCodigo || raw.codigoQc || qcNumber),
      gabarito: importedCorrectAnswer(raw)
    };
    const base = typeof normalizeQuestionBankItem === "function"
      ? normalizeQuestionBankItem(prepared, index)
      : {
          id: prepared.id,
          disciplina: text(firstNonEmpty(raw.disciplina, raw.discipline)) || "Sem disciplina",
          assunto: text(firstNonEmpty(raw.assunto, raw.subject, raw.topico, raw.topic)) || "Sem assunto",
          tema: text(firstNonEmpty(raw.tema, raw.theme, raw.subassunto, raw.subtopic)) || "Geral",
          banca: text(firstNonEmpty(raw.banca, raw.board)),
          ano: firstNonEmpty(raw.ano, raw.year),
          orgao: text(firstNonEmpty(raw.orgao, raw.agency)),
          cargo: text(firstNonEmpty(raw.cargo, raw.role)),
          prova: text(firstNonEmpty(raw.prova, raw.exam)),
          referencia: prepared.referencia,
          tipo: text(firstNonEmpty(raw.tipo, raw.type)) || (Object.keys(raw.alternativas || {}).length ? "Múltipla escolha" : "Certo/Errado"),
          enunciado: text(firstNonEmpty(raw.enunciado, raw.statement, raw.texto, raw.question)),
          alternativas: raw.alternativas || {},
          gabarito: prepared.gabarito,
          tags: Array.isArray(raw.tags) ? raw.tags : []
        };
    const explanation = explanationFromRaw(raw);
    const assuntos = normalizeStringArray(raw.assuntos || raw.assunto || raw.subject);
    const eliminated = normalizeStringArray(raw.alternativas_eliminadas || raw.alternativasEliminadas);
    const normalized = {
      ...raw,
      ...base,
      id: text(base.id || prepared.id),
      referencia: text(base.referencia || prepared.referencia),
      qcCodigo: text(base.qcCodigo || prepared.qcCodigo),
      numero_qconcursos: text(raw.numero_qconcursos || qcNumber),
      numeroQconcursos: text(raw.numeroQconcursos || raw.numero_qconcursos || qcNumber),
      assuntos,
      alternativas_eliminadas: eliminated,
      alternativasEliminadas: eliminated,
      revisao_manual: raw.revisao_manual === true,
      revisaoManual: raw.revisaoManual === true || raw.revisao_manual === true,
      origem_tipo: text(firstNonEmpty(raw.origem_tipo, raw.origemTipo)),
      origemTipo: text(firstNonEmpty(raw.origemTipo, raw.origem_tipo)),
      resposta_marcada: performance ? importedMarkedAnswer(raw) : text(raw.resposta_marcada),
      respostaMarcada: performance ? importedMarkedAnswer(raw) : text(raw.respostaMarcada),
      resultado: text(raw.resultado),
      acertou: typeof raw.acertou === "boolean" ? raw.acertou : null,
      comentario: text(firstNonEmpty(raw.comentario, raw["comentário"])),
      comentarioQc: text(firstNonEmpty(raw.comentarioQc, raw.comentario, raw["comentário"])),
      justificativa: explanation,
      fundamento: text(firstNonEmpty(raw.fundamento, raw.justificativa, raw.comentario, raw["comentário"])) || explanation,
      observacoes: text(firstNonEmpty(raw.observacoes, raw.observations)),
      schemaImportacao: SCHEMA
    };
    normalized.gabarito = importedCorrectAnswer(raw) || text(base.gabarito);
    if (!text(firstNonEmpty(raw.disciplina, raw.discipline))) normalized.disciplina = text(base.disciplina);
    if (!text(firstNonEmpty(raw.assunto, raw.subject, raw.topico, raw.topic))) normalized.assunto = text(base.assunto);
    return normalized;
  }

  function findExistingQuestionIndex(bank = [], incoming = {}) {
    const incomingIds = questionIdentifiers(incoming);
    if (incomingIds.size) {
      const byId = bank.findIndex((question) => [...questionIdentifiers(question)].some((id) => incomingIds.has(id)));
      if (byId >= 0) return byId;
    }
    const statementKey = questionStatementKey(incoming);
    return statementKey ? bank.findIndex((question) => questionStatementKey(question) === statementKey) : -1;
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function importFingerprint(payload = {}, performanceRows = []) {
    const metadata = payload.metadata || {};
    const source = [payload.schema || SCHEMA, metadata.arquivo_origem, metadata.titulo, metadata.data_conversao]
      .map(text).join("|");
    const rows = performanceRows.map(({ raw, question }) => [
      [...questionIdentifiers(question)].sort().join(","),
      importedMarkedAnswer(raw),
      importedCorrectAnswer(raw),
      resultStatus(raw)
    ].join(":"));
    return `qconcursos-json-${fnv1a(`${source}|${rows.sort().join("|")}`)}`;
  }

  function sessionItem(question, raw) {
    const marked = importedMarkedAnswer(raw);
    const key = importedCorrectAnswer(raw) || text(question.gabarito);
    const explicitStatus = resultStatus(raw);
    let status = explicitStatus;
    if (!status) status = marked === BLANK_MARK ? "branco" : (marked && key ? (marked === key ? "certo" : "errado") : "sem gabarito");
    const explanation = explanationFromRaw(raw);
    return {
      id: question.id,
      syllabusItemId: question.syllabusItemId || "",
      disciplina: question.disciplina,
      assunto: question.assunto,
      assuntos: normalizeStringArray(question.assuntos || question.assunto),
      tema: question.tema,
      banca: question.banca,
      ano: question.ano,
      orgao: question.orgao || "",
      cargo: question.cargo || "",
      prova: question.prova || "",
      referencia: question.referencia || "",
      qcCodigo: question.qcCodigo || "",
      numero_qconcursos: question.numero_qconcursos || "",
      tipo: question.tipo,
      enunciado: question.enunciado,
      alternativas: question.alternativas || {},
      alternativas_eliminadas: normalizeStringArray(raw.alternativas_eliminadas || raw.alternativasEliminadas),
      marcado: marked,
      resposta_marcada: marked,
      gabarito: key,
      status,
      resultadoOriginal: text(raw.resultado),
      acertou: typeof raw.acertou === "boolean" ? raw.acertou : null,
      revisao_manual: raw.revisao_manual === true,
      justificativa: explanation,
      fundamento: text(firstNonEmpty(raw.fundamento, raw.justificativa, raw.comentario, raw["comentário"])) || explanation,
      observacoes: text(firstNonEmpty(raw.observacoes, raw.observations)),
      tags: Array.isArray(question.tags) ? question.tags.slice() : [],
      fonte: text(firstNonEmpty(question.fonte, raw.fonte, "QConcursos"))
    };
  }

  function summarizeSession(items = []) {
    const summary = { total: items.length, correct: 0, wrong: 0, blank: 0, doubt: 0, ceCorrect: 0, ceWrong: 0 };
    items.forEach((item) => {
      if (item.status === "certo") summary.correct += 1;
      else if (item.status === "errado") summary.wrong += 1;
      else if (item.status === "branco") summary.blank += 1;
      else if (item.status === "duvida") summary.doubt += 1;
      const isMultiple = Object.keys(item.alternativas || {}).length >= 2 || canonicalJson(item.tipo).includes("multipla escolha");
      if (!isMultiple && item.status === "certo") summary.ceCorrect += 1;
      if (!isMultiple && item.status === "errado") summary.ceWrong += 1;
    });
    summary.net = summary.ceCorrect - summary.ceWrong;
    summary.accuracyPct = summary.correct + summary.wrong ? Math.round(summary.correct / (summary.correct + summary.wrong) * 100) : 0;
    return summary;
  }

  function buildImportPlan(payload = {}, currentBank = [], currentSessions = []) {
    const source = Array.isArray(payload) ? payload : (payload.questionBank || payload.questoes || payload.questions || payload.items || []);
    if (!Array.isArray(source)) throw new Error("O JSON não contém uma lista de questões reconhecida.");
    const bank = currentBank.map((question) => ({ ...question }));
    const uniqueIncoming = [];
    source.forEach((raw, index) => {
      const normalized = normalizeImportedQuestion(raw, index);
      if (!text(normalized.enunciado)) return;
      const duplicate = findExistingQuestionIndex(uniqueIncoming.map((entry) => entry.question), normalized);
      if (duplicate >= 0) {
        uniqueIncoming[duplicate] = { raw: mergeMeaningful(uniqueIncoming[duplicate].raw, raw), question: mergeMeaningful(uniqueIncoming[duplicate].question, normalized) };
      } else uniqueIncoming.push({ raw, question: normalized });
    });
    if (!uniqueIncoming.length) throw new Error("Nenhuma questão válida encontrada no JSON.");

    const counts = { read: uniqueIncoming.length, created: 0, updated: 0, unchanged: 0, results: 0, correct: 0, wrong: 0, blank: 0, doubt: 0 };
    const performanceRows = [];
    uniqueIncoming.forEach(({ raw, question }) => {
      const existingIndex = findExistingQuestionIndex(bank, question);
      let storedQuestion;
      if (existingIndex >= 0) {
        const existing = bank[existingIndex];
        storedQuestion = mergeMeaningful(existing, question);
        storedQuestion.id = existing.id || question.id;
        if (JSON.stringify(storedQuestion) === JSON.stringify(existing)) counts.unchanged += 1;
        else { bank[existingIndex] = storedQuestion; counts.updated += 1; }
      } else {
        storedQuestion = question;
        bank.push(storedQuestion);
        counts.created += 1;
      }
      if (hasPerformanceEvidence(raw)) {
        performanceRows.push({ raw, question: storedQuestion });
        counts.results += 1;
        const status = resultStatus(raw);
        if (status === "certo") counts.correct += 1;
        else if (status === "errado") counts.wrong += 1;
        else if (status === "branco") counts.blank += 1;
        else if (status === "duvida") counts.doubt += 1;
      }
    });

    const fingerprint = performanceRows.length ? importFingerprint(payload, performanceRows) : "";
    const duplicateSession = Boolean(fingerprint && currentSessions.some((session) => session.importFingerprint === fingerprint || session.id === fingerprint));
    let session = null;
    let notebookItems = [];
    if (performanceRows.length && !duplicateSession) {
      const items = performanceRows.map(({ raw, question }) => sessionItem(question, raw));
      const summary = summarizeSession(items);
      session = {
        id: fingerprint,
        createdAt: new Date().toISOString(),
        source: "qconcursos-json",
        sourceType: "qconcursos-json",
        schema: payload.schema || SCHEMA,
        importFingerprint: fingerprint,
        importMetadata: payload.metadata && typeof payload.metadata === "object" ? { ...payload.metadata } : {},
        hasAnyKey: items.some((item) => Boolean(item.gabarito)),
        hasCebraspeNet: items.some((item) => item.gabarito && !(Object.keys(item.alternativas || {}).length >= 2 || canonicalJson(item.tipo).includes("multipla escolha"))),
        summary,
        items
      };
      notebookItems = items.filter((item) => ["errado", "branco", "duvida"].includes(item.status));
    }
    return { bank, session, notebookItems, duplicateSession, fingerprint, counts };
  }

  function previewMessage(plan, fileName = "arquivo JSON") {
    const lines = [
      `Importação de ${fileName}:`,
      `• ${plan.counts.read} questão(ões) válida(s) lida(s)`,
      `• ${plan.counts.created} nova(s), ${plan.counts.updated} atualizada(s) e ${plan.counts.unchanged} sem alteração`,
      `• ${plan.counts.results} resultado(s): ${plan.counts.correct} certa(s), ${plan.counts.wrong} errada(s), ${plan.counts.blank} em branco e ${plan.counts.doubt} em dúvida`
    ];
    if (plan.duplicateSession) lines.push("• O desempenho deste mesmo arquivo já foi importado e não será duplicado.");
    else if (plan.session) lines.push(`• Será criado 1 histórico de desempenho e ${plan.notebookItems.length} registro(s) serão encaminhados ao Caderno de Erros.`);
    else lines.push("• O arquivo abastecerá somente o Banco de Questões; nenhum desempenho foi identificado.");
    lines.push("\nConfirmar a importação?");
    return lines.join("\n");
  }

  async function importJsonEvent(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const plan = buildImportPlan(payload, state.questionBank || [], state.questionBankSessions || []);
      if (!confirm(previewMessage(plan, file.name))) {
        if (elements.qbMessage) elements.qbMessage.textContent = "Importação JSON cancelada; nenhum dado foi alterado.";
        return;
      }
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
      const performanceMessage = plan.duplicateSession
        ? " O desempenho idêntico já existia e não foi duplicado."
        : (plan.session ? ` ${plan.counts.results} resultado(s) registrado(s) no histórico.` : " Nenhum resultado de desempenho foi identificado.");
      if (elements.qbMessage) elements.qbMessage.textContent = `${plan.counts.created} questão(ões) nova(s), ${plan.counts.updated} atualizada(s) e ${plan.counts.unchanged} sem alteração.${performanceMessage} Banco atual: ${state.questionBank.length}.`;
    } catch (error) {
      console.error("[Aldus V191] Falha ao importar JSON do banco de questões.", error);
      if (elements.qbMessage) elements.qbMessage.textContent = `Erro ao importar: ${error.message}`;
    } finally {
      if (event?.target) event.target.value = "";
    }
  }

  const api = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    normalizeAnswer: normalizeAnswerJson,
    hasPerformanceEvidence,
    resultStatus,
    normalizeImportedQuestion,
    mergeMeaningful,
    findExistingQuestionIndex,
    importFingerprint,
    summarizeSession,
    buildImportPlan,
    previewMessage,
    importJsonEvent
  });
  globalThis.AldusQuestionBankJsonImportV191 = api;
  globalThis.__ALDUS_QB_JSON_IMPORT_V191__ = api;

  if (typeof document !== "undefined" && typeof elements !== "undefined" && elements.qbFile) {
    document.addEventListener("change", (event) => {
      if (event.target !== elements.qbFile) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void importJsonEvent(event);
    }, true);
  }
})();
