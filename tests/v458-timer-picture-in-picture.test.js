const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function harness({ comBarra = true, comApi = true } = {}) {
  const cliques = [];
  const nos = new Map();
  const criar = (tag) => {
    const node = {
      tag, id: '', type: '', className: '', title: '', textContent: '', innerHTML: '',
      hidden: false, filhos: [], ouvintes: {}, style: { cssText: '' },
      appendChild(f) { this.filhos.push(f); if (f.id) nos.set(f.id, f); return f; },
      addEventListener(n, fn) { (this.ouvintes[n] ||= []).push(fn); },
      click() { cliques.push(this.__seletor || this.id); },
      closest() { return null; },
      querySelector() { return null; }
    };
    return node;
  };

  // Os elementos que o painel espelha e os botões que ele aciona.
  const texto = {
    timerDiscipline: 'DIREITO PENAL',
    timerSubject: 'Crimes contra a vida',
    timerTime: '00:42:13',
    timerProgressText: '58% do tempo decorrido',
    timerPauseResume: 'Pausar'
  };
  for (const [id, valor] of Object.entries(texto)) {
    const n = criar('span'); n.id = id; n.textContent = valor; n.__seletor = '#' + id; nos.set(id, n);
  }
  const alerta = criar('div'); alerta.id = 'timerAlert'; alerta.hidden = true; alerta.textContent = ''; nos.set('timerAlert', alerta);
  const barra = criar('div'); barra.__seletor = '#floatingTimer > .floating-timer-actions';
  // A primeira .floating-timer-actions do painel real: mora dentro de
  // #timerCompletion, escondida ate o tempo acabar. Quem cair aqui some.
  const barraOculta = criar('div'); barraOculta.__seletor = '#timerCompletion .floating-timer-actions';
  const salvar = criar('button'); salvar.__seletor = '#floatingTimer [data-timer-action="save"]';

  const context = {
    console: { warn() {}, error() {} },
    setInterval: () => 0,
    clearInterval() {},
    document: {
      getElementById: (id) => nos.get(id) || null,
      createElement: criar,
      querySelector: (sel) => {
        // Sem o ">", o navegador devolve a barra escondida da secao de conclusao.
        if (sel === '#floatingTimer .floating-timer-actions') return comBarra ? barraOculta : null;
        if (sel === '#floatingTimer > .floating-timer-actions') return comBarra ? barra : null;
        if (sel === '#timerPauseResume') return nos.get('timerPauseResume');
        if (sel === '#floatingTimer [data-timer-action="save"]') return salvar;
        return null;
      }
    }
  };
  if (comApi) context.documentPictureInPicture = { requestWindow: async () => ({}) };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('timer-picture-in-picture-v458.js'), context);
  return { context, api: context.__ALDUS_TIMER_PIP_V458__, nos, barra, barraOculta, cliques, alerta };
}

test('V458 põe o botão na barra visível, não na escondida da conclusão', () => {
  const { barra, barraOculta, nos } = harness();
  const botao = nos.get('aldusTimerPipButtonV458');
  assert.ok(botao, 'o botão precisa existir');
  assert.equal(botao.textContent, 'Janela flutuante');
  assert.ok(barra.filhos.includes(botao),
    'ele tem de ficar ao lado de Pausar, Salvar tempo, Zerar e Fechar');
  assert.ok(!barraOculta.filhos.includes(botao),
    'a barra de #timerCompletion só aparece quando o tempo acaba: ali o botão some');
});

test('V458 usa o seletor de filho direto, que é o que separa as duas barras', () => {
  assert.match(read('timer-picture-in-picture-v458.js'),
    /#floatingTimer > \.floating-timer-actions/);
});

test('V458 espelha o que a página mostra, sem recalcular tempo', () => {
  const { api } = harness();
  const d = api.leitura();
  assert.equal(d.tempo, '00:42:13', 'o tempo vem do próprio mostrador do site');
  assert.equal(d.disciplina, 'DIREITO PENAL');
  assert.equal(d.assunto, 'Crimes contra a vida');
  assert.equal(d.progresso, '58% do tempo decorrido');
  assert.equal(d.acao, 'Pausar', 'o rótulo do botão acompanha o da página');
});

test('V458 mostra o alerta só quando a página está mostrando', () => {
  const { api, alerta } = harness();
  assert.equal(api.leitura().alerta, '');
  alerta.hidden = false;
  alerta.textContent = 'Tempo previsto concluído às 14:05';
  assert.match(api.leitura().alerta, /concluído às 14:05/);
});

test('V458 não reimplementa os botões: clica nos reais', () => {
  const { api, cliques } = harness();
  const doc = { querySelector: () => null, body: { addEventListener() {} }, head: { appendChild() {} }, createElement: () => ({}) };
  void doc;
  // Aciona pelos mesmos caminhos que o painel usa.
  assert.ok(read('timer-picture-in-picture-v458.js').includes('acionar("#timerPauseResume")'));
  assert.ok(read('timer-picture-in-picture-v458.js').includes('acionar(\'#floatingTimer [data-timer-action="save"]\')'));
  void cliques; void api;
});

test('V458 avisa quando o navegador não tem a janela flutuante', async () => {
  const { api } = harness({ comApi: false });
  assert.equal(api.suportado(), false);
  const r = await api.abrir();
  assert.match(r.erro, /janela flutuante/i);
  assert.match(r.erro, /Chrome/);
});

test('V458 reconhece o suporte quando existe', () => {
  const { api } = harness({ comApi: true });
  assert.equal(api.suportado(), true);
});

test('V458 espera a barra do cronômetro aparecer', () => {
  const { nos } = harness({ comBarra: false });
  assert.equal(nos.get('aldusTimerPipButtonV458'), undefined,
    'sem a barra, nada é injetado — o módulo tenta de novo depois');
});

test('V458 escreve em português correto', () => {
  const fonte = read('timer-picture-in-picture-v458.js');
  for (const m of fonte.matchAll(/(textContent|innerHTML|title)\s*=\s*["`']([^"`']{8,})["`']/g)) {
    for (const palavra of ['nao', 'voce', 'cronometro', 'janela flutuante nao', 'acoes']) {
      assert.doesNotMatch(m[2], new RegExp(`\\b${palavra}\\b`, 'i'), `falta acento: ${m[2]}`);
    }
  }
});

test('V458 mantém paridade raiz/docs', () => {
  assert.equal(read('timer-picture-in-picture-v458.js'), read('docs/timer-picture-in-picture-v458.js'));
});

test('V612 a janela flutuante cabe em qualquer altura e os botoes ficam alcancaveis', () => {
  const fonte = read("timer-picture-in-picture-v458.js");
  const corpo = fonte.match(/body \{([\s\S]*?)\}/);
  assert.ok(corpo, "a folha da janela precisa estilizar o corpo");
  assert.match(corpo[1], /overflow-y:\s*auto/,
    "sem isso a barra de rolagem aparece no documento e as setas nao respondem");
  const acoes = fonte.match(/\.acoes \{([\s\S]*?)\}/);
  assert.ok(acoes, "a barra de acoes precisa de regra propria");
  assert.match(acoes[1], /position:\s*sticky/,
    "Pausar e Salvar tem de ficar colados embaixo, alcancaveis sem rolar");
  assert.match(acoes[1], /bottom:\s*0/);
  for (const seletor of [".tempo", ".disciplina", ".assunto"]) {
    const bloco = fonte.match(new RegExp("\\" + seletor + " \{([^}]*)\}"));
    assert.ok(bloco, "falta " + seletor);
    assert.match(bloco[1], /clamp\(/,
      seletor + " precisa acompanhar a altura da janela, que ele encolhe para caber ao lado da aula");
  }
});
