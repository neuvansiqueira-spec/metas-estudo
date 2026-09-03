const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'daily-goal-status-color-v443.js'));

test('V443 reduz cada status a uma chave sem acento e sem espaço', () => {
  assert.equal(api.statusKey('Concluída'), 'concluida');
  assert.equal(api.statusKey('Em andamento'), 'andamento');
  assert.equal(api.statusKey('Pendente'), 'pendente');
  assert.equal(api.statusKey('Não cumprida'), 'nao-cumprida');
  assert.equal(api.statusKey('Adiada'), 'adiada');
  assert.equal(api.statusKey('Reagendada'), 'reagendada');
  assert.equal(api.statusKey('Ignorada'), 'ignorada');
});

test('V443 não inventa chave para status desconhecido nem para vazio', () => {
  assert.equal(api.statusKey('Qualquer coisa'), 'outro');
  assert.equal(api.statusKey(''), '');
  assert.equal(api.statusKey(null), '');
});

// DOM mínimo: só o que paintResume usa.
function fakeNode(texto) {
  const filhos = [];
  return {
    textContent: texto,
    firstChild: null,
    children: filhos,
    querySelector: () => null,
    removeChild() { this.firstChild = null; },
    appendChild(n) { filhos.push(n); this.firstChild = null; return n; },
    filhos
  };
}

const fakeDoc = {
  createTextNode: (t) => ({ tipo: 'texto', textContent: t }),
  createElement: () => ({
    tipo: 'span', textContent: '', attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; }
  })
};

test('V443 isola a palavra do status e preserva o resto do texto', () => {
  const node = fakeNode('112 de 240 min • Concluída');
  assert.equal(api.paintResume(node, fakeDoc), true);
  const [texto, marca] = node.filhos;
  assert.equal(texto.textContent, '112 de 240 min • ');
  assert.equal(marca.textContent, 'Concluída', 'a palavra sai igual, com acento');
  assert.equal(marca.attrs[api.markAttribute], 'concluida');
});

test('V443 colore só o status, nunca os minutos', () => {
  const node = fakeNode('0 de 75 min • Pendente');
  api.paintResume(node, fakeDoc);
  const [texto, marca] = node.filhos;
  assert.match(texto.textContent, /0 de 75 min/, 'os minutos ficam fora da marcação');
  assert.equal(marca.textContent, 'Pendente');
  assert.equal(marca.attrs[api.markAttribute], 'pendente');
});

test('V443 usa o último separador, para assunto que contenha o mesmo símbolo', () => {
  const node = fakeNode('30 de 60 min • Concluída');
  api.paintResume(node, fakeDoc);
  assert.equal(node.filhos[1].textContent, 'Concluída');
});

test('V443 ignora texto sem separador e não quebra nada', () => {
  const node = fakeNode('sem separador algum');
  assert.equal(api.paintResume(node, fakeDoc), false);
  assert.equal(node.filhos.length, 0);
});

test('V443 não repinta um resumo já marcado', () => {
  const node = fakeNode('0 de 75 min • Pendente');
  node.querySelector = () => ({ jaMarcado: true });
  assert.equal(api.paintResume(node, fakeDoc), false);
});

test('V443 aguenta nó ausente', () => {
  assert.equal(api.paintResume(null, fakeDoc), false);
});

test('V443 define cor para todos os estados que o app produz', () => {
  const source = read('daily-goal-status-color-v443.js');
  for (const chave of ['concluida', 'andamento', 'pendente', 'nao-cumprida', 'adiada', 'reagendada', 'ignorada']) {
    assert.ok(source.includes(`="${chave}"]`), `falta cor para ${chave}`);
  }
});

test('V443 mantém pendente discreto, não em cor de alerta', () => {
  const source = read('daily-goal-status-color-v443.js');
  const bloco = source.slice(source.indexOf('="pendente"]'), source.indexOf('="pendente"]') + 90);
  assert.match(bloco, /rgba\(255,255,255,\.62\)/,
    'pendente é o estado normal da maioria das metas; alerta ali vira ruído');
});

test('V443 tenta instalar de novo em vez de falhar em silêncio', () => {
  const source = read('daily-goal-status-color-v443.js');
  // A V427 instalou uma vez, perdeu a corrida com o boot e nunca mais tentou.
  assert.match(source, /TIMEOUT_MS/);
  assert.match(source, /console\.warn\("\[Aldus V443\]/, 'desistir precisa deixar rastro');
});

test('V443 não escreve estado nem introduz observador', () => {
  const source = read('daily-goal-status-color-v443.js');
  const codigo = source.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  assert.doesNotMatch(codigo, /saveData|localStorage|indexedDB|MutationObserver|setInterval/);
});

test('V443 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('daily-goal-status-color-v443.js'), read('docs/daily-goal-status-color-v443.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /daily-goal-status-color-v443\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
