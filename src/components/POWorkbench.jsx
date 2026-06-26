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

const EMPTY_BACKLOG_DRAFT = {
  title: '',
  type: 'História',
  priority: 'Média',
  impact: 'Médio',
  effort: 'Médio',
  status: 'Ideia',
  evidence: '',
  criteria: '',
}

const EMPTY_FLOW_DRAFT = {
  name: '',
  actor: '',
  system: '',
  input: '',
  action: '',
  output: '',
  problem: '',
  tobe: '',
}

const EMPTY_DECISION_DRAFT = {
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

const FIELD_CLASS = 'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
const TEXTAREA_CLASS = 'min-h-20 resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'

function slugPart(value = 'discovery') {
  return String(value || 'discovery')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'discovery'
}

function SectionPanel({ title, children, actions }) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</p>
        {actions}
      </div>
      {children}
    </section>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-950">{value}</p>
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-gray-500">{children}</p>
  )
}

function StatusBadge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'border-gray-200 bg-gray-50 text-gray-600',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-100 bg-red-50 text-red-600',
    dark: 'border-gray-900 bg-gray-950 text-white',
  }

  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  )
}

function FieldSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className={FIELD_CLASS}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

export default function POWorkbench({ interviews = [] }) {
  const [workspace, setWorkspace] = useState(() => getPOWorkspace())
  const groups = useMemo(() => buildDiscoveryGroups(interviews, workspace), [interviews, workspace])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState(EMPTY_BACKLOG_DRAFT)
  const [flowDraft, setFlowDraft] = useState(EMPTY_FLOW_DRAFT)
  const [decisionDraft, setDecisionDraft] = useState(EMPTY_DECISION_DRAFT)
  const [poTab, setPoTab] = useState('overview')
  const [notice, setNotice] = useState('')

  const active = groups.find(group => group.id === activeId) || groups[0]
  const discovery = active?.discovery
  const analysis = discovery?.analysis || {}
  const backlog = useMemo(() => discovery?.backlog || [], [discovery?.backlog])
  const flowSteps = useMemo(() => discovery?.flowSteps || [], [discovery?.flowSteps])
  const decisions = useMemo(() => discovery?.decisions || [], [discovery?.decisions])
  const evidence = useMemo(() => getDiscoveryEvidence(active?.interviews || []), [active])
  const orderedBacklog = useMemo(() => (
    [...backlog].sort((a, b) => getBacklogScore(b) - getBacklogScore(a))
  ), [backlog])
  const maturity = useMemo(() => calculateDiscoveryMaturity(active), [active])
  const selectedId = active?.id || ''

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

  function addBacklogItem() {
    if (!draft.title.trim()) {
      setNotice('Digite um título para o item de backlog.')
      return
    }

    const item = {
      ...draft,
      id: makePOItemId('backlog'),
      title: draft.title.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    patchDiscovery({ backlog: [...backlog, item] })
    setDraft(EMPTY_BACKLOG_DRAFT)
    setNotice('Item adicionado ao backlog.')
  }

  function updateBacklogItem(itemId, patch) {
    patchDiscovery({
      backlog: backlog.map(item => (
        item.id === itemId
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item
      )),
    })
  }

  function removeBacklogItem(itemId) {
    patchDiscovery({ backlog: backlog.filter(item => item.id !== itemId) })
    setNotice('Item removido do backlog.')
  }

  function addFlowStep() {
    if (!flowDraft.name.trim()) {
      setNotice('Digite o nome da etapa do fluxo.')
      return
    }

    patchDiscovery({
      flowSteps: [
        ...flowSteps,
        {
          ...flowDraft,
          id: makePOItemId('flow'),
          name: flowDraft.name.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })
    setFlowDraft(EMPTY_FLOW_DRAFT)
    setNotice('Etapa adicionada ao mapa AS-IS/TO-BE.')
  }

  function updateFlowStep(stepId, patch) {
    patchDiscovery({
      flowSteps: flowSteps.map(step => (
        step.id === stepId
          ? { ...step, ...patch, updatedAt: new Date().toISOString() }
          : step
      )),
    })
  }

  function removeFlowStep(stepId) {
    patchDiscovery({ flowSteps: flowSteps.filter(step => step.id !== stepId) })
    setNotice('Etapa removida do mapa.')
  }

  function addDecision() {
    if (!decisionDraft.title.trim()) {
      setNotice('Digite a decisão ou pendência.')
      return
    }

    patchDiscovery({
      decisions: [
        ...decisions,
        {
          ...decisionDraft,
          id: makePOItemId('decision'),
          title: decisionDraft.title.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })
    setDecisionDraft(EMPTY_DECISION_DRAFT)
    setNotice('Decisão adicionada.')
  }

  function updateDecision(decisionId, patch) {
    patchDiscovery({
      decisions: decisions.map(decision => (
        decision.id === decisionId
          ? { ...decision, ...patch, updatedAt: new Date().toISOString() }
          : decision
      )),
    })
  }

  function removeDecision(decisionId) {
    patchDiscovery({ decisions: decisions.filter(decision => decision.id !== decisionId) })
    setNotice('Decisão removida.')
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
    <div className="mx-auto max-w-[1440px] px-4 py-5 lg:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">PO Workspace</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-950">{discovery.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportMarkdown}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
          >
            Exportar discovery
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:text-sky-700"
          >
            Exportar backlog
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Processos</p>
            <div className="space-y-1">
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
          </section>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-2">
            <div className="grid gap-1 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Áreas do workspace PO">
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
          </section>

          {poTab === 'overview' && (
            <>
              <SectionPanel title="Contexto do discovery">
                <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Processo</span>
                    <input
                      value={discovery.title || ''}
                      onChange={event => patchDiscovery({ title: event.target.value })}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <FieldSelect
                    label="Status"
                    value={discovery.status || 'Coletando'}
                    options={DISCOVERY_STATUSES}
                    onChange={value => patchDiscovery({ status: value })}
                  />
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">PO responsável</span>
                    <input
                      value={discovery.owner || ''}
                      onChange={event => patchDiscovery({ owner: event.target.value })}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <label className="grid gap-1 lg:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Objetivo do discovery</span>
                    <input
                      value={discovery.objective || ''}
                      onChange={event => patchDiscovery({ objective: event.target.value })}
                      className={FIELD_CLASS}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sistemas</span>
                    <input
                      value={discovery.systems || ''}
                      onChange={event => patchDiscovery({ systems: event.target.value })}
                      className={FIELD_CLASS}
                    />
                  </label>
                </div>
              </SectionPanel>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {[
                  ['Entrevistas', active.stats.interviewCount],
                  ['Progresso', `${active.stats.completion}%`],
                  ['Respostas', `${active.stats.answeredQuestions}/${active.stats.totalQuestions || 0}`],
                  ['Evidências', active.stats.images],
                  ['Backlog', backlog.length],
                  ['Maturidade', `${maturity.score}%`],
                ].map(([label, value]) => (
                  <MetricCard key={label} label={label} value={value} />
                ))}
              </section>

              <SectionPanel title="Prontidão para desenvolvimento">
                <div className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{maturity.score}% de maturidade</p>
                      <p className="mt-0.5 text-xs text-gray-500">{maturity.completed}/{maturity.total} critérios completos</p>
                    </div>
                    <StatusBadge tone={maturity.score >= 80 ? 'green' : maturity.score >= 55 ? 'amber' : 'gray'}>
                      {maturity.score >= 80 ? 'Próximo de dev' : maturity.score >= 55 ? 'Em refinamento' : 'Em descoberta'}
                    </StatusBadge>
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
                        <StatusBadge key={item} tone="amber">{item}</StatusBadge>
                      ))}
                    </div>
                  )}
                </div>
              </SectionPanel>
            </>
          )}

          {poTab === 'analysis' && (
            <SectionPanel title="Análise PO">
              <div className="grid gap-0">
                {ANALYSIS_FIELDS.map(([label, field]) => (
                  <div key={field} className="grid border-b border-gray-100 last:border-b-0 lg:grid-cols-[220px_1fr]">
                    <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3 text-xs font-semibold text-gray-600 lg:border-b-0 lg:border-r">
                      {label}
                    </div>
                    <textarea
                      value={analysis[field] || ''}
                      onChange={event => patchAnalysis(field, event.target.value)}
                      className="min-h-28 resize-y bg-white px-3 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:bg-sky-50/30"
                      placeholder={`Registre ${label.toLowerCase()}.`}
                    />
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}

          {poTab === 'map' && (
            <SectionPanel title="Mapa AS-IS / TO-BE">
            <div className="grid gap-3 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px]">
                <input
                  value={flowDraft.name}
                  onChange={event => setFlowDraft(prev => ({ ...prev, name: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Etapa"
                />
                <input
                  value={flowDraft.actor}
                  onChange={event => setFlowDraft(prev => ({ ...prev, actor: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Ator"
                />
                <input
                  value={flowDraft.system}
                  onChange={event => setFlowDraft(prev => ({ ...prev, system: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Sistema"
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <textarea
                  value={flowDraft.action}
                  onChange={event => setFlowDraft(prev => ({ ...prev, action: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="Ação AS-IS"
                />
                <textarea
                  value={flowDraft.tobe}
                  onChange={event => setFlowDraft(prev => ({ ...prev, tobe: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="Proposta TO-BE"
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <input
                  value={flowDraft.input}
                  onChange={event => setFlowDraft(prev => ({ ...prev, input: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Entrada"
                />
                <input
                  value={flowDraft.output}
                  onChange={event => setFlowDraft(prev => ({ ...prev, output: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Saída"
                />
                <input
                  value={flowDraft.problem}
                  onChange={event => setFlowDraft(prev => ({ ...prev, problem: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Problema"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addFlowStep}
                  className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                >
                  Adicionar etapa
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100">
              {flowSteps.length > 0 ? (
                flowSteps.map((step, index) => (
                  <article key={step.id} className="grid gap-3 border-b border-gray-100 p-4 last:border-b-0">
                    <div className="grid gap-3 lg:grid-cols-[56px_minmax(0,1fr)_140px_140px_88px]">
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600">
                        {index + 1}
                      </span>
                      <input
                        value={step.name || ''}
                        onChange={event => updateFlowStep(step.id, { name: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Etapa"
                      />
                      <input
                        value={step.actor || ''}
                        onChange={event => updateFlowStep(step.id, { actor: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Ator"
                      />
                      <input
                        value={step.system || ''}
                        onChange={event => updateFlowStep(step.id, { system: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Sistema"
                      />
                      <button
                        type="button"
                        onClick={() => removeFlowStep(step.id)}
                        className="rounded-md border border-red-100 bg-red-50 px-2 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <textarea
                        value={step.action || ''}
                        onChange={event => updateFlowStep(step.id, { action: event.target.value })}
                        className="min-h-20 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Ação AS-IS"
                      />
                      <textarea
                        value={step.tobe || ''}
                        onChange={event => updateFlowStep(step.id, { tobe: event.target.value })}
                        className="min-h-20 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="TO-BE"
                      />
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <input
                        value={step.input || ''}
                        onChange={event => updateFlowStep(step.id, { input: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Entrada"
                      />
                      <input
                        value={step.output || ''}
                        onChange={event => updateFlowStep(step.id, { output: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Saída"
                      />
                      <input
                        value={step.problem || ''}
                        onChange={event => updateFlowStep(step.id, { problem: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Problema"
                      />
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState>Nenhuma etapa mapeada ainda.</EmptyState>
              )}
            </div>
            </SectionPanel>
          )}

          {poTab === 'decisions' && (
            <SectionPanel title="Decisões e pendências">
            <div className="grid gap-3 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_140px_150px]">
                <input
                  value={decisionDraft.title}
                  onChange={event => setDecisionDraft(prev => ({ ...prev, title: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Decisão ou pendência"
                />
                <input
                  value={decisionDraft.owner}
                  onChange={event => setDecisionDraft(prev => ({ ...prev, owner: event.target.value }))}
                  className={FIELD_CLASS}
                  placeholder="Dono"
                />
                <input
                  type="date"
                  value={decisionDraft.dueDate}
                  onChange={event => setDecisionDraft(prev => ({ ...prev, dueDate: event.target.value }))}
                  className={FIELD_CLASS}
                />
                <FieldSelect
                  label="Status"
                  value={decisionDraft.status}
                  options={DECISION_STATUSES}
                  onChange={value => setDecisionDraft(prev => ({ ...prev, status: value }))}
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <textarea
                  value={decisionDraft.impact}
                  onChange={event => setDecisionDraft(prev => ({ ...prev, impact: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="Impacto se não decidir"
                />
                <textarea
                  value={decisionDraft.evidence}
                  onChange={event => setDecisionDraft(prev => ({ ...prev, evidence: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="Contexto/evidência"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addDecision}
                  className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                >
                  Adicionar decisão
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100">
              {decisions.length > 0 ? (
                decisions.map(decision => (
                  <article key={decision.id} className="grid gap-3 border-b border-gray-100 p-4 last:border-b-0">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_130px_150px_88px]">
                      <input
                        value={decision.title || ''}
                        onChange={event => updateDecision(decision.id, { title: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                      <input
                        value={decision.owner || ''}
                        onChange={event => updateDecision(decision.id, { owner: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Dono"
                      />
                      <input
                        type="date"
                        value={decision.dueDate || ''}
                        onChange={event => updateDecision(decision.id, { dueDate: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                      <FieldSelect
                        label="Status"
                        value={decision.status || 'Pendente'}
                        options={DECISION_STATUSES}
                        onChange={value => updateDecision(decision.id, { status: value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeDecision(decision.id)}
                        className="rounded-md border border-red-100 bg-red-50 px-2 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <textarea
                        value={decision.impact || ''}
                        onChange={event => updateDecision(decision.id, { impact: event.target.value })}
                        className="min-h-20 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Impacto"
                      />
                      <textarea
                        value={decision.evidence || ''}
                        onChange={event => updateDecision(decision.id, { evidence: event.target.value })}
                        className="min-h-20 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Evidência"
                      />
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState>Nenhuma decisão registrada ainda.</EmptyState>
              )}
            </div>
            </SectionPanel>
          )}

          {poTab === 'backlog' && (
            <SectionPanel title="Backlog estruturado">
            <div className="grid gap-3 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_120px_120px_120px]">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Título</span>
                  <input
                    value={draft.title}
                    onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="Ex: Automatizar validação de cadastro"
                  />
                </label>
                <FieldSelect label="Tipo" value={draft.type} options={BACKLOG_TYPES} onChange={value => setDraft(prev => ({ ...prev, type: value }))} />
                <FieldSelect label="Prioridade" value={draft.priority} options={PRIORITIES} onChange={value => setDraft(prev => ({ ...prev, priority: value }))} />
                <FieldSelect label="Impacto" value={draft.impact} options={IMPACT_LEVELS} onChange={value => setDraft(prev => ({ ...prev, impact: value }))} />
                <FieldSelect label="Esforço" value={draft.effort} options={EFFORT_LEVELS} onChange={value => setDraft(prev => ({ ...prev, effort: value }))} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <textarea
                  value={draft.evidence}
                  onChange={event => setDraft(prev => ({ ...prev, evidence: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="Origem/evidência"
                />
                <textarea
                  value={draft.criteria}
                  onChange={event => setDraft(prev => ({ ...prev, criteria: event.target.value }))}
                  className={TEXTAREA_CLASS}
                  placeholder="Critérios de aceite"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addBacklogItem}
                  className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                >
                  Adicionar item
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100">
              {orderedBacklog.length > 0 ? (
                orderedBacklog.map(item => (
                  <article key={item.id} className="grid gap-3 border-b border-gray-100 p-4 last:border-b-0">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_120px_120px_120px_120px]">
                      <input
                        value={item.title || ''}
                        onChange={event => updateBacklogItem(item.id, { title: event.target.value })}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                      <FieldSelect label="Tipo" value={item.type || 'História'} options={BACKLOG_TYPES} onChange={value => updateBacklogItem(item.id, { type: value })} />
                      <FieldSelect label="Prioridade" value={item.priority || 'Média'} options={PRIORITIES} onChange={value => updateBacklogItem(item.id, { priority: value })} />
                      <FieldSelect label="Impacto" value={item.impact || 'Médio'} options={IMPACT_LEVELS} onChange={value => updateBacklogItem(item.id, { impact: value })} />
                      <FieldSelect label="Esforço" value={item.effort || 'Médio'} options={EFFORT_LEVELS} onChange={value => updateBacklogItem(item.id, { effort: value })} />
                      <FieldSelect label="Status" value={item.status || 'Ideia'} options={BACKLOG_STATUSES} onChange={value => updateBacklogItem(item.id, { status: value })} />
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_88px]">
                      <textarea
                        value={item.evidence || ''}
                        onChange={event => updateBacklogItem(item.id, { evidence: event.target.value })}
                        className="min-h-20 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Evidência"
                      />
                      <textarea
                        value={item.criteria || ''}
                        onChange={event => updateBacklogItem(item.id, { criteria: event.target.value })}
                        className="min-h-20 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="Critérios"
                      />
                      <div className="flex flex-col gap-2">
                        <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600">
                          Score {getBacklogScore(item)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBacklogItem(item.id)}
                          className="rounded-md border border-red-100 bg-red-50 px-2 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState>Nenhum item estruturado ainda.</EmptyState>
              )}
            </div>
            </SectionPanel>
          )}

          {poTab === 'evidence' && (
            <SectionPanel title="Evidências vinculadas">
            <div className="grid divide-y divide-gray-100">
              {evidence.length > 0 ? (
                evidence.slice(0, 20).map((row, index) => (
                  <div key={`${row.interviewId}-${row.sectionId}-${index}`} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {row.section}
                      </span>
                      <span className="text-xs font-semibold text-gray-900">{row.interviewTitle}</span>
                      {row.imageCount > 0 && (
                        <span className="text-[11px] text-gray-500">{row.imageCount} print{row.imageCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-800">{row.question}</p>
                    {row.answer && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{row.answer}</p>}
                  </div>
                ))
              ) : (
                <EmptyState>Nenhuma evidência estruturada encontrada.</EmptyState>
              )}
            </div>
            </SectionPanel>
          )}
        </div>
      </div>
    </div>
  )
}
