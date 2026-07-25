const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const files = {
  rootPatch: path.join(rootDir, "analytics-single-arrow-v150.js"),
  docsPatch: path.join(rootDir, "docs", "analytics-single-arrow-v150.js"),
  rootDaily: path.join(rootDir, "daily-collapsibles-closed-v140.js"),
  docsDaily: path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js"),
  rootCentral: path.join(rootDir, "central-goals-real-time-v124.js"),
  docsCentral: path.join(rootDir, "docs", "central-goals-real-time-v124.js")
};

const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos JavaScript alterados possuem sintaxe válida", () => {
  Object.values(files).forEach((file) => execFileSync(process.execPath, ["--check", file]));
});

test("raiz e docs permanecem byte a byte iguais", () => {
  assert.equal(read(files.rootPatch), read(files.docsPatch));
  assert.equal(read(files.rootDaily), read(files.docsDaily));
  assert.equal(read(files.rootCentral), read(files.docsCentral));
});

test("marcador nativo e pseudo-setas legadas são neutralizados somente nos filtros", () => {
  const source = read(files.rootPatch);
  assert.match(source, /details\.analytics-filters-section > summary/);
  assert.match(source, /::-webkit-details-marker/);
  assert.match(source, /::marker/);
  assert.match(source, /::before/);
  assert.match(source, /::after/);
  assert.match(source, /content: none !important/);
  assert.match(source, /display: none !important/);
});

test("seta customizada única permanece visível", () => {
  const source = read(files.rootPatch);
  assert.match(source, /> \.analytics-collapsible-chevron-v145/);
  assert.match(source, /display: inline-block !important/);
  assert.match(source, /visibility: visible !important/);
});

test("v150 é carregada após v149 e possui cache-buster novo", () => {
  const daily = read(files.rootDaily);
  const central = read(files.rootCentral);
  assert.ok(daily.indexOf("analytics-header-arrow-v149.js") < daily.indexOf("analytics-single-arrow-v150.js"));
  assert.match(daily, /analytics-single-arrow-v150\.js\?v=20260725-analise-estrategica-seta-unica-v150/);
  assert.match(central, /analytics-single-arrow-v150\.js\?v=20260725-analise-estrategica-seta-unica-v150/);
  assert.match(central, /daily-collapsibles-closed-v140\.js\?v=20260725-analise-estrategica-seta-unica-v150/);
});

test("correção não acessa dados, armazenamento, sincronização ou rede", () => {
  const source = `${read(files.rootPatch)}\n${read(files.rootDaily)}\n${read(files.rootCentral)}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "saveData", "syncIntegral", "fetch(", "XMLHttpRequest", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});
