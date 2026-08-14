const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const v334 = fs.readFileSync("qconcursos-all-filters-v334.js", "utf8");
const v335 = fs.readFileSync("qconcursos-route-safety-v335.js", "utf8");
const v336 = fs.readFileSync("qconcursos-native-subject-v336.js", "utf8");

function bridge(baseRoute) {
  return new Function(`
    let buildQconcursosFilterRoute = () => (${JSON.stringify(baseRoute)});
    const renderQconcursosFilterRoute = () => {};
    ${v334}
    ${v335}
    ${v336}
    return {
      build: buildQconcursosFilterRoute,
      api: globalThis.__aldusQconcursosNativeSubjectV336
    };
  `)();
}

function auditedRoute(overrides = {}) {
  return {
    url: "https://www.qconcursos.com/questoes-de-concursos/disciplinas/direito-direito-administrativo/improbidade-administrativa/questoes?job_ids%5B%5D=169&examining_board_ids%5B%5D=2&publication_year%5B%5D=2026&publication_year%5B%5D=2025&publication_year%5B%5D=2024&publication_year%5B%5D=2023&publication_year%5B%5D=2022&exclude_nullified=true&exclude_outdated=true&sort=relevance",
    qcNumber: "17",
    qcSubjectLabel: "Improbidade Administrativa",
    auditedMatchKind: "exact",
    subjectIdSource: "audited-crosswalk-canonical-route",
    subjectRouteSource: "audited-crosswalk-canonical-route",
    automaticFilters: { cargo: true, discipline: true, board: true, period: true, subject: true, search: false, sort: true },
    ...overrides
  };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

test("V336 preenche nativamente Disciplina e Assunto para Improbidade Administrativa", () => {
  const route = bridge(auditedRoute()).build({
    discipline: "DIREITO ADMINISTRATIVO",
    subject: "Improbidade Administrativa"
  }, "Cebraspe");
  const url = new URL(route.url);

  assert.equal(url.pathname, "/questoes-de-concursos/disciplinas/direito-direito-administrativo/improbidade-administrativa-lei-n-8-429-de-1992-e-lei-n-14-230-de-2021/questoes");
  assert.equal(url.searchParams.get("q"), null);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("publication_year[]"), ["2026", "2025", "2024", "2023", "2022"]);
  assert.equal(url.searchParams.get("exclude_nullified"), "true");
  assert.equal(url.searchParams.get("exclude_outdated"), "true");
  assert.equal(url.searchParams.get("sort"), "relevance");
  assert.equal(route.qcSubjectLabel, "Improbidade administrativa - Lei nº 8.429 de 1992 e Lei nº 14.230 de 2021");
  assert.equal(route.automaticFilters.discipline, true);
  assert.equal(route.automaticFilters.subject, true);
  assert.equal(route.automaticFilters.search, false);
});

test("V336 cobre as 132 rotas canônicas atuais verificadas na taxonomia pública do QConcursos", () => {
  const { api } = bridge(auditedRoute());
  const disciplineForSlug = {
    "direito-direito-administrativo": "DIREITO ADMINISTRATIVO",
    "direito-direito-penal": "DIREITO PENAL",
    "direito-direito-processual-penal": "DIREITO PROCESSUAL PENAL",
    "direito-direito-constitucional": "DIREITO CONSTITUCIONAL",
    "criminalistica-medicina-legal": "MEDICINA LEGAL",
    "direito-direitos-humanos": "DIREITOS HUMANOS"
  };
  const failures = [];

  assert.equal(api.routes.length, 132);
  for (const entry of api.routes) {
    const item = { discipline: disciplineForSlug[entry.disciplineSlug], subject: entry.canonicalLabel };
    const route = api.repairRoute(auditedRoute({
      qcNumber: entry.qcNumber,
      qcSubjectLabel: entry.canonicalLabel,
      auditedMatchKind: "exact"
    }), item);
    const url = new URL(route.url);
    const expected = `/questoes-de-concursos/disciplinas/${entry.disciplineSlug}/${slugify(entry.currentLabel)}/questoes`;
    if (url.pathname !== expected) failures.push(`${entry.sourceDiscipline} ${entry.qcNumber}: ${url.pathname}`);
    if (route.automaticFilters?.subject !== true || url.searchParams.has("q")) {
      failures.push(`${entry.sourceDiscipline} ${entry.qcNumber}: assunto nativo ausente`);
    }
  }
  assert.deepEqual(failures, []);
});

test("V336 cobre todo vínculo exato ou por categoria que possui assunto canônico correspondente", () => {
  const context = { window: {} };
  context.window = context;
  vm.runInNewContext(fs.readFileSync("qconcursos-crosswalk.js", "utf8"), context);
  const crosswalk = context.QCONCURSOS_AUDITED_CROSSWALK;
  const { api } = bridge(auditedRoute());
  const exact = crosswalk.filter((entry) => entry.k === "exact");
  const categories = crosswalk.filter((entry) => entry.k === "category");
  const canonicalKeys = new Set(exact.map((entry) => `${entry.d}\u0000${entry.n}`));
  const routableCategories = categories.filter((entry) => canonicalKeys.has(`${entry.d}\u0000${entry.n}`));
  const withoutCanonicalSubject = categories.filter((entry) => !canonicalKeys.has(`${entry.d}\u0000${entry.n}`));
  const mapped = [...exact, ...routableCategories];
  const failures = [];

  assert.equal(exact.length, 132);
  assert.equal(routableCategories.length, 72);
  assert.equal(mapped.length, 204);
  assert.equal(withoutCanonicalSubject.length, 133);
  for (const entry of mapped) {
    const canonical = entry.k === "exact"
      ? entry
      : exact.find((candidate) => candidate.d === entry.d && candidate.n === entry.n);
    assert.ok(canonical);
    const route = api.routes.find((candidate) =>
      candidate.sourceDiscipline === canonical.d
      && candidate.qcNumber === canonical.n
      && candidate.canonicalLabel === canonical.s
    );
    if (!route) failures.push(`${entry.d} ${entry.n}: rota pública ausente`);
  }
  assert.deepEqual(failures, []);
});

test("V336 preserva subject_id real e rota canônica anteriormente confirmada", () => {
  const item = { discipline: "DIREITO AGRÁRIO", subject: "Teoria geral do Direito Agrário: origem, conceito e princípios" };
  const { api } = bridge(auditedRoute());
  const withId = {
    url: "https://www.qconcursos.com/questoes-de-concursos/questoes?subject_ids%5B%5D=123",
    automaticFilters: { discipline: true, subject: true, search: false }
  };
  const v333 = {
    url: "https://www.qconcursos.com/questoes-de-concursos/disciplinas/direito-direito-agrario/nocoes-fundamentais-de-direito-agrario/questoes",
    subjectIdSource: "verified-canonical-subject-route-v333",
    subjectRouteSource: "verified-canonical-subject-route-v333",
    automaticFilters: { discipline: true, subject: true, search: false }
  };

  assert.equal(api.repairRoute(withId, item), withId);
  assert.equal(api.repairRoute(v333, item), v333);
});

test("V336 é carregada depois da V335 e protegida pelo cache nas cópias publicadas", () => {
  const bootstrap = fs.readFileSync("bootstrap-integrity-loader-v258-core.js", "utf8");
  assert.ok(bootstrap.indexOf("qconcursos-native-subject-v336.js") > bootstrap.indexOf("qconcursos-route-safety-v335.js"));
  assert.equal(bootstrap, fs.readFileSync("docs/bootstrap-integrity-loader-v258-core.js", "utf8"));
  assert.equal(v336, fs.readFileSync("docs/qconcursos-native-subject-v336.js", "utf8"));

  for (const file of [
    "service-worker.js", "service-worker-v168.js", "service-worker-v169.js", "service-worker-v332.js",
    "docs/service-worker.js", "docs/service-worker-v168.js", "docs/service-worker-v169.js", "docs/service-worker-v332.js"
  ]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /20260814-qconcursos-assunto-nativo-v336/);
    assert.match(worker, /qconcursos-native-subject-v336\.js/);
    assert.match(worker, /qconcursos-filter-v336/);
  }

  for (const file of ["index.html", "docs/index.html"]) {
    assert.match(fs.readFileSync(file, "utf8"), /bootstrap-integrity-loader-v258\.js\?v=20260814-qconcursos-assunto-nativo-v336/);
  }
});
