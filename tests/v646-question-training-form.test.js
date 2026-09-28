const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function harness() {
  const store = new Map();
  const ctx = vm.createContext({ localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) } });
  vm.runInContext(read('question-training-form-v646.js'), ctx);
  return { api: ctx.__ALDUS_QUESTION_TRAINING_FORM_V646__, store };
}
const campo = (value, opcoes) => ({ value, tagName: opcoes ? 'SELECT' : 'INPUT', options: (opcoes || []).map((v) => ({ value: v, textContent: v })) });

test('V646 lembra as últimas escolhas, mas não disciplina nem tema', () => {
  const { api } = harness();
  const antes = { elements: { discipline: campo('DIREITO PENAL'), theme: campo('Dolo'), count: campo('10', ['5', '10', '15']), primary: campo('CEBRASPE', ['FGV', 'CEBRASPE']), difficulty: campo('Equilibrada', ['Difíceis primeiro', 'Equilibrada']) } };
  const salvo = api.gravarPrefs(antes);
  assert.equal(salvo.count, '10');
  assert.equal(salvo.primary, 'CEBRASPE');
  assert.equal('discipline' in salvo, false);
  assert.equal('theme' in salvo, false);
  const novo = { elements: { discipline: campo('DIREITO CIVIL'), theme: campo(''), count: campo('15', ['5', '10', '15']), primary: campo('FGV', ['FGV', 'CEBRASPE']), difficulty: campo('Difíceis primeiro', ['Difíceis primeiro', 'Equilibrada']) } };
  assert.equal(api.aplicarPrefs(novo, api.lerPrefs()), true);
  assert.equal(novo.elements.count.value, '10');
  assert.equal(novo.elements.primary.value, 'CEBRASPE');
  assert.equal(novo.elements.difficulty.value, 'Equilibrada');
  assert.equal(novo.elements.discipline.value, 'DIREITO CIVIL', 'a disciplina continua vindo do assunto clicado');
});

test('V646 ignora valor lembrado que não existe mais nas opções', () => {
  const { api } = harness();
  const form = { elements: { count: campo('15', ['5', '10', '15']) } };
  assert.equal(api.aplicarPrefs(form, { count: '99' }), false);
  assert.equal(form.elements.count.value, '15');
});

test('V646 só apresenta: não grava nos dados do estudo nem monta prompt', () => {
  const source = read('question-training-form-v646.js');
  assert.doesNotMatch(source, /saveData|indexedDB|state\.|\.prompt\(|innerHTML\s*=/);
});

test('V646 é carregada pela cadeia ativa e publicada igual na raiz e em docs', () => {
  const loader = read('security-observability-v318.js');
  assert.ok(loader.includes('question-training-form-v646.js?v=20260928-bancas-em-ordem-v646-2'));
  assert.match(loader, /\n  installQuestionTrainingFormV646\(\);/);
  for (const file of ['question-training-form-v646.js', 'security-observability-v318.js']) assert.equal(read(file), read('docs/' + file), file);
});

test('V646.2 lista de bancas em ordem vira principal + complementação no prompt', () => {
  const api = require(path.join(root, 'question-training.js'));
  const boards = [{ banca: 'FGV' }, { banca: 'CEBRASPE', formato: 'Múltipla escolha' }, { banca: 'CEBRASPE', formato: 'Certo/Errado' }, { banca: 'FCC' }];
  const c = api.normalizeConfig({ discipline: 'Penal', count: 10, boards: JSON.stringify(boards) });
  assert.equal(c.primary, 'FGV');
  assert.deepEqual([...c.fallback], ['CEBRASPE (só múltipla escolha)', 'CEBRASPE (só Certo/Errado)', 'FCC']);
  assert.equal(c.cebraspe, 'formato indicado em cada posição da lista de bancas');
  const soCeb = api.normalizeConfig({ discipline: 'Penal', count: 10, boards: JSON.stringify([{ banca: 'CEBRASPE', formato: 'Certo/Errado' }, { banca: 'FGV' }]) });
  assert.equal(soCeb.primary, 'CEBRASPE');
  assert.equal(soCeb.cebraspe, 'Certo/Errado');
  assert.deepEqual([...soCeb.fallback], ['FGV']);
});

test('V646.2 escolha equivalente à antiga gera as mesmas instruções de bancas', () => {
  const api = require(path.join(root, 'question-training.js'));
  const linhas = (t) => t.split('\n').slice(3, 6).join('\n');
  const antigo = api.prompt({ discipline: 'Penal', count: 10, primary: 'FGV', supplement: 'cebraspe-mc' }, {}, 'R').instruction;
  const novo = api.prompt({ discipline: 'Penal', count: 10, boards: JSON.stringify([{ banca: 'FGV' }, { banca: 'CEBRASPE', formato: 'Múltipla escolha' }]) }, {}, 'R').instruction;
  assert.equal(linhas(novo), linhas(antigo));
});
