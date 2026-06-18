import * as apService from './activitypoints.services.js';
import * as facultyModel from '../faculty/faculty.model.js';
import { successResponse } from '../../utils/response.js';

// ── Activity-Points controller — admin + faculty ─────────────────────────────
// Admin handlers run with no ownership gate (facultyId = null) and may confirm
// passed AND failed students; the faculty handlers resolve the faculty_id and
// pass it through so the service applies ownership + PASSED-only rules. CSV
// export is ADMIN-ONLY (no faculty route). approver = req.user.user_id.

const userIdOf = (req) => req.user?.user_id || req.user?.userId;

const resolveFacultyId = async (req) => {
  const fac = await facultyModel.getFacultyByUserId(userIdOf(req));
  if (!fac) { const e = new Error('Faculty profile not found'); e.status = 404; throw e; }
  return fac.faculty_id;
};

// ── Admin (requireRole 3) ────────────────────────────────────────────────────
export const adminGetCourses = async (req, res, next) => {
  try {
    return successResponse(res, 'Courses retrieved', await apService.getCourses());
  } catch (e) { next(e); }
};

export const adminGetSlots = async (req, res, next) => {
  try {
    return successResponse(res, 'Slots retrieved', await apService.getSlotsForCourse(req.params.skillId));
  } catch (e) { next(e); }
};

export const adminGetSlotStudents = async (req, res, next) => {
  try {
    const data = await apService.getSlotStudents(req.params.venueSlotId, { facultyId: null });
    return successResponse(res, 'Students retrieved', data);
  } catch (e) { next(e); }
};

export const adminApprove = async (req, res, next) => {
  try {
    const data = await apService.setConfirmation(req.params.bookingId, 'APPROVED', userIdOf(req), { facultyId: null });
    return successResponse(res, 'Result confirmed for points handoff', data);
  } catch (e) { next(e); }
};

export const adminDisapprove = async (req, res, next) => {
  try {
    const data = await apService.setConfirmation(req.params.bookingId, 'REJECTED', userIdOf(req), { facultyId: null });
    return successResponse(res, 'Result confirmation revoked', data);
  } catch (e) { next(e); }
};

// CSV export — ADMIN ONLY (no faculty equivalent).
export const adminExportCsv = async (req, res, next) => {
  try {
    const { venueSlotId } = req.params;
    const [header, rows] = await Promise.all([
      apService.getSlotHeader(venueSlotId),
      apService.getSlotStudentsRaw(venueSlotId),
    ]);
    const csv = buildCsv(rows, header);
    const fname = `activity-points-slot-${venueSlotId}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.status(200).send(csv);
  } catch (e) { next(e); }
};

// ── Faculty (requireRole 2, ownership-gated, PASSED-only confirm) ────────────
export const facultyGetSlotStudents = async (req, res, next) => {
  try {
    const facultyId = await resolveFacultyId(req);
    const data = await apService.getSlotStudents(req.params.venueSlotId, { facultyId });
    return successResponse(res, 'Students retrieved', data);
  } catch (e) { next(e); }
};

export const facultyApprove = async (req, res, next) => {
  try {
    const facultyId = await resolveFacultyId(req);
    const data = await apService.setConfirmation(req.params.bookingId, 'APPROVED', userIdOf(req), { facultyId });
    return successResponse(res, 'Result confirmed for points handoff', data);
  } catch (e) { next(e); }
};

export const facultyDisapprove = async (req, res, next) => {
  try {
    const facultyId = await resolveFacultyId(req);
    const data = await apService.setConfirmation(req.params.bookingId, 'REJECTED', userIdOf(req), { facultyId });
    return successResponse(res, 'Result confirmation revoked', data);
  } catch (e) { next(e); }
};

// ── CSV helpers ──────────────────────────────────────────────────────────────
function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows, header) {
  const lines = [];
  if (header) {
    lines.push(csvCell(`Activity Points — ${header.venue_name || ''} · ${header.slot_date || ''} · ${header.start_time || ''}-${header.end_time || ''}`));
  }
  lines.push(['Student', 'Reg No', 'Course', 'Attendance', 'Result', 'Score', 'Total', 'Confirmation'].join(','));
  for (const r of rows || []) {
    lines.push([
      csvCell(r.student_name),
      csvCell(r.reg_num),
      csvCell(r.skill_name),
      csvCell(r.attendance_status || 'UNMARKED'),
      csvCell(r.assessment_status || 'NOT TAKEN'),
      csvCell(r.assessment_score ?? ''),
      csvCell(r.assessment_total ?? ''),
      csvCell(r.confirm_status || 'PENDING'),
    ].join(','));
  }
  return lines.join('\r\n');
}
