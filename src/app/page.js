'use client'
import { useState, useEffect } from 'react'
import InterviewForm from '@/components/InterviewForm'
import InterviewList from '@/components/InterviewList'
import { getInterviews, isRemoteSyncEnabled, syncInterviewsFromRemote } from '@/lib/storage'

export default function Home() {
  const [tab, setTab] = useState('nova')
  const [editing, setEditing] = useState(null)
  const [interviews, setIvs] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncErr] = useState('')

  function refresh() {
    setIvs(getInterviews())
  }

  async function syncRemote() {
    if (!isRemoteSyncEnabled()) return

    setSyncing(true)
    setSyncErr('')
    try {
      setIvs(await syncInterviewsFromRemote())
    } catch (err) {
      setSyncErr(err.message || 'Não foi possível sincronizar com o Google Sheets.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh()
      syncRemote()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function handleEdit(interview) {
    setEditing(interview)
    setTab('nova')
  }

  function handleSaveAndRefresh() {
    refresh()
  }

  function handleNew() {
    setEditing(null)
    setTab('nova')
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-950 text-xs font-bold text-white">
                IM
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold leading-tight text-gray-950">Interview Mapper</p>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">v1.3.0</span>
                </div>
                <p className="hidden text-xs text-gray-500 sm:block">Mapeamento de processos para Product Owners</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden rounded-md border px-2 py-1 text-[11px] font-semibold sm:inline-flex ${
              isRemoteSyncEnabled()
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              {isRemoteSyncEnabled() ? 'Sheets ativo' : 'Modo local'}
            </span>

            {isRemoteSyncEnabled() && (
              <button
                type="button"
                onClick={syncRemote}
                disabled={syncing}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
              >
                {syncing ? 'Sincronizando' : 'Sincronizar'}
              </button>
            )}

            <div className="flex rounded-md border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={handleNew}
                className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'nova'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Nova
              </button>
              <button
                type="button"
                onClick={() => { setTab('entrevistas'); refresh() }}
                className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                  tab === 'entrevistas'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Entrevistas
                {interviews.length > 0 && (
                  <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[11px] text-gray-700">
                    {interviews.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {syncError && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2">
            <p className="mx-auto max-w-7xl text-xs text-amber-800">{syncError}</p>
          </div>
        )}

        {tab === 'nova' && editing && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <p className="truncate text-xs text-amber-800">
                Editando: <strong>{editing.meta?.processo || editing.meta?.entrevistado || 'entrevista sem nome'}</strong>
              </p>
              <button
                type="button"
                onClick={handleNew}
                className="shrink-0 text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
              >
                Criar nova
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {tab === 'nova' ? (
          <InterviewForm
            key={editing?.id || 'new'}
            initialData={editing}
            onSave={handleSaveAndRefresh}
            onCancel={editing ? () => { setEditing(null) } : undefined}
          />
        ) : (
          <InterviewList
            interviews={interviews}
            onEdit={handleEdit}
            onRefresh={refresh}
          />
        )}
      </main>
    </>
  )
}
