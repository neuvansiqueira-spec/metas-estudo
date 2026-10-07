(() => {
  "use strict";

  // V663: pedido dele em 07/10/2026 — uma etapa final, opcional, de pente-fino técnico-editorial dos
  // resumos, junto da revisão final ("PENTE FINO + REVISÃO FINAL É APENAS UMA ETAPA QUE POSSO ESCOLHER
  // EM FAZER OU NÃO"). O prompt da revisão final (V384, tipo "consolidacao") só tinha uma linha genérica
  // de conferência e gerava o Word direto, sem mostrar o que foi conferido. Aqui:
  // - a seção 9 vira o pente-fino, com a lista do que procurar, a regra inversa (exemplo da ADO trazido
  //   por ele) e a regra de texto fluido;
  // - a entrega passa a ter duas fases: primeiro a lista de achados, e o Word só depois da resposta dele.
  // O texto-base da V384 não é tocado: as duas seções são trocadas no prompt salvo, como faz a V640.
  const VERSION = "20261007-factory-pente-fino-v663";
  const MIGRATION_ID = "factoryPenteFinoV663";
  const TYPE = "consolidacao";
  const MARKER = "PENTE-FINO-V663";
  const NOME = "REVISÃO FINAL + PENTE-FINO";
  const DESCRICAO = "Opcional. Pente-fino de precisão jurídica e redação: lista os achados para você aprovar antes de gerar o Word.";

  const HEADING_9 = "## 9. PENTE-FINO TÉCNICO-EDITORIAL";
  const OLD_HEADING_9 = "## 9. AUDITORIA JURÍDICA E DIDÁTICA";
  const HEADING_12 = "## 12. ENTREGA EM DUAS FASES";
  const OLD_HEADING_12 = "## 12. ENTREGA";

  const SECTION_9 = `${HEADING_9} — OBRIGATÓRIO ANTES DE QUALQUER CORREÇÃO

<!-- ${MARKER} -->

OBJETIVO: AUMENTAR A SEGURANÇA TÉCNICA SEM REFAZER, AMPLIAR OU ENXUGAR O MATERIAL. LEIA CADA PRODUTO LINHA A LINHA, COMO UM EXAMINADOR PROCURANDO O PONTO QUE INDUZIRIA O CANDIDATO A ERRO.

PROCURE ESPECIALMENTE:
- PRAZOS: "por X dias" × "no prazo de X dias"; dias úteis × corridos; termo inicial ("a partir de", "contado de"); "até" × "antes de"; prorrogável ou não.
- QUÓRUNS E NÚMEROS: maioria simples × absoluta × qualificada; base (membros × presentes); frações, percentuais, valores, limites de pena.
- REQUISITOS: cumulativos ("e") × alternativos ("ou"); rol taxativo × exemplificativo; "e/ou" ambíguo.
- FORÇA DO COMANDO: "pode" × "deve"; "em regra" × "sempre"; palavras absolutas (sempre, nunca, apenas, somente) onde a fonte admite exceção.
- EFEITOS: retroativo × não retroativo; suspensivo × devolutivo; para todos × só entre as partes; vinculante ou não.
- NOMENCLATURA: termo técnico trocado por outro parecido (prescrição × decadência; suspensão × interrupção; revogação × anulação; nulidade absoluta × relativa).
- QUEM FAZ: juiz × delegado × MP; de ofício × a requerimento.
- AUTORES: nome correto e teoria atribuída ao autor certo.
- JURISPRUDÊNCIA: tribunal, órgão (Turma × Seção × Plenário), número da súmula/tema/informativo, ano, tese fiel ao julgado, entendimento superado.
- LEI: artigo, parágrafo e inciso corretos; redação vigente.
- CONTRADIÇÃO: o mesmo ponto dito de forma diferente em dois lugares.
- FRASE AMBÍGUA: frase com duas leituras possíveis; regra e exceção misturadas sem marcação.
- REGRA INVERSA QUE A FONTE NÃO DISSE: procure frases no formato "não pode X quando A" (ou "só pode X quando A"). Pergunte: quem ler vai concluir que "sem A, pode X"? Se a fonte não disser isso, a frase está ensinando uma regra falsa. Reescreva dizendo apenas o que a fonte decidiu.
  Exemplo — "A ADO não autoriza o Judiciário a criar norma geral quando houve opção legislativa" leva a concluir que, sem opção legislativa, o Judiciário poderia criar a norma. Melhor: "Havendo opção legislativa constitucionalmente possível, não há omissão a suprir: a ADO exige dever de legislar descumprido."
- TEXTO FLUIDO: cada linha deve ser entendida numa única leitura, sem ser telegráfica (palavras soltas, siglas sem explicação, orações empilhadas com ponto e vírgula) nem densa demais (uma frase só carregando regra, condição e exceção). Quando isso acontecer, divida em frases curtas ou em subitens no padrão do documento (ícone + rótulo). Ajuste apenas os trechos em que a forma atrapalha o entendimento; não reescreva o que já está claro e não acrescente conteúdo.

CLASSIFIQUE CADA ACHADO:
- ERRO: contradiz a lei ou a fonte.
- IMPRECISÃO: correto, mas ambíguo ou capaz de induzir a erro em prova.
- CONFERIR: não foi possível verificar nas fontes disponíveis.

REGRAS DO PENTE-FINO:
- toda correção deve indicar o dispositivo ou a fonte que a sustenta; sem fonte, o achado é CONFERIR e o texto NÃO é alterado;
- não corrija de memória;
- corrija a menor porção de texto suficiente; não acrescente conteúdo novo nem retire conteúdo correto;
- não aponte questões de estilo que não afetem a precisão.

### 9.1 CONFERÊNCIA DIDÁTICA E VISUAL

Para cada produto disponível, confira também:
- fidelidade ao recorte autorizado e ausência de omissões relevantes;
- repetição e duplicação;
- clareza, hierarquia e utilidade para revisão;
- títulos, subtítulos, negritos, indentações e alinhamentos;
- fonte textual exclusivamente preta #000000, salvo cores nativas dos emojis e fundos expressamente autorizados;
- fonte compatível com emojis, sem quadrados, símbolos quebrados ou substituições indevidas.`;

  const SECTION_12 = `${HEADING_12}

ESTA SEÇÃO PREVALECE SOBRE QUALQUER ORDEM DE GERAR WORD OU PDF QUE APAREÇA EM OUTRO PONTO DESTE PROMPT.

FASE 1 — NESTA RESPOSTA:
- faça o pente-fino da seção 9 e apresente a lista numerada de achados, cada um com: classificação (ERRO, IMPRECISÃO ou CONFERIR) · onde está (título/tópico) · trecho atual · problema · redação sugerida · fonte;
- se houver mais de um produto, liste também as repetições que pretende eliminar na consolidação;
- se não houver achado, diga "Nenhum achado no pente-fino";
- NÃO GERE WORD NEM PDF NESTA FASE. Termine perguntando quais achados aplicar.

FASE 2 — SOMENTE APÓS A RESPOSTA DO USUÁRIO:
- aplique apenas os achados aprovados e, quando houver, a consolidação descrita nas seções anteriores;
- produto único: gerar Word e PDF do produto refinado, sem acrescentar produtos ausentes;
- múltiplos produtos: gerar Word e PDF consolidados somente com produtos efetivamente disponíveis;
- siga as seções 10 (sumário) e 11 (arquivos e segurança);
- apresente uma nota breve das correções e deduplicações realmente efetuadas, indicando quando jurisprudência autônoma tiver sido totalmente absorvida por produtos integrados;
- não liste mudanças inexistentes nem apresente como corrigido ou verificado aquilo que não pôde ser examinado;
- se o usuário disser que vai corrigir à mão, encerre sem gerar arquivos.`;

  // Abertura que substitui "ENTREGA OBRIGATÓRIA:" no roteiro do topo do prompt. A lista de arquivos que
  // vem depois dela no roteiro continua valendo, mas só na Fase 2.
  const ROUTER_PHASES = `ENTREGA EM DUAS FASES (VER SEÇÃO 12 DO PROMPT COMPLETO):
FASE 1 — NESTA RESPOSTA: faça o pente-fino e apresente somente a lista numerada de achados. NÃO GERE WORD NEM PDF AGORA. Termine perguntando quais achados aplicar.
FASE 2 — SOMENTE APÓS A RESPOSTA DO USUÁRIO, aplique apenas os achados aprovados e então:`;
  const ROUTER_TARGETS = ["ENTREGA OBRIGATÓRIA DESTA ETAPA:", "ENTREGA OBRIGATÓRIA:"];

  // Marcadores da V384 e da compat: copiados para o nosso invólucro, para que elas não embrulhem o
  // roteiro de novo por cima dele (a V384 não chama o roteiro anterior para a consolidação).
  const V384_ROUTER_MARKER = "__aldusFactoryFinalReviewRouterWrappedV384";
  const V384_ROUTER_VERSION = "20260824-final-review-consolidation-v384";
  const COMPAT_MARKER = "__aldusFactoryFinalReviewCompatWrappedV384";
  const COMPAT_VERSION = "20260824-final-review-consolidation-v384-compat";
  const ROUTER_WRAP_MARKER = "__aldusFactoryPenteFinoRouterV663";
  const BASE_WRAP_MARKER = "__aldusFactoryPenteFinoBaseV663";
  const V384_BASE_MARKER = "__aldusFactoryFinalReviewBaseWrappedV384";

  function trocarSecao(texto, headingAntigo, novaSecao, headingNovo) {
    const inicioNovo = texto.indexOf(headingNovo);
    const inicio = inicioNovo >= 0 ? inicioNovo : texto.indexOf(headingAntigo);
    if (inicio < 0) return `${texto.trimEnd()}\n\n${novaSecao}\n`;
    const proxima = texto.indexOf("\n\n## ", inicio + 4);
    const fim = proxima < 0 ? texto.length : proxima;
    const resto = texto.slice(fim);
    return `${texto.slice(0, inicio)}${novaSecao}${resto ? resto : "\n"}`;
  }

  function aplicar(prompt) {
    const texto = String(prompt || "");
    if (!texto.trim() || texto.includes("[PROMPT COMPLETO AINDA NÃO CADASTRADO")) return texto;
    if (texto.includes(MARKER)) return texto;              // já está na versão atual
    const com9 = trocarSecao(texto, OLD_HEADING_9, SECTION_9, HEADING_9);
    return trocarSecao(com9, OLD_HEADING_12, SECTION_12, HEADING_12);
  }

  function aplicarRoteiro(texto) {
    let saida = String(texto || "");
    if (saida.includes("ENTREGA EM DUAS FASES")) return saida;
    for (const alvo of ROUTER_TARGETS) {
      if (saida.includes(alvo)) return saida.replace(alvo, ROUTER_PHASES);
    }
    return saida;
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

  function apply({ persist = true } = {}) {
    const alvoState = currentState();
    const defaults = currentDefaults();
    let alterado = false;

    if (defaults && typeof defaults[TYPE] === "string") {
      const novo = aplicar(defaults[TYPE]);
      if (novo !== defaults[TYPE]) defaults[TYPE] = novo;
    }

    if (alvoState) {
      alvoState.factoryPromptLibrary ||= {};
      const atual = alvoState.factoryPromptLibrary[TYPE];
      if (typeof atual === "string") {
        const novo = aplicar(atual);
        if (novo !== atual) {
          alvoState.factoryPromptLibraryBackups ||= {};
          alvoState.factoryPromptLibraryBackups[`${TYPE}BeforePenteFino20261007`] ??= atual;
          alvoState.factoryPromptLibrary[TYPE] = novo;
          alvoState.migrations ||= {};
          alvoState.migrations[MIGRATION_ID] ||= new Date().toISOString();
          alterado = true;
        }
      }
    }

    // Salva só quando o prompt salvo mudou: uma vez depois da publicação, não a cada abertura (V623).
    if (persist && alterado) {
      try {
        if (typeof saveData === "function") saveData();
      } catch (_erro) {}
    }
    return { alterado, version: VERSION };
  }

  function wrapRouter() {
    try {
      if (typeof factoryRouterText !== "function") return false;
      if (factoryRouterText[ROUTER_WRAP_MARKER] === VERSION) return true;
      // Esperar a V384 montar o roteiro da revisão final; embrulhar antes dela seria inútil.
      if (factoryRouterText[V384_ROUTER_MARKER] !== V384_ROUTER_VERSION) return false;
      const anterior = factoryRouterText;
      const wrapped = function(type, item = {}) {
        const resultado = anterior(type, item);
        return type === TYPE ? aplicarRoteiro(resultado) : resultado;
      };
      Object.defineProperty(wrapped, ROUTER_WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, V384_ROUTER_MARKER, { value: V384_ROUTER_VERSION });
      Object.defineProperty(wrapped, COMPAT_MARKER, { value: COMPAT_VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryPenteFinoOriginal", { value: anterior });
      factoryRouterText = wrapped;
      return true;
    } catch (_erro) {
      return false;
    }
  }

  // O prompt salvo é regravado por outros módulos depois do load (visto em 07/10 no site local: a seção
  // da V640 também some do texto salvo da revisão final). Aplicar na montagem garante que o texto
  // copiado tenha o pente-fino, seja qual for o estado do prompt salvo.
  function wrapPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase[BASE_WRAP_MARKER] === VERSION) return true;
      // Mesmo cuidado do roteiro: a V384 não chama a montagem anterior para a revisão final.
      if (factoryPromptBase[V384_BASE_MARKER] !== V384_ROUTER_VERSION) return false;
      const anterior = factoryPromptBase;
      const wrapped = function(type) {
        const resultado = anterior(type);
        return type === TYPE ? aplicar(resultado) : resultado;
      };
      Object.defineProperty(wrapped, BASE_WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, V384_BASE_MARKER, { value: V384_ROUTER_VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryPenteFinoBaseOriginal", { value: anterior });
      factoryPromptBase = wrapped;
      return true;
    } catch (_erro) {
      return false;
    }
  }

  function ajustarTela() {
    try {
      if (typeof FACTORY_PROMPT_DESCRIPTIONS === "object" && FACTORY_PROMPT_DESCRIPTIONS) {
        FACTORY_PROMPT_DESCRIPTIONS[TYPE] = DESCRICAO;
      }
    } catch (_erro) {}
  }

  function install() {
    try {
      apply();
      ajustarTela();
      const base = wrapPromptBase();
      const roteiro = wrapRouter();
      globalThis.__aldusFactoryPenteFinoV663 = Object.freeze({
        version: VERSION, migrationId: MIGRATION_ID, type: TYPE, marker: MARKER, nome: NOME,
        descricao: DESCRICAO, section9: SECTION_9, section12: SECTION_12, routerPhases: ROUTER_PHASES,
        aplicar, aplicarRoteiro, apply, base, roteiro, updatedAt: new Date().toISOString()
      });
      return base && roteiro;
    } catch (_erro) {
      return false;
    }
  }

  function installWhenApplicationIsReady() {
    if (install()) return;
    let tentativas = 0;
    const tentar = () => {
      if (install() || ++tentativas > 40) return;
      setTimeout(tentar, 250);
    };
    setTimeout(tentar, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installWhenApplicationIsReady, { once: true });
  } else {
    installWhenApplicationIsReady();
  }
  // Como a V640: reaplicar depois dos módulos que remontam prompts no load (V327, V380, V383).
  window.addEventListener("load", installWhenApplicationIsReady, { once: true });
})();
