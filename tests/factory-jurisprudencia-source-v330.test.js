const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");
const JURISPRUDENCIA_FOLDER = "https://drive.google.com/drive/folders/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe";
const GENERAL_FOLDER = "https://drive.google.com/drive/folders/1BTUFtLBf6tuKG6kqWTRIrPT75cltdy-n";

function evaluateSourceRouting() {
  const start = source.indexOf("const FACTORY_DEFAULT_SOURCE_FOLDER");
  const end = source.indexOf("function factoryDestinationFolderLink", start);
  assert.ok(start >= 0 && end > start, "bloco de roteamento de fontes não localizado");

  const snippet = source.slice(start, end);
  const context = {
    normalizeFactoryModule(module = {}) {
      return { leiFonte: module?.leiFonte || "" };
    }
  };
  vm.createContext(context);
  new vm.Script(`${snippet}\n;globalThis.__result = {
    jurisprudencia: factorySourceFolderLink({ modules: { lei: { leiFonte: "https://example.com/fonte-personalizada" } } }, "jurisprudencia"),
    outroPersonalizado: factorySourceFolderLink({ modules: { lei: { leiFonte: "https://example.com/fonte-personalizada" } } }, "lei"),
    outroPadrao: factorySourceFolderLink({}, "resumoAula")
  };`).runInContext(context);
  return context.__result;
}

test("V330 fixa a pasta exclusiva somente no módulo Jurisprudência", () => {
  const result = evaluateSourceRouting();
  assert.equal(result.jurisprudencia, JURISPRUDENCIA_FOLDER);
  assert.equal(result.outroPersonalizado, "https://example.com/fonte-personalizada");
  assert.equal(result.outroPadrao, GENERAL_FOLDER);
});

test("V330 exige busca recursiva e impede falso resultado negativo", () => {
  assert.match(source, /percorra recursivamente a pasta indicada e todas as suas subpastas/);
  assert.match(source, /sem se limitar aos itens exibidos na primeira listagem/);
  assert.match(source, /CONTROLE DE RESULTADO NEGATIVO/);
  assert.match(source, /Falha de acesso, paginação incompleta, indexação vazia ou leitura parcial não autorizam concluir que inexiste jurisprudência/);
  assert.match(source, /REGRA FINAL E PREVALENTE — FONTE EXCLUSIVA DA JURISPRUDÊNCIA/);
});

test("V330 mantém a pasta geral disponível para os demais módulos", () => {
  assert.match(source, new RegExp(`const FACTORY_DEFAULT_SOURCE_FOLDER = "${GENERAL_FOLDER}"`));
  assert.match(source, new RegExp(`const FACTORY_JURISPRUDENCIA_SOURCE_FOLDER = "${JURISPRUDENCIA_FOLDER}"`));
  assert.match(source, /if \(type === "jurisprudencia"\) return FACTORY_JURISPRUDENCIA_SOURCE_FOLDER;/);
});
