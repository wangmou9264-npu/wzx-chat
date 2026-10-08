import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message as MessageType } from '../types'
import ThinkingBlock from './ThinkingBlock'
import CodeBlock from './CodeBlock'

interface Props {
  message: MessageType
}

export default function Message({ message }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-light-bg300 dark:bg-dark-bg300">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-light-text100 dark:text-dark-text100">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-6">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-claude-clay flex items-center justify-center">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        {message.thinking && <ThinkingBlock thinking={message.thinking} />}
        {message.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-2 prose-blockquote:border-claude-clay/40">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isBlock = match || (typeof children === 'string' && children.includes('\n'))
                  const code = String(children).replace(/\n$/, '')
                  if (isBlock) {
                    return (
                      <CodeBlock
                        language={match ? match[1] : 'text'}
                        code={code}
                      />
                    )
                  }
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-light-bg300 dark:bg-dark-bg300 text-[0.85em] font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                pre({ children }) {
                  return <>{children}</>
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : message.status === 'streaming' ? (
          <div className="flex items-center gap-1.5 text-light-text500 dark:text-dark-text500 text-sm py-2">
            <span className="animate-pulse">●</span>
            <span>Thinking…</span>
          </div>
        ) : null}
        {message.status === 'error' && (
          <div className="mt-2 text-sm text-red-500 dark:text-red-400">
            {message.content}
          </div>
        )}
      </div>
    </div>
  )
}
