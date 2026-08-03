import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const PREVIOUS_VERSION = "20260803-corrige-banco-questoes-integral-v227";
const VERSION = "20260803-corrige-funcionamento-banco-questoes-v228";

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

for (const file of ["package.json", "package-lock.json", "question-bank-filter-open-v226.js", "question-bank-training-v223.js"]) {
  const source = read(file);
  if (!source.includes(PREVIOUS_VERSION) && !source.includes(VERSION)) throw new Error(`Versão-base ausente em ${file}.`);
  write(file, source.replaceAll(PREVIOUS_VERSION, VERSION));
}

{
  const file = "question-bank-filters-v225.js";
  let source = read(file).replaceAll(PREVIOUS_VERSION, VERSION);
  source = replaceRequired(
    source,
    '  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline); }\n  function questionSubjectValues(question) {\n    return unique([\n      ...splitValues(question?.assuntos),\n      ...splitValues(question?.assunto),\n      ...splitValues(question?.subject)\n    ]);\n  }\n  function questionThemeValues(question) {\n    return unique([\n      ...splitValues(question?.temas),\n      ...splitValues(question?.tema),\n      ...splitValues(question?.theme),\n      ...splitValues(question?.subtema)\n    ]).filter((value) => !/^\\d+(?:\\.\\d+)*$/.test(value));\n  }',
    '  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline); }\n  function withoutFallbackValues(values, fallbacks) {\n    const normalizedFallbacks = new Set(fallbacks.map(canon));\n    const meaningful = values.filter((value) => !normalizedFallbacks.has(canon(value)));\n    return meaningful.length ? meaningful : values;\n  }\n  function questionSubjectValues(question) {\n    return withoutFallbackValues(unique([\n      ...splitValues(question?.assuntos),\n      ...splitValues(question?.assunto),\n      ...splitValues(question?.subject)\n    ]), ["Sem assunto", "Assunto não informado"]);\n  }\n  function questionThemeValues(question) {\n    const values = unique([\n      ...splitValues(question?.temas),\n      ...splitValues(question?.tema),\n      ...splitValues(question?.theme),\n      ...splitValues(question?.subtema)\n    ]).filter((value) => !/^\\d+(?:\\.\\d+)*$/.test(value));\n    return withoutFallbackValues(values, ["Geral", "Sem tema", "Tema não informado"]);\n  }',
    "normalização dos assuntos e temas"
  );
  source = replaceRequired(
    source,
    '  function disciplineMatches(question, discipline) {\n    return !discipline || fuzzyTextMatch(questionDiscipline(question), discipline);\n  }',
    '  function disciplineMatches(question, discipline) {\n    if (!discipline) return true;\n    return canon(questionDiscipline(question)) === canon(discipline);\n  }',
    "correspondência estrita de disciplina"
  );
  source = replaceRequired(
    source,
    '      if (discipline && !fuzzyTextMatch(itemDiscipline(item), discipline)) return false;',
    '      if (discipline && canon(itemDiscipline(item)) !== canon(discipline)) return false;',
    "catálogo estrito por disciplina"
  );
  source = replaceRequired(
    source,
    '    questionThemeValues,\n    fuzzyTextMatch,',
    '    questionThemeValues,\n    disciplineMatches,\n    fuzzyTextMatch,',
    "API de teste dos filtros"
  );
  write(file, source);
}

{
  const file = "tests/question-bank-filters-v225.test.js";
  let source = read(file);
  source = replaceRequired(
    source,
    '    { id:"s3", discipline:"DIREITO PENAL", topic:"1.15 Crimes contra a Administração Pública.", subject:"Crimes contra a Administração Pública", subtopic:"1.15", reference:"1.15 Crimes contra a Administração Pública." }',
    '    { id:"s3", discipline:"DIREITO PENAL", topic:"1.15 Crimes contra a Administração Pública.", subject:"Crimes contra a Administração Pública", subtopic:"1.15", reference:"1.15 Crimes contra a Administração Pública." },\n    { id:"s4", discipline:"DIREITO PROCESSUAL PENAL", topic:"2.1 Provas.", subject:"Provas", subtopic:"2.1", reference:"2.1 Provas." }',
    "item de regressão processual penal"
  );
  source = replaceRequired(
    source,
    '    { id:"q4", disciplina:"Direito Penal", assunto:"Assunto externo", tema:"Tema externo", banca:"FGV", ano:2023, orgao:"PC-MA", cargo:"Delegado de Polícia", tipo:"Múltipla escolha", alternativas:{A:"a",B:"b"}, gabarito:"A", enunciado:"Item." }',
    '    { id:"q4", disciplina:"Direito Penal", assunto:"Assunto externo", tema:"Tema externo", banca:"FGV", ano:2023, orgao:"PC-MA", cargo:"Delegado de Polícia", tipo:"Múltipla escolha", alternativas:{A:"a",B:"b"}, gabarito:"A", enunciado:"Item." },\n    { id:"q5", disciplina:"Direito Processual Penal", assunto:"Provas", tema:"Cadeia de custódia", banca:"CEBRASPE", ano:2026, orgao:"PC-PR", cargo:"Delegado de Polícia", tipo:"Certo/Errado", gabarito:"C", enunciado:"Item." }',
    "questão de regressão processual penal"
  );
  source = replaceRequired(
    source,
    '  assert.equal(JSON.stringify(api.questionThemeValues({ tema:"Tema 1 • Tema 2", subtema:"2.1.1" })), JSON.stringify(["Tema 1","Tema 2"]));\n  assert.equal(JSON.stringify(api.questionSubjectValues({ assunto:"Sem assunto", assuntos:["Provas","Cadeia de custódia"] })), JSON.stringify(["Cadeia de custódia","Provas"]));\n  assert.equal(JSON.stringify(api.questionThemeValues({ tema:"Geral", temas:["Vestígio","Rastreabilidade"] })), JSON.stringify(["Rastreabilidade","Vestígio"]));\n});\n\ntest("disciplinas próximas não são misturadas", () => {\n  const { api, controls } = runtime();\n  assert.equal(api.disciplineMatches({ disciplina:"Direito Penal" }, "DIREITO PENAL"), true);\n  assert.equal(api.disciplineMatches({ disciplina:"Direito Processual Penal" }, "DIREITO PENAL"), false);\n  controls.qbTrainingScope.value = "all";\n  controls.qbFilterDiscipline.value = "DIREITO PENAL";\n  assert.equal(api.filteredQuestions().length, 4);\n});',
    '  assert.equal(JSON.stringify(api.questionThemeValues({ tema:"Tema 1 • Tema 2", subtema:"2.1.1" })), JSON.stringify(["Tema 1","Tema 2"]));\n  assert.equal(JSON.stringify(api.questionSubjectValues({ assunto:"Sem assunto", assuntos:["Provas","Cadeia de custódia"] })), JSON.stringify(["Cadeia de custódia","Provas"]));\n  assert.equal(JSON.stringify(api.questionThemeValues({ tema:"Geral", temas:["Vestígio","Rastreabilidade"] })), JSON.stringify(["Rastreabilidade","Vestígio"]));\n});\n\ntest("disciplinas próximas não são misturadas", () => {\n  const { api, controls } = runtime();\n  assert.equal(api.disciplineMatches({ disciplina:"Direito Penal" }, "DIREITO PENAL"), true);\n  assert.equal(api.disciplineMatches({ disciplina:"Direito Processual Penal" }, "DIREITO PENAL"), false);\n  assert.equal(api.itemsForSelection("DIREITO PENAL").length, 3);\n  assert.equal(api.itemsForSelection("DIREITO PROCESSUAL PENAL").length, 1);\n  controls.qbTrainingScope.value = "all";\n  controls.qbFilterDiscipline.value = "DIREITO PENAL";\n  assert.equal(api.filteredQuestions().length, 4);\n});',
    "casos de regressão dos filtros"
  );
  source = replaceRequired(
    source,
    '  assert.equal(api.scopeBank().length, 4);',
    '  assert.equal(api.scopeBank().length, 5);',
    "escopo integral das disciplinas"
  );
  source = replaceRequired(
    source,
    '  assert.equal(JSON.stringify(api.optionValues("discipline", filters)), JSON.stringify(["DIREITO PENAL"]));',
    '  assert.equal(JSON.stringify(api.optionValues("discipline", filters)), JSON.stringify(["DIREITO PENAL","DIREITO PROCESSUAL PENAL"]));',
    "catálogo integral da cascata"
  );
  write(file, source);
}

console.log(`Correção ${VERSION} aplicada às fontes.`);
