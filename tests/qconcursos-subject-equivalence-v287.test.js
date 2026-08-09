const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const v285 = fs.readFileSync("qconcursos-subject-filter-v285.js", "utf8");
const v286 = fs.readFileSync("qconcursos-subject-coherence-v286.js", "utf8");
const v287 = fs.readFileSync("qconcursos-subject-equivalence-v287.js", "utf8");

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(`${script.slice(catalogStart, catalogEnd)}\n${script.slice(routeStart, routeEnd)}\n${v285}\n${v286}\n${v287}; return { buildQconcursosFilterRoute, bridge: globalThis.__aldusQconcursosSubjectEquivalenceV287 };`)();
}

test("V287 aplica Direitos individuais e coletivos no campo Assunto do QC", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Direitos individuais e coletivos",
    qconcursosNumber: "5"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("discipline_ids[]"), ["3"]);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), ["16321"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.equal(url.searchParams.getAll("publication_year[]").length, 5);
  assert.equal(url.searchParams.get("q"), null);
  assert.equal(route.qcSubjectLabel, "Direitos Individuais");
  assert.equal(route.subjectCoherence, "confirmed-equivalence");
  assert.equal(route.automaticFilters.subject, true);
  assert.equal(route.automaticFilters.search, false);
});

test("V287 aceita variação Direitos e deveres individuais e coletivos", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Direitos e deveres individuais e coletivos"
  }, "Cebraspe");
  assert.deepEqual(new URL(route.url).searchParams.getAll("subject_ids[]"), ["16321"]);
});

test("V287 não inventa subject_id para assunto ainda sem equivalência confirmada", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Assunto constitucional sem equivalência confirmada"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Assunto constitucional sem equivalência confirmada");
});

test("V287 preserva a rota canônica confirmada da V286 para Direito Administrativo", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.match(url.pathname, /conceitos-iniciais-de-direito-administrativo/);
  assert.equal(url.searchParams.get("q"), null);
});
