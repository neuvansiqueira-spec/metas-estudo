const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("aldus-advisor-layout-v70.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const header = fs.readFileSync("header-brand-fix.js", "utf8");

test("v70 carrega após o contrato de contraste e renova o cache", () => {
  assert.equal(version, "20260719-integracao-metas-v74");
  assert.ok(html.indexOf("aldus-advisor-layout-v70.css") > html.indexOf("aldus-component-contrast-v69.css"));
  assert.match(worker, /const CURRENT_VERSION = "20260719-integracao-metas-v74"/);
  assert.match(worker, /"20260719-contraste-componentes-v69"/);
  assert.match(worker, /"aldus-advisor-layout-v70\.css"/);
  assert.match(header, /ensureStylesheet\("aldusAdvisorLayoutV70", "aldus-advisor-layout-v70\.css"\)/);
});

test("Conselheiro impede colunas implícitas entre blocos principais", () => {
  assert.match(css, /#view-conselheiro\.app-view\.active/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /grid-auto-flow: row !important/);
  assert.match(css, /#view-conselheiro\.app-view\.active > \*/);
  assert.match(css, /grid-column: 1 \/ -1 !important/);
});

test("filtros e destino usam grades internas responsivas", () => {
  assert.match(css, /#advisorPeriodForm/);
  assert.match(css, /minmax\(190px, 1\.15fr\).*repeat\(2, minmax\(170px, 1fr\)\)/s);
  assert.match(css, /#advisorMissionForm/);
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /max-width: 1250px/);
  assert.match(css, /max-width: 900px/);
  assert.match(css, /max-width: 620px/);
});

test("raiz e publicação permanecem idênticas", () => {
  assert.equal(css, fs.readFileSync("docs/aldus-advisor-layout-v70.css", "utf8"));
  assert.equal(html, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(header, fs.readFileSync("docs/header-brand-fix.js", "utf8"));
});
