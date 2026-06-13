import db from '../../config/db.js';

const clampLimit = (limit) => {
  const n = Number(limit);
  if (Number.isNaN(n) || n <= 0) return 8;
  return Math.trunc(Math.min(Math.max(n, 1), 50));
};

const clampOffset = (offset) => {
  const n = Number(offset);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.trunc(n);
};

export const listCategories = async () => {
  const [rows] = await db.execute(
    `SELECT category_id, category_name
     FROM training_skill_category
     ORDER BY category_name ASC`
  );
  return rows ?? [];
};

export const listSkills = async ({ type, categoryId, search, limit, offset, all }) => {
  const wantsAll = all === true;
  const lim = wantsAll ? null : clampLimit(limit);
  const off = wantsAll ? null : clampOffset(offset);

  const where = ['ts.is_active = 1', 'ts.skill_type = ?'];
  const params = [type];

  if (categoryId) {
    where.push('ts.category_id = ?');
    params.push(Number(categoryId));
  }

  if (search) {
    where.push('ts.skill_name LIKE ?');
    params.push(`%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pagingSql = wantsAll ? '' : `\n    LIMIT ${lim} OFFSET ${off}`;

  const query = `
    SELECT
      ts.training_skill_id,
      ts.category_id,
      c.category_name,
      ts.skill_name,
      ts.skill_type,
      ts.image_url,
      COALESCE(lv.levels_count, 0) AS levels_count,
      COALESCE(vm.slots_total, 0) AS slots_total,
      COALESCE(vm.capacity_total, 0) AS capacity_total,
      MAX(CASE WHEN sp.point_type = 'REWARD_POINTS' THEN sp.points_alloted END) AS reward_points,
      MAX(CASE WHEN sp.point_type = 'ACTIVITY_POINTS' THEN sp.points_alloted END) AS activity_points
    FROM training_skills ts
    LEFT JOIN training_skill_category c
      ON c.category_id = ts.category_id
    LEFT JOIN skill_points sp
      ON sp.training_skill_id = ts.training_skill_id
    LEFT JOIN (
      SELECT training_skill_id, COUNT(*) AS levels_count
      FROM skill_levels
      GROUP BY training_skill_id
    ) lv ON lv.training_skill_id = ts.training_skill_id
    LEFT JOIN (
      SELECT
        vas.training_skill_id,
        COUNT(DISTINCT vm.mapping_id) AS slots_total,
        MAX(CASE WHEN v.is_active = 1 THEN COALESCE(v.capacity, 0) ELSE 0 END) AS capacity_total
      FROM slot_timings st
      JOIN venue_mapping vm ON vm.slot_id = st.slot_id
      JOIN venues v ON v.venue_id = vm.venue_id
      JOIN venue_alloted_skills vas ON vas.venue_id = v.venue_id
      WHERE st.is_active = 1
        AND vas.is_active = 1
        AND v.is_active = 1
        AND st.end_time > TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'))
      GROUP BY vas.training_skill_id
    ) vm ON vm.training_skill_id = ts.training_skill_id
    ${whereSql}
    GROUP BY
      ts.training_skill_id,
      ts.category_id,
      c.category_name,
      ts.skill_name,
      ts.skill_type,
      ts.image_url,
      lv.levels_count,
      vm.slots_total,
      vm.capacity_total
    ORDER BY ts.training_skill_id ASC
    ${pagingSql}
  `;

  const [rows] = await db.execute(query, params);
  return rows ?? [];
};

export const getSkillHeader = async (trainingSkillId) => {
  const [rows] = await db.execute(
    `SELECT
        ts.training_skill_id,
        ts.category_id,
        c.category_name,
        ts.skill_name,
        ts.skill_type,
        ts.image_url,
        MAX(CASE WHEN sp.point_type = 'REWARD_POINTS' THEN sp.points_alloted END) AS reward_points,
        MAX(CASE WHEN sp.point_type = 'ACTIVITY_POINTS' THEN sp.points_alloted END) AS activity_points
      FROM training_skills ts
      LEFT JOIN training_skill_category c ON c.category_id = ts.category_id
      LEFT JOIN skill_points sp ON sp.training_skill_id = ts.training_skill_id
      WHERE ts.training_skill_id = ?
      GROUP BY ts.training_skill_id, ts.category_id, c.category_name, ts.skill_name, ts.skill_type, ts.image_url`,
    [Number(trainingSkillId)]
  );
  return rows?.[0] || null;
};

export const getSkillLevels = async (trainingSkillId) => {
  const [rows] = await db.execute(
    `SELECT level_id, level_name, core_concept, max_attempts
     FROM skill_levels
     WHERE training_skill_id = ?
     ORDER BY level_name ASC`,
    [Number(trainingSkillId)]
  );
  return rows ?? [];
};

export const getLevelSyllabus = async (levelIds) => {
  if (!Array.isArray(levelIds) || levelIds.length === 0) return [];
  const placeholders = levelIds.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT syllabus_id, level_id, order_index, topic_title, topic_description
     FROM skill_syllabus
     WHERE level_id IN (${placeholders})
     ORDER BY level_id ASC, order_index ASC`,
    levelIds.map(Number)
  );
  return rows ?? [];
};

export const getSkillLevelPoints = async (trainingSkillId) => {
  const [rows] = await db.execute(
    `SELECT level_id, point_type, points_alloted
     FROM skill_points
     WHERE training_skill_id = ?
       AND level_id IS NOT NULL`,
    [Number(trainingSkillId)]
  );
  return rows ?? [];
};

export const listSkillSlots = async (trainingSkillId) => {
  const [rows] = await db.execute(
    `SELECT
        vm.mapping_id,
        st.slot_id,
        st.start_time,
        st.end_time,
        v.venue_name,
        COALESCE(v.capacity, 0) AS capacity_total,
        COALESCE(vm.current_bookings, 0) AS bookings_total,
        (COALESCE(v.capacity, 0) - COALESCE(vm.current_bookings, 0)) AS seats_available
      FROM slot_timings st
      JOIN venue_mapping vm ON vm.slot_id = st.slot_id
      JOIN venues v ON v.venue_id = vm.venue_id
      JOIN venue_alloted_skills vas ON vas.venue_id = v.venue_id
      WHERE st.is_active = 1
        AND vas.training_skill_id = ?
        AND vas.is_active = 1
        AND v.is_active = 1
        AND st.end_time > TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'))
      ORDER BY st.start_time ASC, st.end_time ASC, v.venue_name ASC`,
    [Number(trainingSkillId)]
  );
  return rows ?? [];
};

const getExec = (conn) => (conn ? conn : db);

export const isSlotTimingInFuture = async (slotId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT 1 AS ok
     FROM slot_timings
     WHERE slot_id = ?
       AND is_active = 1
       AND end_time > TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'))
     LIMIT 1`,
    [Number(slotId)]
  );
  return Boolean(rows?.length);
};

export const getStudentIdByUserId = async (userId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT student_id
     FROM students
     WHERE user_id = ?
       AND (is_active = 1 OR is_active IS NULL)
     LIMIT 1`,
    [Number(userId)]
  );
  return rows?.[0]?.student_id ?? null;
};

export const getSlotTimingById = async (slotId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT slot_id, start_time, end_time, is_active
     FROM slot_timings
     WHERE slot_id = ?
     LIMIT 1`,
    [Number(slotId)]
  );
  return rows?.[0] ?? null;
};

export const getMappingSlotDetails = async (mappingId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT
        vm.mapping_id,
        st.start_time,
        st.end_time,
        COALESCE(vm.current_bookings, 0) AS current_bookings,
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.is_active AS venue_active,
        st.slot_id
      FROM venue_mapping vm
      JOIN slot_timings st
        ON st.is_active = 1
       AND st.slot_id = vm.slot_id
      LEFT JOIN venues v
        ON v.venue_id = vm.venue_id
      WHERE vm.mapping_id = ?
      LIMIT 1`,
    [Number(mappingId)]
  );
  return rows?.[0] ?? null;
};

export const getExistingBookingForSlotDate = async (studentId, slotId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT booking_id
     FROM student_booking
     WHERE student_id = ?
       AND slot_id = ?
       AND booking_date = CURDATE()
     LIMIT 1`,
    [Number(studentId), Number(slotId)]
  );
  return rows?.[0] ?? null;
};

export const listAvailableMappingsForSlot = async ({ startTime, endTime, preferredMappingId, trainingSkillId }, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT
        vm.mapping_id,
        COALESCE(vm.current_bookings, 0) AS current_bookings,
        v.capacity
      FROM venue_mapping vm
      JOIN slot_timings st
        ON st.is_active = 1
       AND st.slot_id = vm.slot_id
      JOIN venues v
        ON v.venue_id = vm.venue_id
      JOIN venue_alloted_skills vas
        ON vas.venue_id = v.venue_id
      WHERE st.start_time = ?
        AND st.end_time = ?
        AND vas.training_skill_id = ?
        AND v.is_active = 1
        AND COALESCE(v.capacity, 0) > COALESCE(vm.current_bookings, 0)
      ORDER BY (vm.mapping_id = ?) DESC,
               COALESCE(vm.current_bookings, 0) ASC,
               vm.mapping_id ASC`,
    [startTime, endTime, Number(trainingSkillId), Number(preferredMappingId)]
  );
  return rows ?? [];
};

export const incrementMappingBooking = async (mappingId, conn = null) => {
  const exec = getExec(conn);
  const [result] = await exec.execute(
    `UPDATE venue_mapping vm
     JOIN venues v ON v.venue_id = vm.venue_id
     SET vm.current_bookings = COALESCE(vm.current_bookings, 0) + 1
     WHERE vm.mapping_id = ?
       AND v.is_active = 1
       AND COALESCE(v.capacity, 0) > COALESCE(vm.current_bookings, 0)`,
    [Number(mappingId)]
  );
  return result?.affectedRows ?? 0;
};

export const insertStudentBooking = async ({ studentId, trainingSkillId, levelId, mappingId, slotId }, conn = null) => {
  const exec = getExec(conn);
  const [result] = await exec.execute(
    `INSERT INTO student_booking
      (student_id, training_skill_id, level_id, mapping_id, slot_id, booking_date, status)
     VALUES (?, ?, ?, ?, ?, CURDATE(), 'ONGOING')`,
    [Number(studentId), Number(trainingSkillId), levelId ? Number(levelId) : null, Number(mappingId), Number(slotId)]
  );
  return result?.insertId ?? null;
};

export const getBookingById = async (bookingId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT
        sb.booking_id,
        sb.student_id,
        sb.training_skill_id,
        ts.skill_name,
        ts.skill_type,
        sb.mapping_id,
        sb.slot_id,
        sb.booking_date,
        sb.status,
        st.start_time,
        st.end_time,
        v.venue_id,
        v.venue_name,
        v.capacity,
        COALESCE(vm.current_bookings, 0) AS current_bookings,
        COALESCE((SELECT 1 FROM end_survey WHERE booking_id = sb.booking_id LIMIT 1), 0) AS survey_submitted
      FROM student_booking sb
      JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
      JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
      JOIN slot_timings st ON st.slot_id = sb.slot_id
      LEFT JOIN venues v ON v.venue_id = vm.venue_id
      WHERE sb.booking_id = ?
      LIMIT 1`,
    [Number(bookingId)]
  );
  return rows?.[0] ?? null;
};

export const listStudentBookings = async (studentId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT
        sb.booking_id,
        sb.student_id,
        sb.training_skill_id,
        sb.level_id,
        ts.skill_name,
        ts.skill_type,
        sb.mapping_id,
        sb.slot_id,
        sb.booking_date,
        sb.status,
        st.start_time,
        st.end_time,
        v.venue_id,
        v.venue_name,
        v.capacity,
        COALESCE(vm.current_bookings, 0) AS current_bookings,
        COALESCE((SELECT 1 FROM end_survey WHERE booking_id = sb.booking_id LIMIT 1), 0) AS survey_submitted
      FROM student_booking sb
      JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
      JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
      JOIN slot_timings st ON st.slot_id = sb.slot_id
      LEFT JOIN venues v ON v.venue_id = vm.venue_id
      WHERE sb.student_id = ?
      ORDER BY sb.booking_date DESC, st.start_time ASC, st.end_time ASC`,
    [Number(studentId)]
  );
  return rows ?? [];
};

// ── Assessment queries ────────────────────────────────────────────────────────

export const getAssessmentForLevel = async (trainingSkillId, levelId) => {
  const [rows] = await db.execute(
    `SELECT assessment_id, assessment_title, assessment_type,
            total_marks, passing_marks, duration_minutes, is_active
     FROM assessments
     WHERE training_skill_id = ?
       AND level_id = ?
       AND is_active = 1
     LIMIT 1`,
    [Number(trainingSkillId), Number(levelId)]
  );
  return rows?.[0] ?? null;
};

export const getAssessmentMcqTypeConfig = async (assessmentId) => {
  const [rows] = await db.execute(
    `SELECT c.config_id, c.mcq_type_id, mt.mcq_type_name, c.question_count
     FROM assessment_mcq_type_config c
     JOIN mcq_types mt ON mt.mcq_type_id = c.mcq_type_id
     WHERE c.assessment_id = ?
       AND mt.is_active = 1
     ORDER BY c.config_id ASC`,
    [Number(assessmentId)]
  );
  return rows ?? [];
};

export const getRandomMcqQuestions = async (assessmentId, mcqTypeId, count) => {
  const limitCount = parseInt(count, 10);
  if (isNaN(limitCount) || limitCount <= 0) return [];
  const [rows] = await db.execute(
    `SELECT mcq_question_id, question_text,
            option_a, option_b, option_c, option_d,
            correct_option, marks, difficulty
     FROM assessment_mcq_questions
     WHERE assessment_id = ?
       AND mcq_type_id = ?
     ORDER BY RAND()
     LIMIT ${limitCount}`,
    [Number(assessmentId), Number(mcqTypeId)]
  );
  return rows ?? [];
};

export const insertStudentAssessment = async (studentId, assessmentId, totalMarks, conn = null) => {
  const exec = getExec(conn);
  const [result] = await exec.execute(
    `INSERT INTO student_assessments (student_id, assessment_id, score_obtained, total_marks, status)
     VALUES (?, ?, 0, ?, 'ONGOING')`,
    [Number(studentId), Number(assessmentId), Number(totalMarks)]
  );
  return result?.insertId ?? null;
};

export const submitStudentAssessment = async (studentAssessmentId, scoreObtained, status, conn = null) => {
  const exec = getExec(conn);
  const [result] = await exec.execute(
    `UPDATE student_assessments
     SET score_obtained = ?, status = ?, submitted_at = NOW()
     WHERE student_assessment_id = ?`,
    [Number(scoreObtained), status, Number(studentAssessmentId)]
  );
  return result?.affectedRows ?? 0;
};

export const insertStudentMcqAnswers = async (answers, conn = null) => {
  if (!answers?.length) return 0;
  const exec = getExec(conn);
  const placeholders = answers.map(() => '(?, ?, ?, ?, ?)').join(',');
  const params = answers.flatMap((a) => [
    Number(a.student_assessment_id),
    Number(a.mcq_question_id),
    a.selected_option || null,
    a.is_correct ? 1 : 0,
    Number(a.marks_awarded),
  ]);
  const [result] = await exec.execute(
    `INSERT INTO student_mcq_answers
       (student_assessment_id, mcq_question_id, selected_option, is_correct, marks_awarded)
     VALUES ${placeholders}`,
    params
  );
  return result?.affectedRows ?? 0;
};

export const hasMalpractice = async (studentId, trainingSkillId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT 1 AS ok
     FROM student_booking
     WHERE student_id = ?
       AND training_skill_id = ?
       AND status = 'MALPRACTICE'
     LIMIT 1`,
    [Number(studentId), Number(trainingSkillId)]
  );
  return Boolean(rows?.length);
};

export const getExistingActiveBookingForCourse = async (studentId, trainingSkillId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT booking_id, status
     FROM student_booking
     WHERE student_id = ?
       AND training_skill_id = ?
       AND status NOT IN ('COMPLETED', 'PASS', 'FAIL')
     LIMIT 1`,
    [Number(studentId), Number(trainingSkillId)]
  );
  return rows?.[0] ?? null;
};

export const markBookingMalpractice = async (bookingId, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT mapping_id, status FROM student_booking WHERE booking_id = ? LIMIT 1`,
    [Number(bookingId)]
  );
  const booking = rows?.[0];
  if (booking && booking.status === 'ONGOING') {
    const [result] = await exec.execute(
      `UPDATE student_booking
       SET status = 'MALPRACTICE',
           remarks = 'Tried to switch tabs',
           updated_at = NOW()
       WHERE booking_id = ?`,
      [Number(bookingId)]
    );
    await exec.execute(
      `UPDATE venue_mapping
       SET current_bookings = GREATEST(0, COALESCE(current_bookings, 1) - 1)
       WHERE mapping_id = ?`,
      [booking.mapping_id]
    );
    return result?.affectedRows ?? 0;
  }
  return 0;
};

// ── Lab Record (end_survey) ───────────────────────────────────────────────────

export const getLabRecordQuestions = async () => {
  const [rows] = await db.execute(
    `SELECT survey_question_id, question
     FROM end_survey_questions
     ORDER BY survey_question_id ASC`
  );
  return rows ?? [];
};

export const getFacultyFromBooking = async (bookingId) => {
  const [rows] = await db.execute(
    `SELECT vm.faculty_id
     FROM student_booking sb
     JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
     WHERE sb.booking_id = ?
     LIMIT 1`,
    [Number(bookingId)]
  );
  return rows?.[0]?.faculty_id ?? null;
};

export const saveLabRecord = async ({ studentId, bookingId, facultyId, responses }) => {
  // responses: [{ survey_question_id, student_response }]
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of responses) {
      await conn.execute(
        `INSERT INTO end_survey
           (faculty_id, student_id, survey_question_id, student_response, booking_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          facultyId ?? null,
          Number(studentId),
          Number(r.survey_question_id),
          String(r.student_response || ''),
          Number(bookingId),
        ]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const getLabRecordByBooking = async (bookingId) => {
  const [rows] = await db.execute(
    `SELECT es.survey_question_id, es.student_response, esq.question, es.is_caption_verified, es.is_incharge_verified
     FROM end_survey es
     JOIN end_survey_questions esq ON esq.survey_question_id = es.survey_question_id
     WHERE es.booking_id = ?
     ORDER BY es.survey_question_id ASC`,
    [Number(bookingId)]
  );
  return rows ?? [];
};

