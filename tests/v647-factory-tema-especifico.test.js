const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const MODULE = 'factory-tema-especifico-v647.js';

function harness() {
  const ctx = vm.createContext({});
  ctx.globalThis = ctx;
  vm.runInContext(read(MODULE), ctx);
  return { ctx, api: ctx.__ALDUS_FACTORY_TEMA_ESPECIFICO_V647__ };
}

test('V647 monta o tema avulso só em memória, com a pasta escolhida', () => {
  const { api } = harness();
  const item = api.temaAvulso('DIREITO PENAL', 'Busca pessoal', 'https://drive.google.com/drive/folders/abc');
  assert.equal(item.id, api.id);
  assert.equal(item.disciplina, 'DIREITO PENAL');
  assert.equal(item.tema, 'Busca pessoal');
  assert.equal(item.factoryDestinationFolder, 'https://drive.google.com/drive/folders/abc');
});

test('V647 usa a pasta da disciplina do catálogo da Fábrica (V222)', () => {
  const { ctx, api } = harness();
  ctx.__FACTORY_DESTINATION_CATALOG_V222__ = { disciplines: [] };
  ctx.__resolveFactoryDestinationDisciplineV222 = (item) => (item.disciplina === 'DIREITO PENAL' ? { entry: { folder: { url: 'https://drive.google.com/drive/folders/penal' } } } : null);
  assert.equal(api.pastaDaDisciplina('DIREITO PENAL'), 'https://drive.google.com/drive/folders/penal');
  assert.equal(api.pastaDaDisciplina('SEM PASTA'), '');
});

test('V647 oferece os mesmos 7 prompts do antigo bloco 4', () => {
  const { api } = harness();
  assert.deepEqual(Array.from(api.tipos, ([tipo]) => tipo), ['resumoAulaJurisprudencia', 'leiJurisprudencia', 'jurisprudencia', 'triagem', 'resumoAula', 'lei', 'peca']);
});

test('V647 não grava nada: nem meta, nem item da Fábrica, nem dados do estudo', () => {
  const source = read(MODULE);
  assert.doesNotMatch(source, /saveData|indexedDB|localStorage|state\.|factoryAgenda\.push|\.push\(\s*item/);
  assert.match(source, /factoryPromptText\(tipo, item, "full"\)/, 'o prompt vem do mesmo gerador do site');
  assert.match(source, /data-factory-prompt-text="\$\{ID\}"/, 'o bridge acha o texto pelo mesmo atributo');
});

test('V647 é carregada pela cadeia ativa e publicada igual na raiz e em docs', () => {
  const loader = read('security-observability-v318.js');
  assert.ok(loader.includes(`${MODULE}?v=20260928-tema-especifico-fontes-v647-2`));
  assert.match(loader, /\n  installFactoryTemaEspecificoV647\(\);/);
  for (const file of [MODULE, 'security-observability-v318.js', 'factory-prompt-organizacao-v639.js']) assert.equal(read(file), read('docs/' + file), file);
});

test('V647.2 pasta das fontes escolhida substitui a de sempre em todas as ocorrências (inclusive JURISPRUDÊNCIA)', () => {
  const { api } = harness();
  const prompt = 'Tema: X\nPASTA DAS FONTES NO GOOGLE DRIVE:\nhttps://drive.google.com/drive/folders/1ECc_juris\n\nPASTA DE DESTINO DOS ARQUIVOS GERADOS NESTA ETAPA:\nhttps://drive.google.com/drive/folders/destino\n...\nPASTA DAS FONTES NO GOOGLE DRIVE:\r\nhttps://drive.google.com/drive/folders/outra';
  const novo = api.trocarFontes(prompt, 'https://drive.google.com/drive/folders/MINHA_FONTE');
  assert.equal((novo.match(/MINHA_FONTE/g) || []).length, 2);
  assert.doesNotMatch(novo, /1ECc_juris|folders\/outra/);
  assert.match(novo, /PASTA DE DESTINO DOS ARQUIVOS GERADOS NESTA ETAPA:\nhttps:\/\/drive\.google\.com\/drive\/folders\/destino/, 'a pasta de destino não é tocada');
});
