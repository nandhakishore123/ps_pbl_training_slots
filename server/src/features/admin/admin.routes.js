import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

// Protect all admin routes (Role 2 = Faculty, Role 3 = Admin)
router.use(authMiddleware, requireRole(2, 3));

router.get('/dashboard-kpi', adminController.getDashboardKPI);
router.get('/venues', adminController.getVenues);
router.get('/faculty', adminController.getFaculty);
router.get('/faculty/search', adminController.searchFaculty);
router.get('/students', adminController.getStudents);
router.get('/training-skills', adminController.getTrainingSkills);
router.get('/slot-timings', adminController.getSlotTimings);
router.post('/slot-timings', adminController.addSlotTiming);
router.delete('/slot-timings/:slotId', adminController.deleteSlotTiming);

router.post('/venues/:mappingId/swap-faculty', adminController.swapFaculty);
router.post('/faculty/:facultyId/add-venue', adminController.addVenueToFaculty);
router.post('/faculty/transfer-individual', adminController.transferIndividualVenue);
router.post('/faculty/transfer-all', adminController.transferAllVenues);

export default router;
