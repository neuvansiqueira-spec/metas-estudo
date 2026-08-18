const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const api = require("../simulados-edital-integration.js");
const root = path.resolve(__dirname, "..");
const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";

test("SIMULADOS continua operacional para tempo, mas é excluído da Fábrica", () => {
  const entries = [
    { item: { discipline: "DIREITO PENAL", subject: "Crimes contra a vida" }, goals: [{ discipline: "DIREITO PENAL" }] },
    { item: { discipline: "SIMULADOS", subject: "Realização de simulado" }, goals: [{ discipline: "SIMULADOS" }] }
  ];

  assert.equal(api.isOperationalDiscipline("simulados"), true);
  assert.equal(api.isOperationalSubject("Realização de simulado"), true);
  assert.deepEqual(api.filterFactoryEntries(entries), [entries[0]]);
});

test("a migração remove somente a pseudo-disciplina e preserva estudos e metas", () => {
  const state = {
    subjects: [
      { id: "disciplina-operacional-simulados", name: "SIMULADOS", operational: true },
      { id: "penal", name: "DIREITO PENAL" }
    ],
    studies: [{ discipline: "SIMULADOS", minutes: 120 }],
    dailyGoals: [{ discipline: "SIMULADOS", subject: "Realização de simulado" }]
  };

  const result = api.removeLegacyInjectedSubject(state);
  assert.equal(result.removed, 1);
  assert.equal(state.subjects.length, 1);
  assert.equal(state.studies.length, 1);
  assert.equal(state.dailyGoals.length, 1);
});

test("a publicação v236 nasce com uma única versão e mantém a integridade v235", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});
