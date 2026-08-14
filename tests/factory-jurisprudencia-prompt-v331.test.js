const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-jurisprudencia-prompt-v331.js", "utf8");

function execute(currentPrompt) {
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
  new vm.Script(source).runInContext(context);
  return { context, saved };
}

test("V331 instala busca semântica abrangente sem abandonar a fonte exclusiva", () => {
  const { context, saved } = execute("");
  const prompt = context.state.factoryPromptLibrary.jurisprudencia;

  assert.ok(saved > 0);
  assert.match(prompt, /USE EXCLUSIVAMENTE a pasta jurisprudencial indicada pelo roteador/);
  assert.match(prompt, /BUSCA SEMÂNTICA OBRIGATÓRIA EM TRÊS PASSAGENS/);
  assert.match(prompt, /NÃO imponha limite máximo ou mínimo de julgados/);
  assert.match(prompt, /Elimine duplicidades usando como chave o processo, o número do tema ou o número da súmula/);
  assert.doesNotMatch(prompt, /USE APENAS AS FONTES CLASSIFICADAS COMO JURISPRUDÊNCIA NA TRIAGEM/);
});

test("V331 usa metadados próprios para julgado, tema e súmula", () => {
  const prompt = execute("").context.state.factoryPromptLibrary.jurisprudencia;

  assert.match(prompt, /### JULGADO/);
  assert.match(prompt, /### TEMA, REPERCUSSÃO GERAL OU RECURSO REPETITIVO/);
  assert.match(prompt, /### SÚMULA/);
  assert.match(prompt, /Para súmula, NÃO crie campo PROCESSO/);
  assert.match(prompt, /Quando o campo não se aplicar ao tipo do item, simplesmente não o exiba/);
});

test("V331 impede os padrões de paginação que cortaram o documento anterior", () => {
  const prompt = execute("").context.state.factoryPromptLibrary.jurisprudencia;

  assert.match(prompt, /não use recuo esquerdo negativo/);
  assert.match(prompt, /permita que o corpo de um item se divida naturalmente entre páginas/);
  assert.match(prompt, /não marque todos os parágrafos como manter com o próximo ou manter linhas juntas/);
  assert.match(prompt, /espaços em branco superiores a meia página causados por paginação/);
  assert.match(prompt, /renderize e inspecione todas as páginas/);
});

test("V331 migra o prompt oficial V231 com cópia de segurança", () => {
  const officialV231 = [
    "TRANSFORME JURISPRUDÊNCIAS EM MAPA MENTAL HIERÁRQUICO DE PALAVRAS-CHAVE PARA CÓPIA MANUSCRITA.",
    "USE APENAS AS FONTES CLASSIFICADAS COMO JURISPRUDÊNCIA NA TRIAGEM.",
    "NÃO OMITA TRIBUNAL, PROCESSO OU ANO.",
    "## DIVERGÊNCIA JURISPRUDENCIAL",
    "MAPA_MENTAL_JURISPRUDENCIAS_[FILTRO].docx"
  ].join("\n");
  const { context } = execute(officialV231);

  assert.equal(context.state.factoryPromptLibraryBackups.jurisprudenciaBeforeV331, officialV231);
  assert.match(context.state.factoryPromptLibrary.jurisprudencia, /BUSCA SEMÂNTICA OBRIGATÓRIA EM TRÊS PASSAGENS/);
  assert.equal(context.state.migrations.factoryJurisprudenciaBuscaSemanticaVisualV331, true);
});

test("V331 preserva prompt personalizado", () => {
  const custom = "PROMPT PERSONALIZADO DO USUÁRIO";
  const { context } = execute(custom);

  assert.equal(context.state.factoryPromptLibrary.jurisprudencia, custom);
  assert.match(context.defaultFactoryPromptLibrary.jurisprudencia, /BUSCA SEMÂNTICA OBRIGATÓRIA EM TRÊS PASSAGENS/);
});

test("V331 é publicado no bundle e sincronizado entre raiz e docs", () => {
  const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
  const suffix = version.match(/v\d+$/)?.[0];
  const bundle = fs.readFileSync(`app-${suffix}.js`, "utf8");

  assert.match(bundle, /Aldus source: factory-jurisprudencia-prompt-v331\.js/);
  assert.match(bundle, /BUSCA SEMÂNTICA OBRIGATÓRIA EM TRÊS PASSAGENS/);
  assert.match(bundle, /Para súmula, NÃO crie campo PROCESSO/);
  assert.equal(bundle, fs.readFileSync(`docs/app-${suffix}.js`, "utf8"));
  assert.equal(
    fs.readFileSync("factory-jurisprudencia-prompt-v331.js", "utf8"),
    fs.readFileSync("docs/factory-jurisprudencia-prompt-v331.js", "utf8")
  );
});
