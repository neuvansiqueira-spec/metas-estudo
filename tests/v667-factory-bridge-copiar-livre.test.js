const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const rootScript = fs.readFileSync("factory-drive-bridge-v630.js", "utf8");
const docsScript = fs.readFileSync("docs/factory-drive-bridge-v630.js", "utf8");
const rootHtml = fs.readFileSync("index.html", "utf8");

test("V667 mantém o bridge espelhado e com versão nova no index", () => {
  assert.equal(rootScript, docsScript);
  assert.match(rootHtml, /factory-drive-bridge-v630\.js\?v=20261013-factory-drive-bridge-v630-copiar-livre-v667/);
});

test("V667 libera o Copiar quando outro prompt é gerado durante a busca da TRIAGEM", () => {
  assert.match(rootScript, /const buscando = new Map\(\)/);
  assert.match(rootScript, /if \(type !== "triagem"\) \{[\s\S]*?if \(buscando\.has\(id\)\) setPromptBusy\(id, false\);/);
});

test("V667 não anexa o pacote da TRIAGEM ao prompt de outro módulo", () => {
  assert.match(rootScript, /\/\^MÓDULO: TRIAGEM\\\.\/m\.test/);
  assert.match(rootScript, /cache\.set\(key, result\);\s*\/\/[^\n]*\n\s*if \(!aindaETriagem\(id, key\)\) return;\s*appendPackage\(id, result\);/);
});
