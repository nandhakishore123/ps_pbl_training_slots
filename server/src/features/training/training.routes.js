import { Router } from 'express';
import * as trainingController from './training.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware, requireRole(1));

router.get('/categories', trainingController.getCategories);
router.get('/skills', trainingController.getSkills);
router.get('/skills/:id/details', trainingController.getSkillDetails);
router.get('/skills/:id/slots', trainingController.getSkillSlots);
router.get('/bookings', trainingController.getStudentBookings);
router.post('/bookings', trainingController.createBooking);

export default router;
