(() => {
  "use strict";
  const VERSION="20260808-factory-schedule-planning-preview-filters-v280";
  const FLAG="__ALDUS_FACTORY_SCHEDULE_FILTERS_V280__";
  if(globalThis[FLAG]) return;

  let selectedDate="",selectedDiscipline="",selectedTheme="",searchText="",installed=false,planCache=null,originalQueue=null;
  const canon=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const fmt=date=>{try{return formatDateBR(date)}catch{const[y,m,d]=String(date).split("-");return y&&m&&d?`${d}/${m}/${y}`:String(date||"")}};
  const st=()=>{try{return state}catch{return globalThis.state}};
  const today=()=>{try{return todayISO()}catch{const d=new Date(),x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}};
  const gd=(g={})=>{try{return String(goalDateValue(g)||"").slice(0,10)}catch{return String(g.date||g.data||"").slice(0,10)}};
  const plus=(date,n)=>{try{return addDays(date,n)}catch{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}};
  const dd=(a,b)=>{try{return daysDiff(a,b)}catch{return Math.round((new Date(`${a}T12:00:00`)-new Date(`${b}T12:00:00`))/86400000)}};
  const isStudy=g=>{try{return isPlanningStudyGoal(g)}catch{return true}};
  const disciplineOf=(entry={})=>String(entry?.item?.editalLink?.discipline||entry?.item?.disciplina||entry?.item?.discipline||"").trim();
  const themeOf=(entry={})=>String(entry?.item?.editalLink?.subject||entry?.item?.tema||entry?.item?.subject||entry?.item?.assunto||"").trim();

  function planningEndDate(){
    const s=st(),t=today(),list=[];
    try{const p=typeof contestPlanningProfile==="function"?contestPlanningProfile(s,t):null;if(p?.examDate)list.push(String(p.examDate).slice(0,10))}catch{}
    try{const c=typeof planningConfig==="function"?planningConfig(s):s?.planning?.config;if(c?.examDate)list.push(String(c.examDate).slice(0,10))}catch{}
    if(s?.edital?.examDate)list.push(String(s.edital.examDate).slice(0,10));
    (s?.dailyGoals||[]).forEach(g=>{const d=gd(g);if(d>=t)list.push(d)});
    return list.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=t).sort().at(-1)||plus(t,90);
  }
  function horizon(){const t=today(),n=Math.min(366,Math.max(1,dd(planningEndDate(),t)+1));return Array.from({length:n},(_,i)=>plus(t,i))}
  function reserve(set,goals){try{return reserveGeneratedSyllabus(set,goals)}catch{};(goals||[]).forEach(g=>{const k=g.syllabusItemId||g.id;if(k)set.add(k)})}
  function pending(entries){return(entries||[]).filter(e=>{try{return typeof factoryResumoAulaPending!=="function"||factoryResumoAulaPending(e)}catch{return true}})}
  function queueWithGoals(date,goals,agenda){const s=st(),before=s.dailyGoals;try{s.dailyGoals=[...(before||[]),...(goals||[])];return originalQueue(date,agenda)||[]}finally{s.dailyGoals=before}}

  function buildPlan(agenda=ensureFactoryAgenda(),force=false){
    if(planCache&&!force)return planCache;
    const s=st(),active=(agenda||[]).filter(i=>i?.editalActive!==false),all=horizon(),set=new Set(all),saved=new Map();
    (s?.dailyGoals||[]).forEach(g=>{const d=gd(g);if(!set.has(d)||!isStudy(g))return;if(!saved.has(d))saved.set(d,[]);saved.get(d).push(g)});
    let score=null;try{score=buildPlanningScoreContext(s)}catch{}
    const reserved=new Set();[...saved.values()].forEach(gs=>reserve(reserved,gs));
    const byDate=new Map(),preview=[],dates=[];
    for(const date of all){
      const savedGoals=saved.get(date)||[];let entries=[],generated=[];
      if(savedGoals.length){try{entries=originalQueue(date,active)||[]}catch{}}
      else{
        let targets={topics:0,disciplines:0};try{targets=planningTargetsForDate(date,s)}catch{}
        if(Number(targets?.topics)<=0)continue;
        try{
          const selected=weeklyPlanGoalsForDate(date,Number(targets.disciplines)||1,score,reserved)||[];
          generated=selected.map((g,i)=>({...g,id:g.id||`factory-preview-v280-${date}-${i}-${g.syllabusItemId||"goal"}`,date,data:date,status:g.status||"Pendente",origin:g.origin||"planejamento-preview",origem:g.origem||"planejamento-preview",__factorySchedulePreviewV280:true}));
          reserve(reserved,generated);entries=queueWithGoals(date,generated,active);
        }catch(err){console.warn(`[${VERSION}] Falha ao calcular prévia de ${date}.`,err)}
      }
      entries=pending(entries).map(e=>({...e,sourceDate:date,schedulePreview:!savedGoals.length}));
      if(entries.length){byDate.set(date,entries);dates.push(date);preview.push(...generated)}
    }
    return planCache={byDate,dates,preview,end:planningEndDate(),builtAt:Date.now()};
  }

  function installPlanningPreview(){
    const api=globalThis.__ALDUS_FACTORY_SCHEDULE_SCOPE_V277__;
    if(!api||typeof renderFactory!=="function"||typeof factoryQueueForDate!=="function"||typeof weeklyPlanGoalsForDate!=="function"||typeof planningTargetsForDate!=="function")return false;
    originalQueue=factoryQueueForDate;const originalRender=renderFactory;
    factoryQueueForDate=function(date,agenda=ensureFactoryAgenda()){
      let active=false;try{active=factoryProductionScope==="schedule"}catch{}
      if(!active)return originalQueue.apply(this,arguments);
      return buildPlan(agenda).byDate.get(String(date||"").slice(0,10))||[];
    };
    renderFactory=function(...args){
      let active=false;try{active=factoryProductionScope==="schedule"}catch{}
      if(!active)return originalRender.apply(this,args);
      planCache=null;const plan=buildPlan(ensureFactoryAgenda(),true),s=st(),before=s.dailyGoals;
      try{s.dailyGoals=[...(before||[]),...plan.preview];return originalRender.apply(this,args)}finally{s.dailyGoals=before}
    };
    globalThis.__ALDUS_FACTORY_SCHEDULE_SCOPE_V277__=Object.freeze({...api,version:VERSION,scheduleDates:()=>[...buildPlan().dates],scheduleQueue:(agenda,dates=buildPlan(agenda).dates)=>{const p=buildPlan(agenda),seen=new Set(),out=[];(dates||[]).forEach(d=>(p.byDate.get(d)||[]).forEach(e=>{const id=String(e?.item?.id||e?.id||"");if(!id||seen.has(id))return;seen.add(id);out.push({...e,sourceDate:d})}));return out},buildSchedulePlan:buildPlan});
    return true;
  }

  function metadata(){
    const plan=buildPlan();const map=new Map();
    plan.dates.forEach(date=>(plan.byDate.get(date)||[]).forEach(entry=>{
      const id=String(entry?.item?.id||entry?.id||"");if(!id)return;const cur=map.get(id)||{id,entry,dates:[]};if(!cur.dates.includes(date))cur.dates.push(date);map.set(id,cur);
    }));
    const values=[...map.values()];
    return{map,dates:[...new Set(values.flatMap(x=>x.dates))].sort(),disciplines:[...new Set(values.map(x=>disciplineOf(x.entry)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")),themes:[...new Set(values.map(x=>themeOf(x.entry)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"))};
  }
  function options(values,selected,allLabel,formatter=v=>v){return`<option value="">${esc(allLabel)}</option>`+values.map(v=>`<option value="${esc(v)}"${v===selected?" selected":""}>${esc(formatter(v))}</option>`).join("")}
  function annotate(root,meta){
    const byTheme=new Map([...meta.map.values()].map(x=>[canon(themeOf(x.entry)),x]));
    root.querySelectorAll("article.factory-card").forEach(card=>{const id=String(card.dataset.factoryCard||""),title=canon(card.querySelector(".factory-theme-title")?.textContent||card.querySelector("h3")?.textContent||""),item=meta.map.get(id)||byTheme.get(title);if(!item)return;card.dataset.scheduleDates=item.dates.join(",");card.dataset.scheduleDiscipline=disciplineOf(item.entry);card.dataset.scheduleTheme=themeOf(item.entry)});
    root.querySelectorAll(".factory-today-queue li").forEach(li=>{const id=String(li.querySelector("[data-factory-toggle-detail]")?.dataset?.factoryToggleDetail||""),item=meta.map.get(id);if(!item)return;li.dataset.scheduleDates=item.dates.join(",");li.dataset.scheduleDiscipline=disciplineOf(item.entry);li.dataset.scheduleTheme=themeOf(item.entry)});
  }
  function matches(node){const ds=String(node.dataset.scheduleDates||"").split(",").filter(Boolean);if(selectedDate&&!ds.includes(selectedDate))return false;if(selectedDiscipline&&canon(node.dataset.scheduleDiscipline)!==canon(selectedDiscipline))return false;if(selectedTheme&&canon(node.dataset.scheduleTheme)!==canon(selectedTheme))return false;if(searchText&&!canon(node.textContent).includes(canon(searchText)))return false;return true}
  function apply(root){const nodes=root.querySelectorAll(".factory-today-plan article.factory-card,.factory-today-queue li,.factory-section article.factory-card");nodes.forEach(n=>n.hidden=!matches(n));const items=[...root.querySelectorAll(".factory-today-queue ol > li")],visible=items.filter(x=>!x.hidden).length,count=root.querySelector(".factory-today-queue summary small");if(count)count.textContent=String(visible);let empty=root.querySelector(".factory-filter-empty-v280");if(items.length&&!visible){if(!empty){empty=document.createElement("p");empty.className="empty-message factory-filter-empty-v280";empty.textContent="Nenhum tema corresponde aos filtros selecionados.";root.querySelector(".factory-today-queue .factory-collapsible-content")?.appendChild(empty)}}else empty?.remove()}
  function renderTools(root,meta){
    root.querySelector(":scope > .factory-schedule-tools-v277")?.remove();root.querySelector(":scope > .factory-schedule-filters-v279")?.remove();root.querySelector(":scope > .factory-schedule-filters-v280")?.remove();
    const box=document.createElement("section");box.className="factory-schedule-filters-v280 notice";root.prepend(box);
    box.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end"><label><strong>Data</strong><select data-v280-date>${options(meta.dates,selectedDate,"Todas as datas",fmt)}</select></label><label><strong>Disciplina</strong><select data-v280-discipline>${options(meta.disciplines,selectedDiscipline,"Todas as disciplinas")}</select></label><label><strong>Tema</strong><select data-v280-theme>${options(meta.themes,selectedTheme,"Todos os temas")}</select></label><label><strong>Busca livre</strong><input data-v280-search type="search" placeholder="Disciplina, assunto ou tema" value="${esc(searchText)}"></label></div><div class="card-actions" style="margin-top:10px"><button type="button" class="secondary-button" data-v280-clear>Limpar filtros</button></div>`;
    box.querySelector("[data-v280-date]")?.addEventListener("change",e=>{selectedDate=e.target.value;apply(root)});box.querySelector("[data-v280-discipline]")?.addEventListener("change",e=>{selectedDiscipline=e.target.value;apply(root)});box.querySelector("[data-v280-theme]")?.addEventListener("change",e=>{selectedTheme=e.target.value;apply(root)});box.querySelector("[data-v280-search]")?.addEventListener("input",e=>{searchText=e.target.value;apply(root)});box.querySelector("[data-v280-clear]")?.addEventListener("click",()=>{selectedDate=selectedDiscipline=selectedTheme=searchText="";enhance()});
  }
  function enhance(){let active=false;try{active=factoryProductionScope==="schedule"}catch{}if(!active)return;const root=document.getElementById("factoryList");if(!root)return;const meta=metadata();annotate(root,meta);renderTools(root,meta);apply(root);const notice=root.querySelector(".factory-scope-notice");if(notice&&meta.dates.length)notice.textContent=`Cronograma: metas salvas e prévias do Planejamento de ${fmt(meta.dates[0])} a ${fmt(meta.dates.at(-1))}. A prévia não é gravada como meta ao produzir o material.`}

  function install(){
    if(installed)return true;if(!installPlanningPreview())return false;
    const original=renderFactory;renderFactory=function(...args){const result=original.apply(this,args);queueMicrotask(enhance);return result};
    document.addEventListener("click",e=>{if(e.target.closest?.('[data-production-scope="schedule"]')){planCache=null;setTimeout(enhance,0)}},false);
    installed=true;globalThis[FLAG]=Object.freeze({version:VERSION,buildPlan,installedAt:new Date().toISOString()});enhance();return true;
  }
  if(!install()){const timer=setInterval(()=>{if(install())clearInterval(timer)},120);setTimeout(()=>clearInterval(timer),15000)}
})();