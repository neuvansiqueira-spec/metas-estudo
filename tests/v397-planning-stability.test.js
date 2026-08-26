const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-quality-v368.js"), "utf8");

test("V397 proíbe mutação automática ao abrir ou trocar telas de planejamento", () => {
  assert.doesNotMatch(source, /window\.addEventListener\("hashchange"/);
  assert.doesNotMatch(source, /aldus:post-bootstrap-maintenance-complete/);
  assert.doesNotMatch(source, /run\("before-export-payload"/);
  assert.doesNotMatch(source, /EXPORT_IDS/);
});

test("V397 mantém reparos ligados somente a comandos explícitos de geração", () => {
  assert.match(source, /GENERATION_IDS\.has\(id\)/);
  assert.match(source, /installSelectionGate\(\);\s*scheduleAfterGeneration\(id\)/);
  assert.match(source, /run\(`after-\$\{id\}`\)/);
});

test("V397 publica runtime espelhado e cache-bustado", () => {
  assert.equal(source, fs.readFileSync(path.join(root, "docs", "planning-quality-v368.js"), "utf8"));
  for (const file of ["bootstrap-fast-path-v351.js", "bootstrap-integrity-loader-v258-core.js"]) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(text, /planning-quality-v368\.js\?v=20260826-planning-stability-v397/);
  }
  const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(sw, /const PLANNING_QUALITY_VERSION = "20260826-planning-stability-v397"/);
  assert.match(sw, /planning-stability-v397/);
});
