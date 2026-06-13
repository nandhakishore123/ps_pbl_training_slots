import db from '../../config/db.js';
import * as trainingModel from './training.model.js';

const normalizeStr = (v) => {
  if (v == null) return '';
  return String(v).trim();
};

export const getCategories = async () => {
  return trainingModel.listCategories();
};

export const getSkills = async ({ type, categoryId, search, limit, offset, all }) => {
  const t = normalizeStr(type).toUpperCase();
  if (t !== 'PS' && t !== 'PBL') {
    const err = new Error('Invalid skill type');
    err.status = 400;
    throw err;
  }

  const cat = normalizeStr(categoryId);
  const q = normalizeStr(search);
  const allRaw = normalizeStr(all).toLowerCase();
  const wantsAll = ['1', 'true', 'yes', 'y', 'all'].includes(allRaw);

  return trainingModel.listSkills({
    type: t,
    categoryId: cat && cat !== 'ALL' ? cat : null,
    search: q || null,
    limit,
    offset,
    all: wantsAll,
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

export const createBooking = async ({ userId, slotId, mappingId, trainingSkillId, levelId }) => {
  if (!userId) {
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

  const studentId = await trainingModel.getStudentIdByUserId(userId);
  if (!studentId) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  const hasMal = await trainingModel.hasMalpractice(studentId, trainingSkillId);
  if (hasMal) {
    const err = new Error('Access denied due to malpractice');
    err.status = 403;
    throw err;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

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

    const isFutureSlot = await trainingModel.isSlotTimingInFuture(slot.slot_id, conn);
    if (!isFutureSlot) {
      const err = new Error('Slot time has already passed');
      err.status = 400;
      throw err;
    }

    const existing = await trainingModel.getExistingBookingForSlotDate(studentId, slot.slot_id, conn);
    if (existing) {
      const err = new Error('Slot already booked for today');
      err.status = 409;
      throw err;
    }

    const activeBooking = await trainingModel.getExistingActiveBookingForCourse(studentId, trainingSkillId, conn);
    if (activeBooking) {
      const err = new Error('You already have an active/ongoing booking for this course');
      err.status = 409;
      throw err;
    }

    const candidates = await trainingModel.listAvailableMappingsForSlot({
      startTime: slot.start_time,
      endTime: slot.end_time,
      preferredMappingId: mappingId || 0,
      trainingSkillId,
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

    const bookingId = await trainingModel.insertStudentBooking({
      studentId,
      trainingSkillId: Number(trainingSkillId),
      levelId: levelId ? Number(levelId) : null,
      mappingId: selectedMappingId,
      slotId: slot.slot_id,
    }, conn);

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

export const getStudentBookings = async ({ userId }) => {
  const studentId = await trainingModel.getStudentIdByUserId(userId);
  if (!studentId) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  return trainingModel.listStudentBookings(studentId);
};

// ── Assessment services ───────────────────────────────────────────────────────

export const getAssessment = async (trainingSkillId, levelId, userId) => {
  if (userId) {
    const studentId = await trainingModel.getStudentIdByUserId(userId);
    if (studentId) {
      const hasMal = await trainingModel.hasMalpractice(studentId, trainingSkillId);
      if (hasMal) {
        const err = new Error('Access denied due to malpractice');
        err.status = 403;
        throw err;
      }
    }
  }
  const assessment = await trainingModel.getAssessmentForLevel(trainingSkillId, levelId);
  if (!assessment) {
    const err = new Error('No active assessment found for this level');
    err.status = 404;
    throw err;
  }
  const typeConfigs = await trainingModel.getAssessmentMcqTypeConfig(assessment.assessment_id);
  return { ...assessment, typeConfigs };
};

export const getAssessmentWithQuestions = async (assessmentId) => {
  const [rows] = await (await import('../../config/db.js')).default.execute(
    `SELECT assessment_id, assessment_title, assessment_type,
            total_marks, passing_marks, duration_minutes, is_active
     FROM assessments WHERE assessment_id = ? AND is_active = 1 LIMIT 1`,
    [Number(assessmentId)]
  );
  const assessment = rows?.[0] ?? null;
  if (!assessment) {
    const err = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }
  const typeConfigs = await trainingModel.getAssessmentMcqTypeConfig(assessment.assessment_id);
  const questions = await fetchQuestionsForAssessment(assessment.assessment_id, typeConfigs);
  return { ...assessment, typeConfigs, questions };
};

export const startAssessment = async ({ userId, assessmentId, totalMarks }) => {
  const studentId = await trainingModel.getStudentIdByUserId(userId);
  if (!studentId) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }
  const [assessmentRow] = await db.execute(
    'SELECT training_skill_id FROM assessments WHERE assessment_id = ? LIMIT 1',
    [Number(assessmentId)]
  );
  const skillId = assessmentRow?.[0]?.training_skill_id;
  if (skillId) {
    const hasMal = await trainingModel.hasMalpractice(studentId, skillId);
    if (hasMal) {
      const err = new Error('Access denied due to malpractice');
      err.status = 403;
      throw err;
    }
  }
  // Fetch type configs to get random questions per type
  const typeConfigs = await trainingModel.getAssessmentMcqTypeConfig(Number(assessmentId));
  const studentAssessmentId = await trainingModel.insertStudentAssessment(
    studentId,
    Number(assessmentId),
    Number(totalMarks)
  );
  // Fetch random questions per type
  const questions = await fetchQuestionsForAssessment(Number(assessmentId), typeConfigs);
  return { student_assessment_id: studentAssessmentId, questions };
};

export const fetchQuestionsForAssessment = async (assessmentId, typeConfigs) => {
  // Fetch random questions for each type config and combine
  const allQuestions = [];
  for (const cfg of typeConfigs) {
    const questions = await trainingModel.getRandomMcqQuestions(
      assessmentId,
      cfg.mcq_type_id,
      cfg.question_count
    );
    // Attach type info
    for (const q of questions) {
      allQuestions.push({ ...q, mcq_type_name: cfg.mcq_type_name });
    }
  }
  return allQuestions;
};

export const submitAssessment = async ({ studentAssessmentId, answers, passingMarks }) => {
  // answers: [{mcq_question_id, selected_option, correct_option, marks}]
  let scoreObtained = 0;
  const answerRows = (answers || []).map((a) => {
    const isCorrect = a.selected_option != null && a.selected_option === a.correct_option;
    const marksAwarded = isCorrect ? Number(a.marks || 1) : 0;
    scoreObtained += marksAwarded;
    return {
      student_assessment_id: Number(studentAssessmentId),
      mcq_question_id: Number(a.mcq_question_id),
      selected_option: a.selected_option || null,
      is_correct: isCorrect,
      marks_awarded: marksAwarded,
    };
  });

  if (answerRows.length) {
    await trainingModel.insertStudentMcqAnswers(answerRows);
  }

  const status = scoreObtained >= Number(passingMarks) ? 'PASSED' : 'FAILED';
  await trainingModel.submitStudentAssessment(Number(studentAssessmentId), scoreObtained, status);

  // Update student_booking status
  try {
    const [assessmentInfoRows] = await db.execute(
      `SELECT sa.student_id, a.training_skill_id, a.level_id, ts.skill_type
       FROM student_assessments sa
       JOIN assessments a ON a.assessment_id = sa.assessment_id
       JOIN training_skills ts ON ts.training_skill_id = a.training_skill_id
       WHERE sa.student_assessment_id = ?
       LIMIT 1`,
      [Number(studentAssessmentId)]
    );
    const info = assessmentInfoRows?.[0];
    if (info) {
      const isPassed = status === 'PASSED';
      let newBookingStatus = 'FAIL';
      if (isPassed) {
        newBookingStatus = info.skill_type === 'PS' ? 'PASS' : 'COMPLETED';
      }
      
      const [bookingRows] = await db.execute(
        `SELECT booking_id, mapping_id
         FROM student_booking
         WHERE student_id = ?
           AND training_skill_id = ?
           AND level_id = ?
           AND status = 'ONGOING'
         LIMIT 1`,
        [Number(info.student_id), Number(info.training_skill_id), Number(info.level_id)]
      );
      const booking = bookingRows?.[0];
      if (booking) {
        await db.execute(
          `UPDATE student_booking
           SET status = ?
           WHERE booking_id = ?`,
          [newBookingStatus, booking.booking_id]
        );
        await db.execute(
          `UPDATE venue_mapping
           SET current_bookings = GREATEST(0, COALESCE(current_bookings, 1) - 1)
           WHERE mapping_id = ?`,
          [booking.mapping_id]
        );
      }
    }
  } catch (error) {
    console.error('Failed to update student_booking status on assessment submission:', error);
  }

  return { score_obtained: scoreObtained, status };
};

export const reportMalpractice = async ({ bookingId, studentAssessmentId }) => {
  await trainingModel.markBookingMalpractice(Number(bookingId));
  if (studentAssessmentId) {
    await trainingModel.submitStudentAssessment(Number(studentAssessmentId), 0, 'FAILED');
  }
  return { success: true };
};

// ── Lab Record services ───────────────────────────────────────────────────────

export const getLabRecordQuestions = async () => {
  return trainingModel.getLabRecordQuestions();
};

export const saveLabRecord = async ({ userId, bookingId, responses }) => {
  const studentId = await trainingModel.getStudentIdByUserId(userId);
  if (!studentId) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  // Get faculty ID associated with this booking
  const facultyId = await trainingModel.getFacultyFromBooking(bookingId);

  await trainingModel.saveLabRecord({
    studentId,
    bookingId,
    facultyId,
    responses,
  });

  return { success: true };
};

export const getLabRecordByBooking = async (bookingId) => {
  return trainingModel.getLabRecordByBooking(bookingId);
};

