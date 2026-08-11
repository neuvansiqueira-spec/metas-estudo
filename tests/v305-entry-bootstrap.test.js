"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const batchSource = fs.readFileSync(path.join(root, "duplicate-diagnostics-batch-v305.js"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const docsWorkerSource = fs.readFileSync(path.join(root, "docs", "service-worker.js"), "utf8");
const docsIndexSource = fs.readFileSync(path.join(root, "docs", "index.html"), "utf8");

assert.match(indexSource, /aldus-entry-bootstrap-v306/, "a entrada deve identificar a recuperação de parser V306");
assert.match(indexSource, /20260811-entry-parser-recovery-v306/, "a entrada deve renovar o carregamento após o defeito V305");
assert.match(indexSource, /docs\/index\.html\?aldusEntry=/, "a entrada deve carregar o shell completo fora do cache estático antigo");
assert.match(indexSource, /const BATCH_VERSION = "20260811-duplicate-batch-commit-v305"/, "a entrada deve fixar a versão autoritativa V305");
assert.match(indexSource, /duplicate-diagnostics-batch-v305\.js\?v=\$\{BATCH_VERSION\}/, "o shell deve receber diretamente o lote V305");
assert.match(indexSource, /duplicate-diagnostics-batch-v\(\?:302\|303\|304\|305\)/, "a entrada deve remover handlers antigos antes de inserir o V305");
assert.doesNotMatch(indexSource, /src=["']duplicate-diagnostics-batch-v304\.js/, "a página de entrada não pode carregar V304 diretamente");
assert.match(docsIndexSource, /aldusDuplicateBatchAuthoritativeV305/, "o shell publicado deve apontar diretamente para o handler V305");
assert.doesNotMatch(docsIndexSource, /src=["']duplicate-diagnostics-batch-v304\.js/, "o shell publicado não pode depender do handler V304");
assert.match(batchSource, /window\.addEventListener\("click", applyBatch, true\)/, "V305 deve interceptar a confirmação antes de listeners antigos no document");
assert.match(batchSource, /setStatus\(root, "V305:/, "as mensagens do fluxo ativo devem identificar V305");

const inlineScript = indexSource.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1] || "";
assert.ok(inlineScript, "o bootstrap inline deve ser localizável");
assert.doesNotMatch(inlineScript, /<\/head>/i, "o worker antigo não pode confundir um fechamento de head dentro do JavaScript");
assert.doesNotMatch(inlineScript, /<\/body>/i, "o worker antigo não pode confundir um fechamento de body dentro do JavaScript");
assert.doesNotThrow(() => new vm.Script(inlineScript), "o bootstrap V306 deve continuar sintaticamente válido");

assert.match(workerSource, /function injectBeforeFinalClosingTag\(/, "o worker deve injetar no último fechamento real");
assert.match(workerSource, /lastIndexOf\(marker\)/, "o worker deve selecionar a última tag de fechamento");
assert.doesNotMatch(workerSource, /\.replace\("<\/(?:head|body)>"/, "o worker não pode voltar a substituir a primeira tag de fechamento");
assert.match(workerSource, /entry-parser-recovery-v306/, "o cache deve ser renovado para a recuperação V306");
assert.equal(workerSource, docsWorkerSource, "o worker da raiz e o publicado em docs devem permanecer idênticos");

console.log("v306 entry parser recovery: covered");
