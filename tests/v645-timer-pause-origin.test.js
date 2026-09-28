const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('V645 só anota: não pausa, não retoma e não grava nos dados do estudo', () => {
  const source = read('timer-pause-origin-v645.js');
  assert.doesNotMatch(source, /\.paused\s*=|\.startedAt\s*=|saveData|indexedDB|persistFloatingTimerSession|\.click\(\)/);
});

test('V645 é segura sem DOM', () => {
  const ctx = vm.createContext({});
  vm.runInContext(read('timer-pause-origin-v645.js'), ctx);
  const api = ctx.__ALDUS_TIMER_PAUSE_ORIGIN_V645__;
  assert.equal(typeof api.passada, 'function');
  assert.doesNotThrow(() => api.passada());
});

test('V645 é carregada pela cadeia ativa e publicada igual na raiz e em docs', () => {
  const loader = read('security-observability-v318.js');
  assert.ok(loader.includes('timer-pause-origin-v645.js?v=20260928-origem-das-pausas-v645'));
  assert.match(loader, /\n  installTimerPauseOriginV645\(\);/);
  for (const file of ['timer-pause-origin-v645.js', 'security-observability-v318.js']) assert.equal(read(file), read('docs/' + file), file);
});
