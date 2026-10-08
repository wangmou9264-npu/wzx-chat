import { useState, useRef, useCallback, useEffect } from 'react'
import type { Message, WsServerEvent } from '../types'
import { getSseUrl } from '../lib/api'
import { uid } from '../lib/utils'

interface UseChatOptions {
  conversationId: string | null
  model: string
  onFirstMessage?: (content: string) => void
}

export function useChat({ conversationId, model, onFirstMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const streamingMsgRef = useRef<Message | null>(null)
  const hasFirstMessageRef = useRef(false)

  // Reset messages when conversation changes
  useEffect(() => {
    setMessages([])
    setIsStreaming(false)
    setWsError(null)
    hasFirstMessageRef.current = false
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [conversationId])

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsStreaming(false)
    if (streamingMsgRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgRef.current!.id
            ? { ...m, status: 'done' as const }
            : m
        )
      )
      streamingMsgRef.current = null
    }
  }, [])

  const sendMessage = useCallback(
    (content: string) => {
      if (!conversationId || isStreaming || !content.trim()) return

      // Add user message immediately
      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: content.trim(),
        created_at: new Date().toISOString(),
        status: 'done',
      }

      // Create placeholder AI message
      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: '',
        thinking: '',
        created_at: new Date().toISOString(),
        status: 'streaming',
      }

      setMessages((prev) => [...prev, userMsg, aiMsg])
      streamingMsgRef.current = aiMsg

      // Notify parent about first message for title generation
      if (!hasFirstMessageRef.current) {
        hasFirstMessageRef.current = true
        onFirstMessage?.(content.trim())
      }

      setIsStreaming(true)
      setWsError(null)

      // For local conversations (no backend), simulate a response
      if (conversationId.startsWith('local-')) {
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsg.id
                ? {
                    ...m,
                    content: '这是一个本地对话示例。连接后端服务后，AI 回复将通过 SSE 流式返回。',
                    status: 'done',
                  }
                : m
            )
          )
          streamingMsgRef.current = null
          setIsStreaming(false)
        }, 800)
        return
      }

      // SSE fetch streaming
      const controller = new AbortController()
      abortRef.current = controller

      ;(async () => {
        try {
          const res = await fetch(getSseUrl(conversationId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: content.trim(),
              model,
              images: [],
            }),
            signal: controller.signal,
          })

          if (!res.ok) {
            const text = await res.text()
            throw new Error(`HTTP ${res.status}: ${text}`)
          }

          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // SSE events are separated by double newline
            const parts = buffer.split('\n\n')
            buffer = parts.pop() || ''

            for (const part of parts) {
              const lines = part.split('\n')
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const jsonStr = line.slice(6)
                if (!jsonStr.trim()) continue

                try {
                  const data: WsServerEvent = JSON.parse(jsonStr)
                  const aiId = streamingMsgRef.current?.id

                  switch (data.type) {
                    case 'thinking':
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiId
                            ? { ...m, thinking: (m.thinking || '') + data.content }
                            : m
                        )
                      )
                      break

                    case 'token':
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiId
                            ? { ...m, content: m.content + data.content }
                            : m
                        )
                      )
                      break

                    case 'done':
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiId ? { ...m, status: 'done' as const } : m
                        )
                      )
                      streamingMsgRef.current = null
                      setIsStreaming(false)
                      break

                    case 'error':
                      setWsError(data.message)
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiId
                            ? {
                                ...m,
                                content: m.content || `[错误] ${data.message}`,
                                status: 'error' as const,
                              }
                            : m
                        )
                      )
                      streamingMsgRef.current = null
                      setIsStreaming(false)
                      break
                  }
                } catch (e) {
                  console.error('Failed to parse SSE event:', e, jsonStr)
                }
              }
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') {
            // User stopped streaming, already handled
            return
          }
          console.error('SSE fetch error:', e)
          setWsError(e instanceof Error ? e.message : '连接失败')
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingMsgRef.current?.id
                ? {
                    ...m,
                    content: m.content || `[错误] ${e instanceof Error ? e.message : '连接失败'}`,
                    status: 'error' as const,
                  }
                : m
            )
          )
          streamingMsgRef.current = null
          setIsStreaming(false)
        } finally {
          abortRef.current = null
        }
      })()
    },
    [conversationId, isStreaming, model, onFirstMessage]
  )

  // Load messages from conversation detail
  const loadMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  return {
    messages,
    isStreaming,
    wsError,
    sendMessage,
    stopStreaming,
    loadMessages,
    setMessages,
  }
}
