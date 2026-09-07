/* Apresentacao do Plano do Dia conforme a previa V456. Nao escreve dados. */
(() => {
  "use strict";
  const VERSION = "20260907-plano-do-dia-largura-v603";
  const KEY = "__ALDUS_DAILY_PLAN_PREVIEW_V462__";
  const ROOT = "view-metas-do-dia";
  const FRAME = "aldusDailyPlanFrameV462";
  const MORE = "aldusDailyPlanMoreV462";
  const QUESTIONS = "aldusDailyPlanQuestionsV462";
  if (globalThis[KEY]) return;
  const preferences = new Map();
  const prepared = new WeakSet();
  const summaryGrids = new WeakSet();
  let lastListFirst;
  let observer, queued = false, applying = false;
  const byId = id => document.getElementById(id);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }
  function place(parent, node, before = null) {
    if (node && (node.parentNode !== parent || node.nextSibling !== before)) parent.insertBefore(node, before);
  }
  // Formata o valor ja calculado pelos modulos V243/V253, sem nova soma de tempo.
  function compactDuration(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*(?:min)?)?$/i);
    if (!match || (!match[1] && !match[2])) return text;
    const minutes = Math.round(Number((match[1] || "0").replace(",", ".")) * 60 + Number(match[2] || 0));
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
  }
  function prepareBlock(block) {
    if (prepared.has(block)) return;
    const key = block.dataset.dailyPlanSection;
    // A V140 fecha os paineis na primeira aparicao. Estes ja tem um padrao proprio.
    block.dataset.defaultCollapsedV140 = "true";
    block.open = preferences.has(key) ? preferences.get(key) : ["summary", "questions"].includes(key);
    prepared.add(block);
  }
  function summaryPresentation(mount, metrics) {
    const block = mount?.querySelector('details[data-daily-plan-section="summary"]');
    if (!block) return;
    setText(block.querySelector('.daily-plan-title'), "Resumo do dia");
    const content = block.querySelector('.daily-plan-content');
    if (!content) return;
    if (!summaryGrids.has(content)) {
      const cards = [...content.querySelectorAll(':scope > .stat-card')];
      if (cards.length < 4) return;
      const grid = make("div", "aldus-preview-stats-v462");
      cards.slice(0, 4).forEach((card, index) => {
        card.dataset.previewStat = ["completed", "pending", "planned", "realized"][index];
        setText(card.querySelector('span'), ["Concluídas", "Pendentes", "Planejado", "Realizado"][index]);
        grid.appendChild(card);
      });
      metrics.replaceChildren(...cards.slice(4));
      content.classList.remove("stats-grid", "compact", "daily-goals-summary");
      content.appendChild(grid);
      summaryGrids.add(content);
    }
    for (const card of content.querySelectorAll('[data-preview-stat="planned"], [data-preview-stat="realized"]')) {
      const source = card.querySelector('strong');
      if (!source) continue;
      source.classList.add('aldus-preview-time-source');
      let value = card.querySelector('.aldus-preview-time-value');
      if (!value) { value = make('span', 'aldus-preview-time-value'); card.appendChild(value); }
      setText(value, compactDuration(source.textContent));
    }
  }
  function questionsPresentation(frame) {
    const panel = byId("aldusQuickQuestionEntryV436");
    if (!panel) return null;
    let block = byId(QUESTIONS);
    if (!block) {
      block = make("details", "daily-plan-section");
      block.id = QUESTIONS;
      block.dataset.dailyPlanSection = "questions";
      const summary = make("summary");
      const heading = make("span", "daily-plan-heading");
      heading.append(make("strong", "daily-plan-title", "Lançar questões"), make("span", "daily-plan-resume"));
      summary.appendChild(heading);
      block.append(summary, make("div", "daily-plan-content"));
      frame.appendChild(block);
    }
    const content = block.querySelector('.daily-plan-content');
    if (panel.parentNode !== content) content.appendChild(panel);
    const chips = [...panel.querySelectorAll('#aldusQuickQuestionChipsV436 button')];
    for (const chip of chips) {
      const title = chip.getAttribute('title') || "";
      const separator = title.indexOf(" — ");
      if (separator >= 0) setText(chip, title.slice(separator + 3));
    }
    setText(block.querySelector('.daily-plan-resume'), `${chips.length} ${chips.length === 1 ? "meta" : "metas"}`);
    return block;
  }
  function apply() {
    if (applying || typeof document === "undefined") return false;
    const root = byId(ROOT);
    if (!root || !byId('dailyGoalsSummary')) return false;
    applying = true;
    observer?.disconnect();
    try {
      root.dataset.previewV462 = "true";
      let frame = byId(FRAME);
      if (!frame) { frame = make('div'); frame.id = FRAME; root.appendChild(frame); }
      let more = byId(MORE);
      if (!more) {
        more = make('details'); more.id = MORE;
        more.append(make('summary', '', 'Mais opções do dia'), make('div', 'aldus-more-content-v462'));
        root.appendChild(more);
      }
      const extra = more.querySelector('.aldus-more-content-v462');
      let metrics = byId('aldusDailyPlanMetricsV462');
      if (!metrics) { metrics = make('div', 'stats-grid compact'); metrics.id = 'aldusDailyPlanMetricsV462'; extra.appendChild(metrics); }
      const heading = root.querySelector(':scope > .section-heading');
      const actions = heading?.querySelector('.actions');
      if (actions) extra.appendChild(actions);
      for (const node of [...root.children]) {
        if (node.matches('.notice, .selected-day-banner, .choose-subject-day-panel, .manual-goal-panel, #nextDailyGoal, .day-smart-review-panel, #aldusDailyPlanQuestionImportV451')) extra.appendChild(node);
      }
      const mount = byId('dailyGoalsSummary');
      const summaryArticle = mount.closest('article');
      const list = byId('dailyGoalsList');
      if (lastListFirst !== list?.firstElementChild) {
        byId('aldusDailyPlanLegacyQuestionsV462')?.replaceChildren();
        lastListFirst = list?.firstElementChild;
      }
      const message = byId('dailyGoalsMessage');
      if (message) place(root, message, frame);
      const study = list?.closest('section.today-study-panel');
      if (study) {
        study.dataset.collapsed = "false";
        const content = study.querySelector('.today-study-content-v137');
        if (content) content.hidden = false;
      }
      const questions = questionsPresentation(frame);
      const pending = byId('aldusPendingOtherDaysV429');
      setText(pending?.querySelector(':scope > summary > strong'), 'Metas em aberto de dias anteriores');
      // Ordem da previa, sem clonar os elementos com IDs e listeners do app.
      let next = null;
      for (const node of [summaryArticle, study, questions, pending].reverse()) {
        if (node) { place(frame, node, next); next = node; }
      }
      // Quando a V429 ainda nao chegou, seu mount continuara sendo a secao de estudo.
      for (const node of [...(list?.children || [])]) {
        if (node.matches('details[data-daily-plan-section="questions"]')) {
          let legacy = byId('aldusDailyPlanLegacyQuestionsV462');
          if (!legacy) { legacy = make('div'); legacy.id = 'aldusDailyPlanLegacyQuestionsV462'; extra.appendChild(legacy); }
          legacy.replaceChildren(node);
        }
      }
      summaryPresentation(mount, metrics);
      const goalsResume = list?.querySelector('[data-daily-plan-section="goals"] .daily-plan-resume');
      if (goalsResume) setText(goalsResume, goalsResume.textContent.replace(/(\d+) concluída\(s\)/, (_, n) => n + (n === '1' ? ' concluída' : ' concluídas')).replace(/\s*•\s*\d+ pendente.*$/, ''));
      for (const block of frame.querySelectorAll('details.daily-plan-section')) prepareBlock(block);
      place(root, frame, more);
      return true;
    } finally {
      applying = false;
      observer?.observe(root, { childList: true, subtree: true, characterData: true });
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
      observer.observe(root, {childList:true,subtree:true,characterData:true});
    }
    if (!root.__previewEventsV462) {
      root.__previewEventsV462 = true;
      root.addEventListener('click', event => {
        const summary = event.target?.closest?.('summary');
        const block = summary?.parentElement;
        if (block?.matches('details.daily-plan-section')) preferences.set(block.dataset.dailyPlanSection, !block.open);
      }, true);
    }
    for (const name of ['renderDailyGoals', 'render']) {
      const original = globalThis[name];
      if (typeof original !== 'function' || original.__previewV462) continue;
      const wrapped = function(...args) { const result = original.apply(this,args); schedule(); return result; };
      Object.defineProperty(wrapped, '__previewV462', {value:true});
      globalThis[name] = wrapped;
    }
    return apply();
  }
  const api = Object.freeze({version:VERSION, apply, install, compactDuration});
  globalThis[KEY] = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    ['load','aldus:bootstrap-ready','aldus:post-bootstrap-maintenance-complete'].forEach(name => window.addEventListener(name, install));
    if (typeof document !== 'undefined' && document.readyState !== 'loading') install();
  }
})();
