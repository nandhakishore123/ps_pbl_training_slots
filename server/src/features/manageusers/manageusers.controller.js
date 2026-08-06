// manageusers.controller.js — USER MANAGEMENT (non-student roles) — REMOVABLE FEATURE
// Thin handlers, same shape as the inventory controller: unwrap req, call the
// service, wrap the result; typed service errors map straight to their status.
import {
  successResponse,
  createdResponse,
  errorResponse,
  internalServerErrorResponse,
} from '../../utils/response.js';
import * as service from './manageusers.services.js';

export const createManagedUser = async (req, res) => {
  try {
    const { email, name, role_id } = req.body || {};
    const data = await service.createManagedUser({ email, name, role_id });
    return createdResponse(res, 'User created', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in createManagedUser:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to create user');
  }
};

export const getManagedUsers = async (req, res) => {
  try {
    const data = await service.listManagedUsers();
    return successResponse(res, 'Users fetched', { items: data });
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in getManagedUsers:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to fetch users');
  }
};

// req.user.user_id is the acting admin — the service uses it for the
// self-lockout guards.
export const switchUserRole = async (req, res) => {
  try {
    const data = await service.switchUserRole(req.user?.user_id, req.params.userId, req.body?.role_id);
    return successResponse(res, 'Role updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in switchUserRole:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update role');
  }
};

export const setManagedUserActive = async (req, res) => {
  try {
    const data = await service.setManagedUserActive(req.user?.user_id, req.params.userId, req.body?.is_active);
    return successResponse(res, 'User updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in setManagedUserActive:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update user');
  }
};

export const updateManagedUserName = async (req, res) => {
  try {
    const data = await service.updateManagedUserName(req.params.userId, req.body?.name);
    return successResponse(res, 'Name updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in updateManagedUserName:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update name');
  }
};

// ── ROLE-5 SUB-TYPE — REMOVABLE BLOCK (start) ────────────────────────────────
export const setManagedUserSubtype = async (req, res) => {
  try {
    const data = await service.setManagedUserSubtype(req.params.userId, req.body?.member_subtype);
    return successResponse(res, 'Sub-type updated', data);
  } catch (error) {
    if (error?.status) return errorResponse(res, error.message, error.status);
    console.error('Error in setManagedUserSubtype:', error);
    return internalServerErrorResponse(res, error.message || 'Failed to update sub-type');
  }
};
// ── ROLE-5 SUB-TYPE — REMOVABLE BLOCK (end) ──────────────────────────────────
