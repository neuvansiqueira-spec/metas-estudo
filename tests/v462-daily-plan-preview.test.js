const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function harness() { const ctx = vm.createContext({}); vm.runInContext(read('daily-plan-preview-v462.js'),ctx); return {ctx,api:ctx.__ALDUS_DAILY_PLAN_PREVIEW_V462__}; }
test('V462 conserva o tempo calculado, exibindo horas e minutos inclusive abaixo de uma hora', () => {
  const {api} = harness();
  for (const [input,expected] of [['2h','2h00'],['1h 12min','1h12'],['1h12','1h12'],['35min','0h35'],['0min','0h00'],['1,5h','1h30'],['12h05min','12h05'],['—','—']]) assert.equal(api.compactDuration(input),expected,input);
});
test('V462 não instala duas vezes e é segura antes de existir DOM', () => {
  const {ctx,api}=harness(); assert.equal(api.install(),false); assert.equal(api.apply(),false);
  vm.runInContext(read('daily-plan-preview-v462.js'),ctx); assert.equal(ctx.__ALDUS_DAILY_PLAN_PREVIEW_V462__,api);
});
test('V462 mantém a camada visual sem gravar nem recalcular dados de estudo', () => {
  const source=read('daily-plan-preview-v462.js');
  assert.doesNotMatch(source,/saveData|localStorage|indexedDB|state\.dailyGoals|questionLogs|innerHTML\s*=/);
  assert.match(source,/aldusQuickQuestionEntryV436/);
  assert.match(source,/aldusPendingOtherDaysV429/);
  assert.doesNotMatch(source,/aldusDailyPlanBacklogV452/);
});
test('V462 é carregada pela cadeia ativa com a mesma revisão da folha publicada', () => {
  const version=harness().api.version;
  for(const [loader,asset] of [['performance-emergency-v350.js','daily-plan-preview-v462.js'],['daily-plan-legibility-v455.js','aldus-daily-plan-palette-v456.css'],['security-observability-v318.js','performance-emergency-v350.js'],['index.html','security-observability-v318.js']]) assert.ok(read(loader).includes(`${asset}?v=${version}`),loader);
  assert.match(read('performance-emergency-v350.js'),/\n  installDailyPlanPreviewV462\(\);/);
});
test('V462 mantém os arquivos publicados idênticos na raiz e em docs', () => {
  for(const file of ['daily-plan-preview-v462.js','aldus-daily-plan-palette-v456.css','daily-plan-legibility-v455.js','performance-emergency-v350.js','security-observability-v318.js','index.html']) assert.equal(read(file),read('docs/'+file),file);
});
