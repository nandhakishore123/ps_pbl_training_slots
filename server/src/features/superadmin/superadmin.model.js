import db from '../../config/db.js';

// ── Faculty listing (faculties + users + assigned venues) ─────────────────────
// Plain equality JOINs only (TiDB-safe: no subqueries in JOIN ON). One row per
// faculty × mapping; the frontend regroups by faculty_id.
export const listFacultyWithVenues = async () => {
  const [rows] = await db.execute(`
    SELECT
      f.faculty_id, f.user_id, f.name, f.reg_num, f.designation, f.department,
      u.email, u.is_active,
      vm.mapping_id,
      v.venue_id, v.venue_name, v.location,
      st.slot_id, st.start_time, st.end_time
    FROM faculties f
    JOIN users u ON u.user_id = f.user_id
    LEFT JOIN venue_mapping vm ON vm.faculty_id = f.faculty_id
    LEFT JOIN venues v ON v.venue_id = vm.venue_id
    LEFT JOIN slot_timings st ON st.slot_id = vm.slot_id
    ORDER BY f.name ASC, vm.mapping_id ASC
  `);
  return rows ?? [];
};

export const getFacultyById = async (facultyId) => {
  const [rows] = await db.execute(
    `SELECT f.faculty_id, f.user_id, f.name, f.reg_num, f.designation, f.department,
            u.email, u.is_active
     FROM faculties f
     JOIN users u ON u.user_id = f.user_id
     WHERE f.faculty_id = ?
     LIMIT 1`,
    [Number(facultyId)]
  );
  return rows?.[0] ?? null;
};

// ── Create faculty (users + faculties) in one transaction ─────────────────────
export const createFacultyTx = async ({ name, email, designation, department, regNum }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.execute(
      `INSERT INTO users (role_id, email, is_active) VALUES (2, ?, 1)`,
      [email]
    );
    const userId = userResult?.insertId;

    const [facultyResult] = await conn.execute(
      `INSERT INTO faculties (user_id, name, designation, department, reg_num)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, designation ?? null, department ?? null, regNum ?? null]
    );

    await conn.commit();
    return { faculty_id: facultyResult?.insertId ?? null, user_id: userId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const updateFacultyProfile = async (facultyId, { name, designation, department }) => {
  const [result] = await db.execute(
    `UPDATE faculties
     SET name = ?, designation = ?, department = ?, updated_at = NOW()
     WHERE faculty_id = ?`,
    [name, designation ?? null, department ?? null, Number(facultyId)]
  );
  return result?.affectedRows ?? 0;
};

export const countVenueMappingsByFaculty = async (facultyId) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt FROM venue_mapping WHERE faculty_id = ?`,
    [Number(facultyId)]
  );
  return Number(rows?.[0]?.cnt ?? 0);
};

export const setUserActive = async (userId, isActive) => {
  const [result] = await db.execute(
    `UPDATE users SET is_active = ?, updated_at = NOW() WHERE user_id = ?`,
    [isActive ? 1 : 0, Number(userId)]
  );
  return result?.affectedRows ?? 0;
};

// ── Assign faculty to a lab: venue_mapping + venue_alloted_skills (one txn) ────
// Dedupes faculty+venue+slot, and links the venue to the skill (re-activating a
// soft-disabled link). UNIQUE(venue_id, training_skill_id) = uq_venue_skill makes
// ON DUPLICATE KEY UPDATE safe.
export const assignFacultyToLabTx = async ({ facultyId, venueId, slotId, trainingSkillId }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [dupe] = await conn.execute(
      `SELECT mapping_id FROM venue_mapping
       WHERE faculty_id = ? AND venue_id = ? AND slot_id = ?
       LIMIT 1`,
      [Number(facultyId), Number(venueId), Number(slotId)]
    );
    if (dupe?.length) {
      const err = new Error('This faculty is already mapped to this venue and slot.');
      err.status = 409;
      throw err;
    }

    const [mappingResult] = await conn.execute(
      `INSERT INTO venue_mapping (faculty_id, venue_id, slot_id) VALUES (?, ?, ?)`,
      [Number(facultyId), Number(venueId), Number(slotId)]
    );

    await conn.execute(
      `INSERT INTO venue_alloted_skills (venue_id, training_skill_id, is_active)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE is_active = 1`,
      [Number(venueId), Number(trainingSkillId)]
    );

    await conn.commit();
    return { mapping_id: mappingResult?.insertId ?? null };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
