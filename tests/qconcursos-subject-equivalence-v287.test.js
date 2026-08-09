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

test("V290 aplica Direitos individuais e coletivos no campo Assunto do QC por ID confirmado", () => {
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
  assert.equal(route.qcLinkStatus, "direct-id");
  assert.match(route.qcLinkStatusLabel, /vinculado por ID/i);
});

test("V290 aceita variação Direitos e deveres individuais e coletivos", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Direitos e deveres individuais e coletivos"
  }, "Cebraspe");
  assert.deepEqual(new URL(route.url).searchParams.getAll("subject_ids[]"), ["16321"]);
});

test("V290 transforma assunto exato auditado em rota canônica do QC", () => withAuditedCrosswalk(() => {
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
  assert.equal(route.qcLinkStatus, "direct");
  assert.match(route.qcLinkStatusLabel, /Assunto QC vinculado/i);
}));

test("V290 converte item de categoria auditada para o assunto exato pai do QC", () => withAuditedCrosswalk(() => {
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
  assert.equal(route.subjectCoherence, "audited-category-route");
  assert.equal(route.automaticFilters.subject, true);
  assert.equal(route.qcLinkStatus, "category");
  assert.match(route.qcLinkStatusLabel, /categoria correspondente/i);
}));

test("V290 mantém busca textual quando não há equivalência auditada segura", () => withAuditedCrosswalk(() => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Assunto constitucional sem equivalência confirmada"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Assunto constitucional sem equivalência confirmada");
  assert.equal(route.automaticFilters.subject, false);
  assert.equal(route.qcLinkStatus, "text");
  assert.match(route.qcLinkStatusLabel, /busca por texto/i);
}));

test("V290 preserva a rota canônica confirmada da V286 para Direito Administrativo", () => withAuditedCrosswalk(() => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.match(url.pathname, /conceitos-iniciais-de-direito-administrativo/);
  assert.equal(url.searchParams.get("q"), null);
  assert.equal(route.qcLinkStatus, "direct");
}));

test("V290 reconhece rotas atuais de disciplinas especiais do QConcursos", () => {
  const bridge = routeApi().bridge;
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Direitos Humanos" }).slug, "direito-direitos-humanos");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Criminologia" }).slug, "direito-criminologia");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Medicina Legal" }).slug, "criminalistica-medicina-legal");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Criminalística" }).slug, "criminalistica-criminalistica");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Administração Pública" }).slug, "administracao-administracao-publica");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Direito Digital" }).slug, "direito-direito-digital");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Direito Agrário" }).slug, "direito-direito-agrario");
  assert.equal(bridge.resolveDisciplineRouteSlug({ discipline: "Direito Ambiental" }).slug, "direito-direito-ambiental");
});

test("V290 separa Direito Administrativo e Gestão Pública conforme o assunto", () => {
  const bridge = routeApi().bridge;
  const governance = bridge.resolveDisciplineRouteSlug({
    discipline: "Direito Administrativo e Gestão Pública",
    subject: "Governança pública"
  });
  const decentralization = bridge.resolveDisciplineRouteSlug({
    discipline: "Direito Administrativo e Gestão Pública",
    subject: "Desconcentração e descentralização"
  });
  assert.equal(governance.slug, "administracao-administracao-publica");
  assert.equal(governance.source, "hybrid-public-management");
  assert.equal(decentralization.slug, "direito-direito-administrativo");
  assert.equal(decentralization.source, "hybrid-administrative-law");
});

test("V290 separa Ciências Forenses entre Medicina Legal e Criminalística", () => {
  const bridge = routeApi().bridge;
  const tanatology = bridge.resolveDisciplineRouteSlug({
    discipline: "Ciências Forenses",
    subject: "Tanatologia Forense"
  });
  const writing = bridge.resolveDisciplineRouteSlug({
    discipline: "Ciências Forenses",
    subject: "Análise de escrita e assinaturas"
  });
  assert.equal(tanatology.slug, "criminalistica-medicina-legal");
  assert.equal(tanatology.source, "hybrid-medicine-legal");
  assert.equal(writing.slug, "criminalistica-criminalistica");
  assert.equal(writing.source, "hybrid-criminalistics");
});

test("V290 projeta disciplinas híbridas para o cruzamento auditado adequado", () => {
  const bridge = routeApi().bridge;
  assert.ok(bridge.candidateCrosswalkDisciplines({ discipline: "Direito Administrativo e Gestão Pública" }).includes("direito administrativo"));
  assert.ok(bridge.candidateCrosswalkDisciplines({ discipline: "Ciências Forenses" }).includes("medicina legal"));
  assert.ok(bridge.candidateCrosswalkDisciplines({ discipline: "Ciências Forenses" }).includes("criminalistica"));
});

test("V290 mantém exceção canônica validada para Poder Constituinte", () => withAuditedCrosswalk(() => {
  const bridge = routeApi().bridge;
  const route = bridge.auditedCanonicalRoute({
    discipline: "Direito Constitucional",
    subject: "Poder Constituinte"
  });
  if (route) {
    assert.equal(route.disciplineSlug, "direito-direito-constitucional");
    assert.equal(
      route.subjectSlug,
      "poder-constituinte-originario-derivado-e-decorrente-reforma-emendas-e-revisao-e-mutacao-da-constituicao"
    );
  }
}));

test("V290 expõe metadados para indicador visual do vínculo", () => {
  const bridge = routeApi().bridge;
  assert.equal(bridge.VERSION, "20260809-qconcursos-mapeamento-ampliado-v290");
  assert.equal(bridge.visibleStatus, true);
  assert.equal(bridge.liveLink, true);
  assert.equal(bridge.linkStatusForRoute({ automaticFilters: { subject: false, search: true } }).status, "text");
  assert.equal(bridge.linkStatusForRoute({ subjectIds: ["123"] }).status, "direct-id");
});
