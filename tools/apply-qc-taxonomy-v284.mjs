import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const PREVIOUS_VERSION = "20260809-banco-questoes-carregamento-v282";
const VERSION = "20260809-qconcursos-taxonomia-filtros-v284";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, source) {
  fs.writeFileSync(path.join(root, file), source);
}

function replaceRequired(source, previous, next, label) {
  if (source.includes(next)) return source;
  if (!source.includes(previous)) throw new Error(`Trecho não localizado: ${label}`);
  return source.replace(previous, next);
}

for (const file of ["package.json", "package-lock.json"]) {
  const source = read(file);
  if (!source.includes(PREVIOUS_VERSION) && !source.includes(VERSION)) {
    throw new Error(`Versão-base ausente em ${file}.`);
  }
  write(file, source.replaceAll(PREVIOUS_VERSION, VERSION));
}

{
  const file = "question-bank-filters-v225.js";
  let source = read(file);
  source = replaceRequired(
    source,
    `  const VERSION = "${PREVIOUS_VERSION}";`,
    `  const VERSION = "${VERSION}";`,
    "versão dos filtros"
  );

  source = replaceRequired(
    source,
    `  const unique = (values) => [...new Map(values.filter(Boolean).map((value) => [canon(value), text(value)])).values()]\n    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));`,
    `  const unique = (values) => [...new Map(values.filter(Boolean).map((value) => [canon(value), text(value)])).values()]\n    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));\n  function orderedUnique(values) {\n    const output = [];\n    const seen = new Set();\n    values.filter(Boolean).forEach((value) => {\n      const display = text(value);\n      const normalized = canon(display);\n      if (!display || seen.has(normalized)) return;\n      seen.add(normalized);\n      output.push(display);\n    });\n    return output;\n  }`,
    "preservação da ordem da árvore QC"
  );

  source = replaceRequired(
    source,
    `  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline); }\n  function withoutFallbackValues(values, fallbacks) {`,
    `  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline || question?.qcDisciplina || question?.qcDiscipline); }\n  function qcClassificationValues(question) {\n    const raw = text(\n      question?.qcClassificacao\n      || question?.qconcursosClassificacao\n      || question?.qcClassification\n      || question?.classificacaoQc\n      || question?.classificacaoQC\n    );\n    if (!raw) return [];\n    return orderedUnique(raw\n      .split(/\\s*(?:>|›|→|»)\\s*/u)\n      .map((value) => stripReferencePrefix(value))\n      .filter(Boolean));\n  }\n  function qcTaxonomyValues(question) {\n    const path = qcClassificationValues(question);\n    if (!path.length) return [];\n    const explicitDiscipline = text(question?.qcDisciplina || question?.qcDiscipline || questionDiscipline(question));\n    return path.length > 1 && (canon(path[0]) === canon(explicitDiscipline) || fuzzyTextMatch(path[0], explicitDiscipline))\n      ? path.slice(1)\n      : path;\n  }\n  function qcCrosswalkEntriesForItem(item) {\n    const crosswalk = Array.isArray(globalThis.QCONCURSOS_AUDITED_CROSSWALK)\n      ? globalThis.QCONCURSOS_AUDITED_CROSSWALK\n      : [];\n    const discipline = canon(itemDiscipline(item));\n    const candidates = orderedUnique([\n      itemSubject(item),\n      stripReferencePrefix(item?.topic),\n      stripReferencePrefix(item?.reference)\n    ]);\n    return crosswalk.filter((entry) => {\n      if (canon(entry?.d) !== discipline) return false;\n      return candidates.some((candidate) => [entry?.s, entry?.t].filter(Boolean)\n        .some((mapped) => fuzzyTextMatch(candidate, mapped)));\n    });\n  }\n  function withoutFallbackValues(values, fallbacks) {`,
    "leitura da hierarquia e do cruzamento QC"
  );

  source = replaceRequired(
    source,
    `  function questionSubjectValues(question) {\n    return withoutFallbackValues(unique([\n      ...splitValues(question?.assuntos),\n      ...splitValues(question?.assunto),\n      ...splitValues(question?.subject)\n    ]), ["Sem assunto", "Assunto não informado"]);\n  }\n  function questionThemeValues(question) {\n    const values = unique([\n      ...splitValues(question?.temas),\n      ...splitValues(question?.tema),\n      ...splitValues(question?.theme),\n      ...splitValues(question?.subtema)\n    ]).filter((value) => !/^\\d+(?:\\.\\d+)*$/.test(value));\n    return withoutFallbackValues(values, ["Geral", "Sem tema", "Tema não informado"]);\n  }`,
    `  function questionSubjectValues(question) {\n    return withoutFallbackValues(unique([\n      ...splitValues(question?.assuntos),\n      ...splitValues(question?.assunto),\n      ...splitValues(question?.subject),\n      ...splitValues(question?.qcAssunto),\n      ...splitValues(question?.qcSubject),\n      ...qcTaxonomyValues(question)\n    ]), ["Sem assunto", "Assunto não informado"]);\n  }\n  function explicitQuestionThemeValues(question) {\n    return unique([\n      ...splitValues(question?.temas),\n      ...splitValues(question?.tema),\n      ...splitValues(question?.theme),\n      ...splitValues(question?.subtema),\n      ...splitValues(question?.subassunto),\n      ...splitValues(question?.qcAssunto),\n      ...splitValues(question?.qcSubject)\n    ]).filter((value) => !/^\\d+(?:\\.\\d+)*$/.test(value));\n  }\n  function questionThemeValues(question) {\n    const values = unique([\n      ...explicitQuestionThemeValues(question),\n      ...qcTaxonomyValues(question)\n    ]).filter((value) => !/^\\d+(?:\\.\\d+)*$/.test(value));\n    return withoutFallbackValues(values, ["Geral", "Sem tema", "Tema não informado"]);\n  }\n  function questionThemeValuesForSubject(question, subject = "") {\n    if (!subject) return questionThemeValues(question);\n    const explicit = explicitQuestionThemeValues(question)\n      .filter((value) => !fuzzyTextMatch(value, subject));\n    const path = qcTaxonomyValues(question);\n    const matchedIndex = path.findIndex((value) => fuzzyTextMatch(value, subject));\n    const descendants = matchedIndex >= 0 ? path.slice(matchedIndex + 1) : path;\n    const values = unique([...explicit, ...descendants])\n      .filter((value) => !fuzzyTextMatch(value, subject));\n    return withoutFallbackValues(values, ["Geral", "Sem tema", "Tema não informado"]);\n  }`,
    "inclusão dos níveis QC em assunto e tema"
  );

  source = replaceRequired(
    source,
    `  function itemTexts(item) {\n    return unique([itemSubject(item), stripReferencePrefix(item?.topic), stripReferencePrefix(item?.reference)]);\n  }`,
    `  function itemTexts(item) {\n    const mapped = qcCrosswalkEntriesForItem(item);\n    return unique([\n      itemSubject(item),\n      stripReferencePrefix(item?.topic),\n      stripReferencePrefix(item?.reference),\n      ...mapped.flatMap((entry) => [entry?.s, entry?.t])\n    ]);\n  }`,
    "aliases auditados do QC nos itens do edital"
  );

  source = replaceRequired(
    source,
    `  function questionMatchesItem(question, item) {\n    const cacheable = question && item && typeof question === "object" && typeof item === "object";\n    const itemCache = cacheable ? questionItemMatchCache.get(question) : null;\n    if (itemCache?.has(item)) return itemCache.get(item);\n\n    let matches = disciplineMatches(question, itemDiscipline(item));\n    if (matches && question?.syllabusItemId && item?.id && question.syllabusItemId === item.id) matches = true;\n    else if (matches && typeof qbMatchesSyllabusItem === "function" && qbMatchesSyllabusItem(question, item)) matches = true;\n    else if (matches) {\n      const questionTexts = [...questionSubjectValues(question), ...questionThemeValues(question)];\n      matches = itemTexts(item).some((itemTextValue) => questionTexts.some((questionTextValue) => fuzzyTextMatch(itemTextValue, questionTextValue)));\n    }\n\n    if (cacheable) {`,
    `  function questionMatchesItem(question, item) {\n    const cacheable = question && item && typeof question === "object" && typeof item === "object";\n    const itemCache = cacheable ? questionItemMatchCache.get(question) : null;\n    if (itemCache?.has(item)) return itemCache.get(item);\n\n    const exactDiscipline = disciplineMatches(question, itemDiscipline(item));\n    const questionTexts = [...questionSubjectValues(question), ...questionThemeValues(question)];\n    const textMatch = itemTexts(item).some((itemTextValue) =>\n      questionTexts.some((questionTextValue) => fuzzyTextMatch(itemTextValue, questionTextValue))\n    );\n    const qcBridge = !exactDiscipline\n      && qcClassificationValues(question).length > 0\n      && qcCrosswalkEntriesForItem(item).length > 0\n      && textMatch;\n\n    let matches = exactDiscipline || qcBridge;\n    if (exactDiscipline && question?.syllabusItemId && item?.id && question.syllabusItemId === item.id) matches = true;\n    else if (exactDiscipline && typeof qbMatchesSyllabusItem === "function" && qbMatchesSyllabusItem(question, item)) matches = true;\n    else matches = matches && textMatch;\n\n    if (cacheable) {`,
    "ponte lógica entre disciplina do edital e disciplina QC"
  );

  source = replaceRequired(
    source,
    `  function questionMappedToCatalog(question, discipline = "") {\n    const items = itemsForSelection(discipline);\n    return items.some((item) => questionMatchesItem(question, item));\n  }`,
    `  function questionMatchesDisciplineSelection(question, discipline = "") {\n    if (!discipline || disciplineMatches(question, discipline)) return true;\n    return itemsForSelection(discipline).some((item) => questionMatchesItem(question, item));\n  }\n\n  function questionMappedToCatalog(question, discipline = "") {\n    const items = itemsForSelection(discipline);\n    return items.some((item) => questionMatchesItem(question, item));\n  }`,
    "equivalência lógica no filtro de disciplina"
  );

  source = replaceRequired(
    source,
    `    const disciplines = unique(catalogItems().map(itemDiscipline));\n    return bank.filter((question) => disciplines.some((discipline) => disciplineMatches(question, discipline)));`,
    `    const disciplines = unique(catalogItems().map(itemDiscipline));\n    return bank.filter((question) => disciplines.some((discipline) => questionMatchesDisciplineSelection(question, discipline)));`,
    "escopo do edital usando equivalências QC"
  );

  source = replaceRequired(
    source,
    `      if (key === "discipline" && !disciplineMatches(question, selected)) return false;`,
    `      if (key === "discipline" && !questionMatchesDisciplineSelection(question, selected)) return false;`,
    "filtro de disciplina com ponte QC"
  );

  source = replaceRequired(
    source,
    `    if (key === "discipline") {\n      const catalog = catalogItems();\n      base.forEach((question) => add(questionDiscipline(question)));\n      return entriesFor(catalog.length ? catalog.map(itemDiscipline) : base.map(questionDiscipline));\n    }`,
    `    if (key === "discipline") {\n      const catalog = catalogItems();\n      if (!catalog.length) {\n        base.forEach((question) => add(questionDiscipline(question)));\n        return entriesFor(base.map(questionDiscipline));\n      }\n      return unique(catalog.map(itemDiscipline)).map((discipline) => ({\n        value: discipline,\n        count: base.filter((question) => questionMatchesDisciplineSelection(question, discipline)).length\n      }));\n    }`,
    "contagem das disciplinas projetadas no edital"
  );

  source = replaceRequired(
    source,
    `    if (key === "theme") {\n      if (!filters.subject) return [];\n      base.forEach((question) => questionThemeValues(question).forEach(add));\n      return [...counted.values()].sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true }));\n    }`,
    `    if (key === "theme") {\n      if (!filters.subject) return [];\n      base.forEach((question) => questionThemeValuesForSubject(question, filters.subject).forEach(add));\n      return [...counted.values()].sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true }));\n    }`,
    "subníveis QC dependentes do assunto selecionado"
  );

  source = replaceRequired(
    source,
    `    questionSubjectValues,\n    questionThemeValues,\n    questionBoard,\n    disciplineMatches,`,
    `    questionSubjectValues,\n    questionThemeValues,\n    questionThemeValuesForSubject,\n    qcClassificationValues,\n    qcTaxonomyValues,\n    qcCrosswalkEntriesForItem,\n    questionBoard,\n    disciplineMatches,\n    questionMatchesDisciplineSelection,`,
    "API de regressão da taxonomia QC"
  );

  write(file, source);
}

{
  const file = "tests/question-bank-filters-v225.test.js";
  let source = read(file);
  source = replaceRequired(
    source,
    `    qbHasKey: (question) => Boolean(question.gabarito),`,
    `    QCONCURSOS_AUDITED_CROSSWALK: [\n      { d:"DIREITO PENAL", t:"1.3 Teoria Geral do Crime.", s:"Fato Típico", n:"3", k:"category" },\n      { d:"LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL", t:"Lei nº 11.343/2006.", s:"Lei nº 11.343/2006", n:"40.13", k:"exact" }\n    ],\n    qbHasKey: (question) => Boolean(question.gabarito),`,
    "cruzamento QC no runtime de teste"
  );

  source = replaceRequired(
    source,
    `test("banca, tipo, órgão e cargo equivalentes são unificados", () => {`,
    `test("hierarquia do QC é projetada no edital mesmo quando os nomes e a disciplina diferem", () => {\n  const { api, context } = runtime();\n  const penalQc = {\n    disciplina:"Direito Penal",\n    qcDisciplina:"Direito Penal",\n    qcAssunto:"Erro do tipo essencial",\n    qcClassificacao:"Direito Penal > Tipicidade > Erro do tipo essencial",\n    assunto:"Erro do tipo essencial",\n    tema:"Erro do tipo essencial"\n  };\n  assert.ok(api.qcClassificationValues(penalQc).includes("Tipicidade"));\n  assert.ok(api.questionSubjectValues(penalQc).includes("Tipicidade"));\n  assert.deepEqual([...api.questionThemeValuesForSubject(penalQc, "Tipicidade")], ["Erro do tipo essencial"]);\n  assert.equal(api.questionMatchesItem(penalQc, { discipline:"DIREITO PENAL", topic:"1.3 Teoria Geral do Crime.", subject:"Fato Típico", reference:"1.3.2 Fato Típico." }), true);\n\n  const leiDrogasItem = {\n    id:"s-qc-lei-drogas",\n    discipline:"LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",\n    topic:"Lei nº 11.343/2006.",\n    subject:"Lei nº 11.343/2006",\n    reference:"Lei nº 11.343/2006"\n  };\n  context.state.syllabusItems.push(leiDrogasItem);\n  const leiDrogasQc = {\n    disciplina:"Direito Penal",\n    qcDisciplina:"Direito Penal",\n    qcAssunto:"Tráfico privilegiado",\n    qcClassificacao:"Direito Penal > Legislação Penal Especial > Lei de Drogas > Tráfico privilegiado",\n    assunto:"Lei de Drogas",\n    tema:"Tráfico privilegiado"\n  };\n  assert.equal(api.questionMatchesItem(leiDrogasQc, leiDrogasItem), true);\n  assert.equal(api.questionMatchesDisciplineSelection(leiDrogasQc, "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL"), true);\n});\n\ntest("banca, tipo, órgão e cargo equivalentes são unificados", () => {`,
    "regressão da hierarquia QC"
  );

  write(file, source);
}

console.log(`Integração ${VERSION} aplicada às fontes.`);
