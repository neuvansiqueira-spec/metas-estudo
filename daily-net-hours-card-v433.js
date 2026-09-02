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
  // líquidas de hoje. Não cria dado novo: usa exatamente a mesma conta de
  // script.js:5145 — soma de `minutes` das sessões cujo `date` é hoje.
  //
  // Injeção por módulo, e não edição de index.html: o index está em
  // STATIC_ASSETS e alterá-lo levantaria a questão do cache do service worker.
  // O card é acessório e não justifica esse risco.

  const VERSION = "20260902-daily-net-hours-card-v433-stack-r2";
  const API_KEY = "__ALDUS_DAILY_NET_HOURS_CARD_V433__";
  const CARD_ID = "aldusDailyNetHoursCardV433";
  const VALUE_ID = "aldusDailyNetHoursValueV433";
  const DETAIL_ID = "aldusDailyNetHoursDetailV433";
  const STYLE_ID = "aldusDailyNetHoursStyleV433";
  const STACK_ID = "aldusDailyNetHoursStackV433";

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

  // Mesma conta de script.js:5145. Não reimplementa regra: soma o que foi
  // efetivamente registrado nas sessões de hoje.
  function todayMinutes(targetState) {
    const studies = Array.isArray(targetState?.studies) ? targetState.studies : [];
    const date = today();
    let total = 0;
    for (const study of studies) {
      if (!isObject(study) || study.date !== date) continue;
      const minutes = Number(study.minutes);
      if (Number.isFinite(minutes) && minutes > 0) total += minutes;
    }
    return total;
  }

  function todaySessions(targetState) {
    const studies = Array.isArray(targetState?.studies) ? targetState.studies : [];
    const date = today();
    return studies.filter((study) => isObject(study) && study.date === date).length;
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
      #${STACK_ID} { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
      #${CARD_ID} { display: flex; flex-direction: column; gap: 4px; }
      #${CARD_ID} .aldus-v433-eyebrow { font-size: .78rem; letter-spacing: .04em; text-transform: uppercase; opacity: .85; }
      #${CARD_ID} #${VALUE_ID} { font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 700; line-height: 1.1; }
      #${CARD_ID} #${DETAIL_ID} { font-size: .82rem; opacity: .8; }
      /* O rótulo do card semanal quebrava em três linhas dentro da coluna
         estreita do hero — "META" numa linha, "SEMANAL" na seguinte. O defeito
         é anterior a este módulo; corrigido aqui porque o card agora divide o
         mesmo empilhamento e a incoerência entre os dois ficaria visível. */
      #${STACK_ID} .goal-card > span { display: block; white-space: nowrap; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function anchorCard() {
    if (typeof document === "undefined") return null;
    const weekly = document.getElementById("weeklyGoalStatus");
    return weekly ? weekly.closest(".goal-card") : null;
  }

  // O .hero-content é um grid de duas colunas (aldus-interface-v51.css:58).
  // Inserir um terceiro filho espremia a coluna do card semanal e quebrava
  // "META SEMANAL" em três linhas. Os dois cards passam a dividir a MESMA
  // coluna, empilhados: o grid continua com dois itens e o card semanal
  // recupera a largura original.
  function ensureStack(anchor) {
    const existing = document.getElementById(STACK_ID);
    if (existing) return existing;
    const parent = anchor.parentNode;
    if (!parent || typeof parent.insertBefore !== "function") return null;
    const stack = document.createElement("div");
    stack.id = STACK_ID;
    parent.insertBefore(stack, anchor);
    stack.appendChild(anchor);
    return stack;
  }

  function ensureCard() {
    const anchor = anchorCard();
    if (!anchor || !anchor.parentNode) return null;
    const existing = document.getElementById(CARD_ID);
    if (existing) return existing;
    ensureStyle();
    const stack = ensureStack(anchor);
    if (!stack) return null;
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
    stack.insertBefore(card, anchor);
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
    stackId: STACK_ID,
    todayMinutes,
    todaySessions,
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
