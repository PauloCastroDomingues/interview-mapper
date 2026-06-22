// Q1 e Q2 da abertura original (papel e tempo na área) foram removidos
// pois o entrevistador já conhece o perfil dos stakeholders.

export const SECTIONS = [
  {
    id: 'abertura',
    label: 'Abertura',
    icon: '🚪',
    desc: 'Contextualiza os sistemas usados e as dependências com outras áreas.',
    questions: [
      {
        id: 'abertura-sistemas-ferramentas',
        q: 'Quais sistemas e ferramentas você usa no dia a dia desse processo?',
        hint: 'Liste todos: CRMs, planilhas, ferramentas internas, canais de comunicação. Cada um pode ser um ponto de integração.',
      },
      {
        id: 'abertura-dependencias-areas',
        q: 'Com quais outras áreas ou times você precisa se relacionar para que esse processo funcione?',
        hint: 'Mapeie dependências e interfaces entre equipes — fontes comuns de gargalos e riscos.',
      },
      {
        id: 'abertura-mudancas-recentes',
        q: 'Existe alguma mudança recente ou planejada nesse processo que eu deva saber antes de começar?',
        hint: 'Evita mapear um processo que já está sendo redesenhado.',
      },
    ],
  },
  {
    id: 'processo',
    label: 'Processo',
    icon: '🔀',
    desc: 'Entende o fluxo completo — do início ao fim — com todas as etapas, atores e sistemas.',
    questions: [
      {
        id: 'processo-explicacao-ponta-a-ponta',
        q: 'Me explica como funciona esse processo do início ao fim, como se eu nunca tivesse visto?',
        hint: 'Não interrompa. Anote a sequência e os termos exatos que a pessoa usar.',
      },
      {
        id: 'processo-gatilho-inicial',
        q: 'O que dispara ou inicia esse processo? Qual é o gatilho?',
        hint: 'Pode ser um evento, uma data, uma ação do cliente, uma regra de negócio ou um dado que chega.',
      },
      {
        id: 'processo-papeis-aprovacoes',
        q: 'Quem faz o quê em cada etapa? Existe aprovação ou passagem de bastão entre times?',
        hint: 'Identifique quem decide, quem executa e quem apenas recebe a informação.',
      },
      {
        id: 'processo-resultado-esperado',
        q: 'Qual é o resultado esperado ao final? Como você sabe que o processo foi concluído com sucesso?',
        hint: 'Esta resposta define os critérios de aceite e a definição de pronto para o time de dev.',
      },
      {
        id: 'processo-tempo-sla',
        q: 'Qual é o tempo médio para completar esse processo? Existe SLA ou prazo definido?',
        hint: 'Prazos são críticos para priorização, alertas e automações futuras.',
      },
      {
        id: 'processo-automacao-manual',
        q: 'Existe alguma etapa feita manualmente hoje que poderia ser automatizada?',
        hint: 'Candidatos naturais ao backlog de produto e automação.',
      },
    ],
  },
  {
    id: 'dados',
    label: 'Dados',
    icon: '🗄️',
    desc: 'Entende de onde vêm os dados, como são processados e para onde vão.',
    questions: [
      {
        id: 'dados-entradas-origem',
        q: 'Quais dados entram nesse processo? De onde vêm — sistema, time, arquivo?',
        hint: 'Mapeie origem, formato (JSON, CSV, planilha) e frequência (tempo real, diário, sob demanda).',
      },
      {
        id: 'dados-chegada-push-pull',
        q: 'Como esses dados chegam até você ou ao sistema? Alguém envia ou o sistema busca automaticamente?',
        hint: 'Push (alguém envia) ou pull (o sistema consulta a fonte).',
      },
      {
        id: 'dados-transformacoes',
        q: 'Existem transformações nos dados ao longo do processo? Algum cálculo, enriquecimento ou limpeza?',
        hint: 'Regras de transformação devem virar especificações técnicas detalhadas para o dev.',
      },
      {
        id: 'dados-destino-consumidores',
        q: 'Para onde os dados vão ao final do processo? Quem ou qual sistema os consome?',
        hint: 'Identifique os consumidores downstream e se há dependências críticas entre eles.',
      },
      {
        id: 'dados-sensiveis-lgpd',
        q: 'Há algum dado sensível ou com restrição de acesso nesse processo? (LGPD, financeiro, saúde)',
        hint: 'Dados sensíveis exigem atenção de segurança e compliance desde o início.',
      },
    ],
  },
  {
    id: 'validacao',
    label: 'Validação',
    icon: '✅',
    desc: 'Entende como o processo é validado, testado e medido.',
    questions: [
      {
        id: 'validacao-checagem-dados',
        q: 'Como você valida se os dados que chegam estão corretos? Existe alguma checagem automática?',
        hint: 'Regras de validação são a base dos testes de aceitação para o time de dev.',
      },
      {
        id: 'validacao-fluxo-excecao',
        q: 'O que acontece quando um dado está errado ou faltando? Existe fluxo de exceção?',
        hint: 'Fluxos de erro são tão importantes quanto o caminho feliz — e frequentemente esquecidos.',
      },
      {
        id: 'validacao-metricas-saude',
        q: 'Quais métricas ou indicadores vocês acompanham para saber se o processo está saudável?',
        hint: 'Taxa de conversão, tempo médio, volume processado, taxa de erro, etc.',
      },
      {
        id: 'validacao-alertas-monitoramento',
        q: 'Quando algo dá errado, como vocês detectam? Existe algum alerta ou monitoramento?',
        hint: 'Mapeia necessidades de logging, alertas e dashboards de monitoramento.',
      },
      {
        id: 'validacao-threshold-problema',
        q: 'Existe algum threshold que, se ultrapassado, indica problema? (ex: erro > 5%, tempo > X horas)',
        hint: 'Esses thresholds viram regras de alerta e validação automática nos sistemas.',
      },
    ],
  },
  {
    id: 'dores',
    label: 'Dores',
    icon: '🔥',
    desc: 'Identifica pontos de melhoria, riscos e prioridades para o backlog.',
    questions: [
      {
        id: 'dores-parte-critica-fragil',
        q: 'Qual parte desse processo você considera mais crítica ou mais frágil hoje?',
        hint: 'Vulnerabilidades críticas devem entrar no backlog com prioridade alta.',
      },
      {
        id: 'dores-perda-tempo',
        q: 'O que mais te incomoda ou te faz perder tempo nesse processo?',
        hint: 'Dores recorrentes geralmente têm alto ROI quando resolvidas.',
      },
      {
        id: 'dores-situacao-fora-padrao',
        q: 'Tem alguma situação fora do padrão que acontece às vezes e que eu preciso saber?',
        hint: 'Exceções e casos de borda causam 80% dos problemas em produção.',
      },
      {
        id: 'dores-mudanca-prioritaria',
        q: 'Se você pudesse mudar uma coisa nesse processo agora, o que seria?',
        hint: 'A prioridade número 1 na visão do usuário — muito valioso para o roadmap.',
      },
      {
        id: 'dores-documentacao-existente',
        q: 'Existe alguma documentação, planilha ou material que você poderia me compartilhar?',
        hint: 'Qualquer artefato existente acelera o mapeamento e vira referência na documentação.',
      },
    ],
  },
]

export const AREAS = [
  { id: 'crm',        label: 'CRM / Retenção' },
  { id: 'dados',      label: 'Dados / Analytics' },
  { id: 'produto',    label: 'Produto' },
  { id: 'dev',        label: 'Desenvolvimento' },
  { id: 'cs',         label: 'Customer Success' },
  { id: 'mkt',        label: 'Marketing' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'ops',        label: 'Operações' },
  { id: 'rh',         label: 'RH / People' },
]

export const AREA_QUESTIONS = {
  crm: [
    { id: 'crm-processo-regua-retencao', section: 'processo',  q: 'Como funciona a régua de retenção? Quais são os triggers de cada comunicação?',          hint: 'Mapeie cada evento que dispara uma ação de CRM.' },
    { id: 'crm-dados-segmentacao-retencao', section: 'dados',     q: 'Quais dados do cliente são usados para segmentar as campanhas de retenção?',             hint: 'Comportamento, recência, frequência, valor (RFM), churn score, etc.' },
    { id: 'crm-validacao-sucesso-campanha', section: 'validacao', q: 'Como vocês medem o sucesso de uma campanha de retenção? Qual é a métrica principal?',    hint: 'Taxa de retenção, churn evitado, LTV impactado, taxa de conversão.' },
    { id: 'crm-validacao-grupo-controle', section: 'validacao', q: 'Existe grupo controle nas campanhas? Como ele é definido?',                              hint: 'Fundamental para medir impacto real vs. tendência natural.' },
  ],
  dados: [
    { id: 'dados-dados-arquitetura-pipeline', section: 'dados',     q: 'Qual é a arquitetura do pipeline de dados? Quais ferramentas são usadas?',               hint: 'Ex: Fivetran, dbt, BigQuery, Redshift, Airflow, Spark, etc.' },
    { id: 'dados-dados-latencia', section: 'dados',     q: 'Qual é a latência aceitável dos dados? Tem algum processo que precisa de tempo real?',   hint: 'Real-time vs. batch impacta decisões de arquitetura.' },
    { id: 'dados-validacao-qualidade-consistencia', section: 'validacao', q: 'Como vocês garantem a qualidade e consistência dos dados ao longo do pipeline?',         hint: 'Data quality rules, Great Expectations, monitoramento, etc.' },
  ],
  produto: [
    { id: 'produto-processo-roadmap', section: 'processo',  q: 'Como o processo se relaciona com o roadmap de produto? Existem dependências técnicas?',  hint: 'Entenda se o processo depende de features ainda não desenvolvidas.' },
    { id: 'produto-validacao-experimentos-ab', section: 'validacao', q: 'Existem experimentos A/B rodando nesse processo? Como os resultados são validados?',     hint: 'Grupos, duração, significância estatística, critério de parada.' },
    { id: 'produto-dores-feedbacks-usuario', section: 'dores',     q: 'Quais são os principais feedbacks de usuário relacionados a esse processo?',             hint: 'Feedbacks de usuário revelam pontos cegos que a equipe interna não vê.' },
  ],
  dev: [
    { id: 'dev-dados-apis-integracoes', section: 'dados',     q: 'Quais são as APIs ou integrações envolvidas? Existem contratos de API definidos?',       hint: 'Mapeie endpoints, autenticação, rate limits e SLAs das APIs.' },
    { id: 'dev-validacao-testes-automatizados', section: 'validacao', q: 'Existe cobertura de testes automatizados? Quais tipos (unit, integration, e2e)?',        hint: 'A ausência de testes é um risco crítico para mudanças futuras.' },
    { id: 'dev-dores-dividas-tecnicas', section: 'dores',     q: 'Existem dívidas técnicas conhecidas que impactam a operação?',                          hint: 'Dívidas técnicas viram prioridade quando começam a causar incidentes.' },
  ],
  cs: [
    { id: 'cs-processo-acionamento-playbook', section: 'processo',  q: 'Como o time de CS é acionado nesse processo? Existe um playbook de atendimento?',        hint: 'Identifique gatilhos de escalonamento e SLAs de resposta.' },
    { id: 'cs-dados-informacoes-atendimento', section: 'dados',     q: 'Quais informações do cliente vocês precisam ter disponíveis no atendimento?',            hint: 'Histórico, status da conta, interações anteriores, score de saúde.' },
    { id: 'cs-dores-insatisfacao-cliente', section: 'dores',     q: 'Quais são os motivos mais comuns de insatisfação do cliente nesse processo?',            hint: 'Dores do cliente revelam gaps no processo que o time interno não vê.' },
  ],
  mkt: [
    { id: 'mkt-processo-orquestracao-canais', section: 'processo',  q: 'Como as campanhas de marketing se integram? Existe orquestração entre canais?',          hint: 'Email, push, SMS, in-app — quem controla cada canal e como se coordenam?' },
    { id: 'mkt-dados-fontes-audiencia', section: 'dados',     q: 'Quais são as fontes de audiência? Como as listas são criadas e atualizadas?',            hint: 'CRM, CDP, DMP, first-party data — mapeie cada fonte.' },
    { id: 'mkt-validacao-atribuicao', section: 'validacao', q: 'Como vocês medem atribuição de resultado entre diferentes canais e campanhas?',          hint: 'Last click, multi-touch, data-driven — qual modelo é usado?' },
  ],
  financeiro: [
    { id: 'financeiro-processo-regras-financeiras', section: 'processo',  q: 'Quais são as regras financeiras envolvidas? (aprovações, limites, conciliação)',         hint: 'Políticas de crédito, aprovações por alçada, regras de conciliação.' },
    { id: 'financeiro-dados-reconciliacao-contabil', section: 'dados',     q: 'Como os dados financeiros são reconciliados com os sistemas contábeis?',                 hint: 'ERP, SAP, TOTVS — mapeie a integração e a frequência de reconciliação.' },
    { id: 'financeiro-validacao-controles-compliance', section: 'validacao', q: 'Quais são os controles internos aplicados para garantir compliance?',                   hint: 'Auditoria, segregação de funções, aprovações duplas, logs de alteração.' },
  ],
  ops: [
    { id: 'ops-processo-pop', section: 'processo',  q: 'Existe um POP (Procedimento Operacional Padrão) para esse processo?',                   hint: 'Se não existe, mapear isso é uma prioridade.' },
    { id: 'ops-validacao-capacidade-carga', section: 'validacao', q: 'Como vocês monitoram a capacidade e carga? Existe previsibilidade de volume?',           hint: 'Picos sazonais e crescimento esperado impactam dimensionamento de sistema.' },
    { id: 'ops-dores-gargalos-operacionais', section: 'dores',     q: 'Quais são os principais gargalos operacionais? O que causa filas ou atrasos?',          hint: 'Gargalos operacionais são candidatos a automação ou reengenharia.' },
  ],
  rh: [
    { id: 'rh-processo-pessoas-dependencia', section: 'processo',  q: 'Quantas pessoas estão envolvidas? Existe dependência de conhecimento individual?',       hint: 'Bus factor — o processo para se uma pessoa específica sair?' },
    { id: 'rh-dores-treinamento-onboarding', section: 'dores',     q: 'Existe treinamento ou onboarding para quem opera esse processo?',                       hint: 'Ausência de treinamento é risco operacional e de qualidade.' },
    { id: 'rh-dados-pessoas-lgpd', section: 'dados',     q: 'Quais dados de pessoas são envolvidos? Existe tratamento adequado (LGPD)?',              hint: 'LGPD se aplica a dados de funcionários também.' },
  ],
}

export function getAllQuestionsForSection(sectionId, selectedAreas = []) {
  const section = SECTIONS.find(s => s.id === sectionId)
  if (!section) return []
  const core = section.questions.map(q => ({ ...q, isArea: false }))
  const extra = selectedAreas.flatMap(areaId => {
    return (AREA_QUESTIONS[areaId] || [])
      .filter(q => q.section === sectionId)
      .map(q => ({ ...q, isArea: true, areaLabel: AREAS.find(a => a.id === areaId)?.label }))
  })
  return [...core, ...extra]
}

export function getAnswerForQuestion(answers = {}, question, sectionId, index) {
  return answers[question.id] || answers[`${sectionId}-${index}`] || null
}

export function migrateAnswerKeys(selectedAreas = [], answers = {}) {
  const migrated = { ...answers }

  SECTIONS.forEach(section => {
    getAllQuestionsForSection(section.id, selectedAreas).forEach((question, index) => {
      const legacyKey = `${section.id}-${index}`
      if (!migrated[question.id] && migrated[legacyKey]) {
        migrated[question.id] = migrated[legacyKey]
      }
    })
  })

  return migrated
}
