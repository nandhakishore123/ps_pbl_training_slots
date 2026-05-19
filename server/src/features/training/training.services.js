import db from '../../config/db.js';
import * as trainingModel from './training.model.js';

const normalizeStr = (v) => {
  if (v == null) return '';
  return String(v).trim();
};

const shouldRetryStatusError = (error) => {
  if (!error) return false;
  if (error.code === 'WARN_DATA_TRUNCATED' || error.errno === 1265) return true;
  const msg = String(error.sqlMessage || error.message || '');
  return msg.toLowerCase().includes("status");
};

const resolveStudentId = async (user, conn = null) => {
  const userId = user?.user_id ?? user;
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const name = normalizeStr(user?.name) || null;
  const regNum = normalizeStr(user?.reg_num) || null;
  const studentId = await trainingModel.getOrCreateStudentIdByUser({
    userId,
    name,
    regNum,
  }, conn);

  if (!studentId) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  return studentId;
};

export const getCategories = async () => {
  return trainingModel.listCategories();
};

export const getSkills = async ({ type, categoryId, search, limit, offset }) => {
  const t = normalizeStr(type).toUpperCase();
  if (t !== 'PS' && t !== 'PBL') {
    const err = new Error('Invalid skill type');
    err.status = 400;
    throw err;
  }

  const cat = normalizeStr(categoryId);
  const q = normalizeStr(search);

  return trainingModel.listSkills({
    type: t,
    categoryId: cat && cat !== 'ALL' ? cat : null,
    search: q || null,
    limit,
    offset,
  });
};

export const getSkillDetails = async (trainingSkillId) => {
  const header = await trainingModel.getSkillHeader(trainingSkillId);
  if (!header) {
    const err = new Error('Skill not found');
    err.status = 404;
    throw err;
  }

  const levels = await trainingModel.getSkillLevels(trainingSkillId);
  const levelPointsRows = await trainingModel.getSkillLevelPoints(trainingSkillId);
  const syllabusRows = await trainingModel.getLevelSyllabus(levels.map((l) => l.level_id));

  const pointsByLevelId = new Map();
  for (const r of levelPointsRows || []) {
    const id = r.level_id;
    if (!pointsByLevelId.has(id)) pointsByLevelId.set(id, {});
    const entry = pointsByLevelId.get(id);
    if (r.point_type === 'REWARD_POINTS') entry.reward_points = Number(r.points_alloted || 0);
    if (r.point_type === 'ACTIVITY_POINTS') entry.activity_points = Number(r.points_alloted || 0);
  }

  const byLevel = new Map();
  for (const lvl of levels) {
    const pts = pointsByLevelId.get(lvl.level_id) || {};
    byLevel.set(lvl.level_id, {
      ...lvl,
      reward_points: pts.reward_points,
      activity_points: pts.activity_points,
      syllabus: [],
    });
  }

  for (const s of syllabusRows) {
    const item = byLevel.get(s.level_id);
    if (item) item.syllabus.push(s);
  }

  return {
    ...header,
    levels: Array.from(byLevel.values()),
  };
};

export const getSkillSlots = async (trainingSkillId) => {
  return trainingModel.listSkillSlots(trainingSkillId);
};

export const createBooking = async ({ user, userId, slotId, trainingSkillId }) => {
  const resolvedUser = user || (userId ? { user_id: userId } : null);
  if (!resolvedUser) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  if (!slotId) {
    const err = new Error('Slot id is required');
    err.status = 400;
    throw err;
  }
  if (!trainingSkillId) {
    const err = new Error('Training skill id is required');
    err.status = 400;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const studentId = await resolveStudentId(resolvedUser, conn);

    const slot = await trainingModel.getSlotTimingById(slotId, conn);
    if (!slot) {
      const err = new Error('Slot timing not found');
      err.status = 404;
      throw err;
    }
    if (!slot.is_active) {
      const err = new Error('Slot timing is inactive');
      err.status = 400;
      throw err;
    }

    const existing = await trainingModel.getExistingBookingForSlotDate(studentId, slot.slot_id, conn);
    if (existing) {
      const err = new Error('Slot already booked for today');
      err.status = 409;
      throw err;
    }

    const candidates = await trainingModel.listAvailableMappingsForSlot({
      startTime: slot.start_time,
      endTime: slot.end_time,
      preferredMappingId: 0,
    }, conn);

    if (!candidates.length) {
      const err = new Error('No seats available for this slot');
      err.status = 409;
      throw err;
    }

    let selectedMappingId = null;
    for (const candidate of candidates) {
      const updated = await trainingModel.incrementMappingBooking(candidate.mapping_id, conn);
      if (updated > 0) {
        selectedMappingId = candidate.mapping_id;
        break;
      }
    }

    if (!selectedMappingId) {
      const err = new Error('No seats available for this slot');
      err.status = 409;
      throw err;
    }

    let bookingId;
    try {
      bookingId = await trainingModel.insertStudentBooking({
        studentId,
        trainingSkillId: Number(trainingSkillId),
        mappingId: selectedMappingId,
        slotId: slot.slot_id,
        status: 'ONGOING',
      }, conn);
    } catch (error) {
      if (shouldRetryStatusError(error)) {
        bookingId = await trainingModel.insertStudentBooking({
          studentId,
          trainingSkillId: Number(trainingSkillId),
          mappingId: selectedMappingId,
          slotId: slot.slot_id,
          status: 1,
        }, conn);
      } else {
        throw error;
      }
    }

    const booking = await trainingModel.getBookingById(bookingId, conn);
    await conn.commit();

    return {
      ...booking,
      requested_slot_id: Number(slot.slot_id),
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const getStudentBookings = async ({ user, userId }) => {
  const resolvedUser = user || (userId ? { user_id: userId } : null);
  if (!resolvedUser) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const studentId = await resolveStudentId(resolvedUser);
  return trainingModel.listStudentBookings(studentId);
};
