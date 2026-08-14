const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('factory-resumo-aula-visual-v326.js', 'utf8');
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
  const context = vm.createContext({ console, Date, Object, Boolean });
  vm.runInContext(`
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
  `, context);
  vm.runInContext(source, context);
  return context;
}

function currentPrompt(context) {
  return vm.runInContext('state.factoryPromptLibrary.resumoAula', context);
}

test('V326 transporta a identidade visual do módulo LEI sem alterar o núcleo jurídico do RESUMO/AULA', () => {
  const context = createHarness();
  const prompt = currentPrompt(context);

  assert.match(prompt, /PRESERVE ESTA REGRA JURÍDICA SENTINELA SEM ALTERAÇÃO\./);
  assert.match(prompt, /## SANÇÕES PENAIS — REGRA OBRIGATÓRIA\n\nPENA SENTINELA: PRESERVAR INTEGRALMENTE\./);
  assert.match(prompt, /## CAPITALIZAÇÃO DOS TÓPICOS E SUBTÓPICOS/);
  assert.match(prompt, /NOS CABEÇALHOS DE TÓPICO OU SUBTÓPICO MARCADOS COM ▶️📚, USE TODO O TEXTO INTEGRALMENTE EM LETRAS MAIÚSCULAS/);
  assert.match(prompt, /▶️📚 CRITÉRIO MATERIAL OU SUBSTANCIAL\. CONTEÚDO OFENSIVO:/);
  assert.doesNotMatch(prompt, /▶️📚 Critério Material ou Substancial\. Conteúdo Ofensivo:/);
});

test('V326 aplica faixa azul, preto puro, negrito até os dois-pontos e hierarquia visual funcional', () => {
  const context = createHarness();
  const prompt = currentPrompt(context);

  [
    '## PADRÃO VISUAL DO WORD',
    'COR PRETA PURA #000000',
    'FAIXA HORIZONTAL AZUL-CLARA DISCRETA',
    'NOS MOLDES VISUAIS DO CABEÇALHO DE ARTIGO DO MÓDULO LEI',
    'NÃO APLIQUE FAIXA AZUL-CLARA AOS TÍTULOS ♦️',
    'A FAIXA AZUL-CLARA É EXCLUSIVA DO CABEÇALHO ▶️📚',
    'O NEGRITO TERMINA NOS DOIS-PONTOS',
    '🏛️ **COMPETÊNCIA:**',
    '⏱️ **PRAZO:**',
    '🚫 **VEDAÇÃO:**',
    '✅ **REGRA:**',
    '✳️ **EXCEÇÃO:**',
    '📌 **PROVA:**',
    'NÃO NUMERE ARTIFICIALMENTE UMA INFORMAÇÃO ISOLADA APENAS PARA PREENCHER O PADRÃO VISUAL'
  ].forEach((fragment) => assert.ok(prompt.includes(fragment), `faltou: ${fragment}`));

  assert.equal((prompt.match(/## PADRÃO VISUAL DO WORD/g) || []).length, 1);
});

test('V326 altera somente o prompt RESUMO/AULA e persiste a migração uma única vez', () => {
  const context = createHarness();
  const library = vm.runInContext('JSON.parse(JSON.stringify(state.factoryPromptLibrary))', context);

  assert.equal(library.triagem, 'TRIAGEM ATUAL');
  assert.equal(library.lei, 'LEI ATUAL');
  assert.equal(library.jurisprudencia, 'JURISPRUDÊNCIA ATUAL');
  assert.equal(library.peca, 'PEÇA ATUAL');
  assert.equal(library.consolidacao, 'CONSOLIDAÇÃO ATUAL');
  assert.notEqual(library.resumoAula, BASE_PROMPT);
  assert.equal(vm.runInContext('saves', context), 1);
  assert.ok(vm.runInContext('state.migrations.factoryResumoAulaVisualLeiV326', context));
});

test('V326 é idempotente e não duplica seções visuais', () => {
  const context = createHarness();
  const once = currentPrompt(context);
  const twice = vm.runInContext('__aldusFactoryResumoAulaVisualV326.patchPrompt(state.factoryPromptLibrary.resumoAula)', context);

  assert.equal(twice, once);
  assert.equal((twice.match(/## CAPITALIZAÇÃO DOS TÓPICOS E SUBTÓPICOS/g) || []).length, 1);
  assert.equal((twice.match(/## FORMATO OBRIGATÓRIO/g) || []).length, 1);
  assert.equal((twice.match(/## HIERARQUIA E NUMERAÇÃO/g) || []).length, 1);
  assert.equal((twice.match(/## TÍTULOS E SUBTÓPICOS/g) || []).length, 1);
  assert.equal((twice.match(/## PADRÃO VISUAL DO WORD/g) || []).length, 1);
  assert.equal((twice.match(/## SANÇÕES PENAIS — REGRA OBRIGATÓRIA/g) || []).length, 1);
});

test('V326 ignora textos que não sejam o prompt oficial RESUMO/AULA', () => {
  const context = createHarness('PROMPT PERSONALIZADO SEM ASSINATURA OFICIAL');
  assert.equal(currentPrompt(context), 'PROMPT PERSONALIZADO SEM ASSINATURA OFICIAL');
  assert.equal(vm.runInContext('saves', context), 0);
});

test('deploy valida, copia e injeta a V326 após a política de penas', () => {
  assert.match(pagesWorkflow, /node --check factory-resumo-aula-visual-v326\.js/);
  assert.match(pagesWorkflow, /tests\/v326-factory-resumo-aula-visual\.test\.js/);
  assert.match(pagesWorkflow, /cp factory-resumo-aula-visual-v326\.js docs\/factory-resumo-aula-visual-v326\.js/);
  assert.match(pagesWorkflow, /aldusFactoryResumoAulaVisualV326/);
  assert.match(pagesWorkflow, /factory-resumo-aula-visual-v326\.js\?v=20260814-factory-resumo-aula-visual-v326/);
  assert.ok(
    pagesWorkflow.indexOf('aldusFactoryResumoAulaVisualV326') > pagesWorkflow.indexOf('aldusFactoryPenaltiesV320'),
    'a atualização visual deve ser injetada depois da política de penas'
  );
});
