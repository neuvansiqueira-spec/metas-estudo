(() => {
  "use strict";

  const PROMPT = `TRANSFORME O ACERVO JURISPRUDENCIAL EM MAPA MENTAL HIERÁRQUICO, COMPLETO E VISUALMENTE ESTÁVEL PARA CÓPIA MANUSCRITA.

## 1. ESCOPO E FONTE EXCLUSIVA

USE EXCLUSIVAMENTE a pasta jurisprudencial indicada pelo roteador deste módulo e todas as suas subpastas.

NÃO condicione a busca à triagem da pasta geral. NÃO use internet, outras pastas, conhecimento externo ou memória do modelo para completar dados.

O tema informado pelo usuário define o recorte. Inclua todo precedente que tenha relação jurídica direta e material com a disciplina, o tema, o recorte, seus institutos correlatos, condições, exceções ou efeitos.

## 2. BUSCA SEMÂNTICA OBRIGATÓRIA EM TRÊS PASSAGENS

Antes de redigir, percorra recursivamente o acervo e execute as três passagens abaixo:

1. BUSCA LITERAL
   - disciplina;
   - tema e recorte;
   - expressões exatas informadas pelo usuário.

2. BUSCA POR VARIAÇÕES
   - sinônimos e flexões;
   - siglas e nomes por extenso;
   - nomenclaturas antigas e atuais;
   - institutos jurídicos equivalentes ou imediatamente relacionados.

3. BUSCA POR CONEXÕES JURISPRUDENCIAIS
   - princípios aplicáveis;
   - requisitos, condições e limites;
   - exceções, distinções e superações;
   - temas de repercussão geral e recursos repetitivos;
   - súmulas, informativos e teses vinculadas;
   - precedentes paradigmáticos do Supremo Tribunal Federal e do Superior Tribunal de Justiça.

Não decida apenas pelo nome do arquivo. Abra e examine o conteúdo de todos os candidatos acessíveis, inclusive compilações e acervos resumidos.

## 3. COBERTURA, RELEVÂNCIA E DEDUPLICAÇÃO

- NÃO imponha limite máximo ou mínimo de julgados.
- Inclua todos os itens diretamente pertinentes e exclua apenas menções incidentais, genéricas ou sem utilidade para o recorte.
- Se a primeira passagem produzir poucos resultados, conclua obrigatoriamente a segunda e a terceira antes de redigir.
- Faça inventário interno de subpastas, arquivos candidatos e itens encontrados.
- Elimine duplicidades usando como chave o processo, o número do tema ou o número da súmula.
- Quando o mesmo item aparecer em várias fontes, una as informações sem repetir o bloco e preserve a formulação mais completa compatível com o acervo.
- Se houver decisões complementares sobre a mesma tese, mantenha-as quando cada uma acrescentar condição, exceção, evolução ou efeito próprio.

## 4. VALIDAÇÃO E FIDELIDADE

Para cada item, confirme no próprio acervo:

- tribunal;
- tipo do item;
- identificação aplicável;
- ano, quando informado;
- tese ou conclusão;
- condições, exceções e efeitos relevantes.

É PROIBIDO inventar, presumir ou completar por memória tribunal, número, ano, tese, fundamento ou resultado.

Quando um dado aplicável não estiver na fonte, escreva NÃO IDENTIFICADO NA FONTE. Quando o campo não se aplicar ao tipo do item, simplesmente não o exiba.

## 5. METADADOS CONFORME O TIPO

### JULGADO

Exiba:

📍 TRIBUNAL: [NOME]
📍 PROCESSO: [CLASSE E NÚMERO]
📍 ANO DA DECISÃO: [AAAA]

### TEMA, REPERCUSSÃO GERAL OU RECURSO REPETITIVO

Exiba apenas os campos aplicáveis:

📍 TRIBUNAL: [NOME]
📍 TEMA: [NÚMERO E CLASSIFICAÇÃO]
📍 PROCESSO PARADIGMA: [CLASSE E NÚMERO, SE INFORMADO]
📍 ANO: [AAAA, SE INFORMADO]

### SÚMULA

Exiba:

📍 TRIBUNAL: [NOME]
📍 ENUNCIADO: SÚMULA [NÚMERO]/[TRIBUNAL]
📍 ANO DE APROVAÇÃO OU PUBLICAÇÃO: [AAAA, SOMENTE SE INFORMADO]

Para súmula, NÃO crie campo PROCESSO e NÃO escreva PROCESSO NÃO IDENTIFICADO, pois esse dado não é aplicável.

### INFORMATIVO OU TESE AUTÔNOMA

Exiba tribunal, identificação oficial disponível e ano apenas quando constarem na fonte. Não converta número de informativo em número de processo.

Padronize o tribunal por extenso na primeira ocorrência, seguido da sigla. Nas ocorrências seguintes, a sigla pode ser usada. Preserve exatamente a classe e o número do processo existentes na fonte.

## 6. ESTRUTURA DO DOCUMENTO

Abra o documento com:

♦️ DISCIPLINA: [NOME]
▶️ TEMA: [TEMA E RECORTE]
MAPA MENTAL DE JURISPRUDÊNCIA

Agrupe os itens por tribunal. Dentro de cada tribunal, ordene por conexão temática e coloque primeiro os precedentes paradigmáticos ou de maior utilidade para o recorte.

Use um bloco autônomo para cada item:

🔹 TESE-CENTRAL EM CAIXA ALTA
   ➜ SUBTESE OU FUNDAMENTO
      • REGRA OU CONCLUSÃO
         ↳ CONDIÇÃO, EXCEÇÃO OU EFEITO
   📍 TRIBUNAL: [NOME]
   📍 IDENTIFICAÇÃO APLICÁVEL: [DADO]
   📍 ANO: [AAAA, QUANDO APLICÁVEL]

O exemplo acima define a hierarquia, mas os rótulos de metadados devem seguir o tipo do item descrito na seção anterior.

## 7. REDAÇÃO E PROFUNDIDADE

- Use palavras-chave, frases curtas e conclusões jurídicas autônomas.
- Preserve todos os núcleos juridicamente relevantes da fonte.
- Transforme construções negativas vagas em enunciados que deixem claro o que é admitido, vedado, condicionado ou excepcionado.
- Não acrescente explicação doutrinária que não esteja no acervo.
- Não repita a mesma tese com palavras diferentes.
- Diferencie com clareza regra, condição, exceção, consequência e efeito processual.
- Preserve divergências entre tribunais ou órgãos julgadores quando estiverem expressas nas fontes.

## 8. AMBIGUIDADES E DIVERGÊNCIAS

Quando a redação da fonte admitir leituras relevantes distintas:

⚠️ AMBIGUIDADE — [PONTO]
   ➜ LEITURA 1: [CONCLUSÃO]
   ➜ LEITURA 2: [CONCLUSÃO]

Quando houver divergência jurisprudencial real:

⚖️ DIVERGÊNCIA JURISPRUDENCIAL
   🔹 POSIÇÃO 1: [TESE + TRIBUNAL + IDENTIFICAÇÃO]
   🔸 POSIÇÃO 2: [TESE + TRIBUNAL + IDENTIFICAÇÃO]
   🎯 DISTINÇÃO: [CRITÉRIO OBJETIVO]

Não force ambiguidade ou divergência quando ela não existir.

## 9. FORMATAÇÃO WORD E PAGINAÇÃO

Gere arquivo Word editável em A4, com:

- fonte Arial, tamanho 11;
- margens de 2 cm;
- espaçamento simples;
- alinhamento à esquerda;
- títulos e nomes de tribunais em azul sóbrio;
- texto principal em preto;
- emojis preservados com Segoe UI Emoji quando necessário;
- sem tabelas, caixas de texto, formas flutuantes, cabeçalho, rodapé ou numeração automática.

REGRAS OBRIGATÓRIAS DE ESTABILIDADE:

- mantenha todo o texto dentro da área imprimível;
- não use recuo esquerdo negativo;
- não use recuo especial que projete marcadores ou emojis para fora da margem;
- permita que o corpo de um item se divida naturalmente entre páginas;
- use manter com o próximo apenas em títulos e somente para prender o título à primeira linha útil subsequente;
- não marque todos os parágrafos como manter com o próximo ou manter linhas juntas;
- não use blocos de altura fixa;
- não insira quebra de página automática entre itens;
- se um título ficar isolado no fim da página, mova apenas o título e a primeira linha do conteúdo.

## 10. CONTROLE DE RESULTADO NEGATIVO

Somente declare ausência de jurisprudência depois de concluir as três passagens, abrir todos os candidatos acessíveis e revisar as variações terminológicas.

Se nenhum item pertinente for localizado, não gere mapa vazio. Entregue relatório curto com:

- subpastas examinadas;
- quantidade de arquivos candidatos abertos;
- termos e variações pesquisados;
- limitações de acesso ou leitura.

Falha de acesso, paginação incompleta, indexação vazia ou leitura parcial não provam inexistência de jurisprudência.

## 11. REVISÃO FINAL OBRIGATÓRIA

Antes da entrega:

1. confira se todos os itens pertinentes encontrados foram incluídos;
2. confira deduplicação e metadados conforme o tipo;
3. verifique se nenhuma informação foi completada fora da fonte;
4. renderize e inspecione todas as páginas;
5. corrija cortes laterais, sobreposições, títulos órfãos e espaços em branco superiores a meia página causados por paginação;
6. repita a renderização após qualquer correção.

## 12. ENTREGA

- Gere somente o módulo JURISPRUDÊNCIA.
- Gere um único arquivo Word editável.
- Nome: MAPA_MENTAL_JURISPRUDENCIAS_[FILTRO].docx
- Não gere consolidação final nem módulos de resumo, lei ou peça.
- Salve no destino indicado apenas quando houver ferramenta autorizada e devolva o link exato do arquivo criado.
- Se o upload não ocorrer, forneça o Word para download e informe que o envio ao destino ficou pendente.`.trim();

  const MIGRATION_ID = "factoryJurisprudenciaBuscaSemanticaVisualV331";
  const PREVIOUS_OFFICIAL_MARKERS = [
    "TRANSFORME JURISPRUDÊNCIAS EM MAPA MENTAL HIERÁRQUICO DE PALAVRAS-CHAVE PARA CÓPIA MANUSCRITA.",
    "USE APENAS AS FONTES CLASSIFICADAS COMO JURISPRUDÊNCIA NA TRIAGEM.",
    "NÃO OMITA TRIBUNAL, PROCESSO OU ANO.",
    "## DIVERGÊNCIA JURISPRUDENCIAL",
    "MAPA_MENTAL_JURISPRUDENCIAS_[FILTRO].docx"
  ];
  const LEGACY_MARKERS = [
    "* ANO, SE DISPONÍVEL;",
    "SE TRIBUNAL, INFORMATIVO, NÚMERO OU ANO NÃO ESTIVEREM DISPONÍVEIS, OMITA A LINHA CORRESPONDENTE.",
    "NÃO INFORME:\n\n* NÚMERO DO PROCESSO;"
  ];

  function isPreviousOfficialPrompt(value) {
    const text = String(value || "").trim();
    if (!text || text === FACTORY_LIBRARY_FALLBACK || text === PROMPT) return true;
    const isV231 = PREVIOUS_OFFICIAL_MARKERS.every((marker) => text.includes(marker));
    const isOlderOfficial = text.includes("TRANSFORME JURISPRUDÊNCIAS EM MAPA MENTAL")
      && LEGACY_MARKERS.some((marker) => text.includes(marker));
    return isV231 || isOlderOfficial;
  }

  function install() {
    if (typeof defaultFactoryPromptLibrary === "undefined" || typeof state === "undefined") return;

    defaultFactoryPromptLibrary.jurisprudencia = PROMPT;
    state.migrations = state.migrations || {};
    state.factoryPromptLibrary = state.factoryPromptLibrary || {};
    state.factoryPromptLibraryBackups = state.factoryPromptLibraryBackups || {};

    const current = String(state.factoryPromptLibrary.jurisprudencia || "").trim();
    if (isPreviousOfficialPrompt(current)) {
      if (current && current !== PROMPT && current !== FACTORY_LIBRARY_FALLBACK) {
        state.factoryPromptLibraryBackups.jurisprudenciaBeforeV331 = current;
      }
      state.factoryPromptLibrary.jurisprudencia = PROMPT;
    }

    state.migrations[MIGRATION_ID] = true;
    state.factoryPromptLibrary = normalizeFactoryPromptLibrary(state.factoryPromptLibrary);
    if (typeof saveData === "function") saveData();

    const previousPromptBase = factoryPromptBase;
    factoryPromptBase = function factoryPromptBaseV331(type) {
      if (type !== "jurisprudencia") return previousPromptBase(type);
      const text = String(state.factoryPromptLibrary?.jurisprudencia || "").trim();
      return text || PROMPT;
    };

    console.info("[Aldus Meta] Prompt de jurisprudência V331 ativo.");
  }

  if (window.__aldusBootstrapReady) install();
  else window.addEventListener("aldus:bootstrap-ready", install, { once: true });
})();
