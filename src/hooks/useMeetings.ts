import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import type { MeetingRow, MeetingWithLinks, MeetingType } from '@/types/database'

export function useMeetings(search?: string, sort?: string, order?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['meetings', search, sort, order],
    queryFn: async (): Promise<MeetingRow[]> => {
      const sortField = sort || 'meeting_date'
      const ascending = order === 'asc'

      let query = supabase
        .from('meridian_meetings')
        .select('*')
        .order(sortField as keyof MeetingRow, { ascending })

      if (search) query = query.ilike('title', `%${search}%`)

      const { data, error } = await query
      if (error) throw error
      return data as MeetingRow[]
    },
    enabled: !!user,
  })
}

export function useMeeting(id: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['meeting', id],
    queryFn: async (): Promise<MeetingWithLinks> => {
      const { data, error } = await supabase
        .from('meridian_meetings')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error

      const meeting = data as MeetingRow

      // Resolve linked object names
      let linkedObjectNames: string[] = []
      if (meeting.linked_object_ids.length > 0) {
        const { data: objects } = await supabase
          .from('meridian_objects')
          .select('id, name')
          .in('id', meeting.linked_object_ids)
        linkedObjectNames = (objects || []).map(o => o.name)
      }

      // Resolve linked issue titles
      let linkedIssueTitles: string[] = []
      if (meeting.linked_issue_ids.length > 0) {
        const { data: issues } = await supabase
          .from('meridian_issues')
          .select('id, title')
          .in('id', meeting.linked_issue_ids)
        linkedIssueTitles = (issues || []).map(i => i.title)
      }

      return {
        ...meeting,
        linked_object_names: linkedObjectNames,
        linked_issue_titles: linkedIssueTitles,
      }
    },
    enabled: !!user && !!id,
  })
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (meeting: Omit<MeetingRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('meridian_meetings')
        .insert({ ...meeting, user_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as MeetingRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meridian_meetings')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MeetingRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('meridian_meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as MeetingRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting', data.id] })
    },
  })
}

type MoMResponse = {
  tldr: string
  discussion_points: string[]
  next_steps: { action: string; owner: string; due_date: string }[]
  action_log: string
  quote: string
  model_used: string
}

export function useGenerateMoM() {
  return useMutation({
    mutationFn: async ({ transcript, mode = 'full_mom' }: { transcript: string; mode?: MeetingType }): Promise<MoMResponse> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mom`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ transcript, mode }),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate minutes')
      }

      return res.json()
    },
  })
}
