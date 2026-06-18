import * as adminService from './admin.services.js';
import * as approvalsService from '../approvals/approvals.services.js';
import { successResponse, createdResponse, errorResponse } from '../../utils/response.js';

export const getDashboardKPI = async (req, res, next) => {
    try {
        const data = await adminService.getDashboardKPI();
        return successResponse(res, 'KPIs retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// ── Reports & Analytics (READ-ONLY) — Stage 6b ───────────────

export const getReportsSummary = async (req, res, next) => {
    try {
        const data = await adminService.getReportsSummary();
        return successResponse(res, 'Reports summary retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getReportsBySkill = async (req, res, next) => {
    try {
        const data = await adminService.getReportsBySkill();
        return successResponse(res, 'Reports by skill retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getReportsByCourse = async (req, res, next) => {
    try {
        const data = await adminService.getReportsByCourse();
        return successResponse(res, 'Reports by course retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getReportsTimeline = async (req, res, next) => {
    try {
        const data = await adminService.getReportsTimeline();
        return successResponse(res, 'Reports timeline retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getVenues = async (req, res, next) => {
    try {
        const data = await adminService.getVenues();
        return successResponse(res, 'Venues retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getFaculty = async (req, res, next) => {
    try {
        const data = await adminService.getFaculty();
        return successResponse(res, 'Faculty retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const searchFaculty = async (req, res, next) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        const data = await adminService.searchFaculty(q, Number(page), Number(limit));
        return successResponse(res, 'Faculty search results retrieved', data);
    } catch (error) {
        next(error);
    }
};

export const getStudents = async (req, res, next) => {
    try {
        const data = await adminService.getStudents();
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// ── Student management (admin authoring) — Stage 5d ──────────

export const getAllStudents = async (req, res, next) => {
    try {
        const data = await adminService.getAllStudents();
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createStudent = async (req, res, next) => {
    try {
        const { email, reg_num, name, degree, course, year_of_study } = req.body;
        const data = await adminService.createStudent({ email, reg_num, name, degree, course, year_of_study });
        return successResponse(res, 'Student created successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, reg_num, name, degree, course, year_of_study } = req.body;
        await adminService.updateStudent(id, { email, reg_num, name, degree, course, year_of_study });
        return successResponse(res, 'Student updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setStudentActive = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        await adminService.setStudentActive(id, !!isActive);
        return successResponse(res, `Student ${isActive ? 'activated' : 'deactivated'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

export const getTrainingSkills = async (req, res, next) => {
    try {
        const data = await adminService.getTrainingSkills();
        return successResponse(res, 'Training skills retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getSlotTimings = async (req, res, next) => {
    try {
        const data = await adminService.getSlotTimings();
        return successResponse(res, 'Slot timings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const swapFaculty = async (req, res, next) => {
    try {
        const { mappingId } = req.params;
        const { toFacultyId, reason } = req.body;
        await adminService.swapFaculty(mappingId, toFacultyId, reason);
        return successResponse(res, null, 'Faculty swapped successfully');
    } catch (error) {
        next(error);
    }
};

export const transferIndividualVenue = async (req, res, next) => {
    try {
        const { mappingId, toFacultyId, reason } = req.body;
        await adminService.transferIndividualVenue(mappingId, toFacultyId, reason);
        return successResponse(res, null, 'Venue transferred successfully');
    } catch (error) {
        next(error);
    }
};

export const transferAllVenues = async (req, res, next) => {
    try {
        const { fromFacultyId, toFacultyId, reason } = req.body;
        await adminService.transferAllVenues(fromFacultyId, toFacultyId, reason);
        return successResponse(res, null, 'All venues transferred successfully');
    } catch (error) {
        next(error);
    }
};

export const addSlotTiming = async (req, res, next) => {
    try {
        const { startTime, endTime } = req.body;
        const insertId = await adminService.addSlotTiming(startTime, endTime);
        return successResponse(res, { slotId: insertId }, 'Slot timing added successfully');
    } catch (error) {
        next(error);
    }
};

export const deleteSlotTiming = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        await adminService.deleteSlotTiming(slotId);
        return successResponse(res, null, 'Slot timing deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ── Venue management ─────────────────────────────────────────

export const getAllVenues = async (req, res, next) => {
    try {
        const data = await adminService.getAllVenues();
        return successResponse(res, 'Venues retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createVenue = async (req, res, next) => {
    try {
        const { venueName, location, capacity } = req.body;
        const venueId = await adminService.createVenue({ venueName, location, capacity });
        return successResponse(res, 'Venue created successfully', { venueId });
    } catch (error) {
        next(error);
    }
};

export const updateVenue = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { venueName, location, capacity } = req.body;
        await adminService.updateVenue(venueId, { venueName, location, capacity });
        return successResponse(res, 'Venue updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setVenueActive = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { isActive, force } = req.body;
        await adminService.setVenueActive(venueId, !!isActive, !!force);
        return successResponse(res, `Venue ${isActive ? 'activated' : 'deactivated'} successfully`, null);
    } catch (error) {
        if (error.requiresConfirmation) {
            return res.status(409).json({ success: false, requiresConfirmation: true, count: error.count, message: error.message });
        }
        next(error);
    }
};

// ── Training skill (Course/Lab) management — Stage 5a ─────────

export const getAllTrainingSkills = async (req, res, next) => {
    try {
        const data = await adminService.getAllTrainingSkills();
        return successResponse(res, 'Training skills retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

// READ-ONLY bookable-status per course (Stage 7 diagnostic badge source).
export const getTrainingSkillsStatus = async (req, res, next) => {
    try {
        const data = await adminService.getTrainingSkillsBookableStatus();
        return successResponse(res, 'Training skill bookable status retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getSkillCategories = async (req, res, next) => {
    try {
        const data = await adminService.getSkillCategories();
        return successResponse(res, 'Skill categories retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createTrainingSkill = async (req, res, next) => {
    try {
        const { skill_name, skill_type, category_id, image_url } = req.body;
        const trainingSkillId = await adminService.createTrainingSkill({ skill_name, skill_type, category_id, image_url });
        return successResponse(res, 'Course/Lab created successfully', { trainingSkillId });
    } catch (error) {
        next(error);
    }
};

export const updateTrainingSkill = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { skill_name, skill_type, category_id, image_url } = req.body;
        await adminService.updateTrainingSkill(id, { skill_name, skill_type, category_id, image_url });
        return successResponse(res, 'Course/Lab updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setTrainingSkillActive = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActive, force } = req.body;
        await adminService.setTrainingSkillActive(id, !!isActive, !!force);
        return successResponse(res, `Course/Lab ${isActive ? 'activated' : 'deactivated'} successfully`, null);
    } catch (error) {
        if (error.requiresConfirmation) {
            return res.status(409).json({ success: false, requiresConfirmation: true, count: error.count, message: error.message });
        }
        next(error);
    }
};

// ── Skill level (Course/Lab level) management — Stage 5b ─────
// Listing reuses getSkillLevels above (GET /admin/training-skills/:skillId/levels).

export const createLevel = async (req, res, next) => {
    try {
        const { skillId } = req.params;
        const { level_name, core_concept, max_attempts } = req.body;
        const levelId = await adminService.createLevel(skillId, { level_name, core_concept, max_attempts });
        return successResponse(res, 'Level created successfully', { levelId });
    } catch (error) {
        next(error);
    }
};

export const updateLevel = async (req, res, next) => {
    try {
        const { levelId } = req.params;
        const { level_name, core_concept, max_attempts } = req.body;
        await adminService.updateLevel(levelId, { level_name, core_concept, max_attempts });
        return successResponse(res, 'Level updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const deleteLevel = async (req, res, next) => {
    try {
        const { levelId } = req.params;
        await adminService.deleteLevelGuarded(levelId);
        return successResponse(res, 'Level deleted successfully', null);
    } catch (error) {
        // Guard rejections carry status 409 + a human message; the global error
        // handler surfaces both so the client can toast the reason.
        next(error);
    }
};

// ── Points per level (skill_points) — admin DISPLAY config ───
// DISPLAY-ONLY: configures the fixed points students SEE per level. No awarding.

export const getSkillPointsForLevel = async (req, res, next) => {
    try {
        const { skillId, levelId } = req.params;
        const data = await adminService.getSkillPointsForLevel(skillId, levelId);
        return successResponse(res, 'Level points retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const setSkillPointsForLevel = async (req, res, next) => {
    try {
        const { skillId, levelId } = req.params;
        const { point_type, points_alloted } = req.body;
        await adminService.setSkillPointsForLevel(skillId, levelId, { point_type, points_alloted });
        return successResponse(res, 'Level points saved successfully', null);
    } catch (error) {
        next(error);
    }
};

// ── Assessment management (admin authoring) — Stage 5c-i ─────

export const getAssessmentsForLevel = async (req, res, next) => {
    try {
        const { skillId, levelId } = req.params;
        const data = await adminService.getAssessmentsForLevel(skillId, levelId);
        return successResponse(res, 'Assessments retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createAssessment = async (req, res, next) => {
    try {
        const { skillId, levelId } = req.params;
        const { assessment_title, assessment_type, total_marks, passing_marks, duration_minutes } = req.body;
        const assessmentId = await adminService.createAssessment(skillId, levelId, {
            assessment_title, assessment_type, total_marks, passing_marks, duration_minutes,
        });
        return successResponse(res, 'Assessment created successfully', { assessmentId });
    } catch (error) {
        next(error);
    }
};

export const updateAssessment = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { assessment_title, assessment_type, total_marks, passing_marks, duration_minutes } = req.body;
        await adminService.updateAssessment(assessmentId, {
            assessment_title, assessment_type, total_marks, passing_marks, duration_minutes,
        });
        return successResponse(res, 'Assessment updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setAssessmentActive = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { isActive } = req.body;
        await adminService.setAssessmentActive(assessmentId, !!isActive);
        return successResponse(res, `Assessment ${isActive ? 'activated' : 'deactivated'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

export const getMcqTypes = async (req, res, next) => {
    try {
        const data = await adminService.getMcqTypes();
        return successResponse(res, 'MCQ types retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getMcqTypeConfig = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const data = await adminService.getMcqTypeConfig(assessmentId);
        return successResponse(res, 'MCQ type config retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const upsertMcqTypeConfig = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { mcqTypeId, questionCount } = req.body;
        await adminService.upsertMcqTypeConfig(assessmentId, mcqTypeId, questionCount);
        return successResponse(res, 'MCQ type config saved successfully', null);
    } catch (error) {
        next(error);
    }
};

export const deleteMcqTypeConfig = async (req, res, next) => {
    try {
        const { configId } = req.params;
        await adminService.deleteMcqTypeConfig(configId);
        return successResponse(res, 'MCQ type config removed successfully', null);
    } catch (error) {
        next(error);
    }
};

// ── MCQ Question Bank (admin authoring) — Stage 5c-ii ────────

export const getQuestions = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const data = await adminService.getQuestions(assessmentId);
        return successResponse(res, 'Questions retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createQuestion = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks } = req.body;
        const questionId = await adminService.createQuestion(assessmentId, {
            question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks,
        });
        return successResponse(res, 'Question created successfully', { questionId });
    } catch (error) {
        next(error);
    }
};

export const updateQuestion = async (req, res, next) => {
    try {
        const { questionId } = req.params;
        const { question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks } = req.body;
        await adminService.updateQuestion(questionId, {
            question_text, option_a, option_b, option_c, option_d, correct_option, mcq_type_id, difficulty, marks,
        });
        return successResponse(res, 'Question updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setQuestionActive = async (req, res, next) => {
    try {
        const { questionId } = req.params;
        const { isActive } = req.body;
        await adminService.setQuestionActive(questionId, !!isActive);
        return successResponse(res, `Question ${isActive ? 'restored' : 'retired'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

// ── Slot timing edit / open-close ────────────────────────────

export const getAllSlotTimings = async (req, res, next) => {
    try {
        const data = await adminService.getAllSlotTimings();
        return successResponse(res, 'Slot timings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateSlotTiming = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { startTime, endTime, force } = req.body;
        await adminService.updateSlotTiming(slotId, startTime, endTime, !!force);
        return successResponse(res, 'Slot timing updated successfully', null);
    } catch (error) {
        if (error.requiresConfirmation) {
            return res.status(409).json({ success: false, requiresConfirmation: true, count: error.count, message: error.message });
        }
        next(error);
    }
};

export const setSlotActive = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { isActive } = req.body;
        await adminService.setSlotActive(slotId, !!isActive);
        return successResponse(res, `Slot ${isActive ? 'opened' : 'closed'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

// ── Venue ↔ Skill management ─────────────────────────────────

export const getVenueSkills = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const data = await adminService.getVenueSkills(venueId);
        return successResponse(res, 'Venue skills retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const addVenueSkill = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { trainingSkillId } = req.body;
        await adminService.addVenueSkill(venueId, trainingSkillId);
        return successResponse(res, 'Skill linked to venue successfully', null);
    } catch (error) {
        next(error);
    }
};

export const removeVenueSkill = async (req, res, next) => {
    try {
        const { venueId, trainingSkillId } = req.params;
        await adminService.removeVenueSkill(venueId, trainingSkillId);
        return successResponse(res, 'Skill removed from venue successfully', null);
    } catch (error) {
        next(error);
    }
};

// ── Per-venue + per-date slots (venue_slots) — Stage 3a (ADDITIVE) ───────────

export const getVenueSlotsByDate = async (req, res, next) => {
    try {
        const { venueId } = req.params;
        const { date } = req.query;
        const data = await adminService.getVenueSlotsByDate(venueId, date || null);
        return successResponse(res, 'Venue slots retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getAllVenueSlotsByDate = async (req, res, next) => {
    try {
        const { date } = req.query;
        const data = await adminService.getAllVenueSlotsByDate(date);
        return successResponse(res, 'Slots for date retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createVenueSlot = async (req, res, next) => {
    try {
        const { mappingId, slotDate, startTime, endTime } = req.body;
        const data = await adminService.createVenueSlot({ mappingId, slotDate, startTime, endTime });
        return successResponse(res, 'Venue slot created successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateVenueSlot = async (req, res, next) => {
    try {
        const { venueSlotId } = req.params;
        const { slotDate, startTime, endTime } = req.body;
        await adminService.updateVenueSlot(venueSlotId, { slotDate, startTime, endTime });
        return successResponse(res, 'Venue slot updated successfully', null);
    } catch (error) {
        next(error);
    }
};

export const setVenueSlotActive = async (req, res, next) => {
    try {
        const { venueSlotId } = req.params;
        const { isActive } = req.body;
        await adminService.setVenueSlotActive(venueSlotId, !!isActive);
        return successResponse(res, `Venue slot ${isActive ? 'opened' : 'closed'} successfully`, null);
    } catch (error) {
        next(error);
    }
};

// ── Booking-open time config ─────────────────────────────────

export const getBookingWindowConfig = async (req, res, next) => {
    try {
        const data = await adminService.getBookingWindowConfig();
        return successResponse(res, 'Booking window config retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const updateBookingWindowConfig = async (req, res, next) => {
    try {
        const { openHour, openMinute } = req.body;
        const data = await adminService.updateBookingWindowConfig(openHour, openMinute);
        return successResponse(res, 'Booking open time updated successfully', data);
    } catch (error) {
        next(error);
    }
};

// ── Attendance ───────────────────────────────────────────────

export const getAttendanceMappings = async (req, res, next) => {
    try {
        const data = await adminService.getAttendanceMappings();
        return successResponse(res, 'Attendance mappings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getAttendanceStudents = async (req, res, next) => {
    try {
        const { mappingId } = req.params;
        const data = await adminService.getAttendanceStudents(mappingId);
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getAttendanceStudentsByVenueSlot = async (req, res, next) => {
    try {
        const { venueSlotId } = req.params;
        const data = await adminService.getAttendanceStudentsByVenueSlot(venueSlotId);
        return successResponse(res, 'Students retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const markAttendance = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const status = (req.body.status || '').toUpperCase();
        if (status !== 'PRESENT' && status !== 'ABSENT') {
            return errorResponse(res, 'Status must be PRESENT or ABSENT', 400);
        }
        await adminService.markAttendance(bookingId, status);
        return successResponse(res, `Attendance marked as ${status}`, null);
    } catch (error) {
        if (error.message?.includes('not found')) {
            return errorResponse(res, error.message, 404);
        }
        next(error);
    }
};

// ── All-Bookings dashboard ───────────────────────────────────

export const getAllBookings = async (req, res, next) => {
    try {
        const { venueId, date, venueSlotId } = req.query;
        const data = await adminService.getAllBookings({ venueId, date, venueSlotId });
        return successResponse(res, 'Bookings retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const data = await adminService.cancelBooking(bookingId);
        return successResponse(res, 'Booking cancelled successfully', data);
    } catch (error) {
        next(error);
    }
};

// ── Result override + admin malpractice — Stage 6c ───────────
// All guard rejections carry err.status (409/400/404); the global error handler
// surfaces status + message so the client can toast the reason.

export const overrideResult = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { newStatus, newScore } = req.body;
        const data = await adminService.overrideAssessmentResult({ bookingId, newStatus, newScore });
        return successResponse(res, 'Result overridden successfully', data);
    } catch (error) {
        next(error);
    }
};

export const markMalpractice = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body || {};
        const data = await adminService.adminMarkMalpractice(bookingId, reason);
        return successResponse(res, 'Malpractice flagged successfully', data);
    } catch (error) {
        next(error);
    }
};

export const revokeMalpractice = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const data = await adminService.adminRevokeMalpractice(bookingId);
        return successResponse(res, 'Malpractice flag revoked successfully', data);
    } catch (error) {
        next(error);
    }
};

export const bookForStudent = async (req, res, next) => {
    try {
        const { studentId, venueSlotId, trainingSkillId, levelId } = req.body;
        const data = await adminService.adminBookForStudent({ studentId, venueSlotId, trainingSkillId, levelId });
        return createdResponse(res, 'Booking created successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getSkillLevels = async (req, res, next) => {
    try {
        const { skillId } = req.params;
        const data = await adminService.getSkillLevels(skillId);
        return successResponse(res, 'Skill levels retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const bulkBook = async (req, res, next) => {
    try {
        const { studentIds, venueSlotId, trainingSkillId, levelId } = req.body;
        const data = await adminService.adminBulkBook({ studentIds, venueSlotId, trainingSkillId, levelId });
        return successResponse(res, 'Bulk booking processed', data);
    } catch (error) {
        next(error);
    }
};

// ── Lab Record approvals (admin path — no ownership) — Stage 6a-i ────
// Shared approvals service; admin path passes facultyId = null (open).

export const getLabRecordApprovals = async (req, res, next) => {
    try {
        const { status } = req.query;
        const data = await approvalsService.getLabRecords({ status, facultyId: null });
        return successResponse(res, 'Lab records retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getLabRecordApprovalDetail = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const data = await approvalsService.getLabRecordDetail(bookingId, { facultyId: null });
        return successResponse(res, 'Lab record detail retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};

export const approveLabRecord = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const approverUserId = req.user?.user_id || req.user?.userId;
        const data = await approvalsService.approveLabRecord(bookingId, approverUserId, { facultyId: null });
        return successResponse(res, 'Lab record approved', data);
    } catch (error) {
        next(error);
    }
};

export const rejectLabRecord = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body || {};
        const approverUserId = req.user?.user_id || req.user?.userId;
        const data = await approvalsService.rejectLabRecord(bookingId, approverUserId, { facultyId: null, reason });
        return successResponse(res, 'Lab record rejected', data);
    } catch (error) {
        next(error);
    }
};
