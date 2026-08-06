// manageusers.routes.js — USER MANAGEMENT (non-student roles) — REMOVABLE FEATURE
// Mounted at /api/admin (see app.js) BEFORE the existing admin router, so these
// paths resolve here; everything else falls through to admin.routes.js
// untouched. Admin-only (role 3) — stricter than the admin router's own
// requireRole(2, 3), which also admits faculty.
import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  createManagedUser,
  getManagedUsers,
  switchUserRole,
  setManagedUserActive,
  updateManagedUserName,
  setManagedUserSubtype,   // ROLE-5 SUB-TYPE (removable)
} from './manageusers.controller.js';

const router = express.Router();

router.post('/manage-users', authMiddleware, requireRole(3), createManagedUser);                     // { email, name, role_id } — role 1 rejected
router.get('/manage-users', authMiddleware, requireRole(3), getManagedUsers);                        // non-student users only
router.put('/manage-users/:userId/role', authMiddleware, requireRole(3), switchUserRole);            // { role_id } — blocks self
router.put('/manage-users/:userId/active', authMiddleware, requireRole(3), setManagedUserActive);    // { is_active } — blocks self-deactivate
router.put('/manage-users/:userId/name', authMiddleware, requireRole(3), updateManagedUserName);     // { name } — upsert
// ROLE-5 SUB-TYPE (removable): { member_subtype } — FACULTY|INTERN|TECHNICIAN,
// role 5 only. Label-only; grants no permission and changes no routing.
router.put('/manage-users/:userId/subtype', authMiddleware, requireRole(3), setManagedUserSubtype);

export default router;
