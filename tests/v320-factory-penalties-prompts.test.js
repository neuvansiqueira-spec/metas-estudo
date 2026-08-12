const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('factory-penalties-v320.js', 'utf8');
const pagesWorkflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

function createHarness() {
  const timers = [];
  const context = vm.createContext({
    console,
    Date,
    Object,
    Boolean,
    setTimeout(fn) { timers.push(fn); return timers.length; },
    document: { readyState: 'complete', addEventListener() {} },
    window: { addEventListener() {} },
    location: { hash: '' }
  });

  vm.runInContext(`
    const defaultFactoryPromptLibrary = {
      triagem: 'TRIAGEM PADRÃO',
      resumoAula: 'RESUMO/AULA PADRÃO',
      lei: 'LEI PADRÃO',
      jurisprudencia: 'JURISPRUDÊNCIA PADRÃO',
      peca: 'PEÇA PADRÃO',
      consolidacao: 'CONSOLIDAÇÃO PADRÃO'
    };
    let state = {
      migrations: {},
      factoryPromptLibrary: {
        triagem: 'TRIAGEM ATUAL',
        resumoAula: 'RESUMO/AULA ATUAL',
        lei: 'LEI ATUAL',
        jurisprudencia: 'JURISPRUDÊNCIA ATUAL',
        peca: 'PEÇA ATUAL',
        consolidacao: 'CONSOLIDAÇÃO ATUAL'
      }
    };
    let saves = 0;
    function saveData() { saves += 1; }
  `, context);

  vm.runInContext(source, context);
  return { context, timers };
}

test('V320 preserva qualidade e exige penas com limites, multa e causas de modificação', () => {
  [
    'PRESERVE INTEGRALMENTE A QUALIDADE, A PROFUNDIDADE DIDÁTICA',
    'LIMITE MÍNIMO E MÁXIMO',
    'MULTA',
    'FORMAS QUALIFICADAS',
    'CAUSAS DE AUMENTO OU DIMINUIÇÃO',
    'NÃO COMPLETE POR MEMÓRIA',
    'PRESERVE O FOCO JURISPRUDENCIAL',
    'FIANÇA, COMPETÊNCIA, RITO/PROCEDIMENTO, PRISÃO, MEDIDAS CAUTELARES, PRESCRIÇÃO'
  ].forEach((fragment) => assert.ok(source.includes(fragment), `faltou: ${fragment}`));
});

test('V320 altera somente RESUMO/AULA, LEI, JURISPRUDÊNCIA e PEÇA', () => {
  const { context } = createHarness();
  const snapshot = vm.runInContext(`JSON.parse(JSON.stringify(state.factoryPromptLibrary))`, context);
  assert.equal(snapshot.triagem, 'TRIAGEM ATUAL');
  assert.equal(snapshot.consolidacao, 'CONSOLIDAÇÃO ATUAL');
  for (const key of ['resumoAula', 'lei', 'jurisprudencia', 'peca']) {
    assert.equal((snapshot[key].match(/## SANÇÕES PENAIS — REGRA OBRIGATÓRIA/g) || []).length, 1, key);
  }
  assert.equal(vm.runInContext('saves', context), 1);
  assert.ok(vm.runInContext('state.migrations.factoryPenaltiesPromptPolicyV320', context));
});

test('V320 é idempotente e não duplica a regra durante as retentativas', () => {
  const { context, timers } = createHarness();
  timers.forEach((fn) => fn());
  const snapshot = vm.runInContext(`JSON.parse(JSON.stringify(state.factoryPromptLibrary))`, context);
  for (const key of ['resumoAula', 'lei', 'jurisprudencia', 'peca']) {
    assert.equal((snapshot[key].match(/## SANÇÕES PENAIS — REGRA OBRIGATÓRIA/g) || []).length, 1, key);
  }
  assert.equal(vm.runInContext('saves', context), 1);
});

test('deploy copia e injeta a V320 na versão publicada sem tocar em outros prompts', () => {
  assert.match(pagesWorkflow, /node --check factory-penalties-v320\.js/);
  assert.match(pagesWorkflow, /tests\/v320-factory-penalties-prompts\.test\.js/);
  assert.match(pagesWorkflow, /cp factory-penalties-v320\.js docs\/factory-penalties-v320\.js/);
  assert.match(pagesWorkflow, /aldusFactoryPenaltiesV320/);
  assert.match(pagesWorkflow, /factory-penalties-v320\.js\?v=20260812-factory-penalties-v320/);
});
