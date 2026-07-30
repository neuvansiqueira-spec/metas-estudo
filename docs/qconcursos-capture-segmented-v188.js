(() => {
  "use strict";

  const VERSION = "20260730-segmentacao-cartoes-qconcursos-v188";
  const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";
  const TOKEN_STOPWORDS = new Set([
    "a", "as", "ao", "aos", "com", "como", "da", "das", "de", "do", "dos", "e", "em",
    "entre", "foi", "na", "nas", "no", "nos", "o", "os", "ou", "para", "por", "que", "se",
    "sem", "sob", "sobre", "um", "uma"
  ]);
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
  const TOOLBAR_WORDS = [
    "gabarito comentado", "aulas", "comentarios", "estatisticas", "cadernos", "criar anotacoes", "notificar erro"
  ];
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

  function tokenSet(value) {
    return new Set(canonical(value).split(" ").filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token)));
  }

  function questionMatchScore(segment, question) {
    const source = tokenSet(segment);
    const target = tokenSet([
      question?.enunciado,
      question?.disciplina,
      question?.assunto,
      question?.tema,
      question?.banca,
      question?.ano,
      question?.cargo,
      question?.orgao,
      question?.referencia
    ].filter(Boolean).join(" "));
    if (!source.size || !target.size) return 0;
    let common = 0;
    target.forEach((token) => { if (source.has(token)) common += 1; });
    return common / Math.max(1, Math.min(target.size, 65));
  }

  function groupRows(rows, maxGap = 4) {
    const groups = [];
    rows.forEach((row) => {
      const current = groups.at(-1);
      if (!current || row - current.at(-1) > maxGap) groups.push([row]);
      else current.push(row);
    });
    return groups;
  }

  function detectQuestionHeaderBands(imageData, sourceWidth, sourceHeight) {
    const { data, width, height } = imageData;
    const threshold = Math.max(24, Math.round(sourceWidth * 0.03));
    const activeRows = [];

    for (let y = 0; y < height; y += 1) {
      let count = 0;
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const brightness = (red + green + blue) / 3;
        if (maximum - minimum < 22 && brightness >= 145 && brightness <= 208) count += 1;
      }
      if (count >= threshold) activeRows.push(y);
    }

    const minimumHeight = Math.max(20, Math.round(sourceWidth * 0.008));
    const maximumHeight = Math.max(100, Math.round(sourceWidth * 0.06));
    return groupRows(activeRows, 4)
      .map((rows) => ({
        yStart: rows[0],
        yEnd: rows.at(-1),
        height: rows.at(-1) - rows[0] + 1
      }))
      .filter((band) => band.height >= minimumHeight && band.height <= maximumHeight && band.yStart > sourceHeight * 0.08);
  }

  function detectQuestionCards(bitmap) {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const scanX = Math.floor(sourceWidth * 0.05);
    const scanWidth = Math.max(1, Math.ceil(sourceWidth * 0.20));
    const canvas = document.createElement("canvas");
    canvas.width = scanWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, scanX, 0, scanWidth, sourceHeight, 0, 0, scanWidth, sourceHeight);
    const bands = detectQuestionHeaderBands(context.getImageData(0, 0, scanWidth, sourceHeight), sourceWidth, sourceHeight);
    const maximumCardHeight = Math.max(1250, Math.round(sourceWidth * 0.88));
    return bands.map((band, index) => {
      const nextStart = bands[index + 1]?.yStart ?? sourceHeight;
      const boundaryEnd = Math.max(band.yEnd + 1, nextStart);
      return {
        index,
        yStart: Math.max(0, band.yStart - Math.round(sourceWidth * 0.008)),
        headerYStart: band.yStart,
        headerYEnd: band.yEnd,
        boundaryEnd,
        ocrEnd: Math.min(boundaryEnd, band.yStart + maximumCardHeight)
      };
    });
  }

  function analyzeAnswerMarks(bitmap) {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const x = Math.floor(sourceWidth * 0.075);
    const y = Math.floor(sourceHeight * 0.12);
    const width = Math.max(1, Math.ceil(sourceWidth * 0.09));
    const height = Math.max(1, sourceHeight - y);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const scale = Math.max(0.5, sourceWidth / 1896);
    const rowCounts = new Uint32Array(height);

    for (let localY = 0; localY < height; localY += 1) {
      let count = 0;
      for (let localX = 0; localX < width; localX += 1) {
        const offset = (localY * width + localX) * 4;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        if (red > 220 && green > 70 && green < 195 && blue < 125 && red - green > 55) count += 1;
      }
      rowCounts[localY] = count;
    }

    const activeRows = [];
    const minimumRowPixels = Math.max(2, Math.round(2 * scale));
    rowCounts.forEach((count, row) => { if (count >= minimumRowPixels) activeRows.push(row); });
    const circleRows = groupRows(activeRows, Math.max(2, Math.round(3 * scale)))
      .map((rows) => {
        const first = rows[0];
        const last = rows.at(-1);
        let total = 0;
        let maximum = 0;
        rows.forEach((row) => {
          total += rowCounts[row];
          maximum = Math.max(maximum, rowCounts[row]);
        });
        return {
          y: Math.round((first + last) / 2 + y),
          height: last - first + 1,
          total,
          maximum,
          filled: total >= 420 * scale * scale || maximum >= 20 * scale
        };
      })
      .filter((row) => row.height >= 18 * scale && row.height <= 58 * scale && row.total >= 35 * scale * scale);

    const groups = [];
    circleRows.forEach((row) => {
      const current = groups.at(-1);
      if (!current || row.y - current.at(-1).y > 215 * scale) groups.push([row]);
      else current.push(row);
    });

    return groups
      .filter((group) => group.length === 2 || (group.length >= 4 && group.length <= 5))
      .map((group, index) => {
        const selectedIndex = group.findIndex((row) => row.filled);
        const keys = group.length === 2 ? ["C", "E"] : ["A", "B", "C", "D", "E"];
        return {
          index,
          optionCount: group.length,
          marked: selectedIndex >= 0 ? keys[selectedIndex] : "",
          selectedIndex,
          yStart: group[0].y,
          yEnd: group.at(-1).y,
          yCenter: Math.round((group[0].y + group.at(-1).y) / 2),
          confidence: selectedIndex >= 0 ? "alta" : "revisar"
        };
      });
  }

  function assignMarksToCards(cards, answers) {
    return cards.map((card) => {
      const candidates = answers.filter((answer) => answer.yCenter >= card.headerYStart && answer.yCenter < card.boundaryEnd);
      return candidates.sort((a, b) => b.optionCount - a.optionCount || a.yCenter - b.yCenter)[0] || null;
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
      document.head.appendChild(script);
    });
    return globalThis.__ALDUS_TESSERACT_LOADING__;
  }

  function cardCanvas(bitmap, card) {
    const sourceX = Math.floor(bitmap.width * 0.02);
    const sourceWidth = Math.max(1, Math.ceil(bitmap.width * 0.96));
    const sourceHeight = Math.max(1, card.ocrEnd - card.yStart);
    const maximumWidth = 1800;
    const ratio = Math.min(1, maximumWidth / sourceWidth);
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
        const valueStart = match.index + match[0].length;
        const valueEnd = matches[index + 1]?.index ?? line.length;
        const value = line.slice(valueStart, valueEnd).trim().replace(/[|•]+$/, "").trim();
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
    const discipline = disciplineMatch?.discipline || parts[0] || "";
    const subjectCandidates = taxonomy.filter((item) => canonical(item.discipline) === canonical(discipline) && item.subject);
    const subjectMatch = subjectCandidates
      .filter((item) => tailCanonical.includes(canonical(item.subject)))
      .sort((a, b) => b.subject.length - a.subject.length)[0];
    const subject = subjectMatch?.subject || parts[1] || "";
    const theme = subjectMatch?.theme || parts.slice(2).join(" › ") || "";
    return { disciplina: discipline, assunto: subject, tema: theme };
  }

  function optionLine(line) {
    const conventional = line.match(/^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i);
    if (conventional) return conventional;
    const loose = line.match(/^\s*([A-E])\s+(.{3,})$/i);
    return loose;
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
    const community = COMMUNITY_COMMENT_PATTERNS.some((pattern) => pattern.test(panelText));
    if (community) return { comment: "", ignoredCommunityComments: true };
    const relevant = panelLines.filter((line) => {
      const normalized = canonical(line);
      return line.length > 2
        && !toolbarLine(line)
        && !UI_NOISE.test(line)
        && !/^(gabarito comentado|aulas|comentarios|estatisticas|cadernos|criar anotacoes|notificar erro)/.test(normalized);
    });
    const comment = relevant.join(" ").replace(/\s+/g, " ").trim().slice(0, 2400);
    return { comment, ignoredCommunityComments: false };
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
      alternativas,
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

  function matchResults(structuredQuestions, visualByCard, questions) {
    const used = new Set();
    return structuredQuestions.map((draft, index) => {
      const visual = visualByCard[index] || {};
      const matchText = [draft.segment, draft.enunciado, draft.disciplina, draft.assunto, draft.banca, draft.cargo, draft.orgao, draft.referencia].filter(Boolean).join(" ");
      const ranked = (questions || [])
        .filter((question) => !used.has(question.id))
        .map((question) => ({ question, score: questionMatchScore(matchText, question) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0]?.score >= 0.30 ? ranked[0] : null;
      if (best?.question?.id) used.add(best.question.id);
      const storedKey = normalizeAnswer(best?.question?.gabarito || "");
      const marked = visual.marked || (draft.status === "certo" ? (draft.officialKey || storedKey) : "");
      const officialKey = draft.officialKey || (draft.status === "certo" ? marked : "") || storedKey;
      return {
        index,
        questionId: best?.question?.id || "",
        matchScore: best?.score || 0,
        matchMethod: best ? "texto" : "novo",
        optionCount: Number(visual.optionCount) || Object.keys(draft.alternativas || {}).length,
        detectedType: Number(visual.optionCount) >= 4 ? "multipla" : (Number(visual.optionCount) === 2 ? "ce" : draft.tipo || ""),
        marked,
        officialKey,
        status: draft.status || (marked && officialKey ? (marked === officialKey ? "certo" : "errado") : "revisar"),
        comment: draft.comentarioQc || "",
        visualConfidence: visual.confidence || "revisar",
        segment: draft.segment || "",
        questionDraft: draft
      };
    });
  }

  async function fileFingerprint(file) {
    if (!globalThis.crypto?.subtle) return `${file.name}|${file.size}|${file.lastModified}`;
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function readFile(file, options = {}) {
    if (!file || !/png|jpe?g|webp/i.test(file.type || file.name || "")) {
      throw new Error("Selecione uma captura em PNG, JPG ou WEBP.");
    }
    const fingerprint = await fileFingerprint(file);
    if (options.existingFingerprints?.has?.(fingerprint)) throw new Error("Esta captura já foi registrada anteriormente.");

    options.onProgress?.({ status: "localizando cartões de questão", progress: 0.03 });
    const bitmap = await createImageBitmap(file);
    try {
      const cards = detectQuestionCards(bitmap);
      const visualAnswers = analyzeAnswerMarks(bitmap);
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
      const visualByCard = cards.length ? assignMarksToCards(cards, visualAnswers) : visualAnswers;
      const matches = matchResults(structuredQuestions, visualByCard, options.questions || []);
      if (!matches.length) throw new Error("Não foi possível identificar questões ou resultados na captura.");
      const ignoredCommunityComments = structuredQuestions.filter((question) => question.ignoredCommunityComments).length;
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
        ignoredCommunityComments,
        ocrError
      };
    } finally {
      bitmap.close?.();
    }
  }

  globalThis.AldusQconcursosCaptureImport = Object.freeze({
    version: VERSION,
    canonical,
    detectQuestionHeaderBands,
    detectQuestionCards,
    analyzeAnswerMarks,
    assignMarksToCards,
    parseQuestionCardText,
    parseLegacyText,
    questionMatchScore,
    matchResults,
    fileFingerprint,
    readFile
  });
})();
