(() => {
  'use strict';
  const api=globalThis.AldusQuestionTraining;
  if(!api||typeof document==='undefined')return;
  const getState=()=>{try{return typeof state==='undefined'?null:state;}catch{return null;}};
  let queued=false,current=null,focusReturn=null;
  function scheduleRefresh(){if(queued)return;queued=true;setTimeout(()=>{queued=false;refresh();},0);}
  api.scheduleRefresh=scheduleRefresh;
  function download(name,text,type='text/plain;charset=utf-8'){
    const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},2500);
  }
  function style(){if(document.getElementById('questionTrainingStyles'))return;const s=document.createElement('style');s.id='questionTrainingStyles';s.textContent=`
    .qt-site-panel{border:1px solid #52748c;border-left:5px solid #f5d46b;border-radius:14px;padding:18px;margin:16px 0;background:#0c2940;color:#edf5fc}.qt-site-panel h3{margin:0 0 8px}.qt-topic-status{display:block;color:#98e0eb;font-size:.82rem;line-height:1.6;margin:8px 0;white-space:normal}.qt-site-panel button{margin:5px}.qt-site-panel table{width:100%;border-collapse:collapse;font-size:.88rem}.qt-site-panel td,.qt-site-panel th{padding:8px;text-align:left;border-bottom:1px solid #426179}.qt-site-panel .qt-scroll{overflow:auto}#questionTrainingDialog{color:#edf5fc;background:#0b263b;border:1px solid #62859e;border-radius:18px;width:min(900px,95vw);max-height:90dvh;padding:22px;overflow:auto}#questionTrainingDialog::backdrop{background:#000b}#questionTrainingDialog .qt-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}#questionTrainingDialog [hidden]{display:none!important}#questionTrainingDialog label{display:flex;flex-direction:column;gap:5px}#questionTrainingDialog input,#questionTrainingDialog select,#questionTrainingDialog textarea{width:100%;min-width:0;background:#061a2b;color:#edf5fc;border:1px solid #658197;padding:10px;border-radius:8px;font:inherit}#questionTrainingDialog textarea{height:220px;font:12px monospace}#questionTrainingDialog button{margin:8px 5px 0 0}#questionTrainingDialog .qt-wide{grid-column:1/-1}#qtOutput:empty{display:none}#qtNotice{color:#f5d46b;white-space:pre-wrap}@media(max-width:600px){#questionTrainingDialog .qt-fields{grid-template-columns:1fr}.qt-site-panel{padding:12px}}
    #questionTrainingDialog .qt-dialog-top{position:sticky;top:-22px;z-index:10;display:flex;justify-content:flex-end;margin:-22px -22px 12px;padding:10px 16px;background:#0b263b;border-bottom:1px solid #62859e}
    #questionTrainingDialog .qt-dialog-top button{width:auto;min-width:100px;margin:0;padding:10px 16px;flex:none;color:#edf5fc}
  `;document.head.append(s);}
  function formHTML(){return `<form id="questionTrainingForm"><h2>Configurar rodada de questões</h2><p>Escolha a disciplina. O tema é opcional para um treino misto.</p><div class="qt-fields">
    <label>Disciplina<input name="discipline" list="qtDisciplines" required></label><label>Tema / assunto<input name="theme" list="qtThemes" placeholder="Em branco: misto da disciplina"></label>
    <label>Número de questões<select name="count"><option>5</option><option>10</option><option selected>15</option></select></label>
    <label>Banca principal<select name="primary"><option>FGV</option><option>CEBRASPE</option><option>AOCP</option><option>VUNESP</option><option>Outra</option></select></label>
    <label id="qtOther" hidden>Nome da outra banca<input name="otherPrimary"></label>
    <label>Formato CEBRASPE<select name="cebraspe"><option>Ambos</option><option>Múltipla escolha</option><option>Certo/Errado</option></select></label>
    <label>Se faltarem questões da banca principal<select name="supplement"><option value="none">Não completar com outras bancas</option><option value="cebraspe-mc">Sim: CEBRASPE só com alternativas</option><option value="cebraspe-ce">Sim: CEBRASPE só Certo/Errado</option><option value="cebraspe-both">Sim: CEBRASPE nos dois formatos</option><option value="ordered">Sim: escolher ordem das bancas</option></select></label>
    <label class="qt-order" hidden>Primeira banca complementar<input name="first" list="qtBoards" value="CEBRASPE"></label><label class="qt-order" hidden>Segunda banca complementar<input name="second" list="qtBoards" value="VUNESP"></label>
    <label>Se ainda faltarem questões reais<select name="allowGenerated"><option value="yes">Completar com criadas pelo agente</option><option value="no">Entregar menos; só questões reais</option></select></label>
    <label>Formato das questões criadas<select name="generatedFormat"><option>Múltipla escolha</option><option>Certo/Errado</option><option>Ambos</option></select></label>
    <label>Dificuldade preferida<select name="difficulty"><option>Difíceis primeiro</option><option>Muito difíceis primeiro</option><option>Equilibrada</option></select></label>
    <label>Ordem do treino<select name="order"><option>Mais recentes</option><option>Mais difíceis</option></select></label>
    </div><datalist id="qtDisciplines"></datalist><datalist id="qtThemes"></datalist><datalist id="qtBoards"><option>FGV</option><option>CEBRASPE</option><option>AOCP</option><option>VUNESP</option><option>FCC</option><option>IBFC</option><option>CONSULPLAN</option></datalist>
    <p>Reais: texto integral e gabarito do QConcursos. Autorais: identificação própria e justificativas de todas as alternativas. O histórico local acompanha o prompt; o histórico da conta QC depende de acesso autenticado.</p>
    <button type="submit">GERAR PROMPT DO TREINO</button><button type="button" data-qt-close>Fechar</button><p id="qtNotice" role="status"></p><div id="qtOutput"></div></form>`;}
  function lists(form){const s=getState();const disciplines=[...new Set((s.syllabusItems||[]).map(q=>q.discipline).filter(Boolean))].sort();
    form.querySelector('#qtDisciplines').innerHTML=disciplines.map(v=>`<option value="${api.esc(v)}">`).join('');
    form.querySelector('#qtThemes').innerHTML=[...new Set((s.syllabusItems||[]).filter(q=>api.canon(q.discipline)===api.canon(form.elements.discipline.value)).map(q=>q.subject).filter(Boolean))].map(v=>`<option value="${api.esc(v)}">`).join('');
  }
  function options(form){form.querySelector('#qtOther').hidden=form.elements.primary.value!=='Outra';form.elements.otherPrimary.required=form.elements.primary.value==='Outra';form.querySelectorAll('.qt-order').forEach(e=>e.hidden=form.elements.supplement.value!=='ordered');}
  function open(ctx={}){
    style();focusReturn=document.activeElement;let d=document.getElementById('questionTrainingDialog');if(!d){d=document.createElement('dialog');d.id='questionTrainingDialog';document.body.append(d);}
    current=null;d.innerHTML='<div class="qt-dialog-top"><button type="button" data-qt-close-top aria-label="Fechar configuração">× Fechar</button></div>'+formHTML();const f=d.querySelector('form'),t=api.topic(ctx);f.elements.discipline.value=t.discipline;f.elements.theme.value=t.theme;f.dataset.syllabusId=t.syllabusItemId;lists(f);options(f);
    f.addEventListener('change',()=>{lists(f);options(f);if(current){current=null;f.querySelector('#qtOutput').replaceChildren();f.querySelector('#qtNotice').textContent='Configuração alterada. Gere uma nova rodada.';}});
    f.addEventListener('submit',generate);d.querySelectorAll('[data-qt-close],[data-qt-close-top]').forEach(button=>button.addEventListener('click',()=>d.close()));d.addEventListener('close',()=>focusReturn?.focus(),{once:true});d.showModal();f.elements.discipline.focus();
  }
  function generate(event){
    event.preventDefault();const f=event.currentTarget,s=getState(),notice=f.querySelector('#qtNotice');
    try{
      const raw=Object.fromEntries(new FormData(f));raw.primary=raw.primary==='Outra'?raw.otherPrimary:raw.primary;raw.allowGenerated=raw.allowGenerated==='yes';
      const match=(s.syllabusItems||[]).find(q=>api.canon(q.discipline)===api.canon(raw.discipline)&&api.canon(q.subject)===api.canon(raw.theme));raw.syllabusItemId=match?.id||'';
      const generated=api.prompt(raw,s);const template=globalThis.AldusTrainingTemplate.buildHTML({...generated.metadata,questionBank:[]});
      const exclusionText=JSON.stringify(generated.excluded.questions);
      const attachment=exclusionText.length>18000;
      const full=generated.instruction+(attachment?'\nTambém confira o arquivo exclusoes-treino.json, que será baixado com o prompt; ele contém textos para comparar duplicatas. Não gere o treino sem lê-lo.':'\nConteúdo já existente para conferir duplicatas: '+exclusionText)+`\n\n# MODELO HTML OBRIGATÓRIO\nPreencha training-data com o JSON das questões. Escape < como \\u003c dentro do JSON.\n\n${template}`;
      s.questionTrainingEvents||=[];s.questionTrainingEvents.push({id:generated.roundId,kind:'prompt',roundId:generated.roundId,topicKey:api.topicKey(generated.config),...api.topic(generated.config),config:generated.config,requestedCount:generated.config.count,createdAt:new Date().toISOString(),exclusionCount:generated.excluded.ids.length});
      if(typeof saveData==='function')saveData({markLocalChange:true});
      current={...generated,full,template,attachment};
      const output=f.querySelector('#qtOutput');output.innerHTML='<label>Prompt pronto para copiar<textarea id="qtPromptText" readonly></textarea></label><button type="button" id="qtCopy">COPIAR PROMPT</button><button type="button" id="qtDownload">BAIXAR PROMPT</button><button type="button" id="qtTemplate">BAIXAR MODELO DO CARTÃO</button><button type="button" id="qtExclusions">BAIXAR HISTÓRICO DE EXCLUSÕES</button>';
      output.querySelector('textarea').value=full;
      const extra=()=>{if(attachment)download('exclusoes-treino.json',JSON.stringify(generated.excluded,null,2),'application/json;charset=utf-8');};
      output.querySelector('#qtCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(full);notice.textContent=attachment?'Prompt copiado. Anexe também o histórico baixado ao Projeto.':'Prompt copiado. Cole no Projeto para gerar o treino.';}catch{output.querySelector('textarea').select();notice.textContent='Selecionei o prompt. Use Ctrl+C para copiar.';}extra();});
      output.querySelector('#qtDownload').addEventListener('click',()=>{download('prompt-treino-questoes.txt',full);extra();});
      output.querySelector('#qtTemplate').addEventListener('click',()=>download('modelo-treino-questoes.html',template,'text/html;charset=utf-8'));
      output.querySelector('#qtExclusions').addEventListener('click',()=>download('exclusoes-treino.json',JSON.stringify(generated.excluded,null,2),'application/json;charset=utf-8'));
      notice.textContent=`Prompt registrado para ${raw.theme||raw.discipline}. ${generated.excluded.ids.length} IDs excluídos. ${attachment?'Ao copiar, anexe também o histórico baixado.':''}`;scheduleRefresh();
    }catch(error){notice.textContent=error.message;}
  }
  function refresh(){
    const s=getState();if(!s)return;style();const factory=document.getElementById('factoryList');
    if(factory&&!document.getElementById('questionTrainingFactory')){const panel=document.createElement('section');panel.id='questionTrainingFactory';panel.className='qt-site-panel';panel.innerHTML='<h3>Treino de questões</h3><p>Configure a rodada, copie o prompt e guarde o treino completo ou apenas os resultados corrigidos.</p><button type="button" data-qt-open>CONFIGURAR TREINO</button>';factory.before(panel);}
    const cache=new Map(),getStats=ctx=>{const key=api.topicKey(ctx);if(!cache.has(key))cache.set(key,api.stats(s,ctx));return cache.get(key);};
    const update=(card,ctx,container)=>{if(!ctx||!container)return;let box=container.querySelector('.qt-topic-status');if(!box){box=document.createElement('small');box.className='qt-topic-status';container.append(box);}const msg='Treinos: '+api.label(getStats(ctx));if(box.textContent!==msg)box.textContent=msg;
      if(card.matches('[data-factory-card]')&&!card.querySelector('[data-qt-factory]')){const b=document.createElement('button');b.type='button';b.dataset.qtFactory=card.dataset.factoryCard;b.textContent='Treino de questões';(card.querySelector('.factory-main-actions')||card).append(b);}};
    const agenda=s.factoryAgenda?.length?s.factoryAgenda:s.factoryItems||[];
    document.querySelectorAll('[data-factory-card]').forEach(card=>update(card,agenda.find(q=>q.id===card.dataset.factoryCard),card.querySelector('.factory-card-heading')||card));
    document.querySelectorAll('[data-daily-goal-details]').forEach(card=>update(card,(s.dailyGoals||[]).find(q=>q.id===card.dataset.dailyGoalDetails),card.querySelector('summary > span')||card.querySelector('summary')));
    const dashboard=document.getElementById('view-dashboard');if(!dashboard)return;let panel=document.getElementById('questionTrainingDashboard');if(!panel){panel=document.createElement('section');panel.id='questionTrainingDashboard';panel.className='qt-site-panel';dashboard.append(panel);}
    const topics=new Map(),linked=new Set((s.questionTrainingEvents||[]).filter(e=>e.kind==='import').flatMap(e=>e.questionIds||[]));(s.questionTrainingEvents||[]).forEach(e=>topics.set(e.topicKey,e));(s.questionBank||[]).filter(q=>!linked.has(api.qid(q.id))).forEach(q=>{const key=api.topicKey(q);if(!topics.has(key))topics.set(key,api.topic(q));});
    const rows=[...topics.values()].map(ctx=>({ctx,stats:getStats(ctx)}));
    const html=`<h3>Treinos por tema</h3><p>Prompts gerados, JSONs importados e questões únicas. Reimportar o mesmo conteúdo não aumenta a contagem.</p><details><summary>${rows.length} tema(s) com registros — ver contadores</summary><div class="qt-scroll"><table><thead><tr><th>Disciplina / tema</th><th>Prompts</th><th>Importações</th><th>Questões</th><th>Corrigidas</th><th>A responder</th></tr></thead><tbody>${rows.map(({ctx,stats:t})=>`<tr><td>${api.esc(api.topic(ctx).discipline)} — ${api.esc(api.topic(ctx).theme||'Misto da disciplina')}</td><td>${t.prompts}</td><td>${t.imports}</td><td>${t.questions}</td><td>${t.corrected}</td><td>${t.pending}</td></tr>`).join('')}</tbody></table></div></details>`;
    if(panel.dataset.snapshot!==html){const wasOpen=panel.querySelector('details')?.open;panel.innerHTML=html;panel.dataset.snapshot=html;if(wasOpen)panel.querySelector('details').open=true;}
  }
  document.addEventListener('click',event=>{const b=event.target.closest?.('[data-qt-open],[data-qt-factory]');if(!b)return;event.preventDefault();const s=getState();const agenda=s?.factoryAgenda?.length?s.factoryAgenda:s?.factoryItems||[];open(b.dataset.qtFactory?agenda.find(q=>q.id===b.dataset.qtFactory)||{}:{});});
  api.open=open;api.refresh=refresh;document.addEventListener('DOMContentLoaded',scheduleRefresh,{once:true});if(document.readyState!=='loading')scheduleRefresh();
})();
