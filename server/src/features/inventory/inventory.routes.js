import express from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  getCategories,
  getItems,
  getItem,
  createRequest,
  getMyRequests,
  getStock,
  editStock,
  addStock,
  addItem,
  getBuying,
  getPendingBuying,
  approveBuying,
  rejectBuying,
} from './inventory.controller.js';

const router = express.Router();

// ── Catalog reads — any authenticated user may browse items ──
router.get('/categories', authMiddleware, getCategories);
router.get('/items', authMiddleware, getItems);          // ?category=...
router.get('/items/:id', authMiddleware, getItem);

// ── Student BUYING flow (role_id = 1) ────────────────────────
router.post('/requests', authMiddleware, requireRole(1), createRequest);      // create PENDING buying request
router.get('/requests/mine', authMiddleware, requireRole(1), getMyRequests);  // student's own requests + status

// ── Inventory Incharge (role 4) + Admin (role 3) — stock mgmt ─
router.get('/stock', authMiddleware, requireRole(3, 4), getStock);             // ?category=&search=
router.post('/stock/:id/edit', authMiddleware, requireRole(3, 4), editStock);  // { quantity } → set absolute
router.post('/stock/:id/add', authMiddleware, requireRole(3, 4), addStock);    // { quantity } → add arrivals
router.post('/items', authMiddleware, requireRole(3, 4), addItem);             // new catalog item
router.get('/buying', authMiddleware, requireRole(3, 4), getBuying);           // read-only buying list

// ── Faculty buying approval (role 2 by purpose; Admin role 3) ─
router.get('/buying/pending', authMiddleware, requireRole(2, 3), getPendingBuying);       // routed by purpose in service
router.post('/buying/:id/approve', authMiddleware, requireRole(2, 3), approveBuying);      // approve -> reduce stock
router.post('/buying/:id/reject', authMiddleware, requireRole(2, 3), rejectBuying);        // reject ({ remarks })

// ── TODO (Stage 5) — return routes ───────────────────────────
// GET  /returns             (requireRole(3,4))  - incharge/admin see returns
// POST /returns/:id/approve (requireRole(3,4))  - incharge approve return -> add stock
// POST   /buying/:id/approve  (requireRole(2,3))  - faculty approve buying -> reduce stock
// GET    /returns             (requireRole(3,4))  - incharge/admin see returns
// POST   /returns/:id/approve (requireRole(3,4))  - incharge approve return -> add stock
// GET    /stock               (requireRole(3,4))  - incharge stock management
// POST   /stock/:id/adjust    (requireRole(3,4))  - incharge adjust stock
// POST   /items               (requireRole(3,4))  - incharge add new item

export default router;
