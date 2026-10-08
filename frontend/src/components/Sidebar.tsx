import { useState, useMemo } from 'react'
import { Plus, Trash2, MessageSquare, PanelLeftClose, PanelLeft, Search } from 'lucide-react'
import type { Conversation, Model, ThemeMode } from '../types'
import ModelSelector from './ModelSelector'
import ThemeToggle from './ThemeToggle'

interface Props {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  models: Model[]
  currentModel: string
  onModelChange: (id: string) => void
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
}

type GroupKey = 'Today' | 'Yesterday' | 'Older'

function groupConversations(convs: Conversation[]): [GroupKey, Conversation[]][] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000

  const groups: Record<GroupKey, Conversation[]> = {
    Today: [],
    Yesterday: [],
    Older: [],
  }

  for (const c of convs) {
    const t = new Date(c.updated_at).getTime()
    if (t >= todayStart) groups.Today.push(c)
    else if (t >= yesterdayStart) groups.Yesterday.push(c)
    else groups.Older.push(c)
  }

  return (['Today', 'Yesterday', 'Older'] as GroupKey[])
    .filter((k) => groups[k].length > 0)
    .map((k) => [k, groups[k]])
}

export default function Sidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  models,
  currentModel,
  onModelChange,
  themeMode,
  onThemeChange,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase())
    )
  }, [conversations, search])

  const groups = useMemo(() => groupConversations(filtered), [filtered])

  return (
    <aside
      className={`flex flex-col h-full bg-light-bg300 dark:bg-dark-bg300 border-r border-light-border dark:border-dark-border transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-[280px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        {!collapsed && (
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-claude-clay flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">AI</span>
            </div>
            <span className="text-sm font-semibold text-light-text100 dark:text-dark-text100">Claude</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-item text-light-text500 dark:text-dark-text500 hover:bg-light-bg100 dark:hover:bg-dark-bg100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-2">
        <button
          onClick={onNew}
          className={`flex items-center gap-2 rounded-item bg-claude-clay text-white hover:bg-claude-clay-hover transition-colors ${
            collapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-3 py-2 text-sm font-medium'
          }`}
        >
          <Plus size={16} />
          {!collapsed && <span>New chat</span>}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-item bg-light-bg100 dark:bg-dark-bg100 px-2.5 py-1.5 border border-transparent focus-within:border-claude-clay/40 transition-colors">
            <Search size={14} className="text-light-text500 dark:text-dark-text500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent outline-none text-sm text-light-text100 dark:text-dark-text100 placeholder:text-light-text500 dark:placeholder:text-dark-text500"
            />
          </div>
        </div>
      )}

      {/* All chats label */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1 text-xs font-medium text-light-text500 dark:text-dark-text500 uppercase tracking-wide">
          All chats
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {groups.length === 0 && !collapsed && (
          <div className="text-xs text-light-text500 dark:text-dark-text500 text-center py-6">
            No chats yet
          </div>
        )}
        {groups.map(([groupName, convs]) => (
          <div key={groupName}>
            {!collapsed && (
              <div className="px-2 pt-3 pb-1 text-[11px] font-medium text-light-text500 dark:text-dark-text500">
                {groupName}
              </div>
            )}
            {convs.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center rounded-item cursor-pointer transition-colors ${
                  conv.id === currentId
                    ? 'bg-light-bg100 dark:bg-dark-bg100'
                    : 'hover:bg-light-bg100/60 dark:hover:bg-dark-bg100/60'
                } ${collapsed ? 'justify-center px-1 py-2' : 'px-2 py-2'}`}
                onClick={() => onSelect(conv.id)}
              >
                {/* Left accent bar for active */}
                {conv.id === currentId && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-claude-clay rounded-r" />
                )}
                <MessageSquare size={14} className="flex-shrink-0 text-light-text500 dark:text-dark-text500" />
                {!collapsed && (
                  <>
                    <span className="ml-2 flex-1 truncate text-sm text-light-text100 dark:text-dark-text100">
                      {conv.title}
                    </span>
                    {confirmDeleteId === conv.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(conv.id); setConfirmDeleteId(null) }}
                          className="text-[11px] text-red-500 dark:text-red-400 font-medium"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          className="text-[11px] text-light-text500 dark:text-dark-text500"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(conv.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-item text-light-text500 dark:text-dark-text500 hover:text-red-500 dark:hover:text-red-400 transition-all"
                        title="Delete chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-light-border dark:border-dark-border p-2 space-y-0.5">
        <ModelSelector
          models={models}
          value={currentModel}
          onChange={onModelChange}
          collapsed={collapsed}
        />
        <ThemeToggle
          mode={themeMode}
          onChange={onThemeChange}
          collapsed={collapsed}
        />
      </div>
    </aside>
  )
}
