/* Plano do Dia legível: cada bloco com identidade, e aviso quando o dia não é hoje — v455. */
(() => {
  "use strict";

  const VERSION = "20260906-daily-plan-legibility-v455-paleta-v456";
  const FLAG = "__ALDUS_DAILY_PLAN_LEGIBILITY_V455__";
  const ESTILO_ID = "aldusDailyPlanLegibilityStylesV455";
  const AVISO_ID = "aldusDailyPlanOtherDayV455";
  const SECAO = "view-metas-do-dia";

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  const chamar = (nome, ...args) => {
    try { const fn = globalThis[nome]; if (typeof fn === "function") return fn(...args); } catch {}
    return undefined;
  };
  const hoje = () => {
    const h = chamar("todayISO");
    if (typeof h === "string" && h) return h;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const dataBR = (iso) => {
    const r = chamar("formatDateBR", iso);
    if (typeof r === "string" && r) return r;
    const [a, m, d] = String(iso).split("-");
    return a && m && d ? `${d}/${m}/${a}` : String(iso);
  };

  // Os blocos do Plano do Dia são todos <details class="daily-plan-section">,
  // com a mesma cor e a mesma borda: na tela escura viram uma faixa só, e ele
  // relatou não distinguir "Lançar questões" de "Metas de estudo". Cada chave
  // ganha uma cor de faixa à esquerda e um rótulo próprio. É só pintura: nada
  // aqui muda comportamento.
  const FOLHA_ID = "aldusDailyPlanPaletteV456";
  const FOLHA = "aldus-daily-plan-palette-v456.css?v=20260906-plano-do-dia-paleta-v459";

  // V456 — as cores das secoes sairam daqui e foram para a folha externa, que
  // segue a paleta de cartoes da V294 (violeta, dourado, azul, turquesa) em vez
  // de inventar tons proprios. Aqui fica so o que e comportamento: o aviso de
  // dia diferente.
  const CORES = [
    ["goals", "var(--aldus-card-teal)", "Metas"],
    ["review", "var(--aldus-card-purple)", "Revisão"],
    ["history", "var(--aldus-card-gold)", "Histórico"],
    ["questions", "var(--aldus-card-blue)", "Questões"],
    ["next", "var(--aldus-card-purple)", "Próxima"],
    ["summary", "var(--aldus-card-gold)", "Resumo"]
  ];

  function css() {
    return `
      /* Aviso de dia diferente: ele clicou em "Ir para o dia", foi para 20/07 e
         leu as metas de la achando que eram de hoje. */
      #${AVISO_ID} {
        display: flex; gap: 0.9rem; align-items: center; flex-wrap: wrap;
        border: 1px solid var(--aldus-card-gold, #f2c957);
        border-radius: 16px; padding: 0.8rem 1.1rem; margin-block: 0.9rem;
        background:
          radial-gradient(circle at 9% 16%, rgba(199, 151, 43, .18) 0%, rgba(0,0,0,0) 42%),
          linear-gradient(145deg, var(--aldus-card-surface-a, #0d2b45) 0%, var(--aldus-card-surface-b, #061a2d) 100%);
        box-shadow: inset 5px 0 0 var(--aldus-card-gold, #f2c957), 0 13px 30px rgba(0, 7, 19, .24);
      }
      #${AVISO_ID} strong { font-size: 1.02rem; letter-spacing: -.015em; }
      #${AVISO_ID} .item-meta { color: var(--aldus-card-muted, #b8cadd); }
    `;
  }

  function instalarFolha() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(FOLHA_ID)) return true;
    const link = document.createElement("link");
    link.id = FOLHA_ID;
    link.rel = "stylesheet";
    link.href = FOLHA;
    (document.head || document.documentElement).appendChild(link);
    return true;
  }

  function instalarEstilo() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(ESTILO_ID)) return true;
    const tag = document.createElement("style");
    tag.id = ESTILO_ID;
    tag.textContent = css();
    (document.head || document.documentElement).appendChild(tag);
    return true;
  }

  function dataNaTela() {
    try { return String(document.getElementById("goalDate")?.value || ""); } catch { return ""; }
  }

  function aviso() {
    const secao = document.getElementById(SECAO);
    if (!secao) return null;
    let bloco = document.getElementById(AVISO_ID);
    if (!bloco) {
      bloco = document.createElement("div");
      bloco.id = AVISO_ID;
      bloco.hidden = true;
      bloco.addEventListener("click", (evento) => {
        if (!evento.target?.closest?.("[data-v455-hoje]")) return;
        const campo = document.getElementById("goalDate");
        if (!campo) return;
        campo.value = hoje();
        campo.dispatchEvent(new Event("change", { bubbles: true }));
      });
      secao.prepend ? secao.prepend(bloco) : secao.appendChild(bloco);
    }
    return bloco;
  }

  function atualizarAviso() {
    const bloco = aviso();
    if (!bloco) return false;
    const data = dataNaTela();
    const diferente = Boolean(data) && data !== hoje();
    bloco.hidden = !diferente;
    if (diferente) {
      bloco.innerHTML = `<strong>Você está vendo ${dataBR(data)}, não hoje.</strong>`
        + `<span class="item-meta">O tempo que você lançar continua contando para o dia de hoje.</span>`
        + `<button type="button" class="secondary-button" data-v455-hoje>Voltar para hoje</button>`;
    }
    return diferente;
  }

  function install() {
    if (typeof document === "undefined") return false;
    instalarFolha();
    instalarEstilo();
    if (!aviso()) return false;
    atualizarAviso();
    const campo = document.getElementById("goalDate");
    if (campo && !campo.__v455) {
      campo.__v455 = true;
      campo.addEventListener("change", () => { try { atualizarAviso(); } catch {} });
    }
    return true;
  }

  const api = Object.freeze({ version: VERSION, install, atualizarAviso, css, cores: CORES, avisoId: AVISO_ID, folha: FOLHA });
  globalThis[FLAG] = api;

  if (typeof document !== "undefined") {
    if (!install()) {
      let tentativas = 0;
      const timer = setInterval(() => {
        if (install() || (tentativas += 1) >= 100) clearInterval(timer);
      }, 200);
    }
  }
})();
