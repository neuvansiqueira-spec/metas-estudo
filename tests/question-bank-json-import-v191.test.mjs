import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../question-bank-json-import-v191.js", import.meta.url), "utf8");
const sandbox = { console, Date, JSON, Math, Object, Array, Set, String, Boolean, Number, RegExp };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const api = sandbox.AldusQuestionBankJsonImportV191;

const payload = {
  schema: "metas-estudo-question-bank-v1",
  metadata: { titulo: "Captura QC", arquivo_origem: "captura.zip", data_conversao: "2026-07-30" },
  questionBank: [
    {
      id: "Q1", numero_qconcursos: "Q1", disciplina: "Direitos Humanos", assunto: "Sistema Interamericano; Corte IDH",
      assuntos: ["Sistema Interamericano", "Corte IDH"], tema: "SIDH", banca: "FGV", ano: 2024,
      enunciado: "Questão um", alternativas: { A: "A", B: "B", C: "C", D: "D", E: "E" },
      resposta: "A", resposta_marcada: "A", gabarito: "C", resultado: "Errada", acertou: false,
      alternativas_eliminadas: ["B"], revisao_manual: false, observacoes: "captura conferida"
    },
    {
      id: "Q2", numero_qconcursos: "Q2", disciplina: "Direitos Humanos", assunto: "Comissão IDH", banca: "FGV", ano: 2025,
      enunciado: "Questão dois", alternativas: { A: "A", B: "B", C: "C", D: "D", E: "E" },
      resposta: "D", resposta_marcada: "D", gabarito: "D", resultado: "Certa", acertou: true
    },
    {
      id: "Q3", numero_qconcursos: "Q3", disciplina: "Direitos Humanos", assunto: "Corte IDH", banca: "FGV", ano: 2023,
      enunciado: "Questão três", alternativas: { A: "A", B: "B", C: "C", D: "D", E: "E" },
      resposta: "", resposta_marcada: "", gabarito: "", resultado: "Não respondida", acertou: null, revisao_manual: true
    }
  ]
};

test("separa banco puro de arquivo com desempenho", () => {
  assert.equal(api.hasPerformanceEvidence({ resposta: "C", gabarito: "C" }), false);
  assert.equal(api.hasPerformanceEvidence({ resposta_marcada: "C", gabarito: "C" }), true);
  assert.equal(api.resultStatus({ resultado: "Não respondida", resposta_marcada: "" }), "branco");
});

test("preserva campos completos e cria sessão sem perder respostas", () => {
  const plan = api.buildImportPlan(payload, [], []);
  assert.deepEqual({ ...plan.counts }, { read: 3, created: 3, updated: 0, unchanged: 0, results: 3, correct: 1, wrong: 1, blank: 1, doubt: 0 });
  assert.equal(plan.bank[0].numero_qconcursos, "Q1");
  assert.deepEqual([...plan.bank[0].assuntos], ["Sistema Interamericano", "Corte IDH"]);
  assert.deepEqual([...plan.bank[0].alternativas_eliminadas], ["B"]);
  assert.equal(plan.session.sourceType, "qconcursos-json");
  assert.equal(plan.session.summary.correct, 1);
  assert.equal(plan.session.summary.wrong, 1);
  assert.equal(plan.session.summary.blank, 1);
  assert.equal(plan.session.items[0].marcado, "A");
  assert.equal(plan.session.items[0].gabarito, "C");
  assert.equal(plan.session.items[2].marcado, "__blank__");
  assert.equal(plan.notebookItems.length, 2);
});

test("atualiza por código QC sem trocar o id existente e não duplica desempenho", () => {
  const existing = [{ id: "interno-1", qcCodigo: "Q1", enunciado: "Questão um", disciplina: "Direitos Humanos", assunto: "Antigo", banca: "FGV", ano: 2024, observacoes: "anterior" }];
  const first = api.buildImportPlan(payload, existing, []);
  assert.equal(first.counts.created, 2);
  assert.equal(first.counts.updated, 1);
  assert.equal(first.bank.find((item) => item.qcCodigo === "Q1").id, "interno-1");
  const second = api.buildImportPlan(payload, first.bank, [first.session]);
  assert.equal(second.duplicateSession, true);
  assert.equal(second.session, null);
});

test("arquivo de banco com resposta/gabarito, mas sem resultado, não cria histórico", () => {
  const bankOnly = { schema: "metas-estudo-question-bank-v1", questionBank: [{ id: "CE1", disciplina: "Penal", assunto: "Tipicidade", enunciado: "Item", tipo: "Certo/Errado", resposta: "E", gabarito: "E" }] };
  const plan = api.buildImportPlan(bankOnly, [], []);
  assert.equal(plan.counts.results, 0);
  assert.equal(plan.session, null);
  assert.equal(plan.bank[0].gabarito, "E");
});

const worker = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");
test("worker carrega e injeta o adaptador JSON antes dos eventos do banco", () => {
  assert.match(worker, /question-bank-json-import-v191\.js/);
  assert.match(worker, /qbJsonImportSource/);
  assert.match(worker, /importação JSON completa do QConcursos/);
  assert.match(worker, /injectBeforeMarker\(\s*patchedSource,\s*qbEventsMarker,[\s\S]*question-bank-json-import-v191\.js/);
});
