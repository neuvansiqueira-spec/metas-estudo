/* Teto diario de metas do Plano do Dia — v607. */
(() => {
  "use strict";

  // O dia nunca pode ficar com mais metas PENDENTES do que a cota, contando
  // tudo: peca diaria, metas do planejamento e metas manuais que ja estejam la.
  //
  // Dois furos justificam este modulo:
  //
  // 1. `script.js:7408` calcula `maxGoals` e limita `chosen.length`, ou seja, o
  //    LOTE NOVO. Nao olha quantas metas o dia ja tem. Como a V427 tornou o
  //    botao "Atualizar conforme planejamento" aditivo de proposito — para nao
  //    apagar o que o usuario preparou —, cada clique somava ate `maxGoals` ao
  //    que ja estava la. Dias de setembro chegaram a 10 metas e 9h30.
  //
  // 2. A peca diaria da V183 entra por fora: o guarda dela faz `output.unshift`
  //    depois da geracao, e o `ensureDailyPieceForDate` empurra direto no
  //    estado na reconciliacao. Em 07/09/2026 o dia saiu com 3 metas — 2 da
  //    cota mais a peca — e o usuario corrigiu: "NUNCA PEDI 3 METAS POR DIA".
  //
  // O ponto de estrangulamento e unico: os dois botoes passam por
  // `reconcileDailyGoalsWithPlanning` (`script.js:7864` e `script.js:7384`), e e
  // dentro dessa chamada que a V183 injeta a peca. Envolver essa funcao depois
  // da V183 cobre os dois caminhos com um invólucro so.
  //
  // Este modulo NUNCA apaga meta preexistente. Dia que ja passou da cota fica
  // como esta; o teto so barra entrada. O unico descarte possivel e de metas
  // criadas na propria chamada, que nunca existiram antes dela.

  const VERSION = "20260908-cota-do-planejamento-manda-v609";
  const FLAG = "__ALDUS_DAILY_QUOTA_V607__";
  const MARCA = "__aldusDailyQuotaV607";
  const COTA_PADRAO = 2;
  const ORIGEM_PECA = "planejamento peça diária";

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch { /* nada a fazer */ }
    return;
  }

  // `script.js` declara o estado como `const state`, que nao existe em
  // globalThis. O identificador direto e o unico caminho.
  function estadoDoApp() {
    try {
      // eslint-disable-next-line no-undef
      if (state && typeof state === "object" && !Array.isArray(state)) return state;
    } catch { /* binding inexistente ou em TDZ */ }
    return null;
  }

  const dataDe = (meta) => String(meta?.date || meta?.data || "").slice(0, 10);
  const pendente = (meta) => !/^conclu/i.test(String(meta?.status || "").trim());
  const ehPeca = (meta) =>
    meta?.fixedDailyPieceV183 === true ||
    String(meta?.origin || meta?.origem || "").trim() === ORIGEM_PECA;

  // V609 — QUEM MANDA E A TELA DE PLANEJAMENTO.
  //
  // Ao salvar aquele formulario, `recordManualCount` (planning-integrity-v235.js:103)
  // grava o numero do usuario nas tres fontes: planning.config.topicsPerDay,
  // disciplinesPerDay e o snapshot manualGoalsConfigV235. E o ajuste dele.
  //
  // A primeira versao deste modulo lia o carimbo da V427 ANTES do config, para
  // resistir a uma execucao tardia da migracao da V426, que escreve 8. O efeito
  // colateral era grave: trocar o numero no Planejamento nao surtia efeito
  // nenhum, porque o teto continuava no valor carimbado. Ele reclamou, com
  // razao: "EU QUE DEFINO QUANTAS METAS NO DIA PELA AREA DO PLANEJAMENTO".
  //
  // Agora o config vem primeiro. O carimbo da V427 so entra quando o config
  // esta ausente ou invalido — e nunca para reduzir o que o usuario pediu.
  function cotaDe(alvo) {
    const doConfig = Number(alvo?.planning?.config?.topicsPerDay);
    if (Number.isFinite(doConfig) && doConfig > 0) return doConfig;
    const doMarcador = Number(alvo?.migrations?.planningStabilityV427?.targetQuota?.topics);
    if (Number.isFinite(doMarcador) && doMarcador > 0) return doMarcador;
    return COTA_PADRAO;
  }

  function pendentesEm(alvo, dia) {
    return (alvo?.dailyGoals || []).filter((meta) => dataDe(meta) === dia && pendente(meta));
  }

  function avisar(texto) {
    try {
      // eslint-disable-next-line no-undef
      if (typeof showDailyGoalMessage === "function") showDailyGoalMessage(texto, "warning");
    } catch { /* a mensagem e util, nao essencial */ }
  }

  function relatorioBloqueado(dia, limite, jaHavia) {
    return {
      added: [], removed: [], preserved: [], warnings: [],
      found: 0, foundTopics: 0, expected: 0, expectedTopics: 0,
      date: dia,
      quotaV607: { limite, jaHavia, vagas: 0, entraram: 0, cortadas: 0, bloqueado: true }
    };
  }

  function install() {
    // eslint-disable-next-line no-undef
    if (typeof reconcileDailyGoalsWithPlanning !== "function") return false;
    // eslint-disable-next-line no-undef
    const original = reconcileDailyGoalsWithPlanning;
    if (original[MARCA]) return true;

    const comTeto = function reconcileComTetoDiarioV607(alvo, dataBruta, opcoes = {}) {
      const estado = alvo || estadoDoApp();
      const dia = String(dataBruta || "").slice(0, 10);
      if (!estado || !Array.isArray(estado.dailyGoals) || !dia) {
        return original.apply(this, arguments);
      }

      const limite = cotaDe(estado);
      const jaHavia = pendentesEm(estado, dia).length;
      const vagas = Math.max(0, limite - jaHavia);

      if (vagas === 0) {
        avisar(
          `Limite diário: ${limite} meta(s) pendente(s) por dia. Já havia ${jaHavia}; ` +
          "cabiam 0; entraram 0. Todas as metas existentes foram mantidas."
        );
        return relatorioBloqueado(dia, limite, jaHavia);
      }

      const idsAntes = new Set(estado.dailyGoals.map((meta) => meta.id));
      const comLimite = { ...opcoes };
      const limitar = (valor) => {
        const pedido = Number(valor);
        return Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, vagas) : vagas;
      };
      comLimite.topicLimit = limitar(comLimite.topicLimit);
      comLimite.maxGoals = limitar(comLimite.maxGoals);

      const relatorio = original.call(this, estado, dia, comLimite) || {};

      // Rede de seguranca: a peca da V183 entra por fora do topicLimit. Se o dia
      // passou do teto, saem SOMENTE metas criadas nesta chamada, e a peca e a
      // ultima a ser cortada — ela ocupa uma das vagas, por decisao do usuario.
      let cortadas = 0;
      const atuais = pendentesEm(estado, dia);
      if (atuais.length > limite) {
        const novas = atuais.filter((meta) => !idsAntes.has(meta.id));
        const sobrando = Math.min(atuais.length - limite, novas.length);
        if (sobrando > 0) {
          const ordenadas = [...novas].sort((a, b) => Number(ehPeca(b)) - Number(ehPeca(a)));
          const fora = new Set(ordenadas.slice(ordenadas.length - sobrando).map((meta) => meta.id));
          estado.dailyGoals = estado.dailyGoals.filter((meta) => !fora.has(meta.id));
          if (Array.isArray(relatorio.added)) {
            relatorio.added = relatorio.added.filter((meta) => !fora.has(meta.id));
          }
          cortadas = fora.size;
        }
      }

      const entraram = pendentesEm(estado, dia).length - jaHavia;
      avisar(
        `Limite diário: ${limite} meta(s) pendente(s) por dia. Já havia ${jaHavia}; ` +
        `cabiam ${vagas}; entraram ${Math.max(0, entraram)}.`
      );
      relatorio.quotaV607 = { limite, jaHavia, vagas, entraram: Math.max(0, entraram), cortadas, bloqueado: false };
      return relatorio;
    };

    Object.defineProperty(comTeto, MARCA, { value: true });
    // eslint-disable-next-line no-undef
    reconcileDailyGoalsWithPlanning = comTeto;
    return true;
  }

  const api = Object.freeze({ version: VERSION, install, cotaDe, pendentesEm, ehPeca, marca: MARCA });
  globalThis[FLAG] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  // Sem polling sobre metas: a espera e so pela funcao do `script.js` aparecer,
  // e para nada assim que ela chega.
  if (typeof window !== "undefined" && !install()) {
    let tentativas = 0;
    const relogio = setInterval(() => {
      if (install() || (tentativas += 1) >= 100) clearInterval(relogio);
    }, 200);
  }
})();
