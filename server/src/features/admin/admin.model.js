import db from '../../config/db.js';

export const getDashboardKPI = async () => {
  const [[studentCount]] = await db.execute(`SELECT COUNT(*) as count FROM students WHERE is_active = 1 OR is_active IS NULL`);
  const [[facultyCount]] = await db.execute(`SELECT COUNT(*) as count FROM faculties`);
  
  // Occupied venues are those that have an entry in venue_mapping with a faculty assigned.
  // We should count distinct venues that are occupied.
  const [[occupiedVenues]] = await db.execute(`
    SELECT COUNT(DISTINCT venue_id) as count 
    FROM venue_mapping 
    WHERE faculty_id IS NOT NULL
  `);
  
  const [[totalVenues]] = await db.execute(`SELECT COUNT(*) as count FROM venues WHERE is_active = 1`);
  const freeVenues = totalVenues.count - occupiedVenues.count;

  // Real database KPI query for pending approvals
  const [[pendingTransfers]] = await db.execute(`
    SELECT COUNT(*) as count 
    FROM venue_mapping_transfer_log 
    WHERE current_status = 'PENDING'
  `);
  const pendingApprovals = pendingTransfers.count;

  return {
    totalStudents: studentCount.count,
    totalFaculty: facultyCount.count,
    occupiedVenues: occupiedVenues.count,
    freeVenues: freeVenues > 0 ? freeVenues : 0,
    pendingApprovals
  };
};

export const listVenues = async () => {
  // Venues with their LATEST mapping only (one row per venue)
  const [rows] = await db.execute(`
    SELECT 
      v.venue_id, v.venue_name, v.location, v.capacity,
      vm.mapping_id,
      f.faculty_id, f.name as faculty_name, f.reg_num,
      st.slot_id, st.start_time, st.end_time
    FROM venues v
    LEFT JOIN (
      SELECT * FROM venue_mapping
      WHERE mapping_id IN (
        SELECT MAX(mapping_id) FROM venue_mapping GROUP BY venue_id
      )
    ) vm ON v.venue_id = vm.venue_id
    LEFT JOIN faculties f ON vm.faculty_id = f.faculty_id
    LEFT JOIN slot_timings st ON vm.slot_id = st.slot_id
    WHERE v.is_active = 1
    ORDER BY v.venue_name ASC
  `);
  return rows;
};

// Admin management list — returns ALL venues (incl. inactive) with is_active so
// inactive venues can be reactivated. Active-only listVenues still feeds the
// booking pickers and the Venue Map. Derived-table JOIN with equality ON only
// (TiDB-safe — no correlated subquery in JOIN ON).
export const listAllVenues = async () => {
  const [rows] = await db.execute(`
    SELECT
      v.venue_id, v.venue_name, v.location, v.capacity, v.is_active,
      vm.mapping_id,
      f.faculty_id, f.name as faculty_name, f.reg_num,
      st.slot_id, st.start_time, st.end_time
    FROM venues v
    LEFT JOIN (
      SELECT * FROM venue_mapping
      WHERE mapping_id IN (
        SELECT MAX(mapping_id) FROM venue_mapping GROUP BY venue_id
      )
    ) vm ON v.venue_id = vm.venue_id
    LEFT JOIN faculties f ON vm.faculty_id = f.faculty_id
    LEFT JOIN slot_timings st ON vm.slot_id = st.slot_id
    ORDER BY v.venue_name ASC
  `);
  return rows;
};

// ── Venue management (create / edit / activate) ──────────────
export const createVenue = async ({ venueName, location, capacity }) => {
  const [result] = await db.execute(
    `INSERT INTO venues (venue_name, location, capacity, is_active) VALUES (?, ?, ?, 1)`,
    [venueName, location ?? null, capacity ?? null]
  );
  return result.insertId;
};

export const updateVenue = async (venueId, { venueName, location, capacity }) => {
  const [result] = await db.execute(
    `UPDATE venues SET venue_name = ?, location = ?, capacity = ?, updated_at = NOW() WHERE venue_id = ?`,
    [venueName, location ?? null, capacity ?? null, Number(venueId)]
  );
  return result.affectedRows ?? 0;
};

export const setVenueActive = async (venueId, isActive) => {
  const [result] = await db.execute(
    `UPDATE venues SET is_active = ?, updated_at = NOW() WHERE venue_id = ?`,
    [isActive ? 1 : 0, Number(venueId)]
  );
  return result.affectedRows ?? 0;
};

export const countMappingsByVenue = async (venueId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM venue_mapping WHERE venue_id = ?`,
    [Number(venueId)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};


export const listFaculty = async () => {
  // Faculty with their assigned venues and slots
  const [rows] = await db.execute(`
    SELECT 
      f.faculty_id, f.name, f.reg_num, f.department,
      vm.mapping_id,
      v.venue_id, v.venue_name, v.location,
      st.slot_id, st.start_time, st.end_time
    FROM faculties f
    LEFT JOIN venue_mapping vm ON f.faculty_id = vm.faculty_id
    LEFT JOIN venues v ON vm.venue_id = v.venue_id
    LEFT JOIN slot_timings st ON vm.slot_id = st.slot_id
    ORDER BY f.name ASC
  `);
  return rows;
};

export const searchFaculty = async (query, limit = 20, offset = 0) => {
  const safeLimit = parseInt(limit, 10) || 20;
  const safeOffset = parseInt(offset, 10) || 0;

  let sql = `SELECT faculty_id, name, reg_num, department FROM faculties`;
  const params = [];

  if (query) {
    sql += ` WHERE name LIKE ? OR reg_num LIKE ?`;
    params.push(`%${query}%`, `%${query}%`);
  }

  sql += ` ORDER BY name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const [rows] = await db.execute(sql, params);
  return rows;
};

export const listStudentsWithPoints = async () => {
  const [rows] = await db.execute(`
    SELECT 
      s.student_id, s.name, s.reg_num, s.degree, s.course, s.year_of_study,
      MAX(CASE WHEN p.point_type = 'REWARD_POINTS' THEN p.points_available ELSE 0 END) AS reward_points,
      MAX(CASE WHEN p.point_type = 'ACTIVITY_POINTS' THEN p.points_available ELSE 0 END) AS activity_points
    FROM students s
    LEFT JOIN points p ON s.student_id = p.student_id
    WHERE s.is_active = 1 OR s.is_active IS NULL
    GROUP BY s.student_id, s.name, s.reg_num, s.degree, s.course, s.year_of_study
    ORDER BY s.name ASC
  `);
  return rows;
};

// ── Student management (admin authoring) — Stage 5d ──────────
// Create provisions a users row (role 1) AND a students row, transactionally
// (the service owns the connection + commit/rollback so a failed students
// insert never leaves an orphan user). Soft-deactivate mirrors is_active across
// BOTH tables so a deactivated student also can't log in. Active-only
// listStudentsWithPoints (above) still feeds the read path. Single-table writes
// by key; the management list uses one equality JOIN to users for the email.
const studentExec = (conn) => conn || db;

// Admin management list — ALL students (incl. inactive), with email + is_active.
export const listAllStudents = async () => {
  const [rows] = await db.execute(`
    SELECT
      s.student_id, s.user_id, s.name, s.reg_num, s.degree, s.course, s.year_of_study,
      s.is_active, u.email,
      MAX(CASE WHEN p.point_type = 'REWARD_POINTS' THEN p.points_available ELSE 0 END) AS reward_points,
      MAX(CASE WHEN p.point_type = 'ACTIVITY_POINTS' THEN p.points_available ELSE 0 END) AS activity_points
    FROM students s
    JOIN users u ON u.user_id = s.user_id
    LEFT JOIN points p ON p.student_id = s.student_id
    GROUP BY s.student_id, s.user_id, s.name, s.reg_num, s.degree, s.course, s.year_of_study, s.is_active, u.email
    ORDER BY s.name ASC
  `);
  return rows;
};

// Two inserts on ONE connection. Caller wraps in a transaction. ER_DUP_ENTRY is
// mapped to a 409 distinguishing email (users) vs reg_num (students).
export const createStudentWithUser = async ({ email, reg_num, name, degree, course, year_of_study }, conn) => {
  const exec = studentExec(conn);
  let userId;
  try {
    const [uRes] = await exec.execute(
      `INSERT INTO users (role_id, email, is_active) VALUES (1, ?, 1)`,
      [email]
    );
    userId = uRes.insertId;
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const e = new Error('A user with this email already exists.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
  try {
    const [sRes] = await exec.execute(
      `INSERT INTO students (user_id, reg_num, name, degree, course, year_of_study, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, reg_num, name, degree ?? null, course ?? null, year_of_study ?? null]
    );
    return { studentId: sRes.insertId, userId };
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const e = new Error('A student with this registration number already exists.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

export const getStudentUserId = async (studentId, conn) => {
  const exec = studentExec(conn);
  const [rows] = await exec.execute(
    `SELECT user_id FROM students WHERE student_id = ?`,
    [Number(studentId)]
  );
  return rows?.[0]?.user_id ?? null;
};

// Single-table UPDATE by key. reg_num is UNIQUE → ER_DUP_ENTRY mapped to 409.
export const updateStudent = async (studentId, { reg_num, name, degree, course, year_of_study }, conn) => {
  const exec = studentExec(conn);
  try {
    const [result] = await exec.execute(
      `UPDATE students SET reg_num = ?, name = ?, degree = ?, course = ?, year_of_study = ?
       WHERE student_id = ?`,
      [reg_num, name, degree ?? null, course ?? null, year_of_study ?? null, Number(studentId)]
    );
    return result.affectedRows ?? 0;
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const e = new Error('A student with this registration number already exists.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

// Single-table UPDATE by key. email is UNIQUE → ER_DUP_ENTRY mapped to 409.
export const updateUserEmail = async (userId, email, conn) => {
  const exec = studentExec(conn);
  try {
    const [result] = await exec.execute(
      `UPDATE users SET email = ? WHERE user_id = ?`,
      [email, Number(userId)]
    );
    return result.affectedRows ?? 0;
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const e = new Error('A user with this email already exists.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

export const setStudentActiveRow = async (studentId, isActive, conn) => {
  const exec = studentExec(conn);
  const [result] = await exec.execute(
    `UPDATE students SET is_active = ? WHERE student_id = ?`,
    [isActive ? 1 : 0, Number(studentId)]
  );
  return result.affectedRows ?? 0;
};

export const setUserActiveRow = async (userId, isActive, conn) => {
  const exec = studentExec(conn);
  const [result] = await exec.execute(
    `UPDATE users SET is_active = ? WHERE user_id = ?`,
    [isActive ? 1 : 0, Number(userId)]
  );
  return result.affectedRows ?? 0;
};

export const listTrainingSkills = async () => {
  const [rows] = await db.execute(`
    SELECT 
      ts.training_skill_id, ts.skill_name, ts.skill_type,
      ts.category_id, c.category_name,
      COUNT(DISTINCT sl.level_id) as levels_count,
      MAX(CASE WHEN sp.point_type = 'REWARD_POINTS' THEN sp.points_alloted ELSE 0 END) as max_reward_points,
      MAX(CASE WHEN sp.point_type = 'ACTIVITY_POINTS' THEN sp.points_alloted ELSE 0 END) as max_activity_points
    FROM training_skills ts
    LEFT JOIN training_skill_category c ON ts.category_id = c.category_id
    LEFT JOIN skill_levels sl ON ts.training_skill_id = sl.training_skill_id
    LEFT JOIN skill_points sp ON ts.training_skill_id = sp.training_skill_id
    WHERE ts.is_active = 1
    GROUP BY ts.training_skill_id, ts.skill_name, ts.skill_type, ts.category_id, c.category_name
    ORDER BY ts.skill_name ASC
  `);
  return rows;
};

// ── Training skill (Course/Lab) management — Stage 5a ─────────
// Mirrors the venue CRUD pattern. PS vs PBL = the skill_type column.
// Active-only listTrainingSkills above still feeds the student/points reads;
// listAllTrainingSkills returns inactive too so they can be reactivated.
// Soft-deactivate only (toggles is_active) — never hard delete, which would
// FK-fail against skill_levels / assessments / venue_alloted_skills / skill_points.
export const listAllTrainingSkills = async () => {
  const [rows] = await db.execute(`
    SELECT
      ts.training_skill_id, ts.skill_name, ts.skill_type,
      ts.category_id, c.category_name, ts.image_url, ts.is_active,
      COUNT(DISTINCT sl.level_id) as levels_count,
      MAX(CASE WHEN sp.point_type = 'REWARD_POINTS' THEN sp.points_alloted ELSE 0 END) as max_reward_points,
      MAX(CASE WHEN sp.point_type = 'ACTIVITY_POINTS' THEN sp.points_alloted ELSE 0 END) as max_activity_points
    FROM training_skills ts
    LEFT JOIN training_skill_category c ON ts.category_id = c.category_id
    LEFT JOIN skill_levels sl ON ts.training_skill_id = sl.training_skill_id
    LEFT JOIN skill_points sp ON ts.training_skill_id = sp.training_skill_id
    GROUP BY ts.training_skill_id, ts.skill_name, ts.skill_type, ts.category_id, c.category_name, ts.image_url, ts.is_active
    ORDER BY ts.skill_name ASC
  `);
  return rows;
};

export const listSkillCategories = async () => {
  const [rows] = await db.execute(
    `SELECT category_id, category_name FROM training_skill_category ORDER BY category_name ASC`
  );
  return rows;
};

export const createTrainingSkill = async ({ skill_name, skill_type, category_id, image_url }) => {
  const [result] = await db.execute(
    `INSERT INTO training_skills (skill_name, skill_type, category_id, image_url, is_active) VALUES (?, ?, ?, ?, 1)`,
    [skill_name, skill_type, Number(category_id), image_url ?? null]
  );
  return result.insertId;
};

export const updateTrainingSkill = async (id, { skill_name, skill_type, category_id, image_url }) => {
  // training_skills has no updated_at column — do not set one.
  const [result] = await db.execute(
    `UPDATE training_skills SET skill_name = ?, skill_type = ?, category_id = ?, image_url = ? WHERE training_skill_id = ?`,
    [skill_name, skill_type, Number(category_id), image_url ?? null, Number(id)]
  );
  return result.affectedRows ?? 0;
};

export const setTrainingSkillActive = async (id, isActive) => {
  const [result] = await db.execute(
    `UPDATE training_skills SET is_active = ? WHERE training_skill_id = ?`,
    [isActive ? 1 : 0, Number(id)]
  );
  return result.affectedRows ?? 0;
};

// Count of venues that ACTIVELY offer this skill — for the soft "still mapped"
// warning when deactivating (mirrors countMappingsByVenue). Not a hard block.
export const countVenueSkillsBySkill = async (id) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM venue_alloted_skills WHERE training_skill_id = ? AND is_active = 1`,
    [Number(id)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};

// ── Skill level (Course/Lab level) management — Stage 5b ─────
// skill_levels has NO is_active column → delete is a HARD delete, guarded.
// Listing reuses trainingModel.getSkillLevels (student read path, unchanged).
// Create/Edit are single-table writes by key. Delete is blocked whenever the
// level is in use (bookings / assessment attempts) OR still owns content
// (syllabus / points / assessments) — the safe "remove its contents first"
// path, so we never cascade into the assessment/booking domain.
export const createLevel = async ({ training_skill_id, level_name, core_concept, max_attempts }) => {
  const [result] = await db.execute(
    `INSERT INTO skill_levels (training_skill_id, level_name, core_concept, max_attempts) VALUES (?, ?, ?, ?)`,
    [Number(training_skill_id), level_name, core_concept ?? null, max_attempts ?? null]
  );
  return result.insertId;
};

export const updateLevel = async (levelId, { level_name, core_concept, max_attempts }) => {
  const [result] = await db.execute(
    `UPDATE skill_levels SET level_name = ?, core_concept = ?, max_attempts = ? WHERE level_id = ?`,
    [level_name, core_concept ?? null, max_attempts ?? null, Number(levelId)]
  );
  return result.affectedRows ?? 0;
};

// Block if any student has a booking pinned to this level.
export const countBookingsByLevel = async (levelId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM student_booking WHERE level_id = ?`,
    [Number(levelId)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};

// Block if any assessment of this level has student attempts. Equality JOIN only.
export const countAssessmentAttemptsByLevel = async (levelId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt
     FROM student_assessments sa
     JOIN assessments a ON a.assessment_id = sa.assessment_id
     WHERE a.level_id = ?`,
    [Number(levelId)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};

// Owned content (syllabus / points / assessments). Non-zero → "not empty".
export const countLevelContents = async (levelId) => {
  const id = Number(levelId);
  const [[syl]] = await db.execute(`SELECT COUNT(*) AS cnt FROM skill_syllabus WHERE level_id = ?`, [id]);
  const [[pts]] = await db.execute(`SELECT COUNT(*) AS cnt FROM skill_points WHERE level_id = ?`, [id]);
  const [[asm]] = await db.execute(`SELECT COUNT(*) AS cnt FROM assessments WHERE level_id = ?`, [id]);
  return {
    syllabus: Number(syl?.cnt ?? 0),
    points: Number(pts?.cnt ?? 0),
    assessments: Number(asm?.cnt ?? 0),
  };
};

// Single-table hard delete by key — callers MUST run the guards first.
export const deleteLevel = async (levelId) => {
  const [result] = await db.execute(
    `DELETE FROM skill_levels WHERE level_id = ?`,
    [Number(levelId)]
  );
  return result.affectedRows ?? 0;
};

// ── Assessment management (admin authoring) — Stage 5c-i ─────
// ADD-ONLY admin CRUD. The student read path (getAssessmentForLevel /
// getAssessmentMcqTypeConfig in training.model.js) is NOT touched — those still
// filter is_active=1 and feed startAssessment. listAssessmentsForLevel returns
// inactive too so the admin can reactivate. Single-table writes by key.
export const listAssessmentsForLevel = async (trainingSkillId, levelId) => {
  const [rows] = await db.execute(
    `SELECT assessment_id, training_skill_id, level_id, assessment_title,
            assessment_type, total_marks, passing_marks, duration_minutes,
            is_active, created_at, updated_at
     FROM assessments
     WHERE training_skill_id = ? AND level_id = ?
     ORDER BY assessment_id ASC`,
    [Number(trainingSkillId), Number(levelId)]
  );
  return rows ?? [];
};

export const createAssessment = async ({ training_skill_id, level_id, assessment_title, assessment_type, total_marks, passing_marks, duration_minutes }) => {
  const [result] = await db.execute(
    `INSERT INTO assessments
       (training_skill_id, level_id, assessment_title, assessment_type, total_marks, passing_marks, duration_minutes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [Number(training_skill_id), Number(level_id), assessment_title, assessment_type,
     Number(total_marks), Number(passing_marks), Number(duration_minutes)]
  );
  return result.insertId;
};

export const updateAssessment = async (assessmentId, { assessment_title, assessment_type, total_marks, passing_marks, duration_minutes }) => {
  // assessments.updated_at is ON UPDATE CURRENT_TIMESTAMP → auto-maintained.
  const [result] = await db.execute(
    `UPDATE assessments
       SET assessment_title = ?, assessment_type = ?, total_marks = ?, passing_marks = ?, duration_minutes = ?
     WHERE assessment_id = ?`,
    [assessment_title, assessment_type, Number(total_marks), Number(passing_marks), Number(duration_minutes), Number(assessmentId)]
  );
  return result.affectedRows ?? 0;
};

export const setAssessmentActive = async (assessmentId, isActive) => {
  const [result] = await db.execute(
    `UPDATE assessments SET is_active = ? WHERE assessment_id = ?`,
    [isActive ? 1 : 0, Number(assessmentId)]
  );
  return result.affectedRows ?? 0;
};

export const listMcqTypes = async () => {
  const [rows] = await db.execute(
    `SELECT mcq_type_id, mcq_type_name FROM mcq_types WHERE is_active = 1 ORDER BY mcq_type_name ASC`
  );
  return rows ?? [];
};

// Admin view of the per-type counts. LEFT JOIN (not the student INNER JOIN) so a
// row whose type was later deactivated still shows for management. Equality JOIN.
export const listMcqTypeConfig = async (assessmentId) => {
  const [rows] = await db.execute(
    `SELECT c.config_id, c.assessment_id, c.mcq_type_id, mt.mcq_type_name, c.question_count
     FROM assessment_mcq_type_config c
     LEFT JOIN mcq_types mt ON mt.mcq_type_id = c.mcq_type_id
     WHERE c.assessment_id = ?
     ORDER BY c.config_id ASC`,
    [Number(assessmentId)]
  );
  return rows ?? [];
};

// UNIQUE(assessment_id, mcq_type_id) = uq_assessment_mcq_type makes the upsert safe.
export const upsertMcqTypeConfig = async (assessmentId, mcqTypeId, questionCount) => {
  const [result] = await db.execute(
    `INSERT INTO assessment_mcq_type_config (assessment_id, mcq_type_id, question_count)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE question_count = VALUES(question_count)`,
    [Number(assessmentId), Number(mcqTypeId), Number(questionCount)]
  );
  return result;
};

export const deleteMcqTypeConfig = async (configId) => {
  const [result] = await db.execute(
    `DELETE FROM assessment_mcq_type_config WHERE config_id = ?`,
    [Number(configId)]
  );
  return result.affectedRows ?? 0;
};

// ── MCQ Question Bank (admin authoring) — Stage 5c-ii ────────
// ADD-ONLY admin CRUD. Delete is SOFT (is_active=0) because questions may be
// referenced by student_mcq_answers — a hard delete would FK-fail and lose
// answer history. The student sampling read (getRandomMcqQuestions) filters
// is_active=1, so retired questions are never served but history stays intact.
// Single-table writes by key; the list uses one equality JOIN for the type name.
export const listQuestions = async (assessmentId) => {
  const [rows] = await db.execute(
    `SELECT q.mcq_question_id, q.assessment_id, q.question_text,
            q.option_a, q.option_b, q.option_c, q.option_d,
            q.correct_option, q.mcq_type_id, mt.mcq_type_name,
            q.difficulty, q.marks, q.is_active, q.created_at,
            (SELECT COUNT(*) FROM student_mcq_answers sma
               WHERE sma.mcq_question_id = q.mcq_question_id) AS answer_count
     FROM assessment_mcq_questions q
     LEFT JOIN mcq_types mt ON mt.mcq_type_id = q.mcq_type_id
     WHERE q.assessment_id = ?
     ORDER BY q.mcq_question_id ASC`,
    [Number(assessmentId)]
  );
  return rows ?? [];
};

export const createQuestion = async ({ assessment_id, question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks }) => {
  const [result] = await db.execute(
    `INSERT INTO assessment_mcq_questions
       (assessment_id, question_text, option_a, option_b, option_c, option_d,
        correct_option, mcq_type_id, difficulty, marks, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [Number(assessment_id), question_text, option_a, option_b, option_c, option_d,
     correct_option, Number(mcq_type_id), difficulty ?? null, Number(marks)]
  );
  return result.insertId;
};

export const updateQuestion = async (questionId, { question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks }) => {
  const [result] = await db.execute(
    `UPDATE assessment_mcq_questions
       SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
           correct_option = ?, mcq_type_id = ?, difficulty = ?, marks = ?
     WHERE mcq_question_id = ?`,
    [question_text, option_a, option_b, option_c, option_d,
     correct_option, Number(mcq_type_id), difficulty ?? null, Number(marks), Number(questionId)]
  );
  return result.affectedRows ?? 0;
};

export const setQuestionActive = async (questionId, isActive) => {
  const [result] = await db.execute(
    `UPDATE assessment_mcq_questions SET is_active = ? WHERE mcq_question_id = ?`,
    [isActive ? 1 : 0, Number(questionId)]
  );
  return result.affectedRows ?? 0;
};

// Info only — warn before retiring a question that has student answers.
export const countAnswersForQuestion = async (questionId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM student_mcq_answers WHERE mcq_question_id = ?`,
    [Number(questionId)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};

export const listSlotTimings = async () => {
  const [rows] = await db.execute(`
    SELECT slot_id, start_time, end_time 
    FROM slot_timings 
    WHERE is_active = 1
    ORDER BY start_time ASC
  `);
  return rows;
};

export const addSlotTiming = async (startTime, endTime) => {
  const [result] = await db.execute(`
    INSERT INTO slot_timings (start_time, end_time, is_active)
    VALUES (?, ?, 1)
  `, [startTime, endTime]);
  return result.insertId;
};

export const deleteSlotTiming = async (slotId) => {
  await db.execute(`
    UPDATE slot_timings
    SET is_active = 0
    WHERE slot_id = ?
  `, [slotId]);
};

// Admin management list — returns ALL slots (incl. inactive) so closed slots
// can be reopened. Student/faculty booking reads keep their own is_active=1 filter.
export const listAllSlotTimings = async () => {
  const [rows] = await db.execute(`
    SELECT slot_id, start_time, end_time, is_active
    FROM slot_timings
    ORDER BY start_time ASC
  `);
  return rows;
};

export const updateSlotTiming = async (slotId, startTime, endTime) => {
  const [result] = await db.execute(
    `UPDATE slot_timings SET start_time = ?, end_time = ? WHERE slot_id = ?`,
    [startTime, endTime, Number(slotId)]
  );
  return result.affectedRows ?? 0;
};

export const setSlotActive = async (slotId, isActive) => {
  const [result] = await db.execute(
    `UPDATE slot_timings SET is_active = ? WHERE slot_id = ?`,
    [isActive ? 1 : 0, Number(slotId)]
  );
  return result.affectedRows ?? 0;
};

export const countBookingsBySlot = async (slotId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM student_booking WHERE slot_id = ?`,
    [Number(slotId)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};

export const getMappingById = async (mappingId) => {
  const [rows] = await db.execute(`SELECT * FROM venue_mapping WHERE mapping_id = ?`, [mappingId]);
  return rows[0];
};

export const swapFaculty = async (mappingId, newFacultyId, reason, adminId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Get existing mapping
    const [mappings] = await conn.execute(`SELECT * FROM venue_mapping WHERE mapping_id = ?`, [mappingId]);
    if (mappings.length === 0) throw new Error("Mapping not found");
    const mapping = mappings[0];
    
    // Insert into transfer log
    await conn.execute(`
      INSERT INTO venue_mapping_transfer_log 
      (from_faculty_id, to_faculty_id, reason, venue_id, slot_id, current_status)
      VALUES (?, ?, ?, ?, ?, 'ACCEPTED')
    `, [mapping.faculty_id, newFacultyId, reason, mapping.venue_id, mapping.slot_id]);
    
    // Update mapping
    await conn.execute(`
      UPDATE venue_mapping 
      SET faculty_id = ? 
      WHERE mapping_id = ?
    `, [newFacultyId, mappingId]);
    
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const transferIndividualVenue = async (mappingId, toFacultyId, reason) => {
  return swapFaculty(mappingId, toFacultyId, reason, null); // Reuse swap logic
};

export const transferAllVenues = async (fromFacultyId, toFacultyId, reason) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const [mappings] = await conn.execute(`SELECT * FROM venue_mapping WHERE faculty_id = ?`, [fromFacultyId]);
    
    for (const mapping of mappings) {
      await conn.execute(`
        INSERT INTO venue_mapping_transfer_log 
        (from_faculty_id, to_faculty_id, reason, venue_id, slot_id, current_status)
        VALUES (?, ?, ?, ?, ?, 'ACCEPTED')
      `, [fromFacultyId, toFacultyId, reason, mapping.venue_id, mapping.slot_id]);
    }
    
    await conn.execute(`
      UPDATE venue_mapping 
      SET faculty_id = ? 
      WHERE faculty_id = ?
    `, [toFacultyId, fromFacultyId]);
    
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Admin Attendance ─────────────────────────────────────────

export const listAllMappingsWithVenues = async () => {
  const [rows] = await db.execute(`
    SELECT
      vm.mapping_id, vm.current_bookings,
      v.venue_id, v.venue_name, v.location, v.capacity,
      f.faculty_id, f.name as faculty_name, f.reg_num as faculty_reg_num,
      st.slot_id, st.start_time, st.end_time
    FROM venue_mapping vm
    JOIN venues v ON vm.venue_id = v.venue_id
    JOIN slot_timings st ON vm.slot_id = st.slot_id
    LEFT JOIN faculties f ON vm.faculty_id = f.faculty_id
    WHERE v.is_active = 1
    ORDER BY v.venue_name ASC, st.start_time ASC
  `);
  return rows;
};

export const getStudentsByMappingAdmin = async (mappingId) => {
  const [rows] = await db.execute(
    `SELECT
       sb.booking_id, sb.status, sb.is_present, sb.remarks, sb.booking_date,
       s.student_id, s.name, s.reg_num, s.course, s.year_of_study,
       a.attendance_status
     FROM student_booking sb
     JOIN students s ON sb.student_id = s.student_id
     LEFT JOIN attendance a ON sb.booking_id = a.booking_id
     WHERE sb.mapping_id = ?
     ORDER BY s.name ASC`,
    [mappingId]
  );
  return rows;
};

export const markAttendanceAdmin = async (bookingId, status) => {
  // No ownership check — admin can mark any booking
  const [rows] = await db.execute(
    `SELECT booking_id, student_id FROM student_booking WHERE booking_id = ?`,
    [bookingId]
  );
  if (rows.length === 0) throw new Error('Booking not found');
  const booking = rows[0];

  await db.execute(
    `INSERT INTO attendance (booking_id, student_id, attendance_status)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE attendance_status = ?`,
    [bookingId, booking.student_id, status, status]
  );

  const isPresent = status === 'PRESENT' ? 1 : 0;
  await db.execute(
    `UPDATE student_booking SET is_present = ? WHERE booking_id = ?`,
    [isPresent, bookingId]
  );
};

// ── Admin All-Bookings dashboard ─────────────────────────────
// Every booking joined with student, venue/lab, slot time, faculty, attendance
// and the student's LATEST assessment result for that skill+level.
export const listAllBookings = async ({ venueId, date, venueSlotId } = {}) => {
  const where = [];
  const params = [];
  if (venueId) { where.push('vm.venue_id = ?'); params.push(Number(venueId)); }
  if (date)    { where.push('sb.booking_date = ?'); params.push(date); }
  if (venueSlotId) { where.push('sb.venue_slot_id = ?'); params.push(Number(venueSlotId)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.execute(
    `SELECT
        sb.booking_id,
        DATE_FORMAT(sb.booking_date, '%Y-%m-%d') AS booking_date,
        sb.status AS booking_status,
        s.student_id,
        s.name AS student_name,
        s.reg_num,
        s.course,
        s.year_of_study,
        v.venue_id,
        v.venue_name,
        sb.venue_slot_id,
        vs.start_time,
        vs.end_time,
        f.faculty_id,
        f.name AS faculty_name,
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
          ORDER BY sa.student_assessment_id DESC LIMIT 1) AS assessment_total
      FROM student_booking sb
      JOIN students s ON s.student_id = sb.student_id
      JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
      JOIN venues v ON v.venue_id = vm.venue_id
      JOIN venue_slots vs ON vs.venue_slot_id = sb.venue_slot_id
      LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
      LEFT JOIN attendance att ON att.booking_id = sb.booking_id
      ${whereSql}
      ORDER BY sb.booking_date DESC, vs.start_time ASC, s.name ASC`,
    params
  );
  return rows ?? [];
};

// ── Venue ↔ Skill management (venue_alloted_skills) ──────────
// Equality JOIN only (TiDB-safe: no subquery in JOIN ON).
export const listVenueSkills = async (venueId) => {
  const [rows] = await db.execute(
    `SELECT vas.venue_alloted_skill_id, vas.training_skill_id, vas.is_active,
            ts.skill_name, ts.skill_type
     FROM venue_alloted_skills vas
     JOIN training_skills ts ON ts.training_skill_id = vas.training_skill_id
     WHERE vas.venue_id = ?
     ORDER BY ts.skill_name ASC`,
    [Number(venueId)]
  );
  return rows ?? [];
};

// Upsert: re-activates a soft-removed link. UNIQUE(venue_id, training_skill_id)
// = uq_venue_skill makes ON DUPLICATE KEY UPDATE safe.
export const addVenueSkill = async (venueId, trainingSkillId) => {
  await db.execute(
    `INSERT INTO venue_alloted_skills (venue_id, training_skill_id, is_active)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [Number(venueId), Number(trainingSkillId)]
  );
};

export const removeVenueSkill = async (venueId, trainingSkillId) => {
  const [result] = await db.execute(
    `UPDATE venue_alloted_skills SET is_active = 0
     WHERE venue_id = ? AND training_skill_id = ?`,
    [Number(venueId), Number(trainingSkillId)]
  );
  return result.affectedRows ?? 0;
};

// ── Per-venue + per-date slots (venue_slots) — Stage 3a (ADDITIVE) ────────────
// Admin-only authoring/display. NOT read by booking/assessment/seat code in 3a.
// All equality JOINs (TiDB-safe; no subquery in JOIN ON).

// Venue's faculty-mappings, for the slot-entry picker. Reads slot_timings only
// to label each mapping (admin display) — not a booking read.
export const listMappingsByVenue = async (venueId) => {
  const [rows] = await db.execute(
    `SELECT vm.mapping_id, vm.faculty_id,
            f.name AS faculty_name, f.reg_num AS faculty_reg_num,
            st.slot_id, st.start_time, st.end_time
     FROM venue_mapping vm
     LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
     LEFT JOIN slot_timings st ON st.slot_id = vm.slot_id
     WHERE vm.venue_id = ?
     ORDER BY f.name ASC, st.start_time ASC`,
    [Number(venueId)]
  );
  return rows ?? [];
};

export const listVenueSlots = async (venueId, slotDate = null) => {
  const params = [Number(venueId)];
  let dateFilter = '';
  if (slotDate) {
    dateFilter = ' AND vs.slot_date = ?';
    params.push(slotDate);
  }
  const [rows] = await db.execute(
    `SELECT vs.venue_slot_id, vs.mapping_id,
            DATE_FORMAT(vs.slot_date, '%Y-%m-%d') AS slot_date,
            vs.start_time, vs.end_time, vs.current_bookings, vs.is_active,
            vm.venue_id, vm.faculty_id,
            f.name AS faculty_name, f.reg_num AS faculty_reg_num
     FROM venue_slots vs
     JOIN venue_mapping vm ON vm.mapping_id = vs.mapping_id
     LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
     WHERE vm.venue_id = ?${dateFilter}
     ORDER BY vs.slot_date ASC, vs.start_time ASC`,
    params
  );
  return rows ?? [];
};

export const createVenueSlot = async ({ mappingId, slotDate, startTime, endTime }) => {
  try {
    const [result] = await db.execute(
      `INSERT INTO venue_slots (mapping_id, slot_date, start_time, end_time, current_bookings, is_active)
       VALUES (?, ?, ?, ?, 0, 1)`,
      [Number(mappingId), slotDate, startTime, endTime]
    );
    return result.insertId;
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const e = new Error('A slot with this date and time already exists for this lab.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

export const updateVenueSlot = async (venueSlotId, { slotDate, startTime, endTime }) => {
  try {
    const [result] = await db.execute(
      `UPDATE venue_slots SET slot_date = ?, start_time = ?, end_time = ? WHERE venue_slot_id = ?`,
      [slotDate, startTime, endTime, Number(venueSlotId)]
    );
    return result.affectedRows ?? 0;
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const e = new Error('A slot with this date and time already exists for this lab.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

export const setVenueSlotActive = async (venueSlotId, isActive) => {
  const [result] = await db.execute(
    `UPDATE venue_slots SET is_active = ? WHERE venue_slot_id = ?`,
    [isActive ? 1 : 0, Number(venueSlotId)]
  );
  return result.affectedRows ?? 0;
};

// ── Whole-day convenience read (Slot Scheduling page) — READ-ONLY ────────────
// All venue_slots for a single date across every venue, with venue + faculty
// labels. Equality JOINs only (TiDB-safe; no subquery in JOIN ON).
export const listAllVenueSlotsByDate = async (slotDate) => {
  const [rows] = await db.execute(
    `SELECT vs.venue_slot_id, vs.mapping_id,
            DATE_FORMAT(vs.slot_date, '%Y-%m-%d') AS slot_date,
            vs.start_time, vs.end_time, vs.current_bookings, vs.is_active,
            vm.venue_id, vm.faculty_id,
            v.venue_name, v.location, v.capacity,
            f.name AS faculty_name, f.reg_num AS faculty_reg_num
     FROM venue_slots vs
     JOIN venue_mapping vm ON vm.mapping_id = vs.mapping_id
     JOIN venues v ON v.venue_id = vm.venue_id
     LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
     WHERE vs.slot_date = ?
     ORDER BY v.venue_name ASC, vs.start_time ASC`,
    [slotDate]
  );
  return rows ?? [];
};

// All faculty-mappings for ACTIVE venues, for the per-venue faculty pickers.
export const listAllActiveMappings = async () => {
  const [rows] = await db.execute(
    `SELECT vm.mapping_id, vm.venue_id, vm.faculty_id,
            f.name AS faculty_name, f.reg_num AS faculty_reg_num
     FROM venue_mapping vm
     JOIN venues v ON v.venue_id = vm.venue_id
     LEFT JOIN faculties f ON f.faculty_id = vm.faculty_id
     WHERE v.is_active = 1
     ORDER BY f.name ASC`
  );
  return rows ?? [];
};
