import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status)
}

// --- Token authentication ---

type TokenInfo = { user_id: string; scopes: string[] }

async function authenticateToken(
  authHeader: string | null,
  serviceClient: ReturnType<typeof createClient>
): Promise<{ token: TokenInfo | null; error: Response | null }> {
  if (!authHeader || !authHeader.startsWith('Bearer mrd_')) {
    return { token: null, error: errorResponse('UNAUTHORIZED', 'Missing or invalid API token. Expected: Bearer mrd_...', 401) }
  }

  const rawToken = authHeader.replace('Bearer ', '')

  // SHA-256 hash the token
  const encoder = new TextEncoder()
  const data = encoder.encode(rawToken)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const { data: tokenRow, error } = await serviceClient
    .from('meridian_api_tokens')
    .select('user_id, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !tokenRow) {
    return { token: null, error: errorResponse('UNAUTHORIZED', 'Invalid API token', 401) }
  }

  if (tokenRow.revoked_at) {
    return { token: null, error: errorResponse('UNAUTHORIZED', 'Token has been revoked', 401) }
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return { token: null, error: errorResponse('UNAUTHORIZED', 'Token has expired', 401) }
  }

  // Update last_used_at (fire-and-forget)
  serviceClient
    .from('meridian_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .then(() => {})

  return { token: { user_id: tokenRow.user_id, scopes: tokenRow.scopes }, error: null }
}

function hasScope(token: TokenInfo, scope: string): boolean {
  return token.scopes.includes(scope)
}

// --- Route parsing ---

type RouteMatch =
  | { route: 'list'; method: string }
  | { route: 'get'; method: string; id: string }
  | { route: 'create'; method: string }
  | { route: 'update'; method: string; id: string }
  | { route: 'close'; method: string; id: string }
  | { route: 'delete'; method: string; id: string }
  | null

function matchRoute(method: string, pathname: string): RouteMatch {
  // Normalize: remove trailing slash, extract path after /issues-api
  const parts = pathname.replace(/\/+$/, '').split('/issues-api')
  const path = parts.length > 1 ? parts[1] : ''

  // POST /issues/:id/close
  const closeMatch = path.match(/^\/issues\/([0-9a-f-]{36})\/close$/)
  if (closeMatch && method === 'POST') {
    return { route: 'close', method, id: closeMatch[1] }
  }

  // /issues/:id
  const idMatch = path.match(/^\/issues\/([0-9a-f-]{36})$/)
  if (idMatch) {
    if (method === 'GET') return { route: 'get', method, id: idMatch[1] }
    if (method === 'PATCH') return { route: 'update', method, id: idMatch[1] }
    if (method === 'DELETE') return { route: 'delete', method, id: idMatch[1] }
  }

  // /issues
  if (path === '/issues' || path === '') {
    if (method === 'GET') return { route: 'list', method }
    if (method === 'POST') return { route: 'create', method }
  }

  return null
}

// --- Handlers ---

async function handleListIssues(
  url: URL,
  serviceClient: ReturnType<typeof createClient>,
  token: TokenInfo
) {
  const params = url.searchParams
  let query = serviceClient
    .from('meridian_issues')
    .select('*')
    .eq('user_id', token.user_id)
    .eq('is_archived', false)

  if (params.get('status')) query = query.eq('status', params.get('status')!)
  if (params.get('issue_type')) query = query.eq('issue_type', params.get('issue_type')!)
  if (params.get('lifecycle_stage')) query = query.eq('lifecycle_stage', params.get('lifecycle_stage')!)
  if (params.get('object_id')) query = query.eq('object_id', params.get('object_id')!)

  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 100)
  const offset = parseInt(params.get('offset') || '0', 10)

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) return errorResponse('INTERNAL', error.message, 500)

  return jsonResponse({ data, count: data?.length ?? 0 })
}

async function handleGetIssue(
  id: string,
  serviceClient: ReturnType<typeof createClient>,
  token: TokenInfo
) {
  const { data, error } = await serviceClient
    .from('meridian_issues')
    .select('*')
    .eq('id', id)
    .eq('user_id', token.user_id)
    .single()

  if (error || !data) return errorResponse('NOT_FOUND', `Issue ${id} not found`, 404)
  return jsonResponse({ data })
}

async function handleCreateIssue(
  body: Record<string, unknown>,
  serviceClient: ReturnType<typeof createClient>,
  token: TokenInfo
) {
  const required = ['title', 'object_id', 'lifecycle_stage', 'issue_type']
  for (const field of required) {
    if (!body[field]) {
      return errorResponse('VALIDATION_ERROR', `Missing required field: ${field}`, 400)
    }
  }

  // Verify the object belongs to this user
  const { data: obj } = await serviceClient
    .from('meridian_objects')
    .select('id')
    .eq('id', body.object_id as string)
    .eq('user_id', token.user_id)
    .single()

  if (!obj) {
    return errorResponse('VALIDATION_ERROR', `Object ${body.object_id} not found or does not belong to you`, 400)
  }

  const insert = {
    user_id: token.user_id,
    title: body.title as string,
    object_id: body.object_id as string,
    lifecycle_stage: body.lifecycle_stage as string,
    issue_type: body.issue_type as string,
    description: (body.description as string) || null,
    status: (body.status as string) || 'open',
    owner_alias: (body.owner_alias as string) || null,
    raised_by_alias: (body.raised_by_alias as string) || null,
    blocked_by_object_id: (body.blocked_by_object_id as string) || null,
    blocked_by_note: (body.blocked_by_note as string) || null,
    is_archived: false,
  }

  const { data, error } = await serviceClient
    .from('meridian_issues')
    .insert(insert)
    .select()
    .single()

  if (error) return errorResponse('VALIDATION_ERROR', error.message, 400)
  return jsonResponse({ data }, 201)
}

async function handleUpdateIssue(
  id: string,
  body: Record<string, unknown>,
  serviceClient: ReturnType<typeof createClient>,
  token: TokenInfo
) {
  const allowedFields = [
    'title', 'description', 'issue_type', 'lifecycle_stage', 'status',
    'owner_alias', 'raised_by_alias', 'blocked_by_object_id', 'blocked_by_note',
    'decision', 'resolved_at',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('VALIDATION_ERROR', 'No valid fields to update', 400)
  }

  const { data, error } = await serviceClient
    .from('meridian_issues')
    .update(updates)
    .eq('id', id)
    .eq('user_id', token.user_id)
    .select()
    .single()

  if (error || !data) return errorResponse('NOT_FOUND', `Issue ${id} not found`, 404)
  return jsonResponse({ data })
}

async function handleCloseIssue(
  id: string,
  body: Record<string, unknown>,
  serviceClient: ReturnType<typeof createClient>,
  token: TokenInfo
) {
  const decision = body.decision as string
  if (!decision) {
    return errorResponse('VALIDATION_ERROR', 'Missing required field: decision', 400)
  }

  const { data, error } = await serviceClient
    .from('meridian_issues')
    .update({
      status: 'closed',
      decision,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', token.user_id)
    .select()
    .single()

  if (error || !data) return errorResponse('NOT_FOUND', `Issue ${id} not found`, 404)
  return jsonResponse({ data })
}

async function handleDeleteIssue(
  id: string,
  serviceClient: ReturnType<typeof createClient>,
  token: TokenInfo
) {
  const { data, error } = await serviceClient
    .from('meridian_issues')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', token.user_id)
    .select()
    .single()

  if (error || !data) return errorResponse('NOT_FOUND', `Issue ${id} not found`, 404)
  return jsonResponse({ message: 'Issue archived', data })
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    const { token, error: authError } = await authenticateToken(authHeader, serviceClient)
    if (authError || !token) return authError!

    const url = new URL(req.url)
    const route = matchRoute(req.method, url.pathname)

    if (!route) {
      return errorResponse('NOT_FOUND', 'Unknown endpoint. Available: GET/POST /issues, GET/PATCH/DELETE /issues/:id, POST /issues/:id/close', 404)
    }

    // Scope checks
    const readRoutes = ['list', 'get']
    const writeRoutes = ['create', 'update', 'close', 'delete']

    if (readRoutes.includes(route.route) && !hasScope(token, 'issues:read')) {
      return errorResponse('FORBIDDEN', 'Token lacks issues:read scope', 403)
    }
    if (writeRoutes.includes(route.route) && !hasScope(token, 'issues:write')) {
      return errorResponse('FORBIDDEN', 'Token lacks issues:write scope', 403)
    }

    // Parse body for write operations
    let body: Record<string, unknown> = {}
    if (['POST', 'PATCH'].includes(req.method)) {
      try {
        body = await req.json()
      } catch {
        return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400)
      }
    }

    switch (route.route) {
      case 'list':
        return handleListIssues(url, serviceClient, token)
      case 'get':
        return handleGetIssue(route.id, serviceClient, token)
      case 'create':
        return handleCreateIssue(body, serviceClient, token)
      case 'update':
        return handleUpdateIssue(route.id, body, serviceClient, token)
      case 'close':
        return handleCloseIssue(route.id, body, serviceClient, token)
      case 'delete':
        return handleDeleteIssue(route.id, serviceClient, token)
      default:
        return errorResponse('NOT_FOUND', 'Unknown route', 404)
    }
  } catch (err) {
    return errorResponse('INTERNAL', `Internal error: ${String(err)}`, 500)
  }
})
