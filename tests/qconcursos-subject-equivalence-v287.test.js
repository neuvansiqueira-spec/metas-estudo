const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const v285 = fs.readFileSync("qconcursos-subject-filter-v285.js", "utf8");
const v286 = fs.readFileSync("qconcursos-subject-coherence-v286.js", "utf8");
const v287 = fs.readFileSync("qconcursos-subject-equivalence-v287.js", "utf8");
const crosswalkSource = fs.readFileSync("qconcursos-crosswalk.js", "utf8");
const crosswalkWindow = {};
new Function("window", crosswalkSource)(crosswalkWindow);
const auditedCrosswalk = crosswalkWindow.QCONCURSOS_AUDITED_CROSSWALK;

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(`${script.slice(catalogStart, catalogEnd)}\n${script.slice(routeStart, routeEnd)}\n${v285}\n${v286}\n${v287}; return { buildQconcursosFilterRoute, bridge: globalThis.__aldusQconcursosSubjectEquivalenceV287 };`)();
}

function withAuditedCrosswalk(callback) {
  const previous = globalThis.QCONCURSOS_AUDITED_CROSSWALK;
  globalThis.QCONCURSOS_AUDITED_CROSSWALK = auditedCrosswalk;
  try {
    return callback();
  } finally {
    if (previous === undefined) delete globalThis.QCONCURSOS_AUDITED_CROSSWALK;
    else globalThis.QCONCURSOS_AUDITED_CROSSWALK = previous;
  }
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

test("V289 transforma assunto exato auditado em rota canônica real do QC", () => withAuditedCrosswalk(() => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Princípios da Administração Pública",
    qconcursosNumber: "2.2"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.equal(
    url.pathname,
    "/questoes-de-concursos/disciplinas/direito-direito-administrativo/principios-da-administracao-publica/questoes"
  );
  assert.equal(url.searchParams.get("q"), null);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.equal(route.qcSubjectLabel, "Princípios da Administração Pública");
  assert.equal(route.subjectRouteSource, "audited-crosswalk-canonical-route");
  assert.equal(route.automaticFilters.subject, true);
  assert.equal(route.automaticFilters.search, false);
}));

test("V289 converte item de categoria auditada para o assunto exato pai do QC", () => withAuditedCrosswalk(() => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Processual Penal",
    topic: "2.3 Inquérito Policial.",
    subject: "Conceito, Natureza Jurídica, Características e Finalidade",
    qconcursosNumber: "5"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.equal(
    url.pathname,
    "/questoes-de-concursos/disciplinas/direito-direito-processual-penal/inquerito-policial/questoes"
  );
  assert.equal(url.searchParams.get("q"), null);
  assert.equal(route.qcSubjectLabel, "Inquérito Policial");
  assert.equal(route.subjectCoherence, "audited-canonical-route");
  assert.equal(route.automaticFilters.subject, true);
}));

test("V289 mantém busca textual quando não há equivalência auditada segura", () => withAuditedCrosswalk(() => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Assunto constitucional sem equivalência confirmada"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Assunto constitucional sem equivalência confirmada");
  assert.equal(route.automaticFilters.subject, false);
}));

test("V289 preserva a rota canônica confirmada da V286 para Direito Administrativo", () => withAuditedCrosswalk(() => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.match(url.pathname, /conceitos-iniciais-de-direito-administrativo/);
  assert.equal(url.searchParams.get("q"), null);
}));
