const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workerPath = path.resolve(__dirname, "..", "service-worker.js");
const source = fs.readFileSync(workerPath, "utf8");
const currentVersion = source.match(/const CURRENT_VERSION = "([^"]+)";/)?.[1] || "";
assert.ok(currentVersion, "CURRENT_VERSION deve existir no Service Worker canônico");
const scope = "https://example.test/metas-estudo/";
const canonical = `${scope}index.html`;

function makeRuntime() {
  const store = new Map();
  const addAllCalls = [];
  const waits = [];
  let fetchImpl = async () => new Response("<!doctype html><html><head></head><body><main>app</main></body></html>", {
    status: 200,
    headers: { "content-type": "text/html" }
  });
  const cache = {
    async addAll(assets) { addAllCalls.push([...assets]); },
    async put(request, response) {
      const key = typeof request === "string" ? request : request.url;
      store.set(key, response.clone());
    },
    async match(request) {
      const key = typeof request === "string" ? request : request.url;
      const response = store.get(key);
      return response ? response.clone() : undefined;
    }
  };
  const context = vm.createContext({
    URL, Headers, Response, Request, console,
    self: {
      registration: { scope },
      addEventListener() {},
      skipWaiting() {},
      clients: { claim: async () => {} },
      location: { origin: new URL(scope).origin }
    },
    caches: {
      async open() { return cache; },
      async keys() { return []; },
      async delete() { return true; },
      async match(request) { return cache.match(request); }
    },
    fetch: (...args) => fetchImpl(...args)
  });
  vm.runInContext(source, context, { filename: "service-worker.js" });
  return { store, addAllCalls, waits, cache, context, setFetch(fn) { fetchImpl = fn; }, fn(name) { return vm.runInContext(name, context); } };
}

test("V353 não precacheia HTML cru e grava um documento canônico já protegido", async () => {
  const rt = makeRuntime();
  await rt.fn("precacheAssets")();
  assert.equal(rt.addAllCalls.length, 1);
  assert.equal(rt.addAllCalls[0].includes("./"), false);
  assert.equal(rt.addAllCalls[0].includes("index.html"), false);
  const cached = await rt.cache.match(canonical);
  assert.ok(cached);
  assert.equal(cached.headers.get("x-aldus-integrity-version"), currentVersion);
  const html = await cached.text();
  assert.match(html, /id="aldusBootstrapIntegrityLoaderV275"/);
  assert.match(html, /bootstrap-integrity-loader-v275\.js\?v=20260817-bootstrap-fast-path-v351/);
});

test("V353 nunca devolve HTML cacheado cru na primeira navegação", async () => {
  const rt = makeRuntime();
  await rt.cache.put(canonical, new Response("<!doctype html><html><head></head><body>cru</body></html>", {
    status: 200,
    headers: { "content-type": "text/html" }
  }));
  const request = new Request(scope, { headers: { accept: "text/html" } });
  const event = { waitUntil(promise) { rt.waits.push(promise); } };
  const response = await rt.fn("cachedFirstNavigation")(request, event);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-aldus-integrity-version"), currentVersion);
  const html = await response.text();
  assert.match(html, /id="aldusBootstrapIntegrityLoaderV275"/);
  assert.match(html, /20260817-bootstrap-fast-path-v351/);
  const repaired = await rt.cache.match(canonical);
  assert.ok(repaired);
  assert.match(await repaired.text(), /aldusBootstrapIntegrityLoaderV275/);
});

test("V353 usa uma única chave canônica e não silencia falhas de refresh", () => {
  assert.match(source, /CANONICAL_DOCUMENT_URL = new URL\("index\.html", self\.registration\.scope\)\.href/);
  assert.match(source, /cache\.put\(CANONICAL_DOCUMENT_URL/);
  const start = source.indexOf("async function cachedFirstNavigation");
  const end = source.indexOf("async function cacheFirstStatic", start);
  const navigation = source.slice(start, end);
  assert.match(navigation, /cache\.match\(CANONICAL_DOCUMENT_URL/);
  assert.doesNotMatch(navigation, /caches\.match\(request/);
  assert.doesNotMatch(navigation, /\.catch\(\(\) => null\)/);
  assert.match(navigation, /console\.warn/);
  assert.match(source, /navigation-bootstrap-delivery-v353/);
});
