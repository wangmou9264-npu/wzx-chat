import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface Props {
  thinking: string
}

export default function ThinkingBlock({ thinking }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!thinking.trim()) return null

  return (
    <div className="mb-3 rounded-item border border-light-border dark:border-dark-border overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-light-text500 dark:text-dark-text500 bg-light-bg300 dark:bg-dark-bg300 hover:bg-light-border dark:hover:bg-dark-border transition-colors"
      >
        <Brain size={12} />
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>Extended thinking</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-light-text500 dark:text-dark-text500 max-h-60 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  )
}
