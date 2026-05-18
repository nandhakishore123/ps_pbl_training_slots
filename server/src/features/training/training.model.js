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

export const listSkills = async ({ type, categoryId, search, limit, offset }) => {
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

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
        COUNT(DISTINCT st.slot_id) AS slots_total,
        SUM(CASE WHEN v.is_active = 1 THEN COALESCE(v.capacity, 0) ELSE 0 END) AS capacity_total
      FROM slot_timings st
      LEFT JOIN venue_mapping vm
        ON vm.start_time = st.start_time
       AND vm.end_time = st.end_time
      LEFT JOIN venues v ON v.venue_id = vm.venue_id
      WHERE st.is_active = 1
    ) vm ON 1 = 1
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
    LIMIT ${lim} OFFSET ${off}
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
    `SELECT level_id, level_number, core_concept, max_attempts
     FROM skill_levels
     WHERE training_skill_id = ?
     ORDER BY level_number ASC`,
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
        st.slot_id,
        st.start_time,
        st.end_time,
        COALESCE(SUM(CASE WHEN v.is_active = 1 THEN v.capacity ELSE 0 END), 0) AS capacity_total,
        COALESCE(SUM(CASE WHEN v.is_active = 1 THEN vm.current_bookings ELSE 0 END), 0) AS bookings_total,
        (COALESCE(SUM(CASE WHEN v.is_active = 1 THEN v.capacity ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN v.is_active = 1 THEN vm.current_bookings ELSE 0 END), 0)) AS seats_available
      FROM slot_timings st
      LEFT JOIN venue_mapping vm
        ON vm.start_time = st.start_time
       AND vm.end_time = st.end_time
      LEFT JOIN venues v ON v.venue_id = vm.venue_id
      WHERE st.is_active = 1
      GROUP BY st.slot_id, st.start_time, st.end_time
      ORDER BY st.start_time ASC, st.end_time ASC, st.slot_id ASC`
  );
  return rows ?? [];
};

const getExec = (conn) => (conn ? conn : db);

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
        vm.start_time,
        vm.end_time,
        COALESCE(vm.current_bookings, 0) AS current_bookings,
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.is_active AS venue_active,
        st.slot_id
      FROM venue_mapping vm
      JOIN slot_timings st
        ON st.is_active = 1
       AND st.start_time = vm.start_time
       AND st.end_time = vm.end_time
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

export const listAvailableMappingsForSlot = async ({ startTime, endTime, preferredMappingId }, conn = null) => {
  const exec = getExec(conn);
  const [rows] = await exec.execute(
    `SELECT
        vm.mapping_id,
        COALESCE(vm.current_bookings, 0) AS current_bookings,
        v.capacity
      FROM venue_mapping vm
      JOIN slot_timings st
        ON st.is_active = 1
       AND st.start_time = vm.start_time
       AND st.end_time = vm.end_time
      JOIN venues v
        ON v.venue_id = vm.venue_id
      WHERE vm.start_time = ?
        AND vm.end_time = ?
        AND v.is_active = 1
        AND COALESCE(v.capacity, 0) > COALESCE(vm.current_bookings, 0)
      ORDER BY (vm.mapping_id = ?) DESC,
               COALESCE(vm.current_bookings, 0) ASC,
               vm.mapping_id ASC`,
    [startTime, endTime, Number(preferredMappingId)]
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

export const insertStudentBooking = async ({ studentId, trainingSkillId, mappingId, slotId }, conn = null) => {
  const exec = getExec(conn);
  const [result] = await exec.execute(
    `INSERT INTO student_booking
      (student_id, training_skill_id, mapping_id, slot_id, booking_date, status)
     VALUES (?, ?, ?, ?, CURDATE(), 'ONGOING')`,
    [Number(studentId), Number(trainingSkillId), Number(mappingId), Number(slotId)]
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
        vm.start_time,
        vm.end_time,
        v.venue_id,
        v.venue_name,
        v.capacity,
        COALESCE(vm.current_bookings, 0) AS current_bookings
      FROM student_booking sb
      JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
      JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
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
        ts.skill_name,
        ts.skill_type,
        sb.mapping_id,
        sb.slot_id,
        sb.booking_date,
        sb.status,
        vm.start_time,
        vm.end_time,
        v.venue_id,
        v.venue_name,
        v.capacity,
        COALESCE(vm.current_bookings, 0) AS current_bookings
      FROM student_booking sb
      JOIN training_skills ts ON ts.training_skill_id = sb.training_skill_id
      JOIN venue_mapping vm ON vm.mapping_id = sb.mapping_id
      LEFT JOIN venues v ON v.venue_id = vm.venue_id
      WHERE sb.student_id = ?
      ORDER BY sb.booking_date DESC, vm.start_time ASC, vm.end_time ASC`,
    [Number(studentId)]
  );
  return rows ?? [];
};
