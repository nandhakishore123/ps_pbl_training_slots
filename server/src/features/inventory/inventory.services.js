import * as model from './inventory.model.js';
// Canonical user_id → student_id resolver (single source of truth).
import { getStudentIdByUserId } from '../training/training.model.js';

// Typed errors — same pattern as survey.services (controller maps err.status).
const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.status = 404;
  return err;
};

const forbidden = (message) => {
  const err = new Error(message);
  err.status = 403;
  return err;
};

const conflict = (message) => {
  const err = new Error(message);
  err.status = 409;
  return err;
};

// Shown when a student is blocked from buying by an uncleared obligation.
const BLOCK_MESSAGE =
  'You must return/complete your previously taken items and get Inventory Incharge approval before requesting new items.';

// ── Buying approver routing (Stage 4) ────────────────────────
// The two designated faculty who approve buying requests, by user_id:
// PROJECT purpose → project approver; TRAINING purpose → training approver.
// Admin (role 3) bypasses this and can act on any request.
// TODO: replace with real faculty user_ids when provided
export const PROJECT_APPROVER_ID = 117;
export const TRAINING_APPROVER_ID = 119;

// Which purpose_type a caller may act on:
//   null       → admin (all purposes)
//   'PROJECT'  → project approver
//   'TRAINING' → training approver
//   undefined  → not an approver (forbidden)
const approverPurposeFor = (userId, roleId) => {
  if (Number(roleId) === 3) return null;
  if (Number(userId) === PROJECT_APPROVER_ID) return 'PROJECT';
  if (Number(userId) === TRAINING_APPROVER_ID) return 'TRAINING';
  return undefined;
};

// Throw 403 unless the caller may act on a request of `purposeType`.
const authorizeApprover = (userId, roleId, purposeType) => {
  const purpose = approverPurposeFor(userId, roleId);
  if (purpose === null) return; // admin
  if (purpose === undefined) throw forbidden('You are not assigned as an inventory approver');
  if (purpose !== String(purposeType || '').toUpperCase()) {
    throw forbidden(`You can only act on ${purpose} requests`);
  }
};

// ── Catalog reads ────────────────────────────────────────────
export const listCategories = async () => {
  return model.getCategories();
};

export const listItems = async (category) => {
  const clean = String(category ?? '').trim();
  if (!clean) throw badRequest('category is required');
  return model.getItemsByCategory(clean);
};

export const getItem = async (itemId) => {
  const item = await model.getItemById(itemId);
  if (!item) throw notFound('Item not found');
  return item;
};

// ── Student BUYING flow ──────────────────────────────────────
// Create a PENDING buying request with multiple items. Stock is NOT changed
// here — only on faculty approval (Stage 4). Item name/unit are resolved from
// inventory_items server-side (never trust client-supplied snapshots).
export const createBuyingRequest = async (userId, { purpose_type, purpose, items }) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');

  const purposeType = String(purpose_type ?? '').trim().toUpperCase();
  if (!['PROJECT', 'TRAINING'].includes(purposeType)) {
    throw badRequest('purpose_type must be PROJECT or TRAINING');
  }
  const purposeText = String(purpose ?? '').trim();
  if (!purposeText) throw badRequest('purpose is required');
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest('At least one item is required');
  }

  // Normalize + validate each line (item_id valid, quantity > 0).
  const cleaned = items.map((it) => ({
    item_id: Number(it?.item_id),
    quantity: Number(it?.quantity),
  }));
  for (const it of cleaned) {
    if (!it.item_id || Number.isNaN(it.item_id)) throw badRequest('Each item needs a valid item_id');
    if (!(it.quantity > 0)) throw badRequest('Each item quantity must be greater than 0');
  }

  // Server-authoritative snapshot of item_name + unit.
  const uniqueIds = [...new Set(cleaned.map((i) => i.item_id))];
  const dbItems = await model.getItemsByIds(uniqueIds);
  const byId = new Map(dbItems.map((r) => [Number(r.item_id), r]));
  const lineItems = cleaned.map((it) => {
    const row = byId.get(it.item_id);
    if (!row || Number(row.is_active) !== 1) throw badRequest(`Item ${it.item_id} not found or inactive`);
    return { item_id: it.item_id, item_name: row.item_name, unit: row.unit, quantity: it.quantity };
  });

  // Stage 5 — blocking gate: a student with ANY uncleared obligation (an approved
  // buy item not yet returned/completed AND incharge-approved) cannot buy again.
  const openObligations = await model.countOpenObligations(studentId);
  if (openObligations > 0) throw conflict(BLOCK_MESSAGE);

  const requestId = await model.createRequestWithItems({
    studentId,
    requestType: 'BUY',
    purposeType,
    purpose: purposeText,
    items: lineItems,
  });

  // Return the freshly-created request (header + items) for the Inventory Pass.
  const all = await model.listRequestsForStudent(studentId);
  return all.find((r) => Number(r.request_id) === Number(requestId))
    || { request_id: requestId, status: 'PENDING', purpose_type: purposeType, purpose: purposeText, items: lineItems };
};

export const listMyRequests = async (userId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  return model.listRequestsForStudent(studentId);
};

// ── Inventory Incharge (role 4) / Admin (role 3) — stock mgmt ─
export const getStock = async ({ category, search } = {}) => {
  return model.listAllItems({
    category: category ? String(category).trim() : undefined,
    search: search ? String(search).trim() : undefined,
  });
};

// Set an item's quantity to an absolute value (STOCK_EDIT).
export const editStock = async (userId, itemId, newQuantity) => {
  const id = Number(itemId);
  if (!id) throw badRequest('Invalid item id');
  const qty = Number(newQuantity);
  if (Number.isNaN(qty) || qty < 0) throw badRequest('quantity must be 0 or greater');
  return model.adjustStock(id, qty, userId, 'STOCK_EDIT');
};

// Add to an item's quantity — new arrivals (STOCK_ADD).
export const addStock = async (userId, itemId, addQty) => {
  const id = Number(itemId);
  if (!id) throw badRequest('Invalid item id');
  const qty = Number(addQty);
  if (!(qty > 0)) throw badRequest('quantity to add must be greater than 0');
  return model.addStock(id, qty, userId);
};

// Create a brand-new catalog item (category, item_name, unit required).
export const addNewItem = async (userId, payload = {}) => {
  const category = String(payload.category ?? '').trim();
  const itemName = String(payload.item_name ?? '').trim();
  const unit = String(payload.unit ?? '').trim();
  if (!category) throw badRequest('category is required');
  if (!itemName) throw badRequest('item_name is required');
  if (!unit) throw badRequest('unit is required');
  const initialQty = Number(payload.current_quantity ?? 0);
  if (Number.isNaN(initialQty) || initialQty < 0) throw badRequest('current_quantity must be 0 or greater');
  const itemId = await model.createItem({
    category,
    subcategory: payload.subcategory ? String(payload.subcategory).trim() : null,
    item_name: itemName,
    sub_name: payload.sub_name ? String(payload.sub_name).trim() : null,
    unit,
    current_quantity: initialQty,
    rack_location: payload.rack_location ? String(payload.rack_location).trim() : null,
    is_returnable: payload.is_returnable ? 1 : 0,
  }, userId);
  return { item_id: itemId };
};

// Read-only buying-request list for the incharge (cannot approve buying — Stage 4/faculty).
export const listBuyingReadOnly = async () => {
  return model.listAllBuyingRequests();
};

// ── Faculty buying approval (Stage 4) ────────────────────────
// List the buying requests this caller may approve, routed by purpose_type.
// Returns { scope, items } where scope is 'PROJECT' | 'TRAINING' | 'ALL'.
export const listBuyingForFaculty = async (userId, roleId, purposeTypeParam) => {
  const purpose = approverPurposeFor(userId, roleId);
  if (purpose === undefined) throw forbidden('You are not assigned as an inventory approver');

  if (purpose === null) {
    // Admin: honour an optional ?purpose_type filter, else return both.
    const p = String(purposeTypeParam || '').toUpperCase();
    if (['PROJECT', 'TRAINING'].includes(p)) {
      return { scope: p, items: await model.listBuyingForApprover(p) };
    }
    const [proj, train] = await Promise.all([
      model.listBuyingForApprover('PROJECT'),
      model.listBuyingForApprover('TRAINING'),
    ]);
    const all = [...proj, ...train].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { scope: 'ALL', items: all };
  }

  return { scope: purpose, items: await model.listBuyingForApprover(purpose) };
};

// Approve a buying request (authorize by purpose, then reduce stock atomically).
export const approveBuying = async (userId, roleId, requestId) => {
  const req = await model.getRequestWithItems(requestId);
  if (!req) throw notFound('Request not found');
  if (req.request_type !== 'BUY') throw badRequest('Not a buying request');
  authorizeApprover(userId, roleId, req.purpose_type);
  try {
    return await model.approveBuyingRequest(requestId, userId, roleId);
  } catch (err) {
    if (err?.code === 'INSUFFICIENT_STOCK') {
      const e = new Error(err.item ? `Insufficient stock for "${err.item}"` : 'Insufficient stock');
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

// Reject a buying request (authorize by purpose; no stock change).
export const rejectBuying = async (userId, roleId, requestId, remarks) => {
  const req = await model.getRequestWithItems(requestId);
  if (!req) throw notFound('Request not found');
  if (req.request_type !== 'BUY') throw badRequest('Not a buying request');
  authorizeApprover(userId, roleId, req.purpose_type);
  const cleanRemarks = remarks ? String(remarks).trim().slice(0, 255) : null;
  return model.rejectBuyingRequest(requestId, userId, roleId, cleanRemarks);
};

// ── Student return flow (Stage 5) ────────────────────────────
export const listMyOpenObligations = async (userId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  return model.listOpenObligations(studentId);
};

// lines: [{ obligation_id, action: 'RETURN'|'FULLY_COMPLETED', return_quantity? }]
export const createReturnRequest = async (userId, lines) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  if (!Array.isArray(lines) || lines.length === 0) throw badRequest('Select at least one item to return or complete');

  const cleaned = lines.map((l) => ({
    obligation_id: Number(l?.obligation_id),
    action: String(l?.action || '').toUpperCase(),
    return_quantity: l?.return_quantity != null ? Number(l.return_quantity) : null,
  }));
  const seen = new Set();
  for (const l of cleaned) {
    if (!l.obligation_id) throw badRequest('Each line needs an obligation_id');
    if (!['RETURN', 'FULLY_COMPLETED'].includes(l.action)) throw badRequest('action must be RETURN or FULLY_COMPLETED');
    if (seen.has(l.obligation_id)) throw badRequest('Duplicate item in return');
    seen.add(l.obligation_id);
  }

  // Server-authoritative: verify ownership + OPEN + quantity/returnable rules.
  const obls = await model.getObligationsByIds(studentId, cleaned.map((l) => l.obligation_id));
  const byId = new Map(obls.map((o) => [Number(o.obligation_id), o]));
  const resolved = cleaned.map((l) => {
    const o = byId.get(l.obligation_id);
    if (!o) throw badRequest('Obligation not found for this student');
    if (o.status !== 'OPEN') throw conflict('One of the selected items is no longer open');
    if (Number(o.is_returnable) === 1 && l.action === 'FULLY_COMPLETED') {
      throw badRequest(`"${o.item_name}" is returnable (e.g. glassware) and must be returned, not marked completed`);
    }
    if (l.action === 'RETURN') {
      if (!(l.return_quantity > 0)) throw badRequest(`Enter a return quantity for "${o.item_name}"`);
      if (l.return_quantity > Number(o.taken_quantity)) throw badRequest(`Return quantity for "${o.item_name}" exceeds the taken quantity`);
    }
    return {
      obligation_id: o.obligation_id,
      item_id: o.item_id,
      item_name: o.item_name,
      unit: o.unit,
      action: l.action,
      return_quantity: l.action === 'RETURN' ? l.return_quantity : null,
    };
  });

  const requestId = await model.createReturnWithLines(studentId, resolved);
  const all = await model.listReturnsForStudent(studentId);
  return all.find((r) => Number(r.request_id) === Number(requestId))
    || { request_id: requestId, status: 'PENDING', items: resolved };
};

export const listMyReturns = async (userId) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');
  return model.listReturnsForStudent(studentId);
};

// ── Incharge/Admin return approval (Stage 5) ─────────────────
export const listPendingReturns = async () => {
  // All RETURN requests (pending actionable + decided history), newest first.
  return model.listReturnRequests({ onlyPending: false });
};

export const approveReturn = async (userId, roleId, requestId) => {
  return model.approveReturnRequest(requestId, userId, roleId);
};

export const rejectReturn = async (userId, roleId, requestId, remarks) => {
  const clean = remarks ? String(remarks).trim().slice(0, 255) : null;
  return model.rejectReturnRequest(requestId, userId, roleId, clean);
};

// Read-only returns list (faculty may VIEW, not approve).
export const listReturnsReadOnly = async () => {
  return model.listReturnRequests({ onlyPending: false });
};

// ── Admin full view (Stage 6) ────────────────────────────────
// Admin (role 3) already has approve/reject/stock power via the shared endpoints
// (authorizeApprover bypasses purpose routing for role 3). These add the
// "see everything" reads for the admin console.
export const getAdminOverview = async () => model.getInventoryCounts();
export const listAllBuying = async () => model.listAllBuyingRequests();          // all BUY, both purposes, all statuses
export const listAllReturns = async () => model.listReturnRequests({ onlyPending: false });
