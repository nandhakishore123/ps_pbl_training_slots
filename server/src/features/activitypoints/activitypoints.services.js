import * as apModel from './activitypoints.model.js';

// ── Activity-Points service — drill-down + pass/fail confirmation ────────────
// "Approve/disapprove" sets a per-booking confirmation flag for the points
// export handoff. NO points are awarded (no points / point_transactions writes).
// Admin path: no ownership gate, may confirm BOTH passed and failed students.
// Faculty path: ownership-gated to their venue slots AND may only confirm
// students who PASSED the assessment.

const VALID_STATUSES = ['APPROVED', 'REJECTED'];

const err = (msg, status) => { const e = new Error(msg); e.status = status; return e; };

export const getCourses = () => apModel.listCourses();

export const getSlotsForCourse = async (skillId) => {
  if (!skillId) throw err('Course id is required', 400);
  return apModel.listSlotsForCourse(skillId);
};

// facultyId provided ⇒ faculty path (ownership-gated to the slot's venue).
export const getSlotStudents = async (venueSlotId, { facultyId = null } = {}) => {
  if (!venueSlotId) throw err('Slot id is required', 400);
  if (facultyId != null) {
    const owns = await apModel.facultyOwnsVenueSlot(venueSlotId, facultyId);
    if (!owns) throw err('Forbidden: this slot is not in your venue', 403);
  }
  return apModel.listSlotStudents(venueSlotId);
};

// status: 'APPROVED' (approve) | 'REJECTED' (disapprove). facultyId provided ⇒
// ownership-gated + PASSED-only. Admin (facultyId null) may confirm any result.
export const setConfirmation = async (bookingId, status, userId, { facultyId = null } = {}) => {
  if (!bookingId) throw err('Booking id is required', 400);
  if (!VALID_STATUSES.includes(status)) throw err('Invalid confirmation status', 400);

  const booking = await apModel.getBookingCore(bookingId);
  if (!booking) throw err('Booking not found', 404);

  if (facultyId != null) {
    const owns = await apModel.facultyOwnsBooking(bookingId, facultyId);
    if (!owns) throw err('Forbidden: this booking is not in your venue', 403);

    // Faculty may only approve/disapprove students who PASSED the assessment.
    const asmtStatus = await apModel.getLatestAssessmentStatus({
      studentId: booking.student_id,
      trainingSkillId: booking.training_skill_id,
      levelId: booking.level_id,
    });
    if (asmtStatus !== 'PASSED') {
      throw err('Faculty can only approve/disapprove students who PASSED the assessment', 403);
    }
  }

  await apModel.setConfirmation(bookingId, status, userId);
  return { booking_id: Number(bookingId), confirm_status: status };
};

export const getSlotHeader = (venueSlotId) => apModel.getSlotHeader(venueSlotId);
export const getSlotStudentsRaw = (venueSlotId) => apModel.listSlotStudents(venueSlotId);
