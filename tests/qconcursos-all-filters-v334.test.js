const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const v333 = fs.readFileSync("qconcursos-filter-route-v333.js", "utf8");
const v334 = fs.readFileSync("qconcursos-all-filters-v334.js", "utf8");

function catalog() {
  const context = {};
  vm.runInNewContext(fs.readFileSync("pcpr-pcma-2026-catalog.js", "utf8"), context);
  return context.PCPR_PCMA_2026_CATALOG;
}

function bridge() {
  return new Function(`
    let buildQconcursosFilterRoute = (_item = {}) => ({
      url: "https://www.qconcursos.com/questoes-de-concursos/questoes?job_ids%5B%5D=169&examining_board_ids%5B%5D=2&publication_year%5B%5D=2026&publication_year%5B%5D=2025&exclude_nullified=true&exclude_outdated=true&sort=relevance&q=" + encodeURIComponent(_item.subject || ""),
      discipline: _item.discipline || "",
      subject: _item.subject || "",
      searchTerm: _item.subject || "",
      automaticFilters: { cargo: true, discipline: false, board: true, period: true, subject: false, search: true, sort: true }
    });
    const renderQconcursosFilterRoute = () => {};
    ${v333}
    ${v334}
    return { build: buildQconcursosFilterRoute, api: globalThis.__aldusQconcursosAllFiltersV334 };
  `)();
}

test("V334 cobre todas as 17 disciplinas e os 430 itens atuais do catálogo PCPR/PCMA", () => {
  const items = catalog().newItems;
  const { build, api } = bridge();
  const disciplines = new Set(items.map((item) => item.discipline));
  const failures = [];

  assert.equal(items.length, 430);
  assert.equal(disciplines.size, 17);

  for (const item of items) {
    const resolution = api.resolveDisciplineRoute(item);
    const route = build(item, "Cebraspe");
    const url = new URL(route.url);
    const nativeSubject = route.automaticFilters.subject === true;

    if (!resolution.slug) failures.push(`${item.discipline} — ${item.subject}: disciplina sem rota`);
    if (!url.pathname.startsWith(`/questoes-de-concursos/disciplinas/${resolution.slug}/`)) {
      failures.push(`${item.discipline} — ${item.subject}: caminho ${url.pathname}`);
    }
    if (route.automaticFilters.discipline !== true) {
      failures.push(`${item.discipline} — ${item.subject}: disciplina não aplicada`);
    }
    if (!nativeSubject && !url.searchParams.get("q")) {
      failures.push(`${item.discipline} — ${item.subject}: assunto ausente`);
    }

    assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
    assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
    assert.deepEqual(url.searchParams.getAll("publication_year[]"), ["2026", "2025"]);
    assert.equal(url.searchParams.get("exclude_nullified"), "true");
    assert.equal(url.searchParams.get("exclude_outdated"), "true");
    assert.equal(url.searchParams.get("sort"), "relevance");
  }

  assert.deepEqual(failures, []);
});

test("V334 cobre os 940 vínculos oficiais dos dois editais", () => {
  const mappings = catalog().mappings;
  const { build, api } = bridge();
  const failures = [];

  assert.equal(mappings.length, 940);
  for (const mapping of mappings) {
    const item = {
      discipline: mapping.discipline,
      subject: mapping.topic,
      subtopic: mapping.subtopic,
      reference: mapping.reference
    };
    const resolution = api.resolveDisciplineRoute(item);
    const route = build(item, "Cebraspe");
    const url = new URL(route.url);
    if (!resolution.slug || route.automaticFilters.discipline !== true) {
      failures.push(`${mapping.id}: disciplina não aplicada`);
    }
    if (!url.pathname.startsWith(`/questoes-de-concursos/disciplinas/${resolution.slug}/`)) {
      failures.push(`${mapping.id}: caminho ${url.pathname}`);
    }
    if (route.automaticFilters.subject !== true && !url.searchParams.get("q")) {
      failures.push(`${mapping.id}: assunto ausente`);
    }
  }
  assert.deepEqual(failures, []);
});

test("V334 resolve corretamente as disciplinas compostas do catálogo", () => {
  const { api } = bridge();

  assert.equal(api.resolveDisciplineRoute({
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Governança pública"
  }).slug, "administracao-administracao-publica");
  assert.equal(api.resolveDisciplineRoute({
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Órgãos públicos"
  }).slug, "direito-direito-administrativo");
  assert.equal(api.resolveDisciplineRoute({
    discipline: "CIÊNCIAS FORENSES",
    subject: "Criminologia Crítica"
  }).slug, "direito-criminologia");
  assert.equal(api.resolveDisciplineRoute({
    discipline: "CIÊNCIAS FORENSES",
    subject: "Documentoscopia e Grafoscopia"
  }).slug, "criminalistica-criminalistica");
  assert.equal(api.resolveDisciplineRoute({
    discipline: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL",
    subject: "Lei Orgânica da Polícia Civil do Paraná"
  }).slug, "direito-legislacao-estadual");
  assert.equal(api.resolveDisciplineRoute({
    discipline: "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL",
    subject: "Lei de delitos informáticos"
  }).slug, "direito-direito-penal");
});

test("V334 não envia numeração do edital como palavra-chave e preserva assunto nativo confirmado", () => {
  const { build, api } = bridge();
  const item = {
    discipline: "DIREITO AGRÁRIO",
    subject: "Teoria geral do Direito Agrário: origem, conceito e princípios",
    subtopic: "1"
  };
  assert.equal(api.cleanSearchTerm(item), item.subject);

  const route = build(item, "Cebraspe");
  const url = new URL(route.url);
  assert.equal(url.pathname, "/questoes-de-concursos/disciplinas/direito-direito-agrario/nocoes-fundamentais-de-direito-agrario/questoes");
  assert.equal(url.searchParams.get("q"), null);
  assert.equal(route.automaticFilters.discipline, true);
  assert.equal(route.automaticFilters.subject, true);
});

test("V334 não fabrica uma disciplina desconhecida", () => {
  const { api } = bridge();
  const original = {
    url: "https://www.qconcursos.com/questoes-de-concursos/questoes?q=Tema",
    automaticFilters: { discipline: false, subject: false, search: true }
  };
  const repaired = api.repairRoute(original, { discipline: "Disciplina inexistente", subject: "Tema" });
  assert.equal(repaired, original);
});

test("V334 permanece carregada depois da V333 sob a proteção de rota da V335", () => {
  const bootstrap = fs.readFileSync("bootstrap-integrity-loader-v258-core.js", "utf8");
  const v333Index = bootstrap.indexOf("qconcursos-filter-route-v333.js");
  const v334Index = bootstrap.indexOf("qconcursos-all-filters-v334.js");
  assert.ok(v333Index >= 0);
  assert.ok(v334Index > v333Index);
  assert.equal(bootstrap, fs.readFileSync("docs/bootstrap-integrity-loader-v258-core.js", "utf8"));
  assert.equal(v334, fs.readFileSync("docs/qconcursos-all-filters-v334.js", "utf8"));

  for (const file of [
    "service-worker.js", "service-worker-v168.js", "service-worker-v169.js", "service-worker-v332.js",
    "docs/service-worker.js", "docs/service-worker-v168.js", "docs/service-worker-v169.js", "docs/service-worker-v332.js"
  ]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /20260814-qconcursos-rota-segura-v335/);
    assert.match(worker, /qconcursos-all-filters-v334\.js/);
    assert.match(worker, /qconcursos-filter-v335/);
  }

  for (const file of ["index.html", "docs/index.html"]) {
    assert.match(fs.readFileSync(file, "utf8"), /bootstrap-integrity-loader-v258\.js\?v=20260814-qconcursos-rota-segura-v335/);
  }
});
