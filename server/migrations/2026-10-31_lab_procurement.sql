-- ══ LAB PROCUREMENT — REMOVABLE (start) ══
-- What a lab needs to buy from outside. Record only: never touches stock,
-- inventory_stock_txns or inventory_obligations; no approval step.
-- Run by hand on live. Local boots create the same table via
-- server/src/config/db.js (inventory schema check). Safe to re-run.

CREATE TABLE IF NOT EXISTS lab_procurement (
  procurement_id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  lab_id bigint NULL DEFAULT NULL,
  item_name varchar(255) NOT NULL,
  quantity decimal(12,2) NOT NULL,
  unit varchar(50) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (procurement_id),
  KEY idx_lab_proc_lab (lab_id),
  KEY idx_lab_proc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verify:
--   SHOW CREATE TABLE lab_procurement;
-- Rollback:
--   DROP TABLE lab_procurement;
-- ══ LAB PROCUREMENT — REMOVABLE (end) ══
