import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { Model } from '../types'

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getModels()
      setModels(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load models')
      // Fallback default model
      setModels([{ id: 'space-bunny-free', name: 'Space Bunny (Free)' }])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return { models, loading, error, refetch: fetchModels }
}
