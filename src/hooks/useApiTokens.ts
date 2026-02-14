import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import type { ApiTokenRow, ApiTokenScope } from '@/types/database'

export function useApiTokens() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['api-tokens'],
    queryFn: async (): Promise<ApiTokenRow[]> => {
      const { data, error } = await supabase
        .from('meridian_api_tokens')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}

async function generateToken(): Promise<{ plaintext: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const plaintext = `mrd_${hex}`
  const prefix = plaintext.slice(0, 12) + '...'

  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return { plaintext, hash, prefix }
}

export function useCreateApiToken() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      name: string
      scopes: ApiTokenScope[]
      expires_at?: string | null
    }): Promise<{ token: ApiTokenRow; plaintext: string }> => {
      const { plaintext, hash, prefix } = await generateToken()

      const { data, error } = await supabase
        .from('meridian_api_tokens')
        .insert({
          user_id: user!.id,
          name: input.name,
          token_hash: hash,
          token_prefix: prefix,
          scopes: input.scopes,
          expires_at: input.expires_at || null,
          revoked_at: null,
          last_used_at: null,
        })
        .select()
        .single()

      if (error) throw error
      return { token: data, plaintext }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
    },
  })
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meridian_api_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
    },
  })
}

export function useDeleteApiToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meridian_api_tokens')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
    },
  })
}
