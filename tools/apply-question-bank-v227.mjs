import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const PREVIOUS_VERSION = "20260803-corrige-funcionamento-banco-questoes-v228";
const VERSION = "20260803-corrige-filtro-banca-fgv-v229";

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

for (const file of ["package.json", "package-lock.json", "question-bank-filter-open-v226.js", "question-bank-filters-v225.js", "question-bank-training-v223.js"]) {
  const source = read(file);
  if (!source.includes(PREVIOUS_VERSION) && !source.includes(VERSION)) throw new Error(`Versão-base ausente em ${file}.`);
  write(file, source.replaceAll(PREVIOUS_VERSION, VERSION));
}

{
  const file = "question-bank-filters-v225.js";
  let source = read(file);
  source = replaceRequired(
    source,
    '      if (normalized.includes("fundacao getulio vargas") || normalized === "fgv") return "FGV";',
    '      if (normalized.includes("fundacao getulio vargas") || /(^|[^a-z0-9])fgv([^a-z0-9]|$)/.test(normalized)) return "FGV";',
    "normalização das variações FGV"
  );
  source = replaceRequired(
    source,
    '  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline); }',
    `  function metadataText(value) {
    if (Array.isArray(value)) return value.map(metadataText).find(Boolean) || "";
    if (value && typeof value === "object") {
      return metadataText(value.nome ?? value.name ?? value.label ?? value.sigla ?? value.value);
    }
    return text(value);
  }

  function detectedBoard(value) {
    const raw = metadataText(value);
    if (!raw) return "";
    const normalized = normalizeFacetValue("board", raw);
    return ["CEBRASPE", "FGV"].includes(normalized) ? normalized : "";
  }

  function questionBoard(question) {
    const explicit = [
      question?.banca,
      question?.board,
      question?.examiningBoard,
      question?.examining_board,
      question?.organizadora,
      question?.metadados?.banca,
      question?.metadados?.board,
      question?.metadata?.banca,
      question?.metadata?.board
    ].map(metadataText).find(Boolean);
    if (explicit) return normalizeFacetValue("board", explicit);
    return [question?.prova, question?.exam, question?.fonte, question?.source, question?.arquivoFonte]
      .map(detectedBoard)
      .find(Boolean) || "";
  }

  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline); }`,
    "leitura de banca em campos e metadados alternativos"
  );
  source = replaceRequired(
    source,
    '    if (key === "board") return normalizeFacetValue(key, question?.banca || question?.board);',
    '    if (key === "board") return questionBoard(question);',
    "uso da banca normalizada nos filtros"
  );
  source = replaceRequired(
    source,
    '    questionThemeValues,\n    disciplineMatches,',
    '    questionThemeValues,\n    questionBoard,\n    disciplineMatches,',
    "API de regressão da banca"
  );
  write(file, source);
}

{
  const file = "script.js";
  let source = read(file);
  source = replaceRequired(
    source,
    'function normalizeQuestionBankItem(raw = {}, index = 0) { const justificativa = questionBankExplanation(raw); const alternativas = normalizeQuestionBankAlternatives(raw); return { id: String(raw.id || raw.codigo || raw.referencia || `qb-${index + 1}-${createId()}`), disciplina: String(raw.disciplina || raw.discipline || "Sem disciplina"), assunto: String(raw.assunto || raw.subject || raw.topico || raw.topic || "Sem assunto"), tema: String(raw.tema || raw.theme || raw.subassunto || raw.subtopic || "Geral"), syllabusItemId: String(raw.syllabusItemId || ""), banca: String(raw.banca || raw.board || ""),',
    'function questionBankMetadataText(value) { if (Array.isArray(value)) return value.map(questionBankMetadataText).find(Boolean) || ""; if (value && typeof value === "object") return questionBankMetadataText(value.nome ?? value.name ?? value.label ?? value.sigla ?? value.value); return String(value ?? "").trim(); }\nfunction questionBankBoard(raw = {}) { return [raw.banca, raw.board, raw.examiningBoard, raw.examining_board, raw.organizadora, raw.metadados?.banca, raw.metadados?.board, raw.metadata?.banca, raw.metadata?.board].map(questionBankMetadataText).find(Boolean) || ""; }\nfunction normalizeQuestionBankItem(raw = {}, index = 0) { const justificativa = questionBankExplanation(raw); const alternativas = normalizeQuestionBankAlternatives(raw); return { id: String(raw.id || raw.codigo || raw.referencia || `qb-${index + 1}-${createId()}`), disciplina: String(raw.disciplina || raw.discipline || "Sem disciplina"), assunto: String(raw.assunto || raw.subject || raw.topico || raw.topic || "Sem assunto"), tema: String(raw.tema || raw.theme || raw.subassunto || raw.subtopic || "Geral"), syllabusItemId: String(raw.syllabusItemId || ""), banca: questionBankBoard(raw),',
    "normalização da banca durante a importação"
  );
  write(file, source);
}

{
  const file = "tests/question-bank-filters-v225.test.js";
  let source = read(file);
  source = replaceRequired(
    source,
    '    { id:"q4", disciplina:"Direito Penal", assunto:"Assunto externo", tema:"Tema externo", banca:"FGV", ano:2023, orgao:"PC-MA", cargo:"Delegado de Polícia", tipo:"Múltipla escolha", alternativas:{A:"a",B:"b"}, gabarito:"A", enunciado:"Item." },\n    { id:"q5", disciplina:"Direito Processual Penal", assunto:"Provas", tema:"Cadeia de custódia", banca:"CEBRASPE", ano:2026, orgao:"PC-PR", cargo:"Delegado de Polícia", tipo:"Certo/Errado", gabarito:"C", enunciado:"Item." }',
    '    { id:"q4", disciplina:"Direito Penal", assunto:"Assunto externo", tema:"Tema externo", banca:"FGV Conhecimento", ano:2023, orgao:"PC-MA", cargo:"Delegado de Polícia", tipo:"Múltipla escolha", alternativas:{A:"a",B:"b"}, gabarito:"A", enunciado:"Item." },\n    { id:"q5", disciplina:"Direito Processual Penal", assunto:"Provas", tema:"Cadeia de custódia", banca:"CEBRASPE", ano:2026, orgao:"PC-PR", cargo:"Delegado de Polícia", tipo:"Certo/Errado", gabarito:"C", enunciado:"Item." },\n    { id:"q6", disciplina:"Direito Penal", assunto:"Fato típico", tema:"Tipicidade", examiningBoard:{ name:"Fundação Getúlio Vargas (FGV)" }, ano:2024, orgao:"PC-PR", cargo:"Delegado de Polícia", tipo:"Múltipla escolha", alternativas:{A:"a",B:"b"}, gabarito:"B", enunciado:"Item." }',
    "questões FGV em formatos alternativos"
  );
  source = replaceRequired(source, "  assert.equal(api.scopeBank().length, 5);", "  assert.equal(api.scopeBank().length, 6);", "total do escopo de regressão");
  source = replaceRequired(source, "  assert.equal(api.filteredQuestions().length, 4);", "  assert.equal(api.filteredQuestions().length, 5);", "total da disciplina de regressão");
  source = replaceRequired(
    source,
    'test("banca, tipo, órgão e cargo equivalentes são unificados", () => {\n  const { api } = runtime();\n  assert.equal(api.normalizeFacetValue("board", "CESPE / CEBRASPE"), "CEBRASPE");',
    'test("banca, tipo, órgão e cargo equivalentes são unificados", () => {\n  const { api, controls } = runtime();\n  assert.equal(api.normalizeFacetValue("board", "CESPE / CEBRASPE"), "CEBRASPE");\n  assert.equal(api.normalizeFacetValue("board", "FGV Conhecimento"), "FGV");\n  assert.equal(api.questionBoard({ examiningBoard:{ name:"Fundação Getúlio Vargas (FGV)" } }), "FGV");\n  assert.equal(api.questionBoard({ metadata:{ board:"FGV" } }), "FGV");',
    "normalização FGV no teste"
  );
  source = replaceRequired(
    source,
    '  assert.equal(api.normalizeFacetValue("role", "Delegado de Polícia Civil"), "Delegado de Polícia");\n});',
    '  assert.equal(api.normalizeFacetValue("role", "Delegado de Polícia Civil"), "Delegado de Polícia");\n  controls.qbTrainingScope.value = "all";\n  assert.ok(api.optionValues("board", { discipline:"", subject:"", theme:"", board:"", year:"", agency:"", role:"", type:"", keyStatus:"" }).includes("FGV"));\n  controls.qbFilterBoard.value = "FGV";\n  assert.equal(api.filteredQuestions().length, 2);\n});',
    "filtro FGV com questões reais"
  );
  write(file, source);
}

console.log(`Correção ${VERSION} aplicada às fontes.`);
