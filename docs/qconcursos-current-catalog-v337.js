(() => {
  "use strict";

  const VERSION = "20260814-qconcursos-catalogo-atual-v337";
  const PREFIX = "/questoes-de-concursos/disciplinas/";

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function target(disciplineSlug, subjectSlug, label) {
    return Object.freeze({ disciplineSlug, subjectSlug, label });
  }

  const T = Object.freeze({
    // Direito Civil
    civilLindb: target("direito-direito-civil", "lei-de-introducao-as-normas-do-direito-brasileiro-lindb", "Lei de Introdução às Normas do Direito Brasileiro (LINDB)"),
    civilNatural: target("direito-direito-civil", "personalidade-pessoa-natural-e-capacidade", "Personalidade, Pessoa Natural e Capacidade"),
    civilJuridica: target("direito-direito-civil", "pessoa-juridica", "Pessoa Jurídica"),
    civilBens: target("direito-direito-civil", "domicilio-e-bens", "Domicílio e Bens"),
    civilFatos: target("direito-direito-civil", "ato-juridico-fato-juridico-e-teoria-geral-do-negocio-juridico", "Ato Jurídico, Fato Jurídico e Teoria Geral do Negócio Jurídico"),
    civilPrescricao: target("direito-direito-civil", "prescricao-e-decadencia", "Prescrição e Decadência"),
    civilCoisas: target("direito-direito-civil", "direito-das-coisas-direitos-reais", "Direito das Coisas / Direitos Reais"),
    civilPropriedade: target("direito-direito-civil", "propriedade", "Propriedade"),
    civilResponsabilidade: target("direito-direito-civil", "responsabilidade-civil", "Responsabilidade civil"),

    // Processo Civil
    cpcJurisdicao: target("direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015", "jurisdicao", "Jurisdição"),
    cpcAcao: target("direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015", "acao", "Ação"),
    cpcCompetencia: target("direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015", "competencia-no-processo-civil", "Competência no Processo Civil"),
    cpcTutela: target("direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015", "tutela-provisoria-e-tutela-de-urgencia", "Tutela Provisória e Tutela de Urgência"),

    // Direito Agrário
    agrarioNocoes: target("direito-direito-agrario", "nocoes-fundamentais-de-direito-agrario", "Noções Fundamentais de Direito Agrário"),
    agrarioPropriedade: target("direito-direito-agrario", "a-propriedade-e-a-posse-agrarias", "A Propriedade e a Posse Agrárias"),
    agrarioUsucapiao: target("direito-direito-agrario", "usucapiao-agrario", "Usucapião Agrário"),
    agrarioReforma: target("direito-direito-agrario", "a-reforma-agraria-e-a-politica-agraria", "A Reforma Agrária e a Política Agrária"),
    agrarioDesapropriacao: target("direito-direito-agrario", "a-desapropriacao-no-direito-agrario-lei-n-8-629-de-1993-e-lei-complementar-n-76-de-1993", "A Desapropriação no Direito Agrário - Lei nº 8.629 de 1993 e Lei Complementar nº 76 de 1993"),
    agrarioRegularizacao: target("direito-direito-agrario", "regularizacao-fundiaria-rural", "Regularização Fundiária Rural"),
    agrarioIndigenas: target("direito-direito-agrario", "terras-indigenas-e-o-estatuto-do-indio-lei-n-6-001-de-1973", "Terras Indígenas e o Estatuto do Índio – Lei nº 6.001 de 1973"),
    agrarioContratos: target("direito-direito-agrario", "contratos-agrarios", "Contratos Agrários"),

    // Direito Ambiental
    ambientalPrincipios: target("direito-direito-ambiental", "principios-do-direito-ambiental", "Princípios do direito ambiental"),
    ambientalConstituicao: target("direito-direito-ambiental", "direito-ao-meio-ambiente-ecologicamente-equilibrado-e-o-art-225-da-cf-88", "Direito ao meio ambiente ecologicamente equilibrado e o art. 225 da CF/88"),
    ambientalFlorestal: target("direito-direito-ambiental", "codigo-florestal-lei-n-12-651-de-2012", "Código Florestal – Lei nº 12.651 de 2012"),
    ambientalSnuc: target("direito-direito-ambiental", "sistema-nacional-de-unidades-de-conservacao-snuc-lei-n-9-985-de-2000-e-decreto-n-4-340-de-2002", "Sistema Nacional de Unidades de Conservação-SNUC – Lei nº 9.985 de 2000 e Decreto nº 4.340 de 2002"),
    ambientalCrimes: target("direito-direito-ambiental", "lei-de-crimes-ambientais-lei-n-9-605-de-1998", "Lei de Crimes Ambientais - Lei nº 9.605 de 1998"),
    ambientalDecreto: target("direito-direito-ambiental", "decreto-n-6-514-de-2008-infracoes-e-sancoes-administrativas-ao-meio-ambiente-e-seu-processo-administrativo-federal", "Decreto nº 6.514 de 2008 - Infrações e Sanções Administrativas ao Meio Ambiente e seu Processo Administrativo Federal"),
    ambientalPnma: target("direito-direito-ambiental", "politica-nacional-do-meio-ambiente-pnma-lei-n-6-938-de-1981", "Política Nacional do Meio Ambiente-PNMA – Lei nº 6.938 de 1981"),
    ambientalInstrumentos: target("direito-direito-ambiental", "instrumentos-da-politica-nacional-do-meio-ambiente", "Instrumentos da Política Nacional do Meio Ambiente"),
    ambientalSisnama: target("direito-direito-ambiental", "sistema-nacional-do-meio-ambiente-sisnama-ibama-instituto-chico-mendes-de-conservacao-da-biodiversidade-icmbio-conselho-nacional-do-meio-ambiente-conama-e-outros-orgaos", "Sistema Nacional do Meio Ambiente – SISNAMA"),
    ambientalResponsabilidade: target("direito-direito-ambiental", "responsabilidade-ambiental", "Responsabilidade ambiental"),

    // Direito Digital
    digitalConceitos: target("direito-direito-digital", "aspectos-conceituais-e-fundamentos-do-direito-digital", "Aspectos Conceituais e Fundamentos do Direito Digital"),
    digitalMarco: target("direito-direito-digital", "lei-n-12-965-de-2014-marco-civil-da-internet", "Lei nº 12.965 de 2014 - Marco Civil da Internet"),
    digitalLgpd: target("direito-direito-digital", "lei-n-13-709-de-2018-lei-geral-de-protecao-de-dados-pessoais-lgpd", "Lei nº 13.709 de 2018 - Lei Geral de Proteção de Dados Pessoais (LGPD)"),
    digitalAnpd: target("direito-direito-digital", "autoridade-nacional-de-protecao-de-dados-anpd-e-conselho-nacional-de-protecao-de-dados-pessoais-e-da-privacidade", "Autoridade Nacional de Proteção de Dados (ANPD)"),

    // Criminologia e Criminalística
    documentoscopia: target("criminalistica-criminalistica", "documentoscopia-forense", "Documentoscopia Forense"),
    criminologiaConceito: target("direito-criminologia", "conceito-objeto-delito-delinquente-e-vitima-metodo-origem-e-historia-da-criminologia", "Conceito, Objeto, Método, Origem e História da Criminologia"),
    criminologiaEscolas: target("direito-criminologia", "modelos-teoricos-da-criminologia-classico-neoclassico-positivista-e-moderno-escolas-da-criminologia-classica-positiva-terza-scuola-italiana-tecnico-juridica-e-sociologica-alema", "Modelos Teóricos e Escolas da Criminologia"),
    criminologiaTeorias: target("direito-criminologia", "teorias-criminologicas-escola-de-chicago-explicacao-ecologica-do-crime-estrutural-funcionalistas-associacao-diferencial-anomia-subcultura-delinquente-critica-ou-radical-etiquetamento-ou-labelling-approach", "Teorias Criminológicas"),
    criminologiaContemporanea: target("direito-criminologia", "criminologia-contemporanea-bullying-justica-restaurativa-e-mediacao-penal-justica-terapeutica-justica-instantanea-exame-criminologico-e-reintegracao-social-teorias-da-pena-reacao-social-e-prevencao-da-criminalidade", "Criminologia Contemporânea e Prevenção da Criminalidade"),

    // Administração Pública
    gestaoGovernanca: target("administracao-administracao-publica", "governabilidade-governanca-e-accountability", "Governabilidade, Governança e Accountability"),
    gestaoResultados: target("administracao-administracao-publica", "gestao-por-resultados", "Gestão por resultados"),
    gestaoOrganizacao: target("administracao-administracao-publica", "organizacao-e-estrutura-do-estado-governo-e-administracao", "Organização e Estrutura do Estado, Governo e Administração"),

    // Direito Administrativo adicional
    administrativoIntervencao: target("direito-direito-administrativo", "intervencao-do-estado-na-propriedade", "Intervenção do estado na propriedade"),
    administrativoBens: target("direito-direito-administrativo", "bens-publicos-na-administracao-publica", "Bens Públicos na Administração Pública"),
    administrativoBensAquisicao: target("direito-direito-administrativo", "aquisicao-e-alienacao-dos-bens-publicos", "Aquisição e alienação dos bens públicos"),
    administrativoBensUso: target("direito-direito-administrativo", "utilizacao-dos-bens-publicos", "Utilização dos bens públicos"),
    administrativoConsorcios: target("direito-direito-administrativo", "consorcios-publicos", "Consórcios públicos"),

    // Legislação especial e estadual (categorias públicas do QConcursos)
    legislacaoPenalEspecial: target("direito-direito-penal", "legislacao-penal-especial", "Legislação Penal Especial"),
    legislacaoParana: target("direito-legislacao-estadual", "legislacao-do-estado-do-parana", "Legislação do Estado do Paraná"),

    // Direitos Humanos
    dhGeracoes: target("direito-direitos-humanos", "categorias-e-geracoes-dos-direitos-humanos", "Categorias e gerações dos direitos humanos"),
    dhCaracteristicas: target("direito-direitos-humanos", "caracteristicas-dos-direitos-humanos", "Características dos direitos humanos"),
    dhInternacional: target("direito-direitos-humanos", "direito-internacional-dos-direitos-humanos", "Direito Internacional dos Direitos Humanos"),
    dhDudh: target("direito-direitos-humanos", "declaracao-universal-dos-direitos-humanos", "Declaração Universal dos Direitos Humanos"),
    dhPidcp: target("direito-direitos-humanos", "pacto-internacional-de-direitos-civis-e-politicos", "Pacto Internacional de Direitos Civis e Políticos"),
    dhPidesc: target("direito-direitos-humanos", "pacto-internacional-de-direitos-economicos-e-sociais-e-culturais", "Pacto Internacional de Direitos Econômicos, Sociais e Culturais"),
    dhInteramericano: target("direito-direitos-humanos", "sistema-interamericano-de-protecao-aos-direitos-humanos-instrumentos-normativos", "Sistema Interamericano de Proteção aos Direitos Humanos: Instrumentos Normativos"),
    dhConvencao: target("direito-direitos-humanos", "convencao-americana-sobre-direitos-humanos-pacto-de-san-jose", "Convenção Americana sobre Direitos Humanos (Pacto de San José)"),
    dhComissao: target("direito-direitos-humanos", "sistema-interamericano-de-protecao-aos-direitos-humanos-instituicoes", "Sistema Interamericano de Proteção aos Direitos Humanos: Instituições"),
    dhPndh: target("direito-direitos-humanos", "programa-nacional-de-direitos-humanos-pndh", "Programa Nacional de Direitos Humanos (PNDH)"),

    // Direito Constitucional adicional
    constitucionalTeoria: target("direito-direito-constitucional", "teoria-da-constituicao", "Teoria da Constituição"),
    constitucionalNormas: target("direito-direito-constitucional", "classificacao-das-normas-constitucionais", "Classificação das Normas Constitucionais"),
    constitucionalPoder: target("direito-direito-constitucional", "poder-constituinte-originario-derivado-e-decorrente-reforma-emendas-e-revisao-e-mutacao-da-constituicao", "Poder Constituinte Originário, Derivado e Decorrente"),
    constitucionalInterpretacao: target("direito-direito-constitucional", "principios-de-interpretacao-constitucional", "Princípios de Interpretação Constitucional"),
    constitucionalOrdemSocial: target("direito-direito-constitucional", "ordem-social", "Ordem Social"),
    constitucionalTributario: target("direito-direito-constitucional", "sistema-tributario-nacional", "Sistema Tributário Nacional"),
    constitucionalEconomica: target("direito-direito-constitucional", "ordem-economica-e-financeira", "Ordem Econômica e Financeira"),

    // Processo Penal adicional
    processoLei: target("direito-direito-processual-penal", "aplicacao-da-lei-penal-processual-penal", "Aplicação da Lei Penal Processual Penal"),
    processoCompetencia: target("direito-direito-processual-penal", "competencia-no-processo-penal", "Competência no Processo Penal"),
    processoIncidentes: target("direito-direito-processual-penal", "das-questoes-e-processos-incidentes", "Das Questões e Processos Incidentes"),
    processoSujeitos: target("direito-direito-processual-penal", "do-juiz-do-ministerio-publico-do-acusado-e-defensor-dos-assistentes-e-auxiliares-da-justica", "Do Juiz, do Ministério Público, do Acusado e Defensor, dos Assistentes e Auxiliares da Justiça"),
    processoCitacoes: target("direito-direito-processual-penal", "das-citacoes-e-intimacoes", "Das Citações e Intimações"),
    processoSentenca: target("direito-direito-processual-penal", "sentenca-e-coisa-julgada", "Sentença e Coisa Julgada")
  });

  function currentV336(label, disciplineSlug) {
    const routes = globalThis.__aldusQconcursosNativeSubjectV336?.routes || [];
    const found = routes.find((entry) => entry.disciplineSlug === disciplineSlug && normalize(entry.currentLabel) === normalize(label));
    return found ? target(found.disciplineSlug, found.currentLabel
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), found.currentLabel) : null;
  }

  function catalogTarget(item = {}) {
    const discipline = normalize(item.discipline || item.disciplina);
    const text = normalize([item.subject, item.assunto, item.topic, item.subtopic, item.reference].filter(Boolean).join(" "));
    const has = (...terms) => terms.some((term) => text.includes(normalize(term)));
    const v336 = (label, slug) => currentV336(label, slug);

    if (discipline === "direito civil") {
      if (has("lei de introducao", "4 657 1942", "9 830 2019")) return T.civilLindb;
      if (has("pessoa juridica")) return T.civilJuridica;
      if (has("pessoas", "pessoa natural", "personalidade", "capacidade", "direitos da personalidade")) return T.civilNatural;
      if (has("domicilio", "bens", "classes de bens")) return T.civilBens;
      if (has("fato juridico", "negocio juridico", "atos juridicos", "atos ilicitos")) return T.civilFatos;
      if (has("prescricao", "decadencia")) return T.civilPrescricao;
      if (has("propriedade")) return T.civilPropriedade;
      if (has("direito das coisas", "direitos reais", "posse")) return T.civilCoisas;
      if (has("responsabilidade civil", "indenizar", "indenizacao")) return T.civilResponsabilidade;
    }

    if (discipline === "direito processual civil") {
      if (has("tutela provisoria", "tutelas de urgencia", "poder geral de cautela")) return T.cpcTutela;
      if (has("competencia")) return T.cpcCompetencia;
      if (has("acao", "habeas corpus", "mandado de seguranca", "habeas data", "acao popular", "acao civil publica")) return T.cpcAcao;
      return T.cpcJurisdicao;
    }

    if (discipline === "direito agrario") {
      if (has("contratos agrarios")) return T.agrarioContratos;
      if (has("terras indigenas", "quilombolas")) return T.agrarioIndigenas;
      if (has("regularizacao fundiaria")) return T.agrarioRegularizacao;
      if (has("processo de desapropriacao")) return T.agrarioDesapropriacao;
      if (has("reforma agraria")) return T.agrarioReforma;
      if (has("usucapiao")) return T.agrarioUsucapiao;
      if (has("funcao social", "registro do imovel rural")) return T.agrarioPropriedade;
      return T.agrarioNocoes;
    }

    if (discipline === "direito ambiental") {
      if (has("principios do direito ambiental")) return T.ambientalPrincipios;
      if (has("constituicao federal")) return T.ambientalConstituicao;
      if (has("florestal", "12 651 2012", "11 428 2006")) return T.ambientalFlorestal;
      if (has("unidades de conservacao", "9 985 2000")) return T.ambientalSnuc;
      if (has("6 514 2008", "procedimento administrativo")) return T.ambientalDecreto;
      if (has("crimes e infracoes", "9 605 1998", "poder de policia")) return T.ambientalCrimes;
      if (has("sisnama")) return T.ambientalSisnama;
      if (has("licenciamento", "instrumentos da politica")) return T.ambientalInstrumentos;
      if (has("politica nacional", "biosseguranca", "organismos geneticamente")) return T.ambientalPnma;
      if (has("responsabilidade", "dano", "reparacao")) return T.ambientalResponsabilidade;
    }

    if (discipline === "direito digital") {
      if (has("autoridade nacional", "anpd", "portaria", "resolucao cd anpd")) return T.digitalAnpd;
      if (has("lgpd", "protecao de dados", "dados pessoais", "privacidade", "titular dos dados", "tratamento dos dados", "violacao de dados")) return T.digitalLgpd;
      if (has("marco civil", "direitos e garantias dos usuarios", "responsabilidade no marco")) return T.digitalMarco;
      return T.digitalConceitos;
    }

    if (discipline === "ciencias forenses") {
      if (has("documentoscopia", "grafoscopia", "documentos", "escrita", "assinaturas", "falsificacoes")) return T.documentoscopia;
      if (has("escolas", "escola classica", "escola positiva")) return T.criminologiaEscolas;
      if (has("teorias", "criminologia critica", "sociologia criminal", "etiquetamento", "abolicionismo", "conflito")) return T.criminologiaTeorias;
      if (has("controle social", "prevencao", "politica criminal", "atuacao policial", "perfil criminal", "criminologia digital", "crimes digitais", "deep web", "vitimizacao digital")) return T.criminologiaContemporanea;
      return T.criminologiaConceito;
    }

    if (discipline === "criminologia") {
      if (has("teorias sociologicas")) return T.criminologiaTeorias;
      if (has("prevencao", "modelos de reacao")) return T.criminologiaContemporanea;
      return T.criminologiaConceito;
    }

    if (discipline === "direito administrativo e gestao publica") {
      if (has("governanca")) return T.gestaoGovernanca;
      if (has("gestao por resultados", "eficiencia administrativa", "planejamento", "gestao estrategica")) return T.gestaoResultados;
      if (has("gestao publica")) return T.gestaoOrganizacao;
      if (has("regime juridico administrativo")) return v336("Princípios da Administração Pública", "direito-direito-administrativo");
      if (has("desconcentracao", "descentralizacao", "orgaos publicos")) return v336("Administração Direta", "direito-direito-administrativo");
      if (has("controle interno", "controle externo")) return v336("Controle da administração pública", "direito-direito-administrativo");
    }

    if (discipline === "direito administrativo") {
      if (has("intervencao do estado sobre a propriedade", "intervencao do estado na propriedade")) return T.administrativoIntervencao;
      if (has("aquisicao e alienacao dos bens publicos")) return T.administrativoBensAquisicao;
      if (has("formas de utilizacao dos bens publicos", "utilizacao dos bens publicos")) return T.administrativoBensUso;
      if (has("bens publicos")) return T.administrativoBens;
      if (has("convenios e consorcios")) return T.administrativoConsorcios;
      if (has("licitacoes")) return v336("Licitações e Lei nº 14.133 de 2021", "direito-direito-administrativo");
      if (has("cargo", "emprego", "funcao public", "provimento", "vacancia")) return v336("Agentes públicos e Lei 8.112 de 1990", "direito-direito-administrativo");
      if (has("agencias reguladoras")) return v336("Autarquias", "direito-direito-administrativo");
      if (has("ato administrativo", "silencio", "cassacao", "autoexecutoriedade", "discricionariedade", "vicios", "motivos determinantes", "9 784 1999")) return v336("Atos administrativos", "direito-direito-administrativo");
      if (has("dever de agir", "dever de eficiencia", "dever de prestacao", "sistemas administrativos")) return v336("Princípios da Administração Pública", "direito-direito-administrativo");
      if (has("dever de probidade")) return v336("Improbidade administrativa - Lei nº 8.429 de 1992 e Lei nº 14.230 de 2021", "direito-direito-administrativo");
    }

    if (discipline === "medicina legal") {
      const references = [...String(item.reference || "").matchAll(/item\s+(\d+(?:\.\d+)*)/gi)];
      const top = references.at(-1)?.[1]?.split(".")[0];
      const labels = { "1": "Perícia", "2": "Traumatologia Forense", "3": "Asfixiologia Forense", "4": "Tanatologia Forense", "5": "Sexologia Forense", "6": "Toxicologia", "7": "Psiquiatria Forense" };
      return top && v336(labels[top], "criminalistica-medicina-legal");
    }

    if (discipline === "legislacao estadual e institucional") {
      return T.legislacaoParana;
    }

    if (discipline === "legislacao penal e legislacao processual penal extravagante") {
      return T.legislacaoPenalEspecial;
    }

    if (discipline === "direitos humanos") {
      if (has("dimensoes", "geracoes")) return T.dhGeracoes;
      if (has("caracteristicas", "fundamentacao", "dignidade")) return T.dhCaracteristicas;
      if (has("declaracao universal")) return T.dhDudh;
      if (has("direitos civis e politicos")) return T.dhPidcp;
      if (has("direitos economicos", "sociais e culturais")) return T.dhPidesc;
      if (has("convencao americana", "pacto de san jose")) return T.dhConvencao;
      if (has("comissao interamericana", "corte interamericana", "organizacao dos estados americanos", "oea")) return T.dhComissao;
      if (has("sistema interamericano")) return T.dhInteramericano;
      if (has("direito internacional", "tratados", "controle de convencionalidade", "relacoes internacionais")) return T.dhInternacional;
      return T.dhPndh;
    }

    if (discipline === "direito constitucional") {
      if (has("poder constituinte", "reforma", "revisao constitucionais", "emendas", "mutacao constitucional")) return T.constitucionalPoder;
      if (has("normas constitucionais", "eficacia plena")) return T.constitucionalNormas;
      if (has("teoria da constituicao", "classificacoes das constituicoes", "supremacia", "desconstitucionalizacao", "ciclos constitucionais")) return T.constitucionalTeoria;
      if (has("interpretacao constitucional")) return T.constitucionalInterpretacao;
      if (has("controle", "inconstitucionalidade", "arguicao de descumprimento")) return v336("Controle de Constitucionalidade", "direito-direito-constitucional");
      if (has("partidos politicos")) return v336("Direitos Políticos", "direito-direito-constitucional");
      if (has("forcas armadas", "defesa do estado", "estado de defesa", "estado de sitio", "policia militar", "corpo de bombeiros", "policia penal", "policia cientifica")) return v336("Forças Armadas e Segurança Pública", "direito-direito-constitucional");
      if (has("ordem social", "seguridade social", "educacao", "cultura", "desporto", "meio ambiente", "familia", "crianca", "adolescente", "idoso")) return T.constitucionalOrdemSocial;
      if (has("organizacao politico", "estado federal", "estados federados", "territorios")) return v336("Organização Político-Administrativa do Estado", "direito-direito-constitucional");
      if (has("poder legislativo", "comissoes parlamentares", "processo legislativo", "freios e contrapesos")) return v336("Poder Legislativo", "direito-direito-constitucional");
      if (has("poder executivo", "sistema de governo", "chefia de estado", "presidente da republica")) return v336("Poder Executivo", "direito-direito-constitucional");
      if (has("poder judiciario")) return v336("Poder Judiciário", "direito-direito-constitucional");
      if (has("sistema tributario", "poder de tributar", "impostos", "receitas tributarias")) return T.constitucionalTributario;
      if (has("financas publicas", "ordem economica", "atividade economica", "politica urbana", "agricola e fundiaria")) return T.constitucionalEconomica;
      if (has("direito a vida", "liberdade", "igualdade", "seguranca", "propriedade", "remedios")) return v336("Direitos Individuais", "direito-direito-constitucional");
    }

    if (discipline === "direito penal") {
      if (has("imputabilidade", "descriminantes putativas")) return v336("Culpabilidade", "direito-direito-penal");
      if (has("concurso de agentes", "elementares e circunstancias")) return v336("Concurso de Pessoas", "direito-direito-penal");
      if (has("regime de cumprimento")) return v336("Penas privativas de liberdade", "direito-direito-penal");
      if (has("cominacao das penas", "aplicacao da pena")) return v336("Sanções penais", "direito-direito-penal");
      if (has("condicoes de punibilidade")) return v336("Decadência.", "direito-direito-penal");
      if (has("crime contra a organizacao do trabalho")) return v336("Crimes contra a organização do trabalho", "direito-direito-penal");
      if (has("sentimento religioso")) return v336("Crimes contra o sentimento religioso e contra o respeito aos mortos", "direito-direito-penal");
      if (has("caracteristicas", "fontes", "interpretacao", "vigencia", "aplicacao")) return v336("Lei penal no tempo", "direito-direito-penal");
      if (has("bem juridico", "tipicidade", "teoria da acao", "imputacao objetiva", "consumacao", "tentativa", "desistencia", "arrependimento", "crime impossivel", "agravacao pelo resultado")) return v336("Conceito de crime", "direito-direito-penal");
      if (has("principios", "direito penal e politica", "evolucao", "escolas penais")) return v336("Conceito de crime", "direito-direito-penal");
    }

    if (discipline === "direito processual penal") {
      if (has("lei processual", "aplicacao da lei", "fontes")) return T.processoLei;
      if (has("criterios de determinacao", "incompetencia")) return T.processoCompetencia;
      if (has("questoes e processos incidentes")) return T.processoIncidentes;
      if (has("sujeitos do processo", "juiz ministerio publico")) return T.processoSujeitos;
      if (has("busca e apreensao")) return v336("Busca e apreensão", "direito-direito-processual-penal");
      if (has("prisao especial", "liberdade provisoria", "12 403 2011")) return v336("Medidas cautelares pessoais: normas fundamentais, pressupostos e fundamentos", "direito-direito-processual-penal");
      if (has("sentenca criminal")) return T.processoSentenca;
      if (has("citacao", "intimacao")) return T.processoCitacoes;
      if (has("principios gerais", "sistemas processuais")) return v336("Sistemas processuais", "direito-direito-processual-penal");
    }

    if (discipline === "legislacao penal e processual penal especial") {
      if (has("8 429 1992")) return v336("Improbidade administrativa - Lei nº 8.429 de 1992 e Lei nº 14.230 de 2021", "direito-direito-administrativo");
      if (has("14 133 2021")) return v336("Crimes em Licitações e Contratos Administrativos", "direito-direito-penal");
      if (has("9 609 1998")) return v336("Crimes contra a propriedade intelectual de programa de computador - Lei n° 9.609/1998", "direito-direito-penal");
      if (has("1 521 1951", "8 176 1991")) return v336("Crimes contra o Consumidor, a Ordem Econômica e Tributária – Lei nº 8.078 de 1990 e Lei nº 8.137 de 1990", "direito-direito-penal");
      return T.legislacaoPenalEspecial;
    }

    return null;
  }

  function parsedUrl(route = {}) {
    try { return route.url ? new URL(route.url) : null; } catch { return null; }
  }

  function alreadyNative(route, url) {
    if (!url || route.automaticFilters?.subject !== true || url.searchParams.has("q")) return false;
    return url.searchParams.getAll("subject_ids[]").some((id) => /^\d+$/.test(id))
      || url.pathname.startsWith(PREFIX) && url.pathname.split("/").filter(Boolean).length >= 5;
  }

  function repairRoute(route = {}, item = {}) {
    const url = parsedUrl(route);
    if (!url || alreadyNative(route, url)) return route;
    const resolved = catalogTarget(item);
    if (!resolved) return route;

    url.pathname = `${PREFIX}${resolved.disciplineSlug}/${resolved.subjectSlug}/questoes`;
    url.searchParams.delete("q");
    url.searchParams.delete("discipline_ids[]");
    url.searchParams.delete("subject_ids[]");

    return {
      ...route,
      url: url.toString(),
      qcSubjectLabel: resolved.label,
      subjectIds: [],
      subjectIdSource: "verified-current-catalog-v337",
      subjectRouteSource: "verified-current-catalog-v337",
      subjectCoherence: "verified-current-catalog-parent-v337",
      catalogCoverageVersion: VERSION,
      qcLinkStatus: "direct",
      qcLinkStatusLabel: "✅ Disciplina e assunto do QConcursos aplicados",
      automaticFilters: { ...route.automaticFilters, discipline: true, subject: true, search: false }
    };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;
  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV337(item = {}, board = "") {
    return repairRoute(previousBuildQconcursosFilterRoute(item, board), item);
  };

  if (typeof queueMicrotask === "function") queueMicrotask(() => {
    try { if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute(); } catch {}
  });

  Object.defineProperty(globalThis, "__aldusQconcursosCurrentCatalogV337", {
    value: Object.freeze({ VERSION, targets: T, catalogTarget, repairRoute }),
    configurable: true
  });
})();
