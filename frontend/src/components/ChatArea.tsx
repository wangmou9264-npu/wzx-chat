import type { Message, Model } from '../types'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

interface Props {
  title: string
  model?: Model
  messages: Message[]
  isStreaming: boolean
  wsError: string | null
  onSend: (content: string) => void
  onStop: () => void
}

export default function ChatArea({
  title,
  model,
  messages,
  isStreaming,
  wsError,
  onSend,
  onStop,
}: Props) {
  return (
    <main className="flex-1 flex flex-col h-full bg-light-bg100 dark:bg-dark-bg100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-light-border dark:border-dark-border">
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-light-text100 dark:text-dark-text100 truncate">
            {title || 'New chat'}
          </h1>
        </div>
        {model && (
          <span className="text-xs text-light-text500 dark:text-dark-text500 ml-4 flex-shrink-0 px-2 py-0.5 rounded-item bg-light-bg300 dark:bg-dark-bg300">
            {model.name}
          </span>
        )}
      </div>

      {/* Error banner */}
      {wsError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-500 dark:text-red-400">
          {wsError}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <MessageInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
      />
    </main>
  )
}
