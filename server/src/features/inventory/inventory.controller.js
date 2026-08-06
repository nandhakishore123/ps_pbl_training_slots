import {
  successResponse,
  createdResponse,
  errorResponse,
  internalServerErrorResponse,
} from '../../utils/response.js';
import * as service from './inventory.services.js';

// ── Catalog reads (any authenticated user can browse items) ──
export const getCategories = async (req, res) => {
  try {
    const data = await service.listCategories();
    return successResponse(res, 'Categories fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getCategories:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch categories');
  }
};

export const getItems = async (req, res) => {
  try {
    const data = await service.listItems(req.query.category);
    return successResponse(res, 'Items fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getItems:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch items');
  }
};

export const getItem = async (req, res) => {
  try {
    const data = await service.getItem(req.params.id);
    return successResponse(res, 'Item fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getItem:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch item');
  }
};

// ── Student BUYING flow ──────────────────────────────────────
export const createRequest = async (req, res) => {
  try {
    const { purpose_type, purpose, items, lab_id } = req.body;
    const data = await service.createBuyingRequest(req.user?.user_id, { purpose_type, purpose, items, lab_id });
    return createdResponse(res, 'Request submitted', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createRequest:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to submit request');
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const data = await service.listMyRequests(req.user?.user_id);
    return successResponse(res, 'Requests fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getMyRequests:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch requests');
  }
};

// ── Inventory Incharge (role 4) / Admin (role 3) — stock mgmt ─
export const getStock = async (req, res) => {
  try {
    const data = await service.getStock({ category: req.query.category, search: req.query.search });
    return successResponse(res, 'Stock fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getStock:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch stock');
  }
};

export const editStock = async (req, res) => {
  try {
    const data = await service.editStock(req.user?.user_id, req.params.id, req.body?.quantity);
    return successResponse(res, 'Stock updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in editStock:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update stock');
  }
};

export const addStock = async (req, res) => {
  try {
    const data = await service.addStock(req.user?.user_id, req.params.id, req.body?.quantity);
    return successResponse(res, 'Stock added', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in addStock:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to add stock');
  }
};

export const addItem = async (req, res) => {
  try {
    const data = await service.addNewItem(req.user?.user_id, req.body);
    return createdResponse(res, 'Item created', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in addItem:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to create item');
  }
};

// Full item edit — all catalog fields plus (optionally) current_quantity. ADDITIVE.
export const updateItem = async (req, res) => {
  try {
    const data = await service.updateItem(req.user?.user_id, req.params.id, req.body);
    return successResponse(res, 'Item updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in updateItem:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update item');
  }
};

export const getBuying = async (req, res) => {
  try {
    const data = await service.listBuyingReadOnly();
    return successResponse(res, 'Buying requests fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getBuying:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch buying requests');
  }
};

// ── Faculty buying approval (role 2 by purpose; Admin role 3) ─
export const getPendingBuying = async (req, res) => {
  try {
    const data = await service.listBuyingForFaculty(req.user?.user_id, req.user?.role_id, req.query?.purpose_type);
    return successResponse(res, 'Buying requests fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getPendingBuying:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch buying requests');
  }
};

export const approveBuying = async (req, res) => {
  try {
    const data = await service.approveBuying(req.user?.user_id, req.user?.role_id, req.params.id);
    return successResponse(res, 'Request approved', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in approveBuying:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to approve request');
  }
};

// Approver edits a PENDING request's line quantities before approving.
// Body: { items: [{ line_id, quantity }] }. The service/model throw with a
// .status already set (400 too-high / not-a-line, 403 wrong purpose, 404 missing,
// 409 not-pending / insufficient stock), so the shared error branch below carries
// the right code and message through unchanged.
export const editBuyingItems = async (req, res) => {
  try {
    const data = await service.editPendingRequestQuantities(
      req.user?.user_id, req.user?.role_id, req.params.id, req.body?.items
    );
    return successResponse(res, 'Quantities updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in editBuyingItems:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update quantities');
  }
};

export const rejectBuying = async (req, res) => {
  try {
    const data = await service.rejectBuying(req.user?.user_id, req.user?.role_id, req.params.id, req.body?.remarks);
    return successResponse(res, 'Request rejected', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in rejectBuying:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to reject request');
  }
};

// ── Student return flow (Stage 5) ────────────────────────────
export const getMyObligations = async (req, res) => {
  try {
    const data = await service.listMyOpenObligations(req.user?.user_id);
    return successResponse(res, 'Obligations fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getMyObligations:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch obligations');
  }
};

export const createReturn = async (req, res) => {
  try {
    const data = await service.createReturnRequest(req.user?.user_id, req.body?.lines);
    return createdResponse(res, 'Return submitted', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createReturn:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to submit return');
  }
};

export const getMyReturns = async (req, res) => {
  try {
    const data = await service.listMyReturns(req.user?.user_id);
    return successResponse(res, 'Returns fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getMyReturns:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch returns');
  }
};

// ── Incharge/Admin return approval (Stage 5) ─────────────────
export const getPendingReturns = async (req, res) => {
  try {
    const data = await service.listPendingReturns();
    return successResponse(res, 'Return requests fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getPendingReturns:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch return requests');
  }
};

export const approveReturn = async (req, res) => {
  try {
    const data = await service.approveReturn(req.user?.user_id, req.user?.role_id, req.params.id);
    return successResponse(res, 'Return approved', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in approveReturn:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to approve return');
  }
};

export const rejectReturn = async (req, res) => {
  try {
    const data = await service.rejectReturn(req.user?.user_id, req.user?.role_id, req.params.id, req.body?.remarks);
    return successResponse(res, 'Return rejected', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in rejectReturn:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to reject return');
  }
};

// Read-only returns list (faculty may VIEW, not approve).
export const getReturnsReadOnly = async (req, res) => {
  try {
    const data = await service.listReturnsReadOnly();
    return successResponse(res, 'Returns fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getReturnsReadOnly:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch returns');
  }
};

// ── Admin full view (Stage 6) — role 3 ───────────────────────
export const getAdminOverview = async (req, res) => {
  try {
    const data = await service.getAdminOverview();
    return successResponse(res, 'Overview fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getAdminOverview:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch overview');
  }
};

export const getAdminBuying = async (req, res) => {
  try {
    const data = await service.listAllBuying();
    return successResponse(res, 'Buying requests fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getAdminBuying:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch buying requests');
  }
};

export const getAdminReturns = async (req, res) => {
  try {
    const data = await service.listAllReturns();
    return successResponse(res, 'Returns fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getAdminReturns:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch returns');
  }
};

// ── Admin-configurable approvers (Stage 7) ───────────────────
// GET effective approver ids — any authenticated user (faculty gate the box).
export const getApprovers = async (req, res) => {
  try {
    const data = await service.getApprovers();
    return successResponse(res, 'Approvers fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getApprovers:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch approvers');
  }
};

// PUT approvers — admin only.
export const setApprovers = async (req, res) => {
  try {
    const data = await service.setApprovers(req.user?.user_id, req.body);
    return successResponse(res, 'Approvers updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in setApprovers:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update approvers');
  }
};

// GET faculty list for the admin approver dropdown — admin only.
export const getApproverFaculty = async (req, res) => {
  try {
    const data = await service.listFacultyForApprover();
    return successResponse(res, 'Faculty fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getApproverFaculty:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch faculty');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (start)
// ═══════════════════════════════════════════════════════════════════════════

// ── Labs CRUD ────────────────────────────────────────────────
export const getLabs = async (req, res) => {
  try {
    const data = await service.listLabs({ active: req.query?.active, roleId: req.user?.role_id });
    return successResponse(res, 'Labs fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getLabs:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch labs');
  }
};

export const createLab = async (req, res) => {
  try {
    const data = await service.createLab(req.body);
    return createdResponse(res, 'Lab created', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createLab:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to create lab');
  }
};

export const updateLab = async (req, res) => {
  try {
    const data = await service.updateLab(req.params.labId, req.body);
    return successResponse(res, 'Lab updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in updateLab:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update lab');
  }
};

// Soft delete (is_active = 0) — never a hard DELETE, so purchase history survives.
export const deleteLab = async (req, res) => {
  try {
    const data = await service.deleteLab(req.params.labId);
    return successResponse(res, 'Lab deactivated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in deleteLab:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to deactivate lab');
  }
};

// ── Purchase log ─────────────────────────────────────────────
export const getLabPurchases = async (req, res) => {
  try {
    const data = await service.listLabPurchases(req.params.labId, req.query?.limit);
    return successResponse(res, 'Lab purchases fetched', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getLabPurchases:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch lab purchases');
  }
};

// Read-only cross-lab purchase feed (incharge/admin view), grouped per cart.
export const getLabPurchasesFeed = async (req, res) => {
  try {
    const data = await service.listLabPurchasesReadOnly();
    return successResponse(res, 'Lab purchases fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getLabPurchasesFeed:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch lab purchases');
  }
};

// ═══ CONSUMPTION REPORT — REMOVABLE BLOCK (start) ═══
// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD → combined student + intern consumption.
export const getConsumptionReport = async (req, res) => {
  try {
    const data = await service.getConsumptionReport({ from: req.query?.from, to: req.query?.to });
    return successResponse(res, 'Consumption report generated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getConsumptionReport:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to generate report');
  }
};
// ═══ CONSUMPTION REPORT — REMOVABLE BLOCK (end) ═══

// ── Intern direct purchase ───────────────────────────────────
export const createLabPurchase = async (req, res) => {
  try {
    const data = await service.createLabPurchase(req.user?.user_id, req.user?.name, req.body);
    return createdResponse(res, 'Lab purchase recorded', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createLabPurchase:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to record lab purchase');
  }
};
// ═══ LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (end) ═══

// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (start) ═══
// Both handlers take the user from req.user (same as createLabPurchase) — the
// body may only say WHICH purchase and HOW MUCH, never WHO.
export const getMyReturnablePurchases = async (req, res) => {
  try {
    const data = await service.getMyReturnablePurchases(req.user?.user_id);
    return successResponse(res, 'Returnable purchases fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getMyReturnablePurchases:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch returnable purchases');
  }
};

export const createLabReturn = async (req, res) => {
  try {
    const data = await service.submitLabReturn(req.user?.user_id, req.user?.name, req.body);
    return createdResponse(res, 'Lab return recorded', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createLabReturn:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to record lab return');
  }
};
// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (end) ═══
