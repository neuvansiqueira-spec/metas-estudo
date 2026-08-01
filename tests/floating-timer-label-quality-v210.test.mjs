import assert from "node:assert/strict";
import fs from "node:fs";

const root = fs.readFileSync("floating-timer-label-quality-v210.js", "utf8");
const docs = fs.readFileSync("docs/floating-timer-label-quality-v210.js", "utf8");
const runtime = fs.readFileSync("runtime-entry-v200.js", "utf8");
const serviceWorker = fs.readFileSync("service-worker-v169.js", "utf8");

assert.equal(root, docs, "raiz e docs devem permanecer idênticos");
assert.match(root, /#floatingTimer \.floating-timer-label/);
assert.match(root, /color: var\(--primary-dark, #09264a\) !important/);
assert.match(root, /text-shadow: none !important/);
assert.match(root, /text-transform: none !important/);
assert.match(root, /letter-spacing: \.01em !important/);
assert.match(root, /border: 1px solid rgba\(167, 125, 37, \.42\)/);
assert.doesNotMatch(root, /text-transform: uppercase/);
assert.doesNotMatch(root, /0 1px 0 rgba/);
assert.match(runtime, /ALDUS_V210_TIMER_LABEL_MODULE/);
assert.match(runtime, /floating-timer-label-quality-v210\.js/);
assert.match(runtime, /ALDUS_V210_VERSION/);
assert.match(serviceWorker, /refina-titulo-cronometro-v210/);

console.log("4\/4 testes V210 aprovados");
