const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const HOJE = '2026-09-12';

function harness({ metas = [], comSecao = true, comCampoData = true } = {}) {
  const nos = new Map();
  const eventos = [];
  const criar = (tag) => ({
    tag, id: '', className: '', innerHTML: '', textContent: '', value: '', open: false,
    filhos: [], parentNode: null, ouvintes: {},
    appendChild(f) { f.parentNode = this; this.filhos.push(f); if (f.id) nos.set(f.id, f); return f; },
    addEventListener(nome, fn) { (this.ouvintes[nome] ||= []).push(fn); },
    dispatchEvent(e) { eventos.push({ id: this.id, tipo: e?.type, valor: this.value }); return true; },
    scrollIntoView() {},
    querySelector(sel) {
      const chave = (sel.match(/data-v452="([^"]+)"/) || [])[1];
      if (!chave) return null;
      this.__partes ||= {};
      return (this.__partes[chave] ||= { innerHTML: '', textContent: '' });
    },
    closest() { return null; }
  });

  if (comSecao) { const s = criar('section'); s.id = 'view-metas-do-dia'; nos.set(s.id, s); }
  if (comCampoData) { const c = criar('input'); c.id = 'goalDate'; nos.set(c.id, c); }

  const context = {
    console: { warn() {}, error() {}, info() {} },
    state: { dailyGoals: metas },
    todayISO: () => HOJE,
    isGoalDone: (g) => g.status === 'Concluída',
    goalTotalActualMinutes: (g) => Number(g.actualMinutes || 0),
    isPlanningStudyGoal: () => true,
    canonicalStudyDescriptor: (g) => ({ discipline: g.discipline, subject: g.subject }),
    formatDateBR: (iso) => { const [a, m, d] = String(iso).split('-'); return `${d}/${m}/${a}`; },
    document: { getElementById: (id) => nos.get(id) || null, createElement: criar },
    Event: class { constructor(t) { this.type = t; } },
    setInterval: () => 0,
    clearInterval() {}
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('daily-plan-backlog-v452.js'), context);
  return { context, api: context.__ALDUS_DAILY_PLAN_BACKLOG_V452__, nos, eventos };
}

const meta = (id, data, extra = {}) => ({
  id, date: data, discipline: 'DIREITO PENAL', subject: `Assunto ${id}`,
  status: 'Pendente', actualMinutes: 0, ...extra
});

test('V452 traz as pendentes de dias anteriores, começadas ou não', () => {
  const { api } = harness({ metas: [
    meta('a', '2026-09-10', { actualMinutes: 60 }),
    meta('b', '2026-09-09'),
    meta('c', HOJE),
    meta('d', '2026-09-20')
  ] });
  const lista = api.emAberto().map((m) => m.id);
  assert.deepEqual(lista, ['a', 'b'], 'hoje e futuro ficam de fora; passado entra com ou sem tempo');
});

test('V452 não lista meta concluída', () => {
  const { api } = harness({ metas: [
    meta('feita', '2026-09-10', { status: 'Concluída', actualMinutes: 120 }),
    meta('aberta', '2026-09-10')
  ] });
  assert.deepEqual(api.emAberto().map((m) => m.id), ['aberta']);
});

test('V452 põe na frente as que já têm tempo dentro', () => {
  const { api } = harness({ metas: [
    meta('sem', '2026-09-11'),
    meta('pouco', '2026-09-05', { actualMinutes: 30 }),
    meta('muito', '2026-09-04', { actualMinutes: 90 })
  ] });
  assert.deepEqual(api.emAberto().map((m) => m.id), ['muito', 'pouco', 'sem'],
    'a interrompida com mais tempo investido é a primeira candidata a retomar');
});

test('V452 mostra quanto já foi estudado em cada uma', () => {
  const { api } = harness({ metas: [meta('a', '2026-09-10', { actualMinutes: 95 })] });
  assert.equal(api.emAberto()[0].minutos, 95);
});

test('V452 leva ao dia da meta sem mover nada', () => {
  const metas = [meta('a', '2026-09-10', { actualMinutes: 60 })];
  const { api, nos, eventos } = harness({ metas });
  assert.equal(api.irParaODia('2026-09-10'), true);
  assert.equal(nos.get('goalDate').value, '2026-09-10');
  assert.deepEqual(eventos, [{ id: 'goalDate', tipo: 'change', valor: '2026-09-10' }]);
  assert.equal(metas[0].date, '2026-09-10', 'a data da meta não pode ser alterada');
  assert.equal(metas[0].status, 'Pendente');
});

test('V452 cria o painel dentro do Plano do Dia', () => {
  const { nos } = harness({ metas: [meta('a', '2026-09-10')] });
  const painel = nos.get('aldusDailyPlanBacklogV452');
  assert.ok(painel);
  assert.equal(painel.parentNode.id, 'view-metas-do-dia');
  assert.match(painel.innerHTML, /Metas em aberto de dias anteriores/);
});

test('V452 aguenta estado vazio e ausência do campo de data', () => {
  const vazio = harness({ metas: [] });
  assert.deepEqual(vazio.api.emAberto(), []);
  const semCampo = harness({ metas: [meta('a', '2026-09-10')], comCampoData: false });
  assert.equal(semCampo.api.irParaODia('2026-09-10'), false);
});

test('V452 mantém paridade raiz/docs', () => {
  assert.equal(read('daily-plan-backlog-v452.js'), read('docs/daily-plan-backlog-v452.js'));
});
