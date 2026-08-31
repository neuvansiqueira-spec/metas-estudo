const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");
const packageVersion = JSON.parse(read("package.json")).version;
const releaseSuffix = packageVersion.match(/v\d+$/)?.[0] || "current";

test("V416 deixa o texto da meta semanal sob domínio exclusivo da aplicação", () => {
  const source = read("security-hardening-v296.js");
  assert.equal(source, read("docs/security-hardening-v296.js"));
  assert.match(source, /20260831-weekly-status-stability-v416/);
  assert.doesNotMatch(source, /simplifyWeeklyGoalStatus/);
  assert.doesNotMatch(source, /weeklyStatusNeedsRefresh/);
  assert.doesNotMatch(source, /isWeeklyStatusMutation/);
  assert.doesNotMatch(source, /registradas\\b/);
  assert.match(source, /new MutationObserver\(scheduleMutationHardening\)/);
  assert.match(source, /requestIdleCallback/);
});

test("release atual canoniza a URL do hardening no HTML sem remover defer", () => {
  const worker = read("service-worker.js");
  assert.equal(worker, read("docs/service-worker.js"));
  assert.equal(worker, read(`service-worker-${releaseSuffix}.js`));
  assert.equal(worker, read(`docs/service-worker-${releaseSuffix}.js`));
  assert.match(worker, /const SECURITY_VERSION = "20260831-weekly-status-stability-v416";/);
  assert.match(worker, /security-weekly-status-stability-v416/);
  assert.match(worker, /function installSecurityHardeningV296\(html\)/);
  assert.ok(worker.includes("security-hardening-v296\\.js"));
  assert.match(worker, /aldusSecurityHardeningV296" defer src=/);
  assert.doesNotMatch(worker, /if \(html\.includes\("security-hardening-v296\.js"\)\) return html;/);
});
