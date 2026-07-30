(() => {
  "use strict";

  const VERSION = "20260730-captura-qconcursos-por-cartoes-v188";
  const base = globalThis.AldusQconcursosCaptureImport;
  if (!base?.readFile || globalThis.__ALDUS_QC_CAPTURE_LAYOUT_V188__) return;

  const REF = /\bQ\s*(\d{5,})\b/i;
  const OPTION = /^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i;
  const CORRECT = /(parab[eé]ns!?\s*voc[eê]\s*acertou|resolvi\s*certo|resposta\s*correta)/i;
  const WRONG = /(incorreta|voc[eê]\s*errou|resolvi\s*errado)/i;
  const PANEL = /(ordenando por mais curtidos|acompanhar coment[aá]rios)/i;
  const TOOLBAR = /^(responder|ficou com d[uú]vidas\??|gabarito comentado(?:\s*\(\d+\))?|aulas?(?:\s*\(\d+\))?|coment[aá]rios?(?:\s*\(\d+\))?|estat[ií]sticas?|cadernos?|criar anota[cç][oõ]es|notificar erro|acompanhar coment[aá]rios|reportar abuso|gostei(?:\s*\(\d+\))?|respostas?(?:\s*\(\d+\))?)$/i;
  const OFFICIAL_COMMENT = /^(coment[aá]rio do professor|justificativa|fundamento|resolu[cç][aã]o|solu[cç][aã]o|gabarito comentado)\s*:?[\s]*$/i;

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const canon = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const reference = (value) => {
    const match = String(value || "").match(REF);
    return match ? `Q${match[1]}` : "";
  };
  const isMetadata = (value) => /(?:^|\s)(Ano|Banca|[ÓO]rg[aã]o|Cargo|Prova)\s*:/i.test(String(value || ""));
  const isStatus = (value) => CORRECT.test(String(value || "")) || WRONG.test(String(value || ""));
  const isNoise = (value) => !clean(value) || TOOLBAR.test(clean(value)) || /^(Data|Mais curtidos|Ordenando por Mais curtidos)$/i.test(clean(value));

  function labeled(value) {
    const out = {};
    const regex = /(Ano|Banca|[ÓO]rg[aã]o|Cargo|Prova)\s*:\s*(.*?)(?=\s+(?:Ano|Banca|[ÓO]rg[aã]o|Cargo|Prova)\s*:|$)/gi;
    let match;
    while ((match = regex.exec(clean(value)))) {
      const key = canon(match[1]);
      out[key === "ano" ? "ano" : key === "banca" ? "banca" : key === "orgao" ? "orgao" : key === "cargo" ? "cargo" : "prova"] = clean(match[2]);
    }
    return out;
  }

  function filterDefaults(lines, firstQuestion) {
    const out = { disciplina: "", assunto: "", cargo: "" };
    for (const line of lines.slice(0, firstQuestion)) {
      const text = clean(line);
      for (const [field, label] of [["disciplina", "Disciplina"], ["assunto", "Assunto"], ["cargo", "Cargo"]]) {
        if (out[field]) continue;
        const match = text.match(new RegExp(`\\b${label}\\b\\s*(.*)$`, "i"));
        let value = clean(match?.[1] || "").replace(/^\d+\s+selecionad[oa]s?\s*/i, "").replace(/^\d+\s+/, "");
        if (field === "disciplina" && value && !/direito|legisla[cç][aã]o|criminologia|medicina|portugu[eê]s|inform[aá]tica|contabilidade|economia|administra[cç][aã]o/i.test(value)) value = "";
        if (field === "cargo" && value && !/delegado|investigador|escriv[aã]o|agente|perito|analista|t[eé]cnico/i.test(value)) value = "";
        if (value) out[field] = value;
      }
    }
    return out;
  }

  function breadcrumb(header, defaults) {
    const ref = reference(header);
    let tail = clean(header).replace(/^\d+\s*/, "");
    if (ref) tail = tail.replace(new RegExp(`\\bQ\\s*${ref.slice(1)}\\b`, "i"), "").trim();
    const parts = tail.split(/\s*(?:>|›|»|→)\s*/).map(clean).filter(Boolean);
    let disciplina = parts[0] || defaults.disciplina;
    let assunto = parts[1] || defaults.assunto;
    let tema = parts.slice(2).join(" > ");
    if (defaults.disciplina && canon(tail).includes(canon(defaults.disciplina))) disciplina = defaults.disciplina;
    if (defaults.assunto && canon(tail).includes(canon(defaults.assunto))) {
      assunto = defaults.assunto;
      const normalizedTail = canon(tail);
      const pos = normalizedTail.indexOf(canon(defaults.assunto));
      if (!tema && pos >= 0) tema = tail.slice(Math.min(tail.length, pos + defaults.assunto.length)).replace(/^[\s›»>,\-]+/, "").trim();
    }
    return { referencia: ref, qcCodigo: ref, disciplina: clean(disciplina), assunto: clean(assunto), tema: clean(tema) };
  }

  function deriveCargo(prova, fallback) {
    const explicit = String(prova || "").split(/\s+-\s+/).map(clean).find((part) => /delegado|investigador|escriv[aã]o|agente|perito|analista|t[eé]cnico/i.test(part));
    return explicit || clean(fallback);
  }

  function alternatives(lines) {
    const out = {};
    let current = "";
    for (const line of lines) {
      const match = line.match(OPTION);
      if (match) {
        current = match[1].toUpperCase();
        out[current] = clean(match[2]);
      } else if (current && !isStatus(line) && !isMetadata(line) && !TOOLBAR.test(line)) {
        out[current] = clean(`${out[current]} ${line}`);
      }
    }
    return out;
  }

  function officialComment(lines) {
    const marker = lines.findIndex((line) => OFFICIAL_COMMENT.test(line) && !/\(\d+\)/.test(line));
    if (marker < 0) return "";
    const out = [];
    for (const line of lines.slice(marker + 1)) {
      if (TOOLBAR.test(line) || isStatus(line) || isMetadata(line) || reference(line)) break;
      if (!isNoise(line)) out.push(line);
      if (out.join(" ").length > 2200) break;
    }
    return clean(out.join(" ")).slice(0, 2200);
  }

  function parseCard(rawLines, defaults, index) {
    let lines = rawLines.map(clean).filter(Boolean);
    const panel = lines.findIndex((line, position) => PANEL.test(line) || (/^Data$/i.test(line) && /ordenando por/i.test(lines[position + 1] || "")));
    const ignoredCommunity = panel >= 0;
    if (ignoredCommunity) lines = lines.slice(0, panel);
    const header = lines.find((line) => reference(line)) || lines[0] || "";
    const trail = breadcrumb(header, defaults);
    const meta = { banca: "", ano: "", orgao: "", cargo: "", prova: "" };
    for (const line of lines) Object.assign(meta, Object.fromEntries(Object.entries(labeled(line)).filter(([key, value]) => value && !meta[key])));
    meta.cargo ||= deriveCargo(meta.prova, defaults.cargo);
    const optionIndex = lines.findIndex((line) => OPTION.test(line));
    const statement = clean(lines.slice(1, optionIndex < 0 ? lines.length : optionIndex).filter((line) => !reference(line) && !isMetadata(line) && !isStatus(line) && !isNoise(line) && !/^Resolvi\s+(certo|errado)!?$/i.test(line)).join(" "));
    const choices = alternatives(optionIndex >= 0 ? lines.slice(optionIndex) : []);
    const joined = lines.join(" ");
    const wrong = WRONG.test(joined);
    const correct = !wrong && CORRECT.test(joined);
    const officialKey = joined.match(/gabarito(?:\s+oficial(?:\s+da\s+banca)?)?\s*:\s*([A-E])/i)?.[1]?.toUpperCase() || "";
    const comment = officialComment(lines);
    const type = Object.keys(choices).length >= 4 ? "multipla" : Object.keys(choices).length === 2 && choices.C && choices.E ? "ce" : "";
    const fields = [statement, trail.disciplina, trail.assunto, meta.banca, meta.ano, meta.orgao, trail.referencia];
    return {
      index,
      ...trail,
      ...meta,
      enunciado: statement,
      alternativas: choices,
      comentarioQc: comment,
      justificativa: comment,
      fundamento: comment,
      comentariosComunidadeIgnorados: ignoredCommunity,
      tipo: type,
      officialKey,
      correct,
      status: wrong ? "errado" : correct ? "certo" : "revisar",
      segment: lines.join(" "),
      confidence: Math.round(fields.filter(Boolean).length / fields.length * 100),
      reviewRequired: !statement || !trail.disciplina || !trail.assunto
    };
  }

  function parseLayoutText(text) {
    const lines = String(text || "").split(/\r?\n/).map(clean).filter(Boolean);
    const headers = [];
    lines.forEach((line, index) => { if (reference(line)) headers.push(index); });
    if (!headers.length) return [];
    const defaults = filterDefaults(lines, headers[0]);
    return headers.map((start, index) => parseCard(lines.slice(start, headers[index + 1] ?? lines.length), defaults, index)).filter((item) => item.referencia || item.enunciado);
  }

  async function readFile(file, options = {}) {
    const parsed = await base.readFile(file, options);
    const structuredQuestions = parseLayoutText(parsed.rawText);
    if (!structuredQuestions.length) return parsed;
    const ocrResults = structuredQuestions.map((item) => ({ index: item.index, correct: item.correct, status: item.status, officialKey: item.officialKey, segment: item.segment, comment: item.comentarioQc, questionDraft: item }));
    const matches = base.matchResults(ocrResults, parsed.visualAnswers || [], options.questions || [], structuredQuestions);
    return {
      ...parsed,
      version: VERSION,
      layoutMode: "qconcursos-question-cards",
      structuredQuestions,
      ocrResults,
      matches,
      ignoredCommunityCommentPanels: structuredQuestions.filter((item) => item.comentariosComunidadeIgnorados).length
    };
  }

  globalThis.AldusQconcursosCaptureImport = Object.freeze({
    ...base,
    version: VERSION,
    parseLayoutText,
    readFile
  });
  globalThis.__ALDUS_QC_CAPTURE_LAYOUT_V188__ = Object.freeze({ version: VERSION, baseVersion: base.version || "" });
})();
