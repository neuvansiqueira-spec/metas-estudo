const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtime = fs.readFileSync('factory-cobertura-v640.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-cobertura-v640.js', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');

const TIPOS = ['resumoAula', 'resumoAulaJurisprudencia', 'lei', 'leiJurisprudencia', 'jurisprudencia',
  'peca', 'consolidacao', 'fusaoFinal', 'padronizacaoFinalSumario'];

function carregar(biblioteca) {
  const ctx = {
    console,
    setTimeout: (fn) => { fn(); return 0; },
    document: { readyState: 'complete', addEventListener() {} },
    state: { factoryPromptLibrary: biblioteca, migrations: {} },
    defaultFactoryPromptLibrary: { ...biblioteca },
    saves: 0,
    addEventListener() {}
  };
  ctx.saveData = () => { ctx.saves += 1; };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(runtime, ctx);
  return ctx;
}

function bibliotecaCompleta() {
  return Object.fromEntries(TIPOS.map((t) => [t, `PROMPT DO MÓDULO ${t.toUpperCase()}.`])
    .concat([['triagem', 'PROMPT DE TRIAGEM.']]));
}

test('V640 mantém raiz e docs idênticos e é carregado pelo index.html', () => {
  assert.equal(runtime, docsRuntime, 'runtime V640 deve ser idêntico entre raiz e docs');
  assert.equal(rootHtml, docsHtml, 'index.html deve ser idêntico entre raiz e docs');
  assert.match(rootHtml, /id="aldusFactoryCoberturaV640"[^>]+factory-cobertura-v640\.js/);
});

test('V640 põe a prova de cobertura em todos os prompts que geram documento', () => {
  const ctx = carregar(bibliotecaCompleta());
  for (const tipo of TIPOS) {
    assert.match(ctx.state.factoryPromptLibrary[tipo], /## PROVA DE COBERTURA E NÃO REGRESSÃO/, `faltou em ${tipo}`);
  }
  // a TRIAGEM escolhe fontes, não produz arquivo: fica de fora
  assert.equal(ctx.state.factoryPromptLibrary.triagem, 'PROMPT DE TRIAGEM.');
  assert.ok(ctx.state.migrations.factoryCoberturaV640, 'a migração deve ficar registrada');
  assert.equal(ctx.saves, 1, 'salva uma vez, não a cada abertura');
});

test('V640 exige as quatro coisas que faltavam: fontes, normas, linha de cobertura e não regressão', () => {
  const prompt = carregar(bibliotecaCompleta()).state.factoryPromptLibrary.resumoAula;
  assert.match(prompt, /LISTE NA RESPOSTA DA CONVERSA — NUNCA DENTRO DO ARQUIVO — AS FONTES AUTORIZADAS/);
  assert.match(prompt, /DEVE APARECER NO PRODUTO COM NÚMERO E ANO/);
  assert.match(prompt, /ENTREGUE A LINHA DE COBERTURA/);
  assert.match(prompt, /NÃO PODE TER MENOS GRANDES EIXOS, MENOS INSTITUTOS NEM MENOS NORMAS E JULGADOS/);
  assert.match(prompt, /SUPRIMIR UM BLOCO QUE JÁ EXISTIA É ERRO/);
  assert.match(prompt, /REDUZIR TAMANHO NÃO É OBJETIVO EM NENHUMA ETAPA/);
});

test('V640 não duplica a seção quando roda de novo e guarda o prompt anterior', () => {
  const ctx = carregar(bibliotecaCompleta());
  const primeira = ctx.state.factoryPromptLibrary.lei;
  const antes = ctx.saves;
  ctx.__aldusFactoryCoberturaV640.apply();
  ctx.__aldusFactoryCoberturaV640.apply();
  assert.equal(ctx.state.factoryPromptLibrary.lei, primeira, 'a seção não pode ser acrescentada duas vezes');
  assert.equal((primeira.match(/## PROVA DE COBERTURA E NÃO REGRESSÃO/g) || []).length, 1);
  assert.equal(ctx.saves, antes, 'sem mudança, não salva de novo');
  assert.equal(ctx.state.factoryPromptLibraryBackups.leiBeforeCobertura20260923, 'PROMPT DO MÓDULO LEI.');
});

test('V640 substitui uma versão anterior da própria seção, em vez de empilhar', () => {
  const antiga = 'PROMPT.\n\n## PROVA DE COBERTURA E NÃO REGRESSÃO\n\nTEXTO ANTIGO DA REGRA.\n\n## OUTRA SEÇÃO\n\nFIM.';
  const ctx = carregar({ resumoAula: antiga });
  const novo = ctx.state.factoryPromptLibrary.resumoAula;
  assert.equal((novo.match(/## PROVA DE COBERTURA E NÃO REGRESSÃO/g) || []).length, 1);
  assert.doesNotMatch(novo, /TEXTO ANTIGO DA REGRA/);
  assert.match(novo, /## OUTRA SEÇÃO[\s\S]*FIM\./, 'o resto do prompt é preservado');
});

test('V640 ignora prompt vazio ou ainda não cadastrado', () => {
  const ctx = carregar({ lei: '', peca: '[PROMPT COMPLETO AINDA NÃO CADASTRADO]' });
  assert.equal(ctx.state.factoryPromptLibrary.lei, '');
  assert.equal(ctx.state.factoryPromptLibrary.peca, '[PROMPT COMPLETO AINDA NÃO CADASTRADO]');
  assert.equal(ctx.saves, 0);
});

test('V640 não fica varrendo a página nem salvando sozinho', () => {
  assert.doesNotMatch(runtime, /MutationObserver/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
  assert.match(runtime, /addEventListener\("load", installWhenApplicationIsReady, \{ once: true \}\)/);
});
