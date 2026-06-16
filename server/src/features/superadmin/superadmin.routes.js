import { Router } from 'express';
import * as superAdminController from './superadmin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

// All super-admin routes require a valid token and SUPER_ADMIN role (role_id = 4).
router.use(authMiddleware, requireRole(4));

// ── Phase 0 ───────────────────────────────────────────────────────────────────
router.get('/ping', superAdminController.ping);

export default router;
