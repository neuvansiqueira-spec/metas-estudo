(() => {
  "use strict";

  const VERSION = "20260730-correcao-escopo-alternativas-v189";
  const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";
  const base = globalThis.AldusQconcursosCaptureImport;
  if (!base?.readFile || globalThis.__ALDUS_QC_CAPTURE_SCOPE_FIX_V189__) return;

  const BOARD_PATTERNS = [
    ["CEBRASPE", /\b(cebraspe|cespe)\b/i],
    ["FGV", /\bfgv\b|funda[cç][aã]o get[uú]lio vargas/i],
    ["FCC", /\bfcc\b|funda[cç][aã]o carlos chagas/i],
    ["VUNESP", /\bvunesp\b/i],
    ["IBFC", /\bibfc\b/i],
    ["Instituto AOCP", /\baocp\b/i],
    ["FUNDATEC", /\bfundatec\b/i],
    ["IADES", /\biades\b/i],
    ["IDECAN", /\bidecan\b/i],
    ["Quadrix", /\bquadrix\b/i],
    ["CESGRANRIO", /\bcesgranrio\b/i],
    ["NC-UFPR", /\bnc\s*[-/]?\s*ufpr\b/i]
  ];
  const TOOLBAR_WORDS = ["gabarito comentado", "aulas", "comentarios", "estatisticas", "cadernos", "criar anotacoes", "notificar erro"];
  const COMMUNITY_COMMENT_PATTERNS = [
    /ordenando por/i,
    /mais curtidos/i,
    /acompanhar coment/i,
    /reportar abuso/i,
    /escreva o seu coment/i,
    /\bgostei\s*\(/i,
    /\brespostas?\s*\(/i,
    /carregar mais/i,
    /\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2}\s+[aà]s\s+\d{1,2}:\d{2}/i
  ];
  const UI_NOISE = /^(responder|resolvi certo|resolvi errado|ficou com d[uú]vidas|coment[aá]rios?|estat[ií]sticas?|reportar erro|salvar|pr[oó]xima|anterior|ver resposta|quest[oõ]es relacionadas)$/i;

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/[\t ]+/g, " ").trim())
      .filter(Boolean);
  }

  function detectBoard(line) {
    for (const [name, pattern] of BOARD_PATTERNS) if (pattern.test(line)) return name;
    return "";
  }

  function normalizeAnswer(value) {
    const normalized = canonical(value).replace(/\s+/g, "");
    if (["c", "certo", "correto", "verdadeiro"].includes(normalized)) return "C";
    if (["e", "errado", "incorreto", "falso"].includes(normalized)) return "E";
    if (/^[abcde]$/.test(normalized)) return normalized.toUpperCase();
    return "";
  }

  function questionReference(lines) {
    for (const line of lines) {
      const match = line.match(/\bQ\s*(\d{4,})\b/i);
      if (match) return `Q${match[1]}`;
    }
    return "";
  }

  function extractInlineMetadata(lines) {
    const result = { banca: "", ano: "", orgao: "", cargo: "", prova: "" };
    const labels = /(Ano|Banca|[ÓO]rg[aã]o|Institui[cç][aã]o|Cargo|Prova)\s*:\s*/gi;
    lines.forEach((line) => {
      const matches = [...line.matchAll(labels)];
      matches.forEach((match, index) => {
        const start = match.index + match[0].length;
        const end = matches[index + 1]?.index ?? line.length;
        const value = line.slice(start, end).trim().replace(/[|•]+$/, "").trim();
        const key = canonical(match[1]);
        if (key === "ano") result.ano ||= value.match(/\b(?:19|20)\d{2}\b/)?.[0] || value;
        else if (key === "banca") result.banca ||= detectBoard(value) || value;
        else if (key === "orgao" || key === "instituicao") result.orgao ||= value;
        else if (key === "cargo") result.cargo ||= value;
        else if (key === "prova") result.prova ||= value;
      });
      result.banca ||= detectBoard(line);
      if (!result.ano) result.ano = line.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
    });
    if (!result.cargo && result.prova) {
      const parts = result.prova.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
      const roleIndex = parts.findIndex((part) => /\b(delegad[oa]|escriv[aã]|investigador|agente|perito|analista|t[eé]cnico|promotor|procurador|juiz|defensor)\b/i.test(part));
      if (roleIndex >= 0) result.cargo = parts.slice(roleIndex).join(" - ");
    }
    return result;
  }

  function knownTaxonomy(options = {}) {
    return (options.knownTaxonomy || []).map((item) => ({
      discipline: String(item.discipline || item.disciplina || "").trim(),
      subject: String(item.subject || item.assunto || item.topic || "").trim(),
      theme: String(item.theme || item.tema || item.subtopic || item.subassunto || "").trim()
    })).filter((item) => item.discipline || item.subject);
  }

  function extractTaxonomy(headerLine, options = {}) {
    const referenceMatch = headerLine.match(/\bQ\s*\d{4,}\b/i);
    let tail = referenceMatch ? headerLine.slice((referenceMatch.index || 0) + referenceMatch[0].length) : headerLine;
    tail = tail.replace(/^\s*\d+\s*/, "").trim();
    const parts = tail.split(/\s*(?:›|»|→|﹥|>)\s*/).map((part) => part.replace(/^,|,$/g, "").trim()).filter(Boolean);
    const taxonomy = knownTaxonomy(options);
    const tailCanonical = canonical(tail);
    const disciplineMatch = taxonomy
      .filter((item) => item.discipline && tailCanonical.startsWith(canonical(item.discipline)))
      .sort((a, b) => b.discipline.length - a.discipline.length)[0];
    const disciplina = disciplineMatch?.discipline || parts[0] || "";
    const subjectCandidates = taxonomy.filter((item) => canonical(item.discipline) === canonical(disciplina) && item.subject);
    const subjectMatch = subjectCandidates
      .filter((item) => tailCanonical.includes(canonical(item.subject)))
      .sort((a, b) => b.subject.length - a.subject.length)[0];
    const assunto = subjectMatch?.subject || parts[1] || "";
    const tema = subjectMatch?.theme || parts.slice(2).join(" › ") || "";
    return { disciplina, assunto, tema };
  }

  function optionLine(line) {
    return line.match(/^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i)
      || line.match(/^\s*([A-E])\s+(.{3,})$/i);
  }

  function toolbarLine(line) {
    const normalized = canonical(line);
    const matches = TOOLBAR_WORDS.filter((word) => normalized.includes(word)).length;
    return matches >= 2 || /^(gabarito comentado|comentarios?\s*\(\d+\)|estatisticas?)$/.test(normalized);
  }

  function statusLine(line) {
    const normalized = canonical(line);
    return normalized.includes("parabens voce acertou")
      || normalized.includes("incorreta gabarito oficial")
      || normalized.includes("resolvi certo")
      || normalized.includes("resolvi errado")
      || normalized.includes("voce errou")
      || normalized.includes("resposta correta");
  }

  function parseAlternatives(lines) {
    const alternatives = {};
    let current = "";
    for (const line of lines) {
      const exact = canonical(line);
      if (exact === "certo") { current = "C"; alternatives.C = "Certo"; continue; }
      if (exact === "errado") { current = "E"; alternatives.E = "Errado"; continue; }
      const match = optionLine(line);
      if (match) {
        current = match[1].toUpperCase();
        alternatives[current] = (match[2] || "").trim();
        continue;
      }
      if (current && !statusLine(line) && !toolbarLine(line) && !UI_NOISE.test(line)) {
        alternatives[current] = `${alternatives[current]} ${line}`.trim();
      }
    }
    return alternatives;
  }

  function parseOfficialComment(panelLines) {
    const panelText = panelLines.join("\n");
    if (COMMUNITY_COMMENT_PATTERNS.some((pattern) => pattern.test(panelText))) {
      return { comment: "", ignoredCommunityComments: true };
    }
    const relevant = panelLines.filter((line) => {
      const normalized = canonical(line);
      return line.length > 2
        && !toolbarLine(line)
        && !UI_NOISE.test(line)
        && !/^(gabarito comentado|aulas|comentarios|estatisticas|cadernos|criar anotacoes|notificar erro)/.test(normalized);
    });
    return {
      comment: relevant.join(" ").replace(/\s+/g, " ").trim().slice(0, 2400),
      ignoredCommunityComments: false
    };
  }

  function parseQuestionCardText(text, card = {}, options = {}) {
    const lines = cleanLines(text);
    const reference = questionReference(lines);
    const headerIndex = Math.max(0, lines.findIndex((line) => /\bQ\s*\d{4,}\b/i.test(line)));
    const headerLine = lines[headerIndex] || "";
    const toolbarIndex = lines.findIndex((line, index) => index > headerIndex && toolbarLine(line));
    const bodyEnd = toolbarIndex >= 0 ? toolbarIndex : lines.length;
    const bodyLines = lines.slice(headerIndex, bodyEnd);
    const panelLines = toolbarIndex >= 0 ? lines.slice(toolbarIndex + 1) : [];
    const taxonomy = extractTaxonomy(headerLine, options);
    const metadata = extractInlineMetadata(bodyLines);
    const alternatives = parseAlternatives(bodyLines);
    const firstOptionIndex = bodyLines.findIndex((line) => optionLine(line) || ["certo", "errado"].includes(canonical(line)));
    const statementSource = bodyLines.slice(1, firstOptionIndex >= 0 ? firstOptionIndex : bodyLines.length);
    const enunciado = statementSource.filter((line) => {
      const normalized = canonical(line);
      return !statusLine(line)
        && !toolbarLine(line)
        && !UI_NOISE.test(line)
        && !/^(ano|banca|orgao|instituicao|cargo|prova)\s*:/.test(normalized)
        && !/^(responder|parabens|incorreta|gabarito oficial)/.test(normalized)
        && !detectBoard(line);
    }).join(" ").replace(/\s+/g, " ").trim();
    const statusText = bodyLines.find(statusLine) || "";
    const combinedBody = bodyLines.join(" ");
    const keyMatch = combinedBody.match(/gabarito(?:\s+oficial(?:\s+da\s+banca)?)?\s*:\s*(A|B|C|D|E|Certo|Errado)/i);
    const officialKey = normalizeAnswer(keyMatch?.[1] || "");
    const normalizedStatus = canonical(statusText || combinedBody);
    const status = normalizedStatus.includes("incorreta") || normalizedStatus.includes("resolvi errado") || normalizedStatus.includes("voce errou")
      ? "errado"
      : (normalizedStatus.includes("parabens") || normalizedStatus.includes("resolvi certo") || normalizedStatus.includes("resposta correta") ? "certo" : "revisar");
    const commentary = parseOfficialComment(panelLines);
    const type = Object.keys(alternatives).length >= 4 ? "multipla" : (alternatives.C && alternatives.E ? "ce" : "");
    const fields = [reference, taxonomy.disciplina, taxonomy.assunto, metadata.banca, metadata.ano, metadata.orgao, metadata.cargo, enunciado];
    const confidence = Math.round(fields.filter(Boolean).length / fields.length * 100);
    return {
      index: card.index || 0,
      ...taxonomy,
      ...metadata,
      referencia: reference,
      qcCodigo: reference,
      enunciado,
      alternativas: alternatives,
      comentarioQc: commentary.comment,
      justificativa: commentary.comment,
      fundamento: commentary.comment,
      ignoredCommunityComments: commentary.ignoredCommunityComments,
      tipo: type,
      officialKey,
      status,
      correct: status === "certo",
      segment: bodyLines.join(" "),
      confidence,
      reviewRequired: !enunciado || !taxonomy.disciplina || !taxonomy.assunto,
      cardYStart: card.headerYStart || card.yStart || 0,
      cardYEnd: card.boundaryEnd || card.ocrEnd || 0
    };
  }

  function parseLegacyText(text, options = {}) {
    const lines = cleanLines(text);
    const statusIndexes = [];
    lines.forEach((line, index) => { if (statusLine(line)) statusIndexes.push(index); });
    return statusIndexes.map((statusIndex, index) => {
      const start = index ? statusIndexes[index - 1] + 1 : 0;
      const end = statusIndexes[index + 1] ?? lines.length;
      return parseQuestionCardText(lines.slice(start, end).join("\n"), { index }, options);
    });
  }

  function loadOcrScript() {
    if (globalThis.Tesseract?.createWorker) return Promise.resolve(globalThis.Tesseract);
    if (globalThis.__ALDUS_TESSERACT_LOADING__) return globalThis.__ALDUS_TESSERACT_LOADING__;
    globalThis.__ALDUS_TESSERACT_LOADING__ = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = OCR_SCRIPT_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", () => resolve(globalThis.Tesseract));
      script.addEventListener("error", () => reject(new Error("Não foi possível carregar o leitor de texto.")));
      document.head.append(script);
    });
    return globalThis.__ALDUS_TESSERACT_LOADING__;
  }

  function cardCanvas(bitmap, card) {
    const sourceX = Math.floor(bitmap.width * 0.02);
    const sourceWidth = Math.max(1, Math.ceil(bitmap.width * 0.96));
    const sourceHeight = Math.max(1, card.ocrEnd - card.yStart);
    const ratio = Math.min(1, 1800 / sourceWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * ratio));
    canvas.height = Math.max(1, Math.round(sourceHeight * ratio));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, sourceX, card.yStart, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function recognizeCards(bitmap, cards, onProgress) {
    const Tesseract = await loadOcrScript();
    if (!Tesseract?.createWorker) throw new Error("O leitor de texto não ficou disponível.");
    let currentIndex = 0;
    const worker = await Tesseract.createWorker("por", 1, {
      logger(message) {
        if (typeof onProgress !== "function" || !message?.status) return;
        const localProgress = Number(message.progress) || 0;
        const combined = 0.10 + ((currentIndex + localProgress) / Math.max(1, cards.length)) * 0.84;
        onProgress({ status: `lendo questão ${currentIndex + 1} de ${cards.length}`, progress: Math.min(0.94, combined) });
      }
    });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM?.AUTO || "3", preserve_interword_spaces: "1" });
      const output = [];
      for (currentIndex = 0; currentIndex < cards.length; currentIndex += 1) {
        const result = await worker.recognize(cardCanvas(bitmap, cards[currentIndex]));
        output.push(result?.data?.text || "");
      }
      return output;
    } finally {
      await worker.terminate();
    }
  }

  async function recognizeWholeFile(file, onProgress) {
    const Tesseract = await loadOcrScript();
    const worker = await Tesseract.createWorker("por", 1, { logger: onProgress });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM?.AUTO || "3", preserve_interword_spaces: "1" });
      const result = await worker.recognize(file);
      return result?.data?.text || "";
    } finally {
      await worker.terminate();
    }
  }

  async function readFile(file, options = {}) {
    if (!file || !/png|jpe?g|webp/i.test(file.type || file.name || "")) throw new Error("Selecione uma captura em PNG, JPG ou WEBP.");
    const fingerprint = await base.fileFingerprint(file);
    if (options.existingFingerprints?.has?.(fingerprint)) throw new Error("Esta captura já foi registrada anteriormente.");
    options.onProgress?.({ status: "localizando cartões de questão", progress: 0.03 });
    const bitmap = await createImageBitmap(file);
    try {
      const cards = base.detectQuestionCards(bitmap);
      const visualAnswers = base.analyzeAnswerMarks(bitmap);
      let structuredQuestions = [];
      let ocrError = "";
      let rawText = "";
      if (cards.length) {
        try {
          const texts = await recognizeCards(bitmap, cards, options.onProgress);
          rawText = texts.join("\n\n--- CARTÃO ---\n\n");
          structuredQuestions = texts.map((text, index) => parseQuestionCardText(text, cards[index], options));
        } catch (error) {
          ocrError = error.message;
        }
      } else {
        try {
          rawText = await recognizeWholeFile(file, options.onProgress);
          structuredQuestions = parseLegacyText(rawText, options);
        } catch (error) {
          ocrError = error.message;
        }
      }
      if (!structuredQuestions.length && ocrError) throw new Error(ocrError);
      const visualByCard = cards.length ? base.assignMarksToCards(cards, visualAnswers) : visualAnswers;
      const matches = base.matchResults(structuredQuestions, visualByCard, options.questions || []);
      if (!matches.length) throw new Error("Não foi possível identificar questões ou resultados na captura.");
      options.onProgress?.({ status: "prévia pronta", progress: 1 });
      return {
        version: VERSION,
        fileName: file.name,
        fingerprint,
        width: bitmap.width,
        height: bitmap.height,
        cardCount: cards.length,
        cards,
        visualAnswers,
        structuredQuestions,
        matches,
        rawText,
        ignoredCommunityComments: structuredQuestions.filter((question) => question.ignoredCommunityComments).length,
        ocrError
      };
    } finally {
      bitmap.close?.();
    }
  }

  globalThis.AldusQconcursosCaptureImport = Object.freeze({
    ...base,
    version: VERSION,
    parseQuestionCardText,
    parseLegacyText,
    readFile,
    __aldusScopeFixV189: true
  });
  globalThis.__ALDUS_QC_CAPTURE_SCOPE_FIX_V189__ = Object.freeze({ version: VERSION });
})();