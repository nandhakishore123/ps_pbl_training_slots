import db from '../../config/db.js';
import * as trainingModel from './training.model.js';

const normalizeStr = (v) => {
  if (v == null) return '';
  return String(v).trim();
};

// ── Time-based booking window (all times IST) ─────────────────────────────────
// Rule: each day at the configured open time (default 19:45) IST the NEXT
// working day's slots open (Sunday is a holiday and is skipped). A slot for
// date D is bookable while open-time-on-the-working-day-before-D <= now <
// D@slot.start_time. The open hour/minute are admin-configurable (app_config).
const DEFAULT_OPEN_HOUR = 19;
const DEFAULT_OPEN_MINUTE = 45;

// Pure: given the current IST wall-clock ('YYYY-MM-DD HH:MM:SS') and the
// configured open time, returns the currently-open booking day and (for the
// same-day case) the start-time cutoff.
// { bookingDate: 'YYYY-MM-DD'|null, startAfterTime: 'HH:MM:SS'|null, isToday }
export const computeBookingWindow = (istNowStr, { openHour = DEFAULT_OPEN_HOUR, openMinute = DEFAULT_OPEN_MINUTE } = {}) => {
  if (!istNowStr) return { bookingDate: null, startAfterTime: null, isToday: false };
  const [datePart, timePart = '00:00:00'] = String(istNowStr).trim().split(' ');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [hh, mi, ss] = timePart.split(':').map(Number);

  // Plain calendar carrier — values are already IST, so use UTC accessors to
  // avoid any server-local-timezone drift.
  const today = new Date(Date.UTC(y, mo - 1, d));
  const addDays = (base, n) => new Date(base.getTime() + n * 86400000);
  const fmt = (dt) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const isSunday = (dt) => dt.getUTCDay() === 0;

  const minutesNow = hh * 60 + mi;
  const openMinutes = openHour * 60 + openMinute;

  if (minutesNow >= openMinutes) {
    // 19:45 passed → next working day's slots have opened (skip Sunday).
    let next = addDays(today, 1);
    if (isSunday(next)) next = addDays(next, 1);
    return { bookingDate: fmt(next), startAfterTime: null, isToday: false };
  }

  // Before 19:45 → today's not-yet-started slots remain bookable, unless today
  // is Sunday (holiday; Monday opens only at Sunday 19:45).
  if (isSunday(today)) {
    return { bookingDate: null, startAfterTime: null, isToday: false };
  }
  const startAfterTime =
    `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return { bookingDate: fmt(today), startAfterTime, isToday: true };
};

// Short in-memory cache for the booking-open config so we don't hit the DB on
// every booking request. Invalidated immediately when an admin updates it.
let _bookingCfgCache = null;
let _bookingCfgExpiry = 0;
const BOOKING_CFG_TTL_MS = 60 * 1000;

const getBookingOpenConfigCached = async (conn = null) => {
  const now = Date.now();
  if (_bookingCfgCache && now < _bookingCfgExpiry) return _bookingCfgCache;
  const cfg = await trainingModel.getBookingOpenConfig(conn);
  _bookingCfgCache = cfg;
  _bookingCfgExpiry = now + BOOKING_CFG_TTL_MS;
  return cfg;
};

// Called by the admin config update so the new open time takes effect at once.
export const invalidateBookingWindowCache = () => {
  _bookingCfgCache = null;
  _bookingCfgExpiry = 0;
};

const getCurrentBookingWindow = async (conn = null) => {
  const istNow = await trainingModel.getIstNow(conn);
  const cfg = await getBookingOpenConfigCached(conn);
  return computeBookingWindow(istNow, cfg);
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
  const window = await getCurrentBookingWindow();
  // Nothing currently open → empty list; the frontend shows the friendly
  // "booking opens at 7:45 PM" empty state. Stage 3b: slots are read from
  // venue_slots for the open day — there is NO fallback to global slot_timings,
  // so a day with zero authored venue_slots also returns [] (empty state).
  if (!window.bookingDate) return [];
  return trainingModel.listSkillSlots(trainingSkillId, {
    bookingDate: window.bookingDate,
    startAfterTime: window.startAfterTime,
  });
};

export const createBooking = async ({ userId, venueSlotId, trainingSkillId, levelId }) => {
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  if (!venueSlotId) {
    const err = new Error('Venue slot id is required');
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

    // Stage 3b: the chosen venue_slot fully pins venue + date + time + faculty.
    const slot = await trainingModel.getVenueSlotById(venueSlotId, conn);
    if (!slot) {
      const err = new Error('Slot not found');
      err.status = 404;
      throw err;
    }
    if (!slot.is_active) {
      const err = new Error('This slot is inactive');
      err.status = 400;
      throw err;
    }
    if (!slot.venue_active) {
      const err = new Error('This venue is inactive');
      err.status = 400;
      throw err;
    }

    // The slot's venue must actively offer this skill.
    const allotted = await trainingModel.isSkillAllottedAtVenue(slot.venue_id, trainingSkillId, conn);
    if (!allotted) {
      const err = new Error('This venue does not offer the selected skill');
      err.status = 403;
      throw err;
    }

    // Re-validate the booking window server-side (never trust the client).
    const window = await getCurrentBookingWindow(conn);
    if (!window.bookingDate) {
      const err = new Error('Booking is not open right now. Booking opens daily at 7:45 PM for the next day.');
      err.status = 400;
      throw err;
    }
    // The slot must belong to the currently-open booking day.
    if (String(slot.slot_date) !== String(window.bookingDate)) {
      const err = new Error('This slot is not open for booking right now.');
      err.status = 400;
      throw err;
    }
    // Same-day window: a slot is bookable only until its own start time.
    if (window.isToday && window.startAfterTime && String(slot.start_time) <= window.startAfterTime) {
      const err = new Error("This slot's booking window has closed — a slot can only be booked before its start time.");
      err.status = 400;
      throw err;
    }

    // Duplicate-booking guard (this exact venue_slot).
    const existing = await trainingModel.getExistingBookingForVenueSlot(studentId, venueSlotId, conn);
    if (existing) {
      const err = new Error('You have already booked this slot');
      err.status = 409;
      throw err;
    }

    // Same-time-same-day cross-venue guard: no two bookings at the same date+time.
    const sameTime = await trainingModel.getSameTimeBookingForStudent(studentId, slot.slot_date, slot.start_time, conn);
    if (sameTime) {
      const err = new Error('You already have a booking at this time on this day');
      err.status = 409;
      throw err;
    }

    const activeBooking = await trainingModel.getExistingActiveBookingForCourse(studentId, trainingSkillId, conn);
    if (activeBooking) {
      const err = new Error('You already have an active/ongoing booking for this course');
      err.status = 409;
      throw err;
    }

    // Atomic guarded seat claim (capacity > current_bookings, on venue_slots).
    const claimed = await trainingModel.incrementVenueSlotBooking(venueSlotId, conn);
    if (claimed === 0) {
      const err = new Error('No seats available for this slot');
      err.status = 409;
      throw err;
    }

    const bookingId = await trainingModel.insertStudentBooking({
      studentId,
      trainingSkillId: Number(trainingSkillId),
      levelId: levelId ? Number(levelId) : null,
      mappingId: slot.mapping_id,
      venueSlotId: Number(venueSlotId),
      bookingDate: slot.slot_date,
    }, conn);

    const booking = await trainingModel.getBookingById(bookingId, conn);
    await conn.commit();

    return {
      ...booking,
      requested_venue_slot_id: Number(venueSlotId),
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
      const [bookingRows] = await db.execute(
        `SELECT booking_id FROM student_booking
         WHERE student_id = ? AND training_skill_id = ? AND level_id = ? AND status = 'ONGOING'
         LIMIT 1`,
        [Number(studentId), Number(trainingSkillId), Number(levelId)]
      );
      if (!bookingRows?.length) {
        const err = new Error('You do not have an active ongoing booking for this assessment.');
        err.status = 400;
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
    'SELECT training_skill_id, level_id FROM assessments WHERE assessment_id = ? LIMIT 1',
    [Number(assessmentId)]
  );
  const skillId = assessmentRow?.[0]?.training_skill_id;
  const levelId = assessmentRow?.[0]?.level_id;
  if (skillId) {
    const hasMal = await trainingModel.hasMalpractice(studentId, skillId);
    if (hasMal) {
      const err = new Error('Access denied due to malpractice');
      err.status = 403;
      throw err;
    }
  }
  if (skillId && levelId) {
    // Pull the booking together with its slot window so we can enforce the
    // start gate server-side (production may run in UTC — never trust the
    // server's local clock; compare against DB IST instead).
    const [bookingRows] = await db.execute(
      `SELECT sb.booking_id,
              DATE_FORMAT(sb.booking_date, '%Y-%m-%d') AS booking_date,
              sb.is_present,
              TIME_FORMAT(vs.start_time, '%H:%i:%s') AS start_time,
              TIME_FORMAT(vs.end_time, '%H:%i:%s') AS end_time
       FROM student_booking sb
       JOIN venue_slots vs ON vs.venue_slot_id = sb.venue_slot_id
       WHERE sb.student_id = ? AND sb.training_skill_id = ? AND sb.level_id = ? AND sb.status = 'ONGOING'
       LIMIT 1`,
      [Number(studentId), Number(skillId), Number(levelId)]
    );
    const booking = bookingRows?.[0];
    if (!booking) {
      const err = new Error('No active ongoing booking found for this assessment');
      err.status = 400;
      throw err;
    }

    // IST wall-clock 'YYYY-MM-DD HH:MM:SS' from the DB (CONVERT_TZ to +05:30).
    const istNow = await trainingModel.getIstNow();
    const slotStart = `${booking.booking_date} ${booking.start_time}`;
    const slotEnd = `${booking.booking_date} ${booking.end_time}`;

    if (istNow && istNow < slotStart) {
      const err = new Error('Assessment is not available yet. It opens at your slot start time.');
      err.status = 403;
      throw err;
    }
    if (istNow && istNow > slotEnd) {
      const err = new Error('This slot has ended. The assessment window is closed.');
      err.status = 403;
      throw err;
    }
    if (Number(booking.is_present) !== 1) {
      const err = new Error("You haven't been marked present yet. Please wait for the faculty to mark your attendance.");
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
        `SELECT booking_id, venue_slot_id
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
        // Stage 3b: release the seat on venue_slots.
        await trainingModel.decrementVenueSlotBooking(booking.venue_slot_id);
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

