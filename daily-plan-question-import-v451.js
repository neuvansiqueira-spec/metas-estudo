/* Registrar questoes do cartao sem sair do Plano do Dia, e aproveitar as
   justificativas que o cartao exporta — v451. */
(() => {
  "use strict";

  const VERSION = "20260906-daily-plan-question-import-v451";
  const FLAG = "__ALDUS_DAILY_PLAN_QUESTION_IMPORT_V451__";
  const PAINEL_ID = "aldusDailyPlanQuestionImportV451";
  const SECAO = "view-metas-do-dia";

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch {}
    return;
  }

  const texto = (valor) => String(valor ?? "").trim();

  // ------------------------------------------------------------------
  // 1) As justificativas do cartao estavam sendo jogadas fora.
  //
  // O cartao do ChatGPT exporta dois campos separados por fonte:
  //   justificativa_qconcursos  — fundamento verificavel do QC
  //   explicacao_complementar   — raciocinio do proprio modelo
  //
  // questionBankExplanation nao conhece nenhum dos dois. A cadeia dele termina
  // em `observacoes`, que num JSON do cartao contem "Acertei — marquei C,
  // correta C — 06/09/2026". Resultado: o campo de justificativa do banco
  // ficava com o registro do acerto no lugar da explicacao.
  //
  // Aqui os dois campos entram na frente, com a fonte escrita junto — do jeito
  // que o cartao rotula — para que a distincao sobreviva dentro do site.
  // ------------------------------------------------------------------
  // V615 — a original e resolvida na hora do uso, nao na carga.
  //
  // Antes ela era capturada num const no momento em que este arquivo rodava.
  // Quando o modulo chegava antes de o script.js definir a funcao, o const
  // virava null, instalarExplicacao() desistia na hora e nunca mais tentava —
  // o laco de repeticao no fim do arquivo so refaz o painel. O resultado era
  // silencioso e intermitente: dependendo da ordem de carga da visita, a
  // importacao gravava a justificativa ou a perdia. Medido em 08/09/2026: de
  // 684 questoes no banco, so 25 tinham o formato composto.
  let explicacaoOriginal = null;
  function originalDaExplicacao() {
    if (explicacaoOriginal) return explicacaoOriginal;
    const atual = globalThis.questionBankExplanation;
    if (typeof atual === "function" && atual !== explicacaoV451) explicacaoOriginal = atual;
    return explicacaoOriginal;
  }

  function explicacaoV451(raw = {}) {
    const partes = [];
    const doQc = texto(raw.justificativa_qconcursos ?? raw.justificativaQconcursos ?? raw.justificativaQc);
    const propria = texto(raw.explicacao_complementar ?? raw.explicacaoComplementar);
    if (doQc) partes.push(`Justificativa — QConcursos: ${doQc}`);
    if (propria) partes.push(`Explicação complementar: ${propria}`);
    if (partes.length) return partes.join("\n\n");
    try { const anterior = originalDaExplicacao(); return anterior ? anterior(raw) : ""; } catch { return ""; }
  }

  function instalarExplicacao() {
    if (globalThis.questionBankExplanation === explicacaoV451) return true;
    // O script.js ainda nao chegou. Tentar de novo depois, sem desistir.
    if (typeof globalThis.questionBankExplanation !== "function") return false;
    originalDaExplicacao();
    try { globalThis.questionBankExplanation = explicacaoV451; return true; } catch { return false; }
  }

  // ------------------------------------------------------------------
  // 2) O painel no Plano do Dia.
  //
  // Ele nao reimplanta importacao nenhuma: monta um arquivo com o texto colado
  // e entrega ao mesmo <input id="qbFile"> da Fabrica. A revisao da V192 escuta
  // o change no document e abre o mesmo painel de conferencia de sempre, com
  // validas, novas, certas, erradas e o Caderno de Erros.
  // ------------------------------------------------------------------
  function entradaDaFabrica() {
    try { return document.getElementById("qbFile"); } catch { return null; }
  }

  function enviarParaRevisao(conteudo) {
    const entrada = entradaDaFabrica();
    if (!entrada) return { erro: "Não encontrei a importação da Fábrica nesta página. Recarregue e tente de novo." };
    try { JSON.parse(conteudo); }
    catch { return { erro: "Isso não é um JSON válido. Copie do cartão a partir da chave { até a última }." }; }
    try {
      const arquivo = new File([conteudo], "cartao-questoes.json", { type: "application/json" });
      const dados = new DataTransfer();
      dados.items.add(arquivo);
      entrada.files = dados.files;
      entrada.dispatchEvent(new Event("change", { bubbles: true }));
      return { enviado: true };
    } catch (error) {
      return { erro: `Não consegui abrir a revisão: ${error?.message || error}` };
    }
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
      <summary>Registrar questões do cartão (JSON)</summary>
      <p class="file-info">Cole o JSON do cartão. Abre a mesma revisão da Fábrica, sem sair do Plano do Dia.</p>
      <label class="wide">JSON do cartão
        <textarea data-v451="texto" rows="5" spellcheck="false" placeholder='{ "questionBank": [ ... ] }'></textarea>
      </label>
      <div class="actions wide">
        <button type="button" data-v451="importar">Revisar e registrar</button>
        <button type="button" class="secondary-button" data-v451="limpar">Limpar</button>
      </div>
      <p class="file-info" data-v451="status" aria-live="polite"></p>
    `;
    secao.appendChild(bloco);

    bloco.addEventListener("click", (evento) => {
      const acao = evento.target?.closest?.("button[data-v451]")?.dataset?.v451;
      if (!acao) return;
      const campo = bloco.querySelector('[data-v451="texto"]');
      const status = bloco.querySelector('[data-v451="status"]');
      if (acao === "limpar") { campo.value = ""; status.textContent = ""; return; }
      if (acao !== "importar") return;
      const conteudo = texto(campo.value);
      if (!conteudo) { status.textContent = "Cole o JSON antes de registrar."; return; }
      const resultado = enviarParaRevisao(conteudo);
      if (resultado.erro) { status.textContent = resultado.erro; return; }
      status.textContent = "Revisão aberta. Confira e confirme para gravar no banco.";
      campo.value = "";
    });

    return bloco;
  }

  function install() {
    const explicacao = instalarExplicacao();
    const ui = typeof document !== "undefined" ? Boolean(painel()) : false;
    return explicacao && ui;
  }

  const api = Object.freeze({
    version: VERSION,
    install,
    painelId: PAINEL_ID,
    explicacao: explicacaoV451,
    instalarExplicacao,
    originalDaExplicacao,
    enviarParaRevisao
  });
  globalThis[FLAG] = api;

  // As duas instalacoes sao independentes: a do painel depende do DOM, a da
  // explicacao depende do script.js. Esperar pelas duas, sem uma mascarar a outra.
  function instalarTudo() {
    const explicacaoPronta = instalarExplicacao();
    const painelPronto = install();
    return explicacaoPronta && painelPronto;
  }

  if (typeof document !== "undefined") {
    if (!instalarTudo()) {
      let tentativas = 0;
      const timer = setInterval(() => {
        if (instalarTudo() || (tentativas += 1) >= 100) clearInterval(timer);
      }, 200);
    }
  } else {
    instalarExplicacao();
  }
})();
