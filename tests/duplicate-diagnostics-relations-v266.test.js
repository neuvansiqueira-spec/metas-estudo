"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const addon = require("../duplicate-diagnostics-relations-v266.js");

function profile(id, code, discipline, label, normalizedTopic, coverage = []) {
  return {
    id,
    code,
    disciplineLabel: discipline,
    label,
    normalizedTopic,
    coverage,
    item: { id, discipline, subject: label, subtopic: code }
  };
}

const broad = profile(
  "broad",
  "9.10",
  "DIREITO ADMINISTRATIVO",
  "Controle da Administração Pública",
  "controle administracao publica",
  [{ contestId: "pcpr", code: "5.9", topic: "Controle da Administração Pública" }]
);
const internal = profile(
  "internal",
  "5.9.2",
  "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
  "Controle interno e externo",
  "controle interno externo"
);
const unrelated = profile(
  "other",
  "9.11",
  "DIREITO ADMINISTRATIVO",
  "Responsabilidade civil do Estado",
  "responsabilidade civil estado"
);

const state = {
  syllabusItems: [broad.item, internal.item, unrelated.item],
  duplicateDiagnostics: {
    audit: [{
      keeperId: "internal",
      removedId: "old-control",
      decidedAt: "2026-08-06T12:00:00.000Z",
      after: { keeper: { topic: "Controle interno e externo" } },
      before: { removed: { topic: "Controle administrativo" } }
    }]
  }
};

const diagnosticsApi = {
  diagnoseState() { return { pairs: [] }; },
  buildProfiles() { return { profiles: [broad, internal, unrelated] }; }
};

test("reconhece o eixo oficial 5.9 relacionado ao subitem 5.9.2", () => {
  assert.equal(addon.codePrefixRelation(broad, internal), "5.9 ↔ 5.9.2");
});

test("reconhece Controle da Administração Pública x Controle interno e externo", () => {
  assert.equal(addon.administrativeControlRelation(broad, internal), true);
  assert.equal(addon.administrativeControlRelation(broad, unrelated), false);
});

test("gera relação informativa sem inventar relação com tema alheio", () => {
  const relations = addon.deriveRelations(state, diagnosticsApi);
  assert.equal(relations.length, 1);
  assert.equal(relations[0].key, "broad::internal");
  assert.equal(relations[0].classification, "relation");
});

test("busca global encontra relações e histórico", () => {
  const result = addon.globalSearch(state, diagnosticsApi, "controle interno");
  assert.equal(result.pairs.length, 1);
  assert.equal(result.audit.length, 1);
});

test("busca global não retorna tema não relacionado", () => {
  const result = addon.globalSearch(state, diagnosticsApi, "responsabilidade civil");
  assert.equal(result.pairs.length, 0);
  assert.equal(result.audit.length, 0);
});
