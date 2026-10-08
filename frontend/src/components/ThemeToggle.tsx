import { useState, useRef, useEffect } from 'react'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import type { ThemeMode } from '../hooks/useTheme'

interface Props {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
  collapsed?: boolean
}

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function ThemeToggle({ mode, onChange, collapsed }: Props) {
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

  const CurrentIcon = options.find((o) => o.value === mode)?.icon ?? Moon

  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          title="Theme"
          className="flex h-9 w-9 items-center justify-center rounded-item text-dark-text500 dark:text-dark-text500 text-light-text500 hover:bg-light-bg300 dark:hover:bg-dark-bg300 transition-colors"
        >
          <CurrentIcon size={16} />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-2 w-40 rounded-card border border-light-border dark:border-dark-border bg-light-bg100 dark:bg-dark-bg100 shadow-lg z-50 py-1">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-light-bg300 dark:hover:bg-dark-bg300 text-light-text100 dark:text-dark-text100"
              >
                <span className="flex items-center gap-2">
                  <o.icon size={14} />
                  {o.label}
                </span>
                {mode === o.value && <Check size={14} className="text-claude-clay" />}
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
        <span className="flex items-center gap-2">
          <CurrentIcon size={16} />
          <span>Theme</span>
        </span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-card border border-light-border dark:border-dark-border bg-light-bg100 dark:bg-dark-bg100 shadow-lg z-50 py-1">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-light-bg300 dark:hover:bg-dark-bg300 text-light-text100 dark:text-dark-text100"
            >
              <span className="flex items-center gap-2">
                <o.icon size={14} />
                {o.label}
              </span>
              {mode === o.value && <Check size={14} className="text-claude-clay" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
