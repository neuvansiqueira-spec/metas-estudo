const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const telemetry = fs.readFileSync(path.join(root, "usage-telemetry-v315.js"), "utf8");
const entry = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("V315/V316 exposes a privacy-safe usage API", () => {
  assert.match(telemetry, /globalThis\.AldusUsage = api/);
  assert.match(telemetry, /session_start/);
  assert.match(telemetry, /view_open/);
  assert.match(telemetry, /feature_action/);
  assert.match(telemetry, /form_submit/);
  assert.match(telemetry, /endpointConfigured/);
});

test("V315/V316 does not capture typed content or persistent identity", () => {
  assert.doesNotMatch(telemetry, /\.value\b/);
  assert.doesNotMatch(telemetry, /innerText/);
  assert.doesNotMatch(telemetry, /navigator\.userAgent/);
  assert.doesNotMatch(telemetry, /email/i);
  assert.doesNotMatch(telemetry, /cpf/i);
  assert.doesNotMatch(telemetry, /ipAddress|ip_address/i);
});

test("V315/V316 keeps external delivery disabled until an endpoint is configured", () => {
  assert.match(telemetry, /if \(!endpoint \|\| pending\.length === 0\) return false/);
  assert.match(telemetry, /credentials: "omit"/);
  assert.match(telemetry, /aldus-usage-endpoint/);
});

test("entrypoint loads telemetry without replacing the current application shell", () => {
  assert.match(entry, /usage-telemetry-v315\.js/);
  assert.match(entry, /duplicate-diagnostics-v309\.js/);
  assert.match(entry, /duplicate-diagnostics-batch-v305\.js/);
});
