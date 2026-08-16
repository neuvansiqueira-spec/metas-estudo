import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const suffix = version.match(/v\d+$/)?.[0];

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

function synchronizePackageLock() {
  const filename = "package-lock.json";
  const lock = JSON.parse(read(filename));
  if (!lock.packages || !lock.packages[""]) throw new Error("package-lock sem pacote raiz.");
  lock.version = version;
  lock.packages[""].version = version;
  write(filename, `${JSON.stringify(lock, null, 2)}\n`);
}

function synchronizeIndexBootstrapVersion() {
  for (const filename of ["docs/index.html", "index.html"]) {
    let source = read(filename);
    const pattern = /bootstrap-integrity-loader-v258\.js\?v=[^"&]+/g;
    if (!pattern.test(source)) throw new Error(`Loader V258 não encontrado em ${filename}.`);
    pattern.lastIndex = 0;
    source = source.replace(pattern, `bootstrap-integrity-loader-v258.js?v=${version}`);
    write(filename, source);
  }
}

function synchronizeBootstrapChain() {
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
    "versão de cache do loader V275"
  );
  write("bootstrap-integrity-loader-v275.js", protectedLoader);
  mirrorToDocs("bootstrap-integrity-loader-v275.js");

  let protectedCore = read("bootstrap-integrity-loader-v345-core.js");
  protectedCore = replaceRequired(
    protectedCore,
    /\["aldusAppBundleScript", "app-v\d+\.js\?v=[^"]+"\]/,
    `["aldusAppBundleScript", "app-${suffix}.js?v=${version}"]`,
    "bundle atual no core protegido V345"
  );
  protectedCore = replaceRequired(
    protectedCore,
    /(const FALLBACK_CORE = "bootstrap-integrity-loader-v258-core\.js\?v=)[^"&]+/,
    `$1${version}`,
    "fallback V258 do core protegido V345"
  );
  write("bootstrap-integrity-loader-v345-core.js", protectedCore);
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

function verifyReleaseChain() {
  const index = read("docs/index.html");
  const core258 = read("bootstrap-integrity-loader-v258-core.js");
  const core345 = read("bootstrap-integrity-loader-v345-core.js");
  const loader275 = read("bootstrap-integrity-loader-v275.js");
  const worker = read("service-worker.js");

  if (!index.includes(`bootstrap-integrity-loader-v258.js?v=${version}`)) throw new Error("Index ainda aponta para cache antigo do loader V258.");
  if (!core258.includes(`app-${suffix}.js?v=${version}`)) throw new Error("Core V258 não aponta para o bundle atual.");
  if (!core345.includes(`app-${suffix}.js?v=${version}`)) throw new Error("Core protegido V345 não aponta para o bundle atual.");
  if (!core345.includes(`bootstrap-integrity-loader-v258-core.js?v=${version}`)) throw new Error("Fallback V258 do core protegido ainda usa cache antigo.");
  if (!loader275.includes(`const VERSION = "${version}";`)) throw new Error("Loader V275 ainda usa versão antiga de cache.");
  if (!worker.includes(`const BOOTSTRAP_VERSION = "${version}";`)) throw new Error("Service worker ainda injeta bootstrap com versão antiga.");
}

synchronizePackageLock();
synchronizeIndexBootstrapVersion();
synchronizeBootstrapChain();
verifyReleaseChain();

console.log(`[Aldus Meta] Cadeia de release preparada para ${version}.`);
