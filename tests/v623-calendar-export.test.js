/* V623.1 — calendário exporta dados reais da Fábrica com boa legibilidade. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const api = require('../goal-calendar-export-v623.js');

const FOLDER_A = 'https://drive.google.com/drive/folders/1AAAAAAAAAAAAAAAAAAAAA';
function sampleState() {
  return {
    activeContestId: 'pcpr-2026-delegado',
    contestProfiles: [
      { id: 'pcpr-2026-delegado', name: 'PCPR 2026 — Delegado de Polícia' },
      { id: 'pcma-2026-delegado', name: 'PCMA 2026 — Delegado de Polícia Civil' }
    ],
    contestSyllabusMap: [
      { contestId: 'pcpr-2026-delegado', syllabusItemId: 'item-1', code: '2.1' },
      { contestId: 'pcma-2026-delegado', syllabusItemId: 'item-1', code: '1.4' },
      { contestId: 'pcma-2026-delegado', syllabusItemId: 'item-1', code: '15' }
    ],
    syllabusItems: [
      { id: 'item-1', reference: '2.1 Princípios Fundamentais.' },
      { id: 'item-2', reference: '4.3 Teoria da pena.' }
    ],
    factoryAgenda: [
      {
        id: 'f1', disciplina: 'DIREITO PROCESSUAL PENAL', tema: 'Princípios Fundamentais do Processo Penal',
        editalLink: { itemIds: ['item-1'] }, factoryDestinationFolder: FOLDER_A,
        modules: {
          resumoAula: { status: 'Aguardando revisão', pdfLink: FOLDER_A },
          lei: { status: 'PDF gerado', dataConclusao: '2026-07-10' },
          jurisprudencia: { status: 'Não se aplica' },
          peca: { status: 'Em produção' },
          completo: { status: 'Não iniciado' }
        }
      },
      { id: 'f2', disciplina: 'DIREITO PENAL', tema: 'Teoria da Pena', syllabusItemId: 'item-2', modules: { resumoAula: { status: 'Aprovado' } } }
    ],
    questionTrainingEvents: [
      { id: 'r1', kind: 'prompt', roundId: 'r1', discipline: 'DIREITO PROCESSUAL PENAL', theme: 'Princípios Fundamentais do Processo Penal', config: { primary: 'FGV', syllabusItemId: 'item-1' } },
      { id: 'i1', kind: 'import', roundId: 'r1', discipline: 'DIREITO PROCESSUAL PENAL', theme: 'Princípios Fundamentais do Processo Penal', questionIds: ['Q1','Q2','Q3'], createdAt: '2026-09-13T11:00:00.000Z' }
    ]
  };
}
function periods() {
  const goal = { date:'2026-09-15', discipline:'DIREITO PROCESSUAL PENAL', subject:'Princípios Fundamentais do Processo Penal', type:'Estudo novo', plannedMinutes:60, actualMinutes:0, status:'Pendente', priority:'Alta' };
  return [{ label:'DIA', key:'daily', data:{ mode:'daily', start:'2026-09-15', end:'2026-09-15', goals:[goal], planned:60, actual:0, disciplines:{'DIREITO PROCESSUAL PENAL':1}, days:[{date:'2026-09-15',dayType:'Folga',goals:[goal]}] } }];
}
function report(options={}) {
  const state = sampleState();
  return api.buildReport({ periods:periods(), referenceDate:'2026-09-15', scope:'daily', scopeLabel:'Somente dia', summaries:api.elaboratedSummaries(state), trainings:api.trainingRecords(state), today:'2026-09-15', generatedAt:'2026-09-15T15:00:00Z', ...options });
}

test('V623.1 reconhece produto já elaborado inclusive em Aguardando revisão', () => {
  const rows = api.elaboratedSummaries(sampleState());
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.factoryStatus === 'Aguardando revisão'));
  assert.ok(rows.some((r) => r.factoryStatus === 'Aprovado'));
  assert.ok(rows.some((r) => r.factoryStatus === 'PDF gerado'));
  assert.ok(!rows.some((r) => r.factoryStatus === 'Em produção'));
});

test('V623.1 treinos elaborados exigem questões importadas', () => {
  const rows = api.trainingRecords(sampleState());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].typeLabel, 'FGV · 3 QUESTÕES');
  assert.equal(rows[0].folderUrl, FOLDER_A);
});

test('V623.1 reconhece arquivos gêmeos Word/PDF e ignora inválidos', () => {
  const file = (id,name,time='2026-09-01T00:00:00Z') => ({id,name,modifiedTime:time,mimeType:name.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const folder = [
    file('w1','MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx'), file('p1','MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.pdf'),
    file('p2','MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS_ANTIGO.pdf','2026-09-05T00:00:00Z'), file('bad','ARQUIVO_INCORRETO_DESCONSIDERAR_MAPA_HIERARQUICO_RESUMO_AULA.docx')
  ];
  const picked = api.pickModuleFiles({shared:folder}, 'resumoAula');
  assert.equal(picked.word.id,'w1'); assert.equal(picked.pdf.id,'p1'); assert.equal(picked.twin,true);
});

test('V623.1 consulta Drive uma vez por pasta e traz páginas/arquivos reais', async () => {
  const files = { '1AAAAAAAAAAAAAAAAAAAAA': [
    {id:'w1',name:'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx',createdTime:'2026-08-20T12:00:00Z',modifiedTime:'2026-08-21T12:00:00Z',webViewLink:'https://drive.google.com/file/d/w1/view'},
    {id:'p1',name:'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.pdf',createdTime:'2026-08-20T12:05:00Z',modifiedTime:'2026-08-21T12:05:00Z',webViewLink:'https://drive.google.com/file/d/p1/view'},
    {id:'t1',name:'TREINO_DIREITO_PROCESSUAL_PENAL_PRINCIPIOS.txt',modifiedTime:'2026-09-13T11:00:00Z',webViewLink:'https://drive.google.com/file/d/t1/view'}
  ]};
  let calls=0;
  const get=async(url)=>{calls++;const id=decodeURIComponent(url).match(/'([\w-]+)' in parents/)?.[1];return{files:files[id]||[]};};
  const state=sampleState(), records=[...api.elaboratedSummaries(state),...api.trainingRecords(state)];
  const out=await api.createDriveReader({get,countPdfPages:async()=>12}).resolve(records);
  assert.equal(out.state,'on'); assert.equal(calls,1);
  const resumo=records.find((r)=>r.moduleKey==='resumoAula'&&r.discipline==='DIREITO PROCESSUAL PENAL');
  const view=api.summaryView(resumo,out.results.get(resumo.id),'on');
  const by=Object.fromEntries(view.fields.filter((f)=>f.label).map((f)=>[f.label,f.value]));
  assert.equal(by['ARQUIVO WORD'],'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx');
  assert.equal(by['ARQUIVO PDF'],'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.pdf');
  assert.equal(by['QUANTIDADE DE PÁGINAS DO PDF DO RESUMO'],'12');
  assert.match(by['QUANTIDADE DE PÁGINAS DO WORD DO RESUMO'],/^12/);
});

test('V623.1 não inventa dados sem Drive: NÃO CONFERIDO e PREJUDICADO continuam distintos', () => {
  const rows=api.elaboratedSummaries(sampleState());
  const linked=rows.find((r)=>r.folderUrl), noLinks=rows.find((r)=>!r.folderUrl&&!r.wordLink&&!r.pdfLink);
  const a=api.summaryView(linked,undefined,'off'), b=api.summaryView(noLinks,undefined,'off');
  assert.equal(a.fields.find((f)=>f.label==='QUANTIDADE DE PÁGINAS DO PDF DO RESUMO').value,api.DRIVE_NOTES.off);
  assert.equal(b.fields.find((f)=>f.label==='QUANTIDADE DE PÁGINAS DO PDF DO RESUMO').value,api.PREJUDICADO);
});

test('V623.1 PDF tem timbre, contraste explícito, Fábrica e meta reconhecida por produto', () => {
  const html=api.buildPrintHtml(report());
  assert.match(html,/<thead><tr><td><div class="acv-letterhead"><div class="acv-logo">/);
  assert.match(html,/opacity:1!important/);
  assert.ok(html.includes('Produto elaborado'));
  assert.ok(html.includes('STATUS NA FÁBRICA:'));
  assert.ok(html.includes('ARQUIVO WORD:'));
  assert.ok(html.includes('ARQUIVO PDF:'));
  assert.match(html,/counter\(page\)/);
});

test('V623.1 imagem usa duas colunas e preserva largura 1600', () => {
  const svg=api.buildSvg(report());
  assert.match(svg,/viewBox="0 0 1600 \d+"/);
  assert.match(svg,/data-generated-brand="Aldus Metas Concurso"/);
  assert.ok(svg.includes('Produto elaborado'));
  assert.ok(svg.length>1000);
});

test('V623.1 Excel tem três abas e informações ampliadas da Fábrica', () => {
  const files=api.buildWorkbookFiles(report(),new Uint8Array([137,80,78,71]));
  const by=Object.fromEntries(files.map((f)=>[f.name,f.data]));
  assert.match(by['xl/workbook.xml'],/<sheet name="Calendário"/);
  assert.match(by['xl/workbook.xml'],/<sheet name="Fábrica - resumos"/);
  assert.match(by['xl/workbook.xml'],/<sheet name="Fábrica - treinos"/);
  const resumos=by['xl/worksheets/sheet2.xml'];
  for(const text of ['STATUS NA FÁBRICA','ARQUIVO WORD','ARQUIVO PDF','QUANTIDADE DE PÁGINAS DO WORD DO RESUMO','QUANTIDADE DE PÁGINAS DO PDF DO RESUMO']) assert.ok(resumos.includes(text));
  assert.ok(by['xl/worksheets/sheet1.xml'].includes('Evidência na Fábrica'));
  for(const n of [1,2,3]) assert.match(by[`xl/drawings/drawing${n}.xml`],/<xdr:col>0<\/xdr:col>/);
});

test('V623.1 continua carregado pela cadeia ativa e espelhado em docs', () => {
  const loader=fs.readFileSync('performance-emergency-v350.js','utf8');
  assert.ok(loader.includes('script.src = "goal-calendar-export-v623.js?v=20260915-calendario-exportacoes-v623";'));
  assert.deepEqual(fs.readFileSync('goal-calendar-export-v623.js'),fs.readFileSync('docs/goal-calendar-export-v623.js'));
  assert.match(fs.readFileSync('build-bundles.mjs','utf8'),/"goal-calendar-export-v623\.js"/);
});