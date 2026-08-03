import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260803-pastas-destino-recursivas-v230";
const SOURCE = "factory-destination-recursive-v230.js";
const EXTRA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";

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

function updateGoogleDriveScope() {
  const scriptPath = path.join(root, "script.js");
  let source = fs.readFileSync(scriptPath, "utf8");
  source = source.replace(
    /const GOOGLE_DRIVE_SCOPE = "([^"]+)";/,
    (_match, currentScope) => {
      const scopes = new Set(String(currentScope).split(/\s+/).filter(Boolean));
      scopes.add(EXTRA_SCOPE);
      return `const GOOGLE_DRIVE_SCOPE = "${[...scopes].join(" ")}";`;
    }
  );
  if (!source.includes(EXTRA_SCOPE)) throw new Error("Não foi possível habilitar a leitura segura da estrutura de pastas do Drive.");
  fs.writeFileSync(scriptPath, source);
}

function disableLegacyDisciplineFallback() {
  const legacyPath = path.join(root, "factory-destination-folders-v222.js");
  let source = fs.readFileSync(legacyPath, "utf8");
  const previous = `    const topicMatch = resolveTopic(item, disciplineMatch.entry);\n    const destination = topicMatch?.folder || disciplineMatch.entry.folder;\n    const matchType = topicMatch ? "topic" : "discipline-fallback";\n    const matchScore = Math.round(topicMatch?.score || disciplineMatch.score || 0);`;
  const next = `    const topicMatch = resolveTopic(item, disciplineMatch.entry);\n    if (!topicMatch?.folder?.url) return { changed: false, status: "topic-unmatched" };\n    const destination = topicMatch.folder;\n    const matchType = "topic";\n    const matchScore = Math.round(topicMatch.score || 0);`;
  if (source.includes(previous)) source = source.replace(previous, next);
  if (!source.includes('status: "topic-unmatched"')) throw new Error("Não foi possível remover o fallback legado por disciplina.");
  fs.writeFileSync(legacyPath, source);
}

function updateBuildSources() {
  const buildPath = path.join(root, "build-bundles.mjs");
  let source = fs.readFileSync(buildPath, "utf8");
  if (!source.includes(`"${SOURCE}"`)) {
    const jsMarker = '  "factory-destination-folders-v222.js",';
    if (!source.includes(jsMarker)) throw new Error("Marcador do módulo v222 não encontrado no build.");
    source = source.replace(jsMarker, `${jsMarker}\n  "${SOURCE}",`);

    const inventoryMarker = '"factory-destination-catalog-v222.js", "factory-destination-folders-v222.js",';
    if (source.includes(inventoryMarker)) {
      source = source.replace(inventoryMarker, `${inventoryMarker} "${SOURCE}",`);
    }
  }
  fs.writeFileSync(buildPath, source);
}

function validateSource() {
  if (!fs.existsSync(path.join(root, SOURCE))) throw new Error(`Arquivo obrigatório ausente: ${SOURCE}`);
}

validateSource();
disableLegacyDisciplineFallback();
updateGoogleDriveScope();
updatePackageVersions();
updateBuildSources();
console.log(`Versão ${VERSION} preparada com busca recursiva das pastas de destino.`);
