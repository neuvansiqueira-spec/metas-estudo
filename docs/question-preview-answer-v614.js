/* Gabarito e justificativa na prévia do banco de questões — v614. */
(() => {
  "use strict";

  // A previa de importacao mostrava so disciplina, assunto e enunciado
  // (`script.js:6306`). O usuario confere as questoes ali antes de salvar e nao
  // via a justificativa, e concluiu que ela nao estava sendo importada — quando
  // na verdade estava: `normalizeQuestionBankItem` grava `justificativa` e
  // `gabarito`, e a V451 compoe o texto vindo do JSON. Faltava exibir.
  //
  // Este modulo envolve `qbPreview` e, depois que a previa original e desenhada,
  // acrescenta o gabarito e a justificativa a cada item. Nada e recalculado: os
  // dados vem de `qbFilteredQuestions()`, a mesma fonte que a previa usa.

  const VERSION = "20260908-previa-com-gabarito-v614";
  const FLAG = "__ALDUS_QB_PREVIEW_ANSWER_V614__";
  const MARCA = "__aldusQbPreviewAnswerV614";
  const CAIXA = "qbFilteredPreview";
  const ITEM = ".qb-preview-item";
  const MARCA_ITEM = "data-aldus-v614";

  if (globalThis[FLAG]) {
    try { globalThis[FLAG].install?.(); } catch { /* nada a fazer */ }
    return;
  }

  const texto = (valor) => String(valor ?? "").trim();

  function escapar(valor) {
    try {
      // eslint-disable-next-line no-undef
      if (typeof escapeHTML === "function") return escapeHTML(String(valor ?? ""));
    } catch { /* usa o escape proprio */ }
    return String(valor ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  const emLinhas = (valor) => escapar(valor).replace(/\r?\n/g, "<br>");

  // O gabarito sozinho e uma letra. Com a alternativa ao lado, ele se le.
  function respostaLegivel(questao) {
    const gabarito = texto(questao?.gabarito);
    if (!gabarito) return "";
    const alternativas = questao?.alternativas && typeof questao.alternativas === "object"
      ? questao.alternativas
      : {};
    const correta = texto(alternativas[gabarito]);
    return correta ? `${gabarito}) ${correta}` : gabarito;
  }

  function bloco(questao) {
    const partes = [];
    const resposta = respostaLegivel(questao);
    const justificativa = texto(questao?.justificativa) || texto(questao?.fundamento);
    if (resposta) partes.push(`<p class="qb-preview-gabarito"><strong>Gabarito:</strong> ${emLinhas(resposta)}</p>`);
    if (justificativa) partes.push(`<p class="qb-preview-justificativa"><strong>Justificativa:</strong> ${emLinhas(justificativa)}</p>`);
    if (!partes.length) {
      partes.push('<p class="qb-preview-gabarito item-meta">Sem gabarito e sem justificativa neste item.</p>');
    }
    return partes.join("");
  }

  function pintar() {
    if (typeof document === "undefined") return 0;
    const caixa = document.getElementById(CAIXA);
    if (!caixa) return 0;
    let lista = [];
    try {
      // eslint-disable-next-line no-undef
      if (typeof qbFilteredQuestions === "function") lista = qbFilteredQuestions() || [];
    } catch { return 0; }
    if (!Array.isArray(lista) || !lista.length) return 0;
    const itens = caixa.querySelectorAll(ITEM);
    let pintados = 0;
    itens.forEach((artigo, indice) => {
      if (artigo.hasAttribute(MARCA_ITEM)) return;
      const questao = lista[indice];
      if (!questao) return;
      artigo.setAttribute(MARCA_ITEM, "1");
      artigo.insertAdjacentHTML("beforeend", bloco(questao));
      pintados += 1;
    });
    return pintados;
  }

  function install() {
    // eslint-disable-next-line no-undef
    if (typeof qbPreview !== "function") return false;
    // eslint-disable-next-line no-undef
    const original = qbPreview;
    if (original[MARCA]) return true;
    const comResposta = function qbPreviewComGabaritoV614() {
      const saida = original.apply(this, arguments);
      try { pintar(); } catch (erro) {
        console.warn("[Aldus V614] Não foi possível mostrar gabarito e justificativa na prévia.", erro);
      }
      return saida;
    };
    Object.defineProperty(comResposta, MARCA, { value: true });
    // eslint-disable-next-line no-undef
    qbPreview = comResposta;
    return true;
  }

  const api = Object.freeze({ version: VERSION, install, pintar, bloco, respostaLegivel });
  globalThis[FLAG] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  // A espera e so pela funcao do script.js aparecer, e para assim que ela chega.
  if (typeof window !== "undefined" && !install()) {
    let tentativas = 0;
    const relogio = setInterval(() => {
      if (install() || (tentativas += 1) >= 100) clearInterval(relogio);
    }, 200);
  }
})();
