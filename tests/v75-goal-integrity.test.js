const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V75 usa a data civil local, inclusive em soma e início da semana", () => {
  const script = read("script.js");
  assert.match(script, /function localISODate\(value = new Date\(\)\)/);
  assert.match(script, /const todayISO = \(\) => localISODate\(\)/);
  assert.match(script, /function addDays[\s\S]*return localISODate\(date\)/);
  assert.match(script, /function weekStart[\s\S]*return localISODate\(d\)/);
  assert.doesNotMatch(script, /const todayISO = \(\) => new Date\(\)\.toISOString\(\)\.slice/);
});

test("meta é identificada por disciplina e assunto, sem depender do material", () => {
  const script = read("script.js");
  assert.match(script, /function planningBaseSubject/);
  assert.match(script, /function planningItemKey\(record = \{\}\)/);
  assert.match(script, /function goalSyllabusReservationKey\(goal = \{\}\) \{ return planningItemKey\(goal\); \}/);
  assert.match(script, /Material vinculado como apoio; a meta continua sendo o assunto/);
  const makeGoal = script.slice(script.indexOf("function makeGoal"), script.indexOf("function pickCandidate"));
  assert.doesNotMatch(makeGoal, /partLabel|nextSchedulableSegmentDate/);
});

test("duplicações antigas são reparadas e o histórico recupera materiais pelo assunto", () => {
  const script = read("script.js");
  assert.match(script, /function repairAutomaticGoalDuplicatesV75/);
  assert.match(script, /repairAutomaticGoalDuplicatesV75\(state\)/);
  assert.match(script, /function materialTitlesForStudy/);
  assert.match(script, /resolveAvailableMaterials\(\{ discipline, subject: study\.topic, syllabusItemId: study\.syllabusItemId \}\)/);
  assert.match(script, /function addManualTime\(\)/);
});

test("V75 publica a camada tipográfica e mantém raiz e docs em paridade", () => {
  const version = "20260719-correcao-metas-v75";
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("index.html"), /aldus-goal-integrity-v75\.css/);
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  for (const file of ["script.js", "index.html", "service-worker.js", "aldus-goal-integrity-v75.css"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
