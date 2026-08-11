"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const batchSource = fs.readFileSync(path.join(root, "duplicate-diagnostics-batch-v305.js"), "utf8");

assert.match(indexSource, /aldus-entry-bootstrap-v305/, "a entrada deve identificar o bootstrap V305");
assert.match(indexSource, /docs\/index\.html\?aldusEntry=/, "a entrada deve carregar o shell completo fora do cache estático antigo");
assert.match(indexSource, /duplicate-diagnostics-batch-v305\.js\?v=20260811-duplicate-batch-commit-v305/, "o shell deve receber diretamente o lote V305");
assert.match(indexSource, /duplicate-diagnostics-batch-v\(\?:302\|303\|304\|305\)/, "a entrada deve remover handlers antigos antes de inserir o V305");
assert.doesNotMatch(indexSource, /src=["']duplicate-diagnostics-batch-v304\.js/, "a página de entrada não pode carregar V304 diretamente");
assert.match(batchSource, /window\.addEventListener\("click", applyBatch, true\)/, "V305 deve interceptar a confirmação antes de listeners antigos no document");
assert.match(batchSource, /setStatus\(root, "V305:/, "as mensagens do fluxo ativo devem identificar V305");

console.log("v305 entry bootstrap: covered");
