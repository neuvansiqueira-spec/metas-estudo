const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const canonicalPath = path.join(root, "service-worker.js");
const canonical = fs.readFileSync(canonicalPath, "utf8");

function currentWorkerFilename(source = canonical) {
  const version = source.match(/const CURRENT_VERSION = "([^"]+)";/)?.[1] || "";
  const suffix = version.match(/(v\d+)$/)?.[1] || "";
  assert.ok(suffix, `Sufixo do CURRENT_VERSION não encontrado: ${version}`);
  return `service-worker-${suffix}.js`;
}

test("V352 mantém o Service Worker realmente registrado idêntico ao canônico", () => {
  const activeFilename = currentWorkerFilename();
  const active = fs.readFileSync(path.join(root, activeFilename), "utf8");
  const docsCanonical = fs.readFileSync(path.join(root, "docs", "service-worker.js"), "utf8");
  const docsActive = fs.readFileSync(path.join(root, "docs", activeFilename), "utf8");

  assert.equal(active, canonical, `${activeFilename} divergiu de service-worker.js`);
  assert.equal(docsCanonical, canonical, "docs/service-worker.js divergiu do canônico");
  assert.equal(docsActive, canonical, `docs/${activeFilename} divergiu do canônico`);
});

test("V352 entrega a V351 pelo worker ativo e gira o cache de bootstrap", () => {
  const activeFilename = currentWorkerFilename();
  const active = fs.readFileSync(path.join(root, activeFilename), "utf8");

  assert.match(active, /FAST_BOOTSTRAP_VERSION = "20260817-bootstrap-fast-path-v351"/);
  assert.match(active, /BOOTSTRAP_PROTECTED = `bootstrap-integrity-loader-v275\.js\?v=\$\{FAST_BOOTSTRAP_VERSION\}`/);
  assert.match(active, /BOOTSTRAP_FAST_PATH = `bootstrap-fast-path-v351\.js\?v=\$\{FAST_BOOTSTRAP_VERSION\}`/);
  assert.match(active, /-bootstrap-fast-path-v351`/);
});
