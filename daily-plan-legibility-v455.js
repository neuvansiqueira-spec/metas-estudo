/* Plano do Dia legível: cada bloco com identidade, e aviso quando o dia não é hoje — v455. */
(() => {
  "use strict";

  const VERSION = "20260906-daily-plan-legibility-v455";
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
  const CORES = [
    ["goals", "#4ade80", "Metas"],
    ["review", "#a78bfa", "Revisão"],
    ["history", "#fbbf24", "Histórico"],
    ["questions", "#38bdf8", "Questões"],
    ["summary", "#94a3b8", "Resumo"],
    ["materials", "#fb7185", "Materiais"],
    ["factory", "#f472b6", "Fábrica"]
  ];

  function css() {
    const porChave = CORES.map(([chave, cor, rotulo]) => `
      #${SECAO} details.daily-plan-section[data-daily-plan-section="${chave}"] { border-left-color: ${cor}; }
      #${SECAO} details.daily-plan-section[data-daily-plan-section="${chave}"] > summary .daily-plan-title::before {
        content: "${rotulo}";
        background: ${cor};
      }`).join("\n");

    return `
      /* V455 — separar os blocos do Plano do Dia. Só aparência. */
      #${SECAO} details.daily-plan-section {
        border-left: 4px solid #64748b;
        margin-block: 0.85rem;
        border-radius: 10px;
      }
      #${SECAO} details.daily-plan-section > summary { padding-block: 0.6rem; }
      #${SECAO} details.daily-plan-section > summary .daily-plan-title { display: inline-flex; align-items: center; gap: 0.6rem; }
      #${SECAO} details.daily-plan-section > summary .daily-plan-title::before {
        content: "Bloco";
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #0b1220;
        background: #64748b;
        padding: 0.12rem 0.45rem;
        border-radius: 999px;
      }
      ${porChave}

      /* Aviso de dia diferente: ele clicou em "Ir para o dia" e leu as metas de
         20/07 achando que eram de hoje. */
      #${AVISO_ID} {
        display: flex; gap: 0.9rem; align-items: center; flex-wrap: wrap;
        border: 1px solid #fbbf24; border-left-width: 5px;
        border-radius: 10px; padding: 0.7rem 0.95rem; margin-block: 0.85rem;
        background: rgba(251, 191, 36, 0.10);
      }
      #${AVISO_ID} strong { font-size: 1rem; }
    `;
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

  const api = Object.freeze({ version: VERSION, install, atualizarAviso, css, cores: CORES, avisoId: AVISO_ID });
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
