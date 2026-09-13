/* Modelo autônomo: dados são texto, nunca código executável. */
(() => {
  'use strict';
  function runtime(){
    const $=s=>document.querySelector(s);
    let data=JSON.parse($('#training-data').textContent), selected=null;
    const keys=q=>Object.keys(q.alternativas||{}).length?Object.keys(q.alternativas):['C','E'];
    const storageKey=()=>`aldus-training:${data.trainingRound?.id||data.metadata?.trainingRound?.id||data.questionBank.map(q=>q.id).join('|')}`;
    function normalize(){data.questionBank||=[];data.questionBank.forEach(q=>{q.resposta_marcada||='';q.corrigida=q.corrigida===true;q.anotacoes||={};q.alternativas_eliminadas||=[];});}
    function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(data));}catch{$('#message').textContent='Não foi possível salvar no navegador. Use Guardar treino completo.';}}
    function node(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;}
    function button(label,action){const b=node('button','',label);b.type='button';b.addEventListener('click',action);return b;}
    function markText(el,value,ranges=[]){
      el.replaceChildren();const text=String(value||''),points=[...new Set([0,text.length,...ranges.flatMap(r=>[Math.max(0,r.start),Math.min(text.length,r.end)])])].sort((a,b)=>a-b);
      for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];const r=ranges.filter(r=>r.start<=a&&r.end>=b).at(-1);
        const fragment=r?node('mark','',text.slice(a,b)):document.createTextNode(text.slice(a,b));if(r)fragment.style.backgroundColor=r.color;el.append(fragment);}
    }
    function textBlock(q,field,value){const el=node('div','qt-text');el.dataset.question=q.id;el.dataset.field=field;markText(el,value,q.anotacoes[field]||[]);return el;}
    function rememberSelection(){const s=getSelection();if(!s?.rangeCount||s.isCollapsed)return;const r=s.getRangeAt(0);
      const element=(r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement)?.closest('.qt-text');
      if(!element||!element.contains(r.endContainer))return;const pre=r.cloneRange();pre.selectNodeContents(element);pre.setEnd(r.startContainer,r.startOffset);
      selected={id:element.dataset.question,field:element.dataset.field,start:pre.toString().length,end:pre.toString().length+r.toString().length};}
    document.addEventListener('selectionchange',rememberSelection);
    function highlight(q,color){if(!selected||selected.id!==q.id||selected.end<=selected.start)return;
      const r=selected,list=q.anotacoes[r.field]||[];q.anotacoes[r.field]=color?[...list,{start:r.start,end:r.end,color}]:list.filter(x=>x.end<=r.start||x.start>=r.end);persist();render();}
    function correct(q){if(!q.resposta_marcada)return;q.corrigida=true;q.resultado=q.resposta_marcada===q.gabarito?'ACERTEI':'ERREI';persist();render();}
    function render(){
      const root=$('#cards');root.replaceChildren();const round=data.trainingRound||data.metadata?.trainingRound||{};
      $('#title').textContent=round.discipline?`${round.discipline} · ${round.theme||'Treino misto'}`:'Treino de questões';
      data.questionBank.forEach((q,index)=>{
        const card=node('article','qt-card'),toolbar=node('div','qt-toolbar');toolbar.append(node('strong','',`Questão ${index+1}`));
        for(const [label,color] of [['Amarelo','#ffe580'],['Verde','#a3e9b2'],['Azul','#a9d9ff'],['Rosa','#ffb9dd']]){const b=button(label,()=>highlight(q,color));b.style.backgroundColor=color;b.style.color='#152238';b.addEventListener('pointerdown',e=>e.preventDefault());toolbar.append(b);}
        const erase=button('Remover grifo',()=>highlight(q,null));erase.addEventListener('pointerdown',e=>e.preventDefault());toolbar.append(erase);card.append(toolbar);
        const body=node('div','qt-body');body.append(node('p','qt-meta',q.origem_tipo==='autoral'?`CRIADA PELO AGENTE · estilo ${q.banca_estilo||'jurídico'}`:`${q.id} · ${q.banca||''} · ${q.ano||''} · ${q.orgao||''} — ${q.cargo||''}`));
        if(q.origem_tipo!=='autoral'&&/delegado/i.test(q.cargo||''))body.append(node('span','qt-badge','PRIORIDADE DELEGADO'));
        body.append(node('p','qt-meta',[q.disciplina,q.assunto,q.tema].filter(Boolean).join(' · ')),textBlock(q,'enunciado',q.enunciado));
        for(const k of keys(q)){
          const row=node('section',`qt-option${q.resposta_marcada===k?' chosen':''}${q.alternativas_eliminadas.includes(k)?' eliminated':''}`);
          const controls=node('div','qt-option-controls');controls.append(node('strong','',k));
          const choose=button(q.resposta_marcada===k?'Marcada':'Marcar',()=>{q.resposta_marcada=k;q.resultado='RESPONDIDA_SEM_CORRECAO';persist();render();});choose.disabled=q.corrigida;choose.setAttribute('aria-pressed',String(q.resposta_marcada===k));
          controls.append(choose,button(q.alternativas_eliminadas.includes(k)?'Desriscar':'Riscar',()=>{q.alternativas_eliminadas=q.alternativas_eliminadas.includes(k)?q.alternativas_eliminadas.filter(x=>x!==k):[...q.alternativas_eliminadas,k];persist();render();}));
          row.append(controls,textBlock(q,k,q.alternativas?.[k]||({C:'Certo',E:'Errado'}[k])));body.append(row);
        }
        if(q.origem_tipo!=='autoral'&&/^https:\/\/(?:www\.)?qconcursos\.com\//i.test(q.link||'')){const link=node('a','','Abrir no QConcursos ↗');link.href=q.link;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}
        const answer=button('CORRIGIR QUESTÃO',()=>correct(q));answer.disabled=!q.resposta_marcada||q.corrigida;body.append(answer);
        body.append(node('p','qt-status',q.corrigida?`${q.resposta_marcada===q.gabarito?'✓ ACERTOU':'✗ ERROU'} — marcou ${q.resposta_marcada} · correta ${q.gabarito}`:q.resposta_marcada?'Respondida — aguardando correção':'Não respondida'));
        if(q.corrigida){const explanation=node('section','qt-explanations');explanation.append(node('h3','','Justificativas'));
          if(q.justificativa_qconcursos)explanation.append(node('p','','Justificativa — QConcursos: '+q.justificativa_qconcursos));
          if(q.explicacao_complementar)explanation.append(node('p','','Explicação complementar — Agente: '+q.explicacao_complementar));
          keys(q).forEach(k=>explanation.append(node('h4','',`${k} — ${k===q.gabarito?'Correta':'Incorreta'}`),node('p','',q.justificativas_alternativas?.[k]||'Justificativa não fornecida.')));body.append(explanation);}
        card.append(body);root.append(card);
      });
      const done=data.questionBank.filter(q=>q.corrigida),correctCount=done.filter(q=>q.resposta_marcada===q.gabarito).length;
      $('#score').textContent=`Total ${data.questionBank.length} · Corrigidas ${done.length} · Acertos ${correctCount} · Erros ${done.length-correctCount} · Não respondidas ${data.questionBank.filter(q=>!q.resposta_marcada).length} · ${done.length?Math.round(correctCount/done.length*100):0}%`;
    }
    function exported(all){return {...data,schema:'aldus-question-training-v1',exportMode:all?'complete':'corrected',questionBank:data.questionBank.filter(q=>all||q.corrigida).map(q=>({...q,resposta_correta:q.gabarito,resultado:q.corrigida?(q.resposta_marcada===q.gabarito?'ACERTEI':'ERREI'):(q.resposta_marcada?'RESPONDIDA_SEM_CORRECAO':'NAO_RESPONDIDA')}))};}
    let output='';
    function download(){if(!output)return;const url=URL.createObjectURL(new Blob([output],{type:'application/json;charset=utf-8'})),a=node('a');a.href=url;a.download='treino-questoes.json';document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},2500);}
    function exportFile(all){const payload=exported(all);output=JSON.stringify(payload,null,2);$('#json').value=output;$('#export-area').hidden=false;
      $('#export-info').textContent=`Exportadas ${payload.questionBank.length}/${data.questionBank.length} · IDs: ${payload.questionBank.map(q=>q.id).join(', ')} · Respondidas sem correção: ${data.questionBank.filter(q=>q.resposta_marcada&&!q.corrigida).length}`;download();}
    $('#all').addEventListener('click',()=>{data.questionBank.forEach(q=>{if(q.resposta_marcada){q.corrigida=true;q.resultado=q.resposta_marcada===q.gabarito?'ACERTEI':'ERREI';}});persist();render();});
    $('#complete').addEventListener('click',()=>exportFile(true));$('#corrected').addEventListener('click',()=>exportFile(false));$('#download-again').addEventListener('click',download);
    $('#import').addEventListener('change',async e=>{try{const incoming=JSON.parse(await e.target.files[0].text());if(!Array.isArray(incoming.questionBank))throw Error('JSON sem questionBank');data=incoming;normalize();persist();render();$('#message').textContent='Treino carregado.';}catch(error){$('#message').textContent=error.message;}});
    normalize();try{const saved=JSON.parse(localStorage.getItem(storageKey()));if(saved?.questionBank&&saved.questionBank.map(q=>q.id).join('|')===data.questionBank.map(q=>q.id).join('|')){data=saved;normalize();}}catch{}
    render();globalThis.AldusTrainingCard={exported};
  }
  function buildHTML(payload={schema:'aldus-question-training-v1',questionBank:[]}){
    const data=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Treino de questões</title><style>
*{box-sizing:border-box}body{margin:0;background:#061a2b;color:#edf5fc;font:16px/1.6 system-ui,sans-serif;padding-bottom:200px}main,header{max-width:960px;margin:auto;padding:20px}h1{font-size:1.7rem}button,input{font:inherit}button,a{cursor:pointer}button{padding:9px 12px;border:1px solid #54758d;border-radius:9px;background:#173e59;color:#fff}button:disabled{opacity:.55;cursor:default}button:focus-visible,a:focus-visible{outline:3px solid #ffe580}a{color:#84d6ff}.qt-card{margin:24px 0;border:1px solid #4c728c;border-radius:16px;background:#0c2940;overflow:visible}.qt-toolbar{position:sticky;top:0;z-index:4;background:#15374e;padding:12px;display:flex;gap:8px;flex-wrap:wrap;border-radius:16px 16px 0 0;align-items:center;border-bottom:1px solid #4c728c}.qt-body{padding:24px}.qt-meta{color:#bcd0de}.qt-text,.qt-explanations p{white-space:pre-wrap;overflow-wrap:anywhere}.qt-badge{color:#ffe580}.qt-option{padding:14px;margin:15px 0;border:1px solid #446c85;border-radius:12px}.qt-option-controls{display:flex;gap:10px;align-items:center;margin-bottom:10px}.chosen{border:2px solid #ffe580}.eliminated .qt-text{text-decoration:line-through;opacity:.7}.qt-body>button{margin:12px}.qt-explanations{border-top:2px solid #ffe580;margin-top:20px}mark{color:#142030;border-radius:2px}footer{position:fixed;bottom:0;width:100%;z-index:10;background:#061a2b;border-top:2px solid #f4d673;padding:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}#score{width:100%;text-align:center}textarea{width:100%;min-height:260px;font:13px monospace}#export-area{padding:20px;background:#173e59}#message{color:#ffe580}@media(max-width:550px){main,header{padding:12px}.qt-body{padding:14px}.qt-toolbar{gap:5px;padding:8px}.qt-toolbar button{font-size:13px;padding:7px}footer button{font-size:13px;padding:7px}body{padding-bottom:240px}}
</style><header><h1 id="title">Treino de questões</h1><label>Retomar treino guardado: <input type="file" id="import" accept=".json,application/json"></label><p id="message" role="status"></p><p>O JSON completo inclui gabaritos e justificativas. Eles ficam ocultos no cartão até a correção.</p></header><main><div id="cards"></div><section id="export-area" hidden><h2>Exportação</h2><p id="export-info"></p><textarea id="json" readonly aria-label="JSON completo para copiar"></textarea><button id="download-again">BAIXAR ARQUIVO JSON</button></section></main><footer><div id="score" aria-live="polite"></div><button id="all">CORRIGIR TODAS</button><button id="complete">GUARDAR TREINO COMPLETO</button><button id="corrected">EXPORTAR CORRIGIDAS</button></footer><script type="application/json" id="training-data">${data}</script><script>(${runtime.toString()})();</script></html>`;
  }
  globalThis.AldusTrainingTemplate={buildHTML};
  if(typeof module!=='undefined')module.exports={buildHTML};
})();
