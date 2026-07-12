const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const docsSw = fs.readFileSync('docs/service-worker.js', 'utf8');
const pkg = require('../package.json');

function loadEstimateLogic() {
  const start = script.indexOf('const MATERIAL_ESTIMATE_VERSION = 1;');
  const end = script.indexOf('const MOTIVATIONAL_PHRASES = [');
  assert.ok(start >= 0 && end > start, 'bloco de estimativa encontrado');
  return new Function(`${script.slice(start, end)}; return { calculateMaterialEstimatedMinutes, materialBaseEstimatedMinutes, roundToThirtyMinutes, normalizeMaterialEstimateFields, migrateMaterialEstimates, normalizeManualEstimatedMinutes };`)();
}

const logic = loadEstimateLogic();

test('tabela-base de carga horária dinâmica', () => {
  const cases = [[0,0],[1,30],[5,30],[6,60],[10,60],[11,90],[15,90],[16,120],[25,120],[26,180],[35,180],[36,240],[45,240],[46,300],[55,300],[56,360],[65,360],[66,420]];
  for (const [pages, minutes] of cases) assert.equal(logic.calculateMaterialEstimatedMinutes(pages, 'normal'), minutes, `${pages} páginas`);
});

test('validação rejeita páginas inválidas e densidade inválida sem NaN', () => {
  assert.throws(() => logic.calculateMaterialEstimatedMinutes(-1, 'normal'), /negativas/);
  assert.throws(() => logic.calculateMaterialEstimatedMinutes(1.5, 'normal'), /inteiro/);
  assert.throws(() => logic.calculateMaterialEstimatedMinutes('texto', 'normal'), /inteiro/);
  assert.throws(() => logic.calculateMaterialEstimatedMinutes(1, 'pesada'), /Densidade inválida/);
  assert.equal(logic.calculateMaterialEstimatedMinutes('', 'normal'), 0);
  assert.equal(Number.isNaN(logic.calculateMaterialEstimatedMinutes(1, 'normal')), false);
  assert.equal(logic.calculateMaterialEstimatedMinutes(1, 'light'), 30);
});

test('densidade e arredondamento em blocos de 30 minutos com empate para cima', () => {
  assert.equal(logic.calculateMaterialEstimatedMinutes(6, 'light'), 60);
  assert.equal(logic.calculateMaterialEstimatedMinutes(11, 'light'), 60);
  assert.equal(logic.calculateMaterialEstimatedMinutes(16, 'dense'), 150);
  assert.equal(logic.calculateMaterialEstimatedMinutes(26, 'dense'), 240);
  assert.equal(logic.roundToThirtyMinutes(45), 60);
});

test('modos automático e manual preservam campos e recalculam corretamente', () => {
  const manual = logic.normalizeMaterialEstimateFields({ usefulPages: 18, materialDensity: 'normal', estimateMode: 'manual', manualEstimatedMinutes: 150 });
  assert.equal(manual.automaticEstimatedMinutes, 120);
  assert.equal(manual.estimatedMinutes, 150);
  const automaticAgain = logic.normalizeMaterialEstimateFields({ ...manual, estimateMode: 'automatic', usefulPages: 26, materialDensity: 'dense' });
  assert.equal(automaticAgain.manualEstimatedMinutes, 150);
  assert.equal(automaticAgain.estimatedMinutes, 240);
  const invalidManual = logic.normalizeMaterialEstimateFields({ usefulPages: 18, estimateMode: 'manual', manualEstimatedMinutes: '' });
  assert.equal(invalidManual.estimatedMinutes, 0);
});

test('migração é idempotente, preserva metas e normaliza materiais antigos', () => {
  const state = { materials: [{ id: 'm1', title: 'Antigo' }], dailyGoals: [{ id: 'g1', minutes: 50 }], settings: { custom: true }, migrations: {} };
  logic.migrateMaterialEstimates(state);
  const once = JSON.stringify(state);
  logic.migrateMaterialEstimates(state);
  assert.equal(JSON.stringify(state), once);
  assert.equal(state.materials[0].usefulPages, 0);
  assert.equal(state.materials[0].estimatedMinutes, 0);
  assert.deepEqual(state.dailyGoals, [{ id: 'g1', minutes: 50 }]);
  assert.equal(state.settings.custom, true);
});

test('backup, mesclagem, interface e publicação preservam campos da estimativa', () => {
  for (const token of ['usefulPages','materialDensity','automaticEstimatedMinutes','manualEstimatedMinutes','estimatedMinutes','estimateMode','estimatedAt','estimateVersion']) assert.match(script, new RegExp(token));
  assert.match(script, /mergeArrays\(state\.materials, \(data\.materials \|\| data\.materiais \|\| \[\]\)\.map\(normalizeMaterialEstimateFields\)/);
  assert.match(script, /makeSyncPayload\(\)[\s\S]*state: cloneData\(state\)/);
  assert.match(script, /Carga horária do material/);
  assert.match(script, /data-save-material-estimate/);
  assert.match(script, /Esta carga não altera metas nesta etapa/);
  assert.match(html, /id="materialForm"/);
  assert.equal(script, docsScript);
  assert.equal(html, docsHtml);
  assert.equal(sw, docsSw);
  assert.match(sw, new RegExp(`metas-estudo-${pkg.version}`));
});

test('TRIAGEM não foi alterada por esta suíte de estimativa', () => {
  assert.match(script, /const FACTORY_TRIAGEM_PROMPT = `/);
  assert.doesNotMatch(script, /TEMPO DINÂMICO[\s\S]*const FACTORY_TRIAGEM_PROMPT/);
});
