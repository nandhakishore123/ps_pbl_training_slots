import { api } from '../core/apiMethods';

export const superAdminService = {
  // ── Phase 0: foundation ping ────────────────────────────────────────────────
  ping() {
    return api.get('/superadmin/ping');
  },

  // ── Phase 1: Faculty management ─────────────────────────────────────────────
  listFaculty() {
    return api.get('/superadmin/faculty');
  },

  createFaculty(payload) {
    // payload: { name, email, designation, department }
    return api.post('/superadmin/faculty', payload);
  },

  updateFaculty(facultyId, payload) {
    // payload: { name, designation, department }
    return api.patch(`/superadmin/faculty/${facultyId}`, payload);
  },

  revokeFaculty(facultyId) {
    return api.post(`/superadmin/faculty/${facultyId}/revoke`);
  },

  reactivateFaculty(facultyId) {
    return api.post(`/superadmin/faculty/${facultyId}/reactivate`);
  },

  assignFacultyToLab(facultyId, payload) {
    // payload: { venueId, slotId, trainingSkillId }
    return api.post(`/superadmin/faculty/${facultyId}/assign`, payload);
  },

  reassignIndividual(payload) {
    // payload: { mappingId, toFacultyId, reason }
    return api.post('/superadmin/faculty/reassign-individual', payload);
  },

  reassignAll(payload) {
    // payload: { fromFacultyId, toFacultyId, reason }
    return api.post('/superadmin/faculty/reassign-all', payload);
  },

  // ── Lookups for the Assign modal ────────────────────────────────────────────
  getVenues() {
    return api.get('/superadmin/venues');
  },

  getSlotTimings() {
    return api.get('/superadmin/slot-timings');
  },

  getTrainingSkills() {
    return api.get('/superadmin/training-skills');
  },
};
