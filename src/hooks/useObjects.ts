import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { computeAgingDays, computeProgressPercent } from '@/lib/aging'
import type { ObjectRow, ObjectWithComputed, IssueRow, StageHistoryRow } from '@/types/database'

export function useObjects(filters?: Record<string, string>) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['objects', filters],
    queryFn: async (): Promise<ObjectWithComputed[]> => {
      let query = supabase
        .from('meridian_objects')
        .select('*')
        .eq('is_archived', filters?.is_archived === 'true' ? true : false)

      if (filters?.module) query = query.eq('module', filters.module as ObjectRow['module'])
      if (filters?.category) query = query.eq('category', filters.category as ObjectRow['category'])
      if (filters?.status) query = query.eq('status', filters.status as ObjectRow['status'])
      if (filters?.current_stage) query = query.eq('current_stage', filters.current_stage as ObjectRow['current_stage'])
      if (filters?.source_system) query = query.eq('source_system', filters.source_system as ObjectRow['source_system'])
      if (filters?.region) query = query.eq('region', filters.region as ObjectRow['region'])
      if (filters?.search) query = query.ilike('name', `%${filters.search}%`)

      const sortField = filters?.sort || 'created_at'
      const sortOrder = filters?.order === 'asc'

      if (sortField === 'aging') {
        query = query.order('stage_entered_at', { ascending: !sortOrder })
      } else {
        query = query.order(sortField as keyof ObjectRow, { ascending: sortOrder })
      }

      const { data, error } = await query
      if (error) throw error

      // Fetch open issue counts
      const objectIds = (data || []).map(o => o.id)
      let issues: IssueRow[] = []
      if (objectIds.length > 0) {
        const { data: issueData } = await supabase
          .from('meridian_issues')
          .select('*')
          .in('object_id', objectIds)
          .not('status', 'in', '("closed")')
        issues = issueData || []
      }

      return (data || []).map(obj => ({
        ...obj,
        aging_days: computeAgingDays(obj.stage_entered_at),
        open_issue_count: issues.filter(i => i.object_id === obj.id).length,
        progress_percent: computeProgressPercent(obj.current_stage),
      }))
    },
    enabled: !!user,
  })
}

export function useObject(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['object', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meridian_objects')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error

      const { data: issues } = await supabase
        .from('meridian_issues')
        .select('*')
        .eq('object_id', id!)
        .not('status', 'eq', 'closed')

      return {
        ...data,
        aging_days: computeAgingDays(data.stage_entered_at),
        open_issue_count: (issues || []).length,
        progress_percent: computeProgressPercent(data.current_stage),
      } as ObjectWithComputed
    },
    enabled: !!user && !!id,
  })
}

export function useObjectIssues(objectId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['object-issues', objectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meridian_issues')
        .select('*')
        .eq('object_id', objectId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as IssueRow[]
    },
    enabled: !!user && !!objectId,
  })
}

export function useStageHistory(objectId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['stage-history', objectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meridian_stage_history')
        .select('*')
        .eq('object_id', objectId!)
        .order('transitioned_at', { ascending: true })
      if (error) throw error
      return data as StageHistoryRow[]
    },
    enabled: !!user && !!objectId,
  })
}

export function useObjectNames() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['object-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meridian_objects')
        .select('name')
      if (error) throw error
      return (data || []).map(o => o.name)
    },
    enabled: !!user,
  })
}

export function useCreateObject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (obj: Omit<ObjectRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'stage_entered_at' | 'is_archived'>) => {
      const { data, error } = await supabase
        .from('meridian_objects')
        .insert({ ...obj, user_id: user!.id, is_archived: false })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] })
      queryClient.invalidateQueries({ queryKey: ['object-names'] })
    },
  })
}

export function useBulkUpdateObjects() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<ObjectRow> }) => {
      const { error } = await supabase
        .from('meridian_objects')
        .update(updates)
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] })
    },
  })
}

export function useUpdateObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ObjectRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('meridian_objects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['objects'] })
      queryClient.invalidateQueries({ queryKey: ['object', data.id] })
      queryClient.invalidateQueries({ queryKey: ['stage-history', data.id] })
    },
  })
}
