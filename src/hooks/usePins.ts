import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { computeAgingDays, computeProgressPercent } from '@/lib/aging'
import type { PinRow, ObjectWithComputed, IssueWithObject } from '@/types/database'
import { computeIssueAgeDays } from '@/lib/aging'

export function usePins() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['pins'],
    queryFn: async (): Promise<PinRow[]> => {
      const { data, error } = await supabase
        .from('meridian_pins')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PinRow[]
    },
    enabled: !!user,
  })
}

export function useIsPinned(entityType: 'object' | 'issue', entityId: string) {
  const { data: pins } = usePins()
  return pins?.some(p => p.entity_type === entityType && p.entity_id === entityId) ?? false
}

export function useTogglePin() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: 'object' | 'issue'; entityId: string }) => {
      // Check if pin exists
      const { data: existing } = await supabase
        .from('meridian_pins')
        .select('id')
        .eq('user_id', user!.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('meridian_pins')
          .delete()
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('meridian_pins')
          .insert({ user_id: user!.id, entity_type: entityType, entity_id: entityId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins'] })
      queryClient.invalidateQueries({ queryKey: ['pinned-objects'] })
      queryClient.invalidateQueries({ queryKey: ['pinned-issues'] })
    },
  })
}

export function usePinnedObjects() {
  const { user } = useAuth()
  const { data: pins } = usePins()
  const objectIds = (pins || []).filter(p => p.entity_type === 'object').map(p => p.entity_id)

  return useQuery({
    queryKey: ['pinned-objects', objectIds],
    queryFn: async (): Promise<ObjectWithComputed[]> => {
      if (objectIds.length === 0) return []
      const { data, error } = await supabase
        .from('meridian_objects')
        .select('*')
        .in('id', objectIds)
      if (error) throw error
      return (data || []).map(obj => ({
        ...obj,
        aging_days: computeAgingDays(obj.stage_entered_at),
        open_issue_count: 0,
        progress_percent: computeProgressPercent(obj.current_stage),
      }))
    },
    enabled: !!user && objectIds.length > 0,
  })
}

export function usePinnedIssues() {
  const { user } = useAuth()
  const { data: pins } = usePins()
  const issueIds = (pins || []).filter(p => p.entity_type === 'issue').map(p => p.entity_id)

  return useQuery({
    queryKey: ['pinned-issues', issueIds],
    queryFn: async (): Promise<IssueWithObject[]> => {
      if (issueIds.length === 0) return []
      const { data, error } = await supabase
        .from('meridian_issues')
        .select('*, meridian_objects!meridian_issues_object_id_fkey(name, module)')
        .in('id', issueIds)
      if (error) throw error
      return (data || []).map((issue: Record<string, unknown>) => {
        const objects = issue.meridian_objects as { name: string; module: string }
        return {
          ...issue,
          meridian_objects: undefined,
          object_name: objects.name,
          object_module: objects.module,
          age_days: computeIssueAgeDays(issue.created_at as string, issue.resolved_at as string | null),
        } as unknown as IssueWithObject
      })
    },
    enabled: !!user && issueIds.length > 0,
  })
}
