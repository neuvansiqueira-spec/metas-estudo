const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const patch = fs.readFileSync("qconcursos-subject-filter-v285.js", "utf8");

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(`${script.slice(catalogStart, catalogEnd)}\n${script.slice(routeStart, routeEnd)}\n${patch}; return { buildQconcursosFilterRoute, subjectPatch: globalThis.__aldusQconcursosSubjectFilterV285 };`)();
}

test("V285 envia o assunto inicial de Direito Administrativo como subject_ids do QC", () => {
  const api = routeApi();
  const route = api.buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo",
    qconcursosNumber: "1"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), ["15940"]);
  assert.equal(url.searchParams.get("q"), null);
  assert.deepEqual(url.searchParams.getAll("discipline_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.equal(url.searchParams.getAll("publication_year[]").length, 5);
  assert.equal(route.automaticFilters.subject, true);
  assert.equal(route.automaticFilters.search, false);
});

test("V285 preserva busca textual quando o subject_id ainda não foi confirmado", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Assunto ainda sem ID QC confirmado"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Assunto ainda sem ID QC confirmado");
  assert.equal(route.automaticFilters.subject, false);
  assert.equal(route.automaticFilters.search, true);
});

test("V285 prioriza subject_id salvo no item do edital", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Tema customizado",
    qconcursosSubjectId: "12345"
  }, "FGV");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), ["12345"]);
  assert.equal(url.searchParams.get("q"), null);
  assert.equal(route.subjectIdSource, "saved");
});
