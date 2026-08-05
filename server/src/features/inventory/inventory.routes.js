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
  updateItem,
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
  // ── LAB / INTERN PURCHASE (Stage 3) — REMOVABLE ──
  getLabs,
  createLab,
  updateLab,
  deleteLab,
  getLabPurchases,
  getLabPurchasesFeed,
  getConsumptionReport,
  createLabPurchase,
  // ── INTERN LAB RETURNS — REMOVABLE ──
  getMyReturnablePurchases,
  createLabReturn,
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
// Full edit of an existing item — all catalog fields + optional current_quantity
// (a quantity change is logged as a STOCK_EDIT txn). ADDITIVE; does not affect
// the GET /items/:id read above, which stays open to any authenticated user.
router.put('/items/:id', authMiddleware, requireRole(3, 4), updateItem);
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

// ═══ LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (start) ═══
// Labs master: admin (3) manages; incharge (4) and interns (5) read the list
// (interns need it to render their lab cards). Students (1) read it too, for the
// required "Select Lab" dropdown on a buying request — but the service FORCES
// active-only for role 1, so a student cannot list inactive labs by omitting
// ?active=1.
router.get('/labs', authMiddleware, requireRole(1, 3, 4, 5), getLabs);               // ?active=1 to filter
router.post('/labs', authMiddleware, requireRole(3), createLab);                     // { lab_name, lab_code?, in_charge?, room_no? }
router.put('/labs/:labId', authMiddleware, requireRole(3), updateLab);               // partial update
router.delete('/labs/:labId', authMiddleware, requireRole(3), deleteLab);            // SOFT delete → is_active = 0

// Per-lab purchase log — ?limit=N (default 5) or ?limit=all for the full log.
router.get('/labs/:labId/purchases', authMiddleware, requireRole(3, 4, 5), getLabPurchases);

// Cross-lab read-only feed, grouped per cart (incharge/admin view). Distinct
// path so it cannot collide with /labs/:labId/purchases. Students excluded.
router.get('/lab-purchases-feed', authMiddleware, requireRole(3, 4, 5), getLabPurchasesFeed);

// Consumption report — approved student buys + intern lab purchases in a date
// range. Admin + Incharge only (oversight); interns and students excluded.
router.get('/reports/consumption', authMiddleware, requireRole(3, 4), getConsumptionReport);  // ?from=YYYY-MM-DD&to=YYYY-MM-DD

// Intern direct buy — no request, no approval; decrements the shared pool.
// Role 3 is included so an admin can exercise it without an intern account.
router.post('/lab-purchase', authMiddleware, requireRole(5, 3), createLabPurchase);  // { lab_id, items:[{item_id, quantity}] }
// ═══ LAB / INTERN PURCHASE (Stage 3) — REMOVABLE BLOCK (end) ═══

// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (start) ═══
// Intern direct return against their OWN past purchase — no request, no
// approval; adds stock back to the shared pool. Role 3 is included for the same
// reason as /lab-purchase (an admin can exercise it without an intern account),
// but both handlers scope to req.user, so an admin only ever sees/returns their
// own purchases here.
router.get('/my-returnable-purchases', authMiddleware, requireRole(5, 3), getMyReturnablePurchases);
router.post('/lab-return', authMiddleware, requireRole(5, 3), createLabReturn);      // { purchase_id, quantity }
// ═══ INTERN LAB RETURNS — REMOVABLE BLOCK (end) ═══

export default router;
