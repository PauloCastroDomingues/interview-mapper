export const SECTIONS = [
  {
    id: 'abertura',
    label: 'Contexto',
    icon: '01',
    desc: 'Define escopo, objetivo do mapeamento, donos, sistemas e dependências antes de entrar no fluxo.',
    questions: [
      {
        id: 'abertura-objetivo-mapeamento',
        q: 'Qual decisão, documentação ou entrega este mapeamento precisa destravar?',
        hint: 'Ex: especificação para dev, desenho de processo, diagnóstico de risco, plano de automação ou handoff entre áreas.',
      },
      {
        id: 'abertura-escopo-fronteiras',
        q: 'Onde esse processo começa e onde ele termina? O que fica explicitamente fora do escopo?',
        hint: 'Ajuda a evitar entrevistas abertas demais e define o recorte que será documentado.',
      },
      {
        id: 'abertura-sistemas-ferramentas',
        q: 'Quais sistemas, planilhas, telas, filas, canais ou automações você usa nesse processo?',
        hint: 'Liste ferramenta, finalidade, dono e se é fonte de verdade, apoio operacional ou apenas consulta.',
      },
      {
        id: 'abertura-dependencias-areas',
        q: 'Quais áreas, times ou pessoas precisam agir para que esse processo funcione?',
        hint: 'Mapeie entradas, aprovações, passagens de bastão, SLAs e dependências críticas entre equipes.',
      },
      {
        id: 'abertura-dono-decisor',
        q: 'Quem é dono do processo e quem tem autoridade para aprovar mudança de regra, tela ou operação?',
        hint: 'Separe operador, especialista, aprovador e decisor final.',
      },
      {
        id: 'abertura-mudancas-recentes',
        q: 'Existe alguma mudança recente ou planejada que altera esse fluxo nos próximos dias ou meses?',
        hint: 'Evita documentar um processo que já está sendo redesenhado ou migrado.',
      },
    ],
  },
  {
    id: 'processo',
    label: 'Fluxo',
    icon: '02',
    desc: 'Captura o fluxo ponta a ponta com etapas, atores, decisões, regras e exceções.',
    questions: [
      {
        id: 'processo-explicacao-ponta-a-ponta',
        q: 'Me explica o fluxo ponta a ponta, passo a passo, como se eu precisasse desenhar o processo depois.',
        hint: 'Anote a sequência real, os nomes das telas, os termos usados pela pessoa e os pontos em que há decisão.',
      },
      {
        id: 'processo-gatilho-inicial',
        q: 'Qual evento, dado, solicitação ou prazo dispara o início do processo?',
        hint: 'Registre se o gatilho é manual, automático, recorrente, sob demanda ou dependente de outro sistema.',
      },
      {
        id: 'processo-entrada-primeira-acao',
        q: 'Qual é a primeira ação prática depois do gatilho? Quem faz e em qual sistema?',
        hint: 'Ajuda a transformar a entrevista em fluxo operacional verificável.',
      },
      {
        id: 'processo-papeis-aprovacoes',
        q: 'Quem executa, revisa, aprova ou recebe informação em cada etapa?',
        hint: 'Identifique responsável, aprovador, consultado e informado. Se houver alçada, detalhe a regra.',
      },
      {
        id: 'processo-regras-decisao',
        q: 'Quais regras de negócio mudam o caminho do fluxo?',
        hint: 'Ex: valor acima de X, cliente de determinado segmento, status específico, data limite, exceção comercial.',
      },
      {
        id: 'processo-resultado-esperado',
        q: 'Qual é o resultado final esperado e como você reconhece que o processo terminou com sucesso?',
        hint: 'Transforme a resposta em critério de aceite, definição de pronto e evidência de conclusão.',
      },
      {
        id: 'processo-tempo-sla',
        q: 'Quanto tempo cada etapa costuma levar? Existe SLA formal, prazo informal ou gargalo recorrente?',
        hint: 'Separe tempo ideal, tempo real, tempo máximo aceitável e pontos de espera.',
      },
      {
        id: 'processo-automacao-manual',
        q: 'Quais etapas são manuais, repetitivas ou dependem de copiar e colar informação?',
        hint: 'Candidatas naturais para backlog de automação, integração ou melhoria de tela.',
      },
      {
        id: 'processo-volume-frequencia',
        q: 'Qual o volume aproximado desse processo por dia, semana ou mês? Há sazonalidade ou picos?',
        hint: 'Volume e frequência ajudam a priorizar impacto e dimensionar solução técnica.',
      },
    ],
  },
  {
    id: 'dados',
    label: 'Dados',
    icon: '03',
    desc: 'Mapeia entradas, campos, origem, transformação, fonte de verdade, qualidade e destino dos dados.',
    questions: [
      {
        id: 'dados-entradas-origem',
        q: 'Quais dados entram no processo e de qual fonte cada dado vem?',
        hint: 'Para cada dado, registre sistema de origem, formato, frequência, responsável e confiabilidade percebida.',
      },
      {
        id: 'dados-campos-obrigatorios',
        q: 'Quais campos são obrigatórios para o processo funcionar? O que acontece se algum estiver vazio ou incorreto?',
        hint: 'Ótimo insumo para validação, mensagens de erro e regras de bloqueio.',
      },
      {
        id: 'dados-identificadores-chave',
        q: 'Quais identificadores conectam os registros entre sistemas? ID do cliente, pedido, contrato, conta ou outro?',
        hint: 'IDs mal definidos costumam gerar duplicidade, reconciliação manual e falhas de integração.',
      },
      {
        id: 'dados-chegada-push-pull',
        q: 'Como os dados chegam ao operador ou sistema: alguém envia, o sistema busca ou há integração automática?',
        hint: 'Classifique como push, pull, importação manual, webhook, API, arquivo ou consulta em tela.',
      },
      {
        id: 'dados-transformacoes',
        q: 'Quais cálculos, enriquecimentos, filtros ou limpezas acontecem antes do dado ser usado?',
        hint: 'Registre regra, fórmula, responsável, exceções e onde a transformação acontece.',
      },
      {
        id: 'dados-destino-consumidores',
        q: 'Para onde os dados vão depois? Quem consome, visualiza, exporta ou depende desse resultado?',
        hint: 'Identifique sistemas downstream, relatórios, times e impactos se o dado atrasar.',
      },
      {
        id: 'dados-fonte-da-verdade',
        q: 'Qual sistema ou relatório é considerado fonte de verdade quando há divergência?',
        hint: 'Se não houver fonte clara, marque como risco de governança ou reconciliação.',
      },
      {
        id: 'dados-sensiveis-lgpd',
        q: 'Há dado sensível, pessoal, financeiro, de saúde, contrato ou restrição de acesso nesse processo?',
        hint: 'Registre quem pode acessar, onde aparece, por quanto tempo fica armazenado e se há base legal.',
      },
    ],
  },
  {
    id: 'validacao',
    label: 'Validação',
    icon: '04',
    desc: 'Transforma a entrevista em critérios de aceite, cenários de teste, métricas e controles.',
    questions: [
      {
        id: 'validacao-criterios-aceite',
        q: 'Quais critérios precisam ser verdadeiros para você aceitar que esse processo ou mudança está correto?',
        hint: 'Escreva como condições testáveis: dado X, quando Y, então Z deve acontecer.',
      },
      {
        id: 'validacao-checagem-dados',
        q: 'Como você confere se os dados estão corretos antes de seguir para a próxima etapa?',
        hint: 'Registre validações manuais, automáticas, cruzamentos, amostras e tolerâncias.',
      },
      {
        id: 'validacao-fluxo-excecao',
        q: 'Quais erros, bloqueios, dados faltantes ou situações fora do padrão mudam o fluxo?',
        hint: 'Capture o caminho alternativo, quem resolve, prazo esperado e mensagem exibida.',
      },
      {
        id: 'validacao-metricas-saude',
        q: 'Quais indicadores mostram que o processo está saudável ou problemático?',
        hint: 'Ex: taxa de erro, tempo médio, backlog, conversão, retrabalho, volume pendente, SLA rompido.',
      },
      {
        id: 'validacao-alertas-monitoramento',
        q: 'Como vocês descobrem que algo deu errado: alerta, dashboard, reclamação, fila parada ou validação manual?',
        hint: 'Ajuda a desenhar observabilidade, logs, alertas e rotina de suporte.',
      },
      {
        id: 'validacao-threshold-problema',
        q: 'Existe algum limite que, se ultrapassado, vira incidente ou exige ação imediata?',
        hint: 'Ex: erro acima de 5%, atraso maior que 2 horas, divergência acima de R$ X, fila acima de Y casos.',
      },
      {
        id: 'validacao-evidencia-auditoria',
        q: 'Que evidência precisa ficar registrada para auditoria, suporte ou prestação de contas?',
        hint: 'Ex: log, protocolo, print, status, usuário responsável, data, motivo da alteração.',
      },
    ],
  },
  {
    id: 'evidencias',
    label: 'Evidências',
    icon: '05',
    desc: 'Organiza prints, telas, relatórios e documentos que comprovam como o processo funciona hoje.',
    questions: [
      {
        id: 'evidencias-tela-inicial',
        q: 'Qual tela, fila, planilha ou relatório representa o início do fluxo? Cole um print e explique o que devo observar.',
        hint: 'Inclua filtros, colunas importantes, status inicial e qualquer campo que dispare ação.',
      },
      {
        id: 'evidencias-etapa-critica',
        q: 'Qual é a tela ou evidência da etapa mais crítica do processo?',
        hint: 'Use esse campo para prints de aprovações, validações, conciliações, erros ou decisões.',
      },
      {
        id: 'evidencias-resultado-final',
        q: 'Qual tela, arquivo, status ou relatório comprova que o processo terminou?',
        hint: 'Cole print da evidência final e descreva o que significa sucesso.',
      },
      {
        id: 'evidencias-erros-comuns',
        q: 'Quais mensagens de erro, alertas ou casos problemáticos aparecem com frequência?',
        hint: 'Cole prints dos erros e registre causa provável, impacto e solução atual.',
      },
      {
        id: 'evidencias-documentos-apoio',
        q: 'Existe documentação, SOP, planilha, link, manual ou conversa que deveria entrar como referência?',
        hint: 'Anote nome, link, dono e se o documento está atualizado ou desatualizado.',
      },
    ],
  },
  {
    id: 'dores',
    label: 'Riscos e backlog',
    icon: '06',
    desc: 'Prioriza dores, riscos, impacto operacional e oportunidades que viram backlog de produto.',
    questions: [
      {
        id: 'dores-parte-critica-fragil',
        q: 'Qual parte do processo é mais crítica, frágil ou dependente de conhecimento individual?',
        hint: 'Riscos críticos devem virar item de backlog, mitigação ou plano de documentação.',
      },
      {
        id: 'dores-perda-tempo',
        q: 'Onde há mais retrabalho, espera, conferência manual ou perda de tempo?',
        hint: 'Quantifique frequência, tempo gasto, área impactada e impacto no cliente ou negócio.',
      },
      {
        id: 'dores-workaround',
        q: 'Que atalhos, planilhas paralelas ou soluções improvisadas o time usa para o processo funcionar?',
        hint: 'Workarounds revelam lacunas de produto, integração e governança.',
      },
      {
        id: 'dores-situacao-fora-padrao',
        q: 'Quais casos de borda aparecem às vezes e costumam quebrar o fluxo normal?',
        hint: 'Exceções raras costumam ser fonte de incidentes, bugs e regras escondidas.',
      },
      {
        id: 'dores-mudanca-prioritaria',
        q: 'Se só desse para mudar uma coisa nos próximos 30 dias, qual mudança traria mais valor?',
        hint: 'Peça justificativa: impacto, urgência, risco reduzido e esforço percebido.',
      },
      {
        id: 'dores-impacto-negocio',
        q: 'Qual é o impacto de esse processo falhar, atrasar ou sair errado?',
        hint: 'Capture impacto financeiro, operacional, regulatório, reputacional e experiência do cliente.',
      },
      {
        id: 'dores-documentacao-existente',
        q: 'O que já existe de documentação, requisito, card, dashboard ou histórico que devo reaproveitar?',
        hint: 'Qualquer artefato existente acelera a especificação e reduz retrabalho.',
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
    { id: 'crm-processo-regua-retencao', section: 'processo', q: 'Como a régua de retenção é acionada? Quais eventos disparam cada comunicação?', hint: 'Mapeie canal, público, timing, regra de elegibilidade e responsável pela campanha.' },
    { id: 'crm-dados-segmentacao-retencao', section: 'dados', q: 'Quais atributos do cliente entram na segmentação e onde cada atributo é atualizado?', hint: 'Ex: churn score, recência, frequência, valor, plano, uso, inadimplência, NPS.' },
    { id: 'crm-validacao-sucesso-campanha', section: 'validacao', q: 'Qual métrica define sucesso da campanha e como vocês isolam impacto real?', hint: 'Separe taxa de retenção, churn evitado, conversão incremental, receita protegida e grupo controle.' },
    { id: 'crm-validacao-grupo-controle', section: 'validacao', q: 'Existe grupo controle? Como ele é definido, congelado e comparado?', hint: 'Fundamental para medir efeito incremental e evitar decisões por correlação.' },
    { id: 'crm-evidencias-jornada-cliente', section: 'evidencias', q: 'Cole um print da jornada ou histórico do cliente usado para decidir a ação de CRM.', hint: 'Explique quais campos orientam a decisão e quais costumam gerar dúvida.' },
  ],
  dados: [
    { id: 'dados-dados-arquitetura-pipeline', section: 'dados', q: 'Qual é a arquitetura do pipeline e quais jobs, tabelas ou ferramentas participam?', hint: 'Ex: Fivetran, dbt, BigQuery, Redshift, Airflow, Sheets, APIs, jobs agendados.' },
    { id: 'dados-dados-latencia', section: 'dados', q: 'Qual latência é aceitável para cada dado usado nesse processo?', hint: 'Classifique como tempo real, intradia, diário, semanal ou sob demanda.' },
    { id: 'dados-validacao-qualidade-consistencia', section: 'validacao', q: 'Quais testes de qualidade existem para detectar dado quebrado, atrasado ou duplicado?', hint: 'Liste regras, donos, alertas, dashboards e o que acontece quando um teste falha.' },
    { id: 'dados-evidencias-linhagem', section: 'evidencias', q: 'Cole print ou link da tabela, dashboard ou job que melhor representa a linhagem do dado.', hint: 'Registre nome técnico, owner, frequência e dependências upstream/downstream.' },
  ],
  produto: [
    { id: 'produto-processo-roadmap', section: 'processo', q: 'Como esse processo se conecta ao roadmap atual e quais épicos/features dependem dele?', hint: 'Identifique dependências técnicas, funcionais, comerciais e de go-to-market.' },
    { id: 'produto-validacao-experimentos-ab', section: 'validacao', q: 'Há experimento, rollout ou feature flag impactando esse processo?', hint: 'Registre público, duração, métrica primária, critério de parada e riscos.' },
    { id: 'produto-dores-feedbacks-usuario', section: 'dores', q: 'Quais feedbacks de usuário, suporte ou operação mais aparecem sobre esse fluxo?', hint: 'Separe evidência anedótica de padrão recorrente e quantificável.' },
    { id: 'produto-validacao-criterio-pronto', section: 'validacao', q: 'O que precisa estar documentado para o time de produto considerar essa descoberta pronta para virar especificação?', hint: 'Ex: fluxo, regras, critérios de aceite, eventos, dados, telas e riscos.' },
  ],
  dev: [
    { id: 'dev-dados-apis-integracoes', section: 'dados', q: 'Quais APIs, integrações, filas, webhooks ou contratos técnicos participam do fluxo?', hint: 'Mapeie endpoint, autenticação, payload, rate limit, retries, timeout e dono.' },
    { id: 'dev-validacao-testes-automatizados', section: 'validacao', q: 'Quais testes automatizados existem e quais cenários críticos não estão cobertos?', hint: 'Separe unitário, integração, contrato, e2e, regressão e monitoramento em produção.' },
    { id: 'dev-dores-dividas-tecnicas', section: 'dores', q: 'Quais dívidas técnicas, limitações ou decisões antigas impactam a operação atual?', hint: 'Registre impacto, frequência, risco e se existe plano de correção.' },
    { id: 'dev-evidencias-payload-log', section: 'evidencias', q: 'Existe exemplo de payload, log, erro técnico ou resposta de API que deveria entrar na documentação?', hint: 'Cole print ou transcreva campos sensíveis mascarados.' },
  ],
  cs: [
    { id: 'cs-processo-acionamento-playbook', section: 'processo', q: 'Como CS é acionado e qual playbook orienta a resposta em cada cenário?', hint: 'Mapeie gatilho, SLA, fila, macro, responsável e escalonamento.' },
    { id: 'cs-dados-informacoes-atendimento', section: 'dados', q: 'Quais informações do cliente precisam estar visíveis para o atendimento tomar decisão?', hint: 'Histórico, status, plano, uso, tickets, saúde da conta, cobrança, última interação.' },
    { id: 'cs-dores-insatisfacao-cliente', section: 'dores', q: 'Quais falhas desse processo viram reclamação, retrabalho ou perda de confiança do cliente?', hint: 'Peça exemplos reais e impacto na experiência.' },
    { id: 'cs-evidencias-ticket', section: 'evidencias', q: 'Cole print de um ticket, macro ou tela de atendimento que represente o caso mais comum.', hint: 'Explique quais campos ajudam ou atrapalham o atendimento.' },
  ],
  mkt: [
    { id: 'mkt-processo-orquestracao-canais', section: 'processo', q: 'Como os canais de marketing são orquestrados e qual sistema decide prioridade de comunicação?', hint: 'Email, push, SMS, WhatsApp, in-app, mídia, CRM e regras de supressão.' },
    { id: 'mkt-dados-fontes-audiencia', section: 'dados', q: 'Quais fontes formam a audiência e como as listas são criadas, atualizadas e excluídas?', hint: 'CRM, CDP, first-party data, uploads manuais, segmentos salvos e consentimento.' },
    { id: 'mkt-validacao-atribuicao', section: 'validacao', q: 'Como vocês medem atribuição entre canais e campanhas?', hint: 'Last click, multi-touch, data-driven, janela de atribuição, baseline e incrementalidade.' },
    { id: 'mkt-evidencias-campanha', section: 'evidencias', q: 'Cole print da configuração de campanha ou audiência que mais representa o processo.', hint: 'Aponte campos de segmentação, canal, calendário, exclusões e tracking.' },
  ],
  financeiro: [
    { id: 'financeiro-processo-regras-financeiras', section: 'processo', q: 'Quais regras financeiras, alçadas, aprovações ou limites mudam o caminho do fluxo?', hint: 'Políticas de crédito, conciliação, chargeback, inadimplência, desconto, reembolso.' },
    { id: 'financeiro-dados-reconciliacao-contabil', section: 'dados', q: 'Como os dados financeiros são reconciliados entre sistemas?', hint: 'ERP, gateway, banco, nota fiscal, ledger, planilha, frequência e divergências comuns.' },
    { id: 'financeiro-validacao-controles-compliance', section: 'validacao', q: 'Quais controles internos garantem compliance, segregação de função e rastreabilidade?', hint: 'Auditoria, dupla aprovação, log de alteração, evidência de aprovação, trilha financeira.' },
    { id: 'financeiro-evidencias-conciliacao', section: 'evidencias', q: 'Cole print de uma conciliação, aprovação ou divergência financeira típica.', hint: 'Mascare valores sensíveis se necessário e explique o que está correto ou incorreto.' },
  ],
  ops: [
    { id: 'ops-processo-pop', section: 'processo', q: 'Existe POP ou rotina operacional documentada? Onde ela diverge da prática real?', hint: 'Se não existe, este mapeamento vira base para o primeiro procedimento oficial.' },
    { id: 'ops-validacao-capacidade-carga', section: 'validacao', q: 'Como vocês monitoram capacidade, fila, volume e carga operacional?', hint: 'Picos sazonais e crescimento esperado impactam escala, automação e priorização.' },
    { id: 'ops-dores-gargalos-operacionais', section: 'dores', q: 'Quais gargalos causam filas, atrasos, retrabalho ou dependência de uma pessoa específica?', hint: 'Quantifique frequência e impacto para orientar backlog.' },
    { id: 'ops-evidencias-fila', section: 'evidencias', q: 'Cole print da fila, Kanban, planilha ou painel operacional usado no dia a dia.', hint: 'Explique status, prioridades, filtros e pontos de bloqueio.' },
  ],
  rh: [
    { id: 'rh-processo-pessoas-dependencia', section: 'processo', q: 'Quantas pessoas operam o processo e onde existe dependência de conhecimento individual?', hint: 'Identifique risco de continuidade, backup, treinamento e segregação de função.' },
    { id: 'rh-dores-treinamento-onboarding', section: 'dores', q: 'Como uma pessoa nova aprende esse processo hoje e onde ela costuma errar?', hint: 'Ausência de treinamento vira risco operacional e oportunidade de documentação.' },
    { id: 'rh-dados-pessoas-lgpd', section: 'dados', q: 'Quais dados de pessoas aparecem no processo e como o acesso é controlado?', hint: 'LGPD se aplica a colaboradores, candidatos, terceiros e prestadores.' },
    { id: 'rh-evidencias-treinamento', section: 'evidencias', q: 'Existe print, manual ou checklist de treinamento que represente a execução correta?', hint: 'Anote dono, data de atualização e lacunas percebidas.' },
  ],
}

export function normalizeCustomQuestions(customQuestions = {}) {
  return Object.fromEntries(
    Object.entries(customQuestions || {})
      .map(([sectionId, questions]) => {
        const clean = (questions || [])
          .filter(item => item?.q?.trim())
          .map(item => ({
            id: item.id,
            section: sectionId,
            q: item.q.trim(),
            hint: item.hint?.trim() || '',
            isCustom: true,
          }))
        return [sectionId, clean]
      })
      .filter(([, questions]) => questions.length > 0)
  )
}

export function makeCustomQuestion(sectionId, q, hint = '') {
  return {
    id: `custom-${sectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    section: sectionId,
    q: q.trim(),
    hint: hint.trim(),
    isCustom: true,
  }
}

export function getCustomQuestionsForSection(customQuestions = {}, sectionId) {
  return (customQuestions?.[sectionId] || [])
    .filter(item => item?.id)
    .map(item => ({ ...item, isCustom: true, section: sectionId }))
}

export function getAllQuestionsForSection(sectionId, selectedAreas = [], customQuestions = {}) {
  const section = SECTIONS.find(s => s.id === sectionId)
  if (!section) return []

  const core = section.questions.map(q => ({ ...q, isArea: false, isCustom: false }))
  const extra = selectedAreas.flatMap(areaId => {
    return (AREA_QUESTIONS[areaId] || [])
      .filter(q => q.section === sectionId)
      .map(q => ({
        ...q,
        isArea: true,
        isCustom: false,
        areaLabel: AREAS.find(a => a.id === areaId)?.label,
      }))
  })
  const custom = getCustomQuestionsForSection(customQuestions, sectionId)

  return [...core, ...extra, ...custom]
}

export function getAnswerForQuestion(answers = {}, question, sectionId, index) {
  return answers[question.id] || answers[`${sectionId}-${index}`] || null
}

export function migrateAnswerKeys(selectedAreas = [], answers = {}, customQuestions = {}) {
  const migrated = { ...answers }

  SECTIONS.forEach(section => {
    getAllQuestionsForSection(section.id, selectedAreas, customQuestions).forEach((question, index) => {
      const legacyKey = `${section.id}-${index}`
      if (!migrated[question.id] && migrated[legacyKey]) {
        migrated[question.id] = migrated[legacyKey]
      }
    })
  })

  return migrated
}
