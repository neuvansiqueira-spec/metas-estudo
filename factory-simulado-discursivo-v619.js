/* Simulado de peças e discursivas de Delegado (Cebraspe e FGV) na Fábrica de Resumos — v619 (revisão v620).
   Gera um prompt para o ChatGPT/Claude elaborar a prova inédita no padrão da banca, gerar o PDF das folhas de
   resposta com o timbre do Aldus e, depois, corrigir as fotos das respostas manuscritas pelo padrão de resposta/espelho
   da mesma banca. Base: provas, padrões de resposta e espelhos de Delegado 2021-2026 baixados dos sites da Cebraspe e da
   FGV (pasta "PROVAS DISCURSIVAS E PEÇAS - DELEGADO - CEBRASPE E FGV (2021-2026)" no Drive) e editais PC-MA 2026,
   PC-DF 2026, PC-PR 2026 e PC-PI 2025. Sem persistência, sem observadores e sem trabalho contínuo. */
(() => {
  "use strict";

  const VERSION = "20260916-simulado-posicao-fixa-v624";
  const SECTION_ID = "factorySimuladoDiscursivoV619";
  // V624 — o painel fica na Fábrica, logo depois do painel "Biblioteca de prompts" (factory-simple-v163), e não dentro dele.
  const LIBRARY_PANEL_ID = "factoryPromptPanelV163";
  const API_MARKER = "__ALDUS_FACTORY_SIMULADO_DISCURSIVO_V619__";

  const SORTEIO = "Sorteio pela recorrência da banca";
  const PECA_GRUPOS = [
    {
      rotulo: "Representações ao Judiciário",
      itens: {
        preventiva: "Representação por prisão preventiva",
        temporaria: "Representação por prisão temporária",
        conversaoFlagrante: "Representação pela conversão da prisão em flagrante em preventiva",
        cautelaresDiversas: "Representação por medidas cautelares diversas da prisão (art. 319 do CPP)",
        busca: "Representação por busca e apreensão (podendo cumular medidas cautelares diversas da prisão)",
        interceptacao: "Representação por interceptação telefônica ou telemática",
        captacaoAmbiental: "Representação por captação ambiental (art. 8º-A da Lei nº 9.296/1996)",
        quebraSigilo: "Representação por quebra de sigilo de dados bancário, fiscal, telefônico ou telemático",
        dadosCelular: "Representação por acesso aos dados de aparelho celular apreendido",
        infiltracao: "Representação por infiltração de agentes, inclusive virtual",
        acaoControlada: "Representação por ação controlada ou não atuação policial",
        colaboracao: "Representação pela homologação de acordo de colaboração premiada",
        medidasAssecuratorias: "Representação por medidas assecuratórias (sequestro, arresto ou hipoteca legal)",
        medidasProtetivas: "Pedido de medidas protetivas de urgência (art. 12, III, da Lei nº 11.340/2006)",
        conducaoCoercitiva: "Representação por condução coercitiva para reconhecimento pessoal",
        identificacaoCriminal: "Representação por identificação criminal e coleta de perfil genético (Lei nº 12.037/2009)",
        insanidadeMental: "Representação pela instauração de incidente de insanidade mental (art. 149, § 1º, do CPP)",
        dilacaoPrazo: "Pedido de dilação do prazo do inquérito policial (art. 10, § 3º, do CPP)"
      }
    },
    {
      rotulo: "Peças administrativas e procedimentais",
      itens: {
        portariaIp: "Portaria de instauração de inquérito policial, com diligências e representações",
        despachoApf: "Despacho de ratificação e conclusão do auto de prisão em flagrante, com providências",
        naoRatificacao: "Despacho de não ratificação da voz de prisão em flagrante, com liberação do conduzido",
        autoPrisao: "Auto de prisão em flagrante delito",
        indiciamento: "Despacho de indiciamento (art. 2º, § 6º, da Lei nº 12.830/2013)",
        relatorioFinal: "Relatório final de inquérito policial",
        tco: "Termo circunstanciado de ocorrência (Lei nº 9.099/1995)",
        fianca: "Despacho de arbitramento de fiança pela autoridade policial (art. 322 do CPP)",
        vpi: "Despacho de verificação da procedência das informações (notícia anônima)",
        indeferimentoIp: "Despacho de indeferimento de requerimento de instauração de inquérito (art. 5º, § 2º, do CPP)",
        requisicaoDados: "Requisição de dados, documentos e informações (art. 2º, § 2º, da Lei nº 12.830/2013)",
        atoInfracional: "Auto de apreensão em flagrante de ato infracional (art. 173 do ECA)",
        portariaPad: "Portaria de instauração de sindicância ou de processo administrativo disciplinar"
      }
    }
  ];
  const PECAS = Object.freeze(Object.assign({ sorteio: SORTEIO }, ...PECA_GRUPOS.map((grupo) => grupo.itens)));

  const COMPOSICOES = {
    completa: "Prova completa do modelo",
    peca: "Somente a peça",
    questoes: "Somente as questões"
  };

  const MODELS = {
    CEBRASPE: [
      {
        id: "pcma26",
        label: "PC-MA 2026 — 4 questões (15 linhas) + peça (60 linhas)",
        fonte: "Edital nº 1/2026 da PC-MA, subitens 9.1 e 9.7",
        questoes: { quantidade: 4, linhas: "até 15 linhas", maxLinhas: 15, valor: "5,00 pontos" },
        peca: { linhas: "até 60 linhas", maxLinhas: 60, valor: "20,00 pontos", nome: "peça prático-profissional" },
        disciplinas: "Grupos II e III do edital: Direito Administrativo, Direito Constitucional, Medicina Legal, Direitos Humanos, Direito Penal, Direito Processual Penal, Legislação Penal e Processual Penal Especial e Criminologia",
        regras: [
          "Total da prova discursiva: 40,00 pontos (4 questões de 5,00 + peça de 20,00); duração de 4 horas; manuscrita com caneta preta.",
          "Nota de cada questão: NQ = NC − NE ÷ TL. Nota da peça: NPP = NC − 4 × NE ÷ TL. NC = domínio do conteúdo (inclui apresentação e estrutura textual); NE = número de erros; TL = linhas efetivamente escritas.",
          "NPD = NQ1 + NQ2 + NQ3 + NQ4 + NPP. Aprovação: NPD ≥ 20,00.",
          "Duas correções de conteúdo por examinadores distintos; notas convergentes quando diferem até 25% do máximo."
        ],
        formulas: "NQ = NC − NE ÷ TL em cada questão; NPP = NC − 4 × NE ÷ TL na peça",
        aprovacao: "NPD ≥ 20,00 de 40,00",
        pecasPermitidas: null
      },
      {
        id: "pcdf26",
        label: "PC-DF 2026 — 3 questões (30 linhas) + peça (90 linhas)",
        fonte: "Edital de Delegado da PC-DF 2026, subitens 10.1, 10.7 e 10.8",
        questoes: { quantidade: 3, linhas: "até 30 linhas", maxLinhas: 30, valor: "10,00 pontos" },
        peca: { linhas: "até 90 linhas", maxLinhas: 90, valor: "30,00 pontos", nome: "peça relativa à atividade de polícia judiciária" },
        disciplinas: "disciplinas do edital; em 2026 caíram Direito Constitucional, Direito Administrativo (responsabilidade civil do Estado e regime disciplinar da Lei nº 15.047/2024), Legislação Penal Especial e Processo Penal",
        regras: [
          "P2: 3 questões de 10,00 pontos; P3: peça de 30,00 pontos. Total: 60,00 pontos.",
          "Nota de cada questão: NQ = NC − 2 × NE ÷ TL. Nota da peça: NPP = NC − 6 × NE ÷ TL.",
          "NPD = NQ1 + NQ2 + NQ3 + NPP. Aprovação: NPD ≥ 36,00.",
          "Consulta permitida apenas à legislação não comentada, não anotada e não comparada."
        ],
        formulas: "NQ = NC − 2 × NE ÷ TL em cada questão; NPP = NC − 6 × NE ÷ TL na peça",
        aprovacao: "NPD ≥ 36,00 de 60,00",
        pecasPermitidas: null
      }
    ],
    FGV: [
      {
        id: "pcpr26",
        label: "PC-PR 2026 — 4 questões (20 linhas) + peça cautelar (60 linhas)",
        fonte: "Edital nº 01/2026 da PC-PR, subitens 10.5 a 10.13",
        questoes: { quantidade: 4, linhas: "até 20 linhas", maxLinhas: 20, valor: "15 pontos" },
        peca: { linhas: "até 60 linhas", maxLinhas: 60, valor: "40 pontos", nome: "peça prática-profissional" },
        disciplinas: "uma questão de cada: Direito Penal; Direito Processual Penal; Legislação Penal e Processual Penal Extravagantes; Direito Constitucional",
        regras: [
          "Total: 100 pontos (4 questões de 15 + peça de 40); duração de 5 horas.",
          "A peça é medida cautelar usualmente elaborada por Delegado: representação por prisão (temporária ou preventiva), busca e apreensão, interceptação telefônica, telemática ou ambiental, quebra de sigilo de dados financeiro, bancário, fiscal, telefônico ou telemático.",
          "Critérios do edital: a) compreensão/conhecimento do conteúdo e propriedade da resposta; b) argumentação apropriada, relevante e suficiente; c) fundamentação legal; d) uso correto do vernáculo.",
          "Nota prejudicada proporcionalmente em abordagem tangencial, parcial ou diluída em divagações ou colagem de textos.",
          "Nota zero: fuga ao tema; forma diversa da exigida; desenhos, números, versos ou espaçamento excessivo; lápis ou em branco; letra ilegível; extensão inferior ao mínimo ou superior ao máximo de linhas.",
          "Consulta permitida à legislação seca, sem anotações, jurisprudência, súmulas ou roteiros de peças. Aprovação: mínimo de 50 pontos."
        ],
        aprovacao: "mínimo de 50 de 100 pontos",
        pecasPermitidas: ["preventiva", "temporaria", "busca", "interceptacao", "captacaoAmbiental", "quebraSigilo"]
      },
      {
        id: "pcpi25",
        label: "PC-PI 2025 — 3 questões (20 a 30 linhas) + peça (120 linhas)",
        fonte: "Edital nº 01/2025 da PC-PI, subitens 9.21 a 9.32",
        questoes: { quantidade: 3, linhas: "entre 20 e 30 linhas", maxLinhas: 30, minLinhas: 20, valor: "15 pontos" },
        peca: { linhas: "até 120 linhas", maxLinhas: 120, valor: "55 pontos", nome: "peça profissional" },
        disciplinas: "todas as disciplinas da prova objetiva (no caderno aplicado: Direito Penal, Direito Processual Penal e Direito Constitucional)",
        regras: [
          "Total: 100 pontos (3 questões de 15 + peça de 55); duração de 5 horas; sem consulta.",
          "Critérios do edital: conhecimento jurídico, raciocínio lógico, clareza, coerência, coesão textual, correção gramatical, argumentação e adequação da peça aos requisitos técnicos e legais.",
          "Nota prejudicada proporcionalmente em abordagem tangencial, parcial ou diluída; nota zero para texto em branco ou escrito de forma diversa da exigida.",
          "Aprovação: pelo menos 25 pontos na peça e 30 na soma das questões, sem nota zero em nenhuma delas."
        ],
        aprovacao: "≥ 25 na peça e ≥ 30 nas questões, sem nota zero",
        pecasPermitidas: null
      }
    ]
  };

  const PERFIL = {
    CEBRASPE: `PADRÃO CEBRASPE (extraído dos cadernos e padrões definitivos de resposta de Delegado de 2021 a 2026: PF 2021 e 2025, PC-PB, PC-RJ, PC-AL, PC-RO, PC-ES, PC-PE, PC-CE e PC-DF)
Enunciados
- Instruções do caderno: só vale o texto no local próprio do caderno definitivo; o que passar do limite de linhas é desconsiderado; qualquer marca identificadora anula; na peça, se quiser assinar, somente "Delegado de Polícia".
- Questão: situação hipotética curta (3 a 10 linhas) ou comando direto; pede "texto dissertativo" e lista aspectos numerados (1, 2, 3...), cada um com [valor: x,xx ponto(s)]. A soma dos aspectos é o valor da questão menos 5%, reservados à apresentação e à estrutura textual.
- O comando declara a base exigida: "com fundamento na Constituição Federal e no entendimento do STF", "jurisprudência dos tribunais superiores", "doutrina majoritária" ou lei específica.
- Peça: situação-problema longa e densa, com fatos que exigem identificar a medida e enfrentar teses; comando típico: "na qualidade de delegado de polícia responsável, elabore a peça cabível / formule a representação pela medida mais adequada, abordando toda a matéria de direito pertinente. Dispense o relatório e não crie fatos novos."
Correção
- Padrão de resposta = texto-modelo com os elementos essenciais marcados (i), (ii), (iii)... seguido de QUESITOS AVALIADOS, cada quesito com escala de conceitos: Conceito 0 (não abordou ou abordou de forma totalmente equivocada), Conceito 1 (mencionou corretamente apenas um dos aspectos), e assim por diante até o conceito máximo (abordou todos). A nota do quesito é proporcional ao conceito.
- Na peça há quesito de identificação e estrutura ("identificou a peça como ... e incluiu todos os elementos essenciais: endereçamento/introdução, fundamentação jurídica, pedidos ou providências, fecho"), quesitos de tipificação (crime, qualificadoras, causas de aumento, concurso) e quesitos de providências ou pedidos enumerados, pontuados pela quantidade de itens corretos.
- O padrão registra teses alternativas aceitas ("será aceito...", "não será apenado o candidato que...").
- Só pontua o que está expresso e correto; menção genérica sem o elemento exigido fica no conceito inferior.
- A nota de conteúdo (NC) inclui apresentação (legibilidade, margens, parágrafos) e estrutura textual, até 5% do valor. A modalidade escrita é avaliada pelo número de erros (NE) de grafia, morfossintaxe e propriedade vocabular, dividido pelas linhas efetivamente escritas (TL), conforme a fórmula do edital.`,
    FGV: `PADRÃO FGV (extraído dos cadernos e espelhos de correção de Delegado de 2021 a 2026: PC-RN, PC-AM, PC-SC, PC-MG e PC-PI; regras do edital da PC-PR 2026)
Enunciados
- Situações hipotéticas com nomes e entes genéricos (Estado Alfa, Município Beta, Lei nº X, circunscrição W); comando em alíneas A), B), C) (às vezes B1, B2), cada uma exigindo resposta objetiva e fundamentada "à luz da jurisprudência dos Tribunais Superiores", "do STJ" ou "do STF" e "do entendimento doutrinário prevalecente".
- É frequente uma alínea conceitual desvinculada do caso ("Conceitue e diferencie...", "Indique os requisitos...").
- Cobra jurisprudência recente (informativos do ano anterior à prova) e alterações legislativas recentes.
- O caderno informa, em cada questão, o valor total e o máximo de linhas.
- Peça: a FGV NÃO nomeia a peça. Comando típico: "À luz do caso concreto, apresente, na qualidade de Delegado de Polícia, a peça jurídica cabível. Enfrente todos os pontos de direito material e de direito processual, explícita e implicitamente abordados no enunciado." Pode fixar a data de confecção e dados da comarca.
Correção (espelho)
- Espelho por itens, cada um com valor máximo e faixas (0,00; 0,50; 1,00...), ou pontuação por elemento (por exemplo, 1 ponto por tipo penal corretamente indicado).
- Peça: item de "correta identificação da peça" com peso alto (PC-SC: 4 de 30; PC-PI: até 15 de 55, com o preâmbulo), itens de tipificação completa, de afastamento das teses defensivas implícitas, de requisitos da medida, de providências listadas e de "local, data e Delegado de Polícia".
- Item final de linguagem: "capacidade de raciocínio lógico, clareza, coerência, coesão textual e correção gramatical" (de 1 a 3 pontos numa questão de 15; até 5 numa peça de 55).
- Fundamentação: o espelho indica artigos de lei, súmulas, temas repetitivos e informativos; resposta sem fundamento legal fica na faixa inferior.`
  };

  const RECORRENCIA = {
    CEBRASPE: `RECORRÊNCIA CEBRASPE 2021–2026 (Delegado; 10 provas discursivas com padrão definitivo; anos dos editais)
Peças cobradas (7):
- Representação por cautelar pessoal (preventiva, conversão do flagrante em preventiva ou cautelares diversas): PC-PE 2023, PC-CE 2025 e PC-DF 2026.
- Portaria de instauração de inquérito policial, com diligências e representações (busca, interceptação, preventiva, afastamento da função): PC-PB 2021 e PC-RO 2022.
- Despacho de auto de prisão em flagrante, com fundamentos e providências: PF 2025.
- Representação por meio de obtenção de prova: infiltração virtual de agente (PF 2021); busca e apreensão domiciliar (PC-CE 2025, cumulada com cautelares diversas).
- Constantes: juízo de cabimento de cautelar pessoal em 5 das 7 peças; tipificação completa em todas; armadilha de cabimento (ausência de flagrante porque o pagamento era exaurimento — PC-PB; crime de ação privada sem requerimento — PC-RO; preventiva vedada porque a pena máxima não passa de 4 anos — PC-CE).
- PC-AL 2022 e PC-RJ 2021 não tiveram peça; a PC-ES 2022 trocou a peça por uma questão de situação-problema (tipificação).
Temas mais cobrados nas questões (ocorrências):
- teoria do crime (culpa e culpabilidade, erro de proibição e de tipo permissivo, excesso, domínio do fato, concurso de pessoas, omissão): 6;
- prisão, flagrante, prisão temporária, inquérito, indiciamento e habeas corpus para trancamento: 5;
- responsabilidade civil do Estado, regime disciplinar, PAD e falta grave na execução: 5;
- Estatuto do Desarmamento (uso restrito, numeração raspada, arma herdada, disparo): 4;
- controle de constitucionalidade de lei estadual e liberdades (imprensa, expressão): 4;
- poder de polícia, segurança pública e guarda municipal: 3;
- lei penal no tempo (estelionato após o Pacote Anticrime, hediondez do porte de uso restrito, retroatividade da Lei de Improbidade): 3;
- provas (celular e acesso a dados, cadeia de custódia, DNA): 3;
- inviolabilidade de domicílio e buscas; violência contra a mulher; crimes contra a administração pública; prescrição; imunidades e foro: 2 cada.`,
    FGV: `RECORRÊNCIA FGV 2021–2026 (Delegado; 5 provas discursivas com espelho; anos dos editais; a da PC-PR 2026 ainda não foi aplicada)
Peças cobradas (4):
- Despacho no auto de prisão em flagrante, com tipificação, providências e representação pela conversão em preventiva: PC-RN 2020 e PC-SC 2023.
- Representação por prisão temporária (crime hediondo, prazo de 30 + 30 dias): PC-PI 2025.
- Representação por condução coercitiva para reconhecimento pessoal (art. 226 do CPP; ADPFs 395 e 444; prisão direta incabível sem prova da autoria): PC-AM 2021.
- A PC-MG 2024 não teve peça (8 questões de 20 linhas).
- Constantes: peça não nomeada no enunciado; identificação correta com peso alto; teses defensivas implícitas a afastar (flagrante forjado, abordagem sem fundada suspeita, alegação de usuário); tipificação com todas as qualificadoras, majorantes, hediondez e concurso de crimes; afastamento de imputação indevida (por exemplo, receptação de quem é o próprio autor do roubo).
Temas mais cobrados nas questões (ocorrências):
- inviolabilidade de domicílio e buscas (domiciliar, pessoal, veicular, sem mandado): 4;
- prisão em flagrante e fiança (vedação, arbitramento, espécies de flagrante): 4;
- provas (ilícita e ilegítima, interceptação, encontro fortuito, reconstituição, celular): 4;
- teoria do crime (omissão imprópria, consumação, tentativa, crime impossível): 4;
- crimes em espécie (organização criminosa e milícia, furto e roubo, estupro, favorecimento pessoal): 4;
- Lei Maria da Penha (ameaça, descumprimento de medida protetiva, prazo das medidas, violência psicológica): 3;
- foro por prerrogativa de função e imunidades: 3;
- teoria constitucional (eficácia das normas, repristinação, restrição de direitos fundamentais, competência legislativa): 3;
- guarda municipal e segurança pública; direito administrativo (PAD, publicidade, decisão coordenada): 2 cada.`
  };

  const ESTRUTURA_PECAS = `ESTRUTURA QUE OS PADRÕES E ESPELHOS EXIGEM, POR TIPO DE PEÇA
- Representação (prisão, cautelares, busca, interceptação, captação ambiental, quebra de sigilo, infiltração e demais pedidos ao juízo): endereçamento ao juízo competente; referência ao inquérito; preâmbulo com a atribuição (art. 144, § 4º, da CF, Lei nº 12.830/2013 e CPP) e a medida; fatos só quando o enunciado não os dispensar; fundamentos (materialidade e indícios de autoria, requisitos legais específicos da medida, necessidade, adequação e subsidiariedade, contemporaneidade); pedidos (medida, prazo, sigilo, oitiva do Ministério Público); local, data e "Delegado de Polícia".
- Despacho no auto de prisão em flagrante: situação de flagrância e sua espécie; tipificação completa; ratificação ou homologação; fiança ou vedação; providências (nota de culpa, ciência das garantias, comunicação em 24 horas ao juiz, ao Ministério Público e, sem advogado, à Defensoria, exames de corpo de delito, apreensões e laudos, identificação, informação sobre filhos, representação pela conversão em preventiva quando cabível); local, data e "Delegado de Polícia".
- Portaria de instauração: autoridade e fundamento legal; fatos em tese e tipificação; "resolve instaurar"; diligências numeradas; representações ao juízo quando cabíveis; cumpra-se; local, data e "Delegado de Polícia".
- Demais peças administrativas: sigam a estrutura legal própria. Relatório final: diligências realizadas, materialidade, autoria, tipificação, indiciamento e remessa ao juízo (art. 10, §§ 1º e 2º, do CPP). Indiciamento: ato fundamentado com autoria, materialidade e circunstâncias (art. 2º, § 6º, da Lei nº 12.830/2013). Termo circunstanciado: fato, autor, vítima, testemunhas, compromisso de comparecimento e encaminhamento ao Juizado (art. 69 da Lei nº 9.099/1995). Portaria disciplinar: autoridade, fato, servidor, dispositivos infringidos em tese, comissão e prazo.`;

  const TIMBRE_ALDUS = `Timbre do Aldus no alto de todas as páginas: à esquerda, o símbolo do Aldus Meta; ao lado, "ALDUS META" em azul-marinho #061C33, negrito, e abaixo "Metas de Estudo" em dourado #DFB64C; à direita, em corpo menor, "Simulado discursivo — Delegado de Polícia", a banca, o modelo de prova e a data; um filete dourado #DFB64C separando o timbre do corpo da folha.
- Símbolo do Aldus Meta, desenhado em coordenadas vetoriais num quadro de 512 × 512 (origem no canto superior esquerdo): quadrado branco com cantos de raio 112 e contorno cinza-claro; letra "A" azul-marinho #0A2C66 formada pelo polígono (256,42) (477,458) (370,398) (256,176) (142,398) (35,458); dentro do "A", uma gota branca de (256,195) a (256,470), com largura máxima de cerca de 150; no centro da gota, estrela azul #3F73ED de quatro pontas com os vértices (256,255) (275,301) (321,320) (275,339) (256,385) (237,339) (191,320) (237,301). Reduza o símbolo para cerca de 14 mm de altura.`;

  const config = {
    banca: "CEBRASPE",
    modelo: "pcma26",
    composicao: "completa",
    peca: "sorteio",
    tema: "",
    open: false
  };
  let lastPrompt = "";

  function text(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeBanca(value) {
    return text(value).toUpperCase() === "FGV" ? "FGV" : "CEBRASPE";
  }

  function modelFor(banca, id) {
    const list = MODELS[normalizeBanca(banca)];
    return list.find((model) => model.id === id) || list[0];
  }

  function pecasSorteio(model) {
    return Array.isArray(model.pecasPermitidas) ? model.pecasPermitidas.filter((key) => PECAS[key]) : [];
  }

  function foraDoEdital(model, peca) {
    return peca !== "sorteio" && Array.isArray(model.pecasPermitidas) && !model.pecasPermitidas.includes(peca);
  }

  function normalizeOptions(options = {}) {
    const banca = normalizeBanca(options.banca);
    const model = modelFor(banca, options.modelo);
    const composicao = COMPOSICOES[options.composicao] ? options.composicao : "completa";
    const peca = Object.prototype.hasOwnProperty.call(PECAS, options.peca) ? options.peca : "sorteio";
    return { banca, model, composicao, peca, tema: text(options.tema).slice(0, 300) };
  }

  function formatDate(date) {
    try {
      return new Intl.DateTimeFormat("pt-BR").format(date instanceof Date ? date : new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function composicaoText(model, composicao) {
    const questoes = `${model.questoes.quantidade} questões discursivas, ${model.questoes.linhas}, ${model.questoes.valor} cada`;
    const peca = `1 ${model.peca.nome}, ${model.peca.linhas}, ${model.peca.valor}`;
    if (composicao === "peca") return `somente ${peca}`;
    if (composicao === "questoes") return `somente ${questoes}`;
    return `${questoes} + ${peca}`;
  }

  function pecaText(banca, model, peca, composicao) {
    if (composicao === "questoes") return "não haverá peça neste simulado.";
    if (peca !== "sorteio") {
      const base = banca === "FGV"
        ? `${PECAS[peca]}. Não revele o nome da peça no enunciado: a identificação faz parte da avaliação, como na FGV.`
        : `${PECAS[peca]}. O comando pode indicar a medida ("formule a representação pela medida mais adequada") ou pedir "a peça cabível", como a Cebraspe faz.`;
      return foraDoEdital(model, peca)
        ? `${base} Atenção: esta peça não está no rol do edital do modelo ${model.label.split(" — ")[0]}; foi escolhida por mim para treino, então mantenha as demais regras do modelo (linhas, valor e correção).`
        : base;
    }
    const restricao = pecasSorteio(model).length
      ? ` Escolha somente entre as medidas previstas no edital deste modelo: ${pecasSorteio(model).map((key) => PECAS[key].toLowerCase()).join("; ")}.`
      : "";
    return `escolha pela recorrência da banca indicada abaixo, sem me dizer qual é.${restricao}`;
  }

  function elaboracaoText(banca, model, composicao) {
    const questoes = banca === "FGV"
      ? `- Questões: situação hipotética com entes genéricos e alíneas A), B), C); ao menos uma alínea conceitual; indique abaixo de cada questão "Valor: ${model.questoes.valor.replace(" pontos", "")} pontos" e o limite de linhas (${model.questoes.linhas}). Distribua as disciplinas conforme o modelo.`
      : `- Questões: situação hipotética ou comando direto, pedindo "texto dissertativo" com aspectos numerados e [valor: x,xx ponto(s)] em cada aspecto; a soma dos aspectos é ${model.questoes.valor} menos 5% (apresentação e estrutura textual). Informe o limite de ${model.questoes.linhas}.`;
    const peca = banca === "FGV"
      ? `- Peça: situação-problema densa (de 20 a 40 linhas de enunciado), com dados que exijam identificar a peça, tipificar por completo, enfrentar teses implícitas e indicar providências; termine com o comando típico da FGV, sem nomear a peça, e com o limite de ${model.peca.linhas} e o valor de ${model.peca.valor}.`
      : `- Peça: situação-problema densa (de 20 a 40 linhas de enunciado), com dados que exijam identificar a medida, tipificar por completo, avaliar o cabimento da cautelar e indicar providências; termine com o comando típico da Cebraspe ("dispense o relatório e não crie fatos novos"), o limite de ${model.peca.linhas} e o valor de ${model.peca.valor}.`;
    const partes = [];
    if (composicao !== "peca") partes.push(questoes);
    if (composicao !== "questoes") partes.push(peca);
    return partes.join("\n");
  }

  function paginasPeca(maxLinhas) {
    const paginas = [];
    for (let inicio = 1; inicio <= maxLinhas; inicio += 30) paginas.push(`${inicio}–${Math.min(inicio + 29, maxLinhas)}`);
    return paginas;
  }

  function folhasPdfText(banca, model, composicao, date) {
    const nomeFolha = banca === "FGV" ? "FOLHA DE TEXTOS DEFINITIVOS" : "CADERNO DE TEXTOS DEFINITIVOS";
    const rodape = banca === "FGV"
      ? "Não assine nem rubrique as folhas. Só o texto escrito dentro das linhas será avaliado."
      : "Não se identifique. Na peça, se quiser assinar, use apenas “Delegado de Polícia”. O texto além da última linha não será avaliado.";
    const itens = [];
    if (composicao !== "peca") {
      const minimo = model.questoes.minLinhas ? `, com a marca "mínimo de ${model.questoes.minLinhas} linhas" no cabeçalho` : "";
      itens.push(`- ${model.questoes.quantidade} folhas de questão (QUESTÃO 1 a QUESTÃO ${model.questoes.quantidade}), uma por página, cada uma com linhas numeradas de 1 a ${model.questoes.maxLinhas}${minimo};`);
    }
    if (composicao !== "questoes") {
      const paginas = paginasPeca(model.peca.maxLinhas);
      itens.push(`- a PEÇA com ${model.peca.maxLinhas} linhas numeradas em sequência contínua, em ${paginas.length} página(s) de até 30 linhas (linhas ${paginas.join(", ")}), cada página identificada como "PEÇA — página x/${paginas.length}";`);
    }
    const arquivo = `ALDUS_Folhas_de_Resposta_${banca}_${model.id.toUpperCase()}_${formatDate(date).replaceAll("/", "-")}.pdf`;
    return `ARQUIVO PDF DAS FOLHAS DE RESPOSTA (gere junto com a prova)
- Gere um arquivo PDF para impressão, em A4 retrato, com as folhas de resposta no formato das folhas de textos definitivos da ${banca}:
${itens.join("\n")}
- Em cada página: margens de 1,5 cm; linhas pautadas finas em cinza, com altura de 7 mm, para escrita à mão (30 linhas cabem numa página A4 junto com o timbre); número de cada linha na margem esquerda; nenhum outro espaço de escrita além das linhas.
- ${TIMBRE_ALDUS}
- Abaixo do timbre, em cada página: "${nomeFolha}", a identificação do item (QUESTÃO n ou PEÇA — página x/y), o valor e o limite de linhas, e o campo "Linhas efetivamente escritas: ____".
- Rodapé de todas as páginas: "Aldus Meta • Folha x de y" e o lembrete da banca: "${rodape}"
- Não coloque nas folhas enunciados, respostas, dicas, gabarito ou marcas de correção.
- Nome do arquivo: ${arquivo}. Se não conseguir gerar o arquivo nesta conversa, avise em uma linha, descreva o formato das folhas e siga com a prova.`;
  }

  function correcaoNotaText(banca, model) {
    if (banca === "FGV") {
      return `- Para cada item do espelho, indique a faixa atribuída, a justificativa com referência às linhas do meu texto e a pontuação. Aplique o item final de linguagem e as regras do modelo (nota prejudicada por abordagem tangencial, parcial ou diluída; nota zero nas hipóteses do edital).
- Peça: se eu tiver identificado a peça errada, zere o item de identificação e pontue os demais itens somente no que coincidir com o espelho da peça correta.`;
    }
    return `- Para cada quesito, indique o conceito atribuído, a justificativa com referência às linhas do meu texto e a pontuação proporcional (conceito obtido ÷ conceito máximo × valor do quesito). Some a apresentação e a estrutura textual (até 5% do valor) para obter NC.
- Modalidade escrita: liste cada erro com linha, trecho e tipo (grafia, morfossintaxe ou propriedade vocabular) e totalize NE por texto. Aplique as fórmulas do modelo: ${model.formulas}. Nota negativa vira zero; fuga ao tema ou ausência de texto, zero.
- Peça: se eu tiver elaborado peça diversa da cabível, atribua conceito 0 no quesito de identificação e estrutura e pontue os demais quesitos somente no que coincidir com o padrão.`;
  }

  // V624 — prompt da PC-PR 2026 com o texto que ele definiu; só os campos entre colchetes vêm do formulário.
  const CONFIGURACAO_PCPR = { completa: "PROVA COMPLETA", peca: "SOMENTE PEÇA", questoes: "SOMENTE QUESTÕES" };

  function buildPromptPcpr26({ composicao, peca, tema }, date) {
    const data = formatDate(date);
    const pecaSelecionada = composicao === "questoes" ? "não se aplica (somente questões)" : PECAS[peca];
    const linhaTema = tema ? `\nTema: ${tema}` : "";
    return `SIMULADO DISCURSIVO DE DELEGADO DE POLÍCIA — PADRÃO FGV / PC-PR 2026
1. IDENTIFICAÇÃO DO MODELO
Concurso de referência: Polícia Civil do Estado do Paraná — Delegado de Polícia
Banca: Fundação Getulio Vargas — FGV
Edital de referência: Edital nº 01/2026 da PC-PR, especialmente subitens 10.5 a 10.13
Data de referência do simulado: ${data}
Configuração: ${CONFIGURACAO_PCPR[composicao]}
Peça selecionada: ${pecaSelecionada}${linhaTema}
Este prompt possui duas etapas independentes e sucessivas:

1. ELABORAÇÃO DO SIMULADO E DO PDF;
2. CORREÇÃO DA RESPOSTA MANUSCRITA.

Execute apenas uma etapa por vez.
2. REGRA DE FIDELIDADE AO EDITAL
O objetivo é reproduzir com máxima fidelidade possível o modelo da prova discursiva para Delegado de Polícia da PC-PR 2026, sem inventar exigências inexistentes no edital.
O modelo integral da Prova Discursiva possui:

* 100 pontos no total;
* 4 questões discursivas;
* limite de 20 linhas por questão;
* valor máximo de 15 pontos por questão;
* subtotal máximo de 60 pontos nas questões;
* 1 peça prática-profissional;
* limite máximo de 60 linhas para a peça;
* valor máximo de 40 pontos para a peça.

As quatro questões são formuladas a partir das seguintes áreas:

* Direito Penal;
* Direito Processual Penal;
* Legislação Penal e Processual Penal Extravagantes;
* Direito Constitucional.

A peça prática-profissional é descrita pelo edital como referente a medida cautelar usualmente elaborada por Delegado de Polícia, que “poderá consistir em”:

* Representação por Prisão Temporária;
* Representação por Prisão Preventiva;
* Busca e Apreensão;
* Interceptação Telefônica;
* Interceptação Telemática;
* Interceptação Ambiental;
* Quebra de Sigilo de Dados Financeiro;
* Quebra de Sigilo Bancário;
* Quebra de Sigilo Fiscal;
* Quebra de Sigilo Telefônico;
* Quebra de Sigilo Telemático.

2.1. INTERPRETAÇÃO DA ENUMERAÇÃO DO ITEM 10.5
Não trate automaticamente essa enumeração como rol taxativo, pois o edital emprega a expressão “poderá consistir em”.
Ao mesmo tempo, não afirme que qualquer outra peça está expressamente prevista no item 10.5.
Adote a seguinte regra:
SORTEIO AUTOMÁTICO
Quando a opção escolhida for “Sorteio pela recorrência da banca” ou equivalente, selecione preferencialmente uma das modalidades expressamente nominadas no item 10.5.
PEÇA ESCOLHIDA PELO USUÁRIO
Se o usuário escolher expressamente peça policial diversa das modalidades nominadas no item 10.5 — por exemplo:

* Auto de Prisão em Flagrante;
* despacho de ratificação do flagrante;
* despacho de não ratificação;
* relatório final de inquérito;
* indiciamento;
* portaria de instauração;
* arbitramento de fiança;
* representação por outra cautelar;
* outra peça inerente à atividade de polícia judiciária;

a peça poderá ser utilizada para treinamento.
Nesse caso, internamente considere o exercício como:
“treino ampliado de peça de Delegado no padrão FGV, utilizando como referência estrutural a PC-PR 2026”.
Não insira essa observação no enunciado entregue ao candidato, salvo se ela for necessária para evitar uma informação falsa.
Nunca afirme que peça não mencionada no item 10.5 está expressamente prevista pelo edital.
Nunca afirme, sem fundamento adicional, que ela está proibida pelo edital.
3. ETAPA 1 — ELABORAÇÃO DO SIMULADO
Atue como examinador da FGV responsável pela elaboração de prova discursiva para Delegado de Polícia.
Crie prova INÉDITA, juridicamente consistente, atualizada até a data de referência indicada e compatível com o grau de profundidade exigido de candidato ao cargo de Delegado de Polícia.
REGRA ABSOLUTA DE SIGILO DA SOLUÇÃO
Durante a Etapa 1, não apresente:

* gabarito;
* padrão de resposta;
* espelho de correção;
* solução;
* nome da peça, quando a identificação da peça fizer parte da avaliação;
* dicas;
* comentários explicativos;
* jurisprudência indicativa da resposta correta;
* artigos de lei apresentados de maneira que revelem gratuitamente a solução;
* lista de teses esperadas;
* providências que o candidato deveria adotar.

A prova deve ser entregue como se estivesse sendo aplicada naquele momento.
4. PADRÃO DE ELABORAÇÃO DA PEÇA
A situação-problema deve possuir densidade suficiente para exigir análise simultânea de aspectos de:

* Direito Penal;
* Direito Processual Penal;
* Legislação Penal e Processual Penal Especial, quando pertinente;
* Direito Constitucional, quando pertinente;
* atribuições da autoridade policial;
* legalidade de diligências;
* validade de elementos informativos e probatórios;
* situação flagrancial, quando pertinente;
* medidas cautelares;
* direitos e garantias fundamentais;
* providências investigativas;
* teses defensivas plausíveis;
* competência;
* legitimidade;
* requisitos legais da medida;
* contemporaneidade, necessidade, adequação e proporcionalidade, quando aplicáveis;
* jurisprudência consolidada dos tribunais superiores pertinente à solução.

Inclua fatos suficientes para permitir uma resposta juridicamente determinada.
Evite:

* fatos contraditórios;
* omissões que tornem impossível escolher a solução;
* pegadinhas baseadas exclusivamente em ambiguidade redacional;
* indicação explícita do nome da peça correta;
* cobrança de conhecimento fora do programa sem relação razoável com a atividade policial.

Pode haver informações secundárias ou fatos destinados a testar a capacidade de selecionar juridicamente o que é relevante.
5. PADRÃO FGV DE ENUNCIADO
A narrativa deverá ser concreta, cronológica e suficientemente detalhada.
Ao final, formule comando semelhante a:
“À luz do caso concreto, apresente, na qualidade de Delegado de Polícia, a peça jurídica cabível. Enfrente todos os pontos de direito material e de direito processual, explícita e implicitamente abordados no enunciado, indicando as providências juridicamente pertinentes.”
Não revele o nome da peça na pergunta quando a sua identificação fizer parte da avaliação.
Ao final, informe:
Valor: 40,00 pontos.
Limite máximo: 60 linhas.
Não estabeleça limite mínimo de linhas para a peça, pois o item 10.5 estabelece, para ela, limite máximo de 60 linhas.
6. REGRAS OFICIAIS DE REALIZAÇÃO A SEREM REPRODUZIDAS
A prova deverá informar que a resposta deve ser:

* manuscrita de forma legível;
* escrita com caneta esferográfica de tinta azul ou preta;
* com corpo da caneta fabricado em material transparente;
* transcrita obrigatoriamente para a Folha de Textos Definitivos.

Somente o texto transcrito para a Folha de Textos Definitivos será considerado válido para correção.
Os espaços destinados a rascunho são facultativos e não serão considerados para avaliação.
Informe também que:

* não haverá substituição da Folha de Textos Definitivos por erro do candidato;
* a transcrição é de inteira responsabilidade do candidato;
* a Folha de Textos Definitivos não pode ser assinada ou rubricada;
* não pode conter qualquer marca que identifique o candidato;
* marca identificadora poderá gerar eliminação, conforme o edital.

7. NOTA ZERO
Reproduza de maneira fiel as hipóteses previstas no edital.
Poderá ser atribuída nota zero à questão ou à peça, conforme aplicável, em casos como:

* fuga ao tema;
* apresentação em forma diversa da exigida;
* desenhos;
* números usados de modo incompatível com a resposta textual;
* versos;
* espaçamento excessivo entre letras, palavras ou parágrafos;
* códigos alheios à língua portuguesa escrita;
* utilização de idioma diverso do português;
* resposta escrita a lápis;
* resposta em branco;
* letra ilegível;
* descumprimento de limite mínimo ou máximo quando o respectivo item possuir tais limites.

IMPORTANTE PARA A PEÇA PC-PR
O edital estabelece máximo de 60 linhas para a peça.
Não invente um número mínimo de linhas para a peça.
Portanto, não considere automaticamente uma peça curta como nota zero apenas por possuir poucas linhas.
Ela poderá naturalmente perder conteúdo e pontuação se for insuficiente, mas a penalidade deverá decorrer da qualidade e da incompletude da resposta, e não de um limite mínimo inexistente.
8. CONSULTA DURANTE A PROVA
Para o cargo de Delegado de Polícia, reproduza corretamente o regime de consulta previsto no edital.
É permitida consulta à legislação editada em livro.
O material não poderá conter:

* anotações;
* comentários;
* apontamentos;
* jurisprudência;
* súmulas;
* orientações jurisprudenciais;
* enunciados dos tribunais.

São admitidos:

* marca-texto;
* sublinhados.

Também são vedados materiais que contenham:

* remissão interpretativa que extrapole a legislação seca;
* índice integrado com nomenclaturas doutrinárias;
* índice de critérios jurisprudenciais;
* direcionamento por conteúdo sistematizado;
* esquema de peças processuais ou procedimentais;
* roteiro para elaboração de peças;
* anotações jurisprudenciais sobre temas sensíveis;
* trechos de decisões.

Não simplifique essa regra para a frase imprecisa:
“é permitida apenas legislação seca sem qualquer marcação”.
Isso seria incorreto, porque o edital admite expressamente marca-texto e sublinhados.
9. CRITÉRIOS DE CORREÇÃO
O item 10.7 prevê, para as questões da Prova Discursiva:
a) compreensão/conhecimento do conteúdo proposto e propriedade da resposta;
b) argumentação apropriada, relevante e suficiente em relação à questão proposta;
c) fundamentação legal da resposta;
d) uso correto do vernáculo.
O item 10.8 prevê prejuízo proporcional da nota quando houver abordagem:

* tangencial;
* parcial;
* diluída em divagações;
* baseada em colagem de textos ou de questões apresentadas nas provas.

CUIDADO METODOLÓGICO
Não diga que o edital fornece um espelho detalhado e específico da peça antes da prova.
Ele não fornece previamente a distribuição interna dos 40 pontos entre teses, fundamentos e pedidos.
Para o simulado, crie um espelho técnico próprio, inspirado:

* nos critérios previstos no edital;
* na estrutura jurídica necessária à peça;
* na jurisprudência e legislação vigentes;
* no padrão histórico de correção da FGV para provas discursivas de Delegado.

Esse espelho serve exclusivamente para o treinamento.
Não o apresente como se fosse o futuro espelho oficial da FGV.
10. NOTA DE APROVAÇÃO
No modelo integral, a Prova Discursiva é avaliada de 0 a 100 pontos.
O edital considera aprovado nessa fase o candidato que obtiver, cumulativamente:

* pontuação mínima de 50%, isto é, 50 pontos;
* e classificação dentro dos limites estabelecidos pelo edital, observadas as regras próprias de convocação.

IMPORTANTE
Não invente nota mínima autônoma para a peça.
Não diga, por exemplo:

* “é necessário obter 20/40 na peça”;
* “é necessário obter 25/40 na peça”;

a menos que exista regra oficial superveniente que estabeleça isso.
Em um simulado configurado como somente peça, atribua nota de 0 a 40, mas não transforme 20/40 ou qualquer outro número em “nota de aprovação oficial da PC-PR”.
11. CADERNO DE PROVA
Além de apresentar a prova na conversa, gere UM ÚNICO ARQUIVO PDF, pronto para impressão.
O PDF deve conter:

1. capa;
2. instruções gerais;
3. enunciado integral;
4. instruções para preenchimento;
5. folhas de resposta.

Não gere somente as folhas pautadas.
O arquivo deverá ser autossuficiente: o candidato precisa conseguir realizar o simulado impresso sem consultar novamente a conversa.
12. CAPA DO PDF
A primeira página deverá apresentar:
ALDUS META
SIMULADO DISCURSIVO — DELEGADO DE POLÍCIA
FGV — PC-PR 2026
PEÇA PRÁTICO-PROFISSIONAL
Data de referência: ${data}
Se o exercício corresponder a peça não expressamente nominada no item 10.5, não coloque qualquer advertência na capa que revele a natureza ou o nome da peça.
Nunca revele a solução.
13. TEXTO DO CADERNO DE PROVA
Insira no PDF, antes do enunciado:
CADERNO DE PROVA
Este simulado reproduz exclusivamente a peça prática-profissional no padrão de treinamento indicado.
A peça vale 40,00 pontos e deverá ser respondida em até 60 linhas.
No modelo integral da PC-PR 2026, a Prova Discursiva possui valor total de 100,00 pontos, sendo composta por quatro questões discursivas de até 20 linhas, valendo 15 pontos cada, e uma peça prática-profissional de até 60 linhas, valendo 40 pontos.
A prova integral possui duração prevista de 5 horas.
A resposta deverá ser manuscrita de forma legível, utilizando caneta esferográfica de tinta azul ou preta, fabricada em material transparente.
Somente o texto lançado na Folha de Textos Definitivos será considerado para avaliação.
A Folha de Textos Definitivos não poderá ser assinada, rubricada ou conter marca que permita identificar o candidato.
Os espaços destinados a rascunho não serão avaliados.
A abordagem tangencial, parcial ou excessivamente diluída em divagações poderá prejudicar proporcionalmente a pontuação.
Aplicam-se as hipóteses de nota zero previstas no edital, inclusive fuga ao tema, resposta em forma incompatível com a exigida, resposta a lápis, resposta em branco, letra ilegível e desrespeito aos limites de extensão aplicáveis.
Para o cargo de Delegado de Polícia, é permitida a consulta à legislação editada em livro, observadas as restrições do edital. São admitidos marca-texto e sublinhados, permanecendo proibidos anotações, comentários, apontamentos, jurisprudência, súmulas, orientações jurisprudenciais, enunciados, roteiros de peças e demais materiais vedados pelos subitens 10.12 a 10.12.2.
14. PEÇA PRÁTICO-PROFISSIONAL NO PDF
Depois das instruções, inserir:
PEÇA PRÁTICO-PROFISSIONAL
Valor: 40,00 pontos | Máximo: 60 linhas
Reproduza integralmente o enunciado elaborado.
Não:

* resuma;
* suprima fatos;
* remeta o candidato à conversa;
* revele o nome da peça;
* apresente gabarito;
* insira comentários;
* apresente fundamentos esperados.

Ao final, reproduza integralmente o comando.
Depois:
Valor: 40,00 pontos.
Limite máximo: 60 linhas.
15. INSTRUÇÕES PARA RESPONDER
Após o enunciado, inserir:
INSTRUÇÕES PARA RESPONDER
Utilize exclusivamente as folhas de resposta apresentadas a seguir.
Redija sua peça respeitando o limite máximo de 60 linhas.
Caso esteja realizando o simulado impresso:

* utilize caneta azul ou preta;
* prefira caneta de corpo transparente, reproduzindo as condições do edital;
* não assine;
* não rubrique;
* não faça qualquer marca destinada à identificação.

Para fins deste simulado do Aldus, as 60 linhas serão divididas em:

* linhas 1 a 30 na primeira folha;
* linhas 31 a 60 na segunda folha.

Essa divisão em duas páginas de 30 linhas constitui formatação operacional do Aldus e não deve ser apresentada como exigência literal do edital.
Se estiver sem impressora, utilize folha pautada e reproduza a mesma numeração.
Depois de terminar:

1. fotografe cada folha de cima;
2. mantenha a página inteira no enquadramento;
3. deixe as margens visíveis;
4. utilize boa iluminação;
5. garanta foco suficiente para leitura da letra;
6. evite sombras;
7. não corte nenhuma parte da resposta;
8. envie todas as páginas na ordem correta.

Quando terminar, envie as imagens nesta mesma conversa.
16. FOLHAS DE RESPOSTA
FOLHA 1
Criar página A4 contendo:
ALDUS META
SIMULADO DISCURSIVO — DELEGADO DE POLÍCIA
FGV — PC-PR 2026
PEÇA PRÁTICO-PROFISSIONAL
FOLHA DE RESPOSTA — PÁGINA 1/2
Linhas 1–30
Criar exatamente 30 linhas destinadas à escrita manuscrita, numeradas de 1 a 30.
FOLHA 2
Criar página A4 contendo:
ALDUS META
SIMULADO DISCURSIVO — DELEGADO DE POLÍCIA
FGV — PC-PR 2026
PEÇA PRÁTICO-PROFISSIONAL
FOLHA DE RESPOSTA — PÁGINA 2/2
Linhas 31–60
Criar exatamente 30 linhas destinadas à escrita manuscrita, numeradas de 31 a 60.
17. PADRÃO VISUAL
Produza o PDF em:

* formato A4;
* orientação retrato;
* fundo branco;
* margens adequadas para impressão;
* tipografia sóbria;
* excelente legibilidade;
* identidade visual discreta do ALDUS META;
* azul institucional #0A2C66 em títulos e detalhes;
* boa impressão também em escala de cinza.

Evite excesso de elementos decorativos.
O documento deverá lembrar um caderno profissional de concurso público.
Não tente comprimir o enunciado inteiro em uma única página.
Utilize quantas páginas forem necessárias para apresentar o caso com conforto de leitura.
As páginas destinadas à resposta deverão permanecer separadas do enunciado.
18. NOME DO PDF
Utilize:
ALDUS_Simulado_FGV_PCPR26_${data.replaceAll("/", "-")}.pdf
Não utilize apenas:
ALDUS_Folhas_de_Resposta...
porque o arquivo deverá conter:

* Caderno de Prova;
* enunciado;
* instruções;
* folhas de resposta.

19. ENCERRAMENTO DA ETAPA 1
Depois de apresentar o enunciado e gerar o PDF:
PARE.
Não:

* explique a solução;
* identifique a peça;
* indique artigos;
* apresente espelho;
* dê pistas;
* pergunte se o candidato quer o gabarito.

Aguarde o envio das respostas manuscritas.
20. ETAPA 2 — RECEBIMENTO DAS IMAGENS
Esta etapa começa somente quando eu enviar fotografias ou digitalizações das folhas preenchidas.
Primeiro, verifique:

* se todas as páginas estão presentes;
* se estão na ordem correta;
* se o enquadramento permite leitura;
* se nenhuma margem contém texto cortado;
* se cada linha pode ser lida com segurança.

Não faça inferências sobre palavras ilegíveis.
Se não conseguir determinar com segurança uma palavra ou trecho, marque:
[ilegível]
Se o trecho ilegível puder modificar a avaliação jurídica ou a pontuação daquele item, solicite nova imagem antes de fechar a correção.
Não atribua ao candidato palavras que ele não escreveu.
21. FIXAÇÃO PRÉVIA DO ESPELHO
Antes de comparar minha resposta com o padrão:

1. resolva integralmente o caso;
2. identifique a peça juridicamente adequada;
3. identifique todos os problemas jurídicos explícitos e implícitos;
4. defina as teses corretas;
5. defina os fundamentos normativos;
6. identifique a jurisprudência relevante existente na data de referência;
7. identifique os pedidos, decisões, determinações ou providências cabíveis;
8. construa um espelho de pontuação totalizando exatamente 40,00 pontos.

Somente depois disso confronte o espelho com o que escrevi.
Não ajuste o padrão ao que eu escrevi.
Não crie critério depois de descobrir minha resposta apenas para favorecer ou prejudicar minha nota.
22. CRITÉRIO ÚNICO DE CORREÇÃO
A resposta deverá ser corrigida conforme:

* a situação concreta apresentada;
* a legislação vigente na data de referência;
* a jurisprudência aplicável;
* o padrão técnico exigível de Delegado de Polícia;
* as regras do edital;
* o estilo de avaliação da FGV.

Não pontue afirmação juridicamente incorreta apenas porque ela parece plausível.
Não desconte pela ausência de conteúdo que não era juridicamente exigível.
Não exija informação inexistente no enunciado.
Não crie fatos novos.
23. ESTRUTURA DO ESPELHO
Divida os 40,00 pontos entre itens juridicamente objetivos.
O espelho deverá contemplar, conforme o caso:
A. IDENTIFICAÇÃO E ADEQUAÇÃO DA PEÇA

* espécie de peça;
* autoridade destinatária, quando cabível;
* legitimidade;
* competência;
* adequação procedimental.

B. DIREITO MATERIAL

* tipificação;
* qualificadoras;
* causas de aumento;
* concurso de crimes;
* concurso de agentes;
* consumação ou tentativa;
* demais consequências pertinentes.

C. DIREITO PROCESSUAL

* situação flagrancial;
* legalidade de diligências;
* ingresso domiciliar;
* busca;
* apreensão;
* reconhecimento;
* interrogatório;
* elementos informativos;
* cadeia de custódia;
* direitos do preso;
* demais questões pertinentes.

D. REQUISITOS DA MEDIDA OU PROVIDÊNCIA
Examine individualmente:

* pressupostos;
* fundamentos;
* requisitos legais;
* adequação;
* necessidade;
* contemporaneidade, quando exigível;
* proporcionalidade, quando pertinente.

E. PEDIDOS E PROVIDÊNCIAS
Verifique todos os pedidos, representações, comunicações e providências juridicamente necessários.
F. ESTRUTURA E TÉCNICA
Avalie:

* coerência;
* organização;
* fundamentação;
* objetividade;
* argumentação;
* clareza;
* vernáculo.

A distribuição deverá somar 40,00 pontos exatamente.
24. FORMA DA CORREÇÃO
Apresente a correção nesta ordem:
RESULTADO
Nota: XX,XX / 40,00
1. PEÇA ESPERADA
Informe qual era a peça juridicamente adequada e por quê.
2. ADEQUAÇÃO DA PEÇA APRESENTADA
Informe se a peça adotada pelo candidato foi correta, parcialmente adequada ou inadequada, justificando juridicamente.
3. ESPELHO DE CORREÇÃO
Apresente tabela contendo:

* item;
* conteúdo esperado;
* valor;
* o que foi efetivamente escrito;
* pontuação obtida;
* justificativa do desconto.

4. DIREITO MATERIAL
Analise os acertos, omissões e erros.
5. DIREITO PROCESSUAL
Analise os acertos, omissões e erros.
6. PROVIDÊNCIAS E PEDIDOS
Indique o que foi corretamente requerido ou determinado e o que faltou.
7. FUNDAMENTAÇÃO
Aponte:

* dispositivos corretos;
* dispositivos incorretos;
* jurisprudência relevante;
* fundamentos ausentes.

8. ESTRUTURA E VERNÁCULO
Avalie somente erros efetivamente relevantes.
Não transforme preferências estilísticas do corretor em erro jurídico.
9. PONTOS PERDIDOS
Indique objetivamente onde e por que cada desconto ocorreu.
10. NOTA FINAL
XX,XX / 40,00
25. TRANSCRIÇÃO DA RESPOSTA
Antes ou durante a correção, preserve o conteúdo efetivamente escrito.
Não:

* reescreva silenciosamente a resposta;
* corrija palavras antes de avaliá-las;
* substitua argumento do candidato por argumento melhor;
* complete fundamento ausente;
* atribua pedido que não foi formulado.

Quando houver dúvida de leitura, use:
[ilegível]
26. PROIBIÇÃO DE CORREÇÃO BENEVOLENTE ARTIFICIAL
Corrija como banca examinadora.
Não aumente a nota:

* para estimular;
* porque a ideia “estava próxima”;
* porque é possível imaginar o que o candidato pretendia dizer;
* porque determinada tese poderia ter sido desenvolvida.

Pontue o conteúdo jurídico efetivamente demonstrado.
Ao mesmo tempo, não seja artificialmente rigoroso.
Se a resposta expressou corretamente a tese jurídica, não exija frase idêntica ao espelho.
Avalie conteúdo, e não mera coincidência vocabular.
27. INEDITISMO
A prova criada deverá ser inédita.
É permitido reproduzir:

* padrão de dificuldade;
* estilo de narrativa;
* densidade;
* formato de comando;
* tipos de problemas jurídicos característicos da banca.

É proibido:

* copiar questão real;
* alterar apenas nomes ou números de caso real;
* reproduzir de perto uma peça oficial anteriormente aplicada.

28. REGRA FINAL
Na ETAPA 1, entregue somente:

1. Caderno de Prova;
2. enunciado;
3. PDF completo com o caderno e as folhas de resposta.

Depois, aguarde.
Na ETAPA 2, após o envio das imagens, realize a correção completa e fundamentada pelo padrão previamente fixado.
Não misture as duas etapas.
Não apresente o espelho antes de eu concluir a prova.`;
  }

  function buildPrompt(options = {}, date = new Date()) {
    const { banca, model, composicao, peca, tema } = normalizeOptions(options);
    if (model.id === "pcpr26") return buildPromptPcpr26({ composicao, peca, tema }, date);
    const nomePadrao = banca === "FGV" ? "ESPELHO DE CORREÇÃO, com itens, valores e faixas de pontuação" : "PADRÃO DE RESPOSTA, com o texto-modelo, os elementos essenciais marcados (i), (ii)... e os QUESITOS AVALIADOS com escala de conceitos";
    const colunas = banca === "FGV" ? "resposta | pontos por item | linguagem | linhas | nota" : "resposta | NC | NE | TL | nota (NQ ou NPP)";
    const disciplinas = composicao === "peca" ? "" : `\n- Disciplinas das questões: ${model.disciplinas}.`;

    return `SIMULADO DISCURSIVO DE DELEGADO DE POLÍCIA — PADRÃO ${banca}
Modelo de prova: ${model.label} | fonte: ${model.fonte}
Data de referência: ${formatDate(date)}

PAPEL
Você vai atuar em duas etapas, uma de cada vez:
1) como examinador(a) da banca ${banca}, elaborar uma prova discursiva INÉDITA para Delegado de Polícia no formato do modelo abaixo, com o PDF das folhas de resposta;
2) quando eu enviar fotos ou digitalizações das minhas respostas manuscritas, corrigi-las ESTRITAMENTE e SOMENTE pelo padrão ${banca} descrito neste prompt.
Na etapa 1 não apresente gabarito, padrão de resposta, espelho, dicas ou comentários.

CONFIGURAÇÃO DESTE SIMULADO
- Composição: ${composicaoText(model, composicao)}.${disciplinas}
- Peça: ${pecaText(banca, model, peca, composicao)}
- Tema: ${tema || "livre; use a recorrência abaixo e não repita o mesmo assunto em duas respostas"}.
- Regras do modelo:
${model.regras.map((regra) => `  • ${regra}`).join("\n")}

${PERFIL[banca]}

${RECORRENCIA[banca]}

${ESTRUTURA_PECAS}

ETAPA 1 — ELABORE A PROVA
- Monte o caderno no estilo ${banca}: cabeçalho, instruções da banca e, em cada item, número, valor e limite de linhas.
${elaboracaoText(banca, model, composicao)}
- Nível real da banca: fatos suficientes para exigir distinções finas, com pelo menos um ponto de cabimento ou de tipificação que separe a resposta completa da mediana, sem pegadinha estranha ao padrão.

${folhasPdfText(banca, model, composicao, date)}

- Ao final, escreva só as instruções para eu responder: imprimir as folhas do PDF (sem impressora, usar folha pautada com as linhas numeradas do mesmo jeito), respeitar o limite de linhas de cada item, fotografar cada folha de cima, com boa luz, página inteira e sem cortes. Termine com: "Quando terminar, envie as imagens nesta conversa."

ETAPA 2 — CORRIJA (somente depois que eu enviar as imagens)
2.1 Leitura das imagens
- Identifique a qual questão ou peça cada imagem pertence e apresente a sua leitura de cada resposta com as linhas numeradas, para eu conferir.
- Onde não conseguir ler com segurança, marque [ilegível] e não complete por suposição; trecho ilegível não pontua. Se uma página estiver cortada, desfocada ou fora de ordem a ponto de impedir a leitura, peça nova foto dessa página antes de corrigir.
- Conte as linhas efetivamente escritas de cada texto. Desconsidere o que passar do limite de linhas do modelo e o que estiver fora do espaço da resposta.
- Verifique identificação indevida (nome, assinatura diferente de "Delegado de Polícia" ou marca) e aplique a consequência da banca.
2.2 Padrão da banca
- Antes de avaliar, redija para cada questão e para a peça o ${nomePadrao}, a partir do enunciado que você elaborou. Não ajuste o padrão ao que eu escrevi.
2.3 Nota
${correcaoNotaText(banca, model)}
- Rigor da banca: só pontua o que está escrito, expresso e juridicamente correto; menção genérica sem o elemento exigido fica na faixa inferior; não conceda ponto por conteúdo implícito, por intenção ou por texto de rascunho; em dúvida entre duas faixas, justifique a escolha pelo texto do padrão; não arredonde a favor.
2.4 Resultado
- Tabela final (${colunas}), total e comparação com a aprovação do modelo (${model.aprovacao}).
- Diagnóstico por resposta: pontos obtidos, pontos perdidos (quesito ou item e motivo) e, para cada ponto perdido, como redigir o trecho que faltou em até três frases.
- Até 5 prioridades de estudo ligadas aos pontos perdidos.

REGRAS DE SEGURANÇA JURÍDICA (valem para as duas etapas)
- Prova inédita: não reproduza nem adapte de perto questões reais; use apenas o estilo e o modo de cobrança da banca.
- Não invente lei, artigo, súmula, tema de repercussão geral, recurso repetitivo, informativo ou número de processo. Cite precedente só quando tiver segurança; na dúvida, fundamente em lei e em entendimento consolidado.
- Considere a legislação vigente na data de referência. Se um ponto depender de alteração legislativa ou jurisprudencial recente que você não consiga confirmar, não o cobre; se aparecer na correção, sinalize a dúvida e aceite as duas posições, como a banca faz ("será aceito...").
- Critério único de correção: o padrão ${banca} deste prompt. Não use critérios de outra banca nem preferências pessoais de estilo.`;
  }

  function optionsHtml(entries, selected) {
    return entries.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
  }

  function pecaSelectHtml(model, selected) {
    const grupos = PECA_GRUPOS.map((grupo) => {
      const opcoes = Object.entries(grupo.itens).map(([key, label]) => [key, foraDoEdital(model, key) ? `${label} — fora do edital deste modelo` : label]);
      return `<optgroup label="${escapeHtml(grupo.rotulo)}">${optionsHtml(opcoes, selected)}</optgroup>`;
    }).join("");
    return `${optionsHtml([["sorteio", SORTEIO]], selected)}${grupos}`;
  }

  function sectionHtml() {
    const { banca, model, composicao, peca } = normalizeOptions(config);
    config.banca = banca;
    config.modelo = model.id;
    config.composicao = composicao;
    config.peca = peca;
    const output = lastPrompt
      ? `<div class="factory-simulado-output"><h4>Prompt pronto</h4><textarea readonly rows="18" data-factory-discursivo-output>${escapeHtml(lastPrompt)}</textarea><div class="card-actions"><button type="button" data-factory-discursivo-copiar>Copiar prompt</button><span class="item-meta" data-factory-discursivo-mensagem aria-live="polite"></span></div></div>`
      : "";
    return `<details id="${SECTION_ID}" class="factory-section factory-simulado-builder factory-collapsible"${config.open ? " open" : ""}>
      <summary>SIMULADO DE PEÇAS E DISCURSIVAS <small>DELEGADO • CEBRASPE • FGV</small></summary>
      <div class="factory-collapsible-content">
        <p class="notice">Gera o prompt para o ChatGPT ou o Claude montar uma prova inédita no padrão da banca, com o PDF das folhas de resposta com o timbre do Aldus, e depois corrigir as fotos das suas respostas manuscritas pelo padrão de resposta (Cebraspe) ou espelho (FGV) da mesma banca.</p>
        <div class="factory-simulado-grid">
          <label>Banca<select data-factory-discursivo="banca">${optionsHtml([["CEBRASPE", "CEBRASPE"], ["FGV", "FGV"]], banca)}</select></label>
          <label>Modelo de prova<select data-factory-discursivo="modelo">${optionsHtml(MODELS[banca].map((item) => [item.id, item.label]), model.id)}</select></label>
          <label>Composição<select data-factory-discursivo="composicao">${optionsHtml(Object.entries(COMPOSICOES), composicao)}</select></label>
          <label>Peça<select data-factory-discursivo="peca" ${composicao === "questoes" ? "disabled" : ""}>${pecaSelectHtml(model, peca)}</select></label>
          <label class="wide">Tema (opcional)<input type="text" maxlength="300" value="${escapeHtml(config.tema)}" data-factory-discursivo="tema" placeholder="Ex.: Lei Maria da Penha; prisão temporária; busca domiciliar" /></label>
        </div>
        <div class="card-actions"><button type="button" data-factory-discursivo-gerar>Gerar prompt</button></div>
        ${output}
      </div>
    </details>`;
  }

  async function copyPrompt(section) {
    const message = section.querySelector("[data-factory-discursivo-mensagem]");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(lastPrompt);
      else {
        const area = section.querySelector("[data-factory-discursivo-output]");
        area?.select();
        if (!document.execCommand("copy")) throw new Error("cópia indisponível");
      }
      if (message) message.textContent = "Prompt copiado.";
    } catch {
      if (message) message.textContent = "Não foi possível copiar automaticamente. Selecione o texto acima.";
    }
  }

  function bind(section) {
    if (!section || section.dataset.aldusBound === VERSION) return;
    section.dataset.aldusBound = VERSION;
    section.addEventListener("toggle", () => { config.open = section.open; });
    section.addEventListener("input", (event) => {
      const field = event.target.closest?.('[data-factory-discursivo="tema"]');
      if (!field) return;
      config.tema = field.value;
      lastPrompt = "";
    });
    section.addEventListener("change", (event) => {
      const field = event.target.closest?.("[data-factory-discursivo]");
      if (!field) return;
      const key = field.dataset.factoryDiscursivo;
      if (key === "tema") return;
      config[key] = field.value;
      if (key === "banca") config.modelo = "";
      lastPrompt = "";
      mount();
    });
    section.addEventListener("click", (event) => {
      const button = event.target.closest?.("button");
      if (!button) return;
      if (button.hasAttribute("data-factory-discursivo-gerar")) {
        event.preventDefault();
        lastPrompt = buildPrompt(config);
        config.open = true;
        mount();
        document.querySelector(`#${SECTION_ID} [data-factory-discursivo-output]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (button.hasAttribute("data-factory-discursivo-copiar")) {
        event.preventDefault();
        copyPrompt(section);
      }
    });
  }

  // V624 — fora da Biblioteca de prompts: logo depois do painel dela, como área própria da Fábrica.
  function place(view, section) {
    if (!view || !section) return;
    const library = document.getElementById(LIBRARY_PANEL_ID);
    if (library && library.parentElement === view) {
      if (library.nextElementSibling !== section) library.after(section);
      return;
    }
    if (section.parentElement !== view) view.appendChild(section);
  }

  function mount() {
    if (typeof document === "undefined") return false;
    const view = document.getElementById("view-fabrica-resumos");
    if (!view) return false;
    const html = sectionHtml();
    const current = document.getElementById(SECTION_ID);
    if (current) current.outerHTML = html;
    else view.insertAdjacentHTML("beforeend", html);
    const section = document.getElementById(SECTION_ID);
    place(view, section);
    bind(section);
    return true;
  }

  function install() {
    if (typeof document === "undefined") return { installed: false, reason: "sem-documento" };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
      return { installed: false, deferred: true };
    }
    const current = document.getElementById(SECTION_ID);
    if (current) {
      place(document.getElementById("view-fabrica-resumos"), current);
      return { installed: true, repeated: true };
    }
    return { installed: mount() };
  }

  const api = Object.freeze({
    version: VERSION,
    sectionId: SECTION_ID,
    models: MODELS,
    pecas: PECAS,
    pecaGrupos: PECA_GRUPOS,
    buildPrompt,
    normalizeOptions,
    pecasSorteio,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  if (typeof window !== "undefined") {
    install();
    // V624 — em carga sem cache o factory-simple-v163 cria a Biblioteca depois deste módulo; reposiciona uma vez no load.
    if (document.readyState !== "complete") window.addEventListener("load", install, { once: true });
    window.addEventListener("hashchange", () => {
      if (String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0] === "fabrica-resumos") install();
    });
  }
})();
