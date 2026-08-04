const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const operational = require("../simulados-edital-integration.js");
const script = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

test("SIMULADOS é categoria operacional em maiúsculas", () => {
  assert.equal(operational.DISCIPLINE, "SIMULADOS");
  assert.equal(operational.SUBJECT, "Realização de simulado");
  assert.equal(operational.isOperationalDiscipline("Simulados"), true);
  assert.equal(operational.isOperationalDiscipline("SIMULADOS"), true);
});

test("migração remove apenas a disciplina artificial e preserva metas e estudos", () => {
  const state = {
    subjects: [
      { id: "penal", name: "DIREITO PENAL" },
      { id: operational.LEGACY_DISCIPLINE_ID, name: "Simulados", operational: true, linkedView: "simulados" }
    ],
    studies: [{ discipline: "SIMULADOS", minutes: 180 }],
    dailyGoals: [{ discipline: "SIMULADOS", subject: operational.SUBJECT, origin: "manual" }]
  };
  const result = operational.removeLegacyInjectedSubject(state);
  assert.deepEqual(state.subjects.map((subject) => subject.name), ["DIREITO PENAL"]);
  assert.equal(result.removed, 1);
  assert.equal(state.studies.length, 1);
  assert.equal(state.dailyGoals.length, 1);
  assert.equal(state.migrations.simuladosOperationalDecoupledV234.preservedStudies, 1);
  assert.equal(state.migrations.simuladosOperationalDecoupledV234.preservedGoals, 1);
});

test("disciplina legítima sem marcadores artificiais não é apagada", () => {
  const state = { subjects: [{ id: "manual", name: "Simulados" }] };
  const result = operational.removeLegacyInjectedSubject(state);
  assert.equal(result.changed, false);
  assert.equal(state.subjects.length, 1);
});

test("meta manual aceita SIMULADOS sem criar item no edital", () => {
  assert.match(script, /operationalSimulado \? "" : item\.id/);
  assert.match(script, /appendOperationalSimuladosDisciplineOption\(elements\.goalDiscipline/);
  assert.match(script, /populateOperationalSimuladosGoalSubject/);
  assert.match(script, /SIMULADOS_OPERATIONAL\?\.removeLegacyInjectedSubject\(state\)/);
  assert.match(script, /if \(goal\.operationalDiscipline === true \|\| isOperationalSimuladosDiscipline\(discipline\)\) return false;/);
  assert.match(html, /Adicionar meta manual de simulado/);
  assert.match(html, /sem incluir SIMULADOS no edital ou na distribuição automática do Planejamento/);
});
