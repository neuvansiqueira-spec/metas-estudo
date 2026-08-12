const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const telemetryPath = fs.existsSync(path.join(root, "usage-telemetry-v315.js"))
  ? path.join(root, "usage-telemetry-v315.js")
  : path.join(__dirname, "usage-telemetry-v317.js");
const telemetry = fs.readFileSync(telemetryPath, "utf8");

test("V317 sends valid anonymous batches to the US PostHog capture endpoint", () => {
  assert.match(telemetry, /https:\/\/us\.i\.posthog\.com\/batch\//);
  assert.match(telemetry, /api_key: projectToken/);
  assert.match(telemetry, /batch: batch\.map\(postHogEvent\)/);
  assert.match(telemetry, /"\$process_person_profile": false/);
  assert.match(telemetry, /credentials: "omit"/);
  assert.match(telemetry, /referrerPolicy: "no-referrer"/);
});

test("V317 captures only bounded categorical usage fields", () => {
  for (const field of [
    "session_start", "session_heartbeat", "session_end", "view_open",
    "feature_action", "form_submit", "duration_seconds", "visitor_type",
    "device", "browser", "os", "referrer_domain"
  ]) assert.match(telemetry, new RegExp(field));
  assert.doesNotMatch(telemetry, /innerText/);
  assert.doesNotMatch(telemetry, /textContent\s*:\s*target/);
  assert.doesNotMatch(telemetry, /\.value\b/);
  assert.doesNotMatch(telemetry, /cpf/i);
});

test("V317 requires an explicit privacy choice and honors Do Not Track", () => {
  assert.match(telemetry, /CONSENT_KEY/);
  assert.match(telemetry, /choice === "granted"/);
  assert.match(telemetry, /choice !== "denied"/);
  assert.match(telemetry, /doNotTrackEnabled/);
  assert.match(telemetry, /Permitir estatísticas anônimas/);
  assert.match(telemetry, /Não permitir/);
});

test("V317 never sends study content or direct identity fields", () => {
  assert.doesNotMatch(telemetry, /questionText|answerText|studyContent|driveContent/);
  assert.doesNotMatch(telemetry, /first_name|last_name|phone|address/);
  assert.match(telemetry, /Não envia textos, questões, respostas, materiais do Drive, nome ou e-mail/);
});
