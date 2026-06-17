import { api } from '../core/apiMethods';

export const facultyService = {
  /** Get KPI stats for the logged-in faculty's dashboard */
  getDashboardKPI() {
    return api.get('/faculty/dashboard-kpi');
  },

  /** Get all venue-mappings assigned to the logged-in faculty (legacy) */
  getMyVenues() {
    return api.get('/faculty/my-venues');
  },

  /** Get the logged-in faculty's per-date venue_slots (admin-scheduled) */
  getMyVenueSlots() {
    return api.get('/faculty/my-venue-slots');
  },

  /** Get students booked under a specific mapping_id (legacy) */
  getStudentsByMapping(mappingId) {
    return api.get(`/faculty/mappings/${mappingId}/students`);
  },

  /** Get the per-date roster for a specific venue_slot_id */
  getStudentsByVenueSlot(venueSlotId) {
    return api.get(`/faculty/venue-slots/${venueSlotId}/students`);
  },

  /** Mark a single student's attendance as PRESENT or ABSENT */
  markAttendance(bookingId, status = 'PRESENT') {
    return api.post(`/faculty/bookings/${bookingId}/attendance`, { status });
  },

  /** Mark ALL ongoing students in a venue_slot as PRESENT */
  markAllAttendance(venueSlotId) {
    return api.post(`/faculty/venue-slots/${venueSlotId}/attendance/all`);
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

  // ── Lab Record approvals (faculty path — ownership-gated) — Stage 6a-i ──
  getLabRecordApprovals(status = 'pending') {
    return api.get('/faculty/approvals/lab-records', { params: { status } });
  },

  getLabRecordApprovalDetail(bookingId) {
    return api.get(`/faculty/approvals/lab-records/${bookingId}`);
  },

  approveLabRecord(bookingId) {
    return api.post(`/faculty/approvals/lab-records/${bookingId}/approve`);
  },

  rejectLabRecord(bookingId, reason) {
    return api.post(`/faculty/approvals/lab-records/${bookingId}/reject`, { reason });
  },
};
