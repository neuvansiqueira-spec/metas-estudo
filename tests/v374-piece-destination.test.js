const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function runtime() {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  new vm.Script(fs.readFileSync("factory-destination-catalog-v222.js", "utf8")).runInContext(context);
  new vm.Script(fs.readFileSync("factory-destination-folders-v222.js", "utf8")).runInContext(context);
  return context;
}

test("V374 registra as quatro pastas destino das Peças práticas", () => {
  const context = runtime();
  const catalog = context.__FACTORY_DESTINATION_CATALOG_V222__;
  const discipline = catalog.disciplines.find((entry) => entry.key === "peca-delegado");
  assert.ok(discipline, "disciplina Peças de Delegado deve existir");

  const cases = [
    ["Auto de Prisão em Flagrante / Despacho Pós-Flagrante", "1KAViWr87FG36-8Rf2yAY53qcSz4oi5_x"],
    ["Relatório Final de Inquérito Policial", "1soFUju6bL7hoMMqDtpV_PyoRTF1421GN"],
    ["Representação por Prisão Preventiva", "1BN-Ufub9KOePMlJr0npbunSAoRaHa8vj"],
    ["Representação por Prisão Temporária", "1aMkj7Z_3Hwmckr3RAy0S91Zq6rCbQK1S"]
  ];

  for (const [assunto, folderId] of cases) {
    const item = { disciplina: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL", assunto };
    const result = context.__applyFactoryDestinationToItemV222(item, catalog);
    assert.equal(result.status, "topic", assunto);
    assert.equal(item.factoryDestinationFolder, `https://drive.google.com/drive/folders/${folderId}`, assunto);
  }
});
