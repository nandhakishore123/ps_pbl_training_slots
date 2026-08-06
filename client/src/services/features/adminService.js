import { api } from '../core/apiMethods';
import { apiClient } from '../core/apiClient';

export const adminService = {
  getDashboardKPI() {
    return api.get('/admin/dashboard-kpi');
  },

  // ── Reports & Analytics (admin-only, read-only) — Stage 6b ──
  getReportsSummary() {
    return api.get('/admin/reports/summary');
  },

  getReportsBySkill() {
    return api.get('/admin/reports/by-skill');
  },

  getReportsByCourse() {
    return api.get('/admin/reports/by-course');
  },

  getReportsTimeline() {
    return api.get('/admin/reports/timeline');
  },

  getVenues() {
    return api.get('/admin/venues');
  },

  getFaculty() {
    return api.get('/admin/faculty');
  },

  searchFaculty(query = '', page = 1, limit = 20) {
    return api.get('/admin/faculty/search', { params: { q: query, page, limit } });
  },

  getStudents() {
    return api.get('/admin/students');
  },

  // ── Student management (admin-only) — Stage 5d ──────────────
  getAllStudents() {
    return api.get('/admin/students/all');
  },

  createStudent(payload) {
    // payload: { email, reg_num, name, degree, course, year_of_study }
    return api.post('/admin/students', payload);
  },

  updateStudent(id, payload) {
    // payload: { email, reg_num, name, degree, course, year_of_study }
    return api.put(`/admin/students/${id}`, payload);
  },

  setStudentActive(id, isActive) {
    return api.patch(`/admin/students/${id}/active`, { isActive });
  },

  getTrainingSkills() {
    return api.get('/admin/training-skills');
  },

  getSlotTimings() {
    return api.get('/admin/slot-timings');
  },

  addSlotTiming(startTime, endTime) {
    return api.post('/admin/slot-timings', { startTime, endTime });
  },

  deleteSlotTiming(slotId) {
    return api.delete(`/admin/slot-timings/${slotId}`);
  },

  // ── Slot timing edit / open-close (admin-only) ──────────────
  getAllSlotTimings() {
    return api.get('/admin/slot-timings/all');
  },

  updateSlotTiming(slotId, startTime, endTime, force = false) {
    return api.put(`/admin/slot-timings/${slotId}`, { startTime, endTime, force });
  },

  setSlotActive(slotId, isActive) {
    return api.patch(`/admin/slot-timings/${slotId}/active`, { isActive });
  },

  // ── Venue management (admin-only) ───────────────────────────
  getAllVenues() {
    return api.get('/admin/venues/all');
  },

  createVenue(payload) {
    // payload: { venueName, location, capacity }
    return api.post('/admin/venues', payload);
  },

  updateVenue(venueId, payload) {
    // payload: { venueName, location, capacity }
    return api.put(`/admin/venues/${venueId}`, payload);
  },

  setVenueActive(venueId, isActive, force = false) {
    return api.patch(`/admin/venues/${venueId}/active`, { isActive, force });
  },

  // ── Training skill (Course/Lab) management (admin-only) — Stage 5a ─
  getAllTrainingSkills() {
    return api.get('/admin/training-skills/all');
  },

  getSkillCategories() {
    return api.get('/admin/skill-categories');
  },

  // READ-ONLY bookable-status per course (Stage 7 diagnostic badge)
  getTrainingSkillsStatus() {
    return api.get('/admin/training-skills/status');
  },

  createTrainingSkill(payload) {
    // payload: { skill_name, skill_type, category_id, image_url }
    return api.post('/admin/training-skills', payload);
  },

  updateTrainingSkill(id, payload) {
    // payload: { skill_name, skill_type, category_id, image_url }
    return api.put(`/admin/training-skills/${id}`, payload);
  },

  setTrainingSkillActive(id, isActive, force = false) {
    return api.patch(`/admin/training-skills/${id}/active`, { isActive, force });
  },

  // ── Skill level management (admin-only) — Stage 5b ──────────
  getLevels(skillId) {
    return api.get(`/admin/training-skills/${skillId}/levels`);
  },

  createLevel(skillId, payload) {
    // payload: { level_name, core_concept, max_attempts }
    return api.post(`/admin/training-skills/${skillId}/levels`, payload);
  },

  updateLevel(levelId, payload) {
    // payload: { level_name, core_concept, max_attempts }
    return api.put(`/admin/levels/${levelId}`, payload);
  },

  deleteLevel(levelId) {
    return api.delete(`/admin/levels/${levelId}`);
  },

  // ── Points per level (skill_points) — DISPLAY config (no awarding) ──
  getSkillPoints(skillId, levelId) {
    return api.get(`/admin/training-skills/${skillId}/levels/${levelId}/points`);
  },

  setSkillPoints(skillId, levelId, pointType, pointsAlloted) {
    return api.put(`/admin/training-skills/${skillId}/levels/${levelId}/points`, {
      point_type: pointType,
      points_alloted: pointsAlloted,
    });
  },

  // ── Assessment management (admin-only) — Stage 5c-i ─────────
  getAssessments(skillId, levelId) {
    return api.get(`/admin/training-skills/${skillId}/levels/${levelId}/assessments`);
  },

  createAssessment(skillId, levelId, payload) {
    // payload: { assessment_title, assessment_type, total_marks, passing_marks, duration_minutes }
    return api.post(`/admin/training-skills/${skillId}/levels/${levelId}/assessments`, payload);
  },

  updateAssessment(assessmentId, payload) {
    return api.put(`/admin/assessments/${assessmentId}`, payload);
  },

  setAssessmentActive(assessmentId, isActive) {
    return api.patch(`/admin/assessments/${assessmentId}/active`, { isActive });
  },

  getMcqTypes() {
    return api.get('/admin/mcq-types');
  },

  getMcqTypeConfig(assessmentId) {
    return api.get(`/admin/assessments/${assessmentId}/mcq-config`);
  },

  upsertMcqTypeConfig(assessmentId, mcqTypeId, questionCount) {
    return api.put(`/admin/assessments/${assessmentId}/mcq-config`, { mcqTypeId, questionCount });
  },

  deleteMcqTypeConfig(configId) {
    return api.delete(`/admin/mcq-config/${configId}`);
  },

  // ── MCQ Question Bank (admin-only) — Stage 5c-ii ────────────
  getQuestions(assessmentId) {
    return api.get(`/admin/assessments/${assessmentId}/questions`);
  },

  createQuestion(assessmentId, payload) {
    // payload: { question_text, option_a..d, correct_option, mcq_type_id, difficulty, marks }
    return api.post(`/admin/assessments/${assessmentId}/questions`, payload);
  },

  updateQuestion(questionId, payload) {
    return api.put(`/admin/questions/${questionId}`, payload);
  },

  setQuestionActive(questionId, isActive) {
    return api.patch(`/admin/questions/${questionId}/active`, { isActive });
  },

  // ── Venue ↔ Skill management (admin-only) ───────────────────
  getVenueSkills(venueId) {
    return api.get(`/admin/venues/${venueId}/skills`);
  },

  addVenueSkill(venueId, trainingSkillId) {
    return api.post(`/admin/venues/${venueId}/skills`, { trainingSkillId });
  },

  removeVenueSkill(venueId, trainingSkillId) {
    return api.delete(`/admin/venues/${venueId}/skills/${trainingSkillId}`);
  },

  // ── Per-venue + per-date slots (admin-only, Stage 3a) ───────
  getVenueSlotsByDate(venueId, slotDate = null) {
    return api.get(`/admin/venues/${venueId}/slots-by-date`, { params: slotDate ? { date: slotDate } : {} });
  },

  // Whole-day convenience read for the Slot Scheduling page (READ-ONLY).
  getAllVenueSlotsByDate(slotDate) {
    return api.get('/admin/slots-by-date', { params: { date: slotDate } });
  },

  createVenueSlot(venueId, payload) {
    // payload: { mappingId, slotDate, startTime, endTime }
    return api.post(`/admin/venues/${venueId}/slots-by-date`, payload);
  },

  updateVenueSlot(venueSlotId, payload) {
    // payload: { slotDate, startTime, endTime }
    return api.put(`/admin/venue-slots/${venueSlotId}`, payload);
  },

  setVenueSlotActive(venueSlotId, isActive) {
    return api.patch(`/admin/venue-slots/${venueSlotId}/active`, { isActive });
  },

  swapFaculty(mappingId, toFacultyId, reason) {
    return api.post(`/admin/venues/${mappingId}/swap-faculty`, { toFacultyId, reason });
  },

  transferIndividualVenue(mappingId, toFacultyId, reason) {
    return api.post('/admin/faculty/transfer-individual', { mappingId, toFacultyId, reason });
  },

  transferAllVenues(fromFacultyId, toFacultyId, reason) {
    return api.post('/admin/faculty/transfer-all', { fromFacultyId, toFacultyId, reason });
  },

  // ── Attendance ───────────────────────────────────────────────

  getAttendanceMappings() {
    return api.get('/admin/attendance/mappings');
  },

  getAttendanceStudents(mappingId) {
    return api.get(`/admin/attendance/mappings/${mappingId}/students`);
  },

  // Roster for a per-date venue_slot (venue_slots model). Slot list reuses getAllVenueSlotsByDate.
  getAttendanceStudentsByVenueSlot(venueSlotId) {
    return api.get(`/admin/attendance/venue-slots/${venueSlotId}/students`);
  },

  markAttendance(bookingId, status) {
    return api.post(`/admin/attendance/bookings/${bookingId}`, { status });
  },

  // ── Booking-open time config (admin-only) ───────────────────
  getBookingWindowConfig() {
    return api.get('/admin/config/booking-window');
  },

  updateBookingWindowConfig(openHour, openMinute) {
    return api.put('/admin/config/booking-window', { openHour, openMinute });
  },

  // ── All Bookings dashboard ───────────────────────────────────
  getAllBookings(params = {}) {
    return api.get('/admin/bookings', { params });
  },

  // ── Admin cancel a booking (Stage 4a) ────────────────────────
  cancelBooking(bookingId) {
    return api.delete(`/admin/bookings/${bookingId}`);
  },

  // ── Admin book a slot for a student (Stage 4b) ───────────────
  bookForStudent(payload) {
    // payload: { studentId, venueSlotId, trainingSkillId, levelId }
    return api.post('/admin/bookings', payload);
  },

  bulkBook(payload) {
    // payload: { studentIds: [...], venueSlotId, trainingSkillId, levelId }
    return api.post('/admin/bookings/bulk', payload);
  },

  getSkillLevels(skillId) {
    return api.get(`/admin/skills/${skillId}/levels`);
  },

  // ── Result override + admin malpractice (Stage 6c) ───────────
  overrideResult(bookingId, payload) {
    // payload: { newStatus: 'PASSED'|'FAILED', newScore }
    return api.patch(`/admin/bookings/${bookingId}/result`, payload);
  },

  markMalpractice(bookingId, reason) {
    return api.post(`/admin/bookings/${bookingId}/malpractice`, { reason });
  },

  revokeMalpractice(bookingId) {
    return api.post(`/admin/bookings/${bookingId}/revoke-malpractice`);
  },

  // ── Lab Record approvals (admin path) — Stage 6a-i ───────────
  getLabRecordApprovals(status = 'pending') {
    return api.get('/admin/approvals/lab-records', { params: { status } });
  },

  getLabRecordApprovalDetail(bookingId) {
    return api.get(`/admin/approvals/lab-records/${bookingId}`);
  },

  approveLabRecord(bookingId) {
    return api.post(`/admin/approvals/lab-records/${bookingId}/approve`);
  },

  rejectLabRecord(bookingId, reason) {
    return api.post(`/admin/approvals/lab-records/${bookingId}/reject`, { reason });
  },

  // ── Activity Points (drill-down + pass/fail confirmation; no awarding) ──
  getActivityPointsCourses() {
    return api.get('/admin/activity-points/courses');
  },

  getActivityPointsSlots(skillId) {
    return api.get(`/admin/activity-points/courses/${skillId}/slots`);
  },

  getActivityPointsSlotStudents(venueSlotId) {
    return api.get(`/admin/activity-points/slots/${venueSlotId}/students`);
  },

  approveActivityPoint(bookingId) {
    return api.post(`/admin/activity-points/bookings/${bookingId}/approve`);
  },

  disapproveActivityPoint(bookingId) {
    return api.post(`/admin/activity-points/bookings/${bookingId}/disapprove`);
  },

  // CSV export (admin only) — returns a Blob response for file download.
  exportActivityPointsCsv(venueSlotId) {
    return apiClient.get(`/admin/activity-points/slots/${venueSlotId}/export`, { responseType: 'blob' });
  },

  // ── Announcements (admin-authored broadcasts to students) ───
  getAnnouncements() {
    return api.get('/announcements');
  },

  createAnnouncement(payload) {
    // payload: { title, body, target_course (null=all), target_year (null=all) }
    return api.post('/announcements', payload);
  },

  setAnnouncementActive(id, isActive) {
    return api.patch(`/announcements/${id}`, { isActive });
  },

  deleteAnnouncement(id) {
    // soft-delete (is_active=0) — vanishes from students instantly
    return api.delete(`/announcements/${id}`);
  },

  // ── Student Feedback (admin view + verify) ──────────────────
  getFeedback() {
    return api.get('/feedback');
  },

  setFeedbackVerified(id, isVerified) {
    return api.patch(`/feedback/${id}`, { isVerified });
  },

  // ── Surveys (admin-authored, targeted by dept/year) ─────────
  getSurveys() {
    return api.get('/survey');
  },

  createSurvey(payload) {
    // payload: { title, description, target_course (null=all), target_year (null=all),
    //            questions: [ { question_text, question_type 'single'|'multi', options: [text,...] } ] }
    return api.post('/survey', payload);
  },

  getSurveyDetail(id) {
    return api.get(`/survey/${id}`);
  },

  getSurveyResponses(id) {
    return api.get(`/survey/${id}/responses`);
  },

  // CSV export (admin only) — returns a Blob response for file download.
  exportSurveyResponsesCsv(id) {
    return apiClient.get(`/survey/${id}/responses/export`, { responseType: 'blob' });
  },

  setSurveyStatus(id, status) {
    // status: 'active' | 'closed'
    return api.patch(`/survey/${id}/status`, { status });
  },

  deleteSurvey(id) {
    return api.delete(`/survey/${id}`);
  },

  // ═══ USER MANAGEMENT (non-student roles 2,3,4,5) — REMOVABLE BLOCK (start) ═══
  // Admin-only. Students (role 1) are handled by the student endpoints above.
  getManageUsers() {
    return api.get('/admin/manage-users');
  },

  // payload: { email, name, role_id }  — role_id must be 2, 3, 4 or 5
  createManageUser(payload) {
    return api.post('/admin/manage-users', payload);
  },

  // The backend also blocks an admin changing their own role.
  switchUserRole(userId, roleId) {
    return api.put(`/admin/manage-users/${userId}/role`, { role_id: roleId });
  },

  // The backend also blocks an admin deactivating themselves.
  setUserActive(userId, isActive) {
    return api.put(`/admin/manage-users/${userId}/active`, { is_active: isActive ? 1 : 0 });
  },

  setUserName(userId, name) {
    return api.put(`/admin/manage-users/${userId}/name`, { name });
  },

  // ROLE-5 SUB-TYPE (removable): label-only member kind. Role 5 only — the
  // backend rejects any other role with a 400. The body key is member_subtype
  // to match the controller; subtype must be FACULTY | INTERN | TECHNICIAN.
  setUserSubtype(userId, subtype) {
    return api.put(`/admin/manage-users/${userId}/subtype`, { member_subtype: subtype });
  },
  // ═══ USER MANAGEMENT — REMOVABLE BLOCK (end) ═══
};
