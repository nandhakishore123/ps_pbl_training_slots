import { api } from '../core/apiMethods';

export const adminService = {
  getDashboardKPI() {
    return api.get('/admin/dashboard-kpi');
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
  }
};
