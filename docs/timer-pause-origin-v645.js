/* V645 — De onde veio cada pausa do cronômetro.
   28/09/2026: o cronômetro aparecia pausado ("Continuar") sem ele ter pausado.
   O diagnóstico da V316 só registra retomadas e pausas por outra aba; nenhuma
   destas apareceu. Esta camada só ANOTA: a cada mudança entre correndo e
   pausado, grava a hora e a origem mais provável do último clique:
   - "botão na página"      clique de verdade no Pausar da página;
   - "janela flutuante"     clique de verdade dentro da janela flutuante;
   - "atalho do teclado"    clique de programa sem clique na janela (extensão);
   - "fim do tempo previsto" congelamento da conclusão;
   - "sem clique"           nenhuma das anteriores (o próprio site).
   Não pausa, não retoma e não grava nos dados do estudo. */
(() => {
  "use strict";
  const VERSION = "20260928-origem-das-pausas-v645";
  const KEY = "__ALDUS_TIMER_PAUSE_ORIGIN_V645__";
  const LOG_KEY = "aldus:timer:pausas:v645";
  const MAX = 100;
  // Aba em segundo plano: o Chrome pode atrasar a vigia em até ~1 min.
  const JANELA_CLIQUE_MS = 90000;
  if (globalThis[KEY]) return;

  let ultimoClique = null;   // { at, origem, alvo }
  let pipDoc = null;
  let anterior = null;       // { goalId, estado }

  const agora = () => Date.now();
  function cronometro() {
    try { return typeof floatingTimer === "object" && floatingTimer ? floatingTimer : null; } catch { return null; }
  }
  function estadoDe(timer) {
    if (!timer?.goalId) return "fechado";
    if (timer.completed && timer.paused) return "concluido";
    return timer.paused ? "pausado" : "correndo";
  }

  function marcar(origem, alvo) { ultimoClique = { at: agora(), origem, alvo }; }
  function ehBotaoPausa(el) { return Boolean(el?.closest?.('#timerPauseResume, #floatingTimer [data-timer-action="pause"], [data-timer-action="continue"]')); }

  // Página: clique de verdade (isTrusted) = ele; clique de programa = janela
  // flutuante (se ela acabou de ser clicada) ou atalho do teclado.
  function ouvirPagina() {
    if (typeof document === "undefined" || document.__aldusPauseOriginV645) return;
    document.__aldusPauseOriginV645 = true;
    // V660 — no documento, este ouvinte podia ficar atrás do da V268, que barra o
    // clique (stopImmediatePropagation) conforme a ordem de carga; os apertos dele
    // saíam como "sem clique" (registro de 05/10/2026). A janela recebe a captura
    // antes do documento, então aqui nenhum clique se perde.
    const alvoDosCliques = typeof window !== "undefined" && typeof window.addEventListener === "function" ? window : document;
    alvoDosCliques.addEventListener("click", (event) => {
      if (!ehBotaoPausa(event.target)) return;
      passada();
      if (event.isTrusted) { marcar("botão na página", "página"); return; }
      const recentePip = ultimoClique?.origem === "janela flutuante" && agora() - ultimoClique.at < 1500;
      if (!recentePip) marcar("atalho do teclado (extensão)", "programa");
    }, true);
  }

  function ouvirJanelaFlutuante() {
    let doc = null;
    try { doc = globalThis.documentPictureInPicture?.window?.document || null; } catch {}
    if (!doc || doc === pipDoc) return;
    pipDoc = doc;
    doc.addEventListener("click", (event) => {
      const acao = event.target?.closest?.("button[data-pip-acao]")?.dataset?.pipAcao;
      if (event.isTrusted && acao === "pausar") marcar("janela flutuante", "janela");
    }, true);
  }

  function gravar(entrada) {
    try {
      const lista = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      lista.push(entrada);
      localStorage.setItem(LOG_KEY, JSON.stringify(lista.slice(-MAX)));
    } catch {}
  }

  function passada() {
    ouvirPagina();
    ouvirJanelaFlutuante();
    const timer = cronometro();
    const atual = { goalId: timer?.goalId || null, estado: estadoDe(timer) };
    if (anterior && anterior.goalId && anterior.goalId === atual.goalId && anterior.estado !== atual.estado) {
      const clique = ultimoClique && agora() - ultimoClique.at < JANELA_CLIQUE_MS ? ultimoClique : null;
      const retomadaAutomatica = anterior.estado === "concluido" && atual.estado === "correndo" && Boolean(timer?.overtimeV450);
      const origem = atual.estado === "concluido" ? "fim do tempo previsto"
        : retomadaAutomatica ? "retomada automática depois do previsto (V450)"
        : (clique?.origem || "sem clique (o próprio site)");
      let visivel = "";
      try { visivel = document.visibilityState; } catch {}
      let janela = false;
      try { janela = Boolean(globalThis.documentPictureInPicture?.window); } catch {}
      gravar({ at: new Date().toISOString(), de: anterior.estado, para: atual.estado, origem, cliqueHaSegundos: clique ? Math.round((agora() - clique.at) / 1000) : null, abaDoSite: visivel, janelaFlutuanteAberta: janela, tempo: (() => { try { return document.getElementById("timerTime")?.textContent || ""; } catch { return ""; } })() });
    }
    anterior = atual;
  }

  const api = Object.freeze({
    version: VERSION,
    passada,
    get registro() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; } }
  });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    ouvirPagina();
    window.setInterval(() => { try { passada(); } catch {} }, 500);
  }
})();
