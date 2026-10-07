const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtime = fs.readFileSync('factory-pente-fino-v663.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-pente-fino-v663.js', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const finalReview = require('../factory-final-review-v384.js');
const organizacao = fs.readFileSync('factory-prompt-organizacao-v639.js', 'utf8');

const COBERTURA = '## PROVA DE COBERTURA E NÃO REGRESSÃO\n\n<!-- PROVA-DE-COBERTURA-V640 -->\n\nTEXTO DA V640.';

function carregar({ biblioteca, roteiro, montagem } = {}) {
  const ctx = {
    console,
    setTimeout: () => 0,
    document: { readyState: 'complete', addEventListener() {} },
    state: { factoryPromptLibrary: biblioteca, migrations: {} },
    defaultFactoryPromptLibrary: { ...biblioteca },
    FACTORY_PROMPT_DESCRIPTIONS: { consolidacao: 'Reúne os módulos já gerados num documento único.' },
    saves: 0,
    addEventListener() {}
  };
  if (roteiro) ctx.factoryRouterText = roteiro;
  if (montagem) ctx.factoryPromptBase = montagem;
  ctx.saveData = () => { ctx.saves += 1; };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(runtime, ctx);
  return ctx;
}

function roteiroDaV384() {
  const roteiro = (type, item) => finalReview.dynamicFinalRouter(item, () => 'Disciplina: X\nTema: Y');
  Object.defineProperty(roteiro, '__aldusFactoryFinalReviewRouterWrappedV384', { value: '20260824-final-review-consolidation-v384' });
  return roteiro;
}

const promptSalvo = () => `${finalReview.prompt}\n\n${COBERTURA}\n`;

test('V663 mantém raiz e docs idênticos e é carregado pelo index.html', () => {
  assert.equal(runtime, docsRuntime);
  assert.equal(rootHtml, docsHtml);
  assert.match(rootHtml, /id="aldusFactoryPenteFinoV663"[^>]+factory-pente-fino-v663\.js/);
  assert.ok(rootHtml.indexOf('factory-cobertura-v640.js') < rootHtml.indexOf('factory-pente-fino-v663.js'));
  assert.match(organizacao, /consolidacao: "REVISÃO FINAL \+ PENTE-FINO"/);
});

test('V663 troca as seções 9 e 12 da revisão final e preserva o resto', () => {
  const ctx = carregar({ biblioteca: { consolidacao: promptSalvo(), resumoAula: 'PROMPT DO RESUMO.' } });
  const prompt = ctx.state.factoryPromptLibrary.consolidacao;
  assert.match(prompt, /## 9\. PENTE-FINO TÉCNICO-EDITORIAL/);
  assert.doesNotMatch(prompt, /## 9\. AUDITORIA JURÍDICA E DIDÁTICA/);
  assert.match(prompt, /### 9\.1 CONFERÊNCIA DIDÁTICA E VISUAL/);
  assert.match(prompt, /## 12\. ENTREGA EM DUAS FASES/);
  assert.match(prompt, /NÃO GERE WORD NEM PDF NESTA FASE/);
  assert.match(prompt, /## 10\. SUMÁRIO DIDÁTICO DO ARQUIVO FINAL/);
  assert.match(prompt, /## 11\. ARQUIVOS E SEGURANÇA/);
  assert.ok(prompt.includes(COBERTURA), 'a seção da V640 depois da 12 deve continuar inteira');
  assert.ok(prompt.indexOf('## 9. PENTE-FINO') < prompt.indexOf('## 10.'));
  assert.ok(prompt.indexOf('## 12. ENTREGA EM DUAS FASES') < prompt.indexOf('## PROVA DE COBERTURA'));
  assert.equal(ctx.state.factoryPromptLibrary.resumoAula, 'PROMPT DO RESUMO.', 'só a revisão final muda');
  assert.equal(ctx.state.factoryPromptLibraryBackups.consolidacaoBeforePenteFino20261007, promptSalvo());
  assert.ok(ctx.state.migrations.factoryPenteFinoV663);
  assert.equal(ctx.saves, 1);
});

test('V663 traz os pontos pedidos por ele: regra inversa com o exemplo da ADO e texto fluido', () => {
  const prompt = carregar({ biblioteca: { consolidacao: promptSalvo() } }).state.factoryPromptLibrary.consolidacao;
  assert.match(prompt, /"por X dias" × "no prazo de X dias"/);
  assert.match(prompt, /cumulativos \("e"\) × alternativos \("ou"\)/);
  assert.match(prompt, /REGRA INVERSA QUE A FONTE NÃO DISSE/);
  assert.match(prompt, /A ADO não autoriza o Judiciário a criar norma geral quando houve opção legislativa/);
  assert.match(prompt, /TEXTO FLUIDO: cada linha deve ser entendida numa única leitura/);
  assert.match(prompt, /sem fonte, o achado é CONFERIR e o texto NÃO é alterado/);
});

test('V663 é idempotente: segunda abertura não muda nem salva', () => {
  const primeira = carregar({ biblioteca: { consolidacao: promptSalvo() } });
  const depois = primeira.state.factoryPromptLibrary.consolidacao;
  const segunda = carregar({ biblioteca: { consolidacao: depois } });
  assert.equal(segunda.state.factoryPromptLibrary.consolidacao, depois);
  assert.equal(segunda.saves, 0);
});

test('V663 põe as duas fases no roteiro do topo, nos modos produto único e múltiplos', () => {
  const ctx = carregar({ biblioteca: { consolidacao: promptSalvo() }, roteiro: roteiroDaV384() });
  assert.equal(ctx.__aldusFactoryPenteFinoV663.roteiro, true);
  const unico = { modules: { resumoAula: { status: 'Aprovado', wordLink: 'https://w' } } };
  const varios = { modules: { resumoAula: { status: 'Aprovado', wordLink: 'https://w' }, lei: { status: 'Aprovado', wordLink: 'https://l' } } };
  for (const item of [unico, varios]) {
    const texto = ctx.factoryRouterText('consolidacao', item);
    assert.match(texto, /ENTREGA EM DUAS FASES/);
    assert.match(texto, /NÃO GERE WORD NEM PDF AGORA/);
    assert.doesNotMatch(texto, /ENTREGA OBRIGATÓRIA:/);
    assert.ok(texto.indexOf('FASE 2') < texto.indexOf('- gerar novo Word'), 'a lista de arquivos fica na Fase 2');
  }
  assert.equal(ctx.factoryRouterText.__aldusFactoryFinalReviewRouterWrappedV384, '20260824-final-review-consolidation-v384');
  assert.equal(ctx.FACTORY_PROMPT_DESCRIPTIONS.consolidacao.startsWith('Opcional.'), true);
});

test('V663 não embrulha roteiro nem montagem antes da V384', () => {
  const roteiroCru = () => 'ROTEIRO SEM V384';
  const montagemCrua = () => 'MONTAGEM SEM V384';
  const ctx = carregar({ biblioteca: { consolidacao: promptSalvo() }, roteiro: roteiroCru, montagem: montagemCrua });
  assert.equal(ctx.factoryRouterText, roteiroCru);
  assert.equal(ctx.factoryPromptBase, montagemCrua);
  assert.equal(ctx.__aldusFactoryPenteFinoV663.roteiro, false);
  assert.equal(ctx.__aldusFactoryPenteFinoV663.base, false);
});

test('V663 aplica o pente-fino na montagem mesmo quando o prompt salvo foi regravado sem ele', () => {
  // visto no site local em 07/10: outro módulo regrava o prompt salvo depois do load
  const montagem = (type) => (type === 'consolidacao' ? finalReview.prompt : `BASE ${type}`);
  Object.defineProperty(montagem, '__aldusFactoryFinalReviewBaseWrappedV384', { value: '20260824-final-review-consolidation-v384' });
  const ctx = carregar({ biblioteca: { consolidacao: promptSalvo() }, montagem });
  ctx.state.factoryPromptLibrary.consolidacao = finalReview.prompt;
  const gerado = ctx.factoryPromptBase('consolidacao');
  assert.match(gerado, /## 9\. PENTE-FINO TÉCNICO-EDITORIAL/);
  assert.match(gerado, /## 12\. ENTREGA EM DUAS FASES/);
  assert.equal(ctx.factoryPromptBase('resumoAula'), 'BASE resumoAula', 'os outros prompts não mudam');
  assert.equal(ctx.factoryPromptBase.__aldusFactoryFinalReviewBaseWrappedV384, '20260824-final-review-consolidation-v384',
    'o invólucro leva a marca da V384 para ela não embrulhar de novo por cima');
  assert.equal(ctx.__aldusFactoryPenteFinoV663.base, true);
});
