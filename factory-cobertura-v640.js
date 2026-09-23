(() => {
  "use strict";

  // V640: a regra de densidade da V635 é enfática, mas tudo que ela manda conferir é interno
  // ("inventarie internamente", "conferência efetiva"), sem nada verificável saindo do modelo.
  // Em 23/09/2026 um resumo do mesmo tema voltou com 1.728 palavras no lugar de 4.003, sem as seis
  // leis do tema e com 5 dos 10 blocos, sem violar nenhuma instrução conferível. Esta seção troca
  // "prometa que cobriu" por "mostre o que cobriu", e proíbe entregar menos do que já existia.
  const VERSION = "20260923-factory-cobertura-v640";
  const MIGRATION_ID = "factoryCoberturaV640";
  const HEADING = "## PROVA DE COBERTURA E NÃO REGRESSÃO";
  const MARKER = "PROVA-DE-COBERTURA-V640";

  // Prompts que produzem documento. A TRIAGEM fica de fora: ela escolhe fontes, não gera arquivo.
  const TYPES = [
    "resumoAula", "resumoAulaJurisprudencia", "lei", "leiJurisprudencia", "jurisprudencia",
    "peca", "consolidacao", "fusaoFinal", "padronizacaoFinalSumario"
  ];

  const SECTION = `${HEADING}

<!-- ${MARKER} -->

ANTES DE PRODUZIR, LISTE NA RESPOSTA DA CONVERSA — NUNCA DENTRO DO ARQUIVO — AS FONTES AUTORIZADAS QUE SERÃO USADAS, PELO NOME DO ARQUIVO, E A BASE NORMATIVA DO TEMA IDENTIFICADA NELAS: LEIS, ARTIGOS, SÚMULAS E JULGADOS.

TODA NORMA PERTINENTE AO RECORTE E PRESENTE NAS FONTES AUTORIZADAS DEVE APARECER NO PRODUTO COM NÚMERO E ANO, JUNTO DO INSTITUTO QUE ELA DISCIPLINA. NÃO SUBSTITUA A NORMA POR EXPRESSÃO GENÉRICA COMO “A LEGISLAÇÃO ESPECÍFICA”, “A LEI ESTADUAL” OU “O ESTATUTO”.

AO FINAL, AINDA NA RESPOSTA DA CONVERSA E FORA DO ARQUIVO, ENTREGUE A LINHA DE COBERTURA: QUANTIDADE DE GRANDES EIXOS, LISTA DOS INSTITUTOS COBERTOS, NORMAS CITADAS, JULGADOS CITADOS E O QUE FICOU DE FORA COM O MOTIVO. ESSA CONFERÊNCIA É OBRIGATÓRIA E NÃO PODE SER SUBSTITUÍDA POR DECLARAÇÃO DE QUE REVISOU.

SE JÁ EXISTIR ARQUIVO ANTERIOR DO MESMO TEMA NA PASTA DE DESTINO, A NOVA VERSÃO NÃO PODE TER MENOS GRANDES EIXOS, MENOS INSTITUTOS NEM MENOS NORMAS E JULGADOS DO QUE ELE, SALVO PEDIDO EXPRESSO EM CONTRÁRIO. SUPRIMIR UM BLOCO QUE JÁ EXISTIA É ERRO, NÃO ESCOLHA EDITORIAL: SE O CONTEÚDO CONTINUA NAS FONTES AUTORIZADAS, ELE PERMANECE.

REDUZIR TAMANHO NÃO É OBJETIVO EM NENHUMA ETAPA. NA REVISÃO, NA CONSOLIDAÇÃO, NA FUSÃO E NA PADRONIZAÇÃO, O CONTEÚDO PODE SER REORGANIZADO, NUNCA DESCARTADO.

SE A COBERTURA FICAR ABAIXO DISSO PORQUE AS FONTES AUTORIZADAS NÃO TRAZEM O CONTEÚDO, DIGA ISSO EXPRESSAMENTE NA RESPOSTA, INDICANDO O TÓPICO AFETADO E O QUE FALTOU. NÃO APRESENTE O PRODUTO COMO COMPLETO NESSE CASO.`;

  function aplicar(prompt) {
    const texto = String(prompt || "");
    if (!texto.trim() || texto.includes("[PROMPT COMPLETO AINDA NÃO CADASTRADO")) return texto;
    if (texto.includes(MARKER)) return texto;              // já está na versão atual
    const anterior = texto.indexOf(HEADING);
    if (anterior >= 0) {                                    // versão antiga desta mesma seção
      const proxima = texto.indexOf("\n\n## ", anterior + HEADING.length);
      const fim = proxima < 0 ? texto.length : proxima;
      return `${texto.slice(0, anterior)}${SECTION}${texto.slice(fim)}`;
    }
    return `${texto.trimEnd()}\n\n${SECTION}\n`;
  }

  function currentState() {
    try {
      return typeof state !== "undefined" && state && typeof state === "object" ? state : null;
    } catch (_erro) {
      return null;
    }
  }

  function currentDefaults() {
    try {
      return typeof defaultFactoryPromptLibrary !== "undefined" && defaultFactoryPromptLibrary
        && typeof defaultFactoryPromptLibrary === "object" ? defaultFactoryPromptLibrary : null;
    } catch (_erro) {
      return null;
    }
  }

  function guardarBackup(alvo, tipo, prompt) {
    try {
      if (!alvo || !String(prompt || "").trim()) return;
      alvo.factoryPromptLibraryBackups ||= {};
      alvo.factoryPromptLibraryBackups[`${tipo}BeforeCobertura20260923`] ??= prompt;
    } catch (_erro) {}
  }

  function apply({ persist = true } = {}) {
    const alvoState = currentState();
    const defaults = currentDefaults();
    const alterados = [];

    if (defaults) {
      for (const tipo of TYPES) {
        const atual = defaults[tipo];
        if (typeof atual !== "string") continue;
        const novo = aplicar(atual);
        if (novo !== atual) defaults[tipo] = novo;
      }
    }

    if (alvoState) {
      alvoState.factoryPromptLibrary ||= {};
      for (const tipo of TYPES) {
        const atual = alvoState.factoryPromptLibrary[tipo];
        if (typeof atual !== "string") continue;
        const novo = aplicar(atual);
        if (novo === atual) continue;
        guardarBackup(alvoState, tipo, atual);
        alvoState.factoryPromptLibrary[tipo] = novo;
        alterados.push(tipo);
      }
      alvoState.migrations ||= {};
      if (alterados.length && !alvoState.migrations[MIGRATION_ID]) {
        alvoState.migrations[MIGRATION_ID] = new Date().toISOString();
      }
    }

    // V623: salvar só quando o estado mudou de fato; a função é idempotente, então isso acontece
    // uma vez depois de cada publicação, e não a cada abertura.
    if (persist && alterados.length) {
      try {
        if (typeof saveData === "function") saveData();
      } catch (_erro) {}
    }
    return { alterados, version: VERSION };
  }

  function install() {
    try {
      const resultado = apply();
      globalThis.__aldusFactoryCoberturaV640 = Object.freeze({
        version: VERSION, migrationId: MIGRATION_ID, types: TYPES, heading: HEADING,
        marker: MARKER, section: SECTION, aplicar, apply, updatedAt: new Date().toISOString()
      });
      return Boolean(resultado);
    } catch (_erro) {
      return false;
    }
  }

  function installWhenApplicationIsReady() {
    if (install()) return;
    let tentativas = 0;
    const tentar = () => {
      if (install() || ++tentativas > 20) return;
      setTimeout(tentar, 250);
    };
    setTimeout(tentar, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installWhenApplicationIsReady, { once: true });
  } else {
    installWhenApplicationIsReady();
  }
  // Os módulos que remontam prompts (V327, V380, V383) rodam no load: reaplicar depois deles
  // garante que a seção fique também nos prompts refeitos a partir do texto-base.
  window.addEventListener("load", installWhenApplicationIsReady, { once: true });
})();
