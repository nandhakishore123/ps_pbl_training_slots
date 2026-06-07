import db from '../../config/db.js';

// ── Resolve faculty_id from user_id ─────────────────────────
export const getFacultyByUserId = async (userId) => {
  if (!userId) return null;
  const [rows] = await db.execute(
    `SELECT faculty_id, name, reg_num, department FROM faculties WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
};

// ── Dashboard KPI ────────────────────────────────────────────
export const getFacultyDashboardKPI = async (facultyId) => {
  const [[venueCount]] = await db.execute(
    `SELECT COUNT(*) as count FROM venue_mapping WHERE faculty_id = ?`,
    [facultyId]
  );

  const [[studentCount]] = await db.execute(
    `SELECT COUNT(*) as count
     FROM student_booking sb
     JOIN venue_mapping vm ON sb.mapping_id = vm.mapping_id
     WHERE vm.faculty_id = ?
       AND sb.status IN ('ONGOING','MALPRACTICE')`,
    [facultyId]
  );

  const [[pendingTransfers]] = await db.execute(
    `SELECT COUNT(*) as count
     FROM venue_mapping_transfer_log
     WHERE from_faculty_id = ? AND current_status = 'PENDING'`,
    [facultyId]
  );

  return {
    assignedVenues: venueCount.count,
    totalStudents: studentCount.count,
    pendingTransfers: pendingTransfers.count,
    pendingApprovals: 0,
  };
};

// ── My Venues (venue_mapping rows for this faculty) ──────────
export const getMyVenues = async (facultyId) => {
  const [rows] = await db.execute(
    `SELECT
       vm.mapping_id,
       COALESCE(MAX(ts.skill_type), 'PS') AS skill_type,
       vm.current_bookings,
       v.venue_id, v.venue_name, v.location, v.capacity,
       st.slot_id, st.start_time, st.end_time
     FROM venue_mapping vm
     JOIN venues v ON vm.venue_id = v.venue_id
     JOIN slot_timings st ON vm.slot_id = st.slot_id
     LEFT JOIN venue_alloted_skills vas ON vas.venue_id = v.venue_id
     LEFT JOIN training_skills ts ON ts.training_skill_id = vas.training_skill_id
     WHERE vm.faculty_id = ?
     GROUP BY vm.mapping_id, vm.current_bookings, v.venue_id, v.venue_name, v.location, v.capacity, st.slot_id, st.start_time, st.end_time
     ORDER BY v.venue_name ASC`,
    [facultyId]
  );
  return rows;
};

// ── Students for a mapping ───────────────────────────────────
export const getStudentsByMapping = async (mappingId, facultyId) => {
  // Verify the mapping belongs to this faculty first
  const [mappingRows] = await db.execute(
    `SELECT mapping_id FROM venue_mapping WHERE mapping_id = ? AND faculty_id = ?`,
    [mappingId, facultyId]
  );
  if (mappingRows.length === 0) throw new Error('Forbidden: mapping not yours');

  const [rows] = await db.execute(
    `SELECT
       sb.booking_id, sb.status, sb.is_present, sb.remarks,
       s.student_id, s.name, s.reg_num, s.course, s.year_of_study
     FROM student_booking sb
     JOIN students s ON sb.student_id = s.student_id
     WHERE sb.mapping_id = ?
     ORDER BY s.name ASC`,
    [mappingId]
  );
  return rows;
};

// ── Mark single attendance ───────────────────────────────────
export const markAttendance = async (bookingId, facultyId) => {
  // Verify ownership
  const [rows] = await db.execute(
    `SELECT sb.booking_id, sb.student_id, sb.mapping_id
     FROM student_booking sb
     JOIN venue_mapping vm ON sb.mapping_id = vm.mapping_id
     WHERE sb.booking_id = ? AND vm.faculty_id = ?`,
    [bookingId, facultyId]
  );
  if (rows.length === 0) throw new Error('Forbidden or not found');
  const booking = rows[0];

  // Upsert into attendance
  await db.execute(
    `INSERT INTO attendance (booking_id, student_id, attendance_status)
     VALUES (?, ?, 'PRESENT')
     ON DUPLICATE KEY UPDATE attendance_status = 'PRESENT'`,
    [bookingId, booking.student_id]
  );

  // Also set is_present flag on booking
  await db.execute(
    `UPDATE student_booking SET is_present = 1 WHERE booking_id = ?`,
    [bookingId]
  );
};

// ── Mark ALL ongoing students in a mapping as present ────────
export const markAllAttendance = async (mappingId, facultyId) => {
  // Verify ownership
  const [mappingRows] = await db.execute(
    `SELECT mapping_id FROM venue_mapping WHERE mapping_id = ? AND faculty_id = ?`,
    [mappingId, facultyId]
  );
  if (mappingRows.length === 0) throw new Error('Forbidden: mapping not yours');

  // Get all ONGOING bookings without attendance
  const [bookings] = await db.execute(
    `SELECT sb.booking_id, sb.student_id
     FROM student_booking sb
     LEFT JOIN attendance a ON sb.booking_id = a.booking_id
     WHERE sb.mapping_id = ?
       AND sb.status = 'ONGOING'
       AND (a.attendance_id IS NULL OR a.attendance_status = 'ABSENT')`,
    [mappingId]
  );

  for (const b of bookings) {
    await db.execute(
      `INSERT INTO attendance (booking_id, student_id, attendance_status)
       VALUES (?, ?, 'PRESENT')
       ON DUPLICATE KEY UPDATE attendance_status = 'PRESENT'`,
      [b.booking_id, b.student_id]
    );
    await db.execute(
      `UPDATE student_booking SET is_present = 1 WHERE booking_id = ?`,
      [b.booking_id]
    );
  }

  return bookings.length;
};

// ── Mark malpractice ─────────────────────────────────────────
export const markMalpractice = async (bookingId, facultyId, reason) => {
  const [rows] = await db.execute(
    `SELECT sb.booking_id FROM student_booking sb
     JOIN venue_mapping vm ON sb.mapping_id = vm.mapping_id
     WHERE sb.booking_id = ? AND vm.faculty_id = ?`,
    [bookingId, facultyId]
  );
  if (rows.length === 0) throw new Error('Forbidden or not found');

  await db.execute(
    `UPDATE student_booking
     SET status = 'MALPRACTICE', remarks = ?
     WHERE booking_id = ?`,
    [reason, bookingId]
  );
};

// ── Revoke malpractice ───────────────────────────────────────
export const revokeMalpractice = async (bookingId, facultyId) => {
  const [rows] = await db.execute(
    `SELECT sb.booking_id FROM student_booking sb
     JOIN venue_mapping vm ON sb.mapping_id = vm.mapping_id
     WHERE sb.booking_id = ? AND vm.faculty_id = ?`,
    [bookingId, facultyId]
  );
  if (rows.length === 0) throw new Error('Forbidden or not found');

  await db.execute(
    `UPDATE student_booking
     SET status = 'ONGOING', remarks = NULL
     WHERE booking_id = ?`,
    [bookingId]
  );
};

// ── Transfer request ─────────────────────────────────────────
export const createTransferRequest = async (fromFacultyId, mappingId, toFacultyId, reason) => {
  // Get the mapping details
  const [rows] = await db.execute(
    `SELECT venue_id, slot_id FROM venue_mapping WHERE mapping_id = ? AND faculty_id = ?`,
    [mappingId, fromFacultyId]
  );
  if (rows.length === 0) throw new Error('Forbidden or mapping not found');
  const { venue_id, slot_id } = rows[0];

  const [result] = await db.execute(
    `INSERT INTO venue_mapping_transfer_log
       (from_faculty_id, to_faculty_id, reason, venue_id, slot_id, current_status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [fromFacultyId, toFacultyId, reason, venue_id, slot_id]
  );
  return result.insertId;
};

// ── List own transfer requests ───────────────────────────────
export const getMyTransferRequests = async (facultyId) => {
  const [rows] = await db.execute(
    `SELECT
       tl.transfer_id, tl.current_status, tl.reason, tl.created_at,
       v.venue_name, v.location,
       st.start_time, st.end_time,
       tf.name as to_faculty_name, tf.department as to_faculty_dept
     FROM venue_mapping_transfer_log tl
     JOIN venues v ON tl.venue_id = v.venue_id
     JOIN slot_timings st ON tl.slot_id = st.slot_id
     JOIN faculties tf ON tl.to_faculty_id = tf.faculty_id
     WHERE tl.from_faculty_id = ?
     ORDER BY tl.created_at DESC`,
    [facultyId]
  );
  return rows;
};
