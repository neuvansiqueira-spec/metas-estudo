const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');

test('prompts da Fábrica diferenciam pasta, módulos e entrega obrigatória', () => {
  assert.match(script, /function factoryDestinationFolderLink\(item = \{\}\)/);
  assert.match(script, /PASTA DE DESTINO DOS ARQUIVOS GERADOS NESTA ETAPA/);
  assert.match(script, /Pasta de destino não preenchida\. O arquivo poderá ser gerado/);
  assert.match(script, /Pasta de destino incluída no prompt: \$\{hasDestinationFolder \? "SIM" : "NÃO"\}/);
  assert.match(script, /Abrir pasta de destino/);
  assert.match(script, /Gere somente o arquivo Word correspondente ao MÓDULO RESUMO\/AULA/);
  assert.match(script, /não faça ainda a consolidação final/);
  assert.match(script, /gerar um arquivo Word editável contendo o módulo/);
  assert.match(script, /Não gere resumo, Word, PDF ou módulo final/);
  assert.match(script, /gerar Word consolidado/);
  assert.match(script, /gerar PDF consolidado/);
  assert.doesNotMatch(script, /Não gere lei, jurisprudência, peça ou Word final/);
});

test('materiais automáticos da Fábrica usam chave única e não tratam pasta como arquivo', () => {
  assert.match(script, /function factoryMaterialUniqueKey\(factoryItemId, factoryModuleKey, factoryFormat\)/);
  assert.match(script, /function syncFactoryModuleMaterials\(item\)/);
  assert.match(script, /source: "factory"/);
  assert.match(script, /factoryItemId: normalized\.id/);
  assert.match(script, /factoryModuleKey: moduleKey/);
  assert.match(script, /factoryFormat: format/);
  assert.match(script, /syllabusItemIds/);
  assert.match(script, /available: true/);
  assert.match(script, /function markFactoryMaterialUnavailable/);
  assert.match(script, /markFactoryMaterialUnavailable\(normalized\.id, moduleKey, format\)/);
  assert.doesNotMatch(script, /factoryDestinationFolder[^\n]+factoryFormat/);
});

test('metas, registro de estudo e fábrica reutilizam resolvedor central de materiais', () => {
  assert.match(script, /function resolveAvailableMaterials\(/);
  assert.match(script, /function materialsForDailyGoal\(goal = \{\}\)/);
  assert.match(script, /const materials = materialsForDailyGoal\(goal\)/);
  assert.match(script, /MATERIAIS DISPONÍVEIS/);
  assert.match(script, /Nenhum material pronto para este assunto/);
  assert.match(script, /const mats = resolveAvailableMaterials\(/);
  assert.match(script, /const readyToday = todayGroups\.filter\(\(\{ item \}\) => materialsForFactoryItem\(item\)\.length\)/);
  assert.equal(script, docsScript, 'script.js e docs/script.js devem permanecer sincronizados');
});
