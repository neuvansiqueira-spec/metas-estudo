(() => {
  "use strict";

  // V668: pedido dele em 18/10/2026, depois de analisarmos juntos o resumo de Prescrição e Decadência
  // (LEI + JURISPRUDÊNCIA). Crítica dele: "AS FRASES ESTÃO CURTAS E DIRETAS, MAS UMA BOA PARTE ESTÃO
  // MUITO ENXUTAS" — ex.: "Suspensão em favor de um credor solidário não aproveita automaticamente aos
  // demais" (suspensão de quê? não aproveita o quê? quais demais?). A causa estava no próprio prompt da
  // LEI (V123): ele manda reduzir o artigo a "palavras-núcleo", e o bloco de autossuficiência que o
  // RESUMO/AULA recebe (V327) nunca chegou à LEI. Ele pediu: "Leve tudo para o prompt da LEI: o bloco de
  // autossuficiência adaptado, as nossas regras e os quatro recursos de estrutura".
  // - O texto-base da V123 não é tocado: a seção é inserida no prompt salvo e na montagem, como a V663.
  // - O prompt LEI + JURISPRUDÊNCIA (V383) é montado a partir do da LEI; por isso a seção fica toda
  //   dentro do texto-base (antes de "## PONTO DE PROVA") e a mesma função vale para os dois tipos.
  //   Assim, quando a V383 remonta o combinado a partir da LEI já ajustada, o resultado é o mesmo e
  //   ela não o considera "desatualizado" a cada abertura.
  // - Maiúsculas nas palavras decisivas: pedido dele para a LEI. Exemplos continuam proibidos, como
  //   antes (a decisão dele sobre exemplos ficou pendente).
  const VERSION = "20261018-factory-lei-didatica-v668";
  const MIGRATION_ID = "factoryLeiDidaticaV668";
  const TYPES = Object.freeze(["lei", "leiJurisprudencia"]);
  const MARKER = "<!-- LEI-DIDATICA-V668 -->";
  const HEADING = "## AUTOSSUFICIÊNCIA E CLAREZA DE CADA LINHA";
  const END = "FIM DAS REGRAS DIDÁTICAS DA V668.";
  const ANCHOR = "## PONTO DE PROVA\n";
  const V383_BASE_MARKER = "__aldusFactoryLeiJurisprudenciaV383";
  const BASE_WRAP_MARKER = "__aldusFactoryLeiDidaticaBaseV668";

  const REPLACEMENTS = Object.freeze([
    [
      "DENTRO DE CADA ARTIGO, CONVERTA A REDAÇÃO NORMATIVA EM PALAVRAS-NÚCLEO FLEXÍVEIS E RELAÇÕES JURÍDICAS DIRETAS, SEM COPIAR O DISPOSITIVO INTEGRALMENTE.",
      "DENTRO DE CADA ARTIGO, CONVERTA A REDAÇÃO NORMATIVA EM LINHAS COM RÓTULO (PALAVRA-NÚCLEO) SEGUIDO DE FRASE COMPLETA E AUTOSSUFICIENTE, ESCRITA COMO RELAÇÃO JURÍDICA DIRETA, SEM COPIAR O DISPOSITIVO INTEGRALMENTE."
    ],
    [
      "CADA LINHA DEVE COMEÇAR POR PALAVRA-NÚCLEO EM NEGRITO E MAIÚSCULAS, SEGUIDA DE DOIS-PONTOS E DA EXPLICAÇÃO DIRETA:",
      "CADA LINHA DEVE COMEÇAR POR PALAVRA-NÚCLEO EM NEGRITO E MAIÚSCULAS, SEGUIDA DE DOIS-PONTOS E DE FRASE COMPLETA, ENTENDIDA LIDA SOZINHA:"
    ],
    [
      "1️⃣ **[PALAVRA-NÚCLEO]:** [EXPLICAÇÃO DIRETA].",
      "1️⃣ **[PALAVRA-NÚCLEO]:** [FRASE COMPLETA: QUEM, O QUE ACONTECE E SOBRE O QUÊ]."
    ]
  ]);

  const REVIEW_ANCHOR = "13. ALGUMA EXPLICAÇÃO APÓS OS DOIS-PONTOS FICOU INDEVIDAMENTE EM NEGRITO?";
  const REVIEW_ITEMS = `14. ALGUMA LINHA DEPENDE DO CABEÇALHO OU DA LINHA ANTERIOR PARA SER ENTENDIDA?
15. ALGUM "ELE", "ISSO", "A RESSALVA", "OS DEMAIS" OU EQUIVALENTE FICOU SEM DIZER A QUE SE REFERE?
16. ALGUMA PALAVRA AUSENTE NA LEI DEIXOU A REGRA MAIS AMPLA OU MAIS RESTRITA?
17. ALGUM TERMO TÉCNICO OU PALAVRA COMUM COM SENTIDO JURÍDICO FICOU SEM EXPLICAÇÃO, OU A EXPLICAÇÃO CRIOU REGRA QUE NÃO ESTÁ NA LEI?
18. OS GRUPOS E A DIREÇÃO DO ATO ESTÃO QUALIFICADOS DOS DOIS LADOS EM TODA LINHA EM QUE DECIDEM A REGRA?
19. AS PALAVRAS DECISIVAS ESTÃO EM MAIÚSCULAS EM TODAS AS LINHAS, SEM PASSAR DE QUATRO DESTAQUES POR LINHA?
20. ⚠️ FOI USADO SOMENTE NO PONTO DE PROVA, ✳️ NAS EXCEÇÕES, RESSALVAS, DISTINÇÕES E PEGADINHAS, E A NUMERAÇÃO COMEÇA EM 1️⃣ SEM PULAR NÚMEROS?
21. HÁ CONCEITO NA ABERTURA DE CADA CAPÍTULO E SEÇÃO, DISTINÇÃO ENTRE DISPOSITIVOS VIZINHOS QUE SE CONFUNDEM, ROTEIRO DE RESOLUÇÃO NO FIM E, QUANDO HOUVER JURISPRUDÊNCIA, QUADRO FINAL COM O ASSUNTO DE CADA LINHA?`;

  const SECTION = `${HEADING}

${MARKER}

ESTA SEÇÃO PREVALECE SOBRE QUALQUER ORIENTAÇÃO DE CONCISÃO DESTE PROMPT. "PALAVRA-NÚCLEO" É SOMENTE O RÓTULO EM NEGRITO ANTES DOS DOIS-PONTOS; DEPOIS DOS DOIS-PONTOS VEM SEMPRE FRASE COMPLETA. NÃO HÁ META NUMÉRICA DE PALAVRAS POR LINHA NEM LIMITE DE TAMANHO DO RESUMO. A PROIBIÇÃO DE COPIAR A LEI CONTINUA VALENDO: A FRASE DEVE SER COMPLETA, MAS ESCRITA COMO RELAÇÃO JURÍDICA DIRETA.

ESTAS REGRAS VALEM PARA TODAS AS LINHAS DE CONTEÚDO, PARA OS PONTOS DE PROVA E, QUANDO HOUVER, PARA AS LINHAS DE JURISPRUDÊNCIA E PARA O QUADRO FINAL DE JURISPRUDÊNCIA.

### A. FRASE COMPLETA E SEM AMBIGUIDADE

1. CADA LINHA DEVE SER ENTENDIDA LIDA SOZINHA, SEM O CABEÇALHO DO ARTIGO E SEM A LINHA ANTERIOR.

2. DEPOIS DOS DOIS-PONTOS, ESCREVA FRASE COMPLETA, COM SUJEITO, VERBO E OBJETO: QUEM, O QUE ACONTECE E SOBRE O QUÊ. QUANDO A LEI TRATAR DISSO, DIGA TAMBÉM QUANDO, COMO, ONDE, EM QUAL PRAZO E SOB QUAL CONDIÇÃO. NÃO INVENTE ESSES ELEMENTOS QUANDO A LEI NÃO OS TRAZ.

3. NOMEIE O INSTITUTO EM CADA LINHA (EX.: "A PRESCRIÇÃO", "A DECADÊNCIA", "A SUSPENSÃO DA PRESCRIÇÃO"). NÃO O DEIXE IMPLÍCITO NO CABEÇALHO.

4. NÃO USE PALAVRA QUE APONTE PARA ALGO SEM DIZER O QUÊ: "ELE", "ELA", "ELES", "ISSO", "AQUELA", "ESSE PRAZO", "A RESSALVA", "OS DEMAIS", "OS OUTROS", "O QUE FOI DITO" OU EQUIVALENTE. ESCREVA POR EXTENSO A PESSOA, O GRUPO, O PRAZO OU A REGRA A QUE SE REFERE, COM A QUALIFICAÇÃO QUE DEFINE A REGRA (EX.: "OS OUTROS CREDORES SOLIDÁRIOS", "OS OUTROS CREDORES QUE TAMBÉM NÃO SÃO SOLIDÁRIOS", "A RESSALVA DA OBRIGAÇÃO INDIVISÍVEL").

5. QUANDO A LEI DISTINGUIR GRUPOS PARECIDOS (EX.: SOLIDÁRIOS × NÃO SOLIDÁRIOS, LEGAL × CONVENCIONAL, ABSOLUTAMENTE × RELATIVAMENTE INCAPAZ), ESCREVA O GRUPO EM TODA LINHA EM QUE ELE DECIDE A REGRA. QUALIFIQUE OS DOIS LADOS DA REGRA: QUEM PRATICA O ATO E QUEM É ATINGIDO POR ELE. INDIQUE TAMBÉM A DIREÇÃO DO ATO ("PROMOVIDA POR" × "PROMOVIDA CONTRA").

6. RESOLVA AS REMISSÕES. SE A LINHA REMETER A OUTRO ARTIGO, A OUTRA LEI, A UMA CONDIÇÃO, A UMA AUTORIDADE OU AO "INCISO ANTERIOR", DIGA O QUE O DISPOSITIVO REMETIDO ESTABELECE, NA PARTE NECESSÁRIA PARA ENTENDER A REGRA. NÃO USE "NOS TERMOS DO ARTIGO", "CONFORME A LEI", "ÓRGÃO COMPETENTE", "CONDIÇÕES LEGAIS" OU EXPRESSÕES EQUIVALENTES PARA ENCOBRIR INFORMAÇÃO. APAGAR A EXPRESSÃO VAGA NÃO CORRIGE A OMISSÃO: ESCREVA O CONTEÚDO QUE ELA ENCOBRE.

7. MANTENHA O SENTIDO PRÓPRIO DA REGRA: A FRASE DEVE TER EXATAMENTE O ALCANCE DA LEI, NEM MAIS AMPLA, NEM MAIS RESTRITA. NÃO ACRESCENTE PALAVRAS QUE MUDEM ESSE ALCANCE, COMO "AUTOMATICAMENTE", "APENAS", "SEMPRE" OU "NUNCA", SE NÃO ESTIVEREM NO TEXTO OFICIAL. QUANDO A LEI DISSER "SÓ SE", ESCREVA A CONDIÇÃO. PRESERVE OBRIGAÇÃO, FACULDADE, PROIBIÇÃO, NEGAÇÕES E RESSALVAS: NÃO TROQUE "DEVE" POR "PODE", NEM O INVERSO.

8. MANTENHA CADA PRAZO, TERMO INICIAL, LIMITE OU EFEITO LIGADO À SUA HIPÓTESE. HIPÓTESES COM REQUISITOS OU EFEITOS DIFERENTES FICAM EM LINHAS DIFERENTES; NÃO CRIE UMA REGRA ÚNICA QUE A LEI NÃO SUSTENTA. EM LISTAS DA LEI, DIGA SE OS REQUISITOS SÃO CUMULATIVOS OU ALTERNATIVOS E SE O ROL É TAXATIVO OU EXEMPLIFICATIVO, QUANDO A LEI INDICAR.

9. NÃO USE BARRA (/) NEM SETA (→) NO LUGAR DE VERBO, DE "E" OU DE "OU".

10. FRASE CURTA É PREFERÍVEL, MAS NUNCA À CUSTA DO SUJEITO, DO VERBO, DO GRUPO, DA CONDIÇÃO OU DO SIGNIFICADO DO TERMO. LINHA LONGA DEMAIS PODE SER DIVIDIDA EM SUBITENS DO MESMO ARTIGO, DESDE QUE CADA SUBITEM CONTINUE COMPLETO.

EXEMPLO:

ERRADO — REGRA: SUSPENSÃO EM FAVOR DE UM CREDOR SOLIDÁRIO NÃO APROVEITA AUTOMATICAMENTE AOS DEMAIS.

CERTO — REGRA: SE A PRESCRIÇÃO FOR SUSPENSA A FAVOR DE UM CREDOR SOLIDÁRIO, A PRESCRIÇÃO CONTINUA CORRENDO CONTRA OS OUTROS CREDORES SOLIDÁRIOS.

CERTO — EXCEÇÃO: SE A OBRIGAÇÃO FOR INDIVISÍVEL, A SUSPENSÃO DA PRESCRIÇÃO BENEFICIA TODOS OS CREDORES SOLIDÁRIOS.

ERRADO — A INTERRUPÇÃO DA PRESCRIÇÃO FEITA POR UM CREDOR NÃO BENEFICIA OS OUTROS CREDORES, NÃO SOLIDÁRIOS.

CERTO — A INTERRUPÇÃO DA PRESCRIÇÃO PROMOVIDA POR UM CREDOR NÃO SOLIDÁRIO NÃO BENEFICIA OS OUTROS CREDORES QUE TAMBÉM NÃO SÃO SOLIDÁRIOS.

### B. TERMOS TÉCNICOS E PALAVRAS COMUNS COM SENTIDO JURÍDICO

1. NÃO DEIXE TERMO TÉCNICO SOLTO, SEM SIGNIFICADO. NA PRIMEIRA VEZ EM QUE ELE APARECER, EXPLIQUE-O ENTRE PARÊNTESES, EM POUCAS PALAVRAS SIMPLES (EX.: "CONDIÇÃO SUSPENSIVA (ACONTECIMENTO FUTURO E INCERTO DE QUE DEPENDE O NASCIMENTO DO DIREITO)").

2. ISSO VALE TAMBÉM PARA PALAVRAS COMUNS QUE A LEI USA COM SENTIDO JURÍDICO, COMO "INTERESSADO", "TERCEIRO", "PARTE", "BENEFICIADO", "QUEM DE DIREITO" E "COOBRIGADO": DIGA QUEM É, EM POUCAS PALAVRAS. SE A LEI NÃO DEFINIR, ESCREVA NO FIM DO PARÊNTESE "EXPLICAÇÃO DA DOUTRINA".

3. ESSAS EXPLICAÇÕES SÃO A ÚNICA EXCEÇÃO À PROIBIÇÃO DE DOUTRINA E DE CONHECIMENTO EXTERNO DESTE PROMPT: ELAS ESCLARECEM A PALAVRA, MAS NÃO PODEM CRIAR REGRA, REQUISITO, PRAZO OU EXCEÇÃO QUE NÃO ESTEJAM NA LEI. A PROIBIÇÃO DE EXEMPLO INVENTADO CONTINUA VALENDO.

### C. PALAVRAS DECISIVAS EM MAIÚSCULAS

1. NA EXPLICAÇÃO APÓS OS DOIS-PONTOS, ESCREVA EM MAIÚSCULAS AS PALAVRAS QUE DECIDEM A REGRA, AQUELAS QUE A BANCA TROCA PARA CRIAR PEGADINHA:
* NEGAÇÕES: NÃO, NEM, NENHUM;
* CONDIÇÕES E LIMITES: SÓ, SOMENTE, SALVO, EXCETO, SE, DESDE QUE, MESMO QUE, UMA VEZ;
* QUALIFICAÇÃO DO GRUPO: SOLIDÁRIO, NÃO SOLIDÁRIO, ABSOLUTAMENTE, RELATIVAMENTE, LEGAL, CONVENCIONAL;
* DIREÇÃO DO ATO: PROMOVIDA POR, PROMOVIDA CONTRA, A FAVOR DE;
* DEVER × FACULDADE: DEVE, PODE, NÃO PODE;
* EFEITO: BENEFICIA, PREJUDICA, SUSPENDE, INTERROMPE, NÃO CORRE, NULA;
* PRAZOS, NÚMEROS E MARCOS: 3 ANOS, 10 ANOS, DO VENCIMENTO, DA CIÊNCIA.

2. USE NO MÁXIMO QUATRO DESTAQUES EM MAIÚSCULAS POR LINHA. SE TUDO ESTIVER EM MAIÚSCULAS, NADA SE DESTACA.

3. AS MAIÚSCULAS DA EXPLICAÇÃO NÃO LEVAM NEGRITO; O NEGRITO CONTINUA SOMENTE ATÉ OS DOIS-PONTOS.

4. APLIQUE ESTA REGRA EM TODAS AS LINHAS DE CONTEÚDO E EM TODOS OS PONTOS DE PROVA, DO PRIMEIRO AO ÚLTIMO ARTIGO. NO DOCUMENTO, O RESTO DA FRASE FICA EM LETRAS MINÚSCULAS NORMAIS (EX.: "Se a prescrição for SUSPENSA A FAVOR DE um credor SOLIDÁRIO, a prescrição CONTINUA CORRENDO contra os outros credores SOLIDÁRIOS.").

### D. SEM REPETIÇÃO

1. NÃO REPITA A MESMA REGRA SOB RÓTULOS DIFERENTES (EX.: A MESMA FRASE COMO REGRA E DEPOIS COMO PONTO DE PROVA). COMPARE O SENTIDO, NÃO APENAS AS PALAVRAS.

2. RETOMAR UMA REGRA EM OUTRO ARTIGO SÓ É PERMITIDO QUANDO ELA FOR NECESSÁRIA PARA ENTENDER O NOVO ARTIGO: REPITA SOMENTE O NÚCLEO NECESSÁRIO E DIGA A RELAÇÃO COM O NOVO ARTIGO. NUNCA USE "VER ACIMA".

3. O MESMO JULGADO NÃO APARECE POR INTEIRO EM MAIS DE UM ARTIGO: FICA NO ARTIGO EM QUE A COMPREENSÃO É MAIS CLARA, E NOS OUTROS ENTRA SÓ UMA REMISSÃO CURTA AO ARTIGO EM QUE ESTÁ.

### E. SINAIS DE CADA LINHA

1. ⚠️ É USADO SOMENTE NO PONTO DE PROVA.

2. ✳️ É USADO NAS EXCEÇÕES, RESSALVAS, DISTINÇÕES E PEGADINHAS: ✳️ **EXCEÇÃO:**, ✳️ **RESSALVA:**, ✳️ **DISTINÇÃO:**, ✳️ **PEGADINHA:**. ESSAS LINHAS TÊM A MESMA FORMATAÇÃO DAS DEMAIS LINHAS DE CONTEÚDO.

3. A NUMERAÇÃO DE CADA ARTIGO COMEÇA EM 1️⃣ E NÃO PULA NÚMEROS.

4. O RÓTULO DIZ A FUNÇÃO REAL DA LINHA (EX.: "DEVER DO JUIZ" E NÃO "COMPETÊNCIA" QUANDO O ARTIGO IMPÕE UM DEVER AO JUIZ).

### F. ESTRUTURA DIDÁTICA

A ORDEM DA LEI, ARTIGO POR ARTIGO, CONTINUA OBRIGATÓRIA. OS RECURSOS ABAIXO SE SOMAM A ELA.

1. CONCEITO NA ABERTURA. LOGO APÓS O CABEÇALHO DE CADA CAPÍTULO E DE CADA SEÇÃO, INSIRA UMA OU DUAS LINHAS 📖 **CONCEITO:** QUE EXPLIQUEM O QUE SÃO E PARA QUE SERVEM OS INSTITUTOS TRATADOS ALI (EX.: NA SEÇÃO DAS CAUSAS QUE IMPEDEM OU SUSPENDEM A PRESCRIÇÃO, A DIFERENÇA ENTRE O PRAZO QUE NEM COMEÇA, O PRAZO QUE PARA E CONTINUA DE ONDE PAROU E O PRAZO QUE VOLTA AO ZERO). O CONCEITO SEGUE AS REGRAS A E B E NÃO CRIA REGRA NOVA.

2. DISTINÇÃO ENTRE DISPOSITIVOS VIZINHOS. QUANDO DOIS DISPOSITIVOS DO RECORTE TRATAREM DE ASSUNTOS PARECIDOS COM RESULTADOS DIFERENTES (EX.: RENÚNCIA À PRESCRIÇÃO × RENÚNCIA À DECADÊNCIA; SUSPENSÃO × INTERRUPÇÃO ENTRE CREDORES SOLIDÁRIOS; DECADÊNCIA LEGAL × CONVENCIONAL), INSIRA ✳️ **DISTINÇÃO:** NO SEGUNDO DISPOSITIVO, COMPARANDO OS DOIS E CITANDO O NÚMERO DE CADA UM.

3. PONTO DE PROVA COMO A BANCA COBRA. O PONTO DE PROVA DIZ O QUE A BANCA PODE TROCAR, INVERTER OU CONFUNDIR (EX.: "A BANCA PODE TROCAR SUSPENSÃO POR INTERRUPÇÃO OU SOLIDÁRIO POR NÃO SOLIDÁRIO"). SE O ARTIGO NÃO TIVER NADA ALÉM DA PRÓPRIA REGRA, NÃO CRIE PONTO DE PROVA.

4. ROTEIRO DE RESOLUÇÃO. DEPOIS DO ÚLTIMO ARTIGO E ANTES DO QUADRO FINAL DE JURISPRUDÊNCIA, QUANDO HOUVER, CRIE O BLOCO ♦️ **🧭 ROTEIRO DE RESOLUÇÃO**, COM 4 A 8 PASSOS NUMERADOS (1️⃣, 2️⃣, 3️⃣...) NA ORDEM EM QUE O CANDIDATO DEVE RACIOCINAR PARA RESOLVER UMA QUESTÃO SOBRE O RECORTE. CADA PASSO É UMA PERGUNTA OU VERIFICAÇÃO EM FRASE COMPLETA, COM O ARTIGO CORRESPONDENTE. USE SOMENTE REGRAS DO RECORTE. INCLUA O ROTEIRO NO SUMÁRIO, DEPOIS DO ÚLTIMO ARTIGO E ANTES DO QUADRO FINAL DE JURISPRUDÊNCIA.

5. QUADRO FINAL DE JURISPRUDÊNCIA, QUANDO HOUVER. CADA LINHA COMEÇA PELO ASSUNTO, NÃO SÓ PELO ARTIGO: ⚖️ **[ASSUNTO] — [SUBASSUNTO] (ART. [NÚMERO]):** [TESE EM FRASE COMPLETA]. [IDENTIFICAÇÃO DO JULGADO]. EX.: ⚖️ **COBRANÇA DE DÍVIDA PRESCRITA — FORA DA JUSTIÇA (ART. 189):**

${END}`;

  function aplicar(prompt) {
    let text = String(prompt || "");
    if (!text.trim() || text.includes("[PROMPT COMPLETO AINDA NÃO CADASTRADO")) return text;

    for (const [from, to] of REPLACEMENTS) {
      if (text.includes(from)) text = text.replace(from, to);
    }

    const start = text.indexOf(HEADING);
    if (start >= 0) {
      const end = text.indexOf(END, start);
      if (end >= 0) text = `${text.slice(0, start)}${SECTION}${text.slice(end + END.length)}`;
    } else {
      const anchor = text.indexOf(ANCHOR);
      if (anchor >= 0) {
        text = `${text.slice(0, anchor).trimEnd()}\n\n${SECTION}\n\n${text.slice(anchor)}`;
      } else {
        const entrega = text.indexOf("\n## ENTREGA");
        text = entrega >= 0
          ? `${text.slice(0, entrega).trimEnd()}\n\n${SECTION}\n${text.slice(entrega)}`
          : `${text.trimEnd()}\n\n${SECTION}`;
      }
    }

    if (text.includes(REVIEW_ANCHOR) && !text.includes(REVIEW_ITEMS.split("\n")[0])) {
      text = text.replace(REVIEW_ANCHOR, `${REVIEW_ANCHOR}\n${REVIEW_ITEMS}`);
    }
    return text;
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
      return typeof defaultFactoryPromptLibrary !== "undefined" && defaultFactoryPromptLibrary && typeof defaultFactoryPromptLibrary === "object"
        ? defaultFactoryPromptLibrary
        : null;
    } catch (_erro) {
      return null;
    }
  }

  function apply({ persist = true } = {}) {
    const alvoState = currentState();
    const defaults = currentDefaults();
    let alterado = false;

    for (const type of TYPES) {
      if (defaults && typeof defaults[type] === "string") {
        const novo = aplicar(defaults[type]);
        if (novo !== defaults[type]) defaults[type] = novo;
      }
      if (!alvoState) continue;
      alvoState.factoryPromptLibrary ||= {};
      const atual = alvoState.factoryPromptLibrary[type];
      if (typeof atual !== "string" || !atual.trim()) continue;
      const novo = aplicar(atual);
      if (novo === atual) continue;
      alvoState.factoryPromptLibraryBackups ||= {};
      alvoState.factoryPromptLibraryBackups[`${type}BeforeLeiDidatica20261018`] ??= atual;
      alvoState.factoryPromptLibrary[type] = novo;
      alvoState.migrations ||= {};
      alvoState.migrations[MIGRATION_ID] ||= new Date().toISOString();
      alterado = true;
    }

    // Salva só quando um prompt salvo mudou: uma vez depois da publicação, não a cada abertura (V623).
    if (persist && alterado) {
      try {
        if (typeof saveData === "function") saveData();
      } catch (_erro) {}
    }
    return { alterado, version: VERSION };
  }

  // O prompt salvo pode ser regravado por outros módulos depois do load (visto na V663). Aplicar também na
  // montagem garante que o texto copiado tenha a seção. Espera a V383 embrulhar a montagem: ela devolve o
  // combinado sem chamar a montagem anterior, então embrulhar antes dela seria inútil.
  function wrapPromptBase() {
    try {
      if (typeof factoryPromptBase !== "function") return false;
      if (factoryPromptBase[BASE_WRAP_MARKER] === VERSION) return true;
      if (!factoryPromptBase[V383_BASE_MARKER]) return false;
      const anterior = factoryPromptBase;
      const wrapped = function(type) {
        const resultado = anterior(type);
        return TYPES.includes(type) ? aplicar(resultado) : resultado;
      };
      Object.defineProperty(wrapped, BASE_WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, V383_BASE_MARKER, { value: anterior[V383_BASE_MARKER] });
      Object.defineProperty(wrapped, "__aldusFactoryLeiDidaticaBaseOriginal", { value: anterior });
      factoryPromptBase = wrapped;
      return true;
    } catch (_erro) {
      return false;
    }
  }

  function install() {
    try {
      apply();
      const base = wrapPromptBase();
      globalThis.__aldusFactoryLeiDidaticaV668 = Object.freeze({
        version: VERSION, migrationId: MIGRATION_ID, types: TYPES, marker: MARKER, heading: HEADING,
        section: SECTION, reviewItems: REVIEW_ITEMS, aplicar, apply, base, updatedAt: new Date().toISOString()
      });
      return base;
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

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VERSION, MIGRATION_ID, TYPES, HEADING, END, SECTION, REVIEW_ITEMS, aplicar };
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installWhenApplicationIsReady, { once: true });
  } else {
    installWhenApplicationIsReady();
  }
  // Como a V663: reaplicar depois dos módulos que remontam prompts no load (V383 e outros).
  window.addEventListener("load", installWhenApplicationIsReady, { once: true });
})();
