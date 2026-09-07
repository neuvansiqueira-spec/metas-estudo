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

  const VERSION = "20260906-plano-dia-painel-unico-v461";
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
  const prettyDate = (value) => {
    if (typeof formatDateBR === "function") return formatDateBR(value);
    const [year, month, day] = text(value).split("-");
    return year && month && day ? `${day}/${month}/${year}` : text(value);
  };

  function actualMinutesOf(goal) {
    const value = typeof goalTotalActualMinutes === "function"
      ? goalTotalActualMinutes(goal)
      : goal?.actualMinutes ?? goal?.minutosRealizados ?? 0;
    const minutes = Number(value);
    return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  }

  function timeLabel(minutes) {
    if (!minutes) return "sem tempo lançado";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h${String(rest).padStart(2, "0")} já estudados` : `${rest} min já estudados`;
  }

  function disciplineOf(goal) {
    return text(goal.discipline || goal.disciplina) || "Sem disciplina";
  }

  function filterGoals(goals, term, onlyStarted) {
    const query = text(term).toLocaleLowerCase("pt-BR");
    return goals.filter((goal) => (!onlyStarted || actualMinutesOf(goal) > 0)
      && (!query || [disciplineOf(goal), subjectOf(goal), prettyDate(dateOf(goal))].join(" ")
        .toLocaleLowerCase("pt-BR").includes(query)));
  }

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
      const discipline = disciplineOf(goal);
      if (!groups.has(discipline)) groups.set(discipline, []);
      groups.get(discipline).push(goal);
    }
    const minutes = new Map(goals.map((goal) => [goal, actualMinutesOf(goal)]));
    for (const list of groups.values()) list.sort((a, b) => (minutes.get(b) - minutes.get(a))
      || String(dateOf(b)).localeCompare(String(dateOf(a))));
    // Grupos com metas comecadas tambem precedem os grupos ainda intocados.
    return [...groups.entries()].sort((a, b) => Number(minutes.get(b[1][0]) > 0)
      - Number(minutes.get(a[1][0]) > 0) || b[1].length - a[1].length);
  }

  function subjectOf(goal) {
    return text(goal.subject || goal.assunto || goal.tema || goal.topic) || "(sem assunto)";
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

  function panelMarkup(groups, total, openGroups) {
    if (!groups.length) return total
      ? '<p class="item-meta">Nenhuma meta corresponde aos filtros.</p>'
      : '<p class="item-meta">Nada ficou para trás. Todas as metas de dias anteriores foram concluídas ou reagendadas.</p>';
    const body = groups.map(([discipline, goals]) => {
      const shown = goals.slice(0, MAX_ROWS_PER_DISCIPLINE);
      const rowStyle = "display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 0";
      const rows = shown.map((goal) => `<li class="pending-other-days-row" style="${rowStyle}">
          <span style="flex:1 1 220px;min-width:0;overflow-wrap:anywhere">${escapeText(subjectOf(goal))}</span>
          <span class="item-meta">${escapeText(prettyDate(dateOf(goal)))}</span>
          <span class="item-meta">${escapeText(timeLabel(actualMinutesOf(goal)))}</span>
          <button type="button" class="ghost" data-v429-bring="${escapeText(goal.id)}">Trazer para hoje</button>
        </li>`).join("");
      const rest = goals.length > shown.length
        ? `<li class="item-meta">e mais ${goals.length - shown.length} meta(s) nesta disciplina.</li>`
        : "";
      return `<details class="pending-other-days-group" data-v429-discipline="${escapeText(discipline)}"${openGroups.has(discipline) ? " open" : ""}>
          <summary>${escapeText(discipline)} — ${goals.length}</summary>
          <ul class="pending-other-days-list">${rows}${rest}</ul>
        </details>`;
    }).join("");
    return body;
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
    panel.innerHTML = `<summary><strong>Pendentes de outros dias</strong> <span data-v429="summary"></span></summary>
      <p class="item-meta">Metas de datas passadas que continuam pendentes. As já começadas aparecem primeiro. Trazer para hoje move a meta e a protege de reconstruções.</p>
      <div class="form-grid compact">
        <label class="wide">Filtrar por disciplina, assunto ou data
          <input type="search" data-v429="filter" placeholder="ex.: penal, intervenção, 10/09" />
        </label>
        <label><input type="checkbox" data-v429="only-started" /> Só as que já comecei</label>
      </div>
      <p class="item-meta" data-v429="count" role="status"></p>
      <div data-v429="list"></div>`;
    const host = anchor.closest("section") || anchor.parentElement;
    if (!host || !host.parentElement) return null;
    host.parentElement.insertBefore(panel, host.nextSibling);
    panel.addEventListener("input", (event) => {
      if (event.target?.dataset?.v429 === "filter") renderPanel();
    });
    panel.addEventListener("change", (event) => {
      if (event.target?.dataset?.v429 === "only-started") renderPanel();
    });
    panel.addEventListener("toggle", () => { if (panel.open) renderPanel(); });
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
      const field = panel.querySelector('[data-v429="filter"]');
      const check = panel.querySelector('[data-v429="only-started"]');
      const filtered = filterGoals(goals, field?.value, Boolean(check?.checked));
      const groups = groupByDiscipline(filtered);
      const openGroups = new Set([...panel.querySelectorAll('.pending-other-days-group[open]')]
        .map((group) => group.getAttribute("data-v429-discipline")));
      panel.querySelector('[data-v429="summary"]').textContent = goals.length
        ? `— ${goals.length} meta(s) em ${new Set(goals.map(disciplineOf)).size} disciplina(s)` : "— nenhuma";
      panel.querySelector('[data-v429="count"]').textContent = `${filtered.length} na lista · ${goals.filter((goal) => actualMinutesOf(goal) > 0).length} já começada(s).`;
      // Mantem os controles no DOM: digitar nao perde foco nem limpa os filtros.
      panel.querySelector('[data-v429="list"]').innerHTML = panelMarkup(groups, goals.length, openGroups);
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
    actualMinutesOf,
    filterGoals,
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
