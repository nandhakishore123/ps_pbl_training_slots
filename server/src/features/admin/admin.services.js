import db from '../../config/db.js';
import * as adminModel from './admin.model.js';
import * as trainingModel from '../training/training.model.js';
import { invalidateBookingWindowCache, computeBookingWindow } from '../training/training.services.js';

export const getDashboardKPI = async () => {
    return await adminModel.getDashboardKPI();
};

// ── Admin cancel a booking (Stage 4a) — hard delete, no DB schema change ──────
// Seat invariant: venue_slots.current_bookings holds a seat ONLY while the
// booking is ONGOING. So we decrement ONLY for ONGOING; terminal/malpractice
// bookings already released their seat. Reuses the existing student/seat helpers
// — the student booking flow and assessment engine are NOT modified.
export const cancelBooking = async (bookingId) => {
    const id = Number(bookingId);
    if (!id) {
        const err = new Error('Booking id is required');
        err.status = 400;
        throw err;
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const booking = await trainingModel.getBookingById(id, conn);
        if (!booking) {
            const err = new Error('Booking not found');
            err.status = 404;
            throw err;
        }

        if (booking.status === 'MALPRACTICE') {
            const err = new Error('Use revoke-malpractice, not cancel.');
            err.status = 409;
            throw err;
        }
        if (booking.status !== 'ONGOING') {
            // PASS / FAIL / COMPLETED — already finished, seat already released.
            const err = new Error('This booking is already finished.');
            err.status = 409;
            throw err;
        }

        // ONGOING only: release the seat it currently holds.
        await trainingModel.decrementVenueSlotBooking(booking.venue_slot_id, conn);
        await trainingModel.deleteBookingCascade(id, conn);

        await conn.commit();
        return { success: true, bookingId: id };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ── Admin book a slot FOR a student (Stage 4b) ───────────────────────────────
// Composes the SAME reusable guards as the student createBooking flow (which is
// NOT modified). The ONLY relaxation vs students is skipping the daily open-time
// gate — every integrity check (capacity, duplicate, same-time, one-active,
// malpractice, not-in-past) is still enforced. Seat claim is the existing atomic
// guarded increment, so admins can never oversell.
// Per-student booking core — runs in its OWN transaction. Shared by
// adminBookForStudent (single) and adminBulkBook (loop) so the guard + atomic
// seat logic exists exactly once. Throws typed errors (err.status) on rejection.
const bookOneStudent = async ({ studentId, venueSlotId, trainingSkillId, levelId }) => {
    const sId = Number(studentId);
    const vsId = Number(venueSlotId);
    const skillId = Number(trainingSkillId);
    if (!sId || !vsId || !skillId) {
        const err = new Error('studentId, venueSlotId and trainingSkillId are required');
        err.status = 400;
        throw err;
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const slot = await trainingModel.getVenueSlotById(vsId, conn);
        if (!slot) { const e = new Error('Slot not found'); e.status = 404; throw e; }
        if (!slot.is_active) { const e = new Error('This slot is inactive'); e.status = 400; throw e; }
        if (!slot.venue_active) { const e = new Error('This venue is inactive'); e.status = 400; throw e; }

        // The slot's venue must actively offer this skill.
        const allotted = await trainingModel.isSkillAllottedAtVenue(slot.venue_id, skillId, conn);
        if (!allotted) { const e = new Error('This venue does not offer the selected skill'); e.status = 403; throw e; }

        // Not in the past — admin skips ONLY the daily open-time gate, never temporal sanity.
        const istNow = await trainingModel.getIstNow(conn);
        const [nowDate, nowTime = '00:00:00'] = String(istNow || '').trim().split(' ');
        if (nowDate && String(slot.slot_date) < String(nowDate)) {
            const e = new Error("This slot's date has already passed."); e.status = 400; throw e;
        }
        if (nowDate && String(slot.slot_date) === String(nowDate) && String(slot.start_time) <= String(nowTime)) {
            const e = new Error('This slot has already started.'); e.status = 400; throw e;
        }

        // Malpractice lock (kept — intentional).
        const hasMal = await trainingModel.hasMalpractice(sId, skillId, conn);
        if (hasMal) { const e = new Error('This student is blocked for this skill due to malpractice'); e.status = 403; throw e; }

        // Duplicate (same venue_slot) — uq_student_venue_slot is the backstop.
        const existing = await trainingModel.getExistingBookingForVenueSlot(sId, vsId, conn);
        if (existing) { const e = new Error('Student has already booked this slot'); e.status = 409; throw e; }

        // Same-time-same-day across venues.
        const sameTime = await trainingModel.getSameTimeBookingForStudent(sId, slot.slot_date, slot.start_time, conn);
        if (sameTime) { const e = new Error('Student already has a booking at this time on this day'); e.status = 409; throw e; }

        // One active booking per course.
        const active = await trainingModel.getExistingActiveBookingForCourse(sId, skillId, conn);
        if (active) { const e = new Error('Student already has an active/ongoing booking for this course'); e.status = 409; throw e; }

        // Atomic guarded seat claim (capacity enforced — no oversell).
        const claimed = await trainingModel.incrementVenueSlotBooking(vsId, conn);
        if (claimed === 0) { const e = new Error('Slot is full'); e.status = 409; throw e; }

        let bookingId;
        try {
            bookingId = await trainingModel.insertStudentBooking({
                studentId: sId,
                trainingSkillId: skillId,
                levelId: levelId ? Number(levelId) : null,
                mappingId: slot.mapping_id,
                venueSlotId: vsId,
                bookingDate: slot.slot_date,
            }, conn);
        } catch (e) {
            if (e?.code === 'ER_DUP_ENTRY') {
                const dup = new Error('Student has already booked this slot'); dup.status = 409; throw dup;
            }
            throw e;
        }

        const booking = await trainingModel.getBookingById(bookingId, conn);
        await conn.commit();
        return booking;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// Single admin booking — thin wrapper over the shared core.
export const adminBookForStudent = async (payload) => {
    return await bookOneStudent(payload);
};

// ── Admin bulk-book (Stage 4c) ───────────────────────────────────────────────
// Books many students into ONE venue_slot. CRITICAL: each student runs in its
// OWN transaction (bookOneStudent), so one student's failure never rolls back
// the others. The atomic guarded seat increment is the gate — once the slot hits
// capacity mid-batch, the remaining students get "Slot is full" (no oversell, no
// counter drift). Sequential loop so the capacity gate is deterministic.
export const adminBulkBook = async ({ studentIds, venueSlotId, trainingSkillId, levelId }) => {
    const vsId = Number(venueSlotId);
    const skillId = Number(trainingSkillId);
    if (!vsId || !skillId) {
        const err = new Error('venueSlotId and trainingSkillId are required');
        err.status = 400;
        throw err;
    }
    const ids = Array.isArray(studentIds)
        ? [...new Set(studentIds.map(Number).filter(Boolean))]
        : [];
    if (!ids.length) {
        const err = new Error('At least one student is required');
        err.status = 400;
        throw err;
    }

    // Best-effort names for the report (reuses the same source as getStudents).
    const nameMap = new Map();
    try {
        const students = await adminModel.listStudentsWithPoints();
        for (const s of students) nameMap.set(Number(s.student_id), { name: s.name, regNum: s.reg_num });
    } catch {
        // Report still works with ids only.
    }

    const results = [];
    let booked = 0, skipped = 0, failed = 0;

    for (const sId of ids) {
        const meta = nameMap.get(sId) || {};
        try {
            const booking = await bookOneStudent({ studentId: sId, venueSlotId: vsId, trainingSkillId: skillId, levelId });
            booked++;
            results.push({ studentId: sId, name: meta.name, regNum: meta.regNum, outcome: 'booked', bookingId: booking?.booking_id });
        } catch (err) {
            // Guard rejections carry err.status (400/403/404/409) → 'skipped' with the
            // reason. An error WITHOUT a status is unexpected → 'failed'.
            if (err?.status) {
                skipped++;
                results.push({ studentId: sId, name: meta.name, regNum: meta.regNum, outcome: 'skipped', reason: err.message });
            } else {
                failed++;
                results.push({ studentId: sId, name: meta.name, regNum: meta.regNum, outcome: 'failed', reason: err.message || 'Unexpected error' });
            }
        }
    }

    return { summary: { booked, skipped, failed }, results };
};

// Skill levels for the admin booking modal (read-only; reuses trainingModel).
export const getSkillLevels = async (skillId) => {
    if (!skillId) throw new Error('Skill id is required');
    return await trainingModel.getSkillLevels(skillId);
};

// ── Booking-open time config (app_config) ────────────────────
// Returns date context for the admin Slot Scheduling page (READ-ONLY helpers):
//  • today          = IST current date 'YYYY-MM-DD' (for the [Today] quick button)
//  • nextBookingDate = the next working day (today+1, skip Sunday) students will
//    target when the window opens tonight — computed with the SAME pure
//    computeBookingWindow students use (forced to the post-open branch via a
//    23:59:59 IST time) so the admin's default date can never disagree with what
//    students see. One getIstNow() call feeds both. No engine change.
const getDateContext = async (cfg) => {
    try {
        const istNow = await trainingModel.getIstNow();
        const today = istNow ? String(istNow).trim().split(' ')[0] : null;
        const nextBookingDate = today ? computeBookingWindow(`${today} 23:59:59`, cfg).bookingDate : null;
        return { today, nextBookingDate };
    } catch {
        return { today: null, nextBookingDate: null };
    }
};

export const getBookingWindowConfig = async () => {
    const cfg = await trainingModel.getBookingOpenConfig();
    return { ...cfg, ...(await getDateContext(cfg)) };
};

export const updateBookingWindowConfig = async (openHour, openMinute) => {
    const h = Number(openHour);
    const m = Number(openMinute);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
        throw new Error('openHour must be an integer between 0 and 23');
    }
    if (!Number.isInteger(m) || m < 0 || m > 59) {
        throw new Error('openMinute must be an integer between 0 and 59');
    }
    await trainingModel.updateBookingOpenConfig(h, m);
    // New time takes effect immediately for students + booking re-validation.
    invalidateBookingWindowCache();
    const cfg = { openHour: h, openMinute: m };
    return { ...cfg, ...(await getDateContext(cfg)) };
};

export const getVenues = async () => {
    return await adminModel.listVenues();
};

export const getFaculty = async () => {
    return await adminModel.listFaculty();
};

export const searchFaculty = async (query, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    return await adminModel.searchFaculty(query, limit, offset);
};

export const getStudents = async () => {
    return await adminModel.listStudentsWithPoints();
};

// ── Student management (admin authoring) — Stage 5d ──────────
// Create provisions users + students in ONE transaction (rollback → no orphan
// user). Deactivate mirrors is_active across both tables so a deactivated
// student also can't log in. Required: email, reg_num, name.
const normEmail = (v) => (v != null ? String(v).trim().toLowerCase() : '');
const normYear = (v) => (v != null && v !== '' ? Number(v) : null);
const normOpt = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);

export const getAllStudents = async () => {
    return await adminModel.listAllStudents();
};

export const createStudent = async ({ email, reg_num, name, degree, course, year_of_study }) => {
    const e = normEmail(email);
    const reg = reg_num != null ? String(reg_num).trim() : '';
    const nm = name != null ? String(name).trim() : '';
    if (!e) throw new Error('Email is required');
    if (!reg) throw new Error('Registration number is required');
    if (!nm) throw new Error('Name is required');

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const result = await adminModel.createStudentWithUser({
            email: e, reg_num: reg, name: nm,
            degree: normOpt(degree), course: normOpt(course), year_of_study: normYear(year_of_study),
        }, conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export const updateStudent = async (studentId, { email, reg_num, name, degree, course, year_of_study }) => {
    if (!studentId) throw new Error('Student ID is required');
    const reg = reg_num != null ? String(reg_num).trim() : '';
    const nm = name != null ? String(name).trim() : '';
    if (!reg) throw new Error('Registration number is required');
    if (!nm) throw new Error('Name is required');
    const e = email != null && String(email).trim() !== '' ? normEmail(email) : null;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        // user_id linkage is immutable; only the email value may change.
        if (e) {
            const userId = await adminModel.getStudentUserId(studentId, conn);
            if (!userId) throw Object.assign(new Error('Student not found'), { status: 404 });
            await adminModel.updateUserEmail(userId, e, conn);
        }
        await adminModel.updateStudent(studentId, {
            reg_num: reg, name: nm,
            degree: normOpt(degree), course: normOpt(course), year_of_study: normYear(year_of_study),
        }, conn);
        await conn.commit();
        return true;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export const setStudentActive = async (studentId, isActive) => {
    if (!studentId) throw new Error('Student ID is required');
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const userId = await adminModel.getStudentUserId(studentId, conn);
        if (!userId) throw Object.assign(new Error('Student not found'), { status: 404 });
        await adminModel.setStudentActiveRow(studentId, isActive, conn);
        // Mirror to users so a deactivated student can't log in (issueSessionForEmail
        // already rejects inactive users).
        await adminModel.setUserActiveRow(userId, isActive, conn);
        await conn.commit();
        return true;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export const getTrainingSkills = async () => {
    return await adminModel.listTrainingSkills();
};

export const getSlotTimings = async () => {
    return await adminModel.listSlotTimings();
};

export const addSlotTiming = async (startTime, endTime) => {
    if (!startTime || !endTime) {
        throw new Error('Start time and End time are required');
    }
    return await adminModel.addSlotTiming(startTime, endTime);
};

export const deleteSlotTiming = async (slotId) => {
    if (!slotId) {
        throw new Error('Slot ID is required');
    }
    return await adminModel.deleteSlotTiming(slotId);
};

// ── Venue management ─────────────────────────────────────────
export const getAllVenues = async () => {
    return await adminModel.listAllVenues();
};

export const createVenue = async ({ venueName, location, capacity }) => {
    if (!venueName || !String(venueName).trim()) {
        throw new Error('Venue name is required');
    }
    return await adminModel.createVenue({
        venueName: String(venueName).trim(),
        location: location != null ? String(location).trim() : null,
        capacity: capacity != null && capacity !== '' ? Number(capacity) : null,
    });
};

export const updateVenue = async (venueId, { venueName, location, capacity }) => {
    if (!venueId) throw new Error('Venue ID is required');
    if (!venueName || !String(venueName).trim()) {
        throw new Error('Venue name is required');
    }
    return await adminModel.updateVenue(venueId, {
        venueName: String(venueName).trim(),
        location: location != null ? String(location).trim() : null,
        capacity: capacity != null && capacity !== '' ? Number(capacity) : null,
    });
};

export const setVenueActive = async (venueId, isActive, force = false) => {
    if (!venueId) throw new Error('Venue ID is required');
    // Deactivating a venue that still has faculty mappings would hide a venue
    // in use from booking — require explicit confirmation.
    if (!isActive && !force) {
        const mappingCount = await adminModel.countMappingsByVenue(venueId);
        if (mappingCount > 0) {
            const err = new Error(`This venue has ${mappingCount} faculty mapping(s). Deactivating it removes it from booking. Confirm to proceed.`);
            err.status = 409;
            err.requiresConfirmation = true;
            err.count = mappingCount;
            throw err;
        }
    }
    return await adminModel.setVenueActive(venueId, isActive);
};

// ── Training skill (Course/Lab) management — Stage 5a ─────────
// Mirrors venue management. PS vs PBL = the skill_type column; category via
// category_id (NOT NULL FK). Soft-deactivate only.
export const getAllTrainingSkills = async () => {
    return await adminModel.listAllTrainingSkills();
};

export const getSkillCategories = async () => {
    return await adminModel.listSkillCategories();
};

const VALID_SKILL_TYPES = ['PS', 'PBL'];

export const createTrainingSkill = async ({ skill_name, skill_type, category_id, image_url }) => {
    if (!skill_name || !String(skill_name).trim()) {
        throw new Error('Skill name is required');
    }
    if (!VALID_SKILL_TYPES.includes(skill_type)) {
        throw new Error('Skill type must be PS or PBL');
    }
    if (!category_id) {
        throw new Error('Category is required');
    }
    return await adminModel.createTrainingSkill({
        skill_name: String(skill_name).trim(),
        skill_type,
        category_id,
        image_url: image_url != null && String(image_url).trim() !== '' ? String(image_url).trim() : null,
    });
};

export const updateTrainingSkill = async (id, { skill_name, skill_type, category_id, image_url }) => {
    if (!id) throw new Error('Training skill ID is required');
    if (!skill_name || !String(skill_name).trim()) {
        throw new Error('Skill name is required');
    }
    if (!VALID_SKILL_TYPES.includes(skill_type)) {
        throw new Error('Skill type must be PS or PBL');
    }
    if (!category_id) {
        throw new Error('Category is required');
    }
    return await adminModel.updateTrainingSkill(id, {
        skill_name: String(skill_name).trim(),
        skill_type,
        category_id,
        image_url: image_url != null && String(image_url).trim() !== '' ? String(image_url).trim() : null,
    });
};

export const setTrainingSkillActive = async (id, isActive, force = false) => {
    if (!id) throw new Error('Training skill ID is required');
    // Deactivating a course that is still actively offered at venues hides it
    // from booking pickers — warn (not hard-block) so admins confirm intent.
    if (!isActive && !force) {
        const venueCount = await adminModel.countVenueSkillsBySkill(id);
        if (venueCount > 0) {
            const err = new Error(`This course/lab is still offered at ${venueCount} venue(s). Deactivating it hides it from booking. Confirm to proceed.`);
            err.status = 409;
            err.requiresConfirmation = true;
            err.count = venueCount;
            throw err;
        }
    }
    return await adminModel.setTrainingSkillActive(id, isActive);
};

// ── Skill level (Course/Lab level) management — Stage 5b ─────
// Create/Edit are trivial. Delete is GUARD-DELETE: blocked when the level is in
// use or still owns content (no soft-delete column on skill_levels).
export const createLevel = async (skillId, { level_name, core_concept, max_attempts }) => {
    if (!skillId) throw new Error('Training skill ID is required');
    if (!level_name || !String(level_name).trim()) {
        throw new Error('Level name is required');
    }
    return await adminModel.createLevel({
        training_skill_id: skillId,
        level_name: String(level_name).trim(),
        core_concept: core_concept != null && String(core_concept).trim() !== '' ? String(core_concept).trim() : null,
        max_attempts: max_attempts != null && max_attempts !== '' ? Number(max_attempts) : null,
    });
};

export const updateLevel = async (levelId, { level_name, core_concept, max_attempts }) => {
    if (!levelId) throw new Error('Level ID is required');
    if (!level_name || !String(level_name).trim()) {
        throw new Error('Level name is required');
    }
    return await adminModel.updateLevel(levelId, {
        level_name: String(level_name).trim(),
        core_concept: core_concept != null && String(core_concept).trim() !== '' ? String(core_concept).trim() : null,
        max_attempts: max_attempts != null && max_attempts !== '' ? Number(max_attempts) : null,
    });
};

// GUARD-DELETE. Order: in-use checks first (bookings, then assessment attempts),
// then the "not empty" check. Each throws a 409 the controller surfaces verbatim.
export const deleteLevelGuarded = async (levelId) => {
    if (!levelId) throw new Error('Level ID is required');

    const bookingCount = await adminModel.countBookingsByLevel(levelId);
    if (bookingCount > 0) {
        const err = new Error("Can't delete — this level has bookings.");
        err.status = 409;
        throw err;
    }

    const attemptCount = await adminModel.countAssessmentAttemptsByLevel(levelId);
    if (attemptCount > 0) {
        const err = new Error("Can't delete — this level has assessment attempts.");
        err.status = 409;
        throw err;
    }

    // No student data is attached; if the level still owns content, block rather
    // than cascade into the assessment domain — admin must clear it first.
    const contents = await adminModel.countLevelContents(levelId);
    if (contents.syllabus + contents.points + contents.assessments > 0) {
        const parts = [];
        if (contents.syllabus > 0) parts.push(`${contents.syllabus} syllabus topic(s)`);
        if (contents.points > 0) parts.push(`${contents.points} point rule(s)`);
        if (contents.assessments > 0) parts.push(`${contents.assessments} assessment(s)`);
        const err = new Error(`Can't delete — this level isn't empty (${parts.join(', ')}). Remove its contents first.`);
        err.status = 409;
        throw err;
    }

    return await adminModel.deleteLevel(levelId);
};

// ── Assessment management (admin authoring) — Stage 5c-i ─────
// ADD-ONLY. Validation: marks > 0, passing ≤ total, duration > 0, count ≥ 0.
const VALID_ASSESSMENT_TYPES = ['MCQ', 'CODING'];

const validateAssessmentFields = ({ assessment_title, assessment_type, total_marks, passing_marks, duration_minutes }) => {
    if (!assessment_title || !String(assessment_title).trim()) {
        throw new Error('Assessment title is required');
    }
    if (!VALID_ASSESSMENT_TYPES.includes(assessment_type)) {
        throw new Error('Assessment type must be MCQ or CODING');
    }
    const total = Number(total_marks);
    const passing = Number(passing_marks);
    const duration = Number(duration_minutes);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Total marks must be greater than 0');
    if (!Number.isFinite(passing) || passing <= 0) throw new Error('Passing marks must be greater than 0');
    if (passing > total) throw new Error('Passing marks cannot exceed total marks');
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duration must be greater than 0');
    return { total, passing, duration };
};

export const getAssessmentsForLevel = async (skillId, levelId) => {
    if (!skillId || !levelId) throw new Error('Skill ID and Level ID are required');
    return await adminModel.listAssessmentsForLevel(skillId, levelId);
};

export const createAssessment = async (skillId, levelId, fields) => {
    if (!skillId || !levelId) throw new Error('Skill ID and Level ID are required');
    const { total, passing, duration } = validateAssessmentFields(fields);
    return await adminModel.createAssessment({
        training_skill_id: skillId,
        level_id: levelId,
        assessment_title: String(fields.assessment_title).trim(),
        assessment_type: fields.assessment_type,
        total_marks: total,
        passing_marks: passing,
        duration_minutes: duration,
    });
};

export const updateAssessment = async (assessmentId, fields) => {
    if (!assessmentId) throw new Error('Assessment ID is required');
    const { total, passing, duration } = validateAssessmentFields(fields);
    return await adminModel.updateAssessment(assessmentId, {
        assessment_title: String(fields.assessment_title).trim(),
        assessment_type: fields.assessment_type,
        total_marks: total,
        passing_marks: passing,
        duration_minutes: duration,
    });
};

export const setAssessmentActive = async (assessmentId, isActive) => {
    if (!assessmentId) throw new Error('Assessment ID is required');
    return await adminModel.setAssessmentActive(assessmentId, isActive);
};

export const getMcqTypes = async () => {
    return await adminModel.listMcqTypes();
};

export const getMcqTypeConfig = async (assessmentId) => {
    if (!assessmentId) throw new Error('Assessment ID is required');
    return await adminModel.listMcqTypeConfig(assessmentId);
};

export const upsertMcqTypeConfig = async (assessmentId, mcqTypeId, questionCount) => {
    if (!assessmentId) throw new Error('Assessment ID is required');
    if (!mcqTypeId) throw new Error('MCQ type is required');
    const count = Number(questionCount);
    if (!Number.isInteger(count) || count < 0) throw new Error('Question count must be a whole number ≥ 0');
    await adminModel.upsertMcqTypeConfig(assessmentId, mcqTypeId, count);
    return true;
};

export const deleteMcqTypeConfig = async (configId) => {
    if (!configId) throw new Error('Config ID is required');
    return await adminModel.deleteMcqTypeConfig(configId);
};

// ── MCQ Question Bank (admin authoring) — Stage 5c-ii ────────
// ADD-ONLY. Soft-delete via is_active. Validation: all 4 options non-empty,
// correct_option ∈ {A,B,C,D}, marks > 0, type required.
const VALID_OPTIONS = ['A', 'B', 'C', 'D'];
const VALID_DIFFICULTY = ['EASY', 'MEDIUM', 'HARD'];

const validateQuestionFields = ({ question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks }) => {
    if (!question_text || !String(question_text).trim()) throw new Error('Question text is required');
    const opts = { option_a, option_b, option_c, option_d };
    for (const [k, v] of Object.entries(opts)) {
        if (!v || !String(v).trim()) throw new Error(`Option ${k.slice(-1).toUpperCase()} is required`);
    }
    if (!VALID_OPTIONS.includes(correct_option)) throw new Error('Correct option must be A, B, C or D');
    if (!mcq_type_id) throw new Error('MCQ type is required');
    if (difficulty != null && difficulty !== '' && !VALID_DIFFICULTY.includes(difficulty)) {
        throw new Error('Difficulty must be EASY, MEDIUM or HARD');
    }
    const m = Number(marks);
    if (!Number.isFinite(m) || m <= 0) throw new Error('Marks must be greater than 0');
    return { marks: m };
};

const normQuestion = (fields) => ({
    question_text: String(fields.question_text).trim(),
    option_a: String(fields.option_a).trim(),
    option_b: String(fields.option_b).trim(),
    option_c: String(fields.option_c).trim(),
    option_d: String(fields.option_d).trim(),
    correct_option: fields.correct_option,
    mcq_type_id: fields.mcq_type_id,
    difficulty: fields.difficulty != null && fields.difficulty !== '' ? fields.difficulty : null,
    marks: Number(fields.marks),
});

export const getQuestions = async (assessmentId) => {
    if (!assessmentId) throw new Error('Assessment ID is required');
    return await adminModel.listQuestions(assessmentId);
};

export const createQuestion = async (assessmentId, fields) => {
    if (!assessmentId) throw new Error('Assessment ID is required');
    validateQuestionFields(fields);
    return await adminModel.createQuestion({ assessment_id: assessmentId, ...normQuestion(fields) });
};

export const updateQuestion = async (questionId, fields) => {
    if (!questionId) throw new Error('Question ID is required');
    validateQuestionFields(fields);
    return await adminModel.updateQuestion(questionId, normQuestion(fields));
};

export const setQuestionActive = async (questionId, isActive) => {
    if (!questionId) throw new Error('Question ID is required');
    return await adminModel.setQuestionActive(questionId, isActive);
};

export const getAnswerCountForQuestion = async (questionId) => {
    if (!questionId) throw new Error('Question ID is required');
    return await adminModel.countAnswersForQuestion(questionId);
};

// ── Slot timing edit / open-close ────────────────────────────
export const updateSlotTiming = async (slotId, startTime, endTime, force = false) => {
    if (!slotId) throw new Error('Slot ID is required');
    if (!startTime || !endTime) throw new Error('Start time and End time are required');
    if (String(startTime) >= String(endTime)) {
        throw new Error('End time must be after start time');
    }
    // Editing a slot with existing bookings shifts the assessment window for
    // those bookings — warn (not hard-block) so admins confirm intent.
    if (!force) {
        const bookingCount = await adminModel.countBookingsBySlot(slotId);
        if (bookingCount > 0) {
            const err = new Error(`This slot has ${bookingCount} existing booking(s). Editing its times shifts the assessment window for them. Confirm to proceed.`);
            err.status = 409;
            err.requiresConfirmation = true;
            err.count = bookingCount;
            throw err;
        }
    }
    return await adminModel.updateSlotTiming(slotId, startTime, endTime);
};

export const setSlotActive = async (slotId, isActive) => {
    if (!slotId) throw new Error('Slot ID is required');
    return await adminModel.setSlotActive(slotId, isActive);
};

export const getAllSlotTimings = async () => {
    return await adminModel.listAllSlotTimings();
};

// ── Venue ↔ Skill management ─────────────────────────────────
export const getVenueSkills = async (venueId) => {
    if (!venueId) throw new Error('Venue ID is required');
    return await adminModel.listVenueSkills(venueId);
};

export const addVenueSkill = async (venueId, trainingSkillId) => {
    if (!venueId || !trainingSkillId) throw new Error('Venue ID and Training Skill ID are required');
    await adminModel.addVenueSkill(venueId, trainingSkillId);
    return { success: true };
};

export const removeVenueSkill = async (venueId, trainingSkillId) => {
    if (!venueId || !trainingSkillId) throw new Error('Venue ID and Training Skill ID are required');
    await adminModel.removeVenueSkill(venueId, trainingSkillId);
    return { success: true };
};

// ── Per-venue + per-date slots (venue_slots) — Stage 3a (ADDITIVE) ───────────
export const getVenueSlotsByDate = async (venueId, slotDate = null) => {
    if (!venueId) throw new Error('Venue ID is required');
    const [slots, mappings] = await Promise.all([
        adminModel.listVenueSlots(venueId, slotDate || null),
        adminModel.listMappingsByVenue(venueId),
    ]);
    return { slots, mappings };
};

// Whole-day convenience read for the Slot Scheduling page (READ-ONLY).
export const getAllVenueSlotsByDate = async (slotDate) => {
    if (!slotDate) throw new Error('Date is required');
    const [slots, mappings] = await Promise.all([
        adminModel.listAllVenueSlotsByDate(slotDate),
        adminModel.listAllActiveMappings(),
    ]);
    return { slots, mappings };
};

export const createVenueSlot = async ({ mappingId, slotDate, startTime, endTime }) => {
    if (!mappingId) throw new Error('A faculty mapping is required');
    if (!slotDate) throw new Error('Slot date is required');
    if (!startTime || !endTime) throw new Error('Start time and End time are required');
    if (String(startTime) >= String(endTime)) {
        throw new Error('End time must be after start time');
    }
    const venueSlotId = await adminModel.createVenueSlot({ mappingId, slotDate, startTime, endTime });
    return { venueSlotId };
};

export const updateVenueSlot = async (venueSlotId, { slotDate, startTime, endTime }) => {
    if (!venueSlotId) throw new Error('Venue slot ID is required');
    if (!slotDate) throw new Error('Slot date is required');
    if (!startTime || !endTime) throw new Error('Start time and End time are required');
    if (String(startTime) >= String(endTime)) {
        throw new Error('End time must be after start time');
    }
    return await adminModel.updateVenueSlot(venueSlotId, { slotDate, startTime, endTime });
};

export const setVenueSlotActive = async (venueSlotId, isActive) => {
    if (!venueSlotId) throw new Error('Venue slot ID is required');
    return await adminModel.setVenueSlotActive(venueSlotId, isActive);
};

export const swapFaculty = async (mappingId, newFacultyId, reason) => {
    if (!mappingId || !newFacultyId || !reason) {
        throw new Error('Mapping ID, New Faculty ID, and Reason are required');
    }
    await adminModel.swapFaculty(mappingId, newFacultyId, reason);
};

export const transferIndividualVenue = async (mappingId, toFacultyId, reason) => {
    if (!mappingId || !toFacultyId || !reason) {
        throw new Error('Mapping ID, New Faculty ID, and Reason are required');
    }
    await adminModel.transferIndividualVenue(mappingId, toFacultyId, reason);
};

export const transferAllVenues = async (fromFacultyId, toFacultyId, reason) => {
    if (!fromFacultyId || !toFacultyId || !reason) {
        throw new Error('From Faculty ID, To Faculty ID, and Reason are required');
    }
    await adminModel.transferAllVenues(fromFacultyId, toFacultyId, reason);
};

// ── Attendance ───────────────────────────────────────────────

export const getAttendanceMappings = async () => {
    return await adminModel.listAllMappingsWithVenues();
};

export const getAttendanceStudents = async (mappingId) => {
    if (!mappingId) {
        throw new Error('Mapping ID is required');
    }
    return await adminModel.getStudentsByMappingAdmin(mappingId);
};

export const markAttendance = async (bookingId, status) => {
    if (!bookingId) {
        throw new Error('Booking ID is required');
    }
    if (!status || !['PRESENT', 'ABSENT'].includes(status)) {
        throw new Error('Status must be PRESENT or ABSENT');
    }
    await adminModel.markAttendanceAdmin(bookingId, status);
};

// ── All-Bookings dashboard ───────────────────────────────────

export const getAllBookings = async ({ venueId, date, venueSlotId } = {}) => {
    return await adminModel.listAllBookings({ venueId, date, venueSlotId });
};
