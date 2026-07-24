(() => {
  if (window.__aldusFactoryExecutiveUiV136) return;
  window.__aldusFactoryExecutiveUiV136 = true;

  const VERSION = "20260724-fabrica-executiva-v136";
  const root = document.getElementById("view-fabrica-resumos");
  if (!root) return;

  const FLOW_FILTERS = {
    pending: ["faca-agora", "fila-hoje", "aguardando-triagem", "resumo-aula", "todos"],
    production: ["em-producao"],
    review: ["aguardando-revisao", "precisa-refazer"],
    ready: ["prontos"]
  };

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
  }

  function ensureStyles() {
    if (document.getElementById("factoryExecutiveStylesV136")) return;
    const style = document.createElement("style");
    style.id = "factoryExecutiveStylesV136";
    style.textContent = `
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos{--fx-line:rgba(116,177,220,.24);--fx-line2:rgba(116,177,220,.44);--fx-surface:rgba(5,29,48,.86);--fx-text:#f5f9fc;--fx-muted:#b8cedd;--fx-accent:#69b7ea;--fx-gold:#e8c96d}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos>.section-heading{margin-bottom:4px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos>.section-heading h2{margin-bottom:6px!important;font-size:clamp(1.65rem,2.4vw,2rem)!important;letter-spacing:-.025em}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos>.notice{max-width:980px;line-height:1.55}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary{grid-template-columns:minmax(390px,2.25fr) repeat(3,minmax(118px,.72fr))!important;gap:10px!important;margin-bottom:14px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary>.stat-card{min-height:112px!important;border:1px solid var(--fx-line)!important;border-radius:17px!important;background:linear-gradient(145deg,rgba(9,41,66,.92),rgba(4,26,44,.96))!important;box-shadow:0 12px 30px rgba(0,8,20,.18)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary-now{min-height:112px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary-now .factory-theme-highlight{border-left-color:var(--fx-gold)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary>.stat-card:not(.factory-summary-now){gap:8px!important;padding:14px 15px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary>.stat-card:not(.factory-summary-now)>span{color:var(--fx-muted)!important;font-size:.72rem!important;line-height:1.35}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary>.stat-card:not(.factory-summary-now)>strong{color:var(--fx-text)!important;font-size:clamp(1.8rem,2.5vw,2.2rem)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-toolbar-v136{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:14px;margin:0 0 10px;padding:14px;border:1px solid var(--fx-line);border-radius:18px;background:radial-gradient(circle at 8% 0%,rgba(105,183,234,.10),transparent 20rem),linear-gradient(145deg,rgba(7,35,57,.84),rgba(4,25,42,.94));box-shadow:0 12px 28px rgba(0,8,20,.14)}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-search-v136{display:grid;gap:6px;min-width:0;color:var(--fx-text)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-search-v136>span:first-child{color:#dceaf3;font-size:.76rem;font-weight:900;letter-spacing:.045em;text-transform:uppercase}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-search-row-v136{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos #factoryExecutiveSearchV136{min-height:46px;padding:11px 14px 11px 43px;border:1px solid rgba(118,179,222,.46)!important;border-radius:13px!important;background-color:#061f34!important;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='%238fc8eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:14px center;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos #factoryExecutiveSearchV136::placeholder{color:#9fb9ca!important;opacity:1}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos #factoryExecutiveSearchV136:focus{outline:none!important;border-color:#6db8e8!important;box-shadow:0 0 0 3px rgba(105,183,234,.20)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-search-clear-v136{width:auto!important;min-width:88px;min-height:46px;padding:10px 14px;border:1px solid var(--fx-line2)!important;border-radius:13px!important;background:rgba(8,43,69,.84)!important;color:#dcebf4!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-search-status-v136{min-height:1.1em;color:var(--fx-muted);font-size:.78rem;font-weight:700}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-actions-v136{display:flex;gap:8px;align-items:center}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-actions-v136 button{width:auto!important;min-height:46px;padding:10px 15px;border-radius:13px!important;white-space:nowrap}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-filter-toggle-v136{border:1px solid var(--fx-line2)!important;background:rgba(11,52,82,.78)!important;color:#dcebf4!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-register-toggle-v136{border:1px solid rgba(105,183,234,.54)!important;background:linear-gradient(135deg,#17679b,#11527f)!important;color:#fff!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 12px}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136 button{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;min-height:56px;padding:9px 12px;border:1px solid var(--fx-line)!important;border-radius:14px!important;background:rgba(4,27,46,.74)!important;color:#d8e7f0!important;text-align:left;box-shadow:none!important;transform:none!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136 button:hover,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136 button:focus-visible{border-color:var(--fx-line2)!important;background:rgba(8,43,69,.86)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136 button[aria-pressed="true"]{border-color:rgba(105,183,234,.66)!important;background:linear-gradient(145deg,rgba(19,81,123,.90),rgba(9,50,80,.94))!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,9,22,.18)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-dot-v136{width:10px;height:10px;border:2px solid #8db7d2;border-radius:999px;background:transparent;box-shadow:0 0 0 4px rgba(105,183,234,.08)}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136 button[aria-pressed="true"] .factory-stage-dot-v136{border-color:#dff3ff;background:#75c4f2}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-copy-v136{display:grid;gap:2px;min-width:0}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-copy-v136 strong{color:inherit;font-size:.82rem;line-height:1.2}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-copy-v136 small{color:#a9c1d1;font-size:.68rem;line-height:1.25}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-filter-panel{margin-bottom:10px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-filter-actions{display:flex!important;gap:7px!important;padding-top:2px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-filter-actions button{min-height:34px!important;padding:7px 11px!important;border:1px solid var(--fx-line)!important;background:rgba(5,31,51,.78)!important;color:#bfd2df!important;font-size:.69rem!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-filter-actions button.active{border-color:rgba(105,183,234,.62)!important;background:rgba(21,91,137,.78)!important;color:#fff!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .compact-factory-card{gap:0!important;padding:18px!important;border:1px solid var(--fx-line)!important;border-radius:18px!important;background:radial-gradient(circle at 100% 0%,rgba(105,183,234,.075),transparent 18rem),linear-gradient(150deg,rgba(5,31,51,.96),rgba(3,22,38,.98))!important;box-shadow:0 14px 34px rgba(0,7,18,.20)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-card-header{align-items:start!important;padding-bottom:14px!important;border-bottom:1px solid var(--fx-line)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-label{margin:0 0 4px!important;color:var(--fx-gold)!important;font-size:.68rem!important;font-weight:900!important;letter-spacing:.075em;text-transform:uppercase}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-title{margin:0 0 6px!important;color:#fff!important;font-size:clamp(1.35rem,2.2vw,1.8rem)!important;line-height:1.18!important;letter-spacing:-.02em}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-discipline,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-recorte,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-highlight>.item-meta{margin:2px 0!important;color:#b9cedc!important;line-height:1.42}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-status-badge{min-width:112px;justify-content:center;border:1px solid var(--fx-line2);background:rgba(10,49,77,.78)!important;color:#e4f1f8!important;white-space:nowrap}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-compact-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;margin:14px 0 12px!important;border-color:var(--fx-line)!important;background:var(--fx-line)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-compact-grid>span{min-height:58px!important;padding:10px 12px!important;background:rgba(4,27,46,.92)!important;color:#c5d7e2!important;line-height:1.35}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-compact-grid>span strong{display:block;margin-bottom:3px;color:#f2f7fa!important;font-size:.72rem;letter-spacing:.025em;text-transform:uppercase}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-progress-line{display:flex!important;align-items:center;gap:5px!important;margin:11px 0 7px!important;overflow-x:auto;scrollbar-width:thin}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-step{flex:0 0 auto;min-height:29px;padding:6px 9px!important;border:1px solid var(--fx-line)!important;border-radius:999px!important;background:rgba(4,27,46,.72)!important;color:#9fb6c6!important;font-size:.65rem!important;white-space:nowrap}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-step.done{border-color:rgba(86,184,133,.34)!important;background:rgba(30,101,69,.34)!important;color:#cef1dd!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-step.current{border-color:rgba(105,183,234,.72)!important;background:rgba(27,100,146,.68)!important;color:#fff!important;box-shadow:0 0 0 3px rgba(105,183,234,.09)}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-step.redo{border-color:rgba(232,119,119,.48)!important;background:rgba(122,39,46,.42)!important;color:#ffdadd!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-step.na{opacity:.54}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-arrow{flex:0 0 auto;color:#5f8298!important;font-size:.72rem}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-main-actions{display:grid!important;grid-template-columns:minmax(190px,1fr) auto;gap:9px!important;align-items:stretch;margin-top:13px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-main-actions>button{min-height:44px;border-radius:12px!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-primary-action{width:100%!important;border:1px solid rgba(105,183,234,.58)!important;background:linear-gradient(135deg,#176b9f,#0f5686)!important;color:#fff!important;box-shadow:0 8px 18px rgba(0,10,25,.18)!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-main-actions>.secondary-button{width:auto!important;min-width:122px;border:1px solid var(--fx-line)!important;background:rgba(7,39,63,.74)!important;color:#c9dce8!important}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-details{margin-top:12px;border-top:1px solid var(--fx-line)}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-theme-details>summary{padding:12px 2px 4px!important;color:#aec5d4!important;font-size:.72rem;letter-spacing:.055em}
html[data-aldus-theme="premium-stable"] #view-fabrica-resumos [data-factory-search-hidden-v136="true"]{display:none!important}
@media(max-width:1080px){html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary-now{grid-column:1/-1!important}}
@media(max-width:760px){html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-toolbar-v136{grid-template-columns:minmax(0,1fr);align-items:stretch}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-actions-v136,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-executive-actions-v136 button{width:100%!important}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-card-header{grid-template-columns:minmax(0,1fr)!important}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-status-badge{justify-self:start!important;min-width:0}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-main-actions{grid-template-columns:minmax(0,1fr)!important}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-main-actions>.secondary-button{width:100%!important}}
@media(max-width:520px){html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-stage-flow-v136,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-search-row-v136,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-compact-grid{grid-template-columns:minmax(0,1fr)!important}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-summary-now{grid-column:auto!important}html[data-aldus-theme="premium-stable"] #view-fabrica-resumos .factory-search-clear-v136{width:100%!important}}
@media(prefers-reduced-motion:reduce){html[data-aldus-theme="premium-stable"] #view-fabrica-resumos *,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos *:before,html[data-aldus-theme="premium-stable"] #view-fabrica-resumos *:after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;
    document.head.appendChild(style);
  }

  function ensureToolbar() {
    const tabs = root.querySelector(".factory-production-tabs");
    if (!tabs) return {};
    let toolbar = root.querySelector(".factory-executive-toolbar-v136");
    if (!toolbar) {
      toolbar = document.createElement("section");
      toolbar.className = "factory-executive-toolbar-v136";
      toolbar.dataset.factoryExecutiveVersion = VERSION;
      toolbar.setAttribute("aria-label", "Pesquisa e ações principais da Fábrica");
      toolbar.innerHTML = `<label class="factory-executive-search-v136" for="factoryExecutiveSearchV136"><span>Localizar tema</span><span class="factory-search-row-v136"><input id="factoryExecutiveSearchV136" type="search" autocomplete="off" spellcheck="false" placeholder="Pesquisar disciplina, tema, etapa ou palavra-chave..." aria-describedby="factoryExecutiveSearchStatusV136"><button type="button" class="factory-search-clear-v136" data-factory-search-clear-v136 hidden>Limpar</button></span><small id="factoryExecutiveSearchStatusV136" class="factory-search-status-v136" aria-live="polite">Pesquise na lista atualmente exibida.</small></label><div class="factory-executive-actions-v136" aria-label="Ações rápidas da Fábrica"><button type="button" class="factory-filter-toggle-v136" data-factory-command-v136="filters" aria-expanded="false">Filtros</button><button type="button" class="factory-register-toggle-v136" data-factory-command-v136="register" aria-expanded="false">+ Novo tema</button></div>`;
      tabs.before(toolbar);
    }
    let flow = root.querySelector(".factory-stage-flow-v136");
    if (!flow) {
      flow = document.createElement("nav");
      flow.className = "factory-stage-flow-v136";
      flow.dataset.factoryExecutiveVersion = VERSION;
      flow.setAttribute("aria-label", "Fluxo de produção da Fábrica");
      flow.innerHTML = `<button type="button" data-factory-flow-v136="pending" data-factory-target-filter-v136="fila-hoje" aria-pressed="false"><span class="factory-stage-dot-v136" aria-hidden="true"></span><span class="factory-stage-copy-v136"><strong>Pendentes</strong><small>Fila do período</small></span></button><button type="button" data-factory-flow-v136="production" data-factory-target-filter-v136="em-producao" aria-pressed="false"><span class="factory-stage-dot-v136" aria-hidden="true"></span><span class="factory-stage-copy-v136"><strong>Em produção</strong><small>Trabalho iniciado</small></span></button><button type="button" data-factory-flow-v136="review" data-factory-target-filter-v136="aguardando-revisao" aria-pressed="false"><span class="factory-stage-dot-v136" aria-hidden="true"></span><span class="factory-stage-copy-v136"><strong>Revisão</strong><small>Conferir ou refazer</small></span></button><button type="button" data-factory-flow-v136="ready" data-factory-target-filter-v136="prontos" aria-pressed="false"><span class="factory-stage-dot-v136" aria-hidden="true"></span><span class="factory-stage-copy-v136"><strong>Prontos</strong><small>Materiais disponíveis</small></span></button>`;
      toolbar.after(flow);
    }
    return { toolbar, flow };
  }

  function targets() {
    const set = new Set(root.querySelectorAll("#factoryList .compact-factory-card"));
    root.querySelectorAll("#factoryList .factory-queue-item").forEach((item) => set.add(item.closest("li") || item));
    return [...set];
  }

  function applySearch() {
    const input = root.querySelector("#factoryExecutiveSearchV136");
    const clear = root.querySelector("[data-factory-search-clear-v136]");
    const status = root.querySelector("#factoryExecutiveSearchStatusV136");
    if (!input || !status) return;
    const query = normalize(input.value);
    let visible = 0;
    targets().forEach((target) => {
      const match = !query || normalize(target.textContent).includes(query);
      target.dataset.factorySearchHiddenV136 = String(!match);
      if (match) visible += 1;
    });
    if (clear) clear.hidden = !query;
    status.textContent = !query ? "Pesquise na lista atualmente exibida." : visible
      ? `${visible} ${visible === 1 ? "resultado encontrado" : "resultados encontrados"} nesta visualização.`
      : "Nenhum tema encontrado nesta visualização. Ajuste a pesquisa ou o filtro.";
  }

  function syncUi() {
    const active = root.querySelector('[data-factory-filter][aria-pressed="true"]')?.dataset.factoryFilter || "faca-agora";
    root.querySelectorAll("[data-factory-flow-v136]").forEach((button) => {
      button.setAttribute("aria-pressed", (FLOW_FILTERS[button.dataset.factoryFlowV136] || []).includes(active) ? "true" : "false");
    });
    const filterPanel = root.querySelector(".factory-filter-panel");
    const registerPanel = root.querySelector("#factoryRegisterPanel");
    const filterButton = root.querySelector('[data-factory-command-v136="filters"]');
    const registerButton = root.querySelector('[data-factory-command-v136="register"]');
    if (filterButton && filterPanel) filterButton.setAttribute("aria-expanded", filterPanel.open ? "true" : "false");
    if (registerButton && registerPanel) {
      registerButton.setAttribute("aria-expanded", registerPanel.open ? "true" : "false");
      registerButton.textContent = registerPanel.open ? "Fechar cadastro" : "+ Novo tema";
    }
  }

  function enhancePanels() {
    const filterPanel = root.querySelector(".factory-filter-panel");
    if (filterPanel && filterPanel.dataset.factoryExecutiveV136 !== "true") {
      filterPanel.dataset.factoryExecutiveV136 = "true";
      filterPanel.open = false;
      const summary = filterPanel.querySelector(":scope > summary");
      if (summary) summary.textContent = "Filtros avançados e etapas";
      filterPanel.addEventListener("toggle", syncUi);
    }
    const registerPanel = root.querySelector("#factoryRegisterPanel");
    if (registerPanel && registerPanel.dataset.factoryExecutiveV136 !== "true") {
      registerPanel.dataset.factoryExecutiveV136 = "true";
      registerPanel.addEventListener("toggle", syncUi);
    }
    root.querySelectorAll("#factoryList .compact-factory-card").forEach((card) => card.dataset.factoryExecutiveV136 = "true");
  }

  function bind(toolbar, flow) {
    if (toolbar && toolbar.dataset.factoryExecutiveBoundV136 !== "true") {
      toolbar.dataset.factoryExecutiveBoundV136 = "true";
      toolbar.addEventListener("input", (event) => { if (event.target.id === "factoryExecutiveSearchV136") applySearch(); });
      toolbar.addEventListener("search", (event) => { if (event.target.id === "factoryExecutiveSearchV136") applySearch(); });
      toolbar.addEventListener("click", (event) => {
        if (event.target.closest("[data-factory-search-clear-v136]")) {
          const input = root.querySelector("#factoryExecutiveSearchV136");
          if (input) { input.value = ""; input.focus(); applySearch(); }
          return;
        }
        const command = event.target.closest("[data-factory-command-v136]")?.dataset.factoryCommandV136;
        const panel = command === "filters" ? root.querySelector(".factory-filter-panel") : command === "register" ? root.querySelector("#factoryRegisterPanel") : null;
        if (panel) {
          panel.open = !panel.open;
          if (panel.open) {
            panel.scrollIntoView({ behavior: "smooth", block: command === "register" ? "start" : "nearest" });
            if (command === "register") setTimeout(() => root.querySelector("#factoryDiscipline")?.focus(), 180);
          }
          syncUi();
        }
      });
    }
    if (flow && flow.dataset.factoryExecutiveBoundV136 !== "true") {
      flow.dataset.factoryExecutiveBoundV136 = "true";
      flow.addEventListener("click", (event) => {
        const filter = event.target.closest("[data-factory-target-filter-v136]")?.dataset.factoryTargetFilterV136;
        if (filter) root.querySelector(`[data-factory-filter="${CSS.escape(filter)}"]`)?.click();
      });
    }
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureStyles();
      const { toolbar, flow } = ensureToolbar();
      enhancePanels();
      bind(toolbar, flow);
      syncUi();
      applySearch();
    });
  }

  new MutationObserver(refresh).observe(root, { childList: true, subtree: true });
  root.addEventListener("click", (event) => { if (event.target.closest("[data-factory-filter], [data-factory-scope]")) refresh(); });
  refresh();
})();
