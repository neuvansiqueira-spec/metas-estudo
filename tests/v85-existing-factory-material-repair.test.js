const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function bodyOf(name) {
  const start = script.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Função ausente: ${name}`);
  let depth = 0;
  let opened = false;
  for (let index = script.indexOf("{", start); index < script.length; index += 1) {
    if (script[index] === "{") { depth += 1; opened = true; }
    if (script[index] === "}") depth -= 1;
    if (opened && depth === 0) return script.slice(start, index + 1);
  }
  throw new Error(`Corpo incompleto: ${name}`);
}

test("V85 reprocessa uma vez os materiais já salvos e seus vínculos com metas", () => {
  const repair = bodyOf("repairExistingFactoryMaterialLinksV85");
  assert.match(script, /FACTORY_MATERIAL_LINK_REPAIR_MIGRATION_V85 = "factoryMaterialLinkRepairV85"/);
  assert.match(repair, /syncFactoryMaterialsPlanningV80\(targetState\)/);
  assert.match(repair, /linkedGoals: report\.linkedGoals/);
  assert.match(repair, /linkedMaterials: report\.linkedMaterials/);
  assert.match(repair, /skipped: false/);
});

test("reparo V85 ocorre na abertura antes da renderização e é persistido", () => {
  const repairCall = script.indexOf("repairExistingFactoryMaterialLinksV85(state)");
  const renderCall = script.indexOf("renderMotivationalPhrase()", repairCall);
  assert.ok(repairCall > 0);
  assert.ok(renderCall > repairCall);
  assert.match(script.slice(repairCall, renderCall), /saveData\(\{ markLocalChange: true \}\)/);
});

test("V85 renova o cache, reconhece V84 e preserva a publicação em paridade", () => {
  const version = "20260720-mensagem-motivacional-v87";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-fabrica-materiais-rolagem-v84"/);
  for (const file of ["script.js", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
