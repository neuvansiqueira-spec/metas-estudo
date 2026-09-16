/* V623.5 — calendário exporta dados reais da Fábrica, confere a pasta de cada meta no Drive e gera PDF leve. */
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
  return api.buildReport({ periods:periods(), referenceDate:'2026-09-15', scope:'daily', scopeLabel:'Somente dia', summaries:api.elaboratedSummaries(state), trainings:api.trainingRecords(state), appState:state, today:'2026-09-15', generatedAt:'2026-09-15T15:00:00Z', ...options });
}

test('V623.4 reconhece produto já elaborado inclusive em Aguardando revisão', () => {
  const rows = api.elaboratedSummaries(sampleState());
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.factoryStatus === 'Aguardando revisão'));
  assert.ok(rows.some((r) => r.factoryStatus === 'Aprovado'));
  assert.ok(rows.some((r) => r.factoryStatus === 'PDF gerado'));
  assert.ok(!rows.some((r) => r.factoryStatus === 'Em produção'));
});

test('V623.5 treino importado entra uma vez; prompt do mesmo tema não duplica', () => {
  const rows = api.trainingRecords(sampleState());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].typeLabel, 'FGV · 3 QUESTÕES');
  assert.equal(rows[0].folderUrl, FOLDER_A);
});

test('V623.4 reconhece arquivos gêmeos Word/PDF e ignora inválidos', () => {
  const file = (id,name,time='2026-09-01T00:00:00Z') => ({id,name,modifiedTime:time,mimeType:name.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const folder = [
    file('w1','MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx'), file('p1','MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.pdf'),
    file('p2','MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS_ANTIGO.pdf','2026-09-05T00:00:00Z'), file('bad','ARQUIVO_INCORRETO_DESCONSIDERAR_MAPA_HIERARQUICO_RESUMO_AULA.docx')
  ];
  const picked = api.pickModuleFiles({shared:folder}, 'resumoAula');
  assert.equal(picked.word.id,'w1'); assert.equal(picked.pdf.id,'p1'); assert.equal(picked.twin,true);
});

test('V623.4 consulta Drive uma vez por pasta e traz páginas/arquivos reais', async () => {
  const files = { '1AAAAAAAAAAAAAAAAAAAAA': [
    {id:'w1',name:'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx',createdTime:'2026-08-20T12:00:00Z',modifiedTime:'2026-08-21T12:00:00Z',webViewLink:'https://drive.google.com/file/d/w1/view'},
    {id:'p1',name:'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.pdf',createdTime:'2026-08-20T12:05:00Z',modifiedTime:'2026-08-21T12:05:00Z',webViewLink:'https://drive.google.com/file/d/p1/view'},
    {id:'t0',name:'TREINO_DIREITO_PROCESSUAL_PENAL_PRINCIPIOS_01_TRIAGEM_QC.txt',modifiedTime:'2026-09-13T12:00:00Z'},
    {id:'t1',name:'TREINO_DIREITO_PROCESSUAL_PENAL_PRINCIPIOS.html',modifiedTime:'2026-09-13T11:00:00Z',webViewLink:'https://drive.google.com/file/d/t1/view'}
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
  const treino=records.find((r)=>r.kind==='treino');
  assert.equal(out.results.get(treino.id).trainingFile.id,'t1');
});

test('V623.4 não inventa dados sem Drive: NÃO CONFERIDO e PREJUDICADO continuam distintos', () => {
  const rows=api.elaboratedSummaries(sampleState());
  const linked=rows.find((r)=>r.folderUrl), noLinks=rows.find((r)=>!r.folderUrl&&!r.wordLink&&!r.pdfLink);
  const a=api.summaryView(linked,undefined,'off'), b=api.summaryView(noLinks,undefined,'off');
  assert.equal(a.fields.find((f)=>f.label==='QUANTIDADE DE PÁGINAS DO PDF DO RESUMO').value,api.DRIVE_NOTES.off);
  assert.equal(b.fields.find((f)=>f.label==='QUANTIDADE DE PÁGINAS DO PDF DO RESUMO').value,api.PREJUDICADO);
});

test('V623.5 PDF leve: tabelas, timbre na margem da página e resumo/treino de cada meta', () => {
  const html=api.buildPrintHtml(report());
  assert.match(html,/size:A4 landscape/);
  assert.match(html,/max-width:281mm/);
  assert.match(html,/@top-left\{content:"";[^}]*background:url\("data:image\/svg\+xml,/);
  const logo=decodeURIComponent(html.match(/url\("data:image\/svg\+xml,([^"]+)"\)/)[1]);
  assert.ok(logo.includes('>ALDUS</text>') && logo.includes('>METAS CONCURSO</text>'));
  assert.ok(html.includes('@top-right{content:"Calendário de metas  ·  Referência 15/09/2026 · Somente dia"'));
  assert.ok(html.includes('@bottom-right{content:"Página " counter(page)'));
  assert.doesNotMatch(html,/counter\(pages\)/);
  // position:fixed com deslocamento negativo fazia o timbre sair embaixo e o rodapé cobrir a tabela.
  assert.doesNotMatch(html,/position:fixed/);
  assert.doesNotMatch(html,/acv-page-head|acv-page-foot|acv-record|acv-factory-table/);
  // Peso 800 puxava a Arial Black; cantos arredondados e gradientes viram desenho no PDF.
  assert.doesNotMatch(html,/font-weight:800|font:800|linear-gradient/);
  assert.match(html,/border-radius:0!important/);
  assert.match(html,/id="goalCalendarPrintableReport" class="aldus-cal-v623" data-version="[^"]+" aria-hidden="true"/);
  assert.ok(html.includes('<th>Resumo pronto?</th>') && html.includes('<th>Treino pronto?</th>'));
  assert.ok(html.includes('SIM — RESUMO/AULA, LEI'));
  assert.ok(html.includes('marcado na Fábrica; Drive não conferido'));
  assert.ok(html.includes('SIM — 3 questões importadas no site'));
  assert.ok(html.includes('Produto elaborado'));
  assert.ok(html.includes('<th>Status na Fábrica</th>') && html.includes('<th>Páginas do Word</th>') && html.includes('<th>Páginas do PDF</th>'));
  assert.ok(html.includes('abrir pasta'));
});

test('V623.5 imagem preserva largura 1600 e mostra resumo/treino pronto', () => {
  const svg=api.buildSvg(report());
  assert.match(svg,/viewBox="0 0 1600 \d+"/);
  assert.match(svg,/data-generated-brand="Aldus Metas Concurso"/);
  assert.ok(svg.includes('Produto elaborado'));
  assert.ok(svg.includes('Resumo pronto? SIM — RESUMO/AULA, LEI'));
  assert.ok(svg.includes('Treino pronto? SIM — 3 questões importadas no site'));
  assert.ok(svg.length>1000);
});

test('V623.5 Excel tem três abas, tipo do resumo e resumo/treino pronto por meta', () => {
  const files=api.buildWorkbookFiles(report(),new Uint8Array([137,80,78,71]));
  const by=Object.fromEntries(files.map((f)=>[f.name,f.data]));
  assert.match(by['xl/workbook.xml'],/<sheet name="Calendário"/);
  assert.match(by['xl/workbook.xml'],/<sheet name="Fábrica - resumos"/);
  assert.match(by['xl/workbook.xml'],/<sheet name="Fábrica - treinos"/);
  const resumos=by['xl/worksheets/sheet2.xml'];
  for(const text of ['RESUMO - TIPO ELABORADO','STATUS NA FÁBRICA','ARQUIVO WORD','ARQUIVO PDF','QUANTIDADE DE PÁGINAS DO WORD DO RESUMO','QUANTIDADE DE PÁGINAS DO PDF DO RESUMO']) assert.ok(resumos.includes(text));
  assert.ok(by['xl/worksheets/sheet1.xml'].includes('Resumo pronto?'));
  assert.ok(by['xl/worksheets/sheet1.xml'].includes('Treino pronto?'));
  assert.ok(by['xl/worksheets/sheet1.xml'].includes('SIM — RESUMO/AULA, LEI (marcado na Fábrica; Drive não conferido)'));
  assert.ok(by['xl/worksheets/sheet3.xml'].includes('TREINO - TIPO'));
  for(const n of [1,2,3]) assert.match(by[`xl/drawings/drawing${n}.xml`],/<xdr:col>0<\/xdr:col>/);
});

test('V623.5 continua carregado pela cadeia ativa e espelhado em docs', () => {
  const loader=fs.readFileSync('performance-emergency-v350.js','utf8');
  assert.ok(loader.includes('script.src = "goal-calendar-export-v623.js?v=20260916-calendario-real-pdf-leve-v623-5";'));
  assert.deepEqual(fs.readFileSync('goal-calendar-export-v623.js'),fs.readFileSync('docs/goal-calendar-export-v623.js'));
  assert.match(fs.readFileSync('build-bundles.mjs','utf8'),/"goal-calendar-export-v623\.js"/);
});

// Casos reais de 17/09/2026: o calendário dizia "NÃO REALIZADO" com o arquivo pronto na pasta.
const WORD='application/vnd.openxmlformats-officedocument.wordprocessingml.document', FOLDER='application/vnd.google-apps.folder';
const driveFolder=(id)=>`https://drive.google.com/drive/folders/${id}`;
const canonText=(v)=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function realState() {
  return {
    syllabusItems:[{ id:'s-peca', subject:'Relatório Final de Inquérito Policial' }, { id:'s-dgf', subject:'Direitos e garantias fundamentais' }, { id:'s-lei', subject:'Lei de Interceptação Telefônica' }],
    factoryAgenda:[
      { id:'peca', disciplina:'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', tema:'Relatório Final de Inquérito Policial', syllabusItemId:'s-peca', factoryDestinationFolder:driveFolder('PASTA_PECA_0001'), modules:{ peca:{ status:'Não iniciado' } } },
      { id:'dgf', disciplina:'DIREITO CONSTITUCIONAL', tema:'Direitos e garantias fundamentais', syllabusItemId:'s-dgf', factoryDestinationFolder:driveFolder('PASTA_DGF_00001'), modules:{ resumoAula:{ status:'Aprovado' } } },
      { id:'nac', disciplina:'DIREITO CONSTITUCIONAL', tema:'Nacionalidade', syllabusItemId:'s-dgf', factoryDestinationFolder:driveFolder('PASTA_NAC_00001'), modules:{} },
      { id:'soc', disciplina:'DIREITO CONSTITUCIONAL', tema:'Direitos sociais', syllabusItemId:'s-dgf', factoryDestinationFolder:driveFolder('PASTA_SOC_00001'), modules:{ resumoAula:{ status:'Aprovado' } } },
      { id:'lei', disciplina:'LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL', tema:'Lei nº 9.296/1996', syllabusItemId:'s-lei', factoryDestinationFolder:driveFolder('PASTA_LEI_00001'), modules:{ lei:{ status:'Aprovado' } } },
      { id:'pri', disciplina:'DIREITO PROCESSUAL PENAL', tema:'Princípios Fundamentais do Processo Penal', factoryDestinationFolder:driveFolder('PASTA_PRI_00001'), modules:{ resumoAula:{ status:'Aprovado' } } }
    ],
    questionTrainingEvents:[
      { id:'p-pri', kind:'prompt', roundId:'p-pri', discipline:'DIREITO PROCESSUAL PENAL', theme:'Princípios Fundamentais do Processo Penal', config:{ primary:'FGV', count:20 }, createdAt:'2026-09-15T19:00:00Z' },
      { id:'p-col', kind:'prompt', roundId:'p-col', discipline:'DIREITO PROCESSUAL PENAL', theme:'Colaboração Premiada', config:{ primary:'CEBRASPE', count:20 }, createdAt:'2026-09-15T22:00:00Z' },
      { id:'p-col2', kind:'prompt', roundId:'p-col2', discipline:'DIREITO PROCESSUAL PENAL', theme:'Colaboração Premiada', config:{ primary:'CEBRASPE', count:30 }, createdAt:'2026-09-15T23:00:00Z' }
    ]
  };
}
const goal=(discipline,subject,syllabusItemId='')=>({ date:'2026-09-17', syllabusItemId, discipline, subject, type:'Estudo novo', plannedMinutes:75, actualMinutes:0, status:'Pendente', priority:'Alta' });
function fakeDrive() {
  const f=(id,name,mimeType=WORD)=>({ id,name,mimeType,createdTime:'2026-09-01T00:00:00Z',modifiedTime:'2026-09-01T00:00:00Z',webViewLink:`https://drive.google.com/file/d/${id}/view` });
  const folders={
    PASTA_PECA_0001:[f('a1','MAPA_TOPIFICADO_PECA_RELATORIO_FINAL_INQUERITO_POLICIAL.docx'),f('a2','MAPA_TOPIFICADO_PECA_RELATORIO_FINAL_INQUERITO_POLICIAL.pdf','application/pdf')],
    PASTA_DGF_00001:[f('b1','MAPA_HIERARQUICO_RESUMO_AULA_DIREITOS_E_GARANTIAS_FUNDAMENTAIS.docx'),f('b2','8_2_3_NACIONALIDADE',FOLDER)],
    PASTA_NAC_00001:[], PASTA_SOC_00001:[],
    PASTA_LEI_00001:[f('c1','Lei-n-9-296-de-1996-Interceptacao-Telefonica.pdf','application/pdf')],
    PASTA_PRI_00001:[f('d1','TREINO_DIREITO PROCESSUAL PENAL_PRINCÍPIOS FUNDAMENTAIS DO PROCESSO PENAL.json','application/json'),f('d2','TREINO_DIREITO PROCESSUAL PENAL_PRINCÍPIOS FUNDAMENTAIS DO PROCESSO PENAL.html','text/html')]
  };
  const parents={ PASTA_NAC_00001:'PASTA_DGF_00001', PASTA_SOC_00001:'PASTA_DGF_00001' };
  return async (url) => {
    const u=decodeURIComponent(url), list=u.match(/'([\w-]+)' in parents/);
    if(list) return { files:folders[list[1]]||[] };
    const meta=u.match(/files\/([\w-]+)\?fields=id,parents/);
    if(meta) return { id:meta[1], parents:[parents[meta[1]]||'raiz'] };
    throw new Error('url inesperada '+u);
  };
}
async function realReport(goals) {
  const state=realState(), linker=api.createGoalLinker(state), links=new Map();
  goals.forEach((g)=>links.set([g.date,g.syllabusItemId,canonText(g.discipline),canonText(g.subject)].join('|'),linker.links(g)));
  const out=await api.createDriveReader({ get:fakeDrive(), countPdfPages:async()=>1 }).resolveGoals(links, linker.folderIndex);
  assert.equal(out.state,'on');
  const day={ label:'DIA', key:'daily', data:{ start:'2026-09-17', end:'2026-09-17', goals, days:[{ date:'2026-09-17', dayType:'Folga', goals }] } };
  return api.buildReport({ periods:[day], referenceDate:'2026-09-17', scope:'daily', scopeLabel:'Somente dia', summaries:api.elaboratedSummaries(state), trainings:api.trainingRecords(state), appState:state, goalDrive:out.results, driveState:'on', today:'2026-09-16' });
}

test('V623.5 meta liga ao tema pelo item do edital, sem pegar subtema irmão', () => {
  const linker=api.createGoalLinker(realState());
  assert.deepEqual(linker.links(goal('DIREITO PROCESSUAL PENAL','Lei de Interceptação Telefônica','s-lei')).map((l)=>[l.item.id,l.relation]), [['lei','item']]);
  assert.deepEqual(linker.links(goal('CONSTITUCIONAL','Nacionalidade','s-dgf')).map((l)=>l.item.id), ['nac']);
  assert.deepEqual(linker.links(goal('DIREITO CONSTITUCIONAL','Direitos políticos','s-dgf')).map((l)=>l.item.id), ['dgf']);
  assert.deepEqual(linker.links(goal('DIREITO PENAL','Tema que não existe')), []);
});

test('V623.5 resumo e treino da meta vêm da pasta real, não só do status da Fábrica', async () => {
  const goals=[goal('PEÇA PARA DELEGADO DE POLÍCIA CIVIL','Relatório Final de Inquérito Policial','s-peca'), goal('CONSTITUCIONAL','Nacionalidade','s-dgf'), goal('DIREITO CONSTITUCIONAL','Direitos sociais','s-dgf'), goal('DIREITO PROCESSUAL PENAL','Lei de Interceptação Telefônica','s-lei'), goal('DIREITO PROCESSUAL PENAL','Princípios Fundamentais do Processo Penal'), goal('DIREITO PROCESSUAL PENAL','Colaboração Premiada')];
  const r=await realReport(goals), out=goals.map((g)=>api.factoryOutcomeForGoal(g,r));
  assert.equal(out[0].summaryLabel,'SIM — PEÇA (Word e PDF)'); assert.equal(out[0].summaryDone,true);
  assert.equal(out[1].summaryLabel,'NÃO NO TEMA — há resumo do tema maior'); assert.match(out[1].summaryDetail,/^Direitos e garantias fundamentais \(RESUMO\/AULA\)/); assert.equal(out[1].summaryDone,false);
  // Status "Aprovado" sem arquivo na pasta não vira SIM.
  assert.equal(out[2].summaryLabel,'NÃO NO TEMA — há resumo do tema maior');
  assert.equal(out[3].summaryLabel,'NÃO — a pasta não tem o arquivo'); assert.match(out[3].summaryDetail,/a Fábrica marca LEI como pronto · tema na Fábrica: Lei nº 9\.296\/1996/);
  assert.equal(out[4].trainingLabel,'SIM — arquivo do treino na pasta'); assert.match(out[4].trainingDetail,/PROCESSO PENAL\.html$/);
  assert.equal(out[4].summaryLabel,'NÃO — a pasta não tem o arquivo');
  assert.equal(out[5].summaryLabel,'NÃO — tema não está na Fábrica');
  assert.equal(out[5].trainingLabel,'NÃO — prompt gerado, tema sem pasta na Fábrica'); assert.match(out[5].trainingDetail,/15\/09\/2026/);
  const html=api.buildPrintHtml(r);
  assert.ok(html.includes('SIM — PEÇA (Word e PDF)') && html.includes('NÃO NO TEMA — há resumo do tema maior'));
});

test('V623.5 treino feito só com prompt entra uma vez por tema, com o prompt mais recente', () => {
  const rows=api.trainingRecords(realState());
  const col=rows.filter((r)=>r.theme==='Colaboração Premiada');
  assert.equal(col.length,1); assert.equal(col[0].typeLabel,'CEBRASPE · 30 PEDIDAS'); assert.match(col[0].factoryStatus,/^Prompt gerado/);
  assert.equal(rows.filter((r)=>r.theme==='Princípios Fundamentais do Processo Penal').length,1);
});

test('V623.5 tipo do arquivo pelo começo do nome; prompts e texto de lei não contam', () => {
  const kind=(name)=>api.productKind({ name });
  assert.equal(kind('MAPA_HIERARQUICO_RESUMO_AULA_LEI_13_709_2018.docx'),'resumoAula');
  assert.equal(kind('RESUMO_TOPIFICADO_LEI_9_296_1996_INTERCEPTACAO_TELEFONICA_FINAL.pdf'),'lei');
  assert.equal(kind('MAPA_MENTAL_JURISPRUDENCIAS_ARQUIVAMENTO.docx'),'jurisprudencia');
  assert.equal(kind('RESUMO_PECA_REPRESENTACAO_POR_INTERCEPTACAO_TELEFONICA.docx'),'peca');
  assert.equal(kind('Lei-n-9-296-de-1996-Interceptacao-Telefonica.pdf'),'');
  assert.equal(api.isTrainingFile({ name:'TREINO_DIREITO PENAL_TEMA.html' }),true);
  assert.equal(api.isTrainingFile({ name:'TREINO_DIREITO PENAL_TEMA_01_TRIAGEM_QC.txt' }),false);
  assert.equal(api.isTrainingFile({ name:'TREINO_DIREITO PENAL_TEMA_EXCLUSOES.json' }),false);
  assert.equal(api.isTrainingFile({ name:'TREINO_DIREITO PENAL_TEMA_MODELO.html' }),false);
});
