const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('../exam-tracker-core.js'),card=require('../exam-tracker-card.js');
globalThis.AldusExamTrackerCard=card;const factory=require('../exam-tracker-factory.js');
function seed(){return {schema:A.SCHEMA,exam:{id:'test-exam',title:'Prova demonstrativa',finished:false},questionBank:[
  {id:'SIM-test-1',numero:1,enunciado:'Primeira questão de demonstração.',tipo:'Múltipla escolha',alternativas:{A:'Primeira opção',B:'Segunda opção'},classificacoes:[{disciplina:'Penal',assunto:'Tema A'},{disciplina:'Constitucional',assunto:'Tema B'}],gabarito:'A',gabarito_confirmado:true,fonte_gabarito:'comentado.pdf, p. 2',justificativa_documento:'Fundamento demonstrativo.',justificativas_alternativas:{A:'Correta pelo fundamento apresentado.',B:'Incorreta pela distinção do exemplo.'}},
  {id:'SIM-test-2',numero:2,enunciado:'Segunda questão demonstrativa.',tipo:'Certo/Errado',alternativas:{},classificacoes:[{disciplina:'Penal',assunto:'Tema C'},{disciplina:'Penal',assunto:'Tema A'}],gabarito:'',gabarito_confirmado:false,fonte_gabarito:''}
]};}
function importer(){const ctx=vm.createContext({console,AldusExamTracker:A,AldusQuestionTraining:require('../question-training.js')});vm.runInContext(fs.readFileSync('question-bank-json-import-v191.js','utf8'),ctx);return ctx.AldusQuestionBankJsonImportV191;}
test('cronômetro acumula em uma questão por vez e exclui pausas e período fechado',()=>{
  const d=A.normalize(seed());A.start(d,0,100);A.checkpoint(d,2100,true);assert.equal(d.questionBank[0].elapsedMs,2000);
  A.start(d,0,10000);A.start(d,1,11500);assert.equal(d.questionBank[0].elapsedMs,3500);A.checkpoint(d,12750,true);assert.equal(d.questionBank[1].elapsedMs,1250);
  const restored=A.normalize(d);assert.equal(restored.active,null);assert.equal(A.elapsed(restored,restored.questionBank[0],999999),3500);assert.equal(A.format(3723000),'01:02:03');
});
test('exportação durante o cronômetro preserva frações de segundo sem duplicar tempo',()=>{const d=A.normalize(seed());A.start(d,0,10);const out=A.exported(d,1260);assert.equal(out.questionBank[0].tempo_segundos,1.25);assert.equal(out.active,null);assert.equal(d.questionBank[0].elapsedMs,0);A.checkpoint(d,1260);assert.equal(d.questionBank[0].elapsedMs,1250);});
test('gabarito só corrige ao terminar; dúvida e chute não determinam acerto/erro',()=>{
  const d=A.normalize(seed());d.questionBank[0].resposta_marcada='A';d.questionBank[0].confidence='nunca_estudei_chutei';d.questionBank[1].resposta_marcada='E';d.questionBank[1].confidence='estudei_esqueci';
  assert.equal(A.outcome(d,d.questionBank[0]),'EM_ANDAMENTO');A.finish(d,0);assert.equal(A.outcome(d,d.questionBank[0]),'ACERTEI');assert.equal(A.outcome(d,d.questionBank[1]),'AGUARDANDO_CORRECAO');
  d.questionBank[1].gabarito='C';assert.equal(A.outcome(d,d.questionBank[1]),'AGUARDANDO_CORRECAO');d.questionBank[1].manualResult='ERREI';assert.equal(A.outcome(d,d.questionBank[1]),'ERREI');assert.equal(A.start(d,0,50),false);
});
test('relatório conta cada questão uma vez no total e uma vez por disciplina relacionada',()=>{
  const d=A.normalize(seed());d.questionBank[0].resposta_marcada='A';d.questionBank[1].manualResult='ERREI';A.finish(d,0);const r=A.summarize(d);
  assert.equal(r.total.questions,2);assert.equal(r.total.correct,1);assert.equal(r.total.wrong,1);assert.equal(r.total.accuracy,50);assert.equal(r.total.disciplinesWithCorrect,2);assert.equal(r.total.disciplinesWithWrong,1);assert.equal(r.disciplines.find(x=>x.name==='Penal').questions,2);assert.equal(r.disciplines.find(x=>x.name==='Constitucional').questions,1);assert.equal(r.themes.length,3);
});
test('correção posterior exige prova e fonte certas, é atômica e preserva registros do usuário',()=>{
  const d=A.normalize(seed());d.questionBank[1].resposta_marcada='E';d.questionBank[1].elapsedMs=88888;d.questionBank[1].notes='Revisar depois';d.questionBank[1].manualResult='ACERTEI';
  const patch={schema:A.CORRECTION_SCHEMA,examId:'test-exam',corrections:[{id:'SIM-test-2',numero:2,gabarito:'C',fonte_gabarito:'comentado p3',resposta_marcada:'C',elapsedMs:0,classificacoes:[]}]};
  assert.throws(()=>A.applyCorrections(d,patch),/Encerre/);A.finish(d,0);assert.throws(()=>A.applyCorrections(d,{...patch,examId:'outra'}));
  const before=JSON.stringify(d);assert.throws(()=>A.applyCorrections(d,{...patch,corrections:[...patch.corrections,{id:'desconhecida',numero:9}]}));assert.equal(JSON.stringify(d),before);
  assert.equal(A.applyCorrections(d,patch),1);assert.equal(d.questionBank[1].resposta_marcada,'E');assert.equal(d.questionBank[1].elapsedMs,88888);assert.equal(d.questionBank[1].notes,'Revisar depois');assert.equal(d.questionBank[1].classificacoes.length,2);assert.equal(A.outcome(d,d.questionBank[1]),'ACERTEI');d.questionBank[1].manualResult='';assert.equal(A.outcome(d,d.questionBank[1]),'ERREI');
});
test('JSON completo e pendentes não criam desempenho; resultados corrigidos não se duplicam no site',()=>{
  const d=A.normalize(seed()),im=importer();let p=A.exported(d,0),plan=im.buildImportPlan(p,[],[]);assert.equal(plan.session,null);assert.equal(plan.bank.length,2);assert.match(plan.bank[0].justificativa,/Comentado do simulado/);
  d.questionBank[0].resposta_marcada='A';A.finish(d,0);p=A.exported(d,0);plan=im.buildImportPlan(p,plan.bank,[]);assert.equal(plan.session.items.length,1);assert.equal(plan.session.summary.correct,1);assert.equal(plan.bank[1].corrigida,false);assert.equal(plan.bank[0].classificacoes.length,2);
  const again=im.buildImportPlan(p,plan.bank,[plan.session]);assert.equal(again.session,null);assert.equal(again.bank.length,2);
  const pending=im.buildImportPlan(A.exported(A.normalize(seed()),0),plan.bank,[plan.session]);assert.equal(pending.bank[0].corrigida,true);
});
test('importador rejeita resultado antecipado ou inconsistente e questão sem conteúdo',()=>{const d=A.normalize(seed()),im=importer();const p=A.exported(d,0);p.questionBank[0].corrigida=true;p.questionBank[0].resultado='ACERTEI';assert.throws(()=>im.buildImportPlan(p,[],[]),/inconsistente/);const missing=A.exported(d,0);missing.questionBank[0].enunciado='';assert.throws(()=>im.buildImportPlan(missing,[],[]),/enunciado/);});
test('modelo contém dados escapados, funciona sem bibliotecas externas e prompt conserva o fluxo documental',()=>{
  const d=seed();d.questionBank[0].enunciado='</script><script>alert(1)</script>';const html=card.buildHTML(d);assert.ok(!html.includes('</script><script>alert(1)'));assert.ok(html.includes('\\u003c/script>'));assert.ok(!html.includes('<script src='));
  const p=factory.buildPrompt({title:'Simulado teste',id:'test-exam'},{}).prompt;assert.match(p,/mecanicamente/);assert.match(p,/Nunca atribua ao usuário as respostas/);assert.match(p,/nunca evidência de erro/);assert.match(p,/exam-data/);assert.match(p,/HTML local não chama o GPT sozinho/);
});
test('módulos entram no pacote ativo antes do núcleo e têm cópias idênticas',()=>{const build=fs.readFileSync('build-bundles.mjs','utf8');assert.ok(build.indexOf('"exam-tracker-core.js"')<build.indexOf('"qconcursos-pdf-import-v181.js"'));for(const f of ['exam-tracker-core.js','exam-tracker-card.js','exam-tracker-factory.js'])assert.equal(fs.readFileSync(f,'utf8'),fs.readFileSync('docs/'+f,'utf8'));});
