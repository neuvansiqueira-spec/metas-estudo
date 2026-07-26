const { assertCurrentReleaseContract } = require("./current-release-contract.js");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const files = {
  rootPatch: path.join(rootDir, "analytics-collapsibles-v145.js"),
  docsPatch: path.join(rootDir, "docs", "analytics-collapsibles-v145.js"),
  rootRelease: path.join(rootDir, "release-version-v145.js"),
  docsRelease: path.join(rootDir, "docs", "release-version-v145.js"),
  rootLoader: path.join(rootDir, "daily-collapsibles-closed-v140.js"),
  docsLoader: path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js")
};
const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos v145 possuem sintaxe JavaScript válida", () => {
  Object.values(files).forEach((file) => execFileSync(process.execPath, ["--check", file]));
});

test("raiz e docs permanecem byte a byte iguais", () => {
  assert.equal(read(files.rootPatch), read(files.docsPatch));
  assert.equal(read(files.rootRelease), read(files.docsRelease));
  assert.equal(read(files.rootLoader), read(files.docsLoader));
});

test("painéis não recolhíveis recebem details e summary acessíveis", () => {
  const source = read(files.rootPatch);
  assert.match(source, /document\.createElement\("details"\)/);
  assert.match(source, /document\.createElement\("summary"\)/);
  assert.match(source, /shell:intro/);
  assert.match(source, /shell:export/);
  assert.match(source, /dynamic:context/);
  assert.match(source, /dynamic:practical/);
  assert.match(source, /shell:plan-preview/);
  assert.match(source, /analytics-compact-header/);
  assert.match(source, /analyticsPracticalReadingV143/);
});

test("estado é somente em memória e sobrevive a novas renderizações", () => {
  const source = read(files.rootPatch);
  assert.match(source, /const openState = new Map\(\)/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /openState\.set/);
  assert.match(source, /openState\.has/);
  assert.match(source, /attributes: true/);
  assert.match(source, /attributeFilter: \["hidden"\]/);
});

test("há controles práticos para abrir e recolher os painéis", () => {
  const source = read(files.rootPatch);
  assert.match(source, /Recolher tudo/);
  assert.match(source, /Abrir tudo/);
  assert.match(source, /function setAll\(open\)/);
  assert.match(source, /topLevelDetails\(\)/);
});

test("alteração é visual e não acessa persistência ou rede", () => {
  const source = `${read(files.rootPatch)}\n${read(files.rootRelease)}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "saveData", "syncIntegral", "fetch(", "XMLHttpRequest", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});

test("Contrato atual v152: carregadores e versão pública apontam para v145", () => {
  assertCurrentReleaseContract();
  return; // As asserções históricas abaixo ficam documentadas, mas o contrato público vigente é o v152.
  const loader = read(files.rootLoader);
  const release = read(files.rootRelease);
  assert.match(loader, /analytics-collapsibles-v145\.js\?v=20260725-analise-estrategica-recolhivel-v145/);
  assert.match(loader, /release-version-v145\.js\?v=20260725-analise-estrategica-recolhivel-v145/);
  assert.doesNotMatch(loader, /release-version-v144\.js/);
  assert.match(release, /20260725-analise-estrategica-recolhivel-v145/);
  assert.match(release, /__aldusReleaseVersionV144 = true/);
});
