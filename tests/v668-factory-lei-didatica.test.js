const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtime = fs.readFileSync('factory-lei-didatica-v668.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-lei-didatica-v668.js', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const didatica = require('../factory-lei-didatica-v668.js');
const leiJuris = require('../factory-lei-jurisprudencia-v383.js');

// Prompt real da LEI (V123): o arquivo grava o texto em defaultFactoryPromptLibrary.lei ao iniciar.
function promptDaV123() {
  const ctx = { defaultFactoryPromptLibrary: {}, console };
  ctx.window = { __aldusBootstrapReady: true, addEventListener() {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('factory-lei-prompt-v123.js', 'utf8'), ctx);
  return ctx.defaultFactoryPromptLibrary.lei;
}

const LEI = promptDaV123();

function carregar({ biblioteca, montagem } = {}) {
  const ctx = {
    console,
    setTimeout: () => 0,
    document: { readyState: 'complete', addEventListener() {} },
    state: { factoryPromptLibrary: biblioteca, migrations: {} },
    defaultFactoryPromptLibrary: { ...biblioteca },
    saves: 0,
    addEventListener() {}
  };
  if (montagem) ctx.factoryPromptBase = montagem;
  ctx.saveData = () => { ctx.saves += 1; };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(runtime, ctx);
  return ctx;
}

test('V668 mantém raiz e docs idênticos e é carregado pelo index.html depois da V663', () => {
  assert.equal(runtime, docsRuntime);
  assert.equal(rootHtml, docsHtml);
  assert.match(rootHtml, /id="aldusFactoryLeiDidaticaV668"[^>]+factory-lei-didatica-v668\.js/);
  assert.ok(rootHtml.indexOf('factory-pente-fino-v663.js') < rootHtml.indexOf('factory-lei-didatica-v668.js'));
});

test('V668 insere a seção antes do PONTO DE PROVA e troca as três frases que pediam texto enxuto', () => {
  assert.ok(LEI.includes('PALAVRAS-NÚCLEO FLEXÍVEIS'), 'o prompt real da V123 foi lido');
  const novo = didatica.aplicar(LEI);
  assert.ok(novo.indexOf(didatica.HEADING) > novo.indexOf('## BARREIRA CONTRA TRANSCRIÇÃO'));
  assert.ok(novo.indexOf(didatica.END) < novo.indexOf('## PONTO DE PROVA\n'));
  assert.doesNotMatch(novo, /EM PALAVRAS-NÚCLEO FLEXÍVEIS E RELAÇÕES JURÍDICAS DIRETAS/);
  assert.doesNotMatch(novo, /SEGUIDA DE DOIS-PONTOS E DA EXPLICAÇÃO DIRETA:/);
  assert.doesNotMatch(novo, /\[EXPLICAÇÃO DIRETA\]/);
  assert.match(novo, /SEGUIDO DE FRASE COMPLETA E AUTOSSUFICIENTE/);
  assert.match(novo, /\[FRASE COMPLETA: QUEM, O QUE ACONTECE E SOBRE O QUÊ\]/);
  assert.ok(novo.indexOf('13. ALGUMA EXPLICAÇÃO') < novo.indexOf('14. ALGUMA LINHA DEPENDE'));
  assert.ok(novo.indexOf('21. HÁ CONCEITO NA ABERTURA') < novo.indexOf('SE HOUVER TRANSCRIÇÃO EXCESSIVA'));
  for (const trecho of ['## REGRA ABSOLUTA DE COR DA FONTE', '## PADRÃO VISUAL DO WORD', '## ENTREGA', 'NOME: RESUMO_TOPIFICADO_LEI_[NÚMERO]_[FILTRO].docx']) {
    assert.ok(novo.includes(trecho), `${trecho} continua no prompt`);
  }
});

test('V668 traz as regras combinadas com ele', () => {
  const s = didatica.SECTION;
  assert.match(s, /CADA LINHA DEVE SER ENTENDIDA LIDA SOZINHA/);
  assert.match(s, /QUANDO, COMO, ONDE, EM QUAL PRAZO E SOB QUAL CONDIÇÃO\. NÃO INVENTE/);
  assert.match(s, /"ISSO", "AQUELA", "ESSE PRAZO", "A RESSALVA", "OS DEMAIS"/);
  assert.match(s, /\("PROMOVIDA POR" × "PROMOVIDA CONTRA"\)/);
  assert.match(s, /PROMOVIDA POR UM CREDOR NÃO SOLIDÁRIO NÃO BENEFICIA OS OUTROS CREDORES QUE TAMBÉM NÃO SÃO SOLIDÁRIOS/);
  assert.match(s, /"AUTOMATICAMENTE", "APENAS", "SEMPRE" OU "NUNCA"/);
  assert.match(s, /"INTERESSADO", "TERCEIRO", "PARTE", "BENEFICIADO"/);
  assert.match(s, /"EXPLICAÇÃO DA DOUTRINA"/);
  assert.match(s, /A PROIBIÇÃO DE EXEMPLO INVENTADO CONTINUA VALENDO/);
  assert.match(s, /NO MÁXIMO QUATRO DESTAQUES EM MAIÚSCULAS POR LINHA/);
  assert.match(s, /NÃO USE BARRA \(\/\) NEM SETA \(→\)/);
  // os quatro recursos de estrutura vindos do RESUMO/AULA
  assert.match(s, /📖 \*\*CONCEITO:\*\*/);
  assert.match(s, /⚠️ É USADO SOMENTE NO PONTO DE PROVA/);
  assert.match(s, /✳️ \*\*DISTINÇÃO:\*\*/);
  assert.match(s, /♦️ \*\*🧭 ROTEIRO DE RESOLUÇÃO\*\*/);
  assert.match(s, /⚖️ \*\*\[ASSUNTO\] — \[SUBASSUNTO\] \(ART\. \[NÚMERO\]\):\*\*/);
  assert.match(s, /A ORDEM DA LEI, ARTIGO POR ARTIGO, CONTINUA OBRIGATÓRIA/);
});

test('V668 é idempotente e preserva os trechos que a V383 troca', () => {
  const uma = didatica.aplicar(LEI);
  assert.equal(didatica.aplicar(uma), uma);
  assert.equal(uma.split(didatica.HEADING).length, 2);
  assert.equal(uma.split('14. ALGUMA LINHA DEPENDE').length, 2);
  for (const trecho of [
    'PRODUZA SOMENTE O MÓDULO LEI.',
    'NÃO USE DOUTRINA, JURISPRUDÊNCIA, RESUMO/AULA, PEÇA, COMENTÁRIO DE AUTOR, EXEMPLO INVENTADO OU CONHECIMENTO EXTERNO PARA COMPLETAR O CONTEÚDO.',
    'GERE UM .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO LEI. NÃO CONSOLIDE COM RESUMO/AULA, JURISPRUDÊNCIA OU PEÇA.'
  ]) {
    assert.ok(uma.includes(trecho), `a V383 ainda encontra: ${trecho}`);
  }
});

test('V668 dá o mesmo combinado LEI + JURISPRUDÊNCIA, aplicada antes ou depois da V383', () => {
  const antes = leiJuris.buildPrompt(didatica.aplicar(LEI));
  const depois = didatica.aplicar(leiJuris.buildPrompt(LEI));
  assert.equal(antes, depois, 'senão a V383 consideraria o combinado desatualizado a cada abertura');
  assert.match(antes, /PRODUZA SOMENTE O MÓDULO INTEGRADO LEI \+ JURISPRUDÊNCIA\./);
  assert.ok(antes.includes(didatica.HEADING));
});

test('V668 grava nos prompts salvos da LEI e do combinado, com cópia, e salva uma vez só', () => {
  const combinado = leiJuris.buildPrompt(LEI);
  const ctx = carregar({ biblioteca: { lei: LEI, leiJurisprudencia: combinado, resumoAula: 'PROMPT DO RESUMO.' } });
  const lib = ctx.state.factoryPromptLibrary;
  assert.ok(lib.lei.includes(didatica.HEADING));
  assert.ok(lib.leiJurisprudencia.includes(didatica.HEADING));
  assert.equal(lib.resumoAula, 'PROMPT DO RESUMO.', 'só a LEI e o combinado mudam');
  assert.equal(ctx.defaultFactoryPromptLibrary.lei, lib.lei);
  assert.equal(ctx.state.factoryPromptLibraryBackups.leiBeforeLeiDidatica20261018, LEI);
  assert.equal(ctx.state.factoryPromptLibraryBackups.leiJurisprudenciaBeforeLeiDidatica20261018, combinado);
  assert.ok(ctx.state.migrations.factoryLeiDidaticaV668);
  assert.equal(ctx.saves, 1);

  const segunda = carregar({ biblioteca: { lei: lib.lei, leiJurisprudencia: lib.leiJurisprudencia } });
  assert.equal(segunda.saves, 0, 'segunda abertura não salva de novo');
});

test('V668 só embrulha a montagem depois da V383 e aplica só na LEI e no combinado', () => {
  const crua = (type) => `BASE ${type}`;
  const semV383 = carregar({ biblioteca: { lei: LEI }, montagem: crua });
  assert.equal(semV383.factoryPromptBase, crua);
  assert.equal(semV383.__aldusFactoryLeiDidaticaV668.base, false);

  const montagem = (type) => (type === 'lei' ? LEI : type === 'leiJurisprudencia' ? leiJuris.buildPrompt(LEI) : `BASE ${type}`);
  Object.defineProperty(montagem, '__aldusFactoryLeiJurisprudenciaV383', { value: leiJuris.version });
  const ctx = carregar({ biblioteca: { lei: LEI }, montagem });
  assert.equal(ctx.__aldusFactoryLeiDidaticaV668.base, true);
  assert.ok(ctx.factoryPromptBase('lei').includes(didatica.HEADING));
  assert.ok(ctx.factoryPromptBase('leiJurisprudencia').includes(didatica.HEADING));
  assert.equal(ctx.factoryPromptBase('resumoAula'), 'BASE resumoAula');
  assert.equal(ctx.factoryPromptBase.__aldusFactoryLeiJurisprudenciaV383, leiJuris.version,
    'o invólucro leva a marca da V383 para ela não embrulhar de novo por cima');
});

test('V668 em prompt da LEI editado sem âncora: a seção entra antes da ENTREGA', () => {
  const editado = 'PROMPT EDITADO DA LEI.\n\n## ENTREGA\n\nGERE O WORD.';
  const novo = didatica.aplicar(editado);
  assert.ok(novo.indexOf(didatica.END) < novo.indexOf('## ENTREGA'));
  assert.equal(didatica.aplicar(novo), novo);
});
