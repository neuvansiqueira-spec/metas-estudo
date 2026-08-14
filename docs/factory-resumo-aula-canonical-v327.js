(() => {
  "use strict";

  const VERSION = "20260814-factory-resumo-aula-canonical-v327";
  const MIGRATION_ID = "factoryResumoAulaCanonicalVisualV327";
  const SIGNATURE = "TRANSFORME AS FONTES CLASSIFICADAS COMO RESUMO/AULA";
  const CAPITAL_HEADING = "## CAPITALIZAÇÃO DOS TÓPICOS E SUBTÓPICOS";
  const FORMAT_HEADING = "## FORMATO OBRIGATÓRIO";
  const HIERARCHY_HEADING = "## HIERARQUIA E NUMERAÇÃO";
  const TITLES_HEADING = "## TÍTULOS E SUBTÓPICOS";
  const VISUAL_HEADING = "## PADRÃO VISUAL DO WORD";
  const WORD_HEADING = "## WORD DO MÓDULO";
  const OLD_TITLECASE_RULE = "INICIE COM LETRA MAIÚSCULA TODAS AS PALAVRAS RELEVANTES";
  const OLD_TITLECASE_EXAMPLE = "▶️📚 Critério Material ou Substancial. Conteúdo Ofensivo:";
  const NEW_UPPERCASE_EXAMPLE = "▶️📚 CRITÉRIO MATERIAL OU SUBSTANCIAL. CONTEÚDO OFENSIVO:";

  const CAPITAL_SECTION = `${CAPITAL_HEADING}

MANTENHA OS TÍTULOS PRINCIPAIS MARCADOS COM ♦️ INTEGRALMENTE EM LETRAS MAIÚSCULAS.

NOS CABEÇALHOS DE TÓPICO OU SUBTÓPICO MARCADOS COM ▶️📚, USE TODO O TEXTO INTEGRALMENTE EM LETRAS MAIÚSCULAS.

PRESERVE SIGLAS, ABREVIAÇÕES E NOMES PRÓPRIOS COM A GRAFIA CORRETA, SEM ALTERAR SEU CONTEÚDO.

APLIQUE A REGRA DE MAIÚSCULAS SOMENTE AOS CABEÇALHOS ♦️ E ▶️📚. NÃO APLIQUE ÀS FRASES EXPLICATIVAS, AOS ITENS NUMERADOS NEM AOS RÓTULOS INTERNOS COMO CONCEITO:, REGRA:, EXCEÇÃO:, PRAZO: OU COMPETÊNCIA:.

NO WORD, TODO CABEÇALHO ▶️📚 DEVE RECEBER O MESMO TIPO DE DESTAQUE VISUAL DIDÁTICO USADO NO CABEÇALHO DE ARTIGO DO MÓDULO LEI: TEXTO PRETO, NEGRITO REAL E FAIXA HORIZONTAL AZUL-CLARA DISCRETA.

EXEMPLO OBRIGATÓRIO DE PADRÃO:

${NEW_UPPERCASE_EXAMPLE}`;

  const FORMAT_SECTION = `${FORMAT_HEADING}

O CONTEÚDO DEVE PERMANECER ORGANIZADO POR GRANDES EIXOS E INSTITUTOS, SEM ADOTAR A ARQUITETURA PRÓPRIA DO MÓDULO LEI.

USE:

♦️ **[EMOJI ORIGINAL OU TEMÁTICO, SE NECESSÁRIO] [NUMERAÇÃO]. [GRANDE EIXO EM MAIÚSCULAS]**

▶️📚 **[INSTITUTO]. [ASSUNTO OU RECORTE EM MAIÚSCULAS]:**

DENTRO DE CADA BLOCO, USE PALAVRAS-NÚCLEO QUE IDENTIFIQUEM IMEDIATAMENTE A FUNÇÃO JURÍDICA DA INFORMAÇÃO.

EXEMPLOS DE RÓTULOS POSSÍVEIS:

* CONCEITO;
* NATUREZA;
* FINALIDADE;
* FUNDAMENTO;
* SUJEITO;
* TITULARIDADE;
* LEGITIMIDADE;
* COMPETÊNCIA;
* OBJETO;
* REQUISITOS;
* CONDIÇÕES;
* CARACTERÍSTICAS;
* CLASSIFICAÇÃO;
* PROCEDIMENTO;
* ETAPAS;
* PRAZO;
* REGRA;
* EFEITO;
* CONSEQUÊNCIA;
* DIREITO;
* DEVER;
* VEDAÇÃO;
* LIMITE;
* EXCEÇÃO;
* RESSALVA;
* DISTINÇÃO.

NÃO FORCE OS MESMOS RÓTULOS EM TODOS OS INSTITUTOS.

SELECIONE SOMENTE AS PALAVRAS-NÚCLEO QUE CORRESPONDAM AO CONTEÚDO EFETIVAMENTE PRESENTE NAS FONTES.

USE, CONFORME A FUNÇÃO DA INFORMAÇÃO:

1️⃣ **[PALAVRA-NÚCLEO]:** [RELAÇÃO JURÍDICA DIRETA].

2️⃣ **[PALAVRA-NÚCLEO]:** [CONDIÇÃO, REQUISITO OU ELEMENTO DEPENDENTE].

3️⃣ **[PALAVRA-NÚCLEO]:** [PROCEDIMENTO, ETAPA OU OUTRO DESDOBRAMENTO NECESSÁRIO].

🏛️ **COMPETÊNCIA:** [SUJEITO E ATRIBUIÇÃO].

⏱️ **PRAZO:** [PRAZO E MARCOS RELEVANTES].

🚫 **VEDAÇÃO:** [CONDUTA, ATO OU RESULTADO PROIBIDO].

✅ **REGRA:** [REGRA OU RESULTADO AUTOSSUFICIENTE].

✅ **EFEITO:** [CONSEQUÊNCIA JURÍDICA AUTOSSUFICIENTE].

✳️ **EXCEÇÃO:** [HIPÓTESE EXCEPCIONAL].

✳️ **RESSALVA:** [LIMITAÇÃO OU CONDICIONAMENTO].

✳️ **DISTINÇÃO:** [DIFERENÇA JURIDICAMENTE RELEVANTE].

✳️ **PEGADINHA:** [PONTO DE CONFUSÃO EFETIVAMENTE PRESENTE NO CONTEÚDO].

📌 **PROVA:** [FRASE CURTA E AUTOSSUFICIENTE, SOMENTE QUANDO ÚTIL].

USE SOMENTE AS CAMADAS NECESSÁRIAS AO CONTEÚDO.

A NUMERAÇÃO 1️⃣, 2️⃣, 3️⃣, 4️⃣ E 5️⃣ NÃO É OBRIGATÓRIA EM TODA INFORMAÇÃO.

USE NUMERAÇÃO QUANDO HOUVER:

* ENUMERAÇÃO REAL;
* SEQUÊNCIA;
* ELEMENTOS DEPENDENTES;
* REQUISITOS MÚLTIPLOS;
* CLASSIFICAÇÕES;
* ETAPAS;
* DESDOBRAMENTOS QUE SE BENEFICIEM DA ORDEM VISUAL.

QUANDO A INFORMAÇÃO POSSUIR FUNÇÃO JURÍDICA PRÓPRIA E FOR MAIS FACILMENTE IDENTIFICÁVEL POR ÍCONE FUNCIONAL, PREFIRA:

🏛️ COMPETÊNCIA;

⏱️ PRAZO;

🚫 VEDAÇÃO;

✅ REGRA OU EFEITO;

✳️ EXCEÇÃO, RESSALVA, DISTINÇÃO OU PEGADINHA;

📌 PROVA.

NÃO NUMERE ARTIFICIALMENTE UMA INFORMAÇÃO ISOLADA APENAS PARA PREENCHER O PADRÃO VISUAL.

A HIERARQUIA VISUAL DEVE FACILITAR A LOCALIZAÇÃO IMEDIATA DA INFORMAÇÃO, SEM ALTERAR SUA HIERARQUIA JURÍDICA.`;

  const HIERARCHY_SECTION = `${HIERARCHY_HEADING}

USE ♦️ SOMENTE PARA GRANDES EIXOS TEMÁTICOS.

USE PREFERENCIALMENTE NUMERAÇÃO INTEIRA:

1.;
2.;
3.;
4.;
ETC.

USE SUBNUMERAÇÃO 1.1., 1.2., 2.1. ETC. SOMENTE QUANDO O SUBEIXO FOR JURIDICAMENTE AUTÔNOMO E SUA SEPARAÇÃO MELHORAR MATERIALMENTE A COMPREENSÃO.

USE ▶️📚 PARA IDENTIFICAR INSTITUTOS, ASSUNTOS OU RECORTES INTERNOS DO GRANDE EIXO.

A PROFUNDIDADE DEVE OCORRER PREFERENCIALMENTE DENTRO DOS BLOCOS ▶️📚, E NÃO PELA MULTIPLICAÇÃO DE TÍTULOS ♦️.

DENTRO DOS BLOCOS ▶️📚:

* USE 1️⃣, 2️⃣, 3️⃣ ETC. PARA ENUMERAÇÕES, SEQUÊNCIAS, CLASSIFICAÇÕES, REQUISITOS OU DESDOBRAMENTOS;
* USE 🏛️ PARA COMPETÊNCIA OU ATRIBUIÇÃO;
* USE ⏱️ PARA PRAZO;
* USE 🚫 PARA VEDAÇÃO;
* USE ✅ PARA REGRA, RESULTADO OU EFEITO;
* USE ✳️ PARA EXCEÇÃO, RESSALVA, DISTINÇÃO OU PEGADINHA;
* USE 📌 PROVA SOMENTE QUANDO O DESTAQUE AJUDAR EFETIVAMENTE NA REVISÃO.

NÃO CRIE UMA LINHA 1️⃣, 2️⃣ OU 3️⃣ APENAS PARA MANTER SIMETRIA VISUAL.

NÃO É NECESSÁRIO QUE TODOS OS BLOCOS TENHAM A MESMA QUANTIDADE DE LINHAS, NÍVEIS OU ÍCONES.

A FORMA DEVE SE ADAPTAR AO CONTEÚDO JURÍDICO, E NÃO O CONTRÁRIO.

USE INDENTAÇÃO PROGRESSIVA REAL PARA DEMONSTRAR A RELAÇÃO ENTRE:

* GRANDE EIXO;
* INSTITUTO;
* ELEMENTO PRINCIPAL;
* ELEMENTO DEPENDENTE;
* EXCEÇÃO OU CONSEQUÊNCIA.

NÃO USE RECUOS EXCESSIVOS QUE REDUZAM A ÁREA ÚTIL DA PÁGINA.

CORRIJA SALTOS, DUPLICIDADES E NUMERAÇÃO INCOERENTE, SEM MODIFICAR O CONTEÚDO OU A ORDEM TEMÁTICA EXIGIDA PELO PROMPT.`;

  const TITLES_SECTION = `${TITLES_HEADING}

OS TÍTULOS ♦️ DEVEM FUNCIONAR COMO ÂNCORAS VISUAIS DOS GRANDES EIXOS.

FORMATO:

♦️ **[EMOJI ORIGINAL OU TEMÁTICO, SE NECESSÁRIO] [NUMERAÇÃO]. [PALAVRA-NÚCLEO OU GRANDE EIXO EM MAIÚSCULAS]**

PRESERVE O EMOJI ORIGINAL QUANDO HOUVER.

SE O ORIGINAL NÃO TROUXER EMOJI, É PERMITIDO INSERIR UM ÚNICO EMOJI TEMÁTICO APÓS ♦️, DESDE QUE SEJA COERENTE E ESTÁVEL.

NÃO ESPALHE EMOJIS DECORATIVOS PELO CORPO DO TEXTO.

OS CABEÇALHOS ▶️📚 DEVEM IDENTIFICAR O INSTITUTO E O RECORTE INTERNO DE FORMA IMEDIATA.

FORMATO:

▶️📚 **[INSTITUTO]. [ASSUNTO OU RECORTE]:**

OU:

▶️📚 **[INSTITUTO]. [ASSUNTO] — [NATUREZA OU RECORTE]:**

TODO O TEXTO DO CABEÇALHO ▶️📚 DEVE SER CONVERTIDO PARA LETRAS MAIÚSCULAS NO DOCUMENTO FINAL.

NÃO ESCREVA “TÓPICO”, “SUBTÓPICO”, “CAMADA” OU “RESUMO”.

NÃO CRIE CABEÇALHO AUTÔNOMO APENAS PARA:

* CONCEITO;
* NATUREZA;
* REGRA;
* REQUISITOS;
* EFEITOS;
* PRAZO;
* EXCEÇÃO;
* CARACTERÍSTICAS.

ESSAS FUNÇÕES DEVEM, EM REGRA, APARECER COMO PALAVRAS-NÚCLEO DENTRO DO BLOCO DO INSTITUTO.

REDUZA O TÍTULO À PALAVRA-NÚCLEO QUANDO ISSO NÃO GERAR PERDA DE CONTEXTO.

SE A PALAVRA ISOLADA FICAR GENÉRICA, PRESERVE O RECORTE NECESSÁRIO PARA QUE O CABEÇALHO SEJA AUTOSSUFICIENTE.`;

  const VISUAL_SECTION = `${VISUAL_HEADING}

O WORD DO MÓDULO RESUMO/AULA DEVE ADOTAR IDENTIDADE VISUAL LIMPA, DIDÁTICA, PREVISÍVEL E COERENTE COM O PADRÃO GRÁFICO DO MÓDULO LEI, SEM IMPORTAR SUA ARQUITETURA NORMATIVA.

TODO O TEXTO DO DOCUMENTO DEVE USAR EXCLUSIVAMENTE A COR PRETA PURA #000000.

A REGRA ABRANGE TÍTULOS, SUBTÍTULOS, CABEÇALHOS ▶️📚, PALAVRAS-NÚCLEO, EXPLICAÇÕES, REGRAS, EXCEÇÕES, PONTOS DE PROVA E RODAPÉ.

AS ÚNICAS CORES PERMITIDAS SÃO:

* AS CORES NATIVAS DOS EMOJIS E ÍCONES;
* O FUNDO AZUL-CLARO DISCRETO UTILIZADO NOS CABEÇALHOS ▶️📚.

É PROIBIDO USAR COR VERDE, VERMELHA, DOURADA, CINZA, AZUL OU OUTRA COR NAS LETRAS.

### GRANDES EIXOS ♦️

OS TÍTULOS ♦️ DEVEM:

* FICAR EM NEGRITO REAL;
* PERMANECER EM LETRAS MAIÚSCULAS;
* USAR TEXTO PRETO #000000;
* POSSUIR ESPAÇAMENTO SUPERIOR VISUALMENTE MAIOR QUE O DOS BLOCOS INTERNOS;
* FUNCIONAR COMO SEPARADORES DOS GRANDES EIXOS;
* NÃO RECEBER FAIXA AZUL-CLARA.

### CABEÇALHOS ▶️📚

TODO CABEÇALHO ▶️📚 DEVE:

* FICAR INTEGRALMENTE EM LETRAS MAIÚSCULAS;
* SER EXIBIDO EM NEGRITO REAL;
* USAR TEXTO PRETO #000000;
* RECEBER FAIXA HORIZONTAL AZUL-CLARA DISCRETA, NOS MOLDES VISUAIS DO CABEÇALHO DE ARTIGO DO MÓDULO LEI;
* USAR, QUANDO DISPONÍVEL NO WORD-MODELO, O MESMO TOM DE AZUL-CLARO EMPREGADO NOS CABEÇALHOS DE ARTIGO DO MÓDULO LEI;
* ESTENDER A FAIXA PELA LARGURA ÚTIL DO BLOCO DENTRO DAS MARGENS, SEM ULTRAPASSÁ-LAS;
* POSSUIR ESPAÇAMENTO SUPERIOR E INFERIOR SUFICIENTE PARA SEPARÁ-LO DO BLOCO ANTERIOR;
* PERMANECER JUNTO À PRIMEIRA LINHA DE CONTEÚDO SUBSEQUENTE, SEM FICAR ISOLADO NO FIM DA PÁGINA.

A FAIXA AZUL-CLARA É EXCLUSIVA DO CABEÇALHO ▶️📚.

NÃO APLIQUE A FAIXA ÀS LINHAS 1️⃣, 2️⃣, 3️⃣, 🏛️, ⏱️, 🚫, ✅, ✳️ OU 📌 PROVA.

### PALAVRAS-NÚCLEO

NAS LINHAS DE CONTEÚDO, APLIQUE NEGRITO REAL SOMENTE:

* AO EMOJI OU À NUMERAÇÃO, QUANDO HOUVER;
* À PALAVRA-NÚCLEO;
* AOS DOIS-PONTOS.

A EXPLICAÇÃO APÓS OS DOIS-PONTOS NÃO DEVE PERMANECER EM NEGRITO.

QUANDO TODA A LINHA FOR CABEÇALHO ♦️ OU ▶️📚, O NEGRITO PODE ABRANGER TODO O CABEÇALHO.

EXEMPLOS DE FORMATAÇÃO:

1️⃣ **CONCEITO:** explicação em texto normal.

🏛️ **COMPETÊNCIA:** explicação em texto normal.

⏱️ **PRAZO:** explicação em texto normal.

🚫 **VEDAÇÃO:** explicação em texto normal.

✅ **REGRA:** explicação em texto normal.

✳️ **EXCEÇÃO:** explicação em texto normal.

📌 **PROVA:** explicação em texto normal.

### ESPAÇAMENTO E RESPIRO VISUAL

MANTENHA:

* ALINHAMENTO À ESQUERDA;
* ESPAÇAMENTO SIMPLES;
* ESPAÇO VISUAL CONSISTENTE ENTRE INSTITUTOS;
* ESPAÇO MENOR ENTRE LINHAS QUE PERTENÇAM AO MESMO RACIOCÍNIO;
* INDENTAÇÃO PROGRESSIVA REAL;
* FUNDO BRANCO;
* ALTO CONTRASTE.

NÃO INSIRA LINHAS EM BRANCO EM EXCESSO.

NÃO COMPRIMA BLOCOS DIFERENTES A PONTO DE PREJUDICAR A IDENTIFICAÇÃO DOS INSTITUTOS.

NÃO USE JUSTIFICAÇÃO QUE PRODUZA ESPAÇOS EXCESSIVOS ENTRE AS PALAVRAS.

NÃO USE TABELAS.

NÃO USE CAIXAS DECORATIVAS, BORDAS, SOMBREAMENTOS OU ELEMENTOS GRÁFICOS QUE NÃO POSSUAM FUNÇÃO HIERÁRQUICA.

### CONSISTÊNCIA VISUAL

BLOCOS COM A MESMA FUNÇÃO DEVEM TER A MESMA FORMATAÇÃO EM TODO O DOCUMENTO.

NÃO ALTERE ALEATORIAMENTE TAMANHO DE FONTE, TIPO DE FONTE, RECUOS, ESPAÇAMENTO, ESTILO DE FAIXA, NEGRITO OU POSIÇÃO DOS ÍCONES.

A IDENTIDADE VISUAL DEVE PERMITIR QUE O LEITOR IDENTIFIQUE RAPIDAMENTE ONDE COMEÇA UM GRANDE EIXO, ONDE COMEÇA UM INSTITUTO, ONDE ESTÁ A REGRA, O PRAZO, A COMPETÊNCIA, A VEDAÇÃO, A EXCEÇÃO E O PONTO DE PROVA.

### VALIDAÇÃO VISUAL DO DOCX

OS MARCADORES ** DEVEM SERVIR APENAS COMO INSTRUÇÃO DE FORMATAÇÃO E NÃO PODEM APARECER LITERALMENTE NO DOCUMENTO FINAL.

ANTES DA ENTREGA, INSPECIONE A FORMATAÇÃO REAL DO WORD E CONFIRME:

1. TODO TEXTO NÃO-EMOJI ESTÁ EM #000000.
2. TODOS OS TÍTULOS ♦️ ESTÃO EM NEGRITO REAL E SEM FAIXA AZUL.
3. TODOS OS CABEÇALHOS ▶️📚 ESTÃO EM LETRAS MAIÚSCULAS, NEGRITO REAL E COM A MESMA FAIXA AZUL-CLARA DISCRETA.
4. NENHUM TÍTULO ♦️ RECEBEU A FAIXA DESTINADA AOS CABEÇALHOS ▶️📚.
5. NAS LINHAS DE CONTEÚDO, O NEGRITO TERMINA NOS DOIS-PONTOS.
6. A EXPLICAÇÃO APÓS OS DOIS-PONTOS ESTÁ EM TEXTO NORMAL.
7. NÃO RESTOU NENHUM MARCADOR LITERAL **.
8. A INDENTAÇÃO REFLETE A HIERARQUIA REAL DOS BLOCOS.
9. O ESPAÇAMENTO ENTRE INSTITUTOS É CONSISTENTE.
10. NÃO HÁ CABEÇALHO ▶️📚 ISOLADO NO FIM DA PÁGINA.
11. NÃO HÁ ALTERAÇÃO ALEATÓRIA DE FONTE, TAMANHO, COR, RECUO OU ESPAÇAMENTO.
12. NÃO HÁ TABELAS.
13. NÃO HÁ CORES DE TEXTO DIFERENTES DE #000000.
14. O DOCUMENTO PODE SER PERCORRIDO VISUALMENTE E OS INSTITUTOS PODEM SER IDENTIFICADOS SEM LEITURA INTEGRAL.

SE HOUVER ERRO EXCLUSIVAMENTE VISUAL, CORRIJA SOMENTE A FORMATAÇÃO.

NÃO ALTERE O CONTEÚDO JURÍDICO, A COBERTURA, AS CONCLUSÕES, A ORDEM TEMÁTICA OU A PROFUNDIDADE PARA CORRIGIR PROBLEMAS DE FORMATAÇÃO.`;

  const WORD_SECTION = `${WORD_HEADING}

GERE UM ARQUIVO .DOCX EDITÁVEL EXCLUSIVO DO MÓDULO RESUMO/AULA.

NÃO CONSOLIDE COM LEI, JURISPRUDÊNCIA OU PEÇA.

USE O WORD-MODELO ANEXADO COMO REFERÊNCIA DE:

* FONTE;
* TAMANHO;
* MARGENS;
* ESPAÇAMENTO;
* RECUOS;
* RESPIRO VISUAL;
* ESTILO DOS TÍTULOS;
* ESTILO DOS CABEÇALHOS;
* FAIXAS;
* RODAPÉ.

A IDENTIDADE VISUAL DEFINIDA NESTE PROMPT PREVALECE QUANTO À ORGANIZAÇÃO ESPECÍFICA DO MÓDULO RESUMO/AULA.

NÃO COPIE DO MODELO QUALQUER CONTEÚDO JURÍDICO.

SE NÃO HOUVER MODELO, USE:

* PAPEL A4;
* ARIAL 11;
* MARGENS DE 2 CM;
* ESPAÇAMENTO SIMPLES;
* ALINHAMENTO À ESQUERDA;
* INDENTAÇÃO PROGRESSIVA REAL;
* TEXTO #000000;
* FUNDO BRANCO;
* SEM TABELAS;
* SEM CABEÇALHO;
* RODAPÉ APENAS COM NUMERAÇÃO.

INSIRA NUMERAÇÃO NO RODAPÉ:

* FIM DA PÁGINA;
* CENTRALIZADA;
* EM NEGRITO;
* COR #000000;
* FORMATO “1 DE 20”.

NÃO DEIXE TÍTULO ♦️ OU CABEÇALHO ▶️📚 ISOLADO NO FINAL DE UMA PÁGINA QUANDO NÃO HOUVER CONTEÚDO SUBSTANTIVO SUBSEQUENTE NA MESMA PÁGINA.

MANTENHA, SEMPRE QUE TECNICAMENTE POSSÍVEL, O CABEÇALHO ▶️📚 JUNTO À PRIMEIRA LINHA DE SEU CONTEÚDO.

NOME DO ARQUIVO:

MAPA_HIERARQUICO_RESUMO_AULA_[FILTRO].docx

ENTREGUE O WORD COMPLETO E O LINK PARA DOWNLOAD.

NÃO ENTREGUE APENAS O CONTEÚDO NO CHAT, SALVO PEDIDO EXPRESSO.`;

  function replaceSection(prompt, heading, replacement) {
    const source = String(prompt || "");
    const start = source.indexOf(heading);
    if (start < 0) return source;
    const next = source.indexOf("\n\n## ", start + heading.length);
    const end = next < 0 ? source.length : next;
    return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  }

  function insertBefore(prompt, anchor, section) {
    const source = String(prompt || "");
    const index = source.indexOf(anchor);
    if (index < 0) return source;
    const prefix = source.slice(0, index).trimEnd();
    const suffix = source.slice(index).trimStart();
    return `${prefix}\n\n${section}\n\n${suffix}`;
  }

  function patchPrompt(prompt) {
    const original = String(prompt || "");
    if (!original.includes(SIGNATURE)) return original;

    let updated = original;
    if (updated.includes(CAPITAL_HEADING)) {
      updated = replaceSection(updated, CAPITAL_HEADING, CAPITAL_SECTION);
    } else {
      updated = insertBefore(updated, "## CONTROLE OBJETIVO DE TÍTULOS, SUBTÓPICOS E LINHAS", CAPITAL_SECTION);
    }

    updated = replaceSection(updated, FORMAT_HEADING, FORMAT_SECTION);
    updated = replaceSection(updated, HIERARCHY_HEADING, HIERARCHY_SECTION);
    updated = replaceSection(updated, TITLES_HEADING, TITLES_SECTION);

    if (updated.includes(VISUAL_HEADING)) {
      updated = replaceSection(updated, VISUAL_HEADING, VISUAL_SECTION);
    } else {
      updated = insertBefore(updated, WORD_HEADING, VISUAL_SECTION);
    }

    updated = replaceSection(updated, WORD_HEADING, WORD_SECTION);
    return updated;
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

  function sourceBasePrompt() {
    try {
      if (typeof FACTORY_RESUMO_AULA_PROMPT !== "undefined" && String(FACTORY_RESUMO_AULA_PROMPT || "").includes(SIGNATURE)) {
        return String(FACTORY_RESUMO_AULA_PROMPT);
      }
    } catch (_error) {
      // A fonte principal ainda pode não ter sido inicializada; as retentativas cuidam disso.
    }
    return "";
  }

  function canonicalPromptFrom(prompt = "") {
    const candidate = String(prompt || "");
    const base = candidate.includes(SIGNATURE) ? candidate : sourceBasePrompt();
    return patchPrompt(base);
  }

  function isCanonicalPrompt(prompt = "") {
    const text = String(prompt || "");
    return text.includes(SIGNATURE)
      && text.includes(VISUAL_HEADING)
      && text.includes(NEW_UPPERCASE_EXAMPLE)
      && text.includes("FAIXA HORIZONTAL AZUL-CLARA DISCRETA")
      && text.includes("🏛️ **COMPETÊNCIA:**")
      && text.includes("⏱️ **PRAZO:**")
      && text.includes("🚫 **VEDAÇÃO:**")
      && !text.includes(OLD_TITLECASE_RULE)
      && !text.includes(OLD_TITLECASE_EXAMPLE);
  }

  function persistIfPossible() {
    try {
      if (typeof saveData === "function") saveData();
    } catch (error) {
      console.warn(`[${VERSION}] Não foi possível persistir imediatamente o prompt canônico.`, error);
    }
  }

  function installNormalizerGuard() {
    try {
      if (globalThis.__aldusResumoAulaNormalizerGuardV327) return false;
      if (typeof normalizeFactoryPromptLibrary !== "function") return false;
      const previousNormalize = normalizeFactoryPromptLibrary;
      normalizeFactoryPromptLibrary = function normalizeFactoryPromptLibraryV327(library = {}) {
        const normalized = previousNormalize(library);
        if (normalized && typeof normalized === "object") {
          const current = String(normalized.resumoAula || "");
          if (!current.trim() || current.includes(SIGNATURE)) {
            normalized.resumoAula = canonicalPromptFrom(current);
          }
        }
        return normalized;
      };
      globalThis.__aldusResumoAulaNormalizerGuardV327 = true;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function installGeneratorGuard() {
    try {
      if (globalThis.__aldusResumoAulaGeneratorGuardV327) return false;
      if (typeof factoryPromptBase !== "function") return false;
      const previousFactoryPromptBase = factoryPromptBase;
      factoryPromptBase = function factoryPromptBaseV327(type) {
        const original = previousFactoryPromptBase(type);
        if (type !== "resumoAula") return original;
        const canonical = canonicalPromptFrom(original);
        const targetState = currentState();
        if (targetState?.factoryPromptLibrary && canonical && targetState.factoryPromptLibrary.resumoAula !== canonical) {
          targetState.factoryPromptLibrary.resumoAula = canonical;
          targetState.migrations ||= {};
          targetState.migrations[MIGRATION_ID] ||= new Date().toISOString();
        }
        return canonical || original;
      };
      globalThis.__aldusResumoAulaGeneratorGuardV327 = true;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function applyCanonicalPolicy({ persist = true } = {}) {
    let changed = false;
    const defaults = currentDefaults();
    if (defaults) {
      const current = String(defaults.resumoAula || "");
      const canonical = canonicalPromptFrom(current);
      if (canonical && current !== canonical) {
        defaults.resumoAula = canonical;
        changed = true;
      }
    }

    const targetState = currentState();
    if (targetState) {
      targetState.factoryPromptLibrary ||= {};
      const current = String(targetState.factoryPromptLibrary.resumoAula || "");
      const canonical = canonicalPromptFrom(current);
      if (canonical && current !== canonical) {
        targetState.factoryPromptLibrary.resumoAula = canonical;
        changed = true;
      }
      targetState.migrations ||= {};
      if (canonical && !targetState.migrations[MIGRATION_ID]) {
        targetState.migrations[MIGRATION_ID] = new Date().toISOString();
        changed = true;
      }
    }

    const normalizerInstalled = installNormalizerGuard();
    const generatorInstalled = installGeneratorGuard();
    changed = normalizerInstalled || generatorInstalled || changed;

    if (changed && persist && targetState) persistIfPossible();

    const prompt = targetState?.factoryPromptLibrary?.resumoAula || defaults?.resumoAula || sourceBasePrompt();
    globalThis.__aldusFactoryResumoAulaCanonicalV327 = Object.freeze({
      version: VERSION,
      migrationId: MIGRATION_ID,
      applied: Boolean(prompt),
      canonical: isCanonicalPrompt(prompt),
      changed,
      patchPrompt,
      canonicalPromptFrom,
      isCanonicalPrompt,
      updatedAt: new Date().toISOString()
    });

    return { changed, canonical: isCanonicalPrompt(prompt) };
  }

  function run() {
    try {
      applyCanonicalPolicy();
    } catch (error) {
      console.error(`[${VERSION}] Falha ao aplicar o prompt canônico RESUMO/AULA.`, error);
    }
  }

  run();

  if (typeof setTimeout === "function") {
    [50, 250, 1000, 3000, 10000, 30000, 60000].forEach((delay) => setTimeout(run, delay));
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
    document.addEventListener("click", () => {
      try { applyCanonicalPolicy({ persist: false }); } catch (_error) {}
    }, true);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) run();
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pageshow", run);
    window.addEventListener("focus", run);
    window.addEventListener("hashchange", run);
  }
})();
