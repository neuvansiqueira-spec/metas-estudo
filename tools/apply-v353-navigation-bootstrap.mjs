import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, s) => fs.writeFileSync(path.join(root, p), s);

let source = read("service-worker.js");

function replaceOnce(oldText, newText, label) {
  if (!source.includes(oldText)) throw new Error(`V353: marcador ausente: ${label}`);
  source = source.replace(oldText, newText);
}

replaceOnce(
  'const FAST_BOOTSTRAP_VERSION = "20260817-bootstrap-fast-path-v351";\n',
  'const FAST_BOOTSTRAP_VERSION = "20260817-bootstrap-fast-path-v351";\nconst NAVIGATION_DELIVERY_VERSION = "20260817-navigation-bootstrap-delivery-v353";\n',
  "versão de entrega"
);
replaceOnce(
  '-qconcursos-filter-v337-bootstrap-fast-path-v351`;',
  '-qconcursos-filter-v337-bootstrap-fast-path-v351-navigation-bootstrap-v353`;',
  "rotação do cache"
);
replaceOnce(
  'const STATIC_PATHS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));\n',
  'const STATIC_PATHS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).pathname));\nconst CANONICAL_DOCUMENT_URL = new URL("index.html", self.registration.scope).href;\n',
  "documento canônico"
);
replaceOnce(
  'const ESSENTIAL_ASSETS = [\n  "./",\n  "index.html",\n',
  'const ESSENTIAL_ASSETS = [\n',
  "remoção de HTML cru do precache"
);
replaceOnce(
`async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ESSENTIAL_ASSETS);
}
`,
`async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(ESSENTIAL_ASSETS);

  const response = await fetch(CANONICAL_DOCUMENT_URL, { cache: "no-store" });
  if (!response?.ok) throw new Error(\`Documento inicial indisponível: \${response?.status || 0}\`);
  const patchedResponse = await ensurePageStylesheets(response);
  if (!await responseHasProtectedBootstrap(patchedResponse)) {
    throw new Error("Documento inicial sem bootstrap V351 após transformação.");
  }
  await cache.put(CANONICAL_DOCUMENT_URL, patchedResponse.clone());
}
`,
  "precache protegido"
);
replaceOnce(
`async function refreshNavigation(request) {
  const response = await fetch(request, { cache: "no-store" });
  if (!response?.ok) throw new Error(\`Navegação indisponível: \${response?.status || 0}\`);
  const patchedResponse = await ensurePageStylesheets(response);
  return cacheResponse(request, patchedResponse);
}

async function cachedFirstNavigation(request, event) {
  const cached = await caches.match(request, { ignoreSearch: true })
    || await caches.match(new URL("index.html", self.registration.scope).href, { ignoreSearch: true });

  if (cached) {
    event?.waitUntil?.(refreshNavigation(request).catch(() => null));
    return cached;
  }

  try {
    return await refreshNavigation(request);
  } catch {}

  return new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
`,
`async function responseHasProtectedBootstrap(response) {
  if (!response?.ok) return false;
  if (response.headers.get("x-aldus-integrity-version") !== CURRENT_VERSION) return false;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return false;
  const html = await response.clone().text();
  return html.includes('id="aldusBootstrapIntegrityLoaderV275"')
    && html.includes(BOOTSTRAP_PROTECTED)
    && html.includes(FAST_BOOTSTRAP_VERSION);
}

async function cacheNavigationResponse(response) {
  if (!response?.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(CANONICAL_DOCUMENT_URL, response.clone());
  return response;
}

async function refreshNavigation(request) {
  const response = await fetch(request, { cache: "no-store" });
  if (!response?.ok) throw new Error(\`Navegação indisponível: \${response?.status || 0}\`);
  const patchedResponse = await ensurePageStylesheets(response);
  if (!await responseHasProtectedBootstrap(patchedResponse)) {
    throw new Error("Navegação sem bootstrap V351 após transformação.");
  }
  return cacheNavigationResponse(patchedResponse);
}

async function cachedFirstNavigation(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(CANONICAL_DOCUMENT_URL, { ignoreSearch: true });

  if (cached && await responseHasProtectedBootstrap(cached)) {
    event?.waitUntil?.(refreshNavigation(request).catch((error) => {
      console.warn(\`[\${NAVIGATION_DELIVERY_VERSION}] Falha ao atualizar a navegação em segundo plano.\`, error);
    }));
    return cached;
  }

  try {
    return await refreshNavigation(request);
  } catch (error) {
    console.error(\`[\${NAVIGATION_DELIVERY_VERSION}] Falha ao entregar navegação protegida.\`, error);
  }

  if (cached) {
    try {
      const repaired = await ensurePageStylesheets(cached);
      if (await responseHasProtectedBootstrap(repaired)) {
        return cacheNavigationResponse(repaired);
      }
    } catch (error) {
      console.error(\`[\${NAVIGATION_DELIVERY_VERSION}] Falha ao reparar HTML cacheado.\`, error);
    }
  }

  return new Response("Aplicativo indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
`,
  "entrega canônica"
);

for (const target of [
  "service-worker.js",
  "service-worker-v344.js",
  "docs/service-worker.js",
  "docs/service-worker-v344.js"
]) write(target, source);

const testSource = `const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const workerPath = path.resolve(__dirname, "..", "service-worker.js");
const source = fs.readFileSync(workerPath, "utf8");
const scope = "https://example.test/metas-estudo/";
const canonical = \`\${scope}index.html\`;

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
  assert.equal(cached.headers.get("x-aldus-integrity-version"), "20260817-qb-package-single-pass-v344");
  const html = await cached.text();
  assert.match(html, /id="aldusBootstrapIntegrityLoaderV275"/);
  assert.match(html, /bootstrap-integrity-loader-v275\\.js\\?v=20260817-bootstrap-fast-path-v351/);
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
  assert.equal(response.headers.get("x-aldus-integrity-version"), "20260817-qb-package-single-pass-v344");
  const html = await response.text();
  assert.match(html, /id="aldusBootstrapIntegrityLoaderV275"/);
  assert.match(html, /20260817-bootstrap-fast-path-v351/);
  const repaired = await rt.cache.match(canonical);
  assert.ok(repaired);
  assert.match(await repaired.text(), /aldusBootstrapIntegrityLoaderV275/);
});

test("V353 usa uma única chave canônica e não silencia falhas de refresh", () => {
  assert.match(source, /CANONICAL_DOCUMENT_URL = new URL\\("index\\.html", self\\.registration\\.scope\\)\\.href/);
  assert.match(source, /cache\\.put\\(CANONICAL_DOCUMENT_URL/);
  const start = source.indexOf("async function cachedFirstNavigation");
  const end = source.indexOf("async function cacheFirstStatic", start);
  const navigation = source.slice(start, end);
  assert.match(navigation, /cache\\.match\\(CANONICAL_DOCUMENT_URL/);
  assert.doesNotMatch(navigation, /caches\\.match\\(request/);
  assert.doesNotMatch(navigation, /\\.catch\\(\\(\\) => null\\)/);
  assert.match(navigation, /console\\.warn/);
  assert.match(source, /navigation-bootstrap-delivery-v353/);
});
`;
write("tests/v353-navigation-bootstrap-delivery.test.js", testSource);

const ciPath = ".github/workflows/security-ci.yml";
let ci = read(ciPath);
if (!ci.includes("tests/v353-navigation-bootstrap-delivery.test.js")) {
  const marker = "            tests/v352-active-service-worker-delivery.test.js";
  if (!ci.includes(marker)) throw new Error("V353: contrato V352 ausente do CI");
  ci = ci.replace(marker, `${marker} \\\n            tests/v353-navigation-bootstrap-delivery.test.js`);
  write(ciPath, ci);
}

console.log("V353 aplicada: navegação canônica protegida, cache girado e teste de primeira navegação instalado.");
