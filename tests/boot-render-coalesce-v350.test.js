const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");

function recorte(inicio, fim, rotulo) {
  const start = source.indexOf(inicio);
  assert.ok(start >= 0, `${rotulo}: início não encontrado`);
  const end = source.indexOf(fim, start);
  assert.ok(end > start, `${rotulo}: fim não encontrado`);
  return source.slice(start, end);
}

// Carrega só o mecanismo de render coalescido, com o resto simulado.
function carregar({ bootstrapPronto, secundariaCompleta }) {
  const trecho = recorte("function renderDaViewAtivaV350()", "function syllabusFromValues", "render coalescido");

  const context = {
    console,
    bootstrapStateReady: bootstrapPronto,
    startupMetricsV169: { secondaryInitializationCompleteMs: secundariaCompleta, bootPhases: [] },
    viewDataRevisionV172: 0,
    chamadas: { renderView: [], renderFloatingTimer: 0 },
    agendados: []
  };
  context.globalThis = context;
  context.hashToView = () => "dashboard";
  context.resolveViewTarget = (v) => v;
  context.renderView = (target) => context.chamadas.renderView.push(target);
  context.renderFloatingTimer = () => { context.chamadas.renderFloatingTimer += 1; };
  context.medirFaseBootV350 = (nome, cb) => cb();
  context.chamadas.agendadoAposPintura = [];
  context.scheduleViewRenderAfterPaintV170 = (target) => context.chamadas.agendadoAposPintura.push(target);
  // captura o agendamento em vez de executá-lo, para observar o coalescimento
  context.requestAnimationFrame = (cb) => context.agendados.push(cb);
  context.setTimeout = (cb) => context.agendados.push(cb);

  vm.createContext(context);
  vm.runInContext(trecho, context);
  return context;
}

function drenar(ctx) {
  // o agendamento é rAF seguido de setTimeout, então drena até esvaziar
  let voltas = 0;
  while (ctx.agendados.length && voltas < 10) {
    const pendentes = ctx.agendados.splice(0);
    pendentes.forEach((cb) => cb());
    voltas += 1;
  }
}

test("fora da janela do boot, render() desenha de forma síncrona", () => {
  // Esta é a propriedade que protege as ações do usuário: há dezenas de chamadas
  // que encadeiam render() com showView() e leitura imediata da tela.
  const ctx = carregar({ bootstrapPronto: true, secundariaCompleta: 17543.9 });
  ctx.render();
  assert.deepEqual(ctx.chamadas.renderView, ["dashboard"], "deveria ter desenhado imediatamente");
  assert.equal(ctx.agendados.length, 0, "não deveria ter agendado nada");
});

test("antes do estado estar pronto, render() também desenha de forma síncrona", () => {
  const ctx = carregar({ bootstrapPronto: false, secundariaCompleta: null });
  ctx.render();
  assert.deepEqual(ctx.chamadas.renderView, ["dashboard"]);
});

test("na janela do boot, três chamadas de render() viram um único desenho", () => {
  // Oito módulos auxiliares chamam render() após reparar dados no boot. Foram
  // medidos até três renders completos de dashboard de cerca de 2,9 s cada.
  const ctx = carregar({ bootstrapPronto: true, secundariaCompleta: null });
  ctx.render();
  ctx.render();
  ctx.render();
  assert.deepEqual(ctx.chamadas.renderView, [], "não deveria desenhar de imediato durante o boot");

  drenar(ctx);
  // O redesenho não sai em bloco: vai para o agendador da V344, que espera o
  // thread ficar quieto e cede a qualquer interação. Um render de dashboard custa
  // cerca de 3 s, e em bloco ele trava a página inteira justamente na janela em
  // que o usuário tenta abrir algo pela primeira vez.
  assert.deepEqual(ctx.chamadas.agendadoAposPintura, ["dashboard"], "as três chamadas deveriam colapsar em um agendamento");
  assert.deepEqual(ctx.chamadas.renderView, [], "não deveria desenhar de forma bloqueante no boot");
});

test("o cronômetro flutuante continua atualizando em toda chamada", () => {
  // renderFloatingTimer fica fora do coalescimento de propósito: é barato e o
  // usuário precisa ver o tempo correndo mesmo durante o boot.
  const ctx = carregar({ bootstrapPronto: true, secundariaCompleta: null });
  ctx.render();
  ctx.render();
  assert.equal(ctx.chamadas.renderFloatingTimer, 2);
});

test("depois de drenar, uma nova chamada no boot agenda outro desenho", () => {
  const ctx = carregar({ bootstrapPronto: true, secundariaCompleta: null });
  ctx.render();
  drenar(ctx);
  ctx.render();
  drenar(ctx);
  assert.deepEqual(ctx.chamadas.agendadoAposPintura, ["dashboard", "dashboard"]);
});

test("a instrumentação do render do dashboard viaja no código publicado", () => {
  assert.match(source, /medirFaseBootV350\("dashboard:renderDashboard"/);
  assert.match(source, /medirFaseBootV350\("dashboard:renderSubjects"/);
  assert.match(source, /medirFaseBootV350\("dashboard:renderSmartReviewSummary"/);
  assert.match(source, /const LIMITE_FASES_BOOT_V350 = 200;/, "o registro de fases precisa de teto");

  for (const gerado of ["app-v344.js", "docs/app-v344.js"]) {
    const conteudo = fs.readFileSync(gerado, "utf8");
    assert.match(conteudo, /function dentroDaJanelaDeBootV350\(\)/, `${gerado} está sem o coalescimento`);
    assert.match(conteudo, /medirFaseBootV350\("dashboard:renderDashboard"/, `${gerado} está sem a medição`);
  }
});
