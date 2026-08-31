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

function isPlanningCacheBridge(source) {
  return source.includes('const CACHE_FIX_VERSION = "20260830-planning-integrity-cache-v408";')
    && source.includes('importScripts(`service-worker.js?v=${CACHE_FIX_VERSION}`);');
}

test("V352 mantém o Service Worker ativo equivalente ao canônico ou como ponte V408 estrita", () => {
  const activeFilename = currentWorkerFilename();
  const active = fs.readFileSync(path.join(root, activeFilename), "utf8");
  const docsCanonical = fs.readFileSync(path.join(root, "docs", "service-worker.js"), "utf8");
  const docsActive = fs.readFileSync(path.join(root, "docs", activeFilename), "utf8");

  assert.equal(docsCanonical, canonical, "docs/service-worker.js divergiu do canônico");
  assert.equal(docsActive, active, `docs/${activeFilename} divergiu da raiz`);

  if (active === canonical) return;

  assert.ok(isPlanningCacheBridge(active), `${activeFilename} divergiu do canônico sem ser a ponte V408 autorizada`);
  assert.match(active, /planning-integrity-v235\.js/);
  assert.match(active, /planning-integrity-loader-v235\.js/);
  assert.match(active, /cache\.delete\(request\)/);
  assert.doesNotMatch(active, /addEventListener\("fetch"/);
  assert.doesNotMatch(active, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
});

test("V352 entrega o fast path pela implementação canônica e gira o cache de bootstrap", () => {
  const activeFilename = currentWorkerFilename();
  const active = fs.readFileSync(path.join(root, activeFilename), "utf8");
  const effective = isPlanningCacheBridge(active) ? canonical : active;
  const currentVersion = effective.match(/const CURRENT_VERSION = "([^"]+)";/)?.[1] || "";
  const fastBootstrapVersion = effective.match(/const FAST_BOOTSTRAP_VERSION = "([^"]+)";/)?.[1] || "";

  assert.ok(currentVersion, "CURRENT_VERSION deve existir no worker efetivo");
  assert.ok(fastBootstrapVersion, "FAST_BOOTSTRAP_VERSION deve existir no worker efetivo");
  const fastPath = fs.readFileSync(path.join(root, "bootstrap-fast-path-v351.js"), "utf8");
  assert.match(
    fastPath,
    new RegExp(`const VERSION = "${fastBootstrapVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
    "o worker e o fast path devem usar o mesmo token de entrega"
  );
  assert.match(effective, /BOOTSTRAP_PROTECTED = `bootstrap-integrity-loader-v275\.js\?v=\$\{FAST_BOOTSTRAP_VERSION\}[^`]*`/);
  assert.match(effective, /BOOTSTRAP_FAST_PATH = `bootstrap-fast-path-v351\.js\?v=\$\{FAST_BOOTSTRAP_VERSION\}[^`]*`/);
  assert.match(effective, /planning-quality-v368/);
  assert.match(effective, /-bootstrap-fast-path-v351(?:-[^`]*)?`/);
});
