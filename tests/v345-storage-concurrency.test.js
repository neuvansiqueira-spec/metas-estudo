import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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

test("concorrência V345 permanece realmente desativada em runtime", () => {
  const source = read("storage-concurrency-v345.js");
  const returnIndex = source.indexOf("return;");
  const writerIndex = source.indexOf('const WRITER_KEY = "aldus:state-writer:v345"');
  assert.ok(returnIndex > 0 && writerIndex > returnIndex, "o early return deve anteceder toda a implementação de lease");

  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.AldusStorageConcurrencyV345, undefined, "o módulo desativado não pode exportar API de concorrência");
});

test("cronômetro usa gravação direta quando a API V345 está ausente", () => {
  const script = read("script.js");
  assert.match(script, /async function submitTimerStudyModal\(event\)/);
  assert.match(script, /let durableResult = \{ durable: true, reason: "legacy-save" \}/);
  assert.match(script, /globalThis\.AldusStorageConcurrencyV345\?\.commitTimerState/);
  assert.match(script, /Tempo salvo e protegido/);
});

test("publicação V345 usa época de cache coerente com o bootstrap ativo", () => {
  const metadata = JSON.parse(read("package.json"));
  const cacheVersion = metadata.aldusCacheVersion || metadata.version;
  const index = read("index.html");
  const sw = read("service-worker.js");
  const loader = read("bootstrap-integrity-loader-v275.js");
  const core = read("bootstrap-integrity-loader-v345-core.js");
  assert.match(index, new RegExp(`app-v345\\.js\\?v=${cacheVersion}`));
  assert.match(index, new RegExp(`app-v345\\.css\\?v=${cacheVersion}`));
  assert.match(loader, new RegExp(`const VERSION = "${cacheVersion}"`));
  assert.match(loader, /bootstrap-integrity-loader-v345-core\.js/);
  assert.match(core, new RegExp(`const VERSION = "${cacheVersion}"`));
  assert.match(sw, new RegExp(`CURRENT_VERSION = "${cacheVersion}"`));
  assert.match(sw, /STORAGE_CONCURRENCY_V345/);
  assert.match(sw, /bootstrap-integrity-loader-v345-core\.js/);
});

test("docs acompanha os arquivos críticos V345", () => {
  for (const file of [
    "script.js",
    "service-worker.js",
    "bootstrap-integrity-loader-v275.js",
    "bootstrap-integrity-loader-v345-core.js",
    "storage-concurrency-v345.js",
    "catastrophic-state-guard-v275.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
