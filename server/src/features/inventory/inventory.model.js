import db from '../../config/db.js';

// ── Inventory catalog reads ──────────────────────────────────
// Item catalog + live stock. TiDB-safe: no FKs, equality joins only.

// Distinct active categories (e.g. Acid & Solvent, Chemicals, Glassware …).
export const getCategories = async () => {
  const [rows] = await db.execute(
    `SELECT DISTINCT category
     FROM inventory_items
     WHERE is_active = 1
     ORDER BY category`
  );
  return rows ?? [];
};

// All active items within one category, ordered by name.
export const getItemsByCategory = async (category) => {
  const [rows] = await db.execute(
    `SELECT item_id, category, subcategory, item_name, sub_name, unit,
            current_quantity, rack_location, is_returnable
     FROM inventory_items
     WHERE is_active = 1 AND category = ?
     ORDER BY item_name`,
    [category]
  );
  return rows ?? [];
};

// A single item by id (used for detail / validation).
export const getItemById = async (itemId) => {
  const [rows] = await db.execute(
    `SELECT item_id, category, subcategory, item_name, sub_name, unit,
            current_quantity, rack_location, is_returnable, is_active,
            created_at, updated_at
     FROM inventory_items
     WHERE item_id = ?
     LIMIT 1`,
    [Number(itemId)]
  );
  return rows?.[0] ?? null;
};

// Resolve item_name/unit/stock for a set of ids (server-authoritative snapshot
// when a request is created — never trust client-supplied names/units).
export const getItemsByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT item_id, item_name, unit, current_quantity, is_active
     FROM inventory_items
     WHERE item_id IN (${placeholders})`,
    ids.map(Number)
  );
  return rows ?? [];
};

// ── Request writes ───────────────────────────────────────────
// TiDB-safe: no FKs; child rows keyed by the parent insertId. Both accept an
// optional `conn` so they can enlist in the caller's transaction.
export const createRequest = async ({ studentId, requestType, purposeType, purpose }, conn) => {
  const exec = conn || db;
  const [result] = await exec.execute(
    `INSERT INTO inventory_requests (student_id, request_type, purpose_type, purpose, status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [Number(studentId), requestType, purposeType ?? null, purpose ?? null]
  );
  return result?.insertId ?? null;
};

export const addRequestItems = async (requestId, items, conn) => {
  const exec = conn || db;
  for (const it of items) {
    await exec.execute(
      `INSERT INTO inventory_request_items (request_id, item_id, item_name, quantity, unit)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(requestId), Number(it.item_id), it.item_name ?? null, it.quantity, it.unit ?? null]
    );
  }
};

// Header + its line items, created atomically (a request always has its items).
export const createRequestWithItems = async ({ studentId, requestType, purposeType, purpose, items }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const requestId = await createRequest({ studentId, requestType, purposeType, purpose }, conn);
    await addRequestItems(requestId, items, conn);
    await conn.commit();
    return requestId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// A student's requests (newest first) with their line items nested. Items for
// all requests are fetched in one IN(...) query, then grouped in app code.
export const listRequestsForStudent = async (studentId) => {
  const [reqs] = await db.execute(
    `SELECT request_id, student_id, request_type, purpose_type, purpose, status,
            approver_user_id, approver_role, decided_at, remarks, created_at, updated_at
     FROM inventory_requests
     WHERE student_id = ?
     ORDER BY created_at DESC`,
    [Number(studentId)]
  );
  if (!reqs.length) return [];
  const ids = reqs.map((r) => Number(r.request_id));
  const placeholders = ids.map(() => '?').join(',');
  const [items] = await db.execute(
    `SELECT line_id, request_id, item_id, item_name, quantity, unit, created_at
     FROM inventory_request_items
     WHERE request_id IN (${placeholders})
     ORDER BY line_id ASC`,
    ids
  );
  const byReq = {};
  for (const it of items) {
    (byReq[it.request_id] ||= []).push(it);
  }
  return reqs.map((r) => ({ ...r, items: byReq[r.request_id] || [] }));
};

// ── Stock management (Inventory Incharge role 4; Admin role 3) ──

// Full catalog with optional category + item_name-search filters.
export const listAllItems = async ({ category, search } = {}) => {
  const where = [];
  const params = [];
  if (category) { where.push('category = ?'); params.push(category); }
  if (search) { where.push('item_name LIKE ?'); params.push(`%${search}%`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.execute(
    `SELECT item_id, category, subcategory, item_name, sub_name, unit,
            current_quantity, rack_location, is_returnable, is_active,
            created_at, updated_at
     FROM inventory_items
     ${clause}
     ORDER BY category ASC, item_name ASC`,
    params
  );
  return rows ?? [];
};

// Set an item's quantity to an absolute value; log the delta (new - old) as a txn.
export const adjustStock = async (itemId, newQuantity, actorUserId, reason) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT current_quantity FROM inventory_items WHERE item_id = ? LIMIT 1`,
      [Number(itemId)]
    );
    if (!rows.length) { const e = new Error('Item not found'); e.status = 404; throw e; }
    const oldQty = Number(rows[0].current_quantity);
    const changeQty = Number(newQuantity) - oldQty;
    await conn.execute(
      `UPDATE inventory_items SET current_quantity = ? WHERE item_id = ?`,
      [Number(newQuantity), Number(itemId)]
    );
    await conn.execute(
      `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
       VALUES (?, ?, ?, NULL, ?)`,
      [Number(itemId), changeQty, reason || 'STOCK_EDIT', actorUserId != null ? Number(actorUserId) : null]
    );
    await conn.commit();
    return { item_id: Number(itemId), current_quantity: Number(newQuantity), change_qty: changeQty };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Add to an item's quantity (new arrivals); log +addQty as a STOCK_ADD txn.
export const addStock = async (itemId, addQty, actorUserId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT current_quantity FROM inventory_items WHERE item_id = ? LIMIT 1`,
      [Number(itemId)]
    );
    if (!rows.length) { const e = new Error('Item not found'); e.status = 404; throw e; }
    const newQty = Number(rows[0].current_quantity) + Number(addQty);
    await conn.execute(
      `UPDATE inventory_items SET current_quantity = ? WHERE item_id = ?`,
      [newQty, Number(itemId)]
    );
    await conn.execute(
      `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
       VALUES (?, ?, 'STOCK_ADD', NULL, ?)`,
      [Number(itemId), Number(addQty), actorUserId != null ? Number(actorUserId) : null]
    );
    await conn.commit();
    return { item_id: Number(itemId), current_quantity: newQty, change_qty: Number(addQty) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Create a brand-new catalog item; log its initial qty as a STOCK_ADD txn.
export const createItem = async (
  { category, subcategory, item_name, sub_name, unit, current_quantity, rack_location, is_returnable },
  actorUserId
) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const initialQty = Number(current_quantity || 0);
    const [result] = await conn.execute(
      `INSERT INTO inventory_items
         (category, subcategory, item_name, sub_name, unit, current_quantity, rack_location, is_returnable, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [category, subcategory ?? null, item_name, sub_name ?? null, unit ?? null, initialQty, rack_location ?? null, is_returnable ? 1 : 0]
    );
    const itemId = result.insertId;
    if (initialQty > 0) {
      await conn.execute(
        `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
         VALUES (?, ?, 'STOCK_ADD', NULL, ?)`,
        [Number(itemId), initialQty, actorUserId != null ? Number(actorUserId) : null]
      );
    }
    await conn.commit();
    return itemId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// All BUY requests (newest first) with student name/reg + nested items — incharge READ-ONLY view.
export const listAllBuyingRequests = async () => {
  const [reqs] = await db.execute(
    `SELECT r.request_id, r.student_id, s.name AS student_name, s.reg_num AS student_reg,
            r.request_type, r.purpose_type, r.purpose, r.status,
            r.approver_user_id, r.approver_role, r.decided_at, r.remarks, r.created_at, r.updated_at
     FROM inventory_requests r
     JOIN students s ON s.student_id = r.student_id
     WHERE r.request_type = 'BUY'
     ORDER BY r.created_at DESC`
  );
  if (!reqs.length) return [];
  const ids = reqs.map((r) => Number(r.request_id));
  const placeholders = ids.map(() => '?').join(',');
  const [items] = await db.execute(
    `SELECT line_id, request_id, item_id, item_name, quantity, unit
     FROM inventory_request_items
     WHERE request_id IN (${placeholders})
     ORDER BY line_id ASC`,
    ids
  );
  const byReq = {};
  for (const it of items) { (byReq[it.request_id] ||= []).push(it); }
  return reqs.map((r) => ({ ...r, items: byReq[r.request_id] || [] }));
};

// ── Faculty buying approval (role 2 by purpose; Admin role 3) ──

// All BUY requests for one purpose_type (PENDING actionable + decided), newest first.
export const listBuyingForApprover = async (purposeType) => {
  const [reqs] = await db.execute(
    `SELECT r.request_id, r.student_id, s.name AS student_name, s.reg_num AS student_reg,
            r.request_type, r.purpose_type, r.purpose, r.status,
            r.approver_user_id, r.approver_role, r.decided_at, r.remarks, r.created_at, r.updated_at
     FROM inventory_requests r
     JOIN students s ON s.student_id = r.student_id
     WHERE r.request_type = 'BUY' AND r.purpose_type = ?
     ORDER BY r.created_at DESC`,
    [purposeType]
  );
  if (!reqs.length) return [];
  const ids = reqs.map((r) => Number(r.request_id));
  const placeholders = ids.map(() => '?').join(',');
  const [items] = await db.execute(
    `SELECT line_id, request_id, item_id, item_name, quantity, unit
     FROM inventory_request_items
     WHERE request_id IN (${placeholders})
     ORDER BY line_id ASC`,
    ids
  );
  const byReq = {};
  for (const it of items) { (byReq[it.request_id] ||= []).push(it); }
  return reqs.map((r) => ({ ...r, items: byReq[r.request_id] || [] }));
};

// Single request header + items (used for approval authorization).
export const getRequestWithItems = async (requestId, conn) => {
  const exec = conn || db;
  const [rows] = await exec.execute(
    `SELECT request_id, student_id, request_type, purpose_type, purpose, status,
            approver_user_id, approver_role, decided_at, remarks, created_at, updated_at
     FROM inventory_requests WHERE request_id = ? LIMIT 1`,
    [Number(requestId)]
  );
  const header = rows?.[0];
  if (!header) return null;
  const [items] = await exec.execute(
    `SELECT line_id, request_id, item_id, item_name, quantity, unit
     FROM inventory_request_items WHERE request_id = ? ORDER BY line_id ASC`,
    [Number(requestId)]
  );
  return { ...header, items };
};

// Approve a BUY request: reduce stock per item atomically. If ANY item lacks
// enough stock, throw INSUFFICIENT_STOCK → full rollback (nothing changes).
export const approveBuyingRequest = async (requestId, approverUserId, approverRole) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [hrows] = await conn.execute(
      `SELECT request_id, request_type, status FROM inventory_requests WHERE request_id = ? LIMIT 1`,
      [Number(requestId)]
    );
    const header = hrows?.[0];
    if (!header) { const e = new Error('Request not found'); e.status = 404; throw e; }
    if (header.request_type !== 'BUY') { const e = new Error('Not a buying request'); e.status = 400; throw e; }
    if (header.status !== 'PENDING') { const e = new Error('Request is not pending'); e.status = 409; throw e; }

    const [items] = await conn.execute(
      `SELECT item_id, item_name, quantity FROM inventory_request_items WHERE request_id = ?`,
      [Number(requestId)]
    );
    if (!items.length) { const e = new Error('Request has no items'); e.status = 400; throw e; }

    // Pre-check stock for EVERY item before touching anything.
    for (const it of items) {
      const [srows] = await conn.execute(
        `SELECT current_quantity FROM inventory_items WHERE item_id = ? LIMIT 1`,
        [Number(it.item_id)]
      );
      const stock = srows?.[0];
      if (!stock) { const e = new Error(`Item ${it.item_id} not found`); e.status = 400; throw e; }
      if (Number(stock.current_quantity) < Number(it.quantity)) {
        const e = new Error('INSUFFICIENT_STOCK');
        e.code = 'INSUFFICIENT_STOCK';
        e.status = 409;
        e.item = it.item_name;
        throw e;
      }
    }

    // Reduce stock + log a negative BUY_APPROVED txn per item.
    for (const it of items) {
      await conn.execute(
        `UPDATE inventory_items SET current_quantity = current_quantity - ? WHERE item_id = ?`,
        [Number(it.quantity), Number(it.item_id)]
      );
      await conn.execute(
        `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
         VALUES (?, ?, 'BUY_APPROVED', ?, ?)`,
        [Number(it.item_id), -Number(it.quantity), Number(requestId), approverUserId != null ? Number(approverUserId) : null]
      );
    }

    await conn.execute(
      `UPDATE inventory_requests
       SET status = 'APPROVED', approver_user_id = ?, approver_role = ?, decided_at = NOW()
       WHERE request_id = ?`,
      [approverUserId != null ? Number(approverUserId) : null, approverRole != null ? Number(approverRole) : null, Number(requestId)]
    );

    await conn.commit();
    return { request_id: Number(requestId), status: 'APPROVED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Reject a BUY request — no stock change.
export const rejectBuyingRequest = async (requestId, approverUserId, approverRole, remarks) => {
  const [rows] = await db.execute(
    `SELECT status, request_type FROM inventory_requests WHERE request_id = ? LIMIT 1`,
    [Number(requestId)]
  );
  const header = rows?.[0];
  if (!header) { const e = new Error('Request not found'); e.status = 404; throw e; }
  if (header.request_type !== 'BUY') { const e = new Error('Not a buying request'); e.status = 400; throw e; }
  if (header.status !== 'PENDING') { const e = new Error('Request is not pending'); e.status = 409; throw e; }
  const [result] = await db.execute(
    `UPDATE inventory_requests
     SET status = 'REJECTED', approver_user_id = ?, approver_role = ?, decided_at = NOW(), remarks = ?
     WHERE request_id = ?`,
    [approverUserId != null ? Number(approverUserId) : null, approverRole != null ? Number(approverRole) : null, remarks ?? null, Number(requestId)]
  );
  return { request_id: Number(requestId), status: 'REJECTED', affected: result.affectedRows };
};

// ── TODO (Stage 5) — return flow ─────────────────────────────
// export const listReturnsForIncharge = async () => { /* WHERE request_type='RETURN' AND status='PENDING' */ };
// export const approveReturn = async (requestId, approverUserId, approverRole) => { /* mark APPROVED + add stock + log RETURN_APPROVED txn */ };
// export const checkPendingReturnBlock = async (studentId) => { /* true if a RETURN is still PENDING → block new BUY */ };
