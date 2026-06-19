import db from '../../config/db.js';

// ── Student write ────────────────────────────────────────────
export const insertFeedback = async ({ studentId, message }) => {
  const [result] = await db.execute(
    `INSERT INTO feedback (student_id, message, is_verified)
     VALUES (?, ?, 0)`,
    [Number(studentId), message]
  );
  return result.insertId;
};

// ── Admin reads ──────────────────────────────────────────────
// All feedback JOINed to the student's credentials, newest first.
export const listAllFeedback = async () => {
  const [rows] = await db.execute(
    `SELECT f.feedback_id, f.message, f.is_verified, f.created_at, f.updated_at,
            f.student_id, s.name, s.reg_num, s.course, s.year_of_study
     FROM feedback f
     LEFT JOIN students s ON s.student_id = f.student_id
     ORDER BY f.created_at DESC, f.feedback_id DESC`
  );
  return rows ?? [];
};

export const getFeedbackById = async (id) => {
  const [rows] = await db.execute(
    `SELECT feedback_id, student_id, message, is_verified, created_at, updated_at
     FROM feedback
     WHERE feedback_id = ?
     LIMIT 1`,
    [Number(id)]
  );
  return rows?.[0] ?? null;
};

export const setVerified = async (id, isVerified) => {
  const [result] = await db.execute(
    `UPDATE feedback SET is_verified = ? WHERE feedback_id = ?`,
    [isVerified ? 1 : 0, Number(id)]
  );
  return result.affectedRows > 0;
};

// ── Student read (own feedback) ──────────────────────────────
export const listFeedbackByStudent = async (studentId) => {
  const [rows] = await db.execute(
    `SELECT feedback_id, message, is_verified, created_at
     FROM feedback
     WHERE student_id = ?
     ORDER BY created_at DESC, feedback_id DESC`,
    [Number(studentId)]
  );
  return rows ?? [];
};
