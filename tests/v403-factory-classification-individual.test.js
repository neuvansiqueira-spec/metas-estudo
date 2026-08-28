const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('factory-penalties-v320.js', 'utf8');

function createFactoryHarness() {
  const timers = [];
  const context = vm.createContext({
    console,
    Date,
    Object,
    Boolean,
    setTimeout(fn) { timers.push(fn); return timers.length; },
    document: { readyState: 'complete', addEventListener() {} },
    window: { addEventListener() {} },
    location: { hash: '#fabrica-resumos' }
  });

  vm.runInContext(`
    const defaultFactoryPromptLibrary = {
      triagem: 'TRIAGEM PADRÃO',
      resumoAula: 'RESUMO/AULA PADRÃO',
      lei: 'LEI PADRÃO',
      jurisprudencia: 'JURISPRUDÊNCIA PADRÃO',
      peca: 'PEÇA PADRÃO',
      resumoAulaJurisprudencia: 'RESUMO/AULA + JURISPRUDÊNCIA PADRÃO',
      leiJurisprudencia: 'LEI + JURISPRUDÊNCIA PADRÃO',
      consolidacao: 'CONSOLIDAÇÃO PADRÃO'
    };
    let state = {
      migrations: {},
      factoryPromptLibrary: JSON.parse(JSON.stringify(defaultFactoryPromptLibrary))
    };
    let saves = 0;
    function saveData() { saves += 1; }
  `, context);

  vm.runInContext(source, context);
  return { context, timers };
}

test('V403 individualiza classificações em todos os prompts da Fábrica', () => {
  const { context } = createFactoryHarness();
  const snapshot = vm.runInContext('JSON.parse(JSON.stringify(state.factoryPromptLibrary))', context);
  for (const [key, prompt] of Object.entries(snapshot)) {
    assert.equal((prompt.match(/## CLASSIFICAÇÕES — REGRA OBRIGATÓRIA DE INDIVIDUALIZAÇÃO/g) || []).length, 1, key);
  }
  assert.ok(vm.runInContext('state.migrations.factoryClassificationIndividualScopeV403', context));
});

test('V403 proíbe generalização e transferência de classificação entre elementos', () => {
  for (const fragment of [
    'CLASSIFICAÇÃO INDIVIDUAL DE CADA ELEMENTO',
    'NÃO INFIRA QUE TODOS OS ITENS MENCIONADOS CONJUNTAMENTE PERTENCEM À MESMA CATEGORIA',
    'NÃO TRANSFIRA PARA UM ITEM A CLASSIFICAÇÃO DE OUTRO',
    'NÃO INFIRA, NÃO GENERALIZE E NÃO COMPLETE POR ANALOGIA',
    'A MERA PROXIMIDADE TEXTUAL OU O PERTENCIMENTO AO MESMO GÊNERO NÃO AUTORIZA'
  ]) assert.ok(source.includes(fragment), fragment);
});

test('V403 é idempotente nas retentativas já existentes', () => {
  const { context, timers } = createFactoryHarness();
  timers.forEach((fn) => fn());
  const snapshot = vm.runInContext('JSON.parse(JSON.stringify(state.factoryPromptLibrary))', context);
  for (const [key, prompt] of Object.entries(snapshot)) {
    assert.equal((prompt.match(/## CLASSIFICAÇÕES — REGRA OBRIGATÓRIA DE INDIVIDUALIZAÇÃO/g) || []).length, 1, key);
  }
});

test('V403 não introduz novo hot path', () => {
  assert.equal((source.match(/setTimeout\s*\(/g) || []).length, 1, 'mantém apenas a retentativa histórica do V320');
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /MutationObserver\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});