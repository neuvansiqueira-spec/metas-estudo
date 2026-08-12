const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const telemetry = fs.readFileSync(path.join(root, "usage-telemetry-v315.js"), "utf8");
const entry = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("V315-V317 exposes a privacy-safe usage API", () => {
  assert.match(telemetry, /globalThis\.AldusUsage = api/);
  assert.match(telemetry, /session_start/);
  assert.match(telemetry, /view_open/);
  assert.match(telemetry, /feature_action/);
  assert.match(telemetry, /form_submit/);
  assert.match(telemetry, /endpointConfigured/);
  assert.match(telemetry, /setConsent/);
});

test("V317 does not capture typed content or direct identity", () => {
  assert.doesNotMatch(telemetry, /\.value\b/);
  assert.doesNotMatch(telemetry, /innerText/);
  assert.doesNotMatch(telemetry, /raw_user_agent|user_agent_raw/i);
  assert.doesNotMatch(telemetry, /cpf/i);
  assert.doesNotMatch(telemetry, /ipAddress|ip_address/i);
  assert.match(telemetry, /browserKind/);
  assert.match(telemetry, /operatingSystem/);
});

test("V317 sends only after consent and with configured PostHog destination", () => {
  assert.match(telemetry, /trackingAllowed\(\)/);
  assert.match(telemetry, /if \(!trackingAllowed\(\) \|\| !endpoint \|\| !projectToken/);
  assert.match(telemetry, /https:\/\/us\.i\.posthog\.com\/batch\//);
  assert.match(telemetry, /"\$process_person_profile": false/);
  assert.match(telemetry, /credentials: "omit"/);
});

test("entrypoint loads telemetry without replacing the current application shell", () => {
  assert.match(entry, /usage-telemetry-v315\.js/);
  assert.match(entry, /duplicate-diagnostics-v309\.js/);
  assert.match(entry, /duplicate-diagnostics-batch-v305\.js/);
});
