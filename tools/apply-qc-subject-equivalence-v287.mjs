import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260809-qconcursos-assunto-equivalente-v287";
const MODULE = "qconcursos-subject-equivalence-v287.js";
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

  // IDs abaixo são usados apenas quando a equivalência entre o item do edital
  // e o assunto do QConcursos foi confirmada. O número hierárquico do QC não
  // é tratado como subject_id.
  const VERIFIED_EQUIVALENCES = Object.freeze([
    Object.freeze({
      discipline: "direito constitucional",
      aliases: Object.freeze([
        "direitos individuais e coletivos",
        "direitos e deveres individuais e coletivos",
        "dos direitos e deveres individuais e coletivos",
        "direitos individuais"
      ]),
      subjectIds: Object.freeze(["16321"]),
      qcLabel: "Direitos Individuais"
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

  function semanticMatch(item = {}, entry) {
    const discipline = normalize(item.discipline || item.disciplina);
    if (!entry || discipline !== entry.discipline) return false;
    return itemTexts(item).some((text) => entry.aliases.some((alias) =>
      text === alias || text.includes(alias) || alias.includes(text)
    ));
  }

  function verifiedEquivalence(item = {}) {
    return VERIFIED_EQUIVALENCES.find((entry) => semanticMatch(item, entry)) || null;
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV287(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const equivalence = verifiedEquivalence(item);
    if (!equivalence) return route;

    const url = new URL(route.url);
    url.pathname = "/questoes-de-concursos/questoes";
    url.searchParams.delete("q");
    url.searchParams.delete("subject_ids[]");
    equivalence.subjectIds.forEach((id) => url.searchParams.append("subject_ids[]", id));

    return {
      ...route,
      url: url.toString(),
      subjectIds: [...equivalence.subjectIds],
      subjectIdSource: "verified-semantic-equivalence",
      qcSubjectLabel: equivalence.qcLabel,
      subjectCoherence: "confirmed-equivalence",
      automaticFilters: {
        ...route.automaticFilters,
        subject: true,
        search: false
      }
    };
  };

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectEquivalenceV287", {
    value: Object.freeze({ VERSION, verifiedEquivalence, equivalences: VERIFIED_EQUIVALENCES }),
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
  '    ["qconcursos-subject-coherence-v286.js", "/* Aldus runtime source: qconcursos-subject-coherence-v286.js */"]\n  ];',
  `    ["qconcursos-subject-coherence-v286.js", "/* Aldus runtime source: qconcursos-subject-coherence-v286.js */"],\n    [${JSON.stringify(MODULE)}, ${JSON.stringify(MARKER)}]\n  ];`,
  "módulo V287 na lista de módulos finais"
);
build = replaceOnce(
  build,
  '    "/* Aldus runtime source: qconcursos-subject-coherence-v286.js */"\n  ];',
  `    "/* Aldus runtime source: qconcursos-subject-coherence-v286.js */",\n    ${JSON.stringify(MARKER)}\n  ];`,
  "marcador obrigatório V287"
);
write("build-bundles.mjs", build);

const testFile = `const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const v285 = fs.readFileSync("qconcursos-subject-filter-v285.js", "utf8");
const v286 = fs.readFileSync("qconcursos-subject-coherence-v286.js", "utf8");
const v287 = fs.readFileSync("qconcursos-subject-equivalence-v287.js", "utf8");

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(\`${'${script.slice(catalogStart, catalogEnd)}'}\\n${'${script.slice(routeStart, routeEnd)}'}\\n${'${v285}'}\\n${'${v286}'}\\n${'${v287}'}; return { buildQconcursosFilterRoute, bridge: globalThis.__aldusQconcursosSubjectEquivalenceV287 };\`)();
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

test("V287 não inventa subject_id para assunto ainda sem equivalência confirmada", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Constitucional",
    subject: "Assunto constitucional sem equivalência confirmada"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Assunto constitucional sem equivalência confirmada");
});

test("V287 preserva a rota canônica confirmada da V286 para Direito Administrativo", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.match(url.pathname, /conceitos-iniciais-de-direito-administrativo/);
  assert.equal(url.searchParams.get("q"), null);
});
`;
write("tests/qconcursos-subject-equivalence-v287.test.js", testFile);

let bootstrap = read("bootstrap-integrity-loader-v258-core.js");
bootstrap = bootstrap.replace(
  /\["aldusAppBundleScript",\s*"app-v\d+\.js\?v=[^"]+"\]/,
  `["aldusAppBundleScript", "app-v287.js?v=${VERSION}"]`
);
if (!bootstrap.includes(`app-v287.js?v=${VERSION}`)) throw new Error("Não foi possível sincronizar o bootstrap para a V287.");
write("bootstrap-integrity-loader-v258-core.js", bootstrap);
fs.copyFileSync(path.join(root, "bootstrap-integrity-loader-v258-core.js"), path.join(root, "docs", "bootstrap-integrity-loader-v258-core.js"));

console.log(`Equivalência de assunto QC ${VERSION} aplicada.`);
