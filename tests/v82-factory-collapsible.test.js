const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const html = read("index.html");
const css = read("style.css");

test("filtros e cadastro da Fábrica são painéis recolhíveis", () => {
  assert.match(html, /<details class="factory-collapsible factory-filter-panel" open>/);
  assert.match(html, /<summary>Filtros e etapas da Fábrica<\/summary>/);
  assert.match(html, /<details class="factory-collapsible factory-register-panel">/);
  assert.match(html, /<summary>Cadastrar ou editar tema<\/summary>/);
});

test("seções dinâmicas da Fábrica podem ser abertas e fechadas", () => {
  assert.match(script, /factory-today-plan factory-collapsible/);
  assert.match(script, /factory-do-now factory-collapsible" open/);
  assert.match(script, /factory-today-queue factory-collapsible/);
  assert.match(script, /factory-section factory-collapsible" open/);
  assert.match(script, /factory-collapsible-content/);
});

test("painéis recolhíveis têm contraste e ajuste para celular", () => {
  assert.match(css, /\.factory-collapsible > summary/);
  assert.match(css, /\.factory-collapsible\[open\] > summary/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.factory-collapsible > summary/);
});

test("V83 preserva cache anterior e arquivos publicados em paridade", () => {
  const version = "20260720-mensagem-motivacional-v87";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-fabrica-pendencias-reais-v81"/);
  for (const file of ["script.js", "index.html", "style.css", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
