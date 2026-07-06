import db from '../../config/db.js';

// ── Admin writes ─────────────────────────────────────────────
// Create a survey + its questions + options in one transaction. No FKs
// (TiDB-safe), so child rows are keyed manually by the parent insertId.
export const insertSurvey = async ({
  title,
  description,
  targetCourse,
  targetYear,
  createdBy,
  questions,
}) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [surveyResult] = await conn.execute(
      `INSERT INTO surveys (title, description, target_course, target_year, status, created_by)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [title, description, targetCourse, targetYear, Number(createdBy)]
    );
    const surveyId = surveyResult.insertId;

    for (let qi = 0; qi < questions.length; qi += 1) {
      const q = questions[qi];
      const [questionResult] = await conn.execute(
        `INSERT INTO survey_questions (survey_id, question_text, question_type, display_order)
         VALUES (?, ?, ?, ?)`,
        [Number(surveyId), q.question_text, q.question_type, qi]
      );
      const questionId = questionResult.insertId;

      for (let oi = 0; oi < q.options.length; oi += 1) {
        await conn.execute(
          `INSERT INTO survey_options (question_id, option_text, display_order)
           VALUES (?, ?, ?)`,
          [Number(questionId), q.options[oi], oi]
        );
      }
    }

    await conn.commit();
    return surveyId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const setSurveyStatus = async (id, status) => {
  const [result] = await db.execute(
    `UPDATE surveys SET status = ? WHERE survey_id = ?`,
    [status, Number(id)]
  );
  return result.affectedRows > 0;
};

// Hard delete: remove the survey and every dependent row. No FK cascade
// exists (TiDB-safe schema), so delete children manually in a transaction.
export const deleteSurveyCascade = async (id) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const surveyId = Number(id);

    // answers → responses (by this survey)
    await conn.execute(
      `DELETE sa FROM survey_answers sa
       JOIN survey_responses sr ON sr.response_id = sa.response_id
       WHERE sr.survey_id = ?`,
      [surveyId]
    );
    await conn.execute(`DELETE FROM survey_responses WHERE survey_id = ?`, [surveyId]);

    // options → questions (by this survey)
    await conn.execute(
      `DELETE so FROM survey_options so
       JOIN survey_questions sq ON sq.question_id = so.question_id
       WHERE sq.survey_id = ?`,
      [surveyId]
    );
    await conn.execute(`DELETE FROM survey_questions WHERE survey_id = ?`, [surveyId]);

    await conn.execute(`DELETE FROM surveys WHERE survey_id = ?`, [surveyId]);

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Admin reads ──────────────────────────────────────────────
// All surveys with a distinct-student response count, newest first.
export const listAllSurveys = async () => {
  const [rows] = await db.execute(
    `SELECT s.survey_id, s.title, s.description, s.target_course, s.target_year,
            s.status, s.created_by, s.created_at, s.updated_at,
            COUNT(DISTINCT sr.student_id) AS response_count
     FROM surveys s
     LEFT JOIN survey_responses sr ON sr.survey_id = s.survey_id
     GROUP BY s.survey_id, s.title, s.description, s.target_course, s.target_year,
              s.status, s.created_by, s.created_at, s.updated_at
     ORDER BY s.created_at DESC, s.survey_id DESC`
  );
  return rows ?? [];
};

export const getSurveyById = async (id) => {
  const [rows] = await db.execute(
    `SELECT survey_id, title, description, target_course, target_year,
            status, created_by, created_at, updated_at
     FROM surveys
     WHERE survey_id = ?
     LIMIT 1`,
    [Number(id)]
  );
  return rows?.[0] ?? null;
};

export const getQuestionsForSurvey = async (surveyId) => {
  const [rows] = await db.execute(
    `SELECT question_id, survey_id, question_text, question_type, display_order
     FROM survey_questions
     WHERE survey_id = ?
     ORDER BY display_order ASC, question_id ASC`,
    [Number(surveyId)]
  );
  return rows ?? [];
};

export const getOptionsForSurvey = async (surveyId) => {
  const [rows] = await db.execute(
    `SELECT so.option_id, so.question_id, so.option_text, so.display_order
     FROM survey_options so
     JOIN survey_questions sq ON sq.question_id = so.question_id
     WHERE sq.survey_id = ?
     ORDER BY so.question_id ASC, so.display_order ASC, so.option_id ASC`,
    [Number(surveyId)]
  );
  return rows ?? [];
};

// ── Student targeting ────────────────────────────────────────
export const getStudentCourseYear = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT student_id, course, year_of_study
     FROM students
     WHERE student_id = ?
     LIMIT 1`,
    [Number(studentId)]
  );
  return rows?.[0] ?? null;
};

// Active surveys targeted at this student (NULL course/year = no filter on that
// dimension), each LEFT JOINed with this student's response row to derive the
// submitted flag. Mirrors the announcements targeting query.
export const listSurveysForStudent = async ({ studentId, course, year }) => {
  const [rows] = await db.execute(
    `SELECT s.survey_id, s.title, s.description, s.status, s.created_at,
            sr.response_id, sr.submitted_at
     FROM surveys s
     LEFT JOIN survey_responses sr
       ON sr.survey_id = s.survey_id
      AND sr.student_id = ?
     WHERE s.status = 'active'
       AND (s.target_course IS NULL OR s.target_course = ?)
       AND (s.target_year IS NULL OR s.target_year = ?)
     ORDER BY s.created_at DESC, s.survey_id DESC`,
    [Number(studentId), course, year]
  );
  return rows ?? [];
};

// This student's response row for a survey (null if not yet submitted).
export const getStudentResponse = async (surveyId, studentId) => {
  const [rows] = await db.execute(
    `SELECT response_id, survey_id, student_id, submitted_at
     FROM survey_responses
     WHERE survey_id = ? AND student_id = ?
     LIMIT 1`,
    [Number(surveyId), Number(studentId)]
  );
  return rows?.[0] ?? null;
};

// The (question_id, option_id) rows this student selected for a response.
export const getAnswersByResponse = async (responseId) => {
  const [rows] = await db.execute(
    `SELECT answer_id, response_id, question_id, option_id
     FROM survey_answers
     WHERE response_id = ?
     ORDER BY question_id ASC, option_id ASC`,
    [Number(responseId)]
  );
  return rows ?? [];
};

// ── Student write ────────────────────────────────────────────
// Insert the response row + one answer row per selected option, atomically.
// `answers` is a flat list of { question_id, option_id } (multi-choice already
// expanded by the service). The UNIQUE uq_sr(survey_id, student_id) is the final
// guard against a duplicate submission racing past the service's explicit check.
export const insertResponseWithAnswers = async ({ surveyId, studentId, answers }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [responseResult] = await conn.execute(
      `INSERT INTO survey_responses (survey_id, student_id)
       VALUES (?, ?)`,
      [Number(surveyId), Number(studentId)]
    );
    const responseId = responseResult.insertId;

    for (const a of answers) {
      await conn.execute(
        `INSERT INTO survey_answers (response_id, question_id, option_id)
         VALUES (?, ?, ?)`,
        [Number(responseId), Number(a.question_id), Number(a.option_id)]
      );
    }

    await conn.commit();
    return responseId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Admin response aggregation (read-only) ───────────────────
// One row per respondent: the response row joined to the student for identity.
// Manual equality JOIN (TiDB-safe, no FKs). Oldest submission first.
export const getSurveyRespondents = async (surveyId) => {
  const [rows] = await db.execute(
    `SELECT sr.response_id, sr.student_id, s.name, s.reg_num, s.course, s.year_of_study, sr.submitted_at
     FROM survey_responses sr
     JOIN students s ON s.student_id = sr.student_id
     WHERE sr.survey_id = ?
     ORDER BY sr.submitted_at ASC, sr.response_id ASC`,
    [Number(surveyId)]
  );
  return rows ?? [];
};

// Every selected (response, question, option) for the survey, with question and
// option text/order for building per-respondent selections AND per-option counts.
export const getSurveyAnswerRows = async (surveyId) => {
  const [rows] = await db.execute(
    `SELECT sr.response_id, sr.student_id,
            sa.question_id, q.question_text, q.display_order AS q_order,
            sa.option_id, so.option_text, so.display_order AS opt_order
     FROM survey_answers sa
     JOIN survey_responses sr ON sr.response_id = sa.response_id
     JOIN survey_options so ON so.option_id = sa.option_id
     JOIN survey_questions q ON q.question_id = sa.question_id
     WHERE sr.survey_id = ?
     ORDER BY q.display_order ASC, q.question_id ASC, so.display_order ASC, so.option_id ASC`,
    [Number(surveyId)]
  );
  return rows ?? [];
};

// Per-option response counts for every option in the survey (options with zero
// answers included). LEFT JOIN answers by option_id, then LEFT JOIN this survey's
// responses by response_id — no subquery inside an ON (TiDB-safe). COUNT(DISTINCT
// sr2.response_id) ignores the NULLs from options nobody picked → 0.
export const getSurveyOptionCounts = async (surveyId) => {
  const [rows] = await db.execute(
    `SELECT q.question_id, q.question_text AS q_text, q.display_order AS q_order,
            so.option_id, so.option_text, so.display_order AS opt_order,
            COUNT(DISTINCT sr2.response_id) AS cnt
     FROM survey_options so
     JOIN survey_questions q ON q.question_id = so.question_id AND q.survey_id = ?
     LEFT JOIN survey_answers sa ON sa.option_id = so.option_id
     LEFT JOIN survey_responses sr2 ON sr2.response_id = sa.response_id AND sr2.survey_id = ?
     GROUP BY q.question_id, q.question_text, q.display_order, so.option_id, so.option_text, so.display_order
     ORDER BY q.display_order ASC, q.question_id ASC, so.display_order ASC, so.option_id ASC`,
    [Number(surveyId), Number(surveyId)]
  );
  return rows ?? [];
};
