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

// ── Training skill (Course/Lab) management (Admin only — role_id 3) — Stage 5a ─
router.get('/training-skills/all', requireRole(3), adminController.getAllTrainingSkills);
router.get('/skill-categories', requireRole(3), adminController.getSkillCategories);
router.post('/training-skills', requireRole(3), adminController.createTrainingSkill);
router.put('/training-skills/:id', requireRole(3), adminController.updateTrainingSkill);
router.patch('/training-skills/:id/active', requireRole(3), adminController.setTrainingSkillActive);

// ── Skill level (Course/Lab level) management (Admin only — role_id 3) — Stage 5b ─
// List reuses getSkillLevels (also exposed at /skills/:skillId/levels for Stage 4b).
router.get('/training-skills/:skillId/levels', requireRole(3), adminController.getSkillLevels);
router.post('/training-skills/:skillId/levels', requireRole(3), adminController.createLevel);
router.put('/levels/:levelId', requireRole(3), adminController.updateLevel);
router.delete('/levels/:levelId', requireRole(3), adminController.deleteLevel);

// ── Assessment management (Admin only — role_id 3) — Stage 5c-i ─────
router.get('/training-skills/:skillId/levels/:levelId/assessments', requireRole(3), adminController.getAssessmentsForLevel);
router.post('/training-skills/:skillId/levels/:levelId/assessments', requireRole(3), adminController.createAssessment);
router.put('/assessments/:assessmentId', requireRole(3), adminController.updateAssessment);
router.patch('/assessments/:assessmentId/active', requireRole(3), adminController.setAssessmentActive);
router.get('/mcq-types', requireRole(3), adminController.getMcqTypes);
router.get('/assessments/:assessmentId/mcq-config', requireRole(3), adminController.getMcqTypeConfig);
router.put('/assessments/:assessmentId/mcq-config', requireRole(3), adminController.upsertMcqTypeConfig);
router.delete('/mcq-config/:configId', requireRole(3), adminController.deleteMcqTypeConfig);

// ── MCQ Question Bank (Admin only — role_id 3) — Stage 5c-ii ─────
router.get('/assessments/:assessmentId/questions', requireRole(3), adminController.getQuestions);
router.post('/assessments/:assessmentId/questions', requireRole(3), adminController.createQuestion);
router.put('/questions/:questionId', requireRole(3), adminController.updateQuestion);
router.patch('/questions/:questionId/active', requireRole(3), adminController.setQuestionActive);

// ── Venue ↔ Skill management (Admin only — role_id 3) ────────
router.get('/venues/:venueId/skills', requireRole(3), adminController.getVenueSkills);
router.post('/venues/:venueId/skills', requireRole(3), adminController.addVenueSkill);
router.delete('/venues/:venueId/skills/:trainingSkillId', requireRole(3), adminController.removeVenueSkill);

// ── Per-venue + per-date slots (venue_slots) — Stage 3a, ADMIN-ONLY, ADDITIVE.
// Distinct from the global /slot-timings routes; not read by booking/assessment.
// Whole-day convenience read for the Slot Scheduling page (READ-ONLY).
// Declared before the parameterized venue route so '/slots-by-date' is distinct.
router.get('/slots-by-date', requireRole(3), adminController.getAllVenueSlotsByDate);
router.get('/venues/:venueId/slots-by-date', requireRole(3), adminController.getVenueSlotsByDate);
router.post('/venues/:venueId/slots-by-date', requireRole(3), adminController.createVenueSlot);
router.put('/venue-slots/:venueSlotId', requireRole(3), adminController.updateVenueSlot);
router.patch('/venue-slots/:venueSlotId/active', requireRole(3), adminController.setVenueSlotActive);

router.post('/venues/:mappingId/swap-faculty', adminController.swapFaculty);
router.post('/faculty/transfer-individual', adminController.transferIndividualVenue);
router.post('/faculty/transfer-all', adminController.transferAllVenues);

// ── Attendance (Admin only — role_id 3) ──────────────────────
router.get('/attendance/mappings', requireRole(3), adminController.getAttendanceMappings);
router.get('/attendance/mappings/:mappingId/students', requireRole(3), adminController.getAttendanceStudents);
router.post('/attendance/bookings/:bookingId', requireRole(3), adminController.markAttendance);

// ── Booking-open time config (Admin only — role_id 3) ────────
router.get('/config/booking-window', requireRole(3), adminController.getBookingWindowConfig);
router.put('/config/booking-window', requireRole(3), adminController.updateBookingWindowConfig);

// ── All Bookings dashboard (Admin only — role_id 3) ──────────
router.get('/bookings', requireRole(3), adminController.getAllBookings);
// ── Admin cancel a booking (Stage 4a) — hard delete + seat release ──
router.delete('/bookings/:bookingId', requireRole(3), adminController.cancelBooking);
// ── Admin book a slot FOR a student (Stage 4b) ──
router.post('/bookings', requireRole(3), adminController.bookForStudent);
router.get('/skills/:skillId/levels', requireRole(3), adminController.getSkillLevels);
// ── Admin bulk-book many students into one slot (Stage 4c) ──
router.post('/bookings/bulk', requireRole(3), adminController.bulkBook);

export default router;
