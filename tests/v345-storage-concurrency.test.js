import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("V345 usa fast path e mantém fallback forense", () => {
  const core = read("bootstrap-integrity-loader-v345-core.js");
  assert.match(core, /readLiveLocalState/);
  assert.match(core, /compareLocalToIndexed/);
  assert.match(core, /bootstrap-integrity-loader-v258-core\.js/);
  assert.doesNotMatch(core, /localStorage\.length/);
  assert.match(core, /await loadScript\("aldusStorageConcurrencyV345"/);
});

test("V345 torna a varredura catastrófica excepcional", () => {
  const guard = read("catastrophic-state-guard-v275.js");
  assert.match(guard, /preserved-fast-no-baseline/);
  const fastIndex = guard.indexOf('action: hasBaseline ? "preserved-fast" : "preserved-fast-no-baseline"');
  const scanIndex = guard.indexOf("const candidates = [", fastIndex);
  assert.ok(fastIndex > 0 && scanIndex > fastIndex);
});

test("V345 protege gravações entre abas e diário do cronômetro", () => {
  const guard = read("storage-concurrency-v345.js");
  assert.match(guard, /aldus:state-writer:v345/);
  assert.match(guard, /aldus:timer:commit-journal:v345/);
  assert.match(guard, /saveDataSingleWriterV345/);
  assert.match(guard, /autoSyncAfterSaveSingleWriterV345/);
  assert.match(guard, /captureTimerSubmit/);
  assert.match(guard, /writeAndVerifyCurrentState/);
  assert.match(guard, /recoverTimerJournal/);
  assert.match(guard, /mergeGoalNonRegression/);
  assert.match(guard, /function currentState()/);
});

test("cronômetro só confirma depois da proteção durável V345", () => {
  const script = read("script.js");
  assert.match(script, /async function submitTimerStudyModal\(event\)/);
  assert.match(script, /await commitTimerStateV345/);
  assert.match(script, /Tempo salvo e protegido/);
  assert.match(script, /O tempo ainda não foi confirmado no armazenamento/);
});

test("publicação V345 referencia artefatos e cache corretos", () => {
  const pkg = JSON.parse(read("package.json"));
  const index = read("index.html");
  const sw = read("service-worker.js");
  const loader = read("bootstrap-integrity-loader-v275.js");
  assert.equal(pkg.version, "20260816-storage-consistency-v345");
  assert.match(index, /app-v345\.js\?v=20260816-storage-consistency-v345/);
  assert.match(index, /app-v345\.css\?v=20260816-storage-consistency-v345/);
  assert.match(loader, /bootstrap-integrity-loader-v345-core\.js/);
  assert.match(sw, /CURRENT_VERSION = "20260816-storage-consistency-v345"/);
  assert.match(sw, /STORAGE_CONCURRENCY_V345/);
  assert.match(sw, /bootstrap-integrity-loader-v345-core\.js/);
});

test("docs acompanha os arquivos críticos V345", () => {
  for (const file of [
    "script.js",
    "service-worker.js",
    "bootstrap-integrity-loader-v275.js",
    "bootstrap-integrity-loader-v345-core.js",
    "storage-concurrency-v345.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
