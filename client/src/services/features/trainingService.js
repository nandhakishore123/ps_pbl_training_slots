import { api } from '../core/apiMethods';

export const trainingService = {
  // ── Announcements (student-facing) ──────────────────────────
  getStudentAnnouncements() {
    return api.get('/student-announcements');
  },

  markAnnouncementSeen(id) {
    return api.post(`/student-announcements/${id}/seen`);
  },

  markAnnouncementRead(id) {
    return api.post(`/student-announcements/${id}/read`);
  },

  getCategories() {
    return api.get('/training/categories');
  },

  getSkills({ type, categoryId, search, limit, offset, all } = {}) {
    const params = { type, categoryId, search };
    if (all != null) params.all = all;
    if (limit != null) params.limit = limit;
    if (offset != null) params.offset = offset;
    return api.get('/training/skills', { params });
  },

  getSkillDetails(trainingSkillId) {
    return api.get(`/training/skills/${trainingSkillId}/details`);
  },

  getSkillSlots(trainingSkillId) {
    return api.get(`/training/skills/${trainingSkillId}/slots`);
  },

  getBookings() {
    return api.get('/training/bookings');
  },

  bookSlot({ trainingSkillId, venueSlotId, levelId }) {
    return api.post('/training/bookings', { trainingSkillId, venueSlotId, levelId });
  },

  // ── Assessment ──────────────────────────────────────────────────────────────

  getAssessment(trainingSkillId, levelId) {
    return api.get(`/training/skills/${trainingSkillId}/levels/${levelId}/assessment`);
  },

  startAssessment({ assessmentId, totalMarks }) {
    return api.post('/training/assessments/start', { assessmentId, totalMarks });
  },

  submitAssessment(studentAssessmentId, { answers, passingMarks }) {
    return api.post(`/training/assessments/${studentAssessmentId}/submit`, { answers, passingMarks });
  },

  reportMalpractice(bookingId, { studentAssessmentId } = {}) {
    return api.post(`/training/bookings/${bookingId}/malpractice`, { studentAssessmentId });
  },

  getLabRecordQuestions() {
    return api.get('/training/lab-records/questions');
  },

  submitLabRecord(bookingId, responses) {
    return api.post(`/training/bookings/${bookingId}/lab-record`, { responses });
  },

  getLabRecord(bookingId) {
    return api.get(`/training/bookings/${bookingId}/lab-record`);
  },
};

