const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("qconcursos-filter-route-v333.js", "utf8");

function api(baseRoute) {
  return new Function(`
    let buildQconcursosFilterRoute = () => (${JSON.stringify(baseRoute)});
    const renderQconcursosFilterRoute = () => {};
    ${source}
    return globalThis.__aldusQconcursosFilterRouteV333;
  `)();
}

test("V333 aplica disciplina e assunto canônicos para Teoria Geral do Direito Agrário", () => {
  const bridge = api({
    url: "https://www.qconcursos.com/questoes-de-concursos/questoes?job_ids%5B%5D=169&examining_board_ids%5B%5D=2&q=Teoria+geral+do+Direito+Agr%C3%A1rio+%E2%80%94+1&sort=relevance",
    automaticFilters: { cargo: true, discipline: false, subject: false, search: true }
  });
  const route = bridge.repairRoute({
    url: "https://www.qconcursos.com/questoes-de-concursos/questoes?job_ids%5B%5D=169&examining_board_ids%5B%5D=2&q=Teoria+geral+do+Direito+Agr%C3%A1rio+%E2%80%94+1&sort=relevance",
    automaticFilters: { cargo: true, discipline: false, subject: false, search: true }
  }, {
    discipline: "DIREITO AGRÁRIO",
    subject: "Teoria geral do Direito Agrário: origem, conceito e princípios",
    subtopic: "1"
  });
  const url = new URL(route.url);
  assert.equal(url.pathname, "/questoes-de-concursos/disciplinas/direito-direito-agrario/nocoes-fundamentais-de-direito-agrario/questoes");
  assert.equal(url.searchParams.get("q"), null);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.equal(route.automaticFilters.discipline, true);
  assert.equal(route.automaticFilters.subject, true);
});

test("V333 mantém a disciplina canônica quando o assunto ainda depende de texto", () => {
  const bridge = api({ url: "https://www.qconcursos.com/questoes-de-concursos/questoes?q=Tema", automaticFilters: { discipline: false } });
  const route = bridge.repairRoute({
    url: "https://www.qconcursos.com/questoes-de-concursos/questoes?q=Tema",
    automaticFilters: { discipline: false, subject: false, search: true }
  }, { discipline: "Direito Agrário", subject: "Tema" });
  assert.equal(new URL(route.url).pathname, "/questoes-de-concursos/disciplinas/direito-direito-agrario/questoes");
  assert.equal(route.automaticFilters.discipline, true);
});
