import { Router } from 'express';
import * as facultyController from './faculty.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

// All faculty routes require a valid auth token and Faculty role (role_id = 2)
router.use(authMiddleware, requireRole(2));

// ── Dashboard ─────────────────────────────────────────────────────────
router.get('/dashboard-kpi', facultyController.getDashboardKPI);

// ── Venue & Students ──────────────────────────────────────────────────
router.get('/my-venues', facultyController.getMyVenues);
router.get('/mappings/:mappingId/students', facultyController.getStudentsByMapping);

// ── Attendance ────────────────────────────────────────────────────────
router.post('/bookings/:bookingId/attendance', facultyController.markAttendance);
router.post('/mappings/:mappingId/attendance/all', facultyController.markAllAttendance);

// ── Malpractice ───────────────────────────────────────────────────────
router.post('/bookings/:bookingId/malpractice', facultyController.markMalpractice);
router.post('/bookings/:bookingId/revoke-malpractice', facultyController.revokeMalpractice);

// ── Review MCQ & Survey ───────────────────────────────────────────────
router.get('/bookings/:bookingId/review', facultyController.getStudentReviewData);
router.patch('/bookings/:bookingId/verify-incharge', facultyController.verifyInchargeLabRecord);

// ── Transfer Requests ─────────────────────────────────────────────────
router.get('/transfer-requests', facultyController.getMyTransferRequests);
router.post('/transfer-requests', facultyController.createTransferRequest);
router.get('/all-venue-allocations', facultyController.getAllVenueAllocations);

export default router;
