import { useState, useRef, useCallback, useEffect } from 'react'
import type { Message, WsServerEvent, WsClientMessage } from '../types'
import { getWsUrl } from '../lib/api'
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
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<number | null>(null)
  const streamingMsgRef = useRef<Message | null>(null)
  const hasFirstMessageRef = useRef(false)

  // Reset messages when conversation changes
  useEffect(() => {
    setMessages([])
    setIsStreaming(false)
    setWsError(null)
    hasFirstMessageRef.current = false
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
  }, [conversationId])

  const cleanupWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const stopStreaming = useCallback(() => {
    cleanupWs()
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
  }, [cleanupWs])

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
                    content: '这是一个本地对话示例。连接后端服务后，AI 回复将通过 WebSocket 流式返回。',
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

      // Connect WebSocket
      try {
        const wsUrl = getWsUrl(conversationId)
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          const payload: WsClientMessage = {
            type: 'message',
            content: content.trim(),
            model,
          }
          ws.send(JSON.stringify(payload))
        }

        ws.onmessage = (event) => {
          try {
            const data: WsServerEvent = JSON.parse(event.data)
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
                cleanupWs()
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
                cleanupWs()
                break
            }
          } catch (e) {
            console.error('Failed to parse WS message:', e)
          }
        }

        ws.onerror = () => {
          setWsError('连接错误，请检查后端服务是否运行')
        }

        ws.onclose = (ev) => {
          if (streamingMsgRef.current && !ev.wasClean) {
            setWsError('连接断开，正在尝试重连…')
            // Auto-reconnect once
            reconnectRef.current = window.setTimeout(() => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgRef.current?.id
                    ? { ...m, status: 'done' as const }
                    : m
                )
              )
              streamingMsgRef.current = null
              setIsStreaming(false)
            }, 2000)
          }
        }
      } catch (e) {
        setWsError(e instanceof Error ? e.message : '连接失败')
        setIsStreaming(false)
        streamingMsgRef.current = null
      }
    },
    [conversationId, isStreaming, model, onFirstMessage, cleanupWs]
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
