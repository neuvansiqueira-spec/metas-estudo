/* Simulado de peças e discursivas de Delegado (Cebraspe e FGV) na Fábrica de Resumos — v619.
   Gera um prompt para o ChatGPT/Claude elaborar a prova inédita no padrão da banca e, depois,
   corrigir as fotos das respostas manuscritas pelo padrão de resposta/espelho da mesma banca.
   Base: provas, padrões de resposta e espelhos de Delegado 2021-2026 baixados dos sites da Cebraspe e da FGV
   (pasta "PROVAS DISCURSIVAS E PEÇAS - DELEGADO - CEBRASPE E FGV (2021-2026)" no Drive) e editais PC-MA 2026,
   PC-DF 2026, PC-PR 2026 e PC-PI 2025. Sem persistência, sem observadores e sem trabalho contínuo. */
(() => {
  "use strict";

  const VERSION = "20260913-simulado-discursivo-delegado-v619";
  const SECTION_ID = "factorySimuladoDiscursivoV619";
  const API_MARKER = "__ALDUS_FACTORY_SIMULADO_DISCURSIVO_V619__";

  const PECAS = {
    sorteio: "Sorteio pela recorrência da banca",
    preventiva: "Representação por prisão preventiva",
    temporaria: "Representação por prisão temporária",
    conversaoFlagrante: "Representação pela conversão da prisão em flagrante em preventiva",
    despachoApf: "Despacho de ratificação e conclusão do auto de prisão em flagrante, com providências",
    portariaIp: "Portaria de instauração de inquérito policial, com diligências e representações",
    busca: "Representação por busca e apreensão (podendo cumular medidas cautelares diversas da prisão)",
    interceptacao: "Representação por interceptação telefônica, telemática ou ambiental",
    quebraSigilo: "Representação por quebra de sigilo de dados bancário, fiscal, telefônico ou telemático",
    infiltracao: "Representação por infiltração de agentes, inclusive virtual"
  };

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
        questoes: { quantidade: 4, linhas: "até 15 linhas", valor: "5,00 pontos" },
        peca: { linhas: "até 60 linhas", valor: "20,00 pontos", nome: "peça prático-profissional" },
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
        questoes: { quantidade: 3, linhas: "até 30 linhas", valor: "10,00 pontos" },
        peca: { linhas: "até 90 linhas", valor: "30,00 pontos", nome: "peça relativa à atividade de polícia judiciária" },
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
        questoes: { quantidade: 4, linhas: "até 20 linhas", valor: "15 pontos" },
        peca: { linhas: "até 60 linhas", valor: "40 pontos", nome: "peça prática-profissional" },
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
        pecasPermitidas: ["sorteio", "preventiva", "temporaria", "busca", "interceptacao", "quebraSigilo"]
      },
      {
        id: "pcpi25",
        label: "PC-PI 2025 — 3 questões (20 a 30 linhas) + peça (120 linhas)",
        fonte: "Edital nº 01/2025 da PC-PI, subitens 9.21 a 9.32",
        questoes: { quantidade: 3, linhas: "entre 20 e 30 linhas", valor: "15 pontos" },
        peca: { linhas: "até 120 linhas", valor: "55 pontos", nome: "peça profissional" },
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
- Representação (prisão, busca, interceptação, quebra de sigilo, infiltração): endereçamento ao juízo competente; referência ao inquérito; preâmbulo com a atribuição (art. 144, § 4º, da CF, Lei nº 12.830/2013 e CPP) e a medida; fatos só quando o enunciado não os dispensar; fundamentos (materialidade e indícios de autoria, requisitos legais específicos da medida, necessidade, adequação e subsidiariedade, contemporaneidade); pedidos (medida, prazo, sigilo, oitiva do Ministério Público); local, data e "Delegado de Polícia".
- Despacho no auto de prisão em flagrante: situação de flagrância e sua espécie; tipificação completa; ratificação ou homologação; fiança ou vedação; providências (nota de culpa, ciência das garantias, comunicação em 24 horas ao juiz, ao Ministério Público e, sem advogado, à Defensoria, exames de corpo de delito, apreensões e laudos, identificação, informação sobre filhos, representação pela conversão em preventiva quando cabível); local, data e "Delegado de Polícia".
- Portaria de instauração: autoridade e fundamento legal; fatos em tese e tipificação; "resolve instaurar"; diligências numeradas; representações ao juízo quando cabíveis; cumpra-se; local, data e "Delegado de Polícia".`;

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

  function pecasFor(model) {
    const keys = Array.isArray(model.pecasPermitidas) ? model.pecasPermitidas : Object.keys(PECAS);
    return keys.filter((key) => PECAS[key]);
  }

  function normalizeOptions(options = {}) {
    const banca = normalizeBanca(options.banca);
    const model = modelFor(banca, options.modelo);
    const composicao = COMPOSICOES[options.composicao] ? options.composicao : "completa";
    const peca = pecasFor(model).includes(options.peca) ? options.peca : "sorteio";
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
      return banca === "FGV"
        ? `${PECAS[peca]}. Não revele o nome da peça no enunciado: a identificação faz parte da avaliação, como na FGV.`
        : `${PECAS[peca]}. O comando pode indicar a medida ("formule a representação pela medida mais adequada") ou pedir "a peça cabível", como a Cebraspe faz.`;
    }
    const restricao = Array.isArray(model.pecasPermitidas)
      ? ` Escolha somente entre as medidas previstas no edital deste modelo: ${pecasFor(model).filter((key) => key !== "sorteio").map((key) => PECAS[key].toLowerCase()).join("; ")}.`
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

  function correcaoNotaText(banca, model) {
    if (banca === "FGV") {
      return `- Para cada item do espelho, indique a faixa atribuída, a justificativa com referência às linhas do meu texto e a pontuação. Aplique o item final de linguagem e as regras do modelo (nota prejudicada por abordagem tangencial, parcial ou diluída; nota zero nas hipóteses do edital).
- Peça: se eu tiver identificado a peça errada, zere o item de identificação e pontue os demais itens somente no que coincidir com o espelho da peça correta.`;
    }
    return `- Para cada quesito, indique o conceito atribuído, a justificativa com referência às linhas do meu texto e a pontuação proporcional (conceito obtido ÷ conceito máximo × valor do quesito). Some a apresentação e a estrutura textual (até 5% do valor) para obter NC.
- Modalidade escrita: liste cada erro com linha, trecho e tipo (grafia, morfossintaxe ou propriedade vocabular) e totalize NE por texto. Aplique as fórmulas do modelo: ${model.formulas}. Nota negativa vira zero; fuga ao tema ou ausência de texto, zero.
- Peça: se eu tiver elaborado peça diversa da cabível, atribua conceito 0 no quesito de identificação e estrutura e pontue os demais quesitos somente no que coincidir com o padrão.`;
  }

  function buildPrompt(options = {}, date = new Date()) {
    const { banca, model, composicao, peca, tema } = normalizeOptions(options);
    const nomePadrao = banca === "FGV" ? "ESPELHO DE CORREÇÃO, com itens, valores e faixas de pontuação" : "PADRÃO DE RESPOSTA, com o texto-modelo, os elementos essenciais marcados (i), (ii)... e os QUESITOS AVALIADOS com escala de conceitos";
    const colunas = banca === "FGV" ? "resposta | pontos por item | linguagem | linhas | nota" : "resposta | NC | NE | TL | nota (NQ ou NPP)";
    const disciplinas = composicao === "peca" ? "" : `\n- Disciplinas das questões: ${model.disciplinas}.`;

    return `SIMULADO DISCURSIVO DE DELEGADO DE POLÍCIA — PADRÃO ${banca}
Modelo de prova: ${model.label} | fonte: ${model.fonte}
Data de referência: ${formatDate(date)}

PAPEL
Você vai atuar em duas etapas, uma de cada vez:
1) como examinador(a) da banca ${banca}, elaborar uma prova discursiva INÉDITA para Delegado de Polícia no formato do modelo abaixo;
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
- Ao final, escreva só as instruções para eu responder: folha pautada com linhas numeradas, limite de linhas de cada item, uma resposta por página identificada (Q1, Q2... e PEÇA p. 1/2), foto tirada de cima, com boa luz, página inteira e sem cortes. Termine com: "Quando terminar, envie as imagens nesta conversa."

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
        <p class="notice">Gera o prompt para o ChatGPT ou o Claude montar uma prova inédita no padrão da banca e, depois, corrigir as fotos das suas respostas manuscritas pelo padrão de resposta (Cebraspe) ou espelho (FGV) da mesma banca.</p>
        <div class="factory-simulado-grid">
          <label>Banca<select data-factory-discursivo="banca">${optionsHtml([["CEBRASPE", "CEBRASPE"], ["FGV", "FGV"]], banca)}</select></label>
          <label>Modelo de prova<select data-factory-discursivo="modelo">${optionsHtml(MODELS[banca].map((item) => [item.id, item.label]), model.id)}</select></label>
          <label>Composição<select data-factory-discursivo="composicao">${optionsHtml(Object.entries(COMPOSICOES), composicao)}</select></label>
          <label>Peça<select data-factory-discursivo="peca" ${composicao === "questoes" ? "disabled" : ""}>${optionsHtml(pecasFor(model).map((key) => [key, PECAS[key]]), peca)}</select></label>
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

  function mount() {
    if (typeof document === "undefined") return false;
    const view = document.getElementById("view-fabrica-resumos");
    if (!view) return false;
    const html = sectionHtml();
    const current = document.getElementById(SECTION_ID);
    if (current) current.outerHTML = html;
    else {
      const anchor = document.getElementById("factoryPromptLibraryPanel") || view.querySelector(".factory-settings-actions");
      if (anchor) anchor.insertAdjacentHTML("afterend", html);
      else view.insertAdjacentHTML("beforeend", html);
    }
    bind(document.getElementById(SECTION_ID));
    return true;
  }

  function install() {
    if (typeof document === "undefined") return { installed: false, reason: "sem-documento" };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
      return { installed: false, deferred: true };
    }
    if (document.getElementById(SECTION_ID)) return { installed: true, repeated: true };
    return { installed: mount() };
  }

  const api = Object.freeze({
    version: VERSION,
    sectionId: SECTION_ID,
    models: MODELS,
    pecas: PECAS,
    buildPrompt,
    normalizeOptions,
    pecasFor,
    install
  });

  globalThis[API_MARKER] = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  if (typeof window !== "undefined") {
    install();
    window.addEventListener("hashchange", () => {
      if (String(location.hash || "").replace(/^#/, "").split(/[?&]/)[0] === "fabrica-resumos") install();
    });
  }
})();
