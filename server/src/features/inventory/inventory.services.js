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

// ── Outstanding buying limit ─────────────────────────────────
// A student may have at most this many BUY requests outstanding at once —
// pending, or approved with an uncleared obligation — whatever those requests
// contain. Change the number here and the whole rule moves.
export const MAX_OUTSTANDING_REQUESTS = 3;

// Shown when a student is blocked: they are at the ceiling above AND still
// holding a returnable item they have not given back.
const BLOCK_MESSAGE =
  `You have reached the limit of ${MAX_OUTSTANDING_REQUESTS} unreturned requests. `
  + 'Please return items from a previous request before requesting more returnable items.';

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

const ALL_PURPOSES = ['PROJECT', 'TRAINING'];

// Which purpose_types a caller may act on, as a SET:
//   ['PROJECT','TRAINING'] → admin, or one faculty assigned to BOTH
//   ['PROJECT'] / ['TRAINING'] → faculty assigned to exactly one
//   []                     → not an approver (forbidden)
// This used to return a SINGLE purpose and tested project first, returning
// early — so a faculty holding both assignments was permanently classified
// PROJECT and could never see or act on TRAINING requests. Returning the full
// set is what makes the two-tab page (and the both-approver case) work.
const approverPurposesFor = async (userId, roleId) => {
  if (Number(roleId) === 3) return [...ALL_PURPOSES];   // admin → every purpose
  const { project, training } = await getApproverIds();
  const purposes = [];
  if (Number(userId) === project) purposes.push('PROJECT');
  if (Number(userId) === training) purposes.push('TRAINING');
  return purposes;
};

// Throw 403 unless the caller may act on a request of `purposeType`.
const authorizeApprover = async (userId, roleId, purposeType) => {
  // Admin bypasses purpose routing entirely, exactly as before — a BUY row with
  // a missing/odd purpose_type must stay actionable by an admin.
  if (Number(roleId) === 3) return;
  const purposes = await approverPurposesFor(userId, roleId);
  if (purposes.length === 0) throw forbidden('You are not assigned as an inventory approver');
  if (!purposes.includes(String(purposeType || '').toUpperCase())) {
    throw forbidden(`You can only act on ${purposes.join(' and ')} requests`);
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
export const createBuyingRequest = async (userId, { purpose_type, purpose, items, lab_id, project_guide_id }) => {
  const studentId = await getStudentIdByUserId(userId);
  if (!studentId) throw notFound('Student not found');

  const purposeType = String(purpose_type ?? '').trim().toUpperCase();
  if (!['PROJECT', 'TRAINING'].includes(purposeType)) {
    throw badRequest('purpose_type must be PROJECT or TRAINING');
  }

  // The lab is REQUIRED on a new buying request and is resolved server-side —
  // a deactivated or unknown lab_id is rejected rather than silently stored.
  // (Existing rows predating the column keep lab_id NULL; only new requests are
  // held to this.)
  const labId = Number(lab_id);
  if (!labId || Number.isNaN(labId)) throw badRequest('Please select a lab');
  const lab = await model.getLabById(labId);
  if (!lab) throw badRequest('Selected lab not found');
  if (Number(lab.is_active) !== 1) throw badRequest('Selected lab is no longer active');

  // The project guide is REQUIRED on a new buying request and is resolved
  // server-side, the same way the lab is: the client sends only an id, and the
  // NAME is read from `faculties` and snapshotted onto the request. A
  // client-supplied name is never trusted — accepting one would let a student
  // put any string in front of the approver.
  // (Existing rows predating the column keep both fields NULL; only new requests
  // are held to this.)
  const projectGuideId = Number(project_guide_id);
  if (!projectGuideId || Number.isNaN(projectGuideId)) throw badRequest('Please select a project guide');
  const guide = await model.getFacultyById(projectGuideId);
  if (!guide) throw badRequest('Selected project guide not found');
  const projectGuideName = guide.name;

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
    return {
      item_id: it.item_id,
      item_name: row.item_name,
      unit: row.unit,
      quantity: it.quantity,
      is_returnable: Number(row.is_returnable) === 1 ? 1 : 0,
    };
  });

  // Blocking gate — two conditions, both about the pile the student is ALREADY
  // sitting on (see the model for how pending and approved requests are counted
  // together, once each):
  //   1. they are at/over MAX_OUTSTANDING_REQUESTS outstanding BUY requests,
  //      counted whatever those requests contain; AND
  //   2. they are still holding a returnable item they have not given back.
  //
  // Both are required. Three consumables-only requests hit the ceiling but leave
  // nothing to give back, so they never block — the ceiling exists to force
  // returns, and there is nothing to return. Equally, clearing the last
  // returnable obligation unblocks the student even if three requests remain.
  //
  // What the NEW request contains is deliberately NOT part of the decision: the
  // rule is about the debt already owed, not about what is being asked for.
  const outstanding = await model.countOutstandingRequests(studentId);
  if (outstanding >= MAX_OUTSTANDING_REQUESTS) {
    const holdsReturnable = await model.hasOutstandingReturnable(studentId);
    if (holdsReturnable) throw conflict(BLOCK_MESSAGE);
  }

  const requestId = await model.createRequestWithItems({
    studentId,
    requestType: 'BUY',
    purposeType,
    purpose: purposeText,
    labId,
    projectGuideId,
    projectGuideName,
    items: lineItems,
  });

  // Return the freshly-created request (header + items) for the Inventory Pass.
  const all = await model.listRequestsForStudent(studentId);
  return all.find((r) => Number(r.request_id) === Number(requestId))
    || {
      request_id: requestId, status: 'PENDING', purpose_type: purposeType, purpose: purposeText,
      lab_id: labId, lab_name: lab.lab_name,
      project_guide_id: projectGuideId, project_guide_name: projectGuideName,
      items: lineItems,
    };
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

// Full item edit (Admin role 3 / Incharge role 4) — ADDITIVE.
// Same required-field rules as addNewItem (category, item_name, unit), plus
// length caps so an over-long value returns a clean 400 instead of a raw MySQL
// error. current_quantity is OPTIONAL: omit it and stock — and its txn history —
// is left completely untouched.
export const updateItem = async (userId, itemId, payload = {}) => {
  const id = Number(itemId);
  if (!id) throw badRequest('Invalid item id');

  const category = String(payload.category ?? '').trim();
  const itemName = String(payload.item_name ?? '').trim();
  const unit = String(payload.unit ?? '').trim();
  if (!category) throw badRequest('category is required');
  if (!itemName) throw badRequest('item_name is required');
  if (!unit) throw badRequest('unit is required');
  if (category.length > 60) throw badRequest('category must be 60 characters or fewer');
  if (itemName.length > 255) throw badRequest('item_name must be 255 characters or fewer');
  if (unit.length > 30) throw badRequest('unit must be 30 characters or fewer');

  const fields = {
    category,
    item_name: itemName,
    unit,
    // optionalText trims, caps the length (400 if over) and turns '' into null —
    // matching how addNewItem nullifies empty optionals.
    subcategory: optionalText(payload.subcategory, 80, 'subcategory'),
    sub_name: optionalText(payload.sub_name, 255, 'sub_name'),
    rack_location: optionalText(payload.rack_location, 120, 'rack_location'),
    is_returnable: payload.is_returnable ? 1 : 0,
  };

  // Only send a quantity when one was actually supplied — the model decides
  // whether it changed and whether a STOCK_EDIT txn is warranted.
  if (payload.current_quantity != null && payload.current_quantity !== '') {
    const qty = Number(payload.current_quantity);
    if (Number.isNaN(qty) || qty < 0) throw badRequest('current_quantity must be 0 or greater');
    fields.current_quantity = qty;
  }

  const updated = await model.updateItem(id, fields, userId);
  if (!updated) throw notFound('Item not found');
  return updated;
};

// Read-only buying-request list for the incharge (cannot approve buying — Stage 4/faculty).
export const listBuyingReadOnly = async () => {
  return model.listAllBuyingRequests();
};

// ── Faculty buying approval (Stage 4) ────────────────────────
// List the buying requests this caller may approve, split per purpose so the
// page can render one tab per assignment.
// Returns { scopes, project, training }:
//   scopes   → the purposes this caller holds, e.g. ['PROJECT','TRAINING']
//   project  → PROJECT requests (empty unless 'PROJECT' is in scopes)
//   training → TRAINING requests (empty unless 'TRAINING' is in scopes)
// Both arrays are always present so the client never has to null-check; each
// request keeps the exact fields listBuyingForApprover already returned.
export const listBuyingForFaculty = async (userId, roleId, purposeTypeParam) => {
  const purposes = await approverPurposesFor(userId, roleId);
  if (purposes.length === 0) throw forbidden('You are not assigned as an inventory approver');

  // ?purpose_type still narrows the response FOR ADMIN ONLY (it drove the old
  // admin filter). For faculty it is ignored — their assignment set is
  // authoritative, so the query string can never widen or narrow what they see.
  let scopes = purposes;
  if (Number(roleId) === 3) {
    const p = String(purposeTypeParam || '').toUpperCase();
    if (ALL_PURPOSES.includes(p)) scopes = [p];
  }

  const lists = await Promise.all(scopes.map((p) => model.listBuyingForApprover(p)));
  const out = { scopes, project: [], training: [] };
  scopes.forEach((p, i) => {
    if (p === 'PROJECT') out.project = lists[i];
    else out.training = lists[i];
  });
  return out;
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

// Edit the line quantities of a PENDING buying request, before approving it.
// Same authorization as approveBuying — an approver who may approve a request
// may adjust it, nobody else. Reduce-only; the model holds the per-line rules.
//
// The PENDING guard is checked here for a fast, clear 409, and AGAIN inside the
// model's transaction (with the header locked FOR UPDATE) — this one can go
// stale between read and write, that one cannot.
export const editPendingRequestQuantities = async (userId, roleId, requestId, edits) => {
  const req = await model.getRequestWithItems(requestId);
  if (!req) throw notFound('Request not found');
  if (req.request_type !== 'BUY') throw badRequest('Not a buying request');
  await authorizeApprover(userId, roleId, req.purpose_type);
  if (String(req.status).toUpperCase() !== 'PENDING') throw conflict('Request is not pending');

  if (!Array.isArray(edits) || edits.length === 0) throw badRequest('At least one item is required');
  const cleaned = edits.map((ed) => ({
    line_id: Number(ed?.line_id),
    quantity: Number(ed?.quantity),
  }));
  for (const ed of cleaned) {
    if (!ed.line_id || Number.isNaN(ed.line_id)) throw badRequest('Each item needs a valid line_id');
    if (!Number.isFinite(ed.quantity)) throw badRequest('Each item needs a numeric quantity');
  }

  try {
    return await model.updatePendingRequestQuantities(requestId, cleaned, userId);
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
      // PARTIAL RETURNS: cap at what is STILL owed, not at the original taken
      // quantity. After returning 2 of 5 the obligation reopens with
      // returned_quantity = 2, so a further return may be at most 3.
      const remaining = Number(o.remaining ?? (Number(o.taken_quantity) - Number(o.returned_quantity ?? 0)));
      if (l.return_quantity > remaining) {
        throw badRequest(`Return quantity for "${o.item_name}" exceeds the ${remaining} still to return`);
      }
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

// PROJECT GUIDE dropdown source: EVERY faculty (user_id, name, department).
// Separate from listFacultyForApprover above on purpose — this one is reachable
// by students, so it must never carry email addresses, and it is not limited to
// the role-2 approver pool.
export const listAllFaculty = async () => model.listAllFaculty();

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
// `roleId` is passed by the controller so a STUDENT (role 1) is always forced to
// active-only — they read this list purely to pick a lab for a buying request,
// and must not be able to see (or select) a deactivated lab by dropping the
// ?active=1 param. Every other role keeps the previous opt-in behaviour.
export const listLabs = async ({ active, roleId } = {}) => {
  const activeOnly = Number(roleId) === 1 || String(active ?? '') === '1';
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

// ═══ CONSUMPTION REPORT — REMOVABLE BLOCK (start) ═══
// Accepts plain YYYY-MM-DD strings; the model widens `to` to end-of-day.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseReportDate = (value, label) => {
  const clean = String(value ?? '').trim();
  if (!clean) throw badRequest(`${label} is required (YYYY-MM-DD)`);
  if (!DATE_RE.test(clean)) throw badRequest(`${label} must be a date in YYYY-MM-DD format`);
  const d = new Date(`${clean}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw badRequest(`${label} is not a valid date`);
  return clean;
};

export const getConsumptionReport = async ({ from, to } = {}) => {
  const cleanFrom = parseReportDate(from, 'from');
  const cleanTo = parseReportDate(to, 'to');
  if (cleanTo < cleanFrom) throw badRequest('"to" date cannot be earlier than "from" date');

  // An empty range is a normal result, not an error — the model returns
  // empty arrays and the caller renders an empty report.
  return model.getConsumptionReport({ from: cleanFrom, to: cleanTo });
};
// ═══ CONSUMPTION REPORT — REMOVABLE BLOCK (end) ═══

// ── Intern direct purchase (role 5) ──────────────────────────
// Validates the cart, then hands the whole thing to one model transaction.
// Partial fulfilment is a SUCCESS, not an error: the response tells the intern
// exactly what was taken vs short vs skipped.
export const createLabPurchase = async (userId, userName, { lab_id, items, lab_guide_id, purpose } = {}) => {
  const labId = Number(lab_id);
  if (!labId) throw badRequest('lab_id is required');

  if (!Array.isArray(items) || items.length === 0) throw badRequest('At least one item is required');

  // The lab guide is REQUIRED and resolved server-side, exactly like the
  // student's project guide: the client sends only an id, and the NAME is read
  // from `faculties` and snapshotted onto every row of the cart. A
  // client-supplied name is never trusted.
  const labGuideId = Number(lab_guide_id);
  if (!labGuideId || Number.isNaN(labGuideId)) throw badRequest('Please select a lab guide');
  const guide = await model.getFacultyById(labGuideId);
  if (!guide) throw badRequest('Selected lab guide not found');
  const labGuideName = guide.name;

  // Purpose is REQUIRED. Capped at 255 to match the column rather than letting
  // MySQL truncate silently.
  const purposeText = String(purpose ?? '').trim();
  if (!purposeText) throw badRequest('Please enter a purpose');
  const cleanPurpose = purposeText.slice(0, 255);

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
    labGuideId,
    labGuideName,
    purpose: cleanPurpose,
  });
};
// ═══ LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (end) ═══

// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (start) ═══
// An intern returns some/all of one of their OWN past lab purchases. `userId`
// always comes from the JWT in the controller, never from the body — it is both
// the list filter and the ownership check.
export const getMyReturnablePurchases = async (userId) => {
  if (!userId) throw badRequest('Missing user');
  return model.listMyReturnablePurchases(userId);
};

// Shape validation only. The real cap (quantity <= purchased − already returned)
// and the ownership check are enforced inside the model transaction, where the
// purchase row is locked — checking them here too would just be a racy preview.
export const submitLabReturn = async (userId, userName, { purchase_id, quantity } = {}) => {
  const purchaseId = Number(purchase_id);
  if (!purchaseId || Number.isNaN(purchaseId)) throw badRequest('purchase_id is required');

  const qty = Number(quantity);
  if (!(qty > 0)) throw badRequest('Return quantity must be greater than 0');

  return model.returnLabPurchase({
    purchase_id: purchaseId,
    quantity: qty,
    returnerUserId: userId,
    returnerName: userName,
  });
};
// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (end) ═══

// ═══ RETURNABLE FEED — REMOVABLE BLOCK (start) ═══
// Read-only pass-through, exactly like listLabPurchasesReadOnly: the whole feed
// is one query pair with no arguments to validate and no caller-supplied scope.
export const listReturnableFeedReadOnly = async () => model.listReturnableFeed();
// ═══ RETURNABLE FEED — REMOVABLE BLOCK (end) ═══
