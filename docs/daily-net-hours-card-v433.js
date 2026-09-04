(() => {
  "use strict";

  // V433 — Horas líquidas do dia com o mesmo destaque da meta semanal.
  //
  // O número já existia em dois lugares: "Tempo estudado hoje" no bloco Hoje do
  // dashboard, e "Tempo realizado hoje" no Resumo do dia. Mas o card grande do
  // topo mostra o acumulado da SEMANA, e é ele que chama a atenção — a ponto de
  // o próprio usuário ler 8h45 e achar que eram do dia.
  //
  // Este módulo acrescenta um card irmão ao da meta semanal, com as horas
  // líquidas de hoje. Não cria dado novo nem conta própria: desde a V446 usa a
  // mesma fonte do "Tempo realizado hoje" do Resumo do dia, para que dois
  // números do mesmo dia não apareçam divergindo em telas vizinhas.
  //
  // Injeção por módulo, e não edição de index.html: o index está em
  // STATIC_ASSETS e alterá-lo levantaria a questão do cache do service worker.
  // O card é acessório e não justifica esse risco.

  const VERSION = "20260903-daily-net-hours-card-v433-same-source-v446";
  const API_KEY = "__ALDUS_DAILY_NET_HOURS_CARD_V433__";
  const CARD_ID = "aldusDailyNetHoursCardV433";
  const VALUE_ID = "aldusDailyNetHoursValueV433";
  const DETAIL_ID = "aldusDailyNetHoursDetailV433";
  const STYLE_ID = "aldusDailyNetHoursStyleV433";
  const ROW_ID = "aldusHeroIndicatorRowV433";
  const PAIR_ID = "aldusHeroIndicatorPairV433";
  const CHIP_ID = "aldusHeroIndicatorChipV433";

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

  // `script.js` declara o estado como `const state`, ausente de globalThis.
  function resolveAppState() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(state)) return state;
    } catch { /* binding inexistente ou em TDZ */ }
    if (isObject(globalThis.state)) return globalThis.state;
    return null;
  }

  function today() {
    try {
      // eslint-disable-next-line no-undef
      if (typeof todayISO === "function") return todayISO();
    } catch { /* fora do app */ }
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  // V446 — Mesma fonte do "Tempo realizado hoje" do Resumo do dia.
  //
  // Até aqui o card somava `minutes` das sessões do dia. O Resumo do dia soma
  // `goalTotalActualMinutes` das metas do dia (script.js:3061). Os dois números
  // apareciam lado a lado divergindo: 2h31 contra 3h46 em 03/09/2026.
  //
  // Medido no estado real daquele dia: 6 sessões somavam 151min, e as metas
  // somavam 226min. Os 75min de diferença não eram erro — eram tempo que
  // existe na meta e não vira sessão: 13min lançados como tempo de questões, e
  // 62min de execução informada na própria meta, sem cronômetro. Estudo feito,
  // invisível para a contagem por sessão. O card menor é que estava errado.
  //
  // A soma passa a ser a das metas, e as sessões do dia que não pertencem a
  // nenhuma meta do dia entram à parte — assim tempo avulso não some, e o que
  // já está contado na meta não conta duas vezes.

  // Espelha script.js:goalTotalActualMinutes. Usa a função do app quando ela
  // existe; a cópia local serve ao teste e a um carregamento fora de ordem.
  function goalActualMinutes(goal) {
    if (!isObject(goal)) return 0;
    try {
      // eslint-disable-next-line no-undef
      if (typeof goalTotalActualMinutes === "function") return Number(goalTotalActualMinutes(goal)) || 0;
    } catch { /* fora do app */ }
    const informado = (campo) => goal[campo] !== undefined && goal[campo] !== null && goal[campo] !== "";
    if (informado("studyActualMinutes") || informado("questionActualMinutes")) {
      return (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0);
    }
    return Number(goal.actualMinutes ?? goal.tempo_real_minutos) || 0;
  }

  function goalDate(goal) {
    return String(goal?.date || goal?.data || "").slice(0, 10);
  }

  // O Resumo do dia parte de dailyPlanGoalsForDisplay, que esconde duplicatas
  // e metas de assunto já concluído. Somar a lista crua daria número maior que
  // o exibido — a mesma divergência, invertida.
  function goalsForDate(targetState, date) {
    try {
      // eslint-disable-next-line no-undef
      if (typeof dailyPlanGoalsForDisplay === "function") {
        const lista = dailyPlanGoalsForDisplay(targetState, date);
        if (Array.isArray(lista)) return lista.filter(isObject);
      }
    } catch { /* fora do app */ }
    const goals = Array.isArray(targetState?.dailyGoals) ? targetState.dailyGoals : [];
    return goals.filter((goal) => isObject(goal) && goalDate(goal) === date);
  }

  function studyGoalId(study) {
    return String(study?.goalId || study?.dailyGoalId || "");
  }

  function todayMinutes(targetState) {
    const date = today();
    const goals = goalsForDate(targetState, date);
    let total = 0;
    for (const goal of goals) total += goalActualMinutes(goal);

    // Sessão do dia sem meta do dia: tempo real que nenhuma meta contabiliza.
    const vinculadas = new Set(goals.map((goal) => String(goal?.id || "")).filter(Boolean));
    const studies = Array.isArray(targetState?.studies) ? targetState.studies : [];
    for (const study of studies) {
      if (!isObject(study) || String(study.date || "").slice(0, 10) !== date) continue;
      if (vinculadas.has(studyGoalId(study))) continue;
      const minutes = Number(study.minutes);
      if (Number.isFinite(minutes) && minutes > 0) total += minutes;
    }
    return total;
  }

  function todaySessions(targetState) {
    const studies = Array.isArray(targetState?.studies) ? targetState.studies : [];
    const date = today();
    return studies.filter((study) => isObject(study) && String(study.date || "").slice(0, 10) === date).length;
  }

  function formatMinutes(total) {
    const minutes = Math.max(0, Math.round(Number(total) || 0));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return `${rest}min`;
    if (!rest) return `${hours}h`;
    return `${hours}h ${rest}min`;
  }

  function sessionLabel(count) {
    if (!count) return "Nenhuma sessão registrada hoje.";
    return count === 1 ? "1 sessão registrada hoje." : `${count} sessões registradas hoje.`;
  }

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    // Herda a aparência de .goal-card, que é o card irmão; só o suficiente para
    // não depender de alteração nos CSS empacotados.
    style.textContent = `
      /* Dois cards irmaos, lado a lado, alinhados ao alto da coluna direita.
         O selo "Indicador estrategico" e desenhado por .goal-card::before; com
         dois cards ele aparecia duas vezes. Sai dos dois e vira cabecalho do
         par, uma vez so. */
      #${ROW_ID} { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
      #${CHIP_ID} {
        display: inline-flex; align-self: flex-start;
        padding: 5px 9px; border-radius: 999px;
        background: rgba(199,154,59,.18); color: #fff4d6;
        font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase;
      }
      #${PAIR_ID} { display: grid; grid-template-columns: 1fr; gap: 12px; min-width: 0; }
      /* Itens de grid tem min-width auto e o conteudo dita a largura minima:
         o valor semanal, com fonte ate 2.25rem, empurrava o card para fora da
         tela. Dentro do par ele encolhe e quebra linha. */
      #${PAIR_ID} > * { min-width: 0; }
      /* O tema aplica align-self: center aos cards. Cada um se centralizava na
         propria celula e, com alturas diferentes, os topos nao batiam — medido
         na pagina: 232px contra 240px. Esticar iguala altura e alinhamento. */
      #${PAIR_ID} > .goal-card { align-self: stretch !important; }
      #${PAIR_ID} .goal-card strong {
        font-size: clamp(1.35rem, 1.9vw, 1.8rem);
        line-height: 1.15;
        white-space: normal;
        overflow-wrap: anywhere;
      }
      #${PAIR_ID} .goal-card small { overflow-wrap: anywhere; }
      #${PAIR_ID} .goal-card::before { content: none !important; margin: 0 !important; padding: 0 !important; }
      #${PAIR_ID} .goal-card { min-width: 0; }
      #${PAIR_ID} .goal-card > span { display: block; white-space: nowrap; }
      #${CARD_ID} { display: flex; flex-direction: column; gap: 3px; }
      #${CARD_ID} .aldus-v433-eyebrow { font-size: .78rem; letter-spacing: .04em; text-transform: uppercase; opacity: .9; }
      #${CARD_ID} #${VALUE_ID} { font-size: clamp(1.5rem, 2.4vw, 2rem); font-weight: 700; line-height: 1.15; }
      #${CARD_ID} #${DETAIL_ID} { font-size: .8rem; opacity: .78; }
      /* Acima de 1024px a coluna comporta os dois lado a lado. O !important
         vence a regra de tema, que fixa 230-310px e centraliza verticalmente. */
      @media (min-width: 1024px) {
        .hero-content {
          grid-template-columns: minmax(0, 1fr) minmax(390px, 500px) !important;
          align-items: start !important;
        }
        #${PAIR_ID} { grid-template-columns: 1fr 1fr; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function anchorCard() {
    if (typeof document === "undefined") return null;
    const weekly = document.getElementById("weeklyGoalStatus");
    return weekly ? weekly.closest(".goal-card") : null;
  }

  // Os dois cards passam a ser irmaos dentro de uma linha propria, com o selo
  // como cabecalho do par. Antes: um card so, com o bloco do dia embutido — o
  // usuario achou desorganizado.
  function ensureRow(anchor) {
    const existing = document.getElementById(ROW_ID);
    if (existing) return existing;
    const parent = anchor.parentNode;
    if (!parent || typeof parent.insertBefore !== "function") return null;
    const row = document.createElement("div");
    row.id = ROW_ID;
    const chip = document.createElement("span");
    chip.id = CHIP_ID;
    chip.textContent = "Indicador estratégico";
    const pair = document.createElement("div");
    pair.id = PAIR_ID;
    row.appendChild(chip);
    row.appendChild(pair);
    parent.insertBefore(row, anchor);
    pair.appendChild(anchor);
    return pair;
  }

  function ensureCard() {
    const anchor = anchorCard();
    if (!anchor || !anchor.parentNode) return null;
    const existing = document.getElementById(CARD_ID);
    if (existing) return existing;
    ensureStyle();
    const pair = ensureRow(anchor);
    if (!pair) return null;
    const card = document.createElement("div");
    card.id = CARD_ID;
    card.className = anchor.className;

    // Montado por createElement, não por innerHTML: nada aqui vem de dado do
    // usuário, mas construir nós evita string de marcação e deixa o card
    // verificável sem um interpretador de HTML.
    const eyebrow = document.createElement("span");
    eyebrow.className = "aldus-v433-eyebrow";
    eyebrow.textContent = "Hoje";

    const value = document.createElement("strong");
    value.id = VALUE_ID;
    value.textContent = "0min";
    if (typeof value.setAttribute === "function") value.setAttribute("aria-live", "polite");

    const detail = document.createElement("small");
    detail.id = DETAIL_ID;
    detail.textContent = "";

    card.appendChild(eyebrow);
    card.appendChild(value);
    card.appendChild(detail);
    pair.insertBefore(card, anchor);
    return card;
  }

  function renderCard() {
    try {
      const targetState = resolveAppState();
      if (!targetState) return false;
      const card = ensureCard();
      if (!card) return false;
      const minutes = todayMinutes(targetState);
      const value = document.getElementById(VALUE_ID);
      const detail = document.getElementById(DETAIL_ID);
      if (value) value.textContent = formatMinutes(minutes);
      if (detail) detail.textContent = sessionLabel(todaySessions(targetState));
      return true;
    } catch {
      return false;
    }
  }

  // Acompanha o render do app, sem observador de DOM nem polling.
  function installRenderHook() {
    try {
      if (typeof globalThis.render !== "function") return false;
      if (globalThis.render.__aldusDailyNetHoursV433 === VERSION) return true;
      const previous = globalThis.render;
      const wrapped = function(...args) {
        const result = previous.apply(this, args);
        renderCard();
        return result;
      };
      Object.defineProperty(wrapped, "__aldusDailyNetHoursV433", { value: VERSION });
      Object.defineProperty(wrapped, "__aldusDailyNetHoursOriginal", { value: previous });
      globalThis.render = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({
    version: VERSION,
    cardId: CARD_ID,
    todayMinutes,
    todaySessions,
    goalActualMinutes,
    goalsForDate,
    formatMinutes,
    sessionLabel,
    renderCard,
    installRenderHook
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function start() {
    installRenderHook();
    renderCard();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", start, { once: true });
    window.addEventListener("aldus:bootstrap-ready", start, { once: true });
    window.addEventListener("load", start, { once: true });
  }
})();
