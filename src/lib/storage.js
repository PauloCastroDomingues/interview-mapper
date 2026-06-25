const KEY = 'interview_mapper_v1'
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL?.trim()
const BACKUP_APP_ID = 'interview-mapper'
const BACKUP_SCHEMA_VERSION = 2
const EMPTY_WORKSPACE = { discoveries: {} }

function normalizeWorkspace(workspace = {}) {
  const discoveries = workspace?.discoveries && typeof workspace.discoveries === 'object'
    ? workspace.discoveries
    : {}

  return {
    ...EMPTY_WORKSPACE,
    ...workspace,
    discoveries,
  }
}

function load() {
  if (typeof window === 'undefined') return { interviews: [], workspace: EMPTY_WORKSPACE }
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{"interviews":[]}')
    return {
      ...data,
      interviews: Array.isArray(data.interviews) ? data.interviews : [],
      workspace: normalizeWorkspace(data.workspace),
    }
  } catch {
    return { interviews: [], workspace: EMPTY_WORKSPACE }
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      ...data,
      interviews: Array.isArray(data.interviews) ? data.interviews : [],
      workspace: normalizeWorkspace(data.workspace),
    }))
  } catch (err) {
    throw new Error('Não foi possível salvar localmente. Remova alguns prints/imagens e tente de novo.')
  }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `iv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function makeWorkspaceId(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
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

  if (Array.isArray(parsed)) {
    return { interviews: parsed, workspace: EMPTY_WORKSPACE }
  }
  if (Array.isArray(parsed?.interviews)) {
    return {
      interviews: parsed.interviews,
      workspace: normalizeWorkspace(parsed.workspace),
    }
  }

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

function mergeWorkspace(localWorkspace = EMPTY_WORKSPACE, importedWorkspace = EMPTY_WORKSPACE) {
  const local = normalizeWorkspace(localWorkspace)
  const imported = normalizeWorkspace(importedWorkspace)

  return {
    ...local,
    ...imported,
    discoveries: {
      ...local.discoveries,
      ...imported.discoveries,
    },
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

export function getPOWorkspace() {
  return normalizeWorkspace(load().workspace)
}

export function savePOWorkspace(workspace) {
  const data = load()
  data.workspace = normalizeWorkspace(workspace)
  save(data)
  return getPOWorkspace()
}

export function saveDiscoveryWorkspace(discoveryId, patch = {}) {
  const data = load()
  const workspace = normalizeWorkspace(data.workspace)
  const current = workspace.discoveries[discoveryId] || {}
  const now = new Date().toISOString()

  workspace.discoveries[discoveryId] = {
    ...current,
    ...patch,
    id: discoveryId,
    createdAt: current.createdAt || patch.createdAt || now,
    updatedAt: now,
  }

  data.workspace = workspace
  save(data)
  return workspace.discoveries[discoveryId]
}

export function makePOItemId(prefix) {
  return makeWorkspaceId(prefix)
}

export function buildLocalBackupFilename() {
  const date = new Date().toISOString().split('T')[0]
  return `${BACKUP_APP_ID}-backup-${date}.json`
}

export function serializeLocalBackup() {
  const interviews = getInterviews()
  const workspace = getPOWorkspace()
  return JSON.stringify({
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    interviewCount: interviews.length,
    interviews,
    workspace,
  }, null, 2)
}

export function importLocalBackup(content, options = {}) {
  const backup = parseBackupContent(content)
  const imported = backup.interviews
    .map(normalizeImportedInterview)
    .filter(Boolean)

  if (!imported.length) {
    throw new Error('Nenhuma entrevista válida foi encontrada no backup.')
  }

  const data = load()
  const currentInterviews = options.merge === false ? [] : data.interviews || []
  data.interviews = mergeInterviews(currentInterviews, imported)
  data.workspace = options.merge === false
    ? normalizeWorkspace(backup.workspace)
    : mergeWorkspace(data.workspace, backup.workspace)
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
