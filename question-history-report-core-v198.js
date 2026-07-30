(() => {
  "use strict";
  const ns = globalThis.__AldusQuestionHistoryReportV198 ||= {};
  if (ns.coreReady) return;
  const VERSION = "20260730-filtro-relatorio-historico-questoes-v198";
  const BLANK_MARK = "__blank__";
  function text(value) { return String(value ?? "").trim(); }
  function canonicalLocal(value) {
    return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function html(value) {
    return text(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function xml(value) { return html(value); }
  function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  function isoDate(value) {
    const raw = text(value);
    if (!raw) return "";
    const direct = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (direct) return direct;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  }
  function formatDateLocal(value) {
    const date = isoDate(value);
    if (!date) return "-";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
  function normalizeStatus(value, row = {}) {
    const raw = canonicalLocal(value);
    if (raw.includes("duvida") || raw.includes("revisar")) return "duvida";
    if (raw.includes("nao respond") || raw.includes("em branco") || raw === "branco" || raw === "blank") return "branco";
    if (raw.includes("errad") || raw.includes("incorret") || raw === "wrong") return "errado";
    if (raw.includes("cert") || raw.includes("corret") || raw.includes("acert") || raw === "right") return "certo";
    const marked = text(row.resposta_marcada || row.respostaMarcada || row.marcado || row.userAnswer);
    const key = text(row.gabarito || row.answerKey || row.resposta_correta);
    if (marked === BLANK_MARK || (!marked && (row.resultado !== undefined || row.acertou !== undefined))) return "branco";
    if (typeof row.acertou === "boolean") return row.acertou ? "certo" : "errado";
    if (marked && key) return canonicalLocal(marked) === canonicalLocal(key) ? "certo" : "errado";
    return "sem resultado";
  }
  function statusLabel(value) {
    return ({ certo: "Certa", errado: "Errada", branco: "Não respondida", duvida: "Dúvida", misto: "Sessão mista", "sem resultado": "Sem resultado" })[value] || text(value) || "Sem resultado";
  }
  function originLabel(value) {
    const raw = canonicalLocal(value);
    if (!raw || raw === "manual") return "Registro manual";
    if (raw.includes("json")) return "JSON do QConcursos";
    if (raw.includes("captura") || raw.includes("screenshot") || raw.includes("ocr")) return "Captura do QConcursos";
    if (raw.includes("simulado")) return "Simulado";
    if (raw.includes("banco")) return "Banco de Questões";
    return text(value).replaceAll("-", " ");
  }
  function questionCode(item = {}) {
    return text(item.numero_qconcursos || item.numeroQconcursos || item.qcCodigo || item.codigoQc || item.referencia || item.reference || item.codigo || item.id);
  }
  function explanation(item = {}) {
    return text(item.justificativa || item.fundamento || item.comentario || item.comentarioQc || item.observacoes || item.notes);
  }
  function rowSearchText(row = {}) {
    return canonicalLocal([
      row.code, row.discipline, row.subject, row.theme, row.board, row.agency, row.role, row.exam,
      row.year, row.statement, row.notes, row.explanation, row.sourceLabel, row.statusLabel
    ].join(" "));
  }
  function notebookIdentitySet(sourceState = {}) {
    const set = new Set();
    (sourceState.questionErrorNotebook || []).forEach((item) => {
      [item.id, item.questionId, item.questaoId, item.numero_qconcursos, item.qcCodigo, item.referencia].map(canonicalLocal).filter(Boolean).forEach((id) => set.add(id));
    });
    return set;
  }
  function isNotebookItem(item = {}, notebookIds = new Set()) {
    const ids = [item.id, item.questionId, item.questaoId, item.numero_qconcursos, item.qcCodigo, item.referencia].map(canonicalLocal).filter(Boolean);
    return ids.some((id) => notebookIds.has(id));
  }
  function itemCounts(status) {
    return {
      total: 1,
      correct: status === "certo" ? 1 : 0,
      wrong: status === "errado" ? 1 : 0,
      blank: status === "branco" ? 1 : 0,
      doubt: status === "duvida" ? 1 : 0
    };
  }
  function sessionDate(session = {}) {
    return isoDate(session.date || session.data || session.createdAt || session.importedAt || session.updatedAt || session.importMetadata?.data_conversao || session.importMetadata?.date);
  }
  function collectRowsFromState(sourceState = {}) {
    const rows = [];
    const notebookIds = notebookIdentitySet(sourceState);

    (sourceState.questionBankSessions || []).forEach((session, sessionIndex) => {
      if (!Array.isArray(session.items)) return;
      const date = sessionDate(session);
      const source = text(session.sourceType || session.source || "banco");
      session.items.forEach((item, itemIndex) => {
        if (!item || typeof item !== "object") return;
        const status = normalizeStatus(item.status || item.resultado || item.resultadoOriginal, item);
        const counts = itemCounts(status);
        const row = {
          id: text(item.id || `${session.id || sessionIndex}-${itemIndex}`),
          sessionId: text(session.id || session.importFingerprint || sessionIndex),
          recordType: "question",
          date,
          discipline: text(item.disciplina || item.discipline) || "Sem disciplina",
          subject: text(item.assunto || item.subject) || "Sem assunto",
          theme: text(item.tema || item.theme || item.subassunto),
          board: text(item.banca || item.board),
          agency: text(item.orgao || item.agency),
          role: text(item.cargo || item.role),
          exam: text(item.prova || item.exam),
          year: text(item.ano || item.year),
          code: questionCode(item),
          statement: text(item.enunciado || item.statement || item.texto),
          marked: text(item.resposta_marcada || item.respostaMarcada || item.marcado),
          answerKey: text(item.gabarito || item.answerKey || item.resposta_correta),
          status,
          statusLabel: statusLabel(status),
          source,
          sourceLabel: originLabel(source),
          notes: text(item.observacoes || item.notes),
          explanation: explanation(item),
          tags: Array.isArray(item.tags) ? item.tags.map(text).filter(Boolean) : [],
          inNotebook: isNotebookItem(item, notebookIds) || ["errado", "branco", "duvida"].includes(status),
          minutes: 0,
          ...counts,
          net: (() => {
            const multipleChoice = Object.keys(item.alternativas || {}).length >= 2 || canonicalLocal(item.tipo || item.type).includes("multipla escolha");
            return multipleChoice ? 0 : (status === "certo" ? 1 : (status === "errado" ? -1 : 0));
          })(),
          original: item
        };
        row.searchText = rowSearchText(row);
        rows.push(row);
      });
    });

    (sourceState.questionLogs || []).forEach((log, index) => {
      if (!log || typeof log !== "object") return;
      const correct = number(log.correct ?? log.certas ?? log.acertos);
      const wrong = number(log.wrong ?? log.erradas ?? log.erros);
      const blank = number(log.blank ?? log.brancas ?? log.naoRespondidas);
      const total = number(log.total) || correct + wrong + blank;
      const status = total && correct === total ? "certo" : total && wrong === total ? "errado" : total && blank === total ? "branco" : "misto";
      const source = text(log.origin || log.origem || "manual");
      const row = {
        id: text(log.id || `manual-${index}`),
        sessionId: text(log.id || `manual-${index}`),
        recordType: "manual-session",
        date: isoDate(log.date || log.data || log.createdAt),
        discipline: text(log.discipline || log.disciplina) || "Sem disciplina",
        subject: text(log.subject || log.assunto) || "Assunto não vinculado ao edital atual",
        theme: text(log.theme || log.tema),
        board: text(log.board || log.banca),
        agency: text(log.agency || log.orgao),
        role: text(log.role || log.cargo),
        exam: text(log.exam || log.prova),
        year: text(log.year || log.ano),
        code: text(log.numero_qconcursos || log.qcCodigo || log.referencia),
        statement: text(log.enunciado || log.statement),
        marked: "",
        answerKey: "",
        status,
        statusLabel: statusLabel(status),
        source,
        sourceLabel: originLabel(source),
        notes: text(log.notes || log.observacoes),
        explanation: text(log.justificativa || log.comentario),
        tags: Array.isArray(log.tags) ? log.tags.map(text).filter(Boolean) : [],
        inNotebook: Boolean(log.questionNotebook && Object.keys(log.questionNotebook).length),
        minutes: number(log.minutes),
        total,
        correct,
        wrong,
        blank,
        doubt: number(log.doubt || log.duvidas),
        net: number(log.cebraspeNet ?? log.net ?? (correct - wrong)),
        original: log
      };
      row.searchText = rowSearchText(row);
      rows.push(row);
    });

    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.discipline.localeCompare(b.discipline, "pt-BR"));
  }
  function rowHasResult(row, result) {
    if (!result) return true;
    if (result === "certo") return row.correct > 0;
    if (result === "errado") return row.wrong > 0;
    if (result === "branco") return row.blank > 0;
    if (result === "duvida") return row.doubt > 0;
    return canonicalLocal(row.status) === canonicalLocal(result);
  }
  function applyFilters(rows = [], filters = {}) {
    const query = canonicalLocal(filters.query);
    const code = canonicalLocal(filters.code);
    return rows.filter((row) => {
      if (filters.startDate && row.date && row.date < filters.startDate) return false;
      if (filters.endDate && row.date && row.date > filters.endDate) return false;
      if (filters.startDate && !row.date) return false;
      if (filters.endDate && !row.date) return false;
      if (filters.discipline && canonicalLocal(row.discipline) !== canonicalLocal(filters.discipline)) return false;
      if (filters.subject && canonicalLocal(row.subject) !== canonicalLocal(filters.subject)) return false;
      if (filters.board && canonicalLocal(row.board) !== canonicalLocal(filters.board)) return false;
      if (filters.agency && canonicalLocal(row.agency) !== canonicalLocal(filters.agency)) return false;
      if (filters.role && canonicalLocal(row.role) !== canonicalLocal(filters.role)) return false;
      if (filters.exam && canonicalLocal(row.exam) !== canonicalLocal(filters.exam)) return false;
      if (filters.year && canonicalLocal(row.year) !== canonicalLocal(filters.year)) return false;
      if (filters.origin && canonicalLocal(row.sourceLabel) !== canonicalLocal(filters.origin) && canonicalLocal(row.source) !== canonicalLocal(filters.origin)) return false;
      if (!rowHasResult(row, filters.result)) return false;
      if (filters.notebookOnly && !row.inNotebook) return false;
      if (code && !canonicalLocal(row.code).includes(code)) return false;
      if (query && !row.searchText.includes(query)) return false;
      return true;
    });
  }
  function summarize(rows = []) {
    const summary = rows.reduce((acc, row) => {
      acc.records += 1;
      acc.total += number(row.total);
      acc.correct += number(row.correct);
      acc.wrong += number(row.wrong);
      acc.blank += number(row.blank);
      acc.doubt += number(row.doubt);
      acc.net += number(row.net);
      acc.minutes += number(row.minutes);
      return acc;
    }, { records: 0, total: 0, correct: 0, wrong: 0, blank: 0, doubt: 0, net: 0, minutes: 0, accuracy: 0 });
    summary.accuracy = summary.total ? Number((summary.correct / summary.total * 100).toFixed(1)) : 0;
    return summary;
  }
  function groupRows(rows = [], field = "discipline") {
    const map = new Map();
    rows.forEach((row) => {
      const key = text(row[field]) || "Não informado";
      const current = map.get(key) || { label: key, records: 0, total: 0, correct: 0, wrong: 0, blank: 0, doubt: 0, net: 0, accuracy: 0 };
      current.records += 1;
      current.total += number(row.total);
      current.correct += number(row.correct);
      current.wrong += number(row.wrong);
      current.blank += number(row.blank);
      current.doubt += number(row.doubt);
      current.net += number(row.net);
      map.set(key, current);
    });
    return [...map.values()].map((entry) => ({ ...entry, accuracy: entry.total ? Number((entry.correct / entry.total * 100).toFixed(1)) : 0 })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
  }
  function filterDescription(filters = {}) {
    const labels = [];
    if (filters.startDate || filters.endDate) labels.push(`Período: ${filters.startDate || "início"} a ${filters.endDate || "hoje"}`);
    [["Disciplina", filters.discipline], ["Assunto", filters.subject], ["Banca", filters.board], ["Órgão", filters.agency], ["Cargo", filters.role], ["Prova", filters.exam], ["Ano", filters.year], ["Origem", filters.origin]].forEach(([label, value]) => { if (value) labels.push(`${label}: ${value}`); });
    if (filters.result) labels.push(`Resultado: ${statusLabel(filters.result)}`);
    if (filters.code) labels.push(`Código: ${filters.code}`);
    if (filters.query) labels.push(`Busca: ${filters.query}`);
    if (filters.notebookOnly) labels.push("Somente Caderno de Erros");
    return labels.length ? labels.join(" • ") : "Todo o histórico";
  }
  function csvCell(value) { return `"${text(value).replaceAll('"', '""')}"`; }
  function csvLine(values) { return values.map(csvCell).join(";"); }
  function buildCsv(report = {}) {
    const summary = report.summary || summarize(report.rows || []);
    const lines = [
      csvLine(["RELATÓRIO DE DESEMPENHO E HISTÓRICO DE QUESTÕES"]),
      csvLine(["Gerado em", new Date().toLocaleString("pt-BR")]),
      csvLine(["Filtros", filterDescription(report.filters || {})]),
      "",
      csvLine(["RESUMO"]),
      csvLine(["Registros", "Questões", "Certas", "Erradas", "Não respondidas", "Dúvidas", "Percentual", "Líquido", "Minutos"]),
      csvLine([summary.records, summary.total, summary.correct, summary.wrong, summary.blank, summary.doubt, `${summary.accuracy}%`, summary.net, summary.minutes]),
      ""
    ];
    [["POR DISCIPLINA", "discipline"], ["POR ASSUNTO", "subject"], ["POR BANCA", "board"]].forEach(([title, field]) => {
      lines.push(csvLine([title]));
      lines.push(csvLine([title.replace("POR ", ""), "Registros", "Questões", "Certas", "Erradas", "Brancos", "Dúvidas", "Acerto", "Líquido"]));
      groupRows(report.rows || [], field).forEach((entry) => lines.push(csvLine([entry.label, entry.records, entry.total, entry.correct, entry.wrong, entry.blank, entry.doubt, `${entry.accuracy}%`, entry.net])));
      lines.push("");
    });
    lines.push(csvLine(["QUESTÕES E SESSÕES FILTRADAS"]));
    lines.push(csvLine(["Data", "Código QC", "Disciplina", "Assunto", "Tema", "Banca", "Órgão", "Cargo", "Prova", "Ano", "Resultado", "Resposta marcada", "Gabarito", "Total", "Certas", "Erradas", "Brancos", "Dúvidas", "Líquido", "Origem", "Caderno de Erros", "Enunciado", "Comentário/Justificativa", "Observações"]));
    (report.rows || []).forEach((row) => lines.push(csvLine([
      row.date, row.code, row.discipline, row.subject, row.theme, row.board, row.agency, row.role, row.exam, row.year,
      row.statusLabel, row.marked === BLANK_MARK ? "Em branco" : row.marked, row.answerKey, row.total, row.correct, row.wrong,
      row.blank, row.doubt, row.net, row.sourceLabel, row.inNotebook ? "Sim" : "Não", row.statement, row.explanation, row.notes
    ])));
    return `\uFEFF${lines.join("\r\n")}`;
  }
  Object.assign(ns, { VERSION, text, canonicalLocal, html, xml, number, isoDate, formatDateLocal, normalizeStatus, statusLabel, originLabel, questionCode, explanation, rowSearchText, notebookIdentitySet, isNotebookItem, itemCounts, sessionDate, collectRowsFromState, rowHasResult, applyFilters, summarize, groupRows, filterDescription, csvCell, csvLine, buildCsv });
  ns.coreReady = true;
})();
