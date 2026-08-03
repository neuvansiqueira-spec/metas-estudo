import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "question-bank-filters-v225.js"), "utf8");

function runtime() {
  const controls = {
    qbTrainingScope: { value: "syllabus" }, qbReviewType: { value: "wrong" },
    qbFilterDiscipline: { value: "" }, qbFilterSubject: { value: "" }, qbFilterTheme: { value: "" },
    qbFilterBoard: { value: "" }, qbFilterYear: { value: "" }, qbFilterAgencyV224: { value: "" },
    qbFilterRoleV224: { value: "" }, qbFilterTypeV224: { value: "" }, qbFilterKeyStatusV224: { value: "" },
    qbFilterSearch: { value: "" }
  };
  const syllabusItems = [
    { id:"s1", discipline:"DIREITO PENAL", topic:"1.3 Teoria Geral do Crime.", subject:"Fato Típico", subtopic:"1.3.2", reference:"1.3.2 Fato Típico." },
    { id:"s2", discipline:"DIREITO PENAL", topic:"1.22 Crimes de Tráfico de Drogas.", subject:"Crimes de Tráfico de Drogas", subtopic:"1.22", reference:"1.22 Crimes de Tráfico de Drogas." },
    { id:"s3", discipline:"DIREITO PENAL", topic:"1.15 Crimes contra a Administração Pública.", subject:"Crimes contra a Administração Pública", subtopic:"1.15", reference:"1.15 Crimes contra a Administração Pública." }
  ];
  const questionBank = [
    { id:"q1", disciplina:"Direito Penal", assunto:"Tipicidade", tema:"Teoria da imputação objetiva", banca:"CESPE / CEBRASPE", ano:2025, orgao:"PCDF", cargo:"Delegado de Polícia Civil", tipo:"Certo ou Errado", gabarito:"C", enunciado:"Item." },
    { id:"q2", disciplina:"Direito Penal", assunto:"Legislação Penal Especial; Lei de Tóxicos — Lei nº 11.343/2006", assuntos:["Legislação Penal Especial","Lei de Tóxicos — Lei nº 11.343/2006"], tema:"Lei de Drogas • Tráfico privilegiado", banca:"CEBRASPE", ano:2026, orgao:"PC-DF", cargo:"Delegado de Polícia", tipo:"Certo/Errado", gabarito:"E", enunciado:"Item." },
    { id:"q3", disciplina:"Direito Penal", assunto:"Prevaricação; art. 319-A; art. 349-A", tema:"Crimes funcionais", banca:"CEBRASPE", ano:2024, orgao:"PC-PE", cargo:"Delegado de Polícia Civil", tipo:"Certo/Errado", gabarito:"C", enunciado:"Item." },
    { id:"q4", disciplina:"Direito Penal", assunto:"Assunto externo", tema:"Tema externo", banca:"FGV", ano:2023, orgao:"PC-MA", cargo:"Delegado de Polícia", tipo:"Múltipla escolha", alternativas:{A:"a",B:"b"}, gabarito:"A", enunciado:"Item." }
  ];
  const canonical = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const oldMatch = (question, item) => canonical(question.disciplina).includes(canonical(item.discipline))
    && [item.subject,item.topic,item.subtopic].filter(Boolean).some((left) => [question.assunto,question.tema].some((right) => canonical(left).includes(canonical(right)) || canonical(right).includes(canonical(left))));
  const context = {
    console, setTimeout, clearTimeout,
    document: { readyState:"loading", getElementById:(id)=>controls[id] || null, addEventListener(){}, documentElement:{ dataset:{} } },
    elements: { qbTrainingScope:controls.qbTrainingScope, qbReviewType:controls.qbReviewType, qbStartTraining:{}, qbPreviewSection:null, qbFilteredPreview:null, qbMessage:null },
    state: { questionBank, syllabusItems },
    qbActiveSyllabusItems: () => syllabusItems,
    qbReviewSyllabusItems: () => syllabusItems,
    qbMatchesSyllabusItem: oldMatch,
    qbScopedBank: () => questionBank.filter((question) => syllabusItems.some((item) => oldMatch(question, item))),
    qbHasKey: (question) => Boolean(question.gabarito),
    qbIsMultipleChoice: (question) => Boolean(question.alternativas),
    qbFilteredQuestions: () => [], qbRenderCascadingFilters: () => {}, renderQuestionBank: () => {}, qbRenderQuestionBankStats: () => {},
    escapeHTML: (value) => String(value)
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename:"question-bank-filters-v225.js" });
  return { context, controls, api:context.__aldusQuestionBankFiltersV225Api };
}

test("escopo do edital não elimina questões antes da classificação", () => {
  const { api } = runtime();
  assert.equal(api.scopeBank().length, 4);
});

test("assuntos e temas compostos são separados sem códigos do edital", () => {
  const { api } = runtime();
  assert.equal(JSON.stringify(api.questionSubjectValues({ assunto:"A; B", assuntos:["C"] })), JSON.stringify(["A","B","C"]));
  assert.equal(JSON.stringify(api.questionThemeValues({ tema:"Tema 1 • Tema 2", subtema:"2.1.1" })), JSON.stringify(["Tema 1","Tema 2"]));
});

test("banca, tipo, órgão e cargo equivalentes são unificados", () => {
  const { api } = runtime();
  assert.equal(api.normalizeFacetValue("board", "CESPE / CEBRASPE"), "CEBRASPE");
  assert.equal(api.normalizeFacetValue("type", "Certo ou Errado"), "Certo/Errado");
  assert.equal(api.normalizeFacetValue("agency", "PCDF"), "PC-DF");
  assert.equal(api.normalizeFacetValue("role", "Delegado de Polícia Civil"), "Delegado de Polícia");
});

test("cascata depende somente dos filtros anteriores", () => {
  const { api } = runtime();
  const filters = { discipline:"", subject:"", theme:"", board:"BANCA INEXISTENTE", year:"2099", agency:"", role:"", type:"", keyStatus:"" };
  assert.equal(JSON.stringify(api.optionValues("discipline", filters)), JSON.stringify(["DIREITO PENAL"]));
  filters.discipline = "DIREITO PENAL";
  assert.ok(api.optionValues("subject", filters).includes("Fato Típico"));
});

test("assuntos do edital aguardam a escolha da disciplina", () => {
  const { api } = runtime();
  const filters = { discipline:"", subject:"", theme:"", board:"", year:"", agency:"", role:"", type:"", keyStatus:"" };
  assert.deepEqual([...api.optionValues("subject", filters)], []);
  filters.discipline = "DIREITO PENAL";
  assert.ok(api.optionValues("subject", filters).includes("Fato Típico"));
  assert.deepEqual([...api.optionValues("theme", filters)], []);
});

test("questões sem vínculo direto continuam disponíveis para diagnóstico", () => {
  const { api } = runtime();
  const filters = { discipline:"DIREITO PENAL", subject:"", theme:"", board:"", year:"", agency:"", role:"", type:"", keyStatus:"" };
  assert.ok(api.optionValues("subject", filters).includes(api.UNMAPPED_SUBJECT));
  assert.equal(api.questionMatchesItem({ disciplina:"Direito Penal", assunto:"Tipicidade", tema:"Teoria da imputação objetiva" }, { discipline:"DIREITO PENAL", subject:"Fato Típico", topic:"Teoria Geral do Crime" }), true);
  assert.equal(api.questionMatchesItem({ disciplina:"Direito Penal", assunto:"Prevaricação", tema:"Crimes funcionais" }, { discipline:"DIREITO PENAL", subject:"Fato Típico", topic:"Teoria Geral do Crime" }), false);
});
