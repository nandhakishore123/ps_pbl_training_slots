import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  createSurvey,
  listSurveys,
  getSurveyDetail,
  getSurveyResponses,
  exportSurveyResponses,
  setSurveyStatus,
  deleteSurvey,
  getStudentSurveys,
  getStudentSurveyDetail,
  submitStudentSurvey,
} from './survey.controller.js';

const router = express.Router();

// ── Student-facing surveys (role_id = 1) ─────────────────────
// Declared before the admin '/:id' so the '/student/...' subpaths resolve to
// these handlers (distinct second segment keeps them clear of '/:id').
router.get('/student/list', authMiddleware, requireRole(1), getStudentSurveys);
router.get('/student/:id', authMiddleware, requireRole(1), getStudentSurveyDetail);
router.post('/student/:id/submit', authMiddleware, requireRole(1), submitStudentSurvey);

// ── Admin-authored surveys (role_id = 3) ─────────────────────
router.post('/', authMiddleware, requireRole(3), createSurvey);
router.get('/', authMiddleware, requireRole(3), listSurveys);
router.get('/:id', authMiddleware, requireRole(3), getSurveyDetail);
router.get('/:id/responses', authMiddleware, requireRole(3), getSurveyResponses);
router.get('/:id/responses/export', authMiddleware, requireRole(3), exportSurveyResponses);
router.patch('/:id/status', authMiddleware, requireRole(3), setSurveyStatus);
router.delete('/:id', authMiddleware, requireRole(3), deleteSurvey);

export default router;
