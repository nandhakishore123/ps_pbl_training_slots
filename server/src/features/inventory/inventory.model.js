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
// is_returnable comes along too: createBuyingRequest needs to know whether the
// NEW cart contains a returnable item before it can apply the outstanding limit.
export const getItemsByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT item_id, item_name, unit, current_quantity, is_active, is_returnable
     FROM inventory_items
     WHERE item_id IN (${placeholders})`,
    ids.map(Number)
  );
  return rows ?? [];
};

// ── Request writes ───────────────────────────────────────────
// TiDB-safe: no FKs; child rows keyed by the parent insertId. Both accept an
// optional `conn` so they can enlist in the caller's transaction.
// `labId` is set for student BUY requests (validated in the service) and stays
// NULL everywhere else — the RETURN flow writes its own INSERT and never passes it.
// `projectGuideId` / `projectGuideName` behave identically: both are resolved and
// validated in the service (the name is read from `faculties`, never from the
// client) and both stay NULL on RETURN requests, which have no project guide.
export const createRequest = async ({ studentId, requestType, purposeType, purpose, labId, projectGuideId, projectGuideName }, conn) => {
  const exec = conn || db;
  const [result] = await exec.execute(
    `INSERT INTO inventory_requests (student_id, request_type, purpose_type, purpose, lab_id, project_guide_id, project_guide_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [Number(studentId), requestType, purposeType ?? null, purpose ?? null, labId != null ? Number(labId) : null,
     projectGuideId != null ? Number(projectGuideId) : null, projectGuideName ?? null]
  );
  return result?.insertId ?? null;
};

// requested_quantity is seeded from the same value as quantity: at creation they
// are by definition equal. They only diverge later, if an approver reduces
// `quantity` before approving — `requested_quantity` stays the student's
// original ask and becomes the ceiling for every subsequent edit.
export const addRequestItems = async (requestId, items, conn) => {
  const exec = conn || db;
  for (const it of items) {
    await exec.execute(
      `INSERT INTO inventory_request_items (request_id, item_id, item_name, quantity, unit, requested_quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(requestId), Number(it.item_id), it.item_name ?? null, it.quantity, it.unit ?? null, it.quantity]
    );
  }
};

// Header + its line items, created atomically (a request always has its items).
export const createRequestWithItems = async ({ studentId, requestType, purposeType, purpose, labId, projectGuideId, projectGuideName, items }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const requestId = await createRequest({ studentId, requestType, purposeType, purpose, labId, projectGuideId, projectGuideName }, conn);
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
  // LEFT JOIN labs: lab_id is NULL on RETURN requests and on BUY rows created
  // before the column existed — those must still be listed, with lab_name null.
  // project_guide_name needs no join at all: it is a snapshot column on
  // inventory_requests itself, and is NULL on those same RETURN/legacy rows.
  const [reqs] = await db.execute(
    `SELECT r.request_id, r.student_id, r.request_type, r.purpose_type, r.purpose, r.status,
            r.lab_id, l.lab_name, r.project_guide_id, r.project_guide_name,
            r.approver_user_id, r.approver_role, r.decided_at, r.remarks, r.created_at, r.updated_at
     FROM inventory_requests r
     LEFT JOIN labs l ON l.lab_id = r.lab_id
     WHERE r.student_id = ?
     ORDER BY r.created_at DESC`,
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

// Full item edit (Admin role 3 / Incharge role 4) — ADDITIVE.
// Writes the catalog fields AND (optionally) current_quantity in ONE transaction.
// A quantity change is logged as a STOCK_EDIT txn carrying the signed delta —
// the same idiom as adjustStock above — but ONLY when the value actually
// differs, so a field-only edit (e.g. fixing a rack location) adds no noise to
// the stock history.
export const updateItem = async (itemId, fields, actorUserId) => {
  // Editable columns. current_quantity is deliberately NOT here: it needs the
  // changed/unchanged check plus a txn row, handled separately below.
  const allowed = ['category', 'subcategory', 'item_name', 'sub_name', 'unit', 'rack_location', 'is_returnable'];
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT current_quantity FROM inventory_items WHERE item_id = ? LIMIT 1`,
      [Number(itemId)]
    );
    if (!rows.length) { const e = new Error('Item not found'); e.status = 404; throw e; }

    const sets = [];
    const params = [];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        sets.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }

    // Quantity: only written — and only logged — when it really changes.
    const oldQty = Number(rows[0].current_quantity);
    let changeQty = 0;
    if (Object.prototype.hasOwnProperty.call(fields, 'current_quantity')) {
      const newQty = Number(fields.current_quantity);
      if (newQty !== oldQty) {
        changeQty = newQty - oldQty;
        sets.push('current_quantity = ?');
        params.push(newQty);
      }
    }

    if (sets.length) {
      params.push(Number(itemId));
      await conn.execute(`UPDATE inventory_items SET ${sets.join(', ')} WHERE item_id = ?`, params);
    }
    if (changeQty !== 0) {
      await conn.execute(
        `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
         VALUES (?, ?, 'STOCK_EDIT', NULL, ?)`,
        [Number(itemId), changeQty, actorUserId != null ? Number(actorUserId) : null]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return getItemById(itemId);
};

// All BUY requests (newest first) with student name/reg + nested items — incharge READ-ONLY view.
export const listAllBuyingRequests = async () => {
  const [reqs] = await db.execute(
    `SELECT r.request_id, r.student_id, s.name AS student_name, s.reg_num AS student_reg,
            r.request_type, r.purpose_type, r.purpose, r.status, r.lab_id, l.lab_name,
            r.project_guide_id, r.project_guide_name,
            r.approver_user_id, r.approver_role, r.decided_at, r.remarks, r.created_at, r.updated_at
     FROM inventory_requests r
     JOIN students s ON s.student_id = r.student_id
     LEFT JOIN labs l ON l.lab_id = r.lab_id
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

// ── Admin overview counts (Stage 6) ──────────────────────────
export const LOW_STOCK_THRESHOLD = 10;
export const getInventoryCounts = async () => {
  const [[items]] = await db.execute(`SELECT COUNT(*) AS n FROM inventory_items WHERE is_active = 1`);
  const [[pb]] = await db.execute(`SELECT COUNT(*) AS n FROM inventory_requests WHERE request_type = 'BUY' AND status = 'PENDING'`);
  const [[pr]] = await db.execute(`SELECT COUNT(*) AS n FROM inventory_requests WHERE request_type = 'RETURN' AND status = 'PENDING'`);
  const [[obl]] = await db.execute(`SELECT COUNT(*) AS n FROM inventory_obligations WHERE status IN ('OPEN','RETURN_PENDING')`);
  const [[low]] = await db.execute(
    `SELECT COUNT(*) AS n FROM inventory_items WHERE is_active = 1 AND current_quantity <= ?`,
    [LOW_STOCK_THRESHOLD]
  );
  return {
    total_items: Number(items.n || 0),
    pending_buying: Number(pb.n || 0),
    pending_returns: Number(pr.n || 0),
    open_obligations: Number(obl.n || 0),
    low_stock: Number(low.n || 0),
    low_stock_threshold: LOW_STOCK_THRESHOLD,
  };
};

// ── Faculty buying approval (role 2 by purpose; Admin role 3) ──

// All BUY requests for one purpose_type (PENDING actionable + decided), newest first.
export const listBuyingForApprover = async (purposeType) => {
  const [reqs] = await db.execute(
    `SELECT r.request_id, r.student_id, s.name AS student_name, s.reg_num AS student_reg,
            r.request_type, r.purpose_type, r.purpose, r.status, r.lab_id, l.lab_name,
            r.project_guide_id, r.project_guide_name,
            r.approver_user_id, r.approver_role, r.decided_at, r.remarks, r.created_at, r.updated_at
     FROM inventory_requests r
     JOIN students s ON s.student_id = r.student_id
     LEFT JOIN labs l ON l.lab_id = r.lab_id
     WHERE r.request_type = 'BUY' AND r.purpose_type = ?
     ORDER BY r.created_at DESC`,
    [purposeType]
  );
  if (!reqs.length) return [];
  const ids = reqs.map((r) => Number(r.request_id));
  const placeholders = ids.map(() => '?').join(',');
  // requested_quantity rides along so the approval page can cap its quantity
  // input at the student's ORIGINAL ask rather than at the current (possibly
  // already reduced) value — otherwise a reduction is one-way in the UI until a
  // refresh. NULL on rows predating the column; the page falls back to quantity.
  const [items] = await db.execute(
    `SELECT line_id, request_id, item_id, item_name, quantity, requested_quantity, unit
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

// Approver edit of a PENDING BUY request's line quantities. ADDITIVE, and
// deliberately separate from approveBuyingRequest: because approval re-reads
// `quantity` straight off inventory_request_items, writing the reduced value
// here is all it takes for the stock decrement AND the obligation snapshot to
// follow. approveBuyingRequest is not touched.
//
// Rules per line, all enforced inside the transaction against freshly read rows:
//   • the line must belong to THIS request (the UPDATE re-guards on request_id),
//   • new qty must be a finite number >= 1,
//   • new qty <= requested_quantity — the student's ORIGINAL ask. Approvers may
//     reduce, never increase. Rows predating that column have it NULL, so the
//     current quantity stands in as the cap: still reduce-only, just anchored to
//     the only figure we can actually prove.
//   • new qty <= current stock, so a saved edit can never be one that approval
//     would then turn around and reject.
//
// The header is read FOR UPDATE so a concurrent approve/reject cannot slip in
// between the PENDING check and the write. requested_quantity is never written
// here — preserving it across repeated edits is the entire point of the column.
//
// actorUserId is accepted for symmetry with the other approver writes; there is
// no per-line audit table to record it in yet, and no stock moves here, so
// nothing is logged.
export const updatePendingRequestQuantities = async (requestId, edits, actorUserId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [hrows] = await conn.execute(
      `SELECT request_id, student_id, request_type, status
         FROM inventory_requests WHERE request_id = ? FOR UPDATE`,
      [Number(requestId)]
    );
    const header = hrows?.[0];
    if (!header) { const e = new Error('Request not found'); e.status = 404; throw e; }
    if (header.request_type !== 'BUY') { const e = new Error('Not a buying request'); e.status = 400; throw e; }
    if (header.status !== 'PENDING') { const e = new Error('Request is not pending'); e.status = 409; throw e; }

    for (const ed of edits) {
      const lineId = Number(ed.line_id);
      const newQty = Number(ed.quantity);
      if (!Number.isFinite(newQty) || newQty < 1) {
        const e = new Error('Each quantity must be a number of at least 1'); e.status = 400; throw e;
      }

      const [lrows] = await conn.execute(
        `SELECT line_id, item_id, item_name, quantity, requested_quantity
           FROM inventory_request_items
          WHERE line_id = ? AND request_id = ? LIMIT 1`,
        [lineId, Number(requestId)]
      );
      const line = lrows?.[0];
      if (!line) {
        const e = new Error(`Line ${lineId} does not belong to request ${requestId}`); e.status = 400; throw e;
      }

      const cap = line.requested_quantity != null ? Number(line.requested_quantity) : Number(line.quantity);
      if (newQty > cap) {
        const e = new Error(`Cannot increase "${line.item_name}" above the requested ${cap}`);
        e.status = 400; e.code = 'EXCEEDS_REQUESTED';
        throw e;
      }

      const [srows] = await conn.execute(
        `SELECT current_quantity FROM inventory_items WHERE item_id = ? LIMIT 1`,
        [Number(line.item_id)]
      );
      const stock = srows?.[0];
      if (!stock) { const e = new Error(`Item ${line.item_id} not found`); e.status = 400; throw e; }
      if (Number(stock.current_quantity) < newQty) {
        const e = new Error('INSUFFICIENT_STOCK');
        e.code = 'INSUFFICIENT_STOCK'; e.status = 409; e.item = line.item_name;
        throw e;
      }

      await conn.execute(
        `UPDATE inventory_request_items SET quantity = ? WHERE line_id = ? AND request_id = ?`,
        [newQty, lineId, Number(requestId)]
      );
    }

    const [items] = await conn.execute(
      `SELECT line_id, request_id, item_id, item_name, quantity, requested_quantity, unit
         FROM inventory_request_items WHERE request_id = ? ORDER BY line_id ASC`,
      [Number(requestId)]
    );
    await conn.commit();
    return { request_id: Number(requestId), items };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Approve a BUY request: reduce stock per item atomically. If ANY item lacks
// enough stock, throw INSUFFICIENT_STOCK → full rollback (nothing changes).
export const approveBuyingRequest = async (requestId, approverUserId, approverRole) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [hrows] = await conn.execute(
      `SELECT request_id, student_id, request_type, status FROM inventory_requests WHERE request_id = ? LIMIT 1`,
      [Number(requestId)]
    );
    const header = hrows?.[0];
    if (!header) { const e = new Error('Request not found'); e.status = 404; throw e; }
    if (header.request_type !== 'BUY') { const e = new Error('Not a buying request'); e.status = 400; throw e; }
    if (header.status !== 'PENDING') { const e = new Error('Request is not pending'); e.status = 409; throw e; }

    const [items] = await conn.execute(
      `SELECT line_id, item_id, item_name, quantity, unit FROM inventory_request_items WHERE request_id = ?`,
      [Number(requestId)]
    );
    if (!items.length) { const e = new Error('Request has no items'); e.status = 400; throw e; }

    // Pre-check stock for EVERY item; capture category/returnable for the obligation snapshot.
    const enriched = [];
    for (const it of items) {
      const [srows] = await conn.execute(
        `SELECT current_quantity, category, is_returnable FROM inventory_items WHERE item_id = ? LIMIT 1`,
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
      enriched.push({ ...it, category: stock.category, is_returnable: stock.is_returnable });
    }

    // Reduce stock + log a negative BUY_APPROVED txn per item.
    for (const it of enriched) {
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

    // Stage 5: each taken line item becomes an OPEN obligation for the student.
    for (const it of enriched) {
      await conn.execute(
        `INSERT INTO inventory_obligations
           (student_id, buy_request_id, buy_line_id, item_id, item_name, category, unit, taken_quantity, is_returnable, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
        [Number(header.student_id), Number(requestId), Number(it.line_id), Number(it.item_id),
          it.item_name ?? null, it.category ?? null, it.unit ?? null, Number(it.quantity), it.is_returnable ? 1 : 0]
      );
    }

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

// ── Stage 5 — obligations + return flow ──────────────────────

// Count of a student's uncleared obligations (OPEN or awaiting incharge = RETURN_PENDING).
// NOTE: this no longer gates buying — it was the old "any uncleared obligation blocks
// a new BUY" rule, superseded by countOutstandingRequests below. Kept as a plain read
// for callers that just want the raw uncleared-line count.
export const countOpenObligations = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS n FROM inventory_obligations
     WHERE student_id = ? AND status IN ('OPEN','RETURN_PENDING')`,
    [Number(studentId)]
  );
  return Number(rows?.[0]?.n || 0);
};

// How many BUY requests a student currently has OUTSTANDING — whatever is in
// them. This is the COUNT half of the buying limit (enforced in the service);
// hasOutstandingReturnable below is the other half.
//
// Two sources, because "outstanding" means different things at different points
// in a request's life:
//   (a) PENDING   → not yet decided, so the request itself is the outstanding
//                   thing. Counted regardless of contents (consumables included).
//   (b) APPROVED  → approval created one inventory_obligations row per line; the
//                   request stays outstanding while ANY of them is uncleared.
//                   RETURN_PENDING still counts: the incharge has not approved
//                   the return yet, so the items are not back on the shelf.
//
// A request is either PENDING or APPROVED, never both, and obligations only ever
// exist for APPROVED requests (approveBuyingRequest is the sole writer, and no
// path moves a request back to PENDING) — so the two sources are already disjoint.
// UNION (not UNION ALL) over the request ids makes that structural, not assumed:
// even if a row ever landed in both, the request is counted once. It also folds
// the many obligation rows of one approved request down to a single id.
export const countOutstandingRequests = async (studentId) => {
  const id = Number(studentId);
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS n FROM (
       SELECT r.request_id
         FROM inventory_requests r
        WHERE r.student_id = ?
          AND r.request_type = 'BUY'
          AND r.status = 'PENDING'
       UNION
       SELECT DISTINCT o.buy_request_id AS request_id
         FROM inventory_obligations o
        WHERE o.student_id = ?
          AND o.status IN ('OPEN','RETURN_PENDING')
     ) AS outstanding`,
    [id, id]
  );
  return Number(rows?.[0]?.n || 0);
};

// Is the student currently holding ANY returnable item they have not given back?
// Same two sources as countOutstandingRequests, narrowed to returnables — the
// returnable-ness of a request lives in a different table depending on its stage:
//   (a) APPROVED  → the obligation row snapshotted is_returnable at approval;
//                   uncleared = OPEN or RETURN_PENDING.
//   (b) PENDING   → no obligations exist yet, so it is read live off
//                   inventory_items through the request's line items.
// An existence test, not a count: two EXISTS subqueries OR-ed together let the
// engine stop at the first matching row on either side.
export const hasOutstandingReturnable = async (studentId) => {
  const id = Number(studentId);
  const [rows] = await db.execute(
    `SELECT (
       EXISTS (
         SELECT 1
           FROM inventory_obligations o
          WHERE o.student_id = ?
            AND o.is_returnable = 1
            AND o.status IN ('OPEN','RETURN_PENDING')
       )
       OR EXISTS (
         SELECT 1
           FROM inventory_requests r
           JOIN inventory_request_items ri ON ri.request_id = r.request_id
           JOIN inventory_items it ON it.item_id = ri.item_id
          WHERE r.student_id = ?
            AND r.request_type = 'BUY'
            AND r.status = 'PENDING'
            AND it.is_returnable = 1
       )
     ) AS held`,
    [id, id]
  );
  return Number(rows?.[0]?.held || 0) === 1;
};

// A student's still-OPEN obligations (actionable in the Returning tab).
export const listOpenObligations = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT obligation_id, buy_request_id, item_id, item_name, category, unit,
            taken_quantity, is_returnable, status
     FROM inventory_obligations
     WHERE student_id = ? AND status = 'OPEN'
     ORDER BY created_at ASC`,
    [Number(studentId)]
  );
  return rows ?? [];
};

// Fetch a set of obligations by id for a student (validation before creating a return).
export const getObligationsByIds = async (studentId, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT obligation_id, student_id, item_id, item_name, unit, taken_quantity, is_returnable, status
     FROM inventory_obligations
     WHERE student_id = ? AND obligation_id IN (${placeholders})`,
    [Number(studentId), ...ids.map(Number)]
  );
  return rows ?? [];
};

// Create a RETURN request (PENDING) + its lines, and flip the obligations to
// RETURN_PENDING. `lines` = [{ obligation_id, item_id, item_name, unit, action, return_quantity }].
export const createReturnWithLines = async (studentId, lines) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `INSERT INTO inventory_requests (student_id, request_type, purpose_type, purpose, status)
       VALUES (?, 'RETURN', NULL, NULL, 'PENDING')`,
      [Number(studentId)]
    );
    const requestId = result.insertId;
    for (const ln of lines) {
      const qty = ln.action === 'RETURN' ? Number(ln.return_quantity) : 0;
      await conn.execute(
        `INSERT INTO inventory_request_items
           (request_id, item_id, item_name, quantity, unit, obligation_id, action, return_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [Number(requestId), Number(ln.item_id), ln.item_name ?? null, qty, ln.unit ?? null,
          Number(ln.obligation_id), ln.action, ln.action === 'RETURN' ? Number(ln.return_quantity) : null]
      );
      await conn.execute(
        `UPDATE inventory_obligations SET status = 'RETURN_PENDING', return_request_id = ?
         WHERE obligation_id = ? AND student_id = ? AND status = 'OPEN'`,
        [Number(requestId), Number(ln.obligation_id), Number(studentId)]
      );
    }
    await conn.commit();
    return requestId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// A student's RETURN requests (newest first) with their lines nested.
export const listReturnsForStudent = async (studentId) => {
  const [reqs] = await db.execute(
    `SELECT request_id, status, remarks, decided_at, created_at, updated_at
     FROM inventory_requests
     WHERE student_id = ? AND request_type = 'RETURN'
     ORDER BY created_at DESC`,
    [Number(studentId)]
  );
  return attachReturnLines(reqs);
};

// All RETURN requests (optionally only PENDING) with student name/reg + lines. For incharge/admin/faculty.
export const listReturnRequests = async ({ onlyPending = false } = {}) => {
  const [reqs] = await db.execute(
    `SELECT r.request_id, r.student_id, s.name AS student_name, s.reg_num AS student_reg,
            r.status, r.remarks, r.approver_user_id, r.approver_role, r.decided_at, r.created_at, r.updated_at
     FROM inventory_requests r
     JOIN students s ON s.student_id = r.student_id
     WHERE r.request_type = 'RETURN'${onlyPending ? " AND r.status = 'PENDING'" : ''}
     ORDER BY r.created_at DESC`
  );
  return attachReturnLines(reqs);
};

// Helper: attach RETURN line items (with action/return_quantity) to a set of request headers.
const attachReturnLines = async (reqs) => {
  if (!reqs.length) return [];
  const ids = reqs.map((r) => Number(r.request_id));
  const placeholders = ids.map(() => '?').join(',');
  const [items] = await db.execute(
    `SELECT line_id, request_id, item_id, item_name, quantity, unit, obligation_id, action, return_quantity
     FROM inventory_request_items
     WHERE request_id IN (${placeholders})
     ORDER BY line_id ASC`,
    ids
  );
  const byReq = {};
  for (const it of items) { (byReq[it.request_id] ||= []).push(it); }
  return reqs.map((r) => ({ ...r, items: byReq[r.request_id] || [] }));
};

export const getReturnHeader = async (requestId, conn) => {
  const exec = conn || db;
  const [rows] = await exec.execute(
    `SELECT request_id, student_id, request_type, status FROM inventory_requests WHERE request_id = ? LIMIT 1`,
    [Number(requestId)]
  );
  return rows?.[0] ?? null;
};

// Approve a RETURN: for each RETURN line add stock back (+txn), and CLEAR its obligation.
// FULLY_COMPLETED lines change no stock — the obligation is still cleared.
export const approveReturnRequest = async (requestId, actorUserId, actorRole) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [hrows] = await conn.execute(
      `SELECT request_id, request_type, status FROM inventory_requests WHERE request_id = ? LIMIT 1`,
      [Number(requestId)]
    );
    const header = hrows?.[0];
    if (!header) { const e = new Error('Return request not found'); e.status = 404; throw e; }
    if (header.request_type !== 'RETURN') { const e = new Error('Not a return request'); e.status = 400; throw e; }
    if (header.status !== 'PENDING') { const e = new Error('Return is not pending'); e.status = 409; throw e; }

    const [lines] = await conn.execute(
      `SELECT line_id, item_id, item_name, quantity, obligation_id, action, return_quantity
       FROM inventory_request_items WHERE request_id = ?`,
      [Number(requestId)]
    );
    for (const ln of lines) {
      if (ln.action === 'RETURN') {
        const qty = Number(ln.return_quantity ?? ln.quantity);
        await conn.execute(
          `UPDATE inventory_items SET current_quantity = current_quantity + ? WHERE item_id = ?`,
          [qty, Number(ln.item_id)]
        );
        await conn.execute(
          `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
           VALUES (?, ?, 'RETURN_APPROVED', ?, ?)`,
          [Number(ln.item_id), qty, Number(requestId), actorUserId != null ? Number(actorUserId) : null]
        );
        await conn.execute(
          `UPDATE inventory_obligations
           SET status = 'CLEARED', returned_quantity = ?, cleared_at = NOW()
           WHERE obligation_id = ?`,
          [qty, Number(ln.obligation_id)]
        );
      } else {
        // FULLY_COMPLETED — no stock change; obligation cleared with 0 returned.
        await conn.execute(
          `UPDATE inventory_obligations
           SET status = 'CLEARED', returned_quantity = 0, cleared_at = NOW()
           WHERE obligation_id = ?`,
          [Number(ln.obligation_id)]
        );
      }
    }

    await conn.execute(
      `UPDATE inventory_requests
       SET status = 'APPROVED', approver_user_id = ?, approver_role = ?, decided_at = NOW()
       WHERE request_id = ?`,
      [actorUserId != null ? Number(actorUserId) : null, actorRole != null ? Number(actorRole) : null, Number(requestId)]
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

// Reject a RETURN: no stock change; its obligations revert to OPEN so the student can resubmit.
export const rejectReturnRequest = async (requestId, actorUserId, actorRole, remarks) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [hrows] = await conn.execute(
      `SELECT request_id, request_type, status FROM inventory_requests WHERE request_id = ? LIMIT 1`,
      [Number(requestId)]
    );
    const header = hrows?.[0];
    if (!header) { const e = new Error('Return request not found'); e.status = 404; throw e; }
    if (header.request_type !== 'RETURN') { const e = new Error('Not a return request'); e.status = 400; throw e; }
    if (header.status !== 'PENDING') { const e = new Error('Return is not pending'); e.status = 409; throw e; }

    await conn.execute(
      `UPDATE inventory_obligations SET status = 'OPEN', return_request_id = NULL
       WHERE return_request_id = ? AND status = 'RETURN_PENDING'`,
      [Number(requestId)]
    );
    await conn.execute(
      `UPDATE inventory_requests
       SET status = 'REJECTED', approver_user_id = ?, approver_role = ?, decided_at = NOW(), remarks = ?
       WHERE request_id = ?`,
      [actorUserId != null ? Number(actorUserId) : null, actorRole != null ? Number(actorRole) : null, remarks ?? null, Number(requestId)]
    );

    await conn.commit();
    return { request_id: Number(requestId), status: 'REJECTED' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Admin-configurable settings (key/value) ──────────────────
// Read the requested setting keys as an object { key: value }. Missing keys are
// simply absent from the result (caller applies its own fallback).
export const getInventorySettings = async (keys) => {
  const list = (Array.isArray(keys) ? keys : []).map((k) => String(k)).filter(Boolean);
  if (list.length === 0) return {};
  const placeholders = list.map(() => '?').join(', ');
  const [rows] = await db.execute(
    `SELECT setting_key, setting_value FROM inventory_settings WHERE setting_key IN (${placeholders})`,
    list
  );
  const out = {};
  for (const r of rows ?? []) out[r.setting_key] = r.setting_value;
  return out;
};

// Upsert a single setting. PK on setting_key → ON DUPLICATE KEY UPDATE.
export const setInventorySetting = async (key, value, userId) => {
  await db.execute(
    `INSERT INTO inventory_settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [String(key), value != null ? String(value) : null, userId != null ? Number(userId) : null]
  );
  return true;
};

// ── PROJECT GUIDE (student BUY requests) ─────────────────────
// Every real faculty, for the student's REQUIRED "Project Guide" dropdown.
// Deliberately NOT listApproverFaculty below: that one filters to role_id = 2
// (the approver pool, which is now a single person) and selects the email.
// `faculties` is the master list of named faculty regardless of what role their
// login carries, and a student must never receive faculty email addresses — so
// this returns id + name + department ONLY.
// `faculties` has picked up a few rows whose linked login is not a faculty at
// all — a student and an admin — and neither belongs in a project-guide picker.
// The filter EXCLUDES those two roles rather than requiring role 2, because
// faculty are being migrated to role 5: an allow-list on role 2 would empty this
// dropdown as that migration proceeds, while the deny-list keeps every genuine
// faculty whichever of the two roles they currently hold.
// Live: 26 rows → 24, dropping exactly the role-1 and role-3 strays.
export const listAllFaculty = async () => {
  const [rows] = await db.execute(
    `SELECT f.user_id, f.name, f.department
     FROM faculties f
     JOIN users u ON u.user_id = f.user_id
     WHERE u.is_active = 1 AND u.role_id NOT IN (1, 3)
     ORDER BY f.name ASC`
  );
  return rows ?? [];
};

// One faculty by users.user_id — the server-side resolve behind the project-guide
// snapshot, so the stored name is never a client-supplied string. Mirrors
// getLabById: returns the row or null, and the caller decides what a miss means.
// The role filter MUST match listAllFaculty above: the dropdown and the create
// -time check have to agree on who is a faculty, or a hand-crafted request could
// name someone the picker deliberately hides.
export const getFacultyById = async (userId) => {
  const [rows] = await db.execute(
    `SELECT f.user_id, f.name, f.department
     FROM faculties f
     JOIN users u ON u.user_id = f.user_id
     WHERE f.user_id = ? AND u.is_active = 1 AND u.role_id NOT IN (1, 3)
     LIMIT 1`,
    [Number(userId)]
  );
  return rows?.[0] ?? null;
};

// Active faculty (role 2) for the approver dropdown: user_id + name + email.
export const listApproverFaculty = async () => {
  const [rows] = await db.execute(
    `SELECT f.user_id, f.name, u.email
     FROM faculties f
     JOIN users u ON u.user_id = f.user_id
     WHERE u.role_id = 2 AND u.is_active = 1
     ORDER BY f.name ASC`
  );
  return rows ?? [];
};

// ═══════════════════════════════════════════════════════════════════════════
// LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (start)
// Labs master CRUD (admin), the per-lab purchase log, and the intern (role 5)
// direct-buy against the SHARED inventory_items pool — no request, no approval.
// To remove: delete this block plus the matching blocks in inventory.services.js,
// inventory.controller.js and inventory.routes.js.
// ═══════════════════════════════════════════════════════════════════════════

// ── Labs master ──────────────────────────────────────────────
export const listLabs = async ({ activeOnly = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT lab_id, lab_name, lab_code, in_charge, room_no, image_url, is_active, created_at, updated_at
     FROM labs
     ${activeOnly ? 'WHERE is_active = 1' : ''}
     ORDER BY lab_name ASC`
  );
  return rows ?? [];
};

export const getLabById = async (labId) => {
  const [rows] = await db.execute(
    `SELECT lab_id, lab_name, lab_code, in_charge, room_no, image_url, is_active, created_at, updated_at
     FROM labs WHERE lab_id = ? LIMIT 1`,
    [Number(labId)]
  );
  return rows?.[0] ?? null;
};

export const createLab = async ({ lab_name, lab_code, in_charge, room_no, image_url }) => {
  const [res] = await db.execute(
    `INSERT INTO labs (lab_name, lab_code, in_charge, room_no, image_url)
     VALUES (?, ?, ?, ?, ?)`,
    [lab_name, lab_code ?? null, in_charge ?? null, room_no ?? null, image_url ?? null]
  );
  return res?.insertId ?? null;
};

// Partial update — only the keys present in `fields` are written.
export const updateLab = async (labId, fields) => {
  const allowed = ['lab_name', 'lab_code', 'in_charge', 'room_no', 'image_url', 'is_active'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (!sets.length) return false;
  params.push(Number(labId));
  const [res] = await db.execute(`UPDATE labs SET ${sets.join(', ')} WHERE lab_id = ?`, params);
  return (res?.affectedRows ?? 0) > 0;
};

// Soft delete only — lab_purchases history keeps pointing at this lab_id.
export const deactivateLab = async (labId) => {
  const [res] = await db.execute(`UPDATE labs SET is_active = 0 WHERE lab_id = ?`, [Number(labId)]);
  return (res?.affectedRows ?? 0) > 0;
};

// ── Purchase log ─────────────────────────────────────────────
// `limit` null → the full log ("view full log"); a number → the recent few.
// The limit is inlined as a validated integer (TiDB dislikes a placeholder in LIMIT).
export const listLabPurchases = async (labId, limit) => {
  const clause = limit == null ? '' : `LIMIT ${Number(limit)}`;
  const [rows] = await db.execute(
    `SELECT purchase_id, lab_id, item_id, item_name, quantity, unit,
            buyer_user_id, buyer_name, created_at
     FROM lab_purchases
     WHERE lab_id = ?
     ORDER BY created_at DESC, purchase_id DESC
     ${clause}`,
    [Number(labId)]
  );
  return rows ?? [];
};

// Cross-lab purchase feed for the incharge/admin read-only view.
// lab_purchases stores ONE ROW PER ITEM with no purchase-group id, so a cart of
// three items is three rows sharing only (buyer_user_id, lab_id, created_at).
// Group on that triple in JS — same stitch-after-query approach as
// listAllBuyingRequests — so one cart renders as one card.
// LEFT JOIN labs so history survives if a lab row is ever hard-deleted.
export const listAllLabPurchases = async () => {
  const [rows] = await db.execute(
    `SELECT lp.purchase_id, lp.lab_id, l.lab_name, lp.item_id, lp.item_name,
            lp.quantity, lp.unit, lp.buyer_user_id, lp.buyer_name, lp.created_at,
            lp.lab_guide_id, lp.lab_guide_name, lp.purpose
     FROM lab_purchases lp
     LEFT JOIN labs l ON l.lab_id = lp.lab_id
     ORDER BY lp.created_at DESC, lp.purchase_id DESC`
  );

  const groups = [];
  const byKey = new Map();
  for (const r of rows ?? []) {
    // created_at is a Date from mysql2 — normalise to a stable scalar for the key.
    const stamp = r.created_at instanceof Date ? r.created_at.getTime() : String(r.created_at);
    const key = `${r.buyer_user_id ?? 'x'}|${r.lab_id ?? 'x'}|${stamp}`;
    let group = byKey.get(key);
    if (!group) {
      group = {
        purchase_key: key,
        purchase_id: r.purchase_id,          // first (newest) row id — stable React key
        lab_id: r.lab_id,
        lab_name: r.lab_name ?? null,
        buyer_user_id: r.buyer_user_id,
        buyer_name: r.buyer_name ?? null,
        // Cart-level, not item-level: every row of one cart carries identical
        // values, so taking the first row's is correct and they render once per
        // card. Deliberately NOT pushed into items[] below.
        lab_guide_id: r.lab_guide_id ?? null,
        lab_guide_name: r.lab_guide_name ?? null,
        purpose: r.purpose ?? null,
        created_at: r.created_at,
        items: [],
      };
      byKey.set(key, group);
      groups.push(group);                     // preserves the SQL ordering
    }
    group.items.push({
      purchase_id: r.purchase_id,
      item_id: r.item_id,
      item_name: r.item_name,
      quantity: r.quantity,
      unit: r.unit,
    });
  }
  return groups;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSUMPTION REPORT (students + interns) — REMOVABLE BLOCK (start)
// One flat view of what was actually TAKEN in a date range, across both flows.
//   Students → only APPROVED BUY requests, dated by decided_at (the moment
//              stock was actually decremented; created_at would credit the
//              wrong period for anything approved later).
//   Interns  → every lab_purchases row, dated by created_at (direct buys are
//              final on creation, so there is no separate decision moment).
// Quantities are deliberately NOT summed per member: units are mixed (pcs, ml,
// m…) and adding them would produce a meaningless number. Line items are
// counted instead.
// ═══════════════════════════════════════════════════════════════════════════
export const getConsumptionReport = async ({ from, to }) => {
  // Inclusive of the whole `to` day — callers pass plain YYYY-MM-DD dates.
  const fromTs = `${from} 00:00:00`;
  const toTs = `${to} 23:59:59`;

  // ── STUDENT side: approved buys only, one row per item line ──
  // LEFT JOIN labs so the report's Lab column populates for students too. LEFT,
  // not inner: requests predating inventory_requests.lab_id have it NULL and
  // must still be counted as consumption (they just show no lab).
  const [studentRows] = await db.execute(
    `SELECT s.name AS member_name, s.reg_num AS reg,
            i.item_name, i.quantity, i.unit, l.lab_name,
            r.project_guide_id, r.project_guide_name,
            r.request_id AS cart_id, r.decided_at AS date
     FROM inventory_requests r
     JOIN students s ON s.student_id = r.student_id
     JOIN inventory_request_items i ON i.request_id = r.request_id
     LEFT JOIN labs l ON l.lab_id = r.lab_id
     WHERE r.request_type = 'BUY'
       AND r.status = 'APPROVED'
       AND r.decided_at BETWEEN ? AND ?
     ORDER BY r.decided_at DESC`,
    [fromTs, toTs]
  );

  // ── INTERN side: every lab purchase row in range, NET of returns ──
  // INTERN LAB RETURNS (removable): a purchase that was later returned was not
  // consumed, so `quantity` alone overstates it. The correlated SUM subtracts
  // EVERY return booked against that purchase, regardless of when the return
  // happened — the report answers "of what was bought in this range, how much
  // was actually kept", and a return dated after `to` still means the item came
  // back. Returns are never added as rows of their own, so nothing is
  // double-counted. Revert this subquery if lab_returns is dropped.
  const [internRows] = await db.execute(
    // ROLE-5 SUB-TYPE (removable): up.member_subtype turns the flat "INTERN"
    // label into FACULTY / INTERN / TECHNICIAN. LEFT JOIN, not INNER: there is
    // no FK, buyer_user_id is nullable, and buyer_name is a snapshot — a
    // purchase whose buyer was deleted must still be counted as consumption.
    // The label is read live, so re-running an old range reflects the member's
    // CURRENT sub-type.
    `SELECT lp.buyer_name AS member_name, lp.buyer_user_id, l.lab_name,
            lp.item_name, lp.quantity, lp.unit,
            lp.lab_guide_id, lp.lab_guide_name, lp.purpose,
            up.member_subtype AS member_subtype,
            COALESCE((SELECT SUM(lr.quantity) FROM lab_returns lr
                      WHERE lr.purchase_id = lp.purchase_id), 0) AS returned_qty,
            lp.lab_id, lp.created_at AS date
     FROM lab_purchases lp
     LEFT JOIN labs l ON l.lab_id = lp.lab_id
     LEFT JOIN user_profiles up ON up.user_id = lp.buyer_user_id
     WHERE lp.created_at BETWEEN ? AND ?
     ORDER BY lp.created_at DESC`,
    [fromTs, toTs]
  );

  const details = [];
  for (const r of studentRows ?? []) {
    details.push({
      member_name: r.member_name ?? 'Unknown',
      member_type: 'STUDENT',
      reg: r.reg ?? null,
      lab_name: r.lab_name ?? null,
      // Snapshot taken when the request was created; NULL on rows predating the
      // column, exactly like lab_name above.
      project_guide_id: r.project_guide_id ?? null,
      project_guide_name: r.project_guide_name ?? null,
      item_name: r.item_name,
      quantity: r.quantity,
      unit: r.unit ?? null,
      date: r.date,
      cart_key: `S-${r.cart_id}`,          // one approved request = one cart
    });
  }
  for (const r of internRows ?? []) {
    // INTERN LAB RETURNS (removable): net consumed = bought − returned. A fully
    // returned purchase consumed nothing, so it is dropped rather than listed as
    // a 0-quantity line — otherwise it would still inflate total_line_items and
    // the per-member counts below.
    const netQty = Number((Number(r.quantity) - Number(r.returned_qty ?? 0)).toFixed(2));
    if (!(netQty > 0)) continue;
    // lab_purchases has no cart id — a cart is (buyer, lab, timestamp), the
    // same grouping listAllLabPurchases uses.
    const stamp = r.date instanceof Date ? r.date.getTime() : String(r.date);
    details.push({
      member_name: r.member_name ?? 'Unknown',
      // ROLE-5 SUB-TYPE (removable): was the literal 'INTERN'. NULL (never set,
      // or buyer row gone) coalesces back to 'INTERN' — the pre-feature label —
      // so no backfill is needed. Values: FACULTY | INTERN | TECHNICIAN.
      member_type: String(r.member_subtype ?? '').trim().toUpperCase() || 'INTERN',
      reg: null,
      lab_name: r.lab_name ?? null,
      // A lab purchase has no PROJECT guide, but it does now carry a LAB guide —
      // the same faculty list under a different label. Both flows feed the
      // report's single guide column, so the lab guide is surfaced through
      // project_guide_* here rather than adding a parallel column to the PDF.
      project_guide_id: r.lab_guide_id ?? null,
      project_guide_name: r.lab_guide_name ?? null,
      // Carried for completeness; the PDF does not render purpose for either flow.
      purpose: r.purpose ?? null,
      item_name: r.item_name,
      quantity: netQty,
      unit: r.unit ?? null,
      date: r.date,
      cart_key: `I-${r.buyer_user_id ?? 'x'}-${r.lab_id ?? 'x'}-${stamp}`,
    });
  }

  details.sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── Per-member summary ──
  const byMember = new Map();
  for (const d of details) {
    const key = `${d.member_type}|${d.member_name}`;
    let m = byMember.get(key);
    if (!m) {
      m = {
        member_name: d.member_name,
        member_type: d.member_type,
        reg: d.reg ?? null,
        total_line_items: 0,
        total_purchases: 0,
        items: [],              // distinct item names, for the report detail
        _carts: new Set(),
        _items: new Set(),
      };
      byMember.set(key, m);
    }
    m.total_line_items += 1;
    m._carts.add(d.cart_key);
    m._items.add(d.item_name);
    if (!m.reg && d.reg) m.reg = d.reg;
  }

  const summary = Array.from(byMember.values())
    .map((m) => {
      m.total_purchases = m._carts.size;
      m.items = Array.from(m._items);
      delete m._carts;
      delete m._items;
      return m;
    })
    .sort((a, b) => b.total_line_items - a.total_line_items || a.member_name.localeCompare(b.member_name));

  return {
    from,
    to,
    generated_at: new Date(),
    summary,
    details,
    totals: {
      members: summary.length,
      student_members: summary.filter((m) => m.member_type === 'STUDENT').length,
      intern_members: summary.filter((m) => m.member_type === 'INTERN').length,
      total_line_items: details.length,
    },
  };
};
// ═══ CONSUMPTION REPORT — REMOVABLE BLOCK (end) ═══

// ── Intern direct purchase (role 5) ──────────────────────────
// ONE transaction for the whole cart. Per item: lock the stock row FOR UPDATE,
// take min(requested, available) — a partial take is a normal outcome, not an
// error — then decrement, log a negative LAB_PURCHASE txn, and record the
// lab_purchases row. Items with taken = 0 write nothing but still appear in the
// summary as OUT_OF_STOCK. Unlike approveBuyingRequest (which pre-checks then
// writes, leaving a TOCTOU window), the row lock here makes the read and the
// write atomic, so concurrent carts cannot drive stock negative.
// `labGuideId` / `labGuideName` / `purpose` are validated and resolved in the
// service and written onto EVERY row of the cart — lab_purchases has no cart id,
// so this denormalisation is what lets the grouped reads surface them once.
export const purchaseForLab = async ({ labId, items, buyerUserId, buyerName, labGuideId, labGuideName, purpose }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the lab row too, so it cannot be deactivated mid-purchase.
    const [labRows] = await conn.execute(
      `SELECT lab_id, lab_name, is_active FROM labs WHERE lab_id = ? LIMIT 1 FOR UPDATE`,
      [Number(labId)]
    );
    const lab = labRows?.[0];
    if (!lab) { const e = new Error('Lab not found'); e.status = 404; throw e; }
    if (Number(lab.is_active) !== 1) { const e = new Error('Lab is inactive'); e.status = 400; throw e; }

    // The JWT `name` is Google-supplied and can be absent for non-student roles;
    // fall back to the admin-entered profile name, then to the login email, so
    // the log never shows an anonymous buyer.
    let resolvedBuyer = buyerName ? String(buyerName).trim().slice(0, 150) : '';
    if (!resolvedBuyer && buyerUserId != null) {
      // USER MANAGEMENT — removable: name set by an admin in Manage Users.
      const [pRows] = await conn.execute(`SELECT name FROM user_profiles WHERE user_id = ? LIMIT 1`, [Number(buyerUserId)]);
      resolvedBuyer = pRows?.[0]?.name ? String(pRows[0].name).trim().slice(0, 150) : '';
    }
    if (!resolvedBuyer && buyerUserId != null) {
      const [uRows] = await conn.execute(`SELECT email FROM users WHERE user_id = ? LIMIT 1`, [Number(buyerUserId)]);
      resolvedBuyer = uRows?.[0]?.email ? String(uRows[0].email).slice(0, 150) : '';
    }

    const results = [];
    for (const it of items) {
      const itemId = Number(it.item_id);
      const requested = Number(it.quantity);

      const [srows] = await conn.execute(
        `SELECT item_id, item_name, unit, current_quantity, is_active
         FROM inventory_items WHERE item_id = ? LIMIT 1 FOR UPDATE`,
        [itemId]
      );
      const stock = srows?.[0];
      if (!stock) { const e = new Error(`Item ${itemId} not found`); e.status = 400; throw e; }
      if (Number(stock.is_active) !== 1) { const e = new Error(`Item ${itemId} is inactive`); e.status = 400; throw e; }

      const available = Math.max(0, Number(stock.current_quantity));
      const taken = Math.min(requested, available);

      if (taken > 0) {
        await conn.execute(
          `UPDATE inventory_items SET current_quantity = current_quantity - ? WHERE item_id = ?`,
          [taken, itemId]
        );
        await conn.execute(
          `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
           VALUES (?, ?, 'LAB_PURCHASE', NULL, ?)`,
          [itemId, -taken, buyerUserId != null ? Number(buyerUserId) : null]
        );
        await conn.execute(
          `INSERT INTO lab_purchases (lab_id, item_id, item_name, quantity, unit, buyer_user_id, buyer_name,
                                      lab_guide_id, lab_guide_name, purpose)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [Number(labId), itemId, stock.item_name ?? null, taken, stock.unit ?? null,
            buyerUserId != null ? Number(buyerUserId) : null, resolvedBuyer || null,
            labGuideId != null ? Number(labGuideId) : null, labGuideName ?? null, purpose ?? null]
        );
      }

      results.push({
        item_id: itemId,
        item_name: stock.item_name ?? null,
        unit: stock.unit ?? null,
        requested,
        taken,
        shortfall: Number((requested - taken).toFixed(2)),
        status: taken === requested ? 'FULL' : (taken > 0 ? 'PARTIAL' : 'OUT_OF_STOCK'),
      });
    }

    await conn.commit();
    return {
      lab: { lab_id: Number(lab.lab_id), lab_name: lab.lab_name },
      // Echoed back so the summary popup can show them without a re-fetch. These
      // are the resolved/validated values, not whatever the client sent.
      lab_guide_id: labGuideId != null ? Number(labGuideId) : null,
      lab_guide_name: labGuideName ?? null,
      purpose: purpose ?? null,
      results,
      summary: {
        total_items: results.length,
        fully: results.filter((r) => r.status === 'FULL').length,
        partial: results.filter((r) => r.status === 'PARTIAL').length,
        out_of_stock: results.filter((r) => r.status === 'OUT_OF_STOCK').length,
      },
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
// ═══ LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (end) ═══

// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (start) ═══════════════════════════
// An intern returns some/all of ONE of their OWN past lab purchases. Direct (no
// approval, mirroring the direct buy), per-lab (the lab is DERIVED from the
// purchase, never chosen by the caller), and capped at
// purchased − already-returned so the pool can never be over-credited.
// To remove: delete this block, the lab_returns net in getConsumptionReport,
// the service/controller/route entries, then DROP TABLE lab_returns.

// This intern's OWN purchases that still have something left to return.
// remaining_returnable = quantity − SUM(returns against that purchase).
// Owner filtering is done in SQL (buyer_user_id = ?) — the caller passes the id
// from the JWT, never from the request body. Rows with nothing left are dropped
// by the outer WHERE so the Returns list only ever shows actionable purchases.
// The correlated SUM sits in a derived table so the computed column can be
// filtered without a HAVING-without-GROUP-BY.
export const listMyReturnablePurchases = async (userId) => {
  const [rows] = await db.execute(
    `SELECT purchase_id, lab_id, lab_name, item_id, item_name, unit,
            purchased_qty, already_returned,
            (purchased_qty - already_returned) AS remaining_returnable,
            created_at
     FROM (
       SELECT lp.purchase_id, lp.lab_id, l.lab_name, lp.item_id, lp.item_name, lp.unit,
              lp.quantity AS purchased_qty,
              COALESCE((SELECT SUM(lr.quantity) FROM lab_returns lr
                        WHERE lr.purchase_id = lp.purchase_id), 0) AS already_returned,
              lp.created_at
       FROM lab_purchases lp
       LEFT JOIN labs l ON l.lab_id = lp.lab_id
       WHERE lp.buyer_user_id = ?
     ) t
     WHERE purchased_qty - already_returned > 0
     ORDER BY created_at DESC, purchase_id DESC`,
    [Number(userId)]
  );
  // decimal(12,2) arrives as a string from mysql2 — normalise the three numbers
  // the caller does arithmetic/comparisons on.
  return (rows ?? []).map((r) => ({
    ...r,
    purchased_qty: Number(r.purchased_qty),
    already_returned: Number(r.already_returned),
    remaining_returnable: Number(r.remaining_returnable),
  }));
};

// Record ONE return against ONE purchase, in a single transaction.
// The purchase row is locked FOR UPDATE (same idiom as purchaseForLab) BEFORE
// the already-returned SUM is read, so two concurrent returns on the same
// purchase serialise on that lock and cannot both pass the cap check.
// Stock is added back with the relative-increment idiom from approveReturnRequest.
export const returnLabPurchase = async ({ purchase_id, quantity, returnerUserId, returnerName }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [prows] = await conn.execute(
      `SELECT purchase_id, lab_id, item_id, item_name, quantity, unit, buyer_user_id
       FROM lab_purchases WHERE purchase_id = ? LIMIT 1 FOR UPDATE`,
      [Number(purchase_id)]
    );
    const purchase = prows?.[0];
    if (!purchase) { const e = new Error('Purchase not found'); e.status = 404; throw e; }

    // OWNERSHIP — an intern may only return against their own purchase. Checked
    // against the locked row, never against anything the client sent.
    if (returnerUserId == null || Number(purchase.buyer_user_id) !== Number(returnerUserId)) {
      const e = new Error('You can only return items from your own purchases');
      e.status = 403;
      throw e;
    }

    const [srows] = await conn.execute(
      `SELECT COALESCE(SUM(quantity), 0) AS returned FROM lab_returns WHERE purchase_id = ?`,
      [Number(purchase_id)]
    );
    const alreadyReturned = Number(srows?.[0]?.returned ?? 0);
    const purchasedQty = Number(purchase.quantity);
    const remaining = Number((purchasedQty - alreadyReturned).toFixed(2));

    const qty = Number(quantity);
    if (!(qty > 0)) { const e = new Error('Return quantity must be greater than 0'); e.status = 400; throw e; }
    if (qty > remaining) {
      const e = new Error(
        remaining > 0
          ? `Cannot return more than ${remaining} ${purchase.unit || ''}`.trim() + ` remaining for "${purchase.item_name}"`
          : `"${purchase.item_name}" has already been fully returned`
      );
      e.status = 400;
      throw e;
    }

    // Same buyer_name resolution as purchaseForLab: JWT name → admin-entered
    // profile name → login email, so the log never shows an anonymous returner.
    let resolvedReturner = returnerName ? String(returnerName).trim().slice(0, 150) : '';
    if (!resolvedReturner && returnerUserId != null) {
      // USER MANAGEMENT — removable: name set by an admin in Manage Users.
      const [pfRows] = await conn.execute(`SELECT name FROM user_profiles WHERE user_id = ? LIMIT 1`, [Number(returnerUserId)]);
      resolvedReturner = pfRows?.[0]?.name ? String(pfRows[0].name).trim().slice(0, 150) : '';
    }
    if (!resolvedReturner && returnerUserId != null) {
      const [uRows] = await conn.execute(`SELECT email FROM users WHERE user_id = ? LIMIT 1`, [Number(returnerUserId)]);
      resolvedReturner = uRows?.[0]?.email ? String(uRows[0].email).slice(0, 150) : '';
    }

    await conn.execute(
      `UPDATE inventory_items SET current_quantity = current_quantity + ? WHERE item_id = ?`,
      [qty, Number(purchase.item_id)]
    );
    // request_id is NULL — a lab return has no inventory_requests row, exactly
    // like the negative 'LAB_PURCHASE' txn it reverses.
    await conn.execute(
      `INSERT INTO inventory_stock_txns (item_id, change_qty, reason, request_id, actor_user_id)
       VALUES (?, ?, 'LAB_RETURN', NULL, ?)`,
      [Number(purchase.item_id), qty, returnerUserId != null ? Number(returnerUserId) : null]
    );
    await conn.execute(
      `INSERT INTO lab_returns (purchase_id, lab_id, item_id, item_name, quantity, unit, returner_user_id, returner_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Number(purchase.purchase_id), Number(purchase.lab_id), Number(purchase.item_id),
        purchase.item_name ?? null, qty, purchase.unit ?? null,
        returnerUserId != null ? Number(returnerUserId) : null, resolvedReturner || null]
    );

    await conn.commit();
    return {
      purchase_id: Number(purchase.purchase_id),
      lab_id: Number(purchase.lab_id),
      item_id: Number(purchase.item_id),
      item_name: purchase.item_name ?? null,
      unit: purchase.unit ?? null,
      returned: qty,
      remaining_after: Number((remaining - qty).toFixed(2)),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (end) ═════════════════════════════
