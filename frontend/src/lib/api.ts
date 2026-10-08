import type { Model, Conversation, ConversationDetail } from '../types'

// API 基础地址：优先用环境变量，否则用相对路径（同域部署时）
const API_BASE = import.meta.env.VITE_API_BASE || ''

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  getModels: () => fetchJSON<Model[]>(`${API_BASE}/api/models`),

  getConversations: () => fetchJSON<Conversation[]>(`${API_BASE}/api/conversations`),

  createConversation: (model: string) =>
    fetchJSON<Conversation>(`${API_BASE}/api/conversations`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),

  getConversation: (id: string) =>
    fetchJSON<ConversationDetail>(`${API_BASE}/api/conversations/${id}`),

  deleteConversation: (id: string) =>
    fetchJSON<void>(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' }),

  runCode: (code: string, language: string) =>
    fetchJSON<{ stdout: string; stderr: string; exit_code: number }>(
      `${API_BASE}/api/sandbox/run`,
      { method: 'POST', body: JSON.stringify({ code, language }) }
    ),
}

export function getSseUrl(conversationId: string): string {
  return `${API_BASE}/api/chat/stream/${conversationId}`
}
