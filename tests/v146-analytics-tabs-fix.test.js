const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const files = {
  rootPatch: path.join(rootDir, "analytics-tabs-fix-v146.js"),
  docsPatch: path.join(rootDir, "docs", "analytics-tabs-fix-v146.js"),
  rootRelease: path.join(rootDir, "release-version-v146.js"),
  docsRelease: path.join(rootDir, "docs", "release-version-v146.js"),
  rootLoader: path.join(rootDir, "daily-collapsibles-closed-v140.js"),
  docsLoader: path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js")
};
const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos v146 possuem sintaxe JavaScript válida", () => {
  Object.values(files).forEach((file) => execFileSync(process.execPath, ["--check", file]));
});

test("raiz e docs permanecem idênticos", () => {
  assert.equal(read(files.rootPatch), read(files.docsPatch));
  assert.equal(read(files.rootRelease), read(files.docsRelease));
  assert.equal(read(files.rootLoader), read(files.docsLoader));
});

test("controles globais desnecessários ficam ocultos", () => {
  const source = read(files.rootPatch);
  assert.match(source, /#analyticsCollapseToolbarV145/);
  assert.match(source, /display: none !important/);
  assert.match(source, /toolbar\.hidden = true/);
  assert.match(source, /aria-hidden/);
});

test("clique no summary alterna a aba explicitamente", () => {
  const source = read(files.rootPatch);
  assert.match(source, /view\.addEventListener\("click"/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /details\.open = !details\.open/);
  assert.match(source, /directSummaryDetails/);
  assert.match(source, /:scope > summary/);
});

test("estado de acessibilidade acompanha abertura e fechamento", () => {
  const source = read(files.rootPatch);
  assert.match(source, /aria-expanded/);
  assert.match(source, /view\.addEventListener\("toggle"/);
  assert.match(source, /syncExpandedState/);
});

test("correção é limitada ao DOM e não acessa dados ou rede", () => {
  const source = `${read(files.rootPatch)}\n${read(files.rootRelease)}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "saveData", "syncIntegral", "fetch(", "XMLHttpRequest", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});

test("carregadores e versão pública apontam para v146", () => {
  const loader = read(files.rootLoader);
  const release = read(files.rootRelease);
  assert.match(loader, /analytics-tabs-fix-v146\.js\?v=20260725-analise-estrategica-abas-corrigidas-v146/);
  assert.match(loader, /release-version-v146\.js\?v=20260725-analise-estrategica-abas-corrigidas-v146/);
  assert.doesNotMatch(loader, /release-version-v145\.js/);
  assert.match(release, /20260725-analise-estrategica-abas-corrigidas-v146/);
});
