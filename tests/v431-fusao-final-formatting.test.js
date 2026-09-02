const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const toc = read('factory-summary-toc-v381.js');
const fusao = read('factory-fusao-final-v425.js');

const relocacao = require(path.join(root, "factory-fusao-final-relocation-v431.js"));
const relocationApi = () => relocacao;

const PROMPT_DO_USUARIO = [
  '## ESCOPO DO MÓDULO FUSÃO FINAL',
  '',
  'texto que o usuário editou à mão',
  '',
  '## RELATÓRIO FINAL OBRIGATÓRIO',
  '',
  'Ao final, informe:',
  '* quais fontes foram efetivamente usadas;',
  '* confirmação de que o documento original permanece intacto.'
].join('\n');

test('V431 inclui fusaoFinal nas duas listas de alvo do sumário e do sombreamento', () => {
  const alvo = toc.match(/const TARGET_TYPES = Object\.freeze\(\[[\s\S]*?\]\);/)[0];
  const bege = toc.match(/const BEIGE_TARGET_TYPES = Object\.freeze\(\[[\s\S]*?\]\);/)[0];
  assert.match(alvo, /"fusaoFinal"/, 'sem isso o sumário não é injetado no prompt da Fusão Final');
  assert.match(bege, /"fusaoFinal"/, 'sem isso o sombreamento bege não é injetado');
});

test('V431 não acrescenta fusaoFinal à lista da citação jurisprudencial', () => {
  const citacao = toc.match(/JURISPRUDENCE_CITATION[A-Z_]*_TARGET_TYPES = Object\.freeze\(\[[\s\S]*?\]\);/);
  if (!citacao) return; // a lista pode não existir sob esse nome; nada a verificar
  assert.doesNotMatch(citacao[0], /"fusaoFinal"/,
    'a Fusão Final preserva a jurisprudência existente, não gera citação nova');
});

test('V431 injeta a seção de relocação no prompt já salvo pelo usuário', () => {
  const { withRelocationSection } = relocationApi();
  const resultado = withRelocationSection(PROMPT_DO_USUARIO);
  assert.match(resultado, /## RELOCAÇÃO DE JURISPRUDÊNCIA/);
  assert.ok(resultado.includes('texto que o usuário editou à mão'),
    'a edição manual do usuário não pode ser descartada');
});

test('V431 posiciona a seção antes do relatório final', () => {
  const { withRelocationSection } = relocationApi();
  const resultado = withRelocationSection(PROMPT_DO_USUARIO);
  assert.ok(resultado.indexOf('## RELOCAÇÃO DE JURISPRUDÊNCIA') < resultado.indexOf('## RELATÓRIO FINAL OBRIGATÓRIO'),
    'a exigência precisa vir antes do relatório que a cobra');
});

test('V431 acrescenta as duas linhas de prestação de contas ao relatório', () => {
  const { withRelocationSection } = relocationApi();
  const resultado = withRelocationSection(PROMPT_DO_USUARIO);
  assert.match(resultado, /\* jurisprudências relocadas, com origem e destino;/);
  assert.match(resultado, /\* jurisprudências avaliadas e mantidas na posição original, com o motivo;/);
});

test('V431 exige declaração expressa quando nada foi relocado', () => {
  const RELOCATION_SECTION = relocationApi().section;
  assert.match(RELOCATION_SECTION, /SE NENHUMA TESE FOI MOVIDA, DIGA ISSO EXPRESSAMENTE/,
    'o silêncio foi exatamente o que ocorreu no documento que motivou esta correção');
});

test('V431 proíbe converter sublinhado em realce', () => {
  const RELOCATION_SECTION = relocationApi().section;
  assert.match(RELOCATION_SECTION, /SUBLINHADO NÃO É REALCE/);
  assert.match(RELOCATION_SECTION, /PROIBIDO converter sublinhado em realce/);
});

test('V431 preserva a cor da marca sem afetar a cor do corpo do texto', () => {
  const RELOCATION_SECTION = relocationApi().section;
  assert.match(RELOCATION_SECTION, /A MARCA MANTÉM A COR QUE TINHA NO PDF/);
  assert.match(RELOCATION_SECTION, /Sublinhado vermelho continua vermelho/);
  assert.match(RELOCATION_SECTION, /NÃO converta marca colorida para preto/);
  assert.match(RELOCATION_SECTION, /O texto do corpo do resumo continua preto #000000/,
    'a regra vale para a marca, não para o corpo — a identidade do projeto exige preto');
});

test('V431 exige espaçamento idêntico entre blocos irmãos', () => {
  const RELOCATION_SECTION = relocationApi().section;
  assert.match(RELOCATION_SECTION, /ESPAÇAMENTO — SEGUIR O DOCUMENTO DE ORIGEM/);
  assert.match(RELOCATION_SECTION, /inserir linha em branco ou parágrafo vazio entre entradas do mesmo tipo/);
  assert.match(RELOCATION_SECTION, /ficam com espaçamento IDÊNTICO entre si/);
  assert.match(RELOCATION_SECTION, /CONFERÊNCIA OBRIGATÓRIA ANTES DE ENTREGAR/,
    'sem conferência explícita o modelo não revisa o próprio espaçamento');
});

test('V431 é idempotente: injetar duas vezes não duplica a seção', () => {
  const { withRelocationSection } = relocationApi();
  const uma = withRelocationSection(PROMPT_DO_USUARIO);
  assert.equal(withRelocationSection(uma), uma);
  assert.equal(uma.match(/## RELOCAÇÃO DE JURISPRUDÊNCIA/g).length, 1);
});

test('V431 acrescenta ao fim quando o prompt não tem relatório final', () => {
  const { withRelocationSection } = relocationApi();
  const resultado = withRelocationSection('## ESCOPO\n\nprompt curto');
  assert.match(resultado, /## RELOCAÇÃO DE JURISPRUDÊNCIA/);
  assert.ok(resultado.startsWith('## ESCOPO'));
});

test('V431 não altera prompt vazio', () => {
  const { withRelocationSection } = relocationApi();
  assert.equal(withRelocationSection(''), '');
  assert.equal(withRelocationSection('   '), '   ');
});

test('V431 mantém a proibição de reescrever a redação', () => {
  assert.match(fusao, /reescrever, resumir, encurtar ou "melhorar" a redação/,
    'a relocação muda posição, nunca texto');
});

test('V431 não altera o módulo protegido pela trava de escopo da V426', () => {
  // .github/workflows/v426-validation.yml proíbe qualquer alteração neste
  // arquivo. A relocação entra por composição, num módulo próprio.
  const relocationSource = read('factory-fusao-final-relocation-v431.js');
  assert.doesNotMatch(fusao, /RELOCAÇÃO DE JURISPRUDÊNCIA/);
  assert.match(relocationSource, /RELOCAÇÃO DE JURISPRUDÊNCIA/);
});

test('V431 embrulha o roteador sem substituir o prompt do usuário', () => {
  const previous = global.factoryPromptBase;
  try {
    global.factoryPromptBase = (type) => (type === 'fusaoFinal' ? PROMPT_DO_USUARIO : `anterior:${type}`);
    assert.equal(relocationApi().install(), true);
    const servido = global.factoryPromptBase('fusaoFinal');
    assert.ok(servido.includes('texto que o usuário editou à mão'));
    assert.match(servido, /## RELOCAÇÃO DE JURISPRUDÊNCIA/);
    assert.equal(global.factoryPromptBase('triagem'), 'anterior:triagem', 'outros tipos passam intactos');
    assert.equal(relocationApi().install(), true, 'instalar duas vezes não duplica o embrulho');
    assert.equal(global.factoryPromptBase('fusaoFinal'), servido);
  } finally {
    if (previous === undefined) delete global.factoryPromptBase;
    else global.factoryPromptBase = previous;
  }
});

test('V431 mantém paridade raiz/docs nos módulos tocados', () => {
  assert.equal(read('factory-summary-toc-v381.js'), read('docs/factory-summary-toc-v381.js'));
  assert.equal(read('factory-fusao-final-relocation-v431.js'), read('docs/factory-fusao-final-relocation-v431.js'));
  assert.equal(read('security-observability-v318.js'), read('docs/security-observability-v318.js'));
  assert.match(read('security-observability-v318.js'), /factory-fusao-final-relocation-v431\.js\?v=\d{8}-[a-z0-9-]+/);
});
