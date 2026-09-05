const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Reproduz o ciclo medido no navegador em 05/09/2026:
// syncFactoryWithActiveEdital -> queueFactoryApply -> applyTree (868 itens)
// -> saveData -> a sincronização dispara de novo -> volta a enfileirar.
function harness({ mudaSempre = true } = {}) {
  const chamadas = { aplicacoes: 0, saves: 0 };
  const agora = { valor: 1_000_000 };
  const idle = [];

  const PENAL = '1Y9vWWHJGWgMkXPpVpXDFscnRbUoI2v0O';
  const arvore = { nodes: [
    { id: 'raiz', name: 'RAIZ', pathNames: ['RAIZ'], pathIds: ['raiz'], depth: 0 },
    { id: PENAL, name: 'DIREITO PENAL', pathNames: ['DIREITO PENAL'], pathIds: [PENAL], depth: 1 },
    { id: `${PENAL}-t1`, name: 'Concurso de pessoas', pathNames: ['DIREITO PENAL', 'Concurso de pessoas'], pathIds: [PENAL, `${PENAL}-t1`], depth: 2 }
  ] };
  // Metade das metas casa com a pasta que existe; metade nao casa com nada —
  // e a metade sem par que custava a varredura inteira em toda passada.
  const itens = Array.from({ length: 12 }, (_, i) => ({
    id: `f${i}`, disciplina: 'DIREITO PENAL',
    tema: i % 2 === 0 ? 'Concurso de pessoas' : `assunto solto ${i} sem par na arvore`
  }));

  const context = {
    console: { warn() {}, info() {}, error() {} },
    // Relógio controlado, mas construível: applyTree usa `new Date()`.
    Date: class extends Date { static now() { return agora.valor; } },
    location: { hash: '#fabrica-resumos' },
    addEventListener() {},
    localStorage: { getItem: () => JSON.stringify({ tree: arvore }), setItem() {} },
    requestIdleCallback: (fn) => { idle.push(fn); return idle.length; },
    setTimeout: (fn) => { idle.push(fn); return idle.length; },
    state: { factoryAgenda: itens, factoryItems: itens, migrations: {} },
    ensureFactoryAgenda: () => itens,
    renderFactory() {},
    saveData() {
      chamadas.saves += 1;
      // É aqui que o ciclo nascia: o salvamento reentrava na sincronização.
      if (typeof context.syncFactoryWithActiveEdital === 'function') context.syncFactoryWithActiveEdital();
    },
    syncFactoryWithActiveEdital() {}
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('factory-destination-integrity-v237.js'), context);

  const api = context.__ALDUS_FACTORY_DESTINATION_INTEGRITY_V237__;
  // Conta cada passada real e simula "mudou algo" conforme o cenário.
  const applyTreeOriginal = api.applyTree;
  context.__contarAplicacao = () => { chamadas.aplicacoes += 1; };
  const drenar = () => { while (idle.length) idle.shift()(); };
  context.__arvore = arvore;
  return { context, api, chamadas, agora, drenar, applyTreeOriginal, mudaSempre, idle };
}

test('V449 expõe o estado da fila, para a trava ser verificável', () => {
  const { api } = harness();
  const estado = api.queueState();
  for (const campo of ['applying', 'queued', 'lastAt', 'cooldownMs']) {
    assert.ok(Object.prototype.hasOwnProperty.call(estado, campo), `falta ${campo}`);
  }
});

test('V449 não enfileira nova passada enquanto uma está em curso', () => {
  const { context, api } = harness();
  // Durante applyTree o módulo marca `applying`; o saveData de dentro dele
  // chamava a sincronização, que reenfileirava — era o laço.
  const antes = api.queueState();
  assert.equal(antes.applying, false);

  let reentrou = false;
  context.saveData = () => { reentrou = api.queueFactoryApply(); };
  api.applyTree({ nodes: [{ id: 'raiz', name: 'RAIZ', pathNames: ['RAIZ'], parents: [] }] });
  assert.equal(reentrou, false, 'a fila precisa recusar enquanto applying está ligado');
});

test('V449 respeita intervalo mínimo entre passadas', () => {
  const { api, agora, drenar } = harness();
  assert.equal(api.queueFactoryApply(), true, 'a primeira sempre entra');
  drenar();
  const depois = api.queueState();
  assert.ok(depois.lastAt > 0, 'a passada precisa registrar quando terminou');
  assert.ok(depois.cooldownMs > 0, 'e precisa definir um intervalo mínimo');

  assert.equal(api.queueFactoryApply(), false, 'a seguinte, imediata, é recusada');
  agora.valor += depois.cooldownMs + 1;
  assert.equal(api.queueFactoryApply(), true, 'passado o intervalo, volta a aceitar');
});

test('V449 liga o intervalo ao resultado: mudou pouco tempo, não mudou muito tempo', () => {
  const { context, api, agora, drenar } = harness();

  api.queueFactoryApply();
  drenar();
  const relatorio = context.__factoryDestinationFoldersV237Report || {};
  const intervalo = api.queueState().cooldownMs;

  // A regra, e não o cenário: o intervalo tem de seguir o que a passada fez.
  if (relatorio.changed) {
    assert.equal(intervalo, 15000, 'houve reconciliação: pode voltar em pouco tempo');
  } else {
    assert.equal(intervalo, 600000, 'nada a reconciliar: insistir só queima nove segundos');
  }

  // E, seja qual for, a passada seguinte imediata é recusada.
  assert.equal(api.queueFactoryApply(), false);
  agora.valor += intervalo + 1;
  assert.equal(api.queueFactoryApply(), true);
});

test('V449 mantém a passada forçada disponível, para a API explícita', () => {
  const { api, drenar } = harness();
  api.queueFactoryApply();
  drenar();
  assert.equal(api.queueFactoryApply(), false);
  assert.equal(api.queueFactoryApply({ force: true }), true,
    'refresh() e chamadas explícitas não podem ficar presas na trava');
});

test('V449 não altera o trabalho, só a frequência', () => {
  const source = read('factory-destination-integrity-v237.js');
  // A correção é na fila. applyEntry e applyTree seguem intactos: se alguém
  // mexer neles, o diagnóstico do laço deixa de valer.
  assert.match(source, /function applyEntry\(entry, tree, fingerprint\)/);
  assert.match(source, /function applyTree\(tree, options = \{\}\)/);
  assert.match(source, /COOLDOWN_SEM_MUDANCA_MS = 600000/);
  assert.match(source, /if \(applying && options\.force !== true\) return false;/);
});

test('V449 lembra do "sem par": a meta que nao casou nao e reclassificada de graca', () => {
  const { context, api, drenar } = harness();
  api.queueFactoryApply();
  drenar();

  const semPar = context.state.factoryAgenda.filter((i) => !i.factoryDestinationFolder);
  assert.ok(semPar.length > 0, 'o cenario precisa ter meta sem par');
  for (const item of semPar) {
    assert.equal(typeof item.factoryDestinationFolderUnmatchedStamp, 'string',
      'sem carimbo, a meta sem par volta a varrer a arvore inteira em toda passada');
    assert.match(item.factoryDestinationFolderUnmatchedStamp, /#(topic|discipline)-unmatched$/);
  }
  // E quem casou nao carrega carimbo negativo nenhum.
  for (const item of context.state.factoryAgenda.filter((i) => i.factoryDestinationFolder)) {
    assert.equal(item.factoryDestinationFolderUnmatchedStamp, undefined);
  }
});

test('V449 refaz a conta quando muda o texto da meta', () => {
  const { context, api, drenar } = harness();
  api.queueFactoryApply();
  drenar();

  const semPar = context.state.factoryAgenda.find((i) => !i.factoryDestinationFolder);
  const carimbo = semPar.factoryDestinationFolderUnmatchedStamp;
  // O usuario corrige o tema da meta para o nome exato da pasta: tem de casar.
  semPar.tema = 'Concurso de pessoas';
  api.queueFactoryApply({ force: true });
  drenar();

  assert.notEqual(semPar.factoryDestinationFolderUnmatchedStamp, carimbo,
    'o carimbo nao pode sobreviver a mudanca do proprio texto que ele resume');
  assert.ok(semPar.factoryDestinationFolder, 'corrigido o tema, a meta passa a ter pasta destino');
  assert.equal(semPar.factoryDestinationFolderUnmatchedStamp, undefined);
});

test('V449 refaz a conta quando muda a arvore de pastas', () => {
  const { context, api, drenar } = harness();
  api.queueFactoryApply();
  drenar();
  const semPar = context.state.factoryAgenda.find((i) => !i.factoryDestinationFolder);
  const carimbo = semPar.factoryDestinationFolderUnmatchedStamp;

  // Nova pasta no Drive: a arvore muda de impressao digital e tudo e reavaliado.
  const PENAL = '1Y9vWWHJGWgMkXPpVpXDFscnRbUoI2v0O';
  const nova = {
    nodes: context.__arvore.nodes.concat([{
      id: `${PENAL}-t9`, name: semPar.tema,
      pathNames: ['DIREITO PENAL', semPar.tema], pathIds: [PENAL, `${PENAL}-t9`], depth: 2
    }])
  };
  api.applyTree(nova, { save: false, render: false });
  assert.notEqual(semPar.factoryDestinationFolderUnmatchedStamp, carimbo);
  assert.ok(semPar.factoryDestinationFolder, 'criada a pasta certa no Drive, a meta casa');
});

test('V449 nao muda o resultado, so para de refazer a mesma conta', () => {
  const { context, api } = harness();
  const primeira = api.applyTree(context.__arvore, { save: false, render: false });
  const retrato = context.state.factoryAgenda.map((i) => i.factoryDestinationFolder || '');
  const segunda = api.applyTree(context.__arvore, { save: false, render: false });

  assert.equal(segunda.matched, primeira.matched);
  assert.equal(segunda.unmatched, primeira.unmatched);
  assert.equal(segunda.changed, 0, 'a segunda passada nao tem nada a reconciliar');
  assert.deepEqual(context.state.factoryAgenda.map((i) => i.factoryDestinationFolder || ''), retrato,
    'a memoria do "sem par" nao pode alterar nenhuma pasta destino');
});

test('V449 mantém paridade raiz/docs', () => {
  assert.equal(read('factory-destination-integrity-v237.js'), read('docs/factory-destination-integrity-v237.js'));
});
