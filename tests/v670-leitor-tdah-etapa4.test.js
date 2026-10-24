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

test('V670.1: leitor abre o Word do MAPA HIERÁRQUICO (eixo = Axis, instituto = Institute)', () => {
  assert.ok(rootLeitor.includes("if(/^toc/.test(alvo))nivel=0;else if(/eixo|cap[ií]tulo|\\baxis\\b/.test(alvo))nivel=2;"));
  assert.ok(rootLeitor.includes("else if(/artigo|institut/.test(alvo))nivel=3"));
  assert.ok(rootLeitor.includes(".replace(/^MAPA_HIERARQUICO_(RESUMO_AULA_)?/i,'')"));
  assert.ok(rootLeitor.includes("titulo:titulo||preTit||nomeBase"));
  assert.ok(rootLeitor.includes("const aid=(titulo||nomeBase).normalize("));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.2: Word sem títulos usa os marcadores (♦️ ▶️📚 ✅) e erro de leitura não trava a abertura', () => {
  assert.ok(rootLeitor.includes(' if(!mont.bl.length){const pm=porMarcas(pars);'));
  assert.ok(rootLeitor.includes('const porMarcas=pars=>{'));
  assert.ok(rootLeitor.includes("catch(e){return {erro:e.message+' ('+(r.caminho||r.nome)+')'}}if(inv.titulo_fraco&&tema)inv.titulo=tema;"));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.3: pedidos juntam artigos seguidos e § fica dentro do artigo', () => {
  assert.ok(rootLeitor.includes('function pedidoBloco(b){return pedidoBlocos([b])}'));
  assert.ok(rootLeitor.includes("${varios?'\"pacotes\":[{':''}"));
  assert.ok(rootLeitor.includes('const VERSAO_MARCAS=2;'));
  assert.ok(rootLeitor.includes('if(/^(§|PAR[ÁA]GRAFO\\s+[ÚU]NICO)/iu.test(corpo))return {nivel:0,txt:p.txt};'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.4: julgado vira um trecho, pedido pelo volume com partes e botão de próximo pedido', () => {
  assert.ok(rootLeitor.includes('const julgados=bl.reduce((a,b)=>a+b.trechos.filter(ehTrib).length,0)>=3;'));
  assert.ok(rootLeitor.includes('const PESO_PEDIDO=24,ARTIGOS_PEDIDO=8;'));
  assert.ok(rootLeitor.includes('function partesDe(b){'));
  assert.ok(rootLeitor.includes('"ferramentas_do_artigo": false'));
  assert.ok(rootLeitor.includes('copiarPedido(${prox},this)'));
  assert.ok(rootLeitor.includes('if(prox>=0&&rel.ok.length){copiado=await copiar(pedidoDoGrupo(gs[prox]))'));
  assert.ok(rootLeitor.includes('if(!estadoTemAlgo(S)&&assinaturaInv(novo)!==assinaturaInv(S.inv)){'));
  assert.ok(rootLeitor.includes('if(l&&l.inv&&!estadoTemAlgo(l)){'));
  assert.ok(rootLeitor.includes('if(!mont.bl.length&&pars.some(p=>p.nivel===1)){'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.5: leitura nova do Word leva junto o que já foi feito e o pedido só pede o que falta', () => {
  assert.ok(rootLeitor.includes('function migrarEstado(v,inv){'));
  assert.ok(rootLeitor.includes("function aplicarWordNovo(){const novo=avisoWordNovo;if(!novo)return;avisoWordNovo=null;reorganizar(novo,'Resumo atualizado')}"));
  assert.ok(rootLeitor.includes("if(assinaturaInv(inv)!==assinaturaInv(S.inv)){reorganizar(inv,'Resumo reorganizado');"));
  assert.ok(rootLeitor.includes("function pedidoDoGrupo(g){const falta=g.filter(p=>situacaoParte(p)!=='pronto');"));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.6: leitor confere versão nova ao abrir e recarrega uma vez', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v\d+-\d+';/);
  assert.ok(rootLeitor.includes("const r=await fetch(location.pathname,{cache:'reload'})"));
  assert.ok(rootLeitor.includes("const k='leitor-tdah:recarregou:'+m[1];"));
  assert.ok(rootLeitor.includes('abrirRevisao();conferirVersaoNova()});'));
});

test('V670.7: citação com alínea, lei pelo número/ano ou pelo nome e lei do resumo viram link', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v670-\d+';/);
  assert.ok(rootLeitor.includes('function urlsDeNumero(num,ano,tipo){'));
  assert.ok(rootLeitor.includes("const base=PL+'_ato'+f[0]+'-'+f[1]+'/'+ano+'/lei/l'+num;"));
  assert.ok(rootLeitor.includes('function leiPadrao(){'));
  assert.ok(rootLeitor.includes('function nomeDaUrl(u){'));
  assert.ok(rootLeitor.includes('let pagina=null;for(const u of urls){'));
  assert.ok(rootLeitor.includes("const al=P.match("));
  assert.ok(rootLeitor.includes("CC:PL+'leis/2002/l10406compilada.htm'"));
});

test('V670.8: resposta guardada ao voltar para a aba, destaque que mantém a seleção e julgados com letra maior', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v670-\d+';/);
  assert.ok(rootLeitor.includes("window.addEventListener('focus',()=>setTimeout(respostaAoVoltar,150));"));
  assert.ok(rootLeitor.includes('function temConteudoPacote(objs){'));
  assert.ok(rootLeitor.includes('function guardarFerramentaDe(k,objs,alvo){'));
  assert.ok(rootLeitor.includes('scrollTo(0,y);selecionar(o.key,o.s,o.e)')); // selection is restored for the shared formatter
  assert.ok(rootLeitor.includes('onmousedown="event.preventDefault()"'));
  assert.ok(rootLeitor.includes('<div id="texto" data-mk="t">'));
  assert.ok(rootLeitor.includes("data-mk=\"j:${meu?'u':'p'}:${i}:tese\""));
  assert.ok(rootLeitor.includes('.jur-tese{font-size:var(--fs);'));
  assert.ok(rootLeitor.includes("$('#progN').textContent=(idx+1)+'/'+trs.length;"));
});

test('V670.9: lacunas dos grifos, flashcards com repetição, atalhos com barra fixa e leitura em voz alta', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v670-\d+';/);
  assert.ok(rootLeitor.includes('lacuna:!!S.user.lacunas'));
  assert.ok(rootLeitor.includes("const LAC_KINDS=['b','up','cap','u','y','g','p'];"));
  assert.ok(rootLeitor.includes('const INTERVALOS=[3,7,15,30];'));
  assert.ok(rootLeitor.includes('function cartoesDeHoje(){'));
  assert.ok(rootLeitor.includes("for(const f2 of ['cards','agenda'])if(vu[f2]&&vu[f2][id])"));
  assert.ok(rootLeitor.includes("const ATALHOS={b:'b',g:'y',m:'up','=':'f','+':'f','-':'f-'};"));
  assert.ok(rootLeitor.includes('position:sticky;top:calc(var(--topo,4.5rem) + 4px)'));
  assert.ok(rootLeitor.includes('const u=new SpeechSynthesisUtterance(falaFrases[falaI]);u.lang=\'pt-BR\';'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.10: voz do Google primeiro, escolha de voz guardada e leitura frase por frase', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v670-\d+';/);
  assert.ok(rootLeitor.includes("const nota=x=>/google/i.test(x.name)?0:/natural|online/i.test(x.name)?1:2;"));
  assert.ok(rootLeitor.includes("onchange=\"lsSet('leitor-tdah:voz',this.value);if(falando)ouvir(true)\""));
  assert.ok(rootLeitor.includes('function frasesDe(txt){'));
  assert.ok(rootLeitor.includes('function falarFrase(id){'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.11: modo foco com tecla F, botão e barra de destaque flutuando na seleção', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v670-\d+';/);
  assert.ok(rootLeitor.includes('<button class="btn" id="bFoco" hidden'));
  assert.ok(rootLeitor.includes("let foco=lsGet('leitor-tdah:foco')==='1';"));
  assert.ok(rootLeitor.includes('function posicionarBarra(){'));
  assert.ok(rootLeitor.includes("document.addEventListener('selectionchange',()=>{clearTimeout(tBarra);tBarra=setTimeout(posicionarBarra,30)});"));
  assert.ok(rootLeitor.includes('body.foco .card-body .dest.flutua{position:fixed;'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.12: destaque nas respostas coladas, foco mais largo e lacunas uma por vez', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='\d{8}-leitor-v670-\d+';/);
  assert.ok(rootLeitor.includes('data-mk="c:por_que"'));
  assert.ok(rootLeitor.includes('data-mk="c:texto_facil"'));
  assert.ok(rootLeitor.includes('data-mk="d:${i}"'));
  assert.ok(rootLeitor.includes("const porTrecho=['prov','notas','marcas','marcasC',"));
  assert.ok(rootLeitor.includes('body.foco .grid{grid-template-columns:1fr;max-width:min(1500px,96vw);'));
  assert.ok(rootLeitor.includes('function revelarLac(g){'));
  assert.ok(rootLeitor.includes('function lacCtrl(){'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});

test('V670.13: glossário sublinhado no texto, texto do trecho editável à parte e justificado', () => {
  assert.match(rootLeitor, /const VERSAO_LEITOR='20261024-leitor-v670-15';/);
  assert.ok(rootLeitor.includes('function marcarGlossario(raiz){'));
  assert.ok(rootLeitor.includes("fecharLei();marcarLeis($('#texto'));fecharGlos();marcarGlossario($('#texto'));"));
  assert.ok(rootLeitor.includes('const txtDe=t=>(S.user.textoEd&&S.user.textoEd[t.id]!=null)?S.user.textoEd[t.id]:t.texto;'));
  assert.ok(rootLeitor.includes("const porTrecho=['prov','notas','marcas','marcasC','textoEd',"));
  assert.ok(rootLeitor.includes('function ajustarMarcas(id,antes,depois){'));
  assert.ok(rootLeitor.includes('text-align:justify;hyphens:auto'));
  assert.doesNotMatch(rootLeitor, /\x08/);
});
