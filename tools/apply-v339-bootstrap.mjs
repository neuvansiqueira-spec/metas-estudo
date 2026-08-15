import fs from 'node:fs';
import assert from 'node:assert/strict';

const INDEX_FILES = ['index.html', 'docs/index.html'];
const SW_FILES = ['service-worker-v236.js', 'docs/service-worker-v236.js'];

const OLD_LOADER_SRC = 'bootstrap-integrity-loader-v258.js?v=20260814-qconcursos-catalogo-atual-v337&hotfix=preboot-atomic-selection1';
const NEW_LOADER_SRC = 'bootstrap-integrity-loader-v258.js?v=20260815-bootstrap-fast-path-v339';
const OLD_BOOTSTRAP_VERSION = 'const BOOTSTRAP_INTEGRITY_VERSION = "20260805-bootstrap-integrity-v258";';
const NEW_BOOTSTRAP_VERSION = 'const BOOTSTRAP_INTEGRITY_VERSION = "20260815-bootstrap-fast-path-v339";';
const OLD_BOOTSTRAP_SCRIPT = 'const BOOTSTRAP_INTEGRITY_SCRIPT = `bootstrap-integrity-loader-v258.js?v=20260805-bootstrap-integrity-v258&hotfix=preboot-atomic-selection1`;';
const NEW_BOOTSTRAP_SCRIPT = 'const BOOTSTRAP_INTEGRITY_SCRIPT = `bootstrap-integrity-loader-v258.js?v=20260815-bootstrap-fast-path-v339`;';
const FAST_BOOTSTRAP_SCRIPT = 'const BOOTSTRAP_FAST_SCRIPT = `bootstrap-app-chain-v339.js?v=20260815-bootstrap-fast-path-v339`;';
const OLD_CACHE = 'const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-dashboard-hoje-cores-v247`;';
const NEW_CACHE = 'const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-dashboard-hoje-cores-v247-bootstrap-fast-v339`;';

function replaceRequired(text, from, to, file) {
  if (!text.includes(from)) throw new Error(`${file}: trecho obrigatório não encontrado: ${from}`);
  return text.replace(from, to);
}

for (const file of INDEX_FILES) {
  let text = fs.readFileSync(file, 'utf8');
  text = replaceRequired(text, OLD_LOADER_SRC, NEW_LOADER_SRC, file);
  fs.writeFileSync(file, text);
}

for (const file of SW_FILES) {
  let text = fs.readFileSync(file, 'utf8');
  text = replaceRequired(text, OLD_CACHE, NEW_CACHE, file);
  text = replaceRequired(text, OLD_BOOTSTRAP_VERSION, NEW_BOOTSTRAP_VERSION, file);
  text = replaceRequired(text, OLD_BOOTSTRAP_SCRIPT, `${NEW_BOOTSTRAP_SCRIPT}\n${FAST_BOOTSTRAP_SCRIPT}`, file);
  text = replaceRequired(text, '  BOOTSTRAP_INTEGRITY_SCRIPT,\n', '  BOOTSTRAP_INTEGRITY_SCRIPT,\n  BOOTSTRAP_FAST_SCRIPT,\n', file);
  text = text.replace('headers.set("x-aldus-bootstrap-policy", "pre-render-atomic-conservative");', 'headers.set("x-aldus-bootstrap-policy", "fast-path-with-24h-safe-validation");');
  fs.writeFileSync(file, text);
}

const rootIndex = fs.readFileSync('index.html', 'utf8');
const docsIndex = fs.readFileSync('docs/index.html', 'utf8');
const rootSw = fs.readFileSync('service-worker-v236.js', 'utf8');
const docsSw = fs.readFileSync('docs/service-worker-v236.js', 'utf8');

assert.equal(rootIndex, docsIndex, 'index.html e docs/index.html devem permanecer idênticos');
assert.equal(rootSw, docsSw, 'service workers raiz/docs devem permanecer idênticos');
assert.match(rootIndex, /bootstrap-integrity-loader-v258\.js\?v=20260815-bootstrap-fast-path-v339/);
assert.match(rootSw, /BOOTSTRAP_FAST_SCRIPT/);
assert.match(rootSw, /bootstrap-fast-v339/);
assert.match(rootSw, /fast-path-with-24h-safe-validation/);

console.log('V339 publication patch: OK');
