# Issues API Reference

The Issues API provides programmatic access to the Meridian issue tracker. Use it from CI pipelines, scripts, Power Automate flows, or any HTTP client that needs to create, query, or manage issues.

---

## Base URL

```
https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api
```

All endpoint paths below are relative to this base URL.

---

## Authentication

Every request must include a Bearer token in the `Authorization` header.

```
Authorization: Bearer mrd_your_token_here
```

### Getting a Token

1. Open the Meridian app and navigate to **Settings > API Tokens** (`/settings/api`)
2. Click **Create Token**
3. Enter a name, select the scopes you need, and optionally set an expiry date
4. Copy the token immediately -- it is shown only once

### Token Format

Tokens use the prefix `mrd_` followed by 40 hex characters (160-bit entropy). Only the SHA-256 hash is stored in the database. The plaintext token cannot be retrieved after creation.

### Scopes

| Scope | Grants access to |
|-------|-----------------|
| `issues:read` | `GET /issues`, `GET /issues/:id` |
| `issues:write` | `POST /issues`, `PATCH /issues/:id`, `POST /issues/:id/close`, `DELETE /issues/:id` |

A token with both scopes can perform all operations. If a token lacks the required scope for an endpoint, the API returns `403 Forbidden`.

---

## Endpoints

### List Issues

```
GET /issues
```

**Required scope:** `issues:read`

Returns a paginated list of non-archived issues belonging to the authenticated user.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | -- | Filter by status: `open`, `in_progress`, `blocked`, `resolved`, `closed` |
| `issue_type` | string | -- | Filter by type: `mapping`, `data_quality`, `dependency`, `signoff`, `technical`, `clarification`, `other` |
| `lifecycle_stage` | string | -- | Filter by lifecycle stage |
| `object_id` | uuid | -- | Filter by parent object |
| `limit` | number | 50 | Maximum results per page (max: 100) |
| `offset` | number | 0 | Number of results to skip for pagination |

**Response:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "title": "Data mapping incomplete for region field",
      "status": "open",
      "issue_type": "mapping",
      "lifecycle_stage": "mapping",
      "object_id": "e5f6a7b8-...",
      "description": "Region field has no source mapping defined",
      "owner_alias": "john",
      "raised_by_alias": "sarah",
      "decision": null,
      "resolved_at": null,
      "is_archived": false,
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Example:**

```bash
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues?status=open"
```

---

### Get Issue

```
GET /issues/:id
```

**Required scope:** `issues:read`

Returns a single issue by its UUID.

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "title": "Data mapping incomplete for region field",
    "status": "open",
    ...
  }
}
```

**Example:**

```bash
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues/a1b2c3d4-5678-90ab-cdef-1234567890ab"
```

---

### Create Issue

```
POST /issues
```

**Required scope:** `issues:write`

Creates a new issue linked to an existing object. The object must belong to the authenticated user.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Issue title |
| `object_id` | uuid | Yes | Parent object ID (must belong to the token's user) |
| `lifecycle_stage` | string | Yes | Stage where the issue was found |
| `issue_type` | string | Yes | Type of issue: `mapping`, `data_quality`, `dependency`, `signoff`, `technical`, `clarification`, `other` |
| `description` | string | No | Detailed description |
| `status` | string | No | Initial status (default: `open`) |
| `owner_alias` | string | No | Alias of the issue owner |
| `raised_by_alias` | string | No | Alias of the person who raised the issue |
| `blocked_by_object_id` | uuid | No | ID of the blocking object |
| `blocked_by_note` | string | No | Note about the blocker |

**Response:** `201 Created`

```json
{
  "data": {
    "id": "new-uuid-...",
    "title": "Data quality issue",
    "status": "open",
    "issue_type": "data_quality",
    "lifecycle_stage": "extraction",
    "object_id": "e5f6a7b8-...",
    "created_at": "2026-02-14T08:30:00.000Z",
    ...
  }
}
```

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Data quality issue",
    "object_id": "e5f6a7b8-1234-5678-90ab-cdef12345678",
    "lifecycle_stage": "extraction",
    "issue_type": "data_quality"
  }' \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues"
```

---

### Update Issue

```
PATCH /issues/:id
```

**Required scope:** `issues:write`

Updates one or more fields on an existing issue. Only the fields included in the request body are modified.

**Allowed fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Issue title |
| `description` | string | Detailed description |
| `issue_type` | string | Type of issue |
| `lifecycle_stage` | string | Lifecycle stage |
| `status` | string | Status value |
| `owner_alias` | string | Issue owner alias |
| `raised_by_alias` | string | Raiser alias |
| `blocked_by_object_id` | uuid | Blocking object ID |
| `blocked_by_note` | string | Blocker note |
| `decision` | string | Resolution decision text |
| `resolved_at` | timestamp | When the issue was resolved (ISO 8601) |

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "status": "in_progress",
    "owner_alias": "john",
    ...
  }
}
```

**Example:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "owner_alias": "john"}' \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues/a1b2c3d4-5678-90ab-cdef-1234567890ab"
```

---

### Close Issue

```
POST /issues/:id/close
```

**Required scope:** `issues:write`

Closes an issue with a decision. This is a convenience endpoint that automatically sets `status` to `closed` and `resolved_at` to the current timestamp.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `decision` | string | Yes | The resolution decision |

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "status": "closed",
    "decision": "Agreed to use fallback mapping table",
    "resolved_at": "2026-02-14T14:00:00.000Z",
    ...
  }
}
```

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"decision": "Agreed to use fallback mapping table"}' \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues/a1b2c3d4-5678-90ab-cdef-1234567890ab/close"
```

---

### Archive Issue

```
DELETE /issues/:id
```

**Required scope:** `issues:write`

Soft-deletes an issue by setting `is_archived` to `true`. The issue is no longer returned by the List endpoint but remains in the database.

**Response:**

```json
{
  "message": "Issue archived",
  "data": {
    "id": "a1b2c3d4-...",
    "is_archived": true,
    ...
  }
}
```

**Example:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer mrd_abc123..." \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues/a1b2c3d4-5678-90ab-cdef-1234567890ab"
```

---

## Error Responses

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of what went wrong"
  }
}
```

**Error codes:**

| Code | HTTP Status | When it occurs |
|------|-------------|----------------|
| `UNAUTHORIZED` | 401 | Missing token, invalid token, expired token, or revoked token |
| `FORBIDDEN` | 403 | Token is valid but lacks the required scope for the endpoint |
| `NOT_FOUND` | 404 | Issue UUID does not exist, does not belong to the user, or the endpoint path is invalid |
| `VALIDATION_ERROR` | 400 | Missing required fields, invalid JSON body, or referenced object not found |
| `INTERNAL` | 500 | Unexpected server error |

---

## Rate Limits

The API runs as a Supabase Edge Function on the free tier, which allows up to 2 million invocations per month. There is no per-minute rate limit enforced by the function itself, but Supabase infrastructure may throttle under heavy load.

---

## Cookbook

Common workflows you can copy and adapt.

### Create an issue from a CI pipeline

```bash
curl -X POST \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ETL pipeline failing on region field",
    "object_id": "e5f6a7b8-1234-5678-90ab-cdef12345678",
    "lifecycle_stage": "extraction",
    "issue_type": "technical",
    "description": "Region field has unexpected NULL values in staging table"
  }' \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues"
```

### List all open issues for a specific object

```bash
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues?status=open&object_id=e5f6a7b8-1234-5678-90ab-cdef12345678"
```

### Close an issue with a decision

```bash
curl -X POST \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"decision": "Agreed to use fallback mapping table"}' \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues/a1b2c3d4-5678-90ab-cdef-1234567890ab/close"
```

### Paginate through all issues

```bash
# Page 1
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues?limit=50&offset=0"

# Page 2
curl -H "Authorization: Bearer mrd_abc123..." \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues?limit=50&offset=50"
```

### Assign an owner and update status

```bash
curl -X PATCH \
  -H "Authorization: Bearer mrd_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "owner_alias": "john"}' \
  "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api/issues/a1b2c3d4-5678-90ab-cdef-1234567890ab"
```

---

## Deployment

The edge function source is at `supabase/functions/issues-api/index.ts`.

```bash
# Deploy the function
npx supabase functions deploy issues-api

# Verify it is running
curl -I "https://jqvdlzyaqqlbcyneqrnb.supabase.co/functions/v1/issues-api"
```

The function uses the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables, which are automatically available in the Supabase edge function runtime. No additional secrets are required for this function.

---

## Security Notes

- Token plaintext is never stored. Only the SHA-256 hash is persisted in the `meridian_api_tokens` table.
- All database queries are scoped to the `user_id` associated with the token, preventing cross-user data access.
- HTTPS is enforced by the Supabase infrastructure.
- The `SUPABASE_SERVICE_ROLE_KEY` is only used server-side inside the edge function and is never exposed to clients.
- Token entropy is 160 bits (brute-force infeasible).
- Scopes are checked on every request before any database operation is performed.
