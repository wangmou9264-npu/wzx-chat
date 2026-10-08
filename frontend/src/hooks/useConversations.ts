import { useState, useCallback } from 'react'
import { api } from '../lib/api'
import type { Conversation, ConversationDetail } from '../types'

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [currentDetail, setCurrentDetail] = useState<ConversationDetail | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchList = useCallback(async () => {
    try {
      setLoadingList(true)
      const data = await api.getConversations()
      setConversations(data)
    } catch {
      setConversations([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  const createNew = useCallback(async (model: string): Promise<string> => {
    try {
      const conv = await api.createConversation(model)
      setConversations((prev) => [conv, ...prev])
      setCurrentId(conv.id)
      setCurrentDetail({ ...conv, messages: [] })
      return conv.id
    } catch {
      // Fallback: create a local-only conversation
      const localId = 'local-' + Date.now().toString(36)
      const conv: Conversation = {
        id: localId,
        title: '新对话',
        model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setConversations((prev) => [conv, ...prev])
      setCurrentId(localId)
      setCurrentDetail({ ...conv, messages: [] })
      return localId
    }
  }, [])

  const select = useCallback(async (id: string) => {
    setCurrentId(id)
    if (id.startsWith('local-')) {
      setCurrentDetail(null)
      return
    }
    try {
      setLoadingDetail(true)
      const detail = await api.getConversation(id)
      setCurrentDetail(detail)
    } catch {
      setCurrentDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      if (!id.startsWith('local-')) {
        await api.deleteConversation(id)
      }
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (currentId === id) {
        setCurrentId(null)
        setCurrentDetail(null)
      }
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }, [currentId])

  const updateTitle = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    )
    if (currentDetail?.id === id) {
      setCurrentDetail((prev) => (prev ? { ...prev, title } : prev))
    }
  }, [currentDetail?.id])

  return {
    conversations,
    currentId,
    currentDetail,
    loadingList,
    loadingDetail,
    fetchList,
    createNew,
    select,
    remove,
    updateTitle,
    setCurrentId,
    setCurrentDetail,
  }
}
