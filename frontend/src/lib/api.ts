import type { Model, Conversation, ConversationDetail } from '../types'

const API_BASE = '/api'

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
  getModels: () => fetchJSON<Model[]>(`${API_BASE}/models`),

  getConversations: () => fetchJSON<Conversation[]>(`${API_BASE}/conversations`),

  createConversation: (model: string) =>
    fetchJSON<Conversation>(`${API_BASE}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),

  getConversation: (id: string) =>
    fetchJSON<ConversationDetail>(`${API_BASE}/conversations/${id}`),

  deleteConversation: (id: string) =>
    fetchJSON<void>(`${API_BASE}/conversations/${id}`, { method: 'DELETE' }),

  runCode: (code: string, language: string) =>
    fetchJSON<{ stdout: string; stderr: string; exit_code: number }>(
      `${API_BASE}/sandbox/run`,
      { method: 'POST', body: JSON.stringify({ code, language }) }
    ),
}

export function getSseUrl(conversationId: string): string {
  return `/api/chat/stream/${conversationId}`
}
