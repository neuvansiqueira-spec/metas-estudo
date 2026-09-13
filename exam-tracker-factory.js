(() => {
  'use strict';
  const A=globalThis.AldusExamTracker;
  if(!A)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function buildPrompt(config={},state={}){
    const title=A.text(config.title)||'Meu simulado',examId=config.id||globalThis.crypto?.randomUUID?.()||'sim-'+Date.now();
    const catalog=(state.syllabusItems||[]).map(q=>({disciplina:q.discipline,assunto:q.subject})).filter(c=>c.disciplina&&c.assunto);
    const data={schema:A.SCHEMA,exam:{id:examId,title,source:'PREENCHER COM O ARQUIVO ANEXADO',finished:false},catalog,questionBank:[]};
    const html=globalThis.AldusExamTrackerCard.buildHTML(data);
    return {examId,prompt:`# ACOMPANHAMENTO INTERATIVO DE SIMULADO
Vou anexar o SIMULADO e, se disponível, o SIMULADO COMENTADO ou GABARITO. Crie o HTML autônomo usando integralmente o modelo abaixo, preenchendo apenas o JSON do elemento exam-data. Não substitua o acompanhamento por explicação textual, imagem ou tela sem funcionalidade.
Título: ${title}. ID fixo do simulado: ${examId}.
Quantidade informada: ${A.text(config.count)||'identificar no simulado anexado'}. Formato: ${A.text(config.format)||'identificar por questão: múltipla escolha ou Certo/Errado'}.

# DOCUMENTOS E MAPEAMENTO
Leia todos os anexos necessários. Preserve a numeração e a ordem da prova, inclusive questões interdisciplinares. Confira a quantidade real com a numeração e informe eventuais páginas ausentes, ilegíveis, versões divergentes ou trechos não recuperados; não invente questões nem gabaritos para preencher lacunas. Sem o simulado, peça o arquivo antes de gerar o cartão. Este módulo acompanha a prova anexada, não busca nem cria questões substitutas no QConcursos.
Para cada questão, identifique a disciplina e o assunto com base no conteúdo, usando a nomenclatura do catálogo do site quando houver correspondência. classificacoes é uma lista de pares {disciplina,assunto}: coloque primeiro a classificação principal, depois cada disciplina/assunto adicional relevante. Não acrescente temas só porque aparecem incidentalmente no texto. Se incerto, indique “A classificar” e explique a incerteza em classificacao_observacao; não apresente palpite como classificação confirmada. Todas as classificações devem continuar editáveis no cartão.
Transcreva enunciado e alternativas completos do anexo para permitir inserir as questões no banco do site. Preserve textos de apoio e assertivas. Não resuma nem preencha por memória. Se houver imagem/tabela essencial que o modelo não consiga representar fielmente, registre a referência à página em enunciado e a limitação em conteudo_pendente=true; informe claramente a necessidade de consultar o original. O acompanhamento pode funcionar, mas não apresente a questão como transcrição integral.

# CORREÇÃO SOMENTE APÓS ENCERRAR
Se o comentado/gabarito estiver anexado, confira a mesma prova, edição, número e conteúdo; copie mecanicamente o gabarito da fonte e preencha fonte_gabarito com arquivo, página e edição. Não resolva a questão para inferir gabarito ausente. Sem confirmação: gabarito="", gabarito_confirmado=false, fonte_gabarito="". Questão anulada confirmada: anulada=true, gabarito="" e fonte_gabarito identificada.
Gabaritos e justificativas ficam nos dados e são revelados na interface somente após ENCERRAR SIMULADO E VER RESULTADOS. A resposta marcada pelo usuário será comparada ao gabarito confirmado. Dúvida e chute são diagnósticos independentes, nunca evidência de erro. Não responda nem registre desempenho em nome do usuário.
Sem comentado, o usuário poderá registrar Acertei, Errei ou Anulada ao final. Isso não confirma uma letra correta. Para correção posterior, o cartão exporta um JSON de acompanhamento e um prompt específico: o usuário anexa ambos ao comentado na conversa e importa o JSON de correção retornado. Um HTML local não chama o GPT sozinho.

# JUSTIFICATIVAS
justificativa_documento: síntese fiel do comentário efetivamente lido. justificativas_alternativas: fundamento específico de cada alternativa certa/errada quando o material permitir; indique lacunas em vez de inventar. explicacao_complementar: análise adicional do agente explicitamente identificada, com referências verificáveis, sem substituir o gabarito documental. Aprofunde o necessário para entender o acerto/erro, sem criar uma aula alheia à questão. No Certo/Errado, explique o julgamento da assertiva. Se não houver justificativa, deixe o campo vazio e informe a pendência.

# CONTRATO DOS DADOS
Preserve schema="aldus-exam-tracker-v1", exam.id=${JSON.stringify(examId)}, exam.title=${JSON.stringify(title)}, exam.finished=false, currentIndex=0, active=null.
Cada item em questionBank: id="SIM-${examId}-NUMERO", numero (inteiro original), disciplina, assunto, tema, classificacoes:[{disciplina,assunto}], classificacao_observacao, tipo ("Múltipla escolha" ou "Certo/Errado"), enunciado, alternativas (objeto com chaves e ordem originais; {} para C/E), fonte="Simulado anexado", origem_tipo="simulado", gabarito, gabarito_confirmado (booleano), fonte_gabarito, anulada (booleano), justificativa_documento, justificativas_alternativas (objeto de textos), explicacao_complementar, resposta_marcada="", elapsedMs=0, finalizada=false, confidence="", notes="", revisar=false, manualResult="". Não fabrique código QConcursos nem atribuição de banca/ano que não esteja no anexo.
Dados de exemplo do modelo são apenas estrutura: substitua questionBank pela prova lida. Nunca atribua ao usuário as respostas do comentado. Escape < como \\u003c dentro do JSON. Não insira scripts, HTML executável ou URLs javascript: nos dados.

# COMPORTAMENTO A PRESERVAR
Cronômetro com horas, minutos e segundos por questão e total líquido; pausa/continuação sem contar pausas. Próxima questão finaliza a atual e transfere o cronômetro apenas se ele estava rodando. Retornar a uma questão acumula seu tempo sem duplicá-la. Trocar de aba não pausa, pois o usuário pode consultar a prova em outra aba. Fechar/recarregar salva e retoma pausado. Não iniciar automaticamente antes de o usuário clicar.
Manter numeração, mapa navegável, classificação múltipla editável, marcação de resposta ao lado das alternativas, percepção “Estudei, mas não me lembrei” / “Nunca estudei o assunto e chutei”, revisão e anotações. Não mostrar respostas certas nem placar de acertos durante a resolução.
Ao encerrar: gráfico e relatório por disciplina e assunto, lista numerada de questões certas/erradas, pendentes, em branco e anuladas separadas, tempo total e médio, sugestão de revisão pelos erros/dúvidas/chutes. Cada questão conta uma vez no total; linhas de áreas relacionadas podem se sobrepor e isso deve ser explícito.
Preservar GUARDAR ACOMPANHAMENTO JSON e EXPORTAR JSON PARA O SITE, com todo o conteúdo disponível, tempo, múltiplas classificações, respostas, fontes e justificativas. Itens sem correção usam corrigida=false e não viram erros. Importar correção posterior preserva os dados do usuário. Não atribuir tempo manual inventado nem alterar o relógio do site.
Antes de entregar, conferir IDs/números, quantidade, correspondência dos anexos, fontes dos gabaritos, conteúdo extraído e controles no navegador. Entregar HTML para baixar e informar quaisquer lacunas de extração ou correção.

# MODELO HTML OBRIGATÓRIO
${html}`};
  }
  function refresh(){
    if(typeof document==='undefined')return;const list=document.getElementById('factoryList');if(!list||document.getElementById('examTrackerFactory'))return;
    const section=document.createElement('section');section.id='examTrackerFactory';section.className='qt-site-panel';section.innerHTML='<h3>Acompanhar um simulado</h3><p>Gere o prompt, anexe sua prova na conversa e acompanhe cada questão com cronômetro, dúvidas e resultados.</p><button type="button" id="examTrackerConfigure">CONFIGURAR ACOMPANHAMENTO</button>';list.before(section);section.querySelector('button').onclick=open;
  }
  function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},2500);}
  function open(){
    let dialog=document.getElementById('examTrackerDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='examTrackerDialog';dialog.style.cssText='width:min(900px,95vw);max-height:90vh;overflow:auto;background:#102d42;color:#edf5fc;border:1px solid #65859c;border-radius:18px;padding:24px';document.body.append(dialog);}
    dialog.innerHTML='<form id="examTrackerForm"><h2>Acompanhamento de simulado</h2><label>Nome do simulado<input name="title" required placeholder="Ex.: Simulado 4 — Delegado"></label><label>Quantidade de questões (opcional)<input name="count" type="number" min="1" max="1000" placeholder="Identificar no arquivo"></label><label>Formato<select name="format"><option>Identificar no arquivo</option><option>Múltipla escolha</option><option>Certo/Errado</option><option>Misto</option></select></label><p>Depois de copiar, anexe o simulado à conversa. O comentado ou gabarito pode ser anexado agora ou após a resolução.</p><button type="submit">GERAR PROMPT DE ACOMPANHAMENTO</button><button type="button" id="examTrackerClose">Fechar</button><p id="examTrackerNotice" role="status"></p><div id="examTrackerOutput"></div></form>';
    dialog.querySelectorAll('label').forEach(l=>l.style.cssText='display:block;margin:14px 0');dialog.querySelectorAll('input,select').forEach(i=>i.style.cssText='display:block;width:100%;padding:10px;background:#081f31;color:#edf5fc;border:1px solid #65859c;border-radius:8px;font:inherit');
    dialog.querySelector('#examTrackerClose').onclick=()=>dialog.close();const form=dialog.querySelector('form');form.onsubmit=e=>{e.preventDefault();try{let s={};try{if(typeof state!=='undefined')s=state;}catch{}const result=buildPrompt(Object.fromEntries(new FormData(form)),s),output=dialog.querySelector('#examTrackerOutput');output.innerHTML='<label>Prompt pronto<textarea id="examTrackerPrompt" readonly style="width:100%;height:220px"></textarea></label><button type="button" id="examTrackerCopy">COPIAR PROMPT</button><button type="button" id="examTrackerDownload">BAIXAR PROMPT</button>';output.querySelector('textarea').value=result.prompt;output.querySelector('#examTrackerCopy').onclick=async()=>{try{await navigator.clipboard.writeText(result.prompt);dialog.querySelector('#examTrackerNotice').textContent='Prompt copiado. Cole como mensagem no Projeto e anexe o simulado.';}catch{output.querySelector('textarea').select();dialog.querySelector('#examTrackerNotice').textContent='Use Ctrl+C para copiar o texto selecionado.';}};output.querySelector('#examTrackerDownload').onclick=()=>download('prompt-acompanhamento-simulado.txt',result.prompt);dialog.querySelector('#examTrackerNotice').textContent='Prompt pronto para '+form.elements.title.value+'.';}catch(err){dialog.querySelector('#examTrackerNotice').textContent=err.message;}};
    form.addEventListener('input',()=>{dialog.querySelector('#examTrackerOutput').replaceChildren();dialog.querySelector('#examTrackerNotice').textContent='';});dialog.showModal();form.elements.title.focus();
  }
  let queued=false;A.scheduleRefresh=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;refresh();},0);};A.buildPrompt=buildPrompt;A.refresh=refresh;A.open=open;
  if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',A.scheduleRefresh,{once:true});if(document.readyState!=='loading')A.scheduleRefresh();}
  if(typeof module!=='undefined')module.exports={buildPrompt};
})();
