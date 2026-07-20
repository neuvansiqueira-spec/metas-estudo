const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

test("status aprovado sem arquivo não é confundido com material disponível", () => {
  const context = {
    state: { materials: [] },
    normalizeFactoryModules: (modules = {}) => ({ resumoAula: { status: "Não iniciado", wordLink: "", pdfLink: "", ...(modules.resumoAula || {}) } }),
    factoryDestinationFolderLink: (item = {}) => item.factoryDestinationFolder || "",
    factoryResumoAulaStatusRequiresFile: (status) => ["Aprovado", "PDF gerado"].includes(status),
    isValidHttpUrl: (value) => /^https?:\/\//.test(value),
    materialAvailable: (material) => material?.available !== false,
    materialMatchesAssociation: () => false,
    factorySyllabusItemIds: () => []
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function factoryValidMaterialLink", "function factorySubjectAlreadyStudied"), context);

  assert.equal(context.factoryResumoAulaReady({ modules: { resumoAula: { status: "Aprovado" } } }), false);
  assert.equal(context.factoryResumoAulaReady({ modules: { resumoAula: { status: "Aprovado", wordLink: "https://drive.google.com/file/d/1" } } }), true);
  assert.equal(context.factoryResumoAulaReady({ factoryDestinationFolder: "https://drive.google.com/drive/folders/1", modules: { resumoAula: { status: "Aprovado" } } }), true);
});

test("links antigos da Fábrica são recuperados no módulo Resumo/Aula", () => {
  const context = {
    FACTORY_STATUSES: ["Não iniciado", "Aprovado", "PDF gerado"],
    FACTORY_MODULES: [{ key: "resumoAula" }, { key: "lei" }]
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function normalizeFactoryModule", "function factoryApplicableCompletionStatus"), context);
  const modules = context.normalizeFactoryModules({}, { status: "Aprovado", finalLink: "https://drive.google.com/file/d/arquivo-word" });
  assert.equal(modules.resumoAula.status, "Aprovado");
  assert.equal(modules.resumoAula.wordLink, "https://drive.google.com/file/d/arquivo-word");
  assert.equal(modules.lei.wordLink, "");
});

test("material concluído na pasta da Fábrica é propagado ao resolvedor de metas", () => {
  const sync = sourceBetween("function syncFactoryModuleMaterials", "function syncAllFactoryMaterials");
  assert.match(sync, /factoryResumoAulaFolderMaterialLink\(normalized\)/);
  assert.match(sync, /factoryFormat: folderFormat/);
  assert.match(sync, /factoryModuleKey: "resumoAula"/);
  assert.match(sync, /syllabusItemIds/);
  assert.match(sync, /available: true/);
  assert.match(script, /goal\.materialIds = \[\.\.\.new Set\(targetState\.materials\.filter\(materialAvailable\)/);
});

test("Faça Agora usa destaque discreto e os painéis não prendem a rolagem", () => {
  const style = read("style.css");
  const contrast = read("aldus-contrast-system-v68.css");
  const doNow = contrast.slice(contrast.indexOf("#view-fabrica-resumos .factory-do-now > summary"));
  assert.match(doNow, /background: linear-gradient\(90deg, #174a70, #123f61\)/);
  assert.doesNotMatch(doNow.split("}")[0], /background: #f2c94c/);
  assert.match(style, /\.factory-collapsible[\s\S]*overflow: clip/);
  assert.match(style, /V84: a roda do mouse continua a rolagem da página/);
  assert.match(style, /#view-fabrica-resumos \.factory-collapsible-content[\s\S]*overscroll-behavior-y: auto/);
  assert.match(style, /\.screen-stage,[\s\S]*\.side-nav[\s\S]*overscroll-behavior-y: auto/);
});

test("V84 renova o cache e mantém raiz e publicação em paridade", () => {
  const version = "20260720-cronometro-mobile-v86";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-grafico-tempo-contraste-v83"/);
  for (const file of ["script.js", "index.html", "style.css", "aldus-contrast-system-v68.css", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
