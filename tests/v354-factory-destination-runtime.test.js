import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../factory-destination-integrity-v237.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../planning-integrity-loader-v235.js", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

function dashboardRuntime() {
  let storageReads = 0;
  let idleCalls = 0;
  let timeoutCalls = 0;
  const listeners = new Map();
  const context = {
    console,
    globalThis: null,
    location: { hash: "#dashboard" },
    localStorage: {
      getItem() { storageReads += 1; return null; }
    },
    document: {
      documentElement: { dataset: {} },
      querySelectorAll() { return []; }
    },
    addEventListener(name, fn) { listeners.set(name, fn); },
    requestIdleCallback() { idleCalls += 1; },
    setTimeout() { timeoutCalls += 1; return 1; },
    queueMicrotask
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "factory-destination-integrity-v237.js" });
  return { context, listeners, storageReads: () => storageReads, idleCalls: () => idleCalls, timeoutCalls: () => timeoutCalls };
}

test("V354 não executa reconciliação pesada no dashboard durante o boot", () => {
  const rt = dashboardRuntime();
  assert.ok(rt.context.__ALDUS_FACTORY_DESTINATION_INTEGRITY_V237__);
  assert.equal(rt.context.__ALDUS_FACTORY_DESTINATION_INTEGRITY_V237__.runtimeVersion, "20260818-factory-destination-on-demand-v354");
  assert.equal(rt.storageReads(), 0, "boot normal não deve ler a árvore de pastas");
  assert.equal(rt.idleCalls(), 0, "boot normal não deve agendar applyCached");
  assert.equal(rt.timeoutCalls(), 0, "V354 remove os timers automáticos da V237");
});

test("V354 mantém as APIs explícitas da V237", () => {
  const rt = dashboardRuntime();
  const api = rt.context.__ALDUS_FACTORY_DESTINATION_INTEGRITY_V237__;
  assert.equal(typeof api.applyEntry, "function");
  assert.equal(typeof api.applyTree, "function");
  assert.equal(typeof api.applyCached, "function");
  assert.equal(typeof api.refresh, "function");
  assert.equal(typeof rt.context.__refreshFactoryDestinationFoldersV237, "function");
});

test("V354 só agenda aplicação automática ao entrar na Fábrica", () => {
  const rt = dashboardRuntime();
  const onHashChange = rt.listeners.get("hashchange");
  assert.equal(typeof onHashChange, "function");
  rt.context.location.hash = "#fabrica-resumos";
  onHashChange();
  assert.equal(rt.idleCalls(), 1);
  assert.equal(rt.storageReads(), 0, "a leitura pesada só começa quando o callback ocioso executar");
});

test("V354 remove as três reconciliações automáticas da V237", () => {
  assert.doesNotMatch(source, /showVersion\(\); install\(\); applyCached\(\)/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => \{ install\(\); applyCached\(\); \}, 1500\)/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => refresh\(\), 2300\)/);
  assert.doesNotMatch(source, /setInterval\(install, 250\)/);
  assert.match(source, /isFactoryRoute/);
  assert.match(source, /requestIdleCallback/);
});

test("V354 renova a entrega do asset e o cache do Service Worker", () => {
  assert.match(loader, /FACTORY_DESTINATION_HOTFIX = "factory-destination-on-demand-v354"/);
  assert.match(worker, /factory-destination-integrity-v237\.js\?v=20260804-pastas-destino-classificacao-exata-v237&hotfix=factory-destination-on-demand-v354/);
  assert.match(worker, /factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351/);
});
