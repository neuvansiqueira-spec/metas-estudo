const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const suffix = version.match(/v\d+$/)?.[0];

test("V221 publica uma versão única no HTML, bundle e worker", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("V221 consolida os recursos recentes sem remendos no service worker", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("V221 mantém raiz, docs e pontes antigas byte a byte iguais", () => {
  for (const file of [
    "index.html",
    `app-${suffix}.js`,
    `app-${suffix}.css`,
    "service-worker.js",
    `service-worker-${suffix}.js`
  ]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
  for (const legacy of ["v168", "v169"]) {
    assert.equal(read(`service-worker-${legacy}.js`), read(`service-worker-${suffix}.js`), legacy);
    assert.equal(read(`docs/service-worker-${legacy}.js`), read(`service-worker-${suffix}.js`), `docs/${legacy}`);
  }
});

test("fluxo de atualização compara qualquer sufixo atual, sem trava na V169", () => {
  const source = read("update-flow-v169.js");
  assert.match(source, /controller === visible/);
  assert.doesNotMatch(source, /visible === "v169"/);
  assert.match(source, /__ALDUS_APP_RELEASE__\?\.version/);
});
