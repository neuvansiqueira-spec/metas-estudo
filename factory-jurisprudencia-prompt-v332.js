(() => {
  "use strict";

  const SOURCE_FOLDER = "https://drive.google.com/drive/folders/1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe";
  const MIGRATION_ID = "factoryJurisprudenciaFonteCoberturaV332";
  const VERSION = "20260816-runtime-stability-v349";
  const SCOPE_MARKER = "## ESCOPO DO MÓDULO";
  const NEXT_SECTION_MARKER = "## OBJETIVO";

  const NEW_SOURCE_BLOCK = `## ESCOPO DO MÓDULO

USE EXCLUSIVAMENTE A PASTA JURISPRUDENCIAL ${SOURCE_FOLDER} E TODAS AS SUAS SUBPASTAS.

NÃO CONDICIONE ESTA BUSCA À TRIAGEM DA PASTA GERAL E NÃO PESQUISE EM OUTRAS PASTAS, NA INTERNET OU NA MEMÓRIA DO MODELO.

RESPEITE A DISCIPLINA, O TEMA E O RECORTE TEMÁTICO INFORMADOS.

SE O RECORTE TEMÁTICO ESTIVER AUSENTE OU IMPRECISO, INTERROMPA A GERAÇÃO E SOLICITE CONFIRMAÇÃO.

TRIBUNAL E PERÍODO SOMENTE DEVEM SER LIMITADOS QUANDO EXPRESSAMENTE INDICADOS.

NÃO GERAR MÓDULO RESUMO/AULA, LEI, PEÇA OU CONSOLIDAÇÃO FINAL.

NÃO INSERIR PCDF, BANCA, CONCURSO, PROFESSORA, CURSO OU TURMA.

## VALIDAÇÃO OBRIGATÓRIA DAS FONTES

ANTES DE REDIGIR OU AFIRMAR QUE NÃO EXISTE JURISPRUDÊNCIA:

1. PERCORRA RECURSIVAMENTE A PASTA JURISPRUDENCIAL EXCLUSIVA E TODAS AS SUAS SUBPASTAS.
2. EXAMINE OBRIGATORIAMENTE, EM PRIMEIRO PLANO, AS SUBPASTAS “JULGADOS STF RESUMIDOS” E “JULGADOS STJ RESUMIDOS”.
3. FAÇA INVENTÁRIO INTERNO DOS ARQUIVOS POTENCIALMENTE RELACIONADOS À DISCIPLINA, AO TEMA E AO RECORTE.
4. PESQUISE O TEMA LITERAL E TAMBÉM SINÔNIMOS, SIGLAS, VARIAÇÕES TERMINOLÓGICAS E INSTITUTOS JURÍDICOS DIRETAMENTE CORRELATOS.
5. ABRA E EXAMINE INDIVIDUALMENTE O CONTEÚDO DE CADA ARQUIVO CANDIDATO; NÃO DECIDA APENAS PELO NOME DO ARQUIVO.
6. PROCURE JULGADOS, SÚMULAS, TEMAS, REPETITIVOS, INFORMATIVOS E TESES EM TODO O CONTEÚDO ACESSÍVEL.
7. INCLUA TODOS OS ITENS DIRETAMENTE PERTINENTES AO RECORTE, SEM LIMITE MÁXIMO ARBITRÁRIO E SEM REDUZIR A QUANTIDADE POR AMOSTRAGEM.
8. ELIMINE APENAS REPETIÇÕES DO MESMO PROCESSO, TEMA OU SÚMULA; NÃO ELIMINE DECISÕES DISTINTAS QUE ACRESCENTEM REGRA, CONDIÇÃO, EXCEÇÃO OU EVOLUÇÃO PRÓPRIA.
9. SE A QUANTIDADE LOCALIZADA PARECER INFERIOR AO CONTEÚDO DO ACERVO, REPITA A BUSCA COM AS VARIAÇÕES TERMINOLÓGICAS ANTES DE FINALIZAR.
10. NÃO CONFUNDA AUSÊNCIA DE INFORMATIVO, SÚMULA OU TEMA NUMERADO COM AUSÊNCIA DE JURISPRUDÊNCIA.

NÃO CONCLUA PELA INEXISTÊNCIA COM BASE EM LEITURA PARCIAL, RESULTADO VAZIO INICIAL, FALHA DE INDEXAÇÃO, PAGINAÇÃO INCOMPLETA OU FALHA DE ACESSO.

SE ALGUM ARQUIVO CANDIDATO ESTIVER INACESSÍVEL, INFORME:
“A EXISTÊNCIA DE JURISPRUDÊNCIA NÃO PÔDE SER VERIFICADA INTEGRALMENTE, POIS HÁ FONTES INACESSÍVEIS.”

SOMENTE DECLARE “NÃO HÁ JURISPRUDÊNCIA” DEPOIS DE CONCLUIR A BUSCA RECURSIVA, EXAMINAR AS DUAS SUBPASTAS PRIORITÁRIAS, ABRIR TODOS OS ARQUIVOS CANDIDATOS ACESSÍVEIS E REPETIR A BUSCA COM VARIAÇÕES DO TEMA.

ANTES DESSA CONCLUSÃO NEGATIVA, REGISTRE INTERNAMENTE:
* QUANTIDADE DE SUBPASTAS PERCORRIDAS;
* QUANTIDADE DE ARQUIVOS CANDIDATOS EFETIVAMENTE ABERTA E EXAMINADA;
* TERMOS E VARIAÇÕES UTILIZADOS;
* QUANTIDADE DE PRECEDENTES, SÚMULAS, TEMAS, REPETITIVOS, INFORMATIVOS OU TESES LOCALIZADOS.`;

  const OLD_FIDELITY_SOURCE = "USE SOMENTE O CONTEÚDO FORNECIDO PELO USUÁRIO E AS FONTES APROVADAS NA TRIAGEM.";
  const NEW_FIDELITY_SOURCE = `USE SOMENTE O CONTEÚDO EFETIVAMENTE LOCALIZADO NA PASTA JURISPRUDENCIAL EXCLUSIVA ${SOURCE_FOLDER} E EM SUAS SUBPASTAS.`;
  const OLD_REVIEW_SOURCE = "* TODAS AS FONTES APROVADAS NA TRIAGEM FORAM ABERTAS E EXAMINADAS?";
  const NEW_REVIEW_SOURCE = "* A PASTA JURISPRUDENCIAL EXCLUSIVA, AS SUBPASTAS “JULGADOS STF RESUMIDOS” E “JULGADOS STJ RESUMIDOS” E TODOS OS ARQUIVOS CANDIDATOS ACESSÍVEIS FORAM PERCORRIDOS E EXAMINADOS?";

  function buildPrompt(basePrompt) {
    const base = String(basePrompt || "").trim();
    if (!base) return { ok: false, prompt: "", reason: "empty-base" };

    const start = base.indexOf(SCOPE_MARKER);
    const end = start >= 0 ? base.indexOf(NEXT_SECTION_MARKER, start + SCOPE_MARKER.length) : -1;
    if (start < 0 || end < 0) return { ok: false, prompt: base, reason: "scope-boundary-not-found" };

    let prompt = `${base.slice(0, start)}${NEW_SOURCE_BLOCK}\n\n${base.slice(end)}`.trim();
    prompt = prompt
      .replace(OLD_FIDELITY_SOURCE, NEW_FIDELITY_SOURCE)
      .replace(OLD_REVIEW_SOURCE, NEW_REVIEW_SOURCE);

    return { ok: true, prompt, reason: prompt === base ? "already-current" : "migrated" };
  }

  function isOfficialPreviousPrompt(value, basePrompt, prompt) {
    const text = String(value || "").trim();
    if (!text || text === FACTORY_LIBRARY_FALLBACK || text === basePrompt || text === prompt) return true;
    const isV231 = text.includes("TRANSFORME JURISPRUDÊNCIAS EM MAPA MENTAL HIERÁRQUICO DE PALAVRAS-CHAVE")
      && text.includes("## FORMATO OBRIGATÓRIO")
      && text.includes("## ENTREGA EM WORD");
    const isV331 = text.includes("## 2. BUSCA SEMÂNTICA OBRIGATÓRIA EM TRÊS PASSAGENS")
      && text.includes("## 9. FORMATAÇÃO WORD E PAGINAÇÃO");
    return isV231 || isV331;
  }

  function install() {
    if (typeof defaultFactoryPromptLibrary === "undefined" || typeof state === "undefined") return;

    const basePrompt = String(defaultFactoryPromptLibrary?.jurisprudencia || "").trim();
    const built = buildPrompt(basePrompt);
    if (!built.ok) {
      console.warn("[Aldus V349] O prompt de jurisprudência foi preservado porque sua estrutura não corresponde ao modelo oficial conhecido.", built.reason);
      return;
    }
    const prompt = built.prompt;

    state.migrations ||= {};
    state.factoryPromptLibrary ||= {};
    state.factoryPromptLibraryBackups ||= {};
    let changed = defaultFactoryPromptLibrary.jurisprudencia !== prompt;
    defaultFactoryPromptLibrary.jurisprudencia = prompt;

    const current = String(state.factoryPromptLibrary.jurisprudencia || "").trim();
    if (isOfficialPreviousPrompt(current, basePrompt, prompt)) {
      if (current && current !== prompt && current !== FACTORY_LIBRARY_FALLBACK) {
        state.factoryPromptLibraryBackups.jurisprudenciaBeforeV332 = current;
      }
      if (current !== prompt) changed = true;
      state.factoryPromptLibrary.jurisprudencia = prompt;
    }

    if (state.migrations[MIGRATION_ID] !== true) changed = true;
    state.migrations[MIGRATION_ID] = true;
    state.factoryPromptLibrary = normalizeFactoryPromptLibrary(state.factoryPromptLibrary);
    if (changed && typeof saveData === "function") saveData();

    const previousPromptBase = factoryPromptBase;
    factoryPromptBase = function factoryPromptBaseV349(type) {
      if (type !== "jurisprudencia") return previousPromptBase(type);
      const text = String(state.factoryPromptLibrary?.jurisprudencia || "").trim();
      return text || prompt;
    };

    globalThis.__aldusFactoryJurisprudenciaV349 = Object.freeze({
      version: VERSION,
      sourceFolder: SOURCE_FOLDER,
      migration: built.reason,
      appliedAt: new Date().toISOString()
    });
    console.info("[Aldus Meta] Prompt de jurisprudência V349 ativo.");
  }

  if (window.__aldusBootstrapReady) install();
  else window.addEventListener("aldus:bootstrap-ready", install, { once: true });
})();
