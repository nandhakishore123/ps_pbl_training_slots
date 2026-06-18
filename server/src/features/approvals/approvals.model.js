import db from '../../config/db.js';

// ── Lab Record approval (shared faculty + admin) — Stage 6a-i ─────────────────
// A "lab record" = a student's text answers to the end-of-session questions,
// stored one row per question per booking_id in end_survey. Approval is
// PER-BOOKING: every end_survey row for a booking_id carries the same
// approval_status / approver_user_id / approved_at (written atomically), exactly
// like the existing verifyInchargeLabRecord which sets is_incharge_verified=1
// across the booking's rows.
//
// DECOUPLED from the seat engine: these functions ONLY read/write end_survey
// approval columns (+ the existing is_incharge_verified flag). They NEVER touch
// venue_slots.current_bookings or student_booking.status, and NEVER write points.
// TiDB-safe: equality JOIN ON only; the per-booking write is keyed by booking_id.

const exec = (conn) => conn || db;

// Ownership predicate is applied ONLY when facultyId is provided (faculty path);
// the admin path passes facultyId = null (no ownership restriction).

// One entry PER booking that has submitted a lab record, with the fields the
// approvals list needs. status: 'pending' → only PENDING/unset; 'all' → everything.
export const listLabRecordsForApproval = async ({ status = 'pending', facultyId = null } = {}) => {
  const where = ['es.booking_id IS NOT NULL'];
  const params = [];
  if (status === 'pending') {
    // Rows submitted before the column existed may be NULL → treat as pending.
    where.push(`(es.approval_status = 'PENDING' OR es.approval_status IS NULL)`);
  }
  if (facultyId != null) { where.push('vm.faculty_id = ?'); params.push(Number(facultyId)); }

  const [rows] = await db.execute(
    `SELECT
        sb.booking_id,
        s.student_id,
        s.name AS student_name,
        s.reg_num,
        ts.skill_name,
        ts.skill_type,
        sl.level_name,
        f.name AS faculty_name,
        DATE_FORMAT(vs.slot_date, '%Y-%m-%d') AS slot_date,
        MAX(es.approval_status) AS approval_status,
        MIN(es.created_at) AS submitted_at,
        COUNT(*) AS response_count
     FROM end_survey es
     JOIN student_booking sb ON sb.booking_id = es.booking_id
     JOIN students s ON s.student_id = sb.student_id
     JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
     LEFT JOIN skill_levels sl ON sl.level_id = sb.level_id
     JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
     LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
     JOIN venue_slots vs ON vs.venue_slot_id = sb.venue_slot_id
     WHERE ${where.join(' AND ')}
     GROUP BY sb.booking_id, s.student_id, s.name, s.reg_num, ts.skill_name,
              ts.skill_type, sl.level_name, f.name, vs.slot_date
     ORDER BY submitted_at DESC`,
    params
  );
  return rows.map((r) => ({
    ...r,
    approval_status: r.approval_status || 'PENDING',
    response_count: Number(r.response_count ?? 0),
  }));
};

// Booking header + the question/response pairs for review. Ownership-gated when
// facultyId is provided. Throws (Forbidden / Not found) when no rows match.
export const getLabRecordDetail = async (bookingId, { facultyId = null } = {}) => {
  const headParams = [Number(bookingId)];
  let ownSql = '';
  if (facultyId != null) { ownSql = ' AND vm.faculty_id = ?'; headParams.push(Number(facultyId)); }

  const [headRows] = await db.execute(
    `SELECT
        sb.booking_id, sb.student_id,
        s.name AS student_name, s.reg_num,
        ts.skill_name, ts.skill_type, sl.level_name,
        f.name AS faculty_name,
        DATE_FORMAT(vs.slot_date, '%Y-%m-%d') AS slot_date,
        MAX(es.approval_status) AS approval_status
     FROM end_survey es
     JOIN student_booking sb ON sb.booking_id = es.booking_id
     JOIN students s ON s.student_id = sb.student_id
     JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
     LEFT JOIN skill_levels sl ON sl.level_id = sb.level_id
     JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
     LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
     JOIN venue_slots vs ON vs.venue_slot_id = sb.venue_slot_id
     WHERE es.booking_id = ?${ownSql}
     GROUP BY sb.booking_id, sb.student_id, s.name, s.reg_num, ts.skill_name,
              ts.skill_type, sl.level_name, f.name, vs.slot_date
     LIMIT 1`,
    headParams
  );
  if (headRows.length === 0) {
    const err = new Error(facultyId != null
      ? 'Forbidden: lab record not found or not in your venue'
      : 'Lab record not found');
    err.status = facultyId != null ? 403 : 404;
    throw err;
  }
  const head = headRows[0];

  const [responses] = await db.execute(
    `SELECT q.survey_question_id, q.question, es.student_response
     FROM end_survey es
     JOIN end_survey_questions q ON q.survey_question_id = es.survey_question_id
     WHERE es.booking_id = ?
     ORDER BY q.survey_question_id ASC`,
    [Number(bookingId)]
  );

  return {
    booking: { ...head, approval_status: head.approval_status || 'PENDING' },
    responses,
  };
};

// Ownership check used by the faculty path before a write.
export const facultyOwnsBooking = async (bookingId, facultyId, conn = null) => {
  const [rows] = await exec(conn).execute(
    `SELECT 1 FROM student_booking sb
     JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
     WHERE sb.booking_id = ? AND vm.faculty_id = ?
     LIMIT 1`,
    [Number(bookingId), Number(facultyId)]
  );
  return rows.length > 0;
};

// Per-booking approval write. status ∈ {APPROVED, REJECTED}. Keeps the existing
// is_incharge_verified flag consistent (1 on approve, 0 on reject). Returns the
// number of end_survey rows updated (0 ⇒ no lab record exists for that booking).
export const setLabRecordApproval = async (bookingId, status, approverUserId, conn = null) => {
  const isApproved = status === 'APPROVED';
  const [result] = await exec(conn).execute(
    `UPDATE end_survey
       SET approval_status = ?, approver_user_id = ?, approved_at = NOW(), is_incharge_verified = ?
     WHERE booking_id = ?`,
    [status, Number(approverUserId), isApproved ? 1 : 0, Number(bookingId)]
  );
  return result.affectedRows ?? 0;
};
