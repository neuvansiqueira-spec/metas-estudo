const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const start = script.indexOf('function materialAvailable(m)');
const end = script.indexOf('\n\nfunction materialTitleById', start);

function resolver(materials) {
  assert.ok(start >= 0 && end > start);
  return new Function('state', `${script.slice(start, end)}; return { resolveAvailableMaterials, materialMatchesAssociation };`)({ materials });
}

test('a mesma fonte central encontra material por ID direto, lista de IDs e assunto-pai', () => {
  const materials = [
    { id: 'direto', syllabusItemId: 'item-direto', available: true },
    { id: 'lista', syllabusItemIds: ['item-lista'], available: true },
    { id: 'filho', syllabusItemId: 'subitem', parentSyllabusItemId: 'item-pai', available: true }
  ];
  const api = resolver(materials);
  assert.deepEqual(api.resolveAvailableMaterials({ syllabusItemId: 'item-direto' }).map((m) => m.id), ['direto']);
  assert.deepEqual(api.resolveAvailableMaterials({ syllabusItemIds: ['item-lista'] }).map((m) => m.id), ['lista']);
  assert.deepEqual(api.resolveAvailableMaterials({ syllabusItemId: 'item-pai' }).map((m) => m.id), ['filho']);
});

test('fallback textual exige disciplina e assunto completos e não vaza para homônimo', () => {
  const materials = [
    { id: 'penal', discipline: 'Direito Penal', subject: 'Teoria do Crime' },
    { id: 'civil', discipline: 'Direito Civil', subject: 'Teoria do Crime' },
    { id: 'indisponivel', discipline: 'Direito Penal', subject: 'Teoria do Crime', available: false }
  ];
  const api = resolver(materials);
  assert.deepEqual(api.resolveAvailableMaterials({ discipline: 'DIREITO PENAL', subject: 'teoria do crime' }).map((m) => m.id), ['penal']);
  assert.deepEqual(api.resolveAvailableMaterials({ subject: 'Teoria do Crime' }), []);
});

test('Representação por Prisão Temporária reconhece material salvo como Prisão Temporária', () => {
  const materials = [
    { id: 'prisao', discipline: 'Direito Processual Penal', subject: 'Prisão Temporária', link: 'https://drive.google.com/file/d/PRISAO/view' },
    { id: 'outra-disciplina', discipline: 'Direito Penal', subject: 'Prisão Temporária', link: 'https://drive.google.com/file/d/OUTRA/view' }
  ];
  const api = resolver(materials);
  assert.deepEqual(api.resolveAvailableMaterials({ discipline: 'Direito Processual Penal', subject: 'Representação por Prisão Temporária' }).map((m) => m.id), ['prisao']);
  assert.equal(api.materialMatchesAssociation({ discipline: 'Direito Processual Penal', subject: 'Prisão' }, { discipline: 'Direito Processual Penal', subject: 'Representação por Prisão Temporária' }), false);
});

test('normalização e sincronização preservam todos os vínculos necessários', () => {
  const normalizeBlock = script.slice(script.indexOf('function normalizeFactoryItem'), script.indexOf('\n\nfunction factorySyllabusMainSubject'));
  const syncBlock = script.slice(script.indexOf('function syncFactoryModuleMaterials'), script.indexOf('\nfunction syncAllFactoryMaterials'));
  assert.match(normalizeBlock, /goalId: item\.goalId \|\| item\.metaId/);
  assert.match(normalizeBlock, /syllabusItemIds/);
  assert.match(normalizeBlock, /parentSyllabusItemId: item\.parentSyllabusItemId/);
  assert.match(syncBlock, /goalId: normalized\.goalId/);
  assert.match(syncBlock, /parentSyllabusItemId: normalized\.parentSyllabusItemId/);
});
