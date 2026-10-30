-- ═══ REQUEST ITEM EDIT AUDIT — REMOVABLE (start) ═══
-- Adds the per-line edit audit used by
--   PATCH  /api/inventory/requests/:requestId/items/:lineId
--   DELETE /api/inventory/requests/:requestId/items/:lineId
-- Run by hand on live. Local boots add the same columns via server/src/config/db.js.
--
-- Run each ALTER once. If a column already exists (e.g. the server booted
-- against this DB first), MySQL/TiDB reports "Duplicate column name" —
-- that is safe to ignore. Check first with:
--   SHOW COLUMNS FROM inventory_request_items LIKE 'edited%';

ALTER TABLE inventory_request_items ADD COLUMN edited_by_user_id bigint NULL DEFAULT NULL;
ALTER TABLE inventory_request_items ADD COLUMN edited_at datetime NULL DEFAULT NULL;

-- Rollback:
--   ALTER TABLE inventory_request_items DROP COLUMN edited_by_user_id;
--   ALTER TABLE inventory_request_items DROP COLUMN edited_at;
-- ═══ REQUEST ITEM EDIT AUDIT — REMOVABLE (end) ═══
