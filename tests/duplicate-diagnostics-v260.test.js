"use strict";

const assert = require("node:assert/strict");
const diagnostics = require("../duplicate-diagnostics-v260.js");

function buildState() {
  return {
    syllabusItems: [
      {
        id: "canonical-control",
        discipline: "DIREITO ADMINISTRATIVO",
        code: "9.10.1",
        topic: "Controle administrativo",
        status: "Iniciado",
        diagnosis: "OK",
        category: "A",
        totalHours: 2.5,
        officialCoverage: [
          { contestId: "pcma-2026", code: "9.10.1", discipline: "Direito Administrativo", topic: "Controle administrativo" }
        ]
      },
      {
        id: "duplicate-control",
        discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
        code: "5.9.2",
        topic: "Controle interno e externo",
        status: "Não iniciado",
        diagnosis: "Sem diagnóstico",
        category: "B",
        officialCoverage: [
          { contestId: "pcpr-2026", code: "5.9.2", discipline: "Direito Administrativo e Gestão Pública", topic: "Controle interno e externo" }
        ]
      },
      {
        id: "other-item",
        discipline: "DIREITO ADMINISTRATIVO",
        code: "9.11",
        topic: "Responsabilidade civil do Estado",
        status: "Não iniciado"
      },
      {
        id: "exact-a",
        discipline: "DIREITO PENAL",
        code: "1.3.3",
        topic: "Dolo e culpa"
      },
      {
        id: "exact-b",
        discipline: "Direito Penal",
        code: "1.3.3",
        topic: "Dolo e Culpa"
      }
    ],
    contestSyllabusMap: [
      {
        id: "pcma-control",
        contestId: "pcma-2026",
        syllabusItemId: "canonical-control",
        code: "9.10.1",
        discipline: "Direito Administrativo",
        topic: "Controle administrativo"
      },
      {
        id: "pcpr-control",
        contestId: "pcpr-2026",
        syllabusItemId: "duplicate-control",
        code: "5.9.2",
        discipline: "Direito Administrativo e Gestão Pública",
        topic: "Controle interno e externo"
      }
    ],
    studies: [
      { id: "study-1", syllabusItemId: "canonical-control", minutes: 150 },
      { id: "study-2", syllabusItemId: "duplicate-control", minutes: 30 }
    ],
    dailyGoals: [
      { id: "goal-1", syllabusItemId: "duplicate-control", actualMinutes: 30 }
    ],
    questionLogs: [
      { id: "question-1", editalItemId: "duplicate-control", correct: 8, wrong: 2 }
    ],
    materials: [
      { id: "material-1", syllabusItemId: "canonical-control", title: "Mapa mental" },
      { id: "material-2", syllabusItemId: "duplicate-control", title: "Resumo" }
    ],
    factoryItems: [
      { id: "factory-1", syllabusItemId: "canonical-control", module: "RESUMO/AULA" }
    ],
    factoryAgenda: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: [],
    smartReviews: [],
    simulados: [],
    schedulableSettings: {
      "canonical-control": { enabled: true, priority: 4 },
      "duplicate-control": { enabled: true, notes: "PCPR" }
    },
    selectedSyllabusItemId: "duplicate-control",
    migrations: {}
  };
}

const state = buildState();
const report = diagnostics.diagnoseState(state, { includeDecided: true });
assert.equal(report.counts.items, 5, "deve analisar todos os itens");

const controlPair = report.pairs.find((pair) => pair.key === diagnostics.pairKey("canonical-control", "duplicate-control"));
assert.ok(controlPair, "deve detectar Controle administrativo x Controle interno e externo");
assert.ok(["probable", "overlap", "exact"].includes(controlPair.classification), "deve classificar como candidato relevante");
assert.ok(controlPair.confidence >= 48, "deve fornecer confiança suficiente para revisão manual");
assert.equal(controlPair.recommendation.keepId, "canonical-control", "deve recomendar o item com histórico, materiais e categoria A");
assert.ok(controlPair.reasons.some((reason) => reason.includes("termos em comum") || reason.includes("abranger")), "deve explicar a evidência semântica");

const exactPair = report.pairs.find((pair) => pair.key === diagnostics.pairKey("exact-a", "exact-b"));
assert.ok(exactPair, "deve detectar duplicidade exata");
assert.equal(exactPair.classification, "exact", "mesmo código e título devem ser exatos");
assert.ok(exactPair.confidence >= 94, "duplicidade exata deve ter alta confiança");

const unrelatedPair = report.pairs.find((pair) => pair.key === diagnostics.pairKey("canonical-control", "other-item"));
assert.equal(unrelatedPair, undefined, "temas distintos da mesma disciplina não devem ser marcados");

const decision = diagnostics.setPairDecision(state, "canonical-control", "duplicate-control", "not-duplicate");
assert.equal(decision.action, "not-duplicate", "deve registrar decisão de não duplicidade");
const afterDecision = diagnostics.diagnoseState(state, { includeDecided: false });
assert.equal(afterDecision.visiblePairs.some((pair) => pair.key === controlPair.key), false, "par dispensado não deve aparecer nos pendentes");

const consolidationState = buildState();
const beforeStudyCount = consolidationState.studies.length;
const result = diagnostics.consolidateItems(consolidationState, "canonical-control", "duplicate-control", { backupId: "backup-test", decidedAt: "2026-08-06T08:00:00.000Z" });
assert.equal(result.changed, true, "consolidação deve indicar alteração");
assert.equal(consolidationState.syllabusItems.length, 4, "deve remover somente o item consolidado");
assert.ok(consolidationState.syllabusItems.some((item) => item.id === "canonical-control"), "item mantido deve permanecer");
assert.equal(consolidationState.syllabusItems.some((item) => item.id === "duplicate-control"), false, "item consolidado deve sair da lista ativa");
assert.equal(consolidationState.studies.length, beforeStudyCount, "histórico de estudos não pode ser excluído");
assert.equal(consolidationState.studies[1].syllabusItemId, "canonical-control", "estudos devem ser remapeados");
assert.equal(consolidationState.dailyGoals[0].syllabusItemId, "canonical-control", "metas diárias devem ser remapeadas");
assert.equal(consolidationState.questionLogs[0].editalItemId, "canonical-control", "questões devem ser remapeadas");
assert.equal(consolidationState.materials[1].syllabusItemId, "canonical-control", "materiais devem ser remapeados");
assert.equal(consolidationState.contestSyllabusMap.find((row) => row.id === "pcpr-control").syllabusItemId, "canonical-control", "redação oficial PCPR deve apontar para o item mantido");
assert.equal(consolidationState.selectedSyllabusItemId, "canonical-control", "seleção ativa deve ser remapeada");
assert.equal(consolidationState.schedulableSettings["duplicate-control"], undefined, "configuração duplicada deve ser removida");
assert.equal(consolidationState.schedulableSettings["canonical-control"].notes, "PCPR", "configurações complementares devem ser preservadas");
assert.ok(consolidationState.syncTombstones.collections.syllabusItems["duplicate-control"], "deve criar tombstone contra reintrodução por sincronização");
assert.equal(consolidationState.duplicateDiagnostics.audit.length, 1, "deve registrar auditoria");
assert.equal(consolidationState.duplicateDiagnostics.decisions[diagnostics.pairKey("canonical-control", "duplicate-control")].action, "consolidated", "deve registrar a decisão consolidada");

const merged = consolidationState.syllabusItems.find((item) => item.id === "canonical-control");
assert.ok(merged.officialCoverage.some((row) => row.code === "5.9.2"), "deve preservar a redação oficial do item consolidado");
assert.ok(merged.officialCoverage.some((row) => row.code === "9.10.1"), "deve preservar a redação oficial do item mantido");
assert.ok(merged.aliases.some((alias) => alias.id === "duplicate-control"), "deve guardar o item removido como alias de auditoria");
assert.ok(result.remappedLinks >= 4, "deve informar vínculos remapeados");

console.log("duplicate-diagnostics-v260: 30 assertions passed");
