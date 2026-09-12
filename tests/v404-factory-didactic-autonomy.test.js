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

test('V404 aplica didática, autossuficiência e clareza a todos os prompts da Fábrica', () => {
  const { context } = createFactoryHarness();
  const snapshot = vm.runInContext('JSON.parse(JSON.stringify(state.factoryPromptLibrary))', context);
  for (const [key, prompt] of Object.entries(snapshot)) {
    assert.equal((prompt.match(/## DIDÁTICA, AUTOSSUFICIÊNCIA E CLAREZA INTERPRETATIVA — REGRA GERAL OBRIGATÓRIA/g) || []).length, 1, key);
    assert.equal((prompt.match(/## CLASSIFICAÇÕES — REGRA OBRIGATÓRIA DE INDIVIDUALIZAÇÃO/g) || []).length, 1, key);
  }
  assert.ok(vm.runInContext('state.migrations.factoryDidacticAutonomyScopeV404', context));
});

test('V404 exige conclusões autossuficientes sem transformar resumo em aula', () => {
  for (const fragment of [
    'MÁXIMA CLAREZA COM O MÍNIMO DE TEXTO NECESSÁRIO',
    'SUJEITO, OBJETO, CONDIÇÃO, REFERENTE OU CONSEQUÊNCIA OMITIDOS',
    'CONDIÇÃO → RESULTADO',
    'APRESENTE PRIMEIRO A IDEIA CENTRAL EM LINGUAGEM CLARA',
    'CONCEITO — O QUE É',
    'MECANISMO — COMO FUNCIONA',
    'FINALIDADE — PARA QUE SERVE',
    'DISTINÇÃO — DIFERENÇA PARA INSTITUTO SEMELHANTE',
    'NÃO TRANSFORME O RESUMO EM AULA',
    'NÃO INCLUA INFORMAÇÃO EXTERNA NÃO AUTORIZADA',
    'NÃO REMOVA, RESUMA, SUBSTITUA OU ENFRAQUEÇA NENHUMA REGRA JÁ EXISTENTE'
  ]) assert.ok(source.includes(fragment), fragment);
});

test('V404 preserva a função dos módulos operacionais e de triagem', () => {
  assert.ok(source.includes('EM MÓDULOS DE NATUREZA OPERACIONAL OU DE TRIAGEM'));
  assert.ok(source.includes('NÃO CRIE EXPLICAÇÕES NOVAS NEM ALTERE A FUNÇÃO DO MÓDULO'));
});

test('V404 é idempotente nas retentativas existentes', () => {
  const { context, timers } = createFactoryHarness();
  timers.forEach((fn) => fn());
  const snapshot = vm.runInContext('JSON.parse(JSON.stringify(state.factoryPromptLibrary))', context);
  for (const [key, prompt] of Object.entries(snapshot)) {
    assert.equal((prompt.match(/## DIDÁTICA, AUTOSSUFICIÊNCIA E CLAREZA INTERPRETATIVA — REGRA GERAL OBRIGATÓRIA/g) || []).length, 1, key);
  }
});

test('V404 mantém espelhamento root/docs', () => {
  const docsSource = fs.readFileSync('docs/factory-penalties-v320.js', 'utf8');
  assert.equal(docsSource, source);
});

test('V404 não cria novo hot path de performance', () => {
  assert.equal((source.match(/setTimeout\s*\(/g) || []).length, 1, 'mantém apenas a retentativa histórica do V320');
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /MutationObserver\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});
