const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

test("Fábrica não coloca metas concluídas ou assuntos já estudados na fila", () => {
  const groups = sourceBetween("function factoryGoalGroupsForDate", "function factoryTodayGroups");
  const pending = sourceBetween("function factoryResumoAulaPending", "function factoryCanAppearInDoNow");
  assert.match(groups, /!isGoalDone\(goal\)/);
  assert.match(groups, /!planningRecordMatchesCompletedSubject\(goal\)/);
  assert.match(pending, /!factorySubjectAlreadyStudied\(item\)/);
});

test("material já cadastrado também satisfaz a necessidade da Fábrica", () => {
  const ready = sourceBetween("function factoryResumoAulaReady", "function factorySubjectAlreadyStudied");
  assert.match(ready, /materialMatchesAssociation/);
  assert.match(ready, /factorySyllabusItemIds/);
  assert.doesNotMatch(ready, /material\.source === "factory"/);
});

test("painel distingue material pronto de produção pendente", () => {
  const render = sourceBetween("function renderFactory", "function setFactoryTriagemStatus");
  assert.match(render, /MATERIAIS DAS METAS PENDENTES/);
  assert.match(render, /Material já disponível/);
  assert.match(render, /Precisa produzir/);
  assert.match(render, /filter\(\(entry\) => !isGoalDone\(entry\.goal\)/);
});

test("V83 mantém cache anterior e publicação em paridade", () => {
  const version = "20260720-grafico-tempo-contraste-v83";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-integracao-fabrica-materiais-v80"/);
  for (const file of ["script.js", "index.html", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
