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

export function usePolishEmail() {
  return useMutation({
    mutationFn: async (payload: {
      comment: string
      context: {
        issueTitle: string
        objectName: string
        issueType: string
        lifecycleStage: string
        status: string
        ownerAlias?: string | null
        commentAuthor: string
      }
    }): Promise<{ subject: string; body: string }> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polish-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate email')
      }

      return res.json()
    },
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
