(() => {
  "use strict";

  // V448 — As aulas restantes do Dedicação Delta FULL viram metas do dia.
  //
  // O curso tem 9 semanas e 47 aulas únicas (a Semana 06 traz quatro delas
  // duplicadas, com dois padrões de nome). A Semana 01 já foi feita: restam 42.
  //
  // Elas entram JUNTO com as metas que o Planejamento já gera, não no lugar
  // delas — foi a escolha do usuário, e é como ele já vinha fazendo com a
  // Semana 01, que criou à mão.
  //
  // A ORDEM NÃO É A DO CURSO. É a ordem em que as aulas rendem ponto para ele,
  // medida no próprio estado do app em 04/09/2026:
  //
  //   Atos Administrativos ......... 12 erros no caderno (maior cluster único)
  //   Poderes da Administração ..... 4 erros
  //   Crimes contra pessoa/patrim... insegurança declarada por ele: não lembra
  //                                  as qualificadoras e causas de aumento.
  //                                  Não está no caderno de erros porque nunca
  //                                  foi testado — e é dado do mesmo jeito.
  //   Direitos Humanos ............. 14 erros com apenas 2h investidas
  //   Medicina Legal + Criminologia. Ciências Forenses são 100 itens do edital,
  //                                  o maior bloco de todos, com 4h investidas
  //   Direito Constitucional ....... 70 itens, 5h, quase nunca testado
  //
  // Penal, Processual Penal e Legislação Especial somam 33h já estudadas e vão
  // para o Bloco 2, de consolidação. Indo na ordem cronológica do curso, a aula
  // de Atos Administrativos (Semana 05) só chegaria daqui a quatro semanas.
  //
  // Ritmo: 2 horas por dia, 2 aulas por dia, 60 minutos planejados cada.
  // Bloco 1 termina em 17/09, Bloco 2 em 25/09, e sobram 16 dias livres até a
  // prova da PCPR em 11/10.
  //
  // SEGURANÇA
  // - roda uma vez só, guardada por state.migrations.deltaFullPlanV448;
  // - não altera nenhum registro existente, apenas acrescenta;
  // - cada meta nasce com origin "manual", userEdited e history — três motivos
  //   independentes para isProtectedDailyGoal devolver true, de modo que
  //   "Atualizar conforme planejamento" não as apague;
  // - guarda os ids criados no marcador, e undo() desfaz tudo.

  const VERSION = "20260904-delta-full-plan-v448";
  const API_KEY = "__ALDUS_DELTA_FULL_PLAN_V448__";
  const MIGRATION_KEY = "deltaFullPlanV448";
  const DISCIPLINE = "DEDICAÇÃO DELTA";
  const TOPIC = "PCPR";
  const MINUTES = 60;

  const AULAS = [
    {"o":1,"d":"2026-09-05","b":1,"s":5,"disc":"Direito Administrativo","t":"Atos Administrativos"},
    {"o":2,"d":"2026-09-05","b":1,"s":7,"disc":"Direito Administrativo","t":"Poderes da Administração"},
    {"o":3,"d":"2026-09-06","b":1,"s":5,"disc":"Direito Penal","t":"Dos Crimes Contra a Pessoa"},
    {"o":4,"d":"2026-09-06","b":1,"s":7,"disc":"Direito Penal","t":"Dos Crimes contra o Patrimônio"},
    {"o":5,"d":"2026-09-07","b":1,"s":3,"disc":"Direito Administrativo","t":"Gestão Pública"},
    {"o":6,"d":"2026-09-07","b":1,"s":4,"disc":"Direito Administrativo","t":"Entes da Administração Pública"},
    {"o":7,"d":"2026-09-08","b":1,"s":8,"disc":"Direito Administrativo","t":"Licitação"},
    {"o":8,"d":"2026-09-08","b":1,"s":9,"disc":"Direito Administrativo","t":"Improbidade Administrativa"},
    {"o":9,"d":"2026-09-09","b":1,"s":2,"disc":"Direitos Humanos","t":"Teoria Geral"},
    {"o":10,"d":"2026-09-09","b":1,"s":9,"disc":"Direitos Humanos","t":"Direitos das Crianças, Pessoas com Deficiencia, Idosas, Lgbt e Reclusos"},
    {"o":11,"d":"2026-09-10","b":1,"s":9,"disc":"Direitos Humanos","t":"Direitos dos Povos Indígenas, Refugiados, Mulheres, Migrantes e Quilombolas"},
    {"o":12,"d":"2026-09-10","b":1,"s":3,"disc":"Criminologia","t":"Criminologia"},
    {"o":13,"d":"2026-09-11","b":1,"s":5,"disc":"Medicina Legal","t":"Introdução"},
    {"o":14,"d":"2026-09-11","b":1,"s":6,"disc":"Medicina Legal","t":"Sexologia Forense"},
    {"o":15,"d":"2026-09-12","b":1,"s":6,"disc":"Medicina Legal","t":"Asfixiologia Forense"},
    {"o":16,"d":"2026-09-12","b":1,"s":8,"disc":"Medicina Legal","t":"Traumatologia Forense"},
    {"o":17,"d":"2026-09-13","b":1,"s":9,"disc":"Medicina Legal","t":"Toxicologia Forense e Psicopatologia Forense"},
    {"o":18,"d":"2026-09-13","b":1,"s":3,"disc":"Direito Constitucional","t":"Direitos e Garantias Fundamentais"},
    {"o":19,"d":"2026-09-14","b":1,"s":4,"disc":"Direito Constitucional","t":"Direitos da Nacionalidade"},
    {"o":20,"d":"2026-09-14","b":1,"s":4,"disc":"Direito Constitucional","t":"Direitos Políticos"},
    {"o":21,"d":"2026-09-15","b":1,"s":4,"disc":"Direito Constitucional","t":"Organização do Estado"},
    {"o":22,"d":"2026-09-15","b":1,"s":5,"disc":"Direito Constitucional","t":"Controle de Constitucionalidade"},
    {"o":23,"d":"2026-09-16","b":1,"s":7,"disc":"Direito Constitucional","t":"Estado de Defesa, Estado de Sitio e Segurança Pública"},
    {"o":24,"d":"2026-09-16","b":1,"s":7,"disc":"Direito Constitucional","t":"Ordem Social"},
    {"o":25,"d":"2026-09-17","b":1,"s":7,"disc":"Direito Constitucional","t":"Poder Judiciário"},
    {"o":26,"d":"2026-09-17","b":2,"s":2,"disc":"Direito Processual Penal","t":"Inquérito Policial"},
    {"o":27,"d":"2026-09-18","b":2,"s":3,"disc":"Direito Processual Penal","t":"Ação Penal"},
    {"o":28,"d":"2026-09-18","b":2,"s":4,"disc":"Direito Processual Penal","t":"Jurisdição e Competência"},
    {"o":29,"d":"2026-09-19","b":2,"s":5,"disc":"Direito Processual Penal","t":"Provas"},
    {"o":30,"d":"2026-09-19","b":2,"s":6,"disc":"Direito Processual Penal","t":"Prisões"},
    {"o":31,"d":"2026-09-20","b":2,"s":8,"disc":"Direito Processual Penal","t":"Liberdade Provisória, Fiança e Medidas Cautelares Reais"},
    {"o":32,"d":"2026-09-20","b":2,"s":9,"disc":"Direito Processual Penal","t":"Procedimentos"},
    {"o":33,"d":"2026-09-21","b":2,"s":2,"disc":"Direito Penal","t":"Teoria do Crime - Parte 1"},
    {"o":34,"d":"2026-09-21","b":2,"s":2,"disc":"Direito Penal","t":"Teoria do Crime - Parte 2"},
    {"o":35,"d":"2026-09-22","b":2,"s":2,"disc":"Direito Penal","t":"Teoria do Crime - Parte 3"},
    {"o":36,"d":"2026-09-22","b":2,"s":3,"disc":"Direito Penal","t":"Concurso de Pessoas e Concurso de Crimes"},
    {"o":37,"d":"2026-09-23","b":2,"s":4,"disc":"Direito Penal","t":"Teoria Geral da Pena"},
    {"o":38,"d":"2026-09-23","b":2,"s":8,"disc":"Direito Penal","t":"Dos Crimes contra a Dignidade Sexual"},
    {"o":39,"d":"2026-09-24","b":2,"s":3,"disc":"Legislação Penal Especial","t":"Lei dos Juizados Especiais Criminais"},
    {"o":40,"d":"2026-09-24","b":2,"s":3,"disc":"Legislação Penal Especial","t":"Lei Antifacção"},
    {"o":41,"d":"2026-09-25","b":2,"s":6,"disc":"Legislação Penal Especial","t":"Lei de Organização Criminosa"},
    {"o":42,"d":"2026-09-25","b":2,"s":4,"disc":"Direito Digital","t":"Crimes Cibernéticos e Investigação Criminal Digital"}
  ];

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

  // `script.js` declara o estado como `const state`, ausente de globalThis.
  function resolveAppState() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(state)) return state;
    } catch { /* binding inexistente ou em TDZ */ }
    return isObject(globalThis.state) ? globalThis.state : null;
  }

  function newId() {
    try {
      // eslint-disable-next-line no-undef
      if (typeof createId === "function") return createId();
    } catch { /* fora do app */ }
    return globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  // "SEMANA 05 · Direito Administrativo — Atos Administrativos"
  function subjectFor(aula) {
    return `SEMANA ${String(aula.s).padStart(2, "0")} · ${aula.disc} — ${aula.t}`;
  }

  // Mesmo formato de importKey dos 576 itens já existentes.
  function importKeyFor(subject) {
    return `${DISCIPLINE}|${TOPIC}|${subject}||`.toLowerCase();
  }

  function alreadyPresent(targetState, subject) {
    const goals = Array.isArray(targetState.dailyGoals) ? targetState.dailyGoals : [];
    return goals.some((goal) => isObject(goal)
      && String(goal.discipline || goal.disciplina || "") === DISCIPLINE
      && String(goal.subject || goal.assunto || "") === subject);
  }

  function buildRecords(aula, now) {
    const subject = subjectFor(aula);
    const syllabusId = newId();
    const priority = aula.b === 1 ? "Alta" : "Média";
    const stamp = `Aula do Dedicação Delta FULL. Bloco ${aula.b}, ordem ${aula.o} de ${AULAS.length}, Semana ${aula.s} do curso.`;
    return {
      syllabusItem: {
        id: syllabusId,
        discipline: DISCIPLINE, topic: TOPIC, subject, subtopic: "",
        reference: "", priority, weight: aula.b === 1 ? 5 : 3,
        status: "Não iniciado", domain: "Sem diagnóstico", manualWeak: false,
        notes: "", updatedAt: now, importKey: importKeyFor(subject),
        studyMinutes: 0, lastStudyDate: ""
      },
      goal: {
        id: newId(),
        date: aula.d, data: aula.d,
        discipline: DISCIPLINE, disciplina: DISCIPLINE,
        syllabusItemId: syllabusId,
        subject, assunto: subject, baseSubject: subject,
        referencia_edital: "",
        type: "Estudo novo", tipo: "estudo novo",
        minutes: MINUTES,
        priority, prioridade: priority,
        status: "Pendente",
        origin: "manual", origem: "manual",
        userEdited: true,
        createdAt: now, updatedAt: now,
        completed: false, operationalDiscipline: false, linkedView: "",
        notes: stamp,
        history: [{ at: now, text: stamp }],
        deltaFullV448: { ordem: aula.o, bloco: aula.b, semana: aula.s }
      }
    };
  }

  function apply(targetState = resolveAppState(), options = {}) {
    if (!isObject(targetState)) return { blocked: true, reason: "state-unavailable" };
    if (!Array.isArray(targetState.dailyGoals) || !Array.isArray(targetState.syllabusItems)) {
      return { blocked: true, reason: "collections-unavailable" };
    }
    targetState.migrations = isObject(targetState.migrations) ? targetState.migrations : {};
    const previous = targetState.migrations[MIGRATION_KEY];
    if (isObject(previous) && previous.completed && !options.force) {
      return { repeated: true, changed: false, created: 0 };
    }

    const now = new Date().toISOString();
    const goalIds = [];
    const syllabusIds = [];
    let skipped = 0;
    for (const aula of AULAS) {
      const subject = subjectFor(aula);
      if (alreadyPresent(targetState, subject)) { skipped += 1; continue; }
      const { syllabusItem, goal } = buildRecords(aula, now);
      targetState.syllabusItems.push(syllabusItem);
      targetState.dailyGoals.push(goal);
      syllabusIds.push(syllabusItem.id);
      goalIds.push(goal.id);
    }

    const report = {
      version: VERSION, completed: true, appliedAt: now,
      created: goalIds.length, skipped,
      firstDate: AULAS[0].d, lastDate: AULAS[AULAS.length - 1].d,
      bloco1: AULAS.filter((a) => a.b === 1).length,
      bloco2: AULAS.filter((a) => a.b === 2).length,
      goalIds, syllabusIds
    };
    targetState.migrations[MIGRATION_KEY] = report;
    return { changed: goalIds.length > 0, created: goalIds.length, skipped, report };
  }

  // Desfaz por id, sem tocar em nada que o usuário tenha criado depois.
  function undo(targetState = resolveAppState()) {
    if (!isObject(targetState)) return { blocked: true, reason: "state-unavailable" };
    const report = targetState.migrations?.[MIGRATION_KEY];
    if (!isObject(report)) return { blocked: true, reason: "nothing-to-undo" };
    const goals = new Set(report.goalIds || []);
    const items = new Set(report.syllabusIds || []);
    const beforeGoals = targetState.dailyGoals.length;
    const beforeItems = targetState.syllabusItems.length;
    targetState.dailyGoals = targetState.dailyGoals.filter((goal) => !goals.has(goal?.id));
    targetState.syllabusItems = targetState.syllabusItems.filter((item) => !items.has(item?.id));
    delete targetState.migrations[MIGRATION_KEY];
    return {
      changed: true,
      removedGoals: beforeGoals - targetState.dailyGoals.length,
      removedItems: beforeItems - targetState.syllabusItems.length
    };
  }

  const api = Object.freeze({
    version: VERSION, migrationKey: MIGRATION_KEY, discipline: DISCIPLINE,
    lessons: AULAS.length, plannedMinutes: MINUTES, schedule: AULAS,
    subjectFor, buildRecords, apply, undo
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function start() {
    try {
      const targetState = resolveAppState();
      if (!targetState) return;
      const result = apply(targetState);
      if (!result.changed) return;
      if (typeof globalThis.saveData === "function") globalThis.saveData({ markLocalChange: true });
      if (typeof globalThis.render === "function") globalThis.render();
      console.info(`[Aldus V448] ${result.created} aulas do Dedicação Delta FULL viraram metas (${result.report.bloco1} no bloco 1, ${result.report.bloco2} no bloco 2), de ${result.report.firstDate} a ${result.report.lastDate}. Para desfazer: ${API_KEY}.undo(state); saveData();`);
    } catch (error) {
      console.warn("[Aldus V448] Não foi possível criar as metas do Delta.", error);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", start, { once: true });
    window.addEventListener("aldus:bootstrap-ready", start, { once: true });
    window.addEventListener("load", start, { once: true });
  }
})();
