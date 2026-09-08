const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const DIA = '2026-09-16';
const PECA = 'planejamento peça diária';

function meta(id, extra = {}) {
  return { id, date: DIA, data: DIA, minutes: 60, status: 'Pendente', origin: 'planejamento', ...extra };
}

// Estado + reconciliador falso. O reconciliador imita o do script.js: cria ate
// `topicLimit` metas e devolve o relatorio com `added`.
function harness({ metas = [], cota = 2, marcador = null, pecaExtra = false, prelude = '' } = {}) {
  const mensagens = [];
  const chamadas = [];
  let contador = 0;
  const estado = {
    dailyGoals: [...metas],
    planning: { config: { topicsPerDay: cota, disciplinesPerDay: cota } }
  };
  if (marcador) estado.migrations = { planningStabilityV427: { targetQuota: marcador } };

  const context = {
    console: { warn() {}, error() {}, info() {} },
    setInterval: () => 0,
    clearInterval() {},
    showDailyGoalMessage: (texto) => mensagens.push(String(texto)),
    reconcileDailyGoalsWithPlanning(alvo, dia, opts = {}) {
      chamadas.push({ dia, topicLimit: opts.topicLimit, maxGoals: opts.maxGoals });
      const quantas = Number.isFinite(opts.topicLimit) ? opts.topicLimit : 3;
      const added = [];
      for (let i = 0; i < quantas; i += 1) {
        const nova = meta(`nova-${contador += 1}`, { subject: `Gerada ${i}` });
        alvo.dailyGoals.push(nova);
        added.push(nova);
      }
      // A V183 injeta a peca por fora do topicLimit, depois da geracao.
      if (pecaExtra) {
        const p = meta(`peca-${contador += 1}`, { origin: PECA, fixedDailyPieceV183: true });
        alvo.dailyGoals.push(p);
        added.push(p);
      }
      return { added, removed: [], preserved: [], warnings: [] };
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  if (prelude) vm.runInContext(prelude, context);
  vm.runInContext(read('daily-plan-quota-v607.js'), context);
  const api = context.__ALDUS_DAILY_QUOTA_V607__;
  assert.equal(api.install(), true, 'o invólucro precisa instalar');
  return { context, api, estado, mensagens, chamadas };
}

const rodar = (h, opts = {}) => h.context.reconcileDailyGoalsWithPlanning(h.estado, DIA, opts);
const pendentes = (h) => h.estado.dailyGoals.filter((m) => !/^conclu/i.test(m.status)).length;

test('V607 dia vazio: entram as duas da cota', () => {
  const h = harness();
  const r = rodar(h);
  assert.equal(pendentes(h), 2);
  assert.equal(h.chamadas[0].topicLimit, 2, 'o limite pedido ao gerador é o número de vagas');
  assert.equal(r.quotaV607.entraram, 2);
});

test('V607 dia com uma pendente: entra só uma', () => {
  const h = harness({ metas: [meta('a')] });
  rodar(h);
  assert.equal(pendentes(h), 2);
  assert.equal(h.chamadas[0].topicLimit, 1);
});

test('V607 dia cheio: o gerador nem é chamado', () => {
  const h = harness({ metas: [meta('a'), meta('b')] });
  const r = rodar(h);
  assert.equal(h.chamadas.length, 0, 'chamar o gerador com zero vagas só gera trabalho e risco');
  assert.equal(pendentes(h), 2);
  assert.equal(r.added.length, 0);
  assert.equal(r.quotaV607.bloqueado, true);
});

test('V607 dia herdado com cinco metas: nenhuma é apagada', () => {
  const antigas = ['a', 'b', 'c', 'd', 'e'].map((id) => meta(id));
  const h = harness({ metas: antigas });
  rodar(h);
  assert.equal(pendentes(h), 5, 'o teto barra entrada; nunca apaga o que já existia');
  for (const antiga of antigas) {
    assert.ok(h.estado.dailyGoals.some((m) => m.id === antiga.id), `${antiga.id} sumiu`);
  }
});

test('V607 cliques repetidos não somam metas', () => {
  const h = harness();
  rodar(h);
  rodar(h);
  rodar(h);
  assert.equal(pendentes(h), 2, 'era assim que os dias chegavam a 10 metas');
});

test('V607 a peça conta no teto e não vira uma terceira meta', () => {
  const h = harness({ pecaExtra: true });
  rodar(h);
  assert.equal(pendentes(h), 2, 'a peça ocupa uma das duas vagas');
  assert.ok(h.estado.dailyGoals.some((m) => m.origin === PECA), 'e é ela que fica, não a meta gerada');
});

test('V607 a peça é a última a ser cortada', () => {
  const h = harness({ metas: [meta('a')], pecaExtra: true });
  rodar(h);
  const restantes = h.estado.dailyGoals.filter((m) => !/^conclu/i.test(m.status));
  assert.equal(restantes.length, 2);
  assert.ok(restantes.some((m) => m.origin === PECA));
  assert.ok(restantes.some((m) => m.id === 'a'), 'a meta que já existia não podia sair');
});

test('V607 o corte só atinge metas criadas na própria chamada', () => {
  const h = harness({ metas: [meta('velha')], pecaExtra: true });
  rodar(h);
  assert.ok(h.estado.dailyGoals.some((m) => m.id === 'velha'));
});

test('V607 metas concluídas não ocupam vaga', () => {
  const h = harness({ metas: [meta('feita', { status: 'Concluída' }), meta('outra', { status: 'Concluida' })] });
  rodar(h);
  assert.equal(pendentes(h), 2, 'o dia estava livre: as duas concluídas ficam no histórico');
  assert.equal(h.estado.dailyGoals.filter((m) => /^conclu/i.test(m.status)).length, 2);
});

test('V607 respeita um limite menor pedido por quem chamou', () => {
  const h = harness();
  rodar(h, { topicLimit: 1 });
  assert.equal(h.chamadas[0].topicLimit, 1, 'o teto restringe, nunca amplia o pedido');
});

test('V609 a cota vem da tela de Planejamento, nao de carimbo meu', () => {
  // Ele salva 4 no formulario; recordManualCount grava nas tres fontes. Se o
  // teto ignorasse isso, o ajuste dele nao surtiria efeito nenhum.
  const h = harness({ cota: 4, marcador: { disciplines: 2, topics: 2 } });
  rodar(h);
  assert.equal(pendentes(h), 4, 'o numero do Planejamento manda sobre o carimbo da V427');
});

test('V609 cai no carimbo da V427 so quando o config nao serve', () => {
  const h = harness({ cota: 0, marcador: { disciplines: 2, topics: 2 } });
  rodar(h);
  assert.equal(pendentes(h), 2, 'config invalido: o alvo publicado da V427 e a rede');
});

test('V609 reduzir a cota no Planejamento nao apaga o que ja estava no dia', () => {
  const h = harness({ metas: [meta('a'), meta('b'), meta('c')], cota: 1 });
  rodar(h);
  assert.equal(pendentes(h), 3, 'o teto barra entrada; nunca apaga');
});

test('V607 avisa com a contagem, para o limite ser visível', () => {
  const h = harness({ metas: [meta('a'), meta('b')] });
  rodar(h);
  assert.equal(h.mensagens.length, 1);
  assert.match(h.mensagens[0], /Já havia 2/);
  assert.match(h.mensagens[0], /cabiam 0/);
  assert.match(h.mensagens[0], /mantidas/);
});

test('V607 resolve o estado pelo identificador state, nunca por globalThis.state', () => {
  const fonte = read('daily-plan-quota-v607.js');
  assert.doesNotMatch(fonte, /globalThis\.state/,
    'script.js declara const state; globalThis.state não representa o estado real');
  const h = harness({ prelude: `const state = { dailyGoals: [], planning: { config: { topicsPerDay: 2 } } };` });
  assert.equal(h.context.state, undefined, 'const no escopo global não aparece em globalThis');
  const r = h.context.reconcileDailyGoalsWithPlanning(undefined, DIA, {});
  assert.equal(r.quotaV607.limite, 2, 'sem o argumento, o estado tem de vir do identificador léxico');
});

test('V607 não instala dois invólucros sobre a mesma função', () => {
  const h = harness();
  const primeiro = h.context.reconcileDailyGoalsWithPlanning;
  assert.equal(h.api.install(), true);
  assert.equal(h.context.reconcileDailyGoalsWithPlanning, primeiro, 'reinstalar não pode empilhar');
});

test('V607 não faz polling sobre metas nem gera nada ao carregar', () => {
  const fonte = read('daily-plan-quota-v607.js');
  assert.doesNotMatch(fonte, /setInterval\([^)]*dailyGoals/);
  assert.doesNotMatch(fonte, /MutationObserver/);
  const h = harness();
  assert.equal(h.chamadas.length, 0, 'carregar o módulo não pode gerar meta');
});

test('V607 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('daily-plan-quota-v607.js'), read('docs/daily-plan-quota-v607.js'));
  const versao = read('daily-plan-quota-v607.js').match(/VERSION = "([^"]+)"/)[1];
  assert.ok(read('performance-emergency-v350.js').includes(`daily-plan-quota-v607.js?v=${versao}`),
    'o carregador precisa apontar para a mesma revisão');
  assert.match(read('performance-emergency-v350.js'), /\n {2}installDailyPlanQuotaV607\(\);/);
  for (const arquivo of ['performance-emergency-v350.js', 'security-observability-v318.js', 'index.html']) {
    assert.equal(read(arquivo), read(`docs/${arquivo}`), arquivo);
  }
});

test('V607 escreve em português correto', () => {
  const fonte = read('daily-plan-quota-v607.js');
  for (const m of fonte.matchAll(/(showDailyGoalMessage\()\s*[`"']([^`"']{8,})/g)) {
    for (const palavra of ['diario', 'ja havia', 'metas existentes foram mantidas nao']) {
      assert.doesNotMatch(m[2], new RegExp(`\\b${palavra}\\b`, 'i'), `falta acento: ${m[2]}`);
    }
  }
});
