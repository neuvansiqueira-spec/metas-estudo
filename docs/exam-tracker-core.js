/* Núcleo compartilhado pelo cartão autônomo e pelo importador do site. */
function createExamTrackerCore() {
  'use strict';
  const SCHEMA='aldus-exam-tracker-v1', CORRECTION_SCHEMA='aldus-exam-correction-v1';
  const text=v=>String(v??'').trim(), clone=v=>JSON.parse(JSON.stringify(v));
  const canon=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const finite=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
  const choices=q=>Object.keys(q.alternativas||{}).length?Object.keys(q.alternativas):q.tipo==='Certo/Errado'?['C','E']:['A','B','C','D','E'];
  const labels={ACERTEI:'Acertou',ERREI:'Errou',ANULADA:'Anulada',NAO_RESPONDIDA:'Em branco',AGUARDANDO_CORRECAO:'Aguardando correção',EM_ANDAMENTO:'Em resolução'};
  function classifications(q){
    const raw=Array.isArray(q.classificacoes)&&q.classificacoes.length?q.classificacoes:[{disciplina:q.disciplina||'Não classificada',assunto:q.assunto||'A classificar'}];
    return [...new Map(raw.map(c=>({disciplina:text(c.disciplina)||'Não classificada',assunto:text(c.assunto)||'A classificar'})).map(c=>[canon(c.disciplina)+'|'+canon(c.assunto),c])).values()];
  }
  function validateDocument(data){
    if(data?.schema!==SCHEMA||!text(data.exam?.id)||!Array.isArray(data.questionBank)||!data.questionBank.length)throw Error('Arquivo de acompanhamento inválido ou sem questões.');
    const ids=new Set(),numbers=new Set();
    data.questionBank.forEach(q=>{
      if(!text(q.id)||ids.has(q.id)||!Number.isInteger(Number(q.numero))||Number(q.numero)<1||numbers.has(Number(q.numero)))throw Error('Há questão sem identificação ou com número repetido.');
      ids.add(q.id);numbers.add(Number(q.numero));
      if(q.gabarito&&!choices(q).includes(q.gabarito))throw Error(`Gabarito inválido na questão ${q.numero}.`);
      if(q.resposta_marcada&&!choices(q).includes(q.resposta_marcada))throw Error(`Resposta inválida na questão ${q.numero}.`);
      if(q.manualResult&&!['ACERTEI','ERREI','ANULADA'].includes(q.manualResult))throw Error(`Resultado manual inválido na questão ${q.numero}.`);
    });
  }
  function normalize(input){
    validateDocument(input);const data=clone(input);data.exam.finished=data.exam.finished===true;data.active=null;
    data.currentIndex=Math.min(Math.max(0,Number(data.currentIndex)||0),data.questionBank.length-1);
    data.questionBank.forEach(q=>{q.numero=Number(q.numero);q.elapsedMs=finite(q.elapsedMs??finite(q.tempo_segundos)*1000);q.resposta_marcada=text(q.resposta_marcada);q.classificacoes=classifications(q);q.confidence=text(q.confidence);q.notes=text(q.notes);q.finalizada=q.finalizada===true;q.revisar=q.revisar===true;});
    return data;
  }
  function checkpoint(data,now,pause=false){
    if(data.active){const q=data.questionBank.find(q=>q.id===data.active.id);if(q)q.elapsedMs+=Math.max(0,now-data.active.since);data.active.since=now;}
    if(pause)data.active=null;
  }
  function start(data,index,now){
    if(data.exam.finished)return false;checkpoint(data,now,true);data.currentIndex=index;
    const q=data.questionBank[index];if(!q)return false;q.finalizada=false;data.active={id:q.id,since:now};return true;
  }
  function elapsed(data,q,now){return finite(q.elapsedMs)+(data.active?.id===q.id?Math.max(0,now-data.active.since):0);}
  function seconds(ms){return Math.floor(finite(ms)/1000);}
  function format(ms){const s=seconds(ms);return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function finish(data,now){checkpoint(data,now,true);data.exam.finished=true;data.exam.finishedAt||=new Date().toISOString();}
  function outcome(data,q){
    if(!data.exam.finished)return 'EM_ANDAMENTO';
    if(q.manualResult)return q.manualResult;
    if(q.anulada&&text(q.fonte_gabarito))return 'ANULADA';
    if(!q.resposta_marcada)return 'NAO_RESPONDIDA';
    if(q.gabarito_confirmado===true&&q.gabarito&&text(q.fonte_gabarito))return q.resposta_marcada===q.gabarito?'ACERTEI':'ERREI';
    return 'AGUARDANDO_CORRECAO';
  }
  function summarize(data){
    const groups=new Map(),themes=new Map(),total={questions:data.questionBank.length,correct:0,wrong:0,blank:0,pending:0,annulled:0,elapsedMs:0,doubt:0,guess:0};
    function count(bucket,q,result){bucket.questions++;bucket.elapsedMs+=q.elapsedMs;if(result==='ACERTEI')bucket.correct++;else if(result==='ERREI')bucket.wrong++;else if(result==='ANULADA')bucket.annulled++;else if(result==='NAO_RESPONDIDA')bucket.blank++;else bucket.pending++;}
    const empty=()=>({questions:0,correct:0,wrong:0,blank:0,pending:0,annulled:0,elapsedMs:0,numbers:[]});
    const details=data.questionBank.map(q=>{
      const result=outcome(data,q),cs=classifications(q);count(total,q,result);if(q.confidence==='estudei_esqueci')total.doubt++;if(q.confidence==='nunca_estudei_chutei')total.guess++;
      const used=new Set();cs.forEach(c=>{const d=canon(c.disciplina),t=d+'|'+canon(c.assunto);if(!used.has(d)){used.add(d);if(!groups.has(d))groups.set(d,{name:c.disciplina,...empty()});count(groups.get(d),q,result);groups.get(d).numbers.push(q.numero);}if(!themes.has(t))themes.set(t,{name:c.disciplina+' — '+c.assunto,...empty()});count(themes.get(t),q,result);themes.get(t).numbers.push(q.numero);});
      return {number:q.numero,id:q.id,result,elapsedMs:q.elapsedMs,classifications:cs,confidence:q.confidence,review:q.revisar||result==='ERREI'||['estudei_esqueci','nunca_estudei_chutei'].includes(q.confidence)};
    });
    total.questions=data.questionBank.length;total.accuracy=total.correct+total.wrong?Math.round(100*total.correct/(total.correct+total.wrong)):null;
    total.disciplinesWithCorrect=[...groups.values()].filter(d=>d.correct>0).length;
    total.disciplinesWithWrong=[...groups.values()].filter(d=>d.wrong>0).length;
    total.meanMs=data.questionBank.filter(q=>q.elapsedMs>0).length?total.elapsedMs/data.questionBank.filter(q=>q.elapsedMs>0).length:0;
    return {total,disciplines:[...groups.values()],themes:[...themes.values()],details};
  }
  function exported(data,now){
    const result=clone(data);checkpoint(result,now,true);result.schema=SCHEMA;result.metadata={...(result.metadata||{}),titulo:result.exam.title,data_resolucao:result.exam.finishedAt||'',arquivo_origem:result.exam.source||''};
    result.questionBank=result.questionBank.map(q=>{
      const status=outcome(result,q),cs=classifications(q),corrected=['ACERTEI','ERREI','ANULADA'].includes(status);
      return {...q,disciplina:cs[0].disciplina,assunto:cs[0].assunto,tema:cs[0].assunto,disciplinas:[...new Set(cs.map(c=>c.disciplina))],assuntos:[...new Set(cs.map(c=>c.assunto))],classificacoes:cs,
        fonte:q.fonte||'Simulado anexado',origem_tipo:'simulado',prova:result.exam.title,tempo_segundos:Math.round(q.elapsedMs)/1000,
        gabarito:q.gabarito||'',resposta_correta:q.gabarito||'',corrigida:corrected,resultado:status,acertou:status==='ACERTEI'?true:status==='ERREI'?false:null,
        fundamento:[q.justificativa_documento&&'Comentado: '+q.justificativa_documento,q.explicacao_complementar&&'Agente: '+q.explicacao_complementar,...Object.entries(q.justificativas_alternativas||{}).map(([k,v])=>k+': '+v)].filter(Boolean).join('\n\n'),
        observacoes:[q.notes,q.confidence&&'Percepção: '+q.confidence,q.manualResult&&'Resultado informado pelo usuário; não confirma gabarito documental.'].filter(Boolean).join('\n'),revisao_manual:q.revisar||q.confidence==='estudei_esqueci'||q.confidence==='nunca_estudei_chutei'};
    });return result;
  }
  function validateExport(data){
    if(data?.schema!==SCHEMA)return;validateDocument(data);
    data.questionBank.forEach(q=>{
      if(!text(q.enunciado)||q.conteudo_pendente===true)throw Error(`Questão ${q.numero}: falta o enunciado integral ou conteúdo essencial para inserir no banco do site. Guarde o JSON e peça ao agente para completar a partir do simulado.`);
      const expected=outcome(data,q);if(q.resultado!==expected||q.corrigida!==['ACERTEI','ERREI','ANULADA'].includes(expected))throw Error(`Resultado inconsistente na questão ${q.numero}.`);
    });
  }
  function applyCorrections(data,patch){
    if(!data.exam.finished)throw Error('Encerre o simulado antes de importar a correção.');
    if(patch?.schema!==CORRECTION_SCHEMA||patch.examId!==data.exam.id||!Array.isArray(patch.corrections))throw Error('Correção pertence a outro simulado ou tem formato inválido.');
    const seen=new Set();const changes=patch.corrections.map(c=>{
      const q=data.questionBank.find(q=>q.id===c.id&&q.numero===Number(c.numero));
      if(!q||seen.has(c.id))throw Error('Correção com questão desconhecida ou repetida.');seen.add(c.id);
      if(!text(c.fonte_gabarito)||(!c.anulada&&!choices(q).includes(c.gabarito)))throw Error(`Falta gabarito ou fonte verificável na questão ${c.numero}.`);
      return {q,c};
    });
    changes.forEach(({q,c})=>{q.gabarito=c.anulada?'':c.gabarito;q.gabarito_confirmado=true;q.fonte_gabarito=text(c.fonte_gabarito);q.anulada=c.anulada===true;
      for(const field of ['justificativa_documento','explicacao_complementar','justificativas_alternativas'])if(c[field]!==undefined)q[field]=clone(c[field]);
    });return changes.length;
  }
  return {SCHEMA,CORRECTION_SCHEMA,text,clone,canon,choices,classifications,normalize,checkpoint,start,elapsed,format,finish,outcome,labels,summarize,exported,validateDocument,validateExport,applyCorrections};
}
globalThis.AldusExamTracker=createExamTrackerCore();
globalThis.AldusExamTracker.createCore=createExamTrackerCore;
if(typeof module!=='undefined')module.exports=globalThis.AldusExamTracker;
