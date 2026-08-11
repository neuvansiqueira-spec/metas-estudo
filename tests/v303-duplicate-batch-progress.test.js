"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const hotfix = require("../duplicate-diagnostics-batch-v303.js");

const source = fs.readFileSync(path.join(__dirname, "..", "duplicate-diagnostics-batch-v303.js"), "utf8");
assert.equal(hotfix.VERSION, "20260810-duplicate-recommendations-v303");
assert.match(source, /for \(let index = 0; index < plan\.actions\.length; index \+= 1\)/, "o lote deve permitir atualização progressiva");
assert.match(source, /processando \$\{index \+ 1\} de \$\{plan\.actions\.length\}/, "deve informar o progresso do lote");
assert.match(source, /await yieldToBrowser\(\)/, "deve devolver controle ao navegador durante lotes maiores");
assert.match(source, /await readMainIndexedDB\(\)/, "deve manter a verificação autoritativa pós-gravação");
assert.doesNotMatch(source, /window\.location\.reload/, "não deve fechar o diagnóstico após o lote");

console.log("v303 duplicate batch progress: covered");
