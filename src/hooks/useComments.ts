import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import type { CommentRow } from '@/types/database'

export function useComments(entityType: 'object' | 'issue', entityId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meridian_comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CommentRow[]
    },
    enabled: !!user && !!entityId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (comment: { entity_type: 'object' | 'issue'; entity_id: string; body: string; author_alias: string | null }) => {
      const { data, error } = await supabase
        .from('meridian_comments')
        .insert({ ...comment, user_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.entity_type, data.entity_id] })
    },
  })
}
