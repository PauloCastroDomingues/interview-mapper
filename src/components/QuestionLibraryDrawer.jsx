'use client'
import { useMemo, useState } from 'react'
import { SECTIONS, getQuestionLibraryItems } from '@/lib/questions'

export default function QuestionLibraryDrawer({ open, activeSectionId, onClose, onAdd }) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('current')
  const [source, setSource] = useState('all')

  const activeSection = SECTIONS.find(section => section.id === activeSectionId)
  const libraryItems = useMemo(() => getQuestionLibraryItems(), [])

  const filteredItems = libraryItems.filter(item => {
    const matchesScope = scope === 'all' || item.section === activeSectionId
    const matchesSource = source === 'all' || item.type === source
    const text = `${item.q} ${item.hint || ''} ${item.sectionLabel} ${item.areaLabel || ''} ${item.source}`.toLowerCase()
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase())
    return matchesScope && matchesSource && matchesQuery
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/35 backdrop-blur-[1px]"
        aria-label="Fechar biblioteca"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl">
        <header className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biblioteca</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-950">Perguntas reutilizáveis</h2>
              <p className="mt-1 text-sm text-gray-500">{activeSection?.label || 'Todas as seções'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4">
            <input
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Buscar por tema, regra, área ou termo"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['current', 'Seção atual'],
              ['all', 'Todas'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setScope(value)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  scope === value
                    ? 'border-gray-950 bg-gray-950 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
            {[
              ['all', 'Base + áreas'],
              ['core', 'Base'],
              ['area', 'Áreas'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setSource(value)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  source === value
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-sky-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <article key={item.libraryId} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                      {item.sectionLabel}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      item.type === 'area'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-sky-50 text-sky-700'
                    }`}>
                      {item.source}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-snug text-gray-950">{item.q}</p>
                  {item.hint && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.hint}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onAdd(item)}
                      className="rounded-md bg-gray-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      Usar pergunta
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-900">Nenhuma pergunta encontrada.</p>
              <p className="mt-1 text-sm text-gray-500">Tente outro filtro ou termo de busca.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
