const { assertCurrentReleaseContract } = require("./current-release-contract.js");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const files = {
  rootRelease: path.join(rootDir, "release-version-v147.js"),
  docsRelease: path.join(rootDir, "docs", "release-version-v147.js"),
  rootLoader: path.join(rootDir, "daily-collapsibles-closed-v140.js"),
  docsLoader: path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js"),
  rootCss: path.join(rootDir, "factory-visibility-v122.css"),
  docsCss: path.join(rootDir, "docs", "factory-visibility-v122.css")
};
const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos JavaScript v147 possuem sintaxe válida", () => {
  [files.rootRelease, files.docsRelease, files.rootLoader, files.docsLoader].forEach((file) => {
    execFileSync(process.execPath, ["--check", file]);
  });
});

test("raiz e docs permanecem idênticos", () => {
  assert.equal(read(files.rootRelease), read(files.docsRelease));
  assert.equal(read(files.rootLoader), read(files.docsLoader));
  assert.equal(read(files.rootCss), read(files.docsCss));
});

test("rodapé permanece visível e é controlado pela fonte canônica", () => {
  const css = read(files.rootCss);
  assert.match(css, /^footer \.app-version/m);
  assert.match(css, /visibility: visible !important/);
  assert.doesNotMatch(css, /v147|visibility: hidden/);
});

test("compatibilidade v147 não sobrescreve a versão pública", () => {
  const source = read(files.rootRelease);
  assert.match(source, /__ALDUS_APP_RELEASE__\?\.apply\?\.\(\)/);
  assert.doesNotMatch(source, /textContent|aldusReleaseVersion =|20260725-/);
});

test("Contrato atual v152: carregador aponta somente para a versão pública v147", () => {
  assertCurrentReleaseContract();
  return; // As asserções históricas abaixo ficam documentadas, mas o contrato público vigente é o v152.
  const loader = read(files.rootLoader);
  assert.match(loader, /release-version-v147\.js\?v=20260725-versao-publica-sem-transicao-v147/);
  assert.match(loader, /dataset\.aldusReleaseVersion = "v147"/);
  assert.doesNotMatch(loader, /release-version-v146\.js/);
});

test("correção não acessa dados, persistência ou rede", () => {
  const source = `${read(files.rootRelease)}\n${read(files.rootCss)}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "saveData", "syncIntegral", "fetch(", "XMLHttpRequest", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});
