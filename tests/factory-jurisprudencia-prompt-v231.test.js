const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-jurisprudencia-prompt-v231.js", "utf8");

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

test("V231 instala o prompt oficial quando a jurisprudência está vazia", () => {
  const { context, saved } = execute("");
  const prompt = context.state.factoryPromptLibrary.jurisprudencia;
  assert.ok(saved > 0);
  assert.match(prompt, /## VALIDAÇÃO OBRIGATÓRIA DAS FONTES/);
  assert.match(prompt, /📍 \*\*PROCESSO: \[CLASSE E NÚMERO\]\*\*/);
  assert.match(prompt, /📍 \*\*ANO DA DECISÃO: \[AAAA\]\*\*/);
  assert.match(prompt, /## DIVERGÊNCIA JURISPRUDENCIAL/);
  assert.match(prompt, /DECISÃO DIVERGENTE/);
});

test("V231 substitui o modelo oficial antigo e mantém uma cópia de segurança", () => {
  const antigo = [
    "TRANSFORME JURISPRUDÊNCIAS EM MAPA MENTAL",
    "* ANO, SE DISPONÍVEL;",
    "SE TRIBUNAL, INFORMATIVO, NÚMERO OU ANO NÃO ESTIVEREM DISPONÍVEIS, OMITA A LINHA CORRESPONDENTE.",
    "NÃO INFORME:",
    "",
    "* NÚMERO DO PROCESSO;"
  ].join("\n");
  const { context } = execute(antigo);
  assert.equal(context.state.factoryPromptLibraryBackups.jurisprudenciaBeforeV231, antigo);
  assert.doesNotMatch(context.state.factoryPromptLibrary.jurisprudencia, /\* ANO, SE DISPONÍVEL;/);
  assert.match(context.state.factoryPromptLibrary.jurisprudencia, /NÃO OMITA TRIBUNAL, PROCESSO OU ANO/);
});

test("V231 preserva um prompt personalizado que não corresponde ao modelo oficial antigo", () => {
  const personalizado = "PROMPT PERSONALIZADO DO USUÁRIO";
  const { context } = execute(personalizado);
  assert.equal(context.state.factoryPromptLibrary.jurisprudencia, personalizado);
  assert.match(context.defaultFactoryPromptLibrary.jurisprudencia, /## DIVERGÊNCIA JURISPRUDENCIAL/);
});

test("V231 publica o módulo no bundle e mantém raiz e docs sincronizados", () => {
  const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
  const suffix = version.match(/v\d+$/)?.[0];
  const bundle = fs.readFileSync(`app-${suffix}.js`, "utf8");
  assert.match(bundle, /Aldus source: factory-jurisprudencia-prompt-v231\.js/);
  assert.match(bundle, /## VALIDAÇÃO OBRIGATÓRIA DAS FONTES/);
  assert.match(bundle, /## DIVERGÊNCIA JURISPRUDENCIAL/);
  assert.equal(bundle, fs.readFileSync(`docs/app-${suffix}.js`, "utf8"));
  assert.equal(fs.readFileSync("index.html", "utf8"), fs.readFileSync("docs/index.html", "utf8"));
});

