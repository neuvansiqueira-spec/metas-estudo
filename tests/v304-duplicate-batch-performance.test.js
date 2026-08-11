"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const diagnostics = require("../duplicate-diagnostics-v304.js");
const batch = require("../duplicate-diagnostics-batch-v304.js");

assert.equal(diagnostics.VERSION, "20260811-duplicate-batch-performance-v304");
assert.equal(batch.VERSION, "20260811-duplicate-batch-performance-v304");

const state = {
  syllabusItems: [
    { id: "pcpr", discipline: "DIREITO PENAL", code: "1.7", topic: "1.7 Crimes Contra a Pessoa", subtopic: "PCPR" },
    { id: "pcma", discipline: "Direito Penal", code: "4.2", topic: "Crimes contra a pessoa", subtopic: "PCMA" }
  ],
  studies: [], dailyGoals: [], questionLogs: [], smartReviews: [], simulados: [], materials: [],
  questionBank: [], questionBankSessions: [], questionErrorNotebook: [], factoryItems: [], factoryAgenda: [],
  contestSyllabusMap: [], migrations: {}
};
const report = diagnostics.diagnoseState(state, { includeDecided: true });
assert.equal(report.pairs[0].classification, "exact", "a otimização não pode perder as recomendações ampliadas");
const plan = diagnostics.recommendedBatchPlan(report);
assert.equal(plan.actions.length, 1, "o plano seguro deve continuar disponível");
globalThis.__aldusDuplicateBatchPlanV304 = {
  version: diagnostics.VERSION,
  itemCount: state.syllabusItems.length,
  plan
};
assert.equal(batch.cachedPlanForState(state, diagnostics).actions.length, 1, "deve reutilizar o plano já validado");
assert.equal(batch.cachedPlanForState({ ...state, syllabusItems: state.syllabusItems.slice(0, 1) }, diagnostics), null, "deve recalcular se o estado mudou");

const coreSource = fs.readFileSync(path.join(__dirname, "..", "duplicate-diagnostics-v304.js"), "utf8");
const batchSource = fs.readFileSync(path.join(__dirname, "..", "duplicate-diagnostics-batch-v304.js"), "utf8");
assert.match(coreSource, /__aldusDuplicateBatchPlanV304/, "o diagnóstico deve publicar o plano já calculado");
assert.match(batchSource, /cachedPlanForState\(targetState, api\)/, "a confirmação deve reutilizar o plano válido");
assert.match(batchSource, /sem recalcular o diagnóstico/, "a interface deve informar o início imediatamente");
assert.match(batchSource, /processando \$\{index \+ 1\} de \$\{plan\.actions\.length\}/, "deve mostrar cada avanço do lote");
assert.match(batchSource, /await readMainIndexedDB\(\)/, "a verificação autoritativa deve permanecer ativa");
assert.doesNotMatch(batchSource, /window\.location\.reload/, "não deve fechar o diagnóstico");

console.log("v304 duplicate batch performance: covered");
