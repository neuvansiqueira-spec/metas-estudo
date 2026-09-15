/* V623 — V326 e V327 deixam de disputar o prompt RESUMO/AULA. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const visualSource = fs.readFileSync("factory-resumo-aula-visual-v326.js", "utf8");
const canonicalSource = fs.readFileSync("factory-resumo-aula-canonical-v327.js", "utf8");

// Reaproveita o prompt de teste da V327: formato antigo, com todas as seções
// que as duas políticas reescrevem.
const v327Test = fs.readFileSync("tests/v327-factory-resumo-aula-canonical.test.js", "utf8");
const promptStart = v327Test.indexOf("const BASE_PROMPT = `") + "const BASE_PROMPT = ".length;
const BASE_PROMPT = vm.runInNewContext(v327Test.slice(promptStart, v327Test.indexOf("`;", promptStart) + 1));

const DEFAULT_LIBRARY = { triagem: "TRIAGEM ATUAL", resumoAula: BASE_PROMPT, lei: "LEI ATUAL", consolidacao: "CONSOLIDAÇÃO ATUAL" };

// Página com as duas políticas carregadas na ordem do index.html (V326 antes
// da V327). Timers e eventos ficam guardados para serem disparados à mão.
function createPage({ library = DEFAULT_LIBRARY, migrations = {}, withV327Tag = true } = {}) {
  const timers = [];
  const listeners = { window: {}, document: {} };
  const on = (bucket) => (type, fn) => { (bucket[type] ||= []).push(fn); };
  const context = vm.createContext({
    console, Date, Object, Boolean, JSON,
    setTimeout: (fn, delay = 0) => { timers.push({ fn, delay }); return timers.length; },
    location: { hash: "#dashboard" },
    window: { addEventListener: on(listeners.window) },
    document: {
      hidden: false,
      readyState: "complete",
      addEventListener: on(listeners.document),
      getElementById: (id) => (withV327Tag && id === "aldusFactoryResumoAulaCanonicalV327" ? { id } : null)
    }
  });
  vm.runInContext(`
    const FACTORY_RESUMO_AULA_PROMPT = ${JSON.stringify(BASE_PROMPT)};
    const defaultFactoryPromptLibrary = { triagem: 'TRIAGEM PADRÃO', resumoAula: ${JSON.stringify(BASE_PROMPT)}, lei: 'LEI PADRÃO', consolidacao: 'CONSOLIDAÇÃO PADRÃO' };
    let state = { migrations: ${JSON.stringify(migrations)}, factoryPromptLibrary: ${JSON.stringify(library)} };
    let saves = 0;
    function saveData() { saves += 1; }
    function normalizeFactoryPromptLibrary(library = {}) { return { ...library }; }
    function factoryPromptBase(type) { return String(state.factoryPromptLibrary?.[type] || '').trim() || 'FALLBACK'; }
  `, context);
  vm.runInContext(visualSource, context);
  vm.runInContext(canonicalSource, context);
  const read = (expression) => vm.runInContext(expression, context);
  const fire = (bucket, type) => (listeners[bucket][type] || []).forEach((fn) => fn({}));
  const everything = () => {
    [...timers].sort((left, right) => left.delay - right.delay).forEach((timer) => timer.fn());
    read('location.hash = "#fabrica-resumos"');
    fire("window", "hashchange");
    fire("window", "pageshow");
    fire("window", "focus");
    fire("document", "click");
    fire("document", "visibilitychange");
    fire("document", "DOMContentLoaded");
  };
  return {
    read,
    everything,
    prompt: () => read("state.factoryPromptLibrary.resumoAula"),
    library: () => read("JSON.parse(JSON.stringify(state.factoryPromptLibrary))"),
    saves: () => read("saves")
  };
}

test("V623 com a V327 na página, o RESUMO/AULA para de trocar e os salvamentos param", () => {
  const page = createPage();
  const canonical = page.read("__aldusFactoryResumoAulaCanonicalV327.canonicalPromptFrom(FACTORY_RESUMO_AULA_PROMPT)");
  assert.equal(page.prompt(), canonical, "o texto que vale é o da V327");
  assert.equal(page.saves(), 1, "só a migração do prompt antigo é salva");
  const library = page.library();
  for (let round = 0; round < 3; round += 1) page.everything();
  assert.equal(page.prompt(), canonical, "timers, entrada na Fábrica e cliques não trocam mais o texto");
  assert.deepEqual(page.library(), library, "nenhum outro prompt muda");
  assert.equal(page.read("defaultFactoryPromptLibrary.resumoAula"), canonical, "o padrão também fica estável");
  assert.equal(page.saves(), 1, "nenhum salvamento a mais depois da convergência");
});

test("V623 a V326 cede o RESUMO/AULA à V327 e registra isso", () => {
  const page = createPage();
  assert.equal(page.read("__aldusFactoryResumoAulaVisualV326.delegatedTo"), "factory-resumo-aula-canonical-v327");
  assert.equal(page.read("__aldusFactoryResumoAulaVisualV326.changed"), false);
  assert.equal(page.read("state.migrations.factoryResumoAulaVisualLeiV326"), undefined);
});

test("V623 a V327 não salva quando só instala as proteções", () => {
  const converged = createPage();
  const page = createPage({ library: converged.library(), migrations: converged.read("JSON.parse(JSON.stringify(state.migrations))") });
  assert.equal(page.saves(), 0);
  assert.deepEqual(page.library(), converged.library());
  assert.equal(page.read("factoryPromptBase.name"), "factoryPromptBaseV327", "as proteções continuam instaladas");
  assert.equal(page.read("normalizeFactoryPromptLibrary.name"), "normalizeFactoryPromptLibraryV327");
});

test("V623 sem a V327 na página, a V326 continua aplicando a identidade visual", () => {
  const context = vm.createContext({ console, Date, Object, Boolean, JSON });
  vm.runInContext(`
    const defaultFactoryPromptLibrary = { resumoAula: ${JSON.stringify(BASE_PROMPT)} };
    let state = { migrations: {}, factoryPromptLibrary: { resumoAula: ${JSON.stringify(BASE_PROMPT)} } };
    let saves = 0;
    function saveData() { saves += 1; }
  `, context);
  vm.runInContext(visualSource, context);
  assert.notEqual(vm.runInContext("state.factoryPromptLibrary.resumoAula", context), BASE_PROMPT);
  assert.equal(vm.runInContext("saves", context), 1);
});
