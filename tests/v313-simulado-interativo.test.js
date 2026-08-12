const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

function loadCore() {
  const context = { globalThis: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("simulado-interativo-v313.js", "utf8"), context);
  return context.globalThis.__ALDUS_SIMULADO_INTERATIVO_V313__;
}

function cebraspePayload() {
  return {
    schema: "metas-estudo-question-bank-v1",
    metadata: { titulo: "Simulado Administrativo", banca: "CEBRASPE", quantidade: 3, dificuldade: "Mista" },
    questionBank: [
      { id:"Q1", disciplina:"Direito Administrativo", assunto:"Organização administrativa", tema:"Descentralização", tipo:"Certo/Errado", enunciado:"Item um.", gabarito:"C", justificativa:"Justificativa um.", fundamento:"Artigo aplicável." },
      { id:"Q2", disciplina:"Direito Administrativo", assunto:"Organização administrativa", tema:"Desconcentração", tipo:"Certo/Errado", enunciado:"Item dois.", gabarito:"E", justificativa:"Justificativa dois.", fundamento:"Entendimento aplicável." },
      { id:"Q3", disciplina:"Direito Constitucional", assunto:"Poder Constituinte", tema:"Espécies", tipo:"Certo/Errado", enunciado:"Item três.", gabarito:"C", justificativa:"Justificativa três.", fundamento:"Constituição Federal." }
    ]
  };
}

test("V313 valida e normaliza o JSON antes de criar o simulado", () => {
  const core = loadCore();
  const parsed = core.parsePayload(cebraspePayload());
  assert.equal(parsed.exam.questions.length, 3);
  assert.equal(parsed.exam.board, "CEBRASPE");
  assert.equal(parsed.exam.status, "draft");
  assert.equal(parsed.exam.questions[0].id, `${parsed.exam.id}-q001`);
  assert.equal(parsed.warnings.length, 0);
});

test("V313 rejeita identificador duplicado, gabarito inválido e FGV sem cinco alternativas", () => {
  const core = loadCore();
  const payload = { metadata:{ banca:"FGV" }, questionBank:[
    { id:"DUP", enunciado:"Questão um", tipo:"Múltipla escolha", alternativas:{ A:"a", B:"b" }, gabarito:"C" },
    { id:"DUP", enunciado:"Questão dois", tipo:"Múltipla escolha", alternativas:{ A:"a", B:"b" }, gabarito:"A" }
  ] };
  assert.throws(() => core.parsePayload(payload), (error) => {
    assert.match(error.message, /impedem a importação/);
    assert.ok(error.issues.some((issue) => /identificador duplicado/.test(issue)));
    assert.ok(error.issues.some((issue) => /cinco alternativas/.test(issue)));
    assert.ok(error.issues.some((issue) => /gabarito inválido/.test(issue)));
    return true;
  });
});

test("V313 calcula CEBRASPE com penalização e preserva brancos e revisão", () => {
  const core = loadCore();
  const { exam } = core.parsePayload(cebraspePayload());
  exam.answers[exam.questions[0].id] = "C";
  exam.answers[exam.questions[1].id] = "C";
  exam.answers[exam.questions[2].id] = core.blankMark;
  exam.reviewFlags[exam.questions[1].id] = true;
  const summary = core.scoreExam(exam);
  assert.deepEqual({ correct:summary.correct, wrong:summary.wrong, blank:summary.blank, review:summary.review, score:summary.score }, { correct:1, wrong:1, blank:1, review:1, score:0 });
});

test("V313 calcula múltipla escolha sem descontar respostas erradas", () => {
  const core = loadCore();
  const alternativas = { A:"a", B:"b", C:"c", D:"d", E:"e" };
  const { exam } = core.parsePayload({ metadata:{ banca:"FGV", quantidade:2 }, questionBank:[
    { id:"F1", disciplina:"Penal", assunto:"Dolo", tema:"Espécies", enunciado:"Questão FGV um", alternativas, gabarito:"A", justificativa:"J", fundamento:"F" },
    { id:"F2", disciplina:"Penal", assunto:"Culpa", tema:"Espécies", enunciado:"Questão FGV dois", alternativas, gabarito:"B", justificativa:"J", fundamento:"F" }
  ] });
  exam.answers[exam.questions[0].id] = "A";
  exam.answers[exam.questions[1].id] = "C";
  const summary = core.scoreExam(exam);
  assert.equal(summary.correct, 1);
  assert.equal(summary.wrong, 1);
  assert.equal(summary.score, 1);
});

test("V313 publica os arquivos de execução e estilo nas duas raízes", () => {
  const build = fs.readFileSync("build-bundles.mjs", "utf8");
  assert.match(build, /simulado-interativo-v313\.js/);
  assert.match(build, /simulado-interativo-v313\.css/);
  assert.equal(fs.readFileSync("simulado-interativo-v313.js", "utf8"), fs.readFileSync("docs/simulado-interativo-v313.js", "utf8"));
  assert.equal(fs.readFileSync("simulado-interativo-v313.css", "utf8"), fs.readFileSync("docs/simulado-interativo-v313.css", "utf8"));
});
