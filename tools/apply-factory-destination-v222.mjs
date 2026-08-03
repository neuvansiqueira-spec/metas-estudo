import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260803-pastas-destino-fabrica-v222";
const CATALOG_SOURCE = "factory-destination-catalog-v222.js";
const MIGRATION_SOURCE = "factory-destination-folders-v222.js";

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(root, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function updatePackageVersions() {
  const packageJson = readJson("package.json");
  packageJson.version = VERSION;
  writeJson("package.json", packageJson);

  const lockPath = path.join(root, "package-lock.json");
  if (fs.existsSync(lockPath)) {
    const lock = readJson("package-lock.json");
    lock.version = VERSION;
    if (lock.packages?.[""]) lock.packages[""].version = VERSION;
    writeJson("package-lock.json", lock);
  }
}

function insertAfter(source, marker, addition) {
  if (source.includes(addition.trim())) return source;
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`Marcador não encontrado: ${marker}`);
  const position = index + marker.length;
  return `${source.slice(0, position)}${addition}${source.slice(position)}`;
}

function updateBuildSources() {
  const buildPath = path.join(root, "build-bundles.mjs");
  let source = fs.readFileSync(buildPath, "utf8");
  source = insertAfter(
    source,
    '  "script.js",',
    `\n  "${CATALOG_SOURCE}",\n  "${MIGRATION_SOURCE}",`
  );
  source = insertAfter(
    source,
    '  "index.html", "app-version.js", "style.css", "script.js", "service-worker.js", "sync-integral-core.js",',
    `\n  "${CATALOG_SOURCE}", "${MIGRATION_SOURCE}",`
  );
  fs.writeFileSync(buildPath, source);
}

function normalizeEditalCodes() {
  const migrationPath = path.join(root, MIGRATION_SOURCE);
  let source = fs.readFileSync(migrationPath, "utf8");
  const previous = '    return match ? match[1].replace(/[._-]+/g, ".") : "";';
  const next = '    if (!match) return "";\n    return match[1].split(/[._-]+/).map((part) => String(Number(part))).join(".");';
  if (source.includes(previous)) source = source.replace(previous, next);
  if (!source.includes('map((part) => String(Number(part))).join(".")')) {
    throw new Error("Não foi possível normalizar os códigos do edital.");
  }
  fs.writeFileSync(migrationPath, source);
}

function validateRequiredFiles() {
  for (const filename of [CATALOG_SOURCE, MIGRATION_SOURCE]) {
    if (!fs.existsSync(path.join(root, filename))) throw new Error(`Arquivo obrigatório ausente: ${filename}`);
  }
}

validateRequiredFiles();
normalizeEditalCodes();
updatePackageVersions();
updateBuildSources();
console.log(`Versão ${VERSION} preparada com o catálogo de pastas da Fábrica.`);
