'use client'
import { useState } from 'react'
import { AREAS, SECTIONS, getAllQuestionsForSection, getAnswerForQuestion } from '@/lib/questions'
import { deleteInterview } from '@/lib/storage'
import { generateExportText, downloadText, buildFilename } from '@/lib/exportUtils'

function calcProgress(interview) {
  if (typeof interview.stats?.progressPct === 'number') return interview.stats.progressPct

  const { selectedAreas = [], answers = {} } = interview
  const total = SECTIONS.reduce((a, s) => a + getAllQuestionsForSection(s.id, selectedAreas).length, 0)
  const done  = SECTIONS.reduce((acc, s) => {
    return acc + getAllQuestionsForSection(s.id, selectedAreas).filter((item, qi) => {
      const ans = getAnswerForQuestion(answers, item, s.id, qi)
      return ans?.text?.trim() || ans?.images?.length > 0
    }).length
  }, 0)
  return total > 0 ? Math.round((done / total) * 100) : 0
}

function formatDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
}

export default function InterviewList({ interviews, onEdit, onRefresh }) {
  const [error, setError] = useState('')

  if (!interviews.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-500 font-medium">Nenhuma entrevista salva ainda.</p>
        <p className="text-sm text-gray-400 mt-1">Preencha e salve uma entrevista na aba &quot;Nova entrevista&quot;.</p>
      </div>
    )
  }

  async function handleDelete(id) {
    if (confirm('Excluir esta entrevista? Esta ação não pode ser desfeita.')) {
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
  }

  function handleExport(interview) {
    const text = generateExportText(interview)
    downloadText(buildFilename(interview), text)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{interviews.length} entrevista{interviews.length !== 1 ? 's' : ''} salva{interviews.length !== 1 ? 's' : ''}</p>
      </div>

      {error && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {interviews.map(iv => {
          const pct    = calcProgress(iv)
          const areas  = (iv.selectedAreas || []).map(id => AREAS.find(a => a.id === id)?.label).filter(Boolean)
          const imgCount = Object.values(iv.answers || {}).reduce((a, ans) => a + (ans?.images?.length || 0), 0)

          return (
            <div key={iv.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">
                      {iv.meta?.entrevistado || 'Sem nome'}
                    </p>
                    {areas.map(a => (
                      <span key={a} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">{a}</span>
                    ))}
                    {imgCount > 0 && (
                      <span className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">📎 {imgCount} img</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-xs text-gray-400">
                      {iv.meta?.entrevistador && <span>por {iv.meta.entrevistador} · </span>}
                      {formatDate(iv.meta?.data)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400">{pct}%</span>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {iv.summary?.descobertas && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                      🎯 {iv.summary.descobertas}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => onEdit(iv)}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg px-3 py-1.5 transition-colors text-center"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleExport(iv)}
                    className="text-xs text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors text-center"
                  >
                    ⬇ Exportar
                  </button>
                  <button
                    onClick={() => handleDelete(iv.id)}
                    className="text-xs text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg px-3 py-1.5 transition-colors text-center"
                  >
                    🗑 Excluir
                  </button>
                </div>
              </div>

              <p className="mt-3 text-[10px] text-gray-300">
                Salvo em {formatDate(iv.updatedAt)} · ID {iv.id?.slice(0, 8)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
