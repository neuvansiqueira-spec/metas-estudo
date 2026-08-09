(() => {
  "use strict";
  const VERSION = "20260808-factory-schedule-filters-v279";
  const FLAG = "__ALDUS_FACTORY_SCHEDULE_FILTERS_V279__";
  if (globalThis[FLAG]) return;

  let selectedDate = "";
  let selectedDiscipline = "";
  let selectedTheme = "";
  let searchText = "";
  let installed = false;

  const canon = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
  const esc = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const fmt = (date) => { try { return formatDateBR(date); } catch { const [y,m,d]=String(date).split("-"); return y&&m&&d?`${d}/${m}/${y}`:String(date||""); } };

  function dates() {
    const api = globalThis.__ALDUS_FACTORY_SCHEDULE_SCOPE_V277__;
    return Array.isArray(api?.scheduleDates?.()) ? api.scheduleDates() : [];
  }
  function disciplineOf(entry={}) { return String(entry?.item?.editalLink?.discipline || entry?.item?.disciplina || entry?.item?.discipline || "").trim(); }
  function themeOf(entry={}) { return String(entry?.item?.editalLink?.subject || entry?.item?.tema || entry?.item?.subject || entry?.item?.assunto || "").trim(); }

  function metadata() {
    const agenda = typeof ensureFactoryAgenda === "function" ? ensureFactoryAgenda().filter((i)=>i?.editalActive!==false) : [];
    const map = new Map();
    const allDates = dates();
    allDates.forEach((date) => {
      let entries=[];
      try { entries = factoryQueueForDate(date, agenda) || []; } catch {}
      entries.forEach((entry) => {
        try { if (typeof factoryResumoAulaPending === "function" && !factoryResumoAulaPending(entry)) return; } catch {}
        const id=String(entry?.item?.id||entry?.id||""); if(!id) return;
        const current = map.get(id) || { id, entry, dates: [] };
        if (!current.dates.includes(date)) current.dates.push(date);
        map.set(id,current);
      });
    });
    const values=[...map.values()];
    return {
      map,
      dates: [...new Set(values.flatMap((x)=>x.dates))].sort(),
      disciplines:[...new Set(values.map((x)=>disciplineOf(x.entry)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")),
      themes:[...new Set(values.map((x)=>themeOf(x.entry)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"))
    };
  }

  function options(values, selected, allLabel, formatter=(v)=>v) {
    return `<option value="">${esc(allLabel)}</option>` + values.map((v)=>`<option value="${esc(v)}"${v===selected?" selected":""}>${esc(formatter(v))}</option>`).join("");
  }

  function annotate(root, meta) {
    const byTheme = new Map([...meta.map.values()].map((x)=>[canon(themeOf(x.entry)),x]));
    root.querySelectorAll("article.factory-card").forEach((card)=>{
      const id=String(card.dataset.factoryCard||"");
      const title=canon(card.querySelector(".factory-theme-title")?.textContent || card.querySelector("h3")?.textContent || "");
      const item=meta.map.get(id)||byTheme.get(title); if(!item) return;
      card.dataset.scheduleDates=item.dates.join(",");
      card.dataset.scheduleDiscipline=disciplineOf(item.entry);
      card.dataset.scheduleTheme=themeOf(item.entry);
    });
    root.querySelectorAll(".factory-today-queue li").forEach((li)=>{
      const id=String(li.querySelector("[data-factory-toggle-detail]")?.dataset?.factoryToggleDetail||"");
      const item=meta.map.get(id); if(!item) return;
      li.dataset.scheduleDates=item.dates.join(",");
      li.dataset.scheduleDiscipline=disciplineOf(item.entry);
      li.dataset.scheduleTheme=themeOf(item.entry);
    });
  }

  function matches(node) {
    const nodeDates=String(node.dataset.scheduleDates||"").split(",").filter(Boolean);
    if(selectedDate && !nodeDates.includes(selectedDate)) return false;
    if(selectedDiscipline && canon(node.dataset.scheduleDiscipline)!==canon(selectedDiscipline)) return false;
    if(selectedTheme && canon(node.dataset.scheduleTheme)!==canon(selectedTheme)) return false;
    if(searchText && !canon(node.textContent).includes(canon(searchText))) return false;
    return true;
  }

  function apply(root) {
    const nodes=root.querySelectorAll(".factory-today-plan article.factory-card,.factory-today-queue li,.factory-section article.factory-card");
    nodes.forEach((node)=>node.hidden=!matches(node));
    const queueItems=[...root.querySelectorAll(".factory-today-queue ol > li")];
    const visible=queueItems.filter((x)=>!x.hidden).length;
    const count=root.querySelector(".factory-today-queue summary small"); if(count) count.textContent=String(visible);
    let empty=root.querySelector(".factory-filter-empty-v279");
    if(queueItems.length && !visible){ if(!empty){ empty=document.createElement("p"); empty.className="empty-message factory-filter-empty-v279"; empty.textContent="Nenhum tema corresponde aos filtros selecionados."; root.querySelector(".factory-today-queue .factory-collapsible-content")?.appendChild(empty); } }
    else empty?.remove();
  }

  function renderTools(root, meta) {
    root.querySelector(":scope > .factory-schedule-tools-v277")?.remove();
    let box=root.querySelector(":scope > .factory-schedule-filters-v279");
    if(!box){ box=document.createElement("section"); box.className="factory-schedule-filters-v279 notice"; root.prepend(box); }
    box.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end">
      <label><strong>Data</strong><select data-v279-date>${options(meta.dates,selectedDate,"Todas as datas",fmt)}</select></label>
      <label><strong>Disciplina</strong><select data-v279-discipline>${options(meta.disciplines,selectedDiscipline,"Todas as disciplinas")}</select></label>
      <label><strong>Tema</strong><select data-v279-theme>${options(meta.themes,selectedTheme,"Todos os temas")}</select></label>
      <label><strong>Busca livre</strong><input data-v279-search type="search" placeholder="Disciplina, assunto ou tema" value="${esc(searchText)}"></label>
    </div><div class="card-actions" style="margin-top:10px"><button type="button" class="secondary-button" data-v279-clear>Limpar filtros</button></div>`;
    box.querySelector("[data-v279-date]")?.addEventListener("change",e=>{selectedDate=e.target.value;apply(root);});
    box.querySelector("[data-v279-discipline]")?.addEventListener("change",e=>{selectedDiscipline=e.target.value;apply(root);});
    box.querySelector("[data-v279-theme]")?.addEventListener("change",e=>{selectedTheme=e.target.value;apply(root);});
    box.querySelector("[data-v279-search]")?.addEventListener("input",e=>{searchText=e.target.value;apply(root);});
    box.querySelector("[data-v279-clear]")?.addEventListener("click",()=>{selectedDate=selectedDiscipline=selectedTheme=searchText=""; enhance();});
  }

  function enhance() {
    let active=false; try { active=factoryProductionScope==="schedule"; } catch {}
    if(!active) return;
    const root=document.getElementById("factoryList"); if(!root) return;
    const meta=metadata(); annotate(root,meta); renderTools(root,meta); apply(root);
  }

  function install() {
    if(installed) return true;
    if(!globalThis.__ALDUS_FACTORY_SCHEDULE_SCOPE_V277__ || typeof renderFactory!=="function") return false;
    const original=renderFactory;
    renderFactory=function renderFactoryV279(...args){ const result=original.apply(this,args); queueMicrotask(enhance); return result; };
    document.addEventListener("click",(e)=>{ if(e.target.closest?.('[data-production-scope="schedule"]')) setTimeout(enhance,0); },false);
    installed=true;
    globalThis[FLAG]=Object.freeze({version:VERSION,installedAt:new Date().toISOString()});
    enhance(); return true;
  }
  if(!install()){
    const timer=setInterval(()=>{ if(install()) clearInterval(timer); },120);
    setTimeout(()=>clearInterval(timer),15000);
  }
})();
