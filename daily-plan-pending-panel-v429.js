(() => {
  "use strict";

  // V429 — Pendentes de outros dias, visíveis no Plano do Dia.
  //
  // O app guarda as metas atrasadas mas nunca as mostra: para achá-las era
  // preciso trocar a data no seletor e olhar dia a dia. Quem depende de
  // lembrar quais disciplinas ficaram para trás não tem como usar isso.
  //
  // Este painel lista o que está pendente em datas passadas, agrupado por
  // disciplina, e traz uma meta para hoje com um clique.
  //
  // Trazer para hoje NÃO reconcilia as datas de propósito. A reconciliação
  // executa `removeGoals(excess)` mesmo sem `rebuildAutomatic`, e o dia já
  // cheio perderia uma meta para acomodar a que chegou. Aqui a meta apenas
  // muda de data e passa a ser protegida.

  const VERSION = "20260902-daily-plan-pending-panel-v429";
  const API_KEY = "__ALDUS_DAILY_PLAN_PENDING_PANEL_V429__";
  const PANEL_ID = "aldusPendingOtherDaysV429";
  const ANCHOR_ID = "dailyGoalsList";
  const MAX_ROWS_PER_DISCIPLINE = 25;

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const text = (value) => String(value ?? "").trim();

  function resolveAppState() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(state)) return state;
    } catch { /* binding inexistente */ }
    if (isObject(globalThis.state)) return globalThis.state;
    return null;
  }

  const today = () => (typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10));
  const dateOf = (goal) => (typeof goalDateValue === "function" ? goalDateValue(goal) : text(goal?.date || goal?.data));
  const done = (goal) => (typeof isGoalDone === "function" ? isGoalDone(goal) : goal?.done === true || goal?.status === "Concluída");
  const prettyDate = (value) => (typeof formatDateBR === "function" ? formatDateBR(value) : value);

  function escapeText(value) {
    if (typeof escapeHTML === "function") return escapeHTML(String(value ?? ""));
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Metas não concluídas, em datas anteriores a hoje.
  function overdueGoals(targetState = resolveAppState()) {
    const limit = today();
    const goals = Array.isArray(targetState?.dailyGoals) ? targetState.dailyGoals : [];
    return goals.filter((goal) => {
      const date = dateOf(goal);
      return Boolean(date) && date < limit && !done(goal);
    });
  }

  function groupByDiscipline(goals) {
    const groups = new Map();
    for (const goal of goals) {
      const discipline = text(goal.discipline || goal.disciplina) || "Sem disciplina";
      if (!groups.has(discipline)) groups.set(discipline, []);
      groups.get(discipline).push(goal);
    }
    for (const list of groups.values()) list.sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))));
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }

  function subjectOf(goal) {
    return text(goal.subject || goal.tema || goal.topic) || "(sem assunto)";
  }

  function bringToToday(goalId) {
    const targetState = resolveAppState();
    if (!targetState) return false;
    const goal = (targetState.dailyGoals || []).find((item) => text(item.id) === text(goalId));
    if (!goal) return false;

    const from = dateOf(goal);
    const to = today();
    if (from === to) return false;

    goal.date = to;
    goal.data = to;
    goal.status = "Reagendada";
    // A flag que a V419 criou e nunca ligou: protege a meta de qualquer
    // reconstrução posterior. Foi o usuário quem a trouxe; ela fica.
    goal.userEdited = true;

    if (typeof appendGoalHistory === "function") {
      appendGoalHistory(goal, `Trazida de ${from} para ${to} pelo painel de pendentes.`);
    }
    try { if (typeof saveData === "function") saveData({ markLocalChange: true }); }
    catch (error) { console.warn("[Aldus V429] Falha ao salvar.", error); }
    try { if (typeof render === "function") render(); } catch { /* render próprio abaixo */ }
    renderPanel();
    return true;
  }

  function panelMarkup(groups, total) {
    if (!total) {
      return '<summary><strong>Pendentes de outros dias</strong> — nenhuma</summary>'
        + '<p class="item-meta">Nada ficou para trás. Todas as metas de dias anteriores foram concluídas ou reagendadas.</p>';
    }
    const head = `<summary><strong>Pendentes de outros dias</strong> — ${total} meta(s) em ${groups.length} disciplina(s)</summary>`
      + '<p class="item-meta">Metas de datas passadas que continuam pendentes. Trazer para hoje move a meta e a protege de reconstruções.</p>';
    const body = groups.map(([discipline, goals]) => {
      const shown = goals.slice(0, MAX_ROWS_PER_DISCIPLINE);
      const rowStyle = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 0";
      const rows = shown.map((goal) => `<li class="pending-other-days-row" style="${rowStyle}">
          <span style="flex:1 1 220px;min-width:0;overflow-wrap:anywhere">${escapeText(subjectOf(goal))}</span>
          <span class="item-meta">${escapeText(prettyDate(dateOf(goal)))}</span>
          <button type="button" class="ghost" data-v429-bring="${escapeText(goal.id)}">Trazer para hoje</button>
        </li>`).join("");
      const rest = goals.length > shown.length
        ? `<li class="item-meta">e mais ${goals.length - shown.length} meta(s) nesta disciplina.</li>`
        : "";
      return `<details class="pending-other-days-group">
          <summary>${escapeText(discipline)} — ${goals.length}</summary>
          <ul class="pending-other-days-list">${rows}${rest}</ul>
        </details>`;
    }).join("");
    return head + body;
  }

  function ensurePanel() {
    if (typeof document === "undefined") return null;
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const anchor = document.getElementById(ANCHOR_ID);
    if (!anchor) return null;
    panel = document.createElement("details");
    panel.id = PANEL_ID;
    panel.className = "pending-other-days";
    // O estilo fica aqui, e não num .css: as folhas do projeto entram no
    // bundle `app-*.css`, que está em STATIC_ASSETS e só é revalidado com
    // bump de CURRENT_VERSION. Um painel acessório não justifica isso.
    panel.style.cssText = "margin:12px 0 4px;padding:10px 12px;border:1px solid currentColor;border-radius:10px;opacity:.95";
    const host = anchor.closest("section") || anchor.parentElement;
    if (!host || !host.parentElement) return null;
    host.parentElement.insertBefore(panel, host.nextSibling);
    panel.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-v429-bring]") : null;
      if (!button) return;
      event.preventDefault();
      bringToToday(button.getAttribute("data-v429-bring"));
    });
    return panel;
  }

  let rendering = false;

  function renderPanel() {
    if (rendering) return false;
    rendering = true;
    try {
      const targetState = resolveAppState();
      if (!targetState) return false;
      const panel = ensurePanel();
      if (!panel) return false;
      const goals = overdueGoals(targetState);
      const groups = groupByDiscipline(goals);
      const open = panel.open;
      panel.innerHTML = panelMarkup(groups, goals.length);
      panel.open = open;
      return true;
    } catch (error) {
      console.warn("[Aldus V429] Painel de pendentes não renderizado.", error);
      return false;
    } finally {
      rendering = false;
    }
  }

  // O painel acompanha o render do app: qualquer mudança nas metas o atualiza.
  function installRenderHook() {
    const original = globalThis.render;
    if (typeof original !== "function") return false;
    if (original.__aldusPendingPanelV429 === VERSION) return true;
    const wrapped = function render(...args) {
      const result = original.apply(this, args);
      try { renderPanel(); } catch { /* painel é acessório */ }
      return result;
    };
    Object.defineProperty(wrapped, "__aldusPendingPanelV429", { value: VERSION });
    Object.defineProperty(wrapped, "__aldusV429Original", { value: original });
    globalThis.render = wrapped;
    return true;
  }

  const api = Object.freeze({
    version: VERSION,
    panelId: PANEL_ID,
    overdueGoals,
    groupByDiscipline,
    bringToToday,
    renderPanel,
    installRenderHook
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function boot() {
    installRenderHook();
    renderPanel();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", boot, { once: true });
    window.addEventListener("aldus:bootstrap-ready", boot, { once: true });
    window.addEventListener("load", boot, { once: true });
  }
})();
