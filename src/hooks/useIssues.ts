import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { computeIssueAgeDays } from '@/lib/aging'
import type { IssueRow, IssueWithObject, IssueStatus } from '@/types/database'

export function useIssues(filters?: Record<string, string>) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['issues', filters],
    queryFn: async (): Promise<IssueWithObject[]> => {
      let query = supabase
        .from('issues')
        .select('*, objects!inner(name, module)')
        .eq('is_archived', filters?.is_archived === 'true' ? true : false)

      if (filters?.status) {
        const statuses = filters.status.split(',') as IssueStatus[]
        query = query.in('status', statuses)
      } else {
        // Default: exclude closed
        query = query.not('status', 'eq', 'closed')
      }

      if (filters?.issue_type) query = query.eq('issue_type', filters.issue_type as IssueRow['issue_type'])
      if (filters?.lifecycle_stage) query = query.eq('lifecycle_stage', filters.lifecycle_stage as IssueRow['lifecycle_stage'])
      if (filters?.module) query = query.eq('objects.module' as any, filters.module)
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

      const sortField = filters?.sort || 'created_at'
      const sortOrder = filters?.order === 'desc' ? false : true

      query = query.order(sortField as keyof IssueRow, { ascending: sortOrder })

      const { data, error } = await query
      if (error) throw error

      return (data || []).map((issue: Record<string, unknown>) => {
        const objects = issue.objects as { name: string; module: string }
        return {
          ...issue,
          objects: undefined,
          object_name: objects.name,
          object_module: objects.module,
          age_days: computeIssueAgeDays(issue.created_at as string, issue.resolved_at as string | null),
        } as unknown as IssueWithObject
      })
    },
    enabled: !!user,
  })
}

export function useIssue(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*, objects!inner(name, module)')
        .eq('id', id!)
        .single()
      if (error) throw error

      const objects = (data as Record<string, unknown>).objects as { name: string; module: string }
      return {
        ...data,
        objects: undefined,
        object_name: objects.name,
        object_module: objects.module,
        age_days: computeIssueAgeDays(data.created_at, data.resolved_at),
      } as unknown as IssueWithObject
    },
    enabled: !!user && !!id,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (issue: Omit<IssueRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_archived'>) => {
      const { data, error } = await supabase
        .from('issues')
        .insert({ ...issue, user_id: user!.id, is_archived: false })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['objects'] })
      queryClient.invalidateQueries({ queryKey: ['object-issues'] })
    },
  })
}

export function useUpdateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IssueRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['issue', data.id] })
      queryClient.invalidateQueries({ queryKey: ['objects'] })
      queryClient.invalidateQueries({ queryKey: ['object-issues', data.object_id] })
    },
  })
}
