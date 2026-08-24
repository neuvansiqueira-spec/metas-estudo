const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootPath = path.join(__dirname, "..", "factory-padronizacao-final-sumario-v385.js");
const docsPath = path.join(__dirname, "..", "docs", "factory-padronizacao-final-sumario-v385.js");
const loaderPath = path.join(__dirname, "..", "security-observability-v318.js");
const docsLoaderPath = path.join(__dirname, "..", "docs", "security-observability-v318.js");

const rootSource = fs.readFileSync(rootPath, "utf8");
const docsSource = fs.readFileSync(docsPath, "utf8");
const loaderSource = fs.readFileSync(loaderPath, "utf8");
const docsLoaderSource = fs.readFileSync(docsLoaderPath, "utf8");

const api = require(rootPath);

test("V385 publica o novo tipo e o rótulo correto", () => {
  assert.equal(api.version, "20260824-factory-padronizacao-final-sumario-v385");
  assert.equal(api.typeKey, "padronizacaoFinalSumario");
  assert.match(rootSource, /Gerar prompt Padronização Final \+ Sumário/);
});

test("V385 bloqueia alteração material e restringe a fonte ao DOCX alterado", () => {
  assert.match(api.prompt, /O CONTEÚDO MATERIAL DO DOCUMENTO ESTÁ BLOQUEADO/);
  assert.match(api.prompt, /A fonte deste modo é SOMENTE o DOCX alterado pelo usuário/);
  assert.match(api.prompt, /pasta geral de PDFs, aulas, livros, legislação, jurisprudência ou materiais brutos do tema NÃO é fonte/);
  assert.match(api.prompt, /se houver dois ou mais candidatos plausíveis, NÃO escolha/);
  assert.match(api.prompt, /NÃO use internet nem outras fontes para ampliar o documento/);
});

test("V385 preserva justificação, espaçamento 1,5 e tamanho 14 do usuário", () => {
  assert.match(api.prompt, /parágrafos JUSTIFICADOS/);
  assert.match(api.prompt, /espaçamento entre linhas de 1,5/);
  assert.match(api.prompt, /tamanho de fonte 14/);
  assert.match(api.prompt, /NÃO remova o alinhamento JUSTIFICADO do corpo/);
  assert.match(api.prompt, /NÃO substitua espaçamento 1,5 por 1,0 ou 1,15/);
  assert.match(api.prompt, /NÃO reduza tamanho 14 para tamanho 11/);
  assert.match(api.prompt, /NÃO normalize o documento para Arial 11/);
});

test("V385 separa a regra do sumário da formatação do corpo", () => {
  assert.match(api.prompt, /OS PARÁGRAFOS DO SUMÁRIO DEVEM FICAR ALINHADOS À ESQUERDA, NUNCA JUSTIFICADOS/);
  assert.match(api.prompt, /ESSA REGRA VALE SOMENTE PARA O SUMÁRIO/);
  assert.match(api.prompt, /Ela NÃO autoriza retirar o alinhamento JUSTIFICADO do corpo/);
  assert.match(api.prompt, /Painel de Navegação do Word/);
  assert.match(api.prompt, /NÃO invente, estime nem suponha números de página/);
});

test("V385 preserva o original e gera apenas novo DOCX por padrão", () => {
  assert.match(api.prompt, /NUNCA sobrescreva, exclua ou substitua o DOCX fonte/);
  assert.match(api.prompt, /\[NOME_ORIGINAL\]_PADRONIZADO_COM_SUMARIO\.docx/);
  assert.match(api.prompt, /NÃO gere PDF nesta etapa, salvo solicitação expressa do usuário/);
});

test("V385 renomeia a pasta geral para evitar uso indevido", () => {
  const relabeled = api.relabelGeneralSource("PASTA DAS FONTES NO GOOGLE DRIVE:\nhttps://example.test");
  assert.match(relabeled, /PASTA GERAL DE FONTES DO TEMA \(NÃO USAR COMO FONTE DE CONTEÚDO NESTA ETAPA\):/);
  assert.doesNotMatch(relabeled, /^PASTA DAS FONTES NO GOOGLE DRIVE:/m);
});

test("V385 mantém paridade raiz/docs e loader publica o módulo", () => {
  assert.equal(rootSource, docsSource);
  assert.equal(loaderSource, docsLoaderSource);
  assert.match(loaderSource, /installFactoryPadronizacaoFinalSumarioV385/);
  assert.match(loaderSource, /factory-padronizacao-final-sumario-v385\.js\?v=20260824-factory-padronizacao-final-sumario-v385/);
});

test("V385 não adiciona hot paths ou persistência automática", () => {
  for (const forbidden of [
    "MutationObserver(",
    "setInterval(",
    "getComputedStyle(",
    "requestAnimationFrame(",
    "indexedDB.",
    "localStorage.",
    "saveData(",
    "autoSyncAfterSave("
  ]) {
    assert.equal(rootSource.includes(forbidden), false, `token proibido: ${forbidden}`);
  }
});
