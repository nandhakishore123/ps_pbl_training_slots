import { api } from '../core/apiMethods';

export const facultyService = {
  /** Get KPI stats for the logged-in faculty's dashboard */
  getDashboardKPI() {
    return api.get('/faculty/dashboard-kpi');
  },

  /** Get all venue-mappings assigned to the logged-in faculty */
  getMyVenues() {
    return api.get('/faculty/my-venues');
  },

  /** Get students booked under a specific mapping_id */
  getStudentsByMapping(mappingId) {
    return api.get(`/faculty/mappings/${mappingId}/students`);
  },

  /** Mark a single student's attendance as PRESENT */
  markAttendance(bookingId) {
    return api.post(`/faculty/bookings/${bookingId}/attendance`);
  },

  /** Mark ALL ongoing students in a mapping as PRESENT */
  markAllAttendance(mappingId) {
    return api.post(`/faculty/mappings/${mappingId}/attendance/all`);
  },

  /** Flag a student booking as MALPRACTICE with a reason */
  markMalpractice(bookingId, reason) {
    return api.post(`/faculty/bookings/${bookingId}/malpractice`, { reason });
  },

  /** Revoke a MALPRACTICE flag → reset to ONGOING */
  revokeMalpractice(bookingId) {
    return api.post(`/faculty/bookings/${bookingId}/revoke-malpractice`);
  },

  /** Get the logged-in faculty's transfer requests */
  getMyTransferRequests() {
    return api.get('/faculty/transfer-requests');
  },

  /** Create a new transfer request */
  createTransferRequest(mappingId, toFacultyId, reason, targetVenueId, targetSlotId, transferDate) {
    return api.post('/faculty/transfer-requests', { mappingId, toFacultyId, reason, targetVenueId, targetSlotId, transferDate });
  },

  /** Get all active venue allocations (venues, slots, mappings) */
  getAllVenueAllocations() {
    return api.get('/faculty/all-venue-allocations');
  },

  /** Get review details for MCQ assessment and end survey */
  getStudentReviewData(bookingId) {
    return api.get(`/faculty/bookings/${bookingId}/review`);
  },

  /** Mark the student's lab record (end survey) as verified by the in-charge faculty */
  verifyInchargeLabRecord(bookingId) {
    return api.patch(`/faculty/bookings/${bookingId}/verify-incharge`);
  },
};
