// manageusers.model.js — USER MANAGEMENT (non-student roles) — REMOVABLE FEATURE
// SQL only. Mirrors the admin createStudentWithUser pattern: `users` holds
// identity/auth, a profile table holds the display name. Students (role 1) are
// deliberately out of scope everywhere in this file.
import db from '../../config/db.js';

// Roles this feature manages. Role 1 (students) is excluded by design — they
// are created and maintained through the existing admin student endpoints.
export const MANAGED_ROLE_IDS = [2, 3, 4, 5];

// Two inserts in ONE transaction, same shape as createStudentWithUser.
// A duplicate email surfaces as a 409.
export const createUserWithProfile = async ({ email, name, role_id }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let userId;
    try {
      const [uRes] = await conn.execute(
        `INSERT INTO users (role_id, email, is_active) VALUES (?, ?, 1)`,
        [Number(role_id), email]
      );
      userId = uRes?.insertId;
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') {
        const e = new Error('Email already exists');
        e.status = 409;
        throw e;
      }
      throw err;
    }

    await conn.execute(
      `INSERT INTO user_profiles (user_id, name) VALUES (?, ?)`,
      [Number(userId), name]
    );

    await conn.commit();
    return { user_id: userId, email, name, role_id: Number(role_id), is_active: 1 };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Every non-student user, with their profile name and role label.
export const listManagedUsers = async () => {
  const placeholders = MANAGED_ROLE_IDS.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT u.user_id, u.email, u.role_id, u.is_active, p.name, r.role_name
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.user_id
     LEFT JOIN role_entities r ON r.role_id = u.role_id
     WHERE u.role_id IN (${placeholders})
     ORDER BY u.role_id ASC, u.email ASC`,
    MANAGED_ROLE_IDS
  );
  return rows ?? [];
};

export const getManagedUserById = async (userId) => {
  const [rows] = await db.execute(
    `SELECT u.user_id, u.email, u.role_id, u.is_active, p.name, r.role_name
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.user_id
     LEFT JOIN role_entities r ON r.role_id = u.role_id
     WHERE u.user_id = ?
     LIMIT 1`,
    [Number(userId)]
  );
  return rows?.[0] ?? null;
};

// Role change + refresh-token invalidation in one transaction: the JWT carries
// role_id, and refreshAccessToken re-mints from the refresh token WITHOUT
// re-reading the DB, so a stale session would keep the old role indefinitely.
export const updateUserRole = async (userId, roleId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `UPDATE users SET role_id = ?, updated_at = NOW() WHERE user_id = ?`,
      [Number(roleId), Number(userId)]
    );
    await conn.execute(
      `UPDATE users SET refresh_hash = NULL WHERE user_id = ?`,
      [Number(userId)]
    );
    await conn.commit();
    return (res?.affectedRows ?? 0) > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Deactivating also drops the refresh token so the open session cannot be
// silently renewed (login already rejects inactive users).
export const setUserActive = async (userId, isActive) => {
  const active = isActive ? 1 : 0;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `UPDATE users SET is_active = ?, updated_at = NOW() WHERE user_id = ?`,
      [active, Number(userId)]
    );
    if (!active) {
      await conn.execute(`UPDATE users SET refresh_hash = NULL WHERE user_id = ?`, [Number(userId)]);
    }
    await conn.commit();
    return (res?.affectedRows ?? 0) > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Upsert — a user created before this feature existed has no profile row yet.
export const upsertUserName = async (userId, name) => {
  await db.execute(
    `INSERT INTO user_profiles (user_id, name) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [Number(userId), name]
  );
  return true;
};
