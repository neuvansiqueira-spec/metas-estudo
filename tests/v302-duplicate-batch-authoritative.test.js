"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const hotfix = require("../duplicate-diagnostics-batch-v302.js");

const runtime = { syllabusItems: [{ id: "keep" }, { id: "remove" }], audit: [] };
const identity = runtime;
hotfix.replaceStateContents(runtime, { syllabusItems: [{ id: "keep" }], audit: [{ action: "consolidated" }] });
assert.equal(runtime, identity, "deve manter a referência consumida pelo aplicativo");
assert.deepEqual(runtime.syllabusItems.map((item) => item.id), ["keep"], "deve aplicar o estado consolidado");

const removedIds = hotfix.removedIdsFromPlan({ actions: [{ removedId: "remove" }, { removedId: "remove-2" }] });
assert.deepEqual([...removedIds], ["remove", "remove-2"], "deve identificar todos os IDs removidos pelo lote");
assert.deepEqual(hotfix.remainingRemovedIds({ syllabusItems: [{ id: "keep" }, { id: "remove-2" }] }, removedIds), ["remove-2"], "deve detectar item recriado após a gravação");
assert.deepEqual(hotfix.remainingRemovedIds({ syllabusItems: [{ id: "keep" }] }, removedIds), [], "deve aprovar somente quando todos os removidos desaparecerem");

const source = fs.readFileSync(path.join(__dirname, "..", "duplicate-diagnostics-batch-v302.js"), "utf8");
assert.match(source, /document\.addEventListener\("click", applyBatch, true\)/, "deve interceptar a confirmação antes da rotina antiga");
assert.match(source, /stopImmediatePropagation\(\)/, "deve impedir a execução concorrente da V300/V301");
assert.match(source, /await readMainIndexedDB\(\)/, "deve validar o conteúdo realmente gravado");
assert.doesNotMatch(source, /window\.location\.reload/, "não deve fechar o diagnóstico por recarregamento");

console.log("v302 duplicate batch authoritative: covered");
