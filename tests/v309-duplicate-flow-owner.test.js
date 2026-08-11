"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const diagnostics = require("../duplicate-diagnostics-v309.js");
const batch = require("../duplicate-diagnostics-batch-v305.js");

const root = path.join(__dirname, "..");
const topics = [
  ["person", "DIREITO PENAL", "1.7 Crimes Contra a Pessoa."],
  ["property", "DIREITO PENAL", "1.8 Crimes Contra o Patrimônio."],
  ["acts", "DIREITO ADMINISTRATIVO", "9.3 Atos Administrativos."],
  ["state", "DIREITO CONSTITUCIONAL", "8.4 Organização do Estado."],
  ["thanatology", "CIÊNCIAS FORENSES", "8.5 Tanatologia Forense."]
];
const state = {
  syllabusItems: topics.flatMap(([prefix, discipline, topic], index) => [
    { id: `${prefix}-a`, discipline, code: `${index + 1}.1`, topic },
    { id: `${prefix}-b`, discipline: discipline.toLowerCase(), code: `${index + 20}.2`, topic: topic.replace(/\.$/, "") }
  ]),
  contestSyllabusMap: [],
  studies: [{ id: "study-1", syllabusItemId: "person-b", minutes: 30 }],
  dailyGoals: [], questionLogs: [], smartReviews: [], simulados: [], materials: [],
  questionBank: [], questionBankSessions: [], questionErrorNotebook: [], factoryItems: [], factoryAgenda: [],
  migrations: {}
};

assert.equal(diagnostics.VERSION, "20260811-duplicate-flow-owner-v309");
assert.equal(batch.VERSION, diagnostics.VERSION, "a prévia e a execução devem compartilhar a mesma geração");

const report = diagnostics.diagnoseState(state, { includeDecided: true });
const plan = diagnostics.recommendedBatchPlan(report);
assert.equal(report.counts.exact, 5, "os exemplos visíveis devem ser classificados como duplicidades exatas");
assert.equal(plan.actions.length, 5, "todas as cinco duplicidades exatas devem entrar na fila segura");

const excludedAction = plan.actions[0];
const selectedPlan = diagnostics.removeBatchPlanAction(plan, diagnostics.batchActionKey(excludedAction));
assert.equal(selectedPlan.actions.length, 4, "o usuário deve conseguir retirar uma recomendação antes da confirmação");
assert.ok(selectedPlan.groups.every((group) => group.actions.length > 0), "grupos vazios não podem permanecer na prévia");

const working = structuredClone(state);
for (const action of selectedPlan.actions) {
  diagnostics.consolidateItems(working, action.keeperId, action.removedId, { decidedAt: "2026-08-11T12:00:00.000Z" });
}
assert.equal(working.syllabusItems.length, 6, "somente as quatro recomendações confirmadas devem ser consolidadas");
assert.equal(
  diagnostics.recommendedBatchPlan(diagnostics.diagnoseState(working, { includeDecided: true })).actions.length,
  1,
  "a recomendação retirada deve permanecer disponível após o recálculo"
);
assert.ok(
  working.studies[0].syllabusItemId === "person-a" || working.studies[0].syllabusItemId === "person-b",
  "os vínculos históricos devem continuar apontando para um tema existente"
);
assert.ok(working.syllabusItems.some((item) => item.id === working.studies[0].syllabusItemId));

const coreSource = fs.readFileSync(path.join(root, "duplicate-diagnostics-v309.js"), "utf8");
const docsIndex = fs.readFileSync(path.join(root, "docs", "index.html"), "utf8");
const workerBridge = fs.readFileSync(path.join(root, "service-worker-v291.js"), "utf8");
assert.match(coreSource, /__aldusDuplicateDiagnosticsUiOwnerV309/, "a V309 deve assumir a tela mesmo se o V260 iniciar primeiro");
assert.match(coreSource, /existingRoot\.remove\(\)/, "a tela legada deve ser substituída, não reutilizada com listeners antigos");
assert.match(coreSource, /data-dup-batch-remove/, "a prévia deve oferecer retirada individual");
assert.ok(
  docsIndex.indexOf("aldusDuplicateDiagnosticsCoreV309") < docsIndex.indexOf("aldusBootstrapIntegrityLoaderV258"),
  "o núcleo V309 deve carregar antes do bootstrap legado"
);
assert.match(workerBridge, /service-worker\.js\?v=20260811-duplicate-flow-owner-v309/, "a URL de worker já registrada deve encaminhar para a V309");
assert.equal(
  fs.readFileSync(path.join(root, "duplicate-diagnostics-v309.js"), "utf8"),
  fs.readFileSync(path.join(root, "docs", "duplicate-diagnostics-v309.js"), "utf8"),
  "o núcleo publicado deve ser idêntico ao validado"
);

console.log("v309 duplicate flow owner: covered");
