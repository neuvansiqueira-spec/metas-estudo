import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260809-qconcursos-assunto-coerente-v286";
const MODULE = "qconcursos-subject-coherence-v286.js";
const MARKER = `/* Aldus runtime source: ${MODULE} */`;

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content);
}

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Trecho não encontrado para ${label}.`);
  return source.replace(before, after);
}

const runtime = `(() => {
  "use strict";

  const VERSION = ${JSON.stringify(VERSION)};

  const VERIFIED_SUBJECT_ROUTES = Object.freeze([
    Object.freeze({
      discipline: "direito administrativo",
      aliases: Object.freeze([
        "conceito fontes e principios do direito administrativo",
        "conceitos fontes e principios do direito administrativo",
        "conceito fontes e principios de direito administrativo",
        "conceitos iniciais de direito administrativo historico funcoes de estado e fontes",
        "fontes do direito administrativo"
      ]),
      label: "Conceitos iniciais de Direito Administrativo - Histórico, Funções de Estado e Fontes",
      pathname: "/questoes-de-concursos/disciplinas/direito-direito-administrativo/conceitos-iniciais-de-direito-administrativo-historico-funcoes-de-estado-e-fontes/questoes"
    })
  ]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function itemTexts(item = {}) {
    return [
      item.subject,
      item.assunto,
      item.topic,
      item.topico,
      item.subtopic,
      item.subtema
    ].map(normalize).filter(Boolean);
  }

  function aliasesMatch(item = {}, entry) {
    const discipline = normalize(item.discipline || item.disciplina);
    if (!entry || entry.discipline !== discipline) return false;
    return itemTexts(item).some((text) => entry.aliases.some((alias) =>
      text === alias || text.includes(alias) || alias.includes(text)
    ));
  }

  function verifiedRoute(item = {}) {
    return VERIFIED_SUBJECT_ROUTES.find((entry) => aliasesMatch(item, entry)) || null;
  }

  function hasConfirmedExplicitSubjectId(item = {}) {
    return item.qconcursosSubjectIdConfirmed === true
      || item.qcSubjectIdConfirmed === true
      || item.subjectIdQcConfirmed === true
      || item.subject_id_qc_confirmed === true;
  }

  function fallbackSearchTerm(item = {}, route = {}) {
    const explicit = String(route.searchTerm || "").trim();
    if (explicit) return explicit;
    const subject = String(item.subject || item.assunto || item.topic || item.topico || "").trim();
    const subtopic = String(item.subtopic || item.subtema || "").trim();
    return [subject, subtopic].filter(Boolean).join(" — ");
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV286(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const canonicalRoute = verifiedRoute(item);
    const url = new URL(route.url);

    if (canonicalRoute) {
      url.pathname = canonicalRoute.pathname;
      url.searchParams.delete("subject_ids[]");
      url.searchParams.delete("q");
      return {
        ...route,
        url: url.toString(),
        subjectIds: [],
        subjectIdSource: "canonical-qc-route",
        qcSubjectLabel: canonicalRoute.label,
        subjectCoherence: "confirmed",
        automaticFilters: {
          ...route.automaticFilters,
          subject: true,
          search: false
        }
      };
    }

    if (route.subjectIdSource === "saved" && hasConfirmedExplicitSubjectId(item)) {
      return {
        ...route,
        subjectCoherence: "confirmed-explicit-id",
        automaticFilters: {
          ...route.automaticFilters,
          subject: true,
          search: false
        }
      };
    }

    // Regra crítica: número hierárquico do QC ou ID inferido nunca pode, sozinho,
    // selecionar um assunto diferente do que está ativo no filtro do Aldus Meta.
    url.searchParams.delete("subject_ids[]");
    const searchTerm = fallbackSearchTerm(item, route);
    if (searchTerm) url.searchParams.set("q", searchTerm);
    else url.searchParams.delete("q");

    return {
      ...route,
      url: url.toString(),
      searchTerm,
      subjectIds: [],
      subjectIdSource: "coherence-text-fallback",
      qcSubjectLabel: route.subject,
      subjectCoherence: "text-fallback",
      automaticFilters: {
        ...route.automaticFilters,
        subject: false,
        search: Boolean(searchTerm)
      }
    };
  };

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectCoherenceV286", {
    value: Object.freeze({ VERSION, verifiedRoute, verifiedRoutes: VERIFIED_SUBJECT_ROUTES }),
    configurable: true
  });
})();
`;
write(MODULE, runtime);

const packageJson = JSON.parse(read("package.json"));
packageJson.version = VERSION;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);

if (fs.existsSync(path.join(root, "package-lock.json"))) {
  const lock = JSON.parse(read("package-lock.json"));
  lock.version = VERSION;
  if (lock.packages?.[""]) lock.packages[""].version = VERSION;
  write("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
}

let build = read("build-bundles.mjs");
build = replaceOnce(
  build,
  '    ["qconcursos-subject-filter-v285.js", "/* Aldus runtime source: qconcursos-subject-filter-v285.js */"]\n  ];',
  `    ["qconcursos-subject-filter-v285.js", "/* Aldus runtime source: qconcursos-subject-filter-v285.js */"],\n    [${JSON.stringify(MODULE)}, ${JSON.stringify(MARKER)}]\n  ];`,
  "módulo V286 na lista de módulos finais"
);
build = replaceOnce(
  build,
  '    "/* Aldus runtime source: qconcursos-subject-filter-v285.js */"\n  ];',
  `    "/* Aldus runtime source: qconcursos-subject-filter-v285.js */",\n    ${JSON.stringify(MARKER)}\n  ];`,
  "marcador obrigatório V286"
);
write("build-bundles.mjs", build);

const testFile = `const test = require("node:test");
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
  return new Function(\`${'${script.slice(catalogStart, catalogEnd)}'}\\n${'${script.slice(routeStart, routeEnd)}'}\\n${'${v285}'}\\n${'${v286}'}; return { buildQconcursosFilterRoute, guard: globalThis.__aldusQconcursosSubjectCoherenceV286 };\`)();
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
`;
write("tests/qconcursos-subject-coherence-v286.test.js", testFile);

let bootstrap = read("bootstrap-integrity-loader-v258-core.js");
bootstrap = bootstrap.replace(
  /\["aldusAppBundleScript",\s*"app-v\d+\.js\?v=[^"]+"\]/,
  `["aldusAppBundleScript", "app-v286.js?v=${VERSION}"]`
);
if (!bootstrap.includes(`app-v286.js?v=${VERSION}`)) throw new Error("Não foi possível sincronizar o bootstrap para a V286.");
write("bootstrap-integrity-loader-v258-core.js", bootstrap);
fs.copyFileSync(path.join(root, "bootstrap-integrity-loader-v258-core.js"), path.join(root, "docs", "bootstrap-integrity-loader-v258-core.js"));

console.log(`Correção de coerência ${VERSION} aplicada.`);
