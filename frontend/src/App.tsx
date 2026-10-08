import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import { useTheme } from './hooks/useTheme'
import type { ThemeMode } from './hooks/useTheme'
import { useModels } from './hooks/useModels'
import { useConversations } from './hooks/useConversations'
import { useChat } from './hooks/useChat'
import { generateTitle } from './lib/utils'

export default function App() {
  const { mode: themeMode, setMode: setThemeMode } = useTheme()
  const { models } = useModels()
  const {
    conversations,
    currentId,
    currentDetail,
    fetchList,
    createNew,
    select,
    remove,
    updateTitle,
  } = useConversations()

  const [currentModel, setCurrentModel] = useState('space-bunny-free')
  const [chatTitle, setChatTitle] = useState('')

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const {
    messages,
    isStreaming,
    wsError,
    sendMessage,
    stopStreaming,
    loadMessages,
  } = useChat({
    conversationId: currentId,
    model: currentModel,
    onFirstMessage: (content) => {
      const title = generateTitle(content)
      setChatTitle(title)
      if (currentId) updateTitle(currentId, title)
    },
  })

  useEffect(() => {
    if (currentDetail) {
      loadMessages(currentDetail.messages)
      setChatTitle(currentDetail.title)
    } else {
      loadMessages([])
      setChatTitle('')
    }
  }, [currentDetail, loadMessages])

  const handleNew = useCallback(async () => {
    await createNew(currentModel)
    setChatTitle('')
  }, [createNew, currentModel])

  const handleSelect = useCallback(
    async (id: string) => {
      await select(id)
    },
    [select]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await remove(id)
    },
    [remove]
  )

  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModel(modelId)
  }, [])

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode)
  }, [setThemeMode])

  const currentModelObj = models.find((m) => m.id === currentModel)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-light-bg100 dark:bg-dark-bg100 text-light-text100 dark:text-dark-text100 font-sans">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        models={models}
        currentModel={currentModel}
        onModelChange={handleModelChange}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />
      <ChatArea
        title={chatTitle || currentDetail?.title || ''}
        model={currentModelObj}
        messages={messages}
        isStreaming={isStreaming}
        wsError={wsError}
        onSend={sendMessage}
        onStop={stopStreaming}
      />
    </div>
  )
}
