import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260809-qconcursos-assunto-automatico-v285";
const MODULE = "qconcursos-subject-filter-v285.js";
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

  const VERIFIED_SUBJECTS = Object.freeze([
    Object.freeze({
      discipline: "direito administrativo",
      qcNumber: "1",
      aliases: Object.freeze([
        "conceito fontes e principios do direito administrativo",
        "conceitos fontes e principios do direito administrativo",
        "conceito fontes e principios de direito administrativo",
        "conceitos iniciais de direito administrativo historico funcoes de estado e fontes",
        "fontes do direito administrativo"
      ]),
      ids: Object.freeze(["15940"]),
      label: "Conceitos iniciais de Direito Administrativo - Histórico, Funções de Estado e Fontes"
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

  function numericIds(value) {
    const values = Array.isArray(value) ? value : [value];
    const output = [];
    values.flatMap((entry) => String(entry ?? "").split(/[;,|\\s]+/)).forEach((entry) => {
      const id = entry.trim();
      if (/^\\d+$/.test(id) && !output.includes(id)) output.push(id);
    });
    return output;
  }

  function idsFromStoredUrl(item = {}) {
    const stored = item.qconcursosUrl || item.qcUrl || item.qconcursosFilterUrl || item.qcFilterUrl || "";
    if (!stored) return [];
    try {
      return numericIds(new URL(stored).searchParams.getAll("subject_ids[]"));
    } catch {
      return [];
    }
  }

  function explicitSubjectIds(item = {}) {
    return numericIds([
      ...(Array.isArray(item.qconcursosSubjectIds) ? item.qconcursosSubjectIds : [item.qconcursosSubjectIds]),
      ...(Array.isArray(item.qcSubjectIds) ? item.qcSubjectIds : [item.qcSubjectIds]),
      item.qconcursosSubjectId,
      item.qcSubjectId,
      item.subjectIdQc,
      item.subject_id_qc,
      ...idsFromStoredUrl(item)
    ]);
  }

  function verifiedSubject(item = {}) {
    const discipline = normalize(item.discipline || item.disciplina);
    const qcNumber = String(item.qconcursosNumber || item.qcSubjectNumber || item.qcNumber || "").trim();
    const texts = [
      item.subject,
      item.assunto,
      item.topic,
      item.topico,
      item.subtopic,
      item.subtema
    ].map(normalize).filter(Boolean);

    return VERIFIED_SUBJECTS.find((entry) => {
      if (entry.discipline !== discipline) return false;
      if (qcNumber && entry.qcNumber === qcNumber) return true;
      return texts.some((text) => entry.aliases.some((alias) => text === alias || text.includes(alias) || alias.includes(text)));
    }) || null;
  }

  function resolveSubject(item = {}) {
    const explicit = explicitSubjectIds(item);
    if (explicit.length) return { ids: explicit, source: "saved", label: "" };
    const verified = verifiedSubject(item);
    if (verified) return { ids: [...verified.ids], source: "verified-map", label: verified.label };
    return { ids: [], source: "text-fallback", label: "" };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV285(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const resolution = resolveSubject(item);
    if (!resolution.ids.length) {
      return {
        ...route,
        subjectIds: [],
        subjectIdSource: resolution.source,
        automaticFilters: { ...route.automaticFilters, subject: false }
      };
    }

    const url = new URL(route.url);
    url.searchParams.delete("q");
    url.searchParams.delete("subject_ids[]");
    resolution.ids.forEach((id) => url.searchParams.append("subject_ids[]", id));

    return {
      ...route,
      url: url.toString(),
      subjectIds: [...resolution.ids],
      subjectIdSource: resolution.source,
      qcSubjectLabel: resolution.label || route.subject,
      automaticFilters: {
        ...route.automaticFilters,
        subject: true,
        search: false
      }
    };
  };

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectFilterV285", {
    value: Object.freeze({ VERSION, resolveSubject, verifiedSubjects: VERIFIED_SUBJECTS }),
    configurable: true
  });
})();
`;
write(MODULE, runtime);

const packageJson = JSON.parse(read("package.json"));
packageJson.version = VERSION;
write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);

let build = read("build-bundles.mjs");
build = replaceOnce(
  build,
  '    ["question-history-tone-v216.js"]\n  ];',
  `    ["question-history-tone-v216.js"],\n    [${JSON.stringify(MODULE)}, ${JSON.stringify(MARKER)}]\n  ];`,
  "módulo V285 na lista de módulos finais"
);
build = replaceOnce(
  build,
  '    "/* Aldus source: question-bank-filter-open-v226.js */"\n  ];',
  `    "/* Aldus source: question-bank-filter-open-v226.js */",\n    ${JSON.stringify(MARKER)}\n  ];`,
  "marcador obrigatório V285"
);
write("build-bundles.mjs", build);

const testFile = `const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const patch = fs.readFileSync("qconcursos-subject-filter-v285.js", "utf8");

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(\`${'${script.slice(catalogStart, catalogEnd)}'}\\n${'${script.slice(routeStart, routeEnd)}'}\\n${'${patch}'}; return { buildQconcursosFilterRoute, subjectPatch: globalThis.__aldusQconcursosSubjectFilterV285 };\`)();
}

test("V285 envia o assunto inicial de Direito Administrativo como subject_ids do QC", () => {
  const api = routeApi();
  const route = api.buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Conceito, fontes e princípios do Direito Administrativo",
    qconcursosNumber: "1"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), ["15940"]);
  assert.equal(url.searchParams.get("q"), null);
  assert.deepEqual(url.searchParams.getAll("discipline_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("examining_board_ids[]"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("job_ids[]"), ["169"]);
  assert.equal(url.searchParams.getAll("publication_year[]").length, 5);
  assert.equal(route.automaticFilters.subject, true);
  assert.equal(route.automaticFilters.search, false);
});

test("V285 preserva busca textual quando o subject_id ainda não foi confirmado", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Assunto ainda sem ID QC confirmado"
  }, "Cebraspe");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), []);
  assert.equal(url.searchParams.get("q"), "Assunto ainda sem ID QC confirmado");
  assert.equal(route.automaticFilters.subject, false);
  assert.equal(route.automaticFilters.search, true);
});

test("V285 prioriza subject_id salvo no item do edital", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    subject: "Tema customizado",
    qconcursosSubjectId: "12345"
  }, "FGV");
  const url = new URL(route.url);
  assert.deepEqual(url.searchParams.getAll("subject_ids[]"), ["12345"]);
  assert.equal(url.searchParams.get("q"), null);
  assert.equal(route.subjectIdSource, "saved");
});
`;
write("tests/qconcursos-subject-filter-v285.test.js", testFile);

let bootstrap = read("bootstrap-integrity-loader-v258-core.js");
bootstrap = bootstrap.replace(/app-v\d+\.js\?v=20260809-qconcursos-[^\"]+v\d+/g, `app-v285.js?v=${VERSION}`);
if (!bootstrap.includes(`app-v285.js?v=${VERSION}`)) {
  bootstrap = bootstrap.replace(/\["aldusAppBundleScript",\s*"app-v\d+\.js\?v=[^"]+"\]/, `["aldusAppBundleScript", "app-v285.js?v=${VERSION}"]`);
}
if (!bootstrap.includes(`app-v285.js?v=${VERSION}`)) throw new Error("Não foi possível sincronizar o bootstrap para a V285.");
write("bootstrap-integrity-loader-v258-core.js", bootstrap);
fs.copyFileSync(path.join(root, "bootstrap-integrity-loader-v258-core.js"), path.join(root, "docs", "bootstrap-integrity-loader-v258-core.js"));

console.log(`Correção ${VERSION} aplicada.`);
