import db from '../../config/db.js';
import * as approvalsModel from './approvals.model.js';

// ── Lab Record approval — shared by faculty + admin (Stage 6a-i) ─────────────
// Same logic both ways; the ONLY difference is ownership: the faculty path passes
// the resolved facultyId (ownership-gated), the admin path passes null (open).
// approverUserId is always req.user.user_id — works for both faculty and admin.

const VALID_DECISIONS = ['APPROVED', 'REJECTED'];

export const getLabRecords = async ({ status = 'pending', facultyId = null } = {}) => {
  const normStatus = status === 'all' ? 'all' : 'pending';
  return await approvalsModel.listLabRecordsForApproval({ status: normStatus, facultyId });
};

export const getLabRecordDetail = async (bookingId, { facultyId = null } = {}) => {
  if (!bookingId) { const e = new Error('Booking id is required'); e.status = 400; throw e; }
  return await approvalsModel.getLabRecordDetail(bookingId, { facultyId });
};

// Approve / reject in one transaction. facultyId provided ⇒ ownership enforced.
const decideLabRecord = async (bookingId, status, approverUserId, facultyId) => {
  if (!bookingId) { const e = new Error('Booking id is required'); e.status = 400; throw e; }
  if (!VALID_DECISIONS.includes(status)) { const e = new Error('Invalid decision'); e.status = 400; throw e; }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (facultyId != null) {
      const owns = await approvalsModel.facultyOwnsBooking(bookingId, facultyId, conn);
      if (!owns) { const e = new Error('Forbidden: this booking is not in your venue'); e.status = 403; throw e; }
    }

    const affected = await approvalsModel.setLabRecordApproval(bookingId, status, approverUserId, conn);
    if (affected === 0) {
      const e = new Error('No lab record found for this booking'); e.status = 404; throw e;
    }

    await conn.commit();
    return { bookingId: Number(bookingId), status, rowsUpdated: affected };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const approveLabRecord = async (bookingId, approverUserId, { facultyId = null } = {}) =>
  decideLabRecord(bookingId, 'APPROVED', approverUserId, facultyId);

export const rejectLabRecord = async (bookingId, approverUserId, { facultyId = null } = {}) =>
  // No reject_reason column on end_survey — reason is accepted by the API but not
  // persisted in 6a-i (noted for a future schema add).
  decideLabRecord(bookingId, 'REJECTED', approverUserId, facultyId);
