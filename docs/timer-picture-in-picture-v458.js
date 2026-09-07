/* O cronômetro numa janela que fica por cima de tudo — v458. */
(() => {
  "use strict";

  const VERSION = "20260906-timer-picture-in-picture-v458";
  const FLAG = "__ALDUS_TIMER_PIP_V458__";
  const BOTAO_ID = "aldusTimerPipButtonV458";
  const ATUALIZACAO_MS = 500;

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  let janela = null;
  let relogio = null;

  const texto = (id) => {
    try { return String(document.getElementById(id)?.textContent || "").trim(); } catch { return ""; }
  };
  const suportado = () => {
    try { return typeof documentPictureInPicture?.requestWindow === "function"; } catch { return false; }
  };

  // O painel espelha os elementos reais da página. Nada de recalcular tempo
  // aqui: o que o site mostra é o que aparece na janela, inclusive o tempo
  // extra da V450 e a contagem regressiva. Um cálculo paralelo divergiria.
  function leitura() {
    let alerta = "";
    try {
      const caixa = document.getElementById("timerAlert");
      if (caixa && !caixa.hidden) alerta = String(caixa.textContent || "").trim();
    } catch {}
    return {
      disciplina: texto("timerDiscipline"),
      assunto: texto("timerSubject"),
      tempo: texto("timerTime") || "00:00:00",
      progresso: texto("timerProgressText"),
      acao: texto("timerPauseResume") || "Pausar",
      alerta
    };
  }

  // Os botões não reimplementam nada: clicam nos botões reais da página, para
  // que toda a lógica já existente valha — inclusive a retomada da V268 depois
  // do tempo concluído.
  function acionar(seletor) {
    try {
      const alvo = document.querySelector(seletor);
      if (!alvo) return false;
      alvo.click();
      return true;
    } catch { return false; }
  }

  const ESTILO = `
    :root { color-scheme: dark; }
    body {
      margin: 0; padding: 14px 16px;
      font: 14px/1.4 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #f5f9fd;
      background:
        radial-gradient(circle at 12% 14%, rgba(29, 115, 199, .22) 0%, rgba(0, 0, 0, 0) 46%),
        linear-gradient(145deg, #0d2b45 0%, #061a2d 100%);
      display: flex; flex-direction: column; gap: 8px; height: 100vh; box-sizing: border-box;
    }
    .disciplina { font-size: .74rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: #3da3ff; }
    .assunto { font-size: .84rem; color: #b8cadd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tempo { font-size: 2.6rem; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; line-height: 1; margin: 2px 0; }
    .progresso { font-size: .74rem; color: #b8cadd; }
    .alerta { font-size: .78rem; font-weight: 700; color: #f2c957; }
    .acoes { display: flex; gap: 8px; margin-top: auto; }
    button {
      flex: 1; font: inherit; font-weight: 700; cursor: pointer;
      padding: 9px 10px; border-radius: 10px;
      border: 1px solid rgba(61, 163, 255, .5); background: #0e2d4c; color: #f5f9fd;
    }
    button.salvar { border-color: rgba(54, 203, 192, .55); }
    button:hover { border-color: #3da3ff; }
  `;

  function montar(doc) {
    const estilo = doc.createElement("style");
    estilo.textContent = ESTILO;
    doc.head.appendChild(estilo);
    doc.body.innerHTML = `
      <span class="disciplina" data-pip="disciplina"></span>
      <span class="assunto" data-pip="assunto"></span>
      <strong class="tempo" data-pip="tempo">00:00:00</strong>
      <span class="progresso" data-pip="progresso"></span>
      <span class="alerta" data-pip="alerta"></span>
      <div class="acoes">
        <button type="button" data-pip-acao="pausar">Pausar</button>
        <button type="button" class="salvar" data-pip-acao="salvar">Salvar</button>
      </div>
    `;
    doc.body.addEventListener("click", (evento) => {
      const acao = evento.target?.closest?.("button[data-pip-acao]")?.dataset?.pipAcao;
      if (acao === "pausar") acionar("#timerPauseResume");
      if (acao === "salvar") {
        acionar('#floatingTimer [data-timer-action="save"]');
        // O modal de salvar abre na janela principal; trazer o foco para lá.
        try { window.focus(); } catch {}
      }
    });
  }

  function pintar(doc) {
    const dados = leitura();
    const por = (chave) => doc.querySelector(`[data-pip="${chave}"]`);
    if (por("disciplina")) por("disciplina").textContent = dados.disciplina;
    if (por("assunto")) por("assunto").textContent = dados.assunto;
    if (por("tempo")) por("tempo").textContent = dados.tempo;
    if (por("progresso")) por("progresso").textContent = dados.progresso;
    const alerta = por("alerta");
    if (alerta) { alerta.textContent = dados.alerta; alerta.hidden = !dados.alerta; }
    const pausar = doc.querySelector('[data-pip-acao="pausar"]');
    if (pausar) pausar.textContent = dados.acao;
    return dados;
  }

  function fechar() {
    if (relogio) { clearInterval(relogio); relogio = null; }
    janela = null;
    const botao = document.getElementById(BOTAO_ID);
    if (botao) botao.textContent = "Janela flutuante";
  }

  async function abrir() {
    if (!suportado()) {
      return { erro: "Este navegador não tem a janela flutuante. Ela existe no Chrome e no Edge recentes." };
    }
    if (janela) { try { janela.focus(); } catch {} return { jaAberta: true }; }
    try {
      janela = await documentPictureInPicture.requestWindow({ width: 340, height: 220 });
    } catch (error) {
      janela = null;
      return { erro: `Não consegui abrir a janela flutuante: ${error?.message || error}` };
    }
    montar(janela.document);
    pintar(janela.document);
    relogio = setInterval(() => {
      try { if (janela?.document) pintar(janela.document); } catch {}
    }, ATUALIZACAO_MS);
    janela.addEventListener("pagehide", fechar, { once: true });
    const botao = document.getElementById(BOTAO_ID);
    if (botao) botao.textContent = "Janela aberta";
    return { aberta: true };
  }

  function install() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(BOTAO_ID)) return true;
    // V606 — a barra de acoes que e FILHA DIRETA do painel. O #floatingTimer tem
    // duas .floating-timer-actions, e a primeira mora dentro de #timerCompletion,
    // a secao que so aparece quando o tempo acaba. Sem o ">", o querySelector
    // devolvia essa: o botao existia no DOM e nunca aparecia na tela.
    const acoes = document.querySelector("#floatingTimer > .floating-timer-actions");
    if (!acoes) return false;
    const botao = document.createElement("button");
    botao.id = BOTAO_ID;
    botao.type = "button";
    botao.className = "secondary-button";
    botao.textContent = "Janela flutuante";
    // Fileira propria, largura inteira: cai logo abaixo de Zerar e Fechar.
    botao.style.cssText = "flex:1 1 100%";
    botao.title = "Abre o cronômetro numa janela que fica por cima de outros programas";
    botao.addEventListener("click", async () => {
      const r = await abrir();
      if (r?.erro && typeof showDailyGoalMessage === "function") showDailyGoalMessage(r.erro, "warning");
    });
    acoes.appendChild(botao);
    return true;
  }

  const api = Object.freeze({ version: VERSION, install, abrir, fechar, leitura, pintar, montar, suportado, botaoId: BOTAO_ID });
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
