"use strict";

const assert = require("node:assert/strict");
const diagnostics = require("../duplicate-diagnostics-v303.js");

function stateWith(items) {
  return {
    syllabusItems: items,
    contestSyllabusMap: [],
    studies: [],
    dailyGoals: [],
    questionLogs: [],
    smartReviews: [],
    simulados: [],
    materials: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: [],
    factoryItems: [],
    factoryAgenda: [],
    migrations: {}
  };
}

const exactVisibleState = stateWith([
  {
    id: "person-pcpr",
    discipline: "DIREITO PENAL",
    code: "1.7",
    topic: "1.7 Crimes Contra a Pessoa.",
    subtopic: "Edital PCPR"
  },
  {
    id: "person-pcma",
    discipline: "Direito Penal",
    code: "4.2",
    topic: "1.7 Crimes contra a Pessoa",
    subtopic: "Edital PCMA"
  }
]);

const exactVisibleReport = diagnostics.diagnoseState(exactVisibleState, { includeDecided: true });
const exactVisiblePair = exactVisibleReport.pairs[0];
assert.ok(exactVisiblePair, "deve encontrar o par com títulos principais iguais");
assert.equal(exactVisiblePair.classification, "exact", "campos internos diferentes não podem rebaixar título visível idêntico");
assert.equal(exactVisiblePair.evidence.exactPrimaryTopic, true, "deve registrar a equivalência do título principal");
assert.ok(exactVisiblePair.confidence >= 94, "título principal idêntico deve superar o limiar do lote");
assert.equal(diagnostics.recommendedBatchPlan(exactVisibleReport).actions.length, 1, "duplicidade visível idêntica deve entrar nas recomendações");

const nearState = stateWith([
  { id: "act-a", discipline: "DIREITO ADMINISTRATIVO", code: "9.3", topic: "Atos administrativos" },
  { id: "act-b", discipline: "Direito Administrativo", code: "7.4", topic: "Ato administrativo" }
]);
const nearReport = diagnostics.diagnoseState(nearState, { includeDecided: true });
const nearPair = nearReport.pairs[0];
assert.ok(nearPair, "deve encontrar variação singular/plural quase idêntica");
assert.equal(nearPair.evidence.nearPrimaryTopic, true, "deve reconhecer título principal quase idêntico");
assert.ok(nearPair.confidence >= 90, "quase idêntico seguro deve superar o limiar do lote");
assert.equal(diagnostics.recommendedBatchPlan(nearReport).actions.length, 1, "quase idêntico seguro deve entrar nas recomendações");

const hierarchyState = stateWith([
  { id: "crime-parent", discipline: "DIREITO PENAL", code: "1.7", topic: "Crimes contra a pessoa" },
  { id: "crime-child", discipline: "DIREITO PENAL", code: "1.7.1", topic: "Crimes contra a pessoa: homicídio" }
]);
const hierarchyReport = diagnostics.diagnoseState(hierarchyState, { includeDecided: true });
const hierarchyPair = hierarchyReport.pairs[0];
assert.ok(hierarchyPair, "tema e subtema devem continuar visíveis para revisão");
assert.equal(hierarchyPair.evidence.hierarchy, true, "deve identificar a relação hierárquica");
const hierarchyPlan = diagnostics.recommendedBatchPlan(hierarchyReport);
assert.equal(hierarchyPlan.actions.length, 0, "tema-pai e subtema não podem ser consolidados automaticamente");
assert.equal(hierarchyPlan.excluded.hierarchicalOrBroad, 1, "deve explicar a exclusão hierárquica");

console.log("v303 duplicate recommendations: covered");
