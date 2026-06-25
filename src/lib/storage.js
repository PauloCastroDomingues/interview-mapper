const KEY = 'interview_mapper_v1'
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL?.trim()
const BACKUP_APP_ID = 'interview-mapper'
const BACKUP_SCHEMA_VERSION = 1

function load() {
  if (typeof window === 'undefined') return { interviews: [] }
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"interviews":[]}')
  } catch {
    return { interviews: [] }
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (err) {
    throw new Error('Não foi possível salvar localmente. Remova alguns prints/imagens e tente de novo.')
  }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `iv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function sortInterviews(interviews = []) {
  return [...interviews].sort((a, b) => {
    const da = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const db = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return db - da
  })
}

function stripImagesForRemote(interview) {
  const answers = Object.fromEntries(
    Object.entries(interview.answers || {}).map(([key, answer]) => {
      const images = (answer?.images || []).map(img => ({
        name: img.name,
        caption: img.caption || '',
        remoteNote: 'Imagem mantida apenas no navegador local',
      }))
      return [key, { ...answer, images }]
    })
  )

  return {
    ...interview,
    answers,
    remoteSync: {
      mode: 'google-sheets-free',
      imagePolicy: 'image_names_only',
      syncedAt: new Date().toISOString(),
    },
  }
}

function mergeInterviews(localInterviews = [], remoteInterviews = []) {
  const byId = new Map()

  sortInterviews(remoteInterviews).forEach(interview => {
    if (interview?.id) byId.set(interview.id, interview)
  })

  sortInterviews(localInterviews).forEach(interview => {
    if (!interview?.id) return
    const current = byId.get(interview.id)
    const currentTime = new Date(current?.updatedAt || current?.createdAt || 0).getTime()
    const localTime = new Date(interview.updatedAt || interview.createdAt || 0).getTime()

    if (!current || localTime >= currentTime) {
      byId.set(interview.id, interview)
    }
  })

  return sortInterviews([...byId.values()])
}

function parseBackupContent(content) {
  let parsed

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('Arquivo de backup inválido. Escolha um JSON exportado pelo Interview Mapper.')
  }

  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed?.interviews)) return parsed.interviews

  throw new Error('Backup sem entrevistas encontradas.')
}

function normalizeImportedInterview(interview) {
  if (!interview || typeof interview !== 'object' || Array.isArray(interview)) return null

  const now = new Date().toISOString()
  return {
    ...interview,
    id: interview.id || makeId(),
    createdAt: interview.createdAt || interview.updatedAt || now,
    updatedAt: interview.updatedAt || interview.createdAt || now,
  }
}

async function postToRemote(payload) {
  if (!isRemoteSyncEnabled()) return { ok: true, skipped: true }

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Falha no sync com Google Sheets')
  return json
}

export function isRemoteSyncEnabled() {
  return Boolean(GAS_URL)
}

export function getInterviews() {
  return sortInterviews(load().interviews || [])
}

export function getInterview(id) {
  return getInterviews().find(i => i.id === id) || null
}

export function buildLocalBackupFilename() {
  const date = new Date().toISOString().split('T')[0]
  return `${BACKUP_APP_ID}-backup-${date}.json`
}

export function serializeLocalBackup() {
  const interviews = getInterviews()
  return JSON.stringify({
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    interviewCount: interviews.length,
    interviews,
  }, null, 2)
}

export function importLocalBackup(content, options = {}) {
  const imported = parseBackupContent(content)
    .map(normalizeImportedInterview)
    .filter(Boolean)

  if (!imported.length) {
    throw new Error('Nenhuma entrevista válida foi encontrada no backup.')
  }

  const data = load()
  const currentInterviews = options.merge === false ? [] : data.interviews || []
  data.interviews = mergeInterviews(currentInterviews, imported)
  save(data)

  return {
    interviews: getInterviews(),
    importedCount: imported.length,
    totalCount: data.interviews.length,
  }
}

export async function saveInterview(interview, options = {}) {
  const syncRemote = options.syncRemote !== false
  const data = load()
  const now  = new Date().toISOString()
  const idx  = data.interviews.findIndex(i => i.id === interview.id)
  let savedInterview

  if (idx >= 0) {
    savedInterview = { ...interview, updatedAt: now }
    data.interviews[idx] = savedInterview
  } else {
    savedInterview = {
      ...interview,
      id: makeId(),
      createdAt: now,
      updatedAt: now,
    }
    data.interviews.unshift(savedInterview)
  }
  data.interviews = sortInterviews(data.interviews)
  save(data)

  let remoteError = ''
  if (syncRemote) {
    try {
      await postToRemote({
        action: 'save',
        interview: stripImagesForRemote(savedInterview),
      })
    } catch (err) {
      remoteError = err.message || 'Falha no sync com Google Sheets'
    }
  }

  return { interviews: data.interviews, savedInterview, remoteError }
}

export async function deleteInterview(id) {
  const data = load()
  data.interviews = data.interviews.filter(i => i.id !== id)
  save(data)

  let remoteError = ''
  try {
    await postToRemote({ action: 'delete', id })
  } catch (err) {
    remoteError = err.message || 'Falha no sync com Google Sheets'
  }

  return { interviews: data.interviews, remoteError }
}

export async function syncInterviewsFromRemote() {
  if (!isRemoteSyncEnabled()) return getInterviews()

  const res = await fetch(GAS_URL)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Falha ao carregar Google Sheets')

  const data = load()
  data.interviews = mergeInterviews(data.interviews || [], json.interviews || [])
  save(data)
  return getInterviews()
}

export function countAnswered(answers) {
  return Object.values(answers || {}).filter(a => a?.text?.trim() || a?.images?.length > 0).length
}
