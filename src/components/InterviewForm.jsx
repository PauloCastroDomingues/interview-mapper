'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
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

function hasDraftContent(interview) {
  const hasMeta = Object.entries(interview.meta || {}).some(([key, value]) => (
    !['data', 'duracao'].includes(key) && String(value || '').trim()
  ))
  const hasAnswers = Object.values(interview.answers || {}).some(answer => (
    answer?.text?.trim() || answer?.images?.length > 0
  ))
  const hasCustomQuestions = Object.values(interview.customQuestions || {}).some(items => items?.length > 0)
  const hasSummary = Object.values(interview.summary || {}).some(value => String(value || '').trim())
  const transcription = normalizeTranscription(interview.transcription)
  const hasTranscription = Boolean(
    transcription.raw.trim()
    || transcription.highlights.trim()
    || transcription.decisions.trim()
    || transcription.doubts.trim()
    || transcription.audioRefs.length
  )
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
  const [answers, setAnswers] = useState(initialAnswers)
  const [customQuestions, setCustomQuestions] = useState(initialCustomQuestions)
  const [customDraft, setCustomDraft] = useState(EMPTY_CUSTOM_DRAFT)
  const [transcription, setTranscription] = useState(normalizeTranscription(initialData?.transcription))
  const [summary, setSummary] = useState({ ...EMPTY_SUMMARY, ...(initialData?.summary || {}) })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autosave, setAutosave] = useState({ status: 'idle', at: '' })
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [error, setError] = useState('')

  const manualOnly = questionMode === 'manual'
  const questionOptions = { manualOnly }
  const currentSection = SECTIONS[activeSection]
  const questions = getAllQuestionsForSection(currentSection.id, selectedAreas, customQuestions, questionOptions)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  function toggleArea(id) {
    setAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const handleAnswer = useCallback((key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  function updateTranscription(field, value) {
    setTranscription(prev => ({ ...prev, [field]: value }))
  }

  function addAudioRefs(files) {
    const nextFiles = Array.from(files || [])
      .filter(file => file?.name)
      .map((file, index) => ({
        id: `audio_${Date.now()}_${index}_${file.name}`,
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
    const sectionQuestions = getAllQuestionsForSection(section.id, selectedAreas, customQuestions, questionOptions)
    const answered = sectionQuestions.filter((item, qi) => {
      const ans = getAnswerForQuestion(answers, item, section.id, qi)
      return ans?.text?.trim() || ans?.images?.length > 0
    }).length

    return { total: sectionQuestions.length, answered }
  }

  const totalQ = SECTIONS.reduce((acc, s) => acc + getSectionStats(s).total, 0)
  const doneQ = SECTIONS.reduce((acc, s) => acc + getSectionStats(s).answered, 0)
  const pct = totalQ > 0 ? Math.round((doneQ / totalQ) * 100) : 0

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
    }, 1800)

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

  const areaLabels = selectedAreas
    .map(id => AREAS.find(a => a.id === id)?.label)
    .filter(Boolean)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dossiê de entrevista</p>
            <h1 className="mt-1 text-xl font-semibold text-gray-950">
              {meta.processo || 'Mapeamento de processo'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1">{QUESTION_MODES[questionMode].label}</span>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1">{doneQ}/{totalQ} respostas</span>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1">{pct}% completo</span>
            <span className={`rounded-md border px-2 py-1 ${
              autosave.status === 'error'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : autosave.status === 'saving'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}>
              {autosave.status === 'saving'
                ? 'Autosave...'
                : autosave.status === 'saved'
                  ? `Autosave ${autosave.at}`
                  : autosave.status === 'error'
                    ? 'Autosave falhou'
                    : 'Autosave local'}
            </span>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_1.2fr_.8fr_.8fr_.7fr_.7fr]">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Processo mapeado</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Ex: Onboarding B2B, régua de retenção, conciliação financeira"
              value={meta.processo}
              onChange={e => setMeta(m => ({ ...m, processo: e.target.value }))}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Objetivo do PO</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="O que precisa sair documentado ou decidido?"
              value={meta.objetivo}
              onChange={e => setMeta(m => ({ ...m, objetivo: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Entrevistado</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Nome e cargo"
              value={meta.entrevistado}
              onChange={e => setMeta(m => ({ ...m, entrevistado: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Entrevistador</label>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Seu nome"
              value={meta.entrevistador}
              onChange={e => setMeta(m => ({ ...m, entrevistador: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Data</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              value={meta.data}
              onChange={e => setMeta(m => ({ ...m, data: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Duração</label>
            <select
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              value={meta.duracao}
              onChange={e => setMeta(m => ({ ...m, duracao: e.target.value }))}
            >
              {['30 minutos', '45 minutos', '60 minutos', '90 minutos', '120 minutos'].map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(QUESTION_MODES).map(([mode, config]) => {
              const active = questionMode === mode
              return (
                <button
                  type="button"
                  key={mode}
                  onClick={() => {
                    setQuestionMode(mode)
                    setError('')
                  }}
                  className={`rounded-md border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-gray-950 bg-white text-gray-950 shadow-sm'
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-white'
                  }`}
                >
                  <span className="block text-sm font-semibold">{config.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-500">{config.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Progresso</p>
              <p className="text-sm font-semibold text-gray-900">{pct}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{doneQ} de {totalQ} perguntas respondidas</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biblioteca</p>
            <p className="mt-2 text-sm font-semibold text-gray-950">Perguntas prontas reutilizáveis</p>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="mt-3 w-full rounded-md bg-gray-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Abrir biblioteca
            </button>
          </section>

          {questionMode === 'guided' ? (
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Área do entrevistado</p>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(area => (
                  <button
                    type="button"
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      selectedAreas.includes(area.id)
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:text-sky-700'
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
              {areaLabels.length > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  Perguntas específicas ativas para {areaLabels.join(', ')}.
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Modo manual</p>
              <p className="mt-2 text-sm font-semibold text-emerald-950">Entrevista sem roteiro pronto</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Use as seções como organização e crie cada pergunta do seu jeito. As perguntas padrão ficam ocultas neste modo.
              </p>
            </section>
          )}

          <nav className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm shadow-gray-200/60">
            {SECTIONS.map((section, index) => {
              const stats = getSectionStats(section)
              return (
                <button
                  type="button"
                  key={section.id}
                  onClick={() => setSection(index)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors last:mb-0 ${
                    activeSection === index
                      ? 'bg-gray-950 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`flex h-6 w-8 items-center justify-center rounded text-[11px] font-semibold ${
                    activeSection === index ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {section.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{section.label}</span>
                    <span className={`block text-[11px] ${activeSection === index ? 'text-white/70' : 'text-gray-400'}`}>
                      {stats.answered}/{stats.total} respondidas
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Seção ativa</p>
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
                  onClick={() => setLibraryOpen(true)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
                >
                  Biblioteca
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pergunta personalizada</p>
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
                  Adicionar pergunta
                </button>
              </div>
            </div>
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
                  Escreva a primeira pergunta acima para começar sua entrevista manual do zero.
                </p>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm shadow-gray-200/60">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Transcrição da entrevista</p>
                  <p className="mt-1 text-xs text-gray-500">Cole a transcrição e organize sinais importantes para a documentação.</p>
                </div>
                <span className="w-fit rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-500">
                  {transcription.audioRefs.length} áudio{transcription.audioRefs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Transcrição bruta</label>
                  <textarea
                    className="min-h-64 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Cole aqui o texto transcrito do áudio."
                    value={transcription.raw}
                    onChange={e => updateTranscription('raw', e.target.value)}
                  />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
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
                    O app salva apenas nome, tipo e tamanho. O arquivo original continua fora do sistema.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Pontos-chave</label>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Trechos, frases e sinais que merecem atenção."
                    value={transcription.highlights}
                    onChange={e => updateTranscription('highlights', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Decisões citadas</label>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Acordos, regras, exceções e responsáveis mencionados."
                    value={transcription.decisions}
                    onChange={e => updateTranscription('decisions', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Dúvidas da transcrição</label>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="Falas ambíguas, termos a validar e pontos incompletos."
                    value={transcription.doubts}
                    onChange={e => updateTranscription('doubts', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm shadow-gray-200/60">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Síntese para documentação</p>
            </div>
            {[
              ['Principais descobertas', 'descobertas', 'Aprendizados centrais sobre o processo, regras e contexto.'],
              ['Riscos identificados', 'riscos', 'Pontos frágeis, dependências, impactos e controles ausentes.'],
              ['Oportunidades', 'oportunidades', 'Melhorias, automações e simplificações candidatas ao backlog.'],
              ['Dúvidas em aberto', 'duvidas', 'Pendências que precisam de validação, dado ou decisão.'],
              ['Próximos passos', 'passos', 'Ações, responsáveis e decisões combinadas.'],
            ].map(([label, field, placeholder]) => (
              <div key={field} className="grid border-b border-gray-100 last:border-b-0 sm:grid-cols-[190px_1fr]">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 sm:border-b-0 sm:border-r">
                  {label}
                </div>
                <textarea
                  className="min-h-20 resize-y bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:bg-sky-50/30"
                  placeholder={placeholder}
                  value={summary[field]}
                  onChange={e => setSummary(s => ({ ...s, [field]: e.target.value }))}
                />
              </div>
            ))}
          </section>

          {error && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : saved ? 'Salvo' : editing ? 'Atualizar entrevista' : 'Salvar entrevista'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-sky-300 hover:text-sky-700"
            >
              Exportar PDF com prompt de IA
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

      <QuestionLibraryDrawer
        open={libraryOpen}
        activeSectionId={currentSection.id}
        onClose={() => setLibraryOpen(false)}
        onAdd={addLibraryQuestion}
      />
    </div>
  )
}
