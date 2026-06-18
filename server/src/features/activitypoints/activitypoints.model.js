import db from '../../config/db.js';

// ── Activity-Points drill-down + pass/fail confirmation ──────────────────────
// DECOUPLED from the seat/booking/assessment engines. Reads only; the single
// write target is activity_point_confirmations (a per-booking confirmation flag
// for the points-export handoff — NO points / point_transactions are ever
// written here). TiDB-safe: equality JOINs only; the assessment status/score is
// read via the SAME correlated-subquery pattern as listAllBookings; the flag
// write is a single-table upsert keyed by booking_id.

// Courses = training_skills (single source → admin-created courses auto-appear).
export const listCourses = async () => {
  const [rows] = await db.execute(
    `SELECT ts.training_skill_id, ts.skill_name, ts.skill_type,
            ts.category_id, c.category_name, ts.image_url
       FROM training_skills ts
       LEFT JOIN training_skill_category c ON c.category_id = ts.category_id
      WHERE ts.is_active = 1
      ORDER BY ts.skill_name ASC`
  );
  return rows ?? [];
};

// Slot timings for a course that had students (venue_slots INNER JOIN bookings
// for that training_skill_id → only slots that actually had students). Counts
// total + attended (PRESENT). Equality JOINs only.
export const listSlotsForCourse = async (skillId) => {
  const [rows] = await db.execute(
    `SELECT
        vs.venue_slot_id,
        DATE_FORMAT(vs.slot_date, '%Y-%m-%d') AS slot_date,
        vs.start_time, vs.end_time,
        v.venue_id, v.venue_name,
        COUNT(*) AS student_count,
        SUM(CASE WHEN (att.attendance_status = 'PRESENT' OR sb.is_present = 1) THEN 1 ELSE 0 END) AS attended_count
      FROM venue_slots vs
      JOIN student_booking sb ON sb.venue_slot_id = vs.venue_slot_id
      JOIN venue_mapping vm ON vm.mapping_id = vs.mapping_id
      JOIN venues v ON v.venue_id = vm.venue_id
      LEFT JOIN attendance att ON att.booking_id = sb.booking_id
     WHERE sb.training_skill_id = ?
     GROUP BY vs.venue_slot_id, vs.slot_date, vs.start_time, vs.end_time, v.venue_id, v.venue_name
     ORDER BY vs.slot_date DESC, vs.start_time ASC`,
    [Number(skillId)]
  );
  return rows ?? [];
};

// Pass/Fail list for one venue_slot. Latest assessment status/score via the
// listAllBookings correlated-subquery pattern (equality joins inside). LEFT JOIN
// activity_point_confirmations for the per-booking confirmation flag.
export const listSlotStudents = async (venueSlotId) => {
  const [rows] = await db.execute(
    `SELECT
        sb.booking_id,
        sb.student_id,
        sb.training_skill_id,
        sb.level_id,
        s.name AS student_name,
        s.reg_num,
        s.course,
        s.year_of_study,
        ts.skill_name,
        sb.status AS booking_status,
        att.attendance_status,
        (SELECT sa.status FROM student_assessments sa
           JOIN assessments a ON a.assessment_id = sa.assessment_id
          WHERE sa.student_id = sb.student_id
            AND a.training_skill_id = sb.training_skill_id
            AND (sb.level_id IS NULL OR a.level_id = sb.level_id)
          ORDER BY sa.student_assessment_id DESC LIMIT 1) AS assessment_status,
        (SELECT sa.score_obtained FROM student_assessments sa
           JOIN assessments a ON a.assessment_id = sa.assessment_id
          WHERE sa.student_id = sb.student_id
            AND a.training_skill_id = sb.training_skill_id
            AND (sb.level_id IS NULL OR a.level_id = sb.level_id)
          ORDER BY sa.student_assessment_id DESC LIMIT 1) AS assessment_score,
        (SELECT sa.total_marks FROM student_assessments sa
           JOIN assessments a ON a.assessment_id = sa.assessment_id
          WHERE sa.student_id = sb.student_id
            AND a.training_skill_id = sb.training_skill_id
            AND (sb.level_id IS NULL OR a.level_id = sb.level_id)
          ORDER BY sa.student_assessment_id DESC LIMIT 1) AS assessment_total,
        COALESCE(apc.status, 'PENDING') AS confirm_status,
        apc.confirmed_at
      FROM student_booking sb
      JOIN students s ON s.student_id = sb.student_id
      JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
      LEFT JOIN attendance att ON att.booking_id = sb.booking_id
      LEFT JOIN activity_point_confirmations apc ON apc.booking_id = sb.booking_id
     WHERE sb.venue_slot_id = ?
     ORDER BY s.name ASC`,
    [Number(venueSlotId)]
  );
  return rows ?? [];
};

// Confirmation flag upsert — single-table write keyed by booking_id (PK).
// status ∈ {APPROVED, REJECTED}. NO points writes.
export const setConfirmation = async (bookingId, status, userId) => {
  await db.execute(
    `INSERT INTO activity_point_confirmations (booking_id, status, confirmed_by, confirmed_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE status = VALUES(status), confirmed_by = VALUES(confirmed_by), confirmed_at = NOW()`,
    [Number(bookingId), status, userId != null ? Number(userId) : null]
  );
  return true;
};

// Booking core fields (for the faculty PASSED-only gate + ownership lookup).
export const getBookingCore = async (bookingId) => {
  const [rows] = await db.execute(
    `SELECT booking_id, student_id, training_skill_id, level_id, venue_slot_id, mapping_id, status
       FROM student_booking WHERE booking_id = ? LIMIT 1`,
    [Number(bookingId)]
  );
  return rows?.[0] ?? null;
};

// Latest assessment status for a booking (PASSED/FAILED gate). Equality JOIN.
export const getLatestAssessmentStatus = async ({ studentId, trainingSkillId, levelId }) => {
  const params = [Number(studentId), Number(trainingSkillId)];
  let levelSql = '';
  if (levelId != null) { levelSql = ' AND a.level_id = ?'; params.push(Number(levelId)); }
  const [rows] = await db.execute(
    `SELECT sa.status FROM student_assessments sa
       JOIN assessments a ON a.assessment_id = sa.assessment_id
      WHERE sa.student_id = ? AND a.training_skill_id = ?${levelSql}
      ORDER BY sa.student_assessment_id DESC LIMIT 1`,
    params
  );
  return rows?.[0]?.status ?? null;
};

// Faculty ownership: does this venue_slot belong to the faculty? (via mapping)
export const facultyOwnsVenueSlot = async (venueSlotId, facultyId) => {
  const [rows] = await db.execute(
    `SELECT 1 FROM venue_slots vs
       JOIN venue_mapping vm ON vm.mapping_id = vs.mapping_id
      WHERE vs.venue_slot_id = ? AND vm.faculty_id = ?
      LIMIT 1`,
    [Number(venueSlotId), Number(facultyId)]
  );
  return rows.length > 0;
};

// Faculty ownership for a booking (via its mapping's faculty).
export const facultyOwnsBooking = async (bookingId, facultyId) => {
  const [rows] = await db.execute(
    `SELECT 1 FROM student_booking sb
       JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
      WHERE sb.booking_id = ? AND vm.faculty_id = ?
      LIMIT 1`,
    [Number(bookingId), Number(facultyId)]
  );
  return rows.length > 0;
};

// Slot header (venue + date/time) for the CSV title/filename.
export const getSlotHeader = async (venueSlotId) => {
  const [rows] = await db.execute(
    `SELECT vs.venue_slot_id, DATE_FORMAT(vs.slot_date, '%Y-%m-%d') AS slot_date,
            vs.start_time, vs.end_time, v.venue_name
       FROM venue_slots vs
       JOIN venue_mapping vm ON vm.mapping_id = vs.mapping_id
       JOIN venues v ON v.venue_id = vm.venue_id
      WHERE vs.venue_slot_id = ? LIMIT 1`,
    [Number(venueSlotId)]
  );
  return rows?.[0] ?? null;
};
