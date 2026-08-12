const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V319 carrega e identifica o painel Telemetria e Segurança", () => {
  const index = read("index.html");
  const dashboard = read("telemetry-security-dashboard-v319.js");
  assert.match(index, /telemetry-security-dashboard-v319\.js/);
  assert.match(dashboard, /Telemetria e Segurança/);
  assert.match(dashboard, /aldusTelemetryDashboardLink/);
  assert.match(dashboard, /AldusUsage/);
  assert.match(dashboard, /security_event/);
  assert.match(dashboard, /Cloudflare\/WAF/);
});

test("V319 não expõe credencial privada de consulta no navegador", () => {
  const dashboard = read("telemetry-security-dashboard-v319.js");
  assert.doesNotMatch(dashboard, /personal[_-]?api[_-]?key/i);
  assert.doesNotMatch(dashboard, /Authorization\s*:/i);
  assert.doesNotMatch(dashboard, /Bearer\s+[A-Za-z0-9]/i);
  assert.match(dashboard, /totais de todos os visitantes permanecem no PostHog/i);
});

test("V319 impede que os controles administrativos alimentem a própria telemetria", () => {
  const dashboard = read("telemetry-security-dashboard-v319.js");
  assert.match(dashboard, /aldusTelemetryControl/);
});
