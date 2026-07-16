const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const start = script.indexOf('function materialAvailable(m)');
const end = script.indexOf('\n\nfunction materialTitleById', start);
const identityStart = script.indexOf('function materialDriveFileId');
const identityEnd = script.indexOf('function materialFactoryModuleLabelFromKey', identityStart);
const factory = new Function('state', `${script.slice(identityStart, identityEnd)} ${script.slice(start, end)}; return { buildDailyPlanProjection, getDailyGoalMaterialState };`);
const today = '2026-07-16';
const goal = { id: 'goal', date: today, discipline: 'Penal', subject: 'Crime', syllabusItemId: 'crime', status: 'Pendente' };

function materialState(materials, status = 'Pendente') {
  const state = { dailyGoals: [{ ...goal, status }], materials, factoryItems: [] };
  const api = factory(state);
  const entry = api.buildDailyPlanProjection(today, state)[0];
  return api.getDailyGoalMaterialState(entry.goal, entry);
}

test('fonte central retorna zero sem material e consolida PDF manual/Fábrica sem mutar state', () => {
  const state = materialState([]);
  assert.deepEqual(state, { materials: [], count: 0, hasMaterials: false, estimatedMaterials: [], estimatedMinutes: 0, hasEstimate: false });
  const records = [
    { id: 'manual', goalId: 'goal', discipline: 'Penal', subject: 'Crime', syllabusItemId: 'crime', type: 'PDF', link: 'https://example.test/crime.pdf' },
    { id: 'factory', goalId: 'goal', discipline: 'Penal', subject: 'Crime', syllabusItemId: 'crime', source: 'factory', factoryFormat: 'PDF', link: 'https://example.test/crime.pdf', estimatedMinutes: 90 }
  ];
  const before = JSON.stringify(records);
  const consolidated = materialState(records);
  assert.equal(consolidated.count, 1);
  assert.equal(consolidated.hasMaterials, true);
  assert.equal(consolidated.hasEstimate, true);
  assert.equal(JSON.stringify(records), before);
});

test('Plano reconhece duas URLs do Drive como o mesmo arquivo físico', () => {
  const consolidated = materialState([
    { id: 'manual-drive', goalId: 'goal', discipline: 'Penal', subject: 'Crime', syllabusItemId: 'crime', type: 'Arquivo PDF', link: 'https://drive.google.com/open?id=DRIVE123' },
    { id: 'factory-drive', goalId: 'goal', discipline: 'Penal', subject: 'Crime', syllabusItemId: 'crime', source: 'factory', factoryFormat: 'PDF', link: 'https://drive.google.com/file/d/DRIVE123/view' }
  ]);
  assert.equal(consolidated.count, 1);
});

test('renderização usa estado central para botões, textos, contagem e metas ativas de hoje', () => {
  assert.match(script, /function getDailyGoalMaterialState\(/);
  assert.match(script, /materialState\.hasMaterials \? `<button type="button" data-open-goal-material/);
  assert.match(script, /Cadastrar material/);
  assert.match(script, /Produzir material/);
  assert.match(script, /Nenhum material disponível para este assunto\./);
  assert.match(script, /materiais disponíveis.*sem estimativa de duração/s);
  assert.match(script, /materialState\.count} materiais/);
  assert.match(script, /!isGoalDone\(goal\)\)\.flatMap\(\(goal\) => getDailyGoalMaterialState/);
  assert.doesNotMatch(script, /Sem estimativa de material vinculada/);
});

test('seções da biblioteca são mutuamente exclusivas e não repetem cartões', () => {
  const renderBlock = script.slice(script.indexOf('function renderMaterials'), script.indexOf('function updateStudyMaterialOptions'));
  assert.match(renderBlock, /\(goal\.date \|\| goal\.data\) === todayISO\(\) && !isGoalDone\(goal\)/);
  assert.match(renderBlock, /const list = filteredMaterials\(\)/);
  assert.match(renderBlock, /const recentKeys = new Set\(recentMaterials\.map/);
  assert.match(renderBlock, /const otherMaterials = list\.filter\(\(group\) => !todayKeys\.has\(group\.key\) && !recentKeys\.has\(group\.key\)\)/);
  assert.match(renderBlock, /materialSectionHTML\("all", "3\. OUTROS MATERIAIS", otherMaterials/);
  assert.doesNotMatch(renderBlock, /"3\. TODOS OS MATERIAIS", list/);
});
