const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const files = {
  rootPatch: path.join(rootDir, "analytics-header-arrow-v149.js"),
  docsPatch: path.join(rootDir, "docs", "analytics-header-arrow-v149.js"),
  rootDaily: path.join(rootDir, "daily-collapsibles-closed-v140.js"),
  docsDaily: path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js")
};

const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos JavaScript v149 possuem sintaxe válida", () => {
  Object.values(files).forEach((file) => execFileSync(process.execPath, ["--check", file]));
});

test("raiz e docs permanecem byte a byte iguais", () => {
  assert.equal(read(files.rootPatch), read(files.docsPatch));
  assert.equal(read(files.rootDaily), read(files.docsDaily));
});

test("cabeçalho da Análise Estratégica deixa de ser aba e recupera identidade visual", () => {
  const source = read(files.rootPatch);
  assert.match(source, /analytics-fixed-header-v149/);
  assert.match(source, /details\[data-analytics-collapsible-key-v145="shell:intro"\]/);
  assert.match(source, /heading\.classList\.remove\("analytics-intro-source-v145"\)/);
  assert.match(source, /heading\.classList\.add\("view-identity-heading"\)/);
  assert.match(source, /title\.id = "analise-estrategica-title"/);
  assert.match(source, /introShell\.remove\(\)/);
});

test("Filtros da análise usa a mesma estrutura e seta dos demais painéis", () => {
  const source = read(files.rootPatch);
  assert.match(source, /analytics-filter-shell-v149/);
  assert.match(source, /analytics-collapsible-heading-v145/);
  assert.match(source, /analytics-collapsible-chevron-v145/);
  assert.match(source, /summary\.replaceChildren\(heading, chevron\)/);
  assert.match(source, /summary::marker/);
  assert.match(source, /aria-expanded/);
});

test("v149 é carregada depois da correção v148 e antes da transformação v145", () => {
  const daily = read(files.rootDaily);
  assert.ok(daily.indexOf("analytics-accordion-fix-v148.js") < daily.indexOf("analytics-header-arrow-v149.js"));
  assert.ok(daily.indexOf("analytics-header-arrow-v149.js") < daily.indexOf("analytics-collapsibles-v145.js"));
  assert.match(daily, /analytics-header-arrow-v149\.js\?v=20260725-analise-estrategica-cabecalho-fixo-v149/);
});

test("refinamento não acessa dados, armazenamento, sincronização ou rede", () => {
  const source = `${read(files.rootPatch)}\n${read(files.rootDaily)}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "saveData", "syncIntegral", "fetch(", "XMLHttpRequest", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});
