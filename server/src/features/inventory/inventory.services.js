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
// These IDs are now admin-configurable (inventory_settings); the constants below
// are the FALLBACK used until an admin saves values, so nothing breaks in between.
export const PROJECT_APPROVER_ID = 117;
export const TRAINING_APPROVER_ID = 119;

const PROJECT_APPROVER_KEY = 'project_approver_user_id';
const TRAINING_APPROVER_KEY = 'training_approver_user_id';

// Effective approver user_ids: the DB setting when it's a valid positive integer,
// otherwise the hardcoded fallback. Single source of truth for both the routing
// checks and the admin GET endpoint.
const getApproverIds = async () => {
  const settings = await model.getInventorySettings([PROJECT_APPROVER_KEY, TRAINING_APPROVER_KEY]);
  const project = Number(settings[PROJECT_APPROVER_KEY]);
  const training = Number(settings[TRAINING_APPROVER_KEY]);
  return {
    project: Number.isInteger(project) && project > 0 ? project : PROJECT_APPROVER_ID,
    training: Number.isInteger(training) && training > 0 ? training : TRAINING_APPROVER_ID,
  };
};

// Which purpose_type a caller may act on:
//   null       → admin (all purposes)
//   'PROJECT'  → project approver
//   'TRAINING' → training approver
//   undefined  → not an approver (forbidden)
const approverPurposeFor = async (userId, roleId) => {
  if (Number(roleId) === 3) return null;
  const { project, training } = await getApproverIds();
  if (Number(userId) === project) return 'PROJECT';
  if (Number(userId) === training) return 'TRAINING';
  return undefined;
};

// Throw 403 unless the caller may act on a request of `purposeType`.
const authorizeApprover = async (userId, roleId, purposeType) => {
  const purpose = await approverPurposeFor(userId, roleId);
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
  const purpose = await approverPurposeFor(userId, roleId);
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
  await authorizeApprover(userId, roleId, req.purpose_type);
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
  await authorizeApprover(userId, roleId, req.purpose_type);
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

// ── Admin-configurable approvers (Stage 7) ───────────────────
// Return the EFFECTIVE approver user_ids (DB value or fallback). Readable by any
// authenticated user (faculty need it to gate the Inventory Approval box).
export const getApprovers = async () => {
  const { project, training } = await getApproverIds();
  return { project_approver_user_id: project, training_approver_user_id: training };
};

// Admin-only: set both approver user_ids. Each must be a positive integer that is
// an active faculty (role 2). Saved as strings into inventory_settings.
export const setApprovers = async (userId, payload = {}) => {
  const project = Number(payload.project_approver_user_id);
  const training = Number(payload.training_approver_user_id);
  if (!Number.isInteger(project) || project <= 0) throw badRequest('project_approver_user_id must be a valid faculty');
  if (!Number.isInteger(training) || training <= 0) throw badRequest('training_approver_user_id must be a valid faculty');

  const faculty = await model.listApproverFaculty();
  const validIds = new Set(faculty.map((f) => Number(f.user_id)));
  if (!validIds.has(project)) throw badRequest('Selected Project approver is not an active faculty');
  if (!validIds.has(training)) throw badRequest('Selected Training approver is not an active faculty');

  await model.setInventorySetting(PROJECT_APPROVER_KEY, project, userId);
  await model.setInventorySetting(TRAINING_APPROVER_KEY, training, userId);
  return { project_approver_user_id: project, training_approver_user_id: training };
};

// Admin dropdown source: active faculty (user_id, name, email).
export const listFacultyForApprover = async () => model.listApproverFaculty();

// ═══════════════════════════════════════════════════════════════════════════
// LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (start)
// ═══════════════════════════════════════════════════════════════════════════

// Trim + length-cap an optional text field; '' becomes null.
const optionalText = (value, max, label) => {
  if (value == null) return null;
  const clean = String(value).trim();
  if (!clean) return null;
  if (clean.length > max) throw badRequest(`${label} must be ${max} characters or fewer`);
  return clean;
};

// ── Labs CRUD (admin) ────────────────────────────────────────
export const listLabs = async ({ active } = {}) => {
  const activeOnly = String(active ?? '') === '1';
  return model.listLabs({ activeOnly });
};

export const createLab = async (payload = {}) => {
  const labName = String(payload.lab_name ?? '').trim();
  if (!labName) throw badRequest('lab_name is required');
  if (labName.length > 150) throw badRequest('lab_name must be 150 characters or fewer');

  const labId = await model.createLab({
    lab_name: labName,
    lab_code: optionalText(payload.lab_code, 40, 'lab_code'),
    in_charge: optionalText(payload.in_charge, 150, 'in_charge'),
    room_no: optionalText(payload.room_no, 40, 'room_no'),
    // Lab photo: a pasted URL string, same trim-or-null handling as
    // training_skills.image_url. Not validated as a URL by design.
    image_url: optionalText(payload.image_url, 512, 'image_url'),
  });
  return { lab_id: labId };
};

export const updateLab = async (labId, payload = {}) => {
  const id = Number(labId);
  if (!id) throw badRequest('Invalid lab id');
  const lab = await model.getLabById(id);
  if (!lab) throw notFound('Lab not found');

  // Only the keys actually sent are written — this is a partial update.
  const fields = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'lab_name')) {
    const labName = String(payload.lab_name ?? '').trim();
    if (!labName) throw badRequest('lab_name cannot be empty');
    if (labName.length > 150) throw badRequest('lab_name must be 150 characters or fewer');
    fields.lab_name = labName;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'lab_code')) fields.lab_code = optionalText(payload.lab_code, 40, 'lab_code');
  if (Object.prototype.hasOwnProperty.call(payload, 'in_charge')) fields.in_charge = optionalText(payload.in_charge, 150, 'in_charge');
  if (Object.prototype.hasOwnProperty.call(payload, 'room_no')) fields.room_no = optionalText(payload.room_no, 40, 'room_no');
  if (Object.prototype.hasOwnProperty.call(payload, 'image_url')) fields.image_url = optionalText(payload.image_url, 512, 'image_url');
  if (Object.prototype.hasOwnProperty.call(payload, 'is_active')) fields.is_active = payload.is_active ? 1 : 0;

  if (!Object.keys(fields).length) throw badRequest('No updatable fields provided');
  await model.updateLab(id, fields);
  return model.getLabById(id);
};

// Soft delete — history in lab_purchases must stay resolvable.
export const deleteLab = async (labId) => {
  const id = Number(labId);
  if (!id) throw badRequest('Invalid lab id');
  const lab = await model.getLabById(id);
  if (!lab) throw notFound('Lab not found');
  await model.deactivateLab(id);
  return { lab_id: id, is_active: 0 };
};

// ── Purchase log ─────────────────────────────────────────────
// ?limit=all (or 0) → the full log; otherwise the N most recent (default 5).
const DEFAULT_PURCHASE_LIMIT = 5;
export const listLabPurchases = async (labId, limitParam) => {
  const id = Number(labId);
  if (!id) throw badRequest('Invalid lab id');
  const lab = await model.getLabById(id);
  if (!lab) throw notFound('Lab not found');

  let limit = DEFAULT_PURCHASE_LIMIT;
  const raw = String(limitParam ?? '').trim().toLowerCase();
  if (raw === 'all' || raw === '0') {
    limit = null;                                  // full log
  } else if (raw) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) throw badRequest("limit must be a non-negative integer or 'all'");
    limit = n;
  }

  const items = await model.listLabPurchases(id, limit);
  return { lab: { lab_id: Number(lab.lab_id), lab_name: lab.lab_name }, items };
};

// Read-only cross-lab purchase feed for the incharge/admin (cannot be acted on —
// intern purchases are direct and already final). Mirrors listBuyingReadOnly.
export const listLabPurchasesReadOnly = async () => model.listAllLabPurchases();

// ── Intern direct purchase (role 5) ──────────────────────────
// Validates the cart, then hands the whole thing to one model transaction.
// Partial fulfilment is a SUCCESS, not an error: the response tells the intern
// exactly what was taken vs short vs skipped.
export const createLabPurchase = async (userId, userName, { lab_id, items } = {}) => {
  const labId = Number(lab_id);
  if (!labId) throw badRequest('lab_id is required');

  if (!Array.isArray(items) || items.length === 0) throw badRequest('At least one item is required');

  const cleaned = items.map((it) => ({
    item_id: Number(it?.item_id),
    quantity: Number(it?.quantity),
  }));
  for (const it of cleaned) {
    if (!it.item_id || Number.isNaN(it.item_id)) throw badRequest('Each item needs a valid item_id');
    if (!(it.quantity > 0)) throw badRequest('Each item quantity must be greater than 0');
  }

  return model.purchaseForLab({
    labId,
    items: cleaned,
    buyerUserId: userId,
    buyerName: userName,
  });
};
// ═══ LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (end) ═══
