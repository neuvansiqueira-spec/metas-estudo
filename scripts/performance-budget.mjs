import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const suffix = version.match(/v\d+$/)?.[0];
if (!suffix) throw new Error("A versão pública deve terminar em vNNN.");

const files = {
  html: "index.html",
  script: `app-${suffix}.js`,
  style: `app-${suffix}.css`,
  catalog: "pcpr-pcma-2026-catalog-v3.min.js"
};
const read = (file) => fs.readFileSync(path.join(root, file));
const text = (file) => read(file).toString("utf8");
const gzipSize = (file) => zlib.gzipSync(read(file), { level: 9 }).length;
const sourceCatalogSize = fs.statSync(path.join(root, "pcpr-pcma-2026-catalog.js")).size;

const metrics = {
  htmlRaw: read(files.html).length,
  htmlGzip: gzipSize(files.html),
  appJsRaw: read(files.script).length,
  appJsGzip: gzipSize(files.script),
  appCssRaw: read(files.style).length,
  appCssGzip: gzipSize(files.style),
  catalogRaw: read(files.catalog).length,
  catalogGzip: gzipSize(files.catalog)
};

const html = text(files.html);
const app = text(files.script);
const bootstrap = text("bootstrap-integrity-loader-v258-core.js");
const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
const stylesheets = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)];
const scriptPreloads = [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*\bas="script"[^>]*\bhref="([^"]+)"/g)];

const budgets = {
  htmlRaw: 125_000,
  htmlGzip: 30_000,
  appJsRaw: 2_200_000,
  appJsGzip: 520_000,
  appCssRaw: 500_000,
  appCssGzip: 80_000,
  catalogRaw: 1_100_000,
  catalogGzip: 110_000,
  stylesheets: 2,
  externalScripts: 18,
  scriptPreloads: 3
};

const failures = [];
const atMost = (label, actual, limit) => {
  if (actual > limit) failures.push(`${label}: ${actual} excede ${limit}`);
};

for (const key of ["htmlRaw", "htmlGzip", "appJsRaw", "appJsGzip", "appCssRaw", "appCssGzip", "catalogRaw", "catalogGzip"]) {
  atMost(key, metrics[key], budgets[key]);
}
atMost("folhas de estilo bloqueantes", stylesheets.length, budgets.stylesheets);
atMost("scripts externos do shell", externalScripts.length, budgets.externalScripts);
atMost("preloads de script", scriptPreloads.length, budgets.scriptPreloads);

for (const match of externalScripts) {
  if (!/\bdefer\b/.test(match[0])) failures.push(`script sem defer: ${match[1]}`);
}
if (!html.includes(`app-${suffix}.js?v=${version}`) || !html.includes(`app-${suffix}.css?v=${version}`)) {
  failures.push("HTML não aponta para os artefatos da versão pública atual");
}
if (!html.includes("pcpr-pcma-2026-catalog-v3.min.js?v=pcpr-pcma-2026-v3")) {
  failures.push("catálogo compacto não está antecipado pelo shell");
}
if (/Aldus source: pcpr-pcma-2026-catalog\.js/.test(app)) {
  failures.push("catálogo pesado voltou ao bundle crítico");
}
if (!/Aldus source: pcpr-pcma-2026-migration\.js/.test(app)) {
  failures.push("migração PCPR/PCMA saiu do bundle crítico");
}
if (metrics.catalogRaw >= sourceCatalogSize * 0.85) {
  failures.push("catálogo publicado perdeu a compactação mínima de 15%");
}
if (!/__ALDUS_BOOTSTRAP_STATE_V339__/.test(bootstrap) || !/await interactive;[\s\S]*waitForIdleAfterInteractive\(\)[\s\S]*loadScript\(\.\.\.CONTEST_CATALOG\)/.test(bootstrap)) {
  failures.push("bootstrap não preserva o handoff de estado e a ativação pós-interatividade");
}
if (/XMLHttpRequest|document\.write\(/.test(html)) failures.push("shell contém carregamento síncrono proibido");

for (const file of [files.html, files.script, files.style, files.catalog, "script.js", "service-worker.js", "bootstrap-integrity-loader-v258-core.js"]) {
  const publicFile = path.join(root, "docs", file);
  if (!fs.existsSync(publicFile) || !read(file).equals(fs.readFileSync(publicFile))) {
    failures.push(`${file} diverge da cópia publicada em docs`);
  }
}

console.table({
  "HTML bruto": metrics.htmlRaw,
  "HTML gzip": metrics.htmlGzip,
  "JS crítico bruto": metrics.appJsRaw,
  "JS crítico gzip": metrics.appJsGzip,
  "CSS crítico bruto": metrics.appCssRaw,
  "CSS crítico gzip": metrics.appCssGzip,
  "Catálogo bruto": metrics.catalogRaw,
  "Catálogo gzip": metrics.catalogGzip,
  "CSS bloqueantes": stylesheets.length,
  "Scripts externos": externalScripts.length,
  "Preloads de script": scriptPreloads.length
});

if (failures.length) {
  console.error("\nOrçamento de desempenho reprovado:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nOrçamento de desempenho aprovado.");
}
