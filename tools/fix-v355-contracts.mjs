import fs from "node:fs";

const path = "tools/apply-v355-dom-style-hot-path.mjs";
let source = fs.readFileSync(path, "utf8");

const oldCache = "factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-dom-style-hot-path-v355";
const newCache = "dom-style-hot-path-v355-factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351";
source = source.split(oldCache).join(newCache);

const badAssertion = '  assert.match(source, /requestIdleCallback\\(\\(\\) => requestAnimationFrame\\(runRefresh\\)/);';
const goodAssertion = '  assert.ok(source.includes("requestIdleCallback(() => requestAnimationFrame(runRefresh)"));';
if (!source.includes(badAssertion) && !source.includes(goodAssertion)) {
  throw new Error("Asserção requestIdleCallback da V355 não encontrada.");
}
source = source.replace(badAssertion, goodAssertion);

if (!source.includes(newCache)) throw new Error("Contrato de cache V355 não foi realinhado.");
if (source.includes(oldCache)) throw new Error("Contrato antigo de cache V355 ainda presente.");
fs.writeFileSync(path, source);
console.log("Contratos V355 alinhados: V351 continua como sufixo do cache e teste usa includes seguro.");
