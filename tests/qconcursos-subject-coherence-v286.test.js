const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const v285 = fs.readFileSync("qconcursos-subject-filter-v285.js", "utf8");
const v286 = fs.readFileSync("qconcursos-subject-coherence-v286.js", "utf8");

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(`${script.slice(catalogStart, catalogEnd)}\n${script.slice(routeStart, routeEnd)}\n${v285}\n${v286}; return { buildQconcursosFilterRoute, guard: globalThis.__aldusQconcursosSubjectCoherenceV286 };`)();
}

test("V286 não aceita qcNumber sozinho para escolher outro assunto do QC", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Princípios da Administração Pública",
    qconcursosNumber: "1"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Princípios da Administração Pública");
  assert.equal(route.subjectCoherence, "text-fallback");
  assert.equal(route.automaticFilters.subject, false);
  assert.equal(route.automaticFilters.search, true);
});

test("V286 usa a rota canônica do QC quando o assunto é realmente correspondente", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo",
    qconcursosNumber: "1"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.equal(url.pathname, "/questoes-de-concursos/disciplinas/direito-direito-administrativo/conceitos-iniciais-de-direito-administrativo-historico-funcoes-de-estado-e-fontes/questoes");
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), null);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.equal(url.searchParams.getAll("publication_year[]").length, 5);
  assert.equal(route.subjectCoherence, "confirmed");
  assert.equal(route.automaticFilters.subject, true);
});

test("V286 só preserva subject_id explícito quando marcado como confirmado", () => {
  const unsafe = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Tema customizado",
    qconcursosSubjectId: "12345"
  }, "FGV");
  const safe = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Tema customizado",
    qconcursosSubjectId: "12345",
    qconcursosSubjectIdConfirmed: true
  }, "FGV");
  assert.deepEqual(new URL(unsafe.url).searchParams.getAll("subject_ids[]"), []);
  assert.equal(new URL(unsafe.url).searchParams.get("q"), "Tema customizado");
  assert.deepEqual(new URL(safe.url).searchParams.getAll("subject_ids[]"), ["12345"]);
  assert.equal(safe.subjectCoherence, "confirmed-explicit-id");
});
