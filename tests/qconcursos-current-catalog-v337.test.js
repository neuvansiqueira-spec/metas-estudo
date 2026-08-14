const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const chain = [
  "qconcursos-all-filters-v334.js",
  "qconcursos-route-safety-v335.js",
  "qconcursos-native-subject-v336.js",
  "qconcursos-current-catalog-v337.js"
];

function runtime() {
  const context = {
    URL,
    URLSearchParams,
    console,
    queueMicrotask: () => {},
    setTimeout: () => {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("pcpr-pcma-2026-catalog.js", "utf8"), context);
  vm.runInContext(`
    let buildQconcursosFilterRoute = () => ({
      url: "https://www.qconcursos.com/questoes-de-concursos/questoes?job_ids%5B%5D=169&examining_board_ids%5B%5D=2&publication_year%5B%5D=2026&publication_year%5B%5D=2025&publication_year%5B%5D=2024&publication_year%5B%5D=2023&publication_year%5B%5D=2022&exclude_nullified=true&exclude_outdated=true&sort=relevance",
      automaticFilters: { cargo: true, discipline: false, board: true, period: true, subject: false, search: false, sort: true }
    });
    let renderQconcursosFilterRoute = () => {};
  `, context);
  for (const file of chain) vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  vm.runInContext("globalThis.__buildQconcursosV337 = buildQconcursosFilterRoute", context);
  return context;
}

function evaluateCatalog() {
  const context = runtime();
  const build = context.__buildQconcursosV337;
  return context.PCPR_PCMA_2026_CATALOG.newItems.map((item) => {
    const route = build(item, "FGV");
    const url = new URL(route.url);
    return { item, route, url, native: route.automaticFilters?.subject === true && !url.searchParams.has("q") };
  });
}

test("V337 mede o catálogo atual inteiro e aplica assunto nativo em 383 dos 430 temas", () => {
  const rows = evaluateCatalog();
  const native = rows.filter((row) => row.native);
  const fallback = rows.filter((row) => !row.native);
  const disciplines = new Set(rows.map((row) => row.item.discipline));
  const coveredDisciplines = new Set(native.map((row) => row.item.discipline));

  assert.equal(rows.length, 430);
  assert.equal(native.length, 383);
  assert.equal(fallback.length, 47);
  assert.equal(disciplines.size, 17);
  assert.equal(coveredDisciplines.size, 17);

  for (const { route, url } of native) {
    assert.match(url.pathname, /^\/questoes-de-concursos\/disciplinas\/[^/]+\/[^/]+\/questoes$/);
    assert.equal(url.searchParams.get("q"), null);
    assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
    assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
    assert.deepEqual(url.searchParams.getAll("publication_year[]"), ["2026", "2025", "2024", "2023", "2022"]);
    assert.equal(url.searchParams.get("exclude_nullified"), "true");
    assert.equal(url.searchParams.get("exclude_outdated"), "true");
    assert.equal(url.searchParams.get("sort"), "relevance");
    assert.equal(route.automaticFilters.discipline, true);
    assert.equal(route.automaticFilters.search, false);
  }

  for (const { route, url } of fallback) {
    assert.equal(route.automaticFilters.subject, false);
    assert.equal(route.automaticFilters.search, true);
    assert.ok(url.searchParams.get("q"));
  }
});

test("V337 cobre assuntos representativos que antes não chegavam ao filtro nativo", () => {
  const rows = evaluateCatalog();
  const cases = [
    ["DIREITO AGRÁRIO", "Teoria geral do Direito Agrário", "/direito-direito-agrario/nocoes-fundamentais-de-direito-agrario/questoes"],
    ["DIREITO DIGITAL", "Marco Civil", "/direito-direito-digital/lei-n-12-965-de-2014-marco-civil-da-internet/questoes"],
    ["MEDICINA LEGAL", "Importância da prova pericial", "/criminalistica-medicina-legal/pericia/questoes"],
    ["LEGISLAÇÃO ESTADUAL E INSTITUCIONAL", "Estruturação das carreiras", "/direito-legislacao-estadual/legislacao-do-estado-do-parana/questoes"],
    ["LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", "Lei de Execução Penal", "/direito-direito-penal/legislacao-penal-especial/questoes"]
  ];

  for (const [discipline, subjectPart, suffix] of cases) {
    const found = rows.find((row) => row.item.discipline === discipline && row.item.subject.includes(subjectPart));
    assert.ok(found, `${discipline} — ${subjectPart}`);
    assert.equal(found.native, true);
    assert.ok(found.url.pathname.endsWith(suffix), found.url.pathname);
  }
});

test("V337 não inventa assunto nativo para os 47 temas sem equivalência pública confirmada", () => {
  const rows = evaluateCatalog();
  const stateConstitution = rows.find((row) => row.item.subject === "Constituição do Estado do Maranhão");
  assert.ok(stateConstitution);
  assert.equal(stateConstitution.native, false);
  assert.equal(stateConstitution.route.subjectRouteSource, "route-safety-text-fallback-v335");
  assert.match(stateConstitution.url.searchParams.get("q"), /Constituição do Estado do Maranhão/);
});

test("V337 é carregada depois da V336, copiada para docs e protegida pelo cache", () => {
  const bootstrap = fs.readFileSync("bootstrap-integrity-loader-v258-core.js", "utf8");
  const v337 = fs.readFileSync("qconcursos-current-catalog-v337.js", "utf8");
  assert.ok(bootstrap.indexOf("qconcursos-current-catalog-v337.js") > bootstrap.indexOf("qconcursos-native-subject-v336.js"));
  assert.equal(bootstrap, fs.readFileSync("docs/bootstrap-integrity-loader-v258-core.js", "utf8"));
  assert.equal(v337, fs.readFileSync("docs/qconcursos-current-catalog-v337.js", "utf8"));

  for (const file of [
    "service-worker.js", "service-worker-v168.js", "service-worker-v169.js", "service-worker-v332.js",
    "docs/service-worker.js", "docs/service-worker-v168.js", "docs/service-worker-v169.js", "docs/service-worker-v332.js"
  ]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /20260814-qconcursos-catalogo-atual-v337/);
    assert.match(worker, /qconcursos-current-catalog-v337\.js/);
    assert.match(worker, /qconcursos-filter-v337/);
  }

  for (const file of ["index.html", "docs/index.html"]) {
    assert.match(fs.readFileSync(file, "utf8"), /bootstrap-integrity-loader-v258\.js\?v=20260814-qconcursos-catalogo-atual-v337/);
  }
});
