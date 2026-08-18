const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");

const SOURCE = "simulado-recovery-v319.js";
const VERSION = "20260818-simulado-recovery-hot-path-v356";

function loadBrowserRuntime({ hash = "#central-metas", storage = new Map(), state } = {}) {
  const timers = [];
  const listeners = new Map();
  let reads = 0;
  const runtimeState = state || { questionBank: [], questionBankSessions: [], simulados: [] };

  const context = {
    console,
    state: runtimeState,
    location: { hash },
    saveData() { return true; },
    renderQuestionBank() {},
    renderQuestionHistory() {},
    localStorage: {
      getItem(key) {
        reads += 1;
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, value);
      }
    },
    setTimeout(fn, delay) {
      timers.push({ fn, delay });
      return timers.length;
    },
    clearTimeout() {},
    document: {
      visibilityState: "visible",
      addEventListener(type, listener) {
        const bucket = listeners.get(type) || [];
        bucket.push(listener);
        listeners.set(type, bucket);
      },
      getElementById() { return null; },
      querySelector() { return null; }
    },
    addEventListener(type, listener) {
      const bucket = listeners.get(type) || [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    dispatchEvent() {}
  };
  context.window = context;

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(SOURCE, "utf8"), context);

  return {
    context,
    timers,
    api: context.__ALDUS_SIMULADO_RECOVERY_V319__,
    reads: () => reads
  };
}

test("V356 mantém recuperação automática inerte fora das telas relacionadas", async () => {
  const runtime = loadBrowserRuntime({ hash: "#central-metas" });
  assert.equal(runtime.timers.length, 12, "os retries conservadores continuam disponíveis");

  await runtime.timers[0].fn();
  assert.equal(runtime.reads(), 0, "Central de Metas não deve varrer localStorage de recuperação");
  assert.equal(runtime.api.getLastReport(), null);

  runtime.context.location.hash = "#simulados";
  await runtime.timers[1].fn();
  const readsAfterRelevantRun = runtime.reads();
  assert.ok(readsAfterRelevantRun > 0, "Simulados deve continuar executando a verificação de integridade");
  assert.equal(runtime.api.getLastReport()?.stateAvailable, true);

  await runtime.timers[2].fn();
  assert.equal(runtime.reads(), readsAfterRelevantRun,
    "retries posteriores na mesma tela não devem repetir a varredura após sucesso");
});

test("V356 descobre backups sem tentar JSON.parse em cada texto de questão", () => {
  const questions = Array.from({ length: 150 }, (_, index) => ({
    id: `q-${index}`,
    enunciado: `Texto comum da questão ${index}`,
    comentario: `Comentário sem JSON ${index}`,
    alternativas: { A: "Texto A", B: "Texto B" }
  }));
  const storage = new Map([
    ["metasConcursoData", JSON.stringify({
      questionBank: questions,
      questionBankSessions: [],
      metadata: { note: "texto comum", label: "outro texto" }
    })]
  ]);

  let parseCount = 0;
  const nativeJSON = JSON;
  const context = {
    console,
    JSON: {
      parse(value) {
        parseCount += 1;
        return nativeJSON.parse(value);
      },
      stringify: nativeJSON.stringify
    },
    localStorage: { getItem: (key) => storage.get(key) ?? null },
    setTimeout: () => 0,
    clearTimeout: () => {}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(SOURCE, "utf8"), context);

  const backups = context.__ALDUS_SIMULADO_RECOVERY_V319__.readBackupStates();
  assert.equal(backups.length, 1);
  assert.equal(parseCount, 1,
    "somente o contêiner JSON do backup deve ser parseado; textos internos não podem gerar exceções em massa");
});

test("V356 preserva contrato manual de recuperação e paridade de publicação", () => {
  const source = fs.readFileSync(SOURCE, "utf8");
  const docs = fs.readFileSync(`docs/${SOURCE}`, "utf8");

  assert.equal(source, docs, "runtime V356 deve ser idêntico em docs");
  assert.match(source, new RegExp(VERSION));
  assert.match(source, /const RECOVERY_VIEWS = new Set\(\["simulados", "banco-questoes", "fabrica-resumos"\]\)/);
  assert.match(source, /async function runAutomatic\(origin\)/);
  assert.match(source, /if \(!RECOVERY_VIEWS\.has\(route\)\)/);
  assert.match(source, /if \(key === "questionBank" \|\| key === "questionBankSessions"\) continue/);
  assert.match(source, /run,\n\s+getLastReport:/, "API manual run deve permanecer disponível");
  assert.doesNotMatch(source, /removeItem\(|clear\(\)|indexedDB\.deleteDatabase/,
    "V356 não pode apagar dados do usuário");
});
