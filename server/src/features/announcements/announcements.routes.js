import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  createAnnouncement,
  listAllAnnouncements,
  toggleAnnouncementActive,
  softDeleteAnnouncement,
  listStudentAnnouncements,
  markSeen,
  markRead,
} from './announcements.controller.js';

const router = express.Router();

// ── Admin-authored announcements (role_id = 3) ───────────────
router.post('/announcements', authMiddleware, requireRole(3), createAnnouncement);
router.get('/announcements', authMiddleware, requireRole(3), listAllAnnouncements);
router.patch('/announcements/:id', authMiddleware, requireRole(3), toggleAnnouncementActive);
router.delete('/announcements/:id', authMiddleware, requireRole(3), softDeleteAnnouncement);

// ── Student-facing reads + per-student tracking (role_id = 1) ─
router.get('/student-announcements', authMiddleware, requireRole(1), listStudentAnnouncements);
router.post('/student-announcements/:id/seen', authMiddleware, requireRole(1), markSeen);
router.post('/student-announcements/:id/read', authMiddleware, requireRole(1), markRead);

export default router;
