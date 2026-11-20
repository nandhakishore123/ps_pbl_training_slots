-- ══ ITEM DELETE — REMOVABLE (start) ══
-- Soft delete for inventory catalog items, used by
--   DELETE /api/inventory/items/:itemId
--   POST   /api/inventory/items/:itemId/restore
-- NULL = active; set = removed. The row is never physically deleted, so every
-- history table (request items, obligations, lab purchases, stock txns) keeps
-- pointing at it.
-- Run by hand on live. Local boots add the same columns via server/src/config/db.js.
--
-- Run each ALTER once. If a column already exists (e.g. the server booted
-- against this DB first), MySQL/TiDB reports "Duplicate column name" —
-- that is safe to ignore. Check first with:
--   SHOW COLUMNS FROM inventory_items LIKE 'deleted%';

ALTER TABLE inventory_items ADD COLUMN deleted_at datetime NULL DEFAULT NULL;
ALTER TABLE inventory_items ADD COLUMN deleted_by_user_id bigint NULL DEFAULT NULL;

-- Rollback:
--   ALTER TABLE inventory_items DROP COLUMN deleted_at;
--   ALTER TABLE inventory_items DROP COLUMN deleted_by_user_id;
-- ══ ITEM DELETE — REMOVABLE (end) ══
