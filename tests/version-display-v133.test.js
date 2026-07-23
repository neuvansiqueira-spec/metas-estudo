const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const VERSION = "20260723-versao-unica-v133";
const read = (file) => fs.readFileSync(file, "utf8");

test("HTML e motor usam a mesma versão desde o início", () => {
  for (const file of ["index.html", "docs/index.html"]) {
    const html = read(file);
    assert.match(html, new RegExp("Versão: " + VERSION));
    assert.match(html, new RegExp("app-v118\\.js\\?v=" + VERSION));
    assert.match(html, new RegExp("factory-lei-prompt-v123\\.js\\?v=" + VERSION));
    assert.match(html, new RegExp("central-goals-real-time-v124\\.js\\?v=" + VERSION));
  }
  for (const file of ["script.js", "docs/script.js", "app-v118.js", "docs/app-v118.js"]) {
    assert.match(read(file), new RegExp("const APP_VERSION = \"" + VERSION + "\";"));
  }
});

test("a Fábrica não sobrescreve o rodapé global", () => {
  for (const file of ["factory-lei-prompt-v123.js", "docs/factory-lei-prompt-v123.js"]) {
    const source = read(file);
    assert.match(source, new RegExp("const VERSION = \"" + VERSION + "\";"));
    assert.doesNotMatch(source, /querySelectorAll\("\.app-version"\)/);
    assert.doesNotMatch(source, /setTimeout\(showVersion/);
  }
});

test("service workers usam a versão única", () => {
  for (const file of [
    "service-worker-v118.js", "docs/service-worker-v118.js",
    "service-worker-v123.js", "docs/service-worker-v123.js",
    "service-worker.js", "docs/service-worker.js"
  ]) {
    assert.match(read(file), new RegExp("const CURRENT_VERSION = \"" + VERSION + "\";"), file);
  }
});

test("raiz e docs permanecem idênticos", () => {
  for (const file of [
    "index.html", "script.js", "app-v118.js", "factory-lei-prompt-v123.js",
    "service-worker-v118.js", "service-worker-v123.js", "service-worker.js"
  ]) {
    assert.equal(read(file), read("docs/" + file), file);
  }
});

test("package registra a versão global única", () => {
  assert.equal(JSON.parse(read("package.json")).version, VERSION);
});
