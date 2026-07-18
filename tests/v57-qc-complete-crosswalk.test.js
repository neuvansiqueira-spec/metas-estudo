const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const crosswalkSource = fs.readFileSync("qconcursos-crosswalk.js", "utf8");
const context = { window: {} };
vm.runInNewContext(crosswalkSource, context);
const crosswalk = context.window.QCONCURSOS_AUDITED_CROSSWALK;

function entry(discipline, subject) {
  return crosswalk.find((item) => item.d === discipline && item.s === subject);
}

function catalogApi() {
  const start = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const end = script.indexOf("function optionsForItems", start);
  return new Function("window", `${script.slice(start, end)}; return { qconcursosNumberResolution, questionItemOptionLabel };`)(context.window);
}

test("auditoria cobre os 379 itens do edital sem copiar o backup para o repositório", () => {
  assert.equal(crosswalk.length, 379);
  const counts = crosswalk.reduce((result, item) => {
    result[item.k] = (result[item.k] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, { category: 205, exact: 132, unavailable: 42 });
  assert.equal(fs.existsSync("backup-metas-estudo-2026-07-18-16-03.json"), false);
});

test("disciplinas centrais exibem números oficiais confirmados", () => {
  assert.equal(entry("DIREITO ADMINISTRATIVO", "Princípios da Administração Pública").n, "2.2");
  assert.equal(entry("DIREITO PROCESSUAL PENAL", "Inquérito Policial").n, "5");
  assert.equal(entry("LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL", "Lei nº 11.343/2006").n, "40.13");
  assert.equal(entry("MEDICINA LEGAL", "Tanatologia Forense").n, "6");
  assert.equal(entry("LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL", "Art. 144").n, "21.3");
});

test("item amplo usa categoria e item sem código próprio fica explicitamente revisado", () => {
  const api = catalogApi();
  const broad = entry("DIREITO ADMINISTRATIVO", "Administração Pública");
  assert.equal(broad.n, "2 / 3");
  assert.equal(broad.k, "category");
  assert.deepEqual(api.qconcursosNumberResolution({ discipline: broad.d, topic: broad.t, subject: broad.s }), { number: "2 / 3", source: "catalog-category" });

  const unavailable = entry("PEÇA PARA DELEGADO DE POLÍCIA CIVIL", "Representação por Prisão Temporária");
  assert.equal(unavailable.k, "unavailable");
  assert.deepEqual(api.qconcursosNumberResolution({ discipline: unavailable.d, topic: unavailable.t, subject: unavailable.s }), { number: "", source: "reviewed-unavailable" });
  assert.match(api.questionItemOptionLabel({ discipline: unavailable.d, topic: unavailable.t, subject: unavailable.s }, true), /^\[QC sem código próprio\]/);
});

test("manual continua tendo prioridade sobre a auditoria", () => {
  const item = entry("DIREITO ADMINISTRATIVO", "Princípios da Administração Pública");
  assert.deepEqual(catalogApi().qconcursosNumberResolution({ discipline: item.d, topic: item.t, subject: item.s, qconcursosNumber: "8.8" }), { number: "8.8", source: "saved" });
});

test("auditoria v57 permanece sincronizada após versões posteriores", () => {
  assert.match(version, /revisao-visual-global-v58$/);
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-cruzamento-qc-completo-v57"/);
  assert.match(worker, /"qconcursos-crosswalk\.js"/);
  assert.match(html, new RegExp(`qconcursos-crosswalk\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`Versão: ${version}`));
  for (const file of ["index.html", "script.js", "service-worker.js", "qconcursos-crosswalk.js"]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
