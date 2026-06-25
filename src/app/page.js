'use client'
import { useState, useEffect, useRef } from 'react'
import InterviewForm from '@/components/InterviewForm'
import InterviewList from '@/components/InterviewList'
import {
  buildLocalBackupFilename,
  getInterviews,
  importLocalBackup,
  isRemoteSyncEnabled,
  serializeLocalBackup,
  syncInterviewsFromRemote,
} from '@/lib/storage'

export default function Home() {
  const backupInputRef = useRef(null)
  const [tab, setTab] = useState('nova')
  const [editing, setEditing] = useState(null)
  const [interviews, setIvs] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncErr] = useState('')
  const [backupNotice, setBackupNotice] = useState({ type: '', message: '' })

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

  function downloadBackup() {
    try {
      const blob = new Blob([serializeLocalBackup()], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = buildLocalBackupFilename()
      link.click()
      URL.revokeObjectURL(url)
      setBackupNotice({
        type: 'success',
        message: `Backup JSON gerado com ${interviews.length} entrevista${interviews.length !== 1 ? 's' : ''}.`,
      })
    } catch (err) {
      setBackupNotice({
        type: 'error',
        message: err.message || 'Não foi possível gerar o backup local.',
      })
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const result = importLocalBackup(content)
      setIvs(result.interviews)
      setEditing(null)
      setTab('entrevistas')
      setBackupNotice({
        type: 'success',
        message: `${result.importedCount} entrevista${result.importedCount !== 1 ? 's' : ''} importada${result.importedCount !== 1 ? 's' : ''}. Total local: ${result.totalCount}.`,
      })
    } catch (err) {
      setBackupNotice({
        type: 'error',
        message: err.message || 'Não foi possível importar este backup.',
      })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:flex-nowrap sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-950 text-xs font-bold text-white">
                IM
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold leading-tight text-gray-950">Interview Mapper</p>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">v1.3.2</span>
                </div>
                <p className="hidden text-xs text-gray-500 sm:block">Mapeamento de processos para Product Owners</p>
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={importBackup}
            />

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

            <button
              type="button"
              onClick={downloadBackup}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
            >
              Backup
            </button>

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
            >
              Importar
            </button>

            <div className="grid w-full grid-cols-2 rounded-md border border-gray-200 bg-gray-50 p-1 sm:flex sm:w-auto">
              <button
                type="button"
                onClick={handleNew}
                className={`rounded px-2.5 py-1.5 text-center text-sm font-semibold transition-colors sm:px-3 ${
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
                className={`rounded px-2.5 py-1.5 text-center text-sm font-semibold transition-colors sm:px-3 ${
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

        {backupNotice.message && (
          <div className={`border-t px-4 py-2 ${
            backupNotice.type === 'error'
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}>
            <p className={`mx-auto max-w-7xl text-xs ${
              backupNotice.type === 'error' ? 'text-amber-800' : 'text-emerald-800'
            }`}>
              {backupNotice.message}
            </p>
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
