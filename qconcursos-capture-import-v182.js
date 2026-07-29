(() => {
  "use strict";

  const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";
  const TOKEN_STOPWORDS = new Set([
    "a", "as", "ao", "aos", "com", "como", "da", "das", "de", "do", "dos", "e", "em",
    "entre", "é", "foi", "na", "nas", "no", "nos", "o", "os", "ou", "para", "por", "que",
    "se", "sem", "sob", "sobre", "um", "uma"
  ]);

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenSet(value) {
    return new Set(canonical(value)
      .split(" ")
      .filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token)));
  }

  function questionMatchScore(segment, question) {
    const source = tokenSet(segment);
    const target = tokenSet([
      question?.enunciado,
      question?.disciplina,
      question?.assunto,
      question?.banca,
      question?.ano
    ].filter(Boolean).join(" "));
    if (!source.size || !target.size) return 0;
    let common = 0;
    target.forEach((token) => {
      if (source.has(token)) common += 1;
    });
    return common / Math.max(1, Math.min(target.size, 45));
  }

  function groupRows(rows, maxGap) {
    const groups = [];
    rows.forEach((row) => {
      const current = groups.at(-1);
      if (!current || row - current.at(-1) > maxGap) groups.push([row]);
      else current.push(row);
    });
    return groups;
  }

  function analyzeImageData(imageData, sourceWidth, sourceHeight) {
    const { data, width, height } = imageData;
    const scale = Math.max(0.5, sourceWidth / 1896);
    const rowCounts = new Uint32Array(height);
    const xStart = Math.max(0, Math.floor(sourceWidth * 0.085));
    const xEnd = Math.min(sourceWidth, Math.ceil(sourceWidth * 0.135));
    const yFloor = Math.floor(sourceHeight * 0.18);
    const localXStart = Math.max(0, xStart - Math.floor(sourceWidth * 0.075));
    const localXEnd = Math.min(width, xEnd - Math.floor(sourceWidth * 0.075));

    for (let y = Math.max(0, yFloor - Math.floor(sourceHeight * 0.18)); y < height; y += 1) {
      let count = 0;
      for (let x = localXStart; x < localXEnd; x += 1) {
        const offset = (y * width + x) * 4;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        if (red > 220 && green > 70 && green < 190 && blue < 120 && red - green > 60) count += 1;
      }
      rowCounts[y] = count;
    }

    const activeRows = [];
    const minimumRowPixels = Math.max(2, Math.round(2 * scale));
    rowCounts.forEach((count, row) => {
      if (count >= minimumRowPixels) activeRows.push(row);
    });

    const rowGroups = groupRows(activeRows, Math.max(2, Math.round(3 * scale)));
    const circleRows = rowGroups.map((rows) => {
      const first = rows[0];
      const last = rows.at(-1);
      let total = 0;
      let maximum = 0;
      rows.forEach((row) => {
        total += rowCounts[row];
        maximum = Math.max(maximum, rowCounts[row]);
      });
      return {
        y: Math.round((first + last) / 2 + yFloor),
        height: last - first + 1,
        total,
        maximum,
        filled: total >= 420 * scale * scale || maximum >= 20 * scale
      };
    }).filter((row) => (
      row.height >= 18 * scale
      && row.height <= 55 * scale
      && row.total >= 35 * scale * scale
    ));

    const optionGroups = [];
    circleRows.forEach((row) => {
      const current = optionGroups.at(-1);
      if (!current || row.y - current.at(-1).y > 210 * scale) optionGroups.push([row]);
      else current.push(row);
    });

    return optionGroups
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
          confidence: selectedIndex >= 0 ? "alta" : "revisar"
        };
      });
  }

  async function imageAnalysis(file) {
    const bitmap = await createImageBitmap(file);
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const x = Math.floor(sourceWidth * 0.075);
    const y = Math.floor(sourceHeight * 0.18);
    const width = Math.max(1, Math.ceil(sourceWidth * 0.085));
    const height = Math.max(1, sourceHeight - y);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
    bitmap.close?.();
    return {
      width: sourceWidth,
      height: sourceHeight,
      answers: analyzeImageData(context.getImageData(0, 0, width, height), sourceWidth, sourceHeight)
    };
  }

  function parseOcrText(text) {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const statusIndexes = [];
    lines.forEach((line, index) => {
      const normalized = canonical(line);
      if ((normalized.includes("parabens") && normalized.includes("acertou"))
        || (normalized.includes("incorreta") && normalized.includes("gabarito"))) {
        statusIndexes.push(index);
      }
    });

    return statusIndexes.map((statusIndex, resultIndex) => {
      const previousStatus = resultIndex ? statusIndexes[resultIndex - 1] : -1;
      const nextStatus = statusIndexes[resultIndex + 1] ?? lines.length;
      const statusLine = lines[statusIndex];
      const normalizedStatus = canonical(statusLine);
      const officialKey = statusLine.match(/gabarito[^:]*:\s*([A-E])/i)?.[1]?.toUpperCase() || "";
      const tail = lines.slice(statusIndex + 1, nextStatus);
      const relatedIndex = tail.findIndex((line) => canonical(line).includes("resumo relacionado"));
      let comment = "";
      if (relatedIndex >= 0) {
        const related = tail.slice(relatedIndex + 1);
        const stopIndex = related.findIndex((line, index) => (
          index > 0 && (/^ano\s*:/i.test(line) || /^direito\s+/i.test(line))
        ));
        comment = related.slice(0, stopIndex >= 0 ? stopIndex : 4).join(" ").slice(0, 900);
      }
      return {
        index: resultIndex,
        correct: normalizedStatus.includes("parabens") && normalizedStatus.includes("acertou"),
        status: normalizedStatus.includes("incorreta") ? "errado" : "certo",
        officialKey,
        segment: lines.slice(previousStatus + 1, statusIndex).join(" "),
        comment
      };
    });
  }

  function matchResults(ocrResults, visualResults, questions) {
    const sourceResults = ocrResults.length
      ? ocrResults
      : visualResults.map((_, index) => ({ index, status: "", correct: false, officialKey: "", segment: "", comment: "" }));
    const usedQuestionIds = new Set();
    return sourceResults.map((result, index) => {
      const visual = visualResults[index] || {};
      const ranked = (questions || [])
        .filter((question) => !usedQuestionIds.has(question.id))
        .map((question) => ({ question, score: questionMatchScore(result.segment, question) }))
        .sort((a, b) => b.score - a.score);
      const fallback = (questions || []).find((question) => !usedQuestionIds.has(question.id));
      const best = ranked[0]?.score >= 0.28 ? ranked[0] : (questions?.[index] && !usedQuestionIds.has(questions[index].id)
        ? { question: questions[index], score: 0 }
        : (fallback ? { question: fallback, score: 0 } : null));
      if (best?.question?.id) usedQuestionIds.add(best.question.id);
      const questionKey = String(best?.question?.gabarito || "").toUpperCase();
      const marked = visual.marked || (result.correct ? questionKey : "");
      return {
        index,
        questionId: best?.question?.id || "",
        matchScore: best?.score || 0,
        matchMethod: best?.score >= 0.28 ? "texto" : "ordem",
        optionCount: Number(visual.optionCount) || 0,
        detectedType: Number(visual.optionCount) >= 4
          ? "multipla"
          : (Number(visual.optionCount) === 2 ? "ce" : ""),
        marked,
        officialKey: result.officialKey || questionKey,
        status: result.status || (marked && questionKey ? (marked === questionKey ? "certo" : "errado") : "revisar"),
        comment: result.comment || "",
        visualConfidence: visual.confidence || "revisar",
        segment: result.segment || ""
      };
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
      script.addEventListener("error", () => reject(new Error("Não foi possível carregar o leitor de texto. A prévia visual continuará disponível.")));
      document.head.append(script);
    });
    return globalThis.__ALDUS_TESSERACT_LOADING__;
  }

  async function recognizeText(file, onProgress) {
    const Tesseract = await loadOcrScript();
    if (!Tesseract?.createWorker) throw new Error("O leitor de texto não ficou disponível.");
    const worker = await Tesseract.createWorker("por", 1, {
      logger(message) {
        if (message?.status && typeof onProgress === "function") onProgress(message);
      }
    });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM?.SINGLE_BLOCK || "6" });
      const result = await worker.recognize(file);
      return result?.data?.text || "";
    } finally {
      await worker.terminate();
    }
  }

  async function fileFingerprint(file) {
    if (!globalThis.crypto?.subtle) return `${file.name}|${file.size}|${file.lastModified}`;
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function readFile(file, options = {}) {
    if (!file || !/png/i.test(file.type || file.name || "")) throw new Error("Selecione a captura original em PNG.");
    const fingerprint = await fileFingerprint(file);
    if (options.existingFingerprints?.has?.(fingerprint)) {
      throw new Error("Esta captura já foi registrada anteriormente.");
    }
    options.onProgress?.({ status: "analisando marcações", progress: 0.05 });
    const visual = await imageAnalysis(file);
    let text = "";
    let ocrError = "";
    try {
      text = await recognizeText(file, options.onProgress);
    } catch (error) {
      ocrError = error.message;
    }
    const ocrResults = parseOcrText(text);
    const matches = matchResults(ocrResults, visual.answers, options.questions || []);
    if (!matches.length) throw new Error("Não foi possível identificar resultados na captura.");
    return {
      fileName: file.name,
      fingerprint,
      width: visual.width,
      height: visual.height,
      visualAnswers: visual.answers,
      ocrResults,
      matches,
      ocrError
    };
  }

  globalThis.AldusQconcursosCaptureImport = Object.freeze({
    analyzeImageData,
    parseOcrText,
    questionMatchScore,
    matchResults,
    fileFingerprint,
    readFile
  });
})();
