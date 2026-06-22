'use client'
import { useState, useEffect } from 'react'
import InterviewForm from '@/components/InterviewForm'
import InterviewList from '@/components/InterviewList'
import { getInterviews, isRemoteSyncEnabled, syncInterviewsFromRemote } from '@/lib/storage'

export default function Home() {
  const [tab,        setTab]    = useState('nova')       // 'nova' | 'entrevistas'
  const [editing,    setEditing] = useState(null)         // interview being edited
  const [interviews, setIvs]    = useState([])
  const [syncing,    setSyncing] = useState(false)
  const [syncError,  setSyncErr] = useState('')

  function refresh() { setIvs(getInterviews()) }

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

  function handleEdit(iv) {
    setEditing(iv)
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
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="font-semibold text-gray-800 text-sm">Interview Mapper</span>
            <span className="text-gray-300 text-xs ml-1">v1.0</span>
            <span className={`hidden sm:inline-flex text-[10px] rounded-full px-2 py-0.5 ml-1 ${
              isRemoteSyncEnabled()
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}>
              {isRemoteSyncEnabled() ? 'Sheets ativo' : 'Local'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isRemoteSyncEnabled() && (
              <button
                onClick={syncRemote}
                disabled={syncing}
                className="px-3 py-1.5 text-sm rounded-lg font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            )}
            <button
              onClick={handleNew}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                tab === 'nova'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Nova entrevista
            </button>
            <button
              onClick={() => { setTab('entrevistas'); refresh() }}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                tab === 'entrevistas'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Entrevistas
              {interviews.length > 0 && (
                <span className={`text-[11px] rounded-full px-1.5 font-bold ${
                  tab === 'entrevistas' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {interviews.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {syncError && (
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 max-w-3xl mx-auto">
            <p className="text-xs text-amber-700">{syncError}</p>
          </div>
        )}

        {/* Editing banner */}
        {tab === 'nova' && editing && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex items-center justify-between max-w-3xl mx-auto">
            <p className="text-xs text-amber-700">
              ✏️ Editando: <strong>{editing.meta?.entrevistado || 'entrevista sem nome'}</strong>
            </p>
            <button onClick={handleNew} className="text-xs text-amber-600 underline hover:text-amber-800">
              Nova entrevista
            </button>
          </div>
        )}
      </header>

      {/* Content */}
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
