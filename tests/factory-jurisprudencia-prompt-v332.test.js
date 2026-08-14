const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sourceV231 = fs.readFileSync("factory-jurisprudencia-prompt-v231.js", "utf8");
const sourceV331 = fs.readFileSync("factory-jurisprudencia-prompt-v331.js", "utf8");
const sourceV332 = fs.readFileSync("factory-jurisprudencia-prompt-v332.js", "utf8");
const SOURCE_FOLDER = "https://drive.google.com/drive/folders/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe";

function createContext(currentPrompt = "") {
  let saved = 0;
  const context = {
    console,
    window: { __aldusBootstrapReady: true, addEventListener() {} },
    defaultFactoryPromptLibrary: { jurisprudencia: "" },
    state: {
      migrations: {},
      factoryPromptLibrary: { jurisprudencia: currentPrompt }
    },
    FACTORY_LIBRARY_FALLBACK: "Cole aqui o prompt completo.",
    saveData() { saved += 1; },
    factoryPromptBase(type) { return type === "jurisprudencia" ? currentPrompt : "outro"; },
    normalizeFactoryPromptLibrary(library) { return { ...library }; }
  };
  vm.createContext(context);
  return { context, saved: () => saved };
}

function officialV231Prompt() {
  const { context } = createContext("");
  new vm.Script(sourceV231).runInContext(context);
  return context.state.factoryPromptLibrary.jurisprudencia;
}

function officialV331Prompt() {
  const { context } = createContext("");
  new vm.Script(sourceV331).runInContext(context);
  return context.state.factoryPromptLibrary.jurisprudencia;
}

function executeV332(currentPrompt = "") {
  const runtime = createContext(currentPrompt);
  new vm.Script(sourceV231).runInContext(runtime.context);
  new vm.Script(sourceV332).runInContext(runtime.context);
  return runtime;
}

function section(text, start, end) {
  const from = text.indexOf(start);
  const to = end ? text.indexOf(end, from) : text.length;
  assert.ok(from >= 0 && to > from, `seção não localizada: ${start}`);
  return text.slice(from, to);
}

test("V332 restaura exatamente o formato e a entrega Word topificados da V231", () => {
  const base = officialV231Prompt();
  const restored = executeV332("").context.state.factoryPromptLibrary.jurisprudencia;

  assert.equal(
    section(restored, "## FORMATO OBRIGATÓRIO", "## HIERARQUIA"),
    section(base, "## FORMATO OBRIGATÓRIO", "## HIERARQUIA")
  );
  assert.equal(
    section(restored, "## ENTREGA EM WORD"),
    section(base, "## ENTREGA EM WORD")
  );
  assert.match(restored, /1️⃣ \[INSTITUTO PRINCIPAL\]/);
  assert.match(restored, /✅ \[CONCLUSÃO CENTRAL AUTOSSUFICIENTE\]/);
  assert.match(restored, /✳️ \[EXCEÇÃO \/ DISTINÇÃO \/ PEGADINHA \/ ORDEM\]/);
  assert.doesNotMatch(restored, /MAPA MENTAL DE JURISPRUDÊNCIA/);
  assert.doesNotMatch(restored, /Agrupe os itens por tribunal/);
  assert.doesNotMatch(restored, /títulos e nomes de tribunais em azul sóbrio/);
});

test("V332 altera somente as instruções relacionadas à recuperação das fontes", () => {
  const base = officialV231Prompt();
  const restored = executeV332("").context.state.factoryPromptLibrary.jurisprudencia;

  assert.equal(
    section(restored, "TRANSFORME JURISPRUDÊNCIAS", "## ESCOPO DO MÓDULO"),
    section(base, "TRANSFORME JURISPRUDÊNCIAS", "## ESCOPO DO MÓDULO")
  );
  assert.equal(
    section(restored, "## OBJETIVO", "## FIDELIDADE"),
    section(base, "## OBJETIVO", "## FIDELIDADE")
  );
  assert.equal(
    section(restored, "## PROFUNDIDADE", "## REVISÃO FINAL"),
    section(base, "## PROFUNDIDADE", "## REVISÃO FINAL")
  );
  assert.equal(
    section(restored, "## PROIBIÇÕES", "## ORGANIZAÇÃO"),
    section(base, "## PROIBIÇÕES", "## ORGANIZAÇÃO")
  );
});

test("V332 fixa a pasta exclusiva e prioriza os acervos resumidos do STF e do STJ", () => {
  const prompt = executeV332("").context.state.factoryPromptLibrary.jurisprudencia;

  assert.match(prompt, new RegExp(SOURCE_FOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /“JULGADOS STF RESUMIDOS” E “JULGADOS STJ RESUMIDOS”/);
  assert.match(prompt, /SEM LIMITE MÁXIMO ARBITRÁRIO E SEM REDUZIR A QUANTIDADE POR AMOSTRAGEM/);
  assert.match(prompt, /REPITA A BUSCA COM AS VARIAÇÕES TERMINOLÓGICAS ANTES DE FINALIZAR/);
  assert.match(prompt, /NÃO CONDICIONE ESTA BUSCA À TRIAGEM DA PASTA GERAL/);
});

test("V332 substitui a V331 oficial e guarda cópia de segurança", () => {
  const previous = officialV331Prompt();
  const { context } = executeV332(previous);
  const prompt = context.state.factoryPromptLibrary.jurisprudencia;

  assert.equal(context.state.factoryPromptLibraryBackups.jurisprudenciaBeforeV332, previous);
  assert.match(prompt, /## FORMATO OBRIGATÓRIO/);
  assert.doesNotMatch(prompt, /## 9\. FORMATAÇÃO WORD E PAGINAÇÃO/);
  assert.equal(context.state.migrations.factoryJurisprudenciaFonteCoberturaV332, true);
});

test("V332 preserva prompt realmente personalizado", () => {
  const custom = "PROMPT PERSONALIZADO DO USUÁRIO";
  const { context } = executeV332(custom);

  assert.equal(context.state.factoryPromptLibrary.jurisprudencia, custom);
  assert.match(context.defaultFactoryPromptLibrary.jurisprudencia, /## FORMATO OBRIGATÓRIO/);
});

test("V332 é publicada no bundle e sincronizada entre raiz e docs", () => {
  const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
  const suffix = version.match(/v\d+$/)?.[0];
  const bundle = fs.readFileSync(`app-${suffix}.js`, "utf8");

  assert.match(bundle, /Aldus source: factory-jurisprudencia-prompt-v231\.js/);
  assert.match(bundle, /Aldus source: factory-jurisprudencia-prompt-v332\.js/);
  assert.doesNotMatch(bundle, /Aldus source: factory-jurisprudencia-prompt-v331\.js/);
  assert.equal(bundle, fs.readFileSync(`docs/app-${suffix}.js`, "utf8"));
  assert.equal(
    fs.readFileSync("factory-jurisprudencia-prompt-v332.js", "utf8"),
    fs.readFileSync("docs/factory-jurisprudencia-prompt-v332.js", "utf8")
  );
});
