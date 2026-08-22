const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sourceV231 = fs.readFileSync("factory-jurisprudencia-prompt-v231.js", "utf8");
const sourceV332 = fs.readFileSync("factory-jurisprudencia-prompt-v332.js", "utf8");

function createDeferredBootstrapContext() {
  const listeners = [];
  const errors = [];
  let saved = 0;

  const context = {
    console: {
      ...console,
      error(...args) {
        errors.push(args.map(String).join(" "));
      }
    },
    window: {
      __aldusBootstrapReady: false,
      addEventListener(type, handler) {
        if (type === "aldus:bootstrap-ready") listeners.push(handler);
      }
    },
    defaultFactoryPromptLibrary: { jurisprudencia: "" },
    state: {
      migrations: {},
      factoryPromptLibrary: { jurisprudencia: "" }
    },
    FACTORY_LIBRARY_FALLBACK: "Cole aqui o prompt completo.",
    saveData() {
      saved += 1;
    },
    factoryPromptBase(type) {
      return type === "jurisprudencia" ? "" : "outro";
    },
    normalizeFactoryPromptLibrary(library) {
      return { ...library };
    }
  };

  vm.createContext(context);

  return {
    context,
    errors,
    saved: () => saved,
    dispatchBootstrap() {
      context.window.__aldusBootstrapReady = true;
      for (const listener of listeners.splice(0)) listener();
    }
  };
}

test("V373 monta a V332 somente após a V231 instalar no bootstrap real", () => {
  const runtime = createDeferredBootstrapContext();

  new vm.Script(sourceV231).runInContext(runtime.context);
  new vm.Script(sourceV332).runInContext(runtime.context);

  assert.equal(runtime.errors.length, 0, "a V332 não deve falhar durante a avaliação pré-bootstrap");
  assert.equal(runtime.context.state.factoryPromptLibrary.jurisprudencia, "");

  runtime.dispatchBootstrap();

  const prompt = runtime.context.state.factoryPromptLibrary.jurisprudencia;
  assert.match(prompt, /## FORMATO OBRIGATÓRIO/);
  assert.match(prompt, /USE EXCLUSIVAMENTE A PASTA JURISPRUDENCIAL https:\/\/drive\.google\.com\/drive\/folders\/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe/);
  assert.match(prompt, /“JULGADOS STF RESUMIDOS” E “JULGADOS STJ RESUMIDOS”/);
  assert.equal(runtime.context.state.migrations.factoryJurisprudenciaFonteCoberturaV332, true);
  assert.equal(runtime.errors.some((line) => line.includes("V332 não localizou")), false);
  assert.ok(runtime.saved() >= 2, "V231 e V332 devem salvar suas migrações após o bootstrap");
});
