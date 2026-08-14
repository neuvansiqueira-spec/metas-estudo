const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('factory-resumo-aula-canonical-v327.js', 'utf8');
const pagesWorkflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

const BASE_PROMPT = `TRANSFORME AS FONTES CLASSIFICADAS COMO RESUMO/AULA EM MAPA HIERÁRQUICO DE PALAVRAS-CHAVE PARA CÓPIA MANUSCRITA.

## FIDELIDADE E CONTRADIÇÕES

PRESERVE ESTA REGRA JURÍDICA SENTINELA SEM ALTERAÇÃO.

## CAPITALIZAÇÃO DOS TÓPICOS E SUBTÓPICOS

MANTENHA OS TÍTULOS PRINCIPAIS MARCADOS COM ♦️ INTEGRALMENTE EM LETRAS MAIÚSCULAS.

NOS CABEÇALHOS DE TÓPICO OU SUBTÓPICO MARCADOS COM ▶️📚, INICIE COM LETRA MAIÚSCULA TODAS AS PALAVRAS RELEVANTES.

EXEMPLO OBRIGATÓRIO DE PADRÃO:

▶️📚 Critério Material ou Substancial. Conteúdo Ofensivo:

## CONTROLE OBJETIVO DE TÍTULOS, SUBTÓPICOS E LINHAS

PREFIRA LINHAS COM ATÉ 22 PALAVRAS.

## FORMATO OBRIGATÓRIO

♦️ [EMOJI] [NUMERAÇÃO]. [PALAVRA-NÚCLEO]

▶️📚 [INSTITUTO]. [ASSUNTO]:

1️⃣ **[INSTITUTO]:** [RELAÇÃO]

✅ [RESULTADO]

## HIERARQUIA E NUMERAÇÃO

1️⃣ INSTITUTO PRINCIPAL.

2️⃣ ELEMENTO DEPENDENTE.

USE INDENTAÇÃO PROGRESSIVA REAL.

## TÍTULOS E SUBTÓPICOS

PRESERVE OS EMOJIS QUE ANTECEDEM OS TÍTULOS.

USE:

▶️📚 [INSTITUTO]. [ASSUNTO]:

## ORGANIZAÇÃO

NÃO REPITA A MESMA REGRA EM BLOCOS DIFERENTES.

## WORD DO MÓDULO

GERE UM ARQUIVO .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO RESUMO/AULA.

NOME DO ARQUIVO:

MAPA_HIERARQUICO_RESUMO_AULA_[FILTRO].docx

## SANÇÕES PENAIS — REGRA OBRIGATÓRIA

PENA SENTINELA: PRESERVAR INTEGRALMENTE.`;

function createHarness(prompt = BASE_PROMPT) {
  const context = vm.createContext({ console, Date, Object, Boolean, JSON });
  vm.runInContext(`
    const FACTORY_RESUMO_AULA_PROMPT = ${JSON.stringify(BASE_PROMPT)};
    const defaultFactoryPromptLibrary = {
      triagem: 'TRIAGEM PADRÃO',
      resumoAula: ${JSON.stringify(prompt)},
      lei: 'LEI PADRÃO',
      jurisprudencia: 'JURISPRUDÊNCIA PADRÃO',
      peca: 'PEÇA PADRÃO',
      consolidacao: 'CONSOLIDAÇÃO PADRÃO'
    };
    let state = {
      migrations: {},
      factoryPromptLibrary: {
        triagem: 'TRIAGEM ATUAL',
        resumoAula: ${JSON.stringify(prompt)},
        lei: 'LEI ATUAL',
        jurisprudencia: 'JURISPRUDÊNCIA ATUAL',
        peca: 'PEÇA ATUAL',
        consolidacao: 'CONSOLIDAÇÃO ATUAL'
      }
    };
    let saves = 0;
    function saveData() { saves += 1; }
    function normalizeFactoryPromptLibrary(library = {}) { return { ...library }; }
    function factoryPromptBase(type) {
      const text = String(state.factoryPromptLibrary?.[type] || '').trim();
      return text || 'FALLBACK';
    }
  `, context);
  vm.runInContext(source, context);
  return context;
}

function currentPrompt(context) {
  return vm.runInContext('state.factoryPromptLibrary.resumoAula', context);
}

function assertCanonical(prompt) {
  assert.match(prompt, /## PADRÃO VISUAL DO WORD/);
  assert.match(prompt, /▶️📚 CRITÉRIO MATERIAL OU SUBSTANCIAL\. CONTEÚDO OFENSIVO:/);
  assert.match(prompt, /FAIXA HORIZONTAL AZUL-CLARA DISCRETA/);
  assert.match(prompt, /COR PRETA PURA #000000/);
  assert.match(prompt, /🏛️ \*\*COMPETÊNCIA:\*\*/);
  assert.match(prompt, /⏱️ \*\*PRAZO:\*\*/);
  assert.match(prompt, /🚫 \*\*VEDAÇÃO:\*\*/);
  assert.match(prompt, /✅ \*\*REGRA:\*\*/);
  assert.match(prompt, /✳️ \*\*EXCEÇÃO:\*\*/);
  assert.match(prompt, /📌 \*\*PROVA:\*\*/);
  assert.doesNotMatch(prompt, /INICIE COM LETRA MAIÚSCULA TODAS AS PALAVRAS RELEVANTES/);
  assert.doesNotMatch(prompt, /▶️📚 Critério Material ou Substancial\. Conteúdo Ofensivo:/);
}

test('V327 torna a versão visual nova o prompt padrão e o prompt salvo do RESUMO/AULA', () => {
  const context = createHarness();
  const statePrompt = currentPrompt(context);
  const defaultPrompt = vm.runInContext('defaultFactoryPromptLibrary.resumoAula', context);

  assertCanonical(statePrompt);
  assertCanonical(defaultPrompt);
  assert.match(statePrompt, /PRESERVE ESTA REGRA JURÍDICA SENTINELA SEM ALTERAÇÃO\./);
  assert.match(statePrompt, /## SANÇÕES PENAIS — REGRA OBRIGATÓRIA\n\nPENA SENTINELA: PRESERVAR INTEGRALMENTE\./);
  assert.ok(vm.runInContext('state.migrations.factoryResumoAulaCanonicalVisualV327', context));
  assert.equal(vm.runInContext('saves', context), 1);
});

test('V327 corrige o prompt no momento da geração mesmo se uma cópia antiga reaparecer no estado', () => {
  const context = createHarness();
  vm.runInContext(`state.factoryPromptLibrary.resumoAula = ${JSON.stringify(BASE_PROMPT)}`, context);

  const generated = vm.runInContext('factoryPromptBase("resumoAula")', context);
  assertCanonical(generated);
  assertCanonical(currentPrompt(context));
});

test('V327 corrige cópias antigas que entrem pela normalização/importação da biblioteca', () => {
  const context = createHarness();
  const normalized = vm.runInContext(`normalizeFactoryPromptLibrary({ resumoAula: ${JSON.stringify(BASE_PROMPT)}, lei: 'LEI IMPORTADA' })`, context);

  assertCanonical(normalized.resumoAula);
  assert.equal(normalized.lei, 'LEI IMPORTADA');
});

test('V327 não altera a geração dos demais módulos', () => {
  const context = createHarness();
  assert.equal(vm.runInContext('factoryPromptBase("lei")', context), 'LEI ATUAL');
  assert.equal(vm.runInContext('factoryPromptBase("jurisprudencia")', context), 'JURISPRUDÊNCIA ATUAL');
  assert.equal(vm.runInContext('factoryPromptBase("peca")', context), 'PEÇA ATUAL');
  assert.equal(vm.runInContext('factoryPromptBase("triagem")', context), 'TRIAGEM ATUAL');
});

test('V327 é idempotente e não duplica as seções visuais ou a regra de sanções penais', () => {
  const context = createHarness();
  const once = currentPrompt(context);
  const twice = vm.runInContext('__aldusFactoryResumoAulaCanonicalV327.patchPrompt(state.factoryPromptLibrary.resumoAula)', context);

  assert.equal(twice, once);
  assert.equal((twice.match(/## CAPITALIZAÇÃO DOS TÓPICOS E SUBTÓPICOS/g) || []).length, 1);
  assert.equal((twice.match(/## FORMATO OBRIGATÓRIO/g) || []).length, 1);
  assert.equal((twice.match(/## HIERARQUIA E NUMERAÇÃO/g) || []).length, 1);
  assert.equal((twice.match(/## TÍTULOS E SUBTÓPICOS/g) || []).length, 1);
  assert.equal((twice.match(/## PADRÃO VISUAL DO WORD/g) || []).length, 1);
  assert.equal((twice.match(/## WORD DO MÓDULO/g) || []).length, 1);
  assert.equal((twice.match(/## SANÇÕES PENAIS — REGRA OBRIGATÓRIA/g) || []).length, 1);
});

test('V327 possui guardas de geração, normalização e retentativas contra timing/cache', () => {
  [
    '__aldusResumoAulaGeneratorGuardV327',
    '__aldusResumoAulaNormalizerGuardV327',
    'factoryPromptBaseV327',
    'normalizeFactoryPromptLibraryV327',
    '30000',
    '60000',
    'visibilitychange',
    'pageshow'
  ].forEach((fragment) => assert.ok(source.includes(fragment), `faltou: ${fragment}`));
});

test('deploy da V327 valida, copia, injeta após V326 e renova o cache público', () => {
  assert.match(pagesWorkflow, /node --check factory-resumo-aula-canonical-v327\.js/);
  assert.match(pagesWorkflow, /tests\/v327-factory-resumo-aula-canonical\.test\.js/);
  assert.match(pagesWorkflow, /cp factory-resumo-aula-canonical-v327\.js docs\/factory-resumo-aula-canonical-v327\.js/);
  assert.match(pagesWorkflow, /aldusFactoryResumoAulaCanonicalV327/);
  assert.match(pagesWorkflow, /factory-resumo-aula-canonical-v327\.js\?v=20260814-factory-resumo-aula-canonical-v327/);
  assert.match(pagesWorkflow, /factory-resumo-aula-canonical-v327/);
  assert.ok(
    pagesWorkflow.indexOf('aldusFactoryResumoAulaCanonicalV327') > pagesWorkflow.indexOf('aldusFactoryResumoAulaVisualV326'),
    'a V327 deve ser injetada depois da V326 para assumir a fonte canônica final'
  );
});
