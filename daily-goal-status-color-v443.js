(() => {
  "use strict";

  // V443 — Cor no status da meta, no Plano do Dia.
  //
  // O cartão traz "112 de 240 min • Concluída" num único <span>, e a classe do
  // status vai no <details> como `goal-status-${canonical(status)}`. Duas
  // limitações dessa classe impedem usá-la direto no CSS: "Em andamento" vira
  // duas classes por causa do espaço, e "Concluída"/"Não cumprida" carregam
  // acento. Por isso o status é isolado aqui e marcado num atributo próprio.
  //
  // Colore-se apenas a palavra do status, não a linha inteira: "0 de 75 min"
  // em verde seria enganoso num cartão recém-concluído com pouco tempo.
  //
  // Escolha das cores, decidida com o usuário: concluída em verde, em
  // andamento no azul do site, pendente em cinza discreto, e âmbar para o que
  // exige decisão — não cumprida, adiada, reagendada. Pendente é o estado
  // normal da maioria das metas; destacá-lo em amarelo encheria a tela de
  // alerta sem informação.

  const VERSION = "20260903-daily-goal-status-color-v443-specificity-r2";
  const API_KEY = "__ALDUS_DAILY_GOAL_STATUS_COLOR_V443__";
  const STYLE_ID = "aldusDailyGoalStatusStyleV443";
  const MARK_ATTR = "data-aldus-goal-status";
  const SEPARATOR = "•";

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const clean = (value) => String(value ?? "").trim();

  // Reduz o status a uma chave estável, sem acento e sem espaço.
  function statusKey(status) {
    const base = clean(status).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!base) return "";
    if (base.startsWith("conclu")) return "concluida";
    if (base.startsWith("em andamento")) return "andamento";
    if (base.startsWith("pendente")) return "pendente";
    if (base.startsWith("nao cumprida")) return "nao-cumprida";
    if (base.startsWith("adiada")) return "adiada";
    if (base.startsWith("reagendada")) return "reagendada";
    if (base.startsWith("ignorada")) return "ignorada";
    return "outro";
  }

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [${MARK_ATTR}] { font-weight: 700 !important; }
      [${MARK_ATTR}="concluida"] { color: #5fd39b !important; }
      [${MARK_ATTR}="andamento"] { color: #7cc0ff !important; }
      [${MARK_ATTR}="pendente"] { color: rgba(255,255,255,.62) !important; font-weight: 600; }
      [${MARK_ATTR}="nao-cumprida"],
      [${MARK_ATTR}="adiada"],
      [${MARK_ATTR}="reagendada"] { color: #e3b45a !important; }
      [${MARK_ATTR}="ignorada"] { color: rgba(255,255,255,.45) !important; font-weight: 600; }
      /* Tema claro: os mesmos papéis, tons escurecidos para manter contraste. */
      @media (prefers-color-scheme: light) {
        html:not([data-aldus-theme="premium-stable"]) [${MARK_ATTR}="concluida"] { color: #16794f !important; }
        html:not([data-aldus-theme="premium-stable"]) [${MARK_ATTR}="andamento"] { color: #1b5fa8 !important; }
        html:not([data-aldus-theme="premium-stable"]) [${MARK_ATTR}="pendente"] { color: rgba(0,0,0,.58) !important; }
        html:not([data-aldus-theme="premium-stable"]) [${MARK_ATTR}="nao-cumprida"],
        html:not([data-aldus-theme="premium-stable"]) [${MARK_ATTR}="adiada"],
        html:not([data-aldus-theme="premium-stable"]) [${MARK_ATTR}="reagendada"] { color: #8a6314 !important; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Separa "112 de 240 min • Concluída" mantendo o texto idêntico; só o status
  // passa a viver num elemento próprio, marcado pelo atributo.
  function paintResume(node, doc) {
    if (!node || node.querySelector?.(`[${MARK_ATTR}]`)) return false;
    const texto = clean(node.textContent);
    const at = texto.lastIndexOf(SEPARATOR);
    if (at === -1) return false;
    const antes = texto.slice(0, at + SEPARATOR.length);
    const status = clean(texto.slice(at + SEPARATOR.length));
    const chave = statusKey(status);
    if (!status || !chave) return false;
    while (node.firstChild) node.removeChild(node.firstChild);
    node.appendChild(doc.createTextNode(`${antes} `));
    const marca = doc.createElement("span");
    marca.setAttribute(MARK_ATTR, chave);
    marca.textContent = status;
    node.appendChild(marca);
    return true;
  }

  function paintAll() {
    try {
      if (typeof document === "undefined") return 0;
      ensureStyle();
      let pintados = 0;
      for (const card of document.querySelectorAll("[data-daily-goal-details]")) {
        const summary = card.querySelector("summary");
        if (!summary) continue;
        const spans = summary.children;
        const resumo = spans.length ? spans[spans.length - 1] : null;
        if (paintResume(resumo, document)) pintados += 1;
      }
      return pintados;
    } catch {
      return 0;
    }
  }

  // Acompanha o render do app. Sem observador de DOM e sem polling: o Plano do
  // Dia é redesenhado por render(), e é aí que os cartões nascem de novo.
  function install() {
    try {
      if (typeof globalThis.render !== "function") return false;
      if (globalThis.render.__aldusGoalStatusColorV443 === VERSION) return true;
      const previous = globalThis.render;
      const wrapped = function(...args) {
        const result = previous.apply(this, args);
        paintAll();
        return result;
      };
      Object.defineProperty(wrapped, "__aldusGoalStatusColorV443", { value: VERSION });
      Object.defineProperty(wrapped, "__aldusGoalStatusColorOriginal", { value: previous });
      globalThis.render = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  // A instalação da V427 falhou por rodar antes da função-alvo existir, sem
  // nova tentativa. Aqui a tentativa se repete por um prazo curto e desiste
  // com aviso, em vez de falhar em silêncio.
  const RETRY_MS = 60;
  const TIMEOUT_MS = 20000;

  function start() {
    const inicio = Date.now();
    const tentar = () => {
      if (install()) { paintAll(); return; }
      if (Date.now() - inicio >= TIMEOUT_MS) {
        console.warn("[Aldus V443] render() não apareceu a tempo; a cor do status não foi instalada.");
        return;
      }
      setTimeout(tentar, RETRY_MS);
    };
    tentar();
  }

  const api = Object.freeze({
    version: VERSION,
    markAttribute: MARK_ATTR,
    statusKey,
    paintResume,
    paintAll,
    install
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", start, { once: true });
    window.addEventListener("aldus:bootstrap-ready", start, { once: true });
    window.addEventListener("load", start, { once: true });
  }
})();
