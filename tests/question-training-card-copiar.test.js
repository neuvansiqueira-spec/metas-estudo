const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const template = require('../question-training-card.js');

// Página mínima: só o que o runtime do cartão usa.
function fakePage(html) {
  const script = html.match(/<script>\((function runtime\(\)[\s\S]*\})\)\(\);<\/script>/);
  const json = html.match(/<script type="application\/json" id="training-data">([\s\S]*?)<\/script>/);
  assert.ok(script && json, 'o modelo traz o runtime e os dados');
  const byId = new Map();
  class El {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.className = ''; this.dataset = {}; this.style = {}; this.attrs = {}; this.listeners = {}; this._text = ''; this.parentElement = null; }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this._text = String(v); this.children = []; }
    append(...nodes) { for (const n of nodes) { if (typeof n === 'object' && n) { n.parentElement = this; this.children.push(n); } } }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    click() { (this.listeners.click || []).forEach((fn) => fn({ preventDefault() {} })); }
    remove() {}
    select() {}
    all() { return [this, ...this.children.flatMap((c) => (c.all ? c.all() : []))]; }
  }
  for (const id of ['cards', 'title', 'score', 'message', 'all', 'complete', 'corrected', 'download-again', 'import', 'json', 'export-area', 'export-info']) byId.set(id, new El('div'));
  const dataEl = new El('script'); dataEl.textContent = json[1].replace(/\\u003c/g, '<');
  byId.set('training-data', dataEl);
  const copied = [];
  const ctx = {
    console,
    document: {
      querySelector: (sel) => byId.get(sel.replace('#', '')) || null,
      createElement: (tag) => new El(tag),
      createTextNode: (t) => { const e = new El('#text'); e.textContent = t; return e; },
      addEventListener() {},
      body: new El('body'),
      execCommand: () => false
    },
    getSelection: () => null,
    localStorage: { getItem: () => null, setItem() {} },
    navigator: { clipboard: { writeText: async (t) => { copied.push(t); } } },
    setTimeout: () => 0,
    URL, Blob: class {}, JSON
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`(${script[1]})()`, ctx);
  const buttons = () => byId.get('cards').all().filter((e) => e.tagName === 'BUTTON');
  return { copied, buttons };
}

const payload = {
  schema: 'aldus-question-training-v1',
  trainingRound: { id: 'T1', discipline: 'DIREITO PENAL', theme: 'Teoria do crime' },
  questionBank: [{
    id: 'Q123456', banca: 'FGV', ano: 2024, orgao: 'PC-RJ', cargo: 'Delegado de Polícia', disciplina: 'Direito Penal', assunto: 'Teoria do crime',
    enunciado: 'Sobre a teoria do domínio do fato, assinale a correta.',
    alternativas: { A: 'Foi formulada por Welzel.', B: 'Foi desenvolvida por Roxin.', C: 'É adotada só pelo STF.' },
    gabarito: 'B', justificativas_alternativas: { A: 'Welzel criou o finalismo.', B: 'Roxin, 1963.', C: 'Não há exclusividade.' },
    explicacao_complementar: 'Usada no Mensalão.', origem_tipo: 'real'
  }]
};

test('Cartão: "Copiar questão" copia enunciado e alternativas, sem gabarito antes da correção', async () => {
  const page = fakePage(template.buildHTML(payload));
  const copiar = page.buttons().find((b) => b.textContent === 'Copiar questão');
  assert.ok(copiar, 'o botão existe em cada questão');
  copiar.click();
  await new Promise((r) => setImmediate(r));
  const texto = page.copied[0];
  assert.match(texto, /^Questão 1\nQ123456 · FGV · 2024 · PC-RJ — Delegado de Polícia/);
  assert.match(texto, /Sobre a teoria do domínio do fato, assinale a correta\./);
  assert.match(texto, /A\) Foi formulada por Welzel\.\nB\) Foi desenvolvida por Roxin\.\nC\) É adotada só pelo STF\./);
  assert.doesNotMatch(texto, /Gabarito|Roxin, 1963|Justificativa/, 'antes de corrigir não entrega a resposta');
});

test('Cartão: depois de corrigir, "Copiar questão" leva resposta, gabarito e justificativas', async () => {
  const page = fakePage(template.buildHTML(payload));
  page.buttons().filter((b) => b.textContent === 'Marcar')[2].click();
  page.buttons().find((b) => b.textContent === 'CORRIGIR QUESTÃO').click();
  page.buttons().find((b) => b.textContent === 'Copiar questão').click();
  await new Promise((r) => setImmediate(r));
  const texto = page.copied.at(-1);
  assert.match(texto, /Minha resposta: C · Gabarito: B · ERREI/);
  assert.match(texto, /Explicação complementar — Agente: Usada no Mensalão\./);
  assert.match(texto, /B — Correta: Roxin, 1963\./);
  assert.match(texto, /C — Incorreta: Não há exclusividade\./);
});
