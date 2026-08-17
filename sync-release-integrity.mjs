import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appVersion = metadata.version;
const cacheVersion = metadata.aldusCacheVersion || appVersion;
const releaseSuffix = appVersion.match(/v\d+$/)?.[0] || "current";

if (!cacheVersion || !/v\d+$/.test(cacheVersion)) {
  throw new Error("aldusCacheVersion deve existir e terminar em vNNN.");
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function replaceRequired(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source && !source.includes(typeof replacement === "string" ? replacement : "")) {
    throw new Error(`Não foi possível sincronizar ${label}.`);
  }
  return next;
}

function syncIndex(relativePath) {
  let source = read(relativePath);
  source = source
    .replace(/app-v\d+\.css\?v=[^"]+/g, `app-${releaseSuffix}.css?v=${cacheVersion}`)
    .replace(/app-v\d+\.js\?v=[^"]+/g, `app-${releaseSuffix}.js?v=${cacheVersion}`);
  write(relativePath, source);
}

function syncBootstrapCore(relativePath, active = false) {
  let source = read(relativePath);
  source = source.replace(
    /\["aldusAppBundleScript", "app-v\d+\.js\?v=[^"]+"\]/,
    `["aldusAppBundleScript", "app-${releaseSuffix}.js?v=${cacheVersion}"]`
  );
  if (!source.includes(`app-${releaseSuffix}.js?v=${cacheVersion}`)) {
    throw new Error(`Bundle atual ausente de ${relativePath}.`);
  }
  if (active) {
    source = replaceRequired(
      source,
      /const VERSION = "[^"]+";/,
      `const VERSION = ${JSON.stringify(cacheVersion)};`,
      `VERSION de ${relativePath}`
    );
    source = replaceRequired(
      source,
      /const FALLBACK_CORE = [^;]+;/,
      'const FALLBACK_CORE = `bootstrap-integrity-loader-v258-core.js?v=${VERSION}&fallback=v345`;',
      `fallback de ${relativePath}`
    );
  }
  write(relativePath, source);
}

function syncFirstVersion(relativePath) {
  const source = read(relativePath);
  const next = replaceRequired(
    source,
    /const VERSION = "[^"]+";/,
    `const VERSION = ${JSON.stringify(cacheVersion)};`,
    `VERSION de ${relativePath}`
  );
  write(relativePath, next);
}

function syncServiceWorker(relativePath) {
  let source = read(relativePath);
  for (const constant of ["CURRENT_VERSION", "PROTECTION_VERSION", "BOOTSTRAP_VERSION"]) {
    source = replaceRequired(
      source,
      new RegExp(`const ${constant} = "[^"]+";`),
      `const ${constant} = ${JSON.stringify(cacheVersion)};`,
      `${constant} de ${relativePath}`
    );
  }
  write(relativePath, source);
}

syncIndex("index.html");
syncIndex(path.join("docs", "index.html"));

syncBootstrapCore("bootstrap-integrity-loader-v258-core.js");
fs.copyFileSync(path.join(root, "bootstrap-integrity-loader-v258-core.js"), path.join(root, "docs", "bootstrap-integrity-loader-v258-core.js"));

syncBootstrapCore("bootstrap-integrity-loader-v345-core.js", true);
fs.copyFileSync(path.join(root, "bootstrap-integrity-loader-v345-core.js"), path.join(root, "docs", "bootstrap-integrity-loader-v345-core.js"));

syncFirstVersion("bootstrap-integrity-loader-v275.js");
fs.copyFileSync(path.join(root, "bootstrap-integrity-loader-v275.js"), path.join(root, "docs", "bootstrap-integrity-loader-v275.js"));

syncFirstVersion("catastrophic-state-guard-v275.js");
fs.copyFileSync(path.join(root, "catastrophic-state-guard-v275.js"), path.join(root, "docs", "catastrophic-state-guard-v275.js"));

syncServiceWorker("service-worker.js");
fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, "docs", "service-worker.js"));

for (const suffix of [releaseSuffix, "v168", "v169", "v332"]) {
  for (const relativePath of [`service-worker-${suffix}.js`, path.join("docs", `service-worker-${suffix}.js`)]) {
    fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, relativePath));
  }
}

console.log(`[Aldus] release íntegro: app=${appVersion} cache=${cacheVersion}`);
