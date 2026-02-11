import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const result: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      result[key] = value
    })
    return result
  }, [searchParams])

  const setFilter = useCallback((key: string, value: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    })
  }, [setSearchParams])

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const activeFilterCount = useMemo(() => {
    return Array.from(searchParams.keys()).filter(k => k !== 'sort' && k !== 'order').length
  }, [searchParams])

  return { filters, setFilter, clearFilters, activeFilterCount }
}
