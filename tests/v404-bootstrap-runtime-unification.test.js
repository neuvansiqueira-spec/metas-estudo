const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const FAST_APP_RELEASE = "20260827-factory-cross-area-integrity-v402";
const FAST_APP_SUFFIX = "v402";
const FALLBACK_APP_RELEASE = "20260831-daily-plan-deterministic-integrity-v417";
const FALLBACK_APP_SUFFIX = "v417";
const BOOTSTRAP_RELEASE = "20260830-bootstrap-runtime-unification-v404";
const read = (file) => fs.readFileSync(file, "utf8");
const executable = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

test("fast path preserva o núcleo enxuto V402 e fallback entrega o núcleo público V417", () => {
  const fast = read("bootstrap-fast-path-v351.js");
  const fallback = read("bootstrap-integrity-loader-v258-core.js");

  assert.match(fast, new RegExp(`const VERSION = "${BOOTSTRAP_RELEASE}"`));
  assert.match(fast, new RegExp(`app-${FAST_APP_SUFFIX}\\.js\\?v=${FAST_APP_RELEASE}`));
  assert.doesNotMatch(fast, /app-v378\.js/);
  assert.match(fast, /FALLBACK_CORE = `bootstrap-integrity-loader-v258-core\.js\?v=\$\{VERSION\}/);
  assert.match(fallback, new RegExp(`app-${FALLBACK_APP_SUFFIX}\\.js\\?v=${FALLBACK_APP_RELEASE}`));
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
    "service-worker-v417.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
