const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V395 impede recarga automática em controllerchange", () => {
  const source = read("update-flow-v395.js");
  assert.match(source, /20260825-no-auto-reload-v395/);
  assert.match(source, /navigator\.serviceWorker\.addEventListener\("controllerchange"/);
  assert.match(source, /if \(manualReloadRequested && safeToReload\(\)\) \{\s*location\.reload\(\);/s);
  assert.match(source, /reloadMode: "manual-only-no-controller-reload-v395"/);
  assert.doesNotMatch(source, /reloadOnce\("controllerchange"\)/);
});

test("V395 continua instalado antes do bundle principal nos dois bootstraps", () => {
  const protectedLoader = read("bootstrap-integrity-loader-v275.js");
  const legacyLoader = read("bootstrap-integrity-loader-v258.js");
  assert.match(protectedLoader, /UPDATE_FLOW_SCRIPT = "update-flow-v395\.js\?v=20260825-no-auto-reload-v395"/);
  assert.ok(protectedLoader.indexOf("parent.insertBefore(updateFlow") < protectedLoader.indexOf("parent.insertBefore(core"));
  assert.match(protectedLoader, /await updateFlowReady/);
  assert.match(legacyLoader, /UPDATE_FLOW_SCRIPT = "update-flow-v395\.js\?v=20260825-no-auto-reload-v395"/);
  assert.ok(legacyLoader.indexOf("parent.insertBefore(updateFlow") < legacyLoader.indexOf("parent.insertBefore(core"));
});

test("V395 renova o cache sem remover a estratégia de performance", () => {
  const worker = read("service-worker.js");
  assert.match(worker, /UPDATE_FLOW_VERSION = "20260825-no-auto-reload-v395"/);
  assert.match(worker, /planning-quality-v371-no-auto-reload-v395/);
  assert.match(worker, /const UPDATE_FLOW_SCRIPT = `update-flow-v395\.js\?v=\$\{UPDATE_FLOW_VERSION\}`/);
  assert.match(worker, /BOOTSTRAP_PROTECTED = `bootstrap-integrity-loader-v275\.js\?v=\$\{FAST_BOOTSTRAP_VERSION\}&planning=v397&update=v395(?:&audio=v396)?`/);
  assert.match(worker, /async function cachedFirstNavigation/);
  assert.match(worker, /async function cacheFirstStatic/);
});

test("V395 mantém paridade root/docs", () => {
  for (const file of [
    "update-flow-v395.js",
    "bootstrap-integrity-loader-v275.js",
    "bootstrap-integrity-loader-v258.js",
    "service-worker.js",
    "service-worker-v378.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve permanecer idêntico em docs`);
  }
});

test("Pages deriva o worker ativo da CURRENT_VERSION em vez de fixar uma versão antiga", () => {
  const workflow = read(".github/workflows/pages.yml");
  assert.match(workflow, /current_version_match = re\.search\(r'const CURRENT_VERSION = "\(\[\^"\]\+\)";'/);
  assert.match(workflow, /active_worker_name = f"service-worker-\{release_suffix_match\.group\(1\)\}\.js"/);
  assert.match(workflow, /for worker_name in \("service-worker\.js", active_worker_name\):/);
  assert.match(workflow, /active_worker_path\.read_text\(encoding="utf-8"\)/);
  assert.doesNotMatch(workflow, /worker efetivamente registrado é service-worker-v344\.js/);
  assert.doesNotMatch(workflow, /for worker_name in \("service-worker\.js", "service-worker-v344\.js"\)/);
});

// O workflow de Pages já executa este arquivo. Importar a V396 torna a regressão
// de áudio bloqueante na publicação sem duplicar a lista histórica do workflow.
require("./v396-timer-audio-stability.test.js");
