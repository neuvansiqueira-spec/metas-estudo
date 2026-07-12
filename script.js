const STORAGE_KEY = "metasConcursoData";
const SIMULADOS_STORAGE_KEY = "metasEstudoSimulados";
const MOTIVATION_STORAGE_KEY = "metasEstudoMensagemDoDia";
const CADERNO_ERROS_STORAGE_KEY = "cadernoErros";
const CADERNO_ERROS_DEBUG = false;
const GOOGLE_CLIENT_ID = "888613157566-p6ad2hmuav7uc7tqabs846rnnmh6g7mf.apps.googleusercontent.com";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GOOGLE_SYNC_FILE_NAME = "metas-estudo-sync.json";
const DEVICE_ID_STORAGE_KEY = "metasEstudoDeviceId";
const SYNC_META_STORAGE_KEY = "metasEstudoSyncMeta";
const TIMER_PREFS_STORAGE_KEY = "metasEstudoTimerPreferences";
const AUTO_SYNC_DEBOUNCE_MS = 4000;
const QB_RENDER_LIMIT = 20;
const ENABLE_FACTORY = true;
const FACTORY_UI_COMPAT_LABELS = "RESUMOS A PRODUZIR HOJE | A PRODUZIR | EM PRODUÇÃO | CONCLUÍDOS | MATERIAIS JÁ PRONTOS PARA ESTUDAR | Pasta de destino do Word/PDF:";
const MOTIVATIONAL_PHRASES = [
  "Disciplina vence motivação.",
  "Hoje é dia de ganhar pontos líquidos.",
  "Cada questão corrigida diminui uma dúvida na prova.",
  "Não estude para fechar PDF; estude para acertar questão.",
  "Plantão passa. A aprovação fica.",
  "O edital não se vence em um dia, mas se perde quando você para.",
  "A constância decide antes da prova.",
  "Menos promessa, mais execução.",
  "A meta de hoje protege o resultado da prova.",
  "Quem controla o edital controla a ansiedade.",
  "O líquido Cebraspe melhora no detalhe.",
  "A revisão certa vale mais que uma leitura cansada.",
  "Erro corrigido hoje é ponto preservado na prova.",
  "A aprovação é construída em dias comuns.",
  "Não negocie com a procrastinação.",
  "Pouco bem feito ainda é melhor que muito abandonado.",
  "Sua escala muda; sua meta se adapta.",
  "Dia de plantão pede estratégia, não culpa.",
  "Folga bem usada vira vantagem competitiva.",
  "A banca cobra precisão. Treine precisão.",
  "O edital é grande, mas o controle é diário.",
  "Hoje você não precisa vencer tudo; precisa avançar.",
  "Questão errada sem correção vira erro repetido.",
  "O caderno de erros é mapa de aprovação.",
  "Não conte horas; transforme horas em acertos.",
  "Seu estudo precisa gerar decisão de prova.",
  "Assunto difícil não se evita, se quebra em partes.",
  "A meta semanal organiza a ansiedade.",
  "A prova cobra constância antes de cobrar memória.",
  "O próximo ponto líquido começa agora.",
  "Delegado se forma na rotina que ninguém vê.",
  "Controle o edital antes que ele controle sua semana.",
  "Estudo estratégico é escolher o próximo ponto possível.",
  "Cebraspe pune descuido; sua rotina treina atenção.",
  "A disciplina do pós-plantão também conta."
];
const todayISO = () => new Date().toISOString().slice(0, 10);
const defaultPlanning = { config: { examDate: "", scaleType: "24x72", cycleType: "24x72", scaleReferenceDate: "", scaleReferencePosition: 0, scaleNotes: "", shiftHours: 1, restHours: 5, normalHours: 2.5, minWeeklyHours: 10, idealWeeklyHours: 18, weeklyTopics: 8, safetyDays: 7, disciplinesPerDay: 2, disciplinesPerWeek: 6, disciplinesPerMonth: 10, topicsPerDay: 3, topicsPerWeek: 8, topicsPerMonth: 40 }, availability: {}, weeklyGoals: [], forecasts: {} };
function cloneData(value) { return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function normalizePlanningState(planning = {}) {
  const incomingConfig = planning.config || {};
  const normalizedConfig = { ...defaultPlanning.config, ...incomingConfig };
  normalizedConfig.disciplinesPerDay = Number(normalizedConfig.disciplinesPerDay) || 2;
  normalizedConfig.disciplinesPerWeek = Number(normalizedConfig.disciplinesPerWeek) || 6;
  normalizedConfig.disciplinesPerMonth = Number(normalizedConfig.disciplinesPerMonth) || 10;
  normalizedConfig.topicsPerDay = Number(normalizedConfig.topicsPerDay) || 3;
  normalizedConfig.topicsPerWeek = Number(normalizedConfig.topicsPerWeek || normalizedConfig.weeklyTopics) || 8;
  normalizedConfig.topicsPerMonth = Number(normalizedConfig.topicsPerMonth) || 40;
  normalizedConfig.cycleType = normalizedConfig.cycleType || normalizedConfig.scaleType || "24x72";
  normalizedConfig.scaleReferenceDate ||= todayISO();
  normalizedConfig.scaleReferencePosition = Number(normalizedConfig.scaleReferencePosition) || 0;
  return {
    ...cloneData(defaultPlanning),
    ...planning,
    config: normalizedConfig,
    availability: { ...(planning.availability || {}) },
    weeklyGoals: Array.isArray(planning.weeklyGoals) ? planning.weeklyGoals : [],
    forecasts: { ...(planning.forecasts || {}) }
  };
}
const defaultTimerPreferences = { visualAlerts: true, sound: false, vibration: true, browserNotifications: false, alertVolume: "medium" };
const FACTORY_RESUMO_AULA_PROMPT_SEGMENT = "TRANSFORME AS FONTES CLASSIFICADAS COMO RESUMO/AULA EM MAPA HIERÁRQUICO DE PALAVRAS-CHAVE PARA CÓPIA MANUSCRITA.\n\nNÃO PRODUZA RESUMO CORRIDO, PARÁGRAFOS LONGOS, EXPLICAÇÕES EXTERNAS, TABELAS OU COMENTÁRIOS.\n\nNÃO MAPEIE TODO O TEXTO MECANICAMENTE.\n\nNÃO PESQUISE, ATUALIZE, CORRIJA OU COMPLETE O CONTEÚDO.\n\nPRESERVE O SENTIDO JURÍDICO DO ORIGINAL.\n\n## ESCOPO DO MÓDULO\n\nUSE APENAS AS FONTES CLASSIFICADAS COMO RESUMO/AULA NA TRIAGEM.\n\nRESPEITE A DISCIPLINA, O TEMA E O RECORTE INFORMADOS.\n\nNÃO USE FONTES CLASSIFICADAS COMO LEI, JURISPRUDÊNCIA, PEÇA OU ATUALIZAÇÃO/COMPLEMENTO.\n\nNÃO GERE MÓDULO LEI, JURISPRUDÊNCIA, PEÇA OU CONSOLIDAÇÃO FINAL.\n\nNÃO TRANSFORME O CONTEÚDO EM LEI SECA TOPIFICADA, MAPA DE JULGADOS OU MODELO DE PEÇA.\n\nNÃO INSERIR PCDF, BANCA, CONCURSO, PROFESSORA, CURSO OU TURMA.\n\nSUBSTITUIR QUALQUER REFERÊNCIA ESPECÍFICA DE PROVA POR “📌 PROVA”.\n\nSE A FONTE NECESSÁRIA NÃO ESTIVER ANEXADA OU DISPONÍVEL, NÃO EXECUTE. INFORME:\n\n“O ARQUIVO OU A FONTE CLASSIFICADA COMO RESUMO/AULA PRECISA SER ANEXADA.”\n\n## OBJETIVO\n\nO RESULTADO FINAL DEVE TER A COMPLETUDE DE UM RESUMO APROFUNDADO, MAS A ARQUITETURA VISUAL, A FLUIDEZ E A FACILIDADE DE REVISÃO DE UM MAPA HIERÁRQUICO DIDÁTICO.\n\nA COMPLETUDE DEVE VIR DO CONTEÚDO JURÍDICO PRESERVADO, E NÃO DA ABERTURA EXCESSIVA DE TÍTULOS OU DA REPETIÇÃO DE BLOCOS.\n\nEXTRAIA SOMENTE O CONTEÚDO JURÍDICO NECESSÁRIO PARA ESTUDO, REVISÃO E MEMORIZAÇÃO:\n\n* DISCIPLINA;\n* TEMA;\n* INSTITUTOS;\n* CONCEITOS;\n* NATUREZA JURÍDICA;\n* CARACTERÍSTICAS;\n* CLASSIFICAÇÕES;\n* ELEMENTOS;\n* REQUISITOS;\n* CONDIÇÕES;\n* PROCEDIMENTOS;\n* ETAPAS;\n* PRAZOS;\n* COMPETÊNCIAS;\n* LEGITIMIDADES;\n* RESPONSABILIDADES;\n* DIREITOS;\n* DEVERES;\n* VEDAÇÕES;\n* EXCEÇÕES;\n* EFEITOS;\n* CONSEQUÊNCIAS;\n* DIFERENÇAS ENTRE INSTITUTOS;\n* REGRAS GERAIS E ESPECIAIS;\n* PONTOS DE PROVA.\n\nNÃO INVENTE INFORMAÇÃO AUSENTE.\n\n## FIDELIDADE E CONTRADIÇÕES\n\nUSE SOMENTE O CONTEÚDO DAS FONTES APROVADAS NA TRIAGEM.\n\nNÃO INVENTE CONCEITO, FUNDAMENTO, EXCEÇÃO, REQUISITO, PRAZO, COMPETÊNCIA, CONSEQUÊNCIA OU DISTINÇÃO.\n\nSE HOUVER DÚVIDA, PRESERVE APENAS A IDEIA SEGURA.\n\nSE O ORIGINAL TROUXER INFORMAÇÕES INCOMPATÍVEIS:\n\n1. PRESERVE O SENTIDO JURÍDICO PREDOMINANTE DO PRÓPRIO ARQUIVO.\n2. EM CONFLITO ENTRE TEXTO EXPLICATIVO E TABELA, PREFIRA O TEXTO EXPLICATIVO MAIS COMPLETO, SALVO SE A TABELA FOR O ÚNICO LOCAL DO TEMA.\n3. NÃO REPRODUZA AUTOMATICAMENTE DUAS INFORMAÇÕES INCOMPATÍVEIS COMO SE AMBAS ESTIVESSEM CORRETAS.\n4. SE A CONTRADIÇÃO NÃO PUDER SER RESOLVIDA, INSIRA:\n\n✳️ CONTRADIÇÃO INTERNA NO ORIGINAL\n\n## PADRÃO OBRIGATÓRIO DE PROFUNDIDADE DIDÁTICA\n\nANTES DE REDIGIR O MAPA, FAÇA INTERNAMENTE UM INVENTÁRIO DOS GRANDES EIXOS, INSTITUTOS E INFORMAÇÕES JURÍDICAS RELEVANTES PRESENTES NAS FONTES.\n\nESSE INVENTÁRIO É SOMENTE UMA ETAPA INTERNA DE CONTROLE. NÃO O APRESENTE NO DOCUMENTO FINAL.\n\nPARA CADA INSTITUTO RELEVANTE, VERIFIQUE SE A FONTE APRESENTA:\n\n1. CONCEITO OU NATUREZA;\n2. FINALIDADE;\n3. SUJEITO, TITULAR, LEGITIMIDADE, ATRIBUIÇÃO OU COMPETÊNCIA;\n4. OBJETO OU CAMPO DE APLICAÇÃO;\n5. REQUISITOS OU CONDIÇÕES;\n6. PROCEDIMENTO, ETAPAS OU FORMA DE FUNCIONAMENTO;\n7. EFEITOS OU CONSEQUÊNCIAS JURÍDICAS;\n8. LIMITES, VEDAÇÕES, EXCEÇÕES OU RESSALVAS;\n9. DISTINÇÕES EM RELAÇÃO A INSTITUTOS PRÓXIMOS;\n10. PONTO RELEVANTE PARA PROVA.\n\nSE ALGUM DESSES ELEMENTOS ESTIVER PRESENTE NA FONTE, ELE DEVE APARECER NO MAPA.\n\nSE NÃO ESTIVER PRESENTE NA FONTE, NÃO INVENTE, NÃO PESQUISE E NÃO COMPLETE.\n\nA SIMPLES MENÇÃO AO NOME DO INSTITUTO NÃO CONTA COMO DESENVOLVIMENTO.\n\nQUANDO A FONTE TROUXER ELEMENTOS SUFICIENTES, O BLOCO DEVE PERMITIR RECORDAR:\n\n* O QUE É;\n* PARA QUE SERVE;\n* QUEM ATUA;\n* SOBRE O QUE RECAI;\n* EM QUAIS CONDIÇÕES;\n* COMO FUNCIONA;\n* QUAIS EFEITOS PRODUZ;\n* QUAIS SÃO SEUS LIMITES, EXCEÇÕES E DISTINÇÕES.\n\nNÃO DEIXE INSTITUTO RELEVANTE REDUZIDO A TÍTULO, DEFINIÇÃO GENÉRICA OU CONCLUSÃO SOLTA QUANDO A FONTE APRESENTAR DESENVOLVIMENTO ADICIONAL.\n\nNÃO SACRIFIQUE PARA ENCURTAR O MATERIAL:\n\n* SUJEITO DA REGRA;\n* OBJETO DA PERMISSÃO OU VEDAÇÃO;\n* FINALIDADE DO INSTITUTO;\n* CONDIÇÃO DE APLICAÇÃO;\n* REQUISITOS;\n* PROCEDIMENTO;\n* EXCEÇÃO RELEVANTE;\n* CONSEQUÊNCIA JURÍDICA;\n* DIFERENÇA ENTRE REGRA GERAL E ESPECIAL.\n\n## ORDEM DIDÁTICA DE DESENVOLVIMENTO\n\nORGANIZE CADA GRANDE EIXO, SEMPRE QUE O CONTEÚDO DA FONTE PERMITIR, NESTA SEQUÊNCIA:\n\n1. VISÃO GERAL;\n2. CONCEITO, NATUREZA E FINALIDADE;\n3. SUJEITOS, ATRIBUIÇÕES E COMPETÊNCIAS;\n4. OBJETO, REQUISITOS E CONDIÇÕES;\n5. PROCEDIMENTO OU FUNCIONAMENTO;\n6. EFEITOS E CONSEQUÊNCIAS;\n7. LIMITES, VEDAÇÕES, EXCEÇÕES E DISTINÇÕES;\n8. 📌 PROVA.\n\nA SEQUÊNCIA É UM PADRÃO DE ORGANIZAÇÃO, NÃO UMA AUTORIZAÇÃO PARA CRIAR INFORMAÇÃO AUSENTE.\n\nNÃO ESPALHE AS PARTES DO MESMO INSTITUTO EM TÍTULOS PRINCIPAIS DIFERENTES QUANDO ELAS PUDEREM SER COMPREENDIDAS NO MESMO GRANDE EIXO.\n\n## CONTROLE DE DENSIDADE E AGRUPAMENTO\n\nNÃO CONFUNDA COMPLETUDE COM FRAGMENTAÇÃO NEM CONCISÃO COM SUPERFICIALIDADE.\n\nPRESERVE TODA INFORMAÇÃO JURÍDICA RELEVANTE, MAS AGRUPE INFORMAÇÕES PRÓXIMAS SOB O MESMO EIXO TEMÁTICO.\n\nANTES DE CRIAR UM NOVO TÍTULO ♦️, VERIFIQUE SE O CONTEÚDO PODE SER ORGANIZADO COMO:\n\n* SUBTÓPICO NUMERADO DO TÍTULO ANTERIOR;\n* BLOCO ▶️📚 DO MESMO INSTITUTO;\n* REGRA OU CONSEQUÊNCIA ✅;\n* EXCEÇÃO, DISTINÇÃO OU PEGADINHA ✳️;\n* PONTO DE REVISÃO 📌 PROVA.\n\nUSE TÍTULOS ♦️ SOMENTE PARA GRANDES EIXOS DO TEMA.\n\nUSE SUBNUMERAÇÃO 1.1., 1.2., 2.1. ETC. PARA ASSUNTOS DEPENDENTES, COMPLEMENTARES OU INTERNAMENTE RELACIONADOS.\n\nNÃO CRIE TÍTULO AUTÔNOMO PARA CADA CONCEITO, NATUREZA, CARACTERÍSTICA, EFEITO, EXCEÇÃO OU DISTINÇÃO.\n\nQUANDO FOREM COMPLEMENTARES E JURIDICAMENTE COMPATÍVEIS, REÚNA NO MESMO BLOCO:\n\n* CONCEITO, NATUREZA E FINALIDADE;\n* SUJEITO, ATRIBUIÇÃO E COMPETÊNCIA;\n* REQUISITO, PROCEDIMENTO E CONSEQUÊNCIA;\n* REGRA, LIMITE E EXCEÇÃO;\n* CARACTERÍSTICAS DO MESMO INSTITUTO.\n\nNÃO JUNTE INFORMAÇÕES APENAS PARA REDUZIR PÁGINAS QUANDO ISSO GERAR AMBIGUIDADE, APAGAR DISTINÇÕES OU PREJUDICAR A MEMORIZAÇÃO.\n\nA REDUÇÃO DE DENSIDADE DEVE OCORRER POR:\n\n* AGRUPAMENTO TEMÁTICO;\n* HIERARQUIZAÇÃO;\n* SUBNUMERAÇÃO;\n* ELIMINAÇÃO DE REPETIÇÕES;\n* REDAÇÃO DIRETA E JURIDICAMENTE COMPLETA;\n* USO ADEQUADO DE ✅, ✳️ E 📌 PROVA.\n\nNÃO ELIMINE PRAZO, REQUISITO, COMPETÊNCIA, LEGITIMIDADE, VEDAÇÃO, EXCEÇÃO, DISTINÇÃO OU CONSEQUÊNCIA PARA DEIXAR O MATERIAL MAIS CURTO.\n\n## CONTROLE OBJETIVO DE TÍTULOS, SUBTÓPICOS E LINHAS\n\nUSE ♦️ SOMENTE PARA GRANDES EIXOS TEMÁTICOS AUTÔNOMOS.\n\nUSE PREFERENCIALMENTE NUMERAÇÃO INTEIRA NOS GRANDES EIXOS:\n\n1.;\n2.;\n3.;\n4.;\nETC.\n\nNÃO CRIE TÍTULO ♦️ SUBNUMERADO, COMO 2.1., 3.1. OU 5.2., QUANDO O CONTEÚDO PUDER SER DESENVOLVIDO COMO BLOCO ▶️📚 DENTRO DO EIXO PRINCIPAL.\n\nUM TÍTULO ♦️ SUBNUMERADO SOMENTE É ADMITIDO QUANDO:\n\n1. REPRESENTAR UM SUBEIXO JURIDICAMENTE AUTÔNOMO;\n2. EXIGIR PELO MENOS DOIS BLOCOS ▶️📚 SUBSTANCIAIS;\n3. SUA SEPARAÇÃO MELHORAR MATERIALMENTE A COMPREENSÃO;\n4. SUA INCORPORAÇÃO AO EIXO PRINCIPAL PREJUDICAR A CLAREZA.\n\nANTES DE FINALIZAR, VERIFIQUE CADA TÍTULO ♦️:\n\n- SE POSSUI APENAS UM BLOCO ▶️📚, PREFIRA INCORPORÁ-LO AO EIXO PRINCIPAL;\n- SE É APENAS ESPÉCIE, PRAZO ESPECIAL, EXCEÇÃO OU DESDOBRAMENTO, USE ▶️📚;\n- SE REPETE O CONTEXTO DO TÍTULO ANTERIOR, AGRUPE;\n- SE NÃO FUNCIONA COMO ÂNCORA AUTÔNOMA DE MEMORIZAÇÃO, NÃO O MANTENHA COMO ♦️.\n\nEM TEMAS ESPECÍFICOS OU ESTREITOS, NÃO REPRODUZA ARTIFICIALMENTE A MESMA QUANTIDADE DE TÍTULOS USADA EM TEMAS AMPLOS.\n\nNÃO EXISTE QUANTIDADE FIXA DE TÍTULOS.\n\nA QUANTIDADE DEVE DECORRER DA ESTRUTURA JURÍDICA REAL DO CONTEÚDO.\n\nCADA LINHA DEVE CONTER PREFERENCIALMENTE UMA ÚNICA RELAÇÃO JURÍDICA PRINCIPAL.\n\nPREFIRA LINHAS COM ATÉ 22 PALAVRAS.\n\nA LINHA PODE ULTRAPASSAR ESSE TAMANHO SOMENTE QUANDO A DIVISÃO GERAR AMBIGUIDADE, RETIRAR CONDIÇÃO, EXCEÇÃO, SUJEITO, OBJETO OU CONSEQUÊNCIA.\n\nSE UMA LINHA CONTIVER DUAS PROPOSIÇÕES JURÍDICAS AUTÔNOMAS, DIVIDA-A EM DUAS CAMADAS OU LINHAS, SEM EXCLUIR CONTEÚDO.\n\nNÃO TRANSFORME FRASES CURTAS EM PALAVRAS SOLTAS OU EXPRESSÕES TELEGRÁFICAS.\n\n## PROIBIÇÃO DE METALINGUAGEM SOBRE AS FONTES\n\nNO DOCUMENTO FINAL, NÃO USE EXPRESSÕES COMO:\n\n- “AS FONTES APRESENTAM”;\n- “SEGUNDO AS FONTES”;\n- “UMA DAS FONTES”;\n- “O MATERIAL INFORMA”;\n- “CONFORME O MATERIAL”;\n- “LINHA PREDOMINANTE DAS FONTES”;\n- “CORRENTE ADOTADA PELA FONTE”;\n- “HIPÓTESES APRESENTADAS NAS FONTES”.\n\nCONVERTA O CONTEÚDO SEGURO EM REGRA JURÍDICA DIRETA E AUTOSSUFICIENTE.\n\nSE HOUVER POSIÇÕES DIVERGENTES CLARAMENTE DESENVOLVIDAS NO ORIGINAL, APRESENTE DIRETAMENTE:\n\n1️⃣ PRIMEIRA CORRENTE: [CONTEÚDO].\n\n2️⃣ SEGUNDA CORRENTE: [CONTEÚDO].\n\n✳️ DIVERGÊNCIA: [PONTO EXATO DA DIVERGÊNCIA].\n\nSE A CONTRADIÇÃO INTERNA NÃO PUDER SER RESOLVIDA COM SEGURANÇA, USE EXATAMENTE:\n\n✳️ CONTRADIÇÃO INTERNA NO ORIGINAL\n\nNÃO MENCIONE O PROCESSO DE LEITURA, SELEÇÃO OU COMPARAÇÃO DAS FONTES NO MAPA FINAL.\n\nA EXPRESSÃO “FONTES DE INFORMAÇÃO” CONTINUA PERMITIDA QUANDO FOR PARTE DO PRÓPRIO CONTEÚDO JURÍDICO E NÃO UMA REFERÊNCIA AOS ARQUIVOS UTILIZADOS.\n\n## MODELO DE REFERÊNCIA\n\nUSE O WORD-MODELO E OS ARQUIVOS DA PASTA 00_MODELOS_REFERENCIA SOMENTE COMO REFERÊNCIA DE:\n\n* PROFUNDIDADE;\n* AGRUPAMENTO TEMÁTICO;\n* RITMO DE LEITURA;\n* EXTENSÃO DAS LINHAS;\n* HIERARQUIA;\n* RESPIRO VISUAL.\n\nNÃO COPIE CONTEÚDO JURÍDICO DOS MODELOS E NÃO OS TRATE COMO FONTE DO TEMA.\n\nENTRE MODELOS COM DENSIDADES DIFERENTES, PREFIRA O PADRÃO QUE DESENVOLVA CADA INSTITUTO EM BLOCOS AUTOSSUFICIENTES, AGRUPE CONTEÚDOS RELACIONADOS E EVITE EXCESSO DE TÍTULOS PRINCIPAIS.\n\nOS TÍTULOS DEVEM FUNCIONAR COMO ÂNCORAS VISUAIS DE MEMORIZAÇÃO:\n\n* PRESERVE O EMOJI ORIGINAL, QUANDO HOUVER;\n* SE O ORIGINAL NÃO TROUXER EMOJI, É PERMITIDO INSERIR UM ÚNICO EMOJI TEMÁTICO E COERENTE APÓS ♦️;\n* USE O MESMO EMOJI PARA O MESMO GRANDE EIXO;\n* EVITE EMOJIS ALEATÓRIOS OU MERAMENTE DECORATIVOS;\n* NÃO ESPALHE NOVOS EMOJIS PELO CORPO DO TEXTO.\n\nEM CASO DE CONFLITO, OBSERVE ESTA ORDEM:\n\n1. FIDELIDADE JURÍDICA;\n2. COBERTURA DOS ELEMENTOS PRESENTES NAS FONTES;\n3. COMPLETUDE DO CONTEÚDO RELEVANTE;\n4. ORGANIZAÇÃO DIDÁTICA;\n5. CONCISÃO;\n6. ESTÉTICA.\n\n## REVISÃO INTERNA EM DUAS PASSAGENS\n\nPRIMEIRA PASSAGEM — COBERTURA E PROFUNDIDADE:\n\nCOMPARE INTERNAMENTE O MAPA COM O INVENTÁRIO INICIAL E VERIFIQUE:\n\n1. ALGUM INSTITUTO RELEVANTE FICOU APENAS MENCIONADO?\n2. ALGUMA REGRA PERDEU SUJEITO, OBJETO, CONDIÇÃO, PROCEDIMENTO OU CONSEQUÊNCIA?\n3. ALGUMA EXCEÇÃO, VEDAÇÃO, COMPETÊNCIA, PRAZO OU DISTINÇÃO FOI OMITIDA?\n4. ALGUMA INFORMAÇÃO PRESENTE NA FONTE FOI SUBSTITUÍDA POR EXPRESSÃO GENÉRICA?\n\nSE HOUVER OMISSÃO, APROFUNDE O BLOCO USANDO SOMENTE O CONTEÚDO DAS FONTES.\n\nSEGUNDA PASSAGEM — DIDÁTICA E AGRUPAMENTO:\n\nVERIFIQUE:\n\n1. ALGUM GRANDE EIXO FOI FRAGMENTADO EM TÍTULOS DESNECESSÁRIOS?\n2. BLOCOS RELACIONADOS PODEM SER REUNIDOS SEM PERDA DE CLAREZA?\n3. A ORDEM PERMITE COMPREENDER PRIMEIRO A REGRA E DEPOIS SEUS LIMITES E EXCEÇÕES?\n4. O LEITOR CONSEGUE RECORDAR O CONTEÚDO SEM CONSULTAR IMEDIATAMENTE A FONTE?\n\nSE HOUVER FRAGMENTAÇÃO, REORGANIZE E AGRUPE SEM EXCLUIR CONTEÚDO RELEVANTE.\n\n## FORMATO OBRIGATÓRIO\n\n♦️ [EMOJI ORIGINAL OU TEMÁTICO, SE NECESSÁRIO] [NUMERAÇÃO]. [PALAVRA-NÚCLEO EM MAIÚSCULAS]\n\n▶️📚 [INSTITUTO]. [ASSUNTO OU RECORTE]:\n\n1️⃣ **[INSTITUTO/PALAVRA-NÚCLEO]:** [RELAÇÃO CURTA]\n\n2️⃣ **[ELEMENTO]:** [CONDIÇÃO OU CONSEQUÊNCIA CURTA]\n\n3️⃣ **[REQUISITO/PRAZO/COMPETÊNCIA]:** [INFORMAÇÃO ESSENCIAL]\n\n✅ [RESULTADO, REGRA OU CONSEQUÊNCIA AUTOSSUFICIENTE]\n\n✳️ [EXCEÇÃO, RESSALVA, DIFERENÇA OU PEGADINHA]\n\n📌 PROVA: [FRASE CURTA, SE ÚTIL]\n\nUSE SOMENTE AS CAMADAS NECESSÁRIAS.\n\n## HIERARQUIA E NUMERAÇÃO\n\n1️⃣ INSTITUTO PRINCIPAL.\n\n2️⃣ ELEMENTO DEPENDENTE.\n\n3️⃣ CONDIÇÃO, REQUISITO, PRAZO, SUJEITO, COMPETÊNCIA OU PROCEDIMENTO.\n\n4️⃣ E 5️⃣ SOMENTE QUANDO INDISPENSÁVEIS.\n\n✅ RESULTADO, ÚLTIMA CAMADA OU CONSEQUÊNCIA.\n\n✳️ EXCEÇÃO, DISTINÇÃO, ORDEM, PEGADINHA OU RESSALVA.\n\n📌 PROVA SOMENTE QUANDO AJUDAR NA REVISÃO.\n\nUSE PREFERENCIALMENTE ATÉ TRÊS NÍVEIS: 1️⃣, 2️⃣ E ✅.\n\nUSE 3️⃣, 4️⃣ OU 5️⃣ QUANDO NECESSÁRIOS PARA PRESERVAR PROFUNDIDADE E CLAREZA.\n\nUSE INDENTAÇÃO PROGRESSIVA REAL.\n\nPADRONIZE A NUMERAÇÃO DOS TÍTULOS ♦️, PRESERVANDO A ORDEM E EVITANDO SUBDIVISÕES ARTIFICIAIS:\n\n1.;\n2.;\n3.;\n4.;\nETC.\n\nUSE NUMERAÇÃO INTEIRA COMO FORMA PREFERENCIAL DOS TÍTULOS ♦️.\n\nUSE SUBNUMERAÇÃO 1.1., 1.2., 2.1. ETC. SOMENTE DE FORMA EXCEPCIONAL, QUANDO O SUBEIXO FOR JURIDICAMENTE AUTÔNOMO E EXIGIR DESENVOLVIMENTO PRÓPRIO.\n\nESPÉCIES, REGIMES ESPECIAIS, PRAZOS ESPECIAIS, EXCEÇÕES E DESDOBRAMENTOS NORMALMENTE DEVEM SER DESENVOLVIDOS COMO BLOCOS ▶️📚 DENTRO DO EIXO PRINCIPAL.\n\nA PROFUNDIDADE DEVE OCORRER DENTRO DOS BLOCOS, E NÃO PELA MULTIPLICAÇÃO DE TÍTULOS ♦️.\n\nNÃO TRANSFORME TODO ASSUNTO DEPENDENTE, COMPLEMENTAR OU INTERNAMENTE RELACIONADO EM TÍTULO ♦️ SUBNUMERADO.\n\nNÃO TRANSFORME TODO ASSUNTO EM NOVO EIXO PRINCIPAL.\n\nCORRIJA SALTOS, DUPLICIDADES OU NUMERAÇÃO INCOERENTE, SEM ALTERAR A ORDEM TEMÁTICA.\n\nNÃO NUMERE ARTIFICIALMENTE TODOS OS BLOCOS ▶️.\n\n## TÍTULOS E SUBTÓPICOS\n\nPRESERVE OS EMOJIS QUE ANTECEDEM OS TÍTULOS.\n\nSE O ORIGINAL NÃO TROUXER EMOJI, É PERMITIDO INSERIR UM ÚNICO EMOJI TEMÁTICO APÓS ♦️ PARA FUNCIONAR COMO ÂNCORA VISUAL, DESDE QUE SEJA COERENTE, ESTÁVEL E NÃO MERAMENTE DECORATIVO.\n\nREDUZA O TÍTULO À PALAVRA-NÚCLEO, SEM PERDER O CONTEXTO.\n\nSE A PALAVRA ISOLADA FICAR GENÉRICA, MANTENHA O RECORTE APÓS DOIS-PONTOS.\n\nQUANDO O TEMA PRINCIPAL FOR IDENTIFICÁVEL, REPITA-O NOS SUBTÓPICOS QUANDO NECESSÁRIO PARA PRESERVAR O CONTEXTO.\n\nNÃO ABRA LINHA SEPARADA APENAS PARA:\n\n* CONCEITO;\n* REGRA;\n* REQUISITOS;\n* NATUREZA;\n* EFEITO;\n* CARACTERÍSTICAS.\n\nUSE:\n\n▶️📚 [INSTITUTO]. [ASSUNTO]:\n\nOU:\n\n▶️📚 [INSTITUTO]. [ASSUNTO] — [NATUREZA]:\n\nNÃO ESCREVA “TÓPICO”, “SUBTÓPICO”, “CAMADA” OU “RESUMO”.\n\n## AMBIGUIDADE JURÍDICA\n\nNÃO USE CONCLUSÕES SOLTAS, COMO:\n\n“NÃO CABE”;\n“APLICA”;\n“NÃO APLICA”;\n“POSSÍVEL”;\n“IMPOSSÍVEL”;\n“VÁLIDO”;\n“INVÁLIDO”;\n“CONFIGURA”;\n“NÃO CONFIGURA”.\n\nTODA CONCLUSÃO DEVE INDICAR:\n\n* QUAL INSTITUTO;\n* QUAL ATO, MEDIDA, REGRA OU EFEITO;\n* QUAL ALCANCE;\n* QUAL SUJEITO OU ÓRGÃO;\n* QUAL CONDIÇÃO;\n* QUAL CONSEQUÊNCIA;\n* QUAL EXCEÇÃO, SE HOUVER.\n\nANTES DE FINALIZAR CADA ✅, CONFIRA:\n\n* NÃO CABE O QUÊ?\n* APLICA A QUÊ?\n* QUEM PODE?\n* QUAL FINALIDADE?\n* QUAL CONDIÇÃO?\n* QUAL CONSEQUÊNCIA?\n* QUAL EXCEÇÃO?\n\nA LINHA ✅ DEVE SER AUTOSSUFICIENTE.\n\nSE HOUVER REGRA GERAL E EXCEÇÃO, SEPARE:\n\n✅ REGRA: [REGRA GERAL AUTOSSUFICIENTE]\n\n✳️ EXCEÇÃO: [HIPÓTESE EXCEPCIONAL]\n\n✳️ PEGADINHA: [DIFERENÇA COBRÁVEL]\n\n## EXEMPLOS E CASOS CONCRETOS\n\nNÃO TRANSFORME EXEMPLOS DO AUTOR OU CASOS CONCRETOS EM CONTEÚDO CENTRAL.\n\nSÓ PRESERVE UMA SITUAÇÃO FÁTICA QUANDO FOR INDISPENSÁVEL PARA COMPREENDER OU DELIMITAR A REGRA.\n\nNESSE CASO, USE PALAVRAS-CHAVE CURTAS, SEM NARRATIVA.\n\nNÃO ACRESCENTE EXEMPLOS EXTERNOS.\n\n## REDAÇÃO E SIGLAS\n\nUSE FRASES SINTÉTICAS, MAS JURIDICAMENTE COMPLETAS.\n\nNÃO REDUZA A REDAÇÃO A PALAVRAS SOLTAS OU A EXPRESSÕES TELEGRÁFICAS QUE APAGUEM A RELAÇÃO JURÍDICA.\n\nCADA LINHA DEVE INFORMAR, QUANDO PRESENTES NA FONTE: QUEM; PODE OU DEVE FAZER O QUÊ; EM QUAL SITUAÇÃO; SOB QUAIS REQUISITOS; COM QUAL FINALIDADE; E PRODUZINDO QUAL CONSEQUÊNCIA.\n\nNÃO EXISTE LIMITE RÍGIDO DE PALAVRAS POR LINHA.\n\nA LINHA PODE SER MAIOR QUANDO ISSO FOR NECESSÁRIO PARA PRESERVAR O RACIOCÍNIO, A CONDIÇÃO, A EXCEÇÃO OU A CONSEQUÊNCIA JURÍDICA.\n\nÉ PERMITIDO USAR DOIS-PONTOS PARA PRESERVAR O SENTIDO.\n\nNÃO ESCREVA PARÁGRAFOS LONGOS.\n\nNÃO REPITA A MESMA IDEIA.\n\nNÃO USE PALAVRA GENÉRICA QUE APAGUE O SENTIDO.\n\nUSE NEGRITO SOMENTE ATÉ OS DOIS-PONTOS, QUANDO HOUVER.\n\nNÃO USE SIGLAS SOLTAS.\n\nNA PRIMEIRA OCORRÊNCIA, ESCREVA O NOME COMPLETO E A SIGLA ENTRE PARÊNTESES.\n\nDEPOIS, A SIGLA PODE SER USADA.\n\n## CONTROLE FINAL DE FIDELIDADE, AMBIGUIDADE E COBERTURA\n\nANTES DE FINALIZAR, CONFIRA:\n\n1. O CONTEÚDO VEIO SOMENTE DAS FONTES RESUMO/AULA?\n2. FOI INSERIDO CONTEÚDO DE LEI, JURISPRUDÊNCIA OU PEÇA DE OUTRO MÓDULO?\n3. HÁ REGRA POSITIVA OU NEGATIVA?\n4. HÁ VEDAÇÃO, EXCEÇÃO OU RESSALVA?\n5. HÁ PRAZO, PROCEDIMENTO, COMPETÊNCIA OU LEGITIMIDADE?\n6. ALGUMA CONCLUSÃO FICOU SEM OBJETO?\n7. CADA ✅ É AUTOSSUFICIENTE?\n8. ALGUMA REGRA FOI INVERTIDA?\n9. ALGUMA SIGLA FICOU SOLTA?\n10. O TÍTULO PRESERVA O CONTEXTO?\n11. EXISTE REPETIÇÃO DESNECESSÁRIA?\n12. A REDUÇÃO RETIROU ALGUM ELEMENTO ESSENCIAL?\n13. HÁ TÍTULOS AUTÔNOMOS QUE PODERIAM SER SUBTÓPICOS?\n14. HÁ MUITOS BLOCOS SEGUIDOS SOBRE O MESMO INSTITUTO?\n15. OS TÍTULOS PRINCIPAIS REPRESENTAM GRANDES EIXOS?\n16. A SUBNUMERAÇÃO MOSTRA A RELAÇÃO ENTRE OS ASSUNTOS?\n17. OS EMOJIS DOS TÍTULOS AJUDAM A LOCALIZAR OS TEMAS?\n18. O MATERIAL PODE SER REVISADO VISUALMENTE SEM LEITURA INTEGRAL?\n19. O RESULTADO SE PARECE COM MAPA DE ESTUDO, E NÃO COM APOSTILA FRAGMENTADA?\n20. A COMPLETUDE FOI PRESERVADA APÓS O AGRUPAMENTO?\n\nSE HOUVER RISCO DE INVERSÃO, REESCREVA.\n\nSE O CONTEÚDO ESTIVER CORRETO, MAS EXCESSIVAMENTE FRAGMENTADO, FAÇA UMA REORGANIZAÇÃO DIDÁTICA FINAL SEM EXCLUIR INFORMAÇÃO RELEVANTE.\n\nNUNCA TRANSFORME:\n\n* REGRA NEGATIVA EM POSITIVA;\n* POSSIBILIDADE EM IMPOSSIBILIDADE;\n* EXEMPLO DO AUTOR EM REGRA GERAL;\n* ARGUMENTO ISOLADO EM CONCLUSÃO;\n* VEDAÇÃO DE FINALIDADE EM VEDAÇÃO DO INSTITUTO INTEIRO;\n* EXCEÇÃO EM REGRA GERAL.\n\n## PROIBIÇÕES\n\nNÃO CRIE COMO TÍTULOS AUTÔNOMOS:\n\n* RESUMO;\n* REGRA;\n* FATO ESSENCIAL;\n* CONDIÇÕES;\n* FUNDAMENTOS;\n* CONSEQUÊNCIA;\n* IDENTIFICAÇÃO;\n* FONTE.\n\nÉ PERMITIDO USAR “✅ REGRA:”, “✳️ EXCEÇÃO:” E “✳️ PEGADINHA:” DENTRO DO BLOCO TEMÁTICO.\n\nNÃO INFORME:\n\n* NOME DO ARQUIVO-FONTE;\n* NOMES DE PROFESSORES;\n* NOME DO CURSO;\n* NOME DA TURMA;\n* BANCA;\n* CONCURSO;\n* NOMES PRÓPRIOS DE CASOS CONCRETOS.\n\nNÃO INCLUA:\n\n* DOUTRINA EXTERNA;\n* JURISPRUDÊNCIA NÃO FORNECIDA;\n* LEGISLAÇÃO NÃO FORNECIDA;\n* EXEMPLOS EXTERNOS;\n* TABELAS.\n\n## ORGANIZAÇÃO\n\nPRESERVE A ORDEM TEMÁTICA DO ORIGINAL.\n\nPODE REORGANIZAR INTERNAMENTE APENAS PARA ELIMINAR REPETIÇÕES OU CORRIGIR HIERARQUIA, SEM ALTERAR O SENTIDO.\n\nNÃO REPITA A MESMA REGRA EM BLOCOS DIFERENTES.\n\nSE O ORIGINAL REPETIR UMA REGRA EM QUADRO, TABELA OU SÍNTESE FINAL, CONSOLIDE A INFORMAÇÃO NO BLOCO MAIS COMPLETO.\n\nNÃO REPRODUZA A TABELA.\n\n## WORD DO MÓDULO\n\nGERE UM ARQUIVO .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO RESUMO/AULA.\n\nNÃO CONSOLIDE COM LEI, JURISPRUDÊNCIA OU PEÇA.\n\nUSE O WORD-MODELO ANEXADO COMO PADRÃO DE FORMATAÇÃO.\n\nPRESERVE:\n\n* FONTE;\n* TAMANHO;\n* ESPAÇAMENTO;\n* RECUOS;\n* RESPIRO VISUAL;\n* NEGRITOS;\n* ESTILO DOS TÍTULOS E SUBTÓPICOS;\n* RODAPÉ COM NUMERAÇÃO.\n\nSE NÃO HOUVER MODELO, USE:\n\n* A4;\n* ARIAL 11;\n* MARGENS DE 2 CM;\n* ESPAÇAMENTO SIMPLES;\n* ALINHAMENTO À ESQUERDA;\n* INDENTAÇÃO PROGRESSIVA REAL;\n* SEM TABELAS;\n* SEM CABEÇALHO;\n* RODAPÉ APENAS COM NUMERAÇÃO.\n\nINSIRA NUMERAÇÃO NO RODAPÉ:\n\nFIM DA PÁGINA;\nCENTRALIZADA;\nEM NEGRITO;\nFORMATO “1 DE 20”.\n\nNOME DO ARQUIVO:\n\nMAPA_HIERARQUICO_RESUMO_AULA_[FILTRO].docx\n\nENTREGUE O WORD COMPLETO E O LINK PARA DOWNLOAD.\n\nNÃO ENTREGUE APENAS O CONTEÚDO NO CHAT, SALVO PEDIDO EXPRESSO.";
const FACTORY_RESUMO_AULA_PROMPT = FACTORY_RESUMO_AULA_PROMPT_SEGMENT;
const FACTORY_RESUMO_AULA_MIGRATION_ID = "resumoAulaDidaticaProfundidadeV2";
const FACTORY_RESUMO_AULA_DUPLICATION_MIGRATION_ID = "resumoAulaRemoverDuplicacaoV3";
const FACTORY_RESUMO_AULA_ESTRUTURA_DIDATICA_MIGRATION_ID = "resumoAulaEstruturaDidaticaV4";
const FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID = "factoryPecaRegimesEspeciaisV2";
const FACTORY_PECA_PREVIOUS_PROMPT = `## ESCOPO DO MÓDULO PEÇA

USE COMO FONTE PRINCIPAL AS FONTES CLASSIFICADAS COMO PEÇA NA TRIAGEM.

É PERMITIDO USAR, DE FORMA COMPLEMENTAR, FONTES APROVADAS CLASSIFICADAS COMO LEI, JURISPRUDÊNCIA, RESUMO/AULA OU ATUALIZAÇÃO/COMPLEMENTO, DESDE QUE HAJA VÍNCULO DIRETO E IDENTIFICÁVEL COM A PEÇA ATUAL.

NÃO MISTURE INDISCRIMINADAMENTE FONTES DE OUTROS MÓDULOS.

A FONTE COMPLEMENTAR SOMENTE PODE SER UTILIZADA PARA ESPECIFICIDADE TEMÁTICA DIRETAMENTE RELACIONADA À PEÇA, COMO LEGISLAÇÃO ESPECIAL, PRAZO ESPECIAL, REQUISITO ESPECÍFICO, JURISPRUDÊNCIA ESSENCIAL, COMPETÊNCIA, LEGITIMIDADE, PEDIDO OU EFEITO JURÍDICO PRÓPRIO.

NÃO PESQUISE, NÃO ATUALIZE, NÃO CORRIJA E NÃO COMPLETE O CONTEÚDO POR CONHECIMENTO EXTERNO.

USE SOMENTE INFORMAÇÕES PRESENTES NAS FONTES APROVADAS E DISPONIBILIZADAS PARA O MÓDULO.

## OBJETIVO

GERE RESUMO DA PEÇA, NÃO PEÇA PRONTA E NÃO AULA CORRIDA.

EXTRAIA E ORGANIZE, QUANDO PRESENTES NAS FONTES APROVADAS:

* CABIMENTO;
* REQUISITOS;
* FUNDAMENTOS;
* LEGITIMIDADE;
* COMPETÊNCIA;
* ESTRUTURA FORMAL;
* PEDIDOS;
* DETERMINAÇÕES;
* CUIDADOS DE REDAÇÃO;
* ESPECIFICIDADES TEMÁTICAS DIRETAMENTE RELACIONADAS À PEÇA.

## VERIFICAÇÃO OBRIGATÓRIA DE ESPECIFICIDADES TEMÁTICAS

Após elaborar a estrutura principal da peça, realize uma verificação obrigatória das fontes aprovadas para identificar especificidades jurídicas diretamente relacionadas ao tema.

Não se limite ao modelo geral da medida ou à estrutura formal da peça.

Verifique a existência de:

* leis especiais;
* regimes jurídicos específicos;
* prazos diferenciados;
* requisitos adicionais;
* exceções;
* hipóteses especiais de cabimento;
* competências específicas;
* legitimados próprios;
* pedidos especiais ou subsidiários;
* efeitos jurídicos particulares;
* diferenças conforme o crime investigado;
* entendimentos jurisprudenciais indispensáveis.

Quando houver conteúdo relevante, crie obrigatoriamente o tópico:

ESPECIFICIDADES TEMÁTICAS DA PEÇA

Nesse tópico, apresente de forma hierarquizada apenas as particularidades que alterem, complementem ou diferenciem a elaboração da peça.

Exemplos de temas que devem ser verificados quando relacionados à peça:

* crimes hediondos ou equiparados;
* organizações criminosas;
* tráfico de drogas;
* violência doméstica e familiar;
* crimes contra crianças, adolescentes, idosos ou vulneráveis;
* competência federal, eleitoral ou militar;
* prerrogativa de função;
* legislação especial aplicável;
* prazos especiais;
* requisitos reforçados;
* pedidos complementares;
* jurisprudência essencial.

Não crie conteúdo com base em conhecimento externo não fornecido.

Não invente especificidades.

Utilize somente informações presentes nas fontes aprovadas e disponibilizadas para o módulo.

Se houver indício de especificidade relevante, mas as fontes aprovadas forem insuficientes, registrar ao final:

⚠️ LACUNA TEMÁTICA DETECTADA: há possível especificidade jurídica relacionada a [tema], mas as fontes aprovadas não fornecem conteúdo suficiente para sua inclusão segura.

Não criar automaticamente uma nova aula ou meta de estudo.

Somente sugerir conteúdo autônomo quando a especificidade:

1. for extensa demais para integrar o resumo da peça;
2. constituir tema autônomo do edital;
3. for aplicável a várias peças;
4. exigir estudo aprofundado próprio;
5. não estiver suficientemente desenvolvida nas fontes aprovadas.

## FIDELIDADE ÀS FONTES

PRESERVE INTEGRALMENTE AS REGRAS ATUAIS DE FIDELIDADE ÀS FONTES.

NÃO INVENTE REQUISITO, PRAZO, COMPETÊNCIA, LEGITIMADO, PEDIDO, EFEITO, EXCEÇÃO, JURISPRUDÊNCIA OU FUNDAMENTO AUSENTE DAS FONTES APROVADAS.

SE A FONTE NECESSÁRIA NÃO ESTIVER ANEXADA OU DISPONÍVEL, NÃO EXECUTE O MÓDULO.

## ENTREGA

GERE UM ARQUIVO .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO PEÇA.

NÃO GERE RESUMO/AULA, LEI, JURISPRUDÊNCIA OU CONSOLIDAÇÃO FINAL.

NÃO CRIE NOVA AULA, NOVA META OU NOVO MÓDULO DE ESTUDO PARA CADA ESPECIFICIDADE PONTUAL.

NOME DO ARQUIVO:

RESUMO_PECA_[FILTRO].docx`;
const FACTORY_PECA_PROMPT = `## ESCOPO DO MÓDULO PEÇA

USE COMO FONTE PRINCIPAL AS FONTES CLASSIFICADAS COMO PEÇA NA TRIAGEM.

É PERMITIDO USAR, DE FORMA COMPLEMENTAR, FONTES APROVADAS CLASSIFICADAS COMO LEI, JURISPRUDÊNCIA, RESUMO/AULA OU ATUALIZAÇÃO/COMPLEMENTO, DESDE QUE HAJA VÍNCULO DIRETO E IDENTIFICÁVEL COM A PEÇA ATUAL.

NÃO MISTURE INDISCRIMINADAMENTE FONTES DE OUTROS MÓDULOS.

A FONTE COMPLEMENTAR SOMENTE PODE SER UTILIZADA PARA ESPECIFICIDADE TEMÁTICA DIRETAMENTE RELACIONADA À PEÇA, COMO LEGISLAÇÃO ESPECIAL, PRAZO ESPECIAL, REQUISITO ESPECÍFICO, JURISPRUDÊNCIA ESSENCIAL, COMPETÊNCIA, LEGITIMIDADE, PEDIDO OU EFEITO JURÍDICO PRÓPRIO.

NÃO PESQUISE, NÃO ATUALIZE, NÃO CORRIJA E NÃO COMPLETE O CONTEÚDO POR CONHECIMENTO EXTERNO.

USE SOMENTE INFORMAÇÕES PRESENTES NAS FONTES APROVADAS E DISPONIBILIZADAS PARA O MÓDULO.

## OBJETIVO

GERE RESUMO DA PEÇA, NÃO PEÇA PRONTA E NÃO AULA CORRIDA.

EXTRAIA E ORGANIZE, QUANDO PRESENTES NAS FONTES APROVADAS:

* CABIMENTO;
* REQUISITOS;
* FUNDAMENTOS;
* LEGITIMIDADE;
* COMPETÊNCIA;
* ESTRUTURA FORMAL;
* PEDIDOS;
* DETERMINAÇÕES;
* CUIDADOS DE REDAÇÃO;
* ESPECIFICIDADES TEMÁTICAS DIRETAMENTE RELACIONADAS À PEÇA.

## INVENTÁRIO INTERNO OBRIGATÓRIO DE ESPECIFICIDADES TEMÁTICAS

Antes de redigir o resumo da peça, realize internamente um inventário obrigatório das especificidades temáticas presentes nas fontes aprovadas e diretamente relacionadas à peça.

Esse inventário é etapa interna de controle e não deve aparecer como relatório no Word final.

Não se limite ao modelo geral da medida ou à estrutura formal da peça.

Verifique especialmente:

* leis especiais;
* regimes jurídicos específicos;
* prazos diferenciados;
* requisitos adicionais;
* requisitos de prorrogação;
* exceções;
* hipóteses especiais de cabimento;
* competência especial;
* legitimidade própria;
* pedidos especiais ou subsidiários;
* efeitos jurídicos particulares;
* sigilo especial;
* sujeitos vulneráveis;
* organizações criminosas;
* tráfico de drogas;
* violência doméstica;
* crimes hediondos ou equiparados;
* competência federal, eleitoral ou militar;
* prerrogativa de função;
* jurisprudência indispensável.

Quando houver conteúdo relevante, crie obrigatoriamente o tópico:

ESPECIFICIDADES TEMÁTICAS DA PEÇA

Nesse tópico, apresente de forma hierarquizada apenas as particularidades que alterem, complementem ou diferenciem a elaboração da peça.

Exemplos de temas que devem ser verificados quando relacionados à peça:

* crimes hediondos ou equiparados;
* organizações criminosas;
* tráfico de drogas;
* violência doméstica e familiar;
* crimes contra crianças, adolescentes, idosos ou vulneráveis;
* competência federal, eleitoral ou militar;
* prerrogativa de função;
* legislação especial aplicável;
* prazos especiais;
* requisitos reforçados;
* pedidos complementares;
* jurisprudência essencial.



## CENTRALIZAÇÃO OBRIGATÓRIA DOS REGIMES ESPECIAIS

Quando uma especificidade temática for identificada, crie dentro de ESPECIFICIDADES TEMÁTICAS DA PEÇA um bloco próprio para cada regime especial relevante.

Formato preferencial:

▶️📚 REGIME ESPECIAL: [NOME DO REGIME]

Desenvolva, somente quando presentes nas fontes aprovadas:

1. campo de incidência;
2. relação com o cabimento da peça;
3. prazo especial;
4. possibilidade e requisitos de prorrogação;
5. requisitos adicionais;
6. reflexos na fundamentação;
7. reflexos nos pedidos;
8. competência ou legitimidade específica;
9. exceções e limites;
10. ponto relevante para prova.

Não crie campos vazios.

Não invente elementos que não estejam nas fontes.

A simples menção ao nome do regime especial não conta como desenvolvimento.

A simples repetição do prazo em diferentes partes do documento também não conta como desenvolvimento.

Quando houver conteúdo suficiente, o bloco especial deve permitir compreender:

* qual é o regime;
* quando ele interfere na peça;
* o que muda na fundamentação;
* o que muda no pedido;
* quais limites ou lacunas foram identificados.

Quando as fontes trouxerem apenas uma informação isolada, como um prazo, apresente somente essa informação e registre a insuficiência no bloco final de lacunas.

## CONTROLE DE REPETIÇÕES

O regime especial deve ser desenvolvido integralmente apenas uma vez, no tópico ESPECIFICIDADES TEMÁTICAS DA PEÇA.

Nas demais partes da peça, como CABIMENTO, FUNDAMENTOS e PEDIDOS, faça somente referência curta e funcional ao regime.

Exemplos de referência curta:

✅ Verificar a incidência do regime especial desenvolvido em ESPECIFICIDADES TEMÁTICAS.

✅ Adequar o prazo e os pedidos ao regime especial aplicável, conforme o bloco específico.

Não repita em três ou quatro locais a mesma explicação sobre prazo, requisitos ou limitações.

Preserve a informação necessária em cada parte da estrutura, mas evite duplicação textual.

## ORDEM DAS ESPECIFICIDADES TEMÁTICAS

Dentro do tópico ESPECIFICIDADES TEMÁTICAS DA PEÇA, utilize esta ordem:

1. regimes legais especiais diretamente aplicáveis;
2. prazos e requisitos especiais;
3. competência, legitimidade e pedidos próprios;
4. jurisprudência essencial;
5. distinções em relação a outras peças ou medidas;
6. lacunas das fontes.

A comparação com outra medida não pode substituir o desenvolvimento do regime especial principal.

Quando houver regime especial e distinção comparativa, desenvolva primeiro o regime especial e somente depois a distinção em relação a outra peça ou medida.

## CONTROLE DE AMBIGUIDADE JURÍDICA

Não utilize formulações amplas ou disjuntivas que possam sugerir hipóteses jurídicas independentes quando as fontes não explicarem essa relação.

Evite frases como “Cabe se o delito estiver no rol ou for hediondo ou equiparado”.

Essa formulação somente pode ser usada se a relação jurídica estiver expressamente e suficientemente desenvolvida nas fontes aprovadas.

Quando as fontes apenas mencionarem elementos isolados, redija de forma segura:

✅ Verificar o enquadramento jurídico do delito conforme as hipóteses expressamente desenvolvidas nas fontes aprovadas.

Toda conclusão deve indicar:

* o instituto;
* o alcance;
* a condição;
* o efeito;
* a exceção, quando existente.

## LACUNAS DAS FONTES APROVADAS

Não espalhe pelo conteúdo expressões como “segundo as fontes”, “as fontes indicam”, “as fontes exemplificam”, “dispositivo mencionado nas fontes” ou “regra geral indicada nas fontes”.

O conteúdo jurídico principal deve ser apresentado diretamente.

Reúna as insuficiências documentais em um único bloco final, usando este título somente quando necessário:

## LACUNAS DAS FONTES APROVADAS

Formato:

✳️ [Informação relevante não suficientemente desenvolvida].

Exemplos de lacunas, sem criar conteúdo jurídico fixo:

✳️ As fontes aprovadas não enumeram o rol legal aplicável.

✳️ As fontes aprovadas não desenvolvem os requisitos específicos da prorrogação.

✳️ As fontes aprovadas não esclarecem suficientemente a relação entre o regime geral e o regime especial.

Não repita a mesma lacuna em diferentes partes do documento.

## EXEMPLO DE ORGANIZAÇÃO SEM CONTEÚDO JURÍDICO FIXO

Se as fontes contiverem informações sobre um regime especial diretamente relacionado à peça, o resumo deve produzir estrutura semelhante a:

▶️📚 REGIME ESPECIAL: [NOME DO REGIME]

1️⃣ **Prazo especial:** [informação efetivamente presente na fonte].

2️⃣ **Prorrogação:** [informação efetivamente presente na fonte].

3️⃣ **Reflexo na fundamentação:** [informação efetivamente presente na fonte].

4️⃣ **Reflexo no pedido:** [informação efetivamente presente na fonte].

✳️ **Limites documentais:** [lacuna efetivamente identificada].

Se a única informação disponível for prazo especial, apresente somente o prazo, não invente requisitos, não presuma cabimento automático e registre a insuficiência das demais informações no bloco final de lacunas.

Depois do regime especial, poderá aparecer distinção em relação a outra medida somente quando a comparação estiver presente nas fontes e for útil à elaboração da peça.

Não crie conteúdo com base em conhecimento externo não fornecido.

Não invente especificidades.

Utilize somente informações presentes nas fontes aprovadas e disponibilizadas para o módulo.

Se houver indício de especificidade relevante, mas as fontes aprovadas forem insuficientes, registre a insuficiência somente no bloco final LACUNAS DAS FONTES APROVADAS.

Preserve o aviso de lacuna temática, quando necessário, dentro desse bloco final único, sem espalhar alertas pelo documento:

✳️ LACUNA TEMÁTICA DETECTADA: há possível especificidade jurídica relacionada a [tema], mas as fontes aprovadas não fornecem conteúdo suficiente para sua inclusão segura.

Não criar automaticamente uma nova aula ou meta de estudo.

Somente sugerir conteúdo autônomo quando a especificidade:

1. for extensa demais para integrar o resumo da peça;
2. constituir tema autônomo do edital;
3. for aplicável a várias peças;
4. exigir estudo aprofundado próprio;
5. não estiver suficientemente desenvolvida nas fontes aprovadas.

## FIDELIDADE ÀS FONTES

PRESERVE INTEGRALMENTE AS REGRAS ATUAIS DE FIDELIDADE ÀS FONTES.

NÃO INVENTE REQUISITO, PRAZO, COMPETÊNCIA, LEGITIMADO, PEDIDO, EFEITO, EXCEÇÃO, JURISPRUDÊNCIA OU FUNDAMENTO AUSENTE DAS FONTES APROVADAS.

SE A FONTE NECESSÁRIA NÃO ESTIVER ANEXADA OU DISPONÍVEL, NÃO EXECUTE O MÓDULO.

## ENTREGA

GERE UM ARQUIVO .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO PEÇA.

NÃO GERE RESUMO/AULA, LEI, JURISPRUDÊNCIA OU CONSOLIDAÇÃO FINAL.

NÃO CRIE NOVA AULA, NOVA META OU NOVO MÓDULO DE ESTUDO PARA CADA ESPECIFICIDADE PONTUAL.

NOME DO ARQUIVO:

RESUMO_PECA_[FILTRO].docx`;

const defaultFactoryPromptLibrary = { triagem: "", resumoAula: FACTORY_RESUMO_AULA_PROMPT, lei: "", jurisprudencia: "", peca: FACTORY_PECA_PROMPT, consolidacao: "" };
const OLD_LEI_RECORTE_PROMPT = [
  "RECORTE: se houver edital/programa/recorte, trabalhe somente os artigos e temas indicados.",
  "Se não houver, trabalhe a lei",
  "amplamente, priorizando todos os artigos juridicamente relevantes."
].join(" ");
const NEW_LEI_RECORTE_PROMPT = "RECORTE: trabalhe somente os artigos e temas expressamente indicados. Se o recorte não estiver cadastrado ou estiver impreciso, interrompa a geração e solicite confirmação. Somente trabalhe a lei integralmente quando houver autorização expressa do usuário.";


const FACTORY_LIBRARY_FALLBACK = "[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]";
const FACTORY_DOCX_EMOJI_FONT_INSTRUCTIONS = `## FONTES E EMOJIS NO WORD

- Usar a fonte prevista pelo módulo para o texto comum, normalmente Arial 11.
- Não aplicar Arial aos emojis.
- Manter emojis em trechos separados do texto comum.
- Aplicar Segoe UI Emoji aos trechos que contenham emojis.
- Preservar negrito, tamanho, recuo, espaçamento e alinhamento.
- Preservar os seletores Unicode necessários à apresentação colorida dos emojis.
- Aplicar a regra ao documento inteiro, inclusive títulos, subtítulos e rodapé.`;
const defaultState = { subjects: [], studies: [], edital: { pdf: null }, syllabusItems: [], schedulableSettings: {}, dailyGoals: [], questionLogs: [], smartReviews: [], simulados: [], planning: cloneData(defaultPlanning), settings: { defaultMockGoal: 92, timerPreferences: cloneData(defaultTimerPreferences) }, materials: [], questionBank: [], questionBankSessions: [], questionErrorNotebook: [], disciplineWeights: {}, monthlyGoals: {}, timerSession: null, factoryItems: [], factoryAgenda: [], factoryPromptLibrary: cloneData(defaultFactoryPromptLibrary) };
const TIMER_MOTIVATIONAL_HISTORY_KEY = "metasEstudoTimerMotivationalHistory";
const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 5000;
const TIMER_MOTIVATIONAL_MILESTONES = [10, 25, 40, 50, 65, 75, 90, 100];
const TIMER_MOTIVATIONAL_MESSAGES = {
  10: ["Vamos lá. O mais difícil era começar.", "Você já saiu do zero. Continue.", "O primeiro passo já ficou para trás.", "O ritmo está sendo construído agora.", "Não pense no caminho inteiro. Vença este momento.", "Você começou. Agora deixe a constância trabalhar.", "Mais uma sessão começou do jeito certo.", "O início já foi vencido. Continue presente."],
  25: ["Muito bem. É de pouco a pouco mesmo.", "Você já encontrou o ritmo. Mantenha.", "Cada minuto fortalece a sua constância.", "Você não precisa correr. Só não pare.", "O progresso está acontecendo, mesmo em silêncio.", "Continue firme. A disciplina já assumiu o controle.", "Um quarto do caminho já foi conquistado.", "Pequenos avanços também constroem grandes resultados."],
  40: ["Olhe o quanto você já avançou.", "Você já foi longe demais para parar agora.", "O esforço está começando a virar resultado.", "Continue. A parte mais difícil já perdeu força.", "Mais um pouco e metade estará vencida.", "Seu foco está construindo algo maior.", "Você está avançando melhor do que imagina.", "Permaneça presente. O progresso já é real."],
  50: ["Metade do caminho já foi vencida.", "Estamos forjando um vencedor.", "Você chegou até aqui pela sua disciplina.", "Respire, reorganize o foco e continue.", "Você não está começando. Já está avançado.", "A metade que falta é menor do que tudo que você já venceu.", "Meio caminho concluído. Continue construindo.", "Sua constância trouxe você até aqui."],
  65: ["Você não está sozinho. Continue firme.", "Seu esforço de agora protege o seu resultado futuro.", "É aqui que a constância faz diferença.", "Não solte o ritmo que você construiu.", "Cada minuto restante vale ainda mais agora.", "Você está transformando intenção em conquista.", "Continue. A sua disciplina está vencendo o cansaço.", "O caminho já está ficando menor."],
  75: ["Falta pouco. Continue presente.", "Três quartos do caminho já foram vencidos.", "Você está muito mais perto do fim do que do começo.", "Só mais um trecho. Permaneça firme.", "O cansaço passa, mas o avanço permanece.", "Agora é foco apenas no próximo minuto.", "Você já venceu a maior parte desta sessão.", "Continue. A linha de chegada já está próxima."],
  90: ["Último esforço. Você está quase lá.", "Não diminua agora. Falta muito pouco.", "Mais alguns minutos e esta etapa estará concluída.", "A vitória desta sessão já está à vista.", "Termine com a mesma firmeza com que começou.", "Aguente só mais um pouco. Está funcionando.", "A reta final chegou. Continue presente.", "Falta pouco para transformar esforço em missão cumprida."],
  100: ["Concluído. Mais uma etapa vencida por você.", "Missão cumprida. Sua constância venceu novamente.", "Você prometeu avançar e cumpriu.", "Mais uma sessão concluída. O resultado está sendo construído.", "Hoje você ficou um pouco mais preparado.", "Muito bem. Este tempo agora faz parte da sua conquista.", "Você terminou o que começou.", "Sessão concluída. Mais um passo na direção do seu objetivo."]
};
function readJSONStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[Metas Estudo] Dados corrompidos em ${key}.`, error);
    window.__METAS_STORAGE_ERROR__ = { key, message: error.message };
    return fallback;
  }
}
const state = { ...cloneData(defaultState), ...(readJSONStorage(STORAGE_KEY, {}) || {}) };
state.edital = { ...defaultState.edital, ...(state.edital || {}) };
state.syllabusItems ||= [];
state.schedulableSettings ||= {};
state.dailyGoals ||= [];
function normalizeGoalTimeFields(goal) {
  const hasStudyActual = goal.studyActualMinutes !== undefined && goal.studyActualMinutes !== null && goal.studyActualMinutes !== "";
  const hasQuestionActual = goal.questionActualMinutes !== undefined && goal.questionActualMinutes !== null && goal.questionActualMinutes !== "";
  const legacyActual = Number(goal.actualMinutes ?? goal.tempo_real_minutos) || 0;
  goal.studyActualMinutes = hasStudyActual ? Number(goal.studyActualMinutes) || 0 : legacyActual;
  goal.questionActualMinutes = hasQuestionActual ? Number(goal.questionActualMinutes) || 0 : 0;
  goal.actualMinutes = goal.studyActualMinutes + goal.questionActualMinutes;
  return goal;
}
state.dailyGoals.forEach((goal) => { goal.date ||= goal.data || todayISO(); goal.data ||= goal.date; goal.discipline ||= goal.disciplina || "Sem disciplina"; goal.subject ||= goal.assunto || "Assunto"; goal.type ||= goal.tipo || "Meta"; goal.minutes = Number(goal.minutes ?? goal.tempo_sugerido_minutos) || 0; normalizeGoalTimeFields(goal); goal.status ||= "Pendente"; });
state.questionLogs ||= []; state.questionBank ||= []; state.questionBankSessions ||= []; state.questionErrorNotebook ||= carregarCadernoErros();
state.smartReviews ||= [];
state.simulados ||= readJSONStorage(SIMULADOS_STORAGE_KEY, []);
state.materials ||= [];
state.questionBank ||= [];
state.questionBankSessions ||= [];
state.questionErrorNotebook = mergeCadernoErros(state.questionErrorNotebook, carregarCadernoErros());
state.disciplineWeights ||= {};
state.monthlyGoals ||= {};
state.planning = normalizePlanningState(state.planning);
state.settings ||= {};
state.settings.defaultMockGoal ||= 92;
state.settings.timerPreferences = normalizeTimerPreferences(state.settings.timerPreferences);
state.materials ||= [];
state.factoryItems ||= [];
state.factoryAgenda ||= [];
state.factoryPromptLibrary = migrateFactoryPromptLibraryLeiRecorte({ ...cloneData(defaultFactoryPromptLibrary), ...(state.factoryPromptLibrary || {}) });
let factoryCurrentFilter = "faca-agora";
let factoryOpenDetailId = "";
let lastFactoryTodayInfo = { goals: 0, matched: 0, matchModes: [] };
state.migrations ||= {};
let shouldSaveAfterFactoryPromptMigrations = migrateStateFactoryPromptLibraryResumoAulaDidatica(state);
shouldSaveAfterFactoryPromptMigrations = migrateStateFactoryPromptLibraryResumoAulaRemoverDuplicacao(state) || shouldSaveAfterFactoryPromptMigrations;
shouldSaveAfterFactoryPromptMigrations = migrateStateFactoryPromptLibraryResumoAulaEstruturaDidaticaV4(state) || shouldSaveAfterFactoryPromptMigrations;
shouldSaveAfterFactoryPromptMigrations = migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(state) || shouldSaveAfterFactoryPromptMigrations;
if (!state.migrations.leiRecortePromptV2 && state.factoryPromptLibrary?.lei?.includes(NEW_LEI_RECORTE_PROMPT)) {
  state.migrations.leiRecortePromptV2 = new Date().toISOString();
  shouldSaveAfterFactoryPromptMigrations = true;
}
if (shouldSaveAfterFactoryPromptMigrations) saveData();


function normalizeTimerPreferences(preferences = {}) {
  const stored = readJSONStorage(TIMER_PREFS_STORAGE_KEY, {});
  return { ...defaultTimerPreferences, ...stored, ...(preferences || {}) };
}
function saveTimerPreferences() {
  state.settings ||= {};
  state.settings.timerPreferences = normalizeTimerPreferences(state.settings.timerPreferences);
  localStorage.setItem(TIMER_PREFS_STORAGE_KEY, JSON.stringify(state.settings.timerPreferences));
  saveData();
  autoSyncAfterSave("timer-settings");
}

function cadernoErrosDebug(...args) { if (CADERNO_ERROS_DEBUG) console.debug("[Caderno de Erros]", ...args); }
function normalizarItemCadernoErros(item = {}) {
  const now = new Date().toISOString();
  return {
    id: String(item.id || item.questaoId || item.questionId || createId()),
    disciplina: String(item.disciplina || item.discipline || "Sem disciplina"),
    assunto: String(item.assunto || item.subject || "Sem assunto"),
    banca: String(item.banca || item.board || ""),
    cargo: String(item.cargo || item.role || ""),
    enunciado: String(item.enunciado || item.statement || item.texto || ""),
    respostaMarcada: String(item.respostaMarcada ?? item.respostaUsuario ?? item.marcado ?? ""),
    gabaritoCorreto: String(item.gabaritoCorreto ?? item.gabarito ?? ""),
    justificativa: String(item.justificativa || item.fundamento || item.observacoes || "Sem justificativa cadastrada"),
    motivo: String(item.motivo || item.motivoErro || "erro"),
    dataRegistro: item.dataRegistro || item.data || now,
    ultimaRevisao: item.ultimaRevisao || item.dataRegistro || now,
    quantidadeErros: Math.max(1, Number(item.quantidadeErros) || 1),
    status: ["pendente", "revisado", "dominado"].includes(item.status) ? item.status : "pendente"
  };
}
function mergeCadernoErros(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach((raw) => {
    const item = normalizarItemCadernoErros(raw);
    const existing = map.get(item.id);
    if (!existing) map.set(item.id, item);
    else map.set(item.id, { ...existing, ...item, quantidadeErros: Math.max(Number(existing.quantidadeErros) || 1, Number(item.quantidadeErros) || 1), status: item.status || existing.status });
  });
  return [...map.values()].sort((a,b) => String(b.dataRegistro).localeCompare(String(a.dataRegistro)));
}
function carregarCadernoErros() {
  const list = readJSONStorage(CADERNO_ERROS_STORAGE_KEY, []);
  const normalized = Array.isArray(list) ? mergeCadernoErros(list) : [];
  cadernoErrosDebug("carregado ao abrir", { chave: CADERNO_ERROS_STORAGE_KEY, itens: normalized });
  return normalized;
}
function salvarCadernoErros(items = state.questionErrorNotebook || []) {
  const normalized = mergeCadernoErros(Array.isArray(items) ? items : []);
  localStorage.setItem(CADERNO_ERROS_STORAGE_KEY, JSON.stringify(normalized));
  state.questionErrorNotebook = normalized;
  cadernoErrosDebug("salvo", { chave: CADERNO_ERROS_STORAGE_KEY, itens: normalized });
  return normalized;
}
function registrarNoCadernoErros(questao, respostaUsuario, motivo) {
  if (!questao?.id || !motivo) return null;
  const now = new Date().toISOString();
  const entry = normalizarItemCadernoErros({
    id: questao.id, disciplina: questao.disciplina, assunto: questao.assunto, banca: questao.banca, cargo: questao.cargo, enunciado: questao.enunciado,
    respostaMarcada: respostaUsuario || "", gabaritoCorreto: questao.gabarito || "", justificativa: qbExplanationText(questao), motivo, dataRegistro: now, ultimaRevisao: now, status: "pendente", quantidadeErros: 1
  });
  const list = carregarCadernoErros();
  const existing = list.find((item) => item.id === entry.id);
  if (existing) Object.assign(existing, entry, { quantidadeErros: (Number(existing.quantidadeErros) || 1) + 1, status: existing.status === "dominado" ? "revisado" : (existing.status || "pendente") });
  else list.unshift(entry);
  salvarCadernoErros(list);
  cadernoErrosDebug("questão salva", { chave: CADERNO_ERROS_STORAGE_KEY, objeto: entry });
  return entry;
}

function mergeCompatibleLocalStorageData() {
  const candidates = ["syllabusItems", "editalVerticalizado", "edital_verticalizado", "assuntosAgendaveis", "metasDoDia", "dailyGoals"];
  candidates.forEach((key) => {
    if (key === STORAGE_KEY) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : (parsed?.syllabusItems || parsed?.itens || parsed?.items || parsed?.assuntos);
      if ((key.toLowerCase().includes("meta") || parsed?.dailyGoals) && Array.isArray(items) && !state.dailyGoals.length) state.dailyGoals = items;
      else if (Array.isArray(items) && !state.syllabusItems.length) state.syllabusItems = items.map((item) => ({
        id: item.id || createId(),
        discipline: item.discipline || item.disciplina || "Sem disciplina",
        topic: item.topic || item.topico || item.eixo || "Geral",
        subject: item.subject || item.assunto || item.referencia_edital || "Assunto",
        subtopic: item.subtopic || item.subassunto || item.nivel || "",
        reference: item.reference || item.referencia_edital || "",
        priority: normalizeImportedPriority(item.priority || item.prioridade),
        weight: normalizeSubjectIncidence(item.weight ?? item.peso),
        status: normalizeImportedStatus(item.status),
        domain: normalizeImportedDomain(item.domain || item.dominio),
        notes: item.notes || item.observacoes || "",
        agendavel: item.agendavel,
        tipo_agendamento: item.tipo_agendamento,
        importMeta: item.importMeta || { agendavel: acceptsSchedulableValue(item.agendavel), tipo_agendamento: item.tipo_agendamento || "" }
      }));
    } catch (error) {
      console.warn(`[Metas do dia] Não foi possível ler a chave compatível ${key}.`, error);
    }
  });
}
let bulkDraft = [];
let importDraft = [];
let pendingBackupPayload = null;
let syllabusVisibleCount = 30;
let editingSyllabusId = null;
let lastTimeAction = null;

let floatingTimer = {
  goalId: null,
  kind: null,
  elapsedSeconds: 0,
  startedAt: null,
  paused: false,
  intervalId: null,
  completed: false,
  warnedFive: false,
  warnedOne: false,
  completionDismissed: false,
  displayedMotivationalMilestones: [],
  mode: "countdown"
};

function timerKindLabel(kind) { return kind === "questions" ? "Questões" : "Estudo"; }
function currentTimerSeconds() {
  if (!floatingTimer.goalId) return 0;
  const runningSeconds = floatingTimer.startedAt && !floatingTimer.paused ? Math.floor((Date.now() - floatingTimer.startedAt) / 1000) : 0;
  return floatingTimer.elapsedSeconds + runningSeconds;
}
function formatTimerSeconds(totalSeconds) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
function timerSavedMinutes(seconds) {
  if (seconds <= 0) return 0;
  const fullMinutes = Math.floor(seconds / 60);
  const rounded = fullMinutes + (seconds % 60 >= 30 ? 1 : 0);
  return Math.max(1, rounded);
}
function floatingTimerGoal() { return state.dailyGoals.find((goal) => goal.id === floatingTimer.goalId); }
function stopFloatingTimerInterval() {
  if (floatingTimer.intervalId) clearInterval(floatingTimer.intervalId);
  floatingTimer.intervalId = null;
}

function timerPlannedSeconds(goal = floatingTimerGoal()) { return floatingTimer.mode === "free" ? Math.max(0, Math.round((Number(floatingTimer.sessionGoalMinutes) || 0) * 60)) : Math.max(0, Math.round((Number(goal?.minutes) || 0) * 60)); }
function timerRemainingSeconds(goal = floatingTimerGoal()) { const planned = timerPlannedSeconds(goal); return planned ? Math.max(0, planned - currentTimerSeconds()) : 0; }
function timerProgressPercent(goal = floatingTimerGoal()) { const planned = timerPlannedSeconds(goal); return planned ? Math.min(100, Math.round((currentTimerSeconds() / planned) * 100)) : 0; }
function timerAlertMessage(goal = floatingTimerGoal()) {
  if (timerTestAlertUntil > Date.now()) return "🔔 Teste de alertas do cronômetro";
  if (!state.settings?.timerPreferences?.visualAlerts || !timerPlannedSeconds(goal)) return "";
  const remaining = timerRemainingSeconds(goal);
  if (remaining <= 0 || floatingTimer.completed) return "✅ Tempo concluído";
  if (remaining <= 60 || floatingTimer.warnedOne) return "🚨 Faltam 1 minuto";
  if (remaining <= 300 || floatingTimer.warnedFive) return "⏳ Faltam 5 minutos";
  return "";
}

let timerMotivationalToastTimeout = null;
function readTimerMotivationalHistory() {
  try { return JSON.parse(localStorage.getItem(TIMER_MOTIVATIONAL_HISTORY_KEY) || "{}"); } catch (error) { return {}; }
}
function writeTimerMotivationalHistory(history) {
  try { localStorage.setItem(TIMER_MOTIVATIONAL_HISTORY_KEY, JSON.stringify(history || {})); } catch (error) { console.warn("Falha ao salvar histórico motivacional do cronômetro", error); }
}
function chooseTimerMotivationalMessage(milestone) {
  const messages = Array.isArray(TIMER_MOTIVATIONAL_MESSAGES?.[milestone]) ? TIMER_MOTIVATIONAL_MESSAGES[milestone].filter(Boolean) : [];
  if (!messages.length) return "";
  const history = readTimerMotivationalHistory();
  const used = Array.isArray(history[milestone]) ? history[milestone].filter((phrase) => messages.includes(phrase)) : [];
  const available = messages.filter((phrase) => !used.includes(phrase));
  const pool = available.length ? available : messages;
  const phrase = pool[Math.floor(Math.random() * pool.length)] || "";
  history[milestone] = available.length ? [...used, phrase] : [phrase];
  writeTimerMotivationalHistory(history);
  return phrase;
}
function showTimerMotivationalToast(milestone, phrase = chooseTimerMotivationalMessage(milestone)) {
  if (!elements.timerMotivationalToast || !phrase) return;
  clearTimeout(timerMotivationalToastTimeout);
  elements.timerMotivationalToast.innerHTML = `<strong>${milestone}% CONCLUÍDO</strong><span>${phrase}</span>`;
  elements.timerMotivationalToast.hidden = false;
  elements.timerMotivationalToast.classList.add("visible");
  timerMotivationalToastTimeout = setTimeout(() => {
    elements.timerMotivationalToast.classList.remove("visible");
    timerMotivationalToastTimeout = setTimeout(() => { elements.timerMotivationalToast.hidden = true; }, 260);
  }, TIMER_MOTIVATIONAL_TOAST_DURATION_MS);
}
function checkTimerMotivationalProgress(goal = floatingTimerGoal()) {
  const planned = timerPlannedSeconds(goal);
  const supportedMode =
    floatingTimer.mode === "countdown" ||
    floatingTimer.mode === "free";

  if (!goal || !supportedMode || !planned) return;

  const progress = Math.min(
    100,
    (currentTimerSeconds() / planned) * 100
  );

  const shown = Array.isArray(
    floatingTimer.displayedMotivationalMilestones
  )
    ? floatingTimer.displayedMotivationalMilestones
    : [];

  const reachedMilestones = TIMER_MOTIVATIONAL_MILESTONES.filter(
    (milestone) => progress >= milestone
  );

  const pendingMilestones = reachedMilestones.filter(
    (milestone) => !shown.includes(milestone)
  );

  const milestone =
    pendingMilestones[pendingMilestones.length - 1];

  if (!milestone) return;

  floatingTimer.displayedMotivationalMilestones = [
    ...new Set([...shown, ...reachedMilestones])
  ];

  showTimerMotivationalToast(milestone);
  persistFloatingTimerSession();
}
let timerAudioContext = null;
let timerTestAlertUntil = 0;
let timerTestAlertReport = "";
let timerAlertTimeouts = [];
let timerAlertOscillators = [];
async function prepareTimerAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    timerAudioContext ||= new AudioCtx();
    if (timerAudioContext.state === "suspended") await timerAudioContext.resume();
    return timerAudioContext;
  } catch (error) {
    console.warn("Falha ao preparar áudio do cronômetro", error);
    return null;
  }
}
function timerAlertVolumeGain() {
  return ({ low: 0.65, medium: 1, high: 1.3 }[state.settings?.timerPreferences?.alertVolume]) || 1;
}
function timerAlertSoundPattern(type = "completed") {
  const volume = timerAlertVolumeGain();
  if (type === "five-minutes") return { sequences: 1, sequenceGap: 0, gain: 0.09 * volume, tones: [{ frequency: 520, offset: 0, duration: 0.18 }, { frequency: 620, offset: 0.22, duration: 0.18 }] };
  if (type === "one-minute") return { sequences: 1, sequenceGap: 0, gain: 0.14 * volume, tones: [{ frequency: 700, offset: 0, duration: 0.22 }, { frequency: 920, offset: 0.28, duration: 0.22 }, { frequency: 700, offset: 0.56, duration: 0.22 }] };
  return { sequences: 3, sequenceGap: 1.55, gain: 0.22 * volume, tones: [{ frequency: 880, offset: 0, duration: 0.34 }, { frequency: 1175, offset: 0.42, duration: 0.34 }, { frequency: 988, offset: 0.84, duration: 0.42 }] };
}
function silenceTimerAlert() {
  timerAlertTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  timerAlertTimeouts = [];
  timerAlertOscillators.forEach((osc) => { try { osc.stop(); } catch (error) {} });
  timerAlertOscillators = [];
}
async function playTimerBeep(type = "completed") {
  if (!state.settings?.timerPreferences?.sound) return false;
  try {
    silenceTimerAlert();
    const ctx = await prepareTimerAudioContext();
    if (!ctx || ctx.state !== "running") return false;
    const pattern = timerAlertSoundPattern(type === "test" ? "completed" : type);
    for (let sequence = 0; sequence < pattern.sequences; sequence += 1) {
      pattern.tones.forEach(({ frequency, offset, duration }) => {
        const start = ctx.currentTime + (sequence * pattern.sequenceGap) + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square"; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(Math.min(0.32, pattern.gain), start + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start + duration + 0.04);
        timerAlertOscillators.push(osc);
        timerAlertTimeouts.push(setTimeout(() => { timerAlertOscillators = timerAlertOscillators.filter((item) => item !== osc); }, Math.max(0, (start - ctx.currentTime + duration + 0.1) * 1000)));
      });
    }
    return true;
  } catch (error) { console.warn("Falha no som do cronômetro", error); return false; }
}
function timerAlertTitle(type) { return ({ "five-minutes": "Faltam 5 minutos", "one-minute": "Falta 1 minuto", completed: "Tempo de estudo concluído", test: "Teste de alertas do cronômetro" }[type]) || "Alerta do cronômetro"; }
async function sendTimerNotification(type, goal = floatingTimerGoal()) {
  if (!state.settings?.timerPreferences?.browserNotifications) return "desativada";
  if (!("Notification" in window)) return "não permitida";
  let permission = Notification.permission;
  if (type === "test" && permission === "default") {
    try { permission = await Notification.requestPermission(); } catch (error) { console.warn("Falha ao solicitar notificação do cronômetro", error); return "não permitida"; }
  }
  if (permission !== "granted") return "não permitida";
  try {
    const options = { body: `${goal?.discipline || "Meta"} — ${goal?.subject || "Assunto"}` };
    const serviceWorkerRegistration = navigator.serviceWorker?.ready ? await navigator.serviceWorker.ready : null;
    if (serviceWorkerRegistration?.showNotification) await serviceWorkerRegistration.showNotification(timerAlertTitle(type), options);
    else new Notification(timerAlertTitle(type), options);
    return "enviada";
  } catch (error) { console.warn("Falha na notificação do cronômetro", error); return "não permitida"; }
}
function vibrateTimerAlert(type) {
  if (!state.settings?.timerPreferences?.vibration) return "desativada";
  if (!navigator.vibrate) return "não suportada";
  try { navigator.vibrate(type === "five-minutes" ? [120] : type === "one-minute" ? [160, 80, 160] : [220, 100, 220]); return "solicitada"; } catch (error) { console.warn("Falha na vibração do cronômetro", error); return "não suportada"; }
}
async function notifyTimerAlert(type, goal = floatingTimerGoal()) {
  vibrateTimerAlert(type);
  await sendTimerNotification(type, goal);
}
async function triggerTimerAlert(type, goal = floatingTimerGoal()) {
  if (type === "five-minutes") floatingTimer.warnedFive = true;
  if (type === "one-minute") floatingTimer.warnedOne = true;
  if (type === "completed") floatingTimer.completed = true;
  if (type === "test") { timerTestAlertUntil = Date.now() + 8000; renderFloatingTimer(); }
  await playTimerBeep(type);
  await notifyTimerAlert(type, goal);
}
async function testTimerAlerts() {
  timerTestAlertUntil = Date.now() + 8000;
  timerTestAlertReport = "Alerta visual: funcionando\nSom: verificando...\nVibração: verificando...\nNotificação: verificando...";
  renderFloatingTimer();
  const sound = state.settings?.timerPreferences?.sound ? ((await playTimerBeep("test")) ? "reproduzido" : "bloqueado") : "desativado";
  const vibration = vibrateTimerAlert("test");
  const notification = await sendTimerNotification("test", floatingTimerGoal());
  timerTestAlertReport = `Alerta visual: funcionando\nSom: ${sound}\nVibração: ${vibration}\nNotificação: ${notification}`;
  renderFloatingTimer();
}
function checkFloatingTimerAlerts() {
  const goal = floatingTimerGoal();
  const planned = timerPlannedSeconds(goal);
  if (!goal || !planned || floatingTimer.completionDismissed) return;
  if (floatingTimer.mode === "free") {
    if (currentTimerSeconds() >= planned && !floatingTimer.completed) triggerTimerAlert("completed", goal);
    return;
  }
  if (floatingTimer.mode !== "countdown") return;
  const remaining = timerRemainingSeconds(goal);
  if (remaining <= 0) { if (!floatingTimer.completed) triggerTimerAlert("completed", goal); return; }
  if (remaining <= 60 && remaining > 0) { if (!floatingTimer.warnedOne) triggerTimerAlert("one-minute", goal); return; }
  if (remaining <= 300 && remaining > 60 && !floatingTimer.warnedFive) triggerTimerAlert("five-minutes", goal);
}
async function enableTimerNotifications(input) {
  if (!("Notification" in window)) { state.settings.timerPreferences.browserNotifications = false; if (input) input.checked = false; alert("Notificações do cronômetro não são suportadas neste navegador."); return false; }
  let permission = Notification.permission;
  try { permission = permission === "default" ? await Notification.requestPermission() : permission; } catch (error) { console.warn("Falha ao solicitar notificação do cronômetro", error); permission = "denied"; }
  const enabled = permission === "granted";
  state.settings.timerPreferences.browserNotifications = enabled;
  if (input) input.checked = enabled;
  alert(enabled ? "Notificações do cronômetro permitidas." : `Notificações do cronômetro ${permission === "denied" ? "negadas" : "não autorizadas"}.`);
  return enabled;
}

function renderFloatingTimer() {
  if (!elements.floatingTimer) return;
  const goal = floatingTimerGoal();
  const isActive = Boolean(goal && floatingTimer.goalId);
  elements.floatingTimer.hidden = !isActive;
  if (!isActive) return;
  elements.timerDiscipline.textContent = goal.discipline || "Sem disciplina";
  elements.timerSubject.textContent = goal.subject || "Assunto";
  elements.timerKind.textContent = `${floatingTimer.mode === "free" ? "Cronômetro livre" : "Contagem regressiva"} • ${timerKindLabel(floatingTimer.kind)}`;
  if (elements.timerMode) elements.timerMode.value = floatingTimer.mode || "countdown";
  const planned = timerPlannedSeconds(goal);
  const progress = timerProgressPercent(goal);
  elements.timerTime.textContent = floatingTimer.mode === "countdown" && planned ? formatTimerSeconds(timerRemainingSeconds(goal)) : formatTimerSeconds(currentTimerSeconds());
  elements.timerProgressBar.style.width = `${progress}%`;
  elements.timerProgressText.textContent = planned ? `${progress}% do tempo decorrido` : "Sem tempo planejado";
  checkFloatingTimerAlerts();
  checkTimerMotivationalProgress(goal);
  const alertMessage = timerAlertMessage(goal);
  elements.timerAlert.hidden = !alertMessage;
  elements.timerAlert.textContent = timerTestAlertReport && timerTestAlertUntil > Date.now() ? `${alertMessage}
${timerTestAlertReport}` : alertMessage;
  elements.timerAlert.className = `timer-alert ${timerTestAlertUntil > Date.now() || timerRemainingSeconds(goal) <= 60 || floatingTimer.completed ? "strong" : ""}`;
  elements.timerCompletion.hidden = !floatingTimer.completed || floatingTimer.completionDismissed;
  elements.timerPauseResume.textContent = floatingTimer.paused ? "Continuar" : "Pausar";
  elements.timerSettings?.querySelectorAll("input[data-timer-pref]").forEach((input) => { input.checked = Boolean(state.settings?.timerPreferences?.[input.dataset.timerPref]); });
  elements.timerSettings?.querySelectorAll("select[data-timer-pref]").forEach((select) => { select.value = state.settings?.timerPreferences?.[select.dataset.timerPref] || "medium"; });
}
function persistFloatingTimerSession() {
  if (!floatingTimer.goalId) { state.timerSession = null; saveData(); return; }
  state.timerSession = { ...floatingTimer, elapsedSeconds: currentTimerSeconds(), startedAt: floatingTimer.paused ? null : Date.now(), intervalId: null };
  saveData();
}
function restoreFloatingTimerSession() {
  const saved = state.timerSession;
  if (!saved?.goalId || !state.dailyGoals.some((g) => g.id === saved.goalId)) return;
  const choice = prompt("Havia uma sessão em andamento. Deseja continuar, salvar ou descartar?", "continuar");
  floatingTimer = { ...saved, intervalId: null, startedAt: saved.paused ? null : Date.now() };
  if (choice === "salvar") saveFloatingTimerTime();
  else if (choice === "descartar") closeFloatingTimer();
  else { floatingTimer.intervalId = setInterval(renderFloatingTimer, 1000); renderFloatingTimer(); }
}
function startFloatingTimer(goal, kind = "study") {
  if (floatingTimer.goalId && !confirm("Já existe cronômetro em andamento. Deseja substituir?")) return;
  stopFloatingTimerInterval();
  const selectedMode = elements.timerMode?.value || state.settings?.timerMode || "countdown";
  const sessionGoalMinutes = selectedMode === "free" ? Number(prompt("Meta opcional da sessão em minutos (deixe 0 para livre)", 0)) || 0 : 0;
  state.settings.timerMode = selectedMode;
  saveData();
  autoSyncAfterSave("timer-settings");
  prepareTimerAudioContext();
  floatingTimer = { goalId: goal.id, kind, elapsedSeconds: 0, startedAt: Date.now(), paused: false, intervalId: null, completed: false, warnedFive: false, warnedOne: false, completionDismissed: false, displayedMotivationalMilestones: [], mode: selectedMode, sessionGoalMinutes };
  floatingTimer.intervalId = setInterval(renderFloatingTimer, 1000);
  persistFloatingTimerSession();
  renderFloatingTimer();
}
function pauseOrResumeFloatingTimer() {
  if (!floatingTimer.goalId) return;
  if (floatingTimer.paused) {
    floatingTimer.startedAt = Date.now();
    floatingTimer.paused = false;
  } else {
    floatingTimer.elapsedSeconds = currentTimerSeconds();
    floatingTimer.startedAt = null;
    floatingTimer.paused = true;
  }
  persistFloatingTimerSession();
  renderFloatingTimer();
}
function resetFloatingTimer() {
  if (!floatingTimer.goalId) return;
  floatingTimer.elapsedSeconds = 0;
  floatingTimer.startedAt = floatingTimer.paused ? null : Date.now();
  floatingTimer.completed = false;
  floatingTimer.warnedFive = false;
  floatingTimer.warnedOne = false;
  floatingTimer.completionDismissed = false;
  floatingTimer.displayedMotivationalMilestones = [];
  persistFloatingTimerSession();
  renderFloatingTimer();
}
function closeFloatingTimer() {
  stopFloatingTimerInterval();
  floatingTimer = { goalId: null, kind: null, elapsedSeconds: 0, startedAt: null, paused: false, intervalId: null, completed: false, warnedFive: false, warnedOne: false, completionDismissed: false, displayedMotivationalMilestones: [], mode: state.settings?.timerMode || "countdown" };
  state.timerSession = null;
  saveData();
  renderFloatingTimer();
}
function saveFloatingTimerTime() {
  const goal = floatingTimerGoal();
  if (!goal) return closeFloatingTimer();
  normalizeGoalTimeFields(goal);
  const seconds = currentTimerSeconds();
  const minutes = timerSavedMinutes(seconds);
  if (minutes <= 0) return alert("Inicie o cronômetro antes de salvar.");
  const field = floatingTimer.kind === "questions" ? "questionActualMinutes" : "studyActualMinutes";
  const label = timerKindLabel(floatingTimer.kind);
  goal[field] = (Number(goal[field]) || 0) + minutes;
  goal.actualMinutes = (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0);
  goal.studyStatus = goal.actualMinutes > 0 ? "Iniciado" : (goal.studyStatus || "Pendente");
  if (goal.actualMinutes > 0 && goal.status === "Pendente") goal.status = "Em andamento";
  appendGoalHistory(goal, `Tempo salvo pelo cronômetro: +${minutes} min em ${label} em ${new Date().toLocaleString("pt-BR")}. Total realizado: ${goal.actualMinutes} min.`);
  if (floatingTimer.kind !== "questions") state.studies.push({ id: createId(), date: todayISO(), subjectId: state.subjects.find((s) => canonical(s.name) === canonical(goal.discipline))?.id || "", syllabusItemId: goal.syllabusItemId || "", topic: goal.subject || "Assunto", minutes, plannedMinutes: Number(goal.minutes) || 0, topicStatus: "Iniciado", difficultyNotes: `Salvo pelo ${floatingTimer.mode === "free" ? "Cronômetro livre" : "Contagem regressiva"}.`, materialId: "", questions: 0, correct: 0, wrong: 0, blank: 0, origin: floatingTimer.mode === "free" ? "free" : "countdown", goalId: goal.id });
  saveData();
  render();
  showDailyGoalMessage(`Tempo salvo: ${minutes} min em ${label}.`, "success");
  autoSyncAfterSave("timer-save");
  closeFloatingTimer();
}

const $ = (selector) => document.querySelector(selector);
const elements = {
  subjectForm: $("#subjectForm"), subjectName: $("#subjectName"), subjectGoal: $("#subjectGoal"), subjectList: $("#subjectList"),
  studyForm: $("#studyForm"), studyDate: $("#studyDate"), studySubject: $("#studySubject"), studyTopic: $("#studyTopic"), studyMinutes: $("#studyMinutes"), studyPlannedMinutes: $("#studyPlannedMinutes"), studyTopicStatus: $("#studyTopicStatus"), studyDifficultyNotes: $("#studyDifficultyNotes"), questionsDone: $("#questionsDone"), correctAnswers: $("#correctAnswers"), wrongAnswers: $("#wrongAnswers"), blankAnswers: $("#blankAnswers"),
  todayHours: $("#todayHours"), weekHours: $("#weekHours"), weeklyGoalStatus: $("#weeklyGoalStatus"), totalQuestions: $("#totalQuestions"), accuracyRate: $("#accuracyRate"), syllabusStudied: $("#syllabusStudied"), dashboardStudiedTopics: $("#dashboardStudiedTopics"), syllabusTotal: $("#syllabusTotal"), schedulableTotal: $("#schedulableTotal"), notStartedTotal: $("#notStartedTotal"), undiagnosedTotal: $("#undiagnosedTotal"), weakTotal: $("#weakTotal"), pendingDiscipline: $("#pendingDiscipline"), totalStudyTime: $("#totalStudyTime"), averageTimePerTopic: $("#averageTimePerTopic"), dashboardCompletionForecast: $("#dashboardCompletionForecast"), daysUntilExam: $("#daysUntilExam"), planningStatus: $("#planningStatus"), dashboardMinWeeklyHours: $("#dashboardMinWeeklyHours"), dashboardIdealWeeklyHours: $("#dashboardIdealWeeklyHours"), dashboardProblemDiscipline: $("#dashboardProblemDiscipline"), dashboardTodayDisciplines: $("#dashboardTodayDisciplines"), dashboardTodayTopics: $("#dashboardTodayTopics"), dashboardWeekDisciplines: $("#dashboardWeekDisciplines"), dashboardWeekTopics: $("#dashboardWeekTopics"), dailyMotivationText: $("#dailyMotivationText"), changeMotivation: $("#changeMotivation"), dashboardProgressSummary: $("#dashboardProgressSummary"), progressGeneralCards: $("#progressGeneralCards"), progressMainBar: $("#progressMainBar"), progressAlerts: $("#progressAlerts"), progressDisciplines: $("#progressDisciplines"),
  reviewList: $("#reviewList"), centralSmartReview: $("#centralSmartReview"), daySmartReview: $("#daySmartReview"), smartReviewDate: $("#smartReviewDate"), smartReviewStandalone: $("#smartReviewStandalone"), reviewsDashboard: $("#reviewsDashboard"), dashboardSmartReviewSuggested: $("#dashboardSmartReviewSuggested"), dashboardSmartReviewDone: $("#dashboardSmartReviewDone"), dashboardSmartReviewReason: $("#dashboardSmartReviewReason"), alertList: $("#alertList"), historyBody: $("#historyBody"), clearData: $("#clearData"),
  editalForm: $("#editalForm"), contestName: $("#contestName"), agency: $("#agency"), role: $("#role"), board: $("#board"), examDate: $("#examDate"), officialLink: $("#officialLink"), generalNotes: $("#generalNotes"), editalPdf: $("#editalPdf"), pdfInfo: $("#pdfInfo"), removePdf: $("#removePdf"),
  syllabusForm: $("#syllabusForm"), itemDiscipline: $("#itemDiscipline"), itemTopic: $("#itemTopic"), itemSubject: $("#itemSubject"), itemSubtopic: $("#itemSubtopic"), itemReference: $("#itemReference"), itemPriority: $("#itemPriority"), itemWeight: $("#itemWeight"), itemStatus: $("#itemStatus"), itemDomain: $("#itemDomain"), itemNotes: $("#itemNotes"),
  bulkInput: $("#bulkInput"), previewBulk: $("#previewBulk"), saveBulk: $("#saveBulk"), bulkPreview: $("#bulkPreview"), incidenceTableInput: $("#incidenceTableInput"), applyIncidenceTableButton: $("#applyIncidenceTableButton"), incidenceTableResult: $("#incidenceTableResult"), filterSearch: $("#filterSearch"), filterDiscipline: $("#filterDiscipline"), filterPriority: $("#filterPriority"), filterStatus: $("#filterStatus"), filterDomain: $("#filterDomain"), filterSchedulable: $("#filterSchedulable"), filterQuick: $("#filterQuick"), bulkPriority: $("#bulkPriority"), applyBulkPriority: $("#applyBulkPriority"), syllabusCount: $("#syllabusCount"), showMoreSyllabus: $("#showMoreSyllabus"), syllabusList: $("#syllabusList"), schedulableList: $("#schedulableList"), disciplineOptions: $("#disciplineOptions"),
  jsonImportFile: $("#jsonImportFile"), replaceImportedSyllabus: $("#replaceImportedSyllabus"), importMessage: $("#importMessage"), importDisciplineTotal: $("#importDisciplineTotal"), importSubjectTotal: $("#importSubjectTotal"), importFilterDiscipline: $("#importFilterDiscipline"), importFilterStatus: $("#importFilterStatus"), importFilterPriority: $("#importFilterPriority"), importFilterDomain: $("#importFilterDomain"), importJsonButton: $("#importJsonButton"), clearImportedSyllabus: $("#clearImportedSyllabus"), importDisciplineList: $("#importDisciplineList"), importedSyllabusGroups: $("#importedSyllabusGroups"), importPreview: $("#importPreview"),
  generalCebraspeNet: $("#generalCebraspeNet"), todayPendingGoals: $("#todayPendingGoals"), todayDoneGoals: $("#todayDoneGoals"), dashboardTodayGoal: $("#dashboardTodayGoal"), dashboardTodayGoalDetail: $("#dashboardTodayGoalDetail"), dashboardDailyGoalRate: $("#dashboardDailyGoalRate"), dashboardTodayRemaining: $("#dashboardTodayRemaining"), dashboardNextTodayGoal: $("#dashboardNextTodayGoal"), viewDayPlan: $("#viewDayPlan"),
  selectedGoalDateLabel: $("#selectedGoalDateLabel"), nextDailyGoal: $("#nextDailyGoal"), generateDailyGoals: $("#generateDailyGoals"), refreshDailyGoalsFromPlanning: $("#refreshDailyGoalsFromPlanning"), goalForm: $("#goalForm"), goalDate: $("#goalDate"), goalDiscipline: $("#goalDiscipline"), goalSyllabusItem: $("#goalSyllabusItem"), goalType: $("#goalType"), goalMinutes: $("#goalMinutes"), goalActualMinutes: $("#goalActualMinutes"), goalStudyStatus: $("#goalStudyStatus"), goalPriority: $("#goalPriority"), goalStatus: $("#goalStatus"), goalNotes: $("#goalNotes"), dailyGoalsSummary: $("#dailyGoalsSummary"), dailyGoalsList: $("#dailyGoalsList"),
  calendarDate: $("#calendarDate"), calendarViewMode: $("#calendarViewMode"), generateWeekGoals: $("#generateWeekGoals"), generateMonthGoals: $("#generateMonthGoals"), disciplineWeightsList: $("#disciplineWeightsList"), goalCalendarStats: $("#goalCalendarStats"), goalCalendarContent: $("#goalCalendarContent"), monthlyTopicGoal: $("#monthlyTopicGoal"), monthlyHourGoal: $("#monthlyHourGoal"), monthlyPlanSummary: $("#monthlyPlanSummary"), todayGoalsTotal: $("#todayGoalsTotal"), weekGoalsTotal: $("#weekGoalsTotal"), weekGoalRate: $("#weekGoalRate"), monthGoalRate: $("#monthGoalRate"), nextGoalLabel: $("#nextGoalLabel"), weekTopDiscipline: $("#weekTopDiscipline"), mostDelayedDiscipline: $("#mostDelayedDiscipline"),
  questionForm: $("#questionForm"), questionEditingId: $("#questionEditingId"), questionLinkedGoalId: $("#questionLinkedGoalId"), questionOrigin: $("#questionOrigin"), questionDate: $("#questionDate"), questionDiscipline: $("#questionDiscipline"), questionSyllabusItem: $("#questionSyllabusItem"), questionBoard: $("#questionBoard"), questionTrainingType: $("#questionTrainingType"), questionTotal: $("#questionTotal"), questionMinutes: $("#questionMinutes"), questionCorrect: $("#questionCorrect"), questionWrong: $("#questionWrong"), questionBlank: $("#questionBlank"), questionNotes: $("#questionNotes"), questionCalculated: $("#questionCalculated"), questionAnalysis: $("#questionAnalysis"),
  questionFilterDiscipline: $("#questionFilterDiscipline"), questionFilterSubject: $("#questionFilterSubject"), questionFilterBoard: $("#questionFilterBoard"), questionHistoryBody: $("#questionHistoryBody"),
  exportBackup: $("#exportBackup"), selectBackupFile: $("#selectBackupFile"), backupFileInput: $("#backupFileInput"), resetSolvedQuestions: $("#resetSolvedQuestions"), clearAllLocalData: $("#clearAllLocalData"), lastBackupDate: $("#lastBackupDate"), backupStorageKeys: $("#backupStorageKeys"), backupSummary: $("#backupSummary"), backupPreview: $("#backupPreview"),
  mockTotal: $("#mockTotal"), mockLastNet: $("#mockLastNet"), mockBestNet: $("#mockBestNet"), mockAverageNet: $("#mockAverageNet"), mockAboveGoal: $("#mockAboveGoal"), mockProblemDiscipline: $("#mockProblemDiscipline"),
  newMockExam: $("#newMockExam"), mockExamForm: $("#mockExamForm"), mockExamEditingId: $("#mockExamEditingId"), mockName: $("#mockName"), mockDate: $("#mockDate"), mockBoard: $("#mockBoard"), mockInstitution: $("#mockInstitution"), mockNotes: $("#mockNotes"), mockTotalQuestions: $("#mockTotalQuestions"), mockCorrect: $("#mockCorrect"), mockWrong: $("#mockWrong"), mockBlank: $("#mockBlank"), mockGoal: $("#mockGoal"), mockStrategy: $("#mockStrategy"), mockDifficulty: $("#mockDifficulty"), mockCalculated: $("#mockCalculated"), mockDisciplineName: $("#mockDisciplineName"), mockDisciplineTotal: $("#mockDisciplineTotal"), mockDisciplineCorrect: $("#mockDisciplineCorrect"), mockDisciplineWrong: $("#mockDisciplineWrong"), mockDisciplineBlank: $("#mockDisciplineBlank"), mockDisciplineNotes: $("#mockDisciplineNotes"), addMockDiscipline: $("#addMockDiscipline"), clearMockDisciplines: $("#clearMockDisciplines"), mockDisciplineDraft: $("#mockDisciplineDraft"), mockSummary: $("#mockSummary"), mockGeneralResult: $("#mockGeneralResult"), mockDisciplineResults: $("#mockDisciplineResults"), mockDiagnosis: $("#mockDiagnosis"), mockHistory: $("#mockHistory"), mockEvolution: $("#mockEvolution"),
  planningConfigForm: $("#planningConfigForm"), planningExamDate: $("#planningExamDate"), planningScaleType: $("#planningScaleType"), planningScaleNotes: $("#planningScaleNotes"), planningShiftHours: $("#planningShiftHours"), planningRestHours: $("#planningRestHours"), planningNormalHours: $("#planningNormalHours"), planningMinWeeklyHours: $("#planningMinWeeklyHours"), planningIdealWeeklyHours: $("#planningIdealWeeklyHours"), planningWeeklyTopics: $("#planningWeeklyTopics"), planningDisciplinesPerDay: $("#planningDisciplinesPerDay"), planningDisciplinesPerWeek: $("#planningDisciplinesPerWeek"), planningDisciplinesPerMonth: $("#planningDisciplinesPerMonth"), planningTopicsPerDay: $("#planningTopicsPerDay"), planningTopicsPerWeek: $("#planningTopicsPerWeek"), planningTopicsPerMonth: $("#planningTopicsPerMonth"), planningSafetyDays: $("#planningSafetyDays"), planningScaleReferenceDate: $("#planningScaleReferenceDate"), planningScaleReferencePosition: $("#planningScaleReferencePosition"), scale3x6Fields: $("#scale3x6Fields"), centralGoalsCards: $("#centralGoalsCards"), centralScaleSummary: $("#centralScaleSummary"), centralNextDates: $("#centralNextDates"), centralOpenDayPlan: $("#centralOpenDayPlan"), dashboardGoalsScaleSummary: $("#dashboardGoalsScaleSummary"), availabilityCalendar: $("#availabilityCalendar"), completionForecast: $("#completionForecast"), completionAlert: $("#completionAlert"), weeklyGoalsPlan: $("#weeklyGoalsPlan"), weeklyGoalsAlert: $("#weeklyGoalsAlert"), timeHistorySummary: $("#timeHistorySummary"), timeHistoryBody: $("#timeHistoryBody"),
  dashboardQuestionBankTotal: $("#dashboardQuestionBankTotal"), dashboardQuestionBankSessions: $("#dashboardQuestionBankSessions"), dashboardQuestionBankLast: $("#dashboardQuestionBankLast"), dashboardQuestionBankPackages: $("#dashboardQuestionBankPackages"), dashboardQuestionBankLinked: $("#dashboardQuestionBankLinked"), dashboardQuestionBankMissing: $("#dashboardQuestionBankMissing"),
  materialsTotal: $("#materialsTotal"), materialDisciplinesTotal: $("#materialDisciplinesTotal"), materialTopicsTotal: $("#materialTopicsTotal"), materialForm: $("#materialForm"), materialEditingId: $("#materialEditingId"), materialTitle: $("#materialTitle"), materialDate: $("#materialDate"), materialDiscipline: $("#materialDiscipline"), materialSubject: $("#materialSubject"), materialType: $("#materialType"), materialOrigin: $("#materialOrigin"), materialLink: $("#materialLink"), materialTags: $("#materialTags"), materialNotes: $("#materialNotes"), materialDisciplineOptions: $("#materialDisciplineOptions"), materialSubjectOptions: $("#materialSubjectOptions"), materialFilterDiscipline: $("#materialFilterDiscipline"), materialFilterSubject: $("#materialFilterSubject"), materialFilterType: $("#materialFilterType"), materialFilterOrigin: $("#materialFilterOrigin"), materialFilterText: $("#materialFilterText"), materialsList: $("#materialsList"), studyMaterial: $("#studyMaterial"),
  editFactoryPromptLibrary: $("#editFactoryPromptLibrary"), factoryForm: $("#factoryForm"), factoryEditingId: $("#factoryEditingId"), factoryDiscipline: $("#factoryDiscipline"), factoryTheme: $("#factoryTheme"), factorySubtheme: $("#factorySubtheme"), factoryPriority: $("#factoryPriority"), factoryPlannedDate: $("#factoryPlannedDate"), factoryStatus: $("#factoryStatus"), factorySourceFolder: $("#factorySourceFolder"), factoryDestinationFolder: $("#factoryDestinationFolder"), factoryFinalLink: $("#factoryFinalLink"), factoryLeiNome: $("#factoryLeiNome"), factoryLeiFonte: $("#factoryLeiFonte"), factoryLeiArtigos: $("#factoryLeiArtigos"), factoryLeiRecorte: $("#factoryLeiRecorte"), factoryLeiObservacoes: $("#factoryLeiObservacoes"), factoryNotes: $("#factoryNotes"), factorySummary: $("#factorySummary"), factoryFilterDiscipline: $("#factoryFilterDiscipline"), factoryFilterPriority: $("#factoryFilterPriority"), factoryFilterStatus: $("#factoryFilterStatus"), factoryFilterDate: $("#factoryFilterDate"), factoryFilterView: $("#factoryFilterView"), factoryFilterText: $("#factoryFilterText"), factoryList: $("#factoryList"), factoryPromptLibraryPanel: $("#factoryPromptLibraryPanel"),
  qbSyllabusPackages: $("#qbSyllabusPackages"), qbSyllabusVerticalized: $("#qbSyllabusVerticalized"), qbPreviewSection: $("#qbPreviewSection"), qbSyllabusSummary: $("#qbSyllabusSummary"), qbPackagesSummary: $("#qbPackagesSummary"), qbFile: $("#qbFile"), qbNewTraining: $("#qbNewTraining"), qbRedoBlanks: $("#qbRedoBlanks"), qbExportBank: $("#qbExportBank"), qbExportResults: $("#qbExportResults"), qbClearBank: $("#qbClearBank"), qbMessage: $("#qbMessage"), qbStats: $("#qbStats"), qbDiagnostics: $("#qbDiagnostics"), qbTrainingScope: $("#qbTrainingScope"), qbReviewTypeWrapper: $("#qbReviewTypeWrapper"), qbReviewType: $("#qbReviewType"), qbFilterDiscipline: $("#qbFilterDiscipline"), qbFilterSubject: $("#qbFilterSubject"), qbFilterTheme: $("#qbFilterTheme"), qbFilterBoard: $("#qbFilterBoard"), qbFilterYear: $("#qbFilterYear"), qbFilterSearch: $("#qbFilterSearch"), qbTrainingLimit: $("#qbTrainingLimit"), qbShuffleTraining: $("#qbShuffleTraining"), qbStartTraining: $("#qbStartTraining"), qbPreviewFiltered: $("#qbPreviewFiltered"), qbFilteredPreview: $("#qbFilteredPreview"), qbTrainingPanel: $("#qbTrainingPanel"), qbTrainingCounter: $("#qbTrainingCounter"), qbTrainingProgress: $("#qbTrainingProgress"), qbQuestionCard: $("#qbQuestionCard"), qbResultPanel: $("#qbResultPanel"), qbResultSummary: $("#qbResultSummary"), qbResultDetails: $("#qbResultDetails"), qbErrorStats: $("#qbErrorStats"), qbErrorNotebookList: $("#qbErrorNotebookList"), qbErrorFilterDiscipline: $("#qbErrorFilterDiscipline"), qbErrorFilterSubject: $("#qbErrorFilterSubject"), qbErrorFilterStatus: $("#qbErrorFilterStatus"), qbErrorFilterReason: $("#qbErrorFilterReason"), qbStartErrorNotebook: $("#qbStartErrorNotebook"), qbReviewByDiscipline: $("#qbReviewByDiscipline"), qbReviewBySubject: $("#qbReviewBySubject"), qbToggleErrorHistory: $("#qbToggleErrorHistory"), qbErrorHistory: $("#qbErrorHistory"),
  connectGoogleDrive: $("#connectGoogleDrive"), syncNowButton: $("#syncNow"), pushToCloud: $("#pushToCloud"), pullFromCloud: $("#pullFromCloud"), disconnectGoogleDrive: $("#disconnectGoogleDrive"), syncStatus: $("#syncStatus"),
  floatingTimer: $("#floatingTimer"), timerDiscipline: $("#timerDiscipline"), timerSubject: $("#timerSubject"), timerKind: $("#timerKind"), timerTime: $("#timerTime"), timerPauseResume: $("#timerPauseResume"), timerProgressBar: $("#timerProgressBar"), timerProgressText: $("#timerProgressText"), timerAlert: $("#timerAlert"), timerCompletion: $("#timerCompletion"), timerSettings: $("#timerSettings"), timerMode: $("#timerMode"), timerMotivationalToast: $("#timerMotivationalToast"), addManualTime: $("#addManualTime"), timeUndoNotice: $("#timeUndoNotice"), undoTimeAction: $("#undoTimeAction")
};
elements.studyDate.value = todayISO();
elements.goalDate.value = todayISO();
elements.questionDate.value = todayISO();
if (elements.calendarDate) elements.calendarDate.value = todayISO();
if (elements.smartReviewDate) elements.smartReviewDate.value = todayISO();
if (elements.mockDate) elements.mockDate.value = todayISO();
if (elements.materialDate) elements.materialDate.value = todayISO();
if (elements.factoryPlannedDate) elements.factoryPlannedDate.value = todayISO();


function pickMotivationalPhrase() {
  const lastPhrase = localStorage.getItem(MOTIVATION_STORAGE_KEY);
  const availablePhrases = MOTIVATIONAL_PHRASES.filter((phrase) => phrase !== lastPhrase);
  const pool = availablePhrases.length ? availablePhrases : MOTIVATIONAL_PHRASES;
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem(MOTIVATION_STORAGE_KEY, phrase);
  return phrase;
}
function renderMotivationalPhrase(phrase = pickMotivationalPhrase()) {
  if (elements.dailyMotivationText) elements.dailyMotivationText.textContent = phrase;
}

function saveData(options = {}) {
  try {
    if (options.markLocalChange && !isApplyingRemote) markLocalUpdated();
    state.dailyGoals?.forEach(normalizeGoalTimeFields);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SIMULADOS_STORAGE_KEY, JSON.stringify(state.simulados || []));
    salvarCadernoErros(state.questionErrorNotebook || []);
  } catch (error) {
    console.error("[Metas Estudo] Não foi possível salvar no localStorage.", error);
    alert("Não foi possível salvar os dados. Verifique o espaço disponível do navegador e exporte um backup.");
  }
}

function readSyncMeta() { return readJSONStorage(SYNC_META_STORAGE_KEY, { connected: false, lastLocalUpdateAt: "", lastLocalSaveAt: "", lastLocalSaveReason: "", lastSyncAt: "", lastAutoSyncAt: "", lastAutoSyncReason: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", lastAutoSyncError: "", pendingSync: false, pendingSyncReason: null, localDirty: false, localDataUpdatedAt: "", cloudDataUpdatedAt: "", remoteUpdatedAt: "", remoteDeviceName: "", error: "" }); }
function writeSyncMeta(meta) { localStorage.setItem(SYNC_META_STORAGE_KEY, JSON.stringify({ ...readSyncMeta(), ...meta })); }
function markLocalUpdated(date = new Date().toISOString()) { writeLocalDataUpdatedAt(date); }
function getDeviceId() { let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY); if (!id) { id = createId(); localStorage.setItem(DEVICE_ID_STORAGE_KEY, id); } return id; }
function getDeviceName() { const ua = navigator.userAgent || ""; const kind = /Mobi|Android|iPhone/i.test(ua) ? "Celular" : (/iPad|Tablet/i.test(ua) ? "Tablet" : "PC"); return `${kind} / ${navigator.platform || "navegador"}`; }
function isGoogleClientConfigured() {
  const clientId = String(GOOGLE_CLIENT_ID || "").trim();
  return Boolean(clientId && clientId !== "COLE_AQUI_O_CLIENT_ID_DO_GOOGLE_CLOUD" && !/placeholder|cole_aqui|colocar/i.test(clientId));
}
function googleClientConfigMessage() { return "Google Client ID não configurado. Configure o client_id no script.js para ativar a sincronização."; }
function googleAuthorizationStatusMessage(meta = readSyncMeta()) {
  if (!meta.connected) return "não conectado";
  return hasValidGoogleDriveAccessToken() ? "token válido para envio" : "Conectado, mas autorização expirada. Clique em Conectar Google Drive para renovar.";
}
function renderSyncStatus(message = "") {
  if (!elements.syncStatus) return;
  const meta = readSyncMeta();
  const configured = isGoogleClientConfigured();
  const authorizationMessage = googleAuthorizationStatusMessage(meta);
  const rows = [
    ["Status", meta.connected ? "conectado à conta Google" : "não conectado"],
    ["Autorização para envio", authorizationMessage],
    ["Último salvamento local", meta.lastLocalSaveAt ? `${new Date(meta.lastLocalSaveAt).toLocaleString("pt-BR")} • origem: ${meta.lastLocalSaveReason || "alteração"}` : "Nunca"],
    ["Última sincronização local", meta.lastSyncAt ? new Date(meta.lastSyncAt).toLocaleString("pt-BR") : "Nunca"],
    ["Último envio automático", meta.lastAutoSyncAt ? `${new Date(meta.lastAutoSyncAt).toLocaleString("pt-BR")} • origem: ${meta.lastAutoSyncReason || "alteração"}` : "Nunca"],
    ["Pendência de envio", meta.pendingSync ? "Sim" : "Não"],
    ["Motivo da pendência", meta.pendingSync ? (meta.pendingSyncReason || "alteração") : "Nenhum"],
    ["Último erro de auto-sync", meta.lastAutoSyncErrorAt ? `${new Date(meta.lastAutoSyncErrorAt).toLocaleString("pt-BR")} • origem: ${meta.lastAutoSyncErrorReason || "alteração"} • ${meta.lastAutoSyncError || meta.error || "erro"}` : "Nenhum"],
    ["Última versão na nuvem", meta.remoteUpdatedAt ? new Date(meta.remoteUpdatedAt).toLocaleString("pt-BR") : "Desconhecida"],
    ["Dispositivo de origem", meta.remoteDeviceName || "Desconhecido"],
    ["Dispositivo atual", getDeviceName()]
  ];
  const expiredAuthorization = meta.connected && !hasValidGoogleDriveAccessToken();
  const notice = !configured ? (message || meta.error || "Sincronização Google Drive ainda não configurada.") : (message || meta.error || (expiredAuthorization ? authorizationMessage : "Pronto."));
  const details = meta.errorDetails ? `<details class="sync-error-details"><summary>Ver detalhes do erro</summary><pre>${escapeHTML(meta.errorDetails)}</pre></details>` : "";
  elements.syncStatus.innerHTML = `<div class="sync-status-grid">${rows.map(([label, value]) => `<article><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></article>`).join("")}</div><p class="sync-message ${meta.error || !configured || expiredAuthorization ? "sync-error" : "sync-success"}">${escapeHTML(notice)}</p>${details}`;
}
let googleDriveAccessToken = "";
let googleDriveTokenExpiresAt = 0;
let googleDriveTokenClient = null;

function clearGoogleDriveAccessToken() { googleDriveAccessToken = ""; googleDriveTokenExpiresAt = 0; }
function hasValidGoogleDriveAccessToken() { return Boolean(googleDriveAccessToken && Date.now() < googleDriveTokenExpiresAt - 60000); }
function syncErrorMessage(error, fallback) {
  const msg = String(error?.message || error || "");
  if (!navigator.onLine) return "Sem internet. Verifique a conexão e tente novamente.";
  if (/popup|cancel|closed|denied|access_denied/i.test(msg)) return "Login cancelado ou permissão negada.";
  if (/401|token|Unauthorized|TOKEN_EXPIRED|invalid_token/i.test(msg)) return "Autorização expirada. Conecte novamente ao Google Drive.";
  return fallback || msg || "Erro de sincronização.";
}
async function getAccessToken({ prompt = "" } = {}) {
  if (hasValidGoogleDriveAccessToken()) return googleDriveAccessToken;
  if (!isGoogleClientConfigured()) throw new Error(googleClientConfigMessage());
  if (!window.google?.accounts?.oauth2) throw new Error("Google Identity Services não carregou. Verifique a conexão.");
  return new Promise((resolve, reject) => {
    googleDriveTokenClient = googleDriveTokenClient || google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response?.access_token) {
          googleDriveAccessToken = response.access_token;
          googleDriveTokenExpiresAt = Date.now() + (Number(response.expires_in || 3600) * 1000);
          resolve(googleDriveAccessToken);
          return;
        }
        reject(new Error(response?.error || "login cancelado"));
      }
    });
    googleDriveTokenClient.requestAccessToken(prompt ? { prompt } : {});
  });
}
async function driveFetch(url, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` } });
  if (response.status === 401) {
    clearGoogleDriveAccessToken();
    throw new Error(`TOKEN_EXPIRED 401 ${await response.text()}`);
  }
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response;
}
async function findSyncFile() { const q = encodeURIComponent(`name='${GOOGLE_SYNC_FILE_NAME}' and trashed=false`); const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`); return (await r.json()).files?.[0] || null; }
function multipartBody(payload, fileId) { const boundary = "metas_estudo_sync_boundary"; const metadata = { name: GOOGLE_SYNC_FILE_NAME, mimeType: "application/json", ...(fileId ? {} : { parents: ["appDataFolder"] }) }; return { boundary, body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload, null, 2)}\r\n--${boundary}--` }; }
async function createSyncFile(payload) { const { boundary, body } = multipartBody(payload); const r = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }); return r.json(); }
async function updateSyncFile(fileId, payload) { const { boundary, body } = multipartBody(payload, fileId); const r = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,modifiedTime`, { method: "PATCH", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }); return r.json(); }
async function downloadSyncFile(fileId) { return (await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`)).json(); }
function makeSyncPayload() { const updatedAt = new Date().toISOString(); markLocalUpdated(updatedAt); saveData({ skipSyncTimestamp: true }); return { app: "metas-estudo", schemaVersion: 1, updatedAt, cloudDataUpdatedAt: updatedAt, localDataUpdatedAt: updatedAt, deviceId: getDeviceId(), deviceName: getDeviceName(), state: cloneData(state) }; }
function syncPayloadUpdatedAt(payload = {}, fallback = "") { return payload.cloudDataUpdatedAt || payload.updatedAt || fallback || ""; }
function localDataUpdatedAt(meta = readSyncMeta()) { return meta.localDataUpdatedAt || meta.lastLocalUpdateAt || ""; }
function writeLocalDataUpdatedAt(date, { dirty = true } = {}) { writeSyncMeta({ lastLocalUpdateAt: date, localDataUpdatedAt: date, localDirty: dirty }); }
function autoSyncSuccessMessage(reason = "alteração") {
  if (["timer-save", "timer", "timer-edit", "timer-delete", "timer-manual", "timer-settings"].includes(reason)) return "Cronômetro atualizado e enviado para a nuvem.";
  if (reason === "material-save" || reason === "material") return "Material salvo e enviado para a nuvem.";
  if (reason === "goal-save" || reason === "daily-goal") return "Meta diária salva e enviada para a nuvem.";
  if (reason === "backup-import") return "Backup importado e enviado para a nuvem.";
  return "Alteração salva e enviada para a nuvem.";
}
function autoSyncLocalOnlyMessage(reason = "alteração", meta = readSyncMeta()) {
  if (meta.connected && !hasValidGoogleDriveAccessToken()) {
    return reason === "timer-save" ? "Tempo salvo localmente. Autorização Google expirada." : (["timer-edit", "timer-delete", "timer-manual", "timer-settings"].includes(reason) ? "Cronômetro salvo localmente. Autorização Google expirada." : "Alteração salva localmente. Autorização Google expirada.");
  }
  return "Alteração salva localmente. Conecte ao Google Drive para enviar à nuvem.";
}
function markPendingSync(reason = "alteração", message = autoSyncLocalOnlyMessage()) {
  writeSyncMeta({ pendingSync: true, pendingSyncReason: reason, error: message, lastAutoSyncErrorAt: new Date().toISOString(), lastAutoSyncErrorReason: reason, lastAutoSyncError: message });
}
let autoSyncTimer = null;
let pendingAutoSyncReason = "alteração";
let syncDialogOpen = false;
let isApplyingRemote = false;
let isSyncing = false;
let suppressAutoCheckUntil = 0;
function isSyncLocked() { return syncDialogOpen || isApplyingRemote || isSyncing; }
function canRunAutoSyncChecks() { return !isSyncLocked() && Date.now() >= suppressAutoCheckUntil; }
function suppressAutoChecksAfterSync() { suppressAutoCheckUntil = Date.now() + 15000; }
function withSyncDialog(callback) {
  if (syncDialogOpen || isApplyingRemote || isSyncing) return null;
  syncDialogOpen = true;
  try { return callback(); } finally { syncDialogOpen = false; }
}
function askSyncChoice(message, choices) {
  const text = `${message}\n\n${choices.map((choice, index) => `[${index + 1}] ${choice}`).join("\n")}`;
  return withSyncDialog(() => {
    const answer = window.prompt(text, "1");
    const index = Number(answer) - 1;
    return Number.isInteger(index) && choices[index] ? choices[index] : null;
  });
}
async function uploadSyncPayload(payload = makeSyncPayload(), { statusMessage = "Dados enviados para a nuvem com sucesso." } = {}) { if (isSyncing) return null; isSyncing = true; try { const file = await findSyncFile(); const saved = file ? await updateSyncFile(file.id, payload) : await createSyncFile(payload); writeSyncMeta({ connected: true, pendingSync: false, pendingSyncReason: null, localDirty: false, lastSyncAt: new Date().toISOString(), remoteUpdatedAt: syncPayloadUpdatedAt(payload), cloudDataUpdatedAt: syncPayloadUpdatedAt(payload), localDataUpdatedAt: syncPayloadUpdatedAt(payload), lastLocalUpdateAt: syncPayloadUpdatedAt(payload), remoteDeviceName: payload.deviceName, error: "" }); suppressAutoChecksAfterSync(); renderSyncStatus(statusMessage); return saved; } finally { isSyncing = false; } }
async function runAutoSyncAfterSave(reason) {
  if (isSyncLocked()) return;
  markLocalUpdated();
  const meta = readSyncMeta();
  const localSaveAt = new Date().toISOString();
  writeSyncMeta({ lastLocalSaveAt: localSaveAt, lastLocalSaveReason: reason });
  if (!meta.connected || !hasValidGoogleDriveAccessToken()) { const message = autoSyncLocalOnlyMessage(reason, meta); markPendingSync(reason, message); renderSyncStatus(message); return; }
  try {
    const file = await findSyncFile();
    if (file) {
      const remote = await downloadSyncFile(file.id);
      const remoteDate = new Date(syncPayloadUpdatedAt(remote, file.modifiedTime) || 0);
      const lastSyncDate = new Date(meta.lastSyncAt || 0);
      if (remoteDate > lastSyncDate && remote.deviceId !== getDeviceId()) {
        const message = "Existem dados mais recentes no Google Drive. Escolha baixar dados da nuvem ou enviar este dispositivo.";
        writeSyncMeta({ remoteUpdatedAt: syncPayloadUpdatedAt(remote, file.modifiedTime), cloudDataUpdatedAt: syncPayloadUpdatedAt(remote, file.modifiedTime), remoteDeviceName: remote.deviceName || "", error: message });
        renderSyncStatus(message);
        return;
      }
    }
    const payload = makeSyncPayload();
    await uploadSyncPayload(payload, { statusMessage: autoSyncSuccessMessage(reason) });
    writeSyncMeta({ pendingSync: false, pendingSyncReason: "", lastAutoSyncAt: new Date().toISOString(), lastAutoSyncReason: reason, lastAutoSyncError: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", error: "" });
    renderSyncStatus(autoSyncSuccessMessage(reason));
  } catch (error) {
    const rawErrorMessage = String(error?.message || error || "");
    const isExpiredToken = /Autorização expirada|TOKEN_EXPIRED|401|token|Unauthorized|invalid_token/i.test(rawErrorMessage);
    const message = isExpiredToken ? autoSyncLocalOnlyMessage(reason) : syncErrorMessage(error, "Alteração salva localmente. Sincronize depois.");
    if (isExpiredToken) markPendingSync(reason, message);
    else writeSyncMeta({ error: message, lastAutoSyncErrorAt: new Date().toISOString(), lastAutoSyncErrorReason: reason, lastAutoSyncError: message });
    renderSyncStatus(message);
  }
}
function autoSyncAfterSave(reason = "alteração") {
  if (isSyncLocked()) return;
  pendingAutoSyncReason = reason;
  clearTimeout(autoSyncTimer);
  return runAutoSyncAfterSave(pendingAutoSyncReason);
}

function isQuotaExceededError(error) {
  return error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED" || /quota|exceeded|storage/i.test(String(error?.message || error || ""));
}
function cloudSyncError(kind, userMessage, error) {
  const wrapped = new Error(userMessage);
  wrapped.cloudSyncKind = kind;
  wrapped.details = String(error?.stack || error?.message || error || userMessage);
  return wrapped;
}
function classifyCloudSyncError(error, fallback = "Erro de sincronização.") {
  const kind = error?.cloudSyncKind || (isQuotaExceededError(error) ? "quota" : "generic");
  const raw = String(error?.message || error || "");
  const message = syncErrorMessage(error, raw || fallback);
  const byKind = {
    query: "Erro ao consultar a nuvem. Verifique a conexão e tente novamente.",
    download: "Erro ao baixar o arquivo do Google Drive. Tente novamente.",
    invalid: "Arquivo remoto inválido. Os dados locais foram preservados.",
    quota: "Falta de espaço no navegador. Libere espaço, exporte um backup e tente novamente.",
    backup: "Erro ao criar backup de segurança. Os dados locais foram preservados.",
    apply: "Erro ao aplicar os dados da nuvem. Os dados locais foram preservados."
  };
  return { message: byKind[kind] || message || fallback, details: error?.details || String(error?.stack || raw || fallback), kind };
}
function recordCloudSyncError(error, fallback) {
  const info = classifyCloudSyncError(error, fallback);
  const now = new Date().toISOString();
  writeSyncMeta({ error: info.message, errorDetails: info.details, lastCloudDialogAt: now, lastCloudErrorAt: now, lastCloudErrorKind: info.kind });
  suppressAutoCheckUntil = Date.now() + 60000;
  renderSyncStatus(info.message);
  return info.message;
}
function validateCloudPayload(payload) {
  if (payload?.app !== "metas-estudo" || payload.schemaVersion !== 1 || !payload.state || typeof payload.state !== "object" || Array.isArray(payload.state)) {
    throw cloudSyncError("invalid", "Arquivo remoto inválido. Os dados locais foram preservados.");
  }
  const updatedAt = syncPayloadUpdatedAt(payload);
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) throw cloudSyncError("invalid", "Arquivo remoto inválido. Os dados locais foram preservados.");
}
function writeCloudStateTransaction(nextState, payload) {
  const nextData = { ...cloneData(defaultState), ...(nextState || {}) };
  const mainValue = JSON.stringify(nextData);
  const simuladosValue = JSON.stringify(nextData.simulados || []);
  const cadernoValue = JSON.stringify(nextData.questionErrorNotebook || []);
  const previousValues = new Map([STORAGE_KEY, SIMULADOS_STORAGE_KEY, CADERNO_ERROS_STORAGE_KEY].map((key) => [key, localStorage.getItem(key)]));
  try {
    localStorage.setItem("metasEstudoBackupAntesDaSincronizacao", JSON.stringify({ app: "metas-estudo", createdAt: new Date().toISOString(), source: "cloud-sync", previousLocalUpdatedAt: localDataUpdatedAt(readSyncMeta()) }));
  } catch (error) {
    throw cloudSyncError(isQuotaExceededError(error) ? "quota" : "backup", isQuotaExceededError(error) ? "Falta de espaço no navegador. Libere espaço, exporte um backup e tente novamente." : "Erro ao criar backup de segurança. Os dados locais foram preservados.", error);
  }
  try {
    localStorage.setItem(STORAGE_KEY, mainValue);
    localStorage.setItem(SIMULADOS_STORAGE_KEY, simuladosValue);
    localStorage.setItem(CADERNO_ERROS_STORAGE_KEY, cadernoValue);
  } catch (error) {
    try {
      previousValues.forEach((value, key) => { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); });
    } catch (_) {}
    throw cloudSyncError(isQuotaExceededError(error) ? "quota" : "apply", isQuotaExceededError(error) ? "Falta de espaço no navegador. Libere espaço, exporte um backup e tente novamente." : "Erro ao aplicar os dados da nuvem. Os dados locais foram preservados.", error);
  }
}
async function pullSyncPayload() { if (isSyncing) throw new Error("sincronização em andamento"); isSyncing = true; try { let file; try { file = await findSyncFile(); } catch (error) { throw cloudSyncError("query", "Erro ao consultar a nuvem. Verifique a conexão e tente novamente.", error); } if (!file) throw cloudSyncError("query", "Arquivo remoto inexistente."); let payload; try { payload = await downloadSyncFile(file.id); } catch (error) { throw cloudSyncError("download", "Erro ao baixar o arquivo do Google Drive. Tente novamente.", error); } validateCloudPayload(payload); const cloudDataUpdatedAt = syncPayloadUpdatedAt(payload, file.modifiedTime); writeSyncMeta({ connected: true, remoteUpdatedAt: cloudDataUpdatedAt, cloudDataUpdatedAt, remoteDeviceName: payload.deviceName || "", error: "", errorDetails: "" }); renderSyncStatus("Dados da nuvem encontrados."); return payload; } finally { isSyncing = false; } }
function applyCloudPayload(payload) { isApplyingRemote = true; try { validateCloudPayload(payload); const cloudDataUpdatedAt = syncPayloadUpdatedAt(payload); writeCloudStateTransaction(payload.state, payload); replaceState(payload.state); writeSyncMeta({ connected: true, pendingSync: false, pendingSyncReason: null, localDirty: false, lastLocalUpdateAt: cloudDataUpdatedAt, localDataUpdatedAt: cloudDataUpdatedAt, lastSyncAt: new Date().toISOString(), lastAutoSyncError: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", remoteUpdatedAt: cloudDataUpdatedAt, cloudDataUpdatedAt, remoteDeviceName: payload.deviceName || "", error: "", errorDetails: "", lastCloudDialogAt: "" }); suppressAutoChecksAfterSync(); render(); showView("backup"); renderSyncStatus("Dados atualizados pela nuvem."); } catch (error) { if (!error.cloudSyncKind) throw cloudSyncError("apply", "Erro ao aplicar os dados da nuvem. Os dados locais foram preservados.", error); throw error; } finally { isApplyingRemote = false; } }
async function syncNow() { if (!canRunAutoSyncChecks()) return; try { const remote = await pullSyncPayload(); const meta = readSyncMeta(); const localDate = new Date(localDataUpdatedAt(meta) || 0); const remoteDate = new Date(syncPayloadUpdatedAt(remote) || 0); if (+remoteDate === +localDate) return renderSyncStatus("Tudo sincronizado."); if (hasLocalSyncPending(meta) && remote.deviceId !== getDeviceId()) { const pendingChoice = await resolvePendingLocalSyncBeforeCloudDownload(meta); if (pendingChoice === "download") applyCloudPayload(remote); return; } if (remoteDate > localDate) { const choice = askSyncChoice("Existem dados mais recentes no Google Drive.", ["Baixar versão da nuvem", "Cancelar"]); if (choice === "Baixar versão da nuvem") applyCloudPayload(remote); else renderSyncStatus("Sincronização cancelada pelo usuário."); } else if (localDate > remoteDate) { const choice = askSyncChoice("Este dispositivo tem versão mais nova. Deseja enviar para a nuvem?", ["Enviar este dispositivo para a nuvem", "Cancelar"]); if (choice === "Enviar este dispositivo para a nuvem") await uploadSyncPayload(makeSyncPayload()); else renderSyncStatus("Sincronização cancelada pelo usuário."); } } catch (error) { recordCloudSyncError(error, "Erro ao sincronizar."); } }
function hasPendingLocalChanges(meta = readSyncMeta()) { return new Date(localDataUpdatedAt(meta) || 0) > new Date(meta.cloudDataUpdatedAt || meta.remoteUpdatedAt || 0); }
function handleCloudConflict(remote, contextMessage = "Existem dados mais recentes no Google Drive.") {
  const choice = askSyncChoice(contextMessage, ["Baixar versão da nuvem", "Cancelar"]);
  if (choice === "Baixar versão da nuvem") applyCloudPayload(remote);
  else renderSyncStatus("Atualização da nuvem cancelada pelo usuário.");
}
function hasLocalSyncPending(meta = readSyncMeta()) { return Boolean(meta.pendingSync || meta.localDirty || hasPendingLocalChanges(meta)); }
async function resolvePendingLocalSyncBeforeCloudDownload(meta = readSyncMeta()) {
  const choice = askSyncChoice("Existem alterações locais pendentes.", ["Baixar versão da nuvem", "Enviar este dispositivo para a nuvem", "Cancelar", "Fazer backup antes"]);
  if (choice === "Fazer backup antes") { exportBackup(); return "handled"; }
  if (choice === "Enviar este dispositivo para a nuvem") {
    await uploadSyncPayload(makeSyncPayload(), { statusMessage: "Alterações locais pendentes enviadas para a nuvem." });
    writeSyncMeta({ pendingSync: false, pendingSyncReason: null, lastAutoSyncAt: new Date().toISOString(), lastAutoSyncReason: meta.pendingSyncReason || "alteração", lastAutoSyncError: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", error: "" });
    renderSyncStatus("Alterações locais pendentes enviadas para a nuvem.");
    return "handled";
  }
  if (choice === "Baixar versão da nuvem") return "download";
  renderSyncStatus("Alterações locais pendentes mantidas neste dispositivo.");
  return "handled";
}
let cloudAutoCheckRunning = false;
let lastCloudAutoCheckAt = 0;
async function checkCloudForNewerVersion(context = "open") {
  if (!canRunAutoSyncChecks()) return;
  const meta = readSyncMeta();
  if (!meta.connected || !hasValidGoogleDriveAccessToken()) {
    if (context === "open") renderSyncStatus("Conecte ao Google Drive para verificar atualizações da nuvem.");
    return;
  }
  const now = Date.now();
  if (cloudAutoCheckRunning || now < suppressAutoCheckUntil || (context !== "open" && now - lastCloudAutoCheckAt < 5000)) return;
  cloudAutoCheckRunning = true;
  lastCloudAutoCheckAt = now;
  try {
    const hadPendingLocalChanges = hasLocalSyncPending(meta);
    const remote = await pullSyncPayload();
    const cloudDataUpdatedAt = syncPayloadUpdatedAt(remote);
    const remoteDate = new Date(cloudDataUpdatedAt || 0);
    const localDate = new Date(localDataUpdatedAt(readSyncMeta()) || 0);
    if (hadPendingLocalChanges && remote.deviceId !== getDeviceId()) {
      const pendingChoice = await resolvePendingLocalSyncBeforeCloudDownload(meta);
      if (pendingChoice === "download") applyCloudPayload(remote);
      return;
    }
    if (+remoteDate === +localDate) renderSyncStatus("Tudo sincronizado.");
    else if (remoteDate > localDate && remote.deviceId !== getDeviceId()) handleCloudConflict(remote, "Existem dados mais recentes no Google Drive.");
    else if (localDate > remoteDate) renderSyncStatus("Este dispositivo tem versão mais nova. Use Enviar para a nuvem para sincronizar.");
    else renderSyncStatus("Google Drive conectado e pronto para sincronizar.");
  } catch (error) {
    recordCloudSyncError(error, "Erro ao consultar a nuvem.");
  } finally {
    cloudAutoCheckRunning = false;
  }
}
async function checkCloudForUpdatesAfterAuth() { return checkCloudForNewerVersion("after-auth"); }
async function forcePullFromCloud() { if (!confirm("Baixar dados da nuvem e substituir os dados deste dispositivo? Um backup local automático será criado antes.")) return; try { applyCloudPayload(await pullSyncPayload()); } catch (error) { recordCloudSyncError(error, "Erro ao baixar."); } }
async function forcePushToCloud() { if (!confirm("Enviar o estado atual deste dispositivo para a nuvem?")) return; try { await uploadSyncPayload(makeSyncPayload()); } catch (error) { const message = syncErrorMessage(error, "Erro ao enviar."); writeSyncMeta({ error: message }); renderSyncStatus(message); } }
async function sendPendingSyncAfterConnect() {
  const meta = readSyncMeta();
  if (!meta.pendingSync) return false;
  if (!confirm("Existem alterações pendentes. Deseja enviar agora?")) {
    renderSyncStatus("Google Drive conectado. Envio pendente mantido.");
    return false;
  }
  try {
    await uploadSyncPayload(makeSyncPayload(), { statusMessage: "Alterações pendentes enviadas para a nuvem." });
    writeSyncMeta({ pendingSync: false, pendingSyncReason: "", lastAutoSyncAt: new Date().toISOString(), lastAutoSyncReason: meta.pendingSyncReason || "alteração", lastAutoSyncError: "", lastAutoSyncErrorAt: "", lastAutoSyncErrorReason: "", error: "" });
    renderSyncStatus("Alterações pendentes enviadas para a nuvem.");
    return true;
  } catch (error) {
    const message = syncErrorMessage(error, "Não foi possível enviar as alterações pendentes.");
    writeSyncMeta({ pendingSync: true, pendingSyncReason: meta.pendingSyncReason || "alteração", error: message });
    renderSyncStatus(message);
    return true;
  }
}
async function connectGoogleDrive() {
  if (!isGoogleClientConfigured()) {
    const message = googleClientConfigMessage();
    alert(message);
    writeSyncMeta({ connected: false, error: message });
    renderSyncStatus(message);
    return;
  }
  try {
    await getAccessToken({ prompt: hasValidGoogleDriveAccessToken() ? "" : "consent" });
    writeSyncMeta({ connected: true, error: "" });
    renderSyncStatus("Google Drive conectado e pronto para sincronizar.");
    await checkCloudForUpdatesAfterAuth();
  } catch (error) { const message = syncErrorMessage(error, "Erro ao conectar o Google Drive."); writeSyncMeta({ connected: false, error: message }); renderSyncStatus(message); }
}
function disconnectGoogleDrive() { clearGoogleDriveAccessToken(); writeSyncMeta({ connected: false, error: "" }); renderSyncStatus("Google Drive desconectado neste navegador."); }

function showStorageWarningIfNeeded() {
  if (!window.__METAS_STORAGE_ERROR__) return;
  const warning = document.createElement("div");
  warning.className = "storage-warning notice warning-notice";
  warning.innerHTML = `<strong>Aviso:</strong> encontramos dados corrompidos na chave <code>${escapeHTML(window.__METAS_STORAGE_ERROR__.key)}</code>. Você pode importar um backup, continuar com estado vazio ou limpar apenas a chave corrompida. <button type="button" data-storage-action="backup">Importar backup</button> <button type="button" data-storage-action="clear-corrupt">Limpar chave corrompida</button> <button type="button" data-storage-action="dismiss">Continuar</button>`;
  document.body.prepend(warning);
  warning.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.storageAction;
    if (!action) return;
    if (action === "backup") showView("backup");
    if (action === "clear-corrupt" && confirm("Limpar apenas a chave corrompida?")) localStorage.removeItem(window.__METAS_STORAGE_ERROR__.key);
    warning.remove();
  });
}
function getProjectStorageKeys() {
  const known = [STORAGE_KEY, SIMULADOS_STORAGE_KEY, CADERNO_ERROS_STORAGE_KEY, "cadernoErros", "syllabusItems", "editalVerticalizado", "edital_verticalizado", "assuntosAgendaveis", "metasDoDia", "dailyGoals"];
  return Object.keys(localStorage).filter((key) => ![DEVICE_ID_STORAGE_KEY, SYNC_META_STORAGE_KEY, "metasEstudoBackupAntesDaSincronizacao"].includes(key) && (known.includes(key) || key.toLowerCase().includes("metas") || key.toLowerCase().includes("edital")));
}
function backupCounts(source = state) {
  return {
    edital: source.edital && Object.values(source.edital).some(Boolean) ? 1 : 0,
    verticalizado: source.syllabusItems?.length || 0,
    agendaveis: source.syllabusItems?.filter((item) => {
      const setting = source.schedulableSettings?.[item.id] || {};
      return setting.availability === "Agendável" || acceptsSchedulableValue(item.agendavel) || acceptsSchedulableValue(item.schedulable) || acceptsSchedulableValue(item.importMeta?.agendavel) || Boolean(item.tipo_agendamento || item.importMeta?.tipo_agendamento);
    }).length || 0,
    disciplinas: source.subjects?.length || 0,
    metas: source.dailyGoals?.length || 0,
    questoes: source.questionLogs?.length || 0,
    revisoes: (source.studies?.length ? source.studies.length * 3 : 0) + (source.smartReviews?.length || 0),
    historico: source.studies?.length || 0,
    simulados: source.simulados?.length || 0,
    materiais: source.materials?.length || 0,
    fabrica: source.factoryAgenda?.length || source.factoryItems?.length || 0,
    bancoQuestoes: source.questionBank?.length || 0,
    treinosBanco: source.questionBankSessions?.length || 0,
    cadernoErros: source.questionErrorNotebook?.length || 0
  };
}
function renderBackupSummary() {
  if (!elements.backupSummary) return;
  const counts = backupCounts();
  const cards = [
    ["Itens do edital verticalizado", counts.verticalizado], ["Assuntos agendáveis", counts.agendaveis], ["Disciplinas", counts.disciplinas],
    ["Metas", counts.metas], ["Lançamentos de questões", counts.questoes], ["Banco de questões", counts.bancoQuestoes], ["Treinos do banco", counts.treinosBanco], ["Simulados", counts.simulados], ["Materiais", counts.materiais], ["Revisões previstas", counts.revisoes], ["Registros históricos", counts.historico], ["Agenda da Fábrica", counts.fabrica || 0], ["Prompts da Fábrica", Object.values(state.factoryPromptLibrary || {}).filter(Boolean).length]
  ];
  elements.lastBackupDate.textContent = state.settings?.lastBackupAt ? new Date(state.settings.lastBackupAt).toLocaleString("pt-BR") : "Nunca exportado";
  elements.backupStorageKeys.textContent = getProjectStorageKeys().length;
  elements.backupSummary.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}
function makeBackupPayload() {
  saveData();
  const keys = getProjectStorageKeys();
  const localStorageData = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  return { app: "metas-estudo", version: 2, exportedAt: new Date().toISOString(), storageKey: STORAGE_KEY, data: cloneData(state), progressData: progressMetrics(), forecastSettings: cloneData(state.planning?.config || {}), localStorage: localStorageData };
}
function backupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `backup-metas-estudo-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}.json`;
}
function exportBackup() {
  const payload = makeBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = backupFilename(); link.click(); URL.revokeObjectURL(link.href);
  state.settings ||= {}; state.settings.lastBackupAt = payload.exportedAt; saveData(); renderBackupSummary();
}
function normalizeBackupPayload(payload) {
  if (payload?.app === "metas-estudo" && payload.data) return payload;
  if (payload?.storageKey === STORAGE_KEY && payload.data) return { app: "metas-estudo", exportedAt: payload.exportedAt, data: payload.data, localStorage: payload.localStorage || {} };
  return { app: "metas-estudo", exportedAt: payload?.exportedAt || "Data não informada", data: payload, localStorage: {} };
}
function renderBackupPreview(payload) {
  const normalized = normalizeBackupPayload(payload); const counts = backupCounts(normalized.data || {});
  const disciplines = [...new Set([...(normalized.data.subjects || []).map((s) => s.name), ...(normalized.data.syllabusItems || []).map((i) => i.discipline)].filter(Boolean))].sort();
  const backupDate = normalized.exportedAt && !Number.isNaN(Date.parse(normalized.exportedAt)) ? new Date(normalized.exportedAt).toLocaleString("pt-BR") : "Não informada";
  elements.backupPreview.innerHTML = `<h3>Pré-visualização do backup selecionado</h3><div class="stats-grid compact backup-summary"><article class="stat-card"><span>Data do backup</span><strong class="stat-value-date">${escapeHTML(backupDate)}</strong></article><article class="stat-card"><span>Disciplinas</span><strong>${counts.disciplinas}</strong></article><article class="stat-card"><span>Assuntos</span><strong>${counts.verticalizado}</strong></article><article class="stat-card"><span>Metas</span><strong>${counts.metas}</strong></article><article class="stat-card"><span>Questões</span><strong>${counts.questoes}</strong></article><article class="stat-card"><span>Banco de questões</span><strong>${counts.bancoQuestoes}</strong></article><article class="stat-card"><span>Treinos do banco</span><strong>${counts.treinosBanco}</strong></article><article class="stat-card"><span>Simulados</span><strong>${counts.simulados}</strong></article><article class="stat-card"><span>Revisões</span><strong>${counts.revisoes}</strong></article></div><p class="item-meta"><strong>Disciplinas encontradas:</strong> ${disciplines.slice(0, 20).map(escapeHTML).join(", ") || "nenhuma"}${disciplines.length > 20 ? "..." : ""}</p><div class="actions"><button type="button" data-backup-import="replace" class="danger">Substituir dados atuais</button><button type="button" data-backup-import="merge" class="secondary-button">Mesclar com dados atuais</button><button type="button" data-backup-import="cancel">Cancelar</button></div>`;
  return normalized;
}
function replaceState(nextState) { Object.keys(state).forEach((key) => delete state[key]); Object.assign(state, { ...cloneData(defaultState), ...(nextState || {}) }); state.edital = { ...defaultState.edital, ...(state.edital || {}) }; state.syllabusItems ||= []; state.schedulableSettings ||= {}; state.dailyGoals ||= []; state.questionLogs ||= []; state.questionBank ||= []; state.questionBankSessions ||= []; state.questionErrorNotebook ||= carregarCadernoErros();
state.smartReviews ||= []; state.simulados ||= []; state.planning = normalizePlanningState(state.planning); state.settings ||= {}; state.settings.defaultMockGoal ||= 92; state.settings.timerPreferences = normalizeTimerPreferences(state.settings.timerPreferences); state.settings.timerMode ||= "countdown"; state.materials ||= []; state.factoryItems ||= []; state.factoryAgenda ||= []; state.factoryPromptLibrary = migrateFactoryPromptLibraryLeiRecorte({ ...cloneData(defaultFactoryPromptLibrary), ...(state.factoryPromptLibrary || {}) }); state.disciplineWeights ||= {}; state.monthlyGoals ||= {}; }
function mergeArrays(current = [], incoming = [], keyFn = (item) => item?.id || JSON.stringify(item)) { const seen = new Set(current.map(keyFn)); incoming.forEach((item) => { const key = keyFn(item); if (!seen.has(key)) { current.push(item); seen.add(key); } }); return current; }
function mergeBackupData(data = {}) {
  mergeArrays(state.subjects, data.subjects || [], (item) => canonical(item.name || item.id));
  mergeArrays(state.studies, data.studies || [], (item) => item.id || [item.date, item.subjectId, item.topic, item.minutes].join("|"));
  mergeArrays(state.syllabusItems, data.syllabusItems || [], (item) => item.importKey || importKeyFor(item));
  mergeArrays(state.dailyGoals, data.dailyGoals || [], (item) => item.id || [item.date, item.discipline, item.subject, item.type].join("|"));
  mergeArrays(state.questionLogs, data.questionLogs || [], (item) => item.id || [item.date, item.discipline, item.subject, item.total, item.correct, item.wrong].join("|"));
  mergeArrays(state.questionBank, data.questionBank || [], (item) => item.id);
  mergeArrays(state.questionBankSessions, data.questionBankSessions || [], (item) => item.id);
  mergeArrays(state.questionErrorNotebook, data.questionErrorNotebook || [], (item) => item.id);
  mergeArrays(state.smartReviews, data.smartReviews || data.revisoesInteligentes || [], (item) => item.id || [item.date, item.discipline, item.subject, item.status, item.origin].join("|"));
  mergeArrays(state.simulados, data.simulados || [], (item) => item.id || [item.date, item.name, item.total, item.correct, item.wrong].join("|"));
  mergeArrays(state.materials, data.materials || data.materiais || [], (item) => item.id || [item.title || item.titulo, item.discipline || item.disciplina, item.subject || item.assunto, item.link].join("|"));
  // mergeArrays(state.factoryAgenda, data.factoryAgenda || data.factoryItems) é mantido como referência de compatibilidade do backup da Fábrica.
  const incomingFactory = (data.factoryAgenda || data.factoryItems || data.fabricaResumos || []).map(normalizeFactoryItem);
  incomingFactory.forEach((incoming) => {
    const key = incoming.id || [incoming.disciplina, incoming.tema].join("|");
    const idx = state.factoryAgenda.findIndex((item) => (item.id || [item.disciplina || item.discipline, item.tema || item.theme].join("|")) === key);
    if (idx >= 0) state.factoryAgenda[idx] = normalizeFactoryItem({ ...state.factoryAgenda[idx], ...incoming, modules: { ...state.factoryAgenda[idx].modules, ...incoming.modules } });
    else state.factoryAgenda.push(incoming);
  });
  state.factoryItems = state.factoryAgenda;
  state.factoryAgenda = state.factoryAgenda.map(normalizeFactoryItem);
  state.factoryItems = state.factoryAgenda;
  state.factoryPromptLibrary = normalizeFactoryPromptLibrary(state.factoryPromptLibrary);
  const incomingFactoryPromptLibrary = normalizeFactoryPromptLibrary(data.factoryPromptLibrary || {});
  Object.entries(incomingFactoryPromptLibrary).forEach(([key, value]) => { if (value.trim()) state.factoryPromptLibrary[key] = value; });
  state.disciplineWeights = { ...(data.disciplineWeights || {}), ...state.disciplineWeights };
  state.monthlyGoals = { ...(data.monthlyGoals || {}), ...state.monthlyGoals };
  if (data.planning) state.planning = normalizePlanningState({ ...state.planning, ...data.planning, config: { ...state.planning.config, ...(data.planning.config || {}) }, availability: { ...(data.planning.availability || {}), ...state.planning.availability }, weeklyGoals: data.planning.weeklyGoals || state.planning.weeklyGoals, forecasts: { ...(data.planning.forecasts || {}), ...state.planning.forecasts } });
  state.edital = { ...(data.edital || {}), ...state.edital };
  state.schedulableSettings = { ...(data.schedulableSettings || {}), ...state.schedulableSettings };
  state.settings = { ...(data.settings || {}), ...state.settings };
}
function clearProjectLocalStorage() { getProjectStorageKeys().forEach((key) => localStorage.removeItem(key)); }
function restoreBackup(payload, mode) {
  if (mode === "replace") { clearProjectLocalStorage(); replaceState(payload.data); }
  if (mode === "merge") mergeBackupData(payload.data);
  render(); showView("backup"); elements.backupPreview.innerHTML += `<p class="notice">Backup ${mode === "replace" ? "substituído" : "mesclado"} com sucesso.</p>`; autoSyncAfterSave("backup-import");
}
async function handleBackupFile(file) {
  try {
    pendingBackupPayload = renderBackupPreview(JSON.parse(await file.text()));
  } catch (error) { console.error("Erro ao importar backup", error); alert("Não foi possível ler este arquivo JSON de backup."); }
}
function handleBackupImportChoice(action) {
  if (action === "cancel") { pendingBackupPayload = null; elements.backupPreview.innerHTML = ""; return; }
  if (!pendingBackupPayload) return alert("Selecione um arquivo de backup JSON antes de importar.");
  if (action === "replace" && !confirm("Substituir dados atuais? Apenas dados do projeto metas-estudo serão apagados antes da restauração.")) return;
  restoreBackup(pendingBackupPayload, action); pendingBackupPayload = null;
}
function clearAllLocalDataFromBackup() {
  if (!confirm("Tem certeza? Esta ação apagará os dados salvos neste navegador. Faça backup antes de continuar.")) return;
  clearProjectLocalStorage(); replaceState({}); render(); showView("backup");
}
function resetSyllabusQuestionStats() {
  (state.syllabusItems || []).forEach((item) => {
    item.questionsTotal = 0;
    item.questionsCorrect = 0;
    item.questionsWrong = 0;
    item.questionsBlank = 0;
    item.accuracyRate = 0;
    item.cebraspeNet = 0;
    item.lastTrainingDate = "";
  });
}
function resetSolvedQuestionsFromBackup() {
  if (!confirm("Zerar somente questões resolvidas, treinos do banco, caderno de erros e estatísticas de questões do edital?")) return;
  state.questionLogs = [];
  state.questionBankSessions = [];
  state.questionErrorNotebook = [];
  localStorage.removeItem(CADERNO_ERROS_STORAGE_KEY);
  resetSyllabusQuestionStats();
  saveData();
  render();
  showView("backup");
  elements.backupPreview.innerHTML = `<p class="notice">Questões resolvidas zeradas com sucesso.</p>`;
}
function showDailyGoalMessage(message, type = "info") {
  let box = document.getElementById("dailyGoalsMessage");
  if (!box) {
    box = document.createElement("div");
    box.id = "dailyGoalsMessage";
    box.className = "file-info empty-message";
    box.setAttribute("aria-live", "polite");
    elements.dailyGoalsList.before(box);
  }
  box.textContent = message;
  box.dataset.type = type;
}
function formatHours(minutes) { const hours = minutes / 60; return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`; }
function formatDateBR(dateString) {
  if (typeof dateString !== "string") return "-";
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "-";
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== Number(year) || parsed.getMonth() + 1 !== Number(month) || parsed.getDate() !== Number(day)) return "-";
  return `${day}/${month}/${year}`;
}
function isGoalDone(goal) { return goal.status === "Concluída"; }
function goalTotalActualMinutes(goal) { normalizeGoalTimeFields(goal); return Number(goal.actualMinutes) || 0; }
function isGoalInProgress(goal) { const done = goalTotalActualMinutes(goal); return !isGoalDone(goal) && !["Pendente", "Adiada", "Reagendada", "Não cumprida", "Ignorada"].includes(goal.status || "Pendente") && done > 0 || (!isGoalDone(goal) && done > 0 && !["Não cumprida", "Ignorada", "Adiada", "Reagendada"].includes(goal.status || "")); }
function goalProgressStats(goals, availability = { hours: 0 }) { const planned = goals.reduce((a,g)=>a+Number(g.minutes||0),0); const done = goals.reduce((a,g)=>a+goalTotalActualMinutes(g),0); const target = planned || Number(availability.hours || 0) * 60; const completed = goals.filter(isGoalDone).length; const pending = goals.filter((g)=>!isGoalDone(g) && !["Não cumprida", "Ignorada"].includes(g.status || "")).length; return { planned, done, target, remaining: Math.max(0, target - done), completed, pending, goalsPct: goals.length ? Math.round(completed / goals.length * 100) : 0, timePct: target ? Math.min(100, Math.round(done / target * 100)) : 0 }; }
function parseDate(dateString) { const [year, month, day] = dateString.split("-").map(Number); return new Date(year, month - 1, day); }
function addDays(dateString, days) { const date = parseDate(dateString); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function isSameWeek(dateString) { const now = new Date(); const date = parseDate(dateString); const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(now.getDate() - now.getDay()); const end = new Date(start); end.setDate(start.getDate() + 7); return date >= start && date < end; }
function createId() { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]); }
function subjectNameById(id) { return state.subjects.find((subject) => subject.id === id)?.name || "Disciplina removida"; }
function settingFor(id) { return state.schedulableSettings[id] ||= { availability: "Não agendável", mode: "Estudo teórico", priority: false }; }
function normalizeText(value) { return String(value ?? "").trim(); }

function normalizeMatchText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const DISCIPLINE_EQUIVALENCES = {
  "pecas para delegado": ["peca para delegado de policia civil"],
  "direito administrativo e gestao publica": ["direito administrativo"],
  "ciencias forenses": ["medicina legal"],
  "legislacao penal e processual penal extravagante": [
    "legislacao especifica - direito penal",
    "legislacao especifica - direito processual penal",
    "legislacao especifica - direito penal e processo penal",
    "legislacao especifica - direito processual penal e penal"
  ],
  "direito penal": ["direito penal"],
  "direito processual penal": ["direito processual penal"],
  "direito constitucional": ["direito constitucional"],
  "direitos humanos": ["direitos humanos"]
};

function disciplineMatchKeys(discipline) {
  const key = normalizeMatchText(discipline);
  return [...new Set([key, ...(DISCIPLINE_EQUIVALENCES[key] || []).map(normalizeMatchText)])].filter(Boolean);
}
function matchesDisciplineName(actual, incoming) { return disciplineMatchKeys(incoming).includes(normalizeMatchText(actual)); }
function existingSyllabusDisciplinesForIncoming(incoming) { return getSyllabusDisciplines().filter((discipline) => matchesDisciplineName(discipline, incoming)); }
function findSyllabusItemByIncidence(discipline, subject) {
  const subjectKey = normalizeMatchText(subject);
  if (!subjectKey) return null;
  return state.syllabusItems.find((item) => {
    if (!matchesDisciplineName(item.discipline, discipline)) return false;
    const itemSubjectKey = normalizeMatchText(item.subject);
    return itemSubjectKey === subjectKey || itemSubjectKey.includes(subjectKey) || subjectKey.includes(itemSubjectKey);
  });
}

function emptyIncidenceReport() {
  return { disciplinasAtualizadas: [], assuntosAtualizados: [], disciplinasNaoEncontradas: [], assuntosNaoEncontrados: [], emptySyllabus: false };
}
function applyIncidenceTable(rawText) {
  const report = emptyIncidenceReport();
  if (!state.syllabusItems.length) {
    report.emptySyllabus = true;
    return report;
  }
  state.disciplineWeights ||= {};
  String(rawText || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
    const [tipoRaw, disciplinaRaw, assuntoRaw, valorRaw, prioridadeRaw] = line.split(";").map((field) => field?.trim() || "");
    const tipo = normalizeMatchText(tipoRaw);
    if (!tipo || tipo === "tipo") return;
    const valor = Number(String(valorRaw).replace(",", "."));
    if (!Number.isFinite(valor)) return;
    if (tipo === "disciplina") {
      const disciplines = existingSyllabusDisciplinesForIncoming(disciplinaRaw);
      if (!disciplines.length) {
        report.disciplinasNaoEncontradas.push({ linha: index + 1, disciplina: disciplinaRaw, valor });
        return;
      }
      disciplines.forEach((discipline) => {
        state.disciplineWeights[discipline] = valor;
        report.disciplinasAtualizadas.push({ linha: index + 1, disciplina, valor });
      });
      return;
    }
    if (tipo === "assunto") {
      const item = findSyllabusItemByIncidence(disciplinaRaw, assuntoRaw);
      if (!item) {
        report.assuntosNaoEncontrados.push({ linha: index + 1, disciplina: disciplinaRaw, assunto: assuntoRaw, valor, prioridade: prioridadeRaw });
        return;
      }
      item.weight = normalizeSubjectIncidence(valor);
      item.priority = normalizeImportedPriority(prioridadeRaw);
      report.assuntosAtualizados.push({ linha: index + 1, disciplina: item.discipline, assunto: item.subject, valor: item.weight, prioridade: item.priority });
    }
  });
  return report;
}
function renderIncidenceReport(report) {
  if (!elements.incidenceTableResult || !report) return;
  if (report.emptySyllabus) {
    elements.incidenceTableResult.innerHTML = `<p class="notice">Não há edital verticalizado importado. Importe o edital antes de aplicar incidências.</p>`;
    return;
  }
  const notFound = [...report.disciplinasNaoEncontradas, ...report.assuntosNaoEncontrados];
  const shouldListNotFound = !report.assuntosAtualizados.length && !report.disciplinasAtualizadas.length && notFound.length;
  elements.incidenceTableResult.innerHTML = `<p class="notice">Incidências aplicadas: ${report.assuntosAtualizados.length} assuntos atualizados; ${report.disciplinasAtualizadas.length} disciplinas atualizadas; ${notFound.length} não encontrados.</p>${shouldListNotFound ? `<h4>Não encontrados</h4><ul>${notFound.map((item) => `<li>Linha ${item.linha}: ${escapeHTML(item.disciplina)}${item.assunto ? ` — ${escapeHTML(item.assunto)}` : ""}</li>`).join("")}</ul>` : ""}`;
}

function handleApplyIncidenceTable() {
  const report = applyIncidenceTable(elements.incidenceTableInput.value);
  saveData();
  render();
  renderIncidenceReport(report);
}

function importKeyFor(item) { return [item.discipline, item.topic, item.subject, item.subtopic, item.reference].map((value) => normalizeText(value).toLowerCase()).join("|"); }
function acceptsSchedulableValue(value) {
  if (value === 1 || value === true) return true;
  return ["true", "sim", "agendável", "agendavel", "1"].includes(String(value ?? "").trim().toLowerCase());
}
function isSchedulable(id) {
  const item = state.syllabusItems.find((entry) => entry.id === id);
  const setting = settingFor(id);
  return setting.availability === "Agendável"
    || acceptsSchedulableValue(item?.agendavel)
    || acceptsSchedulableValue(item?.schedulable)
    || acceptsSchedulableValue(item?.importMeta?.agendavel)
    || Boolean(item?.tipo_agendamento || item?.importMeta?.tipo_agendamento);
}
function isCompletedStatusValue(status) { return ["Concluído", "Concluido", "Estudado", "Dominado"].includes(String(status || "")); }
function completedStatus(item) { return isCompletedStatusValue(item.status); }
function normalizeProgressStatus(status) { const value = String(status || "").toLowerCase(); if (value.includes("conclu") || value === "estudado" || value === "dominado") return "Concluído"; if (value.includes("andamento") || value.includes("iniciado")) return "Iniciado"; if (value.includes("revis")) return "Revisado"; return "Não iniciado"; }

function canonical(value) { return normalizeText(value).toLowerCase(); }
function getSyllabusDisciplines() { return [...new Set(state.syllabusItems.map((item) => normalizeText(item.discipline)).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function getAllDisciplines() { return [...new Set([...state.subjects.map((subject) => normalizeText(subject.name)), ...getSyllabusDisciplines()].filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function subjectForDiscipline(discipline) { return state.subjects.find((subject) => canonical(subject.name) === canonical(discipline)); }
function ensureSubjectForDiscipline(discipline) {
  const name = normalizeText(discipline) || "Sem disciplina";
  const existing = subjectForDiscipline(name);
  if (existing) return existing;
  const subject = { id: createId(), name, goalHours: 0, importedFromSyllabus: true };
  state.subjects.push(subject);
  return subject;
}
function migrateImportedDisciplines() {
  state.syllabusItems.forEach((item) => {
    item.id ||= createId();
    item.discipline = normalizeText(item.discipline) || "Sem disciplina";
    item.topic = normalizeText(item.topic) || "Geral";
    item.subject = normalizeText(item.subject) || "Assunto";
    item.status = normalizeImportedStatus(item.status);
    item.priority = normalizeImportedPriority(item.priority);
    item.domain = normalizeImportedDomain(item.domain);
    item.importKey ||= importKeyFor(item);
    if (item.imported || item.importMeta?.imported) {
      item.imported = true;
      item.importMeta = { ...(item.importMeta || {}), imported: true };
    }
  });
  getSyllabusDisciplines().forEach(ensureSubjectForDiscipline);
}
function studiesForItem(item) {
  const disciplineSubject = subjectForDiscipline(item.discipline);
  const subjectIds = new Set([disciplineSubject?.id].filter(Boolean));
  return state.studies.filter((study) => (study.syllabusItemId === item.id) || (subjectIds.has(study.subjectId) && (!study.topic || canonical(study.topic).includes(canonical(item.subject)) || canonical(item.subject).includes(canonical(study.topic)))));
}
function goalsForItem(item) { return state.dailyGoals.filter((goal) => goal.syllabusItemId === item.id || (canonical(goal.discipline) === canonical(item.discipline) && canonical(goal.subject) === canonical(item.subject))); }
function minutesForItem(item) { return (Number(item.studyMinutes) || 0) + studiesForItem(item).reduce((s, study) => s + (Number(study.minutes) || 0), 0) + goalsForItem(item).reduce((s, goal) => s + goalTotalActualMinutes(goal), 0) + questionLogsForItem(item).reduce((s, log) => s + (Number(log.minutes) || 0), 0); }
function hasCompletedGoal(item) { return goalsForItem(item).some((goal) => goal.status === "Concluída"); }
function isTopicStudied(item) { return completedStatus(item) || minutesForItem(item) > 0 || hasCompletedGoal(item); }
function isTopicStarted(item) { return minutesForItem(item) > 0 && !completedStatus(item); }
function isTopicReviewed(item) { return normalizeProgressStatus(item.status) === "Revisado" || Boolean(item.reviewed || item.lastReviewedAt); }
function questionLogsForItem(item) { return state.questionLogs.filter((log) => log.syllabusItemId === item.id || (canonical(log.discipline) === canonical(item.discipline) && canonical(log.subject) === canonical(item.subject))); }
function hasDiagnosis(item) {
  if (["Em andamento", "Estudado", "Revisar", "Dominado"].includes(item.status)) return true;
  if (item.reviewed || item.lastReviewedAt) return true;
  return studiesForItem(item).some((study) => study.minutes > 0 || study.questions > 0) || questionLogsForItem(item).some((log) => log.total > 0);
}
function isUndiagnosed(item) { return !hasDiagnosis(item); }
function itemPerformance(item) {
  const studyTotals = studiesForItem(item).reduce((acc, study) => ({ questions: acc.questions + (study.questions || 0), correct: acc.correct + (study.correct || 0), wrong: acc.wrong + (study.wrong || 0), blank: acc.blank + (study.blank || 0) }), { questions: 0, correct: 0, wrong: 0, blank: 0 });
  return questionLogsForItem(item).reduce((acc, log) => ({ questions: acc.questions + (log.total || 0), correct: acc.correct + (log.correct || 0), wrong: acc.wrong + (log.wrong || 0), blank: acc.blank + (log.blank || 0) }), studyTotals);
}
function isWeakItem(item) {
  if (item.manualWeak) return true;
  if (isUndiagnosed(item)) return false;
  const performance = itemPerformance(item);
  const answered = performance.correct + performance.wrong;
  const accuracy = answered ? performance.correct / answered : 1;
  const cebraspeNet = performance.correct - performance.wrong;
  return item.domain === "Fraco" || (answered > 0 && accuracy < 0.7) || (performance.wrong >= 3 && performance.wrong > performance.correct) || (performance.questions >= 5 && cebraspeNet <= 0);
}
function setItemStatus(id, status) { const item = state.syllabusItems.find((entry) => entry.id === id); if (item) { item.status = status; render(); } }
function setItemDomain(id, domain, manualWeak = false) { const item = state.syllabusItems.find((entry) => entry.id === id); if (item) { item.domain = domain; item.manualWeak = manualWeak || item.manualWeak; render(); } }
function toggleItemSchedulable(id) { const setting = settingFor(id); setting.availability = setting.availability === "Agendável" ? "Não agendável" : "Agendável"; render(); }
function editSyllabusItem(id) {
  const item = state.syllabusItems.find((entry) => entry.id === id);
  if (!item) return;
  elements.itemDiscipline.value = item.discipline; elements.itemTopic.value = item.topic; elements.itemSubject.value = item.subject; elements.itemSubtopic.value = item.subtopic || ""; elements.itemReference.value = item.reference || ""; elements.itemPriority.value = item.priority; elements.itemWeight.value = normalizeSubjectIncidence(item.weight); elements.itemStatus.value = item.status; elements.itemDomain.value = item.domain; elements.itemNotes.value = item.notes || "";
  editingSyllabusId = id;
  showView("edital-verticalizado");
}


function normalizeSubjectIncidence(value) {
  const incidence = Math.round(Number(value));
  return incidence >= 1 && incidence <= 5 ? incidence : 3;
}
function subjectIncidenceLabel(value) {
  return ({ 1: "Baixíssima", 2: "Baixa", 3: "Média", 4: "Alta", 5: "Altíssima" })[normalizeSubjectIncidence(value)];
}
function subjectIncidenceOptions(value) {
  const current = normalizeSubjectIncidence(value);
  return [1, 2, 3, 4, 5].map((level) => `<option value="${level}" ${current === level ? "selected" : ""}>${level} = ${subjectIncidenceLabel(level)}</option>`).join("");
}

function normalizeImportedStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["concluído", "concluido"].includes(normalized)) return "Estudado";
  const allowed = ["Não iniciado", "Em andamento", "Estudado", "Revisar", "Dominado", "Ignorado"];
  return allowed.find((item) => item.toLowerCase() === normalized) || "Não iniciado";
}
function normalizeImportedPriority(value) { const allowed = ["Altíssima", "Muito alta", "Alta", "Média", "Baixa", "Baixíssima"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Média"; }
function normalizeImportedDomain(value) { const allowed = ["Sem diagnóstico", "Não avaliado", "Fraco", "Médio", "Forte"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Sem diagnóstico"; }
function isTruthyImportValue(value) { if (value === undefined || value === null || value === "") return true; return [true, "true", "sim", "s", "1", "agendável", "agendavel", "yes", "y"].includes(typeof value === "string" ? value.trim().toLowerCase() : value); }
function normalizeImportPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.itens)) return payload.itens;
  if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
  return null;
}
function resetImportDraft(message = "") {
  importDraft = [];
  elements.importMessage.innerHTML = message;
  renderImportPreview();
}
function showImportError(message, error) {
  console.error(message, error);
  resetImportDraft(message);
}
function normalizeImportedMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = ["Revisão apenas", "Questões apenas", "Estudo teórico", "Estudo + questões"];
  return allowed.find((item) => item.toLowerCase() === normalized) || "Estudo + questões";
}
function importedItemToSyllabus(raw) {
  raw ||= {};
  const id = createId();
  const discipline = String(raw.disciplina || "Sem disciplina").trim() || "Sem disciplina";
  const subject = String(raw.assunto || raw.referencia_edital || "Assunto").trim() || "Assunto";
  const topic = String(raw.eixo || raw.nivel || "Geral").trim() || "Geral";
  const notesParts = [raw.observacoes, raw.fonte ? `Fonte: ${raw.fonte}` : "", raw.concurso ? `Concurso: ${raw.concurso}` : "", raw.banca ? `Banca: ${raw.banca}` : "", raw.cargo ? `Cargo: ${raw.cargo}` : "", raw.parent_referencia ? `Referência pai: ${raw.parent_referencia}` : ""].filter(Boolean);
  return {
    id,
    discipline,
    topic,
    subject,
    subtopic: String(raw.nivel || "").trim(),
    reference: String(raw.referencia_edital || "").trim(),
    priority: normalizeImportedPriority(raw.prioridade),
    weight: normalizeSubjectIncidence(raw.peso ?? raw.weight),
    status: normalizeImportedStatus(raw.status),
    domain: normalizeImportedDomain(raw.dominio || raw.domain || raw.diagnostico),
    notes: notesParts.join(" • "),
    imported: true,
    importKey: "",
    importMeta: {
      concurso: raw.concurso || "", banca: raw.banca || "", cargo: raw.cargo || "", eixo: raw.eixo || "", parent_referencia: raw.parent_referencia || "", fonte: raw.fonte || "",
      agendavel: isTruthyImportValue(raw.agendavel), tipo_agendamento: normalizeImportedMode(raw.tipo_agendamento), imported: true
    }
  };
}
function prepareImportedItem(raw) { const item = importedItemToSyllabus(raw); item.importKey = importKeyFor(item); return item; }
function validRawImportItemsFromPayload(payload) {
  const rawItems = normalizeImportPayload(payload);
  if (!rawItems) throw new Error("Formato esperado: array direto ou objeto com propriedade itens.");
  const validRawItems = rawItems.filter((item) => item && typeof item === "object" && !Array.isArray(item));
  if (!validRawItems.length) throw new Error("Nenhum item encontrado no JSON.");
  return validRawItems;
}
function applyImportedSyllabusReplacement(items) {
  const importedIds = new Set((state.syllabusItems || []).filter(isImportedSyllabusItem).map((item) => item.id));
  state.syllabusItems = (state.syllabusItems || []).filter((item) => !isImportedSyllabusItem(item));
  importedIds.forEach((id) => delete state.schedulableSettings[id]);
  state.syllabusItems.push(...items);
  items.forEach((item) => {
    state.schedulableSettings[item.id] = { availability: item.importMeta.agendavel ? "Agendável" : "Não agendável", mode: item.importMeta.tipo_agendamento || "Estudo + questões", priority: item.priority === "Alta" };
  });
}
async function replaceImportedSyllabusFromSelectedJson() {
  const file = elements.jsonImportFile.files?.[0];
  if (!file) {
    elements.importMessage.innerHTML = "Selecione um arquivo JSON no campo Arquivo JSON.";
    return;
  }
  try {
    const payload = JSON.parse(await file.text());
    const items = validRawImportItemsFromPayload(payload).map(prepareImportedItem);
    applyImportedSyllabusReplacement(items);
    const disciplines = new Set(items.map((item) => item.discipline).filter(Boolean));
    saveData();
    render();
    elements.importMessage.innerHTML = `Edital substituído com ${items.length} itens e ${disciplines.size} disciplinas.`;
  } catch (error) {
    console.error("Falha ao substituir edital pelo JSON selecionado.", error);
    elements.importMessage.innerHTML = `Falha ao substituir edital: ${escapeHTML(error.message)}`;
  }
}
function getFilteredImportItems() { return importDraft.filter((item) => (!elements.importFilterDiscipline.value || item.discipline === elements.importFilterDiscipline.value) && (!elements.importFilterStatus.value || item.status === elements.importFilterStatus.value) && (!elements.importFilterPriority.value || item.priority === elements.importFilterPriority.value) && (!elements.importFilterDomain.value || item.domain === elements.importFilterDomain.value)); }
function renderImportFilters() {
  [[elements.importFilterDiscipline, importDraft.map((item) => item.discipline), "Todas"], [elements.importFilterStatus, importDraft.map((item) => item.status), "Todos"], [elements.importFilterPriority, importDraft.map((item) => item.priority), "Todas"], [elements.importFilterDomain, importDraft.map((item) => item.domain), "Todos"]].forEach(([select, values, label]) => {
    const current = select.value; const options = [...new Set(values.filter(Boolean))].sort(); select.innerHTML = `<option value="">${label}</option>` + options.map((value) => `<option ${value === current ? "selected" : ""}>${escapeHTML(value)}</option>`).join("");
  });
}
function isImportedSyllabusItem(item) { return Boolean(item?.imported || item?.importMeta?.imported); }
function importedSyllabusGroupName(item) {
  const concurso = String(item?.importMeta?.concurso || "").trim();
  if (concurso) return concurso;
  const fonte = String(item?.importMeta?.fonte || "").trim();
  if (fonte) return fonte;
  const notesFonte = String(item?.notes || "").match(/Fonte:\s*([^•\n]+)/i)?.[1]?.trim();
  return notesFonte || "Edital importado sem identificação";
}
function importedSyllabusGroupKey(item) { return importedSyllabusGroupName(item).toLocaleLowerCase("pt-BR"); }
function getImportedSyllabusGroups() {
  const groups = new Map();
  (state.syllabusItems || []).filter(isImportedSyllabusItem).forEach((item) => {
    const name = importedSyllabusGroupName(item);
    const key = importedSyllabusGroupKey(item);
    if (!groups.has(key)) groups.set(key, { key, name, items: [], disciplines: new Set() });
    const group = groups.get(key);
    group.items.push(item);
    if (item.discipline) group.disciplines.add(item.discipline);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
function renderImportedSyllabusGroups() {
  if (!elements.importedSyllabusGroups) return;
  const groups = getImportedSyllabusGroups();
  elements.importedSyllabusGroups.innerHTML = `<h3>Gerenciar editais importados</h3><p class="item-meta">Exclua apenas um edital específico abaixo. O botão de limpeza geral remove todos os editais importados.</p>` + (groups.length ? `<div class="cards-list">${groups.map((group) => `<article class="syllabus-card imported-group-card"><header><div><h4>${escapeHTML(group.name)}</h4><div class="item-meta">${group.items.length} item(ns) • ${group.disciplines.size} disciplina(s)</div></div><button class="danger" type="button" data-delete-imported-group="${escapeHTML(group.key)}">Excluir este edital</button></header></article>`).join("")}</div>` : `<p class="empty-message">Nenhum edital importado encontrado.</p>`);
}
function cleanupOrphanImportedSubjects(removedDisciplineNames = new Set()) {
  const removedNames = new Set([...removedDisciplineNames].map(canonical).filter(Boolean));
  if (!removedNames.size) return;
  const remainingDisciplines = new Set((state.syllabusItems || []).map((item) => canonical(item.discipline)).filter(Boolean));
  const studiedSubjectIds = new Set((state.studies || []).map((study) => study.subjectId).filter(Boolean));
  state.subjects = (state.subjects || []).filter((subject) => {
    const subjectName = canonical(subject.name);
    const canRemove = subject.importedFromSyllabus === true
      && removedNames.has(subjectName)
      && !remainingDisciplines.has(subjectName)
      && !studiedSubjectIds.has(subject.id);
    return !canRemove;
  });
}
function cleanupDisciplineWeights(removedDisciplineNames = new Set()) {
  const removedNames = new Set([...removedDisciplineNames].map(canonical).filter(Boolean));
  if (!removedNames.size || !state.disciplineWeights) return;
  const remainingDisciplines = new Set((state.syllabusItems || []).map((item) => canonical(item.discipline)).filter(Boolean));
  Object.keys(state.disciplineWeights).forEach((discipline) => {
    const normalized = canonical(discipline);
    if (removedNames.has(normalized) && !remainingDisciplines.has(normalized)) delete state.disciplineWeights[discipline];
  });
}
function deleteSyllabusItem(id) {
  const item = getSyllabusById(id);
  if (!item) return alert("Assunto não encontrado.");
  if (!confirm("Excluir este assunto do Edital Verticalizado? Histórico, questões, simulados, materiais e planejamento serão preservados.")) return;
  const removedDisciplineNames = new Set([item.discipline].map(normalizeText).filter(Boolean));
  state.syllabusItems = state.syllabusItems.filter((entry) => entry.id !== id);
  delete state.schedulableSettings[id];
  cleanupOrphanImportedSubjects(removedDisciplineNames);
  cleanupDisciplineWeights(removedDisciplineNames);
  saveData();
  render();
}
function deleteOrphanSubjectDiscipline(disciplineName) {
  const normalizedDiscipline = canonical(disciplineName);
  const matchingSubjects = (state.subjects || []).filter((subject) => canonical(subject.name) === normalizedDiscipline);

  if (!matchingSubjects.length) {
    alert("Disciplina não encontrada.");
    return false;
  }

  const studiedSubjectIds = new Set((state.studies || []).map((study) => study.subjectId).filter(Boolean));
  const hasStudies = matchingSubjects.some((subject) => studiedSubjectIds.has(subject.id));
  const hasManual = matchingSubjects.some((subject) => subject.importedFromSyllabus !== true);
  const removableSubjects = matchingSubjects.filter((subject) => subject.importedFromSyllabus === true && !studiedSubjectIds.has(subject.id));

  if (hasStudies) {
    alert("Esta disciplina possui estudos registrados. Para preservar o histórico, ela não foi removida.");
    return false;
  }

  if (hasManual && !removableSubjects.length) {
    alert("Esta disciplina é manual. Para preservar seus dados, ela não foi removida automaticamente.");
    return false;
  }

  if (!removableSubjects.length) {
    alert("Nenhuma disciplina automática órfã foi encontrada para remover.");
    return false;
  }

  if (!confirm("Esta disciplina não possui mais assuntos no edital. Excluir a disciplina automática órfã?")) return false;

  const removableIds = new Set(removableSubjects.map((subject) => subject.id));
  state.subjects = state.subjects.filter((subject) => !removableIds.has(subject.id));

  if (state.disciplineWeights) {
    Object.keys(state.disciplineWeights).forEach((discipline) => {
      if (canonical(discipline) === normalizedDiscipline) delete state.disciplineWeights[discipline];
    });
  }

  saveData();
  render();
  alert("Disciplina automática órfã excluída com sucesso.");
  return true;
}
function deleteDisciplineFromSyllabus(disciplineName) {
  const normalizedDiscipline = canonical(disciplineName);
  if (!normalizedDiscipline) return alert("Disciplina não encontrada.");

  const removedItems = (state.syllabusItems || []).filter((item) => canonical(item.discipline) === normalizedDiscipline);

  if (!removedItems.length) {
    return deleteOrphanSubjectDiscipline(disciplineName);
  }

  if (!confirm("Excluir esta disciplina do edital? Os assuntos vinculados serão removidos, mas histórico, questões, simulados, materiais e planejamento serão preservados.")) return;

  removedItems.forEach((item) => delete state.schedulableSettings[item.id]);
  state.syllabusItems = state.syllabusItems.filter((item) => canonical(item.discipline) !== normalizedDiscipline);

  const removedDisciplineNames = new Set([disciplineName].map(normalizeText).filter(Boolean));
  cleanupOrphanImportedSubjects(removedDisciplineNames);
  cleanupDisciplineWeights(removedDisciplineNames);

  saveData();
  render();
}
function deleteImportedSyllabusGroup(groupKey) {
  const group = getImportedSyllabusGroups().find((entry) => entry.key === groupKey);
  if (!group) return alert("Edital importado não encontrado.");
  if (!confirm(`Excluir somente o edital "${group.name}"? Disciplinas manuais, metas, materiais, simulados, banco de questões, histórico e planejamento serão preservados.`)) return;
  const itemIds = new Set(group.items.map((item) => item.id));
  const removedDisciplineNames = new Set(group.items.map((item) => normalizeText(item.discipline)).filter(Boolean));
  itemIds.forEach((id) => delete state.schedulableSettings[id]);
  state.syllabusItems = state.syllabusItems.filter((item) => !itemIds.has(item.id));
  cleanupOrphanImportedSubjects(removedDisciplineNames);
  cleanupDisciplineWeights(removedDisciplineNames);
  saveData();
  render();
  elements.importMessage.innerHTML = "Edital excluído com sucesso. Disciplinas automáticas sem uso também foram removidas.";
}

function renderImportPreview() {
  renderImportedSyllabusGroups();
  renderImportFilters();
  const filtered = getFilteredImportItems();
  elements.importDisciplineTotal.textContent = new Set(importDraft.map((item) => item.discipline)).size;
  elements.importSubjectTotal.textContent = importDraft.length;
  elements.importJsonButton.disabled = !importDraft.length;
  const disciplines = [...new Set(importDraft.map((item) => item.discipline).filter(Boolean))].sort();
  elements.importDisciplineList.innerHTML = disciplines.length ? `<h3>Disciplinas identificadas</h3><div class="tag-list">${disciplines.map((discipline) => `<span>${escapeHTML(discipline)}</span>`).join("")}</div>` : "";
  const previewItems = filtered.slice(0, 10);
  elements.importPreview.innerHTML = previewItems.length ? `<p class="item-meta">Exemplo dos primeiros itens importados${filtered.length > previewItems.length ? ` (${previewItems.length} de ${filtered.length} filtrados)` : ""}.</p><table><thead><tr><th>Disciplina</th><th>Eixo/Tópico</th><th>Assunto</th><th>Referência</th><th>Status</th><th>Prioridade</th><th>Domínio</th><th>Agendável</th></tr></thead><tbody>${previewItems.map((item) => `<tr><td>${escapeHTML(item.discipline)}</td><td>${escapeHTML(item.topic)}</td><td>${escapeHTML(item.subject)}</td><td>${escapeHTML(item.reference || "-")}</td><td>${escapeHTML(item.status)}</td><td>${escapeHTML(item.priority)}</td><td>${escapeHTML(item.domain)}</td><td>${item.importMeta.agendavel ? "Sim" : "Não"}</td></tr>`).join("")}</tbody></table>` : "";
}

function renderSubjects() {
  migrateImportedDisciplines();
  const disciplines = getAllDisciplines();
  elements.subjectList.innerHTML = "";
  elements.studySubject.innerHTML = disciplines.length ? "" : '<option value="">Cadastre ou importe uma disciplina</option>';
  elements.disciplineOptions.innerHTML = disciplines.map((discipline) => `<option value="${escapeHTML(discipline)}"></option>`).join("");
  disciplines.forEach((discipline) => {
    const subject = ensureSubjectForDiscipline(discipline);
    const option = document.createElement("option"); option.value = subject.id; option.textContent = subject.name; elements.studySubject.appendChild(option);
    const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0);
    const imported = getSyllabusDisciplines().some((name) => canonical(name) === canonical(subject.name));
    const li = document.createElement("li"); li.className = "subject-item"; li.innerHTML = `<div><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">${imported ? "Disciplina do edital importado • " : ""}Meta: ${subject.goalHours}h/semana • Atual: ${formatHours(weeklyMinutes)}</div></div><div class="card-actions"><span class="badge">${Math.min(100, Math.round((weeklyMinutes / (subject.goalHours * 60 || 1)) * 100))}%</span><button class="danger" type="button" data-delete-discipline="${escapeHTML(subject.name)}">Excluir disciplina</button></div>`; elements.subjectList.appendChild(li);
  });
}

function planningConfig() { return state.planning.config; }
function availabilityDefaults(type) { const c = planningConfig(); return { "plantão": c.shiftHours, "folga": c.restHours, "dia normal": c.normalHours, "indisponível": 0, "estudo leve": Math.max(1, c.normalHours / 2), "estudo forte": Math.max(c.restHours, c.normalHours * 1.5) }[type] ?? c.normalHours; }
const SCALE_3X6_LABELS = ["Trabalho dia 1", "Trabalho dia 2", "Trabalho dia 3", "Folga dia 1", "Folga dia 2", "Folga dia 3", "Folga dia 4", "Folga dia 5", "Folga dia 6"];
function daysDiff(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
function scale3x6Info(date) {
  const c = planningConfig();
  if (c.scaleType !== "3 dias de trabalho / 6 dias de folga" || !c.scaleReferenceDate) return null;
  const pos = ((Number(c.scaleReferencePosition) + daysDiff(date, c.scaleReferenceDate)) % 9 + 9) % 9;
  const work = pos <= 2;
  return { position: pos, label: SCALE_3X6_LABELS[pos], type: work ? "plantão" : "folga", hours: availabilityDefaults(work ? "plantão" : "folga") };
}
function availabilityForDate(date) { const existing = state.planning.availability[date]; if (existing) return existing; const scale = scale3x6Info(date); if (scale) return { type: scale.type, label: scale.label, hours: scale.hours, scalePosition: scale.position }; return { type: "dia normal", label: "Normal", hours: availabilityDefaults("dia normal") }; }
function dayTypeLabel(av) { return av.label || ({"plantão":"Plantão","folga":"Folga","dia normal":"Normal","indisponível":"Indisponível"}[av.type] || av.type || "Normal"); }
function nextDateByType(type) { for (let i=0;i<60;i++){ const d=addDays(todayISO(), i); if (availabilityForDate(d).type===type) return d; } return ""; }
function periodSummary(start, days) { const dates=daysBetween(start, days), goals=goalsBetween(start, addDays(start, days-1)); const planned=goals.reduce((a,g)=>a+Number(g.minutes||0),0); const done=goals.reduce((a,g)=>a+goalTotalActualMinutes(g),0); return { dates, goals, planned, done, pending: goals.filter(g=>!isGoalDone(g)).length, completed: goals.filter(isGoalDone).length, disciplines: new Set(goals.map(g=>g.discipline)).size, percent: planned ? Math.min(100, Math.round(done/planned*100)) : completionRate(goals), subjects: goals.length }; }


function studyOriginLabel(study) {
  return ({ manual: "manual", countdown: "cronômetro regressivo", free: "cronômetro livre" }[study.origin]) || "registro geral";
}
const FACTORY_STATUSES = ["Não iniciado","Em produção","Aguardando revisão","Aprovado","PDF gerado","Não se aplica","Precisa refazer","Atualizar depois"];
const FACTORY_TRIAGEM_STATUSES = ["Não iniciada", "Em andamento", "Concluída", "Precisa refazer"];
const FACTORY_MODULES = [
  { key: "triagem", label: "TRIAGEM", virtual: true },
  { key: "resumoAula", label: "RESUMO/AULA" },
  { key: "lei", label: "LEI" },
  { key: "jurisprudencia", label: "JURISPRUDÊNCIA" },
  { key: "peca", label: "PEÇA" },
  { key: "completo", label: "COMPLETO" }
];


const FACTORY_DRIVE_UPLOAD_INSTRUCTIONS = `FLUXO OBRIGATÓRIO DE GRAVAÇÃO NO GOOGLE DRIVE:
- Depois de gerar o arquivo DOCX, confirme que ele foi realmente criado antes de tentar gravar.
- Após gerar o arquivo DOCX, tente gravá-lo no Google Drive utilizando a ação apropriada de importação de documento. Envie o arquivo gerado como referência de arquivo aceita pelo conector e preserve seu formato original. Não envie caminho local bruto para uma ação que exija \`file_uri\`. Após a importação, mova o arquivo para a pasta de destino informada. Somente declare que a gravação foi concluída depois de receber confirmação do Google Drive e obter o link do arquivo.
- Para Word/DOCX, utilize o fluxo equivalente a: importar o DOCX pela ação de documento; source_file = arquivo local gerado e reconhecido pelo runtime; upload_mode = keep_source_file_type; preservar como DOCX, sem converter automaticamente em Google Docs; obter o ID do arquivo criado; extrair o ID da pasta a partir do link salvo em factoryDestinationFolder; mover o arquivo criado para o ID da pasta de destino; obter e devolver o link final exato do arquivo no Google Drive.
- Para PDF, utilize uma ação de upload que aceite uma referência de arquivo produzida pelo runtime. Nunca passe diretamente uma string como /mnt/data/nome-do-arquivo.pdf para um parâmetro que exija referência estruturada file_uri.
- Não repita indefinidamente a mesma ação quando o conector recusar a referência do arquivo. Se não for possível obter uma referência de arquivo aceita pelo conector, não afirme que houve salvamento: disponibilize o arquivo para download e informe objetivamente que o upload manual ainda é necessário.

FORMATO FINAL DA RESPOSTA QUANDO O UPLOAD FUNCIONAR:
ARQUIVO GERADO E SALVO

Módulo: [nome do módulo]
Formato: Word
Nome: [nome do arquivo]
Pasta de destino: [link da pasta]
Link do arquivo: [link exato do arquivo no Google Drive]
Status da gravação: concluída

FORMATO FINAL DA RESPOSTA QUANDO NÃO FUNCIONAR:
ARQUIVO GERADO, MAS NÃO SALVO NO DRIVE

Módulo: [nome do módulo]
Formato: Word
Nome: [nome do arquivo]
Motivo: [erro objetivo]
Providência: upload manual necessário`;

const FACTORY_PROMPT_TYPES = [
  { key: "triagem", label: "Gerar prompt de triagem" },
  { key: "resumoAula", label: "Gerar prompt Resumo/Aula" },
  { key: "lei", label: "Gerar prompt Lei" },
  { key: "jurisprudencia", label: "Gerar prompt Jurisprudência" },
  { key: "peca", label: "Gerar prompt Peça" },
  { key: "consolidacao", label: "Gerar prompt Consolidação Final" }
];
function factorySourceFolderLink(item = {}) {
  const leiModule = normalizeFactoryModule(item.modules?.lei || {}, item);
  return String(leiModule.leiFonte || "").trim();
}
function factorySourceFolderBlock(item = {}) {
  return `PASTA DAS FONTES NO GOOGLE DRIVE:
${factorySourceFolderLink(item) || "[LINK DAS FONTES NÃO PREENCHIDO — INFORMAR A PASTA DO GOOGLE DRIVE ANTES DE EXECUTAR]"}`;
}
function factoryDestinationFolderLink(item = {}) {
  return String(item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder || item.finalFilesFolder || "").trim();
}
function factoryDestinationFolderBlock(item = {}) {
  return `PASTA DE DESTINO DOS ARQUIVOS GERADOS NESTA ETAPA:
${factoryDestinationFolderLink(item) || "Pasta de destino não preenchida. O arquivo poderá ser gerado, mas não haverá indicação automática de onde deverá ser salvo."}

A pasta acima é somente o destino de gravação. Não trate este link como arquivo individual.`;
}
function factoryPromptContext(item = {}) {
  return `Disciplina: ${item.disciplina || "[DISCIPLINA]"}
Tema: ${item.tema || "[TEMA]"}
${factorySourceFolderBlock(item)}

${factoryDestinationFolderBlock(item)}`;
}
function migrateFactoryPromptLibraryLeiRecorte(library = {}) {
  const normalized = { ...library };
  if (typeof normalized.lei === "string" && normalized.lei.includes(OLD_LEI_RECORTE_PROMPT)) {
    normalized.lei = normalized.lei.split(OLD_LEI_RECORTE_PROMPT).join(NEW_LEI_RECORTE_PROMPT);
  }
  return normalized;
}
function migrateStateFactoryPromptLibraryResumoAulaDidatica(targetState = state) {
  targetState.migrations ||= {};
  targetState.factoryPromptLibrary = migrateFactoryPromptLibraryLeiRecorte({
    ...cloneData(defaultFactoryPromptLibrary),
    ...(targetState.factoryPromptLibrary || {})
  });
  if (targetState.migrations[FACTORY_RESUMO_AULA_MIGRATION_ID]) return false;
  targetState.factoryPromptLibrary.resumoAula = FACTORY_RESUMO_AULA_PROMPT;
  targetState.migrations[FACTORY_RESUMO_AULA_MIGRATION_ID] = new Date().toISOString();
  return true;
}
function migrateStateFactoryPromptLibraryResumoAulaRemoverDuplicacao(targetState = state) {
  targetState.migrations ||= {};
  targetState.factoryPromptLibrary = migrateFactoryPromptLibraryLeiRecorte({
    ...cloneData(defaultFactoryPromptLibrary),
    ...(targetState.factoryPromptLibrary || {})
  });
  if (targetState.migrations[FACTORY_RESUMO_AULA_DUPLICATION_MIGRATION_ID]) return false;
  const duplicatedResumoAulaPrompt = `${FACTORY_RESUMO_AULA_PROMPT_SEGMENT}${FACTORY_RESUMO_AULA_PROMPT_SEGMENT}`;
  if (targetState.factoryPromptLibrary.resumoAula === duplicatedResumoAulaPrompt) {
    targetState.factoryPromptLibrary.resumoAula = FACTORY_RESUMO_AULA_PROMPT_SEGMENT;
  }
  targetState.migrations[FACTORY_RESUMO_AULA_DUPLICATION_MIGRATION_ID] = new Date().toISOString();
  return true;
}

function migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(targetState = state) {
  targetState.migrations ||= {};
  targetState.factoryPromptLibrary = migrateFactoryPromptLibraryLeiRecorte({
    ...cloneData(defaultFactoryPromptLibrary),
    ...(targetState.factoryPromptLibrary || {})
  });
  if (targetState.migrations[FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID]) return false;
  const currentPecaPrompt = String(targetState.factoryPromptLibrary.peca || "");
  const shouldUpdatePecaPrompt = !currentPecaPrompt.trim() || currentPecaPrompt === FACTORY_PECA_PREVIOUS_PROMPT || currentPecaPrompt === FACTORY_LIBRARY_FALLBACK;
  if (shouldUpdatePecaPrompt) {
    targetState.factoryPromptLibrary.peca = FACTORY_PECA_PROMPT;
  }
  targetState.migrations[FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID] = new Date().toISOString();
  return shouldUpdatePecaPrompt;
}

function migrateStateFactoryPromptLibraryResumoAulaEstruturaDidaticaV4(targetState = state) {
  targetState.migrations ||= {};
  targetState.factoryPromptLibrary ||= {};
  if (targetState.migrations[FACTORY_RESUMO_AULA_ESTRUTURA_DIDATICA_MIGRATION_ID]) return false;
  targetState.factoryPromptLibrary.resumoAula = FACTORY_RESUMO_AULA_PROMPT;
  targetState.migrations[FACTORY_RESUMO_AULA_ESTRUTURA_DIDATICA_MIGRATION_ID] = new Date().toISOString();
  return true;
}
function normalizeFactoryPromptLibrary(library = {}) {
  return migrateFactoryPromptLibraryLeiRecorte(Object.fromEntries(Object.keys(defaultFactoryPromptLibrary).map((key) => [key, String(library?.[key] || "") ])));
}
function factoryPromptBase(type) {
  const text = String(state.factoryPromptLibrary?.[type] || "").trim();
  return text || FACTORY_LIBRARY_FALLBACK;
}
function factoryRouterText(type, item = {}) {
  const context = factoryPromptContext(item);
  const theme = item.tema || "[TEMA]";
  const leiModule = normalizeFactoryModule(item.modules?.lei || {}, item);
  const leiValues = [leiModule.leiNome, leiModule.leiFonte, leiModule.leiArtigos, leiModule.leiRecorte, leiModule.leiObservacoes].map((value) => String(value || "").trim());
  const hasAnyLeiField = leiValues.some(Boolean);
  const hasLeiNome = Boolean(String(leiModule.leiNome || "").trim());
  const hasLeiRecorte = Boolean(String(leiModule.leiRecorte || "").trim());
  const leiBlock = `BLOQUEIO OBRIGATÓRIO:\n- não gerar o módulo;\n- não gerar Word;\n- não escolher artigos por conta própria;\n- não reconstruir conteúdo por memória;\n- solicitar lei/diploma, artigos/dispositivos e recorte;\n- considerar “lei integral” somente quando isso estiver expressamente informado.`;
  const leiAviso = `[LEI/DIPLOMA OU RECORTE NÃO PREENCHIDOS — INTERROMPER A GERAÇÃO E SOLICITAR CONFIRMAÇÃO]\n${leiBlock}`;
  const leiDetails = hasAnyLeiField ? `Modo detalhado do módulo LEI:\n- Lei / diploma legal: ${leiModule.leiNome || "[NÃO PREENCHIDO]"}\n- Fonte: ${leiModule.leiFonte || "[NÃO PREENCHIDO]"}\n- Artigos / dispositivos: ${leiModule.leiArtigos || "[NÃO PREENCHIDO]"}\n- Recorte obrigatório: ${leiModule.leiRecorte || "[NÃO PREENCHIDO]"}\n- Observações: ${leiModule.leiObservacoes || "[NÃO PREENCHIDO]"}${hasLeiNome && hasLeiRecorte ? "" : `\n\n${leiAviso}`}` : `Modo rápido do módulo LEI:\n${leiAviso}`;
  const common = `${context}\nStatus anterior: ${item.status || "Não iniciado"}\nFontes a usar: conforme a triagem e as fontes classificadas para este módulo.\nFontes a não usar: fontes de outros módulos, conteúdo externo não fornecido e materiais não aprovados na triagem.\nRegras específicas do tema/módulo: ${item.observacao || "sem observações adicionais cadastradas."}`;
  const routers = {
    triagem: `${common}\n\nA pasta de destino acima é apenas informação para etapas futuras. Faça apenas a TRIAGEM das fontes. Classifique cada fonte por RESUMO/AULA, LEI, JURISPRUDÊNCIA, PEÇA e ATUALIZAÇÃO/COMPLEMENTO. Não gere resumo, Word, PDF ou módulo final.

## VÍNCULOS TEMÁTICOS COM AS PEÇAS

Quando houver fonte classificada como PEÇA, verifique se outras fontes aprovadas contêm conteúdo diretamente necessário para compreender especificidades dessa peça. Para cada peça identificada, informe: nome da peça; fontes principais classificadas como PEÇA; fontes complementares diretamente relacionadas; classificação original de cada fonte complementar; especificidade temática abordada; suficiência da fonte para desenvolver a especificidade. Use apenas estes estados: SUFICIENTE PARA INCLUSÃO; PARCIALMENTE SUFICIENTE; INSUFICIENTE; SEM FONTE RELACIONADA IDENTIFICADA. Não antecipe o resumo, não desenvolva conteúdo jurídico e não invente vínculos. Apenas identifique e registre vínculos efetivamente encontrados, preservando as categorias estruturais existentes.`,
    resumoAula: `${common}\n\nMÓDULO: RESUMO/AULA. Use apenas as fontes classificadas como RESUMO/AULA na triagem. Não gere os módulos LEI, JURISPRUDÊNCIA ou PEÇA e não faça ainda a consolidação final. Gere somente o arquivo Word correspondente ao MÓDULO RESUMO/AULA. Preserve profundidade, hierarquia, negritos e substitua qualquer referência de banca por “📌 PROVA”.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o MÓDULO RESUMO/AULA;\n- gerar um arquivo Word editável contendo o módulo;\n- não gerar ainda o Word final consolidado;\n- salvar o Word na pasta de destino indicada, somente quando houver ferramenta autorizada para gravação no Google Drive;\n- após salvar, devolver o link exato do arquivo criado;\n- não afirmar que salvou no Google Drive se a gravação não tiver ocorrido;\n- caso não exista ferramenta autorizada para salvar no Drive, gerar o Word para download e informar que ele precisa ser colocado manualmente na pasta.\n\n${FACTORY_DRIVE_UPLOAD_INSTRUCTIONS}`,
    lei: `${common}\n\nMÓDULO: LEI.\n${leiDetails}\n\nUse as fontes classificadas como LEI na triagem para identificar o diploma e o recorte. Confira o conteúdo normativo exclusivamente no texto oficial vigente do Planalto.\nRECORTE: trabalhe somente os artigos e temas expressamente indicados. Se o recorte não estiver cadastrado ou estiver impreciso, interrompa a geração e solicite confirmação. Somente trabalhe a lei integralmente quando houver autorização expressa do usuário.\nUse artigo/dispositivo como unidade central, preserve prazos, competências, vedações, exceções, requisitos, sanções e pontos de prova. Não copie a lei integralmente e não faça comentário doutrinário.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o Word do módulo LEI;\n- não gerar consolidação final;\n- salvar o Word na pasta de destino indicada apenas com ferramenta autorizada e devolver o link exato do arquivo criado.\n\n${FACTORY_DRIVE_UPLOAD_INSTRUCTIONS}`,
    jurisprudencia: `${common}\n\nMÓDULO: JURISPRUDÊNCIA. Use apenas fontes classificadas como JURISPRUDÊNCIA. Preserve tribunal, súmula, informativo, tema, ano, tese e distinções STF/STJ quando constarem. Não invente jurisprudência nem pesquise fora das fontes.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o Word do módulo JURISPRUDÊNCIA;\n- não gerar consolidação final;\n- salvar o Word na pasta de destino indicada apenas com ferramenta autorizada e devolver o link exato do arquivo criado.\n\n${FACTORY_DRIVE_UPLOAD_INSTRUCTIONS}`,
    peca: `${common}\n\nMÓDULO: PEÇA. Use fontes classificadas como PEÇA como base principal. Permita, apenas como apoio complementar, fontes aprovadas classificadas como LEI, JURISPRUDÊNCIA, RESUMO/AULA ou ATUALIZAÇÃO/COMPLEMENTO quando houver vínculo direto e identificável com a peça atual. Não misture fontes de outros módulos indiscriminadamente. Extraia estrutura, requisitos, fundamentos, pedidos e determinações. Após a estrutura principal, faça a verificação obrigatória de especificidades temáticas prevista no prompt completo. Não faça peça pronta nem aula corrida.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar somente o Word do módulo PEÇA;\n- não gerar consolidação final;\n- salvar o Word na pasta de destino indicada apenas com ferramenta autorizada e devolver o link exato do arquivo criado.\n\n${FACTORY_DRIVE_UPLOAD_INSTRUCTIONS}`,
    consolidacao: `${common}\n\nCONSOLIDAÇÃO FINAL. Os módulos aprovados devem ser reunidos na ordem: RESUMO/AULA, LEI, JURISPRUDÊNCIA e PEÇA. Preserve o padrão de cada módulo, elimine repetições e não pesquise fora dos módulos aprovados.\n\nENTREGA OBRIGATÓRIA DESTA ETAPA:\n- gerar Word consolidado;\n- gerar PDF consolidado;\n- salvar ambos na pasta de destino, quando houver acesso autorizado;\n- devolver separadamente o link do Word e o link do PDF;\n- se qualquer upload falhar, não apresentar falha como sucesso e indicar o arquivo pendente de upload manual.\n\n${FACTORY_DRIVE_UPLOAD_INSTRUCTIONS}`
  };
  return routers[type] || common;
}
function factoryPromptText(type, item = {}, mode = "full") {
  const router = factoryRouterText(type, item);
  if (mode === "router") return router;
  const docxEmojiFontInstructions = ["resumoAula", "lei", "jurisprudencia", "peca", "consolidacao"].includes(type) ? `\n\n${FACTORY_DOCX_EMOJI_FONT_INSTRUCTIONS}` : "";
  return `${router}${docxEmojiFontInstructions}\n\n==============================\nPROMPT COMPLETO DO PROJETO — ${FACTORY_PROMPT_TYPES.find((p) => p.key === type)?.label?.replace("Gerar prompt ", "").toUpperCase() || type.toUpperCase()}\n==============================\n\n${factoryPromptBase(type)}`;
}
function renderFactoryPromptLibrary() {
  const panel = elements.factoryPromptLibraryPanel;
  if (!panel) return;
  state.factoryPromptLibrary = normalizeFactoryPromptLibrary(state.factoryPromptLibrary);
  const fields = FACTORY_PROMPT_TYPES.map(({ key, label }) => `<label class="wide"><strong>${escapeHTML(label.replace("Gerar prompt ", "PROMPT ").replace("de triagem", "TRIAGEM COMPLETO").replace("Resumo/Aula", "RESUMO/AULA COMPLETO").replace("Lei", "LEI COMPLETO").replace("Jurisprudência", "JURISPRUDÊNCIA COMPLETO").replace("Peça", "PEÇA COMPLETO").replace("Consolidação Final", "CONSOLIDAÇÃO FINAL COMPLETO"))}</strong><textarea rows="8" data-factory-library-field="${key}" placeholder="Cole aqui o prompt-base completo deste módulo">${escapeHTML(state.factoryPromptLibrary[key])}</textarea><button type="button" class="secondary-button" data-factory-library-restore="${key}">Restaurar modelo padrão</button></label>`).join("");
  panel.innerHTML = `<div class="section-heading inline"><div><p class="eyebrow">Configurações da Fábrica</p><h3 id="factory-prompt-library-title">⚙️ Biblioteca de Prompts da Fábrica</h3></div><button type="button" class="secondary-button" data-factory-library-close>Fechar</button></div><p class="notice">Salve aqui os prompts-base completos do projeto. Eles entram no backup e na sincronização Google Drive.</p><form id="factoryPromptLibraryForm" class="form-grid">${fields}<button class="wide" type="submit">Salvar biblioteca de prompts</button></form>`;
}
function saveFactoryPromptLibrary(event) {
  const form = event.target.closest("#factoryPromptLibraryForm");
  if (!form) return;
  event.preventDefault();
  const next = normalizeFactoryPromptLibrary(state.factoryPromptLibrary);
  form.querySelectorAll("[data-factory-library-field]").forEach((field) => { next[field.dataset.factoryLibraryField] = field.value; });
  state.factoryPromptLibrary = next; saveData(); if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("factory-prompt-library"); renderFactoryPromptLibrary();
}
function normalizeFactoryModule(module = {}, legacyItem = {}) {
  const status = FACTORY_STATUSES.includes(module.status) ? module.status : "Não iniciado";
  return {
    status,
    wordLink: module.wordLink || module.linkWord || module.linkDoWord || module.word || "",
    pdfLink: module.pdfLink || module.linkPdf || module.linkDoPDF || module.pdf || "",
    observacao: module.observacao || module.observacoes || module.notes || "",
    dataConclusao: module.dataConclusao || module.concludedAt || module.completionDate || "",
    leiNome: module.leiNome || module.lei_nome || legacyItem.leiNome || legacyItem.lei_nome || legacyItem.lei || "",
    leiFonte: module.leiFonte || module.lei_fonte || module.sourceFolder || module.pastaFontes || legacyItem.leiFonte || legacyItem.lei_fonte || legacyItem.sourceFolder || legacyItem.pastaFontes || "",
    leiArtigos: module.leiArtigos || module.lei_artigos || legacyItem.leiArtigos || legacyItem.lei_artigos || "",
    leiRecorte: module.leiRecorte || module.lei_recorte || legacyItem.leiRecorte || legacyItem.lei_recorte || "",
    leiObservacoes: module.leiObservacoes || module.lei_observacoes || legacyItem.leiObservacoes || legacyItem.lei_observacoes || ""
  };
}
function normalizeFactoryModules(modules = {}, legacyItem = {}) {
  const hasModules = modules && typeof modules === "object" && Object.keys(modules).length > 0;
  const migratedLegacyStatus = legacyItem.status === "Finalizado" ? "Aprovado" : (FACTORY_STATUSES.includes(legacyItem.status) ? legacyItem.status : "Não iniciado");
  return Object.fromEntries(FACTORY_MODULES.filter(({ virtual }) => !virtual).map(({ key }) => {
    const incoming = modules?.[key] || modules?.[key.toUpperCase?.()] || (!hasModules && key === "resumoAula" ? { status: migratedLegacyStatus, observacao: legacyItem.observacao || legacyItem.notes || "" } : {});
    return [key, normalizeFactoryModule(incoming, key === "lei" ? legacyItem : {})];
  }));
}
function factoryApplicableCompletionStatus(status) {
  return ["Aprovado", "PDF gerado", "Não se aplica"].includes(status);
}
function factoryThemeIsCompleted(modules = {}) {
  return FACTORY_MODULES.filter(({ virtual }) => !virtual).every(({ key }) => factoryApplicableCompletionStatus(modules[key]?.status || "Não iniciado"));
}
function factoryOverallStatus(modules = {}) {
  const statuses = FACTORY_MODULES.filter(({ virtual }) => !virtual).map(({ key }) => modules[key]?.status || "Não iniciado");
  if (statuses.every((status) => status === "PDF gerado" || status === "Não se aplica")) return "PDF gerado";
  if (statuses.every(factoryApplicableCompletionStatus)) return "Aprovado";
  if (statuses.some((status) => status === "Precisa refazer")) return "Precisa refazer";
  if (statuses.some((status) => status === "Aguardando revisão")) return "Aguardando revisão";
  if (statuses.some((status) => status === "Em produção")) return "Em produção";
  return "Não iniciado";
}
function normalizeFactoryTriagemStatus(item = {}, modules = {}) {
  const incoming = item.triagemStatus || item.statusTriagem || item.triagem?.status || "";
  if (FACTORY_TRIAGEM_STATUSES.includes(incoming)) return incoming;
  const startedModule = ["resumoAula", "lei", "jurisprudencia", "peca"].some((key) => (modules[key]?.status || "Não iniciado") !== "Não iniciado");
  return startedModule ? "Concluída" : "Não iniciada";
}
function normalizeFactoryItem(item = {}) {
  const now = new Date().toISOString();
  const modules = normalizeFactoryModules(item.modules || item.modulos || {}, item);
  const status = FACTORY_STATUSES.includes(item.status) ? item.status : factoryOverallStatus(modules);
  const triagemStatus = normalizeFactoryTriagemStatus(item, modules);
  return {
    id: item.id || createId(),
    disciplina: item.disciplina || item.discipline || "",
    tema: item.tema || item.theme || item.subject || "",
    prioridade: item.prioridade || item.priority || "Média",
    status,
    dataPlanejada: item.dataPlanejada || item.plannedDate || item.date || "",
    observacao: item.observacao || item.observacoes || item.notes || "",
    triagemStatus,
    triagemCompletedAt: item.triagemCompletedAt || item.triagem_completed_at || item.triagem?.completedAt || "",
    triagemNotes: item.triagemNotes || item.triagem_notes || item.triagem?.notes || "",
    factoryDestinationFolder: item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder || item.finalFilesFolder || "",
    createdAt: item.createdAt || item.created_at || item.updatedAt || now,
    modules: normalizeFactoryModules(item.modules || item.modulos || {}, item),
    updatedAt: item.updatedAt || item.updated_at || now,
    editalLink: item.editalLink || item.editalVinculo || item.factoryEditalLink || null,
    editalSubtemas: Array.isArray(item.editalSubtemas) ? item.editalSubtemas : (Array.isArray(item.subtemasEdital) ? item.subtemasEdital : []),
    editalActive: item.editalActive !== false,
    archivedReason: item.archivedReason || item.motivoArquivo || ""
  };
}

function factorySyllabusMainSubject(item = {}) {
  return String(item.subject || item.assunto || item.topic || item.topico || "Assunto").trim() || "Assunto";
}
function factorySyllabusSubtopic(item = {}) {
  return String(item.subtopic || item.subassunto || item.subtema || "").trim();
}
function factorySyllabusStableKey(item = {}) {
  if (item.importKey) return `import:${item.importKey}`;
  if (item.id) return `id:${item.id}`;
  return `raw:${canonical([item.discipline, factorySyllabusMainSubject(item), item.reference || item.topic || ""].join("|"))}`;
}
function factoryEditalGroupKey(discipline, subject) {
  return `edital:${canonical(discipline)}|${canonical(subject)}`;
}
function factoryActiveEditalGroups() {
  const groups = new Map();
  (state.syllabusItems || []).forEach((item) => {
    const discipline = String(item.discipline || item.disciplina || "Sem disciplina").trim() || "Sem disciplina";
    const subject = factorySyllabusMainSubject(item);
    const key = factoryEditalGroupKey(discipline, subject);
    if (!groups.has(key)) groups.set(key, { key, discipline, subject, itemIds: [], itemKeys: [], subtopics: new Set(), references: new Set(), topics: new Set() });
    const group = groups.get(key);
    if (item.id) group.itemIds.push(item.id);
    group.itemKeys.push(factorySyllabusStableKey(item));
    const subtopic = factorySyllabusSubtopic(item);
    if (subtopic) group.subtopics.add(subtopic);
    if (item.reference) group.references.add(item.reference);
    if (item.topic) group.topics.add(item.topic);
  });
  return [...groups.values()].map((group) => ({ ...group, subtopics: [...group.subtopics].sort((a,b)=>a.localeCompare(b,"pt-BR")), references: [...group.references], topics: [...group.topics] }));
}
function syncFactoryWithActiveEdital() {
  const agenda = ensureFactoryAgenda();
  const groups = factoryActiveEditalGroups();
  const activeKeys = new Set(groups.map((group) => group.key));
  const byKey = new Map();
  agenda.forEach((item) => { if (item.editalLink?.groupKey) byKey.set(item.editalLink.groupKey, item); });
  const now = new Date().toISOString();
  let created = 0;
  let changed = false;
  groups.forEach((group) => {
    const recorte = group.subtopics.length ? `Subtemas do edital: ${group.subtopics.join("; ")}` : "";
    const existing = byKey.get(group.key);
    if (existing) {
      const previousSignature = JSON.stringify({ link: existing.editalLink, subtemas: existing.editalSubtemas, active: existing.editalActive, archived: existing.archivedReason, observacao: existing.observacao });
      existing.editalLink = { ...(existing.editalLink || {}), groupKey: group.key, itemIds: group.itemIds, itemKeys: group.itemKeys, discipline: group.discipline, subject: group.subject, references: group.references, topics: group.topics };
      existing.editalSubtemas = group.subtopics;
      existing.editalActive = true;
      existing.archivedReason = "";
      if (recorte && !existing.observacao?.includes(recorte)) existing.observacao = [existing.observacao, recorte].filter(Boolean).join("\n");
      if (previousSignature !== JSON.stringify({ link: existing.editalLink, subtemas: existing.editalSubtemas, active: existing.editalActive, archived: existing.archivedReason, observacao: existing.observacao })) changed = true;
      existing.updatedAt = existing.updatedAt || now;
      return;
    }
    agenda.push(normalizeFactoryItem({
      id: createId(), disciplina: group.discipline, tema: group.subject, prioridade: "Média", status: "Não iniciado",
      observacao: recorte, createdAt: now, updatedAt: now,
      editalLink: { groupKey: group.key, itemIds: group.itemIds, itemKeys: group.itemKeys, discipline: group.discipline, subject: group.subject, references: group.references, topics: group.topics },
      editalSubtemas: group.subtopics, editalActive: true
    }));
    created += 1;
    changed = true;
  });
  agenda.forEach((item) => {
    if (item.editalLink?.groupKey && !activeKeys.has(item.editalLink.groupKey)) {
      item.editalActive = false;
      item.archivedReason = "Fora do edital ativo";
      changed = true;
    }
  });
  state.factoryAgenda = agenda.map(normalizeFactoryItem);
  state.factoryItems = state.factoryAgenda;
  return { created, changed, groups, disciplines: new Set(groups.map((g)=>g.discipline)).size, subjects: groups.length, subtopics: groups.reduce((total, group)=>total + group.subtopics.length, 0) };
}
function reopenFactoryTheme(id) {
  const item = ensureFactoryAgenda().find((x) => x.id === id);
  if (!item) return;
  item.modules = normalizeFactoryModules(item.modules || {});
  const firstCompleted = FACTORY_MODULES.find(({ key }) => factoryApplicableCompletionStatus(item.modules[key]?.status));
  if (firstCompleted) item.modules[firstCompleted.key].status = "Em produção";
  item.status = factoryOverallStatus(item.modules);
  item.updatedAt = new Date().toISOString();
  closeFactoryPrompt(item.id);
  syncFactoryModuleMaterials(item);
  renderFactory();
  syncFactoryUpdate();
}

function ensureFactoryAgenda() {
  if (!Array.isArray(state.factoryAgenda)) state.factoryAgenda = [];
  const incoming = state.factoryAgenda.length ? state.factoryAgenda : (Array.isArray(state.factoryItems) ? state.factoryItems : []);
  state.factoryAgenda = incoming.map(normalizeFactoryItem);
  state.factoryItems = state.factoryAgenda;
  return state.factoryAgenda;
}
function syncFactoryUpdate() {
  saveData();
  if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("factory-update");
}
function saveFactoryItem(event) {
  event.preventDefault();
  const disciplina = elements.factoryDiscipline.value.trim();
  const tema = elements.factoryTheme.value.trim();
  if (!disciplina || !tema) return alert("Informe disciplina e tema.");
  const agenda = ensureFactoryAgenda();
  const now = new Date().toISOString();
  const id = elements.factoryEditingId.value || createId();
  const previous = agenda.find((item) => item.id === id);
  const previousModules = normalizeFactoryModules(previous?.modules || {}, previous || {});
  previousModules.lei.leiFonte = elements.factorySourceFolder?.value.trim() || "";
  const factoryDestinationFolder = elements.factoryDestinationFolder?.value.trim() || "";
  const item = normalizeFactoryItem({
    ...(previous || {}),
    id,
    disciplina,
    tema,
    prioridade: elements.factoryPriority.value,
    status: elements.factoryStatus.value,
    dataPlanejada: elements.factoryPlannedDate.value,
    observacao: elements.factoryNotes.value.trim(),
    factoryDestinationFolder,
    modules: previousModules,
    createdAt: previous?.createdAt || now,
    updatedAt: now
  });
  const idx = agenda.findIndex((x) => x.id === id);
  if (idx >= 0) agenda.splice(idx, 1, item); else agenda.push(item);
  state.factoryAgenda = agenda;
  state.factoryItems = state.factoryAgenda;
  elements.factoryForm.reset();
  elements.factoryEditingId.value = "";
  if (elements.factorySourceFolder) elements.factorySourceFolder.value = "";
  if (elements.factoryDestinationFolder) elements.factoryDestinationFolder.value = "";
  closeFactoryPrompt(item.id);
  syncFactoryModuleMaterials(item);
  renderFactory();
  syncFactoryUpdate();
}
function editFactoryItem(id) {
  const item = ensureFactoryAgenda().find((x) => x.id === id);
  if (!item) return;
  elements.factoryEditingId.value = item.id;
  elements.factoryDiscipline.value = item.disciplina;
  elements.factoryTheme.value = item.tema;
  elements.factoryPriority.value = item.prioridade;
  elements.factoryPlannedDate.value = item.dataPlanejada || "";
  if (elements.factorySourceFolder) elements.factorySourceFolder.value = normalizeFactoryModule(item.modules?.lei || {}, item).leiFonte || "";
  if (elements.factoryDestinationFolder) elements.factoryDestinationFolder.value = factoryDestinationFolderLink(item);
  elements.factoryStatus.value = item.status;
  elements.factoryNotes.value = item.observacao || "";
  elements.factoryForm?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function deleteFactoryItem(id) {
  if (!confirm("Excluir este tema da Fábrica?")) return;
  state.factoryAgenda = ensureFactoryAgenda().filter((item) => item.id !== id);
  state.factoryItems = state.factoryAgenda;
  renderFactory();
  syncFactoryUpdate();
}
function editFactoryModules(id) {
  const item = ensureFactoryAgenda().find((x) => x.id === id);
  if (!item) return;
  const html = FACTORY_MODULES.filter(({ virtual }) => !virtual).map(({ key, label }) => {
    const module = normalizeFactoryModule(item.modules?.[key], key === "lei" ? item : {});
    const leiFields = key === "lei" ? `<label class="wide">Lei / diploma legal<input type="text" data-factory-module-field="${item.id}|${key}|leiNome" value="${escapeHTML(module.leiNome)}" placeholder="Ex.: Lei nº 12.830/2013" /></label><label class="wide">Fonte<input type="text" data-factory-module-field="${item.id}|${key}|leiFonte" value="${escapeHTML(module.leiFonte)}" placeholder="Ex.: Planalto, diário oficial ou link da fonte oficial" /></label><label class="wide">Artigos / dispositivos<input type="text" data-factory-module-field="${item.id}|${key}|leiArtigos" value="${escapeHTML(module.leiArtigos)}" placeholder="Ex.: arts. 1º a 3º; art. 144, § 4º, CF" /></label><label class="wide">Recorte obrigatório<textarea rows="2" data-factory-module-field="${item.id}|${key}|leiRecorte" placeholder="Delimite exatamente o recorte que o módulo Lei deve cobrir">${escapeHTML(module.leiRecorte)}</textarea></label><label class="wide">Observações<textarea rows="2" data-factory-module-field="${item.id}|${key}|leiObservacoes" placeholder="Informe lacunas, ressalvas, necessidade de fonte oficial ou pontos de atenção">${escapeHTML(module.leiObservacoes)}</textarea></label>` : "";
    return `<fieldset class="factory-module-editor"><legend>${escapeHTML(label)}</legend>${leiFields}<label>Status<select data-factory-module-field="${item.id}|${key}|status">${FACTORY_STATUSES.map((s)=>`<option ${s===module.status?'selected':''}>${s}</option>`).join("")}</select></label><label>Link do Word<input type="url" data-factory-module-field="${item.id}|${key}|wordLink" value="${escapeHTML(module.wordLink)}" placeholder="https://..." /></label><label>Link do PDF<input type="url" data-factory-module-field="${item.id}|${key}|pdfLink" value="${escapeHTML(module.pdfLink)}" placeholder="https://..." /></label><label>Data de conclusão<input type="date" data-factory-module-field="${item.id}|${key}|dataConclusao" value="${escapeHTML(module.dataConclusao)}" /></label><label class="wide">Observação do módulo<textarea rows="2" data-factory-module-field="${item.id}|${key}|observacao">${escapeHTML(module.observacao)}</textarea></label></fieldset>`;
  }).join("");
  elements.factoryList.querySelector(`[data-factory-modules-panel="${CSS.escape(id)}"]`).innerHTML = `<form class="factory-modules-form" data-factory-modules-form="${item.id}"><h4>Módulos de produção</h4>${html}<div class="card-actions"><button type="submit">Salvar módulos</button><button type="submit" data-factory-save-next="true">Concluir etapa e ir para o próximo</button><button type="button" class="secondary-button" data-factory-modules-cancel="${item.id}">Cancelar</button></div></form>`;
}
function saveFactoryModules(event) {
  const form = event.target.closest("[data-factory-modules-form]");
  if (!form) return;
  event.preventDefault();
  const item = ensureFactoryAgenda().find((x) => x.id === form.dataset.factoryModulesForm);
  if (!item) return;
  item.modules = normalizeFactoryModules(item.modules || {});
  form.querySelectorAll("[data-factory-module-field]").forEach((field) => {
    const [, key, prop] = field.dataset.factoryModuleField.split("|");
    item.modules[key][prop] = field.value.trim();
  });
  item.modules = normalizeFactoryModules(item.modules);
  item.status = factoryOverallStatus(item.modules);
  item.updatedAt = new Date().toISOString();
  closeFactoryPrompt(item.id);
  syncFactoryModuleMaterials(item);
  const goNext = event.submitter?.dataset?.factorySaveNext === "true";
  renderFactory();
  syncFactoryUpdate();
  if (goNext) factoryGoToNext(item.id);
}

function showFactoryPrompt(id, type) {
  const item = ensureFactoryAgenda().find((x) => x.id === id);
  if (!item) return;
  const panel = elements.factoryList?.querySelector(`[data-factory-prompt-panel="${CSS.escape(id)}"]`);
  if (!panel) return;
  const hasDestinationFolder = Boolean(factoryDestinationFolderLink(item));
  if (!hasDestinationFolder && type !== "triagem" && !confirm("Pasta de destino não preenchida. O arquivo poderá ser gerado, mas não haverá indicação automática de onde deverá ser salvo.\n\nOK = Gerar mesmo assim. Cancelar = Voltar e preencher a pasta.")) { editFactoryItem(id); return; }
  const promptText = factoryPromptText(type, item, "full");
  const routerText = factoryPromptText(type, item, "router");
  const promptLabel = FACTORY_PROMPT_TYPES.find((p) => p.key === type)?.label?.replace("Gerar prompt ", "") || "Prompt";
  panel.innerHTML = `<div class="factory-prompt-box"><div class="factory-prompt-header"><div><h4>Prompt — ${escapeHTML(promptLabel)}</h4><p class="item-meta">${escapeHTML(item.disciplina)} — ${escapeHTML(item.tema)}</p><p class="item-meta">Pasta de destino incluída no prompt: ${hasDestinationFolder ? "SIM" : "NÃO"}</p></div><button type="button" class="secondary-button" data-factory-prompt-close="${item.id}">Fechar</button></div><textarea readonly rows="18" data-factory-prompt-text="${item.id}">${escapeHTML(promptText)}</textarea><textarea hidden readonly data-factory-router-text="${item.id}">${escapeHTML(routerText)}</textarea><div class="card-actions">${hasDestinationFolder ? `<button type="button" class="secondary-button" data-open-url="${escapeHTML(factoryDestinationFolderLink(item))}">Abrir pasta de destino</button>` : `<button type="button" class="secondary-button" data-factory-edit="${item.id}">Voltar e preencher a pasta</button>`}<button type="button" data-factory-prompt-copy="${item.id}">Copiar prompt completo</button><button type="button" class="secondary-button" data-factory-router-copy="${item.id}">Copiar apenas prompt roteador</button><span class="item-meta" data-factory-prompt-message="${item.id}" aria-live="polite"></span></div></div>`;
  panel.querySelector("textarea")?.focus();
}
async function copyFactoryPrompt(id, routerOnly = false) {
  const selector = routerOnly ? `[data-factory-router-text="${CSS.escape(id)}"]` : `[data-factory-prompt-text="${CSS.escape(id)}"]`;
  const textArea = elements.factoryList?.querySelector(selector);
  const message = elements.factoryList?.querySelector(`[data-factory-prompt-message="${CSS.escape(id)}"]`);
  if (!textArea) return;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(textArea.value);
    else {
      textArea.select();
      document.execCommand("copy");
    }
    if (message) message.textContent = routerOnly ? "Prompt roteador copiado." : "Prompt completo copiado.";
  } catch (error) {
    textArea.select();
    document.execCommand("copy");
    if (message) message.textContent = routerOnly ? "Prompt roteador copiado." : "Prompt completo copiado.";
  }
}
function closeFactoryPrompt(id) {
  const panel = elements.factoryList?.querySelector(`[data-factory-prompt-panel="${CSS.escape(id)}"]`);
  if (panel) panel.innerHTML = "";
}

function factoryValidMaterialLink(material = {}) { return materialAvailable(material); }
function factoryResumoAulaReady(item = {}) {
  const module = normalizeFactoryModule(item.modules?.resumoAula || {}, item);
  if (["Aprovado", "PDF gerado"].includes(module.status) || Boolean(module.wordLink) || Boolean(module.pdfLink)) return true;
  return (state.materials || []).some((material) => material.source === "factory" && material.factoryItemId === item.id && material.factoryModuleKey === "resumoAula" && material.available !== false && factoryValidMaterialLink(material));
}
function factorySourceConfigured(item = {}) { return Boolean(factorySourceFolderLink(item)); }
function factoryCurrentStage(item = {}) {
  const modules = normalizeFactoryModules(item.modules || {});
  const triagem = normalizeFactoryTriagemStatus(item, modules);
  if (!factorySourceConfigured(item)) return "FONTES";
  if (triagem !== "Concluída") return "TRIAGEM";
  if (!factoryResumoAulaReady({ ...item, modules }) || ["Em produção", "Aguardando revisão", "Precisa refazer"].includes(modules.resumoAula.status)) return "RESUMO/AULA";
  const next = ["lei", "jurisprudencia", "peca", "completo"].find((key) => !factoryApplicableCompletionStatus(modules[key]?.status || "Não iniciado"));
  return next ? (FACTORY_MODULES.find((m) => m.key === next)?.label || next.toUpperCase()) : "PRONTO";
}
function factoryNextAction(item = {}) {
  const modules = normalizeFactoryModules(item.modules || {});
  const triagem = normalizeFactoryTriagemStatus(item, modules);
  if (!factorySourceConfigured(item)) return { label: "Configurar fontes", action: "edit" };
  if (triagem === "Não iniciada" || triagem === "Precisa refazer") return { label: "Gerar prompt de triagem", action: "prompt", prompt: "triagem" };
  if (triagem === "Em andamento") return { label: "Marcar triagem como concluída", action: "triagem-done" };
  if (!factoryResumoAulaReady({ ...item, modules })) {
    if (modules.resumoAula.status === "Em produção") return { label: "Continuar RESUMO/AULA", action: "prompt", prompt: "resumoAula" };
    if (modules.resumoAula.status === "Aguardando revisão") return { label: "Revisar RESUMO/AULA", action: "modules" };
    if (modules.resumoAula.status === "Aprovado" && !modules.resumoAula.wordLink && !modules.resumoAula.pdfLink) return { label: "Cadastrar link do Word", action: "modules" };
    return { label: "Gerar prompt RESUMO/AULA", action: "prompt", prompt: "resumoAula" };
  }
  for (const [key, label] of [["lei","Iniciar módulo LEI"],["jurisprudencia","Iniciar módulo JURISPRUDÊNCIA"],["peca","Iniciar módulo PEÇA"]]) if (!factoryApplicableCompletionStatus(modules[key]?.status || "Não iniciado")) return { label, action: "prompt", prompt: key };
  if (!factoryApplicableCompletionStatus(modules.completo?.status || "Não iniciado")) return { label: "Fazer consolidação final", action: "prompt", prompt: "consolidacao" };
  return { label: "Abrir material pronto", action: "open-material" };
}
function factoryProgressInfo(item = {}) {
  const modules = normalizeFactoryModules(item.modules || {});
  const triagem = normalizeFactoryTriagemStatus(item, modules);
  const steps = [{ key: "triagem", label: "TRIAGEM", status: triagem }, ...FACTORY_MODULES.filter(({ virtual }) => !virtual).map(({ key, label }) => ({ key, label: label.replace("RESUMO/AULA", "RESUMO"), status: modules[key]?.status || "Não iniciado" }))];
  const applicable = steps.filter((s) => s.status !== "Não se aplica");
  const done = applicable.filter((s) => s.status === "Concluída" || factoryApplicableCompletionStatus(s.status)).length;
  const currentStage = factoryCurrentStage(item);
  return { steps, done, total: applicable.length, text: `${done} de ${applicable.length} etapas aplicáveis concluídas`, currentStage };
}
function factoryProgressHTML(item = {}) {
  const info = factoryProgressInfo(item);
  const html = info.steps.map((s) => {
    const cls = s.status === "Não se aplica" ? "na" : s.status === "Precisa refazer" ? "redo" : (s.status === "Concluída" || factoryApplicableCompletionStatus(s.status)) ? "done" : (info.currentStage.includes(s.label) || (s.key === "resumoAula" && info.currentStage === "RESUMO/AULA")) ? "current" : "pending";
    return `<span class="factory-step ${cls}">${escapeHTML(s.label)}</span>`;
  }).join('<span class="factory-arrow">→</span>');
  return `<div class="factory-progress-line">${html}</div><p class="item-meta">${escapeHTML(info.text)}</p>`;
}
function factoryModuleLinksHTML(item = {}) {
  const modules = normalizeFactoryModules(item.modules || {});
  const links = FACTORY_MODULES.filter(({ virtual }) => !virtual).flatMap(({ key, label }) => {
    const module = modules[key] || {};
    return [
      module.wordLink ? `<a href="${escapeHTML(module.wordLink)}" target="_blank" rel="noopener">Word — ${escapeHTML(label)}</a>` : "",
      module.pdfLink ? `<a href="${escapeHTML(module.pdfLink)}" target="_blank" rel="noopener">PDF — ${escapeHTML(label)}</a>` : ""
    ].filter(Boolean);
  });
  return links.length ? `<div class="card-actions factory-ready-links">${links.join("")}</div>` : `<p class="item-meta">Links Word/PDF ainda não cadastrados.</p>`;
}
function factoryGoalSubtopic(goal = {}) {
  const syllabus = (state.syllabusItems || []).find((item) => item.id === goal.syllabusItemId);
  return factorySyllabusSubtopic(syllabus) || goal.subtopic || goal.subassunto || goal.topic || "";
}
function exactFactoryGoalMatches(goal = {}, agenda = []) {
  const syllabus = (state.syllabusItems || []).find((item) => item.id === goal.syllabusItemId);
  const id = goal.syllabusItemId || goal.editalItemId || goal.itemId || "";
  const stableKey = syllabus ? factorySyllabusStableKey(syllabus) : "";
  const byId = id ? agenda.filter((item) => (item.editalLink?.itemIds || []).includes(id)) : [];
  if (byId.length) return { items: byId, mode: "identificador original do item do edital" };
  const byKey = stableKey ? agenda.filter((item) => (item.editalLink?.itemKeys || []).includes(stableKey)) : [];
  if (byKey.length) return { items: byKey, mode: "identificador original do item do edital" };
  const discipline = canonical(goal.discipline || goal.disciplina || syllabus?.discipline || syllabus?.disciplina || "");
  const subject = canonical(goal.subject || goal.assunto || (syllabus ? factorySyllabusMainSubject(syllabus) : ""));
  const subtopic = canonical(factoryGoalSubtopic(goal));
  const exact = agenda.filter((item) => {
    if (canonical(item.disciplina) !== discipline || canonical(item.tema) !== subject) return false;
    if (!subtopic) return true;
    return (item.editalSubtemas || []).some((value) => canonical(value) === subtopic);
  });
  return { items: exact, mode: exact.length ? "correspondência exata normalizada por disciplina, assunto principal e subassunto" : "sem vínculo exato" };
}
function factoryTodayGroups(agenda = []) {
  const todayGoals = (state.dailyGoals || []).filter((goal) => (goal.date || goal.data) === todayISO());
  const groups = new Map();
  const modes = new Set();
  todayGoals.forEach((goal) => {
    const match = exactFactoryGoalMatches(goal, agenda);
    if (match.items.length) modes.add(match.mode);
    match.items.forEach((item) => {
      if (!groups.has(item.id)) groups.set(item.id, { item, goals: [], subtopics: new Set() });
      const group = groups.get(item.id);
      group.goals.push(goal);
      const subtopic = factoryGoalSubtopic(goal);
      if (subtopic) group.subtopics.add(subtopic);
    });
  });
  lastFactoryTodayInfo = { goals: todayGoals.length, matched: groups.size, matchModes: [...modes] };
  return [...groups.values()].map((group) => ({ ...group, subtopics: [...group.subtopics].sort((a,b)=>a.localeCompare(b,"pt-BR")) }));
}
function factoryTodayQueue(agenda = ensureFactoryAgenda()) {
  const groups = factoryTodayGroups(agenda.filter((item) => item.editalActive !== false));
  const order = new Map((state.dailyGoals || []).filter((g) => (g.date || g.data) === todayISO()).map((g, i) => [g.id || g.syllabusItemId || `${g.discipline}|${g.subject}|${i}`, i]));
  const priorityRank = { Alta: 0, Média: 1, Baixa: 2 };
  return groups.map((entry) => ({ ...entry, sortIndex: Math.min(...entry.goals.map((g, i) => order.get(g.id || g.syllabusItemId || `${g.discipline}|${g.subject}|${i}`) ?? i)) }))
    .sort((a, b) => a.sortIndex - b.sortIndex || (a.item.status === "Em produção" ? 0 : 1) - (b.item.status === "Em produção" ? 0 : 1) || (priorityRank[a.item.prioridade] ?? 9) - (priorityRank[b.item.prioridade] ?? 9) || String(a.item.dataPlanejada || "9999-99-99").localeCompare(String(b.item.dataPlanejada || "9999-99-99")) || canonical(a.item.editalLink?.references?.[0] || a.item.tema).localeCompare(canonical(b.item.editalLink?.references?.[0] || b.item.tema)));
}
function factoryActionButtonHTML(item, primary = true) {
  const next = factoryNextAction(item);
  const cls = primary ? "factory-primary-action" : "secondary-button";
  if (next.action === "prompt") return `<button type="button" class="${cls}" data-factory-prompt="${item.id}|${next.prompt}">${escapeHTML(next.label)}</button>`;
  if (next.action === "edit") return `<button type="button" class="${cls}" data-factory-edit="${item.id}">${escapeHTML(next.label)}</button>`;
  if (next.action === "modules") return `<button type="button" class="${cls}" data-factory-modules="${item.id}">${escapeHTML(next.label)}</button>`;
  if (next.action === "triagem-done") return `<button type="button" class="${cls}" data-factory-triagem="${item.id}|Concluída">${escapeHTML(next.label)}</button>`;
  const material = materialsForFactoryItem(item).find((m) => m.factoryModuleKey === "resumoAula") || materialsForFactoryItem(item)[0];
  return material ? `<button type="button" class="${cls}" data-open-material="${material.id}">${escapeHTML(next.label)}</button>` : `<button type="button" class="${cls}" data-factory-modules="${item.id}">${escapeHTML(next.label)}</button>`;
}
function factoryRecorteHoje(entry = {}) { return entry.subtopics?.length ? entry.subtopics.join("; ") : "Meta do dia"; }
function factoryThemeHighlightHTML(item = {}, recorte = "", { position = "" } = {}) {
  const positionText = position ? ` • ${position}` : "";
  return `<div class="factory-theme-highlight"><p class="factory-theme-label">ASSUNTO EM PRODUÇÃO</p><h3 class="factory-theme-title">${escapeHTML(item.tema || "-")}</h3><p class="factory-theme-discipline"><strong>Disciplina:</strong> ${escapeHTML(item.disciplina || "-")}${escapeHTML(positionText)}</p>${recorte ? `<p class="factory-theme-recorte"><strong>Recorte programado hoje:</strong> ${escapeHTML(recorte)}</p>` : ""}</div>`;
}
function renderFactory() {
  if (!elements.factoryList) return;
  try {
    const syncInfo = syncFactoryWithActiveEdital();
    if (syncInfo.changed) saveData();
    const agenda = ensureFactoryAgenda();
    [elements.factoryStatus].filter(Boolean).forEach((select) => {
      const keep = select.value || "Não iniciado";
      select.innerHTML = FACTORY_STATUSES.map((status)=>`<option>${status}</option>`).join("");
      select.value = FACTORY_STATUSES.includes(keep) ? keep : "Não iniciado";
    });
    document.querySelectorAll("[data-factory-filter]").forEach((button) => {
      const active = button.dataset.factoryFilter === factoryCurrentFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const activeAgenda = agenda.filter((item) => item.editalActive !== false);
    const queue = factoryTodayQueue(activeAgenda);
    const completedCount = activeAgenda.filter((item) => factoryThemeIsCompleted(normalizeFactoryModules(item.modules || {}))).length;
    if (elements.factorySummary) elements.factorySummary.innerHTML = `<article class="stat-card factory-summary-now">${queue[0] ? factoryThemeHighlightHTML(queue[0].item, factoryRecorteHoje(queue[0])) : `<span>FAÇA AGORA</span><strong>-</strong>`}</article><article class="stat-card"><span>Fila de hoje</span><strong>${queue.length}</strong></article><article class="stat-card"><span>Assuntos principais</span><strong>${syncInfo.subjects}</strong></article><article class="stat-card"><span>Concluídos</span><strong>${completedCount}</strong></article>`;
    if (!agenda.length) { elements.factoryList.textContent = "Nenhum tema cadastrado na Fábrica."; return; }
    const detailsHTML = (entry) => {
      const item = entry.item || entry;
      const modules = normalizeFactoryModules(item.modules || {});
      const promptButtons = FACTORY_PROMPT_TYPES.map(({ key, label }) => `<button type="button" class="secondary-button" data-factory-prompt="${item.id}|${key}">${escapeHTML(label)}</button>`).join("");
      const moduleSummary = FACTORY_MODULES.filter(({ virtual }) => !virtual).map(({ key, label }) => `<li><strong>${escapeHTML(label)}:</strong> ${escapeHTML(modules[key].status)}${modules[key].wordLink ? " • Word" : ""}${modules[key].pdfLink ? " • PDF" : ""}</li>`).join("");
      return `<details class="factory-theme-details" data-factory-detail="${item.id}" ${factoryOpenDetailId === item.id ? "open" : ""}><summary>DETALHES DO TEMA</summary><div class="factory-detail-body"><h4>Triagem</h4><p class="item-meta">Status da triagem: ${escapeHTML(item.triagemStatus)} ${item.triagemCompletedAt ? `• ${formatDateBR(item.triagemCompletedAt)}` : ""}</p><div class="card-actions"><button type="button" class="secondary-button" data-factory-prompt="${item.id}|triagem">Gerar prompt de triagem</button><button type="button" data-factory-triagem="${item.id}|Concluída">Marcar triagem como concluída</button><button type="button" class="secondary-button" data-factory-triagem="${item.id}|Precisa refazer">Marcar como precisa refazer</button></div><ul class="factory-module-summary">${moduleSummary}</ul><div class="factory-prompt-actions"><h4>Botões de todos os prompts</h4><div class="card-actions">${promptButtons}</div></div><div class="card-meta-grid"><span>Subtemas abrangidos: ${escapeHTML((item.editalSubtemas || []).join("; ") || "-")}</span><span>Vínculo do edital: ${escapeHTML(item.editalLink?.groupKey || "manual")}</span><span>Pasta das fontes: ${escapeHTML(factorySourceFolderLink(item) || "-")}</span><span>Pasta de destino: ${escapeHTML(factoryDestinationFolderLink(item) || "-")}</span><span>Lei: ${escapeHTML(modules.lei.leiNome || "-")}</span><span>Observações: ${escapeHTML(item.observacao || "-")}</span></div>${factoryModuleLinksHTML(item)}<div class="card-actions"><button type="button" data-factory-modules="${item.id}">Editar módulos</button><button type="button" data-factory-edit="${item.id}">Editar tema</button><button type="button" class="danger" data-factory-delete="${item.id}">Excluir</button></div><div class="factory-prompt-panel" data-factory-prompt-panel="${item.id}"></div><div class="factory-modules-panel" data-factory-modules-panel="${item.id}"></div></div></details>`;
    };
    const cardFor = (entry, index = 0) => {
      const item = entry.item || entry;
      item.modules = normalizeFactoryModules(item.modules || {});
      item.status = factoryOverallStatus(item.modules);
      const stage = factoryCurrentStage(item);
      const next = factoryNextAction(item).label;
      const recorte = factoryRecorteHoje(entry);
      return `<article class="syllabus-card factory-card compact-factory-card" data-factory-card="${item.id}"><header class="factory-card-header"><div class="factory-card-heading">${factoryThemeHighlightHTML(item, recorte, { position: `posição ${index + 1} de ${Math.max(queue.length, 1)}` })}</div><span class="badge factory-status-badge ${factoryResumoAulaReady(item) ? "success" : item.triagemStatus === "Precisa refazer" ? "danger" : "neutral"}">${escapeHTML(item.status)}</span></header><div class="card-meta-grid factory-compact-grid"><span><strong>Etapa atual:</strong> ${escapeHTML(stage)}</span><span><strong>Próxima ação:</strong> ${escapeHTML(next)}</span><span><strong>Status:</strong> ${escapeHTML(item.status)}</span></div>${factoryProgressHTML(item)}<div class="card-actions factory-main-actions">${factoryActionButtonHTML(item)}<button type="button" class="secondary-button" data-factory-toggle-detail="${item.id}">Ver detalhes</button></div>${detailsHTML(entry)}</article>`;
    };
    const nowEntry = queue.find(({ item }) => !factoryResumoAulaReady(item)) || queue[0];
    const nowPanel = nowEntry ? `<section id="factoryDoNow" class="factory-do-now"><h3>🎯 FAÇA AGORA</h3>${cardFor(nowEntry, queue.indexOf(nowEntry))}<div class="card-actions"><button type="button" class="secondary-button" data-open-url="${escapeHTML(factorySourceFolderLink(nowEntry.item) || "")}" ${factorySourceFolderLink(nowEntry.item) ? "" : "disabled"}>Abrir pasta das fontes</button><button type="button" class="secondary-button" data-open-url="${escapeHTML(factoryDestinationFolderLink(nowEntry.item) || "")}" ${factoryDestinationFolderLink(nowEntry.item) ? "" : "disabled"}>Abrir pasta de destino</button><button type="button" class="secondary-button" data-factory-next="${nowEntry.item.id}">Ir para o próximo tema</button></div></section>` : `<section id="factoryDoNow" class="factory-do-now"><h3>🎯 FAÇA AGORA</h3><p class="empty-message">Nenhum tema pendente na fila de hoje.</p></section>`;
    const queuePanel = `<section class="factory-today-queue"><h3>📋 FILA DE PRODUÇÃO DE HOJE</h3>${queue.length ? `<ol>${queue.map((entry, index) => `<li><div class="factory-queue-theme">${factoryThemeHighlightHTML(entry.item, factoryRecorteHoje(entry))}</div><div class="item-meta"><strong>${index === 0 ? "Fazer agora" : factoryResumoAulaReady(entry.item) ? "Material pronto" : index === 1 ? "Próximo" : "Depois"}</strong> • Etapa: ${escapeHTML(factoryCurrentStage(entry.item))} • Status: ${escapeHTML(entry.item.status)}</div><button type="button" class="secondary-button" data-factory-toggle-detail="${entry.item.id}">Abrir</button></li>`).join("")}</ol>` : `<p class="empty-message">Nenhum tema das Metas do Dia na fila.</p>`}</section>`;
    let entries = activeAgenda.map((item) => ({ item, subtopics: [] }));
    if (["faca-agora", "fila-hoje"].includes(factoryCurrentFilter)) entries = queue;
    if (factoryCurrentFilter === "aguardando-triagem") entries = entries.filter(({ item }) => normalizeFactoryTriagemStatus(item, item.modules) !== "Concluída");
    if (factoryCurrentFilter === "resumo-aula") entries = entries.filter(({ item }) => !factoryResumoAulaReady(item));
    if (factoryCurrentFilter === "em-producao") entries = entries.filter(({ item }) => factoryOverallStatus(item.modules) === "Em produção");
    if (factoryCurrentFilter === "aguardando-revisao") entries = entries.filter(({ item }) => factoryOverallStatus(item.modules) === "Aguardando revisão");
    if (factoryCurrentFilter === "precisa-refazer") entries = entries.filter(({ item }) => normalizeFactoryTriagemStatus(item, item.modules) === "Precisa refazer" || factoryOverallStatus(item.modules) === "Precisa refazer");
    if (factoryCurrentFilter === "prontos") entries = entries.filter(({ item }) => factoryResumoAulaReady(item));
    const listPanel = factoryCurrentFilter === "faca-agora" ? "" : `<section class="factory-section"><h3>${factoryCurrentFilter === "fila-hoje" ? "📋 FILA DE PRODUÇÃO DE HOJE" : "Temas"}</h3>${entries.length ? entries.map(cardFor).join("") : `<p class="empty-message">Nenhum tema nesta lista.</p>`}</section>`;
    elements.factoryList.innerHTML = nowPanel + queuePanel + listPanel;
  } catch (error) {
    console.error("[Metas Estudo] Erro ao carregar Fábrica de Resumos", error);
    showFactoryErrorMessage();
  }
}


function setFactoryTriagemStatus(id, status) {
  const item = ensureFactoryAgenda().find((x) => x.id === id);
  if (!item || !FACTORY_TRIAGEM_STATUSES.includes(status)) return;
  item.triagemStatus = status;
  item.triagemCompletedAt = status === "Concluída" ? todayISO() : (status === "Precisa refazer" ? "" : item.triagemCompletedAt || "");
  item.updatedAt = new Date().toISOString();
  syncFactoryModuleMaterials(item);
  renderFactory();
  syncFactoryUpdate();
}
function factoryGoToNext(currentId = "") {
  const queue = factoryTodayQueue();
  const currentIndex = queue.findIndex(({ item }) => item.id === currentId);
  const nextEntry = queue.slice(Math.max(0, currentIndex + 1)).find(({ item }) => !factoryResumoAulaReady(item)) || queue.find(({ item }) => item.id !== currentId) || queue[0];
  if (nextEntry) { factoryOpenDetailId = nextEntry.item.id; factoryCurrentFilter = "faca-agora"; renderFactory(); document.getElementById("factoryDoNow")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}
function toggleFactoryDetail(id) {
  factoryOpenDetailId = factoryOpenDetailId === id ? "" : id;
  renderFactory();
}

function factoryMaterialUniqueKey(factoryItemId, factoryModuleKey, factoryFormat) {
  return [factoryItemId, factoryModuleKey, factoryFormat].map((v) => String(v || "").trim()).join("|");
}
function factorySyllabusItemIds(item = {}) {
  return [...new Set([...(item.editalLink?.itemIds || []), ...(Array.isArray(item.syllabusItemIds) ? item.syllabusItemIds : []), item.syllabusItemId || ""].filter(Boolean))];
}
function factoryModuleMaterialTitle(item, moduleKey, format) {
  const label = FACTORY_MODULES.find((m) => m.key === moduleKey)?.label || moduleKey;
  return `${item.tema || item.subject || "Material"} — ${label} — ${format}`;
}
function markFactoryMaterialUnavailable(factoryItemId, factoryModuleKey, factoryFormat) {
  const key = factoryMaterialUniqueKey(factoryItemId, factoryModuleKey, factoryFormat);
  const material = (state.materials || []).find((m) => m.source === "factory" && m.factoryUniqueKey === key);
  if (material) { material.available = false; material.updatedAt = new Date().toISOString(); }
}
function syncFactoryModuleMaterials(item) {
  state.materials ||= [];
  const normalized = normalizeFactoryItem(item);
  const syllabusItemIds = factorySyllabusItemIds(normalized);
  const now = new Date().toISOString();
  Object.entries(normalizeFactoryModules(normalized.modules || {})).forEach(([moduleKey, module]) => {
    [["Word", module.wordLink], ["PDF", module.pdfLink]].forEach(([format, link]) => {
      const unique = factoryMaterialUniqueKey(normalized.id, moduleKey, format);
      const idx = state.materials.findIndex((m) => m.source === "factory" && (m.factoryUniqueKey === unique || (m.factoryItemId === normalized.id && m.factoryModuleKey === moduleKey && m.factoryFormat === format)));
      if (!String(link || "").trim()) { markFactoryMaterialUnavailable(normalized.id, moduleKey, format); return; }
      const payload = {
        id: idx >= 0 ? state.materials[idx].id : `factory-${normalized.id}-${moduleKey}-${canonical(format)}`,
        title: factoryModuleMaterialTitle(normalized, moduleKey, format), source: "factory", factoryUniqueKey: unique,
        factoryItemId: normalized.id, factoryModuleKey: moduleKey, factoryFormat: format,
        discipline: normalized.disciplina, subject: normalized.tema, syllabusItemId: syllabusItemIds[0] || "", syllabusItemIds,
        link: String(link).trim(), type: format, origin: "Google Drive", date: module.dataConclusao || todayISO(), updatedAt: now, available: true,
        notes: `Material automático da Fábrica (${FACTORY_MODULES.find((m) => m.key === moduleKey)?.label || moduleKey}).`, tags: ["Fábrica de Resumos", moduleKey, format]
      };
      if (idx >= 0) state.materials[idx] = { ...state.materials[idx], ...payload };
      else state.materials.push(payload);
    });
  });
}
function syncAllFactoryMaterials() { ensureFactoryAgenda().forEach(syncFactoryModuleMaterials); }
function materialAvailable(m) { return m && m.available !== false && isValidHttpUrl(m.link || ""); }
function materialsForFactoryItem(item) { const id = item?.id || item; return (state.materials || []).filter((m) => materialAvailable(m) && m.source === "factory" && m.factoryItemId === id); }
function resolveAvailableMaterials({ discipline = "", subject = "", syllabusItemId = "", syllabusItemIds = [], factoryItemId = "" } = {}) {
  const ids = new Set([syllabusItemId, ...syllabusItemIds].filter(Boolean));
  const exact = (m) => canonical(m.discipline) === canonical(discipline) && canonical(m.subject) === canonical(subject);
  return (state.materials || []).filter(materialAvailable).filter((m) =>
    (syllabusItemId && m.syllabusItemId === syllabusItemId) ||
    ([...(m.syllabusItemIds || [])].some((id) => ids.has(id))) ||
    (factoryItemId && m.factoryItemId === factoryItemId) ||
    exact(m)
  );
}
function materialsForDailyGoal(goal = {}) { return resolveAvailableMaterials({ discipline: goal.discipline, subject: goal.subject, syllabusItemId: goal.syllabusItemId }).filter((m) => m.source !== "factory" || m.factoryModuleKey === "resumoAula"); }

function materialTitleById(id) { return state.materials.find((m) => m.id === id)?.title || ""; }
function timeLogFromStudy(study) {
  return { id: study.id, source: "study", date: study.date, discipline: subjectNameById(study.subjectId), subject: study.topic, minutes: Number(study.minutes) || 0, plannedMinutes: Number(study.plannedMinutes) || 0, type: studyOriginLabel(study), status: study.topicStatus || "Iniciado", notes: study.difficultyNotes || "", materialId: study.materialId || "", material: materialTitleById(study.materialId) };
}
function syncTimeChange(reason) { saveData(); render(); autoSyncAfterSave(reason); }
function showTimeUndo(action) { lastTimeAction = action; if (elements.timeUndoNotice) elements.timeUndoNotice.hidden = false; }
function upsertStudyFromPrompts(existing = {}) {
  const subjectNames = state.subjects.map((s) => s.name).join(", ");
  const discipline = prompt(`Disciplina (${subjectNames || "cadastre disciplinas se necessário"})`, existing.discipline || subjectNameById(existing.subjectId) || "");
  if (!discipline) return null;
  let subject = state.subjects.find((s) => canonical(s.name) === canonical(discipline));
  if (!subject) { subject = { id: createId(), name: discipline.trim(), goalHours: 0 }; state.subjects.push(subject); }
  const topic = prompt("Assunto", existing.topic || existing.subject || ""); if (!topic) return null;
  const date = prompt("Data (AAAA-MM-DD)", existing.date || todayISO()); if (!date || Number.isNaN(Date.parse(`${date}T00:00:00`))) return alert("Data inválida."), null;
  const minutes = Number(prompt("Duração em minutos", existing.minutes || 0)); if (!Number.isFinite(minutes) || minutes <= 0) return alert("Informe tempo maior que zero."), null;
  const materialList = state.materials.map((m) => `${m.id}: ${m.title}`).join("\n");
  const materialId = prompt(`Material vinculado opcional: cole o ID ou deixe vazio\n${materialList}`, existing.materialId || "") || "";
  const difficultyNotes = prompt("Observação opcional", existing.difficultyNotes || existing.notes || "") || "";
  const linkedItem = findSyllabusItemByStudy(subject.id, topic);
  return { ...existing, id: existing.id || createId(), date, subjectId: subject.id, syllabusItemId: linkedItem?.id || existing.syllabusItemId || "", topic, minutes, plannedMinutes: Number(existing.plannedMinutes) || 0, topicStatus: existing.topicStatus || "Iniciado", difficultyNotes, materialId, questions: Number(existing.questions) || 0, correct: Number(existing.correct) || 0, wrong: Number(existing.wrong) || 0, blank: Number(existing.blank) || 0, origin: existing.origin || "manual" };
}
function addManualTime() { const study = upsertStudyFromPrompts({ origin: "manual", date: todayISO() }); if (!study) return; state.studies.push(study); syncTimeChange("timer-manual"); }
function editStudyTime(id) { const idx = state.studies.findIndex((s) => s.id === id); if (idx < 0) return; const before = cloneData(state.studies[idx]); const edited = upsertStudyFromPrompts(state.studies[idx]); if (!edited) return; state.studies[idx] = edited; showTimeUndo({ type: "edit", before, afterId: id }); syncTimeChange("timer-edit"); }
function deleteStudyTime(id) { const idx = state.studies.findIndex((s) => s.id === id); if (idx < 0) return; if (!confirm("Deseja realmente excluir este tempo salvo?")) return; const [removed] = state.studies.splice(idx, 1); showTimeUndo({ type: "delete", removed, index: idx }); syncTimeChange("timer-delete"); }
function undoTimeAction() { if (!lastTimeAction) return; if (lastTimeAction.type === "delete") state.studies.splice(lastTimeAction.index, 0, lastTimeAction.removed); if (lastTimeAction.type === "edit") { const idx = state.studies.findIndex((s) => s.id === lastTimeAction.afterId); if (idx >= 0) state.studies[idx] = lastTimeAction.before; } lastTimeAction = null; if (elements.timeUndoNotice) elements.timeUndoNotice.hidden = true; syncTimeChange("timer-edit"); }

function getStudyTimeLogs() {
  const studyLogs = state.studies.map(timeLogFromStudy);
  const goalLogs = state.dailyGoals.filter((goal) => goalTotalActualMinutes(goal) > 0).map((goal) => ({ date: goal.date, discipline: goal.discipline, subject: goal.subject, minutes: goalTotalActualMinutes(goal), plannedMinutes: Number(goal.minutes) || 0, type: goal.type || goal.tipo || "Meta", status: goal.studyStatus || goal.status || "Iniciado", notes: goal.notes || goal.observacoes || "" }));
  const questionLogs = state.questionLogs.filter((log) => Number(log.minutes) > 0).map((log) => ({ date: log.date, discipline: log.discipline, subject: log.subject, minutes: Number(log.minutes) || 0, plannedMinutes: 0, type: log.trainingType || "Questões", status: "Concluído", notes: log.notes || "" }));
  return [...studyLogs, ...goalLogs, ...questionLogs];
}
function planningMetrics() {
  const total = state.syllabusItems.length;
  const completed = state.syllabusItems.filter(isTopicStudied).length;
  const pending = Math.max(0, total - completed);
  const logs = getStudyTimeLogs();
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const completedWithTime = Math.max(1, new Set(logs.map((log) => `${canonical(log.discipline)}|${canonical(log.subject)}`)).size || completed || 1);
  const avgMinutes = totalMinutes ? totalMinutes / completedWithTime : 60;
  const remainingMinutes = pending * avgMinutes;
  const weekStudiedDates = [...new Set(logs.map((log) => log.date))].sort();
  const weeks = weekStudiedDates.length ? Math.max(1, Math.ceil((parseDate(weekStudiedDates.at(-1)) - parseDate(weekStudiedDates[0])) / 604800000) + 1) : 1;
  const avgTopicsWeek = completed / weeks;
  let forecastDate = "";
  let cursor = todayISO(); let remainingHours = remainingMinutes / 60;
  for (let i = 0; i < 730 && remainingHours > 0; i++) { const av = availabilityForDate(cursor); remainingHours -= Number(av.hours) || 0; if (remainingHours <= 0) forecastDate = cursor; cursor = addDays(cursor, 1); }
  const exam = planningConfig().examDate || state.edital.examDate || "";
  const diffDays = forecastDate && exam ? Math.ceil((parseDate(exam) - parseDate(forecastDate)) / 86400000) : null;
  const safeDiff = diffDays === null ? null : diffDays - (Number(planningConfig().safetyDays) || 0);
  return { total, completed, pending, percent: total ? Math.round(completed / total * 100) : 0, avgTopicsWeek, avgMinutes, totalEstimatedMinutes: total * avgMinutes, totalMinutes, remainingMinutes, forecastDate, examDate: exam, diffDays, safeDiff };
}
function weekAvailability(start = todayISO()) { let total = 0; const days = []; for (let i=0;i<7;i++){ const date=addDays(start,i); const av=availabilityForDate(date); total += Number(av.hours)||0; days.push({date,...av}); } return { total, days }; }

function planningSituation(metrics) { return metrics.safeDiff === null ? "sem prova" : metrics.safeDiff < 0 ? "atrasado" : metrics.safeDiff <= 7 ? "em dia" : "adiantado"; }
function progressStatusClass(status) { return status === "adiantado" ? "success" : status === "atrasado" ? "danger" : "warn"; }
function progressMetrics() {
  migrateImportedDisciplines();
  const total = state.syllabusItems.length;
  const studiedItems = state.syllabusItems.filter(isTopicStudied);
  const startedItems = state.syllabusItems.filter(isTopicStarted);
  const reviewedItems = state.syllabusItems.filter(isTopicReviewed);
  const pendingItems = state.syllabusItems.filter((item) => !isTopicStudied(item));
  const studied = studiedItems.length;
  const percent = total ? Math.round((studied / total) * 100) : 0;
  const totalMinutes = state.syllabusItems.reduce((sum, item) => sum + minutesForItem(item), 0);
  const avgMinutes = studied ? totalMinutes / studied : 0;
  const plan = planningMetrics();
  const remainingMinutes = pendingItems.length * (avgMinutes || plan.avgMinutes || 60);
  const forecastDate = plan.forecastDate;
  const situation = planningSituation(plan);
  const disciplines = Object.values(state.syllabusItems.reduce((acc, item) => {
    const key = item.discipline || "Sem disciplina";
    acc[key] ||= { discipline: key, total: 0, studied: 0, pending: 0, minutes: 0 };
    acc[key].total += 1;
    acc[key].minutes += minutesForItem(item);
    if (isTopicStudied(item)) acc[key].studied += 1; else acc[key].pending += 1;
    return acc;
  }, {})).map((d) => {
    d.percent = d.total ? Math.round(d.studied / d.total * 100) : 0;
    d.avgMinutes = d.studied ? d.minutes / d.studied : 0;
    d.status = d.percent + 10 < percent ? "atrasada" : d.percent >= percent + 10 ? "adiantada" : "em dia";
    return d;
  }).sort((a,b) => a.percent - b.percent || b.pending - a.pending);
  const slowThreshold = Math.max(180, (plan.avgMinutes || avgMinutes || 0) * 1.5);
  const alerts = [];
  if (!studied && !totalMinutes) alerts.push("Ainda não há dados suficientes para prever o término. Registre estudos ou marque assuntos como concluídos.");
  else if (plan.diffDays !== null && plan.diffDays < 0) alerts.push("No ritmo atual, o edital não será concluído antes da prova.");
  else if (plan.forecastDate) alerts.push("No ritmo atual, o edital será concluído antes da prova.");
  disciplines.filter((d) => d.status === "atrasada").slice(0, 3).forEach((d) => alerts.push(`${d.discipline}: esta disciplina está atrasada em relação ao restante do edital.`));
  if (avgMinutes > slowThreshold) alerts.push("Seu tempo médio por assunto está elevado. Avalie dividir o assunto em blocos menores.");
  return { total, studied, started: startedItems.length, pending: pendingItems.length, reviewed: reviewedItems.length, percent, totalMinutes, avgMinutes, remainingMinutes, forecastDate, examDate: plan.examDate, daysUntilExam: plan.examDate ? Math.ceil((parseDate(plan.examDate) - parseDate(todayISO())) / 86400000) : null, situation, disciplines, alerts };
}
function progressBar(percentValue) { return `<div class="progress"><span style="width:${Math.max(0, Math.min(100, percentValue))}%"></span></div>`; }
function renderProgressPanel() {
  if (!elements.progressGeneralCards) return;
  const m = progressMetrics();
  const cards = [["Total de assuntos", m.total], ["Assuntos estudados", m.studied], ["Assuntos iniciados", m.started], ["Assuntos pendentes", m.pending], ["Assuntos revisados", m.reviewed], ["Percentual geral", `${m.percent}%`], ["Horas totais estudadas", formatHours(m.totalMinutes)], ["Tempo médio por assunto", m.avgMinutes ? formatHours(m.avgMinutes) : "-"], ["Horas estimadas restantes", formatHours(m.remainingMinutes)], ["Previsão de conclusão", formatDateBR(m.forecastDate)], ["Dias restantes até a prova", m.daysUntilExam ?? "-"], ["Situação do planejamento", m.situation]];
  elements.progressGeneralCards.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong class="stat-value-compact">${escapeHTML(value)}</strong></article>`).join("");
  elements.progressMainBar.innerHTML = `<h3>${m.studied} de ${m.total} assuntos estudados — ${m.percent}%</h3>${progressBar(m.percent)}`;
  elements.progressAlerts.innerHTML = m.alerts.map((alert) => `<div class="alert-item"><span class="badge ${alert.includes("não será") || alert.includes("atrasada") ? "danger" : "warn"}">Alerta</span><div>${escapeHTML(alert)}</div></div>`).join("");
  elements.progressDisciplines.innerHTML = m.disciplines.map((d) => `<article class="syllabus-card"><header><div><h3>${escapeHTML(d.discipline)}</h3><div class="item-meta">${d.studied} de ${d.total} estudados • ${d.pending} pendentes • ${formatHours(d.minutes)} estudadas</div></div><span class="badge ${progressStatusClass(d.status.replace("atrasada", "atrasado").replace("adiantada", "adiantado"))}">${d.status}</span></header>${progressBar(d.percent)}<div class="card-meta-grid"><span>Total: ${d.total}</span><span>Estudados: ${d.studied}</span><span>Pendentes: ${d.pending}</span><span>Concluído: ${d.percent}%</span><span>Horas estudadas: ${formatHours(d.minutes)}</span><span>Tempo médio/assunto: ${d.avgMinutes ? formatHours(d.avgMinutes) : "-"}</span></div></article>`).join("");
}
function renderDashboardProgressSummary() {
  if (!elements.dashboardProgressSummary) return;
  const m = progressMetrics(); const lag = m.disciplines[0];
  elements.dashboardProgressSummary.innerHTML = `<div><strong>${m.percent}%</strong><span>${m.studied}/${m.total} assuntos estudados</span>${progressBar(m.percent)}</div><div class="card-meta-grid"><span>Previsão: ${escapeHTML(formatDateBR(m.forecastDate))}</span><span>Mais atrasada: ${escapeHTML(lag ? `${lag.discipline} (${lag.percent}%)` : "-")}</span><span>Horas restantes: ${formatHours(m.remainingMinutes)}</span><span>Situação: ${escapeHTML(m.situation)}</span></div>`;
}
function updateItemProgress(id, patch = {}) { const item = getSyllabusById(id); if (!item) return; Object.assign(item, patch, { updatedAt: new Date().toISOString() }); }
function findSyllabusItemByStudy(subjectId, topic) { const discipline = subjectNameById(subjectId); return state.syllabusItems.find((item) => canonical(item.discipline) === canonical(discipline) && (canonical(topic).includes(canonical(item.subject)) || canonical(item.subject).includes(canonical(topic)))); }

function renderPlanning() {
  if (!elements.planningConfigForm) return;
  const c = planningConfig();
  elements.planningExamDate.value = c.examDate || state.edital.examDate || ""; elements.planningScaleType.value = c.scaleType; if (elements.planningScaleReferenceDate) elements.planningScaleReferenceDate.value = c.scaleReferenceDate || todayISO(); if (elements.planningScaleReferencePosition) elements.planningScaleReferencePosition.value = String(Number(c.scaleReferencePosition)||0); if (elements.scale3x6Fields) elements.scale3x6Fields.hidden = c.scaleType !== "3 dias de trabalho / 6 dias de folga"; elements.planningScaleNotes.value = c.scaleNotes || ""; elements.planningShiftHours.value = c.shiftHours; elements.planningRestHours.value = c.restHours; elements.planningNormalHours.value = c.normalHours; elements.planningMinWeeklyHours.value = c.minWeeklyHours; elements.planningIdealWeeklyHours.value = c.idealWeeklyHours; elements.planningWeeklyTopics.value = c.weeklyTopics; elements.planningDisciplinesPerDay.value = c.disciplinesPerDay; elements.planningDisciplinesPerWeek.value = c.disciplinesPerWeek; elements.planningDisciplinesPerMonth.value = c.disciplinesPerMonth; elements.planningTopicsPerDay.value = c.topicsPerDay; elements.planningTopicsPerWeek.value = c.topicsPerWeek; elements.planningTopicsPerMonth.value = c.topicsPerMonth; elements.planningSafetyDays.value = c.safetyDays;
  elements.availabilityCalendar.innerHTML = Array.from({length: 21}, (_, i) => { const date = addDays(todayISO(), i); const av = availabilityForDate(date); return `<article class="syllabus-card"><header><div><h3>${formatDateBR(date)}</h3><div class="item-meta">Horas estimadas editáveis para este dia.</div></div></header><div class="card-actions"><label>Tipo <select data-availability-type="${date}">${["plantão","folga","dia normal","indisponível","estudo leve","estudo forte"].map((t)=>`<option ${av.type===t?"selected":""}>${t}</option>`).join("")}</select></label><label>Horas <input data-availability-hours="${date}" type="number" min="0" step="0.5" value="${av.hours}"></label></div></article>`; }).join("");
  const m = planningMetrics(); state.planning.forecasts = { ...m, updatedAt: new Date().toISOString() };
  const cards = [["Total de assuntos",m.total],["Concluídos",m.completed],["Pendentes",m.pending],["Edital estudado",`${m.percent}%`],["Assuntos/semana",m.avgTopicsWeek.toFixed(1)],["Tempo médio/assunto",formatHours(m.avgMinutes)],["Horas estimadas",formatHours(m.totalEstimatedMinutes)],["Horas já estudadas",formatHours(m.totalMinutes)],["Horas restantes",formatHours(m.remainingMinutes)],["Conclusão prevista",formatDateBR(m.forecastDate)],["Diferença para prova",m.diffDays===null?"-":`${m.diffDays} dias`]];
  elements.completionForecast.innerHTML = cards.map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong class="stat-value-compact">${b}</strong></article>`).join("");
  elements.completionAlert.textContent = m.diffDays !== null && m.diffDays < 0 ? "No ritmo atual, o edital não será concluído antes da prova." : "No ritmo atual, o edital será concluído antes da prova.";
  const w = weekAvailability(); const possibleTopics = Math.floor((w.total*60)/(m.avgMinutes||60)); const neededWeeks = m.examDate ? Math.max(1, Math.ceil((parseDate(m.examDate)-parseDate(todayISO()))/604800000)) : 1; const neededTopics = Math.ceil(m.pending/neededWeeks); const suggested = Math.max(0, Math.min(m.pending, Math.max(possibleTopics, neededTopics, Number(c.weeklyTopics)||0)));
  elements.weeklyGoalsPlan.innerHTML = [["Horas disponíveis",`${w.total.toFixed(1)}h`],["Assuntos sugeridos",suggested],["Horas sugeridas/dia",`${(w.total/7).toFixed(1)}h`],["Meta mínima",`${c.minWeeklyHours}h`],["Meta ideal",`${c.idealWeeklyHours}h`]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong class="stat-value-compact">${b}</strong></article>`).join("");
  elements.weeklyGoalsAlert.textContent = w.total < c.minWeeklyHours ? "Alerta: semana abaixo da meta mínima; compense nas folgas quando possível." : (m.safeDiff !== null && m.safeDiff < 0 ? "Alerta: planejamento atrasado para a margem de segurança." : "Planejamento em dia ou adiantado para a rotina informada.");
  const logs = getStudyTimeLogs().sort((a,b)=>b.date.localeCompare(a.date)); const byDisc = logs.reduce((a,l)=>(a[l.discipline]=(a[l.discipline]||0)+l.minutes,a),{}); const top = Object.entries(byDisc).sort((a,b)=>b[1]-a[1])[0];
  elements.timeHistorySummary.innerHTML = [["Hoje",formatHours(logs.filter(l=>l.date===todayISO()).reduce((s,l)=>s+l.minutes,0))],["Semana",formatHours(logs.filter(l=>isSameWeek(l.date)).reduce((s,l)=>s+l.minutes,0))],["Edital",formatHours(m.totalMinutes)],["Disciplina mais estudada",top?`${top[0]} (${formatHours(top[1])})`:"-"]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong>${escapeHTML(b)}</strong></article>`).join("");
  elements.timeHistoryBody.innerHTML = logs.slice(0,50).map((l)=>`<tr><td>${formatDateBR(l.date)}</td><td>${escapeHTML(l.discipline)}</td><td>${escapeHTML(l.subject)}</td><td>${l.minutes} min</td><td>${escapeHTML(l.type)}</td><td>${escapeHTML(l.status)}</td><td>${escapeHTML(l.material || "-")}</td><td>${escapeHTML(l.notes||"-")}</td><td>${l.source === "study" ? `<button type="button" data-time-edit="${l.id}">Editar</button> <button class="danger" type="button" data-time-delete="${l.id}">Excluir</button>` : "-"}</td></tr>`).join("");
}

function renderDashboard() {
  renderSmartReviewSummary();
  const today = todayISO(); const todayMinutes = state.studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.minutes, 0); const weekMinutes = state.studies.filter((study) => isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); const totalQuestions = state.studies.reduce((sum, study) => sum + study.questions, 0); const correct = state.studies.reduce((sum, study) => sum + study.correct, 0);
  const total = state.syllabusItems.length; const studied = state.syllabusItems.filter(completedStatus).length; const weak = state.syllabusItems.filter(isWeakItem).length; const undiagnosed = state.syllabusItems.filter(isUndiagnosed).length; const notStarted = state.syllabusItems.filter((item) => item.status === "Não iniciado").length;
  const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => ({ ...acc, [item.discipline]: (acc[item.discipline] || 0) + 1 }), {}); const topPending = Object.entries(pendingByDiscipline).sort((a, b) => b[1] - a[1])[0];
  const questionTotals = getQuestionTotals(); const pendingGoals = state.dailyGoals.filter((goal) => goal.date === today && goal.status === "Pendente").length; const doneGoals = state.dailyGoals.filter((goal) => goal.date === today && goal.status === "Concluída").length;
  elements.todayHours.textContent = formatHours(todayMinutes); elements.weekHours.textContent = formatHours(weekMinutes); elements.weeklyGoalStatus.textContent = `${formatHours(weekMinutes)} registradas`; elements.totalQuestions.textContent = questionTotals.total || totalQuestions; elements.accuracyRate.textContent = questionTotals.total ? `${Math.round(questionTotals.correct / questionTotals.total * 100)}%` : (totalQuestions ? `${Math.round((correct / totalQuestions) * 100)}%` : "0%"); elements.generalCebraspeNet.textContent = questionTotals.net; elements.todayPendingGoals.textContent = pendingGoals; elements.todayDoneGoals.textContent = doneGoals;
  const progress = progressMetrics(); const plan = planningMetrics(); renderDashboardProgressSummary(); if (elements.totalStudyTime) elements.totalStudyTime.textContent = formatHours(plan.totalMinutes); if (elements.averageTimePerTopic) elements.averageTimePerTopic.textContent = formatHours(plan.avgMinutes); if (elements.dashboardCompletionForecast) elements.dashboardCompletionForecast.textContent = formatDateBR(plan.forecastDate); if (elements.daysUntilExam) elements.daysUntilExam.textContent = plan.examDate ? Math.ceil((parseDate(plan.examDate) - parseDate(todayISO())) / 86400000) : "-"; if (elements.planningStatus) elements.planningStatus.textContent = plan.safeDiff === null ? "sem prova" : plan.safeDiff < 0 ? "atrasado" : plan.safeDiff <= 7 ? "em dia" : "adiantado";
  if (elements.syllabusStudied) elements.syllabusStudied.textContent = `${progress.percent}%`; if (elements.dashboardStudiedTopics) elements.dashboardStudiedTopics.textContent = studied; if (elements.syllabusTotal) elements.syllabusTotal.textContent = total; if (elements.schedulableTotal) elements.schedulableTotal.textContent = state.syllabusItems.filter((item) => isSchedulable(item.id)).length; if (elements.notStartedTotal) elements.notStartedTotal.textContent = notStarted; if (elements.undiagnosedTotal) elements.undiagnosedTotal.textContent = undiagnosed; if (elements.weakTotal) elements.weakTotal.textContent = weak; if (elements.pendingDiscipline) elements.pendingDiscipline.textContent = topPending ? `${topPending[0]} (${topPending[1]})` : "-";
  if (elements.dashboardQuestionBankTotal) elements.dashboardQuestionBankTotal.textContent = state.questionBank?.length || 0;
  if (elements.dashboardQuestionBankSessions) elements.dashboardQuestionBankSessions.textContent = state.questionBankSessions?.length || 0;
  if (elements.dashboardQuestionBankLast) elements.dashboardQuestionBankLast.textContent = state.questionBankSessions?.[0] ? new Date(state.questionBankSessions[0].createdAt).toLocaleString("pt-BR") : "-";
  const qbPackageSummary = qbSyllabusPackageSummary();
  if (elements.dashboardQuestionBankPackages) elements.dashboardQuestionBankPackages.textContent = qbPackageSummary.packages;
  if (elements.dashboardQuestionBankLinked) elements.dashboardQuestionBankLinked.textContent = qbPackageSummary.linked;
  if (elements.dashboardQuestionBankMissing) elements.dashboardQuestionBankMissing.textContent = qbPackageSummary.missing;
  if (elements.dashboardMinWeeklyHours) elements.dashboardMinWeeklyHours.textContent = `${planningConfig().minWeeklyHours || 0}h`; if (elements.dashboardIdealWeeklyHours) elements.dashboardIdealWeeklyHours.textContent = `${planningConfig().idealWeeklyHours || 0}h`; if (elements.dashboardProblemDiscipline) elements.dashboardProblemDiscipline.textContent = problemQuestionDiscipline(); const todayGoals = state.dailyGoals.filter((g)=>g.date===todayISO()); const wsDash = weekStart(todayISO()), weDash = addDays(wsDash,6), weekGoals = goalsBetween(wsDash,weDash); if (elements.dashboardTodayDisciplines) elements.dashboardTodayDisciplines.textContent = new Set(todayGoals.map((g)=>g.discipline)).size; if (elements.dashboardTodayTopics) elements.dashboardTodayTopics.textContent = todayGoals.length; if (elements.dashboardWeekDisciplines) elements.dashboardWeekDisciplines.textContent = new Set(weekGoals.map((g)=>g.discipline)).size; if (elements.dashboardWeekTopics) elements.dashboardWeekTopics.textContent = weekGoals.length;
  if (elements.materialsTotal) { elements.materialsTotal.textContent = state.materials.length; elements.materialDisciplinesTotal.textContent = new Set(state.materials.map((m)=>canonical(m.discipline)).filter(Boolean)).size; elements.materialTopicsTotal.textContent = new Set(state.materials.map((m)=>`${canonical(m.discipline)}|${canonical(m.subject)}`).filter((v)=>v!=="|")).size; }
  const ms = mockStats(); if (elements.mockTotal) elements.mockTotal.textContent = ms.count; if (elements.mockLastNet) elements.mockLastNet.textContent = ms.last; if (elements.mockBestNet) elements.mockBestNet.textContent = ms.best; if (elements.mockAverageNet) elements.mockAverageNet.textContent = ms.average; if (elements.mockAboveGoal) elements.mockAboveGoal.textContent = ms.aboveGoal; if (elements.mockProblemDiscipline) elements.mockProblemDiscipline.textContent = ms.problemDiscipline;
}
function renderEdital() { ["contestName", "agency", "role", "board", "examDate", "officialLink", "generalNotes"].forEach((key) => { elements[key].value = state.edital[key] || ""; }); elements.pdfInfo.innerHTML = state.edital.pdf ? `<strong>Arquivo:</strong> ${escapeHTML(state.edital.pdf.name)}<br><span class="item-meta">Anexado em ${escapeHTML(state.edital.pdf.attachedAt)}</span>` : ""; }
function getFilteredItems() {
  const term = canonical(elements.filterSearch.value);
  return state.syllabusItems.filter((item) => {
    const haystack = [item.discipline, item.topic, item.subject, item.subtopic, item.reference, item.notes].map(canonical).join(" ");
    return (!term || haystack.includes(term))
      && (!elements.filterDiscipline.value || item.discipline === elements.filterDiscipline.value)
      && (!elements.filterPriority.value || item.priority === elements.filterPriority.value)
      && (!elements.filterStatus.value || item.status === elements.filterStatus.value)
      && (!elements.filterDomain.value || item.domain === elements.filterDomain.value)
      && (!elements.filterSchedulable.value || (elements.filterSchedulable.value === "yes" ? isSchedulable(item.id) : !isSchedulable(item.id)))
      && (!elements.filterQuick.value || (elements.filterQuick.value === "schedulable" && isSchedulable(item.id)) || (elements.filterQuick.value === "notStarted" && item.status === "Não iniciado") || (elements.filterQuick.value === "weak" && isWeakItem(item)) || (elements.filterQuick.value === "undiagnosed" && isUndiagnosed(item)));
  });
}
function renderFilters() { const current = elements.filterDiscipline.value; const disciplines = getAllDisciplines(); elements.filterDiscipline.innerHTML = '<option value="">Todas</option>' + disciplines.map((d) => `<option ${d === current ? "selected" : ""}>${escapeHTML(d)}</option>`).join(""); }
function renderSyllabus() {
  renderFilters();
  const filtered = getFilteredItems();
  const visibleItems = filtered.slice(0, syllabusVisibleCount);
  elements.syllabusList.innerHTML = "";
  elements.syllabusCount.textContent = filtered.length ? `Exibindo ${visibleItems.length} de ${filtered.length} assunto(s) filtrado(s).` : "Nenhum assunto encontrado com os filtros atuais.";
  elements.showMoreSyllabus.hidden = visibleItems.length >= filtered.length;
  visibleItems.forEach((item) => {
    const setting = settingFor(item.id);
    const weak = isWeakItem(item);
    const undiagnosed = isUndiagnosed(item);
    const card = document.createElement("article"); card.className = "syllabus-card";
    const linked = materialsForTopic(item.discipline, item.subject, item.id);
    card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)}${item.subtopic ? ` • ${escapeHTML(item.subtopic)}` : ""}</div></div><span class="badge ${isTopicStudied(item) ? "success" : isTopicStarted(item) ? "warn" : "neutral"}">${escapeHTML(normalizeProgressStatus(item.status))}</span></header><div class="card-meta-grid"><span>Status: ${escapeHTML(item.status)}</span><span>Domínio: ${escapeHTML(item.domain)}</span><span>Diagnóstico: ${undiagnosed ? "Sem diagnóstico" : weak ? "Fraco" : "OK"}</span><span>Tempo no assunto: ${formatHours(minutesForItem(item))}</span><span>Incidência do assunto: ${normalizeSubjectIncidence(item.weight)} = ${escapeHTML(subjectIncidenceLabel(item.weight))}</span><span>Ref.: ${escapeHTML(item.reference || "-")}</span></div>${item.notes ? `<p class="item-meta">${escapeHTML(item.notes)}</p>` : ""}${linkedMaterialsHTML(linked)}<div class="card-actions"><label>Incidência do assunto <select data-incidence-id="${item.id}" title="Incidência do assunto: usada para priorizar o estudo sem alterar a ordem do edital.">${subjectIncidenceOptions(item.weight)}</select></label><button type="button" data-action="edit" data-id="${item.id}">Editar</button><button type="button" data-action="not-started" data-id="${item.id}">Não iniciado</button><button type="button" data-action="started" data-id="${item.id}">Iniciado</button><button type="button" data-action="studied" data-id="${item.id}">Concluído</button><button type="button" data-action="review" data-id="${item.id}">Revisado</button><button type="button" data-action="weak" data-id="${item.id}">Marcar como fraco</button><button type="button" data-action="schedulable" data-id="${item.id}">${setting.availability === "Agendável" ? "Desativar" : "Ativar"} agendável</button><button class="danger" type="button" data-action="delete" data-id="${item.id}">Excluir assunto</button></div><div class="progress-controls"><label>Tempo estudado no assunto (min)<input type="number" min="0" data-progress-field="minutes" data-progress-id="${item.id}" value="${Number(item.studyMinutes) || 0}"></label><label>Observação curta<input type="text" maxlength="140" data-progress-field="notes" data-progress-id="${item.id}" value="${escapeHTML(item.progressNotes || "")}" placeholder="Ex.: revisar exceções"></label></div>`;
    elements.syllabusList.appendChild(card);
  });
}
function renderSchedulable() { elements.schedulableList.innerHTML = ""; state.syllabusItems.forEach((item) => { const setting = settingFor(item.id); const linked = materialsForTopic(item.discipline, item.subject, item.id); const card = document.createElement("article"); card.className = "syllabus-card"; card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)} • ${escapeHTML(item.status)} • domínio ${escapeHTML(item.domain)}</div></div><span class="badge ${setting.priority ? "danger" : isSchedulable(item.id) ? "success" : "neutral"}">${setting.priority ? "Prioritário" : setting.availability}</span></header><div class="card-actions"><label>Disponibilidade <select data-setting="availability" data-id="${item.id}"><option ${setting.availability === "Agendável" ? "selected" : ""}>Agendável</option><option ${setting.availability === "Não agendável" ? "selected" : ""}>Não agendável</option></select></label><label>Tipo <select data-setting="mode" data-id="${item.id}"><option ${setting.mode === "Revisão apenas" ? "selected" : ""}>Revisão apenas</option><option ${setting.mode === "Questões apenas" ? "selected" : ""}>Questões apenas</option><option ${setting.mode === "Estudo teórico" ? "selected" : ""}>Estudo teórico</option><option ${setting.mode === "Estudo + questões" ? "selected" : ""}>Estudo + questões</option></select></label><label><input type="checkbox" data-setting="priority" data-id="${item.id}" ${setting.priority ? "checked" : ""}> Assunto prioritário</label></div>${linkedMaterialsHTML(linked)}<div class="card-actions"><button type="button" data-create-factory-from-syllabus="${item.id}">Criar na Fábrica</button></div>`; elements.schedulableList.appendChild(card); }); }

function lastStudyDateForItem(item) {
  const dates = [
    ...studiesForItem(item).map((study) => study.date),
    ...goalsForItem(item).filter((goal) => isGoalDone(goal) || goalTotalActualMinutes(goal) > 0).map((goal) => goal.date),
    ...questionLogsForItem(item).filter((log) => Number(log.total) > 0).map((log) => log.date)
  ].filter(Boolean).sort();
  return dates.at(-1) || "";
}
function lastReviewForItem(item, status = "revisado") {
  return state.smartReviews.filter((review) => review.syllabusItemId === item.id && (!status || review.status === status)).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
}
function recentErrorLogForItem(item) {
  return questionLogsForItem(item).filter((log) => Number(log.wrong) > 0).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
}
function smartReviewReason(item) {
  const errorLog = recentErrorLogForItem(item);
  if (errorLog && daysDiff(todayISO(), errorLog.date) <= 14) return { rank: 1, label: "Erro recente em questões" };
  if (isWeakItem(item)) return { rank: 2, label: "Domínio fraco" };
  if (isUndiagnosed(item)) return { rank: 3, label: "Sem diagnóstico" };
  if ((item.priority || "").toLowerCase() === "alta") return { rank: 4, label: "Alta prioridade no edital" };
  const lastStudy = lastStudyDateForItem(item);
  if (lastStudy) {
    const age = daysDiff(todayISO(), lastStudy);
    if ([1, 3, 7, 15, 30].includes(age)) return { rank: 5, label: `Estudado há ${age} dia${age > 1 ? "s" : ""}` };
  }
  if (!lastReviewForItem(item)) return { rank: 6, label: "Nunca revisado" };
  return null;
}
function smartReviewPlan(date = todayISO()) {
  const av = availabilityForDate(date);
  const type = av.type || "dia normal";
  if (type === "indisponível") return { count: 0, minutes: 0, optional: true, label: dayTypeLabel(av) };
  if (type === "plantão") return { count: 1, minutes: 15, label: dayTypeLabel(av) };
  if (type === "folga" || type === "estudo forte") return { count: 3, minutes: 25, label: dayTypeLabel(av) };
  if (type === "estudo leve") return { count: 1, minutes: 20, label: dayTypeLabel(av) };
  return { count: 2, minutes: 20, label: dayTypeLabel(av) };
}
function getSmartReviewSuggestions(date = todayISO()) {
  const plan = smartReviewPlan(date);
  const todaysRecords = state.smartReviews.filter((review) => review.date === date);
  const closed = new Set(todaysRecords.filter((review) => ["revisado", "adiado"].includes(review.status)).map((review) => review.syllabusItemId || `${canonical(review.discipline)}|${canonical(review.subject)}`));
  const existingPending = todaysRecords.filter((review) => review.status === "sugerido");
  const suggestions = existingPending.map((review) => ({ ...review, reason: review.reason || review.origin, minutes: Number(review.minutes) || plan.minutes }));
  const candidates = state.syllabusItems.map((item) => ({ item, reason: smartReviewReason(item), lastStudy: lastStudyDateForItem(item) })).filter(({ item, reason }) => reason && item.status !== "Ignorado" && !closed.has(item.id) && !closed.has(`${canonical(item.discipline)}|${canonical(item.subject)}`) && !suggestions.some((r) => r.syllabusItemId === item.id));
  candidates.sort((a, b) => a.reason.rank - b.reason.rank || (b.lastStudy || "").localeCompare(a.lastStudy || "") || (Number(b.item.weight) || 0) - (Number(a.item.weight) || 0));
  return suggestions.concat(candidates.slice(0, Math.max(0, plan.count - suggestions.length)).map(({ item, reason }) => ({ id: `smart-${date}-${item.id}`, date, discipline: item.discipline, subject: item.subject, syllabusItemId: item.id, origin: reason.label, reason: reason.label, minutes: plan.minutes, status: "sugerido" }))).slice(0, 3);
}
function suggestedMinutesForReview(review) {
  return Number(review.suggestedMinutes ?? review.tempoSugerido ?? review.tempo_sugerido ?? review.minutes) || smartReviewPlan(review.date || todayISO()).minutes || 0;
}
function performedMinutesForReview(review) {
  return Number(review.performedMinutes ?? review.tempoRealizado ?? review.tempo_realizado ?? review.realizedMinutes ?? review.actualMinutes) || 0;
}
function smartReviewCard(review) {
  const suggested = suggestedMinutesForReview(review);
  const performed = performedMinutesForReview(review) || suggested;
  return `<article class="smart-review-card" data-review-card-id="${escapeHTML(review.id)}"><header><div><span class="card-label">Disciplina</span><h4>${escapeHTML(review.discipline)}</h4><span class="card-label">Assunto</span><p>${escapeHTML(review.subject)}</p></div><span class="badge warn no-break">${suggested} min</span></header><div class="review-reason"><strong>Motivo da revisão:</strong> ${escapeHTML(review.reason || review.origin || "Revisão indicada")}</div><div class="review-time-grid"><label>Tempo sugerido (min)<input type="number" min="0" step="5" inputmode="numeric" data-smart-review-time="suggested" data-id="${escapeHTML(review.id)}" value="${suggested}"></label><label>Tempo realizado (min)<input type="number" min="0" step="5" inputmode="numeric" data-smart-review-time="performed" data-id="${escapeHTML(review.id)}" value="${performed}"></label></div><div class="card-actions"><button type="button" data-smart-review-action="done" data-id="${escapeHTML(review.id)}">Marcar como revisado</button><button class="secondary-button" type="button" data-smart-review-action="postpone" data-id="${escapeHTML(review.id)}">Adiar</button></div></article>`;
}
function renderSmartReviewBlock(target, date = todayISO()) {
  if (!target) return;
  const plan = smartReviewPlan(date);
  const suggestions = getSmartReviewSuggestions(date);
  if (!suggestions.length) { target.innerHTML = `<p class="empty-message">${plan.optional ? "Dia indisponível: revisão leve opcional, sem sugestão automática." : "Nenhuma revisão inteligente pendente para hoje."}</p>`; return; }
  target.innerHTML = `<p class="item-meta">${escapeHTML(plan.label)} • até ${suggestions.length} revisão(ões) hoje.</p>` + suggestions.map(smartReviewCard).join("");
}
function renderSmartReviewStandalone() {
  if (!elements.smartReviewStandalone) return;
  const date = elements.smartReviewDate?.value || todayISO();
  if (elements.smartReviewDate && !elements.smartReviewDate.value) elements.smartReviewDate.value = date;
  renderSmartReviewBlock(elements.smartReviewStandalone, date);
}
function renderSmartReviewSummary() {
  const today = todayISO();
  const suggestions = getSmartReviewSuggestions(today);
  const doneToday = state.smartReviews.filter((review) => review.date === today && review.status === "revisado");
  const done = doneToday.length;
  const reasonCounts = suggestions.reduce((acc, review) => (acc[review.reason || review.origin] = (acc[review.reason || review.origin] || 0) + 1, acc), {});
  const mainReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  if (elements.dashboardSmartReviewSuggested) elements.dashboardSmartReviewSuggested.textContent = suggestions.length;
  if (elements.dashboardSmartReviewDone) elements.dashboardSmartReviewDone.textContent = done;
  if (elements.dashboardSmartReviewReason) elements.dashboardSmartReviewReason.textContent = mainReason;
}
function renderSmartReviewsDashboard() {
  if (!elements.reviewsDashboard) return;
  const today = todayISO();
  const suggested = getSmartReviewSuggestions(today);
  const doneToday = state.smartReviews.filter((review) => review.date === today && review.status === "revisado");
  const todaysTimedReviews = state.smartReviews.filter((review) => review.date === today && ["revisado", "adiado", "sugerido"].includes(review.status));
  const reviewKey = (review) => review.syllabusItemId || `${canonical(review.discipline)}|${canonical(review.subject)}|${review.id}`;
  const timedMap = new Map([...suggested, ...todaysTimedReviews].map((review) => [reviewKey(review), review]));
  const suggestedTotal = [...timedMap.values()].reduce((sum, review) => sum + suggestedMinutesForReview(review), 0);
  const doneTotal = doneToday.reduce((sum, review) => sum + performedMinutesForReview(review), 0);
  const avgDone = doneToday.length ? Math.round(doneTotal / doneToday.length) : 0;
  const done = state.smartReviews.filter((review) => review.status === "revisado").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const postponed = state.smartReviews.filter((review) => review.status === "adiado").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const history = state.smartReviews.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const mini = (items) => items.length ? items.slice(0, 10).map((r)=>`<div class="review-item"><strong>${escapeHTML(r.discipline)} — ${escapeHTML(r.subject)}</strong><div class="item-meta">${formatDateBR(r.date)} • ${escapeHTML(r.status)} • ${escapeHTML(r.reason || r.origin || "-")} • sugerido: ${suggestedMinutesForReview(r)} min${r.status === "revisado" ? ` • realizado: ${performedMinutesForReview(r)} min` : ""}</div></div>`).join("") : '<p class="empty-message">Nenhum registro.</p>';
  elements.reviewsDashboard.innerHTML = `<section><h3>Resumo de tempo hoje</h3><div class="stats-grid compact review-time-summary"><article class="stat-card"><span>Tempo sugerido hoje</span><strong class="no-break">${suggestedTotal} min</strong></article><article class="stat-card"><span>Tempo concluído hoje</span><strong class="no-break">${doneTotal} min</strong></article><article class="stat-card"><span>Média por revisão</span><strong class="no-break">${avgDone} min</strong></article></div></section><section><h3>Sugeridas hoje</h3><div class="smart-review-list">${suggested.length ? suggested.map(smartReviewCard).join("") : '<p class="empty-message">Nenhuma sugestão hoje.</p>'}</div></section><section><h3>Revisões concluídas</h3>${mini(done)}</section><section><h3>Revisões adiadas</h3>${mini(postponed)}</section><section><h3>Histórico de revisões</h3>${mini(history)}</section>`;
}
function cssEscapeValue(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
function upsertSmartReviewTime(id, field, rawValue) {
  const review = getSmartReviewSuggestions(todayISO()).find((item) => item.id === id) || state.smartReviews.find((item) => item.id === id);
  if (!review) return;
  const value = Math.max(0, Number(rawValue) || 0);
  let record = state.smartReviews.find((item) => item.id === id && item.status === "sugerido");
  if (!record) {
    record = { ...review, id, date: todayISO(), origin: review.reason || review.origin, motivo: review.reason || review.origin, status: "sugerido" };
    state.smartReviews.push(record);
  }
  if (field === "suggested") Object.assign(record, { minutes: value, suggestedMinutes: value, tempoSugerido: value, tempo_sugerido: value });
  if (field === "performed") Object.assign(record, { performedMinutes: value, tempoRealizado: value, tempo_realizado: value });
  saveData();
  renderSmartReviewSummary();
  renderSmartReviewsDashboard();
}
function saveSmartReviewAction(id, status) {
  const review = getSmartReviewSuggestions(todayISO()).find((item) => item.id === id) || state.smartReviews.find((item) => item.id === id);
  if (!review) return;
  const suggestedInput = document.querySelector(`[data-smart-review-time="suggested"][data-id="${cssEscapeValue(id)}"]`);
  const performedInput = document.querySelector(`[data-smart-review-time="performed"][data-id="${cssEscapeValue(id)}"]`);
  const suggestedMinutes = Math.max(0, Number(suggestedInput?.value ?? suggestedMinutesForReview(review)) || 0);
  const performedMinutes = Math.max(0, Number(performedInput?.value ?? suggestedMinutes) || 0);
  const payload = { ...review, id: createId(), date: todayISO(), origin: review.reason || review.origin, motivo: review.reason || review.origin, minutes: suggestedMinutes, suggestedMinutes, tempoSugerido: suggestedMinutes, tempo_sugerido: suggestedMinutes, status };
  if (status === "revisado") Object.assign(payload, { performedMinutes, tempoRealizado: performedMinutes, tempo_realizado: performedMinutes });
  state.smartReviews.push(payload);
  if (status === "revisado") { const item = getSyllabusById(review.syllabusItemId); if (item) item.lastReviewedAt = todayISO(); }
  render();
}

function renderReviews() { const today = todayISO(); const reviewWindows = [{ label: "24h", days: 1 }, { label: "7 dias", days: 7 }, { label: "30 dias", days: 30 }]; elements.reviewList.innerHTML = ""; state.studies.forEach((study) => reviewWindows.forEach((window) => { const dueDate = addDays(study.date, window.days); if (dueDate <= today) { const item = document.createElement("div"); item.className = "review-item"; item.innerHTML = `<span class="badge ${dueDate < today ? "danger" : "warn"}">Revisão ${window.label}</span><strong>${escapeHTML(subjectNameById(study.subjectId))} — ${escapeHTML(study.topic)}</strong><div class="item-meta">Estudado em ${formatDateBR(study.date)} • Revisar em ${formatDateBR(dueDate)}</div>`; elements.reviewList.appendChild(item); } })); }
function renderAlerts() { elements.alertList.innerHTML = ""; state.subjects.forEach((subject) => { const lastStudy = state.studies.filter((study) => study.subjectId === subject.id).sort((a, b) => b.date.localeCompare(a.date))[0]; const daysWithoutStudy = lastStudy ? Math.floor((parseDate(todayISO()) - parseDate(lastStudy.date)) / 86400000) : Infinity; const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); if (!lastStudy || daysWithoutStudy >= 7 || weeklyMinutes < subject.goalHours * 30) { const item = document.createElement("div"); item.className = "alert-item"; item.innerHTML = `<span class="badge danger">Atenção</span><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">${lastStudy ? `Último estudo há ${daysWithoutStudy} dia(s).` : "Nunca estudada."} Meta semanal em risco: ${formatHours(weeklyMinutes)} de ${subject.goalHours}h.</div>`; elements.alertList.appendChild(item); } }); }
function renderHistory() {
  const studies = [...state.studies].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  elements.historyBody.innerHTML = "";
  if (!studies.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8" class="empty-message">Nenhum registro geral de estudo encontrado.</td>`;
    elements.historyBody.appendChild(row);
    return;
  }
  studies.forEach((study) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${formatDateBR(study.date)}</td><td>${escapeHTML(subjectNameById(study.subjectId))}</td><td>${escapeHTML(study.topic)}</td><td>${study.minutes}</td><td>${study.questions}</td><td>${study.correct}</td><td>${study.wrong}</td><td>${study.blank}</td>`;
    elements.historyBody.appendChild(row);
  });
}
function migrateIncorrectWeakDomains() {
  let changed = false;
  state.syllabusItems.forEach((item) => {
    const itemStudies = studiesForItem(item);
    const performance = itemPerformance(item);
    const hasStudies = itemStudies.some((study) => study.minutes > 0);
    const hasQuestions = performance.questions > 0 || performance.correct > 0 || performance.wrong > 0 || performance.blank > 0;
    const hasReview = Boolean(item.reviewed || item.lastReviewedAt);
    if (item.status === "Não iniciado" && !hasStudies && !hasQuestions && !hasReview && item.domain === "Fraco" && !item.manualWeak) {
      item.domain = "Sem diagnóstico";
      changed = true;
    }
  });
  state.migrations.incorrectWeakDomains = true;
  return changed;
}

let mockDisciplineDraft = [];
function percent(value, total) { return total ? Number((value / total * 100).toFixed(1)) : 0; }
function mockNumbersFromValues(total, correct, wrong, blank, goal) {
  const answered = correct + wrong;
  const net = correct - wrong;
  return { total, correct, wrong, blank, goal, answered, net, accuracyAnswered: percent(correct, answered), accuracyTotal: percent(correct, total), blankPct: percent(blank, total), goalDiff: net - goal };
}
function currentMockNumbers() { return mockNumbersFromValues(Number(elements.mockTotalQuestions?.value) || 0, Number(elements.mockCorrect?.value) || 0, Number(elements.mockWrong?.value) || 0, Number(elements.mockBlank?.value) || 0, Number(elements.mockGoal?.value) || 0); }
function normalizeMockDiscipline(entry) {
  const total = Number(entry.total) || 0, correct = Number(entry.correct) || 0, wrong = Number(entry.wrong) || 0, blank = Number(entry.blank) || 0;
  return { id: entry.id || createId(), discipline: normalizeText(entry.discipline) || "Sem disciplina", total, correct, wrong, blank, notes: normalizeText(entry.notes), net: correct - wrong, accuracyPct: percent(correct, total), errorPct: percent(wrong, total), blankPct: percent(blank, total) };
}
function strategicMockAlert(goalDiff) {
  return goalDiff < 0 ? `Você ficou ${Math.abs(goalDiff)} pontos líquidos abaixo da meta.` : "Você atingiu ou superou a meta deste simulado.";
}
function buildMockDiagnosis(mock) {
  const disciplines = (mock.disciplines || []).map(normalizeMockDiscipline);
  const best = [...disciplines].sort((a,b) => b.net - a.net || b.accuracyPct - a.accuracyPct)[0];
  const worst = [...disciplines].sort((a,b) => a.net - b.net || b.errorPct - a.errorPct)[0];
  const mostWrong = [...disciplines].sort((a,b) => b.wrong - a.wrong)[0];
  const mostBlank = [...disciplines].sort((a,b) => b.blank - a.blank)[0];
  return {
    hasDisciplines: disciplines.length > 0,
    best: best?.discipline || "-",
    worst: worst?.discipline || "-",
    mostWrong: mostWrong?.discipline || "-",
    mostBlank: mostBlank?.discipline || "-",
    goalDistance: mock.goalDiff,
    alert: strategicMockAlert(mock.goalDiff)
  };
}
function prepareMock(payload) {
  const n = mockNumbersFromValues(Number(payload.total), Number(payload.correct), Number(payload.wrong), Number(payload.blank), Number(payload.goal));
  const disciplines = (payload.disciplines || []).map(normalizeMockDiscipline);
  const mock = { id: payload.id || createId(), name: normalizeText(payload.name), date: payload.date || todayISO(), board: normalizeText(payload.board) || "Cebraspe", institution: normalizeText(payload.institution), notes: normalizeText(payload.notes), total: n.total, correct: n.correct, wrong: n.wrong, blank: n.blank, goal: n.goal || state.settings.defaultMockGoal || 92, answered: n.answered, net: n.net, accuracyAnswered: n.accuracyAnswered, accuracyTotal: n.accuracyTotal, blankPct: n.blankPct, goalDiff: n.net - (n.goal || state.settings.defaultMockGoal || 92), strategy: normalizeText(payload.strategy), difficulty: payload.difficulty || "Média", disciplines, updatedAt: new Date().toISOString() };
  mock.diagnosis = buildMockDiagnosis(mock);
  return mock;
}
function mockStats() {
  const mocks = [...(state.simulados || [])].sort((a,b) => a.date.localeCompare(b.date));
  const nets = mocks.map((m) => Number(m.net) || 0);
  const problem = mocks.flatMap((m) => m.disciplines || []).reduce((acc,d) => { const k = d.discipline || "Sem disciplina"; acc[k] = (acc[k] || 0) + (Number(d.wrong) || 0) + Math.max(0, -(Number(d.net) || 0)); return acc; }, {});
  return { mocks, count: mocks.length, best: nets.length ? Math.max(...nets) : 0, worst: nets.length ? Math.min(...nets) : 0, average: nets.length ? Math.round(nets.reduce((a,b)=>a+b,0)/nets.length) : 0, last: mocks.at(-1)?.net || 0, first: mocks[0]?.net || 0, aboveGoal: mocks.filter((m) => m.net >= m.goal).length, problemDiscipline: Object.entries(problem).sort((a,b)=>b[1]-a[1])[0]?.[0] || "-" };
}
function renderMockCalculated() { if (!elements.mockCalculated) return; const n = currentMockNumbers(); elements.mockCalculated.innerHTML = `Respondidas: <strong>${n.answered}</strong> • Líquido Cebraspe: <strong>${n.net}</strong> • Acerto/respondidas: <strong>${n.accuracyAnswered}%</strong> • Acerto/total: <strong>${n.accuracyTotal}%</strong> • Brancos: <strong>${n.blankPct}%</strong> • Diferença para meta: <strong>${n.goalDiff}</strong>`; }
function renderLatestMockDiagnosis(mock) {
  if (!mock) return "Salve um simulado para gerar diagnóstico.";
  const diagnosis = mock.diagnosis || buildMockDiagnosis(mock);
  if (!diagnosis.hasDisciplines && !(mock.disciplines || []).length) {
    return `<p><strong>Líquido:</strong> ${mock.net} • <strong>Meta:</strong> ${mock.goal} • <strong>Diferença para a meta:</strong> ${mock.goalDiff}</p><p>Resultado por disciplina ainda não informado. Cadastre o desempenho por disciplina para gerar diagnóstico detalhado.</p><p>${escapeHTML(strategicMockAlert(mock.goalDiff))}</p>`;
  }
  return `<strong>Melhor disciplina:</strong> ${escapeHTML(diagnosis.best)} • <strong>Pior disciplina:</strong> ${escapeHTML(diagnosis.worst)} • <strong>Mais erros:</strong> ${escapeHTML(diagnosis.mostWrong)} • <strong>Mais brancos:</strong> ${escapeHTML(diagnosis.mostBlank)} • <strong>Distância da meta:</strong> ${diagnosis.goalDistance}<br>${escapeHTML(strategicMockAlert(mock.goalDiff))}`;
}
function renderMockEvolution(stats, maxBase) {
  if (!stats.mocks.length) return "Nenhuma evolução disponível.";
  const summary = stats.mocks.length === 1
    ? "Cadastre pelo menos dois simulados para calcular evolução entre o primeiro e o último."
    : `Evolução primeiro → último: <strong>${stats.last - stats.first}</strong>. Maior líquido: <strong>${stats.best}</strong>. Menor líquido: <strong>${stats.worst}</strong>. Líquido médio: <strong>${stats.average}</strong>. Atingiu/superou a meta <strong>${stats.aboveGoal}</strong> vez(es).`;
  return `<p class="item-meta">${summary}</p><table><thead><tr><th>Data</th><th>Simulado</th><th>Líquido</th><th>Meta</th><th>Barra</th></tr></thead><tbody>${stats.mocks.map((m)=>`<tr class="${m.net >= m.goal ? "goal-hit" : ""}"><td>${formatDateBR(m.date)}</td><td>${escapeHTML(m.name)}</td><td>${m.net}</td><td>${m.goal}</td><td><div class="progress"><span style="width:${Math.max(0, Math.min(100, m.net / maxBase * 100))}%"></span></div></td></tr>`).join("")}</tbody></table>`;
}
function renderMockDraft() { if (!elements.mockDisciplineDraft) return; elements.mockDisciplineDraft.innerHTML = mockDisciplineDraft.length ? `<table><thead><tr><th>Disciplina</th><th>Total</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Líquido</th><th>% Acerto</th><th>% Erro</th><th>% Brancos</th><th>Ações</th></tr></thead><tbody>${mockDisciplineDraft.map((d,i)=>`<tr><td>${escapeHTML(d.discipline)}</td><td>${d.total}</td><td>${d.correct}</td><td>${d.wrong}</td><td>${d.blank}</td><td>${d.net}</td><td>${d.accuracyPct}%</td><td>${d.errorPct}%</td><td>${d.blankPct}%</td><td><button type="button" data-remove-mock-discipline="${i}">Remover</button></td></tr>`).join("")}</tbody></table>` : "Nenhuma disciplina lançada."; }
function renderSimulados() {
  if (!elements.mockSummary) return;
  const stats = mockStats();
  elements.mockSummary.innerHTML = [["Simulados",stats.count],["Maior líquido",stats.best],["Menor líquido",stats.worst],["Líquido médio",stats.average],["Último líquido",stats.last],["Acima da meta",stats.aboveGoal]].map(([l,v])=>`<article class="stat-card"><span>${l}</span><strong class="stat-value-compact">${v}</strong></article>`).join("");
  const latest = stats.mocks.at(-1);
  elements.mockGeneralResult.innerHTML = latest ? `Último simulado: <strong>${escapeHTML(latest.name)}</strong> • Líquido <strong>${latest.net}</strong> • Meta <strong>${latest.goal}</strong> • Diferença <strong>${latest.goalDiff}</strong>` : "Nenhum simulado salvo.";
  elements.mockDisciplineResults.innerHTML = latest?.disciplines?.length ? `<table><thead><tr><th>Disciplina</th><th>Total</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Líquido</th><th>% Acerto</th><th>% Erro</th><th>% Brancos</th><th>Obs.</th></tr></thead><tbody>${latest.disciplines.map((d)=>`<tr><td>${escapeHTML(d.discipline)}</td><td>${d.total}</td><td>${d.correct}</td><td>${d.wrong}</td><td>${d.blank}</td><td>${d.net}</td><td>${d.accuracyPct}%</td><td>${d.errorPct}%</td><td>${d.blankPct}%</td><td>${escapeHTML(d.notes || "-")}</td></tr>`).join("")}</tbody></table>` : "Nenhum resultado por disciplina no último simulado.";
  elements.mockDiagnosis.innerHTML = renderLatestMockDiagnosis(latest);
  elements.mockHistory.innerHTML = (state.simulados || []).length ? [...state.simulados].sort((a,b)=>b.date.localeCompare(a.date)).map((m)=>`<article class="syllabus-card"><header><div><h3>${escapeHTML(m.name)}</h3><div class="item-meta">${formatDateBR(m.date)} • ${escapeHTML(m.board)} • ${m.total} questões • ${m.correct} acertos • ${m.wrong} erros • ${m.blank} brancos • líquido ${m.net} • meta ${m.goal} • diferença ${m.goalDiff}</div></div><span class="badge ${m.net >= m.goal ? "success" : "warn"}">${m.net >= m.goal ? "Meta atingida" : "Abaixo da meta"}</span></header><div class="card-actions"><button type="button" data-view-mock="${m.id}">Visualizar detalhes</button><button type="button" data-edit-mock="${m.id}">Editar</button><button type="button" data-duplicate-mock="${m.id}">Duplicar</button><button class="danger" type="button" data-delete-mock="${m.id}">Excluir</button></div></article>`).join("") : "Nenhum simulado cadastrado.";
  const maxBase = Math.max(1, ...stats.mocks.map((m)=>Math.max(m.goal, m.net, 0)));
  elements.mockEvolution.innerHTML = renderMockEvolution(stats, maxBase);
  renderMockCalculated(); renderMockDraft();
}
function resetMockForm() { elements.mockExamForm?.reset(); mockDisciplineDraft = []; if (elements.mockExamEditingId) elements.mockExamEditingId.value = ""; if (elements.mockDate) elements.mockDate.value = todayISO(); if (elements.mockBoard) elements.mockBoard.value = "Cebraspe"; if (elements.mockGoal) elements.mockGoal.value = state.settings.defaultMockGoal || 92; renderMockCalculated(); renderMockDraft(); }
function editMock(id) { const m = state.simulados.find((x)=>x.id===id); if (!m) return; elements.mockExamEditingId.value=m.id; elements.mockName.value=m.name; elements.mockDate.value=m.date; elements.mockBoard.value=m.board; elements.mockInstitution.value=m.institution||""; elements.mockNotes.value=m.notes||""; elements.mockTotalQuestions.value=m.total; elements.mockCorrect.value=m.correct; elements.mockWrong.value=m.wrong; elements.mockBlank.value=m.blank; elements.mockGoal.value=m.goal; elements.mockStrategy.value=m.strategy||""; elements.mockDifficulty.value=m.difficulty||"Média"; mockDisciplineDraft=(m.disciplines||[]).map(normalizeMockDiscipline); renderSimulados(); showView("simulados"); }
function saveMock(event) { event.preventDefault(); const n=currentMockNumbers(); if (!elements.mockName.value.trim()) return alert("Informe o nome do simulado."); if (n.correct + n.wrong + n.blank !== n.total) return alert("Acertos + erros + brancos deve ser igual ao total de questões."); const payload={ id: elements.mockExamEditingId.value || createId(), name: elements.mockName.value, date: elements.mockDate.value, board: elements.mockBoard.value, institution: elements.mockInstitution.value, notes: elements.mockNotes.value, total:n.total, correct:n.correct, wrong:n.wrong, blank:n.blank, goal:Number(elements.mockGoal.value)||92, strategy:elements.mockStrategy.value, difficulty:elements.mockDifficulty.value, disciplines:mockDisciplineDraft }; const mock=prepareMock(payload); const idx=state.simulados.findIndex((m)=>m.id===mock.id); if (idx>=0) state.simulados[idx]=mock; else state.simulados.push(mock); state.settings.defaultMockGoal=mock.goal; resetMockForm(); render(); }
function addMockDiscipline() { const d=normalizeMockDiscipline({ discipline: elements.mockDisciplineName.value, total: elements.mockDisciplineTotal.value, correct: elements.mockDisciplineCorrect.value, wrong: elements.mockDisciplineWrong.value, blank: elements.mockDisciplineBlank.value, notes: elements.mockDisciplineNotes.value }); if (!d.discipline || !d.total) return alert("Informe disciplina e total."); if (d.correct + d.wrong + d.blank !== d.total) return alert("Na disciplina, acertos + erros + brancos deve ser igual ao total."); mockDisciplineDraft.push(d); [elements.mockDisciplineName,elements.mockDisciplineTotal,elements.mockDisciplineNotes].forEach((el)=>el.value=""); elements.mockDisciplineCorrect.value=0; elements.mockDisciplineWrong.value=0; elements.mockDisciplineBlank.value=0; renderMockDraft(); }


const MATERIAL_TYPES = ["PDF", "Word", "Imagem", "Mapa mental", "Resumo", "Aula", "Questões", "Outro"];
const MATERIAL_ORIGINS = ["Google Drive", "OneDrive", "Link externo", "Arquivo local/referência manual", "Outro"];
function materialTagsArray(value) { return Array.isArray(value) ? value : String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean); }
function materialsForTopic(discipline, subject, syllabusItemId = "") {
  return resolveAvailableMaterials({ discipline, subject, syllabusItemId });
}
function materialButtonLabel(material) {
  const type = String(material.type || "material").toLowerCase();
  if (type === "pdf") return "Abrir PDF";
  if (type === "word") return "Abrir Word";
  if (type === "imagem") return "Abrir imagem";
  if (type === "resumo") return "Abrir resumo";
  return "Abrir material";
}
function goalMaterialsHTML(goal) {
  const materials = materialsForDailyGoal(goal);
  const actions = materials.length
    ? materials.map((m, index) => `<button type="button" data-open-material="${m.id}" title="${escapeHTML(m.title)}">${materials.length > 1 ? `Abrir material ${index + 1}` : "Abrir material"}</button>`).join("")
    : `<span class="item-meta">Nenhum material pronto para este assunto.</span><button type="button" data-create-goal-material data-discipline="${escapeHTML(goal.discipline || "")}" data-subject="${escapeHTML(goal.subject || "")}">Cadastrar material para esta meta</button>`;
  return `<div class="linked-materials goal-materials"><strong>📚 MATERIAIS DISPONÍVEIS:</strong><div class="card-actions">${actions}</div></div>`;
}
function linkedMaterialsHTML(materials) {
  if (!materials.length) return "";
  return `<div class="linked-materials"><strong>Materiais vinculados</strong><div class="card-actions">${materials.map((m) => `<button type="button" data-open-material="${m.id}" title="${escapeHTML(m.title)}">${escapeHTML(materialButtonLabel(m))}</button>`).join("")}</div></div>`;
}
function isValidHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; } }
function openMaterial(id) { const material = state.materials.find((m) => m.id === id); if (!material) return; if (!isValidHttpUrl(material.link)) return alert("Este material não possui link válido com http/https."); window.open(material.link, "_blank", "noopener"); }
function startMaterialForGoal(discipline, subject) {
  if (!elements.materialForm) return;
  elements.materialForm.reset();
  elements.materialEditingId.value = "";
  elements.materialDate.value = todayISO();
  elements.materialDiscipline.value = discipline || "";
  elements.materialSubject.value = subject || "";
  renderMaterialSelectors();
  showView("materiais");
  elements.materialTitle?.focus();
}
function renderMaterialSelectors() {
  if (!elements.materialForm) return;
  const disciplines = getAllDisciplines();
  elements.materialDisciplineOptions.innerHTML = disciplines.map((d) => `<option value="${escapeHTML(d)}"></option>`).join("");
  const selected = elements.materialDiscipline.value;
  const subjects = state.syllabusItems.filter((i) => !selected || canonical(i.discipline) === canonical(selected)).map((i) => i.subject);
  elements.materialSubjectOptions.innerHTML = [...new Set(subjects.filter(Boolean))].sort().map((a) => `<option value="${escapeHTML(a)}"></option>`).join("");
}
function renderMaterialFilters() {
  if (!elements.materialFilterDiscipline) return;
  const setOptions = (el, label, values) => { const current = el.value; const opts = [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)); el.innerHTML = `<option value="">${label}</option>` + opts.map((v)=>`<option ${v===current?"selected":""}>${escapeHTML(v)}</option>`).join(""); };
  setOptions(elements.materialFilterDiscipline, "Todas", state.materials.map((m)=>m.discipline));
  setOptions(elements.materialFilterSubject, "Todos", state.materials.filter((m)=>!elements.materialFilterDiscipline.value || m.discipline===elements.materialFilterDiscipline.value).map((m)=>m.subject));
  setOptions(elements.materialFilterType, "Todos", MATERIAL_TYPES);
  setOptions(elements.materialFilterOrigin, "Todas", MATERIAL_ORIGINS);
}
function filteredMaterials() {
  const term = canonical(elements.materialFilterText?.value || "");
  return state.materials.filter((m) => (!elements.materialFilterDiscipline.value || m.discipline === elements.materialFilterDiscipline.value) && (!elements.materialFilterSubject.value || m.subject === elements.materialFilterSubject.value) && (!elements.materialFilterType.value || m.type === elements.materialFilterType.value) && (!elements.materialFilterOrigin.value || m.origin === elements.materialFilterOrigin.value) && (!term || [m.title,m.discipline,m.subject,m.type,m.origin,m.link,m.notes,(m.tags||[]).join(" ")].map(canonical).join(" ").includes(term)));
}
function materialFactoryModuleLabel(m = {}) { return FACTORY_MODULES.find((module) => module.key === m.factoryModuleKey)?.label || m.type || "Manual"; }
function materialCardHTML(m) {
  const origem = m.source === "factory" ? "Fábrica" : (m.origin || "cadastro manual");
  const modulo = m.source === "factory" ? materialFactoryModuleLabel(m) : (m.type || "Manual");
  return `<article class="syllabus-card material-card"><header><div><h3>${escapeHTML(m.title)}</h3><div class="item-meta">${escapeHTML(m.discipline)} • ${escapeHTML(m.subject)} • módulo ${escapeHTML(modulo)} • ${escapeHTML(m.type)} • origem: ${escapeHTML(origem)} • ${formatDateBR(m.date)}</div></div><span class="badge ${m.available === false ? "danger" : "neutral"}">${escapeHTML(m.type || "Material")}</span></header><div class="card-meta-grid"><span>Título: ${escapeHTML(m.title)}</span><span>Disciplina: ${escapeHTML(m.discipline)}</span><span>Assunto: ${escapeHTML(m.subject)}</span><span>Módulo: ${escapeHTML(modulo)}</span><span>Formato: ${escapeHTML(m.factoryFormat || m.type || "-")}</span><span>Origem: ${escapeHTML(origem)}</span><span>Data: ${formatDateBR(m.date)}</span></div><div class="card-actions"><button type="button" data-open-material="${m.id}">Abrir</button><button type="button" data-use-material-study="${m.id}">Usar no estudo</button><button type="button" data-edit-material="${m.id}">Editar</button><button class="danger" type="button" data-delete-material="${m.id}">Excluir</button></div></article>`;
}
function renderMaterials() {
  if (!elements.materialsList) return;
  renderMaterialSelectors(); renderMaterialFilters();
  const list = filteredMaterials().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const todayGoalMaterials = new Set((state.dailyGoals || []).filter((g) => g.date === todayISO()).flatMap((goal) => materialsForDailyGoal(goal).map((m) => m.id)));
  const todayMaterials = list.filter((m) => todayGoalMaterials.has(m.id));
  const recentMaterials = list.filter((m) => !todayGoalMaterials.has(m.id)).slice(0, 10);
  elements.materialsList.innerHTML = list.length ? [
    `<section class="materials-section"><h3>1. MATERIAIS PARA O PLANO DE HOJE</h3>${todayMaterials.length ? todayMaterials.map(materialCardHTML).join("") : `<p class="empty-message">Nenhum material pronto vinculado ao plano de hoje.</p>`}</section>`,
    `<section class="materials-section"><h3>2. MATERIAIS RECENTES</h3>${recentMaterials.length ? recentMaterials.map(materialCardHTML).join("") : `<p class="empty-message">Nenhum material recente.</p>`}</section>`,
    `<section class="materials-section"><h3>3. TODOS OS MATERIAIS</h3>${list.map(materialCardHTML).join("")}</section>`
  ].join("") : "";
}
function updateStudyMaterialOptions() {
  if (!elements.studyMaterial) return;
  const discipline = subjectNameById(elements.studySubject.value);
  const linkedItem = findSyllabusItemByStudy(elements.studySubject.value, elements.studyTopic.value.trim());
  const mats = resolveAvailableMaterials({ discipline, subject: elements.studyTopic.value.trim(), syllabusItemId: linkedItem?.id || "" });
  elements.studyMaterial.innerHTML = '<option value="">Nenhum material vinculado</option>' + mats.map((m)=>`<option value="${m.id}">${escapeHTML(m.type)} — ${escapeHTML(m.title)}</option>`).join("");
}
function editMaterial(id) { const m = state.materials.find((x)=>x.id===id); if (!m) return; elements.materialEditingId.value=m.id; elements.materialTitle.value=m.title; elements.materialDate.value=m.date||todayISO(); elements.materialDiscipline.value=m.discipline; elements.materialSubject.value=m.subject; elements.materialType.value=m.type; elements.materialOrigin.value=m.origin; elements.materialLink.value=m.link; elements.materialTags.value=materialTagsArray(m.tags).join(", "); elements.materialNotes.value=m.notes||""; renderMaterialSelectors(); showView("materiais"); }
function saveMaterial(event) { event.preventDefault(); if (!elements.materialLink.value.trim()) return alert("Informe o link do material."); if (!isValidHttpUrl(elements.materialLink.value.trim())) return alert("O link do material deve começar com http:// ou https://."); const syllabusItem = state.syllabusItems.find((i)=>canonical(i.discipline)===canonical(elements.materialDiscipline.value) && canonical(i.subject)===canonical(elements.materialSubject.value)); const material = { id: elements.materialEditingId.value || createId(), title: elements.materialTitle.value.trim(), discipline: elements.materialDiscipline.value.trim(), subject: elements.materialSubject.value.trim(), syllabusItemId: syllabusItem?.id || "", type: elements.materialType.value, link: elements.materialLink.value.trim(), origin: elements.materialOrigin.value, notes: elements.materialNotes.value.trim(), date: elements.materialDate.value || todayISO(), tags: materialTagsArray(elements.materialTags.value), updatedAt: new Date().toISOString() }; const idx = state.materials.findIndex((m)=>m.id===material.id); if (idx>=0) state.materials[idx]=material; else state.materials.push(material); elements.materialForm.reset(); elements.materialEditingId.value=""; elements.materialDate.value=todayISO(); render(); showView("materiais"); autoSyncAfterSave("material"); }

let questionBankTraining = null;
let qbPreviewVisible = false;
function normalizeQuestionBankAnswer(value) { if (value === true) return "C"; if (value === false) return "E"; const raw = canonical(String(value ?? "")).replace(/[^a-z]/g, ""); if (["c","certo","correto","verdadeiro","v"].includes(raw)) return "C"; if (["e","errado","incorreto","falso","f"].includes(raw)) return "E"; return ""; }
function questionBankExplanation(raw = {}) { return String(raw.justificativa ?? raw.fundamento ?? raw.comentario ?? raw.comentário ?? raw.explanation ?? raw.notes ?? raw.observacoes ?? raw.observations ?? "").trim(); }
function normalizeQuestionBankItem(raw = {}, index = 0) { const justificativa = questionBankExplanation(raw); return { id: String(raw.id || raw.codigo || raw.referencia || `qb-${index + 1}-${createId()}`), disciplina: String(raw.disciplina || raw.discipline || "Sem disciplina"), assunto: String(raw.assunto || raw.subject || raw.topico || raw.topic || "Sem assunto"), tema: String(raw.tema || raw.theme || raw.subassunto || raw.subtopic || "Geral"), banca: String(raw.banca || raw.board || ""), ano: raw.ano || raw.year || "", orgao: String(raw.orgao || raw.agency || ""), cargo: String(raw.cargo || raw.role || ""), referencia: String(raw.referencia || raw.reference || raw.codigo || ""), tipo: String(raw.tipo || raw.type || "Certo/Errado"), enunciado: String(raw.enunciado || raw.statement || raw.texto || raw.question || ""), gabarito: normalizeQuestionBankAnswer(raw.gabarito ?? raw.resposta ?? raw.answer ?? raw.correctAnswer), justificativa, fundamento: justificativa, observacoes: String(raw.observacoes || raw.notes || ""), tags: Array.isArray(raw.tags) ? raw.tags : [] }; }
function questionBankFromPayload(payload) { const source = Array.isArray(payload) ? payload : payload?.questionBank || payload?.questoes || payload?.questions || payload?.items || []; return Array.isArray(source) ? source.map(normalizeQuestionBankItem).filter((q) => q.enunciado.trim()) : []; }

function qbSafePartialMatch(a, b) {
  const x = canonical(a).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const y = canonical(b).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!x || !y) return false;
  if (x === y) return true;
  const minLen = Math.min(x.length, y.length);
  if (minLen < 4) return false;
  return x.includes(y) || y.includes(x);
}
function qbItemDiscipline(item) { return item.discipline || item.disciplina || "Sem disciplina"; }
function qbItemTexts(item) { return [item.subject, item.assunto, item.topic, item.topico, item.subtopic, item.subassunto].filter(Boolean); }
function qbQuestionTexts(q) { return [q.assunto, q.subject, q.tema, q.theme, q.topico, q.topic, q.subtopic, q.subassunto].filter(Boolean); }
function qbMatchesSyllabusItem(q, item) { return qbSafePartialMatch(q.disciplina || q.discipline, qbItemDiscipline(item)) && qbItemTexts(item).some((itemText) => qbQuestionTexts(q).some((qText) => qbSafePartialMatch(qText, itemText))); }
function qbSyllabusPackageQuestions(items) { return (state.questionBank || []).filter((q) => items.some((item) => qbMatchesSyllabusItem(q, item))); }
function qbLastDisciplinePerformance(discipline) {
  const session = (state.questionBankSessions || []).find((s) => (s.items || []).some((q) => qbSafePartialMatch(q.disciplina, discipline)));
  if (!session) return "Sem treino anterior";
  const rows = (session.items || []).filter((q) => qbSafePartialMatch(q.disciplina, discipline));
  const keyed = rows.filter((q) => qbHasKey(q) || q.gabarito);
  if (!keyed.length) return `${rows.length} questão(ões), sem gabarito`;
  const correct = keyed.filter((q) => q.status === "certo" || (q.marcado && q.marcado === q.gabarito)).length;
  const wrong = keyed.filter((q) => q.status === "errado" || (q.marcado && q.gabarito && q.marcado !== "B" && q.marcado !== q.gabarito)).length;
  return `${correct}/${keyed.length} acertos • líquido ${correct - wrong}`;
}
function qbSyllabusPackages() {
  const grouped = (state.syllabusItems || []).filter((item) => canonical(item.status || item.situacao) !== "ignorado").reduce((acc, item) => { const d = qbItemDiscipline(item); acc[d] ||= []; acc[d].push(item); return acc; }, {});
  return Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR")).map(([discipline, items]) => {
    const questions = qbSyllabusPackageQuestions(items);
    const covered = items.filter((item) => questions.some((q) => qbMatchesSyllabusItem(q, item)));
    const missing = items.filter((item) => !covered.includes(item));
    return { discipline, items, questions, covered, missing, bankThemes: qbUnique(questions.flatMap(q=>[q.assunto,q.tema].filter(Boolean))), last: qbLastDisciplinePerformance(discipline) };
  });
}
function qbPackageByDiscipline(discipline) { return qbSyllabusPackages().find((pkg) => pkg.discipline === discipline); }
function qbQuestionsForPackageMode(pkg, mode) {
  const idsWithTrouble = new Set((state.questionBankSessions || []).flatMap((s) => s.items || []).filter((i) => i.status === "errado" || i.status === "branco" || !i.marcado || i.marcado === "B").map((i) => i.id));
  const trainedIds = new Set((state.questionBankSessions || []).flatMap((s) => s.items || []).filter((i) => i.marcado).map((i) => i.id));
  const weekItems = new Set((state.dailyGoals || []).filter((g) => g.date >= weekStart(todayISO()) && g.date <= addDays(weekStart(todayISO()), 6) && qbSafePartialMatch(g.discipline, pkg.discipline)).map((g) => g.syllabusItemId || canonical(g.subject)));
  const weakItems = new Set(pkg.items.filter((item) => isWeakItem(item) || disciplineQuestionWeakness(pkg.discipline) >= 30 || mockWeakness(pkg.discipline) >= 30).map((item) => item.id));
  if (mode === "unseen") return pkg.questions.filter((q) => !trainedIds.has(q.id));
  if (mode === "weak") return pkg.questions.filter((q) => pkg.items.some((item) => weakItems.has(item.id) && qbMatchesSyllabusItem(q, item)));
  if (mode === "trouble") return pkg.questions.filter((q) => idsWithTrouble.has(q.id));
  if (mode === "week") return pkg.questions.filter((q) => pkg.items.some((item) => (weekItems.has(item.id) || weekItems.has(canonical(item.subject))) && qbMatchesSyllabusItem(q, item)));
  return pkg.questions;
}
function renderQbSyllabusPackages() {
  if (!elements.qbSyllabusPackages) return;
  const packages = qbSyllabusPackages();
  elements.qbSyllabusPackages.innerHTML = packages.length ? packages.map((pkg) => `<article class="question-bank-item"><header><h4>${escapeHTML(pkg.discipline)}</h4><span class="badge">${pkg.questions.length} questão(ões)</span></header><div class="card-meta-grid"><span>Assuntos no edital: ${pkg.items.length}</span><span>Questões encontradas no banco: ${pkg.questions.length}</span><span>Questões com gabarito: ${pkg.questions.filter(qbHasKey).length}</span><span>Assuntos sem nenhuma questão: ${pkg.missing.length}</span><span>Último desempenho: ${escapeHTML(pkg.last)}</span></div><p class="notice ${pkg.missing.length ? "warning-notice" : ""}">Assuntos do edital sem questões cadastradas: ${pkg.missing.length}</p><div class="actions"><button data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="full" type="button">Treinar pacote completo</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="unseen" type="button">Treinar não estudados</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="weak" type="button">Treinar fracos</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="trouble" type="button">Treinar erradas/brancas</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="week" type="button">Treinar assuntos da semana</button></div><details><summary>Detalhes do pacote</summary><div class="card-meta-grid"><span>Assuntos cobertos: ${escapeHTML(pkg.covered.map((i)=>i.subject || i.assunto).join(", ") || "-")}</span><span>Assuntos sem questões: ${escapeHTML(pkg.missing.map((i)=>i.subject || i.assunto).join(", ") || "-")}</span><span>Temas encontrados no banco: ${escapeHTML(pkg.bankThemes.join(", ") || "-")}</span></div></details></article>`).join("") : "Nenhum pacote disponível. Importe ou cadastre itens no edital verticalizado.";
}
function qbSyllabusPackageSummary() { const packages = qbSyllabusPackages(); const linkedIds = new Set(packages.flatMap((pkg)=>pkg.questions.map((q)=>q.id))); const activeItems = qbActiveSyllabusItems(); return { packages: packages.length, linked: linkedIds.size, missing: packages.reduce((sum,pkg)=>sum+pkg.missing.length,0), disciplines: qbUnique(activeItems.map(qbItemDiscipline)).length, subjects: activeItems.length, packagesWithQuestions: packages.filter((pkg)=>pkg.questions.length).length }; }

function renderQbSyllabusVerticalized() {
  if (!elements.qbSyllabusVerticalized) return;
  const packages = qbSyllabusPackages();
  elements.qbSyllabusVerticalized.innerHTML = packages.length ? packages.map((pkg) => {
    const subjects = pkg.items.map((item) => item.subject || item.assunto || item.topic || "Assunto");
    return `<article class="question-bank-item qb-syllabus-item"><header><h4>${escapeHTML(pkg.discipline)}</h4><span class="badge neutral">${pkg.items.length} assunto(s)</span></header><div class="card-meta-grid"><span>Questões vinculadas: ${pkg.questions.length}</span><span>Assuntos cobertos: ${pkg.covered.length}</span><span>Assuntos sem questões: ${pkg.missing.length}</span></div>${qbLimitedList(subjects, "nenhum assunto", 10)}</article>`;
  }).join("") : "Nenhum item no edital verticalizado. Cadastre ou importe assuntos na área de Edital.";
}
function renderQbAccordionSummaries() { const summary = qbSyllabusPackageSummary(); if (elements.qbSyllabusSummary) elements.qbSyllabusSummary.textContent = `Edital verticalizado — ${summary.disciplines} disciplina(s), ${summary.subjects} assunto(s)`; if (elements.qbPackagesSummary) elements.qbPackagesSummary.textContent = `Pacotes do Edital — ${summary.packages} pacote(s) disponível(is), ${summary.packagesWithQuestions} com questões cadastradas`; }

function qbUnique(values) { return [...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,"pt-BR")); }
function qbFillSelect(select, values, label) { if (!select) return false; const current = select.value; select.innerHTML = `<option value="">${label}</option>` + values.map((v)=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join(""); if (values.includes(current)) { select.value = current; return false; } select.value = ""; return Boolean(current); }
function qbFillSelectWithLabels(select, options, label) { if (!select) return false; const current = select.value; const values = options.map((option) => option.value); select.innerHTML = `<option value="">${label}</option>` + options.map((option)=>`<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join(""); if (values.includes(current)) { select.value = current; return false; } select.value = ""; return Boolean(current); }
function qbDownload(filename, payload) { const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
function qbHasKey(q) { return q.gabarito === "C" || q.gabarito === "E"; }
function qbExplanation(q) { return String(q?.justificativa || q?.fundamento || q?.comentario || q?.comentário || q?.explanation || q?.notes || "").trim(); }
function qbExplanationText(q) { return qbExplanation(q) || "Sem justificativa cadastrada"; }
function qbAnswerStatus(q) { if (q.marcado === "D") return "duvida"; if (!q.marcado || q.marcado === "B") return "branco"; if (!qbHasKey(q)) return "sem gabarito"; return q.marcado === q.gabarito ? "certo" : "errado"; }
function qbActiveSyllabusItems() { return (state.syllabusItems || []).filter((item) => canonical(item.status || item.situacao) !== "ignorado"); }
function qbQuestionMatchesAnySyllabusItem(q, items = qbActiveSyllabusItems()) { return items.some((item) => qbMatchesSyllabusItem(q, item)); }
function qbSyllabusItemsForDiscipline(discipline) { return qbActiveSyllabusItems().filter((item) => qbItemDiscipline(item) === discipline); }
function qbQuestionMatchesSyllabusDiscipline(q, discipline) { return !discipline || qbQuestionMatchesAnySyllabusItem(q, qbSyllabusItemsForDiscipline(discipline)); }
function qbSyllabusDisciplineCounts() { return qbSyllabusPackages().reduce((acc, pkg) => (acc[pkg.discipline] = pkg.questions.length, acc), {}); }
function qbIsSyllabusScope() { return (elements.qbTrainingScope?.value || "all") === "syllabus"; }
function qbSelectedZeroDisciplineMessage() { const discipline = elements.qbFilterDiscipline?.value || ""; if (!qbIsSyllabusScope() || !discipline) return ""; return (qbSyllabusDisciplineCounts()[discipline] || 0) === 0 ? `${discipline} está no edital, mas ainda não há questões dessa disciplina no banco.` : ""; }
function qbSetDependentFiltersDisabled(disabled) { [elements.qbFilterSubject, elements.qbFilterTheme].forEach((select) => { if (!select) return; select.disabled = disabled; if (disabled) select.innerHTML = '<option value="">Sem questões disponíveis</option>'; }); }
function qbCanStartTraining() { return !qbSelectedZeroDisciplineMessage() && qbFilteredQuestions().length > 0; }
function qbLimitedList(items, emptyLabel = "nenhum", limit = 8) { if (!items.length) return `<p class="item-meta">${escapeHTML(emptyLabel)}</p>`; const visible = items.slice(0, limit); const hidden = items.length - visible.length; return `<ul>${visible.map((item)=>`<li>${escapeHTML(item)}</li>`).join("")}</ul>${hidden ? `<details><summary>Ver mais ${hidden} item(ns)</summary><ul>${items.slice(limit).map((item)=>`<li>${escapeHTML(item)}</li>`).join("")}</ul></details>` : ""}`; }
function qbWeekSyllabusItems() { const start = weekStart(todayISO()), end = addDays(start, 6); const goals = (state.dailyGoals || []).filter((g) => (g.date || g.data || "") >= start && (g.date || g.data || "") <= end); return qbActiveSyllabusItems().filter((item) => goals.some((g) => g.syllabusItemId === item.id || (qbSafePartialMatch(g.discipline || g.disciplina, qbItemDiscipline(item)) && qbSafePartialMatch(g.subject || g.assunto, item.subject || item.assunto)))); }
function qbWeakSyllabusItems() { return qbActiveSyllabusItems().filter((item) => isWeakItem(item) || disciplineQuestionWeakness(qbItemDiscipline(item)) >= 30 || mockWeakness(qbItemDiscipline(item)) >= 30); }
function qbUnstudiedSyllabusItems() { return qbActiveSyllabusItems().filter((item) => canonical(item.status || item.situacao || "Não iniciado") === "nao iniciado" || (!minutesForItem(item) && !goalsForItem(item).some((g) => goalTotalActualMinutes(g) > 0))); }
function qbQuestionIdsByReviewStatus(statuses = []) { return new Set((state.questionBankSessions || []).flatMap((s) => s.items || []).filter((i) => statuses.includes(i.status) || (statuses.includes("branco") && (!i.marcado || i.marcado === "B"))).map((i) => i.id)); }
function qbTroubleQuestionIds() { return qbQuestionIdsByReviewStatus(["errado", "branco"]); }
function qbScopeLabel() { const scope = elements.qbTrainingScope?.value || "all"; const review = { wrong:"Erradas", blank:"Brancas", wrong_blank:"Erradas + brancas", weak:"Assuntos fracos", unseen:"Não estudados", week:"Assuntos da semana" }[elements.qbReviewType?.value || "wrong"] || "Erradas"; return scope === "review" ? `Revisão direcionada (${review})` : ({ all:"Banco completo", syllabus:"Edital atual" }[scope] || "Banco completo"); }
function qbReviewSyllabusItems(type) { if (type === "week") return qbWeekSyllabusItems(); if (type === "weak") return qbWeakSyllabusItems(); if (type === "unseen") return qbUnstudiedSyllabusItems(); return qbActiveSyllabusItems(); }
function qbScopedBank() { const scope = elements.qbTrainingScope?.value || "all", bank = state.questionBank || []; if (scope === "all") return bank; if (scope === "syllabus") return bank.filter((q) => qbQuestionMatchesAnySyllabusItem(q, qbActiveSyllabusItems())); const type = elements.qbReviewType?.value || "wrong"; if (type === "wrong") { const ids = qbQuestionIdsByReviewStatus(["errado"]); return bank.filter((q) => ids.has(q.id)); } if (type === "blank") { const ids = qbQuestionIdsByReviewStatus(["branco"]); return bank.filter((q) => ids.has(q.id)); } if (type === "wrong_blank") { const ids = qbTroubleQuestionIds(); return bank.filter((q) => ids.has(q.id)); } return bank.filter((q) => qbQuestionMatchesAnySyllabusItem(q, qbReviewSyllabusItems(type))); }
function qbMissingSyllabusWithoutQuestions() { const scoped = qbScopedBank(); return qbActiveSyllabusItems().filter((item) => !scoped.some((q) => qbMatchesSyllabusItem(q, item))).length; }
function qbFilteredQuestions() { const search = canonical(elements.qbFilterSearch?.value || ""); const discipline = elements.qbFilterDiscipline?.value || ""; return qbScopedBank().filter((q)=> (!discipline || (qbIsSyllabusScope() ? qbQuestionMatchesSyllabusDiscipline(q, discipline) : q.disciplina === discipline)) && (!elements.qbFilterSubject?.value || q.assunto === elements.qbFilterSubject.value) && (!elements.qbFilterTheme?.value || q.tema === elements.qbFilterTheme.value) && (!elements.qbFilterBoard?.value || q.banca === elements.qbFilterBoard.value) && (!elements.qbFilterYear?.value || String(q.ano) === elements.qbFilterYear.value) && (!search || canonical([q.enunciado,q.disciplina,q.assunto,q.tema,q.banca,q.ano,q.referencia,q.orgao,q.cargo].join(" ")).includes(search))); }
function normalizeStoredQuestionBank() { state.questionBank = (state.questionBank || []).map((q, index) => { const normalized = normalizeQuestionBankItem(q, index); return { ...q, ...normalized, id: q.id || normalized.id }; }); }

function qbErrorReason(q) { if (!q.marcado || q.marcado === "B") return "branco"; if (q.marcado === "D") return "duvida"; if (qbHasKey(q) && q.marcado !== q.gabarito) return "erro"; return ""; }
function qbErrorReasonLabel(reason) { return ({ erro:"Erro", branco:"Branco", duvida:"Dúvida" }[reason] || reason || "-"); }
function qbQuestionById(id) { return (state.questionBank || []).find((q) => q.id === id); }
function qbNotebookEntryFromAnswer(q) { const reason = qbErrorReason(q); if (!reason) return null; return normalizarItemCadernoErros({ id:q.id, disciplina:q.disciplina, assunto:q.assunto, banca:q.banca||"", cargo:q.cargo||"", enunciado:q.enunciado, respostaMarcada:q.marcado||"", gabaritoCorreto:q.gabarito||"", justificativa:qbExplanationText(q), motivo:reason, dataRegistro:new Date().toISOString(), status:"pendente", quantidadeErros:1 }); }
function qbSaveNotebookItems(items) { items.forEach((q) => { const reason = qbErrorReason(q); if (reason) registrarNoCadernoErros(q, q.marcado || "", reason); }); }
function qbFilteredNotebook() { const list = state.questionErrorNotebook || []; return list.filter((item) => (!elements.qbErrorFilterDiscipline?.value || item.disciplina === elements.qbErrorFilterDiscipline.value) && (!elements.qbErrorFilterSubject?.value || item.assunto === elements.qbErrorFilterSubject.value) && (!elements.qbErrorFilterStatus?.value || item.status === elements.qbErrorFilterStatus.value) && (!elements.qbErrorFilterReason?.value || (item.motivo || item.motivoErro) === elements.qbErrorFilterReason.value)); }
function qbNotebookTopStats(list, field) {
  const rows = Object.entries(list.reduce((acc, item) => {
    const key = item[field] || "Sem informação";
    acc[key] = (acc[key] || 0) + (Number(item.quantidadeErros) || 1);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const format = (items) => items.map(([key, value]) => `${key} (${value})`).join(", ") || "-";
  const hidden = Math.max(0, rows.length - 2);
  const display = format(rows.slice(0, 2));
  return { display: hidden ? `${display} + ${hidden} outros` : display, full: format(rows), rows, hidden };
}

function qbNotebookStats() {
  const list = state.questionErrorNotebook || [];
  return {
    total: list.reduce((sum, item) => sum + (Number(item.quantidadeErros) || 1), 0),
    disciplinas: qbNotebookTopStats(list, "disciplina"),
    assuntos: qbNotebookTopStats(list, "assunto"),
    dominadas: list.filter((item) => item.status === "dominado").length
  };
}
function qbRenderNotebookFilters() { const list = state.questionErrorNotebook || []; qbFillSelect(elements.qbErrorFilterDiscipline, qbUnique(list.map(i=>i.disciplina)), "Todas"); qbFillSelect(elements.qbErrorFilterSubject, qbUnique(list.filter(i=>!elements.qbErrorFilterDiscipline?.value || i.disciplina===elements.qbErrorFilterDiscipline.value).map(i=>i.assunto)), "Todos"); }
function qbNotebookStatCard(label, value, title) { return `<article class="stat-card"><span>${escapeHTML(label)}</span><strong title="${escapeHTML(title || value)}">${escapeHTML(value)}</strong></article>`; }
function qbHistoryRow(item) { return `<article class="question-bank-item qb-error-notebook-row"><header><h4>${escapeHTML(item.disciplina)} — ${escapeHTML(item.assunto)}</h4><span class="badge ${item.status==='dominado'?'success':item.status==='revisado'?'neutral':'warn'}">${escapeHTML(qbNotebookStatusLabel(item.status))}</span></header><div class="card-meta-grid"><span>Disciplina: ${escapeHTML(item.disciplina||'-')}</span><span>Assunto: ${escapeHTML(item.assunto||'-')}</span><span>Motivo: ${escapeHTML(qbErrorReasonLabel(item.motivo || item.motivoErro))}</span><span>Quantidade de erros: ${Number(item.quantidadeErros)||1}</span><span>Status: ${escapeHTML(qbNotebookStatusLabel(item.status))}</span><span>Último erro: ${escapeHTML(qbNotebookLastErrorDate(item))}</span></div><div class="actions"><button data-qb-error-review="${escapeHTML(item.id)}" type="button">Revisar agora</button>${item.status !== 'dominado' ? `<button class="secondary-button" data-qb-error-status="dominado" data-qb-error-id="${escapeHTML(item.id)}" type="button">Marcar como dominada</button>` : ""}</div><details class="qb-error-details"><summary>Ver metadados do registro</summary><div class="card-meta-grid"><span>Banca: ${escapeHTML(item.banca||'-')}</span><span>Cargo: ${escapeHTML(item.cargo||'-')}</span><span>Resposta marcada: ${escapeHTML(item.respostaMarcada||'-')}</span><span>Registrado em: ${escapeHTML(qbNotebookLastErrorDate(item))}</span><span>Última revisão: ${item.ultimaRevisao ? new Date(item.ultimaRevisao).toLocaleString('pt-BR') : "-"}</span></div><details><summary>Mostrar gabarito e justificativa</summary><p><strong>Gabarito:</strong> ${escapeHTML(item.gabaritoCorreto||'-')}</p><p><strong>Justificativa/fundamento:</strong> ${escapeHTML(item.justificativa||item.fundamento||'Sem justificativa cadastrada')}</p></details></details></article>`; }
function qbRenderErrorNotebook() { if (!elements.qbErrorStats) return; qbRenderNotebookFilters(); const stats=qbNotebookStats(), all=qbFilteredNotebook(), list=all.slice(0, QB_RENDER_LIMIT), hidden=Math.max(0, all.length - list.length); elements.qbErrorStats.innerHTML = [
    qbNotebookStatCard("Ocorrências de erro", stats.total, "Soma das ocorrências registradas no Caderno de Erros"),
    qbNotebookStatCard("Mais erros por disciplina", stats.disciplinas.display, stats.disciplinas.full),
    qbNotebookStatCard("Mais erros por assunto", stats.assuntos.display, stats.assuntos.full),
    qbNotebookStatCard("Dominadas", stats.dominadas, "Quantidade de registros com status dominado")
  ].join(""); if (elements.qbErrorNotebookList) elements.qbErrorNotebookList.innerHTML = all.length ? `<p class="item-meta">Exibindo ${list.length} de ${all.length} registro(s) no histórico detalhado.${hidden ? " Ajuste os filtros para refinar." : ""}</p>` + list.map(qbHistoryRow).join("") : "Nenhum registro no caderno de erros."; }
function qbReviewFilteredBy(field) { const value = field === "disciplina" ? elements.qbErrorFilterDiscipline?.value : elements.qbErrorFilterSubject?.value; if (!value) return alert(`Selecione ${field === "disciplina" ? "uma disciplina" : "um assunto"} nos filtros simples do Caderno de Erros.`); qbStartNotebookTraining(qbFilteredNotebook().filter((item)=>item.status!=="dominado" && item[field]===value)); }
function qbSetNotebookStatus(id, status) { const item=(state.questionErrorNotebook||[]).find(i=>i.id===id); if (!item) return; item.status=status; item.ultimaRevisao=new Date().toISOString(); salvarCadernoErros(state.questionErrorNotebook); saveData(); qbRenderErrorNotebook(); }
function qbNotebookStatusLabel(status) { return ({ pendente:"Pendente de revisão", revisado:"Revisada", dominado:"Dominada" }[status] || "Pendente de revisão"); }
function qbNotebookLastErrorDate(item) { const raw = item.dataRegistro || item.ultimoErro || item.ultimaOcorrencia || item.ultimaRevisao; return raw ? new Date(raw).toLocaleString('pt-BR') : "-"; }
function qbNotebookQuestionForItem(item) { const bankQuestion = qbQuestionById(item.id); return bankQuestion ? { ...bankQuestion, motivoCaderno:item.motivo || item.motivoErro } : normalizeQuestionBankItem({ ...item, gabarito:item.gabaritoCorreto, justificativa:item.justificativa, fundamento:item.fundamento || item.justificativa }, 0); }
function qbStartNotebookTraining(items = qbFilteredNotebook().filter(i=>i.status!=="dominado")) { const questions = items.map(qbNotebookQuestionForItem).filter(Boolean); if (!questions.length) return alert("Nenhuma questão pendente/revisada do caderno corresponde ao banco atual."); qbStart(questions, { mode:"errorNotebook" }); if (typeof showView === "function") showView("banco-questoes"); }

function qbCascadeBase(fields = {}) { const discipline = fields.discipline ?? elements.qbFilterDiscipline?.value ?? "", subject = fields.subject ?? elements.qbFilterSubject?.value ?? "", theme = fields.theme ?? elements.qbFilterTheme?.value ?? "", board = fields.board ?? elements.qbFilterBoard?.value ?? ""; return qbScopedBank().filter((q) => (!discipline || (qbIsSyllabusScope() ? qbQuestionMatchesSyllabusDiscipline(q, discipline) : q.disciplina === discipline)) && (!subject || q.assunto === subject) && (!theme || q.tema === theme) && (!board || q.banca === board)); }
function qbRenderCascadingFilters() { if (elements.qbReviewTypeWrapper) elements.qbReviewTypeWrapper.hidden = (elements.qbTrainingScope?.value || "all") !== "review"; const bank = qbScopedBank(); if (qbIsSyllabusScope()) { const counts = qbSyllabusDisciplineCounts(); qbFillSelectWithLabels(elements.qbFilterDiscipline, qbUnique(qbActiveSyllabusItems().map(qbItemDiscipline)).map((d)=>({ value:d, label:`${d} (${counts[d] || 0})` })), "Todas"); } else qbFillSelect(elements.qbFilterDiscipline, qbUnique(bank.map(q=>q.disciplina)), "Todas"); const discipline = elements.qbFilterDiscipline?.value || ""; const zeroDiscipline = Boolean(qbSelectedZeroDisciplineMessage()); qbSetDependentFiltersDisabled(false); qbFillSelect(elements.qbFilterSubject, qbUnique(qbCascadeBase({ discipline, subject:"", theme:"", board:"" }).map(q=>q.assunto)), "Todos"); const subject = elements.qbFilterSubject?.value || ""; qbFillSelect(elements.qbFilterTheme, qbUnique(qbCascadeBase({ discipline, subject, theme:"", board:"" }).map(q=>q.tema)), "Todos"); if (zeroDiscipline) qbSetDependentFiltersDisabled(true); const theme = elements.qbFilterTheme?.value || ""; qbFillSelect(elements.qbFilterBoard, qbUnique(qbCascadeBase({ discipline, subject, theme, board:"" }).map(q=>q.banca)), "Todas"); const board = elements.qbFilterBoard?.value || ""; qbFillSelect(elements.qbFilterYear, qbUnique(qbCascadeBase({ discipline, subject, theme, board }).map(q=>q.ano)), "Todos"); if (elements.qbStartTraining) elements.qbStartTraining.disabled = !qbCanStartTraining(); }
function qbRenderQuestionBankStats() { if (!elements.qbStats) return; const bank = state.questionBank || [], scoped = qbScopedBank(), sessions = state.questionBankSessions || [], last = sessions[0]; const filteredTotal = qbFilteredQuestions().length; const lastPerformance = last?.hasAnyKey ? `${last.summary.correct}/${last.summary.total} • líquido ${last.summary.net}` : (last ? `${last.summary.total} questão(ões), sem gabarito` : "Nenhum"); elements.qbStats.innerHTML = [["Questões no banco", bank.length], ["Questões filtradas", filteredTotal], ["Disciplinas", qbUnique(scoped.map(q=>q.disciplina)).length], ["Assuntos", qbUnique(scoped.map(q=>q.assunto)).length], ["Questões com gabarito", scoped.filter(qbHasKey).length], ["Treinos realizados", sessions.length], ["Último desempenho", lastPerformance]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong>${escapeHTML(b)}</strong></article>`).join(""); }
function renderQuestionBank(options = {}) { if (!elements.qbStats) return; const heavy = options.heavy !== false; normalizeStoredQuestionBank(); qbRenderCascadingFilters(); if (heavy) { renderQbSyllabusPackages(); renderQbDiagnostics(); renderQbSyllabusVerticalized(); renderQbAccordionSummaries(); } qbRenderQuestionBankStats(); const bank = state.questionBank || []; const manage = document.getElementById("qbManageBank"); if (manage && bank.length && !manage.dataset.touched) manage.open = false; }
function renderQbDiagnostics() { if (!elements.qbDiagnostics) return; const packages = qbSyllabusPackages(); const withQuestions = packages.filter((pkg)=>pkg.questions.length).map((pkg)=>`${pkg.discipline} (${pkg.questions.length})`); const withoutQuestions = packages.filter((pkg)=>!pkg.questions.length).map((pkg)=>pkg.discipline); const missingSubjects = packages.flatMap((pkg)=>pkg.missing.map((item)=>`${pkg.discipline} — ${item.subject || item.assunto || item.topic || "Assunto"}`)); elements.qbDiagnostics.innerHTML = `<article class="question-bank-item qb-diagnostics-card"><header><h4>Diagnóstico do edital no banco</h4><span class="badge neutral">${packages.length} disciplina(s)</span></header><div class="qb-diagnostics-grid"><section><h5>Disciplinas do edital com questões</h5>${qbLimitedList(withQuestions, "nenhuma")}</section><section><h5>Disciplinas do edital sem questões</h5>${qbLimitedList(withoutQuestions, "nenhuma")}</section><section><h5>Assuntos do edital sem questões</h5>${qbLimitedList(missingSubjects, "nenhum")}</section></div></article>`; }
function qbShuffle(list) { const copy=[...list]; for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]];} return copy; }
function qbStart(items = qbFilteredQuestions(), options = {}) { if (!items.length) return alert(qbSelectedZeroDisciplineMessage() || "Nenhuma questão encontrada com os filtros atuais."); if (elements.qbShuffleTraining?.checked) items = qbShuffle(items); items = items.slice(0, Math.max(1, Number(elements.qbTrainingLimit?.value) || items.length)); questionBankTraining = { id:createId(), createdAt:new Date().toISOString(), index:0, items, answers:{}, cadernoRegistrado:{}, mode:options.mode || "default" }; elements.qbTrainingPanel.hidden = false; elements.qbResultPanel.hidden = true; qbRenderQuestion(); }
function qbRenderQuestion() { const t=questionBankTraining, q=t.items[t.index], answered=Object.keys(t.answers).length, selected=t.answers[q.id]||"", isNotebook=t.mode==="errorNotebook"; elements.qbTrainingCounter.textContent=`${t.index+1}/${t.items.length}`; elements.qbTrainingProgress.style.width=`${Math.round(answered/t.items.length*100)}%`; const reveal = Boolean(selected) && qbHasKey(q); const msg = qbHasKey(q) ? (reveal ? (selected===q.gabarito ? `Gabarito: ${q.gabarito}. Resposta correta na revisão.` : `Gabarito: ${q.gabarito}. Resposta incorreta na revisão.`) : (isNotebook ? "Modo treino cego: responda antes de ver o gabarito." : "Gabarito disponível após a resposta.")) : "Sem gabarito: salvaremos apenas sua marcação."; const explanation = reveal ? `<div class="notice"><strong>Justificativa/fundamento:</strong> ${escapeHTML(qbExplanationText(q))}</div>` : ""; const notebookActions = isNotebook && reveal && selected===q.gabarito ? `<div class="actions qb-review-actions"><button class="secondary-button" data-qb-review-status="revisado" data-qb-error-id="${escapeHTML(q.id)}" type="button">Marcar como revisada</button><button data-qb-review-status="dominado" data-qb-error-id="${escapeHTML(q.id)}" type="button">Marcar como dominada</button></div>` : ""; elements.qbQuestionCard.innerHTML = `<div class="question-bank-meta"><span>Disciplina: ${escapeHTML(q.disciplina)}</span><span>Assunto: ${escapeHTML(q.assunto)}</span><span>Tema: ${escapeHTML(q.tema)}</span><span>Banca: ${escapeHTML(q.banca||"-")}</span><span>Ano: ${escapeHTML(q.ano||"-")}</span></div><p class="question-bank-text">${escapeHTML(q.enunciado)}</p><p class="notice">${escapeHTML(msg)}</p>${explanation}${notebookActions}<div class="question-bank-actions"><button class="answer-button ${selected==="C"?"selected":""}" data-qb-answer="C" type="button">Certo</button><button class="answer-button ${selected==="E"?"selected":""}" data-qb-answer="E" type="button">Errado</button><button class="answer-button blank-button ${selected==="B"?"selected":""}" data-qb-answer="B" type="button">Branco</button><button class="answer-button doubt-button ${selected==="D"?"selected":""}" data-qb-answer="D" type="button">Dúvida</button></div><div class="training-footer"><span class="item-meta">Respondidas: ${answered}/${t.items.length}</span><div class="actions"><button class="secondary-button" data-qb-nav="prev" ${t.index===0?"disabled":""}>Anterior</button><button class="secondary-button" data-qb-nav="next" ${t.index>=t.items.length-1?"disabled":""}>Próxima</button><button data-qb-finish type="button">Finalizar treino</button></div></div>`; }
function qbFinish() { const t=questionBankTraining; if(!t) return; const items=t.items.map(q=>({...q, marcado:t.answers[q.id]||""})); const summary=items.reduce((a,q)=>{ if(q.marcado==="B"||!q.marcado)a.blank++; if(qbHasKey(q)&&q.marcado&&q.marcado!=="B"){ q.marcado===q.gabarito ? a.correct++ : a.wrong++; } return a; },{total:items.length,correct:0,wrong:0,blank:0}); summary.net=summary.correct-summary.wrong; summary.accuracyPct=summary.correct+summary.wrong ? Math.round(summary.correct/(summary.correct+summary.wrong)*100) : 0; const session={id:t.id,createdAt:t.createdAt,hasAnyKey:items.some(qbHasKey),summary,items:items.map(q=>({id:q.id,disciplina:q.disciplina,assunto:q.assunto,tema:q.tema,banca:q.banca,ano:q.ano,referencia:q.referencia,marcado:q.marcado,gabarito:q.gabarito||"",status:qbAnswerStatus(q),justificativa:qbExplanationText(q),fundamento:qbExplanationText(q)}))}; state.questionBankSessions.unshift(session); qbSaveNotebookItems(items.filter(q => !t.cadernoRegistrado?.[q.id])); questionBankTraining=null; saveData(); qbRenderResult(session); renderQuestionBank(); elements.qbTrainingPanel.hidden=true; elements.qbResultPanel.hidden=false; }
function qbRenderResult(session) { const s=session.summary; const wrongItems=session.items.filter(q=>(q.status || qbAnswerStatus(q))==="errado"), blankItems=session.items.filter(q=>(q.status || qbAnswerStatus(q))==="branco"); elements.qbResultSummary.innerHTML = [["Total",s.total],["Acertos",session.hasAnyKey?s.correct:"Sem gabarito"],["Erros",session.hasAnyKey?s.wrong:"Sem gabarito"],["Brancos",s.blank],["Líquido Cebraspe",session.hasAnyKey?s.net:"Sem gabarito"],["% de acerto",session.hasAnyKey?`${s.accuracyPct}%`:"Sem gabarito"],["Questões erradas",wrongItems.length],["Questões brancas",blankItems.length]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong>${escapeHTML(b)}</strong></article>`).join(""); const redo = blankItems.length ? `<div class="actions"><button id="qbResultRedoBlanks" class="secondary-button" type="button">Refazer brancas</button></div>` : ""; elements.qbResultDetails.innerHTML=redo+session.items.slice(0,50).map((q,i)=>`<article class="question-bank-item"><strong>${i+1}. ${escapeHTML(q.disciplina)} — ${escapeHTML(q.assunto)}</strong><div class="item-meta">Resposta marcada: ${escapeHTML(q.marcado||"-")} • ${q.gabarito?`Gabarito: ${escapeHTML(q.gabarito)}`:"Sem gabarito"} • Resultado: ${escapeHTML(q.status || qbAnswerStatus(q))}</div><p><strong>Justificativa/fundamento:</strong> ${escapeHTML(qbExplanationText(q))}</p></article>`).join(""); document.getElementById("qbResultRedoBlanks")?.addEventListener("click", () => qbStart((state.questionBank||[]).filter(q=>new Set(blankItems.map(i=>i.id)).has(q.id)))); }
function qbNoResultsMessage() { const zero = qbSelectedZeroDisciplineMessage(); if (zero) return zero; if ((state.questionBank||[]).length && (elements.qbTrainingScope?.value||"all") === "syllabus" && !qbScopedBank().length) return "Há questões no banco, mas nenhuma corresponde aos assuntos do edital selecionado."; return "Nenhuma questão encontrada."; }
function qbPreview() { qbPreviewVisible = true; if (elements.qbPreviewSection) elements.qbPreviewSection.hidden = false; qbRenderCascadingFilters(); const list=qbFilteredQuestions(); const discipline = elements.qbFilterDiscipline?.value || "todas as disciplinas"; const zeroMessage = qbSelectedZeroDisciplineMessage(); if (elements.qbMessage) elements.qbMessage.textContent = zeroMessage || `Escopo: ${qbScopeLabel()} — ${discipline}: ${list.length} questões encontradas.`; if (elements.qbStats) qbRenderQuestionBankStats(); const hidden=Math.max(0,list.length-20); elements.qbFilteredPreview.innerHTML = list.length ? `<p class="item-meta">${list.length} questão(ões) encontrada(s). Exibindo ${Math.min(20,list.length)}.</p>` + list.slice(0,20).map((q,i)=>`<article class="question-bank-item qb-preview-item"><strong>${i+1}. ${escapeHTML(q.disciplina)} — ${escapeHTML(q.assunto)}</strong><div class="item-meta">Tema: ${escapeHTML(q.tema||"-")} • Banca: ${escapeHTML(q.banca||"-")} • Ano: ${escapeHTML(q.ano||"-")}</div><p>${escapeHTML(q.enunciado)}</p></article>`).join("") + (hidden ? `<details><summary>Ver mais ${hidden} item(ns)</summary>${list.slice(20,50).map((q,i)=>`<article class="question-bank-item qb-preview-item"><strong>${i+21}. ${escapeHTML(q.disciplina)} — ${escapeHTML(q.assunto)}</strong><p>${escapeHTML(q.enunciado)}</p></article>`).join("")}</details>` : "") : escapeHTML(qbNoResultsMessage()); }

[elements.qbErrorFilterDiscipline, elements.qbErrorFilterSubject, elements.qbErrorFilterStatus, elements.qbErrorFilterReason].forEach((el) => { el?.addEventListener("change", qbRenderErrorNotebook); el?.addEventListener("input", qbRenderErrorNotebook); });
elements.qbErrorNotebookList?.addEventListener("click", (event) => { const reviewBtn=event.target.closest("button[data-qb-error-review]"); if (reviewBtn) return qbStartNotebookTraining(qbFilteredNotebook().filter((item)=>item.id===reviewBtn.dataset.qbErrorReview)); const btn=event.target.closest("button[data-qb-error-status][data-qb-error-id]"); if (btn) qbSetNotebookStatus(btn.dataset.qbErrorId, btn.dataset.qbErrorStatus); });
elements.qbStartErrorNotebook?.addEventListener("click", () => qbStartNotebookTraining(qbFilteredNotebook().filter((item)=>item.status!=="dominado")));
elements.qbReviewByDiscipline?.addEventListener("click", () => qbReviewFilteredBy("disciplina"));
elements.qbReviewBySubject?.addEventListener("click", () => qbReviewFilteredBy("assunto"));
elements.qbToggleErrorHistory?.addEventListener("click", () => { if (elements.qbErrorHistory) elements.qbErrorHistory.open = !elements.qbErrorHistory.open; });

function render() { migrateIncorrectWeakDomains(); syncAllFactoryMaterials(); renderFloatingTimer(); renderSubjects(); renderGoalSelectors(); renderQuestionSelectors(); renderPlanning(); renderProgressPanel(); renderDashboard(); renderGoalDashboardCards(); renderEdital(); renderSyllabus(); renderSchedulable(); renderDailyGoals(); renderGoalCalendar(); renderCentralGoals(); renderQuestionHistory(); updateQuestionCalculated(); renderMaterials(); updateStudyMaterialOptions(); safeRenderView("fabrica-resumos", renderFactory); renderReviews(); renderSmartReviewsDashboard(); renderSmartReviewStandalone(); renderAlerts(); renderHistory(); renderImportPreview(); renderImportedSyllabusGroups(); renderBackupSummary(); renderQuestionBank(); qbRenderErrorNotebook(); renderSimulados(); saveData(); }
function syllabusFromValues(values) { return { id: createId(), discipline: values[0]?.trim() || "Sem disciplina", topic: values[1]?.trim() || "Geral", subject: values[2]?.trim() || "Assunto", subtopic: values[3]?.trim() || "", reference: values[4]?.trim() || "", priority: values[5]?.trim() || "Média", weight: normalizeSubjectIncidence(values[6]), status: values[7]?.trim() || "Não iniciado", domain: normalizeImportedDomain(values[8]), notes: values[9]?.trim() || "" }; }

elements.changeMotivation?.addEventListener("click", () => renderMotivationalPhrase());
elements.subjectForm.addEventListener("submit", (event) => { event.preventDefault(); state.subjects.push({ id: createId(), name: elements.subjectName.value.trim(), goalHours: Number(elements.subjectGoal.value) }); elements.subjectForm.reset(); render(); });
elements.studyForm.addEventListener("submit", (event) => { event.preventDefault(); if (!elements.studySubject.value) return alert("Cadastre uma disciplina antes de registrar o estudo."); const questions = Number(elements.questionsDone.value); const correct = Number(elements.correctAnswers.value); const wrong = Number(elements.wrongAnswers.value); const blank = Number(elements.blankAnswers.value); if (correct + wrong + blank !== questions) return alert("A soma de acertos, erros e brancos deve ser igual ao total de questões feitas."); const studyTopic = elements.studyTopic.value.trim(); const linkedItem = findSyllabusItemByStudy(elements.studySubject.value, studyTopic); state.studies.push({ id: createId(), date: elements.studyDate.value, subjectId: elements.studySubject.value, syllabusItemId: linkedItem?.id || "", topic: studyTopic, minutes: Number(elements.studyMinutes.value), plannedMinutes: Number(elements.studyPlannedMinutes?.value) || 0, topicStatus: elements.studyTopicStatus?.value || "Iniciado", difficultyNotes: elements.studyDifficultyNotes?.value.trim() || "", materialId: elements.studyMaterial?.value || "", questions, correct, wrong, blank }); if (linkedItem) updateItemProgress(linkedItem.id, { status: isCompletedStatusValue(elements.studyTopicStatus?.value) ? "Concluído" : (completedStatus(linkedItem) ? linkedItem.status : "Em andamento") }); elements.studyForm.reset(); elements.studyDate.value = todayISO();
elements.goalDate.value = todayISO();
elements.questionDate.value = todayISO(); render(); });
elements.editalForm.addEventListener("submit", (event) => { event.preventDefault(); ["contestName", "agency", "role", "board", "examDate", "officialLink", "generalNotes"].forEach((key) => { state.edital[key] = elements[key].value.trim(); }); render(); });
elements.editalPdf.addEventListener("change", () => { const file = elements.editalPdf.files[0]; if (!file) return; state.edital.pdf = { name: file.name, size: file.size, type: file.type, attachedAt: new Date().toLocaleString("pt-BR") }; render(); });
elements.removePdf.addEventListener("click", () => { state.edital.pdf = null; elements.editalPdf.value = ""; render(); });
elements.syllabusForm.addEventListener("submit", (event) => { event.preventDefault(); const payload = { id: editingSyllabusId || createId(), discipline: elements.itemDiscipline.value.trim(), topic: elements.itemTopic.value.trim(), subject: elements.itemSubject.value.trim(), subtopic: elements.itemSubtopic.value.trim(), reference: elements.itemReference.value.trim(), priority: elements.itemPriority.value, weight: normalizeSubjectIncidence(elements.itemWeight.value), status: elements.itemStatus.value, domain: elements.itemDomain.value, manualWeak: elements.itemDomain.value === "Fraco", notes: elements.itemNotes.value.trim() }; const existingIndex = state.syllabusItems.findIndex((item) => item.id === editingSyllabusId); if (existingIndex >= 0) state.syllabusItems[existingIndex] = { ...state.syllabusItems[existingIndex], ...payload }; else state.syllabusItems.push(payload); editingSyllabusId = null; elements.syllabusForm.reset(); elements.itemPriority.value = "Média"; elements.itemWeight.value = 3; elements.itemStatus.value = "Não iniciado"; elements.itemDomain.value = "Sem diagnóstico"; render(); });
elements.applyIncidenceTableButton?.addEventListener("click", handleApplyIncidenceTable);
elements.previewBulk.addEventListener("click", () => { bulkDraft = elements.bulkInput.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => syllabusFromValues(line.split(";"))); elements.saveBulk.disabled = !bulkDraft.length; elements.bulkPreview.innerHTML = bulkDraft.length ? `<table><thead><tr><th>Disciplina</th><th>Tópico</th><th>Assunto</th><th>Prioridade</th><th>Status</th><th>Domínio</th></tr></thead><tbody>${bulkDraft.map((item) => `<tr><td>${escapeHTML(item.discipline)}</td><td>${escapeHTML(item.topic)}</td><td>${escapeHTML(item.subject)}</td><td>${escapeHTML(item.priority)}</td><td>${escapeHTML(item.status)}</td><td>${escapeHTML(item.domain)}</td></tr>`).join("")}</tbody></table>` : ""; });
elements.saveBulk.addEventListener("click", () => { state.syllabusItems.push(...bulkDraft); bulkDraft = []; elements.bulkInput.value = ""; elements.bulkPreview.innerHTML = ""; elements.saveBulk.disabled = true; render(); });
[elements.filterSearch, elements.filterDiscipline, elements.filterPriority, elements.filterStatus, elements.filterDomain, elements.filterSchedulable, elements.filterQuick].forEach((filter) => filter.addEventListener(filter === elements.filterSearch ? "input" : "change", () => { syllabusVisibleCount = 30; renderSyllabus(); }));
[elements.importFilterDiscipline, elements.importFilterStatus, elements.importFilterPriority, elements.importFilterDomain].forEach((filter) => filter.addEventListener("change", renderImportPreview));
elements.syllabusList.addEventListener("click", (event) => { const button = event.target.closest("button[data-action]"); if (!button) return; const { action, id } = button.dataset; if (action === "edit") editSyllabusItem(id); if (action === "not-started") setItemStatus(id, "Não iniciado"); if (action === "started") setItemStatus(id, "Em andamento"); if (action === "studied") setItemStatus(id, "Concluído"); if (action === "review") { updateItemProgress(id, { status: "Revisar", reviewed: true, lastReviewedAt: todayISO() }); render(); } if (action === "dominated") setItemStatus(id, "Dominado"); if (action === "weak") setItemDomain(id, "Fraco", true); if (action === "schedulable") toggleItemSchedulable(id); if (action === "delete") deleteSyllabusItem(id); });
elements.subjectList.addEventListener("click", (event) => { const button = event.target.closest("button[data-delete-discipline]"); if (button) deleteDisciplineFromSyllabus(button.dataset.deleteDiscipline); });
elements.syllabusList.addEventListener("change", (event) => { const incidenceId = event.target.dataset.incidenceId; if (incidenceId) { const item = getSyllabusById(incidenceId); if (item) { item.weight = normalizeSubjectIncidence(event.target.value); render(); } return; } const id = event.target.dataset.progressId; if (!id) return; const item = getSyllabusById(id); if (!item) return; if (event.target.dataset.progressField === "minutes") item.studyMinutes = Math.max(0, Number(event.target.value) || 0); if (event.target.dataset.progressField === "notes") item.progressNotes = event.target.value.trim(); render(); });
elements.showMoreSyllabus.addEventListener("click", () => { syllabusVisibleCount += 30; renderSyllabus(); });
elements.applyBulkPriority.addEventListener("click", () => { const filtered = getFilteredItems(); if (!filtered.length) return alert("Nenhum item filtrado para alterar."); filtered.forEach((item) => { item.priority = elements.bulkPriority.value; }); render(); });
elements.schedulableList.addEventListener("change", (event) => { const id = event.target.dataset.id; const key = event.target.dataset.setting; if (!id || !key) return; const setting = settingFor(id); setting[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value; render(); });

elements.jsonImportFile.addEventListener("change", async () => {
  const file = elements.jsonImportFile.files[0];
  resetImportDraft();
  if (!file) return;
  try {
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      showImportError("Arquivo JSON inválido.", error);
      return;
    }
    let validRawItems;
    try {
      validRawItems = validRawImportItemsFromPayload(payload);
    } catch (error) {
      showImportError(error.message, error);
      return;
    }
    importDraft = validRawItems.map(prepareImportedItem);
    elements.importMessage.innerHTML = `Pré-visualização carregada com sucesso. <strong>${escapeHTML(file.name)}</strong> pronto para conferência.`;
    renderImportPreview();
  } catch (error) {
    showImportError("Arquivo JSON inválido.", error);
  }
});
elements.replaceImportedSyllabus?.addEventListener("click", replaceImportedSyllabusFromSelectedJson);
elements.importJsonButton.addEventListener("click", () => {
  if (!importDraft.length) {
    elements.importMessage.innerHTML = "Nenhum item encontrado no JSON.";
    console.error("Importação bloqueada: nenhum arquivo JSON válido foi lido antes do clique.");
    return;
  }
  const existingKeys = new Set(state.syllabusItems.map((item) => item.importKey || importKeyFor(item)));
  const hasDuplicates = importDraft.some((item) => existingKeys.has(item.importKey));
  let itemsToImport = [...importDraft];
  if (hasDuplicates) {
    const replace = confirm("Este edital parece já ter sido importado. Clique em OK para substituir os dados existentes ou em Cancelar para apenas adicionar novos itens.");
    if (replace) {
      const draftKeys = new Set(importDraft.map((item) => item.importKey));
      state.syllabusItems.filter((item) => draftKeys.has(item.importKey || importKeyFor(item))).forEach((item) => delete state.schedulableSettings[item.id]);
      state.syllabusItems = state.syllabusItems.filter((item) => !draftKeys.has(item.importKey || importKeyFor(item)));
    } else {
      itemsToImport = importDraft.filter((item) => !existingKeys.has(item.importKey));
    }
  }
  try {
    state.syllabusItems.push(...itemsToImport);
    itemsToImport.forEach((item) => {
      state.schedulableSettings[item.id] = { availability: item.importMeta.agendavel ? "Agendável" : "Não agendável", mode: item.importMeta.tipo_agendamento || "Estudo + questões", priority: item.priority === "Alta" };
    });
    importDraft = [];
    elements.jsonImportFile.value = "";
    render();
    elements.importMessage.innerHTML = "Edital verticalizado importado com sucesso.";
  } catch (error) {
    console.error("Falha ao importar o edital verticalizado.", error);
    elements.importMessage.innerHTML = `Falha ao importar o edital verticalizado: ${escapeHTML(error.message)}`;
  }
});

elements.importedSyllabusGroups?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-delete-imported-group]");
  if (button) deleteImportedSyllabusGroup(button.dataset.deleteImportedGroup);
});

elements.clearImportedSyllabus.addEventListener("click", () => {
  const importedItems = state.syllabusItems.filter((item) => item.imported || item.importMeta?.imported);
  if (!importedItems.length) return alert("Não há edital verticalizado importado para limpar.");
  if (!confirm("Tem certeza que deseja apagar apenas os itens importados do edital verticalizado?")) return;
  const removedDisciplineNames = new Set(importedItems.map((item) => normalizeText(item.discipline)).filter(Boolean));
  importedItems.forEach((item) => delete state.schedulableSettings[item.id]);
  state.syllabusItems = state.syllabusItems.filter((item) => !(item.imported || item.importMeta?.imported));
  cleanupOrphanImportedSubjects(removedDisciplineNames);
  cleanupDisciplineWeights(removedDisciplineNames);
  saveData();
  render();
  elements.importMessage.innerHTML = "Edital verticalizado importado removido. Disciplinas automáticas sem uso também foram removidas.";
});

elements.clearData.addEventListener("click", () => { if (confirm("Tem certeza que deseja apagar todos os dados salvos neste navegador?")) { clearProjectLocalStorage(); replaceState({}); saveData(); render(); } });
elements.exportBackup?.addEventListener("click", exportBackup);
elements.connectGoogleDrive?.addEventListener("click", connectGoogleDrive);
elements.syncNowButton?.addEventListener("click", syncNow);
elements.pushToCloud?.addEventListener("click", forcePushToCloud);
elements.pullFromCloud?.addEventListener("click", forcePullFromCloud);
elements.disconnectGoogleDrive?.addEventListener("click", disconnectGoogleDrive);
window.addEventListener("load", () => checkCloudForNewerVersion("open"));
document.addEventListener("visibilitychange", () => { if (!document.hidden && canRunAutoSyncChecks()) checkCloudForNewerVersion("focus"); });
window.addEventListener("focus", () => { if (canRunAutoSyncChecks()) checkCloudForNewerVersion("focus"); });
elements.selectBackupFile?.addEventListener("click", () => elements.backupFileInput.click());
elements.backupFileInput?.addEventListener("change", () => { const file = elements.backupFileInput.files[0]; if (file) handleBackupFile(file); elements.backupFileInput.value = ""; });
elements.resetSolvedQuestions?.addEventListener("click", resetSolvedQuestionsFromBackup);
elements.clearAllLocalData?.addEventListener("click", clearAllLocalDataFromBackup);
elements.backupPreview?.addEventListener("click", (event) => { const button = event.target.closest("button[data-backup-import]"); if (button) handleBackupImportChoice(button.dataset.backupImport); });

function syllabusLabel(item) { return `${item.discipline} — ${item.subject}${item.subtopic ? ` • ${item.subtopic}` : ""}`; }
function getSyllabusById(id) { return state.syllabusItems.find((item) => item.id === id); }
function optionsForDiscipline(select, current = "") { const ds = getAllDisciplines(); select.innerHTML = '<option value="">Selecione</option>' + ds.map((d) => `<option value="${escapeHTML(d)}" ${d === current ? "selected" : ""}>${escapeHTML(d)}</option>`).join(""); }
function optionsForItems(select, discipline, current = "") { const items = state.syllabusItems.filter((item) => !discipline || item.discipline === discipline); select.innerHTML = '<option value="">Selecione</option>' + items.map((item) => `<option value="${item.id}" ${item.id === current ? "selected" : ""}>${escapeHTML(item.subject)}${item.subtopic ? ` • ${escapeHTML(item.subtopic)}` : ""}</option>`).join(""); }
function renderGoalSelectors() { const gd = elements.goalDiscipline.value; const gi = elements.goalSyllabusItem.value; optionsForDiscipline(elements.goalDiscipline, gd); optionsForItems(elements.goalSyllabusItem, elements.goalDiscipline.value || gd, gi); }
function renderQuestionSelectors() { const qd = elements.questionDiscipline.value; const qi = elements.questionSyllabusItem.value; optionsForDiscipline(elements.questionDiscipline, qd); optionsForItems(elements.questionSyllabusItem, elements.questionDiscipline.value || qd, qi); const fd = elements.questionFilterDiscipline.value; optionsForDiscipline(elements.questionFilterDiscipline, fd); elements.questionFilterDiscipline.querySelector('option').textContent = 'Todas'; const fs = elements.questionFilterSubject.value; elements.questionFilterSubject.innerHTML = '<option value="">Todos</option>' + state.syllabusItems.filter((item) => !elements.questionFilterDiscipline.value || item.discipline === elements.questionFilterDiscipline.value).map((item) => `<option value="${item.id}" ${item.id === fs ? "selected" : ""}>${escapeHTML(item.subject)}</option>`).join(''); }
function goalTypeForItem(item) { const mode = item.importMeta?.tipo_agendamento || item.tipo_agendamento || settingFor(item.id).mode; if (isWeakItem(item)) return "Reforço"; if (mode === "Questões apenas") return "Questões"; if (mode === "Revisão apenas" || item.status === "Revisar") return "Revisão"; return item.status === "Não iniciado" ? "Estudo novo" : "Questões"; }
const DISCIPLINE_WEIGHT_OPTIONS = [
  { value: 18, label: "Altíssima" },
  { value: 14, label: "Peças" },
  { value: 12, label: "Muito alta" },
  { value: 7, label: "Alta" },
  { value: 3, label: "Média" }
];
const DEFAULT_DISCIPLINE_WEIGHTS = [
  { names: ["direito penal"], weight: 18 },
  { names: ["direito processual penal"], weight: 18 },
  { names: ["legislação penal e processual penal extravagante", "legislacao penal e processual penal extravagante", "legislação específica penal e processual penal", "legislacao especifica penal e processual penal"], weight: 18 },
  { names: ["peça para delegado de polícia civil", "peca para delegado de policia civil"], weight: 14 },
  { names: ["direito constitucional"], weight: 12 },
  { names: ["direito administrativo"], weight: 7 },
  { names: ["legislação estadual e institucional", "legislacao estadual e institucional", "legislação especial administrativa", "legislacao especial administrativa"], weight: 7 },
  { names: ["direitos humanos"], weight: 3 },
  { names: ["medicina legal", "ciências forenses", "ciencias forenses"], weight: 3 }
];
function defaultDisciplineWeight(discipline) {
  const normalized = normalizeMatchText(discipline);
  return DEFAULT_DISCIPLINE_WEIGHTS.find((entry) => entry.names.some((name) => normalizeMatchText(name) === normalized))?.weight || 3;
}
function normalizeDisciplineWeight(value, discipline = "") {
  const weight = Math.round(Number(value));
  return DISCIPLINE_WEIGHT_OPTIONS.some((option) => option.value === weight) ? weight : defaultDisciplineWeight(discipline);
}
function disciplineWeightValue(discipline) {
  const stored = state.disciplineWeights?.[discipline];
  return stored === undefined || stored === null || stored === "" ? defaultDisciplineWeight(discipline) : normalizeDisciplineWeight(stored, discipline);
}
function disciplineWeightOptions(discipline) {
  const current = disciplineWeightValue(discipline);
  return DISCIPLINE_WEIGHT_OPTIONS.map((option) => `<option value="${option.value}" ${current === option.value ? "selected" : ""}>${option.value} = ${option.label}</option>`).join("");
}
function ensureDefaultDisciplineWeights() {
  state.disciplineWeights ||= {};
  getAllDisciplines().forEach((discipline) => {
    if (state.disciplineWeights[discipline] === undefined || state.disciplineWeights[discipline] === null || state.disciplineWeights[discipline] === "") {
      state.disciplineWeights[discipline] = defaultDisciplineWeight(discipline);
    } else {
      state.disciplineWeights[discipline] = normalizeDisciplineWeight(state.disciplineWeights[discipline], discipline);
    }
  });
}
function disciplineQuestionWeakness(discipline) { const logs = state.questionLogs.filter((q) => canonical(q.discipline) === canonical(discipline)); const total = logs.reduce((a,q)=>a+Number(q.total||0),0); const wrong = logs.reduce((a,q)=>a+Number(q.wrong||0),0); return total ? wrong / total * 100 : 0; }
function mockWeakness(discipline) { const rows = (state.simulados||[]).flatMap((m)=>m.disciplines||[]).filter((d)=>canonical(d.name||d.discipline)===canonical(discipline)); const total = rows.reduce((a,d)=>a+Number(d.total||0),0); const wrong = rows.reduce((a,d)=>a+Number(d.wrong||0),0); return total ? wrong / total * 100 : 0; }
function itemScore(item, pendingByDiscipline) { const pending = pendingByDiscipline[item.discipline] || 0; const totalDisc = state.syllabusItems.filter((i)=>i.discipline===item.discipline && i.status!=="Ignorado").length || 1; const atrasada = pending / totalDisc * 40; const reviewDue = item.status === "Revisar" || item.lastReviewedAt && addDays(item.lastReviewedAt, 7) <= todayISO() ? 30 : 0; const examBoost = state.edital.examDate ? Math.max(0, 20 - Math.ceil((parseDate(state.edital.examDate)-new Date())/86400000)/10) : 0; const subjectIncidenceBoost = (normalizeSubjectIncidence(item.weight) - 3) * 10; return disciplineWeightValue(item.discipline) * 18 + atrasada + (item.status === "Não iniciado" ? 35 : 0) + (isUndiagnosed(item) ? 18 : 0) + (isWeakItem(item) ? 42 : 0) + disciplineQuestionWeakness(item.discipline) * .7 + mockWeakness(item.discipline) * .4 + subjectIncidenceBoost + reviewDue + examBoost; }
function makeGoal(item, date, type) {
  const dayType = availabilityForDate(date).type;
  const factor = dayType === "plantão" ? 0.6 : dayType === "folga" || dayType === "estudo forte" ? 1.25 : dayType === "indisponível" ? 0.2 : dayType === "estudo leve" ? 0.75 : 1;
  const baseMinutes = ({ "Estudo novo": 60, "Questões": 45, "Revisão": 30, "Reforço": 45 })[type] || 45;
  const minutes = Math.min(dayType === "folga" || dayType === "estudo forte" ? 90 : Infinity, Math.max(30, Math.round(baseMinutes * factor)));
  return { id: createId(), date, data: date, discipline: item.discipline, disciplina: item.discipline, syllabusItemId: item.id, subject: item.subject, assunto: item.subject, referencia_edital: item.reference || "", type, tipo: type.toLowerCase(), minutes, tempo_sugerido_minutos: minutes, priority: item.priority, prioridade: item.priority, status: "Pendente", origin: "edital verticalizado", origem: "edital verticalizado", notes: `Gerada automaticamente do edital verticalizado. Status: ${item.status}; domínio: ${item.domain}; incidência do assunto: ${normalizeSubjectIncidence(item.weight)} = ${subjectIncidenceLabel(item.weight)}.`, observacoes: `Priorizada por status, domínio, prioridade, incidência do assunto e pendência da disciplina.` };
}
function pickCandidate(candidates, used, predicate = () => true, chosen = [], maxGoals = 4, disciplineLimit = Infinity, allowedDisciplines = null) { const counts = chosen.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{}); const usedDisciplines = new Set(chosen.map((g)=>g.discipline)); return candidates.find((item) => !used.has(item.id) && predicate(item) && (!allowedDisciplines || allowedDisciplines.has(item.discipline)) && (usedDisciplines.has(item.discipline) || usedDisciplines.size < disciplineLimit) && ((counts[item.discipline]||0) < Math.ceil(maxGoals/2) || Object.keys(counts).length <= 1)); }
function generateGoalsForDate(date, opts = {}) {
  ensureDefaultDisciplineWeights();
  const dayType = availabilityForDate(date).type;
  if (dayType === "indisponível" && !opts.manual) return [];
  const existing = new Set(state.dailyGoals.filter((g)=>g.date===date).map((g)=>g.syllabusItemId));
  const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => (acc[item.discipline] = (acc[item.discipline] || 0) + 1, acc), {});
  const candidates = state.syllabusItems.filter((item) => isSchedulable(item.id) && item.status !== "Ignorado" && !existing.has(item.id)).sort((a,b) => itemScore(b,pendingByDiscipline) - itemScore(a,pendingByDiscipline));
  const c = planningConfig();
  const baseMaxGoals = opts.maxGoals || (dayType === "plantão" ? Math.min(2, Number(c.topicsPerDay)||2) : dayType === "folga" || dayType === "estudo forte" ? 6 : dayType === "estudo leve" ? 3 : 4);
  const maxGoals = Math.max(0, Math.min(baseMaxGoals, Number(opts.topicLimit ?? c.topicsPerDay) || 3));
  const disciplineLimit = Math.max(1, Math.min(Number(opts.disciplineLimit ?? c.disciplinesPerDay) || 2, maxGoals || 1));
  const allowedDisciplines = opts.allowedDisciplines ? new Set(opts.allowedDisciplines) : null;
  const minDisc = Math.min(new Set(candidates.filter((i)=>!allowedDisciplines || allowedDisciplines.has(i.discipline)).map((i)=>i.discipline)).size, disciplineLimit, maxGoals >= 4 ? 3 : maxGoals >= 2 ? 2 : 1);
  const buckets = [
    [Math.ceil(maxGoals*.4), (i)=>disciplineWeightValue(i.discipline)>=4],
    [Math.ceil(maxGoals*.3), (i)=>pendingByDiscipline[i.discipline] >= Math.max(...Object.values(pendingByDiscipline),0)*.6],
    [Math.ceil(maxGoals*.2), (i)=>isWeakItem(i) || disciplineQuestionWeakness(i.discipline)>=30 || mockWeakness(i.discipline)>=30],
    [Math.max(1,Math.floor(maxGoals*.1)), (i)=>i.status==="Revisar" || goalTypeForItem(i)==="Revisão"]
  ];
  const used = new Set(), chosen = [];
  const addOne = (pred) => { const item = pickCandidate(candidates, used, pred, chosen, maxGoals, disciplineLimit, allowedDisciplines); if (item && chosen.length < maxGoals) { used.add(item.id); chosen.push(makeGoal(item, date, goalTypeForItem(item))); } };
  buckets.forEach(([n,p]) => { for (let i=0;i<n && chosen.length<maxGoals;i++) addOne(p); });
  while (new Set(chosen.map((g)=>g.discipline)).size < minDisc && chosen.length < maxGoals) addOne((i)=>!chosen.some((g)=>g.discipline===i.discipline));
  while (chosen.length < Math.min(maxGoals, candidates.length)) addOne(()=>true);
  return chosen;
}
function limitGeneratedGoals(goals, { topicLimit = Infinity, disciplineLimit = Infinity } = {}) {
  const usedDisciplines = new Set(), selected = [];
  for (const goal of goals) {
    if (selected.length >= topicLimit) break;
    if (!usedDisciplines.has(goal.discipline) && usedDisciplines.size >= disciplineLimit) continue;
    usedDisciplines.add(goal.discipline);
    selected.push(goal);
  }
  return selected;
}
function generationShortageMessage(goals, requestedTopics, label) {
  if (goals.length >= requestedTopics) return "";
  return ` Aviso: havia apenas ${goals.length} assunto(s) disponível(is) para ${label}; o sistema gerou o máximo possível sem apagar dados antigos.`;
}
function uniqueGoalsBySyllabus(goals, reservedIds = new Set()) {
  const used = new Set(reservedIds);
  return goals.filter((goal) => {
    const key = goal.syllabusItemId;
    if (!key || used.has(key)) return false;
    used.add(key);
    return true;
  });
}
function shouldRecalculateDailyGoal(goal) {
  normalizeGoalTimeFields(goal);
  const status = goal.status || "Pendente";
  return !isGoalDone(goal) && !isGoalInProgress(goal) && goalTotalActualMinutes(goal) <= 0 && ["", "Pendente"].includes(status);
}
function isPreservableDailyGoal(goal) {
  return !shouldRecalculateDailyGoal(goal);
}
function generateDailyGoals() {
  try {
    const date = elements.goalDate.value || todayISO();
    const availability = availabilityForDate(date);
    if (!state.syllabusItems.length) { showDailyGoalMessage("Não foi possível gerar metas. Verifique se o edital foi importado.", "error"); return; }
    const existingToday = state.dailyGoals.filter((g) => g.date === date);
    if (existingToday.length && !confirm(`Já existem ${existingToday.length} meta(s) para ${formatDateBR(date)}. O sistema vai manter as metas existentes e gerar somente assuntos ainda não presentes, sem duplicar syllabusItemId. Clique em OK para tentar adicionar apenas metas faltantes ou em Cancelar para manter como está.`)) return;
    const manualUnavailable = availability.type === "indisponível";
    if (manualUnavailable && !confirm("Este dia está marcado como indisponível. Deseja gerar metas mesmo assim?")) {
      showDailyGoalMessage("Geração cancelada: o dia selecionado está indisponível.", "warning");
      return;
    }
    const existingIds = new Set(existingToday.map((g)=>g.syllabusItemId).filter(Boolean));
    const chosen = uniqueGoalsBySyllabus(generateGoalsForDate(date, { manual: manualUnavailable }), existingIds);
    if (!chosen.length) { showDailyGoalMessage(existingToday.length ? `Nenhuma meta nova foi adicionada: já existem metas para ${formatDateBR(date)} e duplicidades por assunto foram bloqueadas.` : "Nenhuma meta gerada. Verifique assuntos agendáveis, duplicidades ou disponibilidade do dia.", "warning"); return; }
    state.dailyGoals.push(...chosen);
    saveData();
    render();
    const disciplines = new Set(chosen.map((g)=>g.discipline)).size;
    showDailyGoalMessage(`${chosen.length} meta(s) nova(s) gerada(s) para ${formatDateBR(date)}, com ${disciplines} disciplina(s) diferente(s). Metas existentes foram preservadas e duplicidades por assunto foram bloqueadas. Limitação aplicada: ${availability.type} (${availability.hours || 0}h disponíveis), até ${planningConfig().disciplinesPerDay} disciplina(s) e ${planningConfig().topicsPerDay} assunto(s).${generationShortageMessage(chosen, planningConfig().topicsPerDay, "o dia")}`, "success");
    showView("metas-do-dia");
  } catch (error) { console.error("Não foi possível gerar metas.", error); showDailyGoalMessage("Não foi possível gerar metas. Verifique se o edital foi importado.", "error"); }
}
function refreshDailyGoalsFromPlanning() {
  try {
    const date = elements.goalDate.value || todayISO();
    if (!state.syllabusItems.length) { showDailyGoalMessage("Não foi possível atualizar. Verifique se o edital foi importado.", "error"); return; }
    const dayGoals = state.dailyGoals.filter((g) => g.date === date);
    const preserved = dayGoals.filter(isPreservableDailyGoal);
    const recalculated = dayGoals.filter((g) => !isPreservableDailyGoal(g));
    if (!confirm(`Atualizar o Plano do Dia de ${formatDateBR(date)} conforme o Planejamento atual?\n\nSerão preservadas ${preserved.length} meta(s) concluída(s), em andamento ou com tempo/questões registrado(s), mantendo histórico, links e observações.\nSerão removidas e recalculadas ${recalculated.length} meta(s) pendente(s) ainda não iniciada(s).`)) return;
    const manualUnavailable = availabilityForDate(date).type === "indisponível";
    const preservedIds = new Set(preserved.map((g)=>g.syllabusItemId).filter(Boolean));
    state.dailyGoals = state.dailyGoals.filter((g) => g.date !== date || preserved.includes(g));
    const generated = uniqueGoalsBySyllabus(generateGoalsForDate(date, { manual: manualUnavailable }), preservedIds);
    state.dailyGoals.push(...generated);
    saveData();
    render();
    showDailyGoalMessage(`Plano de ${formatDateBR(date)} atualizado conforme o Planejamento: ${preserved.length} meta(s) preservada(s), ${recalculated.length} pendente(s) removida(s) e ${generated.length} meta(s) recalculada(s), sem duplicar assuntos.`, "success");
    if (factoryCurrentFilter === "hoje") renderFactory();
    showView("metas-do-dia");
  } catch (error) { console.error("Não foi possível atualizar o Plano do Dia.", error); showDailyGoalMessage("Não foi possível atualizar o Plano do Dia conforme o Planejamento.", "error"); }
}
function appendGoalHistory(goal, text) {
  goal.history ||= [];
  goal.history.push({ at: new Date().toISOString(), text });
  goal.notes = [goal.notes || "", text].filter(Boolean).join("\n");
}
function updateGoalDone(goal) {
  const previousStatus = goal.status;
  normalizeGoalTimeFields(goal);
  goal.status = "Concluída";
  goal.studyStatus = "Concluído";
  goal.completedAt ||= new Date().toISOString();
  if (previousStatus !== "Concluída") appendGoalHistory(goal, `Concluída em ${new Date().toLocaleString("pt-BR")}.`);
  const item = getSyllabusById(goal.syllabusItemId);
  if (item && previousStatus !== "Concluída") {
    const previous = Number(item.studyMinutes) || 0;
    updateItemProgress(goal.syllabusItemId, { status: "Concluído", studyMinutes: previous + (Number(goal.actualMinutes) || Number(goal.minutes) || 0), lastStudyDate: goal.date });
  }
  saveData();
  showDailyGoalMessage("Meta concluída.", "success");
  autoSyncAfterSave("daily-goal");
}
function postponeGoal(goal) {
  const nextDate = prompt("Nova data da meta (AAAA-MM-DD)", goal.date);
  if (!nextDate || Number.isNaN(Date.parse(`${nextDate}T00:00:00`))) return;
  const oldDate = goal.date;
  goal.date = nextDate;
  goal.data = nextDate;
  goal.status = "Reagendada";
  appendGoalHistory(goal, `Reagendada de ${oldDate} para ${nextDate}.`);
  elements.goalDate.value = nextDate;
  saveData();
  showDailyGoalMessage(`Meta adiada para ${formatDateBR(nextDate)}.`, "success");
  autoSyncAfterSave("daily-goal");
}
function registerGoalTime(goal, kind = "study") {
  normalizeGoalTimeFields(goal);
  const field = kind === "questions" ? "questionActualMinutes" : "studyActualMinutes";
  const label = kind === "questions" ? "questões" : "estudo teórico";
  const minutes = Number(prompt(`Quantos minutos de ${label} foram feitos?`, 0));
  if (!Number.isFinite(minutes) || minutes < 0) return alert("Informe um número de minutos válido.");
  goal[field] = (Number(goal[field]) || 0) + minutes;
  goal.actualMinutes = (Number(goal.studyActualMinutes) || 0) + (Number(goal.questionActualMinutes) || 0);
  goal.studyStatus = goal.actualMinutes > 0 ? "Iniciado" : (goal.studyStatus || "Pendente");
  if (goal.actualMinutes > 0 && goal.status === "Pendente") goal.status = "Em andamento";
  appendGoalHistory(goal, `Tempo de ${label} registrado: +${minutes} min em ${new Date().toLocaleString("pt-BR")}. Total realizado: ${goal.actualMinutes} min.`);
  const item = getSyllabusById(goal.syllabusItemId);
  if (item && minutes > 0 && kind === "study") updateItemProgress(goal.syllabusItemId, { status: item.status === "Concluído" ? item.status : "Em andamento", studyMinutes: (Number(item.studyMinutes) || 0) + minutes, lastStudyDate: goal.date });
  saveData();
  render();
  showDailyGoalMessage("Tempo registrado. A meta não foi concluída automaticamente.", "success");
  autoSyncAfterSave("daily-goal");
}
function editGoal(goal) {
  elements.goalDate.value=goal.date; elements.goalDiscipline.value=goal.discipline; optionsForItems(elements.goalSyllabusItem, goal.discipline, goal.syllabusItemId); elements.goalSyllabusItem.value=goal.syllabusItemId; elements.goalType.value=goal.type; elements.goalMinutes.value=goal.minutes; elements.goalActualMinutes.value=goal.actualMinutes||0; elements.goalPriority.value=goal.priority; elements.goalStatus.value=goal.status; elements.goalNotes.value=goal.notes||""; showView("metas-do-dia");
}
function weekStart(dateString) { const d=parseDate(dateString); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10); }
function daysBetween(start, count) { return Array.from({length:count},(_,i)=>addDays(start,i)); }
function goalsBetween(start,end) { return state.dailyGoals.filter((g)=>g.date>=start && g.date<=end); }
function completionRate(goals) { return goals.length ? Math.round(goals.filter((g)=>g.status==="Concluída").length/goals.length*100) : 0; }
function previewGoals(kind, goals) {
  const dist = goals.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{});
  const days = [...new Set(goals.map((g)=>g.date))];
  const hours = goals.reduce((a,g)=>a+Number(g.minutes||0),0);
  return `${kind}: ${goals.length} metas; ${Object.keys(dist).length} disciplinas; ${days.length} dias usados; ${formatHours(hours)} planejadas; distribuição: ${Object.entries(dist).map(([d,n])=>`${d} (${n})`).join(", ") || "sem metas"}. Confirmar geração?`;
}
function saveGeneratedGoals(kind, made) {
  if (!made.length) return alert("Nenhuma meta nova gerada. Verifique assuntos agendáveis, duplicidades ou disponibilidade.");
  if (!confirm(previewGoals(kind, made))) return;
  state.dailyGoals.push(...made); render(); showView("calendario-metas");
}
function generateWeekGoals() { const c=planningConfig(); const start=weekStart(elements.calendarDate?.value||todayISO()); const made=[]; daysBetween(start,7).forEach((date)=>{ const weekDisciplines=new Set(made.map((g)=>g.discipline)); const remainingTopics=(Number(c.topicsPerWeek)||8)-made.length; if (remainingTopics<=0) return; const remainingNewDisciplines=Math.max(0,(Number(c.disciplinesPerWeek)||6)-weekDisciplines.size); made.push(...generateGoalsForDate(date,{topicLimit:Math.min(Number(c.topicsPerDay)||3,remainingTopics), disciplineLimit:(Number(c.disciplinesPerDay)||2), allowedDisciplines: remainingNewDisciplines>0 ? null : weekDisciplines})); }); const limited=limitGeneratedGoals(made,{topicLimit:Number(c.topicsPerWeek)||8, disciplineLimit:Number(c.disciplinesPerWeek)||6}); if (limited.length < (Number(c.topicsPerWeek)||8)) alert(generationShortageMessage(limited, Number(c.topicsPerWeek)||8, "a semana").trim()); saveGeneratedGoals("Pré-visualização semanal", limited); }
function generateMonthGoals() { const c=planningConfig(); const ref=parseDate(elements.calendarDate?.value||todayISO()); const start=`${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,"0")}-01`; const days=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate(); const made=[]; daysBetween(start,days).forEach((date)=>{ const monthDisciplines=new Set(made.map((g)=>g.discipline)); const remainingTopics=(Number(c.topicsPerMonth)||40)-made.length; if (remainingTopics<=0) return; const remainingNewDisciplines=Math.max(0,(Number(c.disciplinesPerMonth)||10)-monthDisciplines.size); made.push(...generateGoalsForDate(date,{maxGoals: availabilityForDate(date).type==="folga"?5:undefined, topicLimit:Math.min(Number(c.topicsPerDay)||3,remainingTopics), disciplineLimit:(Number(c.disciplinesPerDay)||2), allowedDisciplines: remainingNewDisciplines>0 ? null : monthDisciplines})); }); const limited=limitGeneratedGoals(made,{topicLimit:Number(c.topicsPerMonth)||40, disciplineLimit:Number(c.disciplinesPerMonth)||10}); if (limited.length < (Number(c.topicsPerMonth)||40)) alert(generationShortageMessage(limited, Number(c.topicsPerMonth)||40, "o mês").trim()); saveGeneratedGoals("Pré-visualização mensal", limited); }
function renderDisciplineWeights() { if (!elements.disciplineWeightsList) return; ensureDefaultDisciplineWeights(); const ds=getAllDisciplines(); elements.disciplineWeightsList.innerHTML = ds.length ? ds.map((d)=>`<label class="weight-row"><span>${escapeHTML(d)}</span><select data-discipline-weight="${escapeHTML(d)}">${disciplineWeightOptions(d)}</select></label>`).join("") : "Cadastre ou importe disciplinas para configurar pesos."; }
function renderGoalCalendar() { if (!elements.goalCalendarContent) return; renderDisciplineWeights(); const date=elements.calendarDate?.value||todayISO(), mode=elements.calendarViewMode?.value||"daily"; const start=mode==="weekly"?weekStart(date):mode==="monthly"?`${date.slice(0,7)}-01`:date; const end=mode==="daily"?date:mode==="weekly"?addDays(start,6):`${date.slice(0,7)}-${String(new Date(parseDate(date).getFullYear(),parseDate(date).getMonth()+1,0).getDate()).padStart(2,"0")}`; const goals=goalsBetween(start,end); const planned=goals.reduce((a,g)=>a+Number(g.minutes||0),0), done=goals.reduce((a,g)=>a+goalTotalActualMinutes(g),0); const dist=goals.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{}); elements.goalCalendarStats.innerHTML = `<article class="stat-card"><span>Horas planejadas</span><strong>${formatHours(planned)}</strong></article><article class="stat-card"><span>Horas realizadas</span><strong>${formatHours(done)}</strong></article><article class="stat-card"><span>Assuntos planejados</span><strong>${goals.length}</strong></article><article class="stat-card"><span>Assuntos concluídos</span><strong>${goals.filter(g=>g.status==="Concluída").length}</strong></article><article class="stat-card"><span>Cumprimento</span><strong>${completionRate(goals)}%</strong></article><article class="stat-card wide-stat"><span>Distribuição por disciplina</span><strong>${Object.entries(dist).map(([d,n])=>`${escapeHTML(d)} (${n})`).join(", ")||"-"}</strong></article>`;
  if (mode==="daily") { const av=availabilityForDate(date); elements.goalCalendarContent.innerHTML = `<div class="section-heading inline"><div><h3>${formatDateBR(date)} — ${escapeHTML(dayTypeLabel(av))}</h3><p class="item-meta">Horas disponíveis: ${av.hours}h</p></div><button type="button" data-open-day-plan="${date}">Abrir Plano do Dia</button></div>` + (goals.map(goalCalendarCard).join("") || "Nenhuma meta para a data."); }
  if (mode==="weekly") elements.goalCalendarContent.innerHTML = `<div class="calendar-grid week-grid">${daysBetween(start,7).map((d)=>`<article class="clickable-day" data-open-day-plan="${d}" tabindex="0" role="button" aria-label="Abrir Plano do Dia em ${formatDateBR(d)}"><h3>${formatDateBR(d)}</h3><small>${escapeHTML(dayTypeLabel(availabilityForDate(d)))} • ${availabilityForDate(d).hours}h</small>${state.dailyGoals.filter(g=>g.date===d).map(goalCalendarMini).join("")||"<p class='item-meta'>Sem metas</p>"}</article>`).join("")}</div>`;
  if (mode==="monthly") { const days=Number(end.slice(-2)); elements.goalCalendarContent.innerHTML = `<div class="calendar-grid month-grid">${daysBetween(start,days).map((d)=>{const gs=state.dailyGoals.filter(g=>g.date===d), av=availabilityForDate(d); return `<article class="clickable-day ${av.type==='indisponível'?'unavailable':''}" data-open-day-plan="${d}" tabindex="0" role="button" aria-label="Abrir Plano do Dia em ${formatDateBR(d)}"><strong>${d.slice(-2)}</strong><small>${escapeHTML(dayTypeLabel(av))}</small><span>${gs.length} meta(s)</span><span>${gs.filter(g=>g.status==='Concluída').length} concluída(s)</span></article>`}).join("")}</div>`; }
  const key=date.slice(0,7); const mg=state.monthlyGoals[key]||{}; if(elements.monthlyTopicGoal) elements.monthlyTopicGoal.value=mg.topics||""; if(elements.monthlyHourGoal) elements.monthlyHourGoal.value=mg.hours||""; const total=state.syllabusItems.filter(i=>i.status!=="Ignorado").length||1; const forecastDate=planningMetrics().forecastDate; elements.monthlyPlanSummary.innerHTML=`<article class="stat-card"><span>Avanço esperado</span><strong>${Math.round(goals.length/total*100)}%</strong></article><article class="stat-card"><span>Previsão de conclusão</span><strong>${forecastDate?formatDateBR(forecastDate):'-'}</strong></article>`; }
function goalCalendarMini(g){ return `<p class="goal-pill ${g.status==='Concluída'?'done':g.status==='Adiada'?'warn':''}">${escapeHTML(g.discipline)} — ${escapeHTML(g.subject)}</p>`; }
function goalCalendarCard(goal){ normalizeGoalTimeFields(goal); return `<article class="syllabus-card goal-status-${canonical(goal.status)}"><header><div><h3>${escapeHTML(goal.discipline)} — ${escapeHTML(goal.subject)}</h3><div class="item-meta">${escapeHTML(goal.type)} • planejado ${goal.minutes||0} min • estudo ${goal.studyActualMinutes||0} min • questões ${goal.questionActualMinutes||0} min • total ${goal.actualMinutes||0} min • status ${escapeHTML(goal.status)}</div></div></header><div class="card-actions"><button data-calendar-action="done" data-id="${goal.id}">Concluir meta</button><button data-calendar-action="postpone" data-id="${goal.id}">Adiar</button><button data-calendar-action="edit" data-id="${goal.id}">Editar</button><button data-calendar-action="study-time" data-id="${goal.id}">Registrar estudo</button><button data-calendar-action="question-time" data-id="${goal.id}">Tempo de questões</button><button data-calendar-timer="study" data-id="${goal.id}">Cronômetro estudo</button><button data-calendar-timer="questions" data-id="${goal.id}">Cronômetro questões</button><button data-register-goal="${goal.id}">Registrar questões</button></div></article>`; }

function renderCentralGoals() {
  if (!elements.centralGoalsCards && !elements.dashboardGoalsScaleSummary) return;
  const today = todayISO(), av = availabilityForDate(today), ws = weekStart(today), monthStart = `${today.slice(0,7)}-01`, monthDays = new Date(parseDate(today).getFullYear(), parseDate(today).getMonth()+1, 0).getDate();
  const dayGoals = state.dailyGoals.filter(g=>g.date===today), dayStats = goalProgressStats(dayGoals, av), week = periodSummary(ws, 7), month = periodSummary(monthStart, monthDays);
  const dayDisciplines = new Set(dayGoals.map(g=>g.discipline)).size;
  if (elements.centralGoalsCards) elements.centralGoalsCards.innerHTML = `
    <article class="goal-central-card"><h3>Hoje</h3><div class="card-meta-grid"><span>Data: ${formatDateBR(today)}</span><span>Tipo: ${escapeHTML(dayTypeLabel(av))}</span><span>Horas previstas: ${formatHours(dayStats.target || av.hours*60)}</span><span>Disciplinas previstas: ${dayDisciplines}</span><span>Assuntos previstos: ${dayGoals.length}</span><span>Pendentes: ${dayStats.pending}</span><span>Concluídas: ${dayStats.completed}</span></div><button data-central-open-day type="button">Abrir Plano do Dia</button></article>
    <article class="goal-central-card"><h3>Esta semana</h3><div class="card-meta-grid"><span>Semana: ${formatDateBR(ws)} a ${formatDateBR(addDays(ws,6))}</span><span>Horas previstas: ${formatHours(week.planned)}</span><span>Horas já cumpridas: ${formatHours(week.done)}</span><span>Assuntos previstos: ${week.subjects}</span><span>Assuntos concluídos: ${week.completed}</span><span>Disciplinas previstas: ${week.disciplines}</span><span>Percentual: ${week.percent}%</span></div><button data-central-week type="button">Gerar metas da semana</button></article>
    <article class="goal-central-card"><h3>Este mês</h3><div class="card-meta-grid"><span>Mês: ${today.slice(5,7)}/${today.slice(0,4)}</span><span>Horas previstas: ${formatHours(month.planned)}</span><span>Assuntos previstos: ${month.subjects}</span><span>Assuntos concluídos: ${month.completed}</span><span>Disciplinas previstas: ${month.disciplines}</span><span>Percentual: ${month.percent}%</span></div><button data-central-month type="button">Gerar metas do mês</button></article>`;
  if (elements.centralScaleSummary) elements.centralScaleSummary.innerHTML = `<article class="stat-card"><span>Tipo de escala</span><strong>${escapeHTML(planningConfig().scaleType)}</strong></article><article class="stat-card"><span>Ponto hoje</span><strong>${escapeHTML(dayTypeLabel(av))}</strong></article><article class="stat-card"><span>Próximo plantão</span><strong class="stat-value-date">${nextDateByType('plantão') ? formatDateBR(nextDateByType('plantão')) : '-'}</strong></article><article class="stat-card"><span>Próxima folga</span><strong class="stat-value-date">${nextDateByType('folga') ? formatDateBR(nextDateByType('folga')) : '-'}</strong></article>`;
  if (elements.centralNextDates) elements.centralNextDates.innerHTML = daysBetween(today, 10).map(d=>{ const a=availabilityForDate(d), g=state.dailyGoals.filter(x=>x.date===d); return `<tr><td>${formatDateBR(d)}</td><td>${parseDate(d).toLocaleDateString('pt-BR',{weekday:'long'})}</td><td>${escapeHTML(dayTypeLabel(a))}</td><td>${a.hours}h</td><td>${g.length || (a.type==='indisponível'?0:planningConfig().topicsPerDay)}</td></tr>`; }).join('');
  renderSmartReviewBlock(elements.centralSmartReview);
  if (elements.dashboardGoalsScaleSummary) elements.dashboardGoalsScaleSummary.innerHTML = `<article class="stat-card"><span>Hoje</span><strong>${escapeHTML(dayTypeLabel(av))}</strong></article><article class="stat-card"><span>Meta de hoje</span><strong class="stat-value-compact">${formatHours(dayStats.target || av.hours*60)}</strong></article><article class="stat-card"><span>Meta da semana</span><strong class="stat-value-compact">${formatHours(week.planned)}</strong></article><article class="stat-card"><span>Meta do mês</span><strong class="stat-value-compact">${formatHours(month.planned)}</strong></article><article class="stat-card"><span>Próximo plantão</span><strong class="stat-value-date">${nextDateByType('plantão') ? formatDateBR(nextDateByType('plantão')) : '-'}</strong></article><article class="stat-card"><span>Próxima folga</span><strong class="stat-value-date">${nextDateByType('folga') ? formatDateBR(nextDateByType('folga')) : '-'}</strong></article>`;
}

function factoryEntryForDailyGoal(goal = {}) {
  const match = exactFactoryGoalMatches(goal, ensureFactoryAgenda());
  return match.items[0] || null;
}
function dailyGoalResumoReady(goal = {}) {
  const factoryItem = factoryEntryForDailyGoal(goal);
  if (factoryItem) return factoryResumoAulaReady(factoryItem);
  return materialsForDailyGoal(goal).some((m) => m.source !== "factory" || m.factoryModuleKey === "resumoAula");
}
function dailyGoalFactoryStage(goal = {}) {
  const factoryItem = factoryEntryForDailyGoal(goal);
  return factoryItem ? factoryCurrentStage(factoryItem) : "Criar tema na Fábrica";
}
function dailyGoalProductionCard(goal, number = 1) {
  return `<article class="syllabus-card daily-goal-card"><header><div><span class="goal-number">Produção ${number}</span><h3>${escapeHTML(goal.discipline)}</h3><div class="goal-subject">${escapeHTML(goal.subject)}</div><div class="item-meta">Recorte: ${escapeHTML(factoryGoalSubtopic(goal) || goal.topic || "Meta do dia")}</div></div><span class="badge warn">${escapeHTML(dailyGoalFactoryStage(goal))}</span></header><div class="card-meta-grid"><span>Disciplina: ${escapeHTML(goal.discipline)}</span><span>Assunto: ${escapeHTML(goal.subject)}</span><span>Recorte: ${escapeHTML(factoryGoalSubtopic(goal) || "-")}</span><span>Etapa atual da Fábrica: ${escapeHTML(dailyGoalFactoryStage(goal))}</span></div><div class="card-actions"><a class="button-link" href="#fabrica-resumos" data-view-link="fabrica-resumos">Ir para a Fábrica</a></div></article>`;
}

function renderDailyGoals() {
  if (!elements.dailyGoalsList) return;
  renderSmartReviewBlock(elements.daySmartReview, elements.goalDate?.value || todayISO());
  const date = elements.goalDate?.value || todayISO();
  const availability = availabilityForDate(date);
  const dayGoals = state.dailyGoals.filter((g) => g.date === date).sort((a,b) => isGoalDone(a) - isGoalDone(b) || (a.status || "").localeCompare(b.status || "") || a.discipline.localeCompare(b.discipline));
  const otherDates = state.dailyGoals.some((g) => g.date !== date);
  const stats = goalProgressStats(dayGoals, availability);
  if (elements.selectedGoalDateLabel) elements.selectedGoalDateLabel.textContent = formatDateBR(date);
  if (elements.dailyGoalsSummary) {
    elements.dailyGoalsSummary.innerHTML = `
      <article class="stat-card"><span>Data selecionada</span><strong class="stat-value-date">${formatDateBR(date)}</strong></article>
      <article class="stat-card"><span>Tipo do dia</span><strong>${escapeHTML(dayTypeLabel(availability))}</strong></article>
      <article class="stat-card"><span>Meta de horas do dia</span><strong class="stat-value-compact">${stats.target ? formatHours(stats.target) : "-"}</strong></article>
      <article class="stat-card"><span>Tempo já realizado</span><strong class="stat-value-compact">${formatHours(stats.done)}</strong></article>
      <article class="stat-card"><span>Tempo faltante</span><strong class="stat-value-compact">${formatHours(stats.remaining)}</strong></article>
      <article class="stat-card"><span>Percentual cumprido</span><strong class="stat-value-compact">${stats.timePct}%</strong></article>
      <article class="stat-card"><span>Quantidade de disciplinas previstas</span><strong class="stat-value-compact">${new Set(dayGoals.map((g)=>g.discipline)).size}</strong></article>
      <article class="stat-card"><span>Quantidade de assuntos previstos</span><strong class="stat-value-compact">${dayGoals.length}</strong></article>
      <article class="stat-card"><span>Metas concluídas</span><strong class="stat-value-compact">${stats.completed}</strong></article>
      <article class="stat-card"><span>Metas pendentes</span><strong class="stat-value-compact">${stats.pending}</strong></article>
      <article class="stat-card wide-stat"><span>Metas: ${stats.completed} de ${dayGoals.length} concluídas — ${stats.goalsPct}%</span><div class="progress"><span style="width:${stats.goalsPct}%"></span></div></article>
      <article class="stat-card wide-stat"><span>Tempo: ${formatHours(stats.done)} de ${stats.target ? formatHours(stats.target) : "0h"} — ${stats.timePct}%</span><div class="progress"><span style="width:${stats.timePct}%"></span></div></article>`;
  }
  renderNextDailyGoal(dayGoals);
  const notices = [];
  if (availability.type === "indisponível") notices.push(`<p class="notice warning-notice">Dia marcado como indisponível. A geração automática só acontece mediante confirmação.</p>`);
  if (!dayGoals.length && otherDates) notices.push(`<p class="notice">Não há metas nesta data, mas existem metas cadastradas em outros dias. Use o Calendário de Metas ou altere a data.</p>`);
  if (!dayGoals.length) {
    elements.dailyGoalsList.innerHTML = `${notices.join("")}<p class="empty-message">Nenhuma meta cadastrada para esta data.</p><button class="big-action-button" type="button" data-generate-selected-date>Gerar metas para esta data</button>`;
    return;
  }
  const activeGoals = dayGoals.filter((g) => !isGoalDone(g));
  const studyToday = activeGoals.filter(dailyGoalResumoReady);
  const produceToday = activeGoals.filter((g) => !dailyGoalResumoReady(g));
  const doneGoals = dayGoals.filter(isGoalDone);
  elements.dailyGoalsList.innerHTML = notices.join("") + [
    `<section class="goal-status-section"><h3>📚 ESTUDAR HOJE</h3>${studyToday.length ? studyToday.map((goal, index)=>dailyGoalCard(goal, index + 1)).join("") : `<p class="empty-message">Nenhuma meta com RESUMO/AULA pronto.</p>`}</section>`,
    `<section class="goal-status-section"><h3>🏭 PRODUZIR MATERIAL HOJE</h3>${produceToday.length ? produceToday.map((goal, index)=>dailyGoalProductionCard(goal, index + 1)).join("") : `<p class="empty-message">Nenhum material pendente de produção.</p>`}</section>`,
    `<section class="goal-status-section"><h3>🔄 REVISAR HOJE</h3>${doneGoals.length ? doneGoals.map((goal, index)=>dailyGoalCard(goal, index + 1)).join("") : `<p class="empty-message">Nenhuma revisão ou meta concluída hoje.</p>`}</section>`
  ].join("");
}
function renderNextDailyGoal(dayGoals) {
  if (!elements.nextDailyGoal) return;
  dayGoals.forEach(normalizeGoalTimeFields);
  const next = dayGoals.find((g)=>!isGoalDone(g) && !["Não cumprida", "Ignorada", "Adiada", "Reagendada"].includes(g.status || ""));
  if (!next) { elements.nextDailyGoal.innerHTML = `<h3>Próxima meta</h3><p>Todas as metas do dia foram concluídas.</p>`; return; }
  elements.nextDailyGoal.innerHTML = `<h3>Próxima meta</h3><strong>${escapeHTML(next.discipline)}</strong><p>${escapeHTML(next.subject)}</p><div class="item-meta">Planejado: ${Number(next.minutes||0)} min • Estudo realizado: ${Number(next.studyActualMinutes||0)} min • Questões realizadas: ${Number(next.questionActualMinutes||0)} min • Total realizado: ${Number(next.actualMinutes||0)} min • Prioridade: ${escapeHTML(next.priority || next.prioridade || "-")}</div>${goalMaterialsHTML(next)}<div class="card-actions"><button type="button" data-goal-action="Concluída" data-id="${next.id}">Concluir meta</button><button type="button" data-goal-action="Estudo" data-id="${next.id}">Registrar estudo</button><button type="button" data-goal-action="QuestoesTempo" data-id="${next.id}">Tempo de questões</button><button type="button" data-goal-timer="study" data-id="${next.id}">Cronômetro estudo</button><button type="button" data-goal-timer="questions" data-id="${next.id}">Cronômetro questões</button><button type="button" data-register-goal="${next.id}">Registrar questões</button></div>`;
}
function dailyGoalCard(goal, number = 1) {
  normalizeGoalTimeFields(goal);
  return `<article class="syllabus-card daily-goal-card goal-status-${canonical(goal.status)}">
    <header><div><span class="goal-number">Meta ${number}</span><h3>${escapeHTML(goal.discipline)}</h3><div class="goal-subject">${escapeHTML(goal.subject)}</div><div class="item-meta">${escapeHTML(goal.type || goal.tipo || "Meta")} — ${Number(goal.minutes||0)} min</div></div><span class="badge ${goal.status === "Concluída" ? "success" : goal.priority === "Alta" ? "danger" : "warn"}">Status: ${escapeHTML(goal.status || "Pendente")}</span></header>
    <div class="card-meta-grid">
      <span>Disciplina: ${escapeHTML(goal.discipline)}</span><span>Assunto: ${escapeHTML(goal.subject)}</span><span>Tipo: ${escapeHTML(goal.type || goal.tipo || "-")}</span><span>Prioridade: ${escapeHTML(goal.priority || goal.prioridade || "-")}</span>
      <span>Planejado: ${Number(goal.minutes||0)} min</span><span>Estudo realizado: ${Number(goal.studyActualMinutes||0)} min</span><span>Questões realizadas: ${Number(goal.questionActualMinutes||0)} min</span><span>Total realizado: ${Number(goal.actualMinutes||0)} min</span><span>Status: ${escapeHTML(goal.status || "Pendente")}</span><span>Referência: ${escapeHTML(goal.referencia_edital || getSyllabusById(goal.syllabusItemId)?.reference || "-")}</span>
    </div>${goalMaterialsHTML(goal)}
    <div class="card-actions"><button type="button" data-goal-action="Concluída" data-id="${goal.id}">Concluir meta</button><button type="button" data-goal-action="Estudo" data-id="${goal.id}">Registrar estudo</button><button type="button" data-goal-action="QuestoesTempo" data-id="${goal.id}">Tempo de questões</button><button type="button" data-goal-timer="study" data-id="${goal.id}">Cronômetro estudo</button><button type="button" data-goal-timer="questions" data-id="${goal.id}">Cronômetro questões</button><button type="button" data-goal-action="Adiada" data-id="${goal.id}">Adiar</button><button type="button" data-goal-action="Não cumprida" data-id="${goal.id}">Não cumprir</button><button type="button" data-register-goal="${goal.id}">Registrar questões</button></div>
  </article>`;
}
function questionNumbers() { const total = Number(elements.questionTotal.value), correct = Number(elements.questionCorrect.value), wrong = Number(elements.questionWrong.value), blank = Number(elements.questionBlank.value); return { total, correct, wrong, blank, sum: correct + wrong + blank, accuracy: total ? correct / total * 100 : 0, errorPct: total ? wrong / total * 100 : 0, blankPct: total ? blank / total * 100 : 0, net: correct - wrong }; }
function analysisMessage(n) { if (!n.total) return ""; if (n.accuracy >= 80) return "Bom desempenho: percentual de acerto acima de 80%. Em Cebraspe, os erros reduzem diretamente o líquido."; if (n.accuracy < 70) return "Atenção: percentual inferior a 70%. Recomenda-se revisão do assunto. Em Cebraspe, os erros reduzem diretamente o líquido."; return "Assunto ainda sem domínio consolidado. Programe nova revisão."; }
function updateQuestionCalculated() { const n = questionNumbers(); elements.questionCalculated.innerHTML = `Total calculado: <strong>${n.sum || 0}</strong> • Acerto: <strong>${n.accuracy.toFixed(1)}%</strong> • Erro: <strong>${n.errorPct.toFixed(1)}%</strong> • Brancos: <strong>${n.blankPct.toFixed(1)}%</strong> • Líquido Cebraspe: <strong>${n.net || 0}</strong>`; elements.questionAnalysis.textContent = analysisMessage(n); }
function validateQuestionLog(n) { if (!elements.questionDiscipline.value) return "Disciplina vazia."; if (!elements.questionSyllabusItem.value) return "Assunto vazio."; if (!n.total) return "Total de questões vazio."; if ([n.total,n.correct,n.wrong,n.blank].some((v) => Number.isNaN(v) || v < 0)) return "Não use números negativos."; if (n.sum > n.total) return "Acertos + erros + brancos não pode ser maior que total de questões."; return ""; }
function domainFromAccuracy(total, accuracy) { if (!total) return "Sem diagnóstico"; if (accuracy >= 80) return "Forte"; if (accuracy >= 70) return "Médio"; return "Fraco"; }
function recomputeSyllabusQuestionStats(item) { const logs = state.questionLogs.filter((log) => log.syllabusItemId === item.id); const totals = logs.reduce((a,l) => ({ total:a.total+l.total, correct:a.correct+l.correct, wrong:a.wrong+l.wrong, blank:a.blank+l.blank, net:a.net+l.cebraspeNet }), { total:0, correct:0, wrong:0, blank:0, net:0 }); const accuracy = totals.total ? totals.correct / totals.total * 100 : 0; item.questionsTotal = totals.total; item.questionsCorrect = totals.correct; item.questionsWrong = totals.wrong; item.questionsBlank = totals.blank; item.accuracyRate = Math.round(accuracy); item.cebraspeNet = totals.net; item.lastTrainingDate = logs.sort((a,b) => b.date.localeCompare(a.date))[0]?.date || ""; item.domain = domainFromAccuracy(totals.total, accuracy); item.manualWeak = item.domain === "Fraco" ? item.manualWeak : false; }
function saveQuestionLog(event) { event.preventDefault(); const n = questionNumbers(); const error = validateQuestionLog(n); if (error) return alert(error); const item = getSyllabusById(elements.questionSyllabusItem.value); const id = elements.questionEditingId.value || createId(); const log = { id, date: elements.questionDate.value, discipline: elements.questionDiscipline.value, syllabusItemId: item.id, subject: item.subject, board: elements.questionBoard.value, minutes: Number(elements.questionMinutes?.value) || 0, total: n.total, correct: n.correct, wrong: n.wrong, blank: n.blank, accuracyRate: Number(n.accuracy.toFixed(1)), errorRate: Number(n.errorPct.toFixed(1)), blankRate: Number(n.blankPct.toFixed(1)), cebraspeNet: n.net, notes: elements.questionNotes.value.trim(), trainingType: elements.questionTrainingType.value, origin: elements.questionOrigin.value || "avulso", linkedGoalId: elements.questionLinkedGoalId.value || "" }; const idx = state.questionLogs.findIndex((q) => q.id === id); if (idx >= 0) state.questionLogs[idx] = log; else state.questionLogs.push(log); recomputeSyllabusQuestionStats(item); alert(analysisMessage(n)); if (log.linkedGoalId && confirm("Deseja marcar a meta vinculada como concluída?")) { const goal = state.dailyGoals.find((g) => g.id === log.linkedGoalId); if (goal) updateGoalDone(goal); } elements.questionForm.reset(); elements.questionEditingId.value = ""; elements.questionLinkedGoalId.value = ""; elements.questionOrigin.value = "avulso"; elements.questionDate.value = todayISO(); render(); }
function getQuestionTotals() { return state.questionLogs.reduce((a,l) => ({ total:a.total+l.total, correct:a.correct+l.correct, wrong:a.wrong+l.wrong, blank:a.blank+l.blank, net:a.net+l.cebraspeNet }), { total:0, correct:0, wrong:0, blank:0, net:0 }); }
function problemQuestionDiscipline() { const by = state.questionLogs.reduce((a,l)=>{ const k=l.discipline||"Sem disciplina"; a[k] ||= { total:0, correct:0 }; a[k].total += Number(l.total)||0; a[k].correct += Number(l.correct)||0; return a; }, {}); const worst = Object.entries(by).filter(([,v])=>v.total>0).sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total))[0]; return worst ? `${worst[0]} (${Math.round(worst[1].correct/worst[1].total*100)}%)` : "-"; }
function renderQuestionHistory() { const filtered = state.questionLogs.filter((log) => (!elements.questionFilterDiscipline.value || log.discipline === elements.questionFilterDiscipline.value) && (!elements.questionFilterSubject.value || log.syllabusItemId === elements.questionFilterSubject.value) && (!elements.questionFilterBoard.value || log.board === elements.questionFilterBoard.value)).sort((a,b) => b.date.localeCompare(a.date)); elements.questionHistoryBody.innerHTML = filtered.map((log) => `<tr><td>${formatDateBR(log.date)}</td><td>${escapeHTML(log.discipline)}</td><td>${escapeHTML(log.subject)}</td><td>${escapeHTML(log.board)}</td><td>${log.total}</td><td>${log.correct}</td><td>${log.wrong}</td><td>${log.blank}</td><td>${log.accuracyRate}%</td><td>${log.cebraspeNet}</td><td>${escapeHTML(log.origin)}</td><td>${escapeHTML(log.notes || "-")}</td><td><button type="button" data-edit-question="${log.id}">Editar</button><button class="danger" type="button" data-delete-question="${log.id}">Excluir</button></td></tr>`).join(""); }
function fillQuestionFromGoal(goalId) { const goal = state.dailyGoals.find((g) => g.id === goalId); if (!goal) return; elements.questionDate.value = goal.date; elements.questionDiscipline.value = goal.discipline; optionsForItems(elements.questionSyllabusItem, goal.discipline, goal.syllabusItemId); elements.questionSyllabusItem.value = goal.syllabusItemId; elements.questionOrigin.value = "meta do dia"; elements.questionLinkedGoalId.value = goal.id; showView("questoes"); }
function editQuestionLog(id) { const log = state.questionLogs.find((q) => q.id === id); if (!log) return; elements.questionEditingId.value = log.id; elements.questionDate.value = log.date; elements.questionDiscipline.value = log.discipline; optionsForItems(elements.questionSyllabusItem, log.discipline, log.syllabusItemId); elements.questionSyllabusItem.value = log.syllabusItemId; elements.questionBoard.value = log.board; elements.questionTrainingType.value = log.trainingType; elements.questionTotal.value = log.total; elements.questionCorrect.value = log.correct; elements.questionWrong.value = log.wrong; elements.questionBlank.value = log.blank; elements.questionNotes.value = log.notes; elements.questionOrigin.value = log.origin; elements.questionLinkedGoalId.value = log.linkedGoalId; updateQuestionCalculated(); showView("questoes"); }


elements.planningConfigForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const c = planningConfig();
  c.examDate = elements.planningExamDate.value; c.scaleType = elements.planningScaleType.value; c.cycleType = c.scaleType; c.scaleReferenceDate = elements.planningScaleReferenceDate?.value || c.scaleReferenceDate || todayISO(); c.scaleReferencePosition = Number(elements.planningScaleReferencePosition?.value) || 0; c.scaleNotes = elements.planningScaleNotes.value.trim();
  c.shiftHours = Number(elements.planningShiftHours.value) || 0; c.restHours = Number(elements.planningRestHours.value) || 0; c.normalHours = Number(elements.planningNormalHours.value) || 0;
  c.minWeeklyHours = Number(elements.planningMinWeeklyHours.value) || 0; c.idealWeeklyHours = Number(elements.planningIdealWeeklyHours.value) || 0; c.weeklyTopics = Number(elements.planningWeeklyTopics.value) || 0; c.disciplinesPerDay = Number(elements.planningDisciplinesPerDay.value) || 2; c.disciplinesPerWeek = Number(elements.planningDisciplinesPerWeek.value) || 6; c.disciplinesPerMonth = Number(elements.planningDisciplinesPerMonth.value) || 10; c.topicsPerDay = Number(elements.planningTopicsPerDay.value) || 3; c.topicsPerWeek = Number(elements.planningTopicsPerWeek.value) || c.weeklyTopics || 8; c.topicsPerMonth = Number(elements.planningTopicsPerMonth.value) || 40; c.safetyDays = Number(elements.planningSafetyDays.value) || 0;
  if (c.examDate) state.edital.examDate = c.examDate;
  render(); showView("planejamento");
});
elements.availabilityCalendar?.addEventListener("change", (event) => {
  const typeDate = event.target.dataset.availabilityType;
  const hoursDate = event.target.dataset.availabilityHours;
  const date = typeDate || hoursDate;
  if (!date) return;
  const current = availabilityForDate(date);
  if (typeDate) state.planning.availability[date] = { type: event.target.value, hours: availabilityDefaults(event.target.value) };
  if (hoursDate) state.planning.availability[date] = { ...current, hours: Number(event.target.value) || 0 };
  render();
});

if (elements.generateDailyGoals) elements.generateDailyGoals.addEventListener("click", generateDailyGoals);
elements.refreshDailyGoalsFromPlanning?.addEventListener("click", refreshDailyGoalsFromPlanning);
elements.planningScaleType?.addEventListener("change", () => { if (elements.scale3x6Fields) elements.scale3x6Fields.hidden = elements.planningScaleType.value !== "3 dias de trabalho / 6 dias de folga"; });
elements.centralOpenDayPlan?.addEventListener("click", () => { elements.goalDate.value=todayISO(); renderDailyGoals(); showView("metas-do-dia"); });
elements.centralGoalsCards?.addEventListener("click", (event) => { if (event.target.closest("[data-central-open-day]")) { elements.goalDate.value=todayISO(); renderDailyGoals(); showView("metas-do-dia"); } if (event.target.closest("[data-central-week]")) { if(elements.calendarDate) elements.calendarDate.value=todayISO(); generateWeekGoals(); } if (event.target.closest("[data-central-month]")) { if(elements.calendarDate) elements.calendarDate.value=todayISO(); generateMonthGoals(); } });
elements.goalDate?.addEventListener("change", () => { renderDailyGoals(); renderGoalDashboardCards(); });
elements.generateWeekGoals?.addEventListener("click", generateWeekGoals);
elements.generateMonthGoals?.addEventListener("click", generateMonthGoals);
[elements.calendarDate, elements.calendarViewMode].filter(Boolean).forEach((el)=>el.addEventListener("change", renderGoalCalendar));
[elements.smartReviewDate].filter(Boolean).forEach((el)=>["change","input"].forEach((eventName)=>el.addEventListener(eventName, renderSmartReviewStandalone)));
elements.disciplineWeightsList?.addEventListener("change", (event)=>{ const d=event.target.dataset.disciplineWeight; if(d){ state.disciplineWeights[d]=normalizeDisciplineWeight(event.target.value, d); render(); }});
[elements.monthlyTopicGoal, elements.monthlyHourGoal].filter(Boolean).forEach((el)=>el.addEventListener("change",()=>{ const key=(elements.calendarDate?.value||todayISO()).slice(0,7); state.monthlyGoals[key]={ topics:Number(elements.monthlyTopicGoal.value)||0, hours:Number(elements.monthlyHourGoal.value)||0 }; render(); }));
elements.goalCalendarContent?.addEventListener("click", (event)=>{ const openPlan=event.target.closest("[data-open-day-plan]"); if(openPlan){ elements.goalDate.value=openPlan.dataset.openDayPlan; renderDailyGoals(); return showView("metas-do-dia"); } const timerButton=event.target.closest("button[data-calendar-timer]"); if(timerButton){ const goal=state.dailyGoals.find(g=>g.id===timerButton.dataset.id); if(goal) startFloatingTimer(goal, timerButton.dataset.calendarTimer); return; } const b=event.target.closest("button[data-calendar-action],button[data-register-goal]"); if(!b) return; if(b.dataset.registerGoal) return fillQuestionFromGoal(b.dataset.registerGoal); const goal=state.dailyGoals.find(g=>g.id===b.dataset.id); if(!goal) return; if(b.dataset.calendarAction==="done") updateGoalDone(goal); if(b.dataset.calendarAction==="postpone") postponeGoal(goal); if(b.dataset.calendarAction==="study-time") registerGoalTime(goal, "study"); if(b.dataset.calendarAction==="question-time") registerGoalTime(goal, "questions"); if(b.dataset.calendarAction==="edit") editGoal(goal); render(); });
elements.goalCalendarContent?.addEventListener("keydown", (event)=>{ if (!["Enter", " "].includes(event.key)) return; const openPlan=event.target.closest("[data-open-day-plan]"); if (!openPlan) return; event.preventDefault(); elements.goalDate.value=openPlan.dataset.openDayPlan; renderDailyGoals(); showView("metas-do-dia"); });
elements.goalDiscipline.addEventListener("change", () => optionsForItems(elements.goalSyllabusItem, elements.goalDiscipline.value));
elements.questionDiscipline.addEventListener("change", () => optionsForItems(elements.questionSyllabusItem, elements.questionDiscipline.value));
elements.goalSyllabusItem.addEventListener("change", () => { const item = getSyllabusById(elements.goalSyllabusItem.value); if (item) { elements.goalDiscipline.value = item.discipline; elements.goalPriority.value = item.priority; elements.goalType.value = goalTypeForItem(item); } });

function handleDailyGoalActionClick(event) {
  const button = event.target.closest("button[data-register-goal]");
  if (button) return fillQuestionFromGoal(button.dataset.registerGoal);
  if (event.target.closest("button[data-generate-selected-date]")) return generateDailyGoals();
  const timerButton = event.target.closest("button[data-goal-timer]");
  if (timerButton) {
    const goal = state.dailyGoals.find((g) => g.id === timerButton.dataset.id);
    if (goal) startFloatingTimer(goal, timerButton.dataset.goalTimer);
    return;
  }
  const action = event.target.closest("button[data-goal-action]");
  if (action) {
    const goal = state.dailyGoals.find((g) => g.id === action.dataset.id);
    if (goal) {
      if (action.dataset.goalAction === "Adiada") postponeGoal(goal);
      else if (action.dataset.goalAction === "Estudo") registerGoalTime(goal, "study");
      else if (action.dataset.goalAction === "QuestoesTempo") registerGoalTime(goal, "questions");
      else if (action.dataset.goalAction === "Concluída") updateGoalDone(goal);
      else { goal.status = action.dataset.goalAction; appendGoalHistory(goal, `Status alterado para ${goal.status}.`); showDailyGoalMessage(`Status alterado para ${goal.status}.`, "success"); saveData(); autoSyncAfterSave("daily-goal"); }
      render();
    }
  }
}
elements.goalForm.addEventListener("submit", (event) => { event.preventDefault(); const item = getSyllabusById(elements.goalSyllabusItem.value); if (!item) return alert("Selecione um assunto do edital verticalizado."); const selectedDate = elements.goalDate.value || todayISO(); state.dailyGoals.push({ id: createId(), date: selectedDate, data: selectedDate, discipline: elements.goalDiscipline.value, disciplina: elements.goalDiscipline.value, syllabusItemId: item.id, subject: item.subject, assunto: item.subject, referencia_edital: item.reference || "", type: elements.goalType.value, tipo: elements.goalType.value.toLowerCase(), minutes: Number(elements.goalMinutes.value), priority: elements.goalPriority.value, prioridade: elements.goalPriority.value, status: elements.goalStatus.value, studyActualMinutes: Number(elements.goalActualMinutes?.value) || 0, questionActualMinutes: 0, actualMinutes: Number(elements.goalActualMinutes?.value) || 0, studyStatus: elements.goalStudyStatus?.value || "Iniciado", notes: elements.goalNotes.value.trim() }); elements.goalForm.reset(); elements.goalDate.value = selectedDate; render(); autoSyncAfterSave("daily-goal"); });
elements.dailyGoalsList.addEventListener("click", handleDailyGoalActionClick);
elements.nextDailyGoal?.addEventListener("click", handleDailyGoalActionClick);
elements.floatingTimer?.addEventListener("click", (event) => {
  const action = event.target.closest("button[data-timer-action]")?.dataset.timerAction;
  if (!action) return;
  if (action === "pause") pauseOrResumeFloatingTimer();
  if (action === "save") saveFloatingTimerTime();
  if (action === "reset") resetFloatingTimer();
  if (action === "close") closeFloatingTimer();
  if (action === "continue") { floatingTimer.completionDismissed = true; renderFloatingTimer(); }
  if (action === "test-alerts") testTimerAlerts();
  if (action === "silence-alert") silenceTimerAlert();
});
document.addEventListener("change", async (event) => {
  const input = event.target.closest("input[data-timer-pref], select[data-timer-pref]");
  if (!input) return;
  state.settings ||= {}; state.settings.timerPreferences = normalizeTimerPreferences(state.settings.timerPreferences);
  const key = input.dataset.timerPref;
  if (key === "sound" && input.checked) prepareTimerAudioContext();
  if (key === "browserNotifications" && input.checked) await enableTimerNotifications(input);
  else state.settings.timerPreferences[key] = input.type === "checkbox" ? input.checked : input.value;
  saveTimerPreferences();
});
elements.addManualTime?.addEventListener("click", addManualTime);
elements.undoTimeAction?.addEventListener("click", undoTimeAction);
elements.timeHistoryBody?.addEventListener("click", (event) => { const edit = event.target.closest("button[data-time-edit]"); if (edit) return editStudyTime(edit.dataset.timeEdit); const del = event.target.closest("button[data-time-delete]"); if (del) return deleteStudyTime(del.dataset.timeDelete); });
elements.timerMode?.addEventListener("change", () => { if (floatingTimer.goalId && currentTimerSeconds() > 0) { const choice = prompt("Há uma sessão em andamento. Deseja descartar ou salvar antes? Digite salvar ou descartar.", "salvar"); if (choice === "salvar") saveFloatingTimerTime(); else if (choice === "descartar") closeFloatingTimer(); else { elements.timerMode.value = floatingTimer.mode || "countdown"; return; } } state.settings.timerMode = elements.timerMode.value; saveData(); autoSyncAfterSave("timer-settings"); });
document.addEventListener("click", (event) => { const btn = event.target.closest("button[data-smart-review-action]"); if (!btn) return; saveSmartReviewAction(btn.dataset.id, btn.dataset.smartReviewAction === "done" ? "revisado" : "adiado"); });
document.addEventListener("change", (event) => { const input = event.target.closest("input[data-smart-review-time]"); if (!input) return; upsertSmartReviewTime(input.dataset.id, input.dataset.smartReviewTime, input.value); });
elements.viewDayPlan?.addEventListener("click", () => { elements.goalDate.value = todayISO(); renderDailyGoals(); showView("metas-do-dia"); });
elements.dailyGoalsList.addEventListener("change", (event) => { const id = event.target.dataset.goalStatus; if (!id) return; const goal = state.dailyGoals.find((g) => g.id === id); if (goal) { goal.status = event.target.value; render(); } });
[elements.questionTotal, elements.questionCorrect, elements.questionWrong, elements.questionBlank].forEach((input) => input.addEventListener("input", updateQuestionCalculated));
elements.questionForm.addEventListener("submit", saveQuestionLog);
[elements.questionFilterDiscipline, elements.questionFilterSubject, elements.questionFilterBoard].forEach((filter) => filter.addEventListener("change", () => { renderQuestionSelectors(); renderQuestionHistory(); }));
if (elements.newMockExam) elements.newMockExam.addEventListener("click", resetMockForm);
[elements.mockTotalQuestions, elements.mockCorrect, elements.mockWrong, elements.mockBlank, elements.mockGoal].filter(Boolean).forEach((input) => input.addEventListener("input", renderMockCalculated));
elements.addMockDiscipline?.addEventListener("click", addMockDiscipline);
elements.clearMockDisciplines?.addEventListener("click", () => { mockDisciplineDraft = []; renderMockDraft(); });
elements.mockDisciplineDraft?.addEventListener("click", (event) => { const button = event.target.closest("button[data-remove-mock-discipline]"); if (button) { mockDisciplineDraft.splice(Number(button.dataset.removeMockDiscipline), 1); renderMockDraft(); } });
elements.mockExamForm?.addEventListener("submit", saveMock);
elements.mockHistory?.addEventListener("click", (event) => { const view = event.target.closest("button[data-view-mock]"); const edit = event.target.closest("button[data-edit-mock]"); const duplicate = event.target.closest("button[data-duplicate-mock]"); const del = event.target.closest("button[data-delete-mock]"); if (view) { const m = state.simulados.find((x)=>x.id===view.dataset.viewMock); if (m) { state.simulados = state.simulados.filter((x)=>x.id!==m.id).concat(m); render(); } } if (edit) editMock(edit.dataset.editMock); if (duplicate) { const m = state.simulados.find((x)=>x.id===duplicate.dataset.duplicateMock); if (m) { state.simulados.push(prepareMock({ ...cloneData(m), id:createId(), name:`${m.name} (cópia)` })); render(); } } if (del && confirm("Excluir este simulado?")) { state.simulados = state.simulados.filter((x)=>x.id!==del.dataset.deleteMock); render(); } });

elements.questionHistoryBody.addEventListener("click", (event) => { const edit = event.target.closest("button[data-edit-question]"); const del = event.target.closest("button[data-delete-question]"); if (edit) editQuestionLog(edit.dataset.editQuestion); if (del && confirm("Excluir este lançamento de questões?")) { const log = state.questionLogs.find((q) => q.id === del.dataset.deleteQuestion); state.questionLogs = state.questionLogs.filter((q) => q.id !== del.dataset.deleteQuestion); if (log) { const item = getSyllabusById(log.syllabusItemId); if (item) recomputeSyllabusQuestionStats(item); } render(); } });



elements.qbFile?.addEventListener("change", async (event) => { const file=event.target.files?.[0]; if(!file) return; try { const incoming=questionBankFromPayload(JSON.parse(await file.text())); if(!incoming.length) throw new Error("Nenhuma questão válida encontrada no JSON."); const map=new Map((state.questionBank||[]).map(q=>[q.id,q])); incoming.forEach(q=>map.set(q.id,q)); state.questionBank=[...map.values()]; elements.qbMessage.textContent=`${incoming.length} questão(ões) importada(s). Banco atual: ${state.questionBank.length}.`; saveData(); renderQuestionBank(); } catch(error) { elements.qbMessage.textContent=`Erro ao importar: ${error.message}`; } finally { event.target.value=""; } });
elements.qbStartTraining?.addEventListener("click", () => qbStart());
elements.qbNewTraining?.addEventListener("click", () => { elements.qbResultPanel.hidden = true; qbStart(); });
elements.qbRedoBlanks?.addEventListener("click", () => { const last=(state.questionBankSessions||[])[0]; const ids=new Set((last?.items||[]).filter(i=>!i.marcado||i.marcado==="B").map(i=>i.id)); qbStart((state.questionBank||[]).filter(q=>ids.has(q.id))); });
elements.qbPreviewFiltered?.addEventListener("click", qbPreview);
elements.qbSyllabusPackages?.addEventListener("click", (event) => { const button = event.target.closest("button[data-qb-package]"); if (!button) return; const pkg = qbPackageByDiscipline(button.dataset.qbPackage); if (!pkg) return alert("Pacote não encontrado."); qbStart(qbQuestionsForPackageMode(pkg, button.dataset.qbPackageMode)); });
elements.qbQuestionCard?.addEventListener("click", (event) => { if(!questionBankTraining) return; const statusBtn=event.target.closest("[data-qb-review-status][data-qb-error-id]"); if(statusBtn) return qbSetNotebookStatus(statusBtn.dataset.qbErrorId, statusBtn.dataset.qbReviewStatus); const answer=event.target.closest("[data-qb-answer]")?.dataset.qbAnswer; if(answer){ const q=questionBankTraining.items[questionBankTraining.index]; questionBankTraining.answers[q.id]=answer; const motivo=qbErrorReason({ ...q, marcado: answer }); if (motivo && questionBankTraining.cadernoRegistrado[q.id] !== `${answer}:${motivo}`) { registrarNoCadernoErros(q, answer, motivo); questionBankTraining.cadernoRegistrado[q.id] = `${answer}:${motivo}`; } if(questionBankTraining.mode!=="errorNotebook" && questionBankTraining.index < questionBankTraining.items.length-1) questionBankTraining.index++; return qbRenderQuestion(); } const nav=event.target.closest("[data-qb-nav]")?.dataset.qbNav; if(nav==="prev"&&questionBankTraining.index>0) questionBankTraining.index--; if(nav==="next"&&questionBankTraining.index<questionBankTraining.items.length-1) questionBankTraining.index++; if(nav) qbRenderQuestion(); if(event.target.closest("[data-qb-finish]")) qbFinish(); });
function qbRefreshAfterFilterChange() { qbRenderCascadingFilters(); qbRenderQuestionBankStats(); qbPreviewVisible = false; if (elements.qbPreviewSection) elements.qbPreviewSection.hidden = true; if (elements.qbFilteredPreview) elements.qbFilteredPreview.innerHTML = "Clique em “Pré-visualizar” para listar as questões encontradas."; }
[elements.qbTrainingScope,elements.qbReviewType,elements.qbFilterDiscipline,elements.qbFilterSubject,elements.qbFilterTheme,elements.qbFilterBoard,elements.qbFilterYear].filter(Boolean).forEach((el)=>el.addEventListener("change", qbRefreshAfterFilterChange));
let qbFilterSearchTimer;
elements.qbFilterSearch?.addEventListener("input", () => { clearTimeout(qbFilterSearchTimer); qbFilterSearchTimer = setTimeout(qbRefreshAfterFilterChange, 180); });
document.getElementById("qbManageBank")?.addEventListener("toggle", (event)=>{ event.currentTarget.dataset.touched = "true"; });
elements.qbExportBank?.addEventListener("click", () => qbDownload("metas-estudo-banco-questoes.json", { schema:"metas-estudo-question-bank-v1", questionBank: state.questionBank || [] }));
elements.qbExportResults?.addEventListener("click", () => qbDownload("metas-estudo-resultados-banco-questoes.json", { schema:"metas-estudo-question-bank-sessions-v1", questionBankSessions: state.questionBankSessions || [] }));
elements.qbClearBank?.addEventListener("click", () => { if(!confirm("Apagar banco de questões e treinos locais?")) return; state.questionBank=[]; state.questionBankSessions=[]; saveData(); renderQuestionBank(); qbPreviewVisible=false; if (elements.qbPreviewSection) elements.qbPreviewSection.hidden = true; elements.qbFilteredPreview.innerHTML="Clique em “Pré-visualizar” para listar as questões encontradas."; elements.qbTrainingPanel.hidden=true; elements.qbResultPanel.hidden=true; elements.qbMessage.textContent="Banco local limpo."; });

if (elements.materialForm) elements.materialForm.addEventListener("submit", saveMaterial);
elements.materialDiscipline?.addEventListener("input", renderMaterialSelectors);
elements.studySubject?.addEventListener("change", updateStudyMaterialOptions);
elements.studyTopic?.addEventListener("input", updateStudyMaterialOptions);
elements.factoryForm?.addEventListener("submit", saveFactoryItem);
document.addEventListener("submit", saveFactoryModules);
document.addEventListener("submit", saveFactoryPromptLibrary);
elements.editFactoryPromptLibrary?.addEventListener("click", () => { if (!elements.factoryPromptLibraryPanel) return; elements.factoryPromptLibraryPanel.hidden = !elements.factoryPromptLibraryPanel.hidden; if (!elements.factoryPromptLibraryPanel.hidden) renderFactoryPromptLibrary(); });
document.addEventListener("click", (event) => { const factoryFilter = event.target.closest("[data-factory-filter]"); if (factoryFilter) { factoryCurrentFilter = factoryFilter.dataset.factoryFilter || "hoje"; renderFactory(); return; } const edit = event.target.closest("[data-factory-edit]"); const del = event.target.closest("[data-factory-delete]"); const modules = event.target.closest("[data-factory-modules]"); const cancelModules = event.target.closest("[data-factory-modules-cancel]"); const prompt = event.target.closest("[data-factory-prompt]"); const copyPrompt = event.target.closest("[data-factory-prompt-copy]"); const copyRouter = event.target.closest("[data-factory-router-copy]"); const closePrompt = event.target.closest("[data-factory-prompt-close]"); const closeLibrary = event.target.closest("[data-factory-library-close]"); const restoreLibrary = event.target.closest("[data-factory-library-restore]"); const reopen = event.target.closest("[data-factory-reopen]"); const toggleDetail = event.target.closest("[data-factory-toggle-detail]"); const triagem = event.target.closest("[data-factory-triagem]"); const nextTheme = event.target.closest("[data-factory-next]"); if (toggleDetail) toggleFactoryDetail(toggleDetail.dataset.factoryToggleDetail); if (triagem) { const [id, status] = triagem.dataset.factoryTriagem.split("|"); setFactoryTriagemStatus(id, status); } if (nextTheme) factoryGoToNext(nextTheme.dataset.factoryNext); if (reopen) reopenFactoryTheme(reopen.dataset.factoryReopen); if (edit) editFactoryItem(edit.dataset.factoryEdit); if (del) deleteFactoryItem(del.dataset.factoryDelete); if (modules) editFactoryModules(modules.dataset.factoryModules); if (cancelModules) renderFactory(); if (prompt) { const [id, type] = prompt.dataset.factoryPrompt.split("|"); showFactoryPrompt(id, type); } if (copyPrompt) copyFactoryPrompt(copyPrompt.dataset.factoryPromptCopy); if (copyRouter) copyFactoryPrompt(copyRouter.dataset.factoryRouterCopy, true); if (closePrompt) closeFactoryPrompt(closePrompt.dataset.factoryPromptClose); if (closeLibrary && elements.factoryPromptLibraryPanel) elements.factoryPromptLibraryPanel.hidden = true; if (restoreLibrary && confirm("Isso substituirá o prompt salvo deste módulo. Deseja continuar?")) { const field = elements.factoryPromptLibraryPanel?.querySelector(`[data-factory-library-field="${CSS.escape(restoreLibrary.dataset.factoryLibraryRestore)}"]`); if (field) field.value = defaultFactoryPromptLibrary[restoreLibrary.dataset.factoryLibraryRestore] || ""; } });

[elements.materialFilterDiscipline, elements.materialFilterSubject, elements.materialFilterType, elements.materialFilterOrigin, elements.materialFilterText].filter(Boolean).forEach((filter) => filter.addEventListener("input", renderMaterials));
[elements.materialFilterDiscipline, elements.materialFilterSubject, elements.materialFilterType, elements.materialFilterOrigin].filter(Boolean).forEach((filter) => filter.addEventListener("change", renderMaterials));
document.addEventListener("click", (event) => { const openUrl = event.target.closest("button[data-open-url]"); if (openUrl && isValidHttpUrl(openUrl.dataset.openUrl)) window.open(openUrl.dataset.openUrl, "_blank", "noopener"); const open = event.target.closest("button[data-open-material]"); const create = event.target.closest("button[data-create-goal-material]"); const edit = event.target.closest("button[data-edit-material]"); const del = event.target.closest("button[data-delete-material]"); if (open) openMaterial(open.dataset.openMaterial); if (create) startMaterialForGoal(create.dataset.discipline, create.dataset.subject); if (edit) editMaterial(edit.dataset.editMaterial); if (del && confirm("Excluir este material?")) { state.materials = state.materials.filter((m)=>m.id!==del.dataset.deleteMaterial); render(); } });

mergeCompatibleLocalStorageData();
renderMotivationalPhrase();
render();
showStorageWarningIfNeeded();

const viewLinks = [...document.querySelectorAll("[data-view-link]")];
const viewPanels = [...document.querySelectorAll(".app-view")];
const viewAliases = { verticalizado: "edital-verticalizado" };
const viewIds = new Set(viewPanels.map((panel) => panel.dataset.view));
const menuToggle = document.getElementById("menuToggle");
const mainMenu = document.getElementById("mainMenu");
const menuClose = document.getElementById("menuClose");
const menuOverlay = document.getElementById("menuOverlay");

function normalizeViewId(viewId) {
  const normalized = String(viewId || "").replace(/^#/, "") || "dashboard";
  return viewAliases[normalized] || normalized;
}

function targetFromLink(link) {
  if (!link) return "dashboard";
  const rawTarget = link.dataset?.viewLink || link.getAttribute?.("href") || "dashboard";
  return normalizeViewId(rawTarget);
}

function resolveViewTarget(viewId) {
  const rawTarget = viewId?.dataset || viewId?.getAttribute ? targetFromLink(viewId) : normalizeViewId(viewId);
  if (!ENABLE_FACTORY && rawTarget === "fabrica-resumos") return "dashboard";
  return viewIds.has(rawTarget) ? rawTarget : "dashboard";
}

function hashToView() {
  return resolveViewTarget(window.location.hash);
}

function renderGoalDashboardCards() { const today=todayISO(), ws=weekStart(today), we=addDays(ws,6); const tg=state.dailyGoals.filter(g=>g.date===today), wg=goalsBetween(ws,we), mg=state.dailyGoals.filter(g=>g.date.slice(0,7)===today.slice(0,7)); const av=availabilityForDate(today); const stats=goalProgressStats(tg,av); const nextToday=tg.find(g=>!isGoalDone(g) && !["Não cumprida","Ignorada","Adiada","Reagendada"].includes(g.status||"")); const next=state.dailyGoals.filter(g=>g.status!=="Concluída" && g.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]; const delayed=Object.entries(state.syllabusItems.filter(i=>!completedStatus(i)&&i.status!=="Ignorado").reduce((a,i)=>(a[i.discipline]=(a[i.discipline]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0]; const top=Object.entries(wg.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0]; if(elements.dashboardTodayGoal) elements.dashboardTodayGoal.textContent=stats.target?formatHours(stats.target):"0h"; if(elements.dashboardTodayGoalDetail) elements.dashboardTodayGoalDetail.textContent=`${tg.length} meta(s) para hoje`; if(elements.dashboardDailyGoalRate) elements.dashboardDailyGoalRate.textContent=stats.goalsPct+"%"; if(elements.dashboardTodayRemaining) elements.dashboardTodayRemaining.textContent=formatHours(stats.remaining); if(elements.dashboardNextTodayGoal) elements.dashboardNextTodayGoal.textContent=nextToday?`${nextToday.discipline}: ${nextToday.subject}`:"Todas concluídas ou sem metas"; if(elements.todayGoalsTotal) elements.todayGoalsTotal.textContent=tg.length; if(elements.todayPendingGoals) elements.todayPendingGoals.textContent=stats.pending; if(elements.todayDoneGoals) elements.todayDoneGoals.textContent=stats.completed; if(elements.weekGoalsTotal) elements.weekGoalsTotal.textContent=wg.length; if(elements.weekGoalRate) elements.weekGoalRate.textContent=completionRate(wg)+"%"; if(elements.monthGoalRate) elements.monthGoalRate.textContent=completionRate(mg)+"%"; if(elements.nextGoalLabel) elements.nextGoalLabel.textContent=next?`${next.date} — ${next.discipline}: ${next.subject}`:"-"; if(elements.weekTopDiscipline) elements.weekTopDiscipline.textContent=top?`${top[0]} (${top[1]})`:"-"; if(elements.mostDelayedDiscipline) elements.mostDelayedDiscipline.textContent=delayed?`${delayed[0]} (${delayed[1]})`:"-"; }
function safeRenderView(viewId, renderer) {
  try {
    renderer?.();
  } catch (error) {
    console.error(`[Metas Estudo] Erro ao renderizar ${viewId}.`, error);
    if (viewId === "fabrica-resumos") showFactoryErrorMessage();
  }
}
function showFactoryErrorMessage() {
  if (elements.factorySummary) elements.factorySummary.innerHTML = "";
  if (elements.factoryList) elements.factoryList.textContent = "Erro ao carregar Fábrica de Resumos";
}
function showFactoryDisabledMessage() {
  if (elements.factorySummary) elements.factorySummary.innerHTML = "";
  if (elements.factoryList) elements.factoryList.textContent = "Fábrica de Resumos temporariamente desativada para restaurar o site.";
}
function renderView(viewId) {
  const renderers = {
    dashboard: () => { renderDashboard(); renderSubjects(); },
    edital: renderEdital,
    "edital-verticalizado": renderSyllabus,
    "importar-edital": renderImportPreview,
    materiais: renderMaterials,
    "fabrica-resumos": renderFactory,
    "assuntos-agendaveis": renderSchedulable,
    "central-metas": renderCentralGoals,
    "metas-do-dia": () => { renderGoalSelectors(); renderDailyGoals(); },
    "calendario-metas": renderGoalCalendar,
    questoes: () => { renderQuestionSelectors(); updateQuestionCalculated(); },
    "historico-questoes": () => { renderQuestionSelectors(); renderQuestionHistory(); },
    simulados: renderSimulados,
    "banco-questoes": renderQuestionBank,
    "caderno-erros": qbRenderErrorNotebook,
    "revisao-inteligente": renderSmartReviewStandalone,
    revisoes: () => { renderReviews(); renderSmartReviewsDashboard(); renderAlerts(); },
    historico: renderHistory,
    backup: () => { renderBackupSummary(); renderSyncStatus(); },
    planejamento: renderPlanning,
    progresso: renderProgressPanel,
    "como-usar": () => {}
  };
  safeRenderView(viewId, renderers[viewId]);
}

function setMobileMenuOpen(isOpen) {
  if (!mainMenu) return;
  mainMenu.classList.toggle("open", isOpen);
  document.body.classList.toggle("mobile-menu-open", isOpen);
  menuOverlay?.classList.toggle("open", isOpen);
  if (menuOverlay) menuOverlay.hidden = !isOpen;
  menuToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function showView(viewId = hashToView(), options = {}) {
  const target = resolveViewTarget(viewId);

  viewPanels.forEach((panel) => {
    panel.classList.remove("active");
    panel.hidden = true;
  });

  const activePanel = document.getElementById(`view-${target}`);
  if (activePanel?.classList.contains("app-view")) {
    activePanel.classList.add("active");
    activePanel.hidden = false;
  }

  viewLinks.forEach((link) => {
    const active = targetFromLink(link) === target;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  if (!options.skipHash && window.location.hash !== `#${target}`) {
    history.pushState(null, "", `#${target}`);
  }

  if (!options.keepMenuOpen) setMobileMenuOpen(false);
  else menuToggle?.setAttribute("aria-expanded", mainMenu?.classList.contains("open") ? "true" : "false");
  renderView(target);
  if (!options.skipScroll) document.querySelector(".screen-stage")?.scrollIntoView({ block: "start" });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-view-link]");
  if (!link) return;
  event.preventDefault();
  const target = resolveViewTarget(link);
  console.log("[ROUTE]", { clicked: link.textContent.trim(), target });
  showView(target);
  const scrollTarget = link.dataset.scrollTarget;
  if (scrollTarget) requestAnimationFrame(() => document.querySelector(scrollTarget)?.scrollIntoView({ block: "start", behavior: "smooth" }));
});

menuToggle?.addEventListener("click", () => setMobileMenuOpen(!mainMenu?.classList.contains("open")));
menuClose?.addEventListener("click", () => setMobileMenuOpen(false));
menuOverlay?.addEventListener("click", () => setMobileMenuOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileMenuOpen(false);
});

window.addEventListener("beforeunload", persistFloatingTimerSession);
window.addEventListener("hashchange", () => showView(hashToView()));
restoreFloatingTimerSession();
showView(hashToView(), { skipScroll: true, keepMenuOpen: true });

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then((registration) => {
        registration.update();
        console.log("[Metas Estudo] Service worker registrado.");
      })
      .catch((error) => console.log("[Metas Estudo] Falha ao registrar service worker.", error));
  });
}

registerServiceWorker();
