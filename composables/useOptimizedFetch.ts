export function useOptimizedFetch<T>(
  url: string,
  opts?: {
    lazy?: boolean
    immediate?: boolean
  },
) {
  const lazy = opts?.lazy ?? false
  const immediate = opts?.immediate ?? true

  const data = ref<T | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)

  const execute = async () => {
    if (pending.value) return

    pending.value = true
    error.value = null

    try {
      const response = await $fetch<T>(url, {
        headers: {
          Accept: 'application/json',
        },
      })
      data.value = response
    } catch (err) {
      error.value = err as Error
      console.error(`Fetch error for ${url}:`, err)
    } finally {
      pending.value = false
    }
  }

  const refresh = () => execute()

  if (!lazy && immediate) {
    execute()
  }

  return {
    data: computed(() => data.value),
    pending: computed(() => pending.value),
    error: computed(() => error.value),
    execute,
    refresh,
  }
}
