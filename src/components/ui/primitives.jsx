export const fieldClass = 'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
export const textareaClass = 'min-h-24 resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'

export function Button({ children, tone = 'secondary', className = '', ...props }) {
  const tones = {
    primary: 'border-gray-950 bg-gray-950 text-white hover:bg-gray-800',
    secondary: 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:text-sky-700',
    ghost: 'border-transparent bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900',
    danger: 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100',
  }

  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${tones[tone] || tones.secondary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Panel({ title, children, actions, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {title && <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</p>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'border-gray-200 bg-gray-50 text-gray-600',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-100 bg-red-50 text-red-600',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    dark: 'border-gray-900 bg-gray-950 text-white',
  }

  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  )
}

export function Metric({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  )
}

export function SelectField({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </Field>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {columns.map(column => (
              <th key={column} className="border-b border-gray-200 px-3 py-2">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function Drawer({ title, open, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar painel"
        className="absolute inset-0 bg-gray-950/25"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detalhe</p>
            <h2 className="mt-1 text-base font-semibold text-gray-950">{title}</h2>
          </div>
          <Button tone="ghost" onClick={onClose}>Fechar</Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}
