/* Metas em aberto de dias anteriores, no Plano do Dia — v452. */
(() => {
  "use strict";

  const VERSION = "20260906-daily-plan-backlog-v452";
  const FLAG = "__ALDUS_DAILY_PLAN_BACKLOG_V452__";
  const PAINEL_ID = "aldusDailyPlanBacklogV452";
  const SECAO = "view-metas-do-dia";
  const LIMITE = 40;

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  const estado = () => {
    try { if (typeof state !== "undefined" && state) return state; } catch {}
    return null;
  };
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
  const dataDe = (meta) => String(meta?.date || meta?.data || "");
  const concluida = (meta) => {
    const r = chamar("isGoalDone", meta);
    return r === undefined ? meta?.status === "Concluída" : Boolean(r);
  };
  const minutosDe = (meta) => {
    const r = chamar("goalTotalActualMinutes", meta);
    if (typeof r === "number") return Math.max(0, r);
    return Math.max(0, Number(meta?.actualMinutes || meta?.minutosRealizados || 0) || 0);
  };
  const escapar = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const dataBR = (iso) => {
    const r = chamar("formatDateBR", iso);
    if (typeof r === "string" && r) return r;
    const [a, m, d] = String(iso).split("-");
    return a && m && d ? `${d}/${m}/${a}` : String(iso);
  };
  function horas(minutos) {
    if (!minutos) return "sem tempo lançado";
    const h = Math.floor(minutos / 60), m = minutos % 60;
    return h ? `${h}h${String(m).padStart(2, "0")} já estudados` : `${m} min já estudados`;
  }

  // O Plano do Dia mostra apenas `goalDateValue(goal) === date`. Meta de ontem
  // que ficou pela metade continua no banco, pendente, e some da tela — some
  // inclusive do painel de escolher assunto, que exige zero minuto lançado
  // (isPendingReplacementGoalV158). Esta lista é exatamente esse conjunto.
  function emAberto(s = estado(), limite = hoje()) {
    if (!s || !Array.isArray(s.dailyGoals)) return [];
    return s.dailyGoals
      .filter((meta) => {
        const data = dataDe(meta);
        if (!data || data >= limite) return false;
        if (concluida(meta)) return false;
        const estudo = chamar("isPlanningStudyGoal", meta);
        return estudo === undefined ? true : Boolean(estudo);
      })
      .map((meta) => {
        const d = chamar("canonicalStudyDescriptor", meta) || {};
        return {
          id: String(meta.id || ""),
          data: dataDe(meta),
          disciplina: String(d.discipline || meta.discipline || meta.disciplina || ""),
          assunto: String(d.subject || meta.subject || meta.assunto || ""),
          minutos: minutosDe(meta),
          status: String(meta.status || "Pendente")
        };
      })
      // Primeiro as que já têm tempo dentro — são as interrompidas, que ele
      // quer retomar. Depois as intocadas, da mais recente para a mais antiga.
      .sort((a, b) => (b.minutos - a.minutos) || b.data.localeCompare(a.data));
  }

  function irParaODia(data) {
    try {
      const campo = document.getElementById("goalDate");
      if (!campo) return false;
      campo.value = data;
      campo.dispatchEvent(new Event("change", { bubbles: true }));
      campo.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return true;
    } catch { return false; }
  }

  function linhas(lista) {
    if (!lista.length) return '<p class="file-info">Nenhuma meta em aberto de dias anteriores.</p>';
    const visiveis = lista.slice(0, LIMITE);
    const corpo = visiveis.map((m) => `
      <li class="item-meta" style="display:flex;gap:.75rem;align-items:baseline;flex-wrap:wrap;padding:.35rem 0;">
        <strong>${escapar(dataBR(m.data))}</strong>
        <span>${escapar(m.disciplina)}${m.assunto ? " • " + escapar(m.assunto) : ""}</span>
        <span>${escapar(horas(m.minutos))}</span>
        <button type="button" class="secondary-button" data-v452-ir="${escapar(m.data)}">Ir para o dia</button>
      </li>`).join("");
    const sobra = lista.length - visiveis.length;
    return `<ul style="list-style:none;padding:0;margin:0;">${corpo}</ul>`
      + (sobra > 0 ? `<p class="file-info">e mais ${sobra} meta(s) em aberto.</p>` : "");
  }

  function desenhar(bloco) {
    const lista = emAberto();
    const alvo = bloco.querySelector('[data-v452="lista"]');
    if (alvo) alvo.innerHTML = linhas(lista);
    const resumo = bloco.querySelector('[data-v452="resumo"]');
    if (resumo) {
      const comTempo = lista.filter((m) => m.minutos > 0).length;
      resumo.textContent = lista.length
        ? `${lista.length} em aberto — ${comTempo} já começada(s).`
        : "Nada em aberto.";
    }
    return lista;
  }

  function painel() {
    if (typeof document === "undefined") return null;
    const existente = document.getElementById(PAINEL_ID);
    if (existente) return existente;
    const secao = document.getElementById(SECAO);
    if (!secao) return null;

    const bloco = document.createElement("details");
    bloco.id = PAINEL_ID;
    bloco.className = "choose-subject-day-panel";
    bloco.innerHTML = `
      <summary>Metas em aberto de dias anteriores <span data-v452="resumo" class="item-meta"></span></summary>
      <p class="file-info">Metas pendentes de datas passadas, começadas ou não. As com tempo lançado vêm primeiro. Nada é movido: o botão só leva você ao dia da meta.</p>
      <div data-v452="lista"></div>
    `;
    secao.appendChild(bloco);

    bloco.addEventListener("toggle", () => { if (bloco.open) desenhar(bloco); });
    bloco.addEventListener("click", (evento) => {
      const data = evento.target?.closest?.("button[data-v452-ir]")?.dataset?.v452Ir;
      if (data) irParaODia(data);
    });

    desenhar(bloco);
    return bloco;
  }

  function install() {
    if (typeof document === "undefined") return false;
    const bloco = painel();
    if (!bloco) return false;
    if (bloco.open) desenhar(bloco);
    return true;
  }

  const api = Object.freeze({ version: VERSION, install, emAberto, irParaODia, painelId: PAINEL_ID, limite: LIMITE });
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
