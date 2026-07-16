const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('prompts da Fábrica diferenciam pasta, módulos e entrega obrigatória', () => {
  assert.match(script, /function factoryDestinationFolderLink\(item = \{\}\)/);
  assert.match(script, /PASTA DE DESTINO DOS ARQUIVOS GERADOS NESTA ETAPA/);
  assert.match(script, /Pasta de destino não preenchida\. O arquivo poderá ser gerado/);
  assert.match(script, /Pasta de destino incluída no prompt: \$\{hasDestinationFolder \? "SIM" : "NÃO"\}/);
  assert.match(script, /Abrir pasta de destino/);
  assert.match(script, /Gere somente o arquivo Word correspondente ao MÓDULO RESUMO\/AULA/);
  assert.match(script, /não faça ainda a consolidação final/);
  assert.match(script, /gerar um arquivo Word editável contendo o módulo/);
  assert.match(script, /Não gere resumo, lei topificada, jurisprudência, peça, Word, PDF ou módulo final/);
  assert.match(script, /gerar Word consolidado/);
  assert.match(script, /gerar PDF consolidado/);
  assert.doesNotMatch(script, /Não gere lei, jurisprudência, peça ou Word final/);
});


test('prompt do módulo PEÇA exige varredura de especificidades temáticas e fontes complementares vinculadas', () => {
  assert.match(script, /const FACTORY_PECA_PROMPT = `/);
  assert.match(script, /peca: FACTORY_PECA_PROMPT/);
  assert.match(script, /USE COMO FONTE PRINCIPAL AS FONTES CLASSIFICADAS COMO PEÇA NA TRIAGEM/);
  assert.match(script, /LEI, JURISPRUDÊNCIA, RESUMO\/AULA OU ATUALIZAÇÃO\/COMPLEMENTO/);
  assert.match(script, /VÍNCULO DIRETO E IDENTIFICÁVEL COM A PEÇA ATUAL/);
  assert.match(script, /## INVENTÁRIO INTERNO OBRIGATÓRIO DE ESPECIFICIDADES TEMÁTICAS/);
  assert.match(script, /ESPECIFICIDADES TEMÁTICAS DA PEÇA/);
  assert.match(script, /crimes hediondos ou equiparados/);
  assert.match(script, /✳️ LACUNA TEMÁTICA DETECTADA/);
  assert.match(script, /NÃO CRIE NOVA AULA, NOVA META OU NOVO MÓDULO/);
  assert.match(script, /Não invente especificidades/);
  assert.match(script, /MÓDULO: PEÇA\. Use fontes classificadas como PEÇA como base principal/);
  assert.equal(script, docsScript, 'script.js e docs/script.js devem permanecer sincronizados');
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
  assert.match(script, /function materialsForDailyGoal\(goal = \{\}, projectionEntry = null\)/);
  assert.match(script, /const materials = materialsForDailyGoal\(goal, projectionEntry\)/);
  assert.match(script, /MATERIAIS DISPONÍVEIS/);
  assert.match(script, /Nenhum material vinculado a esta meta/);
  assert.match(script, /const mats = resolveAvailableMaterials\(/);
  assert.match(script, /function factoryTodayQueue\(agenda = ensureFactoryAgenda\(\)\)/);
  assert.equal(script, docsScript, 'script.js e docs/script.js devem permanecer sincronizados');
});

test('prompts da Fábrica orientam upload DOCX/PDF no Drive sem caminho local bruto', () => {
  assert.match(script, /const FACTORY_DRIVE_UPLOAD_INSTRUCTIONS = `/);
  assert.match(script, /Não envie caminho local bruto para uma ação que exija \\`file_uri\\`/);
  assert.match(script, /ação apropriada de importação de documento/);
  assert.match(script, /source_file = arquivo local gerado e reconhecido pelo runtime/);
  assert.match(script, /upload_mode = keep_source_file_type/);
  assert.match(script, /preservar como DOCX, sem converter automaticamente em Google Docs/);
  assert.match(script, /extrair o ID da pasta a partir do link salvo em factoryDestinationFolder/);
  assert.match(script, /mover o arquivo criado para o ID da pasta de destino/);
  assert.match(script, /obter e devolver o link final exato do arquivo no Google Drive/);
  assert.match(script, /Nunca passe diretamente uma string como \/mnt\/data\/nome-do-arquivo\.pdf/);
  assert.match(script, /não afirme que houve salvamento/);
  assert.match(script, /ARQUIVO GERADO E SALVO/);
  assert.match(script, /ARQUIVO GERADO, MAS NÃO SALVO NO DRIVE/);
  assert.match(script, /triagem: `\$\{common\}\n\nMÓDULO: TRIAGEM[\s\S]*Não gere resumo, lei topificada, jurisprudência, peça, Word, PDF ou módulo final/);
  assert.equal(script, docsScript, 'script.js e docs/script.js devem permanecer sincronizados');
});


test('Fábrica operacional organiza faça agora, fila, triagem e resumo pronto corretamente', () => {
  assert.match(script, /let factoryCurrentFilter = "faca-agora"/);
  assert.match(script, /FACTORY_TRIAGEM_STATUSES = \["Não iniciada", "Em andamento", "Concluída", "Precisa refazer"\]/);
  assert.match(script, /function factoryResumoAulaReady\(item = \{\}\)/);
  assert.match(script, /material\.factoryModuleKey === "resumoAula"/);
  assert.match(script, /function factoryCurrentStage\(item = \{\}\)/);
  assert.match(script, /function factoryNextAction\(item = \{\}\)/);
  assert.match(script, /function factoryTodayQueue\(agenda = ensureFactoryAgenda\(\)\)/);
  assert.match(script, /ASSUNTO EM PRODUÇÃO/);
  assert.match(script, /Recorte programado hoje/);
  assert.match(script, /SUBTEMAS ABRANGIDOS|Subtemas abrangidos/);
  assert.match(script, /DETALHES DO TEMA/);
  assert.match(script, /factoryOpenDetailId/);
  assert.match(script, /Concluir etapa e ir para o próximo/i);
  assert.match(html, /data-factory-filter="faca-agora"/);
  assert.match(html, /data-factory-filter="prontos"/);
});

test('Plano do Dia e Materiais separam estudo, produção e cards de materiais', () => {
  assert.match(script, /📚 ESTUDAR HOJE/);
  assert.match(script, /🏭 PRODUZIR MATERIAL HOJE/);
  assert.match(script, /🔄 REVISAR HOJE/);
  assert.match(script, /function dailyGoalResumoReady/);
  assert.match(script, /function dailyGoalProductionCard/);
  assert.match(script, /MATERIAIS PARA O PLANO DE HOJE/);
  assert.match(script, /MATERIAIS RECENTES/);
  assert.match(script, /OUTROS MATERIAIS/);
  assert.match(script, /data-use-material-study/);
  assert.match(script, /markFactoryMaterialUnavailable\(normalized\.id, moduleKey, format\)/);
  assert.equal(script, docsScript, 'script.js e docs/script.js devem permanecer sincronizados');
});
