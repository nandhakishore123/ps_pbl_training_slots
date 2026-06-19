import db from '../../config/db.js';

// ── Admin writes ─────────────────────────────────────────────
export const insertAnnouncement = async ({ title, body, targetCourse, targetYear, createdBy }) => {
  const [result] = await db.execute(
    `INSERT INTO announcements (title, body, target_course, target_year, is_active, created_by)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [title, body, targetCourse, targetYear, Number(createdBy)]
  );
  return result.insertId;
};

export const setAnnouncementActive = async (id, isActive) => {
  const [result] = await db.execute(
    `UPDATE announcements SET is_active = ? WHERE announcement_id = ?`,
    [isActive ? 1 : 0, Number(id)]
  );
  return result.affectedRows > 0;
};

// ── Admin reads ──────────────────────────────────────────────
export const listAllAnnouncements = async () => {
  const [rows] = await db.execute(
    `SELECT announcement_id, title, body, target_course, target_year,
            is_active, created_by, created_at, updated_at
     FROM announcements
     ORDER BY created_at DESC, announcement_id DESC`
  );
  return rows ?? [];
};

export const getAnnouncementById = async (id) => {
  const [rows] = await db.execute(
    `SELECT announcement_id, title, body, target_course, target_year,
            is_active, created_by, created_at, updated_at
     FROM announcements
     WHERE announcement_id = ?
     LIMIT 1`,
    [Number(id)]
  );
  return rows?.[0] ?? null;
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

// Active announcements targeted at this student (NULL course/year = no filter
// on that dimension), each LEFT JOINed with this student's seen_at/read_at.
export const listAnnouncementsForStudent = async ({ studentId, course, year }) => {
  const [rows] = await db.execute(
    `SELECT a.announcement_id, a.title, a.body, a.target_course, a.target_year,
            a.created_at, ar.seen_at, ar.read_at
     FROM announcements a
     LEFT JOIN announcement_reads ar
       ON ar.announcement_id = a.announcement_id
      AND ar.student_id = ?
     WHERE a.is_active = 1
       AND (a.target_course IS NULL OR a.target_course = ?)
       AND (a.target_year IS NULL OR a.target_year = ?)
     ORDER BY a.created_at DESC, a.announcement_id DESC`,
    [Number(studentId), course, year]
  );
  return rows ?? [];
};

// ── Per-student read tracking (TiDB-safe upserts) ────────────
export const upsertSeen = async (announcementId, studentId) => {
  await db.execute(
    `INSERT INTO announcement_reads (announcement_id, student_id, seen_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE seen_at = COALESCE(seen_at, CURRENT_TIMESTAMP)`,
    [Number(announcementId), Number(studentId)]
  );
};

export const upsertRead = async (announcementId, studentId) => {
  await db.execute(
    `INSERT INTO announcement_reads (announcement_id, student_id, read_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE read_at = COALESCE(read_at, CURRENT_TIMESTAMP)`,
    [Number(announcementId), Number(studentId)]
  );
};
