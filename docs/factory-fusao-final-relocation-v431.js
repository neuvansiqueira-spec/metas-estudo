(() => {
  "use strict";

  // V431 — Relocação de jurisprudência e preservação do sublinhado na Fusão Final.
  //
  // Um documento real saiu sem sombreamento, sem relocação de jurisprudência,
  // sem dizer que decidiu não relocar, e com o sublinhado convertido em realce
  // amarelo. A parte do sombreamento e do sumário foi resolvida acrescentando
  // "fusaoFinal" às listas de alvo de factory-summary-toc-v381.js. Este módulo
  // cobre o que faltava: a seção de relocação.
  //
  // Por que um módulo separado, e não uma edição de factory-fusao-final-v425.js:
  // aquele arquivo está na trava de escopo de .github/workflows/v426-validation.yml,
  // que proíbe alterá-lo. Respeitar a trava e acrescentar comportamento por
  // composição é a convenção deste projeto.
  //
  // Por que injeção em tempo de execução, e não edição do prompt padrão:
  // a biblioteca de prompts vive nos dados do usuário e só recebe o texto padrão
  // quando está vazia (`if (!hasPrompt) ...` na V425). Quem já tem o prompt salvo
  // — o caso de quem vinha usando o módulo — nunca veria a alteração.

  const VERSION = "20260902-factory-fusao-final-relocation-v431-fidelity-r2";
  const TYPE_KEY = "fusaoFinal";
  const API_KEY = "__ALDUS_FACTORY_FUSAO_FINAL_RELOCATION_V431__";
  const WRAP_MARKER = "__aldusFactoryFusaoFinalRelocationV431";

  const RELOCATION_MARKER = "## RELOCAÇÃO DE JURISPRUDÊNCIA";
  const REPORT_ANCHOR = "## RELATÓRIO FINAL OBRIGATÓRIO";
  const REPORT_LAST_LINE = "* confirmação de que o documento original permanece intacto.";
  const REPORT_RELOCATED_LINE = "* jurisprudências relocadas, com origem e destino;";
  const REPORT_KEPT_LINE = "* jurisprudências avaliadas e mantidas na posição original, com o motivo;";

  const RELOCATION_SECTION = `${RELOCATION_MARKER}

QUANDO UMA TESE JURISPRUDENCIAL ESTIVER EM PONTO GENÉRICO DO DOCUMENTO, MAS SE REFERIR CLARAMENTE A UM INSTITUTO ESPECÍFICO TRATADO EM OUTRO LUGAR, MOVA-A PARA JUNTO DESSE INSTITUTO.

ESTA É A ÚNICA ALTERAÇÃO ESTRUTURAL AUTORIZADA NESTE MÓDULO. ELA MUDA APENAS A POSIÇÃO, NUNCA O TEXTO.

REGRAS:
* NÃO altere uma palavra da tese, da citação entre parênteses ou do rótulo;
* NÃO mova quando houver qualquer dúvida sobre o destino correto — na dúvida, deixe onde está e registre no relatório;
* NÃO crie seção, título ou instituto novo para acomodar uma tese;
* NÃO mova tese que já esteja junto do instituto a que se refere;
* NÃO desmonte o quadro final de jurisprudência, quando existir — ele permanece como está;
* NÃO agrupe teses por tribunal, ano ou tema; a referência é sempre o instituto do corpo do resumo.

MOVER JURISPRUDÊNCIA PARA O INSTITUTO ERRADO É PIOR DO QUE DEIXÁ-LA MAL POSICIONADA. Na ausência de correspondência inequívoca, preserve a posição original.

RELATÓRIO OBRIGATÓRIO DESTA SEÇÃO: liste cada tese movida, com o trecho inicial da tese, a posição de origem e a posição de destino. Liste também as teses que você considerou mover e decidiu não mover, com o motivo. SE NENHUMA TESE FOI MOVIDA, DIGA ISSO EXPRESSAMENTE — o silêncio não é resposta aceitável.

## SUBLINHADO NÃO É REALCE

SUBLINHADO NO PDF PERMANECE SUBLINHADO NO DOCUMENTO FINAL. GRIFO E REALCE PERMANECEM REALCE.

É PROIBIDO converter sublinhado em realce amarelo, ou realce em sublinhado. Cada marca de leitura mantém a forma que tinha na origem. Quando não for possível distinguir sublinhado de realce na extração, preserve o texto sem marca nenhuma e registre o caso no relatório final — inventar a marca errada é pior do que não marcar.

## COR DA MARCA — PRESERVAR A DA ORIGEM

A MARCA MANTÉM A COR QUE TINHA NO PDF. Sublinhado vermelho continua vermelho; sublinhado azul continua azul; realce verde continua verde.

NÃO converta marca colorida para preto. NÃO padronize as cores das marcas. NÃO escolha uma cor por conta própria.

A cor da marca é informação: ela distingue o que o usuário destacou de um jeito do que destacou de outro. Perder a cor apaga essa distinção.

Isto vale apenas para a MARCA — sublinhado, realce, contorno. O texto do corpo do resumo continua preto #000000, como manda a identidade do projeto. Quando a extração não informar a cor da marca, use vermelho para sublinhado e registre a suposição no relatório final.

## ESPAÇAMENTO — SEGUIR O DOCUMENTO DE ORIGEM

O ESPAÇAMENTO ENTRE PARÁGRAFOS, ENTRE ENTRADAS E ANTES E DEPOIS DOS RÓTULOS É O MESMO QUE O RESUMO DE ORIGEM JÁ USA. Meça no documento e repita.

É PROIBIDO:
* inserir linha em branco ou parágrafo vazio entre entradas do mesmo tipo;
* deixar espaço maior antes de uma entrada do que antes da entrada anterior;
* alterar espaçamento entre linhas, espaçamento antes/depois do parágrafo, ou recuo;
* separar um rótulo funcional do texto que ele introduz.

Entradas consecutivas do mesmo tipo — duas teses de jurisprudência seguidas, dois institutos seguidos — ficam com espaçamento IDÊNTICO entre si. Se uma delas veio da fusão e a outra já existia, isso não pode ser perceptível pelo espaçamento.

CONFERÊNCIA OBRIGATÓRIA ANTES DE ENTREGAR: percorra o documento final e verifique que o espaço entre blocos irmãos é sempre o mesmo. Relate no relatório final que a conferência foi feita.`;

  // Acrescenta as duas linhas de prestação de contas ao relatório existente.
  function withReportLines(prompt) {
    const text = String(prompt || "");
    if (text.includes(REPORT_RELOCATED_LINE)) return text;
    if (!text.includes(REPORT_LAST_LINE)) return text;
    return text.replace(REPORT_LAST_LINE, `${REPORT_RELOCATED_LINE}\n${REPORT_KEPT_LINE}\n${REPORT_LAST_LINE}`);
  }

  // Insere a seção antes do relatório final, para que a exigência já exista
  // quando o relatório a cobra. Sem a âncora, acrescenta ao fim.
  function withRelocationSection(prompt) {
    const text = String(prompt || "");
    if (!text.trim()) return text;
    if (text.includes(RELOCATION_MARKER)) return text;
    const at = text.indexOf(REPORT_ANCHOR);
    const merged = at === -1
      ? `${text.trimEnd()}\n\n${RELOCATION_SECTION}`
      : `${text.slice(0, at).trimEnd()}\n\n${RELOCATION_SECTION}\n\n${text.slice(at)}`;
    return withReportLines(merged);
  }

  function install() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[WRAP_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        const base = previous(type);
        return type === TYPE_KEY ? withRelocationSection(base) : base;
      };
      Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryFusaoFinalRelocationOriginal", { value: previous });
      factoryPromptBase = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({
    version: VERSION,
    typeKey: TYPE_KEY,
    marker: RELOCATION_MARKER,
    section: RELOCATION_SECTION,
    withRelocationSection,
    withReportLines,
    install
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    // A V425 embrulha factoryPromptBase no bootstrap; este módulo precisa vir
    // depois dela para embrulhar o resultado, não o original.
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("aldus:bootstrap-ready", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();
