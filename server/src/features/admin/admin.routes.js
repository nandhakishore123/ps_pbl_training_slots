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

// ── Slot timing edit / open-close (Admin only — role_id 3) ───
router.get('/slot-timings/all', requireRole(3), adminController.getAllSlotTimings);
router.put('/slot-timings/:slotId', requireRole(3), adminController.updateSlotTiming);
router.patch('/slot-timings/:slotId/active', requireRole(3), adminController.setSlotActive);

// ── Venue management (Admin only — role_id 3) ────────────────
router.get('/venues/all', requireRole(3), adminController.getAllVenues);
router.post('/venues', requireRole(3), adminController.createVenue);
router.put('/venues/:venueId', requireRole(3), adminController.updateVenue);
router.patch('/venues/:venueId/active', requireRole(3), adminController.setVenueActive);

// ── Venue ↔ Skill management (Admin only — role_id 3) ────────
router.get('/venues/:venueId/skills', requireRole(3), adminController.getVenueSkills);
router.post('/venues/:venueId/skills', requireRole(3), adminController.addVenueSkill);
router.delete('/venues/:venueId/skills/:trainingSkillId', requireRole(3), adminController.removeVenueSkill);

router.post('/venues/:mappingId/swap-faculty', adminController.swapFaculty);
router.post('/faculty/transfer-individual', adminController.transferIndividualVenue);
router.post('/faculty/transfer-all', adminController.transferAllVenues);

// ── Attendance (Admin only — role_id 3) ──────────────────────
router.get('/attendance/mappings', requireRole(3), adminController.getAttendanceMappings);
router.get('/attendance/mappings/:mappingId/students', requireRole(3), adminController.getAttendanceStudents);
router.post('/attendance/bookings/:bookingId', requireRole(3), adminController.markAttendance);

// ── All Bookings dashboard (Admin only — role_id 3) ──────────
router.get('/bookings', requireRole(3), adminController.getAllBookings);

export default router;
