const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('script.js', 'utf8');
const start = script.indexOf('function materialAvailable(m)');
const end = script.indexOf('\n\nfunction materialTitleById', start);
const projection = new Function('state', `${script.slice(start, end)}; return { buildDailyPlanProjection, materialsForDailyGoal };`)({});

const date = '2026-07-15';
const state = { dailyGoals: [
  { id:'goal-teoria', date, discipline:'DIREITO PENAL', subject:'Teoria Geral do Crime', syllabusItemId:'item-teoria' },
  { id:'goal-inquerito', date, discipline:'DIREITO PROCESSUAL PENAL', subject:'Inquérito Policial', syllabusItemId:'item-inquerito' },
  { id:'goal-sem', date, discipline:'DIREITO CIVIL', subject:'Obrigações', syllabusItemId:'item-sem' }
], factoryItems: [
  { id:'factory-teoria', syllabusItemId:'item-subtema', parentSyllabusItemId:'item-teoria', disciplina:'DIREITO PENAL', tema:'Conceito, Natureza Jurídica, Características e Finalidade' },
  { id:'factory-inquerito', syllabusItemId:'item-inquerito', disciplina:'DIREITO PROCESSUAL PENAL', tema:'Inquérito Policial' },
  { id:'factory-fora', syllabusItemId:'item-fora', disciplina:'FORA', tema:'Fora do plano' }
], materials: [
  {id:'teoria-pdf', factoryItemId:'factory-teoria', parentSyllabusItemId:'item-teoria', factoryModuleKey:'resumoAula', factoryFormat:'PDF', subject:'Conceito, Natureza Jurídica, Características e Finalidade', link:'https://example.test/teoria.pdf'},
  {id:'iq-word', factoryItemId:'factory-inquerito', syllabusItemId:'item-inquerito', factoryModuleKey:'resumoAula', factoryFormat:'Word', link:'https://example.test/iq.docx'},
  {id:'iq-pdf', sourceRecordId:'iq-pdf', factoryItemId:'factory-inquerito', syllabusItemId:'item-inquerito', factoryModuleKey:'resumoAula', factoryFormat:'PDF', link:'https://example.test/iq.pdf', estimatedMinutes:90},
  {id:'iq-pdf-copy', sourceRecordId:'iq-pdf', factoryItemId:'factory-inquerito', syllabusItemId:'item-inquerito', factoryModuleKey:'resumoAula', factoryFormat:'PDF', link:'https://example.test/iq.pdf'},
  {id:'iq-lei', factoryItemId:'factory-inquerito', syllabusItemId:'item-inquerito', factoryModuleKey:'lei', factoryFormat:'PDF', link:'https://example.test/lei.pdf'},
  {id:'fora', factoryItemId:'factory-fora', syllabusItemId:'item-fora', factoryModuleKey:'lei', factoryFormat:'PDF', link:'https://example.test/fora.pdf', estimatedMinutes:999}
] };

test('projeção mantém exatamente as três metas reais e não cria meta por material', () => assert.equal(projection.buildDailyPlanProjection(date, state).length, 3));
test('Inquérito agrupa Word/PDF em RESUMO/AULA, LEI separada e remove duplicado visual', () => { const entry=projection.buildDailyPlanProjection(date,state).find(x=>x.goal.id==='goal-inquerito'); assert.equal(entry.materialGroups.length,2); assert.equal(entry.materialGroups.find(x=>x.moduleKey==='resumoAula').materials.length,2); assert.equal(entry.materialGroups.find(x=>x.moduleKey==='lei').materials.length,1); });
test('subtema da Teoria Geral do Crime vincula pelo parent e meta sem material permanece', () => { const p=projection.buildDailyPlanProjection(date,state); assert.equal(p.find(x=>x.goal.id==='goal-teoria').materialGroups.length,1); assert.equal(p.find(x=>x.goal.id==='goal-sem').materialGroups.length,0); });
test('materiais e estimativa não vazam entre metas nem somam formatos', () => { const entry=projection.buildDailyPlanProjection(date,state).find(x=>x.goal.id==='goal-inquerito'); assert.equal(entry.estimate,90); assert.deepEqual(entry.materialGroups.flatMap(x=>x.materials).map(x=>x.id).sort(), ['iq-lei','iq-pdf','iq-word']); assert.deepEqual(JSON.stringify(state), JSON.stringify(state)); });
