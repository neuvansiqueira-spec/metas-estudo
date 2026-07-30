(() => {
  "use strict";
  const VERSION = "20260730-correcao-escopo-alternativas-v189";
  const base = globalThis.AldusQconcursosCaptureImport;
  if (!base?.readFile || globalThis.__ALDUS_QC_CAPTURE_SCOPE_FIX_V189__) return;

  function fixedParseQuestionCardText(text, card = {}, options = {}) {
    const original = base.parseQuestionCardText;
    try {
      return original(text, card, options);
    } catch (error) {
      if (!/alternativas is not defined/i.test(String(error?.message || error))) throw error;
      const source = String(text || "");
      const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const reference = lines.map((line) => line.match(/\bQ\s*(\d{4,})\b/i)).find(Boolean);
      const alternatives = {};
      let current = "";
      for (const line of lines) {
        const match = line.match(/^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i) || line.match(/^\s*([A-E])\s+(.{3,})$/i);
        if (match) {
          current = match[1].toUpperCase();
          alternatives[current] = (match[2] || "").trim();
        } else if (current && !/^(gabarito|coment[aá]rios?|estat[ií]sticas?|responder)/i.test(line)) {
          alternatives[current] = `${alternatives[current]} ${line}`.trim();
        }
      }
      const headerIndex = Math.max(0, lines.findIndex((line) => /\bQ\s*\d{4,}\b/i.test(line)));
      const firstOptionIndex = lines.findIndex((line, index) => index > headerIndex && (/^\s*[\(\[]?[A-E][\)\].:\-]/i.test(line) || /^\s*[A-E]\s+.{3,}$/i.test(line)));
      const enunciado = lines.slice(headerIndex + 1, firstOptionIndex >= 0 ? firstOptionIndex : lines.length)
        .filter((line) => !/^(ano|banca|[oó]rg[aã]o|cargo|prova)\s*:/i.test(line))
        .join(" ").replace(/\s+/g, " ").trim();
      const taxonomyText = lines[headerIndex] || "";
      const tail = taxonomyText.replace(/^.*?\bQ\s*\d{4,}\b/i, "").replace(/^\s*\d+\s*/, "").trim();
      const parts = tail.split(/\s*(?:›|»|→|﹥|>)\s*/).map((part) => part.trim()).filter(Boolean);
      return {
        index: card.index || 0,
        disciplina: parts[0] || "",
        assunto: parts[1] || "",
        tema: parts.slice(2).join(" › "),
        banca: lines.find((line) => /\b(cebraspe|cespe|fgv|fcc|vunesp|ibfc|aocp|fundatec|iades|idecan|quadrix|cesgranrio)\b/i.test(line))?.match(/\b(CEBRASPE|CESPE|FGV|FCC|VUNESP|IBFC|AOCP|FUNDATEC|IADES|IDECAN|Quadrix|CESGRANRIO)\b/i)?.[1] || "",
        ano: lines.join(" ").match(/\b(?:19|20)\d{2}\b/)?.[0] || "",
        orgao: "",
        cargo: "",
        prova: "",
        referencia: reference ? `Q${reference[1]}` : "",
        qcCodigo: reference ? `Q${reference[1]}` : "",
        enunciado,
        alternativas: alternatives,
        comentarioQc: "",
        justificativa: "",
        fundamento: "",
        ignoredCommunityComments: /mais curtidos|reportar abuso|gostei\s*\(|respostas?\s*\(/i.test(source),
        tipo: Object.keys(alternatives).length >= 4 ? "multipla" : (alternatives.C && alternatives.E ? "ce" : ""),
        officialKey: "",
        status: "revisar",
        correct: false,
        segment: lines.join(" "),
        confidence: 0,
        reviewRequired: !enunciado || !parts[0] || !parts[1],
        cardYStart: card.headerYStart || card.yStart || 0,
        cardYEnd: card.boundaryEnd || card.ocrEnd || 0
      };
    }
  }

  const originalReadFile = base.readFile.bind(base);
  async function readFile(file, options = {}) {
    try {
      return await originalReadFile(file, options);
    } catch (error) {
      if (!/alternativas is not defined/i.test(String(error?.message || error))) throw error;
      throw new Error("O leitor anterior encontrou um erro interno ao organizar as alternativas. Atualize a página novamente para ativar a correção V189.");
    }
  }

  globalThis.AldusQconcursosCaptureImport = Object.freeze({
    ...base,
    version: VERSION,
    parseQuestionCardText: fixedParseQuestionCardText,
    readFile,
    __aldusScopeFixV189: true
  });
  globalThis.__ALDUS_QC_CAPTURE_SCOPE_FIX_V189__ = Object.freeze({ version: VERSION });
})();