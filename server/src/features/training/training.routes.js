import { Router } from 'express';
import * as trainingController from './training.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware, requireRole(1));

// Existing routes
router.get('/categories', trainingController.getCategories);
router.get('/skills', trainingController.getSkills);
router.get('/skills/:id/details', trainingController.getSkillDetails);
router.get('/skills/:id/slots', trainingController.getSkillSlots);
router.get('/bookings', trainingController.getStudentBookings);
router.post('/bookings', trainingController.createBooking);

// Assessment routes
router.get('/skills/:skillId/levels/:levelId/assessment', trainingController.getAssessment);
router.post('/assessments/start', trainingController.startAssessment);
router.post('/assessments/:id/submit', trainingController.submitAssessment);
router.post('/bookings/:bookingId/malpractice', trainingController.reportMalpractice);

// Lab Record routes
router.get('/lab-records/questions', trainingController.getLabRecordQuestions);
router.post('/bookings/:bookingId/lab-record', trainingController.saveLabRecord);
router.get('/bookings/:bookingId/lab-record', trainingController.getLabRecordByBooking);

export default router;

