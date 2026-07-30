(() => {
  "use strict";

  const VERSION = "20260730-ocr-conservador-qconcursos-v190";
  const base = globalThis.AldusQconcursosCaptureImport;
  if (!base?.readFile || globalThis.__ALDUS_QC_CAPTURE_ACCURACY_V190__) return;

  const BOARD_PATTERNS = [
    ["CEBRASPE", /\b(cebraspe|cespe)\b/i], ["FGV", /\bfgv\b|funda[cç][aã]o get[uú]lio vargas/i],
    ["FCC", /\bfcc\b|funda[cç][aã]o carlos chagas/i], ["VUNESP", /\bvunesp\b/i],
    ["IBFC", /\bibfc\b/i], ["Instituto AOCP", /\baocp\b/i], ["FUNDATEC", /\bfundatec\b/i],
    ["IADES", /\biades\b/i], ["IDECAN", /\bidecan\b/i], ["Quadrix", /\bquadrix\b/i],
    ["CESGRANRIO", /\bcesgranrio\b/i], ["NC-UFPR", /\bnc\s*[-/]?\s*ufpr\b/i]
  ];
  const COMMUNITY = /mais curtidos|ordenando por|acompanhar coment|reportar abuso|escreva o seu coment|\bgostei\s*\(|\brespostas?\s*\(|carregar mais/i;
  const TOOLBAR = /gabarito comentado.*aulas.*coment[aá]rios|coment[aá]rios.*estat[ií]sticas.*cadernos/i;
  const UI_NOISE = /^(responder|resolvi certo|resolvi errado|ficou com d[uú]vidas|coment[aá]rios?|estat[ií]sticas?|cadernos|criar anota[cç][oõ]es|notificar erro|reportar erro)$/i;

  function canonical(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function lines(value) { return String(value || "").split(/\r?\n/).map((line) => line.replace(/[\t ]+/g, " ").trim()).filter(Boolean); }
  function detectBoard(value) { for (const [name, pattern] of BOARD_PATTERNS) if (pattern.test(value)) return name; return ""; }
  function optionLine(line) { return line.match(/^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i) || line.match(/^\s*([A-E])\s+(.{3,})$/i); }
  function statusLine(line) { const c=canonical(line); return c.includes("parabens voce acertou") || c.includes("incorreta gabarito oficial") || c.includes("resolvi certo") || c.includes("resolvi errado") || c.includes("voce errou") || c.includes("resposta correta"); }
  function parseAlternatives(text) {
    const output = {}; let current = "";
    for (const line of lines(text)) {
      const exact = canonical(line);
      if (exact === "certo") { current = "C"; output.C = "Certo"; continue; }
      if (exact === "errado") { current = "E"; output.E = "Errado"; continue; }
      const match = optionLine(line);
      if (match) { current = match[1].toUpperCase(); output[current] = String(match[2] || "").trim(); continue; }
      if (current && !statusLine(line) && !TOOLBAR.test(line) && !UI_NOISE.test(line)) output[current] = `${output[current]} ${line}`.trim();
    }
    Object.keys(output).forEach((key) => { if (String(output[key]).trim().length < 2) delete output[key]; });
    return output;
  }
  function mergeAlternatives(primary = {}, secondary = {}) {
    const output = { ...primary };
    Object.entries(secondary || {}).forEach(([key, value]) => {
      if (!/^[A-E]$/.test(key) || !String(value || "").trim()) return;
      if (!output[key] || String(value).length > String(output[key]).length) output[key] = String(value).trim();
    });
    return output;
  }
  function explicitMetadata(text) {
    const headerLines = lines(text).slice(0, 9);
    const joined = headerLines.join("\n");
    const result = { banca: "", ano: "", orgao: "", cargo: "", prova: "", referencia: "" };
    result.referencia = joined.match(/\bQ\s*(\d{4,})\b/i) ? `Q${joined.match(/\bQ\s*(\d{4,})\b/i)[1]}` : "";
    const labels = /(Ano|Banca|[ÓO]rg[aã]o|Institui[cç][aã]o|Cargo|Prova)\s*:\s*/gi;
    headerLines.forEach((line) => {
      const matches = [...line.matchAll(labels)];
      matches.forEach((match, index) => {
        const start = match.index + match[0].length;
        const end = matches[index + 1]?.index ?? line.length;
        const value = line.slice(start, end).trim().replace(/[|•]+$/, "").trim();
        const key = canonical(match[1]);
        if (key === "ano") result.ano ||= value.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
        else if (key === "banca") result.banca ||= detectBoard(value) || value;
        else if (key === "orgao" || key === "instituicao") result.orgao ||= value;
        else if (key === "cargo") result.cargo ||= value;
        else if (key === "prova") result.prova ||= value;
      });
    });
    return result;
  }
  function strictTaxonomy(text, known = []) {
    const header = canonical(lines(text).slice(0, 3).join(" "));
    const candidates = (known || []).map((item) => ({
      disciplina: String(item.discipline || item.disciplina || "").trim(),
      assunto: String(item.subject || item.assunto || item.topic || "").trim(),
      tema: String(item.theme || item.tema || item.subtopic || item.subassunto || "").trim()
    })).filter((item) => item.disciplina || item.assunto);
    const discipline = candidates.filter((item) => item.disciplina && header.includes(canonical(item.disciplina))).sort((a, b) => b.disciplina.length - a.disciplina.length)[0];
    if (!discipline) return { disciplina: "", assunto: "", tema: "" };
    const subject = candidates.filter((item) => canonical(item.disciplina) === canonical(discipline.disciplina) && item.assunto && header.includes(canonical(item.assunto))).sort((a, b) => b.assunto.length - a.assunto.length)[0];
    return { disciplina: discipline.disciplina, assunto: subject?.assunto || "", tema: subject?.tema || "" };
  }
  function strictStatement(text) {
    const source = lines(text);
    const headerIndex = Math.max(0, source.findIndex((line) => /\bQ\s*\d{4,}\b/i.test(line)));
    const firstOption = source.findIndex((line, index) => index > headerIndex && (optionLine(line) || ["certo", "errado"].includes(canonical(line))));
    const end = firstOption >= 0 ? firstOption : source.length;
    const statement = source.slice(headerIndex + 1, end).filter((line) => {
      const c = canonical(line);
      return !/^(ano|banca|orgao|instituicao|cargo|prova)\s*:/.test(c) && !statusLine(line) && !TOOLBAR.test(line) && !UI_NOISE.test(line) && !detectBoard(line);
    }).join(" ").replace(/\s+/g, " ").trim();
    return statement.length >= 25 ? statement : "";
  }
  function strictComment(text) {
    if (COMMUNITY.test(text)) return "";
    const source = lines(text);
    const marker = source.findIndex((line) => /^(coment[aá]rio (?:oficial|da banca|do professor)|justificativa|fundamento|explica[cç][aã]o)\s*:/i.test(line));
    if (marker < 0) return "";
    const first = source[marker].replace(/^[^:]+:\s*/, "").trim();
    const tail = source.slice(marker + 1).filter((line) => !TOOLBAR.test(line) && !UI_NOISE.test(line) && !COMMUNITY.test(line)).slice(0, 12);
    return [first, ...tail].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 2400);
  }
  function strictType(alternatives, visual) {
    const keys = Object.keys(alternatives || {}).filter((key) => String(alternatives[key] || "").trim());
    if (keys.filter((key) => /^[A-E]$/.test(key)).length >= 4 || Number(visual?.optionCount) >= 4) return "multipla";
    if (keys.length === 2 && alternatives.C && alternatives.E && canonical(alternatives.C) === "certo" && canonical(alternatives.E) === "errado") return "ce";
    return "";
  }
  function normalizeAnswer(value) { const c = canonical(value).replace(/\s+/g, ""); if (["c", "certo"].includes(c)) return "C"; if (["e", "errado"].includes(c)) return "E"; return /^[abcde]$/.test(c) ? c.toUpperCase() : ""; }
  function strictStatus(text) { const c = canonical(text); if (c.includes("incorreta") || c.includes("resolvi errado") || c.includes("voce errou")) return "errado"; if (c.includes("parabens") || c.includes("resolvi certo") || c.includes("resposta correta")) return "certo"; return "revisar"; }
  function cardText(parsed, index) { return String(parsed.rawText || "").split(/\n\n--- CARTÃO ---\n\n/)[index] || parsed.structuredQuestions?.[index]?.segment || ""; }

  async function loadTesseract() {
    if (globalThis.Tesseract?.createWorker) return globalThis.Tesseract;
    if (globalThis.__ALDUS_TESSERACT_LOADING__) return globalThis.__ALDUS_TESSERACT_LOADING__;
    throw new Error("Leitor de texto indisponível para a segunda leitura das alternativas.");
  }
  function alternativeCanvas(bitmap, card, visual) {
    const x = Math.max(0, Math.floor(bitmap.width * 0.055));
    const width = Math.max(1, Math.ceil(bitmap.width * 0.91));
    const start = visual?.yStart ? Math.max(card.headerYStart, visual.yStart - 90) : Math.round(card.headerYStart + (card.boundaryEnd - card.headerYStart) * 0.32);
    const end = visual?.yEnd ? Math.min(card.boundaryEnd, visual.yEnd + 110) : Math.min(card.boundaryEnd, card.ocrEnd);
    const height = Math.max(1, end - start);
    const ratio = Math.min(1.45, 2500 / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext("2d"); context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, x, start, width, height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  async function refineAlternatives(file, parsed, visualByCard, onProgress) {
    const needs = (parsed.structuredQuestions || []).map((draft, index) => ({ index, draft, visual: visualByCard[index] || {} })).filter(({ draft, visual }) => {
      const count = Object.keys(draft.alternativas || {}).length;
      return (Number(visual.optionCount) >= 4 || draft.tipo === "multipla") && count < 4;
    });
    if (!needs.length) return new Map();
    const Tesseract = await loadTesseract(); const bitmap = await createImageBitmap(file); const output = new Map();
    const worker = await Tesseract.createWorker("por", 1, { logger() {} });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM?.SINGLE_BLOCK || "6", preserve_interword_spaces: "1", user_defined_dpi: "300" });
      for (let position = 0; position < needs.length; position += 1) {
        const item = needs[position]; const card = parsed.cards?.[item.index]; if (!card) continue;
        onProgress?.({ status: `refinando alternativas da questão ${item.index + 1}`, progress: 0.95 + ((position + 1) / needs.length) * 0.04 });
        const recognized = await worker.recognize(alternativeCanvas(bitmap, card, item.visual));
        output.set(item.index, parseAlternatives(recognized?.data?.text || ""));
      }
    } finally { await worker.terminate(); bitmap.close?.(); }
    return output;
  }
  function strictQuestion(parsed, index, visual, refined, options) {
    const text = cardText(parsed, index); const original = parsed.structuredQuestions?.[index] || {};
    const alternatives = mergeAlternatives(original.alternativas, refined);
    const metadata = explicitMetadata(text); const taxonomy = strictTaxonomy(text, options.knownTaxonomy || []);
    const type = strictType(alternatives, visual); const status = strictStatus(text);
    const marked = normalizeAnswer(visual?.marked || "");
    const explicitKey = normalizeAnswer(text.match(/gabarito(?:\s+oficial(?:\s+da\s+banca)?)?\s*:\s*(A|B|C|D|E|Certo|Errado)/i)?.[1] || "");
    const officialKey = explicitKey || (status === "certo" ? marked : "");
    const warnings = [];
    if (!taxonomy.disciplina) warnings.push("Disciplina não confirmada no cabeçalho.");
    if (!taxonomy.assunto) warnings.push("Assunto não confirmado no cabeçalho.");
    if (!type) warnings.push("Tipo não identificado com segurança.");
    if (type === "multipla" && Object.keys(alternatives).length < 4) warnings.push("Nem todas as alternativas foram lidas.");
    return {
      index, ...taxonomy, ...metadata, enunciado: strictStatement(text), alternativas,
      comentarioQc: strictComment(text), justificativa: strictComment(text), fundamento: strictComment(text),
      tipo: type, officialKey, status, correct: status === "certo", segment: text,
      confidence: Math.max(0, 100 - warnings.length * 22), reviewRequired: warnings.length > 0 || !strictStatement(text),
      extractionWarnings: warnings, ignoredCommunityComments: COMMUNITY.test(text), cardYStart: original.cardYStart || 0, cardYEnd: original.cardYEnd || 0
    };
  }
  function strictMatches(questions, visualByCard, bank) {
    const used = new Set();
    return questions.map((draft, index) => {
      const visual = visualByCard[index] || {}; const matchText = [draft.referencia, draft.enunciado, draft.disciplina, draft.assunto, draft.banca, draft.ano].filter(Boolean).join(" ");
      const ranked = (bank || []).filter((question) => !used.has(question.id)).map((question) => ({ question, score: base.questionMatchScore?.(matchText, question) || 0 })).sort((a, b) => b.score - a.score);
      const best = ranked[0]?.score >= 0.42 ? ranked[0] : null; if (best?.question?.id) used.add(best.question.id);
      const storedKey = normalizeAnswer(best?.question?.gabarito || ""); const marked = normalizeAnswer(visual.marked || "");
      return { index, questionId: best?.question?.id || "", matchScore: best?.score || 0, matchMethod: best ? "texto" : "novo", optionCount: Number(visual.optionCount) || Object.keys(draft.alternativas || {}).length, detectedType: draft.tipo || "", marked, officialKey: draft.officialKey || storedKey, status: draft.status, comment: draft.comentarioQc || "", visualConfidence: visual.confidence || "revisar", segment: draft.segment || "", questionDraft: draft };
    });
  }

  const wrapped = {
    ...base,
    version: VERSION,
    __aldusAccuracyV190: true,
    async readFile(file, options = {}) {
      const parsed = await base.readFile(file, options);
      const visualByCard = parsed.cards?.length && base.assignMarksToCards ? base.assignMarksToCards(parsed.cards, parsed.visualAnswers || []) : (parsed.visualAnswers || []);
      let refined = new Map();
      try { refined = await refineAlternatives(file, parsed, visualByCard, options.onProgress); }
      catch (error) { parsed.ocrError = [parsed.ocrError, `Segunda leitura: ${error.message}`].filter(Boolean).join(" • "); }
      const structuredQuestions = (parsed.structuredQuestions || []).map((_, index) => strictQuestion(parsed, index, visualByCard[index] || {}, refined.get(index) || {}, options));
      const matches = strictMatches(structuredQuestions, visualByCard, options.questions || []);
      return { ...parsed, version: VERSION, structuredQuestions, matches, accuracyMode: "strict", inferredFields: 0, uncertainFieldsLeftBlank: true };
    }
  };
  globalThis.AldusQconcursosCaptureImport = Object.freeze(wrapped);
  globalThis.__ALDUS_QC_CAPTURE_ACCURACY_V190__ = Object.freeze({ version: VERSION });
})();
