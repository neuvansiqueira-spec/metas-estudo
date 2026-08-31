const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");

test("V415 agrupa o hardening de DOM fora do caminho crítico", () => {
  const source = read("security-hardening-v296.js");
  assert.equal(source, read("docs/security-hardening-v296.js"));
  assert.match(source, /20260831-security-dom-batch-v415/);
  assert.match(source, /new MutationObserver\(scheduleMutationHardening\)/);
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /pendingAddedRoots/);
  assert.match(source, /roots\.length > 24/);
  assert.match(source, /function guardLinkClick/);
  assert.match(source, /hardenAnchor\(anchor\)/);
  assert.doesNotMatch(source, /new MutationObserver\(\(records\) =>/);
});

test("V415 renova somente a entrega do hardening e preserva o runtime atual", () => {
  const worker = read("service-worker.js");
  assert.equal(worker, read("docs/service-worker.js"));
  assert.equal(worker, read("service-worker-v413.js"));
  assert.equal(worker, read("docs/service-worker-v413.js"));
  assert.match(worker, /const CURRENT_VERSION = "20260831-core-daily-plan-consistency-v413";/);
  assert.match(worker, /const SECURITY_VERSION = "20260831-security-dom-batch-v415";/);
  assert.match(worker, /security-dom-batch-v415/);
  assert.match(worker, /cache\.addAll\(ESSENTIAL_ASSETS\)/);
  assert.match(worker, /async function cacheFirstStatic/);
});
