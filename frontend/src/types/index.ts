export interface Model {
  id: string
  name: string
  description?: string
}

export interface Conversation {
  id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  created_at: string
  status?: 'streaming' | 'done' | 'error'
  sandbox_results?: SandboxResult[]
}

export interface SandboxResult {
  language: string
  code: string
  stdout: string
  stderr: string
  exit_code: number
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

// WebSocket event types
export type WsServerEvent =
  | { type: 'thinking'; content: string }
  | { type: 'token'; content: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'done'; usage: Record<string, number> }
  | { type: 'error'; message: string }

export interface WsClientMessage {
  type: 'message'
  content: string
  model: string
  images?: string[]
}

export type Theme = 'dark' | 'light'
export type ThemeMode = 'light' | 'dark' | 'system'
