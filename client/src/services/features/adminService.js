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

  swapFaculty(mappingId, toFacultyId, reason) {
    return api.post(`/admin/venues/${mappingId}/swap-faculty`, { toFacultyId, reason });
  },

  addVenueToFaculty(facultyId, venueId, skillType, slotId) {
    return api.post(`/admin/faculty/${facultyId}/add-venue`, { venueId, skillType, slotId });
  },

  transferIndividualVenue(mappingId, toFacultyId, reason) {
    return api.post('/admin/faculty/transfer-individual', { mappingId, toFacultyId, reason });
  },

  transferAllVenues(fromFacultyId, toFacultyId, reason) {
    return api.post('/admin/faculty/transfer-all', { fromFacultyId, toFacultyId, reason });
  }
};
