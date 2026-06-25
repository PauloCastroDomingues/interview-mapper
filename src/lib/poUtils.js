import { AREAS, SECTIONS, getAllQuestionsForSection, getAnswerForQuestion } from './questions'

export const DISCOVERY_STATUSES = [
  'Coletando',
  'Em análise',
  'Validando',
  'Pronto para backlog',
  'Pausado',
]

export const ANALYSIS_FIELDS = [
  ['Resumo executivo', 'executiveSummary'],
  ['Escopo e objetivo', 'scope'],
  ['Fluxo AS-IS', 'asis'],
  ['Dores, riscos e fragilidades', 'risks'],
  ['Oportunidades', 'opportunities'],
  ['Perguntas em aberto', 'openQuestions'],
  ['Handoff técnico', 'handoff'],
]

export const BACKLOG_TYPES = ['Épico', 'Feature', 'História', 'Melhoria', 'Débito técnico', 'Spike']
export const PRIORITIES = ['Alta', 'Média', 'Baixa']
export const IMPACT_LEVELS = ['Alto', 'Médio', 'Baixo']
export const EFFORT_LEVELS = ['Baixo', 'Médio', 'Alto']
export const BACKLOG_STATUSES = ['Ideia', 'Refinar', 'Validar', 'Pronto', 'Descartado']

const LEVEL_SCORE = {
  Alto: 3,
  Alta: 3,
  Médio: 2,
  Média: 2,
  Baixo: 1,
  Baixa: 1,
}

function slugify(value = 'discovery') {
  return String(value || 'discovery')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'discovery'
}

function getInterviewTitle(interview) {
  return interview?.meta?.processo || interview?.meta?.entrevistado || 'Entrevista sem nome'
}

function getInterviewDiscoveryTitle(interview) {
  return interview?.meta?.processo || interview?.meta?.objetivo || interview?.meta?.entrevistado || 'Discovery sem processo'
}

function countImages(answers = {}) {
  return Object.values(answers).reduce((acc, answer) => acc + (answer?.images?.length || 0), 0)
}

function countCustomQuestions(customQuestions = {}) {
  return Object.values(customQuestions).reduce((acc, questions) => acc + (questions?.length || 0), 0)
}

function countAudioRefs(transcription = {}) {
  return Array.isArray(transcription.audioRefs) ? transcription.audioRefs.length : 0
}

function getAreaLabels(selectedAreas = []) {
  return selectedAreas
    .map(id => AREAS.find(area => area.id === id)?.label)
    .filter(Boolean)
}

function getSectionAnswerRows(interview) {
  const { selectedAreas = [], customQuestions = {}, answers = {} } = interview
  const questionOptions = { manualOnly: interview.questionMode === 'manual' }

  return SECTIONS.flatMap(section => {
    return getAllQuestionsForSection(section.id, selectedAreas, customQuestions, questionOptions)
      .map((item, index) => {
        const answer = getAnswerForQuestion(answers, item, section.id, index)
        if (!answer?.text?.trim() && !answer?.images?.length) return null

        return {
          interviewId: interview.id,
          interviewTitle: getInterviewTitle(interview),
          sectionId: section.id,
          section: section.label,
          question: item.q,
          answer: answer?.text?.trim() || '',
          imageCount: answer?.images?.length || 0,
        }
      })
      .filter(Boolean)
  })
}

export function getDiscoveryIdForInterview(interview) {
  return `disc_${slugify(getInterviewDiscoveryTitle(interview))}`
}

export function getBacklogScore(item = {}) {
  const impact = LEVEL_SCORE[item.impact] || 0
  const priority = LEVEL_SCORE[item.priority] || 0
  const effort = LEVEL_SCORE[item.effort] || 0
  return impact + priority - effort
}

export function buildDiscoveryGroups(interviews = [], workspace = {}) {
  const groups = new Map()

  interviews.forEach(interview => {
    const id = getDiscoveryIdForInterview(interview)
    const current = groups.get(id) || {
      id,
      title: getInterviewDiscoveryTitle(interview),
      interviews: [],
    }
    current.interviews.push(interview)
    groups.set(id, current)
  })

  Object.values(workspace?.discoveries || {}).forEach(discovery => {
    if (!discovery?.id || groups.has(discovery.id)) return
    groups.set(discovery.id, {
      id: discovery.id,
      title: discovery.title || 'Discovery sem entrevistas',
      interviews: [],
    })
  })

  return [...groups.values()]
    .map(group => {
      const saved = workspace?.discoveries?.[group.id] || {}
      const interviewStats = group.interviews.reduce((acc, interview) => {
        acc.totalQuestions += Number(interview.stats?.totalQuestions || 0)
        acc.answeredQuestions += Number(interview.stats?.answeredQuestions || 0)
        acc.images += countImages(interview.answers)
        acc.customQuestions += countCustomQuestions(interview.customQuestions)
        acc.audioRefs += countAudioRefs(interview.transcription)
        getAreaLabels(interview.selectedAreas).forEach(area => acc.areas.add(area))
        return acc
      }, {
        totalQuestions: 0,
        answeredQuestions: 0,
        images: 0,
        customQuestions: 0,
        audioRefs: 0,
        areas: new Set(),
      })

      const completion = interviewStats.totalQuestions > 0
        ? Math.round((interviewStats.answeredQuestions / interviewStats.totalQuestions) * 100)
        : 0

      return {
        ...group,
        discovery: {
          status: 'Coletando',
          title: group.title,
          owner: '',
          objective: '',
          systems: '',
          notes: '',
          analysis: {},
          backlog: [],
          ...saved,
          id: group.id,
          title: saved.title || group.title,
        },
        stats: {
          interviewCount: group.interviews.length,
          totalQuestions: interviewStats.totalQuestions,
          answeredQuestions: interviewStats.answeredQuestions,
          completion,
          images: interviewStats.images,
          customQuestions: interviewStats.customQuestions,
          audioRefs: interviewStats.audioRefs,
          areas: [...interviewStats.areas],
        },
      }
    })
    .sort((a, b) => a.discovery.title.localeCompare(b.discovery.title, 'pt-BR'))
}

export function getDiscoveryEvidence(interviews = []) {
  return interviews
    .flatMap(getSectionAnswerRows)
    .sort((a, b) => a.section.localeCompare(b.section, 'pt-BR'))
}

export function buildDiscoveryMarkdown(group) {
  const discovery = group.discovery
  const analysis = discovery.analysis || {}
  const evidence = getDiscoveryEvidence(group.interviews)
  const backlog = [...(discovery.backlog || [])].sort((a, b) => getBacklogScore(b) - getBacklogScore(a))
  let out = `# ${discovery.title || group.title}\n\n`

  out += `## Visão geral\n\n`
  out += `- Status: ${discovery.status || 'Coletando'}\n`
  out += `- Responsável PO: ${discovery.owner || '-'}\n`
  out += `- Objetivo: ${discovery.objective || '-'}\n`
  out += `- Sistemas: ${discovery.systems || '-'}\n`
  out += `- Entrevistas vinculadas: ${group.stats.interviewCount}\n`
  out += `- Progresso das entrevistas: ${group.stats.completion}%\n\n`

  ANALYSIS_FIELDS.forEach(([label, field]) => {
    out += `## ${label}\n\n${analysis[field]?.trim() || '-'}\n\n`
  })

  out += `## Backlog sugerido\n\n`
  if (!backlog.length) {
    out += `- Nenhum item estruturado.\n\n`
  } else {
    backlog.forEach((item, index) => {
      out += `### ${index + 1}. ${item.title || 'Item sem título'}\n\n`
      out += `- Tipo: ${item.type || '-'}\n`
      out += `- Prioridade: ${item.priority || '-'}\n`
      out += `- Impacto: ${item.impact || '-'}\n`
      out += `- Esforço: ${item.effort || '-'}\n`
      out += `- Status: ${item.status || '-'}\n`
      out += `- Evidência: ${item.evidence || '-'}\n\n`
      if (item.criteria?.trim()) out += `Critérios de aceite:\n${item.criteria.trim()}\n\n`
    })
  }

  out += `## Evidências das entrevistas\n\n`
  if (!evidence.length) {
    out += `- Nenhuma resposta estruturada encontrada.\n`
  } else {
    evidence.slice(0, 80).forEach(row => {
      out += `- ${row.section} | ${row.interviewTitle}: ${row.question}\n`
      if (row.answer) out += `  - Resposta: ${row.answer.replace(/\n+/g, ' ')}\n`
      if (row.imageCount) out += `  - Prints: ${row.imageCount}\n`
    })
  }

  return out
}

function csvValue(value = '') {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function buildBacklogCsv(items = []) {
  const headers = ['Tipo', 'Título', 'Prioridade', 'Impacto', 'Esforço', 'Score', 'Status', 'Evidência', 'Critérios']
  const rows = items
    .sort((a, b) => getBacklogScore(b) - getBacklogScore(a))
    .map(item => [
      item.type,
      item.title,
      item.priority,
      item.impact,
      item.effort,
      getBacklogScore(item),
      item.status,
      item.evidence,
      item.criteria,
    ])

  return [headers, ...rows]
    .map(row => row.map(csvValue).join(','))
    .join('\n')
}
