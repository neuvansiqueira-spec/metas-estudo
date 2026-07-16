const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const script = fs.readFileSync('script.js', 'utf8');
function logic() {
  const start = script.indexOf('function normalizeMaterialFormat(material = {})');
  const end = script.indexOf('const materialSectionOpenState', start);
  assert.ok(start >= 0 && end > start);
  return new Function(`const FACTORY_MODULES=[{key:'resumoAula',label:'RESUMO/AULA'},{key:'lei',label:'LEI'}]; const canonical=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); const materialTagsArray=(value)=>Array.isArray(value)?value:String(value||'').split(',').map((tag)=>tag.trim()).filter(Boolean); ${script.slice(start, end)}; return { buildMaterialLibraryViewModel, materialPhysicalFileIdentity, materialGroupMatchesFilters };`)();
}
const api = logic();
const base = { discipline: 'Direito Processual Penal', subject: 'Conceito', factoryModuleKey: 'resumoAula', date: '2026-07-16' };
const factoryPdf = { ...base, id: 'factory-pdf', source: 'factory', factoryItemId: 'f1', syllabusItemId: 's1', type: 'PDF', link: 'https://drive.google.com/file/d/FILE123/view', title: 'PDF Fábrica' };
const manualPdf = { ...base, id: 'manual-pdf', source: 'manual', origin: 'Google Drive', syllabusItemId: 's1', type: 'PDF', link: 'https://drive.google.com/open?id=FILE123', title: 'PDF Manual', notes: 'alternativo' };
const word = { ...base, id: 'word', source: 'factory', factoryItemId: 'f1', syllabusItemId: 's1', type: 'Word', link: 'https://example.test/a.docx', title: 'Word Fábrica' };

test('modelo puro consolida PDF manual e Fábrica, mas mantém Word no mesmo módulo', () => {
  const original = JSON.stringify([factoryPdf, manualPdf, word]); const groups = api.buildMaterialLibraryViewModel([factoryPdf, manualPdf, word], {});
  assert.equal(groups.length, 1); assert.equal(groups[0].files.length, 2); assert.equal(groups[0].files.find((f) => f.format === 'PDF').records.length, 2); assert.deepEqual(groups[0].origins.sort(), ['Cadastro manual', 'Fábrica']); assert.equal(JSON.stringify([factoryPdf, manualPdf, word]), original);
});
test('URLs Drive com mesmo ID são o mesmo arquivo e títulos diferentes consolidam', () => assert.equal(api.materialPhysicalFileIdentity(factoryPdf), api.materialPhysicalFileIdentity(manualPdf)));
test('PDFs e títulos iguais com links diferentes continuam como versões diferentes', () => { const groups = api.buildMaterialLibraryViewModel([factoryPdf, {...factoryPdf, id:'pdf2', link:'https://example.test/outro.pdf', title:factoryPdf.title}], {}); assert.equal(groups[0].files.length, 2); });
test('módulos distintos formam cartões distintos', () => { const groups = api.buildMaterialLibraryViewModel([factoryPdf, {...factoryPdf, id:'lei', factoryModuleKey:'lei', type:'PDF', link:'https://example.test/lei.pdf'}], {}); assert.equal(groups.length, 2); });
test('filtros PDF, Word e origem funcionam sobre grupos consolidados', () => {
  const group = api.buildMaterialLibraryViewModel([factoryPdf, manualPdf, word], {})[0];
  global.elements = { materialFilterDiscipline:{value:''}, materialFilterSubject:{value:''}, materialFilterType:{value:'PDF'}, materialFilterOrigin:{value:''}, materialFilterText:{value:''} }; assert.equal(api.materialGroupMatchesFilters(group), true);
  elements.materialFilterType.value='Word'; assert.equal(api.materialGroupMatchesFilters(group), true); elements.materialFilterType.value=''; elements.materialFilterOrigin.value='Google Drive'; assert.equal(api.materialGroupMatchesFilters(group), true);
});
test('identidade não usa título, assunto ou disciplina como fallback', () => { assert.notEqual(api.materialPhysicalFileIdentity({...factoryPdf, link:'https://example.test/one'}), api.materialPhysicalFileIdentity({...factoryPdf, id:'other', link:'https://example.test/two'})); });
test('publicação mantém arquivos espelho idênticos e expõe o modelo agrupado', () => { assert.equal(script, fs.readFileSync('docs/script.js', 'utf8')); assert.match(script, /function buildMaterialLibraryViewModel/); assert.match(script, /Origens vinculadas/); });

test('caso real agrupa manual sem módulo e Fábrica em RESUMO/AULA sem mutar registros', () => {
  const manualWithoutModule = { id:'manual-real', source:'manual', origin:'Google Drive', type:'Arquivo PDF', title:'RESUMO AULA TOPIFICADO', discipline:'Direito Processual Penal', subject:'Conceito', link:'https://drive.google.com/open?id=REAL123' };
  const factoryRealPdf = { id:'factory-real-pdf', source:'factory', factoryItemId:'f-real', syllabusItemId:'s-real', factoryModuleKey:'resumoAula', factoryFormat:'application/pdf', title:'Resumo Fábrica', discipline:'Direito Processual Penal', subject:'Conceito', link:'https://drive.google.com/file/d/REAL123/view' };
  const factoryRealWord = { ...factoryRealPdf, id:'factory-real-word', factoryFormat:'DOCX', title:'Word Fábrica', link:'https://example.test/resumo.docx' };
  const records = [manualWithoutModule, factoryRealPdf, factoryRealWord]; const before = JSON.stringify(records); const groups = api.buildMaterialLibraryViewModel(records, {});
  assert.equal(groups.length, 1); assert.equal(groups[0].module, 'RESUMO/AULA'); assert.deepEqual(groups[0].formats.sort(), ['PDF', 'Word']); assert.equal(groups[0].files.find((file) => file.format === 'PDF').records.length, 2); assert.deepEqual(groups[0].origins.sort(), ['Cadastro manual', 'Fábrica']); assert.equal(JSON.stringify(records), before);
});
test('formatos equivalentes do mesmo arquivo não duplicam e manual preserva uso e estimativa', () => {
  const manual = { id:'manual-only', source:'manual', type:'DOC', title:'Manual', discipline:'D', subject:'S', link:'https://example.test/manual.doc', estimatedMinutes:60 };
  const duplicate = { ...manual, id:'manual-copy', type:'Documento Word' }; const groups = api.buildMaterialLibraryViewModel([manual, duplicate], {});
  assert.equal(groups[0].files.length, 1); assert.equal(groups[0].files[0].format, 'Word'); assert.match(script, /data-use-material-study="\$\{escapeHTML\(file\.primary\.id\)\}"/); assert.match(script, /materialEstimateFormHTML\(file\.primary\)/);
});
test('detalhe não expõe a identidade física interna e ações manuais não excluem Fábrica', () => {
  const groupHTML = script.slice(script.indexOf('function materialGroupHTML'), script.indexOf('function materialSectionHTML'));
  assert.doesNotMatch(groupHTML, /file\.identity/); assert.match(groupHTML, /Editar cadastro manual/); assert.match(groupHTML, /Excluir cadastro manual/); assert.match(groupHTML, /record\.source !== "factory"/);
});
