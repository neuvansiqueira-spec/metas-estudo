const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const RELEASE = "20260827-factory-cross-area-integrity-v402";
const BOOTSTRAP_RELEASE = "20260830-bootstrap-runtime-unification-v404";
const read = (file) => fs.readFileSync(file, "utf8");
const executable = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

test("fast path e fallback carregam o mesmo núcleo público V402", () => {
  const fast = read("bootstrap-fast-path-v351.js");
  const fallback = read("bootstrap-integrity-loader-v258-core.js");

  assert.match(fast, new RegExp(`const VERSION = "${BOOTSTRAP_RELEASE}"`));
  assert.match(fast, new RegExp(`app-v402\\.js\\?v=${RELEASE}`));
  assert.doesNotMatch(fast, /app-v378\.js/);
  assert.match(fast, /FALLBACK_CORE = `bootstrap-integrity-loader-v258-core\.js\?v=\$\{VERSION\}/);
  assert.match(fallback, new RegExp(`app-v402\\.js\\?v=${RELEASE}`));
});

test("URLs dos carregadores renovam o cache sem adicionar trabalho ao hot path", () => {
  const worker = read("service-worker.js");
  const protectedLoader = read("bootstrap-integrity-loader-v275.js");
  const legacyLoader = read("bootstrap-integrity-loader-v258.js");

  assert.match(worker, new RegExp(`const FAST_BOOTSTRAP_VERSION = "${BOOTSTRAP_RELEASE}"`));
  assert.match(worker, /BOOTSTRAP_CORE = `bootstrap-integrity-loader-v258-core\.js\?v=\$\{FAST_BOOTSTRAP_VERSION\}`/);
  assert.match(protectedLoader, new RegExp(`const VERSION = "${BOOTSTRAP_RELEASE}"`));
  assert.match(legacyLoader, new RegExp(`bootstrap-integrity-loader-v258-core\\.js\\?v=${BOOTSTRAP_RELEASE}`));
  assert.doesNotMatch(executable(protectedLoader), /MutationObserver|setInterval|indexedDB|localStorage/);
});

test("worker V378 vira ponte segura para o worker atual", () => {
  const bridge = read("service-worker-v378.js");
  assert.match(bridge, new RegExp(`importScripts\\("service-worker\\.js\\?v=${BOOTSTRAP_RELEASE}"\\)`));
  assert.doesNotMatch(executable(bridge), /indexedDB|deleteDatabase|caches\.delete/);
  assert.equal(bridge, read("docs/service-worker-v378.js"));
});

test("artefatos publicados permanecem sincronizados", () => {
  for (const file of [
    "index.html",
    "bootstrap-fast-path-v351.js",
    "bootstrap-integrity-loader-v258.js",
    "bootstrap-integrity-loader-v275.js",
    "service-worker.js",
    "service-worker-v168.js",
    "service-worker-v169.js",
    "service-worker-v332.js",
    "service-worker-v402.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
