'use client'
import { useMemo, useState } from 'react'
import {
  getPOWorkspace,
  makePOItemId,
  saveDiscoveryWorkspace,
} from '@/lib/storage'
import { downloadText } from '@/lib/exportUtils'
import {
  ANALYSIS_FIELDS,
  BACKLOG_STATUSES,
  BACKLOG_TYPES,
  DECISION_STATUSES,
  DISCOVERY_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  PRIORITIES,
  buildBacklogCsv,
  buildDiscoveryGroups,
  buildDiscoveryMarkdown,
  calculateDiscoveryMaturity,
  getBacklogScore,
  getDiscoveryEvidence,
} from '@/lib/poUtils'
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Field,
  Metric,
  Panel,
  SelectField,
  Table,
  fieldClass,
  textareaClass,
} from './ui/primitives'

const EMPTY_BACKLOG = {
  title: '',
  type: 'História',
  priority: 'Média',
  impact: 'Médio',
  effort: 'Médio',
  status: 'Ideia',
  evidence: '',
  criteria: '',
}

const EMPTY_FLOW = {
  name: '',
  actor: '',
  system: '',
  input: '',
  action: '',
  output: '',
  problem: '',
  tobe: '',
}

const EMPTY_DECISION = {
  title: '',
  owner: '',
  dueDate: '',
  status: 'Pendente',
  impact: '',
  evidence: '',
}

const PO_TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'analysis', label: 'Análise' },
  { id: 'map', label: 'AS-IS / TO-BE' },
  { id: 'decisions', label: 'Decisões' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'evidence', label: 'Evidências' },
]

function slugPart(value = 'discovery') {
  return String(value || 'discovery')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'discovery'
}

function includesText(values, query) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some(value => String(value || '').toLowerCase().includes(normalized))
}

function statusTone(value = '') {
  if (['Pronto', 'Pronto para backlog', 'Decidida'].includes(value)) return 'green'
  if (['Pendente', 'Em análise', 'Em validação', 'Validando', 'Refinar', 'Validar'].includes(value)) return 'amber'
  if (['Bloqueada', 'Descartado'].includes(value)) return 'red'
  return 'gray'
}

function getEmptyItem(type) {
  if (type === 'flow') return EMPTY_FLOW
  if (type === 'decision') return EMPTY_DECISION
  return EMPTY_BACKLOG
}

function Toolbar({ children }) {
  return (
    <div className="flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      {children}
    </div>
  )
}

export default function POWorkbench({ interviews = [] }) {
  const [workspace, setWorkspace] = useState(() => getPOWorkspace())
  const [activeId, setActiveId] = useState('')
  const [poTab, setPoTab] = useState('overview')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [backlogStatus, setBacklogStatus] = useState('Todos')
  const [backlogPriority, setBacklogPriority] = useState('Todas')
  const [decisionStatus, setDecisionStatus] = useState('Todos')
  const [readMode, setReadMode] = useState(false)
  const [drawer, setDrawer] = useState({ type: '', mode: '', item: null })

  const groups = useMemo(() => buildDiscoveryGroups(interviews, workspace), [interviews, workspace])
  const active = groups.find(group => group.id === activeId) || groups[0]
  const discovery = active?.discovery
  const analysis = discovery?.analysis || {}
  const backlog = useMemo(() => discovery?.backlog || [], [discovery?.backlog])
  const flowSteps = useMemo(() => discovery?.flowSteps || [], [discovery?.flowSteps])
  const decisions = useMemo(() => discovery?.decisions || [], [discovery?.decisions])
  const evidence = useMemo(() => getDiscoveryEvidence(active?.interviews || []), [active])
  const maturity = useMemo(() => calculateDiscoveryMaturity(active), [active])
  const selectedId = active?.id || ''

  const orderedBacklog = useMemo(() => (
    [...backlog].sort((a, b) => getBacklogScore(b) - getBacklogScore(a))
  ), [backlog])

  const filteredBacklog = orderedBacklog.filter(item => (
    (backlogStatus === 'Todos' || item.status === backlogStatus)
    && (backlogPriority === 'Todas' || item.priority === backlogPriority)
    && includesText([item.title, item.type, item.status, item.evidence, item.criteria], query)
  ))

  const filteredDecisions = decisions.filter(item => (
    (decisionStatus === 'Todos' || item.status === decisionStatus)
    && includesText([item.title, item.owner, item.status, item.impact, item.evidence], query)
  ))

  const filteredFlow = flowSteps.filter(item => (
    includesText([item.name, item.actor, item.system, item.input, item.action, item.output, item.problem, item.tobe], query)
  ))

  const filteredEvidence = evidence.filter(row => (
    includesText([row.section, row.interviewTitle, row.question, row.answer], query)
  ))

  function refreshWorkspace() {
    setWorkspace(getPOWorkspace())
  }

  function patchDiscovery(patch) {
    if (!active) return
    saveDiscoveryWorkspace(active.id, patch)
    refreshWorkspace()
  }

  function patchAnalysis(field, value) {
    patchDiscovery({
      analysis: {
        ...analysis,
        [field]: value,
      },
    })
  }

  function openDrawer(type, mode, item = null) {
    setDrawer({
      type,
      mode,
      item: item ? { ...item } : { ...getEmptyItem(type) },
    })
  }

  function closeDrawer() {
    setDrawer({ type: '', mode: '', item: null })
  }

  function updateDrawer(patch) {
    setDrawer(prev => ({
      ...prev,
      item: {
        ...(prev.item || {}),
        ...patch,
      },
    }))
  }

  function saveDrawer() {
    if (!drawer.item || !drawer.type) return

    const now = new Date().toISOString()
    if (drawer.type === 'flow') {
      const item = {
        ...drawer.item,
        name: drawer.item.name?.trim() || '',
        updatedAt: now,
      }
      if (!item.name) {
        setNotice('Digite o nome da etapa do fluxo.')
        return
      }
      patchDiscovery({
        flowSteps: drawer.mode === 'create'
          ? [...flowSteps, { ...item, id: makePOItemId('flow'), createdAt: now }]
          : flowSteps.map(step => step.id === item.id ? item : step),
      })
      setNotice(drawer.mode === 'create' ? 'Etapa adicionada.' : 'Etapa atualizada.')
    }

    if (drawer.type === 'decision') {
      const item = {
        ...drawer.item,
        title: drawer.item.title?.trim() || '',
        updatedAt: now,
      }
      if (!item.title) {
        setNotice('Digite a decisão ou pendência.')
        return
      }
      patchDiscovery({
        decisions: drawer.mode === 'create'
          ? [...decisions, { ...item, id: makePOItemId('decision'), createdAt: now }]
          : decisions.map(decision => decision.id === item.id ? item : decision),
      })
      setNotice(drawer.mode === 'create' ? 'Decisão adicionada.' : 'Decisão atualizada.')
    }

    if (drawer.type === 'backlog') {
      const item = {
        ...drawer.item,
        title: drawer.item.title?.trim() || '',
        updatedAt: now,
      }
      if (!item.title) {
        setNotice('Digite um título para o item de backlog.')
        return
      }
      patchDiscovery({
        backlog: drawer.mode === 'create'
          ? [...backlog, { ...item, id: makePOItemId('backlog'), createdAt: now }]
          : backlog.map(backlogItem => backlogItem.id === item.id ? item : backlogItem),
      })
      setNotice(drawer.mode === 'create' ? 'Item adicionado ao backlog.' : 'Item atualizado.')
    }

    closeDrawer()
  }

  function removeItem(type, itemId) {
    if (type === 'flow') patchDiscovery({ flowSteps: flowSteps.filter(item => item.id !== itemId) })
    if (type === 'decision') patchDiscovery({ decisions: decisions.filter(item => item.id !== itemId) })
    if (type === 'backlog') patchDiscovery({ backlog: backlog.filter(item => item.id !== itemId) })
    setNotice('Item removido.')
  }

  function exportMarkdown() {
    if (!active) return
    downloadText(`discovery-${slugPart(discovery.title)}.md`, buildDiscoveryMarkdown(active))
    setNotice('Documento Markdown exportado.')
  }

  function exportCsv() {
    if (!active) return
    downloadText(`backlog-${slugPart(discovery.title)}.csv`, buildBacklogCsv(backlog))
    setNotice('Backlog CSV exportado.')
  }

  if (!groups.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">PO Workspace</p>
        <p className="mt-3 text-lg font-semibold text-gray-900">Nenhuma entrevista salva ainda.</p>
        <p className="mt-1 text-sm text-gray-500">Salve uma entrevista para iniciar a análise de produto.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-5 lg:px-6">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">PO Workspace</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-950">{discovery.title}</h1>
            <Badge tone={statusTone(discovery.status)}>{discovery.status || 'Coletando'}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReadMode(prev => !prev)} tone={readMode ? 'primary' : 'secondary'}>
            {readMode ? 'Editar' : 'Modo leitura'}
          </Button>
          <Button onClick={exportMarkdown}>Exportar discovery</Button>
          <Button onClick={exportCsv}>Exportar backlog</Button>
        </div>
      </div>

      {notice && (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Panel title="Processos">
            <div className="space-y-1 p-2">
              {groups.map(group => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => setActiveId(group.id)}
                  className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                    selectedId === group.id
                      ? 'bg-gray-950 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">{group.discovery.title}</span>
                  <span className={`mt-0.5 block text-[11px] ${
                    selectedId === group.id ? 'text-white/70' : 'text-gray-400'
                  }`}>
                    {group.stats.interviewCount} entrevista{group.stats.interviewCount !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Filtros">
            <div className="grid gap-3 p-3">
              <Field label="Busca">
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  className={fieldClass}
                  placeholder="Buscar no workspace"
                />
              </Field>
              {poTab === 'backlog' && (
                <>
                  <SelectField label="Status" value={backlogStatus} options={['Todos', ...BACKLOG_STATUSES]} onChange={setBacklogStatus} />
                  <SelectField label="Prioridade" value={backlogPriority} options={['Todas', ...PRIORITIES]} onChange={setBacklogPriority} />
                </>
              )}
              {poTab === 'decisions' && (
                <SelectField label="Status" value={decisionStatus} options={['Todos', ...DECISION_STATUSES]} onChange={setDecisionStatus} />
              )}
            </div>
          </Panel>
        </aside>

        <div className="space-y-4">
          <Panel>
            <div className="grid gap-1 p-2 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Áreas do workspace PO">
              {PO_TABS.map(item => {
                const activeTab = poTab === item.id
                return (
                  <button
                    type="button"
                    key={item.id}
                    role="tab"
                    aria-selected={activeTab}
                    onClick={() => setPoTab(item.id)}
                    className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      activeTab
                        ? 'bg-gray-950 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </Panel>

          {poTab === 'overview' && (
            <>
              <Panel title="Contexto do discovery">
                <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <Field label="Processo">
                    <input
                      value={discovery.title || ''}
                      onChange={event => patchDiscovery({ title: event.target.value })}
                      disabled={readMode}
                      className={fieldClass}
                    />
                  </Field>
                  <SelectField
                    label="Status"
                    value={discovery.status || 'Coletando'}
                    options={DISCOVERY_STATUSES}
                    onChange={value => patchDiscovery({ status: value })}
                  />
                  <Field label="PO responsável">
                    <input
                      value={discovery.owner || ''}
                      onChange={event => patchDiscovery({ owner: event.target.value })}
                      disabled={readMode}
                      className={fieldClass}
                    />
                  </Field>
                  <Field label="Objetivo do discovery">
                    <input
                      value={discovery.objective || ''}
                      onChange={event => patchDiscovery({ objective: event.target.value })}
                      disabled={readMode}
                      className={fieldClass}
                    />
                  </Field>
                  <Field label="Sistemas">
                    <input
                      value={discovery.systems || ''}
                      onChange={event => patchDiscovery({ systems: event.target.value })}
                      disabled={readMode}
                      className={fieldClass}
                    />
                  </Field>
                </div>
              </Panel>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <Metric label="Entrevistas" value={active.stats.interviewCount} />
                <Metric label="Progresso" value={`${active.stats.completion}%`} />
                <Metric label="Respostas" value={`${active.stats.answeredQuestions}/${active.stats.totalQuestions || 0}`} />
                <Metric label="Evidências" value={active.stats.images} />
                <Metric label="Backlog" value={backlog.length} />
                <Metric label="Maturidade" value={`${maturity.score}%`} />
              </section>

              <Panel title="Prontidão para desenvolvimento">
                <div className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{maturity.score}% de maturidade</p>
                      <p className="mt-0.5 text-xs text-gray-500">{maturity.completed}/{maturity.total} critérios completos</p>
                    </div>
                    <Badge tone={maturity.score >= 80 ? 'green' : maturity.score >= 55 ? 'amber' : 'gray'}>
                      {maturity.score >= 80 ? 'Próximo de dev' : maturity.score >= 55 ? 'Em refinamento' : 'Em descoberta'}
                    </Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${maturity.score >= 80 ? 'bg-emerald-500' : maturity.score >= 55 ? 'bg-amber-500' : 'bg-sky-500'}`}
                      style={{ width: `${maturity.score}%` }}
                    />
                  </div>
                  {maturity.missing.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {maturity.missing.slice(0, 8).map(item => (
                        <Badge key={item} tone="amber">{item}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            </>
          )}

          {poTab === 'analysis' && (
            <Panel title="Análise PO">
              <div className="grid gap-0">
                {ANALYSIS_FIELDS.map(([label, field]) => (
                  <div key={field} className="grid border-b border-gray-100 last:border-b-0 lg:grid-cols-[220px_1fr]">
                    <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3 text-xs font-semibold text-gray-600 lg:border-b-0 lg:border-r">
                      {label}
                    </div>
                    <textarea
                      value={analysis[field] || ''}
                      onChange={event => patchAnalysis(field, event.target.value)}
                      disabled={readMode}
                      className="min-h-28 resize-y bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:bg-sky-50/30 disabled:bg-gray-50"
                      placeholder={`Registre ${label.toLowerCase()}.`}
                    />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {poTab === 'map' && (
            <Panel
              title="Mapa AS-IS / TO-BE"
              actions={!readMode && <Button tone="primary" onClick={() => openDrawer('flow', 'create')}>Nova etapa</Button>}
            >
              {filteredFlow.length > 0 ? (
                <Table columns={['Etapa', 'Ator', 'Sistema', 'Problema', 'TO-BE', '']}>
                  {filteredFlow.map(step => (
                    <tr key={step.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-900">
                        <button type="button" onClick={() => openDrawer('flow', 'edit', step)} className="text-left hover:text-sky-700">
                          {step.name || 'Etapa sem nome'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{step.actor || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{step.system || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{step.problem || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{step.tobe || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        {!readMode && <Button tone="ghost" onClick={() => removeItem('flow', step.id)}>Excluir</Button>}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <EmptyState
                  title="Nenhuma etapa mapeada"
                  description="Estruture o fluxo atual e a proposta futura por etapa."
                  action={!readMode && <Button tone="primary" onClick={() => openDrawer('flow', 'create')}>Adicionar etapa</Button>}
                />
              )}
            </Panel>
          )}

          {poTab === 'decisions' && (
            <Panel
              title="Decisões e pendências"
              actions={!readMode && <Button tone="primary" onClick={() => openDrawer('decision', 'create')}>Nova decisão</Button>}
            >
              {filteredDecisions.length > 0 ? (
                <Table columns={['Decisão', 'Dono', 'Prazo', 'Status', 'Impacto', '']}>
                  {filteredDecisions.map(decision => (
                    <tr key={decision.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-900">
                        <button type="button" onClick={() => openDrawer('decision', 'edit', decision)} className="text-left hover:text-sky-700">
                          {decision.title || 'Decisão sem título'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{decision.owner || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{decision.dueDate || '-'}</td>
                      <td className="px-3 py-2"><Badge tone={statusTone(decision.status)}>{decision.status || 'Pendente'}</Badge></td>
                      <td className="px-3 py-2 text-gray-600">{decision.impact || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        {!readMode && <Button tone="ghost" onClick={() => removeItem('decision', decision.id)}>Excluir</Button>}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <EmptyState
                  title="Nenhuma decisão registrada"
                  description="Use decisões para controlar pendências que bloqueiam refinamento ou desenvolvimento."
                  action={!readMode && <Button tone="primary" onClick={() => openDrawer('decision', 'create')}>Adicionar decisão</Button>}
                />
              )}
            </Panel>
          )}

          {poTab === 'backlog' && (
            <Panel
              title="Backlog estruturado"
              actions={!readMode && <Button tone="primary" onClick={() => openDrawer('backlog', 'create')}>Novo item</Button>}
            >
              {filteredBacklog.length > 0 ? (
                <Table columns={['Item', 'Tipo', 'Prioridade', 'Impacto', 'Esforço', 'Score', 'Status', '']}>
                  {filteredBacklog.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-900">
                        <button type="button" onClick={() => openDrawer('backlog', 'edit', item)} className="text-left hover:text-sky-700">
                          {item.title || 'Item sem título'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.type || '-'}</td>
                      <td className="px-3 py-2"><Badge tone={item.priority === 'Alta' ? 'red' : item.priority === 'Média' ? 'amber' : 'gray'}>{item.priority || '-'}</Badge></td>
                      <td className="px-3 py-2 text-gray-600">{item.impact || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{item.effort || '-'}</td>
                      <td className="px-3 py-2 text-gray-900">{getBacklogScore(item)}</td>
                      <td className="px-3 py-2"><Badge tone={statusTone(item.status)}>{item.status || 'Ideia'}</Badge></td>
                      <td className="px-3 py-2 text-right">
                        {!readMode && <Button tone="ghost" onClick={() => removeItem('backlog', item.id)}>Excluir</Button>}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <EmptyState
                  title="Nenhum item no backlog"
                  description="Transforme dores e oportunidades em itens priorizados."
                  action={!readMode && <Button tone="primary" onClick={() => openDrawer('backlog', 'create')}>Adicionar item</Button>}
                />
              )}
            </Panel>
          )}

          {poTab === 'evidence' && (
            <Panel title="Evidências vinculadas">
              {filteredEvidence.length > 0 ? (
                <Table columns={['Seção', 'Entrevista', 'Pergunta', 'Resposta', 'Prints']}>
                  {filteredEvidence.slice(0, 50).map((row, index) => (
                    <tr key={`${row.interviewId}-${row.sectionId}-${index}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><Badge>{row.section}</Badge></td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.interviewTitle}</td>
                      <td className="max-w-xs px-3 py-2 text-gray-600">{row.question}</td>
                      <td className="max-w-sm px-3 py-2 text-gray-500">{row.answer || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{row.imageCount || '-'}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <EmptyState title="Nenhuma evidência encontrada" description="As respostas das entrevistas aparecerão aqui para rastreabilidade." />
              )}
            </Panel>
          )}
        </div>
      </div>

      <Drawer
        open={Boolean(drawer.type)}
        title={drawer.mode === 'create' ? 'Novo item' : 'Editar item'}
        onClose={closeDrawer}
        footer={!readMode && (
          <div className="flex justify-end gap-2">
            <Button tone="ghost" onClick={closeDrawer}>Cancelar</Button>
            <Button tone="primary" onClick={saveDrawer}>Salvar</Button>
          </div>
        )}
      >
        {drawer.type === 'flow' && (
          <div className="grid gap-3">
            <Field label="Etapa"><input value={drawer.item?.name || ''} onChange={event => updateDrawer({ name: event.target.value })} className={fieldClass} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ator"><input value={drawer.item?.actor || ''} onChange={event => updateDrawer({ actor: event.target.value })} className={fieldClass} /></Field>
              <Field label="Sistema"><input value={drawer.item?.system || ''} onChange={event => updateDrawer({ system: event.target.value })} className={fieldClass} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Entrada"><input value={drawer.item?.input || ''} onChange={event => updateDrawer({ input: event.target.value })} className={fieldClass} /></Field>
              <Field label="Saída"><input value={drawer.item?.output || ''} onChange={event => updateDrawer({ output: event.target.value })} className={fieldClass} /></Field>
            </div>
            <Field label="Ação AS-IS"><textarea value={drawer.item?.action || ''} onChange={event => updateDrawer({ action: event.target.value })} className={textareaClass} /></Field>
            <Field label="Problema"><textarea value={drawer.item?.problem || ''} onChange={event => updateDrawer({ problem: event.target.value })} className={textareaClass} /></Field>
            <Field label="Proposta TO-BE"><textarea value={drawer.item?.tobe || ''} onChange={event => updateDrawer({ tobe: event.target.value })} className={textareaClass} /></Field>
          </div>
        )}

        {drawer.type === 'decision' && (
          <div className="grid gap-3">
            <Field label="Decisão ou pendência"><input value={drawer.item?.title || ''} onChange={event => updateDrawer({ title: event.target.value })} className={fieldClass} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dono"><input value={drawer.item?.owner || ''} onChange={event => updateDrawer({ owner: event.target.value })} className={fieldClass} /></Field>
              <Field label="Prazo"><input type="date" value={drawer.item?.dueDate || ''} onChange={event => updateDrawer({ dueDate: event.target.value })} className={fieldClass} /></Field>
            </div>
            <SelectField label="Status" value={drawer.item?.status || 'Pendente'} options={DECISION_STATUSES} onChange={value => updateDrawer({ status: value })} />
            <Field label="Impacto se não decidir"><textarea value={drawer.item?.impact || ''} onChange={event => updateDrawer({ impact: event.target.value })} className={textareaClass} /></Field>
            <Field label="Contexto/evidência"><textarea value={drawer.item?.evidence || ''} onChange={event => updateDrawer({ evidence: event.target.value })} className={textareaClass} /></Field>
          </div>
        )}

        {drawer.type === 'backlog' && (
          <div className="grid gap-3">
            <Field label="Título"><input value={drawer.item?.title || ''} onChange={event => updateDrawer({ title: event.target.value })} className={fieldClass} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Tipo" value={drawer.item?.type || 'História'} options={BACKLOG_TYPES} onChange={value => updateDrawer({ type: value })} />
              <SelectField label="Status" value={drawer.item?.status || 'Ideia'} options={BACKLOG_STATUSES} onChange={value => updateDrawer({ status: value })} />
              <SelectField label="Prioridade" value={drawer.item?.priority || 'Média'} options={PRIORITIES} onChange={value => updateDrawer({ priority: value })} />
              <SelectField label="Impacto" value={drawer.item?.impact || 'Médio'} options={IMPACT_LEVELS} onChange={value => updateDrawer({ impact: value })} />
              <SelectField label="Esforço" value={drawer.item?.effort || 'Médio'} options={EFFORT_LEVELS} onChange={value => updateDrawer({ effort: value })} />
            </div>
            <Field label="Evidência"><textarea value={drawer.item?.evidence || ''} onChange={event => updateDrawer({ evidence: event.target.value })} className={textareaClass} /></Field>
            <Field label="Critérios de aceite"><textarea value={drawer.item?.criteria || ''} onChange={event => updateDrawer({ criteria: event.target.value })} className={textareaClass} /></Field>
          </div>
        )}
      </Drawer>
    </div>
  )
}
