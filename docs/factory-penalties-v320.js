(() => {
  "use strict";

  const VERSION = "20260828-factory-didatica-autossuficiencia-v404";
  const MIGRATION_ID = "factoryPenaltiesPromptPolicyV320";
  const HEADING = "## SANÇÕES PENAIS — REGRA OBRIGATÓRIA";
  const MODULE_KEYS = ["resumoAula", "lei", "jurisprudencia", "peca"];
  const CLASSIFICATION_HEADING = "## CLASSIFICAÇÕES — REGRA OBRIGATÓRIA DE INDIVIDUALIZAÇÃO";
  const CLASSIFICATION_MIGRATION_ID = "factoryClassificationIndividualScopeV403";
  const DIDACTIC_HEADING = "## DIDÁTICA, AUTOSSUFICIÊNCIA E CLAREZA INTERPRETATIVA — REGRA GERAL OBRIGATÓRIA";
  const DIDACTIC_MIGRATION_ID = "factoryDidacticAutonomyScopeV404";

  const RULES = Object.freeze({
    resumoAula: `${HEADING}\n\nPRESERVE INTEGRALMENTE A QUALIDADE, A PROFUNDIDADE DIDÁTICA, A HIERARQUIA, A CONCISÃO E O PADRÃO VISUAL JÁ EXIGIDOS NESTE MÓDULO. ESTA REGRA APENAS TORNA AS PENAS OBRIGATÓRIAS QUANDO O CONTEÚDO FOR PENAL.\n\nSE O RECORTE ABRANGER CRIME, CONTRAVENÇÃO OU OUTRO TIPO PENAL COM PENA PRÓPRIA, APRESENTE A PENA ABSTRATAMENTE COMINADA NO BLOCO DO PRÓPRIO TIPO, DE FORMA CURTA E AUTOSSUFICIENTE.\n\nINCLUA, QUANDO EXISTIREM E FOREM RELEVANTES AO RECORTE: ESPÉCIE DA PENA; LIMITE MÍNIMO E MÁXIMO; MULTA; PENA DAS FORMAS QUALIFICADAS; EFEITO DA FORMA PRIVILEGIADA; E FRAÇÃO OU INTERVALO DAS CAUSAS DE AUMENTO OU DIMINUIÇÃO.\n\nNÃO OMITA A PENA PARA GANHAR CONCISÃO E NÃO CRIE UM CATÁLOGO DE PENAS SEPARADO DO CONTEÚDO. INTEGRE A INFORMAÇÃO À EXPLICAÇÃO DO TIPO PENAL SEM DUPLICAÇÃO.\n\nUSE SOMENTE AS FONTES AUTORIZADAS PELO PROMPT. SE A PENA NÃO ESTIVER EXPRESSA OU SEGURAMENTE IDENTIFICÁVEL NELAS, NÃO COMPLETE POR MEMÓRIA, CONHECIMENTO EXTERNO OU SUPOSIÇÃO.\n\nANTES DE CONCLUIR, FAÇA UMA REVISÃO INTERNA E CONFIRME QUE TODO TIPO PENAL NUCLEAR EFETIVAMENTE EXPLICADO POSSUI A RESPECTIVA PENA QUANDO ELA ESTIVER DISPONÍVEL NAS FONTES AUTORIZADAS.`,

    lei: `${HEADING}\n\nPRESERVE A ARQUITETURA, A FIDELIDADE NORMATIVA, A TOPIFICAÇÃO E O PADRÃO VISUAL JÁ EXIGIDOS NESTE MÓDULO.\n\nSE UM ARTIGO DO RECORTE CONTIVER CRIME, CONTRAVENÇÃO OU OUTRO TIPO PENAL, APRESENTE O PRECEITO SECUNDÁRIO SEM OMISSÃO: ESPÉCIE DA PENA, LIMITE MÍNIMO, LIMITE MÁXIMO E MULTA, QUANDO PREVISTA.\n\nQUANDO O PRÓPRIO RECORTE CONTIVER FORMAS QUALIFICADAS, PRIVILEGIADAS OU CAUSAS DE AUMENTO/DIMINUIÇÃO, REGISTRE TAMBÉM A PENA ESPECÍFICA OU A FRAÇÃO/INTERVALO LEGAL CORRESPONDENTE.\n\nNÃO RESUMA “PENA DE RECLUSÃO” OU “PENA DE DETENÇÃO” SEM INFORMAR OS LIMITES NUMÉRICOS QUANDO O TEXTO OFICIAL OS TROUXER. NÃO TROQUE RECLUSÃO POR DETENÇÃO, NÃO ALTERE FAIXAS NUMÉRICAS E NÃO OMITA MULTA.\n\nUSE A REDAÇÃO OFICIAL VIGENTE E AS FONTES AUTORIZADAS PELO PRÓPRIO MÓDULO. NÃO COMPLETE PENA POR MEMÓRIA QUANDO NÃO FOR POSSÍVEL CONFIRMÁ-LA COM SEGURANÇA.\n\nANTES DE ENTREGAR, FAÇA UMA CONFERÊNCIA ARTIGO A ARTIGO PARA GARANTIR QUE TODO TIPO PENAL DO RECORTE TENHA SUA PENA APRESENTADA QUANDO PREVISTA NO TEXTO OFICIAL ANALISADO.`,

    jurisprudencia: `${HEADING}\n\nPRESERVE O FOCO JURISPRUDENCIAL E NÃO TRANSFORME ESTE MÓDULO EM LEI SECA.\n\nAPRESENTE A PENA ABSTRATAMENTE COMINADA SOMENTE QUANDO ELA FOR NECESSÁRIA PARA COMPREENDER A TESE OU O RESULTADO DO JULGADO, ESPECIALMENTE EM MATÉRIA DE TIPIFICAÇÃO, DESCLASSIFICAÇÃO, QUALIFICADORA, PRIVILÉGIO, CAUSA DE AUMENTO OU DIMINUIÇÃO, CONCURSO DE CRIMES, DOSIMETRIA, PRESCRIÇÃO, REGIME OU OUTRA CONSEQUÊNCIA QUE DEPENDA DA PENA.\n\nNESSAS HIPÓTESES, INFORME ESPÉCIE, MÍNIMO, MÁXIMO, MULTA E FRAÇÃO DE AUMENTO/DIMINUIÇÃO QUANDO TAIS DADOS FOREM RELEVANTES E ESTIVEREM CONFIRMADOS NAS FONTES AUTORIZADAS.\n\nNÃO INSIRA PENAS EM JULGADOS NOS QUAIS ELAS NÃO TENHAM FUNÇÃO EXPLICATIVA. NÃO COMPLETE PENA POR MEMÓRIA, SUPOSIÇÃO OU CONHECIMENTO EXTERNO NÃO AUTORIZADO.\n\nANTES DE CONCLUIR, VERIFIQUE SE ALGUMA TESE PENAL FOI EXPLICADA DE FORMA INCOMPLETA POR FALTA DE UMA PENA OU FRAÇÃO QUE ERA ESSENCIAL À COMPREENSÃO DO ENTENDIMENTO.`,

    peca: `${HEADING}\n\nPRESERVE A ESTRUTURA TÉCNICA, O RACIOCÍNIO OPERACIONAL E O PADRÃO DE PEÇA JÁ EXIGIDOS NESTE MÓDULO.\n\nQUANDO A PENA DO DELITO TIVER CONSEQUÊNCIA PRÁTICA PARA A ATUAÇÃO JURÍDICA, APRESENTE A PENA ABSTRATAMENTE COMINADA E USE-A NO RACIOCÍNIO DA PEÇA. ISSO INCLUI, QUANDO PERTINENTE, FIANÇA, COMPETÊNCIA, RITO/PROCEDIMENTO, PRISÃO, MEDIDAS CAUTELARES, PRESCRIÇÃO, ENQUADRAMENTO JURÍDICO E OUTRAS PROVIDÊNCIAS QUE DEPENDAM DA PENA.\n\nINFORME ESPÉCIE, MÍNIMO, MÁXIMO, MULTA E EVENTUAL FRAÇÃO DE AUMENTO/DIMINUIÇÃO QUANDO FOREM JURIDICAMENTE RELEVANTES À PROVIDÊNCIA ANALISADA.\n\nNÃO INSIRA PENA COMO DADO DECORATIVO QUANDO ELA NÃO TIVER UTILIDADE PARA A PEÇA. NÃO COMPLETE PENA POR MEMÓRIA, SUPOSIÇÃO OU FONTE EXTERNA NÃO AUTORIZADA.\n\nANTES DE CONCLUIR, CONFIRA SE A FUNDAMENTAÇÃO DE FIANÇA, COMPETÊNCIA, CAUTELARES, PRESCRIÇÃO OU ENQUADRAMENTO NÃO FICOU INCOMPLETA POR AUSÊNCIA DA PENA RELEVANTE.`,
  });

  const CLASSIFICATION_RULE = `${CLASSIFICATION_HEADING}\n\nSEMPRE QUE O CONTEÚDO ENVOLVER ESPÉCIES, CATEGORIAS, FASES, GRAUS, PROVAS, TESTES OU MÉTODOS, VERIFIQUE A CLASSIFICAÇÃO INDIVIDUAL DE CADA ELEMENTO.\n\nNÃO INFIRA QUE TODOS OS ITENS MENCIONADOS CONJUNTAMENTE PERTENCEM À MESMA CATEGORIA.\n\nREGRAS DE APLICAÇÃO:\n* ANALISE CADA ELEMENTO SEPARADAMENTE E ATRIBUA SOMENTE A CLASSIFICAÇÃO QUE FOR ESPECIFICAMENTE SUSTENTADA PELA FONTE;\n* NÃO TRANSFIRA PARA UM ITEM A CLASSIFICAÇÃO DE OUTRO APENAS PORQUE AMBOS APARECEM LADO A LADO, POSSUEM FUNÇÃO SEMELHANTE OU PERTENCEM AO MESMO GÊNERO;\n* SÓ AGRUPE DOIS OU MAIS ELEMENTOS NA MESMA ESPÉCIE, CATEGORIA, FASE, GRAU, CLASSE DE PROVA, TESTE OU MÉTODO QUANDO HOUVER SUPORTE ESPECÍFICO PARA CADA UM;\n* SE A FONTE NÃO PERMITIR DETERMINAR COM SEGURANÇA A CLASSIFICAÇÃO DE UM ELEMENTO, NÃO INFIRA, NÃO GENERALIZE E NÃO COMPLETE POR ANALOGIA;\n* ANTES DA ENTREGA, REVISE ITEM POR ITEM PARA CONFIRMAR QUE NENHUMA CLASSIFICAÇÃO INDIVIDUAL FOI INDEVIDAMENTE ESTENDIDA A OUTRO ELEMENTO.\n\nA MERA PROXIMIDADE TEXTUAL OU O PERTENCIMENTO AO MESMO GÊNERO NÃO AUTORIZA TRATAR ESPÉCIES DIFERENTES COMO SE TIVESSEM A MESMA CLASSIFICAÇÃO.\n\nNÃO ALTERE NENHUMA OUTRA REGRA DO PROMPT.`;

  const DIDACTIC_RULE = `${DIDACTIC_HEADING}\n\nOBJETIVO: MÁXIMA CLAREZA COM O MÍNIMO DE TEXTO NECESSÁRIO. NÃO TORNE O RESUMO MAIS LONGO POR PADRÃO; TORNE CADA LINHA MAIS COMPREENSÍVEL, PRECISA E MEMORIZÁVEL.\n\nAUTOSSUFICIÊNCIA:\n* CADA TÓPICO EXPLICATIVO DEVE CONTER INFORMAÇÃO SUFICIENTE PARA SER COMPREENDIDO PRATICAMENTE DE FORMA AUTÔNOMA, SEM EXIGIR QUE O LEITOR RECONSTRUA MENTALMENTE SUJEITO, OBJETO, CONDIÇÃO, REFERENTE OU CONSEQUÊNCIA OMITIDOS;\n* EVITE CONCLUSÕES ISOLADAS OU TELEGRÁFICAS COMO “NÃO CABE”, “APLICA-SE”, “É POSSÍVEL”, “DEPENDE”, “É VEDADO” OU “EXIGE AUTORIZAÇÃO” SEM IDENTIFICAR, NA MESMA LINHA OU NO MESMO BLOCO IMEDIATO, A QUE INSTITUTO, SITUAÇÃO, CONDIÇÃO OU EFEITO A AFIRMAÇÃO SE REFERE;\n* SEMPRE QUE DOIS ELEMENTOS ESTIVEREM RELACIONADOS, EXPLICITE BREVEMENTE A RELAÇÃO LÓGICA ENTRE ELES, ESPECIALMENTE CONDIÇÃO → RESULTADO, REQUISITO → CONSEQUÊNCIA, CAUSA → EFEITO E REGRA → EXCEÇÃO.\n\nDIDÁTICA:\n* QUANDO O CONTEÚDO FOR TÉCNICO, ABSTRATO OU POUCO INTUITIVO, APRESENTE PRIMEIRO A IDEIA CENTRAL EM LINGUAGEM CLARA E DEPOIS OS DETALHES NECESSÁRIOS;\n* QUANDO NECESSÁRIO À COMPREENSÃO, EXPLICITE DE FORMA CURTA: 1) CONCEITO — O QUE É; 2) MECANISMO — COMO FUNCIONA; 3) FINALIDADE — PARA QUE SERVE; 4) REQUISITO/CONDIÇÃO — QUANDO OCORRE; 5) CONSEQUÊNCIA/EFEITO — O QUE RESULTA; 6) DISTINÇÃO — DIFERENÇA PARA INSTITUTO SEMELHANTE; 7) EXEMPLO — SOMENTE SE REALMENTE FACILITAR A COMPREENSÃO; 8) EXCEÇÃO/RESSALVA — QUANDO NECESSÁRIA; 9) PONTO DE PROVA — QUANDO HOUVER ASPECTO ESPECIALMENTE COBRÁVEL;\n* NÃO É OBRIGATÓRIO USAR TODOS ESSES ELEMENTOS EM TODO TÓPICO. USE APENAS OS QUE AUMENTEM A CLAREZA SEM REDUNDÂNCIA.\n\nDISTINÇÕES E CLASSIFICAÇÕES:\n* QUANDO HOUVER RISCO REAL DE CONFUSÃO ENTRE INSTITUTOS SEMELHANTES, INSIRA COMPARAÇÃO CURTA E DIRETA, PREFERENCIALMENTE NO FORMATO DE PONTO DE PROVA QUANDO ISSO TIVER UTILIDADE PARA REVISÃO;\n* MANTENHA A CLASSIFICAÇÃO INDIVIDUAL DE CADA ELEMENTO E NÃO INFIRA QUE INSTITUTOS AGRUPADOS NA FONTE POSSUEM A MESMA ESPÉCIE, CATEGORIA, FASE, GRAU, NATUREZA, PROVA, TESTE, MÉTODO OU FINALIDADE.\n\nLIMITES OBRIGATÓRIOS:\n* NÃO TRANSFORME O RESUMO EM AULA, TEXTO CORRIDO OU EXPOSIÇÃO DOUTRINÁRIA EXTENSA;\n* NÃO CRIE PARÁGRAFOS LONGOS, EXPLICAÇÕES EXCESSIVAS, REPETIÇÕES, EXEMPLOS DESNECESSÁRIOS, APROFUNDAMENTO IRRELEVANTE OU REDUÇÃO DA DENSIDADE DE CONTEÚDO;\n* NÃO INCLUA INFORMAÇÃO EXTERNA NÃO AUTORIZADA E NÃO USE A BUSCA POR CLAREZA COMO JUSTIFICATIVA PARA COMPLETAR LACUNAS DA FONTE POR MEMÓRIA, SUPOSIÇÃO OU ANALOGIA;\n* PRESERVE INTEGRALMENTE A TOPIFICAÇÃO, HIERARQUIA, FORMATAÇÃO, EMOJIS, PADRÃO VISUAL, FIDELIDADE ÀS FONTES, SEPARAÇÃO DOS MÓDULOS E TODAS AS REGRAS ESPECÍFICAS JÁ EXISTENTES PARA RESUMO/AULA, LEI, JURISPRUDÊNCIA, PEÇA, CONSOLIDAÇÃO FINAL E COMBINAÇÕES ENTRE MÓDULOS;\n* EM MÓDULOS DE NATUREZA OPERACIONAL OU DE TRIAGEM, APLIQUE ESTA REGRA SOMENTE AOS TRECHOS EXPLICATIVOS QUE JÁ FOREM PRODUZIDOS; NÃO CRIE EXPLICAÇÕES NOVAS NEM ALTERE A FUNÇÃO DO MÓDULO.\n\nREVISÃO FINAL: ANTES DE ENTREGAR, VERIFIQUE SE CADA CONCLUSÃO IMPORTANTE POSSUI REFERENTE IDENTIFICÁVEL E SE O LEITOR CONSEGUE ENTENDER O TÓPICO SEM DEPENDER DE CONTEXTO OMITIDO. SE UMA FRASE ESTIVER CORRETA, MAS EXCESSIVAMENTE TELEGRÁFICA, REESCREVA-A COM A MENOR COMPLEMENTAÇÃO NECESSÁRIA PARA TORNÁ-LA AUTOSSUFICIENTE.\n\nNÃO REMOVA, RESUMA, SUBSTITUA OU ENFRAQUEÇA NENHUMA REGRA JÁ EXISTENTE NO PROMPT.`;

  function appendRule(prompt, key) {
    const original = typeof prompt === "string" ? prompt : "";
    const trimmed = original.trimEnd();
    if (!trimmed || trimmed.includes(HEADING)) return original;
    return `${trimmed}\n\n${RULES[key]}`;
  }

  function appendClassificationRule(prompt) {
    const original = typeof prompt === "string" ? prompt : "";
    const trimmed = original.trimEnd();
    if (!trimmed || trimmed.includes(CLASSIFICATION_HEADING)) return original;
    return `${trimmed}\n\n${CLASSIFICATION_RULE}`;
  }

  function appendDidacticRule(prompt) {
    const original = typeof prompt === "string" ? prompt : "";
    const trimmed = original.trimEnd();
    if (!trimmed || trimmed.includes(DIDACTIC_HEADING)) return original;
    return `${trimmed}\n\n${DIDACTIC_RULE}`;
  }

  function patchLibrary(library) {
    if (!library || typeof library !== "object") return false;
    let changed = false;
    MODULE_KEYS.forEach((key) => {
      if (typeof library[key] !== "string" || !library[key].trim()) return;
      const updated = appendRule(library[key], key);
      if (updated !== library[key]) {
        library[key] = updated;
        changed = true;
      }
    });
    return changed;
  }

  function patchClassificationLibrary(library) {
    if (!library || typeof library !== "object") return false;
    let changed = false;
    Object.keys(library).forEach((key) => {
      if (typeof library[key] !== "string" || !library[key].trim()) return;
      const updated = appendClassificationRule(library[key]);
      if (updated !== library[key]) {
        library[key] = updated;
        changed = true;
      }
    });
    return changed;
  }

  function patchDidacticLibrary(library) {
    if (!library || typeof library !== "object") return false;
    let changed = false;
    Object.keys(library).forEach((key) => {
      if (typeof library[key] !== "string" || !library[key].trim()) return;
      const updated = appendDidacticRule(library[key]);
      if (updated !== library[key]) {
        library[key] = updated;
        changed = true;
      }
    });
    return changed;
  }

  function currentState() {
    try {
      return typeof state !== "undefined" && state && typeof state === "object" ? state : null;
    } catch (_error) {
      return null;
    }
  }

  function currentDefaults() {
    try {
      return typeof defaultFactoryPromptLibrary !== "undefined" && defaultFactoryPromptLibrary && typeof defaultFactoryPromptLibrary === "object"
        ? defaultFactoryPromptLibrary
        : null;
    } catch (_error) {
      return null;
    }
  }

  function factoryRouteActive() {
    try {
      return String(location?.hash || "").replace(/^#/, "").split(/[?&]/)[0] === "fabrica-resumos";
    } catch (_error) {
      return false;
    }
  }

  function applyFactoryPenaltyPolicy() {
    const targetState = currentState();
    let changed = false;

    const defaults = currentDefaults();
    if (defaults) changed = patchLibrary(defaults) || changed;

    if (targetState?.factoryPromptLibrary) {
      const stateChanged = patchLibrary(targetState.factoryPromptLibrary);
      changed = stateChanged || changed;
      if (stateChanged) {
        targetState.migrations ||= {};
        targetState.migrations[MIGRATION_ID] ||= new Date().toISOString();
        try {
          if (typeof saveData === "function") saveData();
        } catch (error) {
          console.warn(`[${VERSION}] Não foi possível persistir imediatamente a biblioteca atualizada.`, error);
        }
      }
    }

    globalThis.__aldusFactoryPenaltiesV320 = Object.freeze({
      version: VERSION,
      migrationId: MIGRATION_ID,
      applied: Boolean(targetState?.factoryPromptLibrary),
      changed,
      updatedAt: new Date().toISOString(),
    });

    return changed;
  }

  function applyFactoryClassificationPolicy() {
    if (!factoryRouteActive()) return false;

    const targetState = currentState();
    let changed = false;

    const defaults = currentDefaults();
    if (defaults) changed = patchClassificationLibrary(defaults) || changed;

    if (targetState?.factoryPromptLibrary) {
      const stateChanged = patchClassificationLibrary(targetState.factoryPromptLibrary);
      changed = stateChanged || changed;
      if (stateChanged || !targetState.migrations?.[CLASSIFICATION_MIGRATION_ID]) {
        targetState.migrations ||= {};
        targetState.migrations[CLASSIFICATION_MIGRATION_ID] ||= new Date().toISOString();
        try {
          if (typeof saveData === "function") saveData();
        } catch (error) {
          console.warn(`[${VERSION}] Não foi possível persistir imediatamente a regra de classificação individual.`, error);
        }
      }
    }

    globalThis.__aldusFactoryClassificationIndividualV403 = Object.freeze({
      version: VERSION,
      migrationId: CLASSIFICATION_MIGRATION_ID,
      applied: Boolean(targetState?.factoryPromptLibrary),
      changed,
      updatedAt: new Date().toISOString(),
    });

    return changed;
  }

  function applyFactoryDidacticPolicy() {
    if (!factoryRouteActive()) return false;

    const targetState = currentState();
    let changed = false;

    const defaults = currentDefaults();
    if (defaults) changed = patchDidacticLibrary(defaults) || changed;

    if (targetState?.factoryPromptLibrary) {
      const stateChanged = patchDidacticLibrary(targetState.factoryPromptLibrary);
      changed = stateChanged || changed;
      if (stateChanged || !targetState.migrations?.[DIDACTIC_MIGRATION_ID]) {
        targetState.migrations ||= {};
        targetState.migrations[DIDACTIC_MIGRATION_ID] ||= new Date().toISOString();
        try {
          if (typeof saveData === "function") saveData();
        } catch (error) {
          console.warn(`[${VERSION}] Não foi possível persistir imediatamente a regra de didática e autossuficiência.`, error);
        }
      }
    }

    globalThis.__aldusFactoryDidacticAutonomyV404 = Object.freeze({
      version: VERSION,
      migrationId: DIDACTIC_MIGRATION_ID,
      applied: Boolean(targetState?.factoryPromptLibrary),
      changed,
      updatedAt: new Date().toISOString(),
    });

    return changed;
  }

  const run = () => {
    try {
      applyFactoryPenaltyPolicy();
      applyFactoryClassificationPolicy();
      applyFactoryDidacticPolicy();
    } catch (error) {
      console.error(`[${VERSION}] Falha ao aplicar as políticas de prompts da Fábrica.`, error);
    }
  };

  run();
  [250, 1000, 3000].forEach((delay) => setTimeout(run, delay));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  window.addEventListener("pageshow", run);
  window.addEventListener("hashchange", () => {
    if (location.hash === "#fabrica-resumos") run();
  });
})();
