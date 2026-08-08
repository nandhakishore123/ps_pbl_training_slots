import { api } from '../core/apiMethods';

// Inventory Request system — student-facing API (Stage 2: browse + BUY).
export const inventoryService = {
  // ── Catalog reads ──────────────────────────────────────────
  getCategories() {
    return api.get('/inventory/categories');
  },

  getItems(category) {
    return api.get('/inventory/items', { params: { category } });
  },

  getItem(itemId) {
    return api.get(`/inventory/items/${itemId}`);
  },

  // ── Student BUYING flow ────────────────────────────────────
  // payload: { purpose_type: 'PROJECT'|'TRAINING', purpose, items: [{ item_id, quantity }] }
  createRequest(payload) {
    return api.post('/inventory/requests', payload);
  },

  getMyRequests() {
    return api.get('/inventory/requests/mine');
  },

  // ── Inventory Incharge (role 4) / Admin — stock management ──
  getStock({ category, search } = {}) {
    return api.get('/inventory/stock', { params: { category, search } });
  },

  editStock(itemId, quantity) {
    return api.post(`/inventory/stock/${itemId}/edit`, { quantity });
  },

  addStock(itemId, quantity) {
    return api.post(`/inventory/stock/${itemId}/add`, { quantity });
  },

  addNewItem(payload) {
    return api.post('/inventory/items', payload);
  },

  // Full item edit — all catalog fields plus current_quantity. A quantity change
  // is logged server-side as a STOCK_EDIT txn; a field-only edit logs nothing.
  // payload: { category, subcategory, item_name, sub_name, unit, current_quantity, rack_location, is_returnable }
  updateItem(itemId, payload) {
    return api.put(`/inventory/items/${itemId}`, payload);
  },

  getBuyingReadOnly() {
    return api.get('/inventory/buying');
  },

  // ── Faculty buying approval (role 2 by purpose; Admin) ─────
  // Resolves to { scopes, project, training } — `scopes` lists the purposes the
  // caller is the assigned approver for (both, for an admin or a faculty holding
  // both assignments), and the two arrays hold that purpose's requests.
  // `purposeType` narrows the response FOR ADMIN ONLY; faculty are always scoped
  // server-side by their assignment, so the faculty page passes nothing.
  getPendingBuying(purposeType) {
    return api.get('/inventory/buying/pending', { params: { purpose_type: purposeType } });
  },

  approveBuying(requestId) {
    return api.post(`/inventory/buying/${requestId}/approve`);
  },

  rejectBuying(requestId, remarks) {
    return api.post(`/inventory/buying/${requestId}/reject`, { remarks });
  },

  // Approver reduces line quantities before approving. PENDING-only and
  // reduce-only; the server caps each line at the student's original ask and at
  // current stock. `items` = [{ line_id, quantity }] — only the changed lines
  // need to be sent.
  editBuyingItems(requestId, items) {
    return api.patch(`/inventory/buying/${requestId}/items`, { items });
  },

  // ── Student return flow (Stage 5) ──────────────────────────
  getMyObligations() {
    return api.get('/inventory/obligations/mine');
  },

  createReturn(lines) {
    return api.post('/inventory/returns', { lines });
  },

  getMyReturns() {
    return api.get('/inventory/returns/mine');
  },

  // ── Incharge/Admin return approval; faculty view-only ──────
  getPendingReturns() {
    return api.get('/inventory/returns/pending');
  },

  approveReturn(requestId) {
    return api.post(`/inventory/returns/${requestId}/approve`);
  },

  rejectReturn(requestId, remarks) {
    return api.post(`/inventory/returns/${requestId}/reject`, { remarks });
  },

  getReturnsReadOnly() {
    return api.get('/inventory/returns');
  },

  // ── Admin full view (Stage 6) — reuses approve/reject/stock calls above ──
  getAdminOverview() {
    return api.get('/inventory/admin/overview');
  },

  getAdminBuying() {
    return api.get('/inventory/admin/buying');
  },

  getAdminReturns() {
    return api.get('/inventory/admin/returns');
  },

  // ── Admin-configurable approvers (Stage 7) ─────────────────
  // Effective approver user_ids — readable by any authenticated user (faculty
  // use it to gate the Inventory Approval box).
  getApproverIds() {
    return api.get('/inventory/approvers');
  },

  // Admin dropdown: active faculty (user_id, name, email).
  listApproverFaculty() {
    return api.get('/inventory/faculty');
  },

  // Admin: set both approvers. payload: { project_approver_user_id, training_approver_user_id }
  setApprovers(payload) {
    return api.put('/inventory/approvers', payload);
  },

  // Student's project-guide dropdown: every real faculty (user_id, name,
  // department). Distinct from listApproverFaculty above — this one is
  // student-reachable and deliberately carries no email addresses.
  getFacultyList() {
    return api.get('/inventory/faculty-list');
  },

  // ═══ LABS (Stage 4) — REMOVABLE BLOCK (start) ═══
  // Labs master. Admin (3) manages; incharge (4) and interns (5) may read.
  // Omit `active` for all labs; pass 1 for only active ones.
  getLabs(active) {
    return api.get('/inventory/labs', { params: active ? { active: 1 } : {} });
  },

  // payload: { lab_name, lab_code?, in_charge?, room_no? }
  createLab(payload) {
    return api.post('/inventory/labs', payload);
  },

  // Partial update — only the keys sent are written (incl. is_active for re-activate).
  updateLab(labId, payload) {
    return api.put(`/inventory/labs/${labId}`, payload);
  },

  // Soft delete → is_active = 0. Purchase history is preserved.
  deleteLab(labId) {
    return api.delete(`/inventory/labs/${labId}`);
  },

  // Per-lab purchase log. limit: number (default 5 server-side) or 'all'.
  getLabPurchases(labId, limit) {
    return api.get(`/inventory/labs/${labId}/purchases`, { params: limit != null ? { limit } : {} });
  },

  // Intern (role 5) direct buy — no request, no approval. Partial fulfilment is
  // a success: the response reports FULL / PARTIAL / OUT_OF_STOCK per item.
  // payload: { lab_id, items: [{ item_id, quantity }] }
  createLabPurchase(payload) {
    return api.post('/inventory/lab-purchase', payload);
  },

  // Read-only cross-lab feed for the incharge/admin, grouped one card per cart.
  getLabPurchasesFeed() {
    return api.get('/inventory/lab-purchases-feed');
  },

  // Consumption report (admin + incharge): approved student buys + intern lab
  // purchases in a date range. Dates are plain 'YYYY-MM-DD' strings.
  getConsumptionReport(from, to) {
    return api.get('/inventory/reports/consumption', { params: { from, to } });
  },
  // ═══ LABS (Stage 4) — REMOVABLE BLOCK (end) ═══

  // ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (start) ═══
  // The intern's OWN past purchases that still have something left to return.
  // Scoped server-side by the JWT — there is no user parameter by design.
  getMyReturnablePurchases() {
    return api.get('/inventory/my-returnable-purchases');
  },

  // Direct return against ONE past purchase — no request, no approval; adds
  // stock back. The server caps this at (purchased − already returned) and
  // rejects a purchase the caller does not own.
  submitLabReturn(purchase_id, quantity) {
    return api.post('/inventory/lab-return', { purchase_id, quantity });
  },
  // ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (end) ═══
};
