const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const packageVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const FAST_APP_RELEASE = packageVersion;
const FAST_APP_SUFFIX = packageVersion.match(/v\d+$/)?.[0] || "current";
const FALLBACK_APP_RELEASE = packageVersion;
const FALLBACK_APP_SUFFIX = packageVersion.match(/v\d+$/)?.[0] || "current";
const BOOTSTRAP_RELEASE = "20260901-bootstrap-current-bundle-v421";
const read = (file) => fs.readFileSync(file, "utf8");
const fastApi = require("../bootstrap-fast-path-v351.js");
const executable = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

test("fast path deriva o bundle do preload e ambos os caminhos apontam para o núcleo público atual", () => {
  const fast = read("bootstrap-fast-path-v351.js");
  const fallback = read("bootstrap-integrity-loader-v258-core.js");

  assert.match(fast, new RegExp(`const VERSION = "${BOOTSTRAP_RELEASE}"`));
  assert.match(fast, new RegExp(`FALLBACK_APPLICATION_SCRIPT = "app-${FAST_APP_SUFFIX}\\.js\\?v=${FAST_APP_RELEASE}"`));
  assert.match(fast, /querySelectorAll\('link\[rel="preload"\]\[as="script"\]\[href\]'\)/);
  assert.match(fast, /console\.error\(`\[Aldus \$\{VERSION\}\] Preload do bundle atual não encontrado; usando fallback \$\{FALLBACK_APPLICATION_SCRIPT\}\.`\)/);
  assert.doesNotMatch(fast, /app-v402\.js/);
  assert.match(fast, /FALLBACK_CORE = `bootstrap-integrity-loader-v258-core\.js\?v=\$\{VERSION\}/);
  assert.ok(fallback.includes(`app-${FALLBACK_APP_SUFFIX}.js?v=${FALLBACK_APP_RELEASE}`));
});

test("fast path prefere o preload e torna o fallback atual explicitamente observável", () => {
  const previousDocument = global.document;
  const previousConsoleError = console.error;
  const errors = [];
  try {
    global.document = {
      querySelectorAll() {
        return [{ getAttribute: (name) => name === "href" ? `app-${FAST_APP_SUFFIX}.js?v=${FAST_APP_RELEASE}` : null }];
      }
    };
    assert.equal(fastApi.resolveApplicationScript(), `app-${FAST_APP_SUFFIX}.js?v=${FAST_APP_RELEASE}`);

    console.error = (...args) => errors.push(args.join(" "));
    global.document = { querySelectorAll: () => [] };
    assert.equal(fastApi.resolveApplicationScript(), `app-${FAST_APP_SUFFIX}.js?v=${FAST_APP_RELEASE}`);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Preload do bundle atual não encontrado; usando fallback app-v\d+\.js\?v=/);
  } finally {
    console.error = previousConsoleError;
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
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
    `service-worker-${FALLBACK_APP_SUFFIX}.js`
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
