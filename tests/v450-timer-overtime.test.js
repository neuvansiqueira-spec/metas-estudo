const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// DOM mínimo: o módulo só precisa achar um ponto de ancoragem e escrever texto.
function fakeDom() {
  const criados = new Map();
  const ancora = { id: 'timerAlert', nextSibling: null, parentNode: null };
  const pai = {
    filhos: [ancora],
    insertBefore(node) { this.filhos.push(node); node.parentNode = pai; }
  };
  ancora.parentNode = pai;
  return {
    getElementById: (id) => (id === 'timerAlert' ? ancora : criados.get(id) || null),
    createElement: () => {
      const node = { id: '', className: '', hidden: false, textContent: '', parentNode: null };
      queueMicrotask(() => {});
      return node;
    },
    registrar: (node) => criados.set(node.id, node),
    banner: () => criados.get('aldusTimerOvertimeBannerV450') || pai.filhos.find((n) => n.id === 'aldusTimerOvertimeBannerV450') || null
  };
}

// Reproduz o congelamento medido em script.js:1552 —
//   elapsedSeconds vira o previsto, startedAt vira null, paused vira true.
function harness({ comV268 = true, previstoMinutos = 45 } = {}) {
  const agora = { valor: 1_700_000_000_000 };
  const dom = fakeDom();
  const renders = { total: 0 };

  const floatingTimer = {
    sessionId: 's1', goalId: 'g1', plannedMinutes: previstoMinutos, mode: 'countdown',
    elapsedSeconds: 0, startedAt: agora.valor, paused: false, intervalId: 1,
    completed: false, completionAlarmPlayed: false, completionDismissed: false,
    pauses: [], resumes: []
  };

  const context = {
    console: { warn() {}, error() {}, info() {} },
    Date: class extends Date { static now() { return agora.valor; } },
    floatingTimer,
    currentTimerSeconds() {
      const correndo = floatingTimer.startedAt && !floatingTimer.paused
        ? Math.floor((agora.valor - floatingTimer.startedAt) / 1000) : 0;
      return floatingTimer.elapsedSeconds + correndo;
    },
    timerPlannedSeconds() {
      return floatingTimer.mode === 'free'
        ? Math.max(0, Math.round((Number(floatingTimer.sessionGoalMinutes) || 0) * 60))
        : Math.max(0, Math.round((Number(floatingTimer.plannedMinutes) || 0) * 60));
    },
    renderFloatingTimer() { renders.total += 1; },
    showDailyGoalMessage() {},
    persistFloatingTimerSession() {},
    clearInterval() {},
    document: {
      getElementById: (id) => dom.getElementById(id),
      createElement: (tag) => {
        const node = { tag, id: '', className: '', hidden: false, textContent: '', parentNode: null };
        node.__registrar = () => dom.registrar(node);
        return node;
      }
    }
  };
  context.window = {
    setInterval: () => 99,
    clearInterval: () => {}
  };
  context.globalThis = context;
  context.setInterval = context.window.setInterval;

  // insertBefore precisa registrar o nó para o getElementById seguinte achá-lo.
  const ancora = dom.getElementById('timerAlert');
  ancora.parentNode.insertBefore = (node) => { node.parentNode = ancora.parentNode; dom.registrar(node); };

  if (comV268) {
    context.__ALDUS_TIMER_CONTROLS_HARDENING_V268__ = {
      continuePastCompletion() {
        const elapsed = context.currentTimerSeconds();
        floatingTimer.elapsedSeconds = elapsed;
        floatingTimer.startedAt = agora.valor;
        floatingTimer.paused = false;
        floatingTimer.completed = false;
        floatingTimer.completionDismissed = true;
        floatingTimer.completionAlarmPlayed = true;
        if (floatingTimer.mode === 'countdown') {
          floatingTimer.mode = 'free';
          floatingTimer.sessionGoalMinutes = Math.max(1, floatingTimer.plannedMinutes, Math.ceil(elapsed / 60));
        }
        return true;
      }
    };
  }

  vm.createContext(context);
  vm.runInContext(read('timer-overtime-v450.js'), context);
  const api = context.__ALDUS_TIMER_OVERTIME_V450__;

  // O congelamento da conclusão, como o site faz hoje.
  const concluir = () => {
    const previsto = Math.round(previstoMinutos * 60);
    agora.valor += previsto * 1000;
    floatingTimer.completed = true;
    floatingTimer.completionAlarmPlayed = true;
    floatingTimer.elapsedSeconds = previsto;
    floatingTimer.startedAt = null;
    floatingTimer.paused = true;
  };
  const avancarMinutos = (m) => { agora.valor += m * 60 * 1000; };

  return { context, api, floatingTimer, agora, concluir, avancarMinutos, dom, renders };
}

test('V450 volta a contar quando o tempo previsto acaba', () => {
  const { api, floatingTimer, concluir } = harness();
  concluir();
  assert.equal(floatingTimer.paused, true, 'o site congela o cronômetro na conclusão');

  api.passada();

  assert.equal(floatingTimer.paused, false, 'o cronômetro precisa voltar a correr sozinho');
  assert.ok(floatingTimer.startedAt, 'sem startedAt nada é contado');
  assert.ok(floatingTimer.overtimeV450, 'a sessão precisa registrar quando o tempo extra começou');
  assert.equal(floatingTimer.overtimeV450.previstoSegundos, 45 * 60);
});

test('V450 conta o tempo estudado depois do alarme que ele não ouviu', () => {
  const { context, api, concluir, avancarMinutos } = harness();
  concluir();
  api.passada();

  // Ele seguiu estudando doze minutos sem ver o aviso.
  avancarMinutos(12);
  api.passada();

  assert.equal(context.currentTimerSeconds(), (45 + 12) * 60,
    'os doze minutos estudados depois do alarme precisam estar no total');
});

test('V450 funciona sem a V268, pelo caminho próprio', () => {
  const { api, floatingTimer, concluir, avancarMinutos, context } = harness({ comV268: false });
  concluir();
  api.passada();

  assert.equal(floatingTimer.paused, false);
  assert.equal(floatingTimer.mode, 'free',
    'em contagem regressiva o mostrador fica parado em zero: o modo tem de virar livre');
  avancarMinutos(5);
  assert.equal(context.currentTimerSeconds(), 50 * 60);
});

test('V450 age uma vez só: pausa depois do extra é decisão dele', () => {
  const { api, floatingTimer, concluir, avancarMinutos } = harness();
  concluir();
  api.passada();
  avancarMinutos(3);

  // Ele viu o aviso e pausou de propósito.
  floatingTimer.elapsedSeconds = 48 * 60;
  floatingTimer.startedAt = null;
  floatingTimer.paused = true;

  api.passada();
  api.passada();

  assert.equal(floatingTimer.paused, true, 'o módulo não pode desfazer uma pausa pedida por ele');
});

test('V450 para no teto, para não inventar tempo', () => {
  const { api, floatingTimer, concluir, avancarMinutos, context } = harness();
  concluir();
  api.passada();

  // Alarme não ouvido e ele saiu: quatro horas de aba aberta.
  avancarMinutos(240);
  api.passada();

  assert.equal(floatingTimer.paused, true, 'passado o teto, o cronômetro para de verdade');
  assert.ok(floatingTimer.overtimeV450.capadoEm, 'e registra quando parou');
  assert.equal(context.currentTimerSeconds(), (45 + 30) * 60,
    'o pior caso é meia hora a mais, não quatro horas');
});

test('V450 escreve na tela o que está fazendo', () => {
  const { api, concluir, avancarMinutos, dom } = harness();
  concluir();
  api.passada();
  avancarMinutos(12);
  api.passada();

  const banner = dom.banner();
  assert.ok(banner, 'o aviso precisa existir na tela');
  assert.equal(banner.hidden, false);
  assert.match(banner.textContent, /continuo contando: \+12 min/);
  assert.match(banner.textContent, /total 57 min/);

  avancarMinutos(240);
  api.passada();
  assert.match(dom.banner().textContent, /Parei de contar/);
  assert.match(dom.banner().textContent, /Lance a mao/);
});

test('V450 não mexe em sessão que não terminou', () => {
  const { api, floatingTimer, avancarMinutos } = harness();
  avancarMinutos(10);
  api.passada();

  assert.equal(floatingTimer.overtimeV450, undefined);
  assert.equal(floatingTimer.completed, false);
  assert.equal(floatingTimer.mode, 'countdown', 'sem conclusão, nada muda');
});

test('V450 mantém paridade raiz/docs', () => {
  assert.equal(read('timer-overtime-v450.js'), read('docs/timer-overtime-v450.js'));
});
