import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260803-treino-em-andamento-v223";
const RUNTIME_FILE = "question-bank-training-v223.js";

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(root, filename), `${JSON.stringify(value, null, 2)}\n`);
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

function insertOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Marcador ausente para ${label}`);
  return source.replace(needle, replacement);
}

function updateBuildSources() {
  const buildPath = path.join(root, "build-bundles.mjs");
  let source = fs.readFileSync(buildPath, "utf8");

  source = insertOnce(
    source,
    '  "question-scoring-rule-v142.js"\n];',
    '  "question-scoring-rule-v142.js",\n  "question-bank-training-v223.js"\n];',
    "fonte JavaScript do treino"
  );

  source = insertOnce(
    source,
    '    "/* Aldus runtime source: question-history-tone-v216.js */"\n  ];',
    '    "/* Aldus runtime source: question-history-tone-v216.js */",\n    "/* Aldus source: question-bank-training-v223.js */"\n  ];',
    "validação do bundle do treino"
  );

  source = insertOnce(
    source,
    '  "question-history-tone-v216.js"\n]) {',
    '  "question-history-tone-v216.js", "question-bank-training-v223.js"\n]) {',
    "cópia do runtime do treino para docs"
  );

  fs.writeFileSync(buildPath, source);
}

if (!fs.existsSync(path.join(root, RUNTIME_FILE))) {
  throw new Error(`Arquivo obrigatório ausente: ${RUNTIME_FILE}`);
}

updateVersions();
updateBuildSources();
console.log(`Versão ${VERSION} preparada com melhorias do Treino em andamento.`);
