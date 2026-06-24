'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  SECTIONS,
  AREAS,
  getAllQuestionsForSection,
  getAnswerForQuestion,
  makeCustomQuestion,
  migrateAnswerKeys,
  normalizeCustomQuestions,
} from '@/lib/questions'
import { saveInterview } from '@/lib/storage'
import { exportInterviewPdf } from '@/lib/exportUtils'
import QuestionCard from './QuestionCard'
import QuestionLibraryDrawer from './QuestionLibraryDrawer'

const EMPTY_META = {
  processo: '',
  objetivo: '',
  entrevistado: '',
  entrevistador: '',
  data: new Date().toISOString().split('T')[0],
  duracao: '45 minutos',
}

const EMPTY_SUMMARY = {
  descobertas: '',
  riscos: '',
  oportunidades: '',
  duvidas: '',
  passos: '',
}

const EMPTY_CUSTOM_DRAFT = { q: '', hint: '' }
const EMPTY_TRANSCRIPTION = {
  raw: '',
  highlights: '',
  decisions: '',
  doubts: '',
  audioRefs: [],
}

const AUTOSAVE_DELAY_MS = 1800
const SESSION_DURATIONS = ['30 minutos', '45 minutos', '60 minutos', '90 minutos', '120 minutos']
const SUMMARY_FIELDS = [
  ['Principais descobertas', 'descobertas', 'Aprendizados centrais sobre o processo, regras e contexto.'],
  ['Riscos identificados', 'riscos', 'Pontos frágeis, dependências, impactos e controles ausentes.'],
  ['Oportunidades', 'oportunidades', 'Melhorias, automações e simplificações candidatas ao backlog.'],
  ['Dúvidas em aberto', 'duvidas', 'Pendências que precisam de validação, dado ou decisão.'],
  ['Próximos passos', 'passos', 'Ações, responsáveis e decisões combinadas.'],
]
const TRANSCRIPTION_FIELDS = [
  ['Pontos-chave', 'highlights', 'Trechos, frases e sinais que merecem atenção.'],
  ['Decisões citadas', 'decisions', 'Acordos, regras, exceções e responsáveis mencionados.'],
  ['Dúvidas da transcrição', 'doubts', 'Falas ambíguas, termos a validar e pontos incompletos.'],
]
const WORKSPACE_TABS = [
  { id: 'questions', label: 'Roteiro' },
  { id: 'transcription', label: 'Transcrição' },
  { id: 'summary', label: 'Síntese' },
]
const QUESTION_MODES = {
  guided: {
    label: 'Guiada',
    title: 'Roteiro inteligente',
    desc: 'Usa as perguntas prontas, perguntas por área e suas perguntas personalizadas.',
  },
  manual: {
    label: 'Manual do zero',
    title: 'Só minhas perguntas',
    desc: 'Começa sem roteiro pronto. Você cria todas as perguntas dentro das seções.',
  },
}

function normalizeTranscription(transcription = {}) {
  const audioRefs = Array.isArray(transcription.audioRefs) ? transcription.audioRefs : []

  return {
    ...EMPTY_TRANSCRIPTION,
    raw: transcription.raw || '',
    highlights: transcription.highlights || '',
    decisions: transcription.decisions || '',
    doubts: transcription.doubts || '',
    audioRefs: audioRefs.map((audio, index) => ({
      id: audio.id || `audio_${index}_${audio.name || 'arquivo'}`,
      name: audio.name || 'Áudio sem nome',
      size: Number(audio.size || 0),
      type: audio.type || 'audio',
      lastModified: audio.lastModified || null,
      addedAt: audio.addedAt || '',
    })),
  }
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 KB'

  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function makeClientId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function hasText(value) {
  return Boolean(String(value || '').trim())
}

function isAnswerComplete(answer) {
  return Boolean(answer?.text?.trim() || answer?.images?.length > 0)
}

function getTranscriptionContentCount(transcription = {}) {
  return [transcription.raw, transcription.highlights, transcription.decisions, transcription.doubts]
    .filter(hasText)
    .length
}

function getAudioCount(transcription = {}) {
  return Array.isArray(transcription.audioRefs) ? transcription.audioRefs.length : 0
}

function getSummaryContentCount(summary = {}) {
  return SUMMARY_FIELDS.filter(([, field]) => hasText(summary[field])).length
}

function hasDraftContent(interview) {
  const hasMeta = Object.entries(interview.meta || {}).some(([key, value]) => (
    !['data', 'duracao'].includes(key) && hasText(value)
  ))
  const hasAnswers = Object.values(interview.answers || {}).some(isAnswerComplete)
  const hasCustomQuestions = Object.values(interview.customQuestions || {}).some(items => items?.length > 0)
  const hasSummary = getSummaryContentCount(interview.summary) > 0
  const transcription = normalizeTranscription(interview.transcription)
  const hasTranscription = getTranscriptionContentCount(transcription) > 0 || getAudioCount(transcription) > 0
  return hasMeta || hasAnswers || hasCustomQuestions || hasSummary || hasTranscription
}

function createInterviewPayload({
  initialData,
  interviewId,
  meta,
  questionMode,
  selectedAreas,
  answers,
  customQuestions,
  transcription,
  summary,
  totalQ,
  doneQ,
  pct,
  manualOnly,
}) {
  const cleanCustomQuestions = normalizeCustomQuestions(customQuestions)
  const cleanAnswers = migrateAnswerKeys(selectedAreas, answers, cleanCustomQuestions, { manualOnly })

  return {
    ...(initialData || {}),
    id: interviewId || initialData?.id,
    meta,
    questionMode,
    selectedAreas,
    customQuestions: cleanCustomQuestions,
    answers: cleanAnswers,
    transcription: normalizeTranscription(transcription),
    summary,
    stats: {
      totalQuestions: totalQ,
      answeredQuestions: doneQ,
      progressPct: pct,
    },
  }
}

export default function InterviewForm({ initialData, onSave, onCancel }) {
  const editing = !!initialData?.id
  const mountedRef = useRef(false)
  const onSaveRef = useRef(onSave)
  const initialQuestionMode = initialData?.questionMode || 'guided'
  const initialQuestionOptions = { manualOnly: initialQuestionMode === 'manual' }
  const initialCustomQuestions = normalizeCustomQuestions(initialData?.customQuestions || {})
  const initialAnswers = migrateAnswerKeys(
    initialData?.selectedAreas || [],
    initialData?.answers || {},
    initialCustomQuestions,
    initialQuestionOptions
  )

  const [meta, setMeta] = useState({ ...EMPTY_META, ...(initialData?.meta || {}) })
  const [interviewId, setInterviewId] = useState(initialData?.id || null)
  const [questionMode, setQuestionMode] = useState(initialQuestionMode)
  const [selectedAreas, setAreas] = useState(initialData?.selectedAreas || [])
  const [activeSection, setSection] = useState(0)
  const [workspaceTab, setWorkspaceTab] = useState('questions')
  const [answers, setAnswers] = useState(initialAnswers)
  const [customQuestions, setCustomQuestions] = useState(initialCustomQuestions)
  const [customDraft, setCustomDraft] = useState(EMPTY_CUSTOM_DRAFT)
  const [customEditorOpen, setCustomEditorOpen] = useState(false)
  const [transcription, setTranscription] = useState(normalizeTranscription(initialData?.transcription))
  const [summary, setSummary] = useState({ ...EMPTY_SUMMARY, ...(initialData?.summary || {}) })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autosave, setAutosave] = useState({ status: 'idle', at: '' })
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [error, setError] = useState('')

  const manualOnly = questionMode === 'manual'
  const questionOptions = useMemo(() => ({ manualOnly }), [manualOnly])
  const currentSection = SECTIONS[activeSection]
  const questions = useMemo(() => (
    getAllQuestionsForSection(currentSection.id, selectedAreas, customQuestions, questionOptions)
  ), [currentSection.id, customQuestions, questionOptions, selectedAreas])
  const sectionStats = useMemo(() => {
    return Object.fromEntries(SECTIONS.map(section => {
      const sectionQuestions = getAllQuestionsForSection(section.id, selectedAreas, customQuestions, questionOptions)
      const answered = sectionQuestions.filter((item, qi) => {
        const ans = getAnswerForQuestion(answers, item, section.id, qi)
        return isAnswerComplete(ans)
      }).length

      return [section.id, { total: sectionQuestions.length, answered }]
    }))
  }, [answers, customQuestions, questionOptions, selectedAreas])
  const totalQ = useMemo(() => (
    SECTIONS.reduce((acc, section) => acc + (sectionStats[section.id]?.total || 0), 0)
  ), [sectionStats])
  const doneQ = useMemo(() => (
    SECTIONS.reduce((acc, section) => acc + (sectionStats[section.id]?.answered || 0), 0)
  ), [sectionStats])
  const pct = totalQ > 0 ? Math.round((doneQ / totalQ) * 100) : 0

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  function toggleArea(id) {
    setAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const handleAnswer = useCallback((key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  function focusWorkspaceTab(tabId) {
    window.requestAnimationFrame(() => {
      document.getElementById(`workspace-tab-${tabId}`)?.focus()
    })
  }

  function selectWorkspaceTab(tabId) {
    setWorkspaceTab(tabId)
    focusWorkspaceTab(tabId)
  }

  function handleWorkspaceTabKeyDown(event, tabId) {
    const currentIndex = WORKSPACE_TABS.findIndex(tab => tab.id === tabId)
    if (currentIndex < 0) return

    const lastIndex = WORKSPACE_TABS.length - 1
    const keys = {
      ArrowLeft: currentIndex === 0 ? lastIndex : currentIndex - 1,
      ArrowRight: currentIndex === lastIndex ? 0 : currentIndex + 1,
      Home: 0,
      End: lastIndex,
    }
    if (!(event.key in keys)) return

    event.preventDefault()
    selectWorkspaceTab(WORKSPACE_TABS[keys[event.key]].id)
  }

  function updateTranscription(field, value) {
    setTranscription(prev => ({ ...prev, [field]: value }))
  }

  function addAudioRefs(files) {
    const nextFiles = Array.from(files || [])
      .filter(file => file?.name)
      .map((file, index) => ({
        id: makeClientId(`audio_${index}`),
        name: file.name,
        size: file.size || 0,
        type: file.type || 'audio',
        lastModified: file.lastModified || null,
        addedAt: new Date().toISOString(),
      }))

    if (!nextFiles.length) return
    setTranscription(prev => ({ ...prev, audioRefs: [...(prev.audioRefs || []), ...nextFiles] }))
  }

  function removeAudioRef(id) {
    setTranscription(prev => ({
      ...prev,
      audioRefs: (prev.audioRefs || []).filter(audio => audio.id !== id),
    }))
  }

  function getSectionStats(section) {
    return sectionStats[section.id] || { total: 0, answered: 0 }
  }

  function addCustomQuestion() {
    if (!customDraft.q.trim()) {
      setError('Digite a pergunta personalizada antes de adicionar.')
      return
    }

    const question = makeCustomQuestion(currentSection.id, customDraft.q, customDraft.hint)
    setCustomQuestions(prev => ({
      ...prev,
      [currentSection.id]: [...(prev[currentSection.id] || []), question],
    }))
    setAnswers(prev => ({ ...prev, [question.id]: { text: '', images: [] } }))
    setCustomDraft(EMPTY_CUSTOM_DRAFT)
    setCustomEditorOpen(false)
    setError('')
  }

  function addLibraryQuestion(item) {
    const question = makeCustomQuestion(currentSection.id, item.q, item.hint)
    setCustomQuestions(prev => ({
      ...prev,
      [currentSection.id]: [...(prev[currentSection.id] || []), question],
    }))
    setAnswers(prev => ({ ...prev, [question.id]: { text: '', images: [] } }))
    setLibraryOpen(false)
    setError('')
  }

  function updateCustomQuestion(sectionId, questionId, patch) {
    setCustomQuestions(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).map(item => (
        item.id === questionId ? { ...item, ...patch } : item
      )),
    }))
  }

  function removeCustomQuestion(sectionId, questionId) {
    setCustomQuestions(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).filter(item => item.id !== questionId),
    }))
    setAnswers(prev => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }

  function buildInterview() {
    return createInterviewPayload({
      initialData,
      interviewId,
      meta,
      questionMode,
      selectedAreas,
      answers,
      customQuestions,
      transcription,
      summary,
      totalQ,
      doneQ,
      pct,
      manualOnly,
    })
  }

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return undefined
    }

    const interview = createInterviewPayload({
      initialData,
      interviewId,
      meta,
      questionMode,
      selectedAreas,
      answers,
      customQuestions,
      transcription,
      summary,
      totalQ,
      doneQ,
      pct,
      manualOnly,
    })
    if (!hasDraftContent(interview)) return undefined

    const timer = window.setTimeout(async () => {
      try {
        setAutosave(prev => ({ ...prev, status: 'saving' }))
        const result = await saveInterview(interview, { syncRemote: false })
        setInterviewId(result.savedInterview?.id || interview.id || null)
        setAutosave({
          status: 'saved',
          at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        })
        onSaveRef.current?.()
      } catch {
        setAutosave(prev => ({ ...prev, status: 'error' }))
      }
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [answers, customQuestions, doneQ, initialData, interviewId, manualOnly, meta, pct, questionMode, selectedAreas, summary, totalQ, transcription])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const interview = buildInterview()
      const result = await saveInterview(interview)
      setInterviewId(result.savedInterview?.id || interview.id || null)
      setSaved(true)
      if (result.remoteError) {
        setError(`Salvo localmente. Sync com Google Sheets falhou: ${result.remoteError}`)
      }
      setTimeout(() => setSaved(false), 2000)
      onSave?.()
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a entrevista.')
    } finally {
      setSaving(false)
    }
  }

  function handleExport() {
    try {
      exportInterviewPdf(buildInterview())
    } catch (err) {
      setError(err.message || 'Não foi possível preparar o PDF.')
    }
  }

  const areaLabels = useMemo(() => (
    selectedAreas
      .map(id => AREAS.find(a => a.id === id)?.label)
      .filter(Boolean)
  ), [selectedAreas])
  const summaryCount = useMemo(() => getSummaryContentCount(summary), [summary])
  const transcriptCount = useMemo(() => getTranscriptionContentCount(transcription), [transcription])
  const audioCount = getAudioCount(transcription)
  const workspaceTabs = useMemo(() => (
    WORKSPACE_TABS.map(tab => {
      if (tab.id === 'questions') return { ...tab, detail: `${doneQ}/${totalQ || 0}` }
      if (tab.id === 'transcription') {
        const totalTranscriptionItems = transcriptCount + audioCount
        return { ...tab, detail: totalTranscriptionItems ? `${totalTranscriptionItems}` : '0' }
      }
      return { ...tab, detail: `${summaryCount}/${SUMMARY_FIELDS.length}` }
    })
  ), [audioCount, doneQ, summaryCount, totalQ, transcriptCount])

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <section className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm shadow-gray-200/60">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dossiê executivo</p>
                <h1 className="mt-1 truncate text-xl font-semibold text-gray-950">
                  {meta.processo || 'Mapeamento de processo'}
                </h1>
              </div>
              <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${
                autosave.status === 'error'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : autosave.status === 'saving'
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}>
                {autosave.status === 'saving'
                  ? 'Salvando rascunho'
                  : autosave.status === 'saved'
                    ? `Salvo ${autosave.at}`
                    : autosave.status === 'error'
                      ? 'Autosave falhou'
                      : 'Rascunho local'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Processo</label>
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Ex: Onboarding B2B"
                  value={meta.processo}
                  onChange={e => setMeta(m => ({ ...m, processo: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Objetivo do PO</label>
                <input
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="O que precisa sair documentado ou decidido?"
                  value={meta.objetivo}
                  onChange={e => setMeta(m => ({ ...m, objetivo: e.target.value }))}
                />
              </div>
            </div>

            <details className="mt-4 rounded-md border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Detalhes da sessão
              </summary>
              <div className="grid gap-3 border-t border-gray-200 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Entrevistado</label>
                  <input
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Nome e cargo"
                    value={meta.entrevistado}
                    onChange={e => setMeta(m => ({ ...m, entrevistado: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Entrevistador</label>
                  <input
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Seu nome"
                    value={meta.entrevistador}
                    onChange={e => setMeta(m => ({ ...m, entrevistador: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    value={meta.data}
                    onChange={e => setMeta(m => ({ ...m, data: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Duração</label>
                  <select
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    value={meta.duracao}
                    onChange={e => setMeta(m => ({ ...m, duracao: e.target.value }))}
                  >
                    {SESSION_DURATIONS.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </details>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 p-5 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['Modo', QUESTION_MODES[questionMode].label],
                ['Perguntas', `${doneQ}/${totalQ || 0}`],
                ['Conclusão', `${pct}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-medium text-gray-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-950">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Controle</p>
              <span className="text-xs font-semibold text-gray-900">{pct}%</span>
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-md border border-gray-200 bg-gray-50 p-1">
              {Object.entries(QUESTION_MODES).map(([mode, config]) => {
                const active = questionMode === mode
                return (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={active}
                    onClick={() => {
                      setQuestionMode(mode)
                      setError('')
                    }}
                    className={`rounded px-2 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{QUESTION_MODES[questionMode].desc}</p>

            {questionMode === 'guided' ? (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Área</p>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map(area => (
                    <button
                      type="button"
                      key={area.id}
                      aria-pressed={selectedAreas.includes(area.id)}
                      onClick={() => toggleArea(area.id)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        selectedAreas.includes(area.id)
                          ? 'border-gray-950 bg-gray-950 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:text-sky-700'
                      }`}
                    >
                      {area.label}
                    </button>
                  ))}
                </div>
                {areaLabels.length > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    Ativas: {areaLabels.join(', ')}.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
                Entrevista livre usando apenas as perguntas criadas por você.
              </div>
            )}

            <div className="mt-5 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="w-full rounded-md bg-gray-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Abrir biblioteca
              </button>
            </div>

            <nav className="mt-5 border-t border-gray-100 pt-3">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Seções</p>
              {SECTIONS.map((section, index) => {
                const stats = getSectionStats(section)
                return (
                  <button
                    type="button"
                    key={section.id}
                    aria-current={activeSection === index && workspaceTab === 'questions' ? 'step' : undefined}
                    onClick={() => {
                      setSection(index)
                      setWorkspaceTab('questions')
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors last:mb-0 ${
                      activeSection === index && workspaceTab === 'questions'
                        ? 'bg-gray-950 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`flex h-6 w-8 items-center justify-center rounded text-[11px] font-semibold ${
                      activeSection === index && workspaceTab === 'questions' ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {section.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{section.label}</span>
                      <span className={`block text-[11px] ${activeSection === index && workspaceTab === 'questions' ? 'text-white/70' : 'text-gray-400'}`}>
                        {stats.answered}/{stats.total}
                      </span>
                    </span>
                  </button>
                )
              })}
            </nav>
          </section>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm shadow-gray-200/60">
            <div className="grid gap-1 sm:grid-cols-3" role="tablist" aria-label="Áreas de trabalho da entrevista">
              {workspaceTabs.map(tab => {
                const active = workspaceTab === tab.id
                return (
                  <button
                    type="button"
                    key={tab.id}
                    id={`workspace-tab-${tab.id}`}
                    role="tab"
                    aria-selected={active}
                    aria-controls={`workspace-panel-${tab.id}`}
                    onClick={() => setWorkspaceTab(tab.id)}
                    onKeyDown={event => handleWorkspaceTabKeyDown(event, tab.id)}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
                      active ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                    }`}
                  >
                    <span className="text-sm font-semibold">{tab.label}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      active ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.detail}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {workspaceTab === 'questions' && (
            <div
              id="workspace-panel-questions"
              role="tabpanel"
              aria-labelledby="workspace-tab-questions"
              className="space-y-4"
            >
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Roteiro ativo</p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-950">{currentSection.label}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
                      {questionMode === 'manual'
                        ? 'Crie perguntas livres para esta etapa. Nenhuma pergunta pronta será inserida automaticamente.'
                        : currentSection.desc}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-fit rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                      {questions.length} pergunta{questions.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomEditorOpen(prev => !prev)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
                    >
                      {customEditorOpen || questions.length === 0 ? 'Ocultar criação' : 'Adicionar pergunta'}
                    </button>
                  </div>
                </div>

                {(customEditorOpen || questions.length === 0) && (
                  <div className="mt-4 grid gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nova pergunta</p>
                    <textarea
                      className="min-h-20 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      placeholder="Escreva uma pergunta própria para esta seção."
                      value={customDraft.q}
                      onChange={e => setCustomDraft(draft => ({ ...draft, q: e.target.value }))}
                    />
                    <input
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      placeholder="Contexto opcional para orientar a resposta."
                      value={customDraft.hint}
                      onChange={e => setCustomDraft(draft => ({ ...draft, hint: e.target.value }))}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={addCustomQuestion}
                        className="rounded-md bg-gray-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                {questions.length > 0 ? (
                  questions.map((item, qi) => (
                    <QuestionCard
                      key={item.id}
                      num={qi + 1}
                      question={item.q}
                      hint={item.hint}
                      isArea={item.isArea}
                      isCustom={item.isCustom}
                      areaLabel={item.areaLabel}
                      answerKey={item.id}
                      answer={getAnswerForQuestion(answers, item, currentSection.id, qi)}
                      onChange={handleAnswer}
                      onUpdateCustom={item.isCustom ? patch => updateCustomQuestion(currentSection.id, item.id, patch) : undefined}
                      onRemoveCustom={item.isCustom ? () => removeCustomQuestion(currentSection.id, item.id) : undefined}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center">
                    <p className="text-sm font-semibold text-gray-900">Nenhuma pergunta nesta seção ainda.</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Crie a primeira pergunta acima para começar a entrevista manual.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {workspaceTab === 'transcription' && (
            <section
              id="workspace-panel-transcription"
              role="tabpanel"
              aria-labelledby="workspace-tab-transcription"
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm shadow-gray-200/60"
            >
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Transcrição da entrevista</p>
                    <p className="mt-1 text-xs text-gray-500">Material de apoio para enriquecer o dossiê sem depender de API paga.</p>
                  </div>
                  <span className="w-fit rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-500">
                    {audioCount} áudio{audioCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Transcrição bruta</label>
                    <textarea
                      className="min-h-72 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      placeholder="Cole aqui o texto transcrito do áudio."
                      value={transcription.raw}
                      onChange={e => updateTranscription('raw', e.target.value)}
                    />
                  </div>

                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Áudios de referência</p>
                    <input
                      id="audio-reference-input"
                      type="file"
                      accept="audio/*"
                      multiple
                      className="sr-only"
                      onChange={e => {
                        addAudioRefs(e.target.files)
                        e.target.value = ''
                      }}
                    />
                    <label
                      htmlFor="audio-reference-input"
                      className="mt-3 flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
                    >
                      Adicionar áudio
                    </label>

                    <div className="mt-3 space-y-2">
                      {transcription.audioRefs.length > 0 ? (
                        transcription.audioRefs.map(audio => (
                          <div key={audio.id} className="rounded-md border border-gray-200 bg-white p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-gray-900">{audio.name}</p>
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                  {formatBytes(audio.size)}{audio.type ? ` · ${audio.type}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAudioRef(audio.id)}
                                className="shrink-0 rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-center text-xs text-gray-500">
                          Nenhum áudio referenciado.
                        </p>
                      )}
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                      O arquivo original continua fora do sistema.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {TRANSCRIPTION_FIELDS.map(([label, field, placeholder]) => (
                    <div key={field}>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</label>
                      <textarea
                        className="min-h-28 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder={placeholder}
                        value={transcription[field]}
                        onChange={e => updateTranscription(field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {workspaceTab === 'summary' && (
            <section
              id="workspace-panel-summary"
              role="tabpanel"
              aria-labelledby="workspace-tab-summary"
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm shadow-gray-200/60"
            >
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Síntese executiva</p>
              </div>
              {SUMMARY_FIELDS.map(([label, field, placeholder]) => (
                <div key={field} className="grid border-b border-gray-100 last:border-b-0 sm:grid-cols-[190px_1fr]">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 sm:border-b-0 sm:border-r">
                    {label}
                  </div>
                  <textarea
                    className="min-h-24 resize-y bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:bg-sky-50/30"
                    placeholder={placeholder}
                    value={summary[field]}
                    onChange={e => setSummary(s => ({ ...s, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </section>
          )}

          {error && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500">
              {editing ? 'Atualize a entrevista ou gere o PDF final.' : 'Salve o dossiê quando a coleta estiver pronta.'}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : saved ? 'Salvo' : editing ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-sky-300 hover:text-sky-700"
              >
                Exportar PDF
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuestionLibraryDrawer
        open={libraryOpen}
        activeSectionId={currentSection.id}
        onClose={() => setLibraryOpen(false)}
        onAdd={addLibraryQuestion}
      />
    </div>
  )
}
