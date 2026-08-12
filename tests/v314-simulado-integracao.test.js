const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

function loadApis() {
  const context = { globalThis: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("simulado-interativo-v313.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("simulado-integracao-v314.js", "utf8"), context);
  return { context, core:context.globalThis.__ALDUS_SIMULADO_INTERATIVO_V313__, integration:context.globalThis.__ALDUS_SIMULADO_INTEGRACAO_V314__ };
}

function completedExam(core, board = "CEBRASPE") {
  const alternatives = { A:"a", B:"b", C:"c", D:"d", E:"e" };
  const multiple = board !== "CEBRASPE";
  const { exam } = core.parsePayload({ metadata:{ titulo:`Simulado ${board}`, banca:board, quantidade:3 }, questionBank:[
    { id:"1", disciplina:"Direito Penal", assunto:"Teoria do crime", tema:"Dolo", enunciado:"Questão um", alternativas:multiple?alternatives:{}, gabarito:multiple?"A":"C", justificativa:"J1", fundamento:"F1" },
    { id:"2", disciplina:"Direito Penal", assunto:"Teoria do crime", tema:"Culpa", enunciado:"Questão dois", alternativas:multiple?alternatives:{}, gabarito:multiple?"B":"E", justificativa:"J2", fundamento:"F2" },
    { id:"3", disciplina:"Direito Constitucional", assunto:"Poder Constituinte", tema:"Espécies", enunciado:"Questão três", alternativas:multiple?alternatives:{}, gabarito:multiple?"C":"C", justificativa:"J3", fundamento:"F3" }
  ] });
  exam.answers[exam.questions[0].id] = multiple ? "A" : "C";
  exam.answers[exam.questions[1].id] = multiple ? "C" : "C";
  exam.answers[exam.questions[2].id] = core.blankMark;
  exam.reviewFlags[exam.questions[1].id] = true;
  exam.status = "completed";
  exam.completedAt = "2026-08-11T20:00:00.000Z";
  exam.summary = core.scoreExam(exam);
  return exam;
}

test("V314 prepara banco, sessão, histórico, simulado e caderno sem perder justificativas", () => {
  const { core, integration } = loadApis();
  const payload = integration.buildIntegrationPayload(completedExam(core));
  assert.equal(payload.bankQuestions.length, 3);
  assert.equal(payload.session.items.length, 3);
  assert.equal(payload.session.summary.score, 0);
  assert.equal(payload.questionLogs.length, 2);
  assert.equal(payload.mock.correct, 1);
  assert.equal(payload.mock.wrong, 1);
  assert.equal(payload.mock.blank, 1);
  assert.equal(payload.notebook.length, 2);
  assert.equal(payload.bankQuestions[0].justificativa, "J1");
  assert.equal(payload.bankQuestions[0].fundamento, "F1");
});

test("V314 mantém pontuação simples da FGV no histórico e no resumo", () => {
  const { core, integration } = loadApis();
  const payload = integration.buildIntegrationPayload(completedExam(core,"FGV"));
  assert.equal(payload.session.summary.score, 1);
  assert.equal(payload.mock.net, 1);
  assert.equal(payload.questionLogs.find((log) => log.discipline === "Direito Penal").cebraspeNet, 1);
});

test("V314 reconhece sessão já integrada para impedir duplicação", () => {
  const { core, integration } = loadApis();
  const payload = integration.buildIntegrationPayload(completedExam(core));
  assert.equal(integration.hasIntegratedSession({ questionBankSessions:[{ id:payload.sessionId }] },payload.sessionId),true);
  assert.equal(integration.hasIntegratedSession({ questionBankSessions:[] },payload.sessionId),false);
});

test("V314 integra uma vez no estado real e não duplica ao tentar novamente", () => {
  const { context, core, integration } = loadApis();
  const notebook = [];
  let saves = 0;
  context.state = { questionBank:[], questionBankSessions:[], questionLogs:[], simulados:[], questionErrorNotebook:[] };
  context.saveData = () => { saves += 1; return true; };
  context.registrarNoCadernoErros = (question, mark, reason) => notebook.push({ id:question.id, mark, reason });
  const exam = completedExam(core);
  const first = integration.integrateExam(exam);
  const second = integration.integrateExam(exam);
  assert.equal(first.alreadyIntegrated, false);
  assert.equal(second.alreadyIntegrated, true);
  assert.equal(context.state.questionBank.length, 3);
  assert.equal(context.state.questionBankSessions.length, 1);
  assert.equal(context.state.simulados.length, 1);
  assert.equal(context.state.questionLogs.length, 2);
  assert.equal(notebook.length, 2);
  assert.equal(saves, 1);
});

test("V318 repara questões ausentes quando o resultado já estava integrado", () => {
  const { context, core, integration } = loadApis();
  let saves = 0;
  let notebookWrites = 0;
  const exam = completedExam(core);
  const payload = integration.buildIntegrationPayload(exam);
  context.state = {
    questionBank:[],
    questionBankSessions:[payload.session],
    questionLogs:[...payload.questionLogs],
    simulados:[payload.mock],
    questionErrorNotebook:[]
  };
  context.saveData = () => { saves += 1; return true; };
  context.registrarNoCadernoErros = () => { notebookWrites += 1; };

  const repaired = integration.integrateExam(exam);
  const checkedAgain = integration.integrateExam(exam);

  assert.equal(repaired.alreadyIntegrated, true);
  assert.equal(repaired.repaired, true);
  assert.equal(repaired.newQuestions, 3);
  assert.equal(context.state.questionBank.length, 3);
  assert.equal(context.state.questionBankSessions.length, 1);
  assert.equal(context.state.questionLogs.length, 2);
  assert.equal(context.state.simulados.length, 1);
  assert.equal(notebookWrites, 0);
  assert.equal(saves, 1);
  assert.equal(checkedAgain.repaired, false);
  assert.equal(checkedAgain.newQuestions, 0);
  assert.equal(saves, 1);
});

test("V314 é carregado depois do V313 e possui paridade raiz/docs", () => {
  const build = fs.readFileSync("build-bundles.mjs", "utf8");
  const bootstrap = fs.readFileSync("bootstrap-integrity-loader-v258-core.js", "utf8");
  const worker = fs.readFileSync("service-worker.js", "utf8");
  assert.ok(build.indexOf('"simulado-interativo-v313.js"') < build.indexOf('"simulado-integracao-v314.js"'));
  assert.ok(bootstrap.indexOf('"aldusSimuladoInterativoV313"') < bootstrap.indexOf('"aldusSimuladoIntegracaoV314"'));
  assert.match(worker, /SIMULADO_INTERATIVO_SCRIPT/);
  assert.match(worker, /SIMULADO_INTERATIVO_STYLESHEET/);
  assert.match(worker, /SIMULADO_INTEGRACAO_SCRIPT/);
  assert.equal(bootstrap, fs.readFileSync("docs/bootstrap-integrity-loader-v258-core.js", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(fs.readFileSync("simulado-integracao-v314.js", "utf8"), fs.readFileSync("docs/simulado-integracao-v314.js", "utf8"));
});