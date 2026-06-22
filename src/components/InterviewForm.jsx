'use client'
import { useState, useCallback } from 'react'
import { SECTIONS, AREAS, getAllQuestionsForSection, getAnswerForQuestion, migrateAnswerKeys } from '@/lib/questions'
import { saveInterview } from '@/lib/storage'
import { generateExportText, downloadText, buildFilename } from '@/lib/exportUtils'
import QuestionCard from './QuestionCard'

const EMPTY_META    = { entrevistado: '', entrevistador: '', data: new Date().toISOString().split('T')[0], duracao: '45 minutos' }
const EMPTY_SUMMARY = { descobertas: '', riscos: '', oportunidades: '', duvidas: '', passos: '' }

export default function InterviewForm({ initialData, onSave, onCancel }) {
  const editing = !!initialData?.id
  const initialAnswers = migrateAnswerKeys(initialData?.selectedAreas || [], initialData?.answers || {})

  const [meta,          setMeta]    = useState(initialData?.meta    || EMPTY_META)
  const [selectedAreas, setAreas]   = useState(initialData?.selectedAreas || [])
  const [activeSection, setSection] = useState(0)
  const [answers,       setAnswers] = useState(initialAnswers)
  const [summary,       setSummary] = useState(initialData?.summary || EMPTY_SUMMARY)
  const [saved,         setSaved]   = useState(false)
  const [saving,        setSaving]  = useState(false)
  const [error,         setError]   = useState('')

  function toggleArea(id) {
    setAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const handleAnswer = useCallback((key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  // Progress
  const totalQ = SECTIONS.reduce((acc, s) => acc + getAllQuestionsForSection(s.id, selectedAreas).length, 0)
  const doneQ  = SECTIONS.reduce((acc, s) => {
    return acc + getAllQuestionsForSection(s.id, selectedAreas).filter((item, qi) => {
      const ans = getAnswerForQuestion(answers, item, s.id, qi)
      return ans?.text?.trim() || ans?.images?.length > 0
    }).length
  }, 0)
  const pct = totalQ > 0 ? Math.round((doneQ / totalQ) * 100) : 0

  function buildInterview() {
    return {
      ...(initialData || {}),
      meta,
      selectedAreas,
      answers: migrateAnswerKeys(selectedAreas, answers),
      summary,
      stats: {
        totalQuestions: totalQ,
        answeredQuestions: doneQ,
        progressPct: pct,
      },
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const interview = buildInterview()
      const result = await saveInterview(interview)
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
    const interview = buildInterview()
    const text = generateExportText(interview)
    downloadText(buildFilename(interview), text)
  }

  const currentSection = SECTIONS[activeSection]
  const questions      = getAllQuestionsForSection(currentSection.id, selectedAreas)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Meta fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados da entrevista</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Entrevistado', 'entrevistado', 'text',   'Nome e cargo'],
            ['Entrevistador','entrevistador','text',   'Seu nome'],
            ['Data',         'data',         'date',   ''],
            ['Duração',      'duracao',      'select', ''],
          ].map(([label, field, type, ph]) => (
            <div key={field}>
              <label className="text-[11px] text-gray-400 block mb-1">{label}</label>
              {type === 'select' ? (
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  value={meta[field]}
                  onChange={e => setMeta(m => ({ ...m, [field]: e.target.value }))}
                >
                  {['30 minutos','45 minutos','60 minutos','90 minutos'].map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={type}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  placeholder={ph}
                  value={meta[field]}
                  onChange={e => setMeta(m => ({ ...m, [field]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Area chips */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Área do entrevistado</p>
        <div className="flex flex-wrap gap-2">
          {AREAS.map(a => (
            <button
              key={a.id}
              onClick={() => toggleArea(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${selectedAreas.includes(a.id)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">{doneQ} de {totalQ} perguntas respondidas</span>
          <span className="text-xs font-semibold text-blue-600">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Section tabs */}
      <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
        {SECTIONS.map((s, i) => {
          const sq = getAllQuestionsForSection(s.id, selectedAreas)
          const sd = sq.filter((item, qi) => {
            const ans = getAnswerForQuestion(answers, item, s.id, qi)
            return ans?.text?.trim() || ans?.images?.length > 0
          }).length
          return (
            <button
              key={s.id}
              onClick={() => setSection(i)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeSection === i
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>{s.icon}</span> {s.label}
              {sd > 0 && (
                <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{sd}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Section desc */}
      <p className="text-xs text-gray-500 bg-gray-50 border-l-2 border-blue-300 pl-3 py-2 rounded-r-lg">
        {currentSection.desc}
        {selectedAreas.length > 0 && (() => {
          const extra = questions.filter(q => q.isArea).length
          return extra > 0 ? <span className="text-amber-600 font-medium"> +{extra} pergunta{extra > 1 ? 's' : ''} específica{extra > 1 ? 's' : ''} da área.</span> : null
        })()}
      </p>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((item, qi) => (
          <QuestionCard
            key={`${currentSection.id}-${qi}`}
            num={qi + 1}
            question={item.q}
            hint={item.hint}
            isArea={item.isArea}
            areaLabel={item.areaLabel}
            answerKey={item.id}
            answer={getAnswerForQuestion(answers, item, currentSection.id, qi)}
            onChange={handleAnswer}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">📝 Resumo pós-entrevista</p>
        </div>
        {[
          ['🎯 Principais descobertas', 'descobertas', 'Principais aprendizados sobre o processo...'],
          ['⚠️  Riscos identificados',  'riscos',       'Pontos frágeis ou críticos encontrados...'],
          ['💡 Oportunidades',          'oportunidades','Melhorias e automações identificadas...'],
          ['❓ Dúvidas em aberto',      'duvidas',      'O que ainda precisa ser esclarecido...'],
          ['👣 Próximos passos',        'passos',       'Ações acordadas e responsáveis...'],
        ].map(([label, field, ph]) => (
          <div key={field} className="grid grid-cols-[160px_1fr] border-b border-gray-100 last:border-b-0">
            <div className="px-4 py-3 flex items-start text-xs font-medium text-gray-600 bg-gray-50 border-r border-gray-100">
              {label}
            </div>
            <textarea
              className="text-sm text-gray-700 px-3 py-2.5 min-h-[64px] resize-y focus:outline-none placeholder:text-gray-300 bg-white"
              placeholder={ph}
              value={summary[field]}
              onChange={e => setSummary(s => ({ ...s, [field]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : editing ? '💾 Atualizar' : '💾 Salvar entrevista'}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-700 text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          ⬇ Exportar
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2.5"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
