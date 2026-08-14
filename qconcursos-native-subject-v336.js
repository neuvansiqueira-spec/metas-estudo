(() => {
  "use strict";

  const VERSION = "20260814-qconcursos-assunto-nativo-v336";
  const QUESTION_PATH_PREFIX = "/questoes-de-concursos/disciplinas/";
  const VERIFIED_PUBLIC_TAXONOMY = Object.freeze([
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "1.3",
    "canonicalLabel": "Sistemas Processuais Penais",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "1.3",
    "currentLabel": "Sistemas processuais"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "5",
    "canonicalLabel": "Inquérito Policial",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "5",
    "currentLabel": "Inquérito Policial"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "5.8",
    "canonicalLabel": "Indiciamento",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "5.8",
    "currentLabel": "Indiciamento"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "5.9",
    "canonicalLabel": "Encerramento do Inquérito",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "5.9",
    "currentLabel": "Encerramento do Inquérito Policial"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "5.3",
    "canonicalLabel": "Valor Probatório do Inquérito",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "5.3",
    "currentLabel": "Valor Probatório"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "8",
    "canonicalLabel": "Ação Penal",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "8",
    "currentLabel": "Ação Penal"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "14.3",
    "canonicalLabel": "Ônus da Prova",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "14.3",
    "currentLabel": "Ônus da prova"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "11.2",
    "canonicalLabel": "Medidas Cautelares Pessoais",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "11.2",
    "currentLabel": "Medidas cautelares pessoais: normas fundamentais, pressupostos e fundamentos"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "22.6",
    "canonicalLabel": "Recurso em Sentido Estrito",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "22.6",
    "currentLabel": "Recurso em sentido estrito"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "22.7",
    "canonicalLabel": "Apelação",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "22.7",
    "currentLabel": "Apelação no Processo Penal"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "23.1",
    "canonicalLabel": "Habeas Corpus",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "23.1",
    "currentLabel": "Habeas Corpus no Processo Penal"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "23.2",
    "canonicalLabel": "Revisão Criminal",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "23.2",
    "currentLabel": "Revisão Criminal"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "21",
    "canonicalLabel": "Nulidades",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "21",
    "currentLabel": "Nulidades no Processo Penal"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "17.6",
    "canonicalLabel": "Procedimento relativo aos Crimes de Responsabilidade dos Funcionários Públicos",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "17.6",
    "currentLabel": "Procedimento especial dos crimes praticados por servidores públicos contra a administração em geral"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "17.7",
    "canonicalLabel": "Processo e julgamento dos crimes de Calúnia e Injúria",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "17.7",
    "currentLabel": "Procedimento especial dos crimes contra a honra"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "17.5",
    "canonicalLabel": "Procedimento do Tribunal do Júri",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "17.5",
    "currentLabel": "Procedimento especial dos crimes de competência do Tribunal do Júri"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "14.10",
    "canonicalLabel": "Lei de Proteção a Vítimas e Testemunhas",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "14.10",
    "currentLabel": "Lei nº 9.807 de 1999 - Lei de Proteção à Vítima e à Testemunha"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "24",
    "canonicalLabel": "Lei de Interceptação Telefônica",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "24",
    "currentLabel": "Lei da Interceptação Telefônica - Lei nº 9.296 de 1996"
  },
  {
    "sourceDiscipline": "DIREITO PROCESSUAL PENAL",
    "qcNumber": "14.15",
    "canonicalLabel": "Busca e Apreensão de Dispositivos Eletrônicos e Evidências Digitais",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "14.15",
    "currentLabel": "Busca e apreensão"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "1.5",
    "canonicalLabel": "Lei Penal no Tempo",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "1.5",
    "currentLabel": "Lei penal no tempo"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "1.6",
    "canonicalLabel": "Lei Penal no Espaço",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "1.6",
    "currentLabel": "Lei penal no espaço"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "2.2",
    "canonicalLabel": "Conceito de crime",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "2.2",
    "currentLabel": "Conceito de crime"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "3.19",
    "canonicalLabel": "Erro de Tipo",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "3.19",
    "currentLabel": "Erro de tipo acidental"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "5",
    "canonicalLabel": "Culpabilidade",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "5",
    "currentLabel": "Culpabilidade"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "6",
    "canonicalLabel": "Concurso de Pessoas",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "6",
    "currentLabel": "Concurso de Pessoas"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "17.1",
    "canonicalLabel": "Conceito, Finalidades e Espécies de Penas",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "9",
    "currentLabel": "Sanções penais"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "10",
    "canonicalLabel": "Penas Privativas de Liberdade",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "10",
    "currentLabel": "Penas privativas de liberdade"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "12",
    "canonicalLabel": "Pena de Multa",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "12",
    "currentLabel": "Pena de multa"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "14",
    "canonicalLabel": "Livramento Condicional",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "14",
    "currentLabel": "Livramento condicional"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "15",
    "canonicalLabel": "Efeitos da Condenação",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "15",
    "currentLabel": "Efeitos da condenação"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "16",
    "canonicalLabel": "Reabilitação",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "16",
    "currentLabel": "Reabilitação criminal"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "18.14",
    "canonicalLabel": "Decadência e Perempção",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "18.14",
    "currentLabel": "Decadência."
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "19.1",
    "canonicalLabel": "Homicídio",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "19.1",
    "currentLabel": "Homicídio"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "20",
    "canonicalLabel": "Lesões Corporais",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "20",
    "currentLabel": "Lesões corporais"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "21",
    "canonicalLabel": "Periclitação da Vida e da Saúde",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "21",
    "currentLabel": "Periclitação da vida e da saúde"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "22",
    "canonicalLabel": "Rixa",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "22",
    "currentLabel": "Rixa"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "23",
    "canonicalLabel": "Crimes contra a Honra",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "23",
    "currentLabel": "Crimes contra a honra"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28",
    "canonicalLabel": "Crimes Contra o Patrimônio",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28",
    "currentLabel": "Crimes contra o patrimônio"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28.1",
    "canonicalLabel": "Furto",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28.1",
    "currentLabel": "Furto"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28.2",
    "canonicalLabel": "Roubo e Extorsão",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28.2",
    "currentLabel": "Roubo"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28.7",
    "canonicalLabel": "Dano",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28.7",
    "currentLabel": "Dano"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28.8",
    "canonicalLabel": "Apropriação Indébita",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28.8",
    "currentLabel": "Apropriação indébita"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28.9",
    "canonicalLabel": "Estelionato e Outras Fraudes",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28.9",
    "currentLabel": "Estelionato"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "28.12",
    "canonicalLabel": "Receptação",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "28.12",
    "currentLabel": "Receptação"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "29",
    "canonicalLabel": "Crimes Contra a Propriedade Imaterial",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "29",
    "currentLabel": "Crimes contra a propriedade imaterial"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "40.9",
    "canonicalLabel": "Crimes contra a Propriedade Intelectual",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.9",
    "currentLabel": "Crimes contra a propriedade intelectual de programa de computador - Lei n° 9.609/1998"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "33",
    "canonicalLabel": "Crimes Contra a Dignidade Sexual",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "33",
    "currentLabel": "Crimes contra a dignidade sexual"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "33.1",
    "canonicalLabel": "Estupro e demais Crimes Sexuais",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "33.1",
    "currentLabel": "Estupro"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "34.1",
    "canonicalLabel": "Bigamia",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "34.1",
    "currentLabel": "Bigamia"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "34.7",
    "canonicalLabel": "Abandono Material",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "34.7",
    "currentLabel": "Abandono material"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "35",
    "canonicalLabel": "Crimes Contra a Incolumidade Pública",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "35",
    "currentLabel": "Crimes contra a incolumidade pública"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "35.1",
    "canonicalLabel": "Crimes de Perigo Comum",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "35.1",
    "currentLabel": "Crimes de perigo comum"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "35.3",
    "canonicalLabel": "Crimes contra a Saúde Pública",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "35.3",
    "currentLabel": "Crimes contra a saúde pública"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "36",
    "canonicalLabel": "Crimes Contra a Paz Pública",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "36",
    "currentLabel": "Crimes contra a paz pública"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "36.3",
    "canonicalLabel": "Associação Criminosa",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "36.3",
    "currentLabel": "Associação criminosa"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "36.4",
    "canonicalLabel": "Constituição de Milícia Privada",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "36.4",
    "currentLabel": "Constituição de Milícia Privada"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "37",
    "canonicalLabel": "Crimes Contra a Fé Pública",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "37",
    "currentLabel": "Crimes contra a fé pública"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "37.1",
    "canonicalLabel": "Moeda Falsa",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "37.1",
    "currentLabel": "Moeda falsa"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "37.4",
    "canonicalLabel": "Falsidade de Documento Público e Particular",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "37.4",
    "currentLabel": "Falsidade de documento público"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "37.6",
    "canonicalLabel": "Falsidade Ideológica",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "37.6",
    "currentLabel": "Falsidade ideológica"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "38",
    "canonicalLabel": "Crimes Contra a Administração Pública",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "38",
    "currentLabel": "Crimes contra a administração pública"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "38.47",
    "canonicalLabel": "Crimes Contra as Finanças Públicas",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "38.47",
    "currentLabel": "Crimes contra as finanças públicas"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "38.31",
    "canonicalLabel": "Crimes em Licitações e Contratos Administrativos",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "38.31",
    "currentLabel": "Crimes em Licitações e Contratos Administrativos"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "20.4",
    "canonicalLabel": "Violência Doméstica e Familiar Contra a Mulher",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "20.4",
    "currentLabel": "Violência doméstica"
  },
  {
    "sourceDiscipline": "DIREITO PENAL",
    "qcNumber": "20.4",
    "canonicalLabel": "Violência Doméstica e Familiar Contra Criança e Adolescente – Lei Henry Borel",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "20.4",
    "currentLabel": "Violência doméstica"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "2.2",
    "canonicalLabel": "Princípios da Administração Pública",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "2.2",
    "currentLabel": "Princípios da Administração Pública"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "3.2",
    "canonicalLabel": "Administração direta e indireta",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "3.2",
    "currentLabel": "Administração Direta"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "3.5",
    "canonicalLabel": "Autarquias",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "3.5",
    "currentLabel": "Autarquias"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "3.7",
    "canonicalLabel": "Fundações",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "3.7",
    "currentLabel": "Fundações Públicas"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "3.8",
    "canonicalLabel": "Empresas públicas",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "3.8",
    "currentLabel": "Empresas Públicas e Sociedades de Economia Mista"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "5",
    "canonicalLabel": "Atos Administrativos",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "5",
    "currentLabel": "Atos administrativos"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "5.2",
    "canonicalLabel": "Requisitos",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "5.2",
    "currentLabel": "Requisitos do ato administrativo – competência, finalidade, forma, motivo e objeto"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "5.4",
    "canonicalLabel": "Atributos",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "5.4",
    "currentLabel": "Atributos do ato administrativo – presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "4.4",
    "canonicalLabel": "Poder de polícia",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "4.4",
    "currentLabel": "Poder de polícia"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "4.1",
    "canonicalLabel": "Abuso de poder",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "4.1",
    "currentLabel": "Abuso de Poder"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "13",
    "canonicalLabel": "Serviços Públicos",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "13",
    "currentLabel": "Serviços Públicos"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "9",
    "canonicalLabel": "Lei nº 14.133/2021",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "9",
    "currentLabel": "Licitações e Lei nº 14.133 de 2021"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "18",
    "canonicalLabel": "Agentes Públicos",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "18",
    "currentLabel": "Agentes públicos e Lei 8.112 de 1990"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "18.9",
    "canonicalLabel": "Responsabilidades",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "18.9",
    "currentLabel": "Responsabilidades do servidor"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "15",
    "canonicalLabel": "Responsabilidade Civil do Estado",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "15",
    "currentLabel": "Responsabilidade civil do estado"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "17",
    "canonicalLabel": "Improbidade Administrativa",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "17",
    "currentLabel": "Improbidade administrativa - Lei nº 8.429 de 1992 e Lei nº 14.230 de 2021"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "17.2",
    "canonicalLabel": "Atos de improbidade",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "17.2",
    "currentLabel": "Atos de Improbidade Administrativa e suas Sanções"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "16",
    "canonicalLabel": "Controle da Administração Pública",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "16",
    "currentLabel": "Controle da administração pública"
  },
  {
    "sourceDiscipline": "DIREITO ADMINISTRATIVO",
    "qcNumber": "16.2",
    "canonicalLabel": "Controle administrativo",
    "disciplineSlug": "direito-direito-administrativo",
    "currentNumber": "16.2",
    "currentLabel": "Controle administrativo, judicial e legislativo"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "5",
    "canonicalLabel": "Direitos individuais e coletivos",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "5",
    "currentLabel": "Direitos Individuais"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "7",
    "canonicalLabel": "Direitos sociais",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "7",
    "currentLabel": "Direitos Sociais"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "9",
    "canonicalLabel": "Direitos políticos",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "9",
    "currentLabel": "Direitos Políticos"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "6.2",
    "canonicalLabel": "Habeas corpus",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "6.2",
    "currentLabel": "Habeas Corpus"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "6.3",
    "canonicalLabel": "Habeas data",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "6.3",
    "currentLabel": "Habeas Data"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "6.4",
    "canonicalLabel": "Mandado de segurança",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "6.4",
    "currentLabel": "Mandado de Segurança"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "6.6",
    "canonicalLabel": "Mandado de injunção",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "6.6",
    "currentLabel": "Mandado de Injunção"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "6.7",
    "canonicalLabel": "Ação popular",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "6.7",
    "currentLabel": "Ação Popular"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "16",
    "canonicalLabel": "Poder Executivo",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "16",
    "currentLabel": "Poder Executivo"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "14",
    "canonicalLabel": "Poder Legislativo",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "14",
    "currentLabel": "Poder Legislativo"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "17",
    "canonicalLabel": "Poder Judiciário",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "17",
    "currentLabel": "Poder Judiciário"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "20",
    "canonicalLabel": "Controle de constitucionalidade",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "20",
    "currentLabel": "Controle de Constitucionalidade"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "20.8",
    "canonicalLabel": "Ação declaratória de constitucionalidade",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "20.8",
    "currentLabel": "Ação Declaratória de Constitucionalidade - ADC"
  },
  {
    "sourceDiscipline": "DIREITO CONSTITUCIONAL",
    "qcNumber": "12.2",
    "canonicalLabel": "Servidores públicos",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "12.2",
    "currentLabel": "Servidores Públicos"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "1",
    "canonicalLabel": "Medicina Legal",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "1",
    "currentLabel": "Medicina Legal - Conceito"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "3.3",
    "canonicalLabel": "Perícia médico-legal",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "3.3",
    "currentLabel": "Perícia"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "7",
    "canonicalLabel": "Antropologia Forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "7",
    "currentLabel": "Antropologia Forense"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "4",
    "canonicalLabel": "Sexologia Forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "4",
    "currentLabel": "Sexologia Forense"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "3",
    "canonicalLabel": "Traumatologia Forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "3",
    "currentLabel": "Traumatologia Forense"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "5",
    "canonicalLabel": "Asfixiologia forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "5",
    "currentLabel": "Asfixiologia Forense"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "3.4",
    "canonicalLabel": "Balística forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "3.4",
    "currentLabel": "Balística"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "6",
    "canonicalLabel": "Tanatologia Forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "6",
    "currentLabel": "Tanatologia Forense"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "11",
    "canonicalLabel": "Toxicologia Forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "11",
    "currentLabel": "Toxicologia"
  },
  {
    "sourceDiscipline": "MEDICINA LEGAL",
    "qcNumber": "3.3",
    "canonicalLabel": "Perícia psiquiátrica forense",
    "disciplineSlug": "criminalistica-medicina-legal",
    "currentNumber": "8",
    "currentLabel": "Psiquiatria Forense"
  },
  {
    "sourceDiscipline": "DIREITOS HUMANOS",
    "qcNumber": "5.26",
    "canonicalLabel": "Agenda 2030 e Objetivos de Desenvolvimento Sustentável – ODS",
    "disciplineSlug": "direito-direitos-humanos",
    "currentNumber": "5.26",
    "currentLabel": "Agenda 2030"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.1",
    "canonicalLabel": "Decreto-Lei nº 3.688/1941",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.1",
    "currentLabel": "Lei de Contravenções Penais - Decreto-Lei nº 3.688 de 1941"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.7",
    "canonicalLabel": "Lei nº 8.137/1990",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.7",
    "currentLabel": "Crimes contra o Consumidor, a Ordem Econômica e Tributária – Lei nº 8.078 de 1990 e Lei nº 8.137 de 1990"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.2",
    "canonicalLabel": "Lei nº 13.869/2019",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.2",
    "currentLabel": "Lei do Abuso de Autoridade – Lei nº 4.898 de 1965 e Lei n° 13.869 de 2019"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.13",
    "canonicalLabel": "Lei nº 11.343/2006",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.13",
    "currentLabel": "Lei de Tóxicos – Lei nº 11.343 de 2006"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.5",
    "canonicalLabel": "Lei nº 7.716/1989",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.5",
    "currentLabel": "Crimes Resultantes de Preconceito de Raça ou Cor – Lei nº 7.716 de 1989"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.11",
    "canonicalLabel": "Lei nº 10.826/2003",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.11",
    "currentLabel": "Lei de Armas (Estatuto do Desarmamento) – Lei nº 10.826 de 2003 e Decretos Regulamentares"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.8",
    "canonicalLabel": "Lei nº 9.455/1997",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.8",
    "currentLabel": "Lei dos Crimes de Tortura – Lei nº 9.455 de 1997"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.6",
    "canonicalLabel": "Lei nº 8.072/1990",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.6",
    "currentLabel": "Lei de Crimes Hediondos – Lei nº 8.072 de 1990"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.4",
    "canonicalLabel": "Lei nº 7.492/1986",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.4",
    "currentLabel": "Lei do Colarinho Branco - Lei nº 7.492 de 1986 - Crimes contra o Sistema Financeiro Nacional"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    "qcNumber": "40.10",
    "canonicalLabel": "Lei nº 9.613/1998",
    "disciplineSlug": "direito-direito-penal",
    "currentNumber": "40.10",
    "currentLabel": "Lei da Lavagem de Dinheiro - Lei nº 9.613 de 1998"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL",
    "qcNumber": "11.8",
    "canonicalLabel": "Lei nº 7.960/1989",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "11.8",
    "currentLabel": "Da Prisão Temporária"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL",
    "qcNumber": "14.10",
    "canonicalLabel": "Lei nº 9.807/1999",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "14.10",
    "currentLabel": "Lei nº 9.807 de 1999 - Lei de Proteção à Vítima e à Testemunha"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL",
    "qcNumber": "17.4",
    "canonicalLabel": "Lei nº 9.099/1995",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "17.4",
    "currentLabel": "Procedimento comum sumaríssimo - Lei nº 9.099 de 1995 - Lei dos Juizados Especiais Criminais - JECRIM"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL",
    "qcNumber": "24",
    "canonicalLabel": "Lei nº 9.296/1996",
    "disciplineSlug": "direito-direito-processual-penal",
    "currentNumber": "24",
    "currentLabel": "Lei da Interceptação Telefônica - Lei nº 9.296 de 1996"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS",
    "qcNumber": "10",
    "canonicalLabel": "Política Nacional de Direitos Humanos",
    "disciplineSlug": "direito-direitos-humanos",
    "currentNumber": "10",
    "currentLabel": "Programa Nacional de Direitos Humanos (PNDH)"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS",
    "qcNumber": "5.26",
    "canonicalLabel": "Agenda 2030",
    "disciplineSlug": "direito-direitos-humanos",
    "currentNumber": "5.26",
    "currentLabel": "Agenda 2030"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "3",
    "canonicalLabel": "Art. 1º ao art. 4º",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "3",
    "currentLabel": "Princípios Fundamentais da República"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "5",
    "canonicalLabel": "Art. 5º",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "5",
    "currentLabel": "Direitos Individuais"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "7",
    "canonicalLabel": "Art. 6º ao art. 11",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "7",
    "currentLabel": "Direitos Sociais"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "8",
    "canonicalLabel": "Art. 12 e art. 13",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "8",
    "currentLabel": "Direitos da Nacionalidade"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "9",
    "canonicalLabel": "Art. 14 ao art. 16",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "9",
    "currentLabel": "Direitos Políticos"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "11",
    "canonicalLabel": "Art. 18 ao art. 36",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "11",
    "currentLabel": "Organização Político-Administrativa do Estado"
  },
  {
    "sourceDiscipline": "LEGISLAÇÃO ESPECÍFICA – DIREITO CONSTITUCIONAL",
    "qcNumber": "21.3",
    "canonicalLabel": "Art. 144",
    "disciplineSlug": "direito-direito-constitucional",
    "currentNumber": "21.3",
    "currentLabel": "Forças Armadas e Segurança Pública"
  }
]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parsedUrl(route = {}) {
    try {
      return route.url ? new URL(route.url) : null;
    } catch {
      return null;
    }
  }

  function hasNativeSubjectId(url) {
    return url.searchParams.getAll("subject_ids[]").some((value) => /^\d+$/.test(value));
  }

  function resolveVerifiedSubjectRoute(route = {}, item = {}) {
    if (!["exact", "category"].includes(route.auditedMatchKind)) return null;
    const catalog = globalThis.__aldusQconcursosAllFiltersV334;
    const disciplineSlug = catalog?.resolveDisciplineRoute?.(item)?.slug || "";
    const qcNumber = String(route.qcNumber || "").trim();
    const canonicalLabel = normalize(route.qcSubjectLabel);
    if (!disciplineSlug || !qcNumber || !canonicalLabel) return null;

    return VERIFIED_PUBLIC_TAXONOMY.find((entry) =>
      entry.disciplineSlug === disciplineSlug
      && entry.qcNumber === qcNumber
      && normalize(entry.canonicalLabel) === canonicalLabel
    ) || VERIFIED_PUBLIC_TAXONOMY.find((entry) =>
      entry.disciplineSlug === disciplineSlug
      && normalize(entry.canonicalLabel) === canonicalLabel
    ) || null;
  }

  function repairRoute(route = {}, item = {}) {
    const url = parsedUrl(route);
    if (!url || hasNativeSubjectId(url)) return route;

    const safety = globalThis.__aldusQconcursosRouteSafetyV335;
    if (safety?.hasTrustedCanonicalSubjectRoute?.(route, url)) return route;

    const verified = resolveVerifiedSubjectRoute(route, item);
    if (!verified) return route;

    const subjectSlug = slugify(verified.currentLabel);
    if (!subjectSlug) return route;

    url.pathname = `${QUESTION_PATH_PREFIX}${verified.disciplineSlug}/${subjectSlug}/questoes`;
    url.searchParams.delete("q");
    url.searchParams.delete("discipline_ids[]");
    url.searchParams.delete("subject_ids[]");

    const category = route.auditedMatchKind === "category";
    return {
      ...route,
      url: url.toString(),
      qcSubjectLabel: verified.currentLabel,
      qcNumber: verified.currentNumber,
      subjectIds: [],
      subjectIdSource: "verified-public-taxonomy-v336",
      subjectRouteSource: "verified-public-taxonomy-v336",
      subjectCoherence: category
        ? "verified-public-taxonomy-category-v336"
        : "verified-public-taxonomy-exact-v336",
      catalogCoverageVersion: VERSION,
      qcLinkStatus: category ? "category" : "direct",
      qcLinkStatusLabel: category
        ? "🟡 Assunto correspondente do QConcursos aplicado"
        : "✅ Disciplina e assunto do QConcursos aplicados",
      automaticFilters: {
        ...route.automaticFilters,
        discipline: true,
        subject: true,
        search: false
      }
    };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;
  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV336(item = {}, board = "") {
    return repairRoute(previousBuildQconcursosFilterRoute(item, board), item);
  };

  function refreshVisibleRoute() {
    try {
      if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute();
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível aplicar o assunto nativo do QConcursos na V336.", error);
    }
  }

  if (typeof queueMicrotask === "function") queueMicrotask(refreshVisibleRoute);
  else if (typeof setTimeout === "function") setTimeout(refreshVisibleRoute, 0);

  Object.defineProperty(globalThis, "__aldusQconcursosNativeSubjectV336", {
    value: Object.freeze({
      VERSION,
      routes: VERIFIED_PUBLIC_TAXONOMY,
      resolveVerifiedSubjectRoute,
      repairRoute
    }),
    configurable: true
  });
})();

