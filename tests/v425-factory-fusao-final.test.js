const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const rootPath = path.join(ROOT, "factory-fusao-final-v425.js");
const docsPath = path.join(ROOT, "docs", "factory-fusao-final-v425.js");
const loaderPath = path.join(ROOT, "security-observability-v318.js");
const docsLoaderPath = path.join(ROOT, "docs", "security-observability-v318.js");

const rootSource = fs.readFileSync(rootPath, "utf8");
const docsSource = fs.readFileSync(docsPath, "utf8");
const loaderSource = fs.readFileSync(loaderPath, "utf8");
const docsLoaderSource = fs.readFileSync(docsLoaderPath, "utf8");
const api = require(rootPath);

test("V425 publica o tipo Fusão Final e o prompt-base correto", () => {
  assert.match(api.version, /^\d{8}-factory-fusao-final-v425/);
  assert.equal(api.typeKey, "fusaoFinal");
  assert.equal(api.label, "Gerar prompt Fusão Final");
  assert.match(api.prompt, /## ESCOPO DO MÓDULO FUSÃO FINAL/);
});

test("V425 proíbe reescrever, resumir e sobrescrever o original", () => {
  assert.match(api.prompt, /reescrever, resumir, encurtar ou "melhorar"/);
  assert.match(api.prompt, /sobrescrever, substituir ou apagar o documento original/);
  assert.match(api.prompt, /O DOCUMENTO ORIGINAL É PRESERVADO/);
});

test("V425 torna a pasta de destino também pasta de origem com regra prevalente", () => {
  assert.match(api.prompt, /OS ARQUIVOS A CONSOLIDAR JÁ ESTÃO NA PASTA DE DESTINO INDICADA ACIMA/);
  assert.match(api.prompt, /ESSA PASTA É TAMBÉM A PASTA DE ORIGEM/);
  assert.match(api.prompt, /"a pasta acima é somente o destino de gravação" NÃO se aplica a esta etapa/);
  assert.match(api.prompt, /Em caso de conflito com qualquer instrução anterior, esta regra prevalece/);
});

test("V425 interrompe se Word editado ou PDF anotado não forem encontrados", () => {
  assert.match(api.prompt, /se não localizar o Word editado OU o PDF anotado, interrompa/);
  assert.match(api.prompt, /informe exatamente o que faltou e o que foi encontrado na pasta/);
  assert.match(api.prompt, /Não produza consolidação parcial silenciosa/);
});

test("V425 exige DOCX e PDF e transparência na falha de leitura das anotações", () => {
  assert.match(api.prompt, /Produza DOIS arquivos, com o mesmo conteúdo/);
  assert.match(api.prompt, /um DOCX editável/);
  assert.match(api.prompt, /um PDF/);
  assert.match(api.prompt, /quando não for possível ler as marcações com segurança, declare isso expressamente no relatório final/);
  assert.match(api.prompt, /oriente o usuário a exportar o resumo de anotações do leitor de PDF/);
});

test("V425 integra cada marcação no ponto correspondente e proíbe bloco final separado", () => {
  assert.match(api.prompt, /CADA MARCAÇÃO DO PDF ENTRA NO MESMO PONTO DO TEXTO A QUE SE REFERE/);
  assert.match(api.prompt, /NÃO agrupe as marcações num bloco separado ao final/);
  assert.match(api.prompt, /NÃO a insira em local aproximado/);
});

test("V425 preserva o rótulo de anotação e o sombreamento bege", () => {
  assert.match(api.prompt, /📝 \*\*ANOTAÇÃO DE ESTUDO:\*\*/);
  assert.match(api.prompt, /texto preto #000000 e sombreamento bege #EEECE1/);
  assert.match(api.prompt, /aplicado apenas ao rótulo, até e incluindo os dois-pontos/);
});

test("V425 install é idempotente, posiciona o tipo após padronização e registra a descrição", () => {
  const previous = {
    FACTORY_PROMPT_TYPES: global.FACTORY_PROMPT_TYPES,
    FACTORY_PROMPT_DESCRIPTIONS: global.FACTORY_PROMPT_DESCRIPTIONS,
    defaultFactoryPromptLibrary: global.defaultFactoryPromptLibrary,
    state: global.state,
    factoryPromptBase: global.factoryPromptBase
  };
  try {
    global.FACTORY_PROMPT_TYPES = [
      { key: "consolidacao", label: "Gerar prompt Consolidação Final" },
      { key: "padronizacaoFinalSumario", label: "Gerar prompt Padronização Final + Sumário" },
      { key: "future", label: "Futuro" }
    ];
    global.FACTORY_PROMPT_DESCRIPTIONS = {};
    global.defaultFactoryPromptLibrary = {};
    global.state = { factoryPromptLibrary: {}, migrations: {} };
    global.factoryPromptBase = (type) => `anterior:${type}`;

    const first = api.install();
    const second = api.install();

    assert.equal(first.installed, true);
    assert.equal(second.installed, true);
    assert.equal(global.FACTORY_PROMPT_TYPES.filter((entry) => entry.key === "fusaoFinal").length, 1);
    assert.equal(global.FACTORY_PROMPT_TYPES[2].key, "fusaoFinal");
    assert.equal(
      global.FACTORY_PROMPT_DESCRIPTIONS.fusaoFinal,
      "Funde o Word editado no estudo com as marcações do PDF num documento novo, sem tocar no original."
    );
    // V431: o roteador devolve o prompt-base acrescido da seção de relocação de
    // jurisprudência, injetada em tempo de execução porque a biblioteca de
    // prompts vive nos dados do usuário e não recebe o texto padrão de novo.
    const servido = global.factoryPromptBase("fusaoFinal");
    assert.ok(servido.startsWith(api.prompt.slice(0, 200)), "o prompt-base continua sendo a origem");
    assert.match(servido, /## RELOCAÇÃO DE JURISPRUDÊNCIA/);
    assert.match(servido, /## RELATÓRIO FINAL OBRIGATÓRIO/);
    assert.equal(global.factoryPromptBase("triagem"), "anterior:triagem");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }
  }
});

test("V425 auto-registra descrição sem alterar script.js nem rotacionar CURRENT_VERSION", () => {
  const script = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.doesNotMatch(script, /fusaoFinal/);
  assert.match(rootSource, /FACTORY_PROMPT_DESCRIPTIONS\[TYPE_KEY\]/);
  assert.equal(pkg.version, "20260901-daily-plan-completed-visible-v424");
  assert.match(
    fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8"),
    /const CURRENT_VERSION = "20260901-daily-plan-completed-visible-v424";/
  );
});

test("V425 mantém paridade raiz/docs e loader publica o módulo com cache-bust", () => {
  assert.equal(rootSource, docsSource);
  assert.equal(loaderSource, docsLoaderSource);
  assert.match(loaderSource, /installFactoryFusaoFinalV425/);
  assert.match(loaderSource, /factory-fusao-final-v425\.js\?v=\d{8}-[a-z0-9-]+/);
});

test("V425 não introduz hot paths nem persistência automática", () => {
  for (const forbidden of [
    "setInterval(",
    "MutationObserver(",
    "requestAnimationFrame(",
    "indexedDB.",
    "localStorage.",
    "autoSyncAfterSave(",
    "saveData("
  ]) {
    assert.equal(rootSource.includes(forbidden), false, `token proibido: ${forbidden}`);
  }
});