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

  getBuyingReadOnly() {
    return api.get('/inventory/buying');
  },

  // ── Faculty buying approval (role 2 by purpose; Admin) ─────
  getPendingBuying(purposeType) {
    return api.get('/inventory/buying/pending', { params: { purpose_type: purposeType } });
  },

  approveBuying(requestId) {
    return api.post(`/inventory/buying/${requestId}/approve`);
  },

  rejectBuying(requestId, remarks) {
    return api.post(`/inventory/buying/${requestId}/reject`, { remarks });
  },

  // TODO (Stage 5): getReturnsForIncharge + approveReturn.
};
