const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const suffix = version.match(/v\d+$/)?.[0];

const incorporatedModules = [
  "timer-safety-v132.js",
  "factory-final-review-v128.js",
  "calendar-month-visibility-v131.js",
  "question-searchable-selects-v135.js",
  "factory-executive-ui-v136.js",
  "daily-study-collapsible-v137.js",
  "daily-collapsibles-closed-v140.js",
  "question-scoring-rule-v142.js",
  "timer-motivation-v161.js",
  "question-register-simple-v162.js",
  "daily-smart-review-collapsible-v138.js",
  "collapse-chevron-fix-v139.js",
  "reinforcement-goal-presentation-v156.js",
  "contest-countdown-v151.js",
  "analytics-view-controller-v179.js",
  "performance-practical-v143.js",
];

const retiredRuntimeModules = [
  "analytics-collapsibles-v145.js",
  "analytics-accordion-fix-v148.js",
  "analytics-header-arrow-v149.js",
  "analytics-single-arrow-v150.js",
  "question-board-result-v141.js"
];

test("versão atual usa um JS, um CSS, um bootstrap e um registro de service worker", () => {
  const html = read("index.html");
  const app = read(`app-${suffix}.js`);
  assert.equal((html.match(/<script\b[^>]*\bsrc=/g) || []).length, 1);
  assert.equal((html.match(/<link\b[^>]*\brel="stylesheet"/g) || []).length, 1);
  assert.equal((app.match(/navigator\.serviceWorker\.register\(/g) || []).length, 1);
  assert.equal((app.match(/Aldus source: app-version\.js/g) || []).length, 1);
  assert.match(html, new RegExp(`app-${suffix}\\.js`));
  assert.match(html, new RegExp(`app-${suffix}\\.css`));
  assert.doesNotMatch(html, /app-v(?:128|131|132|135|136|137|138|139|140|141|142|143|145|148|149|150|151|156|161|162|168)|service-worker-v168/i);
});

test("versão atual incorpora os módulos operacionais sem carregadores internos", () => {
  const app = read(`app-${suffix}.js`);
  for (const filename of incorporatedModules) {
    assert.match(app, new RegExp(`Aldus source: ${filename.replaceAll(".", "\\.")}`), filename);
  }
  for (const filename of retiredRuntimeModules) {
    assert.doesNotMatch(app, new RegExp(`Aldus source: ${filename.replaceAll(".", "\\.")}`), filename);
    assert.equal(fs.existsSync(filename), true, `${filename} deve permanecer disponível para reversão`);
  }
  assert.doesNotMatch(app, /script\.src\s*=\s*["'`](?:timer|factory|calendar|question|analytics|daily|sync|performance|contest|reinforcement|collapse|central)-/);
  assert.doesNotMatch(app, /data-integral-sync-file|loadIntegralSyncEnhancementFile|INTEGRAL_SYNC_ENHANCEMENT_FILES/);
});

test("versão atual não possui encadeamento legado, import de CSS nem espera de atualização", () => {
  const css = read(`app-${suffix}.css`);
  const worker = read(`service-worker-${suffix}.js`);
  const update = read("update-flow-v169.js");
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(worker, /importScripts|patchHtmlSource|transformAppScriptResponse|replaceVersion/);
  assert.doesNotMatch(update, /setTimeout|setInterval|4000|5000|6000|waitForCondition/);
  assert.match(update, /requestAnimationFrame/);
  assert.match(update, /CHECK_INTERVAL_MS = 15 \* 60 \* 1000/);
});

test("service worker atual preserva caches externos e não toca em dados", async () => {
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
      keys: async () => ["metas-estudo-v168", `metas-estudo-${version}`, "drive-cache", "outro-site"],
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
  vm.runInNewContext(read(`service-worker-${suffix}.js`), context);
  let activation;
  listeners.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ["metas-estudo-v168"]);
  const worker = read(`service-worker-${suffix}.js`);
  assert.doesNotMatch(worker, /localStorage|sessionStorage|indexedDB|deleteDatabase/);
});

test("raiz e docs publicam exatamente a mesma versão atual", () => {
  for (const file of ["index.html", `app-${suffix}.js`, `app-${suffix}.css`, `service-worker-${suffix}.js`, "manifest.json"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
  assert.equal(read("service-worker-v168.js"), read(`service-worker-${suffix}.js`));
  assert.equal(read("service-worker-v169.js"), read(`service-worker-${suffix}.js`));
  assert.equal(read("docs/service-worker-v168.js"), read(`docs/service-worker-${suffix}.js`));
  assert.equal(read("docs/service-worker-v169.js"), read(`docs/service-worker-${suffix}.js`));
});
