'use client'
import { useState, useEffect, useRef } from 'react'
import InterviewForm from '@/components/InterviewForm'
import InterviewList from '@/components/InterviewList'
import POWorkbench from '@/components/POWorkbench'
import {
  buildLocalBackupFilename,
  getInterviews,
  importLocalBackup,
  isRemoteSyncEnabled,
  serializeLocalBackup,
  syncInterviewsFromRemote,
} from '@/lib/storage'

const NAV_ITEMS = [
  { id: 'nova', label: 'Nova entrevista', short: 'Nova' },
  { id: 'entrevistas', label: 'Entrevistas', short: 'Entrevistas' },
  { id: 'po', label: 'PO Workspace', short: 'PO' },
]

function getPageTitle(tab, editing) {
  if (tab === 'nova') return editing ? 'Editar entrevista' : 'Nova entrevista'
  if (tab === 'entrevistas') return 'Entrevistas'
  return 'PO Workspace'
}

function getPageSubtitle(tab, count) {
  if (tab === 'nova') return 'Coleta estruturada, evidências e síntese para discovery.'
  if (tab === 'entrevistas') return `${count} entrevista${count !== 1 ? 's' : ''} salva${count !== 1 ? 's' : ''} no navegador.`
  return 'Consolidação de processo, maturidade, decisões, mapa e backlog.'
}

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

  function selectTab(nextTab) {
    if (nextTab === 'nova') {
      handleNew()
      return
    }

    setTab(nextTab)
    refresh()
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

  const pageTitle = getPageTitle(tab, editing)
  const pageSubtitle = getPageSubtitle(tab, interviews.length)

  return (
    <div className="min-h-screen bg-slate-100 text-gray-950">
      <input
        ref={backupInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={importBackup}
      />

      <aside className="hidden border-r border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="border-b border-gray-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-950 text-xs font-bold text-white">
              IM
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-gray-950">Interview Mapper</p>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">v1.7.0</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">PO workbench pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Workspace</p>
          <div className="space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => selectTab(item.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  tab === item.id
                    ? 'bg-gray-950 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'entrevistas' && interviews.length > 0 && (
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${
                    tab === item.id ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {interviews.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className={`mb-3 rounded-md border px-3 py-2 text-xs font-semibold ${
            isRemoteSyncEnabled()
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}>
            {isRemoteSyncEnabled() ? 'Sheets ativo' : 'Modo local'}
          </div>
          <div className="grid gap-2">
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
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-3 lg:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 lg:hidden">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-950 text-xs font-bold text-white">
                    IM
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">v1.7.0</span>
                </div>
                <h1 className="mt-2 truncate text-lg font-semibold text-gray-950 lg:mt-0">{pageTitle}</h1>
                <p className="mt-0.5 text-sm text-gray-500">{pageSubtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="grid w-full grid-cols-3 rounded-md border border-gray-200 bg-gray-50 p-1 sm:w-auto lg:hidden">
                  {NAV_ITEMS.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => selectTab(item.id)}
                      className={`rounded px-2.5 py-1.5 text-center text-sm font-semibold transition-colors sm:px-3 ${
                        tab === item.id
                          ? 'bg-white text-gray-950 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {item.short}
                    </button>
                  ))}
                </div>

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
              </div>
            </div>
          </div>

          {syncError && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 lg:px-6">
              <p className="text-xs text-amber-800">{syncError}</p>
            </div>
          )}

          {backupNotice.message && (
            <div className={`border-t px-4 py-2 lg:px-6 ${
              backupNotice.type === 'error'
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}>
              <p className={`text-xs ${
                backupNotice.type === 'error' ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {backupNotice.message}
              </p>
            </div>
          )}

          {tab === 'nova' && editing && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 lg:px-6">
              <div className="flex items-center justify-between gap-3">
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
          ) : tab === 'entrevistas' ? (
            <InterviewList
              interviews={interviews}
              onEdit={handleEdit}
              onRefresh={refresh}
            />
          ) : (
            <POWorkbench interviews={interviews} />
          )}
        </main>
      </div>
    </div>
  )
}
