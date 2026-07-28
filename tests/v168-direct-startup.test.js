const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;

test("V168 usa um JS, um CSS, um bootstrap e um registro de service worker", () => {
  const html = read("index.html");
  const app = read("app-v168.js");
  assert.equal((html.match(/<script\b[^>]*\bsrc=/g) || []).length, 1);
  assert.equal((html.match(/<link\b[^>]*\brel="stylesheet"/g) || []).length, 1);
  assert.equal((app.match(/navigator\.serviceWorker\.register\(/g) || []).length, 1);
  assert.equal((app.match(/Aldus source: app-version\.js/g) || []).length, 1);
  assert.doesNotMatch(html, /app-v(?:158|159|166|167)|service-worker-v(?:158|159|166|167)/i);
  assert.doesNotMatch(app, /app-v(?:158|159|166|167)\.js|service-worker-v(?:158|159|166|167)\.js/i);
});

test("V168 não possui encadeamento legado, import de CSS nem espera de atualização", () => {
  const css = read("app-v168.css");
  const worker = read("service-worker-v168.js");
  const update = read("update-flow-v168.js");
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(worker, /importScripts|patchHtmlSource|transformAppScriptResponse|replaceVersion/);
  assert.doesNotMatch(update, /setTimeout|setInterval|4000|5000|6000|waitForCondition/);
  assert.match(update, /requestAnimationFrame/);
  assert.match(update, /CHECK_INTERVAL_MS = 15 \* 60 \* 1000/);
});

test("service worker V168 preserva caches externos e não toca em dados", async () => {
  const listeners = {};
  const deleted = [];
  const context = {
    self: {
      registration: { scope: "https://aldus.local/" },
      location: { origin: "https://aldus.local" },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener(name, callback) { listeners[name] = callback; }
    },
    caches: {
      keys: async () => ["metas-estudo-v167", `metas-estudo-${version}`, "drive-cache", "outro-site"],
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
      match: async () => null
    },
    fetch: async () => ({ ok: false }),
    URL,
    Response,
    Request,
    Set
  };
  vm.runInNewContext(read("service-worker-v168.js"), context);
  let activation;
  listeners.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ["metas-estudo-v167"]);
  const worker = read("service-worker-v168.js");
  assert.doesNotMatch(worker, /localStorage|sessionStorage|indexedDB|deleteDatabase/);
});

test("raiz e docs publicam exatamente a mesma V168", () => {
  for (const file of ["index.html", "app-v168.js", "app-v168.css", "service-worker-v168.js", "manifest.json"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
  assert.equal(read("service-worker-v167.js"), read("service-worker-v168.js"));
  assert.equal(read("docs/service-worker-v167.js"), read("docs/service-worker-v168.js"));
});
