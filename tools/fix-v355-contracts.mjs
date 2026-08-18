import fs from "node:fs";

const path = "tools/apply-v355-dom-style-hot-path.mjs";
let source = fs.readFileSync(path, "utf8");

const oldCache = "factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-dom-style-hot-path-v355";
const newCache = "dom-style-hot-path-v355-factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351";
source = source.split(oldCache).join(newCache);

function replaceOnce(oldValue, newValue, label) {
  if (source.includes(oldValue)) {
    source = source.replace(oldValue, newValue);
    return;
  }
  if (!source.includes(newValue)) throw new Error(`Contrato ${label} não encontrado.`);
}

replaceOnce(
  '  assert.match(source, /if \\(!query\\) \\{/);',
  '  assert.ok(source.includes("if (!query) {"));',
  "busca vazia"
);
replaceOnce(
  '  assert.match(source, /data-factory-search-hidden-v136=\\\\"true\\\\"/);',
  '  assert.ok(source.includes(\'data-factory-search-hidden-v136="true"\'));',
  "itens ocultos"
);
replaceOnce(
  '  assert.match(source, /if \\(target\\.dataset\\.factorySearchHiddenV136 !== nextHidden\\)/);',
  '  assert.ok(source.includes("if (target.dataset.factorySearchHiddenV136 !== nextHidden)"));',
  "escrita condicional"
);
replaceOnce(
  '  assert.doesNotMatch(source, /const match = !query \\|\\| normalize\\(target\\.textContent\\)/);',
  '  assert.ok(!source.includes("const match = !query || normalize(target.textContent)"));',
  "varredura antiga"
);
replaceOnce(
  '  assert.match(source, /20260818-factory-dom-style-on-demand-v355/);',
  '  assert.ok(source.includes("20260818-factory-dom-style-on-demand-v355"));',
  "runtime V355"
);
replaceOnce(
  '  assert.match(source, /const isFactoryRoute = \\(\\) =>/);',
  '  assert.ok(source.includes("const isFactoryRoute = () =>"));',
  "gate de rota"
);
replaceOnce(
  '  assert.match(source, /requestIdleCallback\\(\\(\\) => requestAnimationFrame\\(runRefresh\\)/);',
  '  assert.ok(source.includes("requestIdleCallback(() => requestAnimationFrame(runRefresh)"));',
  "requestIdleCallback"
);
replaceOnce(
  '  assert.doesNotMatch(source, /new MutationObserver\\(refresh\\)/);',
  '  assert.ok(!source.includes("new MutationObserver(refresh)"));',
  "observer antigo"
);
replaceOnce(
  '  assert.match(bundle, /20260818-factory-dom-style-on-demand-v355/);',
  '  assert.ok(bundle.includes("20260818-factory-dom-style-on-demand-v355"));',
  "bundle V355"
);

// O contrato agregado também é gerado dentro do aplicador. Use busca literal
// para que parênteses de JavaScript não virem metacaracteres de RegExp.
replaceOnce(
  '  assert.match(factoryExecutiveRuntime, /20260818-factory-dom-style-on-demand-v355/);',
  '  assert.ok(factoryExecutiveRuntime.includes("20260818-factory-dom-style-on-demand-v355"));',
  "contrato agregado runtime"
);
replaceOnce(
  '  assert.match(factoryExecutiveRuntime, /const isFactoryRoute = \\\\(\\\\) =>/);',
  '  assert.ok(factoryExecutiveRuntime.includes("const isFactoryRoute = () =>"));',
  "contrato agregado rota"
);
replaceOnce(
  '  assert.match(factoryExecutiveRuntime, /requestIdleCallback/);',
  '  assert.ok(factoryExecutiveRuntime.includes("requestIdleCallback"));',
  "contrato agregado idle"
);
replaceOnce(
  '  assert.doesNotMatch(factoryExecutiveRuntime, /new MutationObserver\\\\(refresh\\\\)/);',
  '  assert.ok(!factoryExecutiveRuntime.includes("new MutationObserver(refresh)"));',
  "contrato agregado observer"
);

if (!source.includes(newCache)) throw new Error("Contrato de cache V355 não foi realinhado.");
if (source.includes(oldCache)) throw new Error("Contrato antigo de cache V355 ainda presente.");
fs.writeFileSync(path, source);
console.log("Contratos V355 alinhados sem RegExp frágil; runtime permanece inalterado.");
