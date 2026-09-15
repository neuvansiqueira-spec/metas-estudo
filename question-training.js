/* Treinos da Fábrica: configuração, instruções e histórico por tema. */
(() => {
  'use strict';
  const SCHEMA = 'aldus-question-training-v1';
  const text = v => String(v ?? '').trim();
  const canonCache = new Map();
  const canon = v => {const t=text(v);let c=canonCache.get(t);if(c===undefined){c=t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();if(canonCache.size>=20000)canonCache.clear();canonCache.set(t,c);}return c;};
  const esc = v => text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const hash = value => {let n=2166136261; for(const c of value) n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16);};
  const qid = v => /^q\s*\d+$/i.test(text(v)) ? `Q${text(v).replace(/\D/g,'')}` : text(v);
  const sourceItems = p => Array.isArray(p) ? p : p?.questionBank || p?.questoes || p?.questions || p?.items || [];
  const topic = r => ({discipline:text(r.discipline || r.disciplina), theme:text(r.subject || r.assunto || r.theme || r.tema), syllabusItemId:text(r.syllabusItemId)});
  const topicKey = r => {const t=topic(r);return `${canon(t.discipline)}|${canon(t.theme)}`;};
  const contentKey = q => canon(q.enunciado || q.statement) + '|' + Object.values(q.alternativas || {}).map(canon).join('|');
  const corrected = q => q.corrigida === true || (q.corrigida !== false && /^(acertei|errei|certo|errado)$/.test(canon(q.resultado || q.status)));
  function explanation(q){
    return [q.justificativa_documento && `Justificativa — Comentado do simulado: ${q.justificativa_documento}`,
      q.justificativa_qconcursos && `Justificativa — QConcursos: ${q.justificativa_qconcursos}`,
      q.explicacao_complementar && `Explicação complementar — Agente: ${q.explicacao_complementar}`,
      ...Object.entries(q.justificativas_alternativas||{}).map(([key,value])=>`${key}${q.gabarito?` — ${key===q.gabarito?'Correta':'Incorreta'}`:''}: ${text(value)}`)].filter(Boolean).join('\n\n');
  }
  function exclusions(state={}) {
    const all=[...(state.questionBank||[]),...(state.questionBankSessions||[]).flatMap(s=>s.items||[])];
    return {ids:[...new Set(all.flatMap(q=>[q.id,q.qcCodigo,q.numero_qconcursos]).map(qid).filter(Boolean))],
      questions:[...new Map((state.questionBank||[]).filter(q=>text(q.enunciado)).map(q=>[contentKey(q),{id:qid(q.id),enunciado:q.enunciado,alternativas:q.alternativas||{}}])).values()]};
  }
  function normalizeConfig(raw={}) {
    const primary=text(raw.primary || 'FGV').toUpperCase();
    const count=Number(raw.count || 15);
    if(![5,10,15].includes(count))throw Error('Escolha 5, 10 ou 15 questões.');
    if(!text(raw.discipline))throw Error('Informe a disciplina.');
    if(!primary || primary==='OUTRA')throw Error('Informe o nome da banca.');
    const mode=raw.supplement || 'none';
    const fallback=mode.startsWith('cebraspe') ? ['CEBRASPE'] : mode==='ordered' ? [raw.first,raw.second].map(v=>text(v).toUpperCase()).filter(Boolean) : [];
    if(mode==='ordered'&&!fallback.length)throw Error('Informe ao menos a primeira banca complementar.');
    const cebraspe=mode==='cebraspe-mc'?'Múltipla escolha':mode==='cebraspe-ce'?'Certo/Errado':mode==='cebraspe-both'?'Ambos':raw.cebraspe || 'Ambos';
    return {discipline:text(raw.discipline),theme:text(raw.theme),syllabusItemId:text(raw.syllabusItemId),count,primary,
      fallback:[...new Set(fallback)].filter(b=>b!==primary),cebraspe,allowGenerated:raw.allowGenerated===true,
      generatedFormat:raw.generatedFormat || 'Múltipla escolha',difficulty:raw.difficulty || 'Difíceis primeiro',
      order:raw.order || 'Mais recentes',priority:'Delegado Civil > Delegado Federal > Juiz > Promotor > Procurador > Defensor > outros jurídicos superiores > outros superiores'};
  }
  function prompt(config, state={}, roundId=id()) {
    const c=normalizeConfig(config), excluded=exclusions(state);
    const syllabus=(state.syllabusItems||[]).filter(q=>canon(q.discipline)===canon(c.discipline)).map(q=>q.subject).filter(Boolean);
    const metadata={schema:SCHEMA,trainingRound:{id:roundId,discipline:c.discipline,theme:c.theme,topicKey:topicKey(c),syllabusItemId:c.syllabusItemId,config:c}};
    const instruction=`# TREINO INTERATIVO — RODADA ${roundId}
Disciplina: ${c.discipline}
Tema: ${c.theme || 'Treino misto da disciplina, restrito aos assuntos do edital abaixo'}
Quantidade: ${c.count}. Banca principal: ${c.primary}.
Complementação com questões reais, SOMENTE se faltarem da principal: ${c.fallback.join(' → ') || 'NÃO AUTORIZADA'}.
CEBRASPE: ${c.cebraspe}. Nunca converter questão real de Certo/Errado em alternativas nem o inverso.
Preferência: ${c.difficulty}; ordem: ${c.order}; desempate: mais recentes e Delegado primeiro.
Prioridade de cargos: ${c.priority}. Nunca nível médio.
Assuntos do edital: ${[...new Set(syllabus)].join('; ') || 'não fornecidos; limitar à disciplina/tema informado'}.

# SELEÇÃO E INTEGRALIDADE
PRIORIDADE OBRIGATÓRIA: procure SEMPRE primeiro no site QConcursos. Questões criadas pelo agente são o último recurso e nunca substituem questões reais válidas disponíveis. Só use o complemento autoral autorizado após pesquisar a banca principal e, na ordem escolhida, todas as bancas complementares permitidas, sem encontrar questões suficientes que atendam aos filtros e às exclusões. Registre no balanço final as buscas efetivamente realizadas, os filtros, as fontes consultadas e a quantidade faltante. Falta de tempo, dificuldade de pesquisa, erro de acesso ou ausência de login não demonstram falta de questões: informe a limitação e não a use como autorização para criar questões.
Pesquise várias páginas do QConcursos para completar a quantidade com questões válidas. Exclua anuladas e desatualizadas. Prefira casos, distinções, exceções e jurisprudência, conforme a dificuldade escolhida.
Copie o enunciado e TODAS as alternativas INTEGRALMENTE, na ordem e redação originais: textos de apoio, comandos, assertivas, negações, ressalvas, tabelas e imagens indispensáveis. Compare cada item com a página individual. Snippets e prévias cortadas não bastam. Não parafraseie, resuma, use reticências substitutivas, transforme formatos ou preencha lacunas por memória. Sem confirmar a íntegra, descarte. Se imagens essenciais não puderem ser incluídas legivelmente, substitua a questão.
Para questões reais, transcreva MECANICAMENTE o gabarito do próprio QC para o MESMO código Q. Não resolva para escolher ou mudar a correta. Comentários, votos e inferências não substituem o gabarito do QC. Verifique a letra e o texto correspondente. Sem gabarito confirmado, descarte. Metadados, fonte e link devem ser verificáveis e corresponder à mesma questão. Nunca invente IDs ou links.

# NÃO REPETIR
Exclua TODOS os IDs abaixo e questões já apresentadas nesta conversa, inclusive guardadas sem resposta. Confira também identidade de conteúdo para evitar a mesma questão sob outro código. Não trate memória incompleta de outras conversas como histórico integral. Consulte o banco/arquivo acessível do Projeto e o filtro NÃO RESOLVIDAS do QC SOMENTE se houver sessão autenticada acessível; não alegue acesso que não ocorreu. Não clique em responder para obter gabarito nem altere o histórico do usuário. Informe quais históricos foram efetivamente consultados e eventuais lacunas. A lista fornecida é obrigatória mesmo sem acesso à conta QC. Reconfira exclusões ANTES da entrega.
IDs proibidos (${excluded.ids.length}): ${excluded.ids.join(', ') || 'nenhum registro local encontrado; conferir o histórico acessível do Projeto'}.

# COMPLEMENTO AUTORAL
${c.allowGenerated ? `Se faltarem reais após as buscas e bancas permitidas, crie SOMENTE o número faltante no formato ${c.generatedFormat}.` : 'NÃO crie questões; se faltarem reais válidas, entregue menos e explique.'}
Autoral: selo visível CRIADA PELO AGENTE, fonte="Agente", origem_tipo="autoral", ID="AGENTE-${roundId}-NN", banca="Autoral", banca_estilo=estilo solicitado. Não atribuir código Q, prova, órgão, ano de concurso, link QC ou gabarito QC fictícios. A proibição de resolver para definir gabarito aplica-se às reais; nas autorais, elabore e revise a correta com fundamento verificável. Mantenha reais e autorais identificadas e conte-as separadamente.

# JUSTIFICATIVAS COMPLETAS, APÓS CORRIGIR
Para CADA alternativa, certa ou errada: conclusão, regra aplicável, aplicação ao caso e motivo específico do acerto/erro; na errada, identifique o trecho defeituoso e a formulação correta. Em C/E, explique o julgamento e a correção da assertiva quando errada. Não basta repetir o gabarito, dizer “incorreta” ou citar artigo sem explicar. Não criar aula geral: aprofundar o necessário para compreender cada opção. Confira lei/jurisprudência vigente e referências; nunca invente dispositivos, decisões ou comentários.
Separar “Justificativa — QConcursos” (síntese fiel confirmada, sem copiar comentário longo) de “Explicação complementar — Agente”. Falta de comentário QC: declarar “Justificativa do QConcursos não confirmada.” e produzir a análise complementar verificável sem alterar o gabarito QC. justificativas_alternativas deve conter A–E ou C/E, com texto explicativo para cada opção.

# ENTREGA E FUNCIONAMENTO
Os controles Marcar e Riscar/Desriscar devem permanecer AO LADO do texto de cada alternativa, nunca numa faixa acima dele, inclusive no celular. Use sempre os grifos da referência: Amarelo #ffe580, Verde #a3e9b2, Azul #a9d9ff e Rosa #ffb9dd, nessa ordem; os botões e o texto grifado usam exatamente essas cores. Não substituir a paleta.
Entregue um HTML autônomo e funcional com CSS/JS incorporados, usando o modelo abaixo. Preencha SOMENTE o JSON no elemento training-data; preserve o comportamento dos controles. Nada de prévia estática ou botão decorativo. Numere cartões e exiba disciplina, tema, banca, ano, cargo, Q/link verificável ou selo autoral. Textos íntegros, sem line-clamp, truncamento ou alturas que escondam conteúdo.
Paleta de cores e remover grifo sticky no topo de CADA cartão durante toda sua rolagem; preserve seleção ao clicar na cor, contraste e uso no celular. Riscar alternativa não seleciona resposta. Grifos/riscos não alteram o texto exportado. Selecionar resposta não revela correta; somente CORRIGIR QUESTÃO ou CORRIGIR TODAS revela gabarito e todas as justificativas. Não respondidas não são erros. Placar calcula % só sobre corrigidas.
Dois downloads SEMPRE disponíveis: GUARDAR TREINO COMPLETO (todas, mesmo sem resposta, com gabarito e justificativas integrais) e EXPORTAR CORRIGIDAS (somente corrigidas). A exportação completa contém corrigida=false, resposta_marcada="", resultado="NAO_RESPONDIDA" para as intocadas; respondidas não corrigidas usam RESPONDIDA_SEM_CORRECAO e sua marcação. Nunca invente desempenho. JSON completo pode revelar gabaritos ao ser aberto; mantê-los ocultos na interface até correção. Reabrir HTML ou importar JSON deve restaurar respostas, correções e anotações.
Use estes metadados em AMBAS as exportações: ${JSON.stringify(metadata)}.
Cada questionBank[]: id, disciplina, assunto, tema, syllabusItemId, banca, banca_estilo, ano, orgao, cargo, tipo, enunciado, alternativas, gabarito, resposta_correta, resposta_marcada, corrigida, resultado, fonte, origem_tipo, link, justificativa_qconcursos, explicacao_complementar, justificativas_alternativas, trainingRoundId. Disciplina/assunto/tema devem conservar o vínculo com esta rodada. Reais: origem_tipo="qconcursos"; autorais: "autoral". gabarito=resposta_correta. Múltipla escolha: alternativas A–E integrais; C/E: alternativas={}, gabarito C ou E. Mantenha justificativas como texto, sem HTML executável. Não coloque URLs javascript: ou código recebido das páginas nos dados.
Antes de entregar, validar contagem, exclusões, fonte e íntegra, gabarito QC nas reais, selo nas autorais, justificativas de cada opção, seleção/grifo, correção e ambos os JSONs. Inclua um balanço de reais/autorais/descartadas e códigos Q confirmados.
`;
    return {config:c,metadata,excluded,instruction,roundId};
  }
  function validatePayload(payload) {
    if(payload?.schema!==SCHEMA)return;
    const questions=sourceItems(payload); if(!questions.length)throw Error('Treino sem questões.');
    const config=(payload.trainingRound||payload.metadata?.trainingRound)?.config;
    if(config?.count&&questions.length>config.count)throw Error('O treino excede a quantidade solicitada.');
    const seen=new Set();
    for(const q of questions){
      if(typeof q.corrigida!=='boolean')throw Error(`Informe se a questão foi corrigida: ${q.id}`);
      if(!text(q.id)||seen.has(qid(q.id)))throw Error('Código ausente ou repetido no treino.');seen.add(qid(q.id));
      if(!text(q.enunciado))throw Error(`Enunciado ausente: ${q.id}`);
      const choices=Object.keys(q.alternativas||{}); const keys=choices.length?choices:['C','E'];
      if(!keys.includes(q.gabarito)||q.resposta_correta!==q.gabarito)throw Error(`Gabarito inconsistente: ${q.id}`);
      if(keys.some(k=>typeof q.justificativas_alternativas?.[k]!=='string'||!text(q.justificativas_alternativas[k])))throw Error(`Faltam justificativas por alternativa: ${q.id}`);
      if(choices.some(k=>!text(q.alternativas[k])))throw Error(`Alternativa vazia: ${q.id}`);
      if(q.origem_tipo==='autoral'){
        if(config?.allowGenerated===false)throw Error('A rodada não autoriza questões criadas pelo agente.');
        if(!text(q.id).startsWith('AGENTE-')||q.fonte!=='Agente'||q.banca!=='Autoral')throw Error(`Identifique a questão criada pelo agente: ${q.id}`);
      } else if(q.origem_tipo!=='qconcursos'||!/^Q\d+$/.test(qid(q.id))||q.fonte!=='QConcursos')throw Error(`Fonte da questão real inconsistente: ${q.id}`);
      if(q.corrigida===true&&(!keys.includes(q.resposta_marcada)||q.resultado!==(q.resposta_marcada===q.gabarito?'ACERTEI':'ERREI')))throw Error(`Resultado inconsistente: ${q.id}`);
    }
  }
  function importEvents(payload, plan, existing=[]) {
    const round=payload?.trainingRound || payload?.metadata?.trainingRound;
    const groups=new Map();
    for(const raw of sourceItems(payload)){
      const stored=plan.bank.find(q=>qid(q.id)===qid(raw.id)) || plan.bank.find(q=>contentKey(q)===contentKey(raw)) || raw;
      const ctx=round?.theme ? round : topic(stored); const key=topicKey(ctx);
      if(!groups.has(key))groups.set(key,{...topic(ctx),topicKey:key,questionIds:[],rows:[]});
      groups.get(key).questionIds.push(qid(stored.id));
      groups.get(key).rows.push([qid(stored.id),stored.enunciado,stored.gabarito,raw.resposta_marcada||'',raw.corrigida,raw.resultado,raw.justificativas_alternativas]);
    }
    return [...groups.values()].map(g=>({id:`qimport-${hash(JSON.stringify([g.topicKey,round?.id||'',g.rows.sort((a,b)=>a[0].localeCompare(b[0]))]))}`,
      kind:'import',topicKey:g.topicKey,discipline:g.discipline,theme:g.theme,roundId:round?.id||'',createdAt:new Date().toISOString(),
      questionIds:[...new Set(g.questionIds)]})).filter(e=>!existing.some(old=>old.id===e.id));
  }
  function recordImport(state,payload,plan){
    const events=importEvents(payload,plan,state.questionTrainingEvents||[]);
    if(events.length)state.questionTrainingEvents=[...(state.questionTrainingEvents||[]),...events];
    return events;
  }
  // V622: a tela pede os contadores de dezenas de temas numa mesma passada. Sem
  // o índice, cada tema varria o banco inteiro e todas as sessões (0,2–0,5 s por
  // abertura do Plano do Dia ou da Fábrica). O índice vale só para essa passada.
  function statsIndex(state){
    const bank=state.questionBank||[],byTopic=new Map(),byQid=new Map();
    const push=(map,key,i)=>{const list=map.get(key);if(list)list.push(i);else map.set(key,[i]);};
    bank.forEach((q,i)=>{push(byTopic,topicKey(q),i);push(byQid,qid(q.id),i);});
    const answered=new Set((state.questionBankSessions||[]).flatMap(s=>s.items||[]).filter(q=>['certo','errado'].includes(q.status)).map(q=>qid(q.id)));
    return {state,bank,byTopic,byQid,answered};
  }
  function stats(state,ctx,index){
    const key=topicKey(ctx),events=(state.questionTrainingEvents||[]).filter(e=>e.topicKey===key);
    const importedIds=new Set(events.filter(e=>e.kind==='import').flatMap(e=>e.questionIds||[]));
    const indexed=Boolean(index&&index.state===state&&index.bank===state.questionBank);
    const matched=indexed
      ?[...new Set([...(index.byTopic.get(key)||[]),...[...importedIds].flatMap(id=>index.byQid.get(id)||[])])].sort((a,b)=>a-b).map(i=>index.bank[i])
      :(state.questionBank||[]).filter(q=>topicKey(q)===key||importedIds.has(qid(q.id)));
    const questions=[...new Map(matched.map(q=>[qid(q.id),q])).values()];
    const answered=indexed?index.answered:new Set((state.questionBankSessions||[]).flatMap(s=>s.items||[]).filter(q=>['certo','errado'].includes(q.status)).map(q=>qid(q.id)));
    const done=questions.filter(q=>corrected(q)||answered.has(qid(q.id))).length;
    const waiting=questions.filter(q=>!corrected(q)&&!answered.has(qid(q.id))&&/^[A-E]$/.test(q.resposta_marcada||q.respostaMarcada||'')).length;
    return {prompts:events.filter(e=>e.kind==='prompt').length,imports:events.filter(e=>e.kind==='import').length,questions:questions.length,corrected:done,pending:questions.length-done-waiting,waiting,
      generated:questions.filter(q=>q.origem_tipo==='autoral').length};
  }
  function label(s){return `${s.prompts} prompt(s) · ${s.imports} importação(ões) · ${s.questions} questões únicas · ${s.corrected} corrigidas · ${s.pending} a responder${s.waiting?` · ${s.waiting} aguardando correção`:''}${s.generated?` · ${s.generated} autorais`:''}`;}
  const api={SCHEMA,canon,qid,topic,topicKey,exclusions,normalizeConfig,prompt,validatePayload,importEvents,recordImport,stats,statsIndex,label,esc,explanation};
  globalThis.AldusQuestionTraining=api;
  if(typeof module!=='undefined')module.exports=api;
})();
