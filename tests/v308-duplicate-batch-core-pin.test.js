"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const diagnostics = require("../duplicate-diagnostics-v304.js");
const batch = require("../duplicate-diagnostics-batch-v305.js");

const previousPinned = globalThis.AldusDuplicateDiagnosticsV304;
const previousCompatibility = globalThis.AldusDuplicateDiagnosticsV260;

try {
  globalThis.AldusDuplicateDiagnosticsV304 = diagnostics;
  globalThis.AldusDuplicateDiagnosticsV260 = Object.freeze({
    VERSION: "20260806-duplicate-diagnostics-v260",
    diagnoseState() { return { pairs: [] }; },
    recommendedBatchPlan() { return { actions: [] }; }
  });

  assert.equal(
    batch.diagnosticsApi(),
    diagnostics,
    "a confirmação deve permanecer no núcleo V304 que produziu a prévia, mesmo após o V260 sobrescrever o alias legado"
  );

  delete globalThis.AldusDuplicateDiagnosticsV304;
  assert.equal(
    batch.diagnosticsApi(),
    null,
    "o executor deve bloquear o núcleo V260 em vez de transformar uma prévia válida em lote vazio"
  );
} finally {
  if (previousPinned === undefined) delete globalThis.AldusDuplicateDiagnosticsV304;
  else globalThis.AldusDuplicateDiagnosticsV304 = previousPinned;
  if (previousCompatibility === undefined) delete globalThis.AldusDuplicateDiagnosticsV260;
  else globalThis.AldusDuplicateDiagnosticsV260 = previousCompatibility;
}

const root = path.join(__dirname, "..");
const coreSource = fs.readFileSync(path.join(root, "duplicate-diagnostics-v304.js"), "utf8");
const batchSource = fs.readFileSync(path.join(root, "duplicate-diagnostics-batch-v305.js"), "utf8");
const bootstrapSource = fs.readFileSync(path.join(root, "bootstrap-integrity-loader-v275.js"), "utf8");
const docsBootstrapSource = fs.readFileSync(path.join(root, "docs", "bootstrap-integrity-loader-v275.js"), "utf8");
const legacyCoreSource = fs.readFileSync(path.join(root, "duplicate-diagnostics-v260.js"), "utf8");
const docsLegacyCoreSource = fs.readFileSync(path.join(root, "docs", "duplicate-diagnostics-v260.js"), "utf8");

assert.match(coreSource, /globalThis\.AldusDuplicateDiagnosticsV304 = API/, "o núcleo correto deve publicar um identificador imutável por geração");
assert.match(batchSource, /globalThis\.AldusDuplicateDiagnosticsV304/, "o lote deve consultar primeiro o núcleo fixado");
assert.match(batchSource, /compatible\?\.VERSION === EXPECTED_API_VERSION/, "o alias legado só pode ser usado quando for a mesma versão da prévia");
assert.match(bootstrapSource, /modernDiagnostics\?\.VERSION === "20260811-duplicate-batch-performance-v304"/, "o bootstrap deve dispensar a injeção do V260 quando o núcleo correto já estiver ativo");
assert.match(legacyCoreSource, /if \(!globalThis\.AldusDuplicateDiagnosticsV304\)/, "o fallback V260 não pode sobrescrever o núcleo fixado se terminar de carregar depois");
assert.equal(bootstrapSource, docsBootstrapSource, "o bootstrap raiz e o publicado devem permanecer idênticos");
assert.equal(legacyCoreSource, docsLegacyCoreSource, "o fallback V260 raiz e o publicado devem permanecer idênticos");

console.log("v308 duplicate batch core pin: covered");
