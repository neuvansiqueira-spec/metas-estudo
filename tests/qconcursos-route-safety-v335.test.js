const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const v334 = fs.readFileSync("qconcursos-all-filters-v334.js", "utf8");
const v335 = fs.readFileSync("qconcursos-route-safety-v335.js", "utf8");

function catalog() {
  const context = {};
  vm.runInNewContext(fs.readFileSync("pcpr-pcma-2026-catalog.js", "utf8"), context);
  return context.PCPR_PCMA_2026_CATALOG;
}

function bridge(baseRoute) {
  return new Function(`
    let buildQconcursosFilterRoute = () => (${JSON.stringify(baseRoute)});
    const renderQconcursosFilterRoute = () => {};
    ${v334}
    ${v335}
    return {
      build: buildQconcursosFilterRoute,
      safety: globalThis.__aldusQconcursosRouteSafetyV335
    };
  `)();
}

function brokenGeneratedRoute() {
  return {
    url: "https://www.qconcursos.com/questoes-de-concursos/disciplinas/direito-direito-administrativo/improbidade-administrativa/questoes?job_ids%5B%5D=169&examining_board_ids%5B%5D=2&publication_year%5B%5D=2026&publication_year%5B%5D=2025&exclude_nullified=true&exclude_outdated=true&sort=relevance",
    subjectIdSource: "audited-crosswalk-canonical-route",
    subjectRouteSource: "audited-crosswalk-canonical-route",
    automaticFilters: { cargo: true, discipline: true, board: true, period: true, subject: true, search: false, sort: true }
  };
}

test("V335 substitui a rota inexistente de Improbidade Administrativa por disciplina e busca seguras", () => {
  const item = { discipline: "DIREITO ADMINISTRATIVO", subject: "Improbidade Administrativa" };
  const route = bridge(brokenGeneratedRoute()).build(item, "Cebraspe");
  const url = new URL(route.url);

  assert.equal(url.pathname, "/questoes-de-concursos/disciplinas/direito-direito-administrativo/questoes");
  assert.equal(url.searchParams.get("q"), "Improbidade Administrativa");
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("publication_year[]"), ["2026", "2025"]);
  assert.equal(url.searchParams.get("exclude_nullified"), "true");
  assert.equal(url.searchParams.get("exclude_outdated"), "true");
  assert.equal(url.searchParams.get("sort"), "relevance");
  assert.equal(route.automaticFilters.discipline, true);
  assert.equal(route.automaticFilters.subject, false);
  assert.equal(route.automaticFilters.search, true);
});

test("V335 aplica a proteção às 17 disciplinas e aos 430 itens atuais", () => {
  const items = catalog().newItems;
  const { safety } = bridge(brokenGeneratedRoute());
  const disciplines = new Set(items.map((item) => item.discipline));
  const failures = [];

  assert.equal(items.length, 430);
  assert.equal(disciplines.size, 17);

  for (const item of items) {
    const route = safety.repairRoute(brokenGeneratedRoute(), item);
    const url = new URL(route.url);
    if (url.pathname.split("/").filter(Boolean).length !== 4) {
      failures.push(`${item.discipline} — ${item.subject}: rota profunda não confirmada`);
    }
    if (!url.searchParams.get("q")) failures.push(`${item.discipline} — ${item.subject}: busca ausente`);
    if (route.automaticFilters?.discipline !== true) failures.push(`${item.discipline}: disciplina ausente`);
  }

  assert.deepEqual(failures, []);
});

test("V335 preserva subject_id real e as rotas canônicas explicitamente confirmadas", () => {
  const item = { discipline: "DIREITO AGRÁRIO", subject: "Teoria geral do Direito Agrário: origem, conceito e princípios" };
  const { safety } = bridge(brokenGeneratedRoute());
  const withId = {
    url: "https://www.qconcursos.com/questoes-de-concursos/questoes?subject_ids%5B%5D=123",
    automaticFilters: { discipline: true, subject: true, search: false }
  };
  const v333 = {
    url: "https://www.qconcursos.com/questoes-de-concursos/disciplinas/direito-direito-agrario/nocoes-fundamentais-de-direito-agrario/questoes?job_ids%5B%5D=169",
    subjectIdSource: "verified-canonical-subject-route-v333",
    subjectRouteSource: "verified-canonical-subject-route-v333",
    automaticFilters: { discipline: true, subject: true, search: false }
  };

  assert.equal(safety.repairRoute(withId, item), withId);
  assert.equal(safety.repairRoute(v333, item), v333);
});

test("V335 permanece carregada depois da V334 sob o cache da V336", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});
