import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const VERSION = "20260803-pastas-destino-temas-exatos-v232";
const PREVIOUS_SOURCE = "factory-destination-recursive-v230.js";
const NEXT_SOURCE = "factory-destination-recursive-v232.js";

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

function buildV232Source() {
  const previousPath = path.join(root, PREVIOUS_SOURCE);
  if (!fs.existsSync(previousPath)) throw new Error(`Arquivo-base ausente: ${PREVIOUS_SOURCE}`);

  let source = fs.readFileSync(previousPath, "utf8");
  source = source
    .replaceAll("20260803-pastas-destino-recursivas-v230", VERSION)
    .replaceAll("V230", "V232")
    .replaceAll("v230", "v232");

  const previousGuard = `    const existing = existingDestination(item);\n    const managed = isManagedDestination(item);\n    if (existing && !managed && !options.overwriteManual) return { changed: false, status: "manual-preserved", url: existing };`;
  const nextGuard = `    const existing = existingDestination(item);\n    const managed = isManagedDestination(item);\n    const preserveExisting = Boolean(existing && !managed && options.preserveExisting === true);\n    if (preserveExisting) return { changed: false, status: "manual-preserved", url: existing };`;
  if (!source.includes(previousGuard)) throw new Error("Proteção antiga de links manuais não encontrada.");
  source = source.replace(previousGuard, nextGuard);

  const assignmentMarker = `    item.factoryDestinationFolder = destinationUrl;`;
  const auditedAssignment = `    if (existing && existing !== destinationUrl) {\n      item.factoryDestinationFolderPreviousUrl = existing;\n      item.factoryDestinationFolderReplacedAt = new Date().toISOString();\n      item.factoryDestinationFolderReplacementReason = "tema-especifico-recursivo";\n    }\n    item.factoryDestinationFolder = destinationUrl;`;
  if (!source.includes(assignmentMarker)) throw new Error("Ponto de gravação do destino não encontrado.");
  source = source.replace(assignmentMarker, auditedAssignment);

  const refreshMarker = `return applyTree(tree, options);`;
  if (!source.includes(refreshMarker)) throw new Error("Aplicação da árvore recursiva não encontrada.");

  fs.writeFileSync(path.join(root, NEXT_SOURCE), source);
}

function updateBuildSources() {
  const buildPath = path.join(root, "build-bundles.mjs");
  let source = fs.readFileSync(buildPath, "utf8");
  if (!source.includes(`"${PREVIOUS_SOURCE}"`)) throw new Error("Módulo recursivo v230 não encontrado no build.");
  source = source.replaceAll(`"${PREVIOUS_SOURCE}"`, `"${NEXT_SOURCE}"`);
  fs.writeFileSync(buildPath, source);
}

function writeFocusedTest() {
  const testSource = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nimport vm from "node:vm";\n\nconst source = fs.readFileSync(new URL("../${NEXT_SOURCE}", import.meta.url), "utf8");\n\nfunction runtime() {\n  const context = { console, URLSearchParams, setTimeout: () => 0, clearTimeout, queueMicrotask, globalThis: null };\n  context.globalThis = context;\n  vm.createContext(context);\n  vm.runInContext(source, context);\n  return context;\n}\n\ntest("substitui link antigo da disciplina pelo link exato do tema em subpasta", () => {\n  const api = runtime();\n  const rootId = api.__FACTORY_DESTINATION_ROOT_V232__;\n  const tree = api.__buildFactoryDestinationTreeV232([\n    { id: "disciplina-dpp", name: "02_DIREITO_PROCESSUAL_PENAL", parents: [rootId] },\n    { id: "grupo-investigacao", name: "2.3_INVESTIGACAO_CRIMINAL", parents: ["disciplina-dpp"] },\n    { id: "tema-arquivamento", name: "2.3.7_ARQUIVAMENTO", parents: ["grupo-investigacao"] }\n  ], rootId);\n  const item = {\n    discipline: "DIREITO PROCESSUAL PENAL",\n    subject: "2.3.7 Arquivamento",\n    factoryDestinationFolder: "https://drive.google.com/drive/folders/disciplina-dpp"\n  };\n  const result = api.__applyFactoryDestinationToItemV232(item, tree);\n  assert.equal(result.status, "topic");\n  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/tema-arquivamento");\n  assert.equal(item.factoryDestinationFolderPreviousUrl, "https://drive.google.com/drive/folders/disciplina-dpp");\n  assert.match(item.factoryDestinationFolderMatchPath, /ARQUIVAMENTO/);\n});\n\ntest("somente preserva link antigo quando isso for solicitado explicitamente", () => {\n  const api = runtime();\n  const rootId = api.__FACTORY_DESTINATION_ROOT_V232__;\n  const tree = api.__buildFactoryDestinationTreeV232([\n    { id: "disciplina-dpp", name: "02_DIREITO_PROCESSUAL_PENAL", parents: [rootId] },\n    { id: "tema-arquivamento", name: "2.3.7_ARQUIVAMENTO", parents: ["disciplina-dpp"] }\n  ], rootId);\n  const item = { discipline: "DIREITO PROCESSUAL PENAL", subject: "2.3.7 Arquivamento", factoryDestinationFolder: "https://drive.google.com/drive/folders/antigo" };\n  const result = api.__applyFactoryDestinationToItemV232(item, tree, { preserveExisting: true });\n  assert.equal(result.status, "manual-preserved");\n  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/antigo");\n});\n`;
  fs.writeFileSync(path.join(root, "tests", "factory-destination-topic-links-v232.test.js"), testSource);
}

buildV232Source();
updateBuildSources();
updatePackageVersions();
writeFocusedTest();
console.log(`Versão ${VERSION} preparada com links específicos por tema e substituição dos destinos antigos.`);
