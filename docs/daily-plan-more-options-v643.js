/* V643 — "Mais opções do dia" organizada.
   Antes: aviso, botões, dois formulários quase iguais ("Escolher assunto para
   este dia" e "Adicionar meta manual"), próxima meta, revisão, JSON e números,
   tudo solto na mesma pilha. Agora: barra do dia no topo e cartões na paleta
   do Plano do Dia. Os dois formulários ficam num único cartão "Adicionar meta
   ao dia", com duas abas — as duas funções continuam, cada uma com seu botão.

   Só composição visual: move os nós existentes (com IDs e listeners do app)
   e não grava dados. */
(() => {
  "use strict";
  const VERSION = "20260928-mais-opcoes-do-dia-v643";
  const KEY = "__ALDUS_DAILY_PLAN_MORE_OPTIONS_V643__";
  const ROOT = "view-metas-do-dia";
  const MORE = "aldusDailyPlanMoreV462";
  const BOX = "aldusMoreOptionsV643";
  const STYLE = "aldusMoreOptionsStyleV643";
  const TAB_KEY = "aldusMoreOptionsTabV643";
  if (globalThis[KEY]) return;

  const TABS = [
    { key: "quick", label: "Encaixar no dia", hint: "Tempo e tipo vêm do Planejamento. Se o dia estiver cheio, você escolhe qual meta pendente sai." },
    { key: "detailed", label: "Com detalhes", hint: "Você define tipo, tempo planejado e realizado, prioridade, status e observações. É aqui também que se edita uma meta." }
  ];
  let activeTab = readTab();
  let observer, queued = false, applying = false, editWatcher;

  const byId = id => document.getElementById(id);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function setText(node, text) { if (node && node.textContent !== text) node.textContent = text; }
  function place(parent, node, before = null) {
    if (node && (node.parentNode !== parent || node.nextSibling !== before)) parent.insertBefore(node, before);
  }
  function readTab() {
    try { const saved = sessionStorage.getItem(TAB_KEY); if (TABS.some(tab => tab.key === saved)) return saved; } catch {}
    return "quick";
  }
  function writeTab(value) { try { sessionStorage.setItem(TAB_KEY, value); } catch {} }

  function card(key, title) {
    const block = make("details", "daily-plan-section aldus-v643-card");
    block.dataset.dailyPlanSection = key;
    block.dataset.defaultCollapsedV140 = "true";
    const summary = make("summary");
    const heading = make("span", "daily-plan-heading");
    heading.append(make("strong", "daily-plan-title", title), make("span", "daily-plan-resume"));
    summary.appendChild(heading);
    block.append(summary, make("div", "daily-plan-content"));
    return block;
  }

  function isEditing() {
    const cancel = byId("cancelGoalEdit");
    return Boolean(cancel && !cancel.hidden) || Boolean(byId("goalEditingId")?.value);
  }

  function selectTab(box, key, { remember = true } = {}) {
    activeTab = key;
    if (remember) writeTab(key);
    for (const button of box.querySelectorAll("[data-v643-tab]")) {
      const on = button.dataset.v643Tab === key;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    }
    for (const pane of box.querySelectorAll("[data-v643-pane]")) pane.hidden = pane.dataset.v643Pane !== key;
    updateAddResume(box);
  }

  function updateAddResume(box) {
    const add = box.querySelector('[data-daily-plan-section="more-add"]');
    if (!add) return;
    const editing = isEditing();
    add.classList.toggle("aldus-v643-editing", editing);
    setText(add.querySelector(".daily-plan-title"), editing ? "Editar meta" : "Adicionar meta ao dia");
    setText(add.querySelector(".daily-plan-resume"), editing ? "Editando" : (TABS.find(tab => tab.key === activeTab)?.label || ""));
  }

  function buildAddCard() {
    const block = card("more-add", "Adicionar meta ao dia");
    block.open = true;
    const content = block.querySelector(".daily-plan-content");
    const tabs = make("div", "aldus-v643-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Como adicionar a meta");
    for (const tab of TABS) {
      const button = make("button", "aldus-v643-tab");
      button.type = "button";
      button.dataset.v643Tab = tab.key;
      button.setAttribute("role", "tab");
      button.append(make("strong", "", tab.label), make("small", "", tab.hint));
      tabs.appendChild(button);
    }
    content.appendChild(tabs);
    for (const tab of TABS) {
      const pane = make("div", "aldus-v643-pane");
      pane.dataset.v643Pane = tab.key;
      pane.setAttribute("role", "tabpanel");
      content.appendChild(pane);
    }
    tabs.addEventListener("click", event => {
      const button = event.target?.closest?.("[data-v643-tab]");
      if (!button) return;
      const box = byId(BOX);
      if (box) selectTab(box, button.dataset.v643Tab);
    });
    tabs.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const index = TABS.findIndex(tab => tab.key === activeTab);
      const next = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].key;
      const box = byId(BOX);
      if (!box) return;
      selectTab(box, next);
      box.querySelector(`[data-v643-tab="${next}"]`)?.focus();
      event.preventDefault();
    });
    return block;
  }

  function build(extra) {
    const box = make("div", "aldus-v643-box");
    box.id = BOX;
    const toolbar = make("div", "aldus-v643-toolbar");
    toolbar.dataset.v643 = "toolbar";
    box.append(toolbar, buildAddCard(), card("more-next", "Próxima meta"));
    const review = make("div", "aldus-v643-slot");
    review.dataset.v643 = "review";
    const json = make("div", "aldus-v643-slot");
    json.dataset.v643 = "json";
    box.append(review, json, card("more-metrics", "Indicadores do dia"));
    extra.insertBefore(box, extra.firstChild);
    selectTab(box, activeTab, { remember: false });
    return box;
  }

  function openForEdit(box) {
    const more = byId(MORE);
    const add = box.querySelector('[data-daily-plan-section="more-add"]');
    if (more) more.open = true;
    if (add) add.open = true;
    selectTab(box, "detailed", { remember: false });
    const form = byId("goalForm");
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => form?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

  function watchEditing(box) {
    const cancel = byId("cancelGoalEdit");
    if (!cancel || editWatcher || typeof MutationObserver !== "function") return;
    let was = isEditing();
    editWatcher = new MutationObserver(() => {
      const now = isEditing();
      if (now && !was) openForEdit(box);
      else updateAddResume(box);
      was = now;
    });
    editWatcher.observe(cancel, { attributes: true, attributeFilter: ["hidden"] });
  }

  function apply() {
    if (applying || typeof document === "undefined") return false;
    const root = byId(ROOT);
    const extra = byId(MORE)?.querySelector(".aldus-more-content-v462");
    if (!root || !extra) return false;
    applying = true;
    observer?.disconnect();
    try {
      ensureStyle();
      const more = byId(MORE);
      more.dataset.v643 = "true";
      let box = byId(BOX);
      if (!box) box = build(extra);
      else if (box.parentNode !== extra || extra.firstChild !== box) extra.insertBefore(box, extra.firstChild);

      // Barra do dia: data exibida, botões de gerar/atualizar e a regra em uma linha.
      const toolbar = box.querySelector('[data-v643="toolbar"]');
      const banner = extra.querySelector(":scope > .selected-day-banner") || toolbar.querySelector(".selected-day-banner");
      const actions = extra.querySelector(":scope > .actions") || toolbar.querySelector(".actions");
      const notice = extra.querySelector(":scope > .notice") || toolbar.querySelector(".notice");
      let next = null;
      for (const node of [notice, actions, banner].filter(Boolean)) { place(toolbar, node, next); next = node; }

      // Os dois formulários no mesmo cartão, um por aba; os <details> de origem ficam ocultos.
      const quickPane = box.querySelector('[data-v643-pane="quick"]');
      const detailedPane = box.querySelector('[data-v643-pane="detailed"]');
      const chooseForm = byId("chooseSubjectForDayForm");
      const goalForm = byId("goalForm");
      if (chooseForm && chooseForm.parentNode !== quickPane) quickPane.appendChild(chooseForm);
      if (goalForm && goalForm.parentNode !== detailedPane) detailedPane.appendChild(goalForm);
      for (const shell of extra.querySelectorAll(":scope > details.manual-goal-panel, :scope > details.choose-subject-day-panel:not(#aldusDailyPlanQuestionImportV451)")) {
        if (!shell.querySelector("form")) shell.hidden = true;
      }

      const nextCard = box.querySelector('[data-daily-plan-section="more-next"]');
      const nextGoal = byId("nextDailyGoal");
      if (nextGoal && nextGoal.parentNode !== nextCard.querySelector(".daily-plan-content")) nextCard.querySelector(".daily-plan-content").appendChild(nextGoal);
      setText(nextCard.querySelector(".daily-plan-resume"), nextGoal?.textContent.trim() ? "" : "Nenhuma pendente");

      const reviewSlot = box.querySelector('[data-v643="review"]');
      const reviewPanel = extra.querySelector(":scope > .day-smart-review-panel") || reviewSlot.querySelector(".day-smart-review-panel");
      if (reviewPanel && reviewPanel.parentNode !== reviewSlot) reviewSlot.appendChild(reviewPanel);

      const jsonSlot = box.querySelector('[data-v643="json"]');
      const jsonPanel = byId("aldusDailyPlanQuestionImportV451");
      if (jsonPanel && jsonPanel.parentNode !== jsonSlot) jsonSlot.appendChild(jsonPanel);

      const metricsCard = box.querySelector('[data-daily-plan-section="more-metrics"]');
      const metrics = byId("aldusDailyPlanMetricsV462");
      if (metrics && metrics.parentNode !== metricsCard.querySelector(".daily-plan-content")) metricsCard.querySelector(".daily-plan-content").appendChild(metrics);
      metricsCard.hidden = !metrics?.children.length;
      setText(metricsCard.querySelector(".daily-plan-resume"), metrics?.children.length ? `${metrics.children.length} ${metrics.children.length === 1 ? "indicador" : "indicadores"}` : "");

      updateAddResume(box);
      watchEditing(box);
      return true;
    } finally {
      applying = false;
      observer?.observe(root, { childList: true, subtree: true });
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    const run = () => { queued = false; apply(); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else queueMicrotask(run);
  }

  function install() {
    if (typeof document === "undefined") return false;
    const root = byId(ROOT);
    if (!root) return false;
    if (!observer && typeof MutationObserver === "function") {
      observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true });
    }
    return apply();
  }

  function ensureStyle() {
    if (byId(STYLE)) return;
    const style = make("style");
    style.id = STYLE;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  const S = 'html[data-aldus-theme="premium-stable"] #view-metas-do-dia';
  const M = `${S} #${MORE}[data-v643]`;
  const CSS = `
/* V643 — a área segue a moldura e os cartões do Plano do Dia (V456/V462). */
${M} {
  background: rgb(8, 38, 63) !important;
  border: 1px solid rgba(133,181,220,.18) !important;
  border-radius: 18px !important;
  padding: 4px 18px !important;
  color: var(--aldus-card-text) !important;
  font: 15px/1.5 Inter, system-ui, sans-serif !important;
}
${M}[open] { padding-bottom: 18px !important; }
${M} > summary {
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  gap: 1rem !important; padding: 14px 2px !important; list-style: none !important;
  font: 700 1.06rem/1.4 Inter, system-ui, sans-serif !important; letter-spacing: -.015em !important;
  color: var(--aldus-card-text) !important; background: transparent !important; border: 0 !important; box-shadow: none !important;
}
${M} > summary::-webkit-details-marker { display: none !important; }
${M} > summary::after {
  content: "" !important; width: 9px !important; height: 9px !important;
  border-right: 2px solid var(--aldus-card-muted) !important; border-bottom: 2px solid var(--aldus-card-muted) !important;
  transform: rotate(45deg) translateY(-2px) !important; transition: transform .18s ease !important;
}
${M}[open] > summary::after { transform: rotate(-135deg) translateY(-1px) !important; }
${M} .aldus-more-content-v462 { display: grid !important; gap: 14px !important; }
${S} #${BOX} { display: grid !important; gap: 14px !important; min-width: 0 !important; }
${S} #${BOX} .aldus-v643-slot:empty { display: none !important; }

/* Barra do dia */
${S} #${BOX} .aldus-v643-toolbar {
  display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; align-items: center !important; gap: 10px 16px !important;
  padding: 14px 16px !important; border: 1px solid rgba(133,181,220,.18) !important; border-radius: 14px !important;
  background: rgba(255,255,255,.025) !important;
}
${S} #${BOX} .aldus-v643-toolbar .selected-day-banner {
  grid-column: 1 !important; grid-row: 1 !important; margin: 0 !important; padding: 0 !important;
  background: transparent !important; border: 0 !important; box-shadow: none !important;
  color: var(--aldus-card-muted) !important; font-size: .9rem !important; font-weight: 600 !important; -webkit-text-fill-color: var(--aldus-card-muted) !important;
}
${S} #${BOX} .aldus-v643-toolbar .selected-day-banner strong { color: var(--aldus-card-gold) !important; -webkit-text-fill-color: var(--aldus-card-gold) !important; font-size: 1rem !important; }
${S} #${BOX} .aldus-v643-toolbar .actions {
  grid-column: 2 !important; grid-row: 1 !important; display: flex !important; flex-wrap: wrap !important; gap: 8px !important;
  justify-content: flex-end !important; margin: 0 !important;
}
${S} #${BOX} .aldus-v643-toolbar .actions button { margin: 0 !important; }
${S} #${BOX} .aldus-v643-toolbar .notice {
  grid-column: 1 / -1 !important; grid-row: 2 !important; margin: 0 !important; padding: 0 !important;
  background: transparent !important; border: 0 !important; box-shadow: none !important;
  color: var(--aldus-card-muted) !important; font-size: .8rem !important; line-height: 1.45 !important; font-weight: 400 !important;
}

/* Cartões: mesmo tratamento dos blocos do Plano do Dia */
${S} #${BOX} details.aldus-v643-card { font: inherit !important; width: auto !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; color: var(--aldus-card-text) !important; }
${S} #${BOX} details.aldus-v643-card > summary { margin: 0 !important; min-height: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; font: inherit !important; color: var(--aldus-card-text) !important; }
${S} #${BOX} details.aldus-v643-card .daily-plan-content { display: block !important; margin: 0 !important; background: transparent !important; box-shadow: none !important; padding-top: 14px !important; }
${S} #${BOX} details.aldus-v643-card[data-daily-plan-section="more-add"] {
  --aldus-card-accent: var(--aldus-card-teal) !important; --aldus-card-border: rgba(54, 203, 192, .55) !important; --aldus-card-halo: rgba(26, 150, 141, .18) !important;
}
${S} #${BOX} details.aldus-v643-card[data-daily-plan-section="more-add"].aldus-v643-editing {
  --aldus-card-accent: var(--aldus-card-gold) !important; --aldus-card-border: rgba(242, 201, 87, .58) !important; --aldus-card-halo: rgba(199, 151, 43, .17) !important;
}
${S} #${BOX} details.aldus-v643-card[data-daily-plan-section="more-next"] {
  --aldus-card-accent: var(--aldus-card-purple) !important; --aldus-card-border: rgba(180, 111, 255, .52) !important; --aldus-card-halo: rgba(126, 70, 210, .17) !important;
}
${S} #${BOX} details.aldus-v643-card[data-daily-plan-section="more-metrics"] {
  --aldus-card-accent: var(--aldus-card-gold) !important; --aldus-card-border: rgba(242, 201, 87, .50) !important; --aldus-card-halo: rgba(199, 151, 43, .15) !important;
}

/* Abas do cartão "Adicionar meta ao dia" */
${S} #${BOX} .aldus-v643-tabs { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; margin-bottom: 16px !important; }
${S} #${BOX} .aldus-v643-tab {
  display: grid !important; gap: 3px !important; align-content: start !important; text-align: left !important;
  min-height: 0 !important; margin: 0 !important; padding: 11px 14px !important; border-radius: 12px !important;
  border: 1px solid rgba(133,181,220,.22) !important; border-left: 3px solid rgba(133,181,220,.22) !important;
  background: rgba(255,255,255,.03) !important; color: var(--aldus-card-muted) !important;
  box-shadow: none !important; cursor: pointer !important; font: inherit !important; text-transform: none !important; letter-spacing: normal !important;
  transition: border-color .15s ease, background .15s ease !important;
}
${S} #${BOX} .aldus-v643-tab strong { font-size: .95rem !important; font-weight: 700 !important; color: var(--aldus-card-text) !important; }
${S} #${BOX} .aldus-v643-tab small { font-size: .76rem !important; line-height: 1.4 !important; color: var(--aldus-card-muted) !important; font-weight: 400 !important; }
${S} #${BOX} .aldus-v643-tab:hover { border-color: var(--aldus-card-accent) !important; }
${S} #${BOX} .aldus-v643-tab[aria-selected="true"] {
  border-color: var(--aldus-card-accent) !important; border-left-color: var(--aldus-card-accent) !important;
  background: rgba(54, 203, 192, .10) !important;
}
${S} #${BOX} .aldus-v643-tab[aria-selected="true"] strong { color: var(--aldus-card-accent) !important; }
${S} #${BOX} .aldus-v643-tab:focus-visible { outline: 2px solid var(--aldus-card-accent) !important; outline-offset: 2px !important; }
${S} #${BOX} .aldus-v643-pane[hidden] { display: none !important; }
${S} #${BOX} .aldus-v643-pane form { margin: 0 !important; padding: 0 !important; background: transparent !important; border: 0 !important; box-shadow: none !important; }

/* Revisão e JSON: mesma superfície de cartão */
${S} #${BOX} .aldus-v643-slot > details {
  margin: 0 !important; border-radius: 16px !important;
}
${S} #${BOX} .aldus-v643-slot > details.day-smart-review-panel {
  border: 1px solid rgba(180, 111, 255, .52) !important;
  background: radial-gradient(circle at 9% 16%, rgba(126, 70, 210, .17) 0%, rgba(0,0,0,0) 40%), linear-gradient(145deg, var(--aldus-card-surface-a) 0%, var(--aldus-card-surface-b) 100%) !important;
  box-shadow: inset 5px 0 0 var(--aldus-card-purple), 0 13px 30px rgba(0, 7, 19, .24) !important;
  color: var(--aldus-card-text) !important;
}

@media (max-width: 700px) {
  ${M} { padding: 2px 12px !important; }
  ${S} #${BOX} .aldus-v643-toolbar { grid-template-columns: minmax(0, 1fr) !important; }
  ${S} #${BOX} .aldus-v643-toolbar .actions { grid-column: 1 !important; grid-row: 2 !important; justify-content: stretch !important; }
  ${S} #${BOX} .aldus-v643-toolbar .actions button { flex: 1 1 100% !important; }
  ${S} #${BOX} .aldus-v643-toolbar .notice { grid-row: 3 !important; }
  ${S} #${BOX} .aldus-v643-tabs { grid-template-columns: minmax(0, 1fr) !important; }
}
`;

  const api = Object.freeze({ version: VERSION, apply, install });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") {
    ["load", "aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete"].forEach(name => window.addEventListener(name, install));
    if (typeof document !== "undefined" && document.readyState !== "loading") install();
  }
})();
