import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const version = packageJson.version;
const suffix = version.match(/v\d+$/)?.[0];

if (version !== "20260816-storage-performance-v346") {
  throw new Error(`prepare-v346.mjs só pode preparar a V346; versão atual: ${version}`);
}
if (!suffix) throw new Error(`Versão sem sufixo vNNN: ${version}`);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function mirrorToDocs(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(root, "docs", relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Marcador ausente para ${label}.`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

function prepareSyncDeletionTracking() {
  const filename = "sync-integral-deletions.js";
  let source = read(filename);
  const oldSignature = `function syncRecordSignature(value) {
  return JSON.stringify(value ?? null, (key, entry) => SYNC_REVISION_FIELDS.has(key) ? undefined : entry);
}`;
  const stableSignature = `function syncRecordSignature(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return \`[\${value.map(syncRecordSignature).sort().join(",")}]\`;
  }
  if (typeof value === "object") {
    return \`{\${Object.keys(value)
      .filter((key) => !SYNC_REVISION_FIELDS.has(key))
      .sort()
      .map((key) => \`\${JSON.stringify(key)}:\${syncRecordSignature(value[key])}\`)
      .join(",")}}\`;
  }
  return JSON.stringify(value);
}`;

  if (!source.includes(stableSignature)) {
    if (!source.includes(oldSignature)) {
      throw new Error("syncRecordSignature não corresponde nem à implementação intermediária nem à implementação V346 esperada.");
    }
    source = source.replace(oldSignature, stableSignature);
  }

  if (source.includes("return syncStableSerialize(syncComparableValue(value));")) {
    throw new Error("Hotspot antigo syncStableSerialize ainda está no rastreamento de exclusões.");
  }
  if (source.includes("map.set(key, { record: syncClone(item), signature: syncRecordSignature(item) })")) {
    throw new Error("Snapshot ainda clona o registro inteiro.");
  }
  if (!source.includes("if (!canTrackIncrementally) syncRefreshDeletionSnapshot();")) {
    throw new Error("Caminho incremental sem proteção contra refresh integral pós-save.");
  }

  write(filename, source);
  mirrorToDocs(filename);
}

function prepareSyncTests() {
  const filename = "tests/sync-device-deletions.test.js";
  let source = read(filename);
  if (source.includes("assinatura permanece estável com ordem diferente das propriedades")) return;

  const marker = `test("arquivos publicados permanecem idênticos e cache usa a versão atual", () => {`;
  const position = source.indexOf(marker);
  if (position < 0) throw new Error("Marcador dos testes de sincronização não encontrado.");

  const tests = `test("assinatura permanece estável com ordem diferente das propriedades", () => {
  const sync = loadSyncEngine();
  const a = { id: "m1", title: "Material", nested: { a: 1, b: 2 } };
  const b = { nested: { b: 2, a: 1 }, title: "Material", id: "m1" };
  assert.equal(sync.syncRecordSignature(a), sync.syncRecordSignature(b));
});

test("assinatura preserva semântica estável de arrays da sincronização", () => {
  const sync = loadSyncEngine();
  assert.equal(
    sync.syncRecordSignature({ id: "m1", tags: ["a", "b"] }),
    sync.syncRecordSignature({ tags: ["b", "a"], id: "m1" })
  );
});

`;
  source = source.slice(0, position) + tests + source.slice(position);
  write(filename, source);
}

function preparePackageLock() {
  const filename = "package-lock.json";
  const lock = JSON.parse(read(filename));
  lock.version = version;
  if (!lock.packages || !lock.packages[""]) throw new Error("package-lock sem pacote raiz.");
  lock.packages[""].version = version;
  write(filename, `${JSON.stringify(lock, null, 2)}\n`);
}

function prepareIndex() {
  for (const filename of ["docs/index.html", "index.html"]) {
    let source = read(filename);
    const pattern = /bootstrap-integrity-loader-v258\.js\?v=[^"&]+/g;
    if (!pattern.test(source)) throw new Error(`Loader V258 não encontrado em ${filename}.`);
    pattern.lastIndex = 0;
    source = source.replace(pattern, `bootstrap-integrity-loader-v258.js?v=${version}`);
    write(filename, source);
  }
}

function prepareBootstrapChain() {
  let wrapper258 = read("bootstrap-integrity-loader-v258.js");
  wrapper258 = replaceRequired(
    wrapper258,
    /const CORE_SCRIPT = "bootstrap-integrity-loader-v258-core\.js\?v=[^"]+";/,
    `const CORE_SCRIPT = "bootstrap-integrity-loader-v258-core.js?v=${version}";`,
    "CORE_SCRIPT do loader V258"
  );
  write("bootstrap-integrity-loader-v258.js", wrapper258);
  mirrorToDocs("bootstrap-integrity-loader-v258.js");

  let core258 = read("bootstrap-integrity-loader-v258-core.js");
  core258 = replaceRequired(
    core258,
    /\["aldusAppBundleScript", "app-v\d+\.js\?v=[^"]+"\]/,
    `["aldusAppBundleScript", "app-${suffix}.js?v=${version}"]`,
    "bundle atual no core V258"
  );
  write("bootstrap-integrity-loader-v258-core.js", core258);
  mirrorToDocs("bootstrap-integrity-loader-v258-core.js");

  let protectedLoader = read("bootstrap-integrity-loader-v275.js");
  protectedLoader = replaceRequired(
    protectedLoader,
    /const VERSION = "[^"]+";/,
    `const VERSION = "${version}";`,
    "versão do loader protegido V275"
  );
  write("bootstrap-integrity-loader-v275.js", protectedLoader);
  mirrorToDocs("bootstrap-integrity-loader-v275.js");

  let core345 = read("bootstrap-integrity-loader-v345-core.js");
  core345 = replaceRequired(
    core345,
    /\["aldusAppBundleScript", "app-v\d+\.js\?v=[^"]+"\]/,
    `["aldusAppBundleScript", "app-${suffix}.js?v=${version}"]`,
    "bundle atual no core V345"
  );
  core345 = replaceRequired(
    core345,
    /(const FALLBACK_CORE = "bootstrap-integrity-loader-v258-core\.js\?v=)[^"&]+/,
    `$1${version}`,
    "fallback V258 do core V345"
  );
  write("bootstrap-integrity-loader-v345-core.js", core345);
  mirrorToDocs("bootstrap-integrity-loader-v345-core.js");

  let worker = read("service-worker.js");
  worker = replaceRequired(
    worker,
    /const BOOTSTRAP_VERSION = "[^"]+";/,
    `const BOOTSTRAP_VERSION = "${version}";`,
    "BOOTSTRAP_VERSION do service worker"
  );
  write("service-worker.js", worker);
  mirrorToDocs("service-worker.js");
}

function modernizeV345PublicationTest() {
  const filename = "tests/v345-storage-concurrency.test.js";
  let source = read(filename);
  const currentName = `test("proteções V345 permanecem incorporadas na publicação atual", () => {`;
  if (source.includes(currentName)) return;

  const startMarker = `test("publicação V345 referencia artefatos e cache corretos", () => {`;
  const nextMarker = `test("docs acompanha os arquivos críticos V345", () => {`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(nextMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error("Bloco histórico de publicação V345 não encontrado.");

  const replacement = `test("proteções V345 permanecem incorporadas na publicação atual", () => {
  const pkg = JSON.parse(read("package.json"));
  const version = pkg.version;
  const suffix = version.match(/v\\d+$/)?.[0];
  const index = read("index.html");
  const sw = read("service-worker.js");
  const loader = read("bootstrap-integrity-loader-v275.js");
  const core = read("bootstrap-integrity-loader-v345-core.js");
  assert.ok(suffix);
  assert.match(index, new RegExp(\`app-\${suffix}\\\\.js\\\\?v=\${version}\`));
  assert.match(index, new RegExp(\`app-\${suffix}\\\\.css\\\\?v=\${version}\`));
  assert.match(loader, /bootstrap-integrity-loader-v345-core\\.js/);
  assert.match(loader, new RegExp(\`const VERSION = "\${version}"\`));
  assert.match(core, new RegExp(\`app-\${suffix}\\\\.js\\\\?v=\${version}\`));
  assert.match(sw, new RegExp(\`CURRENT_VERSION = "\${version}"\`));
  assert.match(sw, new RegExp(\`BOOTSTRAP_VERSION = "\${version}"\`));
  assert.match(sw, /STORAGE_CONCURRENCY_V345/);
  assert.match(sw, /bootstrap-integrity-loader-v345-core\\.js/);
});

`;
  source = source.slice(0, start) + replacement + source.slice(end);
  write(filename, source);
}

function verifyPreparedSources() {
  const index = read("docs/index.html");
  const core258 = read("bootstrap-integrity-loader-v258-core.js");
  const core345 = read("bootstrap-integrity-loader-v345-core.js");
  const loader275 = read("bootstrap-integrity-loader-v275.js");
  const worker = read("service-worker.js");

  if (!index.includes(`bootstrap-integrity-loader-v258.js?v=${version}`)) throw new Error("Index ainda aponta para cache antigo do loader V258.");
  if (!core258.includes(`app-${suffix}.js?v=${version}`)) throw new Error("Core V258 não aponta para o bundle V346.");
  if (!core345.includes(`app-${suffix}.js?v=${version}`)) throw new Error("Core V345 não aponta para o bundle V346.");
  if (!core345.includes(`bootstrap-integrity-loader-v258-core.js?v=${version}`)) throw new Error("Fallback V258 do core V345 ainda usa cache antigo.");
  if (!loader275.includes(`const VERSION = "${version}";`)) throw new Error("Loader V275 ainda usa versão antiga de cache.");
  if (!worker.includes(`const BOOTSTRAP_VERSION = "${version}";`)) throw new Error("Service worker ainda injeta bootstrap com versão antiga.");
}

prepareSyncDeletionTracking();
prepareSyncTests();
preparePackageLock();
prepareIndex();
prepareBootstrapChain();
modernizeV345PublicationTest();
verifyPreparedSources();

console.log(`[V346] Fontes preparadas para ${version}.`);
