import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { Model } from '../types'

interface Props {
  models: Model[]
  value: string
  onChange: (id: string) => void
  collapsed?: boolean
}

export default function ModelSelector({ models, value, onChange, collapsed }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = models.find((m) => m.id === value)

  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          title={current?.name || value}
          className="flex h-9 w-9 items-center justify-center rounded-item text-xs font-medium text-dark-text500 dark:text-dark-text500 text-light-text500 hover:bg-light-bg300 dark:hover:bg-dark-bg300"
        >
          {(current?.name || 'AI').slice(0, 2).toUpperCase()}
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-2 w-56 rounded-card border border-light-border dark:border-dark-border bg-light-bg100 dark:bg-dark-bg100 shadow-lg z-50 py-1">
            <div className="px-3 py-1.5 text-xs text-light-text500 dark:text-dark-text500">Select model</div>
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false) }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-light-bg300 dark:hover:bg-dark-bg300 text-light-text100 dark:text-dark-text100"
              >
                <span className="truncate">{m.name}</span>
                {m.id === value && <Check size={14} className="text-claude-clay flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-item px-2 py-2 text-sm hover:bg-light-bg300 dark:hover:bg-dark-bg300 text-light-text300 dark:text-dark-text300"
      >
        <span className="truncate">{current?.name || value}</span>
        <ChevronDown size={14} className="flex-shrink-0 ml-2 text-light-text500 dark:text-dark-text500" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-card border border-light-border dark:border-dark-border bg-light-bg100 dark:bg-dark-bg100 shadow-lg z-50 py-1">
          <div className="px-3 py-1.5 text-xs text-light-text500 dark:text-dark-text500">Select model</div>
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-light-bg300 dark:hover:bg-dark-bg300 text-light-text100 dark:text-dark-text100"
            >
              <div className="min-w-0">
                <div className="truncate">{m.name}</div>
                {m.description && (
                  <div className="text-xs text-light-text500 dark:text-dark-text500 truncate">{m.description}</div>
                )}
              </div>
              {m.id === value && <Check size={14} className="text-claude-clay flex-shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
