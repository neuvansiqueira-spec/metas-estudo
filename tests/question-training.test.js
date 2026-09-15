const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const api=require('../question-training.js'),template=require('../question-training-card.js');
function importer(){const ctx=vm.createContext({console,AldusQuestionTraining:api});vm.runInContext(fs.readFileSync('question-bank-json-import-v191.js','utf8'),ctx);return ctx.AldusQuestionBankJsonImportV191;}
function question(id='Q101',extra={}){return {id,disciplina:'DIREITO PENAL',assunto:'Tema de teste',tema:'Recorte',tipo:'Múltipla escolha',banca:'FGV',fonte:'QConcursos',origem_tipo:'qconcursos',enunciado:`Texto completo da questão ${id}.`,alternativas:{A:'Alternativa A completa.',B:'Alternativa B completa.'},gabarito:'A',resposta_correta:'A',resposta_marcada:'',corrigida:false,resultado:'NAO_RESPONDIDA',justificativas_alternativas:{A:'A satisfaz a condição descrita.',B:'B contraria a condição descrita.'},...extra};}
function payload(questions){return {schema:api.SCHEMA,trainingRound:{id:'round1',discipline:'DIREITO PENAL',theme:'Tema de teste'},questionBank:questions};}
test('configuração respeita quantidade, ordem das bancas e os três formatos CEBRASPE',()=>{
  for(const [mode,format] of [['cebraspe-mc','Múltipla escolha'],['cebraspe-ce','Certo/Errado'],['cebraspe-both','Ambos']]){const c=api.normalizeConfig({discipline:'Penal',supplement:mode,count:5});assert.equal(c.cebraspe,format);assert.deepEqual(c.fallback,['CEBRASPE']);}
  assert.deepEqual(api.normalizeConfig({discipline:'Penal',primary:'AOCP',supplement:'ordered',first:'VUNESP',second:'FGV'}).fallback,['VUNESP','FGV']);
  assert.throws(()=>api.normalizeConfig({discipline:'Penal',count:99}));assert.throws(()=>api.normalizeConfig({discipline:'Penal',primary:'Outra'}));
});
test('prompt bloqueia históricos, mantém gabarito QC e limita autorais ao complemento',()=>{
  const state={questionBank:[question('q 101')],questionBankSessions:[{items:[{id:'Q102'}]}]};
  const p=api.prompt({discipline:'DIREITO PENAL',theme:'Tema de teste',allowGenerated:true},state,'rodada-fixa');
  assert.deepEqual(p.excluded.ids,['Q101','Q102']);assert.match(p.instruction,/MECANICAMENTE/);assert.match(p.instruction,/TODAS as alternativas INTEGRALMENTE/);assert.match(p.instruction,/SOMENTE o número faltante/);assert.match(p.instruction,/AGENTE-rodada-fixa-NN/);assert.match(p.instruction,/justificativas_alternativas/);
  assert.match(api.prompt({discipline:'Penal',allowGenerated:false},state).instruction,/NÃO crie questões/);
});
test('guardar todas sem resposta não cria resultados nem caderno de erros',()=>{
  const p=payload([question(),question('Q102')]),before=JSON.stringify(p),plan=importer().buildImportPlan(p,[],[]);
  assert.equal(plan.bank.length,2);assert.equal(plan.session,null);assert.equal(plan.counts.results,0);assert.equal(plan.notebookItems.length,0);
  assert.equal(plan.bank[0].gabarito,'A');assert.match(plan.bank[0].justificativa,/B — Incorreta/);assert.deepEqual(JSON.parse(JSON.stringify(plan.bank[0].justificativas_alternativas)),p.questionBank[0].justificativas_alternativas);assert.equal(JSON.stringify(p),before);
});
test('respondida sem correção também não é desempenho; importação corrigida cria uma única sessão',()=>{
  const im=importer(),pending=payload([question('Q101',{resposta_marcada:'B',resultado:'RESPONDIDA_SEM_CORRECAO'})]);
  const p1=im.buildImportPlan(pending,[],[]);assert.equal(p1.session,null);
  const corrected=payload([question('Q101',{resposta_marcada:'B',corrigida:true,resultado:'ERREI'})]);
  const p2=im.buildImportPlan(corrected,p1.bank,[]);assert.equal(p2.counts.wrong,1);assert.equal(p2.session.summary.wrong,1);
  const p3=im.buildImportPlan(corrected,p2.bank,[p2.session]);assert.equal(p3.session,null);assert.equal(p3.bank.length,1);
  const p4=im.buildImportPlan(pending,p2.bank,[p2.session]);assert.equal(p4.bank[0].corrigida,true);assert.equal(p4.bank[0].resultado,'ERREI');
});
test('validação rejeita ausência de justificativa, gabarito divergente, fonte falsa e duplicatas',()=>{
  assert.throws(()=>api.validatePayload(payload([question('Q1',{resposta_correta:'B'})])),/Gabarito/);
  assert.throws(()=>api.validatePayload(payload([question('Q1',{justificativas_alternativas:{A:'Só a correta'}})])),/justificativas/);
  assert.throws(()=>api.validatePayload(payload([question('Q1',{origem_tipo:'autoral'})])),/agente/);
  assert.throws(()=>api.validatePayload(payload([question('Q1'),question('Q1')])),/repetido/);
  assert.doesNotThrow(()=>api.validatePayload(payload([question('AGENTE-r-01',{origem_tipo:'autoral',fonte:'Agente',banca:'Autoral'})])));
});
test('contadores distinguem prompts, importações, questões únicas e pendentes, sem recontar arquivo',()=>{
  const q=question(),p=payload([q]),s={questionTrainingEvents:[{id:'round1',kind:'prompt',topicKey:api.topicKey(q)}],questionBank:[]};
  const plan=importer().buildImportPlan(p,[],[]);s.questionBank=plan.bank;api.recordImport(s,p,plan);api.recordImport(s,p,plan);
  assert.deepEqual(api.stats(s,q),{prompts:1,imports:1,questions:1,corrected:0,pending:1,waiting:0,generated:0});
  const p2=payload([question('Q101',{corrigida:true,resposta_marcada:'A',resultado:'ACERTEI'})]),plan2=importer().buildImportPlan(p2,s.questionBank,[]);s.questionBank=plan2.bank;api.recordImport(s,p2,plan2);
  assert.equal(api.stats(s,q).imports,2);assert.equal(api.stats(s,q).questions,1);assert.equal(api.stats(s,q).corrected,1);
});
test('gabaritos e textos com tags entram como JSON inerte no modelo autônomo',()=>{
  const html=template.buildHTML(payload([question('Q1',{enunciado:'</script><img src=x onerror=alert(1)>'})]));
  assert.ok(!html.includes('<img src=x'));assert.match(html,/\\u003c\/script>/);assert.match(html,/position:sticky;top:0/);
  const json=html.match(/id="training-data">([\s\S]*?)<\/script>/)[1];assert.equal(JSON.parse(json).questionBank[0].enunciado,'</script><img src=x onerror=alert(1)>');
});
test('sincronização inclui eventos de treino como coleção por ID',()=>{
  const ctx=vm.createContext({console});vm.runInContext(fs.readFileSync('sync-integral-core.js','utf8')+'\nglobalThis.collections=SYNC_COLLECTIONS;',ctx);
  assert.ok(ctx.collections.includes('questionTrainingEvents'));
});
test('bundle contém gerador, modelo e interface antes do núcleo e raiz/docs coincidem',()=>{
  const bundle=fs.readFileSync('app.bundle.js','utf8');
  for(const file of ['question-training.js','question-training-card.js','question-training-ui.js']){assert.ok(bundle.indexOf(`/* Aldus source: ${file} */`)<bundle.indexOf('/* Aldus source: script.js */'));assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('docs/'+file,'utf8'));}
});

function trainingV621(){
  const ctx={console,AldusQuestionTraining:{...api},AldusTrainingTemplate:{...template}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('question-training-factory-v621.js','utf8'),ctx);return ctx;
}
test('V621 herda a pasta do tema e nomeia a rodada por disciplina e assunto',()=>{
  const ctx=trainingV621();
  const state={factoryAgenda:[{id:'factory-1',disciplina:'DIREITO PENAL',tema:'Princípios do Direito Penal',factoryDestinationFolder:'https://drive.google.com/drive/folders/pasta-do-tema'}]};
  const p=ctx.AldusQuestionTraining.prompt({discipline:'DIREITO PENAL',theme:'Princípios do Direito Penal',allowGenerated:true,count:5},state,'rodada-v621');
  assert.equal(p.destinationFolder,'https://drive.google.com/drive/folders/pasta-do-tema');
  assert.equal(p.metadata.trainingRound.destinationFolder,p.destinationFolder);
  assert.equal(p.outputBaseName,'TREINO_DIREITO PENAL_PRINCÍPIOS DO DIREITO PENAL');
  assert.match(p.instruction,/PASTA DE DESTINO DO TEMA\/DISCIPLINA NO GOOGLE DRIVE/);
  // Desde a V621.4 o arquivamento no Drive fica no PROMPT 2 (PDF → HTML).
  assert.match(p.htmlInstruction,/salve DIRETAMENTE os arquivos nela/);
  assert.match(p.instruction,/PORTÃO QCONCURSOS/);
  assert.match(p.instruction,/Falta de acesso|Falha de acesso/);
});
test('V621.5 prende os prompts ao formulário do tema: outro tema nunca herda a rodada anterior',()=>{
  const ctx=trainingV621(),v=ctx.__ALDUS_QUESTION_TRAINING_FACTORY_V621__;
  const form=(discipline,theme)=>({elements:{discipline:{value:discipline},theme:{value:theme}}});
  const transito=form('DIREITO PENAL','Crimes de Trânsito'),controle=form('DIREITO CONSTITUCIONAL','Controle de Constitucionalidade');
  const gerado=v.rememberGenerated(transito,ctx.AldusQuestionTraining.prompt({discipline:'DIREITO PENAL',theme:'Crimes de Trânsito',count:5},{},'rodada-transito'));
  assert.equal(v.generatedFor(transito),gerado);
  assert.equal(v.generatedFor(controle),null);
  ctx.AldusQuestionTraining.prompt({discipline:'DIREITO CONSTITUCIONAL',theme:'Controle de Constitucionalidade',count:5},{},'rodada-fora-do-formulario');
  assert.equal(v.generatedFor(transito),gerado);
  transito.elements.theme.value='Crimes Hediondos';
  assert.equal(v.generatedFor(transito),null);
});
test('V621.5 exige no PROMPT 2 base jurídica concreta em ordem de hierarquia',()=>{
  const ctx=trainingV621();
  const h=ctx.AldusQuestionTraining.prompt({discipline:'DIREITO PENAL',theme:'Crimes de Trânsito',count:5},{},'rodada-base').htmlInstruction;
  assert.match(h,/# BASE JURÍDICA CONCRETA DE CADA CONCLUSÃO/);
  const ordem=['Dispositivo legal/constitucional VIGENTE','Súmula (vinculante ou não), tema de repercussão geral ou recurso repetitivo','Jurisprudência do STF/STJ','Doutrina: só quando realmente necessária'].map(t=>h.indexOf(t));
  assert.ok(ordem.every(i=>i>0),'todos os níveis presentes');
  assert.deepEqual([...ordem].sort((a,b)=>a-b),ordem);
  assert.match(h,/referência não confirmada/);
  assert.doesNotMatch(ctx.AldusQuestionTraining.prompt({discipline:'DIREITO PENAL',theme:'Crimes de Trânsito'},{},'r').triageInstruction,/BASE JURÍDICA CONCRETA/);
});
test('V621 só aceita autorais com auditoria real da busca no QConcursos',()=>{
  const ctx=trainingV621(),validate=ctx.__ALDUS_QUESTION_TRAINING_FACTORY_V621__.validateSearchAudit;
  const autoral={origem_tipo:'autoral'};
  assert.throws(()=>validate({questionBank:[autoral],trainingRound:{}}),/auditoria obrigatória/);
  assert.throws(()=>validate({questionBank:[autoral],trainingRound:{searchAudit:{qconcursosSearched:true,queries:['FGV Penal'],pagesChecked:2,deficitAfterRealSearch:1,verifiedZeroResults:true,accessIssue:true,evidence:['p1','p2']}}}),/impedimento de acesso/);
  assert.doesNotThrow(()=>validate({questionBank:[autoral],trainingRound:{searchAudit:{qconcursosSearched:true,queries:['FGV Penal'],pagesChecked:2,realCandidatesFound:0,realUsedIds:[],rejectedCandidates:[],deficitAfterRealSearch:1,verifiedZeroResults:true,accessIssue:false,evidence:['Página 1 sem questão válida','Página 2 sem questão válida']}}}));
});
test('V621 mantém CEBRASPE contextual, nomes temáticos e publicação raiz/docs',()=>{
  const source=fs.readFileSync('question-training-factory-v621.js','utf8');
  // V621.3 compactou o arquivo (sem espaços e com variáveis curtas); o teste
  // confere o comportamento, não a formatação.
  assert.match(source,/select\.disabled\s*=\s*!active/);
  assert.match(source,/label\.hidden\s*=\s*!active/);
  assert.match(source,/TREINO_\$\{safeFilePart/);
  assert.match(source,/\$\{\w+\.base\}_EXCLUSOES\.json/);
  assert.equal(source,fs.readFileSync('docs/question-training-factory-v621.js','utf8'));
  const loader=fs.readFileSync('security-observability-v318.js','utf8');
  assert.match(loader,/question-training-factory-v621\.js\?v=20260914-treino-fabrica-pastas-qconcursos-v621/);
  assert.match(loader,/installQuestionTrainingFactoryV621\(\);/);
  assert.equal(loader,fs.readFileSync('docs/security-observability-v318.js','utf8'));
});