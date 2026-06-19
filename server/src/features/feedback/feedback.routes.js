import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  submitFeedback,
  listMyFeedback,
  listAllFeedback,
  toggleVerified,
} from './feedback.controller.js';

const router = express.Router();

// ── Student (role_id = 1) ────────────────────────────────────
router.post('/', authMiddleware, requireRole(1), submitFeedback);
router.get('/mine', authMiddleware, requireRole(1), listMyFeedback);

// ── Admin (role_id = 3) ──────────────────────────────────────
router.get('/', authMiddleware, requireRole(3), listAllFeedback);
router.patch('/:id', authMiddleware, requireRole(3), toggleVerified);

export default router;
