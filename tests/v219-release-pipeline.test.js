const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const suffix = version.match(/v\d+$/)?.[0];

test("V221 publica uma versão única no HTML, bundle e worker", () => {
  assert.equal(suffix, "v221");
  const html = read("index.html");
  const app = read(`app-${suffix}.js`);
  const worker = read(`service-worker-${suffix}.js`);

  assert.match(html, new RegExp(`app-${suffix}\\.css\\?v=${version}`));
  assert.match(html, new RegExp(`app-${suffix}\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`Versão: ${version}`));
  assert.match(app, new RegExp(`const VERSION = "${version}"`));
  assert.match(app, new RegExp(`service-worker-\\$\\{workerSuffix\\}\\.js\\?v=\\$\\{encodeURIComponent\\(APP_VERSION\\)\\}`));
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
});

test("V221 consolida os recursos recentes sem remendos no service worker", () => {
  const app = read(`app-${suffix}.js`);
  const worker = read(`service-worker-${suffix}.js`);
  for (const marker of [
    "qconcursos-capture-accuracy-v190.js",
    "question-bank-json-review-v192.js",
    "question-history-report-ui-v198.js",
    "planning-shift-disciplines-v200.js",
    "question-history-charts-v215.js",
    "question-history-tone-v216.js"
  ]) {
    assert.match(app, new RegExp(`/\\* Aldus runtime source: ${marker.replaceAll(".", "\\.")} \\*/`), marker);
  }
  assert.doesNotMatch(worker, /importScripts|runtimeAssetText|patchedApplicationResponse|replaceAll\(/);
  assert.match(worker, /async function networkFirstNavigation/);
  assert.match(worker, /await fetch\(request, \{ cache: "no-store" \}\)/);
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
