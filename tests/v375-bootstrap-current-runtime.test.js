const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (file) => fs.readFileSync(file, 'utf8');
const release = '20260823-bootstrap-current-runtime-v375';
test('fast path usa V375 e elimina app-v344', () => {
  const fast = read('bootstrap-fast-path-v351.js');
  assert.match(fast, new RegExp(`app-v375\\.js\\?v=${release}`));
  assert.doesNotMatch(fast, /app-v344\.js/);
  assert.equal(fast, read('docs/bootstrap-fast-path-v351.js'));
});
test('worker V375 renova URL de bootstrap e artefatos', () => {
  const worker = read('service-worker.js');
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${release}";`));
  assert.match(worker, new RegExp(`const FAST_BOOTSTRAP_VERSION = "${release}";`));
  assert.ok(fs.existsSync('app-v375.js'));
  assert.ok(fs.existsSync('app-v375.css'));
  assert.ok(fs.existsSync('service-worker-v375.js'));
  assert.equal(read('service-worker-v375.js'), worker);
  assert.equal(read('docs/service-worker-v375.js'), worker);
});
test('V344 é lápide sem fetch nem IndexedDB', () => {
  const old = read('service-worker-v344.js');
  assert.doesNotMatch(old, /addEventListener\(\s*["']fetch["']/);
  assert.doesNotMatch(old, /indexedDB/i);
  assert.match(old, /self\.registration\.unregister\(\)/);
  assert.match(old, /\.navigate\(/);
  assert.equal(old, read('docs/service-worker-v344.js'));
});
test('manifesto inclui V374 e V375', () => {
  const versions = JSON.parse(read('published-service-workers.json')).versoes;
  assert.ok(versions.includes('v374'));
  assert.ok(versions.includes('v375'));
});
