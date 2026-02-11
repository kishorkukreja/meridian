# Feature: Archiving

## Purpose
Keep the active view clean by removing completed and closed items from default views. Archived data is still queryable but out of the way.

## Rules

### Objects
- When status is changed to `completed`, the object remains visible in default views.
- After 30 days at `completed` status, the object becomes eligible for archiving.
- Archiving is manual: a button on the object or a bulk action. Not automatic.
- Archived objects have `is_archived = true`.
- Archived objects are excluded from all default views via the base filter `is_archived = false`.

### Issues
- When status is changed to `closed`, the issue is hidden from default issue views (filtered by status).
- After 30 days at `closed` status, the issue becomes eligible for archiving.
- Same manual archive action.
- Archived issues have `is_archived = true`.

### Stage History
- Stage history is never archived. It's lightweight and serves as the permanent audit trail.

## Archive View

A dedicated "Archive" page accessible from the sidebar. Shows all archived objects and issues.

Same table layout as the active views, but:
- No aging column (irrelevant)
- Shows "archived_on" date (this would be the `updated_at` when `is_archived` was set to true)
- Includes a "Restore" action to bring items back to active status

## Restore Flow

Restoring an archived item:
- Sets `is_archived = false`
- For objects: resets status to `on_track` (user can change after)
- For issues: resets status to `open` (user can change after)
- Item reappears in active views

## Data Retention

No automatic deletion. All data stays in the database indefinitely. The archive is a soft filter, not a hard delete.

If the database grows too large (unlikely at this scale), a future cleanup job could move archived items to a separate `archive_objects` / `archive_issues` table. Not needed for v1.

## Bulk Archive

On the objects list page, allow selecting multiple completed objects and archiving them in one action. Same for closed issues on the issues list page.
