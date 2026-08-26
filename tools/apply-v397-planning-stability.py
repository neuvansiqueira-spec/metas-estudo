from pathlib import Path

ROOT = Path('.')
OLD_VERSION = '20260821-planning-quality-v371'
NEW_VERSION = '20260826-planning-stability-v397'


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'V397: trecho esperado não encontrado em {label}: {old[:100]}')
    return text.replace(old, new, 1)


def replace_between(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'V397: início não encontrado em {label}: {start_marker}')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'V397: fim não encontrado em {label}: {end_marker}')
    return text[:start] + replacement + text[end:]


planning = ROOT / 'planning-quality-v368.js'
source = planning.read_text(encoding='utf-8')
if NEW_VERSION not in source:
    source = source.replace(
        '/* Aldus V371: limita o rodízio automático às quatro Peças práticas definidas pelo usuário */',
        '/* Aldus V397: planejamento estável; reparos somente após ação explícita de geração */',
        1,
    )
    source = replace_once(
        source,
        f'  const VERSION = "{OLD_VERSION}";',
        f'  const VERSION = "{NEW_VERSION}";',
        'planning-quality-v368.js',
    )
    source = source.replace(
        '  const EXPORT_IDS = new Set(["exportGoalCalendarExcel", "exportGoalCalendarPdf", "exportGoalCalendarImage"]);\n',
        '',
        1,
    )
    source = source.replace('  let initialScheduled = false;\n', '', 1)

    export_gate = '''  function installExportGate() {
    // V397: exportar é estritamente somente leitura. Nenhuma meta é reparada,
    // substituída, salva ou sincronizada como efeito colateral da exportação.
    exportGateInstalled = true;
    return true;
  }
'''
    source = replace_between(
        source,
        '  function installExportGate() {',
        '\n  function elementId(',
        export_gate,
        'installExportGate',
    )

    listeners = '''  function installListeners() {
    if (listenersInstalled || typeof document === "undefined" || typeof document.addEventListener !== "function") return false;
    listenersInstalled = true;
    document.addEventListener("click", (event) => {
      if (!PLANNING_ROUTES.has(routeName())) return;
      const id = elementId(event.target);
      if (!GENERATION_IDS.has(id)) return;

      // V397: somente uma ação explícita de gerar/regerar pode habilitar a
      // seleção pedagógica e executar reparos no planejamento persistido.
      installSelectionGate();
      scheduleAfterGeneration(id);
    }, true);
    return true;
  }
'''
    source = replace_between(
        source,
        '  function installListeners() {',
        '\n  function scheduleInitialRepair',
        listeners,
        'installListeners',
    )

    passive_tail = '''  function scheduleInitialRepair() {
    // Compatibilidade de API: rotas, bootstrap, renderização e sincronização
    // nunca devem alterar metas sem uma ação explícita do usuário.
    return false;
  }

  installListeners();
'''
    source = replace_between(
        source,
        '  function scheduleInitialRepair',
        '\n  globalThis.__aldusPlanningQualityV368',
        passive_tail,
        'scheduleInitialRepair/startup',
    )
    planning.write_text(source, encoding='utf-8')

(ROOT / 'docs' / 'planning-quality-v368.js').write_text(
    planning.read_text(encoding='utf-8'), encoding='utf-8'
)

# Atualiza somente os caminhos ativos de bootstrap/publicação.
active_bootstrap = [
    'bootstrap-fast-path-v351.js',
    'bootstrap-integrity-loader-v275.js',
    'bootstrap-integrity-loader-v258.js',
    'bootstrap-integrity-loader-v258-core.js',
]
for rel in active_bootstrap:
    for path in (ROOT / rel, ROOT / 'docs' / rel):
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8')
        text = text.replace(OLD_VERSION, NEW_VERSION)
        text = text.replace('planning=v371', 'planning=v397')
        path.write_text(text, encoding='utf-8')

# Faz o service worker buscar o runtime corrigido e cria nova chave de cache.
for rel in ('service-worker.js', 'docs/service-worker.js'):
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    text = text.replace(OLD_VERSION, NEW_VERSION)
    text = text.replace('planning-quality-v371', 'planning-stability-v397')
    text = text.replace('planning=v371', 'planning=v397')
    path.write_text(text, encoding='utf-8')

# Atualiza os testes funcionais existentes.
tests = ROOT / 'tests' / 'v368-planning-quality.test.js'
test_source = tests.read_text(encoding='utf-8')

old_export_start = 'test("V368 audita o estado imediatamente antes de construir a exportação mensal", () => {'
next_export_test = '\ntest("V371 reproduz o Excel anexado: preserva execução e usa somente as quatro Peças autorizadas", () => {'
export_test = '''test("V397 mantém a exportação mensal estritamente somente leitura", () => {
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals: [pieceGoal("2026-08-06"), pieceGoal("2026-08-07"), pieceGoal("2026-08-08")]
  };
  const before = JSON.stringify(state);
  const sandbox = {
    state,
    todayISO: () => "2026-08-21",
    buildGoalCalendarExportPayload: () => ({ subjects: state.dailyGoals.map((goal) => goal.subject) }),
    performance: { now: () => 1 },
    queueMicrotask: (callback) => callback(),
    setTimeout: () => 0,
    console,
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  installRealOriginClassifier(sandbox);
  vm.runInContext(source, sandbox);

  const payload = sandbox.buildGoalCalendarExportPayload();
  assert.equal(JSON.stringify(state), before, "Exportar não pode alterar o planejamento em memória.");
  assert.equal(new Set(payload.subjects).size, 1, "A exportação deve refletir exatamente o estado salvo.");
  assert.equal(sandbox.__aldusPlanningQualityV368.getLastReport(), null);
});
'''
if old_export_start in test_source:
    test_source = replace_between(
        test_source,
        old_export_start,
        next_export_test,
        export_test,
        'teste de exportação somente leitura',
    )

explicit_title = 'test("V371 reproduz o Excel anexado: preserva execução e usa somente as quatro Peças autorizadas", () => {'
if explicit_title in test_source:
    block_start = test_source.index(explicit_title)
    block_end = test_source.index('\ntest("V368 não cria hot path', block_start)
    block = test_source[block_start:block_end]
    block = block.replace(
        'V371 reproduz o Excel anexado',
        'V397 preserva execução e repara Peças somente após geração explícita',
        1,
    )
    needle = '  const payload = sandbox.buildGoalCalendarExportPayload();\n'
    block = replace_once(
        block,
        needle,
        '  sandbox.__aldusPlanningQualityV368.run("explicit-generation", { persist: false, render: false, sync: false });\n' + needle,
        'teste de geração explícita',
    )
    test_source = test_source[:block_start] + block + test_source[block_end:]

test_source = test_source.replace(
    'test("V368 não cria hot path e mantém execução limitada às rotas e ações de planejamento", () => {',
    'test("V397 não cria hot path e não executa reparos em eventos passivos", () => {',
    1,
)
test_source = test_source.replace(
    '  assert.equal((source.match(/requestIdleCallback/g) || []).length, 2);',
    '  assert.equal((source.match(/requestIdleCallback/g) || []).length, 0);',
    1,
)
test_source = test_source.replace(
    '  assert.match(source, /EXPORT_IDS\\.has\\(id\\)/);',
    '  assert.doesNotMatch(source, /before-export-payload|planning-route-entered|post-bootstrap-maintenance/);',
    1,
)
test_source = test_source.replace('V371 está espelhada', 'V397 está espelhada', 1)
test_source = test_source.replace(OLD_VERSION, NEW_VERSION)
test_source = test_source.replace('planning=v371', 'planning=v397')
tests.write_text(test_source, encoding='utf-8')

# Atualiza expectativas de versão em outros testes de bootstrap/cache.
for path in (ROOT / 'tests').glob('*.test.js'):
    if path == tests:
        continue
    text = path.read_text(encoding='utf-8')
    changed = text.replace(OLD_VERSION, NEW_VERSION).replace('planning=v371', 'planning=v397')
    if changed != text:
        path.write_text(changed, encoding='utf-8')

# Regras estruturais adicionais da V397.
guard_test = ROOT / 'tests' / 'v397-planning-stability.test.js'
guard_test.write_text(r'''const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-quality-v368.js"), "utf8");

test("V397 proíbe mutação automática ao abrir ou trocar telas de planejamento", () => {
  assert.doesNotMatch(source, /window\.addEventListener\("hashchange"/);
  assert.doesNotMatch(source, /aldus:post-bootstrap-maintenance-complete/);
  assert.doesNotMatch(source, /run\("before-export-payload"/);
  assert.doesNotMatch(source, /EXPORT_IDS/);
});

test("V397 mantém reparos ligados somente a comandos explícitos de geração", () => {
  assert.match(source, /GENERATION_IDS\.has\(id\)/);
  assert.match(source, /installSelectionGate\(\);\s*scheduleAfterGeneration\(id\)/);
  assert.match(source, /run\(`after-\$\{id\}`\)/);
});

test("V397 publica runtime espelhado e cache-bustado", () => {
  assert.equal(source, fs.readFileSync(path.join(root, "docs", "planning-quality-v368.js"), "utf8"));
  for (const file of ["bootstrap-fast-path-v351.js", "bootstrap-integrity-loader-v258-core.js"]) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(text, /planning-quality-v368\.js\?v=20260826-planning-stability-v397/);
  }
  const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(sw, /const PLANNING_QUALITY_VERSION = "20260826-planning-stability-v397"/);
  assert.match(sw, /planning-stability-v397/);
});
''', encoding='utf-8')
