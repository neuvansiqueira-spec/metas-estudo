(() => {
  "use strict";
  if (globalThis.AldusQconcursosCaptureQuestionParserV187) return;
  const VERSION = "20260730-captura-questao-completa-v187";
  const PLACEHOLDERS = new Set(["", "sem disciplina", "sem assunto", "geral", "nao informado", "não informado", "-"]);
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const canonical = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const matches = (text, regex) => [...String(text || "").matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`))];
  const last = (text, regex, group = 1) => clean(matches(text, regex).at(-1)?.[group] || "");
  function field(text, label, following = []) {
    const suffix = following.length ? `(?=\\s+(?:${following.join("|")})\\s*:|$)` : "(?=$)";
    return clean(clean(text).match(new RegExp(`${label}\\s*:\\s*(.*?)${suffix}`, "i"))?.[1] || "");
  }
  function hierarchy(text, lines = []) {
    const discipline = field(text, "Disciplina", ["Assunto", "Tema", "Ano", "Banca", "Órgão", "Orgao", "Prova", "Cargo"]);
    const subject = field(text, "Assunto", ["Tema", "Ano", "Banca", "Órgão", "Orgao", "Prova", "Cargo"]);
    const theme = field(text, "Tema", ["Ano", "Banca", "Órgão", "Orgao", "Prova", "Cargo"]);
    if (discipline || subject || theme) return { classification: [discipline, subject, theme].filter(Boolean).join(" > "), discipline, subject: subject || theme, theme: theme || subject };
    const line = lines.map(clean).filter((value) => value.includes(">"))[0] || "";
    const parts = line.split(/\s*>\s*/).map(clean).filter(Boolean);
    return { classification: line, discipline: parts[0] || "", subject: parts.at(-1) || "", theme: parts.length > 2 ? parts.at(-2) : (parts.at(-1) || "") };
  }
  function alternativesFromLines(lines = []) {
    const output = {}; let key = "";
    lines.map(clean).forEach((line) => {
      const label = line.match(/^([A-E])(?:\s*[\)\].:\-–—]\s*|\s+)(.*)$/i);
      if (label) { key = label[1].toUpperCase(); output[key] = clean(label[2]); return; }
      if (key && line && !/^(?:Parabéns|Incorreta|Gabarito|Resumo relacionado)/i.test(line)) output[key] = clean(`${output[key]} ${line}`);
    });
    return Object.keys(output).length >= 4 ? output : {};
  }
  function alternativesFromText(text) {
    const value = clean(text); const tokens = []; const regex = /(?:^|\s)([A-E])\s*[\)\].:\-–—]\s*/g; let match;
    while ((match = regex.exec(value))) tokens.push({ key: match[1], start: match.index + (match[0].startsWith(" ") ? 1 : 0), contentStart: regex.lastIndex });
    const start = tokens.findIndex((token) => token.key === "A");
    if (start < 0) return { alternatives: {}, firstStart: -1 };
    const sequence = []; let cursor = start;
    for (const key of ["A", "B", "C", "D", "E"]) { while (cursor < tokens.length && tokens[cursor].key !== key) cursor += 1; if (cursor >= tokens.length) break; sequence.push(tokens[cursor++]); }
    if (sequence.length < 4) return { alternatives: {}, firstStart: -1 };
    const alternatives = {};
    sequence.forEach((token, index) => { alternatives[token.key] = clean(value.slice(token.contentStart, sequence[index + 1]?.start ?? value.length).replace(/\s+(?:Parabéns!?|Incorreta\.?|Gabarito(?: oficial)?[^:]*:).*$/i, "")); });
    return { alternatives, firstStart: sequence[0].start };
  }
  function stripMetadata(text, meta, classification, code) {
    let value = clean(text).replace(/\b(?:Ano|Banca|Órgão|Orgao|Provas?|Cargo|Disciplina|Assunto|Tema)\s*:\s*/gi, " ").replace(/\b(?:Questão|Questao)\s*(?:n[ºo°]?|#)?\s*\d+\b/gi, " ").replace(/\bQ\d{3,}\b/gi, " ").replace(/\b(?:QConcursos|Questões de Concursos|Responder|Comentários?|Estatísticas?|Salvar nos favoritos|Reportar erro|Gabarito Comentado|Vídeo aula)\b/gi, " ");
    [meta.year, meta.board, meta.agency, meta.exam, meta.role, classification].filter((item) => clean(item).length >= 2).sort((a, b) => b.length - a.length).forEach((item) => { value = value.replace(new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " "); });
    return clean(value.replace(/\s*>\s*/g, " ").replace(code || /$^/, " "));
  }
  function parseQuestionSegment(segment, options = {}) {
    const source = clean(segment); const lines = Array.isArray(options.lines) ? options.lines.map(clean).filter(Boolean) : [];
    const codeText = lines.join(" ") || source;
    const code = last(codeText, /\b(Q\d{3,})\b/gi) || last(codeText, /\b(?:Questão|Questao)\s*(?:n[ºo°]?|#)?\s*(\d{2,})\b/gi);
    const metaText = lines.find((line) => /\b(?:Ano|Banca|Órgão|Orgao|Provas?|Cargo)\s*:/i.test(line)) || source;
    const meta = {
      year: last(metaText, /\bAno\s*:\s*(\d{4})\b/gi),
      board: field(metaText, "Banca", ["Órgão", "Orgao", "Prova", "Provas", "Cargo", "Ano"]),
      agency: field(metaText, "(?:Órgão|Orgao)", ["Prova", "Provas", "Cargo", "Ano", "Banca"]),
      exam: field(metaText, "Provas?", ["Cargo", "Ano", "Banca", "Órgão", "Orgao"]),
      role: field(metaText, "Cargo", ["Ano", "Banca", "Órgão", "Orgao", "Prova", "Provas"])
    };
    if (!meta.role && meta.exam) meta.role = meta.exam.split(/\s+-\s+/).map(clean).filter(Boolean).at(-1) || "";
    const tree = hierarchy(source, lines);
    const lineAlternatives = alternativesFromLines(lines); const textAlternatives = alternativesFromText(source);
    const alternatives = Object.keys(lineAlternatives).length ? lineAlternatives : textAlternatives.alternatives;
    let statement = "";
    if (lines.length) {
      const parts = []; let started = false;
      for (const line of lines) {
        if (/^([A-E])(?:\s*[\)\].:\-–—]\s*|\s+)/i.test(line)) { started = true; continue; }
        if (started || /\b(?:Ano|Banca|Órgão|Orgao|Provas?|Cargo|Disciplina|Assunto|Tema)\s*:/i.test(line) || line.includes(">") || /^(?:Q\d+|Questão\s*\d+|Questao\s*\d+|Certo|Errado)$/i.test(line) || /^(?:QConcursos|Questões de Concursos|Responder|Comentários?|Estatísticas?|Salvar nos favoritos|Reportar erro|Gabarito Comentado|Vídeo aula|Parabéns!?|Incorreta\.?|Gabarito(?: oficial)?|Resumo relacionado)/i.test(line)) continue;
        parts.push(line);
      }
      statement = clean(parts.join(" "));
    }
    if (!statement) statement = stripMetadata(textAlternatives.firstStart >= 0 ? source.slice(0, textAlternatives.firstStart) : source, meta, tree.classification, code);
    statement = clean(statement.replace(/^\s*(?:Texto associado|Texto para a questão|Considere o texto a seguir)\s*/i, "").replace(/\s+(?:Parabéns!?|Incorreta\.?|Gabarito(?: oficial)?[^:]*:).*$/i, ""));
    const reference = code ? (String(code).toUpperCase().startsWith("Q") ? String(code).toUpperCase() : `Q${code}`) : "";
    const comment = clean(options.comment); const key = String(options.officialKey || "").trim().toUpperCase();
    return {
      id: reference, codigo: reference, referencia: reference, qcCodigo: reference,
      disciplina: tree.discipline || "Sem disciplina", assunto: tree.subject || "Sem assunto", tema: tree.theme || tree.subject || "Geral",
      banca: meta.board, ano: meta.year, orgao: meta.agency, cargo: meta.role, prova: meta.exam,
      tipo: Object.keys(alternatives).length >= 4 ? "Múltipla escolha" : "Certo/Errado", enunciado: statement, alternativas: alternatives, gabarito: key,
      justificativa: comment, fundamento: comment, comentarioQc: comment, qcDisciplina: tree.discipline, qcAssunto: tree.subject, qcClassificacao: tree.classification,
      fonte: "Captura do QConcursos selecionada pelo usuário", extractionComplete: statement.length >= 20, rawSegment: source
    };
  }
  function identity(question = {}) {
    const explicit = canonical(question.qcCodigo || question.referencia || question.codigo || question.id);
    if (explicit && !explicit.startsWith("qb ")) return `code:${explicit}`;
    return `text:${canonical(question.enunciado)}|${Object.entries(question.alternativas || {}).sort().map(([key, value]) => `${key}:${canonical(value)}`).join("|")}`;
  }
  function generatedId(question = {}) {
    const explicit = clean(question.qcCodigo || question.referencia || question.codigo || question.id); if (explicit) return explicit.toUpperCase();
    let hash = 2166136261; for (const char of identity(question)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return `QC-CAP-${(hash >>> 0).toString(36).toUpperCase()}`;
  }
  const useful = (value) => value && typeof value === "object" ? Object.keys(value).length > 0 : !PLACEHOLDERS.has(canonical(value));
  function merge(existing = {}, incoming = {}) {
    const result = { ...existing }; const fields = ["disciplina", "assunto", "tema", "syllabusItemId", "banca", "ano", "orgao", "cargo", "prova", "referencia", "tipo", "gabarito", "justificativa", "fundamento", "comentarioQc", "observacoes", "fonte", "arquivoFonte", "capturaFonte", "qcCodigo", "qcNumeroNoArquivo", "qcDisciplina", "qcAssunto", "qcClassificacao", "correspondenciaQc"];
    fields.forEach((key) => { if (!useful(result[key]) && useful(incoming[key])) result[key] = incoming[key]; });
    const current = clean(result.enunciado); const next = clean(incoming.enunciado); if (next && (!current || current.length < 25 || next.length > current.length * 1.35)) result.enunciado = next;
    result.alternativas = { ...(result.alternativas || {}) }; Object.entries(incoming.alternativas || {}).forEach(([key, value]) => { if (!clean(result.alternativas[key]) && clean(value)) result.alternativas[key] = clean(value); });
    result.tags = [...new Set([...(result.tags || []), ...(incoming.tags || [])])]; result.id ||= incoming.id || generatedId(incoming); return result;
  }
  globalThis.AldusQconcursosCaptureQuestionParserV187 = Object.freeze({ version: VERSION, clean, canonical, parseQuestionSegment, identity, generatedId, merge });
})();
