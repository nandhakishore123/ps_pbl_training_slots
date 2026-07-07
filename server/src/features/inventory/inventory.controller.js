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
    const { purpose_type, purpose, items } = req.body;
    const data = await service.createBuyingRequest(req.user?.user_id, { purpose_type, purpose, items });
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

// ── TODO (Stage 5) — return handlers ─────────────────────────
// getReturns + approveReturn (incharge add stock).
