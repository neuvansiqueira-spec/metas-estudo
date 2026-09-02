const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const toc = read('factory-summary-toc-v381.js');
const fusao = read('factory-fusao-final-v425.js');

// Carrega apenas as funções de injeção, sem o resto do módulo.
function relocationApi() {
  const context = vm.createContext({});
  const pick = (re, nome) => {
    const m = fusao.match(re);
    assert.ok(m, `não encontrei ${nome}`);
    return m[0];
  };
  const fonte = [
    pick(/const RELOCATION_MARKER = "[^"]+";/, 'RELOCATION_MARKER'),
    pick(/const RELOCATION_SECTION = `[\s\S]*?`;/, 'RELOCATION_SECTION'),
    pick(/function withRelocationSection[\s\S]*?\n  }\n/, 'withRelocationSection'),
    pick(/function withRelocationReportLines[\s\S]*?\n  }\n/, 'withRelocationReportLines'),
    'globalThis.__api = { withRelocationSection, RELOCATION_SECTION };'
  ].join('\n');
  vm.runInContext(fonte, context);
  return context.__api;
}

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
  const { RELOCATION_SECTION } = relocationApi();
  assert.match(RELOCATION_SECTION, /SE NENHUMA TESE FOI MOVIDA, DIGA ISSO EXPRESSAMENTE/,
    'o silêncio foi exatamente o que ocorreu no documento que motivou esta correção');
});

test('V431 proíbe converter sublinhado em realce', () => {
  const { RELOCATION_SECTION } = relocationApi();
  assert.match(RELOCATION_SECTION, /SUBLINHADO NÃO É REALCE/);
  assert.match(RELOCATION_SECTION, /PROIBIDO converter sublinhado em realce/);
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

test('V431 mantém paridade raiz/docs nos dois módulos tocados', () => {
  assert.equal(read('factory-summary-toc-v381.js'), read('docs/factory-summary-toc-v381.js'));
  assert.equal(read('factory-fusao-final-v425.js'), read('docs/factory-fusao-final-v425.js'));
});
