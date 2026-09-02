(() => {
  "use strict";

  const VERSION = "20260901-factory-fusao-final-v425";
  const TYPE_KEY = "fusaoFinal";
  const TYPE_LABEL = "Gerar prompt Fusão Final";
  const MIGRATION_ID = "factoryFusaoFinalV425";
  const API_MARKER = "__aldusFactoryFusaoFinalV425";
  const INSTALL_FLAG = "aldusFactoryFusaoFinalV425";
  const DESCRIPTION = "Funde o Word editado no estudo com as marcações do PDF num documento novo, sem tocar no original.";

  const BASE_PROMPT = `## ESCOPO DO MÓDULO FUSÃO FINAL

PRODUZA UM DOCUMENTO NOVO QUE REÚNA, NUM ÚNICO MATERIAL, O RESUMO JÁ EDITADO NO WORD E AS MARCAÇÕES E ANOTAÇÕES FEITAS NO PDF DURANTE O ESTUDO.

ESTE MÓDULO NÃO PRODUZ CONTEÚDO NOVO. ELE REÚNE MATERIAL QUE JÁ EXISTE.

É PROIBIDO:
* reescrever, resumir, encurtar ou "melhorar" a redação do que já está no Word;
* completar lacunas por conhecimento externo;
* pesquisar fora das fontes fornecidas;
* inventar anotação, grifo, página ou comentário;
* sobrescrever, substituir ou apagar o documento original.

## FONTES — REGRA FINAL E PREVALENTE

OS ARQUIVOS A CONSOLIDAR JÁ ESTÃO NA PASTA DE DESTINO INDICADA ACIMA. NESTE MÓDULO, E SOMENTE NELE, ESSA PASTA É TAMBÉM A PASTA DE ORIGEM.

A instrução genérica de que "a pasta acima é somente o destino de gravação" NÃO se aplica a esta etapa. Em caso de conflito com qualquer instrução anterior, esta regra prevalece.

PERCORRA A PASTA e localize:

1. WORD EDITADO — o .docx do resumo deste tema, na versão alterada pelo usuário durante o estudo. É a BASE do documento final e seu conteúdo é preservado integralmente.
2. PDF ANOTADO — o .pdf correspondente ao mesmo resumo, com grifos, realces e comentários feitos na leitura.
3. RESUMO DE ANOTAÇÕES EXPORTADO — quando existir na pasta, é a fonte PREFERENCIAL para as marcações do PDF.

IDENTIFICAÇÃO DOS ARQUIVOS:
* case pelo tema e pela disciplina informados no contexto, e não apenas pelo nome do arquivo;
* quando houver mais de uma versão, use a de modificação mais recente e informe no relatório final qual foi escolhida;
* NÃO peça links ao usuário se os arquivos estiverem na pasta;
* se não localizar o Word editado OU o PDF anotado, interrompa e informe exatamente o que faltou e o que foi encontrado na pasta. Não produza consolidação parcial silenciosa.

NÃO use arquivos de outras pastas e não pesquise fora dela.

## LEITURA DAS MARCAÇÕES DO PDF

GRIFOS E REALCES SÃO OBJETOS DE ANOTAÇÃO E NEM SEMPRE APARECEM NA EXTRAÇÃO DE TEXTO DO PDF.

Ordem de tentativa:
1. use o RESUMO DE ANOTAÇÕES EXPORTADO, quando houver — ele traz trecho, página e comentário de forma confiável;
2. na ausência dele, examine o PDF em busca de anotações, comentários, notas e realces;
3. se ainda assim não localizar marcações, NÃO CONCLUA QUE NÃO EXISTEM.

REGRA OBRIGATÓRIA DE TRANSPARÊNCIA: quando não for possível ler as marcações com segurança, declare isso expressamente no relatório final, informe o que foi tentado e oriente o usuário a exportar o resumo de anotações do leitor de PDF. NUNCA entregue o documento sugerindo que não havia anotações quando o que houve foi falha de leitura.

## REGRA CENTRAL DE FUSÃO

CADA MARCAÇÃO DO PDF ENTRA NO MESMO PONTO DO TEXTO A QUE SE REFERE, junto do conteúdo correspondente já existente no Word.

* NÃO agrupe as marcações num bloco separado ao final;
* NÃO reordene o conteúdo do Word para acomodar uma anotação;
* NÃO duplique um trecho para inserir a marcação;
* quando a mesma passagem tiver alteração no Word e marcação no PDF, as duas convivem no mesmo local, sem que uma sobreponha a outra.

Se uma anotação não puder ser localizada com segurança no texto, NÃO a insira em local aproximado. Liste-a no relatório final como não posicionada, com o trecho e a página informados pela fonte.

## TRATAMENTO VISUAL DAS MARCAÇÕES

GRIFO OU REALCE NO PDF:
o mesmo trecho aparece realçado no documento final, sem alterar uma palavra do texto.

COMENTÁRIO OU ANOTAÇÃO ESCRITA NO PDF:
entra como nota no ponto correspondente, com o rótulo funcional:

📝 **ANOTAÇÃO DE ESTUDO:** [texto exato da anotação].

O rótulo segue o mesmo padrão dos demais rótulos funcionais deste projeto: negrito real, texto preto #000000 e sombreamento bege #EEECE1 aplicado apenas ao rótulo, até e incluindo os dois-pontos, nunca ao emoji nem à explicação que vem depois.

Preserve o texto da anotação como o usuário escreveu. Não corrija, não reescreva e não complete.

## PRESERVAÇÃO DA IDENTIDADE VISUAL

O documento final mantém integralmente a identidade do resumo de origem:
* a hierarquia ♦️ dos grandes eixos e ▶️📚 dos institutos;
* fonte, tamanho, espaçamento, recuos, margens e alinhamento;
* o sombreamento bege dos rótulos funcionais;
* o formato da citação jurisprudencial, com a fonte entre parênteses em itálico e o ponto final fora do itálico;
* emojis e ícones nativos.

NÃO introduza paleta nova, caixas decorativas ou bordas.

## SUMÁRIO

O conteúdo mudou, portanto o sumário deve ser recriado ou atualizado, seguindo as mesmas regras já definidas para o sumário deste projeto — incluindo hiperlink interno obrigatório em todas as entradas.

## ENTREGA

Produza DOIS arquivos, com o mesmo conteúdo:
1. um DOCX editável;
2. um PDF.

NOME: [NOME_DO_RESUMO_ORIGINAL]_CONSOLIDADO_[AAAA-MM-DD].docx e .pdf

O DOCUMENTO ORIGINAL É PRESERVADO. Não o substitua, não o mova e não o apague. Salve os arquivos novos na pasta de destino indicada, usando apenas ferramenta autorizada, e devolva o link exato de cada arquivo criado.

## RELATÓRIO FINAL OBRIGATÓRIO

Ao final, informe:
* quantas marcações do PDF foram localizadas;
* quantas foram integradas no ponto correto;
* quais não puderam ser posicionadas, com trecho e página;
* se a leitura das anotações do PDF falhou, e o que foi tentado;
* quais fontes foram efetivamente usadas;
* confirmação de que o documento original permanece intacto.`;

  function ensureDescription() {
    try {
      if (typeof FACTORY_PROMPT_DESCRIPTIONS === "object" && FACTORY_PROMPT_DESCRIPTIONS) {
        FACTORY_PROMPT_DESCRIPTIONS[TYPE_KEY] =
          "Funde o Word editado no estudo com as marcações do PDF num documento novo, sem tocar no original.";
        return true;
      }
    } catch {}
    return false;
  }

  function ensurePromptType() {
    try {
      if (!Array.isArray(FACTORY_PROMPT_TYPES)) return false;
      const existing = FACTORY_PROMPT_TYPES.find((entry) => entry?.key === TYPE_KEY);
      if (existing) {
        existing.label = TYPE_LABEL;
        return true;
      }
      const anchorIndex = FACTORY_PROMPT_TYPES.findIndex((entry) => entry?.key === "padronizacaoFinalSumario");
      FACTORY_PROMPT_TYPES.splice(anchorIndex >= 0 ? anchorIndex + 1 : FACTORY_PROMPT_TYPES.length, 0, {
        key: TYPE_KEY,
        label: TYPE_LABEL
      });
      return true;
    } catch {
      return false;
    }
  }

  function ensurePromptLibrary() {
    try {
      defaultFactoryPromptLibrary[TYPE_KEY] = BASE_PROMPT;
    } catch {
      return { installed: false, changed: false, reason: "default-library-unavailable" };
    }

    try {
      if (!state || typeof state !== "object") return { installed: false, changed: false, reason: "state-unavailable" };
      state.factoryPromptLibrary ||= {};
      state.migrations ||= {};
      const alreadyMigrated = Boolean(state.migrations[MIGRATION_ID]);
      const hasPrompt = Boolean(String(state.factoryPromptLibrary[TYPE_KEY] || "").trim());
      const changed = !alreadyMigrated || !hasPrompt;
      if (!hasPrompt) state.factoryPromptLibrary[TYPE_KEY] = BASE_PROMPT;
      if (!alreadyMigrated) state.migrations[MIGRATION_ID] = new Date().toISOString();
      return { installed: true, changed };
    } catch {
      return { installed: false, changed: false, reason: "state-write-failed" };
    }
  }

  function installPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase?.[API_MARKER] === VERSION) return true;
      const previous = factoryPromptBase;
      const wrapped = function(type) {
        if (type !== TYPE_KEY) return previous(type);
        const configured = String(state?.factoryPromptLibrary?.[TYPE_KEY] || "").trim();
        return configured || BASE_PROMPT;
      };
      Object.defineProperty(wrapped, API_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusFactoryFusaoFinalOriginal", { value: previous });
      factoryPromptBase = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function isFactoryRoute() {
    if (typeof location === "undefined") return false;
    return String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0] === "fabrica-resumos";
  }

  function refreshFactoryUi() {
    if (!isFactoryRoute()) return;
    try {
      if (typeof renderFactoryPromptLibrary === "function") renderFactoryPromptLibrary();
    } catch {}
    try {
      if (typeof renderFactory === "function" && typeof elements !== "undefined" && elements?.factoryList) renderFactory();
    } catch {}
  }

  function install() {
    if (typeof document !== "undefined" && document.documentElement?.dataset?.[INSTALL_FLAG] === "true") {
      return { installed: true, repeated: true };
    }

    const description = ensureDescription();
    const promptType = ensurePromptType();
    const library = ensurePromptLibrary();
    const promptBase = installPromptBase();

    if (!promptType || !library.installed || !promptBase) {
      return { installed: false, description, promptType, library, promptBase };
    }

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset[INSTALL_FLAG] = "true";
    }
    refreshFactoryUi();
    return { installed: true, changed: library.changed, description };
  }

  const api = Object.freeze({
    version: VERSION,
    typeKey: TYPE_KEY,
    label: TYPE_LABEL,
    description: DESCRIPTION,
    prompt: BASE_PROMPT,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", install, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", install, { once: true });
    window.addEventListener("load", install, { once: true });
  }
})();