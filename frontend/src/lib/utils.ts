export function generateTitle(content: string, maxLen = 30): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen) + '…'
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
