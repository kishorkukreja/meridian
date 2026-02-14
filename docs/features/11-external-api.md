# External Issues API

## Overview

The External Issues API allows programmatic access to the Meridian issue tracker from CI pipelines, scripts, and automation tools. It uses token-based authentication with scoped permissions.

## Authentication

All requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer mrd_<token>
```

### Token Management

Tokens are managed via the **Settings > API Tokens** page in the app (`/settings/api`).

- **Create**: Provide a name, select scopes, and optionally set an expiry date
- **Copy once**: The plaintext token is shown only at creation time
- **Revoke**: Disables a token immediately without deleting it
- **Delete**: Permanently removes the token

### Token Format

- Prefix: `mrd_` followed by 40 hex characters (160-bit entropy)
- Only the SHA-256 hash is stored in the database
- The `token_prefix` (first 12 chars) is stored for identification in the UI

### Scopes

| Scope | Permissions |
|-------|------------|
| `issues:read` | List issues, get single issue |
| `issues:write` | Create, update, close, archive issues |

## Base URL

```
https://<your-project>.supabase.co/functions/v1/issues-api
```

## Endpoints

### List Issues

```
GET /issues
```

**Scope**: `issues:read`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `open`, `in_progress`, `blocked`, `resolved`, `closed` |
| `issue_type` | string | Filter by type: `mapping`, `data_quality`, `dependency`, `signoff`, `technical`, `clarification`, `other` |
| `lifecycle_stage` | string | Filter by lifecycle stage |
| `object_id` | uuid | Filter by parent object |
| `limit` | number | Max results (default: 50, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Example:**

```bash
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://your-project.supabase.co/functions/v1/issues-api/issues?status=open&limit=10"
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Data mapping incomplete",
      "status": "open",
      "issue_type": "mapping",
      "lifecycle_stage": "mapping",
      "object_id": "uuid",
      "created_at": "2025-01-15T10:00:00Z",
      ...
    }
  ],
  "count": 1
}
```

### Get Issue

```
GET /issues/:id
```

**Scope**: `issues:read`

```bash
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://your-project.supabase.co/functions/v1/issues-api/issues/<issue-uuid>"
```

### Create Issue

```
POST /issues
```

**Scope**: `issues:write`

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Issue title |
| `object_id` | uuid | Parent object ID |
| `lifecycle_stage` | string | Stage where issue was found |
| `issue_type` | string | Type of issue |

**Optional fields:** `description`, `status`, `owner_alias`, `raised_by_alias`, `blocked_by_object_id`, `blocked_by_note`

```bash
curl -X POST \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ETL pipeline failing on region field",
    "object_id": "abc-123-def",
    "lifecycle_stage": "extraction",
    "issue_type": "technical",
    "description": "Region field has unexpected NULL values"
  }' \
  "https://your-project.supabase.co/functions/v1/issues-api/issues"
```

**Response:** `201 Created`

### Update Issue

```
PATCH /issues/:id
```

**Scope**: `issues:write`

**Updatable fields:** `title`, `description`, `issue_type`, `lifecycle_stage`, `status`, `owner_alias`, `raised_by_alias`, `blocked_by_object_id`, `blocked_by_note`, `decision`, `resolved_at`

```bash
curl -X PATCH \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "owner_alias": "john"}' \
  "https://your-project.supabase.co/functions/v1/issues-api/issues/<issue-uuid>"
```

### Close Issue

```
POST /issues/:id/close
```

**Scope**: `issues:write`

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `decision` | string | Resolution decision |

```bash
curl -X POST \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"decision": "Fixed by adding NULL handling in ETL step 3"}' \
  "https://your-project.supabase.co/functions/v1/issues-api/issues/<issue-uuid>/close"
```

### Archive Issue

```
DELETE /issues/:id
```

**Scope**: `issues:write`

Sets `is_archived: true` (soft delete).

```bash
curl -X DELETE \
  -H "Authorization: Bearer mrd_abc123..." \
  "https://your-project.supabase.co/functions/v1/issues-api/issues/<issue-uuid>"
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Description of what went wrong"
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing, invalid, expired, or revoked token |
| `FORBIDDEN` | 403 | Token lacks required scope |
| `NOT_FOUND` | 404 | Issue or endpoint not found |
| `VALIDATION_ERROR` | 400 | Missing required fields or invalid data |
| `INTERNAL` | 500 | Server error |

## Security

- Token plaintext is never stored; only the SHA-256 hash is persisted
- HTTPS enforced by Supabase infrastructure
- The service role key is only used server-side in the edge function
- Every database query is scoped to the token creator's `user_id`
- Token entropy: 2^160 (brute force infeasible)
- Scopes are checked before every operation

## Deployment

1. Run migration `006_api_tokens.sql` in Supabase SQL Editor
2. Deploy the edge function:
   ```bash
   supabase functions deploy issues-api
   ```
3. Create a token at `/settings/api` in the app
4. Test with curl using the examples above
