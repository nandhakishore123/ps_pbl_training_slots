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

export const addVenueToFaculty = async (facultyId, venueId, skillType, slotId) => {
  const [result] = await db.execute(`
    INSERT INTO venue_mapping (faculty_id, venue_id, slot_id)
    VALUES (?, ?, ?)
  `, [facultyId, venueId, slotId]);
  return result.insertId;
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
