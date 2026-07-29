(() => {
  "use strict";

  const PDF_MODULE_PATH = "vendor/pdf.mjs";
  const PDF_WORKER_PATH = "vendor/pdf.worker.mjs";
  const HEADER_CODE = /^Q\d+$/i;
  const ANSWER_KEY_NUMBER = /^(\d+):$/;
  const CHOICE_LABEL = /^[A-E]$/;

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function positionedItem(item, pageIndex, itemIndex) {
    return {
      text: cleanText(item?.str),
      x: Number(item?.transform?.[4]) || 0,
      y: Number(item?.transform?.[5]) || 0,
      pageIndex,
      itemIndex,
      order: pageIndex * 2000 + (1000 - (Number(item?.transform?.[5]) || 0)) * 2 + (Number(item?.transform?.[4]) || 0) / 1000
    };
  }

  function usefulItems(items, pageIndex) {
    return (items || [])
      .map((item, itemIndex) => positionedItem(item, pageIndex, itemIndex))
      .filter((item) => item.text && !/^www\.qconcursos\.com$/i.test(item.text));
  }

  function textFromItems(items) {
    return cleanText(items.slice().sort((a, b) => a.x - b.x || a.itemIndex - b.itemIndex).map((item) => item.text).join(" "));
  }

  function parseMetadata(text) {
    const value = cleanText(text);
    const year = value.match(/Ano:\s*(\d{4})/i)?.[1] || "";
    const board = value.match(/Banca:\s*(.*?)\s+Órgão:/i)?.[1] || "";
    const agency = value.match(/Órgão:\s*(.*?)\s+Provas?:/i)?.[1] || "";
    const exam = value.match(/Provas?:\s*(.*)$/i)?.[1] || "";
    const examParts = exam.split(/\s+-\s+/).map(cleanText).filter(Boolean);
    const role = examParts.length > 3 ? examParts.slice(3).join(" - ") : "";
    return { year, board: cleanText(board), agency: cleanText(agency), exam: cleanText(exam), role };
  }

  function parseAnswerKey(pageItems) {
    const answers = new Map();
    const flat = pageItems.flatMap((page) => page.items);
    const answerStart = flat.findIndex((item) => /^Respostas$/i.test(item.text));
    if (answerStart < 0) return answers;
    const answerItems = flat.slice(answerStart + 1);
    for (let index = 0; index < answerItems.length; index += 1) {
      const number = answerItems[index].text.match(ANSWER_KEY_NUMBER)?.[1];
      if (!number) continue;
      const answer = answerItems.slice(index + 1, index + 5).find((item) => CHOICE_LABEL.test(item.text))?.text.toUpperCase();
      if (answer) answers.set(Number(number), answer);
    }
    return answers;
  }

  function labelItems(contentItems) {
    const letterLabels = contentItems.filter((item) => item.x <= 52 && CHOICE_LABEL.test(item.text));
    if (letterLabels.length >= 4) return letterLabels.sort((a, b) => a.order - b.order);
    return contentItems
      .filter((item) => item.x <= 80 && /^(Certo|Errado)$/i.test(item.text))
      .sort((a, b) => a.order - b.order);
  }

  function parseQuestionBody(contentItems) {
    const ordered = contentItems.slice().sort((a, b) => a.order - b.order || a.x - b.x);
    const labels = labelItems(ordered);
    if (!labels.length) {
      return { statement: cleanText(ordered.map((item) => item.text).join(" ")), alternatives: {}, type: "Certo/Errado" };
    }

    const alternatives = {};
    const assigned = new Set();
    labels.forEach((label, index) => {
      const previous = labels[index - 1];
      const next = labels[index + 1];
      const upperBoundary = previous ? (previous.order + label.order) / 2 : label.order - 22;
      const lowerBoundary = next ? (label.order + next.order) / 2 : Number.POSITIVE_INFINITY;
      const key = /^Certo$/i.test(label.text) ? "C" : (/^Errado$/i.test(label.text) ? "E" : label.text.toUpperCase());
      const optionTextItems = ordered.filter((item) => (
        item !== label
        && item.x > 54
        && item.order >= upperBoundary
        && item.order < lowerBoundary
      ));
      optionTextItems.forEach((item) => assigned.add(item));
      assigned.add(label);
      alternatives[key] = cleanText(optionTextItems.map((item) => item.text).join(" "));
    });

    const firstLabel = labels[0];
    const statementLimit = firstLabel.order - 22;
    const statement = cleanText(ordered
      .filter((item) => !assigned.has(item) && item.order < statementLimit && item.x >= 30)
      .map((item) => item.text)
      .join(" "));
    const multipleChoice = Object.keys(alternatives).filter((key) => CHOICE_LABEL.test(key)).length >= 4;
    return {
      statement,
      alternatives: multipleChoice ? alternatives : {},
      type: multipleChoice ? "Múltipla escolha" : "Certo/Errado"
    };
  }

  function parsePageQuestions(pageItems, answers) {
    const questions = [];
    let previousQuestion = null;

    pageItems.forEach((page) => {
      const headers = page.items
        .filter((item) => HEADER_CODE.test(item.text))
        .sort((a, b) => b.y - a.y);
      const answerHeading = page.items.find((item) => /^Respostas$/i.test(item.text));

      if (previousQuestion && headers.length) {
        const continuation = page.items.filter((item) => item.y > headers[0].y + 20);
        previousQuestion.contentItems.push(...continuation);
      }

      headers.forEach((header, headerIndex) => {
        const nextHeader = headers[headerIndex + 1];
        const numberItem = page.items
          .filter((item) => Math.abs(item.y - header.y) <= 2 && item.x < header.x && /^\d+$/.test(item.text))
          .sort((a, b) => b.x - a.x)[0];
        const number = Number(numberItem?.text) || questions.length + 1;
        const classification = textFromItems(page.items.filter((item) => (
          Math.abs(item.y - header.y) <= 2
          && item.x > 120
        )));
        const metadataText = textFromItems(page.items.filter((item) => (
          item.y <= header.y - 7
          && item.y >= header.y - 22
        )));
        const metadata = parseMetadata(metadataText);
        const bottomLimit = nextHeader
          ? nextHeader.y + 22
          : (answerHeading ? answerHeading.y + 8 : 18);
        const contentItems = page.items.filter((item) => (
          item.y <= header.y - 25
          && item.y > bottomLimit
          && !/^Respostas$/i.test(item.text)
        ));
        const classificationParts = classification.split(/\s*>\s*/).map(cleanText).filter(Boolean);
        const question = {
          number,
          id: header.text.toUpperCase(),
          reference: header.text.toUpperCase(),
          classification,
          qcDiscipline: classificationParts[0] || "Sem disciplina",
          qcSubject: classificationParts.at(-1) || "Sem assunto",
          ...metadata,
          contentItems
        };
        questions.push(question);
        previousQuestion = question;
      });
    });

    return questions.map((question) => {
      const body = parseQuestionBody(question.contentItems);
      return {
        id: question.id,
        codigo: question.id,
        referencia: question.reference,
        disciplina: question.qcDiscipline,
        assunto: question.qcSubject,
        tema: question.qcSubject,
        banca: question.board,
        ano: question.year,
        orgao: question.agency,
        cargo: question.role,
        prova: question.exam,
        tipo: body.type,
        enunciado: body.statement,
        alternativas: body.alternatives,
        gabarito: answers.get(question.number) || "",
        qcCodigo: question.id,
        qcNumeroNoArquivo: question.number,
        qcDisciplina: question.qcDiscipline,
        qcAssunto: question.qcSubject,
        qcClassificacao: question.classification,
        fonte: "PDF do QConcursos selecionado pelo usuário"
      };
    }).filter((question) => question.id && question.enunciado);
  }

  function parsePages(rawPages) {
    const pageItems = (rawPages || []).map((items, pageIndex) => ({
      pageIndex,
      items: usefulItems(items, pageIndex)
    }));
    return parsePageQuestions(pageItems, parseAnswerKey(pageItems));
  }

  async function loadPdfLibrary() {
    if (globalThis.__ALDUS_PDFJS__) return globalThis.__ALDUS_PDFJS__;
    if (typeof document === "undefined") throw new Error("O leitor de PDF precisa ser aberto no navegador.");
    const base = document.baseURI;
    const pdfjs = await import(new URL(PDF_MODULE_PATH, base).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(PDF_WORKER_PATH, base).href;
    globalThis.__ALDUS_PDFJS__ = pdfjs;
    return pdfjs;
  }

  async function readFile(file) {
    if (!file || !/pdf/i.test(file.type || file.name || "")) throw new Error("Selecione um arquivo PDF.");
    const pdfjs = await loadPdfLibrary();
    const documentTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await documentTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      pages.push((await page.getTextContent()).items);
    }
    const questions = parsePages(pages);
    if (!questions.length) throw new Error("Não foi possível identificar questões neste PDF.");
    return { questions, pageCount: pdf.numPages };
  }

  globalThis.AldusQconcursosPdfImport = Object.freeze({
    parsePages,
    readFile
  });
})();
