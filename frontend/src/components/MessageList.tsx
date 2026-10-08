import { useEffect, useRef } from 'react'
import type { Message as MessageType } from '../types'
import Message from './Message'

interface Props {
  messages: MessageType[]
}

export default function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-claude-clay/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-claude-clay text-lg font-bold">AI</span>
          </div>
          <h2 className="text-lg font-medium text-light-text100 dark:text-dark-text100 mb-2">
            Ask Claude anything
          </h2>
          <p className="text-sm text-light-text500 dark:text-dark-text500">
            Your chats with Claude will show up here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
