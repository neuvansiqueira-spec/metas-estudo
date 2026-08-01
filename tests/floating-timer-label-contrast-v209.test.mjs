import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rootModule = readFileSync("floating-timer-label-contrast-v209.js", "utf8");
const docsModule = readFileSync("docs/floating-timer-label-contrast-v209.js", "utf8");
const rootRuntime = readFileSync("runtime-entry-v200.js", "utf8");
const docsRuntime = readFileSync("docs/runtime-entry-v200.js", "utf8");
const rootWorker = readFileSync("service-worker-v169.js", "utf8");
const docsWorker = readFileSync("docs/service-worker-v169.js", "utf8");

assert.equal(rootModule, docsModule, "O módulo visual deve permanecer espelhado em docs.");
assert.match(rootModule, /#floatingTimer \.floating-timer-label/);
assert.match(rootModule, /var\(--accent-strong, #a77d25\)/);
assert.match(rootModule, /font-weight: 900/);
assert.doesNotMatch(rootModule, /color:\s*(?:#000|#000000|black)\b/i);

assert.equal(rootRuntime, docsRuntime, "O runtime deve permanecer espelhado em docs.");
assert.match(rootRuntime, /ALDUS_V209_TIMER_LABEL_MODULE/);
assert.match(rootRuntime, /floating-timer-label-contrast-v209\.js/);
assert.match(rootRuntime, /ALDUS_V209_TIMER_LABEL_MARKER/);

assert.equal(rootWorker, docsWorker, "O service worker deve permanecer espelhado em docs.");
assert.match(rootWorker, /20260731-contraste-titulo-cronometro-v209/);

console.log("floating-timer-label-contrast-v209: 11 verificações aprovadas");
