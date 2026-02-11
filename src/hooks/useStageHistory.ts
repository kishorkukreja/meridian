import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import type { StageHistoryRow } from '@/types/database'

export function useAllStageHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['all-stage-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meridian_stage_history')
        .select('*')
        .order('transitioned_at', { ascending: true })
      if (error) throw error
      return data as StageHistoryRow[]
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - report data is less volatile
  })
}
