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
