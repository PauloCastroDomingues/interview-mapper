'use client'
import { useState } from 'react'
import { AREAS, SECTIONS, getAllQuestionsForSection, getAnswerForQuestion } from '@/lib/questions'
import { deleteInterview } from '@/lib/storage'
import { exportInterviewPdf } from '@/lib/exportUtils'

function calcProgress(interview) {
  if (typeof interview.stats?.progressPct === 'number') return interview.stats.progressPct

  const { selectedAreas = [], customQuestions = {}, answers = {} } = interview
  const questionOptions = { manualOnly: interview.questionMode === 'manual' }
  const total = SECTIONS.reduce((acc, section) => {
    return acc + getAllQuestionsForSection(section.id, selectedAreas, customQuestions, questionOptions).length
  }, 0)
  const done = SECTIONS.reduce((acc, section) => {
    return acc + getAllQuestionsForSection(section.id, selectedAreas, customQuestions, questionOptions).filter((item, index) => {
      const ans = getAnswerForQuestion(answers, item, section.id, index)
      return ans?.text?.trim() || ans?.images?.length > 0
    }).length
  }, 0)

  return total > 0 ? Math.round((done / total) * 100) : 0
}

function formatDate(iso) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
}

function countImages(answers = {}) {
  return Object.values(answers).reduce((acc, answer) => acc + (answer?.images?.length || 0), 0)
}

function countCustomQuestions(customQuestions = {}) {
  return Object.values(customQuestions).reduce((acc, questions) => acc + (questions?.length || 0), 0)
}

function hasTranscriptionContent(transcription = {}) {
  return Boolean(
    transcription.raw?.trim()
    || transcription.highlights?.trim()
    || transcription.decisions?.trim()
    || transcription.doubts?.trim()
  )
}

function countAudioRefs(transcription = {}) {
  return Array.isArray(transcription.audioRefs) ? transcription.audioRefs.length : 0
}

export default function InterviewList({ interviews, onEdit, onRefresh }) {
  const [error, setError] = useState('')

  async function handleDelete(id) {
    if (!confirm('Excluir esta entrevista? Esta ação não pode ser desfeita.')) return

    setError('')
    try {
      const result = await deleteInterview(id)
      if (result.remoteError) {
        setError(`A entrevista foi removida localmente, mas o sync com Google Sheets falhou: ${result.remoteError}`)
      }
    } catch (err) {
      setError(err.message || 'Não foi possível remover a entrevista.')
    } finally {
      onRefresh()
    }
  }

  function handleExport(interview) {
    try {
      exportInterviewPdf(interview)
    } catch (err) {
      setError(err.message || 'Não foi possível preparar o PDF.')
    }
  }

  if (!interviews.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">Entrevistas</p>
        <p className="mt-3 text-lg font-semibold text-gray-900">Nenhuma entrevista salva ainda.</p>
        <p className="mt-1 text-sm text-gray-500">Preencha e salve uma entrevista para montar seu histórico de mapeamentos.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Histórico</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-950">
            {interviews.length} entrevista{interviews.length !== 1 ? 's' : ''} salva{interviews.length !== 1 ? 's' : ''}
          </h1>
        </div>
        <p className="text-sm text-gray-500">Edite, revise ou gere PDF com prompt refinado.</p>
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      <div className="grid gap-3">
        {interviews.map(interview => {
          const pct = calcProgress(interview)
          const areas = (interview.selectedAreas || [])
            .map(id => AREAS.find(area => area.id === id)?.label)
            .filter(Boolean)
          const imgCount = countImages(interview.answers)
          const customCount = countCustomQuestions(interview.customQuestions)
          const hasTranscript = hasTranscriptionContent(interview.transcription)
          const audioCount = countAudioRefs(interview.transcription)
          const isManual = interview.questionMode === 'manual'

          return (
            <article key={interview.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-200">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-gray-950">
                      {interview.meta?.processo || interview.meta?.entrevistado || 'Entrevista sem nome'}
                    </h2>
                    {areas.map(area => (
                      <span key={area} className="rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        {area}
                      </span>
                    ))}
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      isManual
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}>
                      {isManual ? 'manual' : 'guiada'}
                    </span>
                    {customCount > 0 && (
                      <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {customCount} personalizada{customCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {imgCount > 0 && (
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {imgCount} print{imgCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {hasTranscript && (
                      <span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        transcrição
                      </span>
                    )}
                    {audioCount > 0 && (
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {audioCount} áudio{audioCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    {interview.meta?.entrevistado || 'Entrevistado não informado'}
                    {interview.meta?.entrevistador ? ` · por ${interview.meta.entrevistador}` : ''}
                    {' · '}
                    {formatDate(interview.meta?.data)}
                  </p>

                  {interview.meta?.objetivo && (
                    <p className="mt-2 line-clamp-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      {interview.meta.objetivo}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{pct}%</span>
                  </div>

                  <p className="mt-3 text-[11px] text-gray-400">
                    Atualizado em {formatDate(interview.updatedAt)} · ID {interview.id?.slice(0, 8)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                  <button
                    type="button"
                    onClick={() => onEdit(interview)}
                    className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(interview)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition-colors hover:border-sky-300 hover:text-sky-700"
                  >
                    Exportar PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(interview.id)}
                    className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
