const fetchCache = new Map<string, { data: unknown; timestamp: number }>()

export function useOptimizedFetch<T>(
  url: string,
  opts?: {
    lazy?: boolean
    immediate?: boolean
    cache?: number
  },
) {
  const lazy = opts?.lazy ?? false
  const immediate = opts?.immediate ?? true
  const cacheTime = opts?.cache ?? 5 * 60 * 1000

  const data = ref<T | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)

  const execute = async () => {
    if (pending.value) return

    const now = Date.now()
    const cached = fetchCache.get(url)
    if (cached && now - cached.timestamp < cacheTime) {
      data.value = cached.data as T
      return
    }

    pending.value = true
    error.value = null

    try {
      const response = await $fetch<T>(url, {
        headers: {
          Accept: 'application/json',
        },
      })
      data.value = response
      fetchCache.set(url, { data: response, timestamp: now })
    } catch (err) {
      error.value = err as Error
      console.error(`Fetch error for ${url}:`, err)
    } finally {
      pending.value = false
    }
  }

  const refresh = () => execute()

  const clearCache = () => {
    fetchCache.delete(url)
  }

  if (!lazy && immediate) {
    execute()
  }

  return {
    data: computed(() => data.value),
    pending: computed(() => pending.value),
    error: computed(() => error.value),
    execute,
    refresh,
    clearCache,
  }
}
