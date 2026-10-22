const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const modulo = require('../factory-leitor-tdah-v670.js');
const rootModule = fs.readFileSync('factory-leitor-tdah-v670.js', 'utf8');
const docsModule = fs.readFileSync('docs/factory-leitor-tdah-v670.js', 'utf8');
const rootLeitor = fs.readFileSync('leitor-tdah.html', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');

test('V670: módulo publicado igual na raiz e em docs, carregado depois da V669', () => {
  assert.equal(docsModule, rootModule);
  for (const html of [rootHtml, docsHtml]) {
    const v669 = html.indexOf('id="aldusFactoryLeitorTdahV669"');
    const v670 = html.indexOf('<script id="aldusFactoryLeitorTdahV670" defer src="factory-leitor-tdah-v670.js?v=20261022-leitor-tdah-etapa4-v670"></script>');
    assert.ok(v669 > 0 && v670 > v669);
  }
});

test('V670: revisão conta trechos ★ e flashcards errados do leitor', () => {
  const estado = { user: { prov: { a: 1, b: 1 }, cards: { a: { p0: 'err', p1: 'ok', u0: 'err' }, c: { p0: 'ok' }, d: { p2: 'err' } } } };
  assert.deepEqual(modulo.contarRevisao(estado), { prov: 2, errados: 3, trechosErrados: 2 });
  assert.deepEqual(modulo.contarRevisao({}), { prov: 0, errados: 0, trechosErrados: 0 });
  assert.equal(modulo.textoRevisao({ prov: 1, errados: 3 }), '★ 1 trecho provável · ✖ 3 flashcards errados');
  assert.equal(modulo.textoRevisao({ prov: 2, errados: 0 }), '★ 2 trechos prováveis');
});

test('V670: link do leitor leva a aba do site que o abriu', () => {
  assert.equal(modulo.comAba('leitor-tdah.html?item=x', 'k1'), 'leitor-tdah.html?item=x&aba=k1');
  assert.equal(modulo.comAba('leitor-tdah.html?item=x&aba=k0', 'k1'), 'leitor-tdah.html?item=x&aba=k0');
  assert.equal(modulo.comAba('leitor-tdah.html?item=x', ''), 'leitor-tdah.html?item=x');
});

test('V670: quadro só nas telas de revisão e nada gravado no estado do site', () => {
  assert.match(rootModule, /"revisao-inteligente": "smartReviewStandalone", "revisoes": "reviewsDashboard"/);
  assert.doesNotMatch(rootModule, /saveData\(|state\.[a-zA-Z]+\s*=|dailyGoals|metas-do-dia/);
});

test('V670: QUESTÕES do leitor aberto pelo site leva ao Treino; avulso continua copiando o pedido', () => {
  assert.match(rootLeitor, /const NO_SITE=!!ITEM&&\/\^https\?:\/\.test\(location\.protocol\);/);
  assert.ok(rootLeitor.includes("case 'quest':if(NO_SITE){"));
  assert.ok(rootLeitor.includes("new BroadcastChannel('aldus-leitor-tdah-site')"));
  assert.ok(rootLeitor.includes("canalSite.postMessage({tipo:'abrir-treino',id,item:ITEM,tema:TEMA,disciplina:DISC,aba:PARAM.get('aba')||''})"));
  assert.ok(rootModule.includes('new BroadcastChannel(CANAL_SITE)') && rootModule.includes('const CANAL_SITE = "aldus-leitor-tdah-site";'));
  assert.ok(rootModule.includes('botao.dataset.qtFactory = pedido.item'));
  assert.ok(rootLeitor.includes("PROMPTS[k]()"));
});

test('V670: link de revisão abre a revisão do leitor e o errado vai direto aos flashcards errados', () => {
  assert.ok(rootModule.includes('+ "&revisar=1"'));
  assert.ok(rootLeitor.includes("if(S&&PARAM.get('revisar'))abrirRevisao()"));
  assert.ok(rootLeitor.includes("S.user.tool='cards';S.user.soErrados=true;"));
});
