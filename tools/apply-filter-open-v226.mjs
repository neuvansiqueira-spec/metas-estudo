import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260803-corrige-abertura-filtros-v226";
const RUNTIME_FILE = "question-bank-filter-open-v226.js";

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(root, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function replaceRequired(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Marcador ausente para ${label}`);
  return source.replace(needle, replacement);
}

function updateVersions() {
  const packageJson = readJson("package.json");
  packageJson.version = VERSION;
  writeJson("package.json", packageJson);

  const packageLock = readJson("package-lock.json");
  packageLock.version = VERSION;
  if (packageLock.packages?.[""]) packageLock.packages[""].version = VERSION;
  writeJson("package-lock.json", packageLock);
}

function updateBuildSources() {
  const buildPath = path.join(root, "build-bundles.mjs");
  let source = fs.readFileSync(buildPath, "utf8");

  source = replaceRequired(
    source,
    '  "question-bank-filters-v225.js"\n];',
    '  "question-bank-filters-v225.js",\n  "question-bank-filter-open-v226.js"\n];',
    "fonte da abertura dos filtros v226"
  );

  source = replaceRequired(
    source,
    '    "/* Aldus source: question-bank-filters-v225.js */"\n  ];',
    '    "/* Aldus source: question-bank-filters-v225.js */",\n    "/* Aldus source: question-bank-filter-open-v226.js */"\n  ];',
    "marcador obrigatório da abertura dos filtros v226"
  );

  source = replaceRequired(
    source,
    '"question-bank-filters-v225.js"\n]) {',
    '"question-bank-filters-v225.js", "question-bank-filter-open-v226.js"\n]) {',
    "cópia da abertura dos filtros v226 para docs"
  );

  fs.writeFileSync(buildPath, source);
}

if (!fs.existsSync(path.join(root, RUNTIME_FILE))) {
  throw new Error(`Arquivo obrigatório ausente: ${RUNTIME_FILE}`);
}

updateVersions();
updateBuildSources();
console.log(`Versão ${VERSION} preparada com abertura estável dos filtros do treino.`);
