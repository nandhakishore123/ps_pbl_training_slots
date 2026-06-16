import { Router } from 'express';
import * as superAdminController from './superadmin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

// Faculty-management routes require a valid token and Admin role (role_id = 3).
router.use(authMiddleware, requireRole(3));

// ── Phase 0 ───────────────────────────────────────────────────────────────────
router.get('/ping', superAdminController.ping);

// ── Phase 1: Faculty management ───────────────────────────────────────────────
router.get('/faculty', superAdminController.listFaculty);
router.post('/faculty', superAdminController.createFaculty);
router.patch('/faculty/:facultyId', superAdminController.updateFaculty);
router.post('/faculty/:facultyId/revoke', superAdminController.revokeFaculty);
router.post('/faculty/:facultyId/reactivate', superAdminController.reactivateFaculty);
router.post('/faculty/:facultyId/assign', superAdminController.assignFacultyToLab);

// Reassign / transfer existing mappings (reuses admin transfer logic)
router.post('/faculty/reassign-individual', superAdminController.reassignIndividual);
router.post('/faculty/reassign-all', superAdminController.reassignAll);

// Lookups for the Assign modal
router.get('/venues', superAdminController.getVenues);
router.get('/slot-timings', superAdminController.getSlotTimings);
router.get('/training-skills', superAdminController.getTrainingSkills);

export default router;
