import { useRef, useEffect, useState } from 'react'
import { ArrowUp, Square, Paperclip, Image as ImageIcon } from 'lucide-react'

interface Props {
  onSend: (content: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export default function MessageInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px'
  }, [value])

  const handleSend = () => {
    if (!value.trim() || isStreaming || disabled) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-6 pb-4 pt-1">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-input border border-light-border dark:border-dark-border bg-light-bg100 dark:bg-dark-bg100 focus-within:border-claude-clay/50 transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude anything"
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm leading-relaxed outline-none text-light-text100 dark:text-dark-text100 placeholder:text-light-text500 dark:placeholder:text-dark-text500"
            style={{ maxHeight: 300 }}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button
                title="Attach file"
                className="p-1.5 rounded-item text-light-text500 dark:text-dark-text500 hover:bg-light-bg300 dark:hover:bg-dark-bg300 transition-colors"
              >
                <Paperclip size={16} />
              </button>
              <button
                title="Add image"
                className="p-1.5 rounded-item text-light-text500 dark:text-dark-text500 hover:bg-light-bg300 dark:hover:bg-dark-bg300 transition-colors"
              >
                <ImageIcon size={16} />
              </button>
            </div>
            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 rounded-btn bg-light-text100 dark:bg-dark-text100 px-3.5 py-1.5 text-xs font-medium text-light-bg100 dark:text-dark-bg100 hover:opacity-80 transition-opacity"
              >
                <Square size={11} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!value.trim() || disabled}
                title="Send message"
                className="flex items-center justify-center w-8 h-8 rounded-btn bg-claude-clay text-white hover:bg-claude-clay-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-light-text500 dark:text-dark-text500 mt-2">
          Claude is AI and can make mistakes.
        </p>
      </div>
    </div>
  )
}
