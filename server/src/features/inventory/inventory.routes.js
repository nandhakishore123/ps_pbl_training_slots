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
  getMyObligations,
  createReturn,
  getMyReturns,
  getPendingReturns,
  approveReturn,
  rejectReturn,
  getReturnsReadOnly,
  getAdminOverview,
  getAdminBuying,
  getAdminReturns,
  getApprovers,
  setApprovers,
  getApproverFaculty,
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

// ── Student return flow (role_id = 1) ────────────────────────
router.get('/obligations/mine', authMiddleware, requireRole(1), getMyObligations);        // open obligations to clear
router.post('/returns', authMiddleware, requireRole(1), createReturn);                     // create RETURN request
router.get('/returns/mine', authMiddleware, requireRole(1), getMyReturns);                 // student's returns + status

// ── Incharge/Admin return approval (role 3,4); faculty VIEW-only (2,3,4) ──
router.get('/returns/pending', authMiddleware, requireRole(3, 4), getPendingReturns);      // incharge/admin queue
router.post('/returns/:id/approve', authMiddleware, requireRole(3, 4), approveReturn);     // approve -> add stock back
router.post('/returns/:id/reject', authMiddleware, requireRole(3, 4), rejectReturn);       // reject -> obligations reopen
router.get('/returns', authMiddleware, requireRole(2, 3, 4), getReturnsReadOnly);          // faculty/incharge/admin VIEW

// ── Admin full view (role 3) — see everything ────────────────
// Admin already approves/rejects buying (via /buying/:id/* with the role-3 bypass)
// and returns (via /returns/:id/*), and manages stock (/stock, /items). These add
// the admin-only "see everything" reads.
router.get('/admin/overview', authMiddleware, requireRole(3), getAdminOverview);   // summary counts
router.get('/admin/buying', authMiddleware, requireRole(3), getAdminBuying);        // ALL buying, both purposes
router.get('/admin/returns', authMiddleware, requireRole(3), getAdminReturns);      // ALL returns

// ── Admin-configurable approvers (Stage 7) ───────────────────
// GET effective ids is open to any authenticated user (faculty gate the box);
// listing faculty + writing the setting are admin-only.
router.get('/approvers', authMiddleware, getApprovers);                              // effective approver user_ids
router.get('/faculty', authMiddleware, requireRole(3), getApproverFaculty);          // admin dropdown source
router.put('/approvers', authMiddleware, requireRole(3), setApprovers);              // admin set both approvers

export default router;
