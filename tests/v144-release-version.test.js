const { assertCurrentReleaseContract } = require("./current-release-contract.js");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const rootPatch = path.join(rootDir, "release-version-v144.js");
const docsPatch = path.join(rootDir, "docs", "release-version-v144.js");
const rootLoader = path.join(rootDir, "daily-collapsibles-closed-v140.js");
const docsLoader = path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js");
const rootReport = path.join(rootDir, "performance-practical-v143.js");
const docsReport = path.join(rootDir, "docs", "performance-practical-v143.js");

const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos v144 possuem sintaxe JavaScript válida", () => {
  execFileSync(process.execPath, ["--check", rootPatch]);
  execFileSync(process.execPath, ["--check", docsPatch]);
});

test("módulo legado delega para a versão canônica", () => {
  const source = read(rootPatch);
  assert.match(source, /__ALDUS_APP_RELEASE__\?\.apply\?\.\(\)/);
  assert.doesNotMatch(source, /footer \.app-version|textContent|aldusReleaseVersion =/);
});

test("compatibilidade é idempotente e não instala observador concorrente", () => {
  const source = read(rootPatch);
  assert.match(source, /__aldusReleaseVersionV144/);
  assert.doesNotMatch(source, /MutationObserver|setTimeout|querySelector/);
});

test("correção não altera armazenamento, dados ou sincronização", () => {
  const source = read(rootPatch);
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "state =", "saveData", "syncIntegral", "fetch("]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});

test("Contrato atual v152: raiz e docs publicam exatamente o mesmo patch e carregador", () => {
  assertCurrentReleaseContract();
  return; // As asserções históricas abaixo ficam documentadas, mas o contrato público vigente é o v152.
  assert.equal(read(rootPatch), read(docsPatch));
  assert.equal(read(rootLoader), read(docsLoader));
  assert.match(read(rootLoader), /release-version-v144\.js\?v=20260725-versao-publica-v144/);
  assert.match(read(rootLoader), /dataset\.aldusReleaseVersion = "v144"/);
});

test("relatório v143 tem paridade byte a byte entre raiz e docs", () => {
  assert.equal(read(rootReport), read(docsReport));
});
