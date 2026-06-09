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
export const createTransferRequest = async (fromFacultyId, mappingId, toFacultyId, reason, targetVenueId = null, targetSlotId = null, transferDate = null) => {
  // Get the mapping details
  const [rows] = await db.execute(
    `SELECT venue_id, slot_id FROM venue_mapping WHERE mapping_id = ? AND faculty_id = ?`,
    [mappingId, fromFacultyId]
  );
  if (rows.length === 0) throw new Error('Forbidden or mapping not found');
  const { venue_id, slot_id } = rows[0];

  const [result] = await db.execute(
    `INSERT INTO venue_mapping_transfer_log
       (from_faculty_id, to_faculty_id, reason, venue_id, slot_id, target_venue_id, target_slot_id, transfer_date, current_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [fromFacultyId, toFacultyId || null, reason, venue_id, slot_id, targetVenueId || null, targetSlotId || null, transferDate || null]
  );
  return result.insertId;
};

// ── List own transfer requests ───────────────────────────────
export const getMyTransferRequests = async (facultyId) => {
  const [rows] = await db.execute(
    `SELECT
       tl.transfer_id, tl.current_status, tl.reason, tl.created_at, tl.transfer_date,
       v.venue_name, v.location,
       st.start_time, st.end_time,
       tv.venue_name as target_venue_name, tv.location as target_location,
       tst.start_time as target_start_time, tst.end_time as target_end_time,
       tf.name as to_faculty_name, tf.department as to_faculty_dept
     FROM venue_mapping_transfer_log tl
     JOIN venues v ON tl.venue_id = v.venue_id
     JOIN slot_timings st ON tl.slot_id = st.slot_id
     LEFT JOIN venues tv ON tl.target_venue_id = tv.venue_id
     LEFT JOIN slot_timings tst ON tl.target_slot_id = tst.slot_id
     LEFT JOIN faculties tf ON tl.to_faculty_id = tf.faculty_id
     WHERE tl.from_faculty_id = ?
     ORDER BY tl.created_at DESC`,
    [facultyId]
  );
  return rows;
};

// ── Get student review data (MCQ assessment + end survey response) ──
export const getStudentReviewData = async (bookingId, facultyId) => {
  // 1. Verify faculty owns the booking mapping and retrieve booking info (including venue/slot)
  const [bookingRows] = await db.execute(
    `SELECT sb.booking_id, sb.student_id, sb.training_skill_id, sb.level_id,
            sb.booking_date, sb.status, sb.is_present, sb.remarks,
            s.name as student_name, s.reg_num as student_reg_num,
            s.course as student_course,
            ts.skill_name, sl.level_name,
            v.venue_name,
            st.start_time, st.end_time
     FROM student_booking sb
     JOIN students s ON sb.student_id = s.student_id
     JOIN venue_mapping vm ON sb.mapping_id = vm.mapping_id
     JOIN venues v ON vm.venue_id = v.venue_id
     JOIN slot_timings st ON vm.slot_id = st.slot_id
     JOIN training_skills ts ON sb.training_skill_id = ts.training_skill_id
     LEFT JOIN skill_levels sl ON sb.level_id = sl.level_id
     WHERE sb.booking_id = ? AND vm.faculty_id = ?`,
    [bookingId, facultyId]
  );

  if (bookingRows.length === 0) {
    throw new Error('Forbidden: Booking not found or mapping not yours');
  }
  const booking = bookingRows[0];

  // 2. Fetch assessment details if there is an active MCQ assessment for this skill and level
  const [assessmentRows] = await db.execute(
    `SELECT assessment_id, assessment_title, total_marks, passing_marks
     FROM assessments
     WHERE training_skill_id = ? AND level_id = ? AND assessment_type = 'MCQ' AND is_active = 1`,
    [booking.training_skill_id, booking.level_id]
  );

  let assessment = null;
  let mcqAnswers = [];

  if (assessmentRows.length > 0) {
    const ass = assessmentRows[0];

    // Fetch the student's submission
    const [subRows] = await db.execute(
      `SELECT student_assessment_id, score_obtained, status, submitted_at
       FROM student_assessments
       WHERE student_id = ? AND assessment_id = ?
       ORDER BY submitted_at DESC LIMIT 1`,
      [booking.student_id, ass.assessment_id]
    );

    if (subRows.length > 0) {
      const sub = subRows[0];
      assessment = {
        assessment_id: ass.assessment_id,
        assessment_title: ass.assessment_title,
        total_marks: ass.total_marks,
        passing_marks: ass.passing_marks,
        score_obtained: sub.score_obtained,
        status: sub.status,
        submitted_at: sub.submitted_at
      };

      // Get individual answers/questions
      const [answerRows] = await db.execute(
        `SELECT
           q.mcq_question_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option,
           ans.selected_option, ans.is_correct, ans.marks_awarded
         FROM assessment_mcq_questions q
         LEFT JOIN student_mcq_answers ans ON q.mcq_question_id = ans.mcq_question_id AND ans.student_assessment_id = ?
         WHERE q.assessment_id = ?`,
        [sub.student_assessment_id, ass.assessment_id]
      );
      mcqAnswers = answerRows;
    }
  }

  // 3. Fetch end survey responses for this booking
  const [surveyRows] = await db.execute(
    `SELECT q.survey_question_id, q.question, es.student_response, es.is_caption_verified, es.is_incharge_verified
     FROM end_survey es
     JOIN end_survey_questions q ON es.survey_question_id = q.survey_question_id
     WHERE es.booking_id = ? AND es.student_id = ?`,
    [bookingId, booking.student_id]
  );

  return {
    booking,
    assessment,
    mcqAnswers,
    surveyResponses: surveyRows
  };
};

// ── Verify / approve a student's end-survey as incharge ──────
export const verifyInchargeLabRecord = async (bookingId, facultyId) => {
  // Verify the faculty owns the mapping this booking belongs to
  const [rows] = await db.execute(
    `SELECT sb.booking_id, sb.student_id
     FROM student_booking sb
     JOIN venue_mapping vm ON sb.mapping_id = vm.mapping_id
     WHERE sb.booking_id = ? AND vm.faculty_id = ?`,
    [bookingId, facultyId]
  );
  if (rows.length === 0) throw new Error('Forbidden: Booking not found or mapping not yours');
  const { student_id } = rows[0];

  // Update is_incharge_verified for all survey rows of this booking
  const [result] = await db.execute(
    `UPDATE end_survey
     SET is_incharge_verified = 1
     WHERE booking_id = ? AND student_id = ?`,
    [bookingId, student_id]
  );
  return result.affectedRows;
};

// ── Get all active venues, slot timings, and current allocations ──────
export const getAllVenueAllocations = async () => {
  const [venues] = await db.execute(
    `SELECT venue_id, venue_name, location, capacity FROM venues WHERE is_active = 1`
  );
  const [slots] = await db.execute(
    `SELECT slot_id, start_time, end_time FROM slot_timings WHERE is_active = 1`
  );
  const [mappings] = await db.execute(
    `SELECT vm.mapping_id, vm.venue_id, vm.slot_id, vm.faculty_id, f.name as faculty_name, f.reg_num as faculty_reg_num
     FROM venue_mapping vm
     JOIN faculties f ON vm.faculty_id = f.faculty_id`
  );
  return { venues, slots, mappings };
};
