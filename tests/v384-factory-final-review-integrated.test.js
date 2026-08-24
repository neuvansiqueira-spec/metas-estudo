const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtimePath = 'factory-final-review-v384.js';
const docsRuntimePath = 'docs/factory-final-review-v384.js';
const runtime = fs.readFileSync(runtimePath, 'utf8');
const docsRuntime = fs.readFileSync(docsRuntimePath, 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');
const docsSecurity = fs.readFileSync('docs/security-observability-v318.js', 'utf8');
const api = require(`../${runtimePath}`);

test('V384 reconhece os dois produtos integrados sem criar novos slots de produção', () => {
  assert.equal(api.version, '20260824-final-review-consolidation-v384');
  assert.match(runtime, /RESUMO\/AULA \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /LEI \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /AUDITORIA DE COMPOSIÇÃO/);
  assert.match(runtime, /O INVENTÁRIO DO SITE É LOGÍSTICO/);
  assert.doesNotMatch(runtime, /FACTORY_MODULES/);
});

test('V384 deduplica jurisprudência sem apagar conteúdo único, distinções ou divergências', () => {
  assert.match(runtime, /DEDUPLICAÇÃO JURISPRUDENCIAL OBRIGATÓRIA/);
  assert.match(runtime, /não descarte a jurisprudência autônoma por inteiro/i);
  assert.match(runtime, /toda tese única e relevante/i);
  assert.match(runtime, /NÃO APAGUE DIVERGÊNCIAS REAIS/);
  assert.match(runtime, /JURISPRUDÊNCIA COMPLEMENTAR/);
});

test('V384 escolhe o contexto principal correto para cada tese', () => {
  assert.match(runtime, /artigo\/dispositivo legal -> LEI \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /instituto, conceito, classificação ou explicação geral -> RESUMO\/AULA \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /mantenha o bloco completo somente no contexto principal/);
});

test('V384 cria um único quadro jurisprudencial global em consolidação múltipla', () => {
  assert.match(runtime, /QUADRO FINAL ÚNICO DE JURISPRUDÊNCIA/);
  assert.match(runtime, /QUADRO FINAL DE JURISPRUDÊNCIA DO TEMA/);
  assert.match(runtime, /não mantenha vários QUADROS FINAIS/i);
  assert.match(runtime, /preserve o quadro final próprio daquele produto/);
});

test('V384 mantém PEÇA separada e não a reclassifica por existir lei relacionada', () => {
  assert.match(runtime, /F\) PEÇA:/);
  assert.match(runtime, /não converta PEÇA em AULA, LEI ou JURISPRUDÊNCIA/);
  assert.match(runtime, /não use dispositivos legais relacionados para reclassificar tema de PEÇA/);
});

test('V384 exige sumário didático no Word final', () => {
  assert.match(runtime, /SUMÁRIO DIDÁTICO DO ARQUIVO FINAL/);
  assert.match(runtime, /♦️ \*\*📑 SUMÁRIO\*\*/);
  assert.match(runtime, /NUNCA JUSTIFICADO/);
  assert.match(runtime, /hiperlinks internos/);
  assert.match(runtime, /líder pontilhado/);
});

test('roteador de múltiplos produtos alerta que slots não distinguem puro de integrado', () => {
  const item = {
    disciplina: 'Direito Penal',
    tema: 'Tema teste',
    modules: {
      resumoAula: { status: 'Aprovado', wordLink: 'aula.docx' },
      lei: { status: 'Aprovado', wordLink: 'lei.docx' },
      jurisprudencia: { status: 'Aprovado', wordLink: 'juris.docx' },
      peca: { status: 'Não se aplica' }
    }
  };
  const text = api.dynamicFinalRouter(item, () => 'Disciplina: Direito Penal\nTema: Tema teste\nMÓDULO: CONSOLIDAÇÃO');
  assert.match(text, /AUDITORIA DE COMPOSIÇÃO OBRIGATÓRIA/);
  assert.match(text, /RESUMO\/AULA pode conter RESUMO\/AULA \+ JURISPRUDÊNCIA/);
  assert.match(text, /LEI pode conter LEI \+ JURISPRUDÊNCIA/);
  assert.match(text, /Faça deduplicação jurisprudencial transversal/);
});

test('roteador mantém refinamento único e bloqueio quando não há produto', () => {
  const single = api.dynamicFinalRouter({
    modules: { resumoAula: { status: 'Aprovado', wordLink: 'aula.docx' } }
  }, () => 'Disciplina: X\nTema: Y');
  assert.match(single, /REFINAMENTO FINAL DE PRODUTO ÚNICO/);
  assert.match(single, /determine se ele é puro ou integrado/i);

  const empty = api.dynamicFinalRouter({ modules: {} }, () => 'Disciplina: X\nTema: Y');
  assert.match(empty, /BLOQUEADA COM SEGURANÇA/);
  assert.match(empty, /não gere Word nem PDF/i);
});

test('V384 permanece fora de hot paths e sem persistência automática', () => {
  for (const forbidden of [
    'MutationObserver',
    'setInterval(',
    'getComputedStyle(',
    'requestAnimationFrame(',
    'indexedDB',
    'localStorage',
    'saveData('
  ]) {
    assert.equal(runtime.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
  assert.match(runtime, /addEventListener\("load", install, \{ once: true \}\)/);
});

test('loader V384 é isolado e raiz/docs permanecem idênticos', () => {
  assert.match(security, /installFactoryFinalReviewV384/);
  assert.match(security, /factory-final-review-v384\.js\?v=20260824-final-review-consolidation-v384/);
  assert.match(security, /script\.async = false/);
  assert.equal(runtime, docsRuntime, 'runtime V384 deve ser idêntico entre raiz e docs');
  assert.equal(security, docsSecurity, 'security-observability deve ser idêntico entre raiz e docs');
});
